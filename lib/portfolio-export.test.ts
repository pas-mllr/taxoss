import assert from "node:assert/strict";
import test from "node:test";
import { createPortfolioCsv } from "./portfolio-export";
import type { PortfolioWorkspace } from "./portfolio-model";

const workspace: PortfolioWorkspace = {
  portfolio: { id: 1, name: "Global tax", description: "", version: 1 },
  options: {
    jurisdictions: [{ id: 1, kind: "jurisdiction", slug: "us", name: "United States" }],
    domains: [{ id: 2, kind: "subject", slug: "cbcr", name: "Country-by-Country Reporting" }],
    processes: [{ id: 3, kind: "process", slug: "report", name: "Report" }],
  },
  selectedScopeFacetIds: [1, 2],
  projects: [
    {
      id: 10,
      owner: "owner",
      repo: "repo",
      name: "repo",
      source: "github",
      sourceType: null,
      href: "/projects/owner/repo",
      archived: true,
      portfolioMember: true,
      version: 2,
      decisionState: "evaluating",
      notes: "=PRIVATE_CANARY\nSecond line",
      jurisdictions: ["us"],
      domains: ["cbcr"],
      processes: ["report"],
      evidence: {
        repositoryActivity: {
          state: "archived",
          pushedAt: "2026-01-01T00:00:00.000Z",
          observedAt: "2026-07-31T12:00:00.000Z",
        },
        legalCurrency: "current",
        productionReadiness: "pilot",
        scorecard: {},
        evaluation: {
          legalScope: "Scope",
          legalAsOf: "2026-07-31",
          publisherKind: "company",
          publisherName: "Publisher",
          licenseConfidence: "declared",
          editorialNote: null,
          reviewState: "current",
          reviewedAt: "2026-07-31T12:00:00.000Z",
        },
        sources: [
          {
            title: "Source",
            publisher: "Publisher",
            url: "https://example.com/source",
            dimension: "general",
            observedOn: "2026-07-31",
          },
        ],
        mandates: [
          {
            slug: "mandate",
            name: "Mandate",
            relationship: "reference",
            coverageNote: "Coverage",
            nextPhase: { label: "Phase", effectiveFrom: "2027-01-01" },
          },
        ],
      },
    },
  ],
  shortlist: [],
  catalog: [],
};

test("portfolio export is point-in-time, evidence-rich, and Excel-safe", () => {
  const csv = createPortfolioCsv(workspace, "2026-07-31T15:00:00.000Z");
  assert.match(csv, /2026-07-31T15:00:00\.000Z/);
  assert.match(csv, /2026-07-31\.2/);
  assert.match(csv, /"'=PRIVATE_CANARY\nSecond line"/);
  assert.match(csv, /United States/);
  assert.match(csv, /Country-by-Country Reporting/);
  assert.match(csv, /Mandate · reference · Coverage · next 2027-01-01/);
  assert.match(csv, /Source · Publisher · general · observed 2026-07-31/);
});

test("portfolio export contains only projects supplied by the owner-scoped workspace", () => {
  const csv = createPortfolioCsv(workspace, "2026-07-31T15:00:00.000Z");
  assert.ok(csv.includes("PRIVATE_CANARY"));
  assert.ok(!csv.includes("OTHER_ACCOUNT_CANARY"));
});
