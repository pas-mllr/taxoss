import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  facets,
  projectCategories,
  projectFacets,
  projectReleases,
  projects,
  projectStats,
} from "@/lib/db/schema";
import { MILESTONES } from "@/lib/stack";
import { projectHref } from "@/lib/sources";
import { NewsletterForm } from "@/components/newsletter-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Radar",
  description:
    "The open source tax radar: mandate deadlines counting down, fresh releases with jurisdiction context, the projects shipping steadily, and what just joined the index.",
};

const RELEASE_WINDOW_DAYS = 60;
const NEW_WINDOW_DAYS = 45;
const CADENCE_WINDOW_DAYS = 120;

function ago(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function countdown(days: number): string {
  if (days <= 45) return `${days} days`;
  if (days <= 540) return `${Math.round(days / 30.4)} months`;
  return `${(days / 365.25).toFixed(1).replace(/\.0$/, "")} years`;
}

export default async function RadarPage() {
  const releaseCutoff = new Date(Date.now() - RELEASE_WINDOW_DAYS * 86_400_000);
  const newCutoff = new Date(Date.now() - NEW_WINDOW_DAYS * 86_400_000);
  const cadenceCutoff = new Date(Date.now() - CADENCE_WINDOW_DAYS * 86_400_000);

  const [releases, fresh, cadenceRows] = await Promise.all([
    db
      .select({
        projectId: projectReleases.projectId,
        tag: projectReleases.tag,
        relName: projectReleases.name,
        url: projectReleases.url,
        prerelease: projectReleases.prerelease,
        publishedAt: projectReleases.publishedAt,
        source: projects.source,
        sourceType: projects.sourceType,
        owner: projects.owner,
        repo: projects.repo,
      })
      .from(projectReleases)
      .innerJoin(projects, eq(projects.id, projectReleases.projectId))
      .where(gte(projectReleases.publishedAt, releaseCutoff))
      .orderBy(desc(projectReleases.publishedAt))
      .limit(30),
    db
      .select({
        id: projects.id,
        source: projects.source,
        sourceType: projects.sourceType,
        owner: projects.owner,
        repo: projects.repo,
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
        projectId: projectReleases.projectId,
        tag: projectReleases.tag,
        publishedAt: projectReleases.publishedAt,
      })
      .from(projectReleases)
      .where(gte(projectReleases.publishedAt, cadenceCutoff)),
  ]);

  // Steady shippers: release count over the cadence window beats a bare
  // pushedAt — a docs commit isn't momentum, a versioned release is.
  const cadence = new Map<number, { count: number; latestTag: string; latestAt: Date }>();
  for (const r of cadenceRows) {
    const c = cadence.get(r.projectId);
    if (!c) {
      cadence.set(r.projectId, { count: 1, latestTag: r.tag, latestAt: r.publishedAt });
    } else {
      c.count += 1;
      if (r.publishedAt > c.latestAt) {
        c.latestAt = r.publishedAt;
        c.latestTag = r.tag;
      }
    }
  }
  const steadyIds = [...cadence.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([id]) => id);
  const steadyProjects = steadyIds.length
    ? await db
        .select({
          id: projects.id,
          source: projects.source,
          sourceType: projects.sourceType,
          owner: projects.owner,
          repo: projects.repo,
          stars: projectStats.stars,
        })
        .from(projects)
        .leftJoin(projectStats, eq(projectStats.projectId, projects.id))
        .where(inArray(projects.id, steadyIds))
    : [];
  const steady = steadyIds
    .map((id) => {
      const p = steadyProjects.find((x) => x.id === id);
      const c = cadence.get(id);
      return p && c ? { ...p, ...c } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Context chips: jurisdictions + one category, so a reader can tell at a
  // glance whether a release is relevant to their footprint.
  const chipIds = [...new Set([...releases.map((r) => r.projectId), ...fresh.map((f) => f.id)])];
  const [jurRows, catRows] = chipIds.length
    ? await Promise.all([
        db
          .select({ projectId: projectFacets.projectId, name: facets.name })
          .from(projectFacets)
          .innerJoin(facets, eq(facets.id, projectFacets.facetId))
          .where(eq(facets.kind, "jurisdiction")),
        db
          .select({ projectId: projectCategories.projectId, name: categories.name })
          .from(projectCategories)
          .innerJoin(categories, eq(categories.id, projectCategories.categoryId)),
      ])
    : [[], []];
  const jursOf = new Map<number, string[]>();
  for (const r of jurRows) {
    if (!chipIds.includes(r.projectId)) continue;
    jursOf.set(r.projectId, [...(jursOf.get(r.projectId) ?? []), r.name]);
  }
  const catOf = new Map<number, string>();
  for (const r of catRows) {
    if (!catOf.has(r.projectId)) catOf.set(r.projectId, r.name);
  }

  const chips = (projectId: number) => {
    const jur = (jursOf.get(projectId) ?? []).slice(0, 2);
    const cat = catOf.get(projectId);
    return (
      <>
        {jur.map((j) => (
          <span key={j} className="badge badge-outline">
            {j}
          </span>
        ))}
        {cat && <span className="badge badge-neutral">{cat}</span>}
      </>
    );
  };

  const upcoming = MILESTONES.map((m) => ({ ...m, days: daysUntil(m.date) }))
    .filter((m) => m.days > 0)
    .sort((a, b) => a.days - b.days);
  const shippedProjects = new Set(releases.map((r) => r.projectId)).size;

  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Radar</span>
        <h1 className="display-m">The open source tax radar.</h1>
        <p className="body-l" style={{ maxWidth: 620 }}>
          The briefing, not the commit log: mandate deadlines counting down,
          what shipped against them, who ships steadily, and what just joined
          the index. Updated daily.
        </p>
      </div>

      <div className="admin-stats" style={{ marginBottom: 28 }}>
        <div className="stat-tile">
          <span className="stat-v">{releases.length}</span>
          <span className="stat-l">Releases · {RELEASE_WINDOW_DAYS}d</span>
        </div>
        <div className="stat-tile">
          <span className="stat-v">{shippedProjects}</span>
          <span className="stat-l">Projects shipped</span>
        </div>
        <div className="stat-tile">
          <span className="stat-v">{fresh.length}</span>
          <span className="stat-l">New in the index</span>
        </div>
        {upcoming[0] && (
          <div className="stat-tile is-blue">
            <span className="stat-v">{upcoming[0].days}d</span>
            <span className="stat-l">To next mandate · {upcoming[0].jurLabel}</span>
          </div>
        )}
      </div>

      <div className="stack-24">
        <section className="social-section" id="coming-due">
          <div className="social-head">
            <h2>Coming due</h2>
          </div>
          <p className="body" style={{ maxWidth: 680, marginBottom: 8 }}>
            The dated obligations ahead, nearest first. Each one links to the
            open tooling for that jurisdiction.
          </p>
          {upcoming.map((m) => (
            <div className="entry" key={`${m.jur}-${m.date}`}>
              <div className="entry-body">
                <div className="entry-head">
                  <span className="numeral" style={{ fontWeight: 600, color: "var(--vermilion-700)" }}>
                    {countdown(m.days)}
                  </span>
                  <Link
                    href={`/jurisdictions/${m.jur}`}
                    className="entry-author"
                    style={{ color: "var(--ink-deep)" }}
                  >
                    {m.jurLabel}
                  </Link>
                  <span className="entry-date">
                    {new Date(m.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="entry-text" style={{ marginTop: 4 }}>
                  {m.label}
                </p>
              </div>
            </div>
          ))}
        </section>

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
                      <a href={r.url} target="_blank" rel="noreferrer" className="mono accent">
                        {r.tag}
                      </a>
                      {r.prerelease && <span className="badge badge-neutral">pre-release</span>}
                      {chips(r.projectId)}
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
              <h2>Shipping steadily</h2>
            </div>
            <p className="body" style={{ marginBottom: 8, color: "var(--ink-500)", fontSize: 13 }}>
              Most versioned releases in the last {CADENCE_WINDOW_DAYS} days —
              cadence, not commit noise.
            </p>
            {steady.map((p) => (
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
                      {p.count} release{p.count !== 1 ? "s" : ""}
                    </span>
                    <span className="entry-date">
                      {p.latestTag} · {ago(p.latestAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="social-section">
            <div className="social-head">
              <h2>New on the index</h2>
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
                    {chips(p.id)}
                    <span className="entry-date">{ago(p.createdAt)}</span>
                  </div>
                  <p className="entry-text" style={{ marginTop: 4 }}>
                    {(p.tagline ?? p.description ?? "").slice(0, 140)}
                  </p>
                </div>
              </div>
            ))}
          </section>
        </div>

        <div className="claim-band">
          <div className="stack-4">
            <span className="eyebrow">Stay ahead</span>
            <p>
              The radar as an email, every few weeks — new tools and releases
              worth knowing about, nothing else.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>
    </div>
  );
}
