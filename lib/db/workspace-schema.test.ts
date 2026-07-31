import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { FACET_SEED } from "./seed-facets";
import {
  addShortlistedPortfolioProject,
  listOwnedPortfolioProjects,
  removeOwnedPortfolioProject,
  updateOwnedPortfolioProject,
} from "./portfolio-repository";
import * as schema from "./schema";
import {
  backfillWorkspaceFacets,
  ensureWorkspaceTables,
} from "./workspace-schema";

function applySqlMigration(sqlite: Database.Database, filename: string) {
  const sql = fs.readFileSync(path.join(process.cwd(), "drizzle", filename), "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    if (statement.trim()) sqlite.exec(statement);
  }
}

test("migration enforces one private portfolio per account and cascades children", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const database = drizzle(sqlite, { schema });
  migrate(database, { migrationsFolder: "drizzle" });

  database.insert(schema.users).values({ id: "user_one" }).run();
  const portfolioId = database
    .insert(schema.portfolios)
    .values({ userId: "user_one" })
    .returning({ id: schema.portfolios.id })
    .get().id;
  assert.throws(
    () => database.insert(schema.portfolios).values({ userId: "user_one" }).run(),
    /UNIQUE/,
  );

  const projectId = database
    .insert(schema.projects)
    .values({ owner: "owner", repo: "repo", fullNameKey: "owner/repo", name: "repo" })
    .returning({ id: schema.projects.id })
    .get().id;
  const facetId = database
    .select({ id: schema.facets.id })
    .from(schema.facets)
    .where(eq(schema.facets.slug, "pillar-two"))
    .limit(1)
    .get()!.id;
  database
    .insert(schema.portfolioScopeFacets)
    .values({ portfolioId, facetId })
    .run();
  database
    .insert(schema.portfolioProjects)
    .values({
      portfolioId,
      projectId,
      decisionState: "evaluating",
      notes: "Private note",
    })
    .run();

  database.delete(schema.users).where(eq(schema.users.id, "user_one")).run();
  assert.equal(
    (sqlite.prepare("SELECT count(*) AS n FROM portfolios").get() as { n: number }).n,
    0,
  );
  assert.equal(
    (sqlite.prepare("SELECT count(*) AS n FROM portfolio_scope_facets").get() as { n: number }).n,
    0,
  );
  assert.equal(
    (sqlite.prepare("SELECT count(*) AS n FROM portfolio_projects").get() as { n: number }).n,
    0,
  );
  sqlite.close();
});

test("owner-scoped reads isolate independent decisions for the same project", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const database = drizzle(sqlite, { schema });
  migrate(database, { migrationsFolder: "drizzle" });
  database.insert(schema.users).values([{ id: "user_one" }, { id: "user_two" }]).run();
  const projectId = database
    .insert(schema.projects)
    .values({ owner: "owner", repo: "repo", fullNameKey: "owner/repo", name: "repo" })
    .returning({ id: schema.projects.id })
    .get().id;
  const firstPortfolio = database
    .insert(schema.portfolios)
    .values({ userId: "user_one" })
    .returning({ id: schema.portfolios.id })
    .get().id;
  const secondPortfolio = database
    .insert(schema.portfolios)
    .values({ userId: "user_two" })
    .returning({ id: schema.portfolios.id })
    .get().id;
  database
    .insert(schema.portfolioProjects)
    .values([
      { portfolioId: firstPortfolio, projectId, notes: "First account note" },
      { portfolioId: secondPortfolio, projectId, notes: "Second account note" },
    ])
    .run();

  const notesFor = (userId: string) =>
    (
      sqlite
        .prepare(`
          SELECT pp.notes
          FROM portfolio_projects pp
          JOIN portfolios p ON p.id = pp.portfolio_id
          WHERE p.user_id = ?
        `)
        .all(userId) as { notes: string }[]
    ).map((row) => row.notes);
  assert.deepEqual(notesFor("user_one"), ["First account note"]);
  assert.deepEqual(notesFor("user_two"), ["Second account note"]);
  assert.deepEqual(
    listOwnedPortfolioProjects(database, "user_one").map((row) => row.notes),
    ["First account note"],
  );
  assert.deepEqual(
    listOwnedPortfolioProjects(database, "user_two").map((row) => row.notes),
    ["Second account note"],
  );
  sqlite.close();
});

