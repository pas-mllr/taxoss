import { createCsv } from "./csv";
import { METHODOLOGY_VERSION } from "./methodology";
import { PORTFOLIO_DECISION_LABELS, type PortfolioWorkspace } from "./portfolio-model";
import { SITE_URL } from "./site";
import { sourceExternalUrl } from "./sources";

export function createPortfolioCsv(
  workspace: PortfolioWorkspace,
  generatedAt: string,
): string {
  const facetName = new Map(
    [
      ...workspace.options.jurisdictions,
      ...workspace.options.domains,
      ...workspace.options.processes,
    ].map((facet) => [facet.slug, facet.name]),
  );
  const names = (slugs: string[]) =>
    slugs.map((slug) => facetName.get(slug) ?? slug).join(" | ");
  const scopeFacets = new Map(
    [
      ...workspace.options.jurisdictions,
      ...workspace.options.domains,
    ].map((facet) => [facet.id, facet]),
  );
  const selectedScope = workspace.selectedScopeFacetIds
    .map((id) => scopeFacets.get(id))
    .filter((facet): facet is NonNullable<typeof facet> => Boolean(facet));
  const scopeJurisdictions = selectedScope
    .filter((facet) => facet.kind === "jurisdiction")
    .map((facet) => facet.name)
    .join(" | ");
  const scopeDomains = selectedScope
    .filter((facet) => facet.kind === "subject")
    .map((facet) => facet.name)
    .join(" | ");

  const rows: unknown[][] = [
    [
      "generated_at_utc",
      "methodology_version",
      "methodology_url",
      "portfolio_name",
      "portfolio_scope_note",
      "portfolio_scope_jurisdictions",
      "portfolio_scope_tax_domains",
      "project",
      "repository_url",
      "taxoss_url",
      "decision_state",
      "private_notes",
      "archived",
      "jurisdictions",
      "tax_domains",
      "processes",
      "repository_activity",
      "repository_observed_at",
      "legal_currency",
      "legal_as_of",
      "legal_scope",
      "production_readiness",
      "publisher_provenance",
      "license_confidence",
      "review_state",
      "reviewed_at",
      "mandate_relationships",
      "evidence_sources",
    ],
  ];

  for (const project of workspace.projects) {
    const evaluation = project.evidence.evaluation;
    rows.push([
      generatedAt,
      METHODOLOGY_VERSION,
      `${SITE_URL}/methodology`,
      workspace.portfolio.name,
      workspace.portfolio.description,
      scopeJurisdictions,
      scopeDomains,
      `${project.owner}/${project.repo}`,
      sourceExternalUrl(project),
      `${SITE_URL}${project.href}`,
      PORTFOLIO_DECISION_LABELS[project.decisionState],
      project.notes,
      project.archived ? "Yes" : "No",
      names(project.jurisdictions),
      names(project.domains),
      names(project.processes),
      project.evidence.repositoryActivity.state,
      project.evidence.repositoryActivity.observedAt,
      project.evidence.legalCurrency,
      evaluation?.legalAsOf ?? "",
      evaluation?.legalScope ?? "",
      project.evidence.productionReadiness,
      evaluation
        ? [evaluation.publisherKind, evaluation.publisherName]
            .filter(Boolean)
            .join(" · ")
        : "Not reviewed",
      evaluation?.licenseConfidence ?? "unreviewed",
      evaluation?.reviewState ?? "not-reviewed",
      evaluation?.reviewedAt ?? "",
      project.evidence.mandates
        .map(
          (mandate) =>
            `${mandate.name} · ${mandate.relationship}${
              mandate.coverageNote ? ` · ${mandate.coverageNote}` : ""
            }${mandate.nextPhase ? ` · next ${mandate.nextPhase.effectiveFrom}` : ""}`,
        )
        .join(" | "),
      project.evidence.sources
        .map(
          (source) =>
            `${source.title} · ${source.publisher} · ${source.dimension} · observed ${source.observedOn} · ${source.url}`,
        )
        .join(" | "),
    ]);
  }

  return createCsv(rows);
}
