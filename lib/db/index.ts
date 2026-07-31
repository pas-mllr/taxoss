import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { normalizeSpdx } from "@/lib/license";
import * as schema from "./schema";
import { CATEGORY_SEED } from "./seed-categories";
import { FACET_SEED } from "./seed-facets";
import { STARTER_PROJECTS } from "./starter-projects";
import { cleanupSeededReviews } from "./p0-cleanup";
import { ensureEvidenceTables } from "./evidence-schema";
import { seedMandates } from "./seed-mandates";
import { seedProjectEvaluations } from "./seed-evaluations";
import {
  backfillWorkspaceFacets,
  ensureWorkspaceTables,
} from "./workspace-schema";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");

declare global {
  var __taxossDb: ReturnType<typeof createDb> | undefined;
}

function createDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const database = drizzle(sqlite, { schema });

  // `next build` collects page data in parallel workers, each importing this
  // module against a throwaway database — racing migrations there can only
  // hurt. Migrations and seeding belong to server start.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return database;
  }

  // Apply checked-in migrations on fresh databases (first boot in prod, or
  // wiped local dev) and on journal-managed ones (created by this migrator),
  // so schema changes roll out with a deploy. Databases created via
  // `drizzle-kit push` carry no journal; contributors stay current with
  // `pnpm db:push` instead.
  const initialized = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    .get();
  const journaled = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'",
    )
    .get();
  if (!initialized || journaled) {
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    if (fs.existsSync(migrationsFolder)) {
      migrate(database, { migrationsFolder });
    }
  }
  ensureAdditiveColumns(sqlite);
  ensureEvidenceTables(sqlite);
  ensureWorkspaceTables(sqlite);
  cleanupSeededReviews(sqlite);
  // Idempotent on every boot: category upserts are no-ops once present, and
  // the starter seed exits early unless the index is empty (so a rate-limited
  // first boot retries on the next cold start).
  bootstrapSeed(database, sqlite);
  return database;
}

/**
 * Belt and braces for databases without a migrations journal (managed via
 * `drizzle-kit push`): additive columns land here idempotently, so pulling a
 * newer schema never breaks an existing database at boot.
 */
function ensureAdditiveColumns(sqlite: Database.Database) {
  const additions: Record<string, [column: string, ddl: string][]> = {
    projects: [
      ["maintainer_note", "ALTER TABLE projects ADD maintainer_note text"],
      ["featured", "ALTER TABLE projects ADD featured integer DEFAULT false NOT NULL"],
      ["featured_at", "ALTER TABLE projects ADD featured_at integer"],
      ["featured_announced_at", "ALTER TABLE projects ADD featured_announced_at integer"],
      ["source", "ALTER TABLE projects ADD source text DEFAULT 'github' NOT NULL"],
      ["source_type", "ALTER TABLE projects ADD source_type text"],
    ],
    project_stats: [
      ["downloads", "ALTER TABLE project_stats ADD downloads integer DEFAULT 0 NOT NULL"],
    ],
    project_readmes: [
      ["custom_html", "ALTER TABLE project_readmes ADD custom_html text"],
      ["custom_updated_at", "ALTER TABLE project_readmes ADD custom_updated_at integer"],
    ],
  };
  for (const [table, columns] of Object.entries(additions)) {
    const cols = new Set(
      (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
        (c) => c.name,
      ),
    );
    for (const [column, ddl] of columns) {
      if (!cols.has(column)) sqlite.exec(ddl);
    }
  }
  sqlite.exec(
    "CREATE INDEX IF NOT EXISTS projects_featured_idx ON projects (featured)",
  );
  sqlite.exec(`CREATE TABLE IF NOT EXISTS project_maintainers (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    project_id integer NOT NULL,
    github_login text NOT NULL,
    added_by_id text,
    created_at integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (added_by_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`);
  sqlite.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS project_maintainers_project_login_unique ON project_maintainers (project_id, github_login)",
  );
  sqlite.exec(
    "CREATE INDEX IF NOT EXISTS project_maintainers_login_idx ON project_maintainers (github_login)",
  );
  sqlite.exec(`CREATE TABLE IF NOT EXISTS facets (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    kind text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    sort integer DEFAULT 0 NOT NULL
  )`);
  sqlite.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS facets_kind_slug_unique ON facets (kind, slug)",
  );
  sqlite.exec(`CREATE TABLE IF NOT EXISTS project_facets (
    project_id integer NOT NULL,
    facet_id integer NOT NULL,
    PRIMARY KEY(project_id, facet_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (facet_id) REFERENCES facets(id) ON UPDATE no action ON DELETE cascade
  )`);
  sqlite.exec(`CREATE TABLE IF NOT EXISTS project_releases (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    project_id integer NOT NULL,
    tag text NOT NULL,
    name text,
    url text NOT NULL,
    prerelease integer DEFAULT false NOT NULL,
    published_at integer NOT NULL,
    fetched_at integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE no action ON DELETE cascade
  )`);
  sqlite.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS project_releases_project_tag_unique ON project_releases (project_id, tag)",
  );
  sqlite.exec(
    "CREATE INDEX IF NOT EXISTS project_releases_published_idx ON project_releases (published_at)",
  );
}

