(() => {
  "use strict";

  const API_BASE = "https://api.opencitations.net/index/v2";
  const RESULT_LIMIT = 20;
  const cache = new Map();

  function language() {
    return window.JournexisI18n?.getLanguage?.() || document.documentElement.lang || "pl";
  }

  function tr(pl, en) {
    return language() === "en" ? en : pl;
  }

  function normalizeDoi(value) {
    return String(value || "")
      .trim()
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
      .replace(/^doi:\s*/i, "")
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function extractDoi(value) {
    const text = String(value || "");
    const match = text.match(/(?:^|\s)doi:(10\.\d{4,9}\/\S+)/i);
    if (match) return match[1].replace(/[;,]+$/, "");
    const bare = text.match(/10\.\d{4,9}\/[^\s;]+/i);
    return bare ? bare[0].replace(/[;,]+$/, "") : "";
  }

  function listTitle(kind) {
    return kind === "citations"
      ? tr("Publikacje cytujące dostępne w OpenCitations — DOI", "Citing publications available in OpenCitations — DOI")
      : tr("Pozycje z bibliografii dostępne w OpenCitations — DOI", "References available in OpenCitations — DOI");
  }

  function itemsHtml(dois) {
    return dois.map(doi => `<li><a href="https://doi.org/${encodeURIComponent(doi)}" target="_blank" rel="noopener noreferrer">${escapeHtml(doi)}</a></li>`).join("");
  }

  function renderLimited(target, kind, dois) {
    const shown = dois.slice(0, RESULT_LIMIT);
    target.innerHTML = `
      <p class="opencitations-list-title">${escapeHtml(listTitle(kind))}</p>
      <ol>${itemsHtml(shown)}</ol>
      <p class="opencitations-note">${escapeHtml(tr(`Pokazuję pierwsze ${shown.length} z ${dois.length} rekordów z DOI.`, `Showing the first ${shown.length} of ${dois.length} records with DOI.`))}</p>
      <button class="opencitations-button opencitations-show-all" type="button" data-oc-show-all>${escapeHtml(tr("Pokaż wszystkie", "Show all"))}</button>`;
  }

  function renderAll(target, kind, dois) {
    target.innerHTML = `
      <p class="opencitations-list-title">${escapeHtml(listTitle(kind))}</p>
      <ol>${itemsHtml(dois)}</ol>
      <p class="opencitations-note">${escapeHtml(tr(`Pokazuję wszystkie ${dois.length} rekordów z DOI.`, `Showing all ${dois.length} records with DOI.`))}</p>
      <button class="opencitations-button opencitations-show-all" type="button" data-oc-show-first>${escapeHtml(tr(`Pokaż pierwsze ${RESULT_LIMIT}`, `Show first ${RESULT_LIMIT}`))}</button>`;
  }

  async function fetchAll(kind, doi) {
    const key = `${doi}::${kind}`;
    if (cache.has(key)) return cache.get(key);

    const response = await fetch(`${API_BASE}/${kind}/doi:${encodeURIComponent(doi)}`, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`OpenCitations HTTP ${response.status}`);

    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : [];
    const isCitations = kind === "citations";
    const dois = rows
      .map(row => extractDoi(isCitations ? row?.citing : row?.cited))
      .filter(Boolean);
    const unique = [...new Set(dois)];
    cache.set(key, unique);
    return unique;
  }

  function addExpandButton(target) {
    if (!target || target.hidden || target.querySelector("[data-oc-show-all], [data-oc-show-first]")) return;
    const list = target.querySelector("ol");
    if (!list || list.children.length < RESULT_LIMIT) return;

    const note = [...target.querySelectorAll(".opencitations-note")].find(el => /20/.test(el.textContent || ""));
    if (!note) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "opencitations-button opencitations-show-all";
    button.dataset.ocShowAll = "true";
    button.textContent = tr("Pokaż wszystkie", "Show all");
    note.insertAdjacentElement("afterend", button);
  }

  function scan() {
    document.querySelectorAll("[data-oc-target]").forEach(addExpandButton);
  }

  function ensureStyles() {
    if (document.getElementById("journexis-opencitations-expand-styles")) return;
    const style = document.createElement("style");
    style.id = "journexis-opencitations-expand-styles";
    style.textContent = `.opencitations-show-all { margin-top: 8px; }`;
    document.head.appendChild(style);
  }

  document.addEventListener("click", async event => {
    const showAll = event.target.closest?.("[data-oc-show-all]");
    const showFirst = event.target.closest?.("[data-oc-show-first]");
    if (!showAll && !showFirst) return;

    const button = showAll || showFirst;
    const target = button.closest("[data-oc-target]");
    const kind = target?.dataset.ocTarget;
    const doi = normalizeDoi(document.getElementById("doi-input")?.value);
    if (!target || !kind || !doi) return;

    const key = `${doi}::${kind}`;

    if (showFirst) {
      const dois = cache.get(key);
      if (dois) renderLimited(target, kind, dois);
      return;
    }

    const original = button.textContent;
    button.disabled = true;
    button.textContent = tr("Pobieram…", "Loading…");
    try {
      const dois = await fetchAll(kind, doi);
      if (!dois.length) return;
      renderAll(target, kind, dois);
    } catch (_) {
      button.disabled = false;
      button.textContent = original;
    }
  });

  function init() {
    ensureStyles();
    scan();
    const result = document.getElementById("result");
    if (result) {
      const observer = new MutationObserver(() => window.setTimeout(scan, 0));
      observer.observe(result, { childList: true, subtree: true });
    }
    document.addEventListener("journexis:languagechange", () => window.setTimeout(scan, 0));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
