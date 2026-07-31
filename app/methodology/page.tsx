import Link from "next/link";
import type { Metadata } from "next";
import { METHODOLOGY_VERSION } from "@/lib/methodology";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How TaxOSS selects projects, sources mandate records, verifies maintainers, and reviews decision evidence.",
};

const SOURCE_HIERARCHY = [
  ["Primary law and authority guidance", "Official legislation, gazettes, tax-authority guidance, schemas, APIs, and repositories."],
  ["Project-controlled evidence", "Repository files, releases, documentation, security policies, test suites, and verified maintainer statements."],
  ["Independent secondary evidence", "Used for context or corroboration, never to silently override a primary source."],
] as const;

export default function MethodologyPage() {
  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Methodology · {METHODOLOGY_VERSION}</span>
        <h1 className="display-m">How the evidence works.</h1>
        <p className="body-l" style={{ maxWidth: 720 }}>
          TaxOSS is a discovery and research index. It separates repository
          telemetry, legal research, production evidence, and maintainer control so
          one signal cannot masquerade as another.
        </p>
      </div>

      <div className="stack-24">
        <section className="social-section">
          <div className="social-head"><h2>Inclusion and exclusion</h2></div>
          <p className="body">
            A listing must be a public source repository or Hugging Face artifact,
            have a discoverable open license, and make tax, fiscal reporting, or
            tax-policy work a primary purpose. General accounting products, thin
            clients for closed commercial services, unlicensed code, and archived
            repositories are not newly indexed. Existing projects that later become
            archived remain as historical records and are excluded from active signals.
          </p>
        </section>

        <section className="social-section">
          <div className="social-head"><h2>Source hierarchy</h2></div>
          {SOURCE_HIERARCHY.map(([title, body]) => (
            <div className="entry" key={title}>
              <div className="entry-body">
                <div className="entry-author">{title}</div>
                <p className="entry-text">{body}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="social-section">
          <div className="social-head"><h2>Four separate signal classes</h2></div>
          <div className="evidence-signal-grid">
            <div className="evidence-signal"><span className="eyebrow">Repository activity</span><strong>Automated</strong><span className="form-hint">Last push, archive state, and source-fetch time. Activity does not establish legal currency.</span></div>
            <div className="evidence-signal"><span className="eyebrow">Legal currency</span><strong>Editorial</strong><span className="form-hint">Jurisdiction and scope-specific assessment with an as-of date and supporting sources.</span></div>
            <div className="evidence-signal"><span className="eyebrow">Production readiness</span><strong>Evidence-based</strong><span className="form-hint">Experimental, pilot, or production evidence. Popularity and authority authorship are not substitutes.</span></div>
            <div className="evidence-signal"><span className="eyebrow">Maintainer provenance</span><strong>Attributed</strong><span className="form-hint">Who publishes the code and how control was verified. This is not certification.</span></div>
          </div>
        </section>

        <section className="social-section">
          <div className="social-head"><h2>Review and freshness</h2></div>
          <p className="body">
            Publishing a mandate or project evaluation records the reviewer, date,
            evidence, and next review due date. Editing a draft does not renew the
            review. Overdue means the TaxOSS review needs refreshing; it does not mean
            the law expired or the software became invalid. Missing assessment is shown
            as <strong>Not reviewed</strong>, never inferred as a failure.
          </p>
        </section>

        <section className="social-section">
          <div className="social-head"><h2>Enterprise rubric</h2></div>
          <p className="body">
            Documentation, tests, release discipline, security process, deployment
            operability, data handling, governance continuity, and support path are
            assessed separately. TaxOSS does not calculate a composite score because
            priorities and controls vary by use case.
          </p>
        </section>

        <section className="social-section">
          <div className="social-head"><h2>Private workspace semantics</h2></div>
          <p className="body">
            The Workspace heatmap intersects the jurisdictions, tax domains, and
            Process selected by the member. <strong>Gap</strong> means the public
            TaxOSS index has no matching non-archived project; candidate counts show
            discoverable projects, not suitability or compliance. Candidate,
            Evaluating, Pilot, Adopted, and Not a fit are private member-entered
            decision states, not TaxOSS endorsements. CSV exports are point-in-time
            records carrying their UTC generation time, evidence dates, source links,
            and this methodology version.
          </p>
        </section>

        <section className="social-section">
          <div className="social-head"><h2>Conflicts, corrections, and limitations</h2></div>
          <p className="body">
            Conflicting license or scope evidence is labeled rather than resolved by
            assumption. Maintainers may correct descriptive project data, but only site
            administrators publish legal and readiness assessments. TaxOSS does not
            audit dependencies, certify software, provide legal advice, promise
            completeness, or replace security, tax, procurement, and implementation
            review by the adopting organization.
          </p>
          <p className="body" style={{ marginTop: 12 }}>
            Report a correction to{" "}
            <a href="mailto:pascal@lurn.digital" className="accent">pascal@lurn.digital</a>.
          </p>
        </section>

        <div className="cluster">
          <Link href="/stack" className="btn btn-secondary">The Stack</Link>
          <Link href="/radar" className="btn btn-secondary">The Radar</Link>
          <Link href="/" className="btn btn-primary">Browse the index</Link>
        </div>
      </div>
    </div>
  );
}