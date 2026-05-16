(function () {
  const visitorKey = "idart_visitor_id";
  let visitorId = localStorage.getItem(visitorKey);
  if (!visitorId) {
    visitorId = "v_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(visitorKey, visitorId);
  }

  function track(eventType, meta) {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        page: window.location.pathname.split("/").pop() || "idart-landing.html",
        source: document.referrer ? "referral" : "direct",
        visitorId,
        meta: meta || {}
      })
    }).catch(() => {});
  }

  window.idartTracking = { track, getVisitorId: () => visitorId };
  window.zionTracking = window.idartTracking;

  document.addEventListener("DOMContentLoaded", function () {
    track("page_view", { title: document.title });

    document.querySelectorAll("a, button").forEach(function (el) {
      const text = (el.textContent || "").trim();
      if (!text) return;

      if (
        /book|start|get|call|demo|consultation|strategy|contact/i.test(text) ||
        el.className.includes("cta") ||
        el.className.includes("btn-primary")
      ) {
        el.addEventListener("click", function () {
          track("cta_click", { text, href: el.getAttribute("href") || "" });
        });
      }
    });
  });
})();
