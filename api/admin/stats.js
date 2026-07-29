import { applyCors, handleOptions } from "../../lib/cors.js";
import { config, redisConfigured } from "../../lib/config.js";
import { seoulDateKey } from "../../lib/time.js";
import { redisPipeline } from "../../lib/redis-rest.js";
import { safeEqual } from "../../lib/security.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  const auth = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!config.adminToken || !safeEqual(auth, config.adminToken)) return res.status(401).json({ ok: false, error: "unauthorized" });
  if (!redisConfigured()) return res.status(503).json({ ok: false, error: "storage_not_configured" });

  try {
    const [totals, toolCount] = await redisPipeline([
      ["HGETALL", `${config.namespace}:totals`],
["HLEN", `${config.namespace}:meta:${seoulDateKey()}`]
    ]);
    const parsed = {};
    if (Array.isArray(totals)) {
      for (let index = 0; index < totals.length; index += 2) parsed[String(totals[index])] = Number(totals[index + 1] || 0);
    }
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, totals: parsed, trackedToolCountToday: Number(toolCount || 0), timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("admin stats error", error);
    return res.status(500).json({ ok: false, error: "storage_error" });
  }
}
