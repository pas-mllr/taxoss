/*
 * Optional starter content: indexes a curated list of real tax OSS repos
 * via the live GitHub API (no mock data — skips loudly on API failure).
 * Idempotent: already-indexed repos are skipped. Run with `pnpm db:seed-projects`.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../lib/db/schema";

const STARTERS: { repo: string; categories: string[] }[] = [
  { repo: "PolicyEngine/policyengine-us", categories: ["policy-microsim", "rules-as-code"] },
  { repo: "PSLmodels/Tax-Calculator", categories: ["policy-microsim", "tax-engines"] },
  { repo: "openfisca/openfisca-core", categories: ["rules-as-code", "policy-microsim"] },
  { repo: "openfisca/openfisca-france", categories: ["rules-as-code"] },
  { repo: "ustaxes/UsTaxes", categories: ["tax-prep-filing"] },
  { repo: "CatalaLang/catala", categories: ["rules-as-code"] },
  { repo: "ZUGFeRD/mustangproject", categories: ["invoicing"] },
  { repo: "invoiceninja/invoiceninja", categories: ["invoicing", "accounting"] },
  { repo: "arthurdejong/python-stdnum", categories: ["vat-gst"] },
  { repo: "rotki/rotki", categories: ["crypto-gains", "accounting"] },
  { repo: "BittyTax/BittyTax", categories: ["crypto-gains", "tax-prep-filing"] },
  { repo: "frappe/erpnext", categories: ["accounting"] },
];

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

async function fetchRepo(owner: string, repo: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "taxoss-seed",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
  });
  if (!res.ok) return { error: res.status };
  return { data: await res.json() };
}

async function main() {
  for (const s of STARTERS) {
    const [owner, repo] = s.repo.split("/");
    const result = await fetchRepo(owner, repo);
    if ("error" in result) {
      console.error(`SKIP ${s.repo}: GitHub responded ${result.error} (rate limit? set GITHUB_TOKEN)`);
      continue;
    }
    const d = result.data;
    const key = String(d.full_name).toLowerCase();

    const existing = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(eq(schema.projects.fullNameKey, key))
      .limit(1);
    if (existing[0]) {
      console.log(`skip ${d.full_name}: already indexed`);
      continue;
    }

    const cats = await db
      .select()
      .from(schema.categories)
      .where(inArray(schema.categories.slug, s.categories));
    if (cats.length === 0) {
      console.error(`SKIP ${s.repo}: no matching categories (run db:seed first)`);
      continue;
    }

    const inserted = await db
      .insert(schema.projects)
      .values({
        owner: d.owner.login,
        repo: d.name,
        fullNameKey: key,
        name: d.name,
      })
      .returning({ id: schema.projects.id });
    const projectId = inserted[0].id;

    await db.insert(schema.projectStats).values({
      projectId,
      stars: d.stargazers_count ?? 0,
      forks: d.forks_count ?? 0,
      openIssues: d.open_issues_count ?? 0,
      subscribers: d.subscribers_count ?? 0,
      language: d.language ?? null,
      licenseSpdx:
        d.license?.spdx_id && d.license.spdx_id !== "NOASSERTION"
          ? d.license.spdx_id
          : null,
      licenseName: d.license?.name ?? null,
      topics: Array.isArray(d.topics) ? d.topics : [],
      description: d.description ?? null,
      homepage: d.homepage || null,
      defaultBranch: d.default_branch ?? "main",
      pushedAt: d.pushed_at ? new Date(d.pushed_at) : null,
      archived: Boolean(d.archived),
      fetchedAt: new Date(),
    });
    await db.insert(schema.projectCategories).values(
      cats.map((c) => ({ projectId, categoryId: c.id })),
    );
    console.log(`indexed ${d.full_name} (${d.stargazers_count}★)`);
  }
}

main().then(() => sqlite.close());
