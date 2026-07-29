import { applyCors, handleOptions, isAllowedOrigin } from "../lib/cors.js";
import { config, redisConfigured, securityConfigured } from "../lib/config.js";
import { redisCommand } from "../lib/redis-rest.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (!isAllowedOrigin(String(req.headers.origin || ""))) {
    return res.status(403).json({ ok: false, error: "origin_not_allowed" });
  }
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  let redis = "not_configured";
  if (redisConfigured()) {
    try {
      const pong = await redisCommand(["PING"]);
      redis = pong === "PONG" ? "connected" : "unexpected_response";
    } catch {
      redis = "connection_failed";
    }
  }

  const security = securityConfigured() ? "configured" : "not_configured";
  const healthy = redis === "connected" && security === "configured";

  res.setHeader("Cache-Control", "no-store");
  return res.status(healthy ? 200 : 503).json({
    ok: healthy,
    service: "healingmart-tools-analytics",
    version: "1.0.0",
    region: process.env.VERCEL_REGION || "local",
    redis,
    security,
    privacy: {
      rawIpStored: false,
      queryTextStored: false,
      calculatorInputsStored: false,
      filenamesStored: false
    },
    limits: {
      eventsPerMinute: config.rateLimitPerMinute,
      rankingLimitMax: config.rankingLimitMax
    },
    timestamp: new Date().toISOString()
  });
}
