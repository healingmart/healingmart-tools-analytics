import test from "node:test";
import assert from "node:assert/strict";
import { rankingWeights, recentDateKeys, seoulDateKey } from "../lib/time.js";

test("ranking weights use 5/3/1", () => {
  const weights = rankingWeights(30);
  assert.equal(weights.length, 30);
  assert.equal(weights[0], 5);
  assert.equal(weights[6], 3);
  assert.equal(weights[7], 1);
});

test("recent date keys are unique", () => {
  const keys = recentDateKeys(30, new Date("2026-07-30T00:00:00Z"));
  assert.equal(keys.length, 30);
  assert.equal(new Set(keys).size, 30);
});

test("Seoul date key is stable", () => {
  assert.equal(seoulDateKey(new Date("2026-07-29T16:00:00Z")), "20260730");
});
