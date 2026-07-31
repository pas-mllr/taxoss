import assert from "node:assert/strict";
import test from "node:test";
import { buildProjectSignalBundle, emptyProjectEvaluation } from "./evaluations";

const NOW = Date.parse("2026-07-31T12:00:00Z");

test("repository activity remains independent from legal currency", () => {
  const signals = buildProjectSignalBundle({
    pushedAt: new Date("2026-07-30T00:00:00Z"),
    archived: false,
    statsFetchedAt: new Date("2026-07-31T00:00:00Z"),
    evaluation: {
      ...emptyProjectEvaluation(),
      legalCurrency: "outdated",
      productionReadiness: "experimental",
    },
    observedAt: NOW,
  });

  assert.equal(signals.repositoryActivity.state, "active");
  assert.equal(signals.legalCurrency.state, "outdated");
  assert.equal(signals.productionReadiness.state, "experimental");
});

test("archived repositories and missing assessments stay explicit", () => {
  const signals = buildProjectSignalBundle({
    pushedAt: new Date("2026-07-30T00:00:00Z"),
    archived: true,
    statsFetchedAt: new Date("2026-07-31T00:00:00Z"),
    evaluation: null,
    observedAt: NOW,
  });

  assert.equal(signals.repositoryActivity.state, "archived");
  assert.equal(signals.legalCurrency.state, "unreviewed");
  assert.equal(signals.productionReadiness.state, "unreviewed");
  assert.equal(signals.scorecard.documentation, "unreviewed");
});