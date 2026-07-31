export const PORTFOLIO_DECISION_STATES = [
  "candidate",
  "evaluating",
  "pilot",
  "adopted",
  "not-a-fit",
] as const;

export type PortfolioDecisionState =
  (typeof PORTFOLIO_DECISION_STATES)[number];

export const PORTFOLIO_DECISION_LABELS: Record<
  PortfolioDecisionState,
  string
> = {
  candidate: "Candidate",
  evaluating: "Evaluating",
  pilot: "Pilot",
  adopted: "Adopted",
  "not-a-fit": "Not a fit",
};

export type WorkspaceFacet = {
  id: number;
  kind: string;
  slug: string;
  name: string;
};

export type WorkspaceEvidence = {
  repositoryActivity: {
    state: string;
    pushedAt: string | null;
    observedAt: string | null;
  };
  legalCurrency: string;
  productionReadiness: string;
  scorecard: Record<string, string>;
  evaluation: {
    legalScope: string | null;
    legalAsOf: string | null;
    publisherKind: string;
    publisherName: string | null;
    licenseConfidence: string;
    editorialNote: string | null;
    reviewState: string;
    reviewedAt: string | null;
  } | null;
  sources: {
    title: string;
    publisher: string;
    url: string;
    dimension: string;
    observedOn: string;
  }[];
  mandates: {
    slug: string;
    name: string;
    relationship: string;
    coverageNote: string | null;
    nextPhase: { label: string; effectiveFrom: string } | null;
  }[];
};

export type WorkspacePortfolioProject = {
  id: number;
  owner: string;
  repo: string;
  name: string;
  source: string;
  sourceType: string | null;
  href: string;
  archived: boolean;
  portfolioMember: boolean;
  version: number;
  decisionState: PortfolioDecisionState;
  notes: string;
  jurisdictions: string[];
  domains: string[];
  processes: string[];
  evidence: WorkspaceEvidence;
};

export type WorkspaceCatalogProject = {
  id: number;
  owner: string;
  repo: string;
  name: string;
  href: string;
  jurisdictions: string[];
  domains: string[];
  processes: string[];
};

export type PortfolioWorkspace = {
  portfolio: {
    id: number;
    name: string;
    description: string;
    version: number;
  };
  options: {
    jurisdictions: WorkspaceFacet[];
    domains: WorkspaceFacet[];
    processes: WorkspaceFacet[];
  };
  selectedScopeFacetIds: number[];
  projects: WorkspacePortfolioProject[];
  shortlist: WorkspacePortfolioProject[];
  catalog: WorkspaceCatalogProject[];
};
