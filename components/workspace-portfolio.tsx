"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addPortfolioProject,
  removePortfolioProject,
  savePortfolioSettings,
  updatePortfolioProject,
} from "@/app/my-projects/actions";
import {
  PORTFOLIO_DECISION_LABELS,
  PORTFOLIO_DECISION_STATES,
  type PortfolioDecisionState,
  type PortfolioWorkspace,
  type WorkspacePortfolioProject,
} from "@/lib/portfolio-model";
import {
  coverageCandidates,
  highestDecisionState,
} from "@/lib/portfolio-coverage";

function label(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function PortfolioProjectEditor({
  project,
  selected,
  compareDisabled,
  onCompare,
  onRemoved,
}: {
  project: WorkspacePortfolioProject;
  selected: boolean;
  compareDisabled: boolean;
  onCompare: (selected: boolean) => void;
  onRemoved: (name: string) => void;
}) {
  const router = useRouter();
  const [version, setVersion] = useState(project.version);
  const [decisionState, setDecisionState] = useState(project.decisionState);
  const [notes, setNotes] = useState(project.notes);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setNotice(null);
    const submittedDecisionState = decisionState;
    const submittedNotes = notes;
    startTransition(async () => {
      const result = await updatePortfolioProject({
        projectId: project.id,
        expectedVersion: version,
        decisionState: submittedDecisionState,
        notes: submittedNotes,
      });
      setNotice(
        result.ok
          ? decisionState === submittedDecisionState && notes === submittedNotes
            ? "Saved."
            : "Earlier values saved. Save again to keep your latest edits."
          : result.error,
      );
      if (result.ok) {
        if (result.version) setVersion(result.version);
        router.refresh();
      }
    });
  }

  function remove() {
    if (!window.confirm(`Remove ${project.name} and its private decision notes from this portfolio?`)) {
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await removePortfolioProject({
        projectId: project.id,
        expectedVersion: version,
      });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      onRemoved(project.name);
      router.refresh();
    });
  }

  return (
    <div
      className="workspace-project"
      role="group"
      aria-labelledby={`portfolio-project-${project.id}`}
    >
      <div className="row-between workspace-project-head">
        <div>
          <Link
            id={`portfolio-project-${project.id}`}
            href={project.href}
            className="workspace-project-name"
          >
            {project.name}
          </Link>
          <p className="form-hint">
            {project.owner}/{project.repo}
            {project.archived ? " · Archived" : ""}
          </p>
        </div>
        <label className="workspace-compare-check">
          <input
            type="checkbox"
            aria-label={`Compare ${project.name}`}
            checked={selected}
            disabled={compareDisabled && !selected}
            onChange={(event) => onCompare(event.target.checked)}
          />
          Compare
        </label>
      </div>
      <div className="evidence-form-grid workspace-project-fields">
        <label className="form-label">
          Decision state
          <select
            className="select evidence-input"
            value={decisionState}
            disabled={pending}
            onChange={(event) => {
              setNotice(null);
              setDecisionState(event.target.value as PortfolioDecisionState);
            }}
          >
            {PORTFOLIO_DECISION_STATES.map((state) => (
              <option key={state} value={state}>
                {PORTFOLIO_DECISION_LABELS[state]}
              </option>
            ))}
          </select>
        </label>
        <label className="form-label">
          Private notes
          <textarea
            className="textarea"
            maxLength={4000}
            value={notes}
            disabled={pending}
            onChange={(event) => {
              setNotice(null);
              setNotes(event.target.value);
            }}
            placeholder="Decision context, owner, next step, or open question"
          />
        </label>
      </div>
      <div className="evidence-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={pending}
          aria-label={`Save decision for ${project.name}`}
          onClick={save}
        >
          Save decision
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={pending}
          aria-label={`Remove ${project.name} from portfolio`}
          onClick={remove}
        >
          Remove
        </button>
        <span className="form-hint" role="status" aria-live="polite">
          {notice ?? ""}
        </span>
      </div>
    </div>
  );
}

