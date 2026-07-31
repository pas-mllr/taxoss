import assert from "node:assert/strict";
import test from "node:test";
import {
  EvidenceVersionConflict,
  nextEvidenceVersion,
} from "./evidence-version";

test("new evidence starts at version one", () => {
  assert.equal(nextEvidenceVersion(null, 0), 1);
});

test("existing evidence increments only from the expected version", () => {
  assert.equal(nextEvidenceVersion(4, 4), 5);
  assert.throws(
    () => nextEvidenceVersion(5, 4),
    EvidenceVersionConflict,
  );
});