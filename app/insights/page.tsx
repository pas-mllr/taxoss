import Link from "next/link";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  facets,
  projectCategories,
  projectFacets,
  projects,
  projectStats,
} from "@/lib/db/schema";
import { ACTIVE_WINDOW_DAYS } from "@/lib/projects";
import { licenseGroup } from "@/lib/license";
import { THESES } from "@/lib/insights";
import { NewsletterForm } from "@/components/newsletter-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "The state of open tax: six data-backed theses on open-source tax software — for tax leaders, advisers, and tax authorities. Every number computed live from the index.",
};

const AI_CATEGORIES = [
  "platforms",
  "agent-skills",
  "mcp-servers",
  "tax-ai",
  "rag-retrieval",
  "local-ai",
];
const CALC_CATEGORIES = ["tax-engines", "rules-as-code", "vat-gst", "invoicing"];

export default async function InsightsPage() {
  const [projectRows, catRows, facetRows] = await Promise.all([
    db
      .select({
        id: projects.id,
        pushedAt: projectStats.pushedAt,
        license: projectStats.licenseSpdx,
      })
      .from(projects)
      .leftJoin(projectStats, eq(projectStats.projectId, projects.id)),
    db
      .select({ projectId: projectCategories.projectId, slug: categories.slug })
      .from(projectCategories)
      .innerJoin(categories, eq(categories.id, projectCategories.categoryId)),
    db
      .select({
        projectId: projectFacets.projectId,
        kind: facets.kind,
        slug: facets.slug,
      })
      .from(projectFacets)
      .innerJoin(facets, eq(facets.id, projectFacets.facetId)),
  ]);

  const total = projectRows.length;
  const activeCutoff = Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000;
  const active = projectRows.filter(
    (p) => p.pushedAt && p.pushedAt.getTime() >= activeCutoff,
  ).length;
  const permissive = projectRows.filter(
    (p) => licenseGroup(p.license) === "permissive",
  ).length;

  const inCats = (slugs: string[]) =>
    new Set(catRows.filter((r) => slugs.includes(r.slug)).map((r) => r.projectId)).size;
  const jurCount = (slug: string) =>
    facetRows.filter((r) => r.kind === "jurisdiction" && r.slug === slug).length;

  const eInvProjects = new Set(
    facetRows
      .filter((r) => r.kind === "subject" && r.slug === "e-invoicing-ctc")
      .map((r) => r.projectId),
  );
  const eInvJurs = new Set(
    facetRows
      .filter((r) => r.kind === "jurisdiction" && eInvProjects.has(r.projectId))
      .map((r) => r.slug),
  ).size;

  const ai = inCats(AI_CATEGORIES);
  const calc = inCats(CALC_CATEGORIES);
  const filing = inCats(["tax-prep-filing"]);
  const us = jurCount("us");
  const de = jurCount("de");
  const jurisdictions = new Set(
    facetRows.filter((r) => r.kind === "jurisdiction").map((r) => r.slug),
  ).size;

  const evidence: Record<string, string> = {
    mandates: `${eInvProjects.size} of ${total} projects carry the e-invoicing & digital reporting tag — the largest subject cluster in the index — spanning ${eInvJurs} jurisdictions.`,
    "authority-code": `United States: ${us} projects, the deepest national ecosystem here, anchored by the IRS's own Direct File. Germany: ${de} projects, every one orbiting a closed submission core.`,
    "ai-open-first": `${ai} projects sit in the six AI and agent categories — ${Math.round((ai / total) * 100)}% of the entire index, the fastest-growing slice of it.`,
    "two-ecosystems": `The leading commercial landscape lists ~500 vendors; qualifying open source among them amounts to thin API clients. The ${total} projects here come from authorities, academics, and practitioners instead.`,
    "last-mile": `Filing tools in the index: ${filing}. Calculation, rules, format, and validation tools: ${calc}. The gap is the locked channel, not missing demand.`,
    "blank-map": `${jurisdictions} jurisdictions mapped; one project represents the entire African continent. The Japanese, Turkish, Polish, and Brazilian entries were found by searching in those languages.`,
  };

  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Insights</span>
        <h1 className="display-m">The state of open tax.</h1>
        <p className="body-l" style={{ maxWidth: 620 }}>
          Six theses on open-source tax software — what the {total} projects in
          this index say about mandates, AI, tax authorities, and where the
          ecosystem goes next. Every number below is computed live from the
          index, so the argument can be checked.
        </p>
      </div>

      <div className="admin-stats" style={{ marginBottom: 40 }}>
        <div className="stat-tile">
          <span className="stat-v">{total}</span>
          <span className="stat-l">Projects indexed</span>
        </div>
        <div className="stat-tile">
          <span className="stat-v">{Math.round((active / total) * 100)}%</span>
          <span className="stat-l">Active this month</span>
        </div>
        <div className="stat-tile">
          <span className="stat-v">{Math.round((permissive / total) * 100)}%</span>
          <span className="stat-l">Permissive licenses</span>
        </div>
        <div className="stat-tile is-blue">
          <span className="stat-v">{eInvProjects.size}</span>
          <span className="stat-l">Largest cluster · e-invoicing</span>
        </div>
      </div>

      <div className="stack-24">
        {THESES.map((t, i) => (
          <section className="social-section" key={t.id} id={t.id}>
            <div className="social-head">
              <h2>
                <span className="numeral" style={{ color: "var(--vermilion)", marginRight: 10 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {t.title}
              </h2>
            </div>
            <div className="detail-grid" style={{ marginTop: 4 }}>
              <div>
                {t.paragraphs.map((p, j) => (
                  <p key={j} className="body" style={{ marginBottom: 12 }}>
                    {p}
                  </p>
                ))}
              </div>
              <div className="stack-8">
                <div className="card" style={{ padding: "16px 20px" }}>
                  <span className="eyebrow" style={{ marginBottom: 8 }}>
                    Evidence from the index
                  </span>
                  <p className="mono" style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0, color: "var(--ink-700)" }}>
                    {evidence[t.id]}
                  </p>
                </div>
                <div className="card" style={{ padding: "16px 20px" }}>
                  <span className="eyebrow" style={{ marginBottom: 8 }}>
                    Takeaways
                  </span>
                  {t.takeaways.map((tk) => (
                    <p key={tk.audience} className="pc-desc" style={{ marginBottom: 10 }}>
                      <strong style={{ color: "var(--ink-deep)" }}>{tk.audience}:</strong>{" "}
                      {tk.text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}

        <div className="claim-band">
          <div className="stack-4">
            <span className="eyebrow">Go deeper</span>
            <p>
              The Stack maps the tooling by problem, the Atlas by jurisdiction,
              and the Radar tracks what ships against the deadlines — or get
              the movement as an email, every few weeks.
            </p>
          </div>
          <NewsletterForm />
        </div>

        <div className="cluster">
          <Link href="/stack" className="btn btn-secondary">
            The Stack
          </Link>
          <Link href="/jurisdictions" className="btn btn-secondary">
            The Atlas
          </Link>
          <Link href="/radar" className="btn btn-secondary">
            The Radar
          </Link>
        </div>
      </div>
    </div>
  );
}
