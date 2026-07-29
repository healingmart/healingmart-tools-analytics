import { applyCors, handleOptions, isAllowedOrigin } from "../lib/cors.js";
import { config, redisConfigured, securityConfigured } from "../lib/config.js";
import { redisPipeline } from "../lib/redis-rest.js";
import { anonymousRateKey, isLikelyBot } from "../lib/security.js";
import { seoulDateKey, utcMinuteBucket } from "../lib/time.js";
import { parseEventBody, validateEvent } from "../lib/validation.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  const origin = String(req.headers.origin || "");
  if (!isAllowedOrigin(origin)) return res.status(403).json({ ok: false, error: "origin_not_allowed" });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  if (!redisConfigured()) return res.status(503).json({ ok: false, error: "storage_not_configured" });
  if (!securityConfigured()) return res.status(503).json({ ok: false, error: "security_not_configured" });
  if (isLikelyBot(req)) return res.status(202).json({ ok: true, ignored: "bot" });

  let event;
  try {
    event = validateEvent(parseEventBody(req));
  } catch (error) {
    return res.status(400).json({ ok: false, error: "invalid_event", message: error.message });
  }

  try {
    const rateKey = anonymousRateKey(req, utcMinuteBucket());
    const [rateCount] = await redisPipeline([
      ["INCR", rateKey],
      ["EXPIRE", rateKey, "75"]
    ]);
    if (Number(rateCount) > config.rateLimitPerMinute) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ ok: false, error: "rate_limited" });
    }

    const day = seoulDateKey();
    const commands = [];
    for (const action of event.actions) {
      const key = `${config.namespace}:${action}:${day}`;
      commands.push(["ZINCRBY", key, "1", event.toolId]);
      commands.push(["EXPIRE", key, String(config.dailyTtlSeconds)]);
      commands.push(["HINCRBY", `${config.namespace}:totals`, action, "1"]);
    }
    const metaKey = `${config.namespace}:meta:${day}`;
    commands.push([
      "HSET",
      metaKey,
      event.toolId,
      JSON.stringify({ toolType: event.toolType, category: event.category })
    ]);
    commands.push(["EXPIRE", metaKey, String(config.dailyTtlSeconds)]);
    await redisPipeline(commands);

    res.setHeader("Cache-Control", "no-store");
    return res.status(202).json({ ok: true, accepted: event.actions });
  } catch (error) {
    console.error("analytics event error", error);
    return res.status(500).json({ ok: false, error: "storage_error" });
  }
}
