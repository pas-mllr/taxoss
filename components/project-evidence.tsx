import Link from "next/link";
import type { ProjectEvidence } from "@/lib/evaluation-data";
import { SCORECARD_DIMENSIONS, type ScorecardDimension } from "@/lib/evaluations";
import { formatDateOnly } from "@/lib/time";

const DIMENSION_LABELS: Record<ScorecardDimension, string> = {
  documentation: "Documentation",
  automatedTests: "Automated tests",
  releaseDiscipline: "Release discipline",
  securityProcess: "Security process",
  deploymentOperability: "Deployment operability",
  dataHandling: "Data handling",
  governanceContinuity: "Governance continuity",
  supportPath: "Support path",
};

function label(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function claimMethod(method: string): string {
  const labels: Record<string, string> = {
    "owner-match": "Repository owner match",
    "admin-permission": "Repository admin permission",
    "file-verification": "Published verification token",
    "admin-grant": "Manual evidence review",
    "hf-identity-match": "Hugging Face identity match",
  };
  return labels[method] ?? label(method);
}

function Signal({ title, state, hint }: { title: string; state: string; hint?: string }) {
  const reviewed = state !== "unreviewed" && state !== "unknown";
  return (
    <div className="evidence-signal">
      <span className="eyebrow">{title}</span>
      <strong>{label(state)}</strong>
      {hint && <span className="form-hint">{hint}</span>}
      {!reviewed && <span className="form-hint">No editorial conclusion recorded.</span>}
    </div>
  );
}

export function ProjectEvidencePanel({ evidence }: { evidence: ProjectEvidence }) {
  const evaluation = evidence.evaluation;
  return (
    <section className="social-section project-evidence">
      <div className="social-head">
        <h2>Decision evidence</h2>
        {evaluation ? (
          <span
            className={`badge ${
              evaluation.reviewState === "current"
                ? "badge-success"
                : evaluation.reviewState === "overdue"
                  ? "badge-accent"
                  : "badge-neutral"
            }`}
          >
            Review {evaluation.reviewState}
          </span>
        ) : (
          <span className="badge badge-neutral">Not reviewed</span>
        )}
      </div>

      <div className="evidence-signal-grid">
        <Signal
          title="Repository activity"
          state={evidence.signals.repositoryActivity.state}
          hint={
            evidence.signals.repositoryActivity.observedAt
              ? `Source data fetched ${evidence.signals.repositoryActivity.observedAt
                  .toISOString()
                  .slice(0, 10)}`
              : undefined
          }
        />
        <Signal title="Legal currency" state={evidence.signals.legalCurrency.state} />
        <Signal
          title="Production readiness"
          state={evidence.signals.productionReadiness.state}
        />
        <Signal
          title="Maintainer provenance"
          state={evaluation?.publisherKind ?? "unreviewed"}
          hint={evaluation?.publisherName ?? undefined}
        />
      </div>

      {!evaluation ? (
        <div className="notice is-warning" style={{ marginTop: 16 }}>
          TaxOSS has not published an evidence-based assessment for this project.
          Repository activity is shown independently and is not a statement of legal
          currency, security, support, or production fitness.
        </div>
      ) : (
        <div className="stack-24" style={{ marginTop: 20 }}>
          <div className="evidence-summary-grid">
            <div>
              <span className="eyebrow">Legal scope</span>
              <p className="body-s">{evaluation.legalScope || "No scope note recorded."}</p>
              {evaluation.legalAsOf && (
                <p className="form-hint">Assessed as of {formatDateOnly(evaluation.legalAsOf)}</p>
              )}
            </div>
            <div>
              <span className="eyebrow">Publisher relationship</span>
              <p className="body-s">
                {evaluation.publisherRelationship || "No relationship note recorded."}
              </p>
              <p className="form-hint">
                License confidence: {label(evaluation.licenseConfidence)}
              </p>
            </div>
          </div>

          <div>
            <span className="eyebrow">Enterprise rubric</span>
            <div className="evidence-rubric">
              {SCORECARD_DIMENSIONS.map((dimension) => (
                <div key={dimension}>
                  <span>{DIMENSION_LABELS[dimension]}</span>
                  <strong>{label(evidence.signals.scorecard[dimension])}</strong>
                </div>
              ))}
            </div>
            <p className="form-hint">
              Dimensions stand alone. TaxOSS does not calculate a composite score.
            </p>
          </div>

          {evaluation.editorialNote && (
            <div>
              <span className="eyebrow">Editorial note</span>
              <p className="body">{evaluation.editorialNote}</p>
            </div>
          )}

          {evidence.sources.length > 0 && (
            <div>
              <span className="eyebrow">Assessment evidence</span>
              <div className="evidence-source-list">
                {evidence.sources.map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                    <span>{source.title}</span>
                    <small>{source.publisher} · {source.dimension} · observed {source.observedOn}</small>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {evidence.mandates.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <span className="eyebrow">Mandate relationships</span>
          <div className="evidence-source-list">
            {evidence.mandates.map((mandate) => (
              <Link
                key={`${mandate.mandateId}-${mandate.relationship}`}
                href={`/mandates/${mandate.slug}`}
              >
                <span>{mandate.name} · {label(mandate.relationship)}</span>
                <small>
                  {mandate.coverageNote || "No coverage note recorded."}
                  {mandate.nextPhase
                    ? ` · Next: ${formatDateOnly(mandate.nextPhase.effectiveFrom)}`
                    : ""}
                </small>
              </Link>
            ))}
          </div>
        </div>
      )}

      {evidence.claimProvenance && (
        <p className="form-hint" style={{ marginTop: 18 }}>
          Maintainer control verified by {claimMethod(evidence.claimProvenance.method)} on{" "}
          {evidence.claimProvenance.verifiedAt.toISOString().slice(0, 10)}. This verifies
          control, not production suitability.
        </p>
      )}

      <p className="form-hint" style={{ marginTop: 18 }}>
        Editorial assessment, not certification or legal advice. See the{" "}
        <Link href="/methodology" className="inline-link">methodology</Link>.
      </p>
    </section>
  );
}