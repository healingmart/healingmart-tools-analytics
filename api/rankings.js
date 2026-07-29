import { applyCors, handleOptions, isAllowedOrigin } from "../lib/cors.js";
import { config, redisConfigured } from "../lib/config.js";
import { redisPipeline } from "../lib/redis-rest.js";
import { fiveMinuteBucket, rankingWeights, recentDateKeys } from "../lib/time.js";
import { parseLimit } from "../lib/validation.js";

function interleavedToRows(values) {
  const rows = [];
  if (!Array.isArray(values)) return rows;
  for (let index = 0; index < values.length; index += 2) {
    const toolId = String(values[index] || "");
    const score = Number(values[index + 1] || 0);
    if (toolId) rows.push({ toolId, score });
  }
  return rows;
}

async function weightedRanking(action, limit) {
  const dates = recentDateKeys(30);
  const weights = rankingWeights(30);
  const keys = dates.map((day) => `${config.namespace}:${action}:${day}`);
  const cacheKey = `${config.namespace}:rank:${action}:${fiveMinuteBucket()}`;
  const zunion = ["ZUNIONSTORE", cacheKey, String(keys.length), ...keys, "WEIGHTS", ...weights.map(String), "AGGREGATE", "SUM"];
  const [, , values] = await redisPipeline([
    zunion,
    ["EXPIRE", cacheKey, String(config.rankingCacheSeconds)],
    ["ZRANGE", cacheKey, "0", String(limit - 1), "REV", "WITHSCORES"]
  ]);
  return interleavedToRows(values);
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (!isAllowedOrigin(String(req.headers.origin || ""))) return res.status(403).json({ ok: false, error: "origin_not_allowed" });
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  const limit = parseLimit(req.query?.limit, config.rankingLimitMax);
  if (!redisConfigured()) {
    return res.status(200).json({ ok: true, configured: false, popular: [], searched: [], generatedAt: new Date().toISOString() });
  }

  try {
    const [popular, searched] = await Promise.all([
      weightedRanking("open", limit),
      weightedRanking("search_click", limit)
    ]);
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      ok: true,
      configured: true,
      windowDays: 30,
      weighting: { today: 5, recentSevenDays: 3, remainingThirtyDays: 1 },
      popular,
      searched,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("rankings error", error);
    return res.status(500).json({ ok: false, error: "ranking_error", popular: [], searched: [] });
  }
}