type Db = ReturnType<typeof createDb>;

function bootstrapSeed(database: Db, sqlite: Database.Database) {
  for (const [i, c] of CATEGORY_SEED.entries()) {
    // Upsert so taxonomy renames/reorders reach existing databases on deploy.
    database
      .insert(schema.categories)
      .values({ slug: c.slug, name: c.name, blurb: c.blurb, sort: i })
      .onConflictDoUpdate({
        target: schema.categories.slug,
        set: { name: c.name, blurb: c.blurb, sort: i },
      })
      .run();
  }
  for (const [i, f] of FACET_SEED.entries()) {
    database
      .insert(schema.facets)
      .values({ kind: f.kind, slug: f.slug, name: f.name, sort: i })
      .onConflictDoUpdate({
        target: [schema.facets.kind, schema.facets.slug],
        set: { name: f.name, sort: i },
      })
      .run();
  }
  backfillWorkspaceFacets(sqlite);
  seedMandates(database);
  seedProjectEvaluations(database);
  if (process.env.SEED_STARTERS === "1") {
    // Fire-and-forget: pulls real repos from the GitHub API on first boot.
    void seedStarters(database, sqlite).catch((err) =>
      console.error("starter seed failed:", err),
    );
  }
}

async function seedStarters(database: Db, sqlite: Database.Database) {
  const existing = database.select().from(schema.projects).limit(1).all();
  if (existing.length > 0) return;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "taxoss",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  for (const starter of STARTER_PROJECTS) {
    try {
      const res = await fetch(`https://api.github.com/repos/${starter.repo}`, {
        headers,
      });
      if (!res.ok) {
        console.error(`starter seed: GitHub ${res.status} for ${starter.repo}`);
        continue;
      }
      const d = await res.json();
      if (d.archived) {
        console.error(`starter seed: skipped archived repository ${d.full_name}`);
        continue;
      }
      const key = String(d.full_name).toLowerCase();
      const inserted = database
        .insert(schema.projects)
        .values({
          owner: d.owner.login,
          repo: d.name,
          fullNameKey: key,
          name: d.name,
        })
        .onConflictDoNothing()
        .returning({ id: schema.projects.id })
        .all();
      const projectId = inserted[0]?.id;
      if (!projectId) continue;

      database
        .insert(schema.projectStats)
        .values({
          projectId,
          stars: d.stargazers_count ?? 0,
          forks: d.forks_count ?? 0,
          openIssues: d.open_issues_count ?? 0,
          subscribers: d.subscribers_count ?? 0,
          language: d.language ?? null,
          licenseSpdx: normalizeSpdx(d.license?.spdx_id),
          licenseName: d.license?.name ?? null,
          topics: Array.isArray(d.topics) ? d.topics : [],
          description: d.description ?? null,
          homepage: d.homepage || null,
          defaultBranch: d.default_branch ?? "main",
          pushedAt: d.pushed_at ? new Date(d.pushed_at) : null,
          archived: Boolean(d.archived),
          fetchedAt: new Date(),
        })
        .run();

      const cats = database
        .select()
        .from(schema.categories)
        .all()
        .filter((c) => starter.categories.includes(c.slug));
      for (const c of cats) {
        database
          .insert(schema.projectCategories)
          .values({ projectId, categoryId: c.id })
          .onConflictDoNothing()
          .run();
      }
      console.log(`starter seed: indexed ${d.full_name}`);
    } catch (err) {
      console.error(`starter seed: failed for ${starter.repo}:`, err);
    }
  }
  backfillWorkspaceFacets(sqlite);
  seedProjectEvaluations(database);
}

// Reuse the connection across dev hot reloads.
export const db = globalThis.__taxossDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalThis.__taxossDb = db;

export * as tables from "./schema";
