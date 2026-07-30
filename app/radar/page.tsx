import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectReleases, projects, projectStats } from "@/lib/db/schema";
import { projectHref } from "@/lib/sources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Radar",
  description:
    "What's new in open-source tax software: fresh releases, newly indexed projects, and the most active repositories.",
};

const RELEASE_WINDOW_DAYS = 60;
const NEW_WINDOW_DAYS = 45;

function ago(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default async function RadarPage() {
  const releaseCutoff = new Date(Date.now() - RELEASE_WINDOW_DAYS * 86_400_000);
  const newCutoff = new Date(Date.now() - NEW_WINDOW_DAYS * 86_400_000);

  const [releases, fresh, active] = await Promise.all([
    db
      .select({
        tag: projectReleases.tag,
        relName: projectReleases.name,
        url: projectReleases.url,
        prerelease: projectReleases.prerelease,
        publishedAt: projectReleases.publishedAt,
        source: projects.source,
        sourceType: projects.sourceType,
        owner: projects.owner,
        repo: projects.repo,
        name: projects.name,
      })
      .from(projectReleases)
      .innerJoin(projects, eq(projects.id, projectReleases.projectId))
      .where(gte(projectReleases.publishedAt, releaseCutoff))
      .orderBy(desc(projectReleases.publishedAt))
      .limit(40),
    db
      .select({
        source: projects.source,
        sourceType: projects.sourceType,
        owner: projects.owner,
        repo: projects.repo,
        name: projects.name,
        tagline: projects.tagline,
        createdAt: projects.createdAt,
        description: projectStats.description,
      })
      .from(projects)
      .leftJoin(projectStats, eq(projectStats.projectId, projects.id))
      .where(gte(projects.createdAt, newCutoff))
      .orderBy(desc(projects.createdAt))
      .limit(12),
    db
      .select({
        source: projects.source,
        sourceType: projects.sourceType,
        owner: projects.owner,
        repo: projects.repo,
        name: projects.name,
        pushedAt: projectStats.pushedAt,
        stars: projectStats.stars,
      })
      .from(projects)
      .innerJoin(projectStats, eq(projectStats.projectId, projects.id))
      .orderBy(desc(projectStats.pushedAt))
      .limit(10),
  ]);

  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Radar</span>
        <h1 className="display-m">What&apos;s moving in tax open source.</h1>
        <p className="body-l" style={{ maxWidth: 620 }}>
          Fresh releases across the index, projects that just landed, and the
          repositories shipping right now. Updated daily.
        </p>
      </div>

      <div className="stack-24">
        <section className="social-section">
          <div className="social-head">
            <h2>New releases</h2>
            <span className="social-count">{releases.length}</span>
          </div>
          {releases.length === 0 ? (
            <p className="body" style={{ color: "var(--ink-500)" }}>
              No releases in the last {RELEASE_WINDOW_DAYS} days — check back soon.
            </p>
          ) : (
            <div>
              {releases.map((r) => (
                <div className="entry" key={`${r.owner}/${r.repo}@${r.tag}`}>
                  <div className="entry-body">
                    <div className="entry-head">
                      <Link
                        href={projectHref(r)}
                        className="entry-author"
                        style={{ color: "var(--ink-deep)" }}
                      >
                        {r.owner}/{r.repo}
                      </Link>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mono accent"
                      >
                        {r.tag}
                      </a>
                      {r.prerelease && (
                        <span className="badge badge-neutral">pre-release</span>
                      )}
                      <span className="entry-date">{ago(r.publishedAt)}</span>
                    </div>
                    {r.relName && r.relName !== r.tag && (
                      <p className="entry-text" style={{ marginTop: 4 }}>
                        {r.relName}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="social-grid" style={{ marginTop: 0 }}>
          <section className="social-section">
            <div className="social-head">
              <h2>Newly indexed</h2>
              <span className="social-count">{fresh.length}</span>
            </div>
            {fresh.map((p) => (
              <div className="entry" key={`${p.owner}/${p.repo}`}>
                <div className="entry-body">
                  <div className="entry-head">
                    <Link
                      href={projectHref(p)}
                      className="entry-author"
                      style={{ color: "var(--ink-deep)" }}
                    >
                      {p.owner}/{p.repo}
                    </Link>
                    <span className="entry-date">{ago(p.createdAt)}</span>
                  </div>
                  <p className="entry-text" style={{ marginTop: 4 }}>
                    {(p.tagline ?? p.description ?? "").slice(0, 140)}
                  </p>
                </div>
              </div>
            ))}
          </section>

          <section className="social-section">
            <div className="social-head">
              <h2>Shipping right now</h2>
              <span className="social-count">{active.length}</span>
            </div>
            {active.map((p) => (
              <div className="entry" key={`${p.owner}/${p.repo}`}>
                <div className="entry-body">
                  <div className="entry-head">
                    <Link
                      href={projectHref(p)}
                      className="entry-author"
                      style={{ color: "var(--ink-deep)" }}
                    >
                      {p.owner}/{p.repo}
                    </Link>
                    <span className="numeral" style={{ fontSize: 11, color: "var(--ink-500)" }}>
                      ★ {p.stars}
                    </span>
                    <span className="entry-date">
                      {p.pushedAt ? `pushed ${ago(p.pushedAt)}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