const COMPARISON_ROWS: {
  label: string;
  value: (project: WorkspacePortfolioProject) => ReactNode;
}[] = [
  {
    label: "Private decision",
    value: (project) =>
      project.portfolioMember
        ? PORTFOLIO_DECISION_LABELS[project.decisionState]
        : "Shortlist only",
  },
  {
    label: "Private notes",
    value: (project) =>
      project.portfolioMember ? project.notes || "None" : "Add to portfolio to record notes",
  },
  {
    label: "Taxonomy",
    value: (project) => (
      <span>
        Domains: {project.domains.join(" · ") || "Unclassified"}
        <br />
        Processes: {project.processes.join(" · ") || "Unclassified"}
        <br />
        Jurisdictions: {project.jurisdictions.join(" · ") || "Unclassified"}
      </span>
    ),
  },
  {
    label: "Repository activity",
    value: (project) => label(project.evidence.repositoryActivity.state),
  },
  { label: "Legal currency", value: (project) => label(project.evidence.legalCurrency) },
  {
    label: "Production readiness",
    value: (project) => label(project.evidence.productionReadiness),
  },
  {
    label: "Publisher provenance",
    value: (project) =>
      project.evidence.evaluation
        ? `${label(project.evidence.evaluation.publisherKind)}${
            project.evidence.evaluation.publisherName
              ? ` · ${project.evidence.evaluation.publisherName}`
              : ""
          }`
        : "Not reviewed",
  },
  {
    label: "License confidence",
    value: (project) =>
      project.evidence.evaluation
        ? label(project.evidence.evaluation.licenseConfidence)
        : "Not reviewed",
  },
  ...[
    ["Documentation", "documentation"],
    ["Automated tests", "automatedTests"],
    ["Release discipline", "releaseDiscipline"],
    ["Security process", "securityProcess"],
    ["Deployment operability", "deploymentOperability"],
    ["Data handling", "dataHandling"],
    ["Governance continuity", "governanceContinuity"],
    ["Support path", "supportPath"],
  ].map(([rowLabel, dimension]) => ({
    label: rowLabel,
    value: (project: WorkspacePortfolioProject) =>
      label(project.evidence.scorecard[dimension] ?? "unreviewed"),
  })),
  {
    label: "Mandate relationships",
    value: (project) =>
      project.evidence.mandates.length > 0 ? (
        <span className="workspace-comparison-links">
          {project.evidence.mandates.map((mandate) => (
            <Link key={`${mandate.slug}-${mandate.relationship}`} href={`/mandates/${mandate.slug}`}>
              {mandate.name} · {label(mandate.relationship)}
              {mandate.nextPhase ? ` · ${mandate.nextPhase.effectiveFrom}` : ""}
            </Link>
          ))}
        </span>
      ) : (
        "None recorded"
      ),
  },
  {
    label: "Evidence sources",
    value: (project) =>
      project.evidence.sources.length > 0 ? (
        <span className="workspace-comparison-links">
          {project.evidence.sources.map((source) => (
            <a key={`${source.dimension}-${source.url}`} href={source.url} target="_blank" rel="noreferrer">
              {source.title} · observed {source.observedOn}
            </a>
          ))}
        </span>
      ) : (
        "No published evidence"
      ),
  },
  {
    label: "Review state",
    value: (project) =>
      project.evidence.evaluation
        ? label(project.evidence.evaluation.reviewState)
        : "Not reviewed",
  },
];

