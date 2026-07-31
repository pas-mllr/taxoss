import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { ensureEvidenceTables } from "./evidence-schema";
import { MANDATE_SEED, seedMandates } from "./seed-mandates";
import * as schema from "./schema";

test("mandate seed is complete, idempotent, and preserves admin edits", () => {
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
  `);
  const insertFacet = sqlite.prepare(
    "INSERT INTO facets (kind, slug, name, sort) VALUES ('jurisdiction', ?, ?, ?)",
  );
  for (const [sort, mandate] of MANDATE_SEED.entries()) {
    insertFacet.run(mandate.jurisdiction, mandate.jurisdiction, sort);
  }

  ensureEvidenceTables(sqlite);
  const database = drizzle(sqlite, { schema });
  seedMandates(database);

  assert.equal(
    (sqlite.prepare("SELECT count(*) AS n FROM mandates").get() as { n: number }).n,
    7,
  );
  assert.equal(
    (sqlite.prepare("SELECT count(*) AS n FROM mandate_phases").get() as { n: number }).n,
    22,
  );
  assert.equal(
    (sqlite.prepare("SELECT count(*) AS n FROM mandate_sources").get() as { n: number }).n,
    8,
  );

  const spainMandateId = (
    sqlite
      .prepare("SELECT id FROM mandates WHERE slug = ?")
      .get("spain-sif-verifactu") as { id: number }
  ).id;
  const polandPhaseId = (
    sqlite
      .prepare(
        "SELECT p.id FROM mandate_phases p JOIN mandates m ON m.id = p.mandate_id WHERE m.slug = ? LIMIT 1",
      )
      .get("poland-ksef") as { id: number }
  ).id;
  assert.throws(
    () =>
      sqlite
        .prepare(
          "INSERT INTO mandate_sources (mandate_id, phase_id, kind, title, publisher, url, accessed_on, supports) VALUES (?, ?, 'primary', 'Invalid source', 'Publisher', 'https://example.com', '2026-07-31', '[]')",
        )
        .run(spainMandateId, polandPhaseId),
    /phase does not belong to mandate/,
  );
  const polandMandateId = (
    sqlite
      .prepare("SELECT id FROM mandates WHERE slug = ?")
      .get("poland-ksef") as { id: number }
  ).id;
  const reparentPhase = sqlite
    .prepare(
      "INSERT INTO mandate_phases (mandate_id, slug, label, phase_type, effective_from, scope, exceptions, sort) VALUES (?, 'reparent-test', 'Re-parent test', 'obligation', '2027-01-01', 'Scope', 'None', 99)",
    )
    .run(spainMandateId);
  sqlite
    .prepare(
      "INSERT INTO mandate_sources (mandate_id, phase_id, kind, title, publisher, url, accessed_on, supports) VALUES (?, ?, 'primary', 'Linked source', 'Publisher', 'https://example.com/linked', '2026-07-31', '[]')",
    )
    .run(spainMandateId, Number(reparentPhase.lastInsertRowid));
  assert.throws(
    () =>
      sqlite
        .prepare("UPDATE mandate_phases SET mandate_id = ? WHERE id = ?")
        .run(polandMandateId, Number(reparentPhase.lastInsertRowid)),
    /linked sources belong to the original mandate/,
  );

  sqlite.prepare("INSERT INTO projects (id) VALUES (100)").run();
  sqlite.prepare("INSERT INTO project_evaluations (project_id) VALUES (100)").run();
  sqlite
    .prepare(
      "INSERT INTO project_evaluation_sources (project_id, dimension, kind, title, publisher, url, observed_on) VALUES (100, 'general', 'primary', 'Source', 'Publisher', 'https://example.com/evaluation', '2026-07-31')",
    )
    .run();
  sqlite.prepare("DELETE FROM project_evaluations WHERE project_id = 100").run();
  assert.equal(
    (
      sqlite
        .prepare("SELECT count(*) AS n FROM project_evaluation_sources WHERE project_id = 100")
        .get() as { n: number }
    ).n,
    0,
  );

  sqlite
    .prepare("UPDATE mandates SET name = ? WHERE slug = ?")
    .run("Admin-edited Spain title", "spain-sif-verifactu");
  sqlite
    .prepare(
      "DELETE FROM mandate_sources WHERE mandate_id = (SELECT id FROM mandates WHERE slug = ?)",
    )
    .run("spain-sif-verifactu");
  sqlite
    .prepare(
      "DELETE FROM mandate_phases WHERE mandate_id = (SELECT id FROM mandates WHERE slug = ?)",
    )
    .run("spain-sif-verifactu");
  seedMandates(database);

  assert.equal(
    (
      sqlite
        .prepare("SELECT name FROM mandates WHERE slug = ?")
        .get("spain-sif-verifactu") as { name: string }
    ).name,
    "Admin-edited Spain title",
  );
  assert.equal(
    (
      sqlite
        .prepare(
          "SELECT count(*) AS n FROM mandate_phases WHERE mandate_id = (SELECT id FROM mandates WHERE slug = ?)",
        )
        .get("spain-sif-verifactu") as { n: number }
    ).n,
    0,
  );
  assert.equal(
    (
      sqlite
        .prepare(
          "SELECT count(*) AS n FROM mandate_sources WHERE mandate_id = (SELECT id FROM mandates WHERE slug = ?)",
        )
        .get("spain-sif-verifactu") as { n: number }
    ).n,
    0,
  );

  sqlite.close();
});

test("mandate seed rolls back its published parent when child insertion fails", () => {
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
  `);
  const first = MANDATE_SEED[0];
  sqlite
    .prepare(
      "INSERT INTO facets (kind, slug, name, sort) VALUES ('jurisdiction', ?, ?, 0)",
    )
    .run(first.jurisdiction, first.jurisdiction);
  ensureEvidenceTables(sqlite);
  sqlite.exec(`
    CREATE TRIGGER reject_seeded_phase
    BEFORE INSERT ON mandate_phases
    BEGIN
      SELECT RAISE(ABORT, 'reject phase');
    END;
  `);

  const database = drizzle(sqlite, { schema });
  assert.throws(() => seedMandates(database), /reject phase/);
  assert.equal(
    (sqlite.prepare("SELECT count(*) AS n FROM mandates").get() as { n: number }).n,
    0,
  );
  sqlite.close();
});