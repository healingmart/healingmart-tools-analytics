import { config, redisConfigured } from "./config.js";

function redisEndpoint(pathname) {
  return config.redisUrl.replace(/\/$/, "") + pathname;
}

export async function redisPipeline(commands) {
  if (!redisConfigured()) throw new Error("Redis is not configured.");
  if (!Array.isArray(commands) || !commands.length) return [];

  const response = await fetch(redisEndpoint("/pipeline"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.redisToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Redis HTTP ${response.status}: ${text.slice(0, 180)}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Unexpected Redis response.");
  return rows.map((row) => {
    if (row && row.error) throw new Error(String(row.error));
    return row ? row.result : null;
  });
}

export async function redisCommand(command) {
  const [result] = await redisPipeline([command]);
  return result;
}
