(() => {
  "use strict";

  const CLOUDFLARE_WEB_ANALYTICS_TOKEN = "a3406ceed41a48dc90e07345148f0c53";
  const GA_MEASUREMENT_ID = "G-Y5MMVEE8TC";
  const CONSENT_STORAGE_KEY = "journexis_google_analytics_consent";

  function loadDeepLinks() {
    if (document.querySelector('script[data-journexis-deep-links]')) return;
    const script = document.createElement("script");
    script.src = "./src/js/deep-links.js";
    script.dataset.journexisDeepLinks = "true";
    document.head.appendChild(script);
  }

  function loadCloudflareAnalytics() {
    if (document.querySelector('script[data-cf-beacon]')) return;

    const beacon = document.createElement("script");
    beacon.type = "module";
    beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
    beacon.setAttribute(
      "data-cf-beacon",
      JSON.stringify({ token: CLOUDFLARE_WEB_ANALYTICS_TOKEN })
    );
    document.body.appendChild(beacon);
  }

  function ensureGtag() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  function loadGoogleAnalytics() {
    if (document.querySelector(`script[data-ga4-id="${GA_MEASUREMENT_ID}"]`)) return;

    ensureGtag();

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    script.dataset.ga4Id = GA_MEASUREMENT_ID;
    document.head.appendChild(script);

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID);
  }

  function trackEvent(name, params = {}) {
    if (localStorage.getItem(CONSENT_STORAGE_KEY) !== "granted") return;
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, params);
  }

  function bindProductEvents() {
    document.querySelectorAll(".app-tab[data-tab]").forEach(button => {
      if (button.dataset.analyticsBound === "true") return;
      button.dataset.analyticsBound = "true";
      button.addEventListener("click", () => {
        const moduleName = String(button.dataset.tab || "").trim();
        if (moduleName) trackEvent(`module_${moduleName}`);
      });
    });

    const trackedForms = [
      ["search-form", "search_publication"],
      ["journal-search-form", "search_journal"],
      ["finder-form", "search_finder"]
    ];

    trackedForms.forEach(([id, eventName]) => {
      const form = document.getElementById(id);
      if (!form || form.dataset.analyticsBound === "true") return;
      form.dataset.analyticsBound = "true";
      form.addEventListener("submit", () => trackEvent(eventName));
    });
  }

  function addConsentStyles() {
    if (document.getElementById("journexis-analytics-consent-styles")) return;

    const style = document.createElement("style");
    style.id = "journexis-analytics-consent-styles";
    style.textContent = `
      .journexis-analytics-consent {
        position: fixed;
        left: 16px;
        right: 16px;
        bottom: 16px;
        z-index: 9999;
        max-width: 760px;
        margin: 0 auto;
        padding: 14px 16px;
        border: 1px solid rgba(100, 116, 139, .35);
        border-radius: 14px;
        background: #fff;
        color: #172033;
        box-shadow: 0 12px 36px rgba(15, 23, 42, .18);
        font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .journexis-analytics-consent p { margin: 0 0 10px; }
      .journexis-analytics-consent-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .journexis-analytics-consent button,
      .journexis-analytics-settings {
        min-height: 38px;
        padding: 8px 12px;
        border-radius: 9px;
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #172033;
        font: inherit;
        cursor: pointer;
      }
      .journexis-analytics-consent button[data-choice="granted"] {
        border-color: #172033;
        background: #172033;
        color: #fff;
      }
      .journexis-analytics-settings {
        display: inline-block;
        margin-left: 8px;
        min-height: auto;
        padding: 2px 6px;
        border: 0;
        background: transparent;
        text-decoration: underline;
      }
      @media (max-width: 520px) {
        .journexis-analytics-consent { left: 10px; right: 10px; bottom: 10px; }
        .journexis-analytics-consent-actions { flex-direction: column; }
        .journexis-analytics-consent button { width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function hideConsentBanner() {
    document.querySelector(".journexis-analytics-consent")?.remove();
  }

  function setConsent(choice) {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    hideConsentBanner();
    if (choice === "granted") loadGoogleAnalytics();
  }

  function showConsentBanner() {
    hideConsentBanner();
    addConsentStyles();

    const banner = document.createElement("section");
    banner.className = "journexis-analytics-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Ustawienia analityki");
    banner.innerHTML = `
      <p><strong>Statystyki Journexis</strong><br>
      Cloudflare Web Analytics pomaga nam mierzyć ruch i wydajność strony. Google Analytics uruchamiamy tylko za Twoją zgodą, aby sprawdzać, które moduły i funkcje aplikacji są używane. Nie wysyłamy do GA treści wpisywanych DOI, ISSN ani tytułów.</p>
      <div class="journexis-analytics-consent-actions">
        <button type="button" data-choice="granted">Zgadzam się na Google Analytics</button>
        <button type="button" data-choice="denied">Nie zgadzam się</button>
      </div>
    `;

    banner.querySelectorAll("button[data-choice]").forEach(button => {
      button.addEventListener("click", () => setConsent(button.dataset.choice));
    });

    document.body.appendChild(banner);
  }

  function addSettingsControl() {
    if (document.querySelector(".journexis-analytics-settings")) return;

    const footer = document.querySelector(".author-credit") || document.querySelector(".footer-note:last-of-type");
    if (!footer) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "journexis-analytics-settings";
    button.textContent = "Ustawienia analityki";
    button.addEventListener("click", showConsentBanner);
    footer.appendChild(button);
  }

  function initGoogleAnalytics() {
    const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (consent === "granted") {
      loadGoogleAnalytics();
    } else if (consent !== "denied") {
      showConsentBanner();
    }
  }

  loadDeepLinks();
  loadCloudflareAnalytics();
  bindProductEvents();
  initGoogleAnalytics();
  addSettingsControl();
})();
