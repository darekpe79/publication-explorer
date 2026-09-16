(() => {
  "use strict";

  const CLOUDFLARE_WEB_ANALYTICS_TOKEN = "a3406ceed41a48dc90e07345148f0c53";

  if (document.querySelector('script[data-cf-beacon]')) return;

  const beacon = document.createElement("script");
  beacon.type = "module";
  beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
  beacon.setAttribute(
    "data-cf-beacon",
    JSON.stringify({ token: CLOUDFLARE_WEB_ANALYTICS_TOKEN })
  );
  document.body.appendChild(beacon);
})();