function WorkspaceComparison({ projects }: { projects: WorkspacePortfolioProject[] }) {
  if (projects.length < 2) {
    return (
      <p className="form-hint">
        Select two to four shortlisted or portfolio projects to compare their evidence and private decision context.
      </p>
    );
  }
  return (
    <div className="admin-table-wrap workspace-comparison-wrap">
      <table className="admin-table workspace-comparison">
        <thead>
          <tr>
            <th>Dimension</th>
            {projects.map((project) => (
              <th key={project.id}>
                <Link href={project.href}>{project.name}</Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {projects.map((project) => (
                <td key={project.id}>{row.value(project)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="form-hint" style={{ marginTop: 10 }}>
        Dimensions stand alone. This comparison does not calculate a score or certify suitability.
      </p>
    </div>
  );
}

export function WorkspacePortfolio({
  workspace,
  shortlist,
}: {
  workspace: PortfolioWorkspace;
  shortlist: WorkspacePortfolioProject[];
}) {
  const router = useRouter();
  const [name, setName] = useState(workspace.portfolio.name);
  const [description, setDescription] = useState(workspace.portfolio.description);
  const [version, setVersion] = useState(workspace.portfolio.version);
  const [scopeFacetIds, setScopeFacetIds] = useState(
    workspace.selectedScopeFacetIds,
  );
  const defaultProcess =
    workspace.options.processes.find((process) => process.slug !== "unclassified")
      ?.slug ?? "unclassified";
  const [processSlug, setProcessSlug] = useState(defaultProcess);
  const [selectedCell, setSelectedCell] = useState<{
    jurisdiction: string;
    domain: string;
  } | null>(null);
  const [comparisonIds, setComparisonIds] = useState<number[]>([]);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [shortlistNotice, setShortlistNotice] = useState<string | null>(null);
  const [portfolioNotice, setPortfolioNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedJurisdictions = workspace.options.jurisdictions.filter((facet) =>
    scopeFacetIds.includes(facet.id),
  );
  const selectedDomains = workspace.options.domains.filter((facet) =>
    scopeFacetIds.includes(facet.id),
  );
  const facetLabels = new Map(
    [
      ...workspace.options.jurisdictions,
      ...workspace.options.domains,
      ...workspace.options.processes,
    ].map((facet) => [facet.slug, facet.name]),
  );
  const portfolioIds = new Set(workspace.projects.map((project) => project.id));
  const availableShortlist = shortlist.filter((project) => !portfolioIds.has(project.id));
  const comparisonCandidates = new Map(
    [...shortlist, ...workspace.projects].map((project) => [project.id, project]),
  );
  const comparisonProjects = comparisonIds
    .map((id) => comparisonCandidates.get(id))
    .filter((project): project is WorkspacePortfolioProject => Boolean(project));
  const selectedCellCandidates = selectedCell
    ? coverageCandidates(
        workspace.catalog,
        selectedCell.jurisdiction,
        selectedCell.domain,
        processSlug,
      )
    : [];

  function toggleScope(id: number) {
    setSettingsNotice(null);
    setSelectedCell(null);
    setScopeFacetIds((current) =>
      current.includes(id)
        ? current.filter((facetId) => facetId !== id)
        : [...current, id],
    );
  }

  function saveSettings() {
    setSettingsNotice(null);
    const submittedName = name;
    const submittedDescription = description;
    const submittedScopeFacetIds = [...scopeFacetIds].sort((left, right) => left - right);
    startTransition(async () => {
      const result = await savePortfolioSettings({
        expectedVersion: version,
        name: submittedName,
        description: submittedDescription,
        scopeFacetIds: submittedScopeFacetIds,
      });
      if (!result.ok) {
        setSettingsNotice(result.error);
        return;
      }
      if (result.version) setVersion(result.version);
      const currentScopeFacetIds = [...scopeFacetIds].sort((left, right) => left - right);
      setSettingsNotice(
        name === submittedName &&
          description === submittedDescription &&
          currentScopeFacetIds.join(",") === submittedScopeFacetIds.join(",")
          ? "Workspace scope saved."
          : "Earlier scope saved. Save again to keep your latest edits.",
      );
      router.refresh();
    });
  }

  function addProject(projectId: number) {
    setShortlistNotice(null);
    setPortfolioNotice(null);
    startTransition(async () => {
      const result = await addPortfolioProject({ projectId });
      if (!result.ok) {
        setShortlistNotice(result.error);
        return;
      }
      const project = shortlist.find((item) => item.id === projectId);
      setShortlistNotice(
        project ? `${project.name} added to portfolio.` : "Project added to portfolio.",
      );
      router.refresh();
    });
  }

  function setCompared(projectId: number, selected: boolean) {
    setComparisonIds((current) => {
      if (!selected) return current.filter((id) => id !== projectId);
      return current.length < 4 ? [...current, projectId] : current;
    });
  }

  return (
    <div className="stack-24">
      <section className="social-section">
        <div className="social-head">
          <h2>Portfolio scope</h2>
          <span className="badge badge-neutral">Private</span>
        </div>
        <div className="evidence-form-grid">
          <label className="form-label">
            Portfolio name
            <input
              className="evidence-input"
              maxLength={120}
              value={name}
              disabled={pending}
              onChange={(event) => {
                setSettingsNotice(null);
                setName(event.target.value);
              }}
            />
          </label>
          <label className="form-label">
            Scope note
            <textarea
              className="textarea"
              maxLength={1000}
              value={description}
              disabled={pending}
              onChange={(event) => {
                setSettingsNotice(null);
                setDescription(event.target.value);
              }}
              placeholder="Business footprint, reporting perimeter, or review objective"
            />
          </label>
        </div>
        <div className="workspace-scope-grid">
          <fieldset>
            <legend className="eyebrow">Jurisdictions</legend>
            <div className="workspace-checks">
              {workspace.options.jurisdictions.map((facet) => (
                <label key={facet.id}>
                  <input
                    type="checkbox"
                    checked={scopeFacetIds.includes(facet.id)}
                    disabled={pending}
                    onChange={() => toggleScope(facet.id)}
                  />
                  {facet.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="eyebrow">Tax domains</legend>
            <div className="workspace-checks">
              {workspace.options.domains.map((facet) => (
                <label key={facet.id}>
                  <input
                    type="checkbox"
                    checked={scopeFacetIds.includes(facet.id)}
                    disabled={pending}
                    onChange={() => toggleScope(facet.id)}
                  />
                  {facet.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="evidence-actions" style={{ marginTop: 18 }}>
          <button type="button" className="btn btn-primary" disabled={pending} onClick={saveSettings}>
            Save scope
          </button>
          <span className="form-hint" role="status" aria-live="polite">
            {settingsNotice ?? ""}
          </span>
        </div>
      </section>

      <section className="social-section">
        <div className="social-head">
          <h2>Coverage heatmap</h2>
          <label className="workspace-process-select">
            <span className="meta-mono">Process</span>
            <select
              className="select"
              value={processSlug}
              onChange={(event) => {
                setProcessSlug(event.target.value);
                setSelectedCell(null);
              }}
            >
              {workspace.options.processes.map((process) => (
                <option key={process.id} value={process.slug}>
                  {process.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedJurisdictions.length === 0 || selectedDomains.length === 0 ? (
          <div className="notice is-warning">
            Select at least one jurisdiction and one tax domain to build your heatmap.
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="workspace-heatmap">
              <thead>
                <tr>
                  <th>Jurisdiction</th>
                  {selectedDomains.map((domain) => (
                    <th key={domain.id}>{domain.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedJurisdictions.map((jurisdiction) => (
                  <tr key={jurisdiction.id}>
                    <th scope="row">{jurisdiction.name}</th>
                    {selectedDomains.map((domain) => {
                      const candidates = coverageCandidates(
                        workspace.catalog,
                        jurisdiction.slug,
                        domain.slug,
                        processSlug,
                      );
                      const decisions = workspace.projects.filter((project) =>
                        candidates.some((candidate) => candidate.id === project.id),
                      );
                      const highestState = highestDecisionState(decisions);
                      const isSelected =
                        selectedCell?.jurisdiction === jurisdiction.slug &&
                        selectedCell.domain === domain.slug;
                      return (
                        <td key={domain.id} className={candidates.length === 0 ? "is-gap" : ""}>
                          <button
                            type="button"
                            className="workspace-heatmap-cell"
                            aria-pressed={isSelected}
                            aria-label={`Show ${candidates.length} ${domain.name} ${processSlug} candidates for ${jurisdiction.name}`}
                            onClick={() =>
                              setSelectedCell(
                                isSelected
                                  ? null
                                  : {
                                      jurisdiction: jurisdiction.slug,
                                      domain: domain.slug,
                                    },
                              )
                            }
                          >
                            <strong>
                              {candidates.length === 0
                                ? "Gap"
                                : `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}`}
                            </strong>
                            {highestState && (
                              <small>{PORTFOLIO_DECISION_LABELS[highestState]}</small>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="workspace-heatmap-results" role="region" aria-live="polite">
          {selectedCell && (
            <>
            <span className="eyebrow">Matching candidates</span>
            {selectedCellCandidates.length > 0 ? (
              selectedCellCandidates.map((candidate) => {
                const portfolioProject = workspace.projects.find(
                  (project) => project.id === candidate.id,
                );
                return (
                  <div className="row-between" key={candidate.id}>
                    <Link href={candidate.href}>{candidate.name}</Link>
                    <span className="form-hint">
                      {portfolioProject
                        ? PORTFOLIO_DECISION_LABELS[portfolioProject.decisionState]
                        : "Not in portfolio"}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="form-hint">No matching project in the current public index.</p>
            )}
            </>
          )}
        </div>
        <p className="form-hint" style={{ marginTop: 10 }}>
          Gap means TaxOSS has no matching non-archived candidate for this scope and process. It is not a compliance conclusion.
        </p>
      </section>

      <section className="social-section">
        <div className="social-head">
          <h2>Portfolio projects</h2>
          <span className="social-count">{workspace.projects.length}</span>
        </div>
        {workspace.projects.length > 0 ? (
          <div className="workspace-project-list">
            {workspace.projects.map((project) => (
              <PortfolioProjectEditor
                key={project.id}
                project={project}
                selected={comparisonIds.includes(project.id)}
                compareDisabled={comparisonIds.length >= 4}
                onCompare={(selected) => setCompared(project.id, selected)}
                onRemoved={(projectName) => {
                  setShortlistNotice(null);
                  setComparisonIds((current) =>
                    current.filter((id) => id !== project.id),
                  );
                  setPortfolioNotice(`${projectName} removed from portfolio.`);
                }}
              />
            ))}
          </div>
        ) : (
          <p className="form-hint">
            Add candidates from your Shortlist below. Portfolio membership and notes stay independent from stars.
          </p>
        )}
        <p className="form-hint" role="status" aria-live="polite" style={{ marginTop: 10 }}>
          {portfolioNotice ?? ""}
        </p>
      </section>

      <section className="social-section">
        <div className="social-head">
          <h2>Add from Shortlist</h2>
          <span className="social-count">{availableShortlist.length}</span>
        </div>
        {availableShortlist.length > 0 ? (
          <div className="workspace-shortlist">
            {availableShortlist.map((project) => (
              <div className="row-between" key={project.id}>
                <div>
                  <Link href={project.href}>{project.name}</Link>
                  <p className="form-hint">
                    {project.owner}/{project.repo}
                    {project.archived ? " · Archived" : ""}
                  </p>
                </div>
                <div className="workspace-shortlist-actions">
                  <label className="workspace-compare-check">
                    <input
                      type="checkbox"
                      aria-label={`Compare ${project.name}`}
                      checked={comparisonIds.includes(project.id)}
                      disabled={comparisonIds.length >= 4 && !comparisonIds.includes(project.id)}
                      onChange={(event) => setCompared(project.id, event.target.checked)}
                    />
                    Compare
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={pending}
                    aria-label={`Add ${project.name} to portfolio`}
                    onClick={() => addProject(project.id)}
                  >
                    Add to portfolio
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="form-hint">
            No additional shortlisted projects. Star projects in the directory to build your candidate list.
          </p>
        )}
        <p
          className="form-hint"
          role="status"
          aria-live="polite"
          style={{ marginTop: 10 }}
        >
          {shortlistNotice ?? ""}
        </p>
      </section>

      <section className="social-section">
        <div className="social-head">
          <h2>Compare evidence</h2>
          <span className="social-count">{comparisonProjects.length}/4</span>
        </div>
        <WorkspaceComparison
          projects={comparisonProjects.map((project) => ({
            ...project,
            jurisdictions: project.jurisdictions.map(
              (slug) => facetLabels.get(slug) ?? slug,
            ),
            domains: project.domains.map((slug) => facetLabels.get(slug) ?? slug),
            processes: project.processes.map(
              (slug) => facetLabels.get(slug) ?? slug,
            ),
          }))}
        />
      </section>

      <div className="claim-band">
        <div className="stack-4">
          <span className="eyebrow">Decision record</span>
          <p>Export this private portfolio with evidence dates, sources, and methodology version.</p>
        </div>
        <a className="btn btn-secondary" href="/api/workspace/export">
          Export CSV
        </a>
      </div>
    </div>
  );
}
