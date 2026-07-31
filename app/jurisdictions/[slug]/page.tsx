import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { facets } from "@/lib/db/schema";
import { listProjects } from "@/lib/projects";
import { listMandates } from "@/lib/mandate-data";
import { JURISDICTION_CONTENT } from "@/lib/jurisdictions";
import { ProjectCard } from "@/components/project-card";
import { IconArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

const MAX_SHOWN = 24;

async function getJurisdiction(slug: string) {
  const content = JURISDICTION_CONTENT[slug];
  if (!content) return null;
  const rows = await db
    .select({ slug: facets.slug, name: facets.name })
    .from(facets)
    .where(and(eq(facets.kind, "jurisdiction"), eq(facets.slug, slug)))
    .limit(1);
  if (!rows[0]) return null;
  return { ...rows[0], ...content };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const j = await getJurisdiction(slug);
  if (!j) return {};
  return {
    title: `Open-Source Tax Software — ${j.name}`,
    description: j.lede,
  };
}

export default async function JurisdictionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const j = await getJurisdiction(slug);
  if (!j) notFound();

  const [{ userId }, { items, total }, mandateRows] = await Promise.all([
    auth(),
    listProjects({
      jurisdiction: slug,
      sort: "site-stars",
      limit: MAX_SHOWN,
    }),
    listMandates({ jurisdiction: slug }),
  ]);

  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Jurisdiction</span>
        <h1 className="display-m">{j.name}</h1>
        <p className="body-l" style={{ maxWidth: 680 }}>
          {j.intro}
        </p>
      </div>

      {mandateRows.length > 0 && (
        <section className="social-section" style={{ marginBottom: 32 }}>
          <div className="social-head">
            <h2>Mandates and transitions</h2>
            <span className="social-count">{mandateRows.length}</span>
          </div>
          {mandateRows.map((mandate) => (
            <div className="entry" key={mandate.id}>
              <div className="entry-body">
                <div className="entry-head">
                  <span className="badge badge-neutral">{mandate.lifecycle}</span>
                  <Link href={`/mandates/${mandate.slug}`} className="entry-author accent">
                    {mandate.name}
                  </Link>
                  <span className="entry-date">Review {mandate.reviewState}</span>
                </div>
                <p className="entry-text">{mandate.summary}</p>
                <Link
                  href={`/mandates/${mandate.slug}`}
                  className="accent mono"
                  style={{ fontSize: 11.5 }}
                >
                  Phases, scope, exceptions & sources →
                </Link>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="claim-band" style={{ marginBottom: 32 }}>
        <div className="stack-4">
          <span className="eyebrow">What&apos;s missing</span>
          <p>{j.missing}</p>
        </div>
        <Link href="/submit" className="btn btn-secondary">
          Building it? Submit
        </Link>
      </div>

      <div className="dir-head">
        <p className="dir-sub" style={{ margin: 0 }}>
          {total} project{total !== 1 ? "s" : ""} tagged {j.name}, ranked by
          community stars.
        </p>
        {total > MAX_SHOWN && (
          <Link href={`/?jur=${slug}`} className="accent" style={{ whiteSpace: "nowrap" }}>
            View all in the directory
            <IconArrowRight style={{ width: 14, height: 14, verticalAlign: -2, marginLeft: 4 }} />
          </Link>
        )}
      </div>

      {items.length > 0 ? (
        <div className="project-grid">
          {items.map((p) => (
            <ProjectCard key={p.id} project={p} signedIn={userId !== null} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h4>Nothing indexed yet</h4>
          <p>
            No projects tagged {j.name} so far — which usually means the gap
            above is even wider than described.
          </p>
          <Link href="/submit" className="btn btn-primary">
            Submit the first one
          </Link>
        </div>
      )}

      <p className="body-s" style={{ marginTop: 32 }}>
        <Link href="/jurisdictions" className="accent">
          All jurisdictions
        </Link>
        {" · "}
        <Link href={`/?jur=${slug}`} className="accent">
          Filter the full directory
        </Link>
      </p>
    </div>
  );
}