test("production portfolio predicates enforce shortlist, ownership, and versions", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const database = drizzle(sqlite, { schema });
  migrate(database, { migrationsFolder: "drizzle" });
  database.insert(schema.users).values([{ id: "user_one" }, { id: "user_two" }]).run();
  const projectId = database
    .insert(schema.projects)
    .values({ owner: "owner", repo: "repo", fullNameKey: "owner/repo", name: "repo" })
    .returning({ id: schema.projects.id })
    .get().id;
  database
    .insert(schema.portfolios)
    .values([{ userId: "user_one" }, { userId: "user_two" }])
    .run();

  assert.equal(
    addShortlistedPortfolioProject(database, "user_one", projectId),
    "not-shortlisted",
  );
  database.insert(schema.stars).values({ userId: "user_one", projectId }).run();
  assert.equal(
    addShortlistedPortfolioProject(database, "user_one", projectId),
    "added",
  );
  assert.equal(
    updateOwnedPortfolioProject(database, "user_two", {
      projectId,
      expectedVersion: 1,
      decisionState: "adopted",
      notes: "Other account",
    }),
    null,
  );
  assert.equal(
    updateOwnedPortfolioProject(database, "user_one", {
      projectId,
      expectedVersion: 1,
      decisionState: "evaluating",
      notes: "Owner note",
    }),
    2,
  );
  assert.equal(addShortlistedPortfolioProject(database, "user_one", projectId), "added");
  assert.equal(
    listOwnedPortfolioProjects(database, "user_one")[0].notes,
    "Owner note",
  );
  database
    .delete(schema.stars)
    .where(
      and(
        eq(schema.stars.userId, "user_one"),
        eq(schema.stars.projectId, projectId),
      ),
    )
    .run();
  assert.equal(listOwnedPortfolioProjects(database, "user_one").length, 1);
  assert.equal(
    updateOwnedPortfolioProject(database, "user_one", {
      projectId,
      expectedVersion: 1,
      decisionState: "pilot",
      notes: "Stale overwrite",
    }),
    null,
  );
  assert.equal(removeOwnedPortfolioProject(database, "user_two", projectId, 2), false);
  assert.equal(removeOwnedPortfolioProject(database, "user_one", projectId, 2), true);
  assert.equal(
    addShortlistedPortfolioProject(database, "user_one", projectId),
    "not-shortlisted",
  );
  database.insert(schema.stars).values({ userId: "user_one", projectId }).run();
  assert.equal(addShortlistedPortfolioProject(database, "user_one", projectId), "added");
  const reactivated = listOwnedPortfolioProjects(database, "user_one")[0];
  assert.ok(reactivated.version > 2);
  assert.equal(
    updateOwnedPortfolioProject(database, "user_one", {
      projectId,
      expectedVersion: 2,
      decisionState: "adopted",
      notes: "ABA stale overwrite",
    }),
    null,
  );
  assert.equal(removeOwnedPortfolioProject(database, "user_one", projectId, 2), false);
  sqlite.close();
});

test("migration 0009 backfills an existing P1 project", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  for (const migration of [
    "0000_perpetual_red_skull.sql",
    "0001_featured-and-maintainer-note.sql",
    "0002_custom-readme.sql",
    "0003_huggingface-source.sql",
    "0004_additional-maintainers.sql",
    "0005_facets.sql",
    "0006_radar-releases.sql",
    "0007_p0-trust-cleanup.sql",
    "0008_evidence-governance.sql",
  ]) {
    applySqlMigration(sqlite, migration);
  }
  sqlite.exec(`
    INSERT INTO categories (slug, name, sort) VALUES ('tax-prep-filing', 'Tax Prep & Filing', 0);
    INSERT INTO projects (owner, repo, full_name_key, name) VALUES ('owner', 'pillar-kit', 'owner/pillar-kit', 'pillar-kit');
    INSERT INTO project_stats (project_id, description, topics)
      VALUES (1, 'Pillar Two and country-by-country reporting return preparation', '[]');
    INSERT INTO project_categories (project_id, category_id) VALUES (1, 1);
  `);

  applySqlMigration(sqlite, "0009_multinational-workspace.sql");
  const assignments = (
    sqlite
      .prepare(`
        SELECT f.kind, f.slug
        FROM project_facets pf
        JOIN facets f ON f.id = pf.facet_id
        WHERE pf.project_id = 1 AND f.kind IN ('subject', 'process')
        ORDER BY f.kind, f.sort
      `)
      .all() as { kind: string; slug: string }[]
  );
  assert.ok(assignments.some((row) => row.slug === "pillar-two"));
  assert.ok(assignments.some((row) => row.slug === "cbcr"));
  assert.deepEqual(
    assignments.filter((row) => row.kind === "process").map((row) => row.slug),
    ["prepare", "validate", "file"],
  );
  sqlite.close();
});

