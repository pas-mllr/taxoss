import Link from "next/link";
import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { facets, projectFacets } from "@/lib/db/schema";
import { JURISDICTION_CONTENT } from "@/lib/jurisdictions";
import { IconArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jurisdictions",
  description:
    "Open-source tax software by jurisdiction: filing tools, e-invoicing libraries, rules-as-code, and AI agents across 19 jurisdictions.",
};

export default async function JurisdictionsPage() {
  const rows = await db
    .select({
      slug: facets.slug,
      name: facets.name,
      count: sql<number>`(select count(*) from ${projectFacets} where ${projectFacets.facetId} = ${facets.id})`,
    })
    .from(facets)
    .where(eq(facets.kind, "jurisdiction"))
    .orderBy(facets.sort);

  const known = rows.filter((r) => JURISDICTION_CONTENT[r.slug]);

  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Jurisdictions</span>
        <h1 className="display-m">Open source tax software, by jurisdiction.</h1>
        <p className="body-l" style={{ maxWidth: 620 }}>
          Tax software doesn&apos;t travel — a VAT library is only as useful as
          the jurisdiction it understands. Each page maps what the open-source
          ecosystem covers in one jurisdiction, and names what&apos;s still
          missing.
        </p>
      </div>
      <div className="project-grid">
        {known.map((j) => (
          <Link
            key={j.slug}
            href={`/jurisdictions/${j.slug}`}
            className="card card-hover project-card"
            style={{ minHeight: 150 }}
          >
            <div className="pc-top">
              <div className="pc-name">{j.name}</div>
              <IconArrowRight style={{ width: 16, height: 16, color: "var(--ink-500)", flexShrink: 0 }} />
            </div>
            <p className="pc-desc">{JURISDICTION_CONTENT[j.slug].lede}</p>
            <div className="pc-meta">
              <span className="m">
                {j.count} project{j.count !== 1 ? "s" : ""}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
