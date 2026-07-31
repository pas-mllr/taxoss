import assert from "node:assert/strict";
import test from "node:test";
import { autoFacets, workspaceBackfillFacets } from "./auto-facets";

test("multinational tax language maps to explicit domains and processes", () => {
  const result = autoFacets(
    ["oecd", "global-minimum-tax"],
    "Pillar Two GloBE calculation and country-by-country reporting workpapers",
    "global-tax-workbench",
    ["compliance"],
  );

  assert.deepEqual(result.jurisdictions, []);
  assert.ok(result.subjects.includes("pillar-two"));
  assert.ok(result.subjects.includes("cbcr"));
  assert.ok(result.processes.includes("calculate"));
  assert.ok(result.processes.includes("report"));
});

test("category mapping covers the full tax workflow without a score", () => {
  const result = autoFacets([], null, "validator", ["tax-prep-filing"]);
  assert.deepEqual(result.processes, ["prepare", "validate", "file"]);
});

test("QDMTT is classified as Pillar Two", () => {
  assert.ok(autoFacets([], "QDMTT engine", "repo").subjects.includes("pillar-two"));
  assert.ok(
    workspaceBackfillFacets(
      [],
      "Qualified Domestic Minimum Top-up Tax engine",
      "repo",
      [],
    ).subjects.includes("pillar-two"),
  );
  assert.ok(
    autoFacets(
      [],
      "VAT personal tax return corporate income tax QDMTT",
      "repo",
    ).subjects.includes("pillar-two"),
  );
});

test("legacy backfill ignores descriptive process words and follows categories", () => {
  const result = workspaceBackfillFacets(
    [],
    "E-file and validate tax returns",
    "server",
    ["mcp-servers"],
  );
  assert.deepEqual(result.processes, ["interpret"]);
});