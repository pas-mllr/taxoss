"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveMandate,
  publishMandate,
  saveMandateDraft,
} from "@/app/admin/actions";
import type { MandateFormInput } from "@/lib/evidence-forms";
import type { MandateRecord } from "@/lib/mandate-data";
import { AdminSearchPicker } from "@/components/admin-search-picker";

type Jurisdiction = { id: number; slug: string; name: string };

function newMandate(jurisdictions: Jurisdiction[]): MandateFormInput {
  return {
    expectedVersion: 0,
    slug: "",
    jurisdictionFacetId: jurisdictions[0]?.id ?? 0,
    name: "",
    summary: "",
    legalBasis: "",
    scope: "",
    exceptions: "",
    lifecycle: "ahead",
    phases: [
      {
        slug: "first-phase",
        label: "",
        phaseType: "obligation",
        effectiveFrom: "",
        effectiveTo: "",
        scope: "",
        exceptions: "",
        sort: 0,
      },
    ],
    sources: [
      {
        phaseSlug: "",
        kind: "primary",
        title: "",
        publisher: "",
        url: "",
        citation: "",
        publishedOn: "",
        accessedOn: new Date().toISOString().slice(0, 10),
        supports: [],
      },
    ],
  };
}

function fromRecord(record: MandateRecord): MandateFormInput {
  const phaseSlugById = new Map(record.phases.map((phase) => [phase.id, phase.slug]));
  return {
    id: record.id,
    expectedVersion: record.version,
    slug: record.slug,
    jurisdictionFacetId: record.jurisdictionFacetId,
    name: record.name,
    summary: record.summary,
    legalBasis: record.legalBasis ?? "",
    scope: record.scope,
    exceptions: record.exceptions,
    lifecycle: record.lifecycle as MandateFormInput["lifecycle"],
    phases: record.phases.map((phase) => ({
      slug: phase.slug,
      label: phase.label,
      phaseType: phase.phaseType,
      effectiveFrom: phase.effectiveFrom,
      effectiveTo: phase.effectiveTo ?? "",
      scope: phase.scope,
      exceptions: phase.exceptions,
      sort: phase.sort,
    })),
    sources: record.sources.map((source) => ({
      phaseSlug: source.phaseId ? (phaseSlugById.get(source.phaseId) ?? "") : "",
      kind: source.kind as "primary" | "secondary",
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      citation: source.citation ?? "",
      publishedOn: source.publishedOn ?? "",
      accessedOn: source.accessedOn,
      supports: source.supports,
    })),
  };
}

export function AdminMandates({
  records,
  jurisdictions,
}: {
  records: MandateRecord[];
  jurisdictions: Jurisdiction[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<MandateFormInput>(() => newMandate(jurisdictions));
  const [status, setStatus] = useState("new");
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const options = useMemo(
    () =>
      records.map((record) => ({
        value: String(record.id),
        label: `${record.jurisdictionName} · ${record.name}`,
        hint: `${record.status} · v${record.version} · ${record.reviewState}`,
      })),
    [records],
  );

  function select(value: string) {
    setSelectedId(value);
    setNotice(null);
    const record = records.find((item) => item.id === Number(value));
    if (record) {
      setForm(fromRecord(record));
      setStatus(record.status);
    }
  }

  function reset() {
    setSelectedId("");
    setForm(newMandate(jurisdictions));
    setStatus("new");
    setNotice(null);
  }

  function updatePhaseSlug(index: number, slug: string) {
    setForm((current) => {
      const previousSlug = current.phases[index]?.slug;
      return {
        ...current,
        phases: current.phases.map((phase, phaseIndex) =>
          phaseIndex === index ? { ...phase, slug } : phase,
        ),
        sources: previousSlug
          ? current.sources.map((source) =>
              source.phaseSlug === previousSlug
                ? { ...source, phaseSlug: slug }
                : source,
            )
          : current.sources,
      };
    });
  }

  function removePhase(index: number) {
    const phase = form.phases[index];
    if (!phase) return;
    if (form.sources.some((source) => source.phaseSlug === phase.slug)) {
      setNotice({
        kind: "error",
        text: "Reassign this phase's sources before removing it.",
      });
      return;
    }
    setForm((current) => ({
      ...current,
      phases: current.phases.filter((_, phaseIndex) => phaseIndex !== index),
    }));
  }

  function save(mode: "draft" | "publish") {
    setNotice(null);
    startTransition(async () => {
      const result =
        mode === "publish"
          ? await publishMandate(form)
          : await saveMandateDraft(form);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setForm((current) => ({
        ...current,
        id: result.id,
        expectedVersion: result.version,
      }));
      setSelectedId(String(result.id));
      setStatus(result.status);
      setNotice({
        kind: "ok",
        text: mode === "publish" ? "Published and marked reviewed." : "Draft saved.",
      });
      router.refresh();
    });
  }

  function archive() {
    if (!form.id) return;
    startTransition(async () => {
      const result = await archiveMandate({
        id: form.id!,
        expectedVersion: form.expectedVersion,
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setForm((current) => ({ ...current, expectedVersion: result.version }));
      setStatus("archived");
      setNotice({ kind: "ok", text: "Mandate archived." });
      router.refresh();
    });
  }

  return (
    <div className="stack-24">
      <section className="social-section">
        <div className="social-head">
          <h2>Record</h2>
          <span className="social-count">{records.length}</span>
        </div>
        <div className="evidence-toolbar">
          <AdminSearchPicker
            id="mandate-picker"
            placeholder="Find a mandate"
            options={options}
            value={selectedId}
            onChange={select}
          />
          <button type="button" className="btn btn-secondary" onClick={reset}>
            New mandate
          </button>
          <span className="badge badge-neutral">{status}</span>
          <span className="meta-mono">v{form.expectedVersion}</span>
        </div>
      </section>

      <section className="social-section">
        <div className="social-head"><h2>Mandate</h2></div>
        <div className="evidence-form-grid">
          <label className="form-label">Name<input className="evidence-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="form-label">Slug<input className="evidence-input mono" value={form.slug} readOnly={Boolean(form.id)} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
          <label className="form-label">Jurisdiction<select className="select evidence-input" value={form.jurisdictionFacetId} onChange={(event) => setForm({ ...form, jurisdictionFacetId: Number(event.target.value) })}>{jurisdictions.map((jurisdiction) => <option key={jurisdiction.id} value={jurisdiction.id}>{jurisdiction.name}</option>)}</select></label>
          <label className="form-label">Lifecycle<select className="select evidence-input" value={form.lifecycle} onChange={(event) => setForm({ ...form, lifecycle: event.target.value as MandateFormInput["lifecycle"] })}><option value="ahead">Ahead</option><option value="in-force">In force</option><option value="phased">Phased</option><option value="historical">Historical</option></select></label>
        </div>
        <label className="form-label">Summary<textarea className="textarea" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
        <label className="form-label">Legal basis<textarea className="textarea" value={form.legalBasis ?? ""} onChange={(event) => setForm({ ...form, legalBasis: event.target.value })} /></label>
        <div className="evidence-form-grid">
          <label className="form-label">Scope<textarea className="textarea" value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} /></label>
          <label className="form-label">Exceptions<textarea className="textarea" value={form.exceptions} onChange={(event) => setForm({ ...form, exceptions: event.target.value })} /></label>
        </div>
      </section>

      <section className="social-section">
        <div className="social-head">
          <h2>Phases</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm({ ...form, phases: [...form.phases, { slug: `phase-${form.phases.length + 1}`, label: "", phaseType: "obligation", effectiveFrom: "", effectiveTo: "", scope: "", exceptions: "", sort: form.phases.length }] })}>Add phase</button>
        </div>
        <div className="evidence-list">
          {form.phases.map((phase, index) => (
            <div className="evidence-item" key={index}>
              <div className="evidence-form-grid evidence-form-grid-3">
                <label className="form-label">Label<input className="evidence-input" value={phase.label} onChange={(event) => setForm({ ...form, phases: form.phases.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })} /></label>
                <label className="form-label">Slug<input className="evidence-input mono" value={phase.slug} onChange={(event) => updatePhaseSlug(index, event.target.value)} /></label>
                <label className="form-label">Type<input className="evidence-input" value={phase.phaseType} onChange={(event) => setForm({ ...form, phases: form.phases.map((item, itemIndex) => itemIndex === index ? { ...item, phaseType: event.target.value } : item) })} /></label>
                <label className="form-label">Effective from<input className="evidence-input" type="date" value={phase.effectiveFrom} onChange={(event) => setForm({ ...form, phases: form.phases.map((item, itemIndex) => itemIndex === index ? { ...item, effectiveFrom: event.target.value } : item) })} /></label>
                <label className="form-label">Effective to<input className="evidence-input" type="date" value={phase.effectiveTo ?? ""} onChange={(event) => setForm({ ...form, phases: form.phases.map((item, itemIndex) => itemIndex === index ? { ...item, effectiveTo: event.target.value } : item) })} /></label>
                <label className="form-label">Sort<input className="evidence-input" type="number" min={0} value={phase.sort} onChange={(event) => setForm({ ...form, phases: form.phases.map((item, itemIndex) => itemIndex === index ? { ...item, sort: Number(event.target.value) } : item) })} /></label>
              </div>
              <div className="evidence-form-grid">
                <label className="form-label">Scope<textarea className="textarea" value={phase.scope} onChange={(event) => setForm({ ...form, phases: form.phases.map((item, itemIndex) => itemIndex === index ? { ...item, scope: event.target.value } : item) })} /></label>
                <label className="form-label">Exceptions<textarea className="textarea" value={phase.exceptions} onChange={(event) => setForm({ ...form, phases: form.phases.map((item, itemIndex) => itemIndex === index ? { ...item, exceptions: event.target.value } : item) })} /></label>
              </div>
              {form.phases.length > 1 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => removePhase(index)}>Remove phase</button>}
            </div>
          ))}
        </div>
      </section>

      <section className="social-section">
        <div className="social-head">
          <h2>Sources</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm({ ...form, sources: [...form.sources, { phaseSlug: "", kind: "primary", title: "", publisher: "", url: "", citation: "", publishedOn: "", accessedOn: new Date().toISOString().slice(0, 10), supports: [] }] })}>Add source</button>
        </div>
        <div className="evidence-list">
          {form.sources.map((source, index) => (
            <div className="evidence-item" key={index}>
              <div className="evidence-form-grid evidence-form-grid-3">
                <label className="form-label">Title<input className="evidence-input" value={source.title} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })} /></label>
                <label className="form-label">Publisher<input className="evidence-input" value={source.publisher} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, publisher: event.target.value } : item) })} /></label>
                <label className="form-label">Kind<select className="select evidence-input" value={source.kind} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, kind: event.target.value as "primary" | "secondary" } : item) })}><option value="primary">Primary</option><option value="secondary">Secondary</option></select></label>
                <label className="form-label">URL<input className="evidence-input" type="url" value={source.url} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item) })} /></label>
                <label className="form-label">Phase<select className="select evidence-input" value={source.phaseSlug ?? ""} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, phaseSlug: event.target.value } : item) })}><option value="">Whole mandate</option>{form.phases.map((phase) => <option key={phase.slug} value={phase.slug}>{phase.label || phase.slug}</option>)}</select></label>
                <label className="form-label">Accessed<input className="evidence-input" type="date" value={source.accessedOn} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, accessedOn: event.target.value } : item) })} /></label>
              </div>
              <label className="form-label">Supports<input className="evidence-input" placeholder="dates, scope, exceptions" value={source.supports.join(", ")} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, supports: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : item) })} /></label>
              <label className="form-label">Citation<textarea className="textarea" value={source.citation ?? ""} onChange={(event) => setForm({ ...form, sources: form.sources.map((item, itemIndex) => itemIndex === index ? { ...item, citation: event.target.value } : item) })} /></label>
              {form.sources.length > 1 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, sources: form.sources.filter((_, itemIndex) => itemIndex !== index) })}>Remove source</button>}
            </div>
          ))}
        </div>
      </section>

      {notice && <div className={`notice ${notice.kind === "ok" ? "is-success" : "is-error"}`}>{notice.text}</div>}
      <div className="evidence-actions">
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => save("draft")}>Save draft</button>
        <button type="button" className="btn btn-primary" disabled={pending} onClick={() => save("publish")}>Publish and mark reviewed</button>
        {form.id && status !== "archived" && <button type="button" className="btn btn-danger" disabled={pending} onClick={archive}>Archive</button>}
      </div>
    </div>
  );
}