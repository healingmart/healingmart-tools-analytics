const ID_RE = /^[a-z0-9][a-z0-9:_-]{0,119}$/;
const TYPE_RE = /^(calculator|converter|webtool|game|collection)$/;
const CATEGORY_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const ACTIONS = new Set(["open", "search_click"]);

export function parseEventBody(req) {
  const body = req.body;
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body;
  if (typeof body === "string") {
    if (body.length > 4096) throw new Error("Request body is too large.");
    return JSON.parse(body || "{}");
  }
  if (Buffer.isBuffer(body)) {
    if (body.length > 4096) throw new Error("Request body is too large.");
    return JSON.parse(body.toString("utf8") || "{}");
  }
  return {};
}

export function validateEvent(input) {
  const toolId = String(input.toolId || "").trim().toLowerCase();
  const toolType = String(input.toolType || "webtool").trim().toLowerCase();
  const category = String(input.category || "life").trim().toLowerCase();
  const rawActions = Array.isArray(input.actions) ? input.actions : [input.action || "open"];
  const actions = [...new Set(rawActions.map((value) => String(value || "").trim().toLowerCase()))]
    .filter((value) => ACTIONS.has(value));

  if (!ID_RE.test(toolId)) throw new Error("Invalid toolId.");
  if (!TYPE_RE.test(toolType)) throw new Error("Invalid toolType.");
  if (!CATEGORY_RE.test(category)) throw new Error("Invalid category.");
  if (!actions.length || actions.length > 2) throw new Error("Invalid actions.");

  return { toolId, toolType, category, actions };
}

export function parseLimit(value, maximum) {
  const limit = Number(value);
  if (!Number.isFinite(limit)) return 12;
  return Math.max(1, Math.min(maximum, Math.floor(limit)));
}