test("fallback classifies legacy projects once and preserves later curation", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE users (id text PRIMARY KEY);
    CREATE TABLE projects (
      id integer PRIMARY KEY,
      repo text NOT NULL,
      full_name_key text NOT NULL
    );
    CREATE TABLE project_stats (
      project_id integer PRIMARY KEY,
      description text,
      topics text NOT NULL DEFAULT '[]'
    );
    CREATE TABLE categories (
      id integer PRIMARY KEY AUTOINCREMENT,
      slug text NOT NULL UNIQUE
    );
    CREATE TABLE project_categories (
      project_id integer NOT NULL,
      category_id integer NOT NULL,
      PRIMARY KEY (project_id, category_id)
    );
    CREATE TABLE facets (
      id integer PRIMARY KEY AUTOINCREMENT,
      kind text NOT NULL,
      slug text NOT NULL,
      name text NOT NULL,
      sort integer NOT NULL DEFAULT 0,
      UNIQUE (kind, slug)
    );
    CREATE TABLE project_facets (
      project_id integer NOT NULL,
      facet_id integer NOT NULL,
      PRIMARY KEY (project_id, facet_id)
    );
    INSERT INTO projects (id, repo, full_name_key) VALUES (1, 'return-kit', 'owner/return-kit');
    INSERT INTO project_stats (project_id, description, topics) VALUES (1, NULL, '[]');
    INSERT INTO categories (slug) VALUES ('tax-prep-filing');
    INSERT INTO project_categories (project_id, category_id) VALUES (1, 1);
  `);
  const insertFacet = sqlite.prepare(
    "INSERT INTO facets (kind, slug, name, sort) VALUES (?, ?, ?, ?)",
  );
  for (const [sort, facet] of FACET_SEED.entries()) {
    insertFacet.run(facet.kind, facet.slug, facet.name, sort);
  }
  ensureWorkspaceTables(sqlite);
  backfillWorkspaceFacets(sqlite);

  const assigned = () =>
    (
      sqlite
        .prepare(`
          SELECT f.slug
          FROM project_facets pf
          JOIN facets f ON f.id = pf.facet_id
          WHERE pf.project_id = 1 AND f.kind = 'process'
          ORDER BY f.sort
        `)
        .all() as { slug: string }[]
    ).map((row) => row.slug);
  assert.deepEqual(assigned(), ["prepare", "validate", "file"]);
  assert.equal(
    (
      sqlite
        .prepare(`
          SELECT f.slug
          FROM project_facets pf
          JOIN facets f ON f.id = pf.facet_id
          WHERE pf.project_id = 1 AND f.kind = 'subject'
        `)
        .get() as { slug: string }
    ).slug,
    "unclassified",
  );

  sqlite.exec(`
    DELETE FROM project_facets
    WHERE project_id = 1
      AND facet_id IN (SELECT id FROM facets WHERE kind = 'process');
    INSERT INTO project_facets (project_id, facet_id)
    SELECT 1, id FROM facets WHERE kind = 'process' AND slug = 'interpret';
  `);
  backfillWorkspaceFacets(sqlite);
  assert.deepEqual(assigned(), ["interpret"]);

  sqlite.exec(`
    DELETE FROM project_facets
    WHERE project_id = 1
      AND facet_id IN (SELECT id FROM facets WHERE kind = 'subject');
  `);
  backfillWorkspaceFacets(sqlite);
  assert.deepEqual(assigned(), ["interpret"]);
  assert.equal(
    (
      sqlite
        .prepare(`
          SELECT f.slug
          FROM project_facets pf
          JOIN facets f ON f.id = pf.facet_id
          WHERE pf.project_id = 1 AND f.kind = 'subject'
        `)
        .get() as { slug: string }
    ).slug,
    "unclassified",
  );
  sqlite.close();
});

test("fallback upgrades legacy portfolio project rows with a version", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE users (id text PRIMARY KEY);
    CREATE TABLE projects (id integer PRIMARY KEY);
    CREATE TABLE facets (id integer PRIMARY KEY);
    CREATE TABLE portfolios (
      id integer PRIMARY KEY,
      user_id text NOT NULL UNIQUE,
      name text NOT NULL,
      description text,
      version integer NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );
    CREATE TABLE portfolio_projects (
      portfolio_id integer NOT NULL,
      project_id integer NOT NULL,
      decision_state text NOT NULL,
      notes text,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      PRIMARY KEY (portfolio_id, project_id)
    );
  `);
  ensureWorkspaceTables(sqlite);
  const columns = sqlite
    .prepare("PRAGMA table_info(portfolio_projects)")
    .all() as { name: string }[];
  assert.ok(columns.some((column) => column.name === "version"));
  assert.ok(columns.some((column) => column.name === "removed_at"));
  sqlite.close();
});
