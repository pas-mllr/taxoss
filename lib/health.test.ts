import assert from "node:assert/strict";
import test from "node:test";
import { isProjectActive, projectHealth } from "./health";

const NOW = new Date("2026-01-01T00:00:00Z").getTime();

test("project health uses the supplied observation time", () => {
  const health = projectHealth(new Date("2025-12-20T00:00:00Z"), NOW);

  assert.equal(health?.key, "active");
});

test("project health keeps annual-cycle bands stable", () => {
  assert.equal(projectHealth(new Date("2025-07-02T00:00:00Z"), NOW)?.key, "maintained");
  assert.equal(projectHealth(new Date("2025-01-01T00:00:00Z"), NOW)?.key, "quiet");
  assert.equal(projectHealth(new Date("2024-01-01T00:00:00Z"), NOW)?.key, "stale");
  assert.equal(projectHealth(null, NOW), null);
});

test("archived projects are never active", () => {
  const pushedYesterday = new Date("2025-12-31T00:00:00Z");

  assert.equal(isProjectActive(pushedYesterday, false, NOW), true);
  assert.equal(isProjectActive(pushedYesterday, true, NOW), false);
  assert.equal(isProjectActive(null, false, NOW), false);
});