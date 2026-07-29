const splitCsv = (value) => String(value || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export const config = Object.freeze({
  redisUrl: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "",
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "",
  hashSalt: process.env.ANALYTICS_HASH_SALT || "",
  adminToken: process.env.ADMIN_TOKEN || "",
  allowedOrigins: splitCsv(process.env.ALLOWED_ORIGINS),
  rateLimitPerMinute: Math.max(10, Math.min(600, Number(process.env.EVENT_RATE_LIMIT_PER_MINUTE) || 90)),
  rankingLimitMax: Math.max(8, Math.min(100, Number(process.env.RANKING_LIMIT_MAX) || 30)),
  dailyTtlSeconds: 60 * 60 * 24 * 45,
  rankingCacheSeconds: 60 * 10,
  namespace: "hm:tools:v1"
});

export function redisConfigured() {
  return Boolean(config.redisUrl && config.redisToken);
}

export function securityConfigured() {
  return config.hashSalt.length >= 32;
}
