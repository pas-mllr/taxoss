import assert from "node:assert/strict";
import test from "node:test";
import { coverageCandidates, highestDecisionState } from "./portfolio-coverage";
import type {
  WorkspaceCatalogProject,
  WorkspacePortfolioProject,
} from "./portfolio-model";

const catalog: WorkspaceCatalogProject[] = [
  {
    id: 1,
    owner: "owner",
    repo: "match",
    name: "match",
    href: "/projects/owner/match",
    jurisdictions: ["us"],
    domains: ["cbcr"],
    processes: ["report"],
  },
  {
    id: 2,
    owner: "owner",
    repo: "global",
    name: "global",
    href: "/projects/owner/global",
    jurisdictions: ["global"],
    domains: ["cbcr"],
    processes: ["report"],
  },
];

function portfolioProject(
  id: number,
  decisionState: WorkspacePortfolioProject["decisionState"],
): WorkspacePortfolioProject {
  return {
    id,
    owner: "owner",
    repo: String(id),
    name: String(id),
    source: "github",
    sourceType: null,
    href: `/projects/owner/${id}`,
    archived: false,
    portfolioMember: true,
    version: 1,
    decisionState,
    notes: "",
    jurisdictions: ["us"],
    domains: ["cbcr"],
    processes: ["report"],
    evidence: {
      repositoryActivity: { state: "active", pushedAt: null, observedAt: null },
      legalCurrency: "unreviewed",
      productionReadiness: "unreviewed",
      scorecard: {},
      evaluation: null,
      sources: [],
      mandates: [],
    },
  };
}

test("coverage uses exact scope and excludes global-only projects", () => {
  assert.deepEqual(
    coverageCandidates(catalog, "us", "cbcr", "report").map((project) => project.id),
    [1],
  );
  assert.deepEqual(coverageCandidates(catalog, "us", "cbcr", "file"), []);
});

test("heatmap reports one highest private decision state", () => {
  assert.equal(
    highestDecisionState([
      portfolioProject(1, "candidate"),
      portfolioProject(2, "adopted"),
      portfolioProject(3, "not-a-fit"),
    ]),
    "adopted",
  );
  assert.equal(highestDecisionState([portfolioProject(1, "not-a-fit")]), "not-a-fit");
  assert.equal(highestDecisionState([]), null);
});
