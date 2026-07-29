import test from "node:test";
import assert from "node:assert/strict";

process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
process.env.ANALYTICS_HASH_SALT = "0123456789abcdef0123456789abcdef";
process.env.ADMIN_TOKEN = "test-admin-token";

const { default: eventHandler } = await import("../api/event.js");
const { default: rankingsHandler } = await import("../api/rankings.js");
const { default: healthHandler } = await import("../api/health.js");

function responseMock() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; this.ended = true; return this; },
    end() { this.ended = true; return this; }
  };
}

function requestMock({ method = "GET", origin = "https://www.healing-mart.com", body, query = {} } = {}) {
  return {
    method,
    body,
    query,
    headers: {
      origin,
      "user-agent": "Mozilla/5.0",
      "x-forwarded-for": "203.0.113.10"
    }
  };
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

test("event API accepts privacy-minimized tool events", async () => {
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    const commands = requests.at(-1);
    return jsonResponse(commands.map((command, index) => ({ result: index === 0 && command[0] === "INCR" ? 1 : "OK" })));
  };

  const req = requestMock({
    method: "POST",
    body: JSON.stringify({
      toolId: "calculator:dday-calculator",
      toolType: "calculator",
      category: "date",
      actions: ["open", "search_click"]
    })
  });
  const res = responseMock();
  await eventHandler(req, res);

  assert.equal(res.statusCode, 202);
  assert.deepEqual(res.body.accepted, ["open", "search_click"]);
  assert.equal(requests.length, 2);
  const flattened = JSON.stringify(requests);
  assert.equal(flattened.includes("searchText"), false);
  assert.equal(flattened.includes("calculatorInput"), false);
  assert.equal(flattened.includes("filename"), false);
});

test("rankings API returns open and search-click rankings", async () => {
  let call = 0;
  globalThis.fetch = async (_url, options) => {
    call += 1;
    const pipeline = JSON.parse(options.body);
    assert.equal(pipeline[0][0], "ZUNIONSTORE");
    const id = call === 1 ? "calculator:loan-calculator" : "converter:unit-m2-pyeong";
    return jsonResponse([
      { result: 30 },
      { result: 1 },
      { result: [id, call === 1 ? "42" : "37"] }
    ]);
  };

  const req = requestMock({ method: "GET", query: { limit: "12" } });
  const res = responseMock();
  await rankingsHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.popular[0].toolId, "calculator:loan-calculator");
  assert.equal(res.body.searched[0].toolId, "converter:unit-m2-pyeong");
  assert.equal(res.body.windowDays, 30);
});

test("health API verifies Redis connectivity", async () => {
  globalThis.fetch = async (_url, options) => {
    const pipeline = JSON.parse(options.body);
    assert.deepEqual(pipeline, [["PING"]]);
    return jsonResponse([{ result: "PONG" }]);
  };

  const req = requestMock({ method: "GET" });
  const res = responseMock();
  await healthHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.redis, "connected");
  assert.equal(res.body.privacy.rawIpStored, false);
});

test("event API rejects unapproved origins", async () => {
  globalThis.fetch = async () => { throw new Error("fetch should not run"); };
  const req = requestMock({ method: "POST", origin: "https://example.com", body: "{}" });
  const res = responseMock();
  await eventHandler(req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "origin_not_allowed");
});
