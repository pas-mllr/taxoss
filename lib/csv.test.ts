import assert from "node:assert/strict";
import test from "node:test";
import { createCsv, excelSafeCsvCell } from "./csv";

test("CSV cells are quoted and escape embedded quotes", () => {
  assert.equal(excelSafeCsvCell('Evidence "source"'), '"Evidence ""source"""');
});

test("CSV cells neutralize formulas including leading whitespace", () => {
  for (const value of ["=1+1", "+cmd", "-2+3", "@SUM(A1)", "  =HYPERLINK()", "\t=1"]) {
    assert.ok(excelSafeCsvCell(value).startsWith('"\''));
  }
});

test("CSV documents use a UTF-8 BOM and CRLF rows for Excel", () => {
  const csv = createCsv([
    ["name", "notes"],
    ["Project", "line one\nline two"],
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.endsWith("\r\n"));
  assert.equal(csv.split("\r\n").length, 3);
});
