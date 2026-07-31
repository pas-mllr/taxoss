import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMandateBySlug } from "@/lib/mandate-data";
import { formatDateOnly } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mandate = await getMandateBySlug(slug);
  if (!mandate) return {};
  return {
    title: mandate.name,
    description: mandate.summary,
  };
}

export default async function MandatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mandate = await getMandateBySlug(slug);
  if (!mandate) notFound();

  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Mandate · {mandate.jurisdictionName}</span>
        <h1 className="display-m">{mandate.name}</h1>
        <p className="body-l" style={{ maxWidth: 720 }}>
          {mandate.summary}
        </p>
        <div className="cluster" style={{ marginTop: 12 }}>
          <span className="badge badge-neutral">{mandate.lifecycle}</span>
          <span
            className={`badge ${
              mandate.reviewState === "current"
                ? "badge-success"
                : mandate.reviewState === "overdue"
                  ? "badge-accent"
                  : "badge-neutral"
            }`}
          >
            Review {mandate.reviewState}
          </span>
          {mandate.lastReviewedAt && (
            <span className="meta-mono">
              Reviewed {mandate.lastReviewedAt.toISOString().slice(0, 10)}
              {mandate.reviewerName ? ` · ${mandate.reviewerName}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="stack-24">
          <section className="social-section">
            <div className="social-head"><h2>Applicability</h2></div>
            <div className="stack-16">
              <div>
                <span className="eyebrow">Scope</span>
                <p className="body">{mandate.scope}</p>
              </div>
              <div>
                <span className="eyebrow">Exceptions and limits</span>
                <p className="body">{mandate.exceptions}</p>
              </div>
              {mandate.legalBasis && (
                <div>
                  <span className="eyebrow">Legal basis</span>
                  <p className="body">{mandate.legalBasis}</p>
                </div>
              )}
            </div>
          </section>

          <section className="social-section">
            <div className="social-head">
              <h2>Phases</h2>
              <span className="social-count">{mandate.phases.length}</span>
            </div>
            {mandate.phases.map((phase) => (
              <div className="entry" key={phase.id}>
                <div className="entry-body">
                  <div className="entry-head">
                    <span className="numeral" style={{ color: "var(--vermilion-700)" }}>
                      {formatDateOnly(phase.effectiveFrom)}
                    </span>
                    <span className="entry-author">{phase.label}</span>
                    <span className="badge badge-neutral">{phase.phaseType}</span>
                  </div>
                  <p className="entry-text">{phase.scope}</p>
                  <p className="form-hint">{phase.exceptions}</p>
                </div>
              </div>
            ))}
          </section>
        </div>

        <aside className="stack-16">
          <section className="card" style={{ padding: 20 }}>
            <span className="eyebrow">Sources</span>
            <div className="stack-16" style={{ marginTop: 12 }}>
              {mandate.sources.map((source) => {
                const sourcePhase = source.phaseId
                  ? mandate.phases.find((phase) => phase.id === source.phaseId)
                  : null;
                return (
                <div key={source.id}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="accent"
                  >
                    {source.title} ↗
                  </a>
                  <p className="form-hint" style={{ marginTop: 4 }}>
                    {source.kind === "primary" ? "Primary" : "Secondary"} ·{" "}
                    {source.publisher} · {sourcePhase?.label ?? "Whole mandate"} · accessed{" "}
                    {source.accessedOn}
                  </p>
                  {source.citation && <p className="body-s">{source.citation}</p>}
                </div>
                );
              })}
            </div>
          </section>

          <section className="notice is-warning">
            This is an editorial research record, not legal advice or a statement
            that any listed project makes an organization compliant.
          </section>

          <Link
            href={`/jurisdictions/${mandate.jurisdictionSlug}`}
            className="btn btn-secondary"
          >
            Open tooling for {mandate.jurisdictionName}
          </Link>
        </aside>
      </div>
    </div>
  );
}