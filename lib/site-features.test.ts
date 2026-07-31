import assert from "node:assert/strict";
import test from "node:test";
import { areEditorialPagesEnabled, isEditorialPagePath } from "./site-features";

test("editorial pages are hidden only in production", () => {
  assert.equal(areEditorialPagesEnabled("production"), false);
  assert.equal(areEditorialPagesEnabled("development"), true);
  assert.equal(areEditorialPagesEnabled("test"), true);
  assert.equal(areEditorialPagesEnabled(undefined), true);
});

test("editorial page paths include descendants without matching similar prefixes", () => {
  assert.equal(isEditorialPagePath("/stack"), true);
  assert.equal(isEditorialPagePath("/stack/"), true);
  assert.equal(isEditorialPagePath("/radar/archive"), true);
  assert.equal(isEditorialPagePath("/insights"), true);
  assert.equal(isEditorialPagePath("/stacked"), false);
  assert.equal(isEditorialPagePath("/"), false);
});