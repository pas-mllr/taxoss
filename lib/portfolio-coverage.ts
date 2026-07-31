import {
  type PortfolioDecisionState,
  type WorkspaceCatalogProject,
  type WorkspacePortfolioProject,
} from "./portfolio-model";

const DECISION_PRIORITY: Record<PortfolioDecisionState, number> = {
  adopted: 5,
  pilot: 4,
  evaluating: 3,
  candidate: 2,
  "not-a-fit": 1,
};

export function coverageCandidates(
  catalog: WorkspaceCatalogProject[],
  jurisdiction: string,
  domain: string,
  process: string,
): WorkspaceCatalogProject[] {
  return catalog.filter(
    (project) =>
      project.jurisdictions.includes(jurisdiction) &&
      project.domains.includes(domain) &&
      project.processes.includes(process),
  );
}

export function highestDecisionState(
  projects: WorkspacePortfolioProject[],
): PortfolioDecisionState | null {
  return projects.reduce<PortfolioDecisionState | null>((highest, project) => {
    if (!highest || DECISION_PRIORITY[project.decisionState] > DECISION_PRIORITY[highest]) {
      return project.decisionState;
    }
    return highest;
  }, null);
}
