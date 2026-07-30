import Link from "next/link";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { facets, projectFacets, projectStats } from "@/lib/db/schema";
import { ACTIVE_WINDOW_DAYS } from "@/lib/projects";
import { JURISDICTION_CONTENT } from "@/lib/jurisdictions";
import { ATLAS_PATTERNS, ATLAS_SECTIONS } from "@/lib/atlas";
import { MANDATES } from "@/lib/stack";
import { IconArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Atlas",
  description:
    "The open source tax atlas: where the ecosystems run deep, where mandates built them, and where the map is still blank — 19 jurisdictions with live activity signals.",
};

type JurCard = {
  slug: string;
  name: string;
  count: number;
  active: number;
};

export default async function JurisdictionsPage() {
  const [jurs, rows] = await Promise.all([
    db
      .select({ id: facets.id, slug: facets.slug, name: facets.name })
      .from(facets)
      .where(eq(facets.kind, "jurisdiction"))
      .orderBy(facets.sort),
    db
      .select({
        facetId: projectFacets.facetId,
        projectId: projectFacets.projectId,
        pushedAt: projectStats.pushedAt,
      })
      .from(projectFacets)
      .innerJoin(facets, eq(facets.id, projectFacets.facetId))
      .leftJoin(projectStats, eq(projectStats.projectId, projectFacets.projectId))
      .where(eq(facets.kind, "jurisdiction")),
  ]);

  const activeCutoff = Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000;
  const byId = new Map<number, JurCard>(
    jurs.map((j) => [j.id, { slug: j.slug, name: j.name, count: 0, active: 0 }]),
  );
  const tagged = new Set<number>();
  const taggedActive = new Set<number>();
  for (const r of rows) {
    const j = byId.get(r.facetId);
    if (!j) continue;
    const isActive = Boolean(r.pushedAt && r.pushedAt.getTime() >= activeCutoff);
    j.count += 1;
    if (isActive) j.active += 1;
    tagged.add(r.projectId);
    if (isActive) taggedActive.add(r.projectId);
  }
  const bySlug = new Map([...byId.values()].map((j) => [j.slug, j]));
  const mandateByJur = new Map(MANDATES.map((m) => [m.jur, m]));
  const liveMandates = MANDATES.filter((m) => m.status === "live").length;

  const card = (j: JurCard) => {
    const mandate = mandateByJur.get(j.slug);
    return (
      <Link
        key={j.slug}
        href={`/jurisdictions/${j.slug}`}
        className="card card-hover project-card"
        style={{ minHeight: 150 }}
      >
        <div className="pc-cat">
          <span>
            {j.count} project{j.count !== 1 ? "s" : ""} · {j.active} active
          </span>
          {mandate ? (
            <span
              className={`status-pill ${
                mandate.status === "live" ? "is-health-active" : "is-health-quiet"
              }`}
              title={`${mandate.name} — ${mandate.status === "live" ? "in force" : "ahead"}: ${mandate.when}`}
            >
              {mandate.name}
            </span>
          ) : null}
        </div>
        <div className="pc-top">
          <div className="pc-name">{j.name}</div>
          <IconArrowRight
            style={{ width: 16, height: 16, color: "var(--ink-500)", flexShrink: 0 }}
          />
        </div>
        <p className="pc-desc">{JURISDICTION_CONTENT[j.slug]?.lede}</p>
      </Link>
    );
  };

  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Jurisdictions</span>
        <h1 className="display-m">The open source tax atlas.</h1>
        <p className="body-l" style={{ maxWidth: 620 }}>
          Tax software doesn&apos;t travel — so this is a map, not a list.
          Where the open ecosystems run deep, where mandates called them into
          existence, and where the map is still blank.
        </p>
      </div>

      <div className="admin-stats" style={{ marginBottom: 28 }}>
        <div className="stat-tile">
          <span className="stat-v">{jurs.length}</span>
          <span className="stat-l">Jurisdictions</span>
        </div>
        <div className="stat-tile">
          <span className="stat-v">{tagged.size}</span>
          <span className="stat-l">Projects mapped</span>
        </div>
        <div className="stat-tile">
          <span className="stat-v">{taggedActive.size}</span>
          <span className="stat-l">Active this month</span>
        </div>
        <div className="stat-tile is-blue">
          <span className="stat-v">{liveMandates}</span>
          <span className="stat-l">Mandates in force</span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
          marginBottom: 40,
        }}
      >
        {ATLAS_PATTERNS.map((p) => (
          <div key={p.title} className="card" style={{ padding: 22 }}>
            <span className="eyebrow" style={{ marginBottom: 10 }}>
              Read the map
            </span>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{p.title}</h3>
            <p className="pc-desc" style={{ margin: 0 }}>{p.body}</p>
          </div>
        ))}
      </div>

      <div className="stack-24">
        {ATLAS_SECTIONS.map((s) => {
          const cards = s.slugs
            .map((slug) => bySlug.get(slug))
            .filter((j): j is JurCard => Boolean(j));
          return (
            <section className="social-section" key={s.id} id={s.id}>
              <div className="social-head">
                <h2>{s.title}</h2>
              </div>
              <p className="body" style={{ maxWidth: 680, marginBottom: 18 }}>
                {s.intro}
              </p>
              <div className="project-grid">{cards.map(card)}</div>
              {s.id === "frontier" && (
                <div className="cluster" style={{ marginTop: 18 }}>
                  <Link href="/submit" className="btn btn-primary">
                    Submit a project
                  </Link>
                  <Link href="/stack#calendar" className="btn btn-secondary">
                    The compliance calendar
                  </Link>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
