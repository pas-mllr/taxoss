import assert from "node:assert/strict";
import test from "node:test";
import { daysUntilDateOnly, formatDateOnly, parseDateOnlyUtc } from "./time";

test("date-only mandate values stay on the same UTC calendar day", () => {
  assert.equal(parseDateOnlyUtc("2027-01-01").toISOString(), "2027-01-01T00:00:00.000Z");
  assert.equal(formatDateOnly("2027-01-01"), "1 Jan 2027");
});

test("date-only countdown ignores the observation time of day", () => {
  assert.equal(daysUntilDateOnly("2026-08-03", Date.parse("2026-07-31T23:59:59Z")), 3);
  assert.equal(daysUntilDateOnly("2026-08-03", Date.parse("2026-08-03T12:00:00Z")), 0);
});

test("invalid date-only values are rejected", () => {
  assert.throws(() => parseDateOnlyUtc("2026-02-30"), /Invalid date-only value/);
});