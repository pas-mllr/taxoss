import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { FACET_SEED } from "./seed-facets";
import { ensureEvidenceTables } from "./evidence-schema";
import { seedMandates } from "./seed-mandates";
import {
  PROJECT_EVALUATION_SEED,
  seedProjectEvaluations,
} from "./seed-evaluations";
import * as schema from "./schema";

test("representative evaluation seed is idempotent and preserves admin edits", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const database = drizzle(sqlite, { schema });
  migrate(database, { migrationsFolder: "drizzle" });

  for (const [sort, facet] of FACET_SEED.entries()) {
    database
      .insert(schema.facets)
      .values({ ...facet, sort })
      .onConflictDoNothing()
      .run();
  }
  seedMandates(database);

  for (const seed of PROJECT_EVALUATION_SEED) {
    const [owner, repo] = seed.fullNameKey.split("/");
    database
      .insert(schema.projects)
      .values({
        owner,
        repo,
        fullNameKey: seed.fullNameKey,
        name: repo,
      })
      .run();
  }

  seedProjectEvaluations(database);
  assert.equal(
    (sqlite.prepare("SELECT count(*) AS n FROM project_evaluations").get() as { n: number }).n,
    4,
  );
  assert.equal(
    (sqlite.prepare("SELECT count(*) AS n FROM project_evaluation_sources").get() as { n: number }).n,
    7,
  );
  assert.equal(
    (sqlite.prepare("SELECT count(*) AS n FROM project_mandates").get() as { n: number }).n,
    1,
  );

  const catalaId = (
    sqlite
      .prepare("SELECT id FROM projects WHERE full_name_key = ?")
      .get("catalalang/catala") as { id: number }
  ).id;
  sqlite
    .prepare("UPDATE project_evaluations SET editorial_note = ? WHERE project_id = ?")
    .run("Admin edited this note.", catalaId);
  sqlite
    .prepare("DELETE FROM project_evaluation_sources WHERE project_id = ?")
    .run(catalaId);

  seedProjectEvaluations(database);
  assert.equal(
    (
      sqlite
        .prepare("SELECT editorial_note FROM project_evaluations WHERE project_id = ?")
        .get(catalaId) as { editorial_note: string }
    ).editorial_note,
    "Admin edited this note.",
  );
  assert.equal(
    (
      sqlite
        .prepare("SELECT count(*) AS n FROM project_evaluation_sources WHERE project_id = ?")
        .get(catalaId) as { n: number }
    ).n,
    0,
  );
  assert.equal(
    (sqlite.prepare("SELECT count(*) AS n FROM project_evaluations").get() as { n: number }).n,
    4,
  );

  sqlite.close();
});

test("evaluation seed rolls back its published parent when source insertion fails", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const database = drizzle(sqlite, { schema });
  migrate(database, { migrationsFolder: "drizzle" });
  const seed = PROJECT_EVALUATION_SEED[0];
  const [owner, repo] = seed.fullNameKey.split("/");
  database
    .insert(schema.projects)
    .values({ owner, repo, fullNameKey: seed.fullNameKey, name: repo })
    .run();
  sqlite.exec(`
    CREATE TRIGGER reject_seeded_source
    BEFORE INSERT ON project_evaluation_sources
    BEGIN
      SELECT RAISE(ABORT, 'reject source');
    END;
  `);

  assert.throws(() => seedProjectEvaluations(database), /reject source/);
  assert.equal(
    (sqlite.prepare("SELECT count(*) AS n FROM project_evaluations").get() as { n: number }).n,
    0,
  );
  sqlite.close();
});

test("migrated evaluation sources cascade with their assessment", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const database = drizzle(sqlite, { schema });
  migrate(database, { migrationsFolder: "drizzle" });
  const projectId = database
    .insert(schema.projects)
    .values({ owner: "owner", repo: "repo", fullNameKey: "owner/repo", name: "repo" })
    .returning({ id: schema.projects.id })
    .get().id;
  database
    .insert(schema.projectEvaluations)
    .values({ projectId })
    .run();
  database
    .insert(schema.projectEvaluationSources)
    .values({
      projectId,
      dimension: "general",
      kind: "primary",
      title: "Source",
      publisher: "Publisher",
      url: "https://example.com/source",
      observedOn: "2026-07-31",
    })
    .run();

  database
    .delete(schema.projectEvaluations)
    .where(eq(schema.projectEvaluations.projectId, projectId))
    .run();
  assert.equal(
    (
      sqlite
        .prepare("SELECT count(*) AS n FROM project_evaluation_sources WHERE project_id = ?")
        .get(projectId) as { n: number }
    ).n,
    0,
  );
  sqlite.close();
});

test("fallback retrofits evaluation ownership onto a legacy source table", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE users (id text PRIMARY KEY);
    CREATE TABLE projects (id integer PRIMARY KEY);
    CREATE TABLE facets (
      id integer PRIMARY KEY AUTOINCREMENT,
      kind text NOT NULL,
      slug text NOT NULL,
      name text NOT NULL,
      sort integer NOT NULL DEFAULT 0
    );
    CREATE TABLE project_evaluation_sources (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      project_id integer NOT NULL,
      dimension text NOT NULL,
      kind text DEFAULT 'primary' NOT NULL,
      title text NOT NULL,
      publisher text NOT NULL,
      url text NOT NULL,
      citation text,
      observed_on text NOT NULL,
      created_at integer DEFAULT (unixepoch()) NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE cascade
    );
    INSERT INTO projects (id) VALUES (1);
  `);

  ensureEvidenceTables(sqlite);
  const insertSource = sqlite.prepare(
    "INSERT INTO project_evaluation_sources (project_id, dimension, kind, title, publisher, url, observed_on) VALUES (1, 'general', 'primary', 'Source', 'Publisher', 'https://example.com/source', '2026-07-31')",
  );
  assert.throws(() => insertSource.run(), /evaluation source requires an evaluation/);

  sqlite.prepare("INSERT INTO project_evaluations (project_id) VALUES (1)").run();
  insertSource.run();
  sqlite.prepare("DELETE FROM project_evaluations WHERE project_id = 1").run();
  assert.equal(
    (
      sqlite
        .prepare("SELECT count(*) AS n FROM project_evaluation_sources")
        .get() as { n: number }
    ).n,
    0,
  );
  sqlite.close();
});