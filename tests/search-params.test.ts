import test from "node:test";
import assert from "node:assert/strict";
import {
  getPaginationRange,
  normalizeDateParam,
  normalizeEnumParam,
  normalizeTextParam,
  parsePageParam,
  parseScalarParam
} from "@/lib/search-params";

test("parseScalarParam returns the first value from arrays", () => {
  assert.equal(parseScalarParam(["student-1", "student-2"]), "student-1");
  assert.equal(parseScalarParam("student-3"), "student-3");
  assert.equal(parseScalarParam(undefined), undefined);
});

test("parsePageParam falls back for invalid values and floors valid ones", () => {
  assert.equal(parsePageParam("3.9"), 3);
  assert.equal(parsePageParam("0", 2), 2);
  assert.equal(parsePageParam("abc", 4), 4);
});

test("normalizeDateParam handles explicit all-history and invalid dates", () => {
  assert.equal(normalizeDateParam("all", "2026-03-01"), "");
  assert.equal(normalizeDateParam("2026-03-09", "2026-03-01"), "2026-03-09");
  assert.equal(normalizeDateParam("09-03-2026", "2026-03-01"), "2026-03-01");
});

test("normalizeEnumParam only accepts whitelisted values", () => {
  const allowed = ["all", "active", "inactive"] as const;
  assert.equal(normalizeEnumParam("active", allowed, "all"), "active");
  assert.equal(normalizeEnumParam("deleted", allowed, "all"), "all");
});

test("normalizeTextParam strips reserved characters and limits length", () => {
  assert.equal(normalizeTextParam("  muscle(up), planche "), "muscle up   planche");
  assert.equal(normalizeTextParam("x".repeat(120)).length, 100);
});

test("getPaginationRange requests one extra row for hasNextPage detection", () => {
  assert.deepEqual(getPaginationRange(2, 20), { from: 20, to: 40 });
});
