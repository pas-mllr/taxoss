"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveProjectEvaluation,
  publishProjectEvaluation,
  saveProjectEvaluationDraft,
} from "@/app/admin/actions";
import type { EvaluationFormInput } from "@/lib/evidence-forms";
import type { AdminEvaluationRow } from "@/lib/evaluation-data";
import {
  LEGAL_CURRENCY_STATES,
  LICENSE_CONFIDENCE_STATES,
  PRODUCTION_READINESS_STATES,
  PROJECT_MANDATE_RELATIONSHIPS,
  PUBLISHER_KINDS,
  RUBRIC_STATES,
  SCORECARD_DIMENSIONS,
  type RubricState,
  type ScorecardDimension,
} from "@/lib/evaluations";
import { AdminSearchPicker } from "@/components/admin-search-picker";

type MandateOption = { id: number; name: string; jurisdictionName: string };

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

const EVIDENCE_DIMENSIONS = [
  "general",
  "legal-currency",
  "production-readiness",
  "publisher-provenance",
  "license",
  ...SCORECARD_DIMENSIONS,
] as const;

function blankEvaluation(projectId: number): EvaluationFormInput {
  return {
    projectId,
    expectedVersion: 0,
    legalCurrency: "unreviewed",
    legalAsOf: "",
    legalScope: "",
    productionReadiness: "unreviewed",
    publisherKind: "unknown",
    publisherName: "",
    publisherRelationship: "",
    licenseConfidence: "unreviewed",
    documentation: "unreviewed",
    automatedTests: "unreviewed",
    releaseDiscipline: "unreviewed",
    securityProcess: "unreviewed",
    deploymentOperability: "unreviewed",
    dataHandling: "unreviewed",
    governanceContinuity: "unreviewed",
    supportPath: "unreviewed",
    editorialNote: "",
    sources: [],
    mandates: [],
  };
}

function fromRow(row: AdminEvaluationRow): EvaluationFormInput {
  const evaluation = row.evaluation;
  return {
    ...blankEvaluation(row.projectId),
    expectedVersion: evaluation?.version ?? 0,
    legalCurrency:
      (evaluation?.legalCurrency as EvaluationFormInput["legalCurrency"]) ??
      "unreviewed",
    legalAsOf: evaluation?.legalAsOf ?? "",
    legalScope: evaluation?.legalScope ?? "",
    productionReadiness:
      (evaluation?.productionReadiness as EvaluationFormInput["productionReadiness"]) ??
      "unreviewed",
    publisherKind:
      (evaluation?.publisherKind as EvaluationFormInput["publisherKind"]) ?? "unknown",
    publisherName: evaluation?.publisherName ?? "",
    publisherRelationship: evaluation?.publisherRelationship ?? "",
    licenseConfidence:
      (evaluation?.licenseConfidence as EvaluationFormInput["licenseConfidence"]) ??
      "unreviewed",
    documentation: (evaluation?.documentation as RubricState) ?? "unreviewed",
    automatedTests: (evaluation?.automatedTests as RubricState) ?? "unreviewed",
    releaseDiscipline: (evaluation?.releaseDiscipline as RubricState) ?? "unreviewed",
    securityProcess: (evaluation?.securityProcess as RubricState) ?? "unreviewed",
    deploymentOperability:
      (evaluation?.deploymentOperability as RubricState) ?? "unreviewed",
    dataHandling: (evaluation?.dataHandling as RubricState) ?? "unreviewed",
    governanceContinuity:
      (evaluation?.governanceContinuity as RubricState) ?? "unreviewed",
    supportPath: (evaluation?.supportPath as RubricState) ?? "unreviewed",
    editorialNote: evaluation?.editorialNote ?? "",
    sources: row.sources.map((source) => ({
      dimension: source.dimension as EvaluationFormInput["sources"][number]["dimension"],
      kind: source.kind as "primary" | "secondary",
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      citation: source.citation ?? "",
      observedOn: source.observedOn,
    })),
    mandates: row.mandates.map((mandate) => ({
      mandateId: mandate.mandateId,
      relationship:
        mandate.relationship as EvaluationFormInput["mandates"][number]["relationship"],
      coverageNote: mandate.coverageNote ?? "",
    })),
  };
}

