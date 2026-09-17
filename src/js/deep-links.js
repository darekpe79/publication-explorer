(() => {
  "use strict";

  function loadOpenCitations() {
    if (document.querySelector('script[data-journexis-opencitations]')) return;
    const script = document.createElement("script");
    script.src = "./src/js/opencitations.js";
    script.dataset.journexisOpencitations = "true";
    document.head.appendChild(script);
  }

  function loadOpenCitationsControls() {
    if (document.querySelector('script[data-journexis-opencitations-controls]')) return;
    const script = document.createElement("script");
    script.src = "./src/js/opencitations-controls.js";
    script.dataset.journexisOpencitationsControls = "true";
    document.head.appendChild(script);
  }

  function setActiveTab(name) {
    document.querySelectorAll("[data-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.tab === name);
    });
    document.querySelectorAll("[data-tab-panel]").forEach(panel => {
      panel.hidden = panel.dataset.tabPanel !== name;
    });
  }

  function replaceJournalParams(kind, value) {
    if (!(window.location.protocol === "http:" || window.location.protocol === "https:")) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("doi");
    url.searchParams.delete("issn");
    url.searchParams.delete("title");
    if (kind && value) url.searchParams.set(kind, value);
    history.replaceState(null, "", url);
  }

  function looksLikeIssn(value) {
    return /^\d{4}-?\d{3}[\dXx]$/.test(String(value || "").trim());
  }

  function bindShareableJournalSearch() {
    const journalForm = document.getElementById("journal-search-form");
    const journalQuery = document.getElementById("journal-query");
    if (journalForm && journalQuery && journalForm.dataset.deepLinksBound !== "true") {
      journalForm.dataset.deepLinksBound = "true";
      journalForm.addEventListener("submit", () => {
        const value = journalQuery.value.trim();
        if (!value) return;
        replaceJournalParams(looksLikeIssn(value) ? "issn" : "title", value);
      });
    }

    const publicationForm = document.getElementById("search-form");
    if (publicationForm && publicationForm.dataset.deepLinksBound !== "true") {
      publicationForm.dataset.deepLinksBound = "true";
      publicationForm.addEventListener("submit", () => {
        if (!(window.location.protocol === "http:" || window.location.protocol === "https:")) return;
        const url = new URL(window.location.href);
        url.searchParams.delete("issn");
        url.searchParams.delete("title");
        history.replaceState(null, "", url);
      });
    }

    document.addEventListener("click", event => {
      const button = event.target.closest?.("[data-open-journal]");
      if (!button) return;
      const index = Number(button.dataset.openJournal);
      const raw = window.MINISTRY_DATA?.records?.[index];
      const firstIssn = raw?.[4]?.[0];
      if (firstIssn) replaceJournalParams("issn", firstIssn);
    });
  }

  function openIncomingJournalLink() {
    const params = new URLSearchParams(window.location.search);

    // DOI deep links are already handled natively by app.js.
    if (params.get("doi")) return;

    const issn = params.get("issn");
    const title = params.get("title");
    const query = issn || title;
    if (!query) return;

    const journalQuery = document.getElementById("journal-query");
    const journalForm = document.getElementById("journal-search-form");
    if (!journalQuery || !journalForm) return;

    setActiveTab("journal");
    journalQuery.value = query;
    journalForm.requestSubmit();
  }

  function ensureAttribution() {
    let footer = document.querySelector(".author-credit");
    if (!footer) {
      footer = document.createElement("p");
      footer.className = "footer-note author-credit";
      footer.innerHTML = `Journexis · Publication & Journal Explorer · © 2026 Dariusz Perliński · <a href="https://github.com/darekpe79/publication-explorer/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a>`;
      const main = document.querySelector("main.page");
      if (main) main.appendChild(footer);
    }

    const analyticsSettings = document.querySelector(".journexis-analytics-settings");
    if (analyticsSettings && analyticsSettings.parentElement !== footer) {
      footer.appendChild(analyticsSettings);
    }
  }

  loadOpenCitations();
  loadOpenCitationsControls();
  bindShareableJournalSearch();
  openIncomingJournalLink();
  ensureAttribution();
})();
