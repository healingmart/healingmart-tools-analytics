import test from "node:test";
import assert from "node:assert/strict";
import { validateEvent, parseLimit } from "../lib/validation.js";

test("valid event", () => {
  const value = validateEvent({ toolId: "calculator:dday-calculator", toolType: "calculator", category: "date", actions: ["open", "search_click"] });
  assert.deepEqual(value.actions, ["open", "search_click"]);
});

test("rejects query-like or unsafe tool id", () => {
  assert.throws(() => validateEvent({ toolId: "../../secret", toolType: "webtool", category: "life", action: "open" }));
});

test("limit is clamped", () => {
  assert.equal(parseLimit("500", 30), 30);
  assert.equal(parseLimit("0", 30), 1);
});
