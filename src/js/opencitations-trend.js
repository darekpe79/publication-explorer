(() => {
  "use strict";

  const API_BASE = "https://api.opencitations.net/index/v2";
  const state = {
    doi: "",
    rows: null,
    requestId: 0
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

  function yearFromCreation(value) {
    const match = String(value || "").match(/\b(19|20)\d{2}\b/);
    if (!match) return null;
    const year = Number(match[0]);
    return Number.isFinite(year) ? year : null;
  }

  function lastTenYears() {
    const current = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, index) => current - 9 + index);
  }

  function yearlyCounts(rows) {
    const years = lastTenYears();
    const counts = new Map(years.map(year => [year, 0]));
    let withDate = 0;
    let outsideWindow = 0;
    let withoutDate = 0;

    for (const row of rows || []) {
      const year = yearFromCreation(row?.creation);
      if (!year) {
        withoutDate++;
        continue;
      }
      withDate++;
      if (counts.has(year)) counts.set(year, counts.get(year) + 1);
      else outsideWindow++;
    }

    return {
      items: years.map(year => ({ year, count: counts.get(year) || 0 })),
      withDate,
      withoutDate,
      outsideWindow
    };
  }

  async function fetchCitations(doi) {
    const response = await fetch(`${API_BASE}/citations/doi:${encodeURIComponent(doi)}`, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`OpenCitations HTTP ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  }

  function ensureStyles() {
    if (document.getElementById("journexis-opencitations-trend-styles")) return;
    const style = document.createElement("style");
    style.id = "journexis-opencitations-trend-styles";
    style.textContent = `
      .opencitations-trend .citation-trend-method {
        margin: -4px 0 12px;
        color: #66738e;
        font-size: 12px;
        line-height: 1.45;
      }
      .opencitations-trend .citation-trend-footnote {
        margin: 10px 0 0;
        color: #66738e;
        font-size: 11px;
        line-height: 1.45;
      }
      .opencitations-trend.is-loading .citation-bars {
        opacity: .45;
      }
    `;
    document.head.appendChild(style);
  }

  function chartHtml(rows) {
    const summary = yearlyCounts(rows);
    const max = Math.max(...summary.items.map(item => item.count), 1);
    const bars = summary.items.map(item => {
      const height = item.count === 0 ? 2 : Math.max(2, Math.round((item.count / max) * 100));
      return `<div class="citation-bar-item">
        <span class="citation-bar-value">${item.count}</span>
        <span class="citation-bar-track"><span class="citation-bar-fill" style="height:${height}%"></span></span>
        <span class="citation-bar-year">${item.year}</span>
      </div>`;
    }).join("");

    const method = tr(
      "Jak powstaje wykres: każdy rekord cytowania z OpenCitations przypisujemy do roku z pola „creation”, czyli daty publikacji pracy cytującej. Pokazujemy ostatnie 10 lat.",
      "How the chart is built: each OpenCitations citation record is assigned to the year from the “creation” field, i.e. the publication date of the citing work. We show the last 10 years."
    );

    const footnoteParts = [tr(
      "Suma słupków nie musi być równa całkowitej liczbie cytowań, bo wykres obejmuje tylko ostatnie 10 lat",
      "The sum of the bars may differ from the total citation count because the chart covers only the last 10 years"
    )];
    if (summary.withoutDate) {
      footnoteParts.push(tr(
        `${summary.withoutDate} rekordów nie miało rozpoznawalnej daty`,
        `${summary.withoutDate} records had no usable date`
      ));
    }
    const footnote = `${footnoteParts.join("; ")}.`;

    return `
      <div class="citation-trend-head">
        <strong>${tr("Cytowania w czasie · OpenCitations", "Citations over time · OpenCitations")}</strong>
        <span>${tr("ostatnie 10 lat · data publikacji pracy cytującej", "last 10 years · citing work publication date")}</span>
      </div>
      <p class="citation-trend-method">${method}</p>
      <div class="citation-bars">${bars}</div>
      <p class="citation-trend-footnote">${footnote}</p>`;
  }

  function loadingHtml() {
    return `
      <div class="citation-trend-head">
        <strong>${tr("Cytowania w czasie · OpenCitations", "Citations over time · OpenCitations")}</strong>
        <span>${tr("pobieram dane…", "retrieving data…")}</span>
      </div>
      <p class="citation-trend-method">${tr(
        "Wykres budujemy z dat publikacji prac cytujących zwracanych przez OpenCitations.",
        "The chart is built from the publication dates of citing works returned by OpenCitations."
      )}</p>`;
  }

  function errorHtml() {
    return `
      <div class="citation-trend-head">
        <strong>${tr("Cytowania w czasie · OpenCitations", "Citations over time · OpenCitations")}</strong>
      </div>
      <span class="related-empty">${tr(
        "Nie udało się pobrać danych potrzebnych do wykresu OpenCitations.",
        "The data needed for the OpenCitations chart could not be retrieved."
      )}</span>`;
  }

  function ensureContainer(section) {
    let container = section.querySelector(".opencitations-trend");
    if (container) return container;

    const openAlexTrend = section.querySelector(".citation-trend:not(.opencitations-trend)");
    if (!openAlexTrend) return null;

    container = document.createElement("div");
    container.className = "citation-trend opencitations-trend";
    openAlexTrend.insertAdjacentElement("afterend", container);
    return container;
  }

  function renderFromState() {
    const result = document.getElementById("result");
    const section = result?.querySelector(".bibliometrics-section");
    if (!section || !state.doi) return;
    const container = ensureContainer(section);
    if (!container) return;
    if (state.rows) {
      container.classList.remove("is-loading");
      container.innerHTML = chartHtml(state.rows);
    }
  }

  async function loadForDoi(doi, container) {
    const requestId = ++state.requestId;
    state.doi = doi;
    state.rows = null;
    container.classList.add("is-loading");
    container.innerHTML = loadingHtml();

    try {
      const rows = await fetchCitations(doi);
      if (requestId !== state.requestId || state.doi !== doi) return;
      state.rows = rows;
      container.classList.remove("is-loading");
      container.innerHTML = chartHtml(rows);
    } catch (_) {
      if (requestId !== state.requestId || state.doi !== doi) return;
      container.classList.remove("is-loading");
      container.innerHTML = errorHtml();
    }
  }

  function ensureTrend() {
    const result = document.getElementById("result");
    const input = document.getElementById("doi-input");
    const section = result?.querySelector(".bibliometrics-section");
    if (!result || !input || !section) return;

    const doi = normalizeDoi(input.value);
    if (!/^10\.\d{4,9}\/.+/i.test(doi)) return;

    const container = ensureContainer(section);
    if (!container) return;

    if (state.doi === doi && state.rows) {
      container.innerHTML = chartHtml(state.rows);
      return;
    }
    if (state.doi === doi && container.classList.contains("is-loading")) return;
    loadForDoi(doi, container);
  }

  function resetOnSearch() {
    const form = document.getElementById("search-form");
    if (!form) return;
    form.addEventListener("submit", () => {
      state.requestId++;
      state.doi = "";
      state.rows = null;
      document.querySelector(".opencitations-trend")?.remove();
    });
  }

  function init() {
    ensureStyles();
    resetOnSearch();

    const result = document.getElementById("result");
    if (result) {
      const observer = new MutationObserver(() => window.setTimeout(ensureTrend, 0));
      observer.observe(result, { childList: true });
      ensureTrend();
    }

    document.addEventListener("journexis:languagechange", () => {
      window.setTimeout(() => {
        if (state.rows) renderFromState();
        else ensureTrend();
      }, 0);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
