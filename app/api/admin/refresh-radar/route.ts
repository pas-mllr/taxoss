import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectReleases, projects } from "@/lib/db/schema";
import { isAdminRequest } from "@/lib/admin-token";

/**
 * Radar harvester: pulls recent GitHub releases for every indexed GitHub
 * project and upserts them into project_releases. POST with
 * "Authorization: Bearer $ADMIN_API_TOKEN"; invoked by a scheduled GitHub
 * Actions workflow (ACA has no cron of its own) and manually for backfills.
 *
 * One releases call per repo (~85 repos) stays far inside the PAT's
 * 5000 req/h budget. Repos without releases are the common case and cost
 * one cheap 200-with-empty-array each.
 */

const PER_REPO = 5; // newest releases per repo — the radar shows a window, not history
const FETCH_DELAY_MS = 120;

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "taxoss-radar",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const githubProjects = await db
    .select({ id: projects.id, owner: projects.owner, repo: projects.repo })
    .from(projects)
    .where(eq(projects.source, "github"));

  let inserted = 0;
  let checked = 0;
  const errors: string[] = [];

  for (const p of githubProjects) {
    await new Promise((r) => setTimeout(r, FETCH_DELAY_MS));
    let res: Response;
    try {
      res = await fetch(
        `https://api.github.com/repos/${p.owner}/${p.repo}/releases?per_page=${PER_REPO}`,
        { headers },
      );
    } catch {
      errors.push(`${p.owner}/${p.repo}: network`);
      continue;
    }
    if (!res.ok) {
      // 404s (renamed/removed repos) and rate limits: skip, keep going.
      errors.push(`${p.owner}/${p.repo}: ${res.status}`);
      continue;
    }
    checked++;
    const releases = (await res.json()) as {
      tag_name: string;
      name: string | null;
      html_url: string;
      prerelease: boolean;
      draft: boolean;
      published_at: string | null;
    }[];
    for (const r of releases) {
      if (r.draft || !r.published_at) continue;
      const rows = await db
        .insert(projectReleases)
        .values({
          projectId: p.id,
          tag: r.tag_name,
          name: r.name,
          url: r.html_url,
          prerelease: r.prerelease,
          publishedAt: new Date(r.published_at),
          fetchedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: projectReleases.id });
      inserted += rows.length;
    }
  }

  return NextResponse.json({
    repos: githubProjects.length,
    checked,
    newReleases: inserted,
    errors: errors.slice(0, 20),
  });
}
