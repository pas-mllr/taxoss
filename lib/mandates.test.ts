import assert from "node:assert/strict";
import test from "node:test";
import { mandateReviewState, sortMandatePhases } from "./mandates";

const NOW = Date.parse("2026-07-31T12:00:00Z");

test("mandate review state distinguishes unreviewed, current, and overdue", () => {
  assert.equal(mandateReviewState(null, null, NOW), "unreviewed");
  assert.equal(
    mandateReviewState(new Date("2026-07-01T00:00:00Z"), new Date("2026-09-01T00:00:00Z"), NOW),
    "current",
  );
  assert.equal(
    mandateReviewState(new Date("2026-01-01T00:00:00Z"), new Date("2026-07-01T00:00:00Z"), NOW),
    "overdue",
  );
});

test("mandate phases sort by date-only value then explicit sort order", () => {
  const phases = sortMandatePhases([
    { effectiveFrom: "2027-01-01", sort: 2, label: "Second" },
    { effectiveFrom: "2026-09-01", sort: 3, label: "First" },
    { effectiveFrom: "2027-01-01", sort: 1, label: "Second, earlier row" },
  ]);

  assert.deepEqual(phases.map((phase) => phase.label), [
    "First",
    "Second, earlier row",
    "Second",
  ]);
});