import { config } from "./config.js";

const BUILTIN_ORIGINS = new Set([
  "https://www.healing-mart.com",
  "https://healing-mart.com",
  "https://www.blogger.com",
  "https://healingmart-tools-analytics.vercel.app"
]);

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (BUILTIN_ORIGINS.has(origin)) return true;
  if (config.allowedOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return false;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    return false;
  } catch {
    return false;
  }
}

export function applyCors(req, res) {
  const origin = String(req.headers.origin || "");
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export function handleOptions(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
