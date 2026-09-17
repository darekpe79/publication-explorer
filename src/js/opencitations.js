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
      .opencitations-inline {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
      }
      .opencitations-explainer {
        margin: 0 0 10px;
        color: #52627a;
        font-size: 13px;
        line-height: 1.5;
      }
      .opencitations-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .opencitations-button {
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        background: #fff;
        padding: 8px 11px;
        color: #172033;
        font: inherit;
        cursor: pointer;
      }
      .opencitations-button:hover { border-color: #94a3b8; background: #f8fafc; }
      .opencitations-button[aria-expanded="true"] {
        background: #eef2ff;
        border-color: #8b8ae8;
        box-shadow: inset 0 0 0 1px #8b8ae8;
      }
      .opencitations-button:disabled { cursor: wait; opacity: .7; }
      .opencitations-list { margin-top: 12px; }
      .opencitations-list[hidden] { display: none; }
      .opencitations-list-title { margin: 0 0 8px; font-size: 14px; font-weight: 800; }
      .opencitations-list ol { margin: 0; padding-left: 22px; }
      .opencitations-list li { margin: 6px 0; overflow-wrap: anywhere; }
      .opencitations-note, .opencitations-status { margin: 9px 0 0; color: #64748b; font-size: 12px; }
      .opencitations-error { color: #b42318; }
      .source-pill.opencitations::before { background: #6d5bd0; }
    `;
    document.head.appendChild(style);
  }

  function ensureSourceUi() {
    const en = language() === "en";
    const sources = document.querySelector(".sources-intro");
    if (sources) {
      let pill = sources.querySelector(".source-pill.opencitations");
      if (!pill) {
        pill = document.createElement("span");
        pill.className = "source-pill opencitations";
        sources.appendChild(pill);
      }
      const text = en ? "OpenCitations · citation links" : "OpenCitations · relacje cytowaniowe";
      if (pill.textContent !== text) pill.textContent = text;
    }

    const tbody = document.querySelector("#tab-about .about-table tbody");
    if (tbody) {
      let row = tbody.querySelector("tr[data-opencitations-source]");
      if (!row) {
        row = document.createElement("tr");
        row.dataset.opencitationsSource = "true";
        const openAlexRow = [...tbody.rows].find(r => r.cells?.[0]?.textContent?.trim() === "OpenAlex");
        if (openAlexRow) openAlexRow.insertAdjacentElement("afterend", row);
        else tbody.appendChild(row);
      }
      const html = en
        ? `<td><strong>OpenCitations</strong></td><td>Citation links for a publication: works that cite it and works it cites. We show counts and DOI lists when available. Coverage may differ from OpenAlex and Crossref.</td>`
        : `<td><strong>OpenCitations</strong></td><td>Relacje cytowaniowe publikacji: prace, które ją cytują, oraz prace przez nią cytowane. Pokazujemy liczby i — gdy są dostępne — listy DOI. Pokrycie może różnić się od OpenAlex i Crossref.</td>`;
      if (row.innerHTML !== html) row.innerHTML = html;
    }
  }

  function updateBibliometricsIntro(section) {
    const intro = section.querySelector(".bibliometrics-intro");
    if (!intro) return;
    const text = tr(
      "Poniższe wskaźniki dotyczą tej konkretnej publikacji. Prosty podgląd danych dostępnych w OpenAlex, Crossref i OpenCitations. Liczby z różnych baz mogą się różnić, ponieważ każda z nich ma inny zakres indeksowania i sposób rejestrowania cytowań.",
      "The indicators below concern this specific publication. They provide a simple view of data available from OpenAlex, Crossref and OpenCitations. Values may differ because each database has different coverage and citation-recording methods."
    );
    if (intro.textContent !== text) intro.textContent = text;
  }

  function metricLabel(kind) {
    if (kind === "citations") return tr("cytowania", "citations");
    return tr("pozycje w bibliografii", "references");
  }

  function setMetricValue(card, value) {
    const el = card?.querySelector(".metric-value");
    if (!el) return;
    if (value === null || value === undefined) {
      if (el.textContent !== "—") el.textContent = "—";
      el.classList.add("metric-na");
      return;
    }
    const shown = Number(value).toLocaleString(language() === "en" ? "en-US" : "pl-PL");
    if (el.textContent !== shown) el.textContent = shown;
    el.classList.remove("metric-na");
  }

  function ensureMetricCard(grid, kind) {
    let card = grid.querySelector(`[data-opencitations-metric="${kind}"]`);
    if (!card) {
      card = document.createElement("div");
      card.className = "metric-card";
      card.dataset.opencitationsMetric = kind;
      card.innerHTML = `<span class="metric-source">OpenCitations</span><span class="metric-value metric-na">—</span><span class="metric-label"></span>`;

      const cards = [...grid.querySelectorAll(":scope > .metric-card")];
      if (kind === "citations") {
        const crossref = cards.find(x => x.querySelector(".metric-source")?.textContent?.trim() === "Crossref");
        if (crossref) crossref.insertAdjacentElement("afterend", card);
        else grid.appendChild(card);
      } else {
        const openAlexReference = cards.find(x => {
          const source = x.querySelector(".metric-source")?.textContent?.trim();
          const label = x.querySelector(".metric-label")?.textContent || "";
          return source === "OpenAlex" && /(bibliograf|reference)/i.test(label);
        });
        if (openAlexReference) openAlexReference.insertAdjacentElement("afterend", card);
        else grid.appendChild(card);
      }
    }

    const label = card.querySelector(".metric-label");
    const labelText = metricLabel(kind);
    if (label && label.textContent !== labelText) label.textContent = labelText;
    setMetricValue(card, kind === "citations" ? state.citations : state.references);
    return card;
  }

  function buttonLabel(kind, open) {
    if (kind === "citations") {
      return open ? tr("Ukryj publikacje cytujące", "Hide citing publications") : tr("Pokaż publikacje cytujące", "Show citing publications");
    }
    return open ? tr("Ukryj pozycje z bibliografii", "Hide references") : tr("Pokaż pozycje z bibliografii", "Show references");
  }

  function updateButtonLabels(box) {
    box.querySelectorAll("[data-oc-list]").forEach(button => {
      const kind = button.dataset.ocList;
      const target = box.querySelector(`[data-oc-target="${kind}"]`);
      const open = Boolean(target && !target.hidden);
      const label = buttonLabel(kind, open);
      if (button.textContent !== label) button.textContent = label;
      const expanded = open ? "true" : "false";
      if (button.getAttribute("aria-expanded") !== expanded) button.setAttribute("aria-expanded", expanded);
    });
  }

  function listHtml(kind, rows) {
    const isCitations = kind === "citations";
    const dois = rows.map(row => extractDoi(isCitations ? row?.citing : row?.cited)).filter(Boolean);
    const unique = [...new Set(dois)];
    const shown = unique.slice(0, RESULT_LIMIT);
    const title = isCitations
      ? tr("Publikacje cytujące dostępne w OpenCitations — DOI", "Citing publications available in OpenCitations — DOI")
      : tr("Pozycje z bibliografii dostępne w OpenCitations — DOI", "References available in OpenCitations — DOI");

    if (!shown.length) {
      return `<p class="opencitations-note">${escapeHtml(tr("OpenCitations nie zwróciło DOI do wyświetlenia dla tej listy.", "OpenCitations returned no DOI values to display for this list."))}</p>`;
    }

    const items = shown.map(doi => `<li><a href="https://doi.org/${encodeURIComponent(doi)}" target="_blank" rel="noopener noreferrer">${escapeHtml(doi)}</a></li>`).join("");
    const limitNote = unique.length > RESULT_LIMIT
      ? `<p class="opencitations-note">${escapeHtml(tr(`Pokazuję pierwsze ${RESULT_LIMIT} z ${unique.length} rekordów z DOI.`, `Showing the first ${RESULT_LIMIT} of ${unique.length} records with DOI.`))}</p>`
      : "";
    return `<p class="opencitations-list-title">${escapeHtml(title)}</p><ol>${items}</ol>${limitNote}`;
  }

  function ensureActions(section, doi) {
    let box = section.querySelector(".opencitations-inline");
    if (!box) {
      box = document.createElement("div");
      box.className = "opencitations-inline";
      box.innerHTML = `
        <p class="opencitations-explainer"></p>
        <div class="opencitations-actions">
          <button class="opencitations-button" type="button" data-oc-list="citations" aria-expanded="false"></button>
          <button class="opencitations-button" type="button" data-oc-list="references" aria-expanded="false"></button>
        </div>
        <div class="opencitations-list" data-oc-target="citations" hidden></div>
        <div class="opencitations-list" data-oc-target="references" hidden></div>
        <p class="opencitations-status"></p>
        <p class="opencitations-note"></p>`;
      const grid = section.querySelector(".metric-grid");
      if (grid) grid.insertAdjacentElement("afterend", box);
    }

    box.dataset.doi = doi;
    const explainer = box.querySelector(".opencitations-explainer");
    const explainerText = tr(
      "OpenCitations: „Publikacje cytujące” to prace, które cytują tę publikację; „pozycje z bibliografii” to prace cytowane przez tę publikację. Listy pokazują rekordy z DOI dostępne w OpenCitations.",
      "OpenCitations: “Citing publications” are works that cite this publication; “references” are works cited by it. The lists show records with DOI available in OpenCitations."
    );
    if (explainer && explainer.textContent !== explainerText) explainer.textContent = explainerText;

    const note = box.querySelector(".opencitations-note:last-child");
    const noteText = tr(
      "Pokrycie OpenCitations może różnić się od OpenAlex i Crossref, dlatego liczby nie muszą być takie same.",
      "OpenCitations coverage may differ from OpenAlex and Crossref, so the counts do not have to match."
    );
    if (note && note.textContent !== noteText) note.textContent = noteText;
    updateButtonLabels(box);

    if (box.dataset.bound !== "true") {
      box.dataset.bound = "true";
      box.addEventListener("click", async event => {
        const button = event.target.closest?.("[data-oc-list]");
        if (!button) return;
        const kind = button.dataset.ocList;
        const target = box.querySelector(`[data-oc-target="${kind}"]`);
        if (!target) return;

        if (!target.hidden) {
          target.hidden = true;
          updateButtonLabels(box);
          return;
        }

        box.querySelectorAll("[data-oc-target]").forEach(other => {
          if (other !== target) other.hidden = true;
        });
        target.hidden = false;
        updateButtonLabels(box);

        const cacheKey = kind === "citations" ? "citationsRows" : "referencesRows";
        if (state[cacheKey]) {
          target.innerHTML = listHtml(kind, state[cacheKey]);
          return;
        }

        target.innerHTML = `<p class="opencitations-note">${escapeHtml(tr("Pobieram listę…", "Retrieving list…"))}</p>`;
        button.disabled = true;
        try {
          const rows = await fetchRows(kind, state.doi);
          if (box.dataset.doi !== state.doi) return;
          state[cacheKey] = rows;
          target.innerHTML = listHtml(kind, rows);
        } catch (_) {
          target.innerHTML = `<p class="opencitations-note opencitations-error">${escapeHtml(tr("Nie udało się pobrać tej listy.", "This list could not be retrieved."))}</p>`;
        } finally {
          button.disabled = false;
          updateButtonLabels(box);
        }
      });
    }

    return box;
  }

  function setStatus(box, text, isError = false) {
    const status = box?.querySelector(".opencitations-status");
    if (!status) return;
    if (status.textContent !== text) status.textContent = text;
    status.classList.toggle("opencitations-error", Boolean(isError));
  }

  async function loadForDoi(doi, section, citationCard, referenceCard, box) {
    const requestId = ++state.requestId;
    state.doi = doi;
    state.citations = null;
    state.references = null;
    state.citationsRows = null;
    state.referencesRows = null;
    setMetricValue(citationCard, null);
    setMetricValue(referenceCard, null);
    setStatus(box, tr("Pobieram dane OpenCitations…", "Retrieving OpenCitations data…"));

    try {
      const [citations, references] = await Promise.all([
        fetchCount("citation-count", doi),
        fetchCount("reference-count", doi)
      ]);
      if (requestId !== state.requestId || state.doi !== doi) return;
      state.citations = citations;
      state.references = references;
      setMetricValue(citationCard, citations);
      setMetricValue(referenceCard, references);
      setStatus(box, "");
    } catch (_) {
      if (requestId !== state.requestId || state.doi !== doi) return;
      setMetricValue(citationCard, null);
      setMetricValue(referenceCard, null);
      setStatus(box, tr("Nie udało się pobrać danych OpenCitations.", "OpenCitations data could not be retrieved."), true);
    }
  }

  function ensureIntegration() {
    const result = document.getElementById("result");
    const input = document.getElementById("doi-input");
    if (!result || !input) return;

    result.querySelector(".opencitations-panel")?.remove();

    const section = result.querySelector(".bibliometrics-section");
    const grid = section?.querySelector(".metric-grid");
    if (!section || !grid) return;

    const doi = normalizeDoi(input.value);
    if (!/^10\.\d{4,9}\/.+/i.test(doi)) return;

    updateBibliometricsIntro(section);
    const citationCard = ensureMetricCard(grid, "citations");
    const referenceCard = ensureMetricCard(grid, "references");
    const box = ensureActions(section, doi);

    if (state.doi !== doi) {
      loadForDoi(doi, section, citationCard, referenceCard, box);
    } else {
      setMetricValue(citationCard, state.citations);
      setMetricValue(referenceCard, state.references);
      updateButtonLabels(box);
    }
  }

  function resetOnSearch() {
    const form = document.getElementById("search-form");
    if (!form) return;
    form.addEventListener("submit", () => {
      state.requestId++;
      state.doi = "";
      state.citations = null;
      state.references = null;
      state.citationsRows = null;
      state.referencesRows = null;
    });
  }

  function init() {
    addStyles();
    ensureSourceUi();
    resetOnSearch();

    const result = document.getElementById("result");
    if (result) {
      const observer = new MutationObserver(() => window.setTimeout(ensureIntegration, 0));
      observer.observe(result, { childList: true });
      ensureIntegration();
    }

    document.addEventListener("journexis:languagechange", () => {
      window.setTimeout(() => {
        ensureSourceUi();
        ensureIntegration();
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
