/* HealingMart Tools Analytics Client v1.0.0 */
(function (w, d) {
  "use strict";

  var current = d.currentScript;
  var inferredBase = "";
  try {
    inferredBase = current && current.src ? new URL(current.src).origin : "";
  } catch (error) {}

  var baseUrl = String(
    (current && current.getAttribute("data-base-url")) ||
    inferredBase ||
    "https://healingmart-tools-analytics.vercel.app"
  ).replace(/\/$/, "");

  var validId = /^[a-z0-9][a-z0-9:_-]{0,119}$/;
  var validType = /^(calculator|converter|webtool|game|collection)$/;
  var validCategory = /^[a-z0-9][a-z0-9-]{0,39}$/;
  var recent = Object.create(null);

  function normalize(input, actions) {
    input = input || {};
    var value = {
      toolId: String(input.toolId || "").trim().toLowerCase(),
      toolType: String(input.toolType || "webtool").trim().toLowerCase(),
      category: String(input.category || "life").trim().toLowerCase(),
      actions: actions
    };
    if (!validId.test(value.toolId)) throw new Error("Invalid toolId");
    if (!validType.test(value.toolType)) throw new Error("Invalid toolType");
    if (!validCategory.test(value.category)) throw new Error("Invalid category");
    return value;
  }

  function send(payload) {
    if (!baseUrl) return Promise.resolve({ ok: false, skipped: true });
    var body = JSON.stringify(payload);
    try {
      if (w.navigator && typeof w.navigator.sendBeacon === "function") {
        var blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
        if (w.navigator.sendBeacon(baseUrl + "/api/event", blob)) {
          return Promise.resolve({ ok: true, beacon: true });
        }
      }
    } catch (error) {}

    try {
      return fetch(baseUrl + "/api/event", {
        method: "POST",
        mode: "cors",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: body
      }).then(function (response) {
        return { ok: response.ok, status: response.status };
      }).catch(function () {
        return { ok: false };
      });
    } catch (error) {
      return Promise.resolve({ ok: false });
    }
  }

  function deduplicated(input, actions, windowMs) {
    var payload = normalize(input, actions);
    var key = payload.toolId + "|" + actions.join(",");
    var now = Date.now();
    if (recent[key] && now - recent[key] < (windowMs || 1500)) {
      return Promise.resolve({ ok: true, deduplicated: true });
    }
    recent[key] = now;
    return send(payload);
  }

  function trackOpen(input) {
    return deduplicated(input, ["open"], 1500);
  }

  function trackSearchClick(input) {
    return deduplicated(input, ["open", "search_click"], 1500);
  }

  function attach(root) {
    var target = root || d;
    target.addEventListener("click", function (event) {
      var node = event.target && event.target.closest
        ? event.target.closest("[data-hm-analytics-tool-id]")
        : null;
      if (!node) return;
      var input = {
        toolId: node.getAttribute("data-hm-analytics-tool-id"),
        toolType: node.getAttribute("data-hm-analytics-tool-type") || "webtool",
        category: node.getAttribute("data-hm-analytics-category") || "life"
      };
      if (node.getAttribute("data-hm-analytics-source") === "search") trackSearchClick(input);
      else trackOpen(input);
    }, true);
  }

  w.HM_TOOLS_ANALYTICS = Object.freeze({
    version: "1.0.0",
    baseUrl: baseUrl,
    trackOpen: trackOpen,
    trackSearchClick: trackSearchClick,
    attach: attach
  });
})(window, document);
