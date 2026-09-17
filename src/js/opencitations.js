(() => {
  "use strict";

  const API_BASE = "https://api.opencitations.net/index/v2";
  const RESULT_LIMIT = 20;
  const state = {
    doi: "",
    requestId: 0,
    citations: null,
    references: null,
    citationsRows: null,
    referencesRows: null
  };

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

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`OpenCitations HTTP ${response.status}`);
    return response.json();
  }

  async function fetchCount(kind, doi) {
    const payload = await fetchJson(`${API_BASE}/${kind}/doi:${encodeURIComponent(doi)}`);
    const value = Array.isArray(payload) ? payload[0]?.count : null;
    const count = Number(value);
    return Number.isFinite(count) ? count : 0;
  }

  async function fetchRows(kind, doi) {
    const payload = await fetchJson(`${API_BASE}/${kind}/doi:${encodeURIComponent(doi)}`);
    return Array.isArray(payload) ? payload : [];
  }

  function addStyles() {
    if (document.getElementById("journexis-opencitations-styles")) return;
    const style = document.createElement("style");
    style.id = "journexis-opencitations-styles";
    style.textContent = `
      .opencitations-panel { margin: 18px 20px 20px; padding: 18px; border: 1px solid #dbe4f0; border-radius: 16px; background: #fbfdff; }
      .opencitations-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 14px; }
      .opencitations-head h3 { margin: 0 0 4px; }
      .opencitations-head p { margin: 0; color: #64748b; font-size: 13px; }
      .opencitations-source-link { white-space: nowrap; font-size: 13px; }
      .opencitations-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .opencitations-stat { padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
      .opencitations-label { display: block; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
      .opencitations-value { display: block; margin-top: 4px; font-size: 25px; font-weight: 800; color: #172033; }
      .opencitations-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      .opencitations-button { border: 1px solid #cbd5e1; border-radius: 9px; background: #fff; padding: 8px 11px; color: #172033; font: inherit; cursor: pointer; }
      .opencitations-button:hover { border-color: #94a3b8; background: #f8fafc; }
      .opencitations-list { margin-top: 12px; }
      .opencitations-list[hidden] { display: none; }
      .opencitations-list-title { margin: 0 0 8px; font-size: 14px; font-weight: 800; }
      .opencitations-list ol { margin: 0; padding-left: 22px; }
      .opencitations-list li { margin: 6px 0; overflow-wrap: anywhere; }
      .opencitations-note { margin: 10px 0 0; color: #64748b; font-size: 12px; }
      .opencitations-error { margin: 0; color: #b42318; font-size: 13px; }
      .source-pill.opencitations::before { background: #6d5bd0; }
      @media (max-width: 620px) {
        .opencitations-panel { margin: 14px 12px 16px; padding: 14px; }
        .opencitations-head { display: block; }
        .opencitations-source-link { display: inline-block; margin-top: 6px; }
        .opencitations-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureSourceUi() {
    const lang = language();
    const sources = document.querySelector(".sources-intro");
    if (sources) {
      let pill = sources.querySelector(".source-pill.opencitations");
      if (!pill) {
        pill = document.createElement("span");
        pill.className = "source-pill opencitations";
        sources.appendChild(pill);
      }
      pill.textContent = lang === "en"
        ? "OpenCitations · citations and references"
        : "OpenCitations · cytowania i bibliografia";
    }

    const tbody = document.querySelector("#tab-about .about-table tbody");
    if (tbody && !tbody.querySelector("tr[data-opencitations-source]")) {
      const row = document.createElement("tr");
      row.dataset.opencitationsSource = "true";
      row.innerHTML = lang === "en"
        ? `<td><strong>OpenCitations</strong></td><td>Independent open citation data for publications: incoming citation count, reference count and DOI-level citation/reference links. Coverage may differ from Crossref and OpenAlex.</td>`
        : `<td><strong>OpenCitations</strong></td><td>Niezależne otwarte dane cytowaniowe dla publikacji: liczba cytowań przychodzących, liczba pozycji bibliografii oraz powiązania DOI dla cytowań i referencji. Pokrycie może różnić się od Crossref i OpenAlex.</td>`;
      const openAlexRow = [...tbody.rows].find(r => r.cells?.[0]?.textContent?.trim() === "OpenAlex");
      if (openAlexRow) openAlexRow.insertAdjacentElement("afterend", row);
      else tbody.appendChild(row);
    }
  }

  function renderLoading(panel) {
    panel.innerHTML = `
      <div class="opencitations-head">
        <div><h3>OpenCitations</h3><p>${escapeHtml(tr("Niezależne dane o cytowaniach dla tej publikacji.", "Independent citation data for this publication."))}</p></div>
        <a class="opencitations-source-link" href="https://opencitations.net/" target="_blank" rel="noopener noreferrer">OpenCitations ↗</a>
      </div>
      <p>${escapeHtml(tr("Pobieram liczbę cytowań i referencji…", "Retrieving citation and reference counts…"))}</p>`;
  }

  function renderError(panel) {
    panel.innerHTML = `
      <div class="opencitations-head">
        <div><h3>OpenCitations</h3><p>${escapeHtml(tr("Niezależne dane o cytowaniach dla tej publikacji.", "Independent citation data for this publication."))}</p></div>
        <a class="opencitations-source-link" href="https://opencitations.net/" target="_blank" rel="noopener noreferrer">OpenCitations ↗</a>
      </div>
      <p class="opencitations-error">${escapeHtml(tr("Nie udało się pobrać danych OpenCitations. Pozostałe dane Journexis pozostają bez zmian.", "OpenCitations data could not be retrieved. The rest of the Journexis record remains unchanged."))}</p>`;
  }

  function listHtml(kind, rows) {
    const isCitations = kind === "citations";
    const dois = rows.map(row => extractDoi(isCitations ? row?.citing : row?.cited)).filter(Boolean);
    const unique = [...new Set(dois)];
    const shown = unique.slice(0, RESULT_LIMIT);
    const title = isCitations
      ? tr("Publikacje cytujące — DOI", "Citing publications — DOI")
      : tr("Bibliografia — DOI", "References — DOI");

    if (!shown.length) {
      return `<p class="opencitations-note">${escapeHtml(tr("OpenCitations nie zwróciło DOI do wyświetlenia dla tej listy.", "OpenCitations returned no DOI values to display for this list."))}</p>`;
    }

    const items = shown.map(doi => `<li><a href="https://doi.org/${encodeURIComponent(doi)}" target="_blank" rel="noopener noreferrer">${escapeHtml(doi)}</a></li>`).join("");
    const limitNote = unique.length > RESULT_LIMIT
      ? `<p class="opencitations-note">${escapeHtml(tr(`Pokazuję pierwsze ${RESULT_LIMIT} z ${unique.length} rekordów z DOI.`, `Showing the first ${RESULT_LIMIT} of ${unique.length} records with DOI.`))}</p>`
      : "";
    return `<p class="opencitations-list-title">${escapeHtml(title)}</p><ol>${items}</ol>${limitNote}`;
  }

  function bindButtons(panel, doi) {
    panel.querySelectorAll("[data-oc-list]").forEach(button => {
      button.addEventListener("click", async () => {
        const kind = button.dataset.ocList;
        const target = panel.querySelector(`[data-oc-target="${kind}"]`);
        if (!target) return;

        if (!target.hidden) {
          target.hidden = true;
          return;
        }

        target.hidden = false;
        const cacheKey = kind === "citations" ? "citationsRows" : "referencesRows";
        if (state[cacheKey]) {
          target.innerHTML = listHtml(kind, state[cacheKey]);
          return;
        }

        target.innerHTML = `<p class="opencitations-note">${escapeHtml(tr("Pobieram listę…", "Retrieving list…"))}</p>`;
        button.disabled = true;
        try {
          const rows = await fetchRows(kind, doi);
          if (state.doi !== doi) return;
          state[cacheKey] = rows;
          target.innerHTML = listHtml(kind, rows);
        } catch (_) {
          target.innerHTML = `<p class="opencitations-error">${escapeHtml(tr("Nie udało się pobrać tej listy.", "This list could not be retrieved."))}</p>`;
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  function renderData(panel, doi, citationCount, referenceCount) {
    panel.innerHTML = `
      <div class="opencitations-head">
        <div>
          <h3>OpenCitations</h3>
          <p>${escapeHtml(tr("Osobne źródło cytowań — wartości mogą różnić się od Crossref i OpenAlex.", "A separate citation source — values may differ from Crossref and OpenAlex."))}</p>
        </div>
        <a class="opencitations-source-link" href="https://api.opencitations.net/index/v2" target="_blank" rel="noopener noreferrer">API ↗</a>
      </div>
      <div class="opencitations-grid">
        <div class="opencitations-stat"><span class="opencitations-label">${escapeHtml(tr("Cytowania", "Citations"))}</span><span class="opencitations-value">${escapeHtml(citationCount)}</span></div>
        <div class="opencitations-stat"><span class="opencitations-label">${escapeHtml(tr("Referencje", "References"))}</span><span class="opencitations-value">${escapeHtml(referenceCount)}</span></div>
      </div>
      <div class="opencitations-actions">
        <button class="opencitations-button" type="button" data-oc-list="citations">${escapeHtml(tr("Pokaż publikacje cytujące", "Show citing publications"))}</button>
        <button class="opencitations-button" type="button" data-oc-list="references">${escapeHtml(tr("Pokaż bibliografię", "Show references"))}</button>
      </div>
      <div class="opencitations-list" data-oc-target="citations" hidden></div>
      <div class="opencitations-list" data-oc-target="references" hidden></div>
      <p class="opencitations-note">${escapeHtml(tr("Źródło: OpenCitations Index API v2. Pokrycie bazy jest niezależne od innych źródeł używanych w Journexis.", "Source: OpenCitations Index API v2. Database coverage is independent of the other sources used by Journexis."))}</p>`;
    bindButtons(panel, doi);
  }

  async function loadForDoi(doi, panel) {
    const requestId = ++state.requestId;
    state.doi = doi;
    state.citations = null;
    state.references = null;
    state.citationsRows = null;
    state.referencesRows = null;
    renderLoading(panel);

    try {
      const [citations, references] = await Promise.all([
        fetchCount("citation-count", doi),
        fetchCount("reference-count", doi)
      ]);
      if (requestId !== state.requestId || state.doi !== doi) return;
      state.citations = citations;
      state.references = references;
      renderData(panel, doi, citations, references);
    } catch (_) {
      if (requestId !== state.requestId || state.doi !== doi) return;
      renderError(panel);
    }
  }

  function ensurePanel() {
    const result = document.getElementById("result");
    const input = document.getElementById("doi-input");
    if (!result || !input || !result.children.length) return;

    const doi = normalizeDoi(input.value);
    if (!/^10\.\d{4,9}\/.+/i.test(doi)) return;

    let panel = result.querySelector(".opencitations-panel");
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "opencitations-panel";
      panel.dataset.opencitations = "true";
      result.appendChild(panel);
    }

    if (panel.dataset.doi === doi && state.doi === doi) return;
    panel.dataset.doi = doi;
    loadForDoi(doi, panel);
  }

  function resetOnSearch() {
    const form = document.getElementById("search-form");
    if (!form) return;
    form.addEventListener("submit", () => {
      state.requestId++;
      state.doi = "";
      state.citationsRows = null;
      state.referencesRows = null;
      document.querySelector(".opencitations-panel")?.remove();
    });
  }

  function init() {
    addStyles();
    ensureSourceUi();
    resetOnSearch();

    const result = document.getElementById("result");
    if (result) {
      const observer = new MutationObserver(() => window.setTimeout(ensurePanel, 0));
      observer.observe(result, { childList: true, subtree: true });
      ensurePanel();
    }

    document.addEventListener("journexis:languagechange", () => {
      window.setTimeout(() => {
        ensureSourceUi();
        const panel = document.querySelector(".opencitations-panel");
        if (panel && state.doi) {
          if (Number.isFinite(state.citations) && Number.isFinite(state.references)) renderData(panel, state.doi, state.citations, state.references);
          else renderLoading(panel);
        }
      }, 0);
    });

    const about = document.getElementById("tab-about");
    if (about) {
      const aboutObserver = new MutationObserver(() => ensureSourceUi());
      aboutObserver.observe(about, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