export function AdminEvaluations({
  rows,
  mandates,
}: {
  rows: AdminEvaluationRow[];
  mandates: MandateOption[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<EvaluationFormInput>(() => blankEvaluation(0));
  const [status, setStatus] = useState("unreviewed");
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const options = useMemo(
    () =>
      rows.map((row) => ({
        value: String(row.projectId),
        label: `${row.owner}/${row.repo}`,
        hint: row.evaluation
          ? `${row.evaluation.status} · ${row.evaluation.legalCurrency} · v${row.evaluation.version}`
          : "not reviewed",
      })),
    [rows],
  );

  function select(value: string) {
    setSelectedId(value);
    setNotice(null);
    const row = rows.find((item) => item.projectId === Number(value));
    if (!row) return;
    setForm(fromRow(row));
    setStatus(row.evaluation?.status ?? "unreviewed");
  }

  function save(mode: "draft" | "publish") {
    if (!form.projectId) return;
    setNotice(null);
    startTransition(async () => {
      const result =
        mode === "publish"
          ? await publishProjectEvaluation(form)
          : await saveProjectEvaluationDraft(form);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setForm((current) => ({ ...current, expectedVersion: result.version }));
      setStatus(result.status);
      setNotice({
        kind: "ok",
        text: mode === "publish" ? "Published and marked reviewed." : "Draft saved.",
      });
      router.refresh();
    });
  }

  function archive() {
    if (!form.projectId || !selected?.evaluation) return;
    setNotice(null);
    startTransition(async () => {
      const result = await archiveProjectEvaluation({
        projectId: form.projectId,
        expectedVersion: form.expectedVersion,
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setForm((current) => ({ ...current, expectedVersion: result.version }));
      setStatus("archived");
      setNotice({ kind: "ok", text: "Evaluation archived." });
      router.refresh();
    });
  }

  function setRubric(dimension: ScorecardDimension, value: RubricState) {
    setForm((current) => ({ ...current, [dimension]: value }));
  }

  const selected = rows.find((row) => row.projectId === form.projectId) ?? null;

  return (
    <div className="stack-24">
      <section className="social-section">
        <div className="social-head">
          <h2>Project</h2>
          <span className="social-count">{rows.length}</span>
        </div>
        <div className="evidence-toolbar">
          <AdminSearchPicker
            id="evaluation-project-picker"
            placeholder="Find a project"
            options={options}
            value={selectedId}
            onChange={select}
          />
          <span className="badge badge-neutral">{status}</span>
          <span className="meta-mono">v{form.expectedVersion}</span>
        </div>
        {selected && (
          <p className="form-hint" style={{ marginTop: 12 }}>
            {selected.source === "huggingface" ? "Hugging Face" : "GitHub"} · {selected.name}
          </p>
        )}
      </section>

      {form.projectId > 0 && (
        <>
          <section className="social-section">
            <div className="social-head"><h2>Signals</h2></div>
            <div className="evidence-form-grid evidence-form-grid-3">
              <label className="form-label">Legal currency<select className="select evidence-input" value={form.legalCurrency} onChange={(event) => setForm({ ...form, legalCurrency: event.target.value as EvaluationFormInput["legalCurrency"] })}>{LEGAL_CURRENCY_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
              <label className="form-label">Legal as of<input className="evidence-input" type="date" value={form.legalAsOf ?? ""} onChange={(event) => setForm({ ...form, legalAsOf: event.target.value })} /></label>
              <label className="form-label">Production readiness<select className="select evidence-input" value={form.productionReadiness} onChange={(event) => setForm({ ...form, productionReadiness: event.target.value as EvaluationFormInput["productionReadiness"] })}>{PRODUCTION_READINESS_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
              <label className="form-label">Publisher kind<select className="select evidence-input" value={form.publisherKind} onChange={(event) => setForm({ ...form, publisherKind: event.target.value as EvaluationFormInput["publisherKind"] })}>{PUBLISHER_KINDS.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
              <label className="form-label">Publisher name<input className="evidence-input" value={form.publisherName ?? ""} onChange={(event) => setForm({ ...form, publisherName: event.target.value })} /></label>
              <label className="form-label">License confidence<select className="select evidence-input" value={form.licenseConfidence} onChange={(event) => setForm({ ...form, licenseConfidence: event.target.value as EvaluationFormInput["licenseConfidence"] })}>{LICENSE_CONFIDENCE_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
            </div>
            <label className="form-label">Legal scope<textarea className="textarea" value={form.legalScope ?? ""} onChange={(event) => setForm({ ...form, legalScope: event.target.value })} /></label>
            <label className="form-label">Publisher relationship<textarea className="textarea" value={form.publisherRelationship ?? ""} onChange={(event) => setForm({ ...form, publisherRelationship: event.target.value })} /></label>
            <label className="form-label">Editorial note<textarea className="textarea" value={form.editorialNote ?? ""} onChange={(event) => setForm({ ...form, editorialNote: event.target.value })} /></label>
          </section>

          <section className="social-section">
            <div className="social-head"><h2>Enterprise rubric</h2></div>
            <p className="form-hint" style={{ marginBottom: 16 }}>
              Each dimension stands alone. TaxOSS does not calculate a composite score.
            </p>
            <div className="evidence-form-grid">
              {SCORECARD_DIMENSIONS.map((dimension) => (
                <label className="form-label" key={dimension}>
                  {DIMENSION_LABELS[dimension]}
                  <select className="select evidence-input" value={form[dimension]} onChange={(event) => setRubric(dimension, event.target.value as RubricState)}>
                    {RUBRIC_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section className="social-section">
            <div className="social-head">
              <h2>Mandate relationships</h2>
              <button type="button" className="btn btn-secondary btn-sm" disabled={mandates.length === 0} onClick={() => mandates[0] && setForm({ ...form, mandates: [...form.mandates, { mandateId: mandates[0].id, relationship: "reference", coverageNote: "" }] })}>Add mandate</button>
            </div>
            <div className="evidence-list">
              {form.mandates.map((relationship, index) => (
                <div className="evidence-item" key={index}>
                  <div className="evidence-form-grid">
                    <label className="form-label">Mandate<select className="select evidence-input" value={relationship.mandateId} onChange={(event) => setForm({ ...form, mandates: form.mandates.map((item, itemIndex) => itemIndex === index ? { ...item, mandateId: Number(event.target.value) } : item) })}>{mandates.map((mandate) => <option key={mandate.id} value={mandate.id}>{mandate.jurisdictionName} · {mandate.name}</option>)}</select></label>
                    <label className="form-label">Relationship<select className="select evidence-input" value={relationship.relationship} onChange={(event) => setForm({ ...form, mandates: form.mandates.map((item, itemIndex) => itemIndex === index ? { ...item, relationship: event.target.value as EvaluationFormInput["mandates"][number]["relationship"] } : item) })}>{PROJECT_MANDATE_RELATIONSHIPS.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
                  </div>
                  <label className="form-label">Coverage note<textarea className="textarea" value={relationship.coverageNote ?? ""} onChange={(event) => setForm({ ...form, mandates: form.mandates.map((item, itemIndex) => itemIndex === index ? { ...item, coverageNote: event.target.value } : item) })} /></label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, mandates: form.mandates.filter((_, itemIndex) => itemIndex !== index) })}>Remove relationship</button>
                </div>
              ))}
              {form.mandates.length === 0 && <p className="form-hint">No mandate relationship recorded.</p>}
            </div>
          </section>

          <section className="social-section">
            <div className="social-head">
              <h2>Evidence</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm({ ...form, sources: [...form.sources, { dimension: "general", kind: "primary", title: "", publisher: "", url: "", citation: "", observedOn: new Date().toISOString().slice(0, 10) }] })}>Add source</button>
            </div>
            <div className="evidence-list">
              {form.sources.map((source, index) => (
                <div className="evidence-item" key={index}>
                  <div className="evidence-form-grid evidence-form-grid-3">
                    <label className="form-label">Dimension<select className="select evidence-input" value={source.dimension} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, dimension: event.target.value as EvaluationFormInput["sources"][number]["dimension"] } : item) })}>{EVIDENCE_DIMENSIONS.map((dimension) => <option key={dimension} value={dimension}>{dimension}</option>)}</select></label>
                    <label className="form-label">Kind<select className="select evidence-input" value={source.kind} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, kind: event.target.value as "primary" | "secondary" } : item) })}><option value="primary">Primary</option><option value="secondary">Secondary</option></select></label>
                    <label className="form-label">Observed<input className="evidence-input" type="date" value={source.observedOn} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, observedOn: event.target.value } : item) })} /></label>
                    <label className="form-label">Title<input className="evidence-input" value={source.title} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })} /></label>
                    <label className="form-label">Publisher<input className="evidence-input" value={source.publisher} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, publisher: event.target.value } : item) })} /></label>
                    <label className="form-label">URL<input className="evidence-input" type="url" value={source.url} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item) })} /></label>
                  </div>
                  <label className="form-label">Citation<textarea className="textarea" value={source.citation ?? ""} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, citation: event.target.value } : item) })} /></label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, sources: form.sources.filter((_, itemIndex) => itemIndex !== index) })}>Remove source</button>
                </div>
              ))}
              {form.sources.length === 0 && <p className="form-hint">No evidence attached. Publish only when the assessment is supportable.</p>}
            </div>
          </section>

          {notice && <div className={`notice ${notice.kind === "ok" ? "is-success" : "is-error"}`}>{notice.text}</div>}
          <div className="evidence-actions">
            <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => save("draft")}>Save draft</button>
            <button type="button" className="btn btn-primary" disabled={pending} onClick={() => save("publish")}>Publish and mark reviewed</button>
            {selected?.evaluation && status !== "archived" && <button type="button" className="btn btn-danger" disabled={pending} onClick={archive}>Archive</button>}
          </div>
        </>
      )}
    </div>
  );
}