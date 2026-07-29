import crypto from "node:crypto";
import { config } from "./config.js";

export function requestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || String(req.headers["x-real-ip"] || "") || "unknown";
}

export function anonymousRateKey(req, minuteBucket) {
  const ip = requestIp(req);
  const salt = config.hashSalt || "development-only-salt";
  const digest = crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
  return `${config.namespace}:rate:${minuteBucket}:${digest}`;
}

export function isLikelyBot(req) {
  const ua = String(req.headers["user-agent"] || "");
  if (!ua) return false;
  return /bot|crawler|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|telegrambot|whatsapp/i.test(ua);
}

export function safeEqual(value, expected) {
  const left = Buffer.from(String(value || ""));
  const right = Buffer.from(String(expected || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
