import type Database from "better-sqlite3";
import { workspaceBackfillFacets } from "@/lib/auto-facets";

export function ensureWorkspaceTables(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id text NOT NULL,
      name text DEFAULT 'My tax portfolio' NOT NULL,
      description text,
      version integer DEFAULT 1 NOT NULL,
      created_at integer DEFAULT (unixepoch()) NOT NULL,
      updated_at integer DEFAULT (unixepoch()) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
    );
    CREATE UNIQUE INDEX IF NOT EXISTS portfolios_user_unique ON portfolios(user_id);

    CREATE TABLE IF NOT EXISTS portfolio_scope_facets (
      portfolio_id integer NOT NULL,
      facet_id integer NOT NULL,
      PRIMARY KEY (portfolio_id, facet_id),
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE cascade,
      FOREIGN KEY (facet_id) REFERENCES facets(id) ON DELETE cascade
    );
    CREATE INDEX IF NOT EXISTS portfolio_scope_facets_facet_idx
      ON portfolio_scope_facets(facet_id);

    CREATE TABLE IF NOT EXISTS portfolio_projects (
      portfolio_id integer NOT NULL,
      project_id integer NOT NULL,
      decision_state text DEFAULT 'candidate' NOT NULL,
      notes text,
      version integer DEFAULT 1 NOT NULL,
      removed_at integer,
      created_at integer DEFAULT (unixepoch()) NOT NULL,
      updated_at integer DEFAULT (unixepoch()) NOT NULL,
      PRIMARY KEY (portfolio_id, project_id),
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE cascade,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE cascade
    );
    CREATE INDEX IF NOT EXISTS portfolio_projects_project_idx
      ON portfolio_projects(project_id);
  `);
  const portfolioProjectColumns = new Set(
    (
      sqlite.prepare("PRAGMA table_info(portfolio_projects)").all() as {
        name: string;
      }[]
    ).map((column) => column.name),
  );
  if (!portfolioProjectColumns.has("version")) {
    sqlite.exec(
      "ALTER TABLE portfolio_projects ADD COLUMN version integer DEFAULT 1 NOT NULL",
    );
  }
  if (!portfolioProjectColumns.has("removed_at")) {
    sqlite.exec("ALTER TABLE portfolio_projects ADD COLUMN removed_at integer");
  }
}

function parseTopics(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((topic): topic is string => typeof topic === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * One-time compatibility backfill for unjournaled databases. A project with
 * any process assignment is already P2-aware and is never auto-curated again.
 */
export function backfillWorkspaceFacets(sqlite: Database.Database): void {
  const rows = sqlite
    .prepare(`
      SELECT
        p.id,
        p.repo,
        p.full_name_key AS fullNameKey,
        ps.description,
        ps.topics,
        group_concat(DISTINCT c.slug) AS categorySlugs
      FROM projects p
      LEFT JOIN project_stats ps ON ps.project_id = p.id
      LEFT JOIN project_categories pc ON pc.project_id = p.id
      LEFT JOIN categories c ON c.id = pc.category_id
      WHERE NOT EXISTS (
        SELECT 1
        FROM project_facets existing_pf
        JOIN facets existing_f ON existing_f.id = existing_pf.facet_id
        WHERE existing_pf.project_id = p.id AND existing_f.kind = 'process'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM project_facets existing_pf
        JOIN facets existing_f ON existing_f.id = existing_pf.facet_id
        WHERE existing_pf.project_id = p.id AND existing_f.kind = 'subject'
      )
      GROUP BY p.id
    `)
    .all() as {
    id: number;
    repo: string;
    fullNameKey: string;
    description: string | null;
    topics: string | null;
    categorySlugs: string | null;
  }[];

  const facetId = sqlite.prepare(
    "SELECT id FROM facets WHERE kind = ? AND slug = ? LIMIT 1",
  );
  const insert = sqlite.prepare(
    "INSERT OR IGNORE INTO project_facets (project_id, facet_id) VALUES (?, ?)",
  );
  const hasSubject = sqlite.prepare(`
    SELECT 1
    FROM project_facets pf
    JOIN facets f ON f.id = pf.facet_id
    WHERE pf.project_id = ? AND f.kind = 'subject'
    LIMIT 1
  `);
  const hasProcess = sqlite.prepare(`
    SELECT 1
    FROM project_facets pf
    JOIN facets f ON f.id = pf.facet_id
    WHERE pf.project_id = ? AND f.kind = 'process'
    LIMIT 1
  `);

  const apply = sqlite.transaction(() => {
    for (const row of rows) {
      const result = workspaceBackfillFacets(
        parseTopics(row.topics),
        row.description,
        row.fullNameKey || row.repo,
        row.categorySlugs?.split(",").filter(Boolean) ?? [],
      );

      for (const slug of result.subjects) {
        const facet = facetId.get("subject", slug) as { id: number } | undefined;
        if (facet) insert.run(row.id, facet.id);
      }
      if (!hasSubject.get(row.id)) {
        const unclassified = facetId.get("subject", "unclassified") as
          | { id: number }
          | undefined;
        if (unclassified) insert.run(row.id, unclassified.id);
      }

      if (!hasProcess.get(row.id)) {
        const processes = result.processes.length
          ? result.processes
          : ["unclassified"];
        for (const slug of processes) {
          const facet = facetId.get("process", slug) as { id: number } | undefined;
          if (facet) insert.run(row.id, facet.id);
        }
      }
    }
  });
  apply();
}
