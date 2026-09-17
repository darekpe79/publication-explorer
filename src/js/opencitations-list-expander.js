(() => {
  "use strict";

  const API_BASE = "https://api.opencitations.net/index/v2";

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

  function extractDoi(value) {
    const text = String(value || "");
    const match = text.match(/(?:^|\s)doi:(10\.\d{4,9}\/\S+)/i);
    if (match) return match[1].replace(/[;,]+$/, "");
    const bare = text.match(/10\.\d{4,9}\/[^\s;]+/i);
    return bare ? bare[0].replace(/[;,]+$/, "") : "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function kindForList(list) {
    return list?.dataset?.ocTarget === "references" ? "references" : "citations";
  }

  function renderAll(kind, rows) {
    const isCitations = kind === "citations";
    const dois = rows
      .map(row => extractDoi(isCitations ? row?.citing : row?.cited))
      .filter(Boolean);
    const unique = [...new Set(dois)];
    const title = isCitations
      ? tr("Publikacje cytujące dostępne w OpenCitations — DOI", "Citing publications available in OpenCitations — DOI")
      : tr("Pozycje z bibliografii dostępne w OpenCitations — DOI", "References available in OpenCitations — DOI");

    if (!unique.length) {
      return `<p class="opencitations-note">${escapeHtml(tr("OpenCitations nie zwróciło DOI do wyświetlenia dla tej listy.", "OpenCitations returned no DOI values to display for this list."))}</p>`;
    }

    const items = unique
      .map(doi => `<li><a href="https://doi.org/${encodeURIComponent(doi)}" target="_blank" rel="noopener noreferrer">${escapeHtml(doi)}</a></li>`)
      .join("");

    return `<p class="opencitations-list-title">${escapeHtml(title)}</p><ol>${items}</ol><p class="opencitations-note">${escapeHtml(tr(`Pokazano wszystkie ${unique.length} rekordów z DOI.`, `Showing all ${unique.length} records with DOI.`))}</p>`;
  }

  async function expandList(list, button) {
    const box = list.closest(".opencitations-inline");
    const doi = normalizeDoi(box?.dataset?.doi || document.getElementById("doi-input")?.value);
    if (!doi) return;

    const kind = kindForList(list);
    button.disabled = true;
    button.textContent = tr("Pobieram…", "Loading…");

    try {
      const response = await fetch(`${API_BASE}/${kind}/doi:${encodeURIComponent(doi)}`, {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`OpenCitations HTTP ${response.status}`);
      const rows = await response.json();
      list.innerHTML = renderAll(kind, Array.isArray(rows) ? rows : []);
    } catch (_) {
      button.disabled = false;
      button.textContent = tr("Pokaż wszystkie", "Show all");
    }
  }

  function ensureExpandButton(list) {
    if (!list || list.hidden) return;
    if (list.querySelector("[data-oc-expand-all]")) return;

    const note = [...list.querySelectorAll(".opencitations-note")]
      .find(el => /Pokazuję pierwsze|Showing the first/i.test(el.textContent || ""));
    if (!note) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "opencitations-button";
    button.dataset.ocExpandAll = "true";
    button.textContent = tr("Pokaż wszystkie", "Show all");
    button.style.marginTop = "8px";
    button.addEventListener("click", () => expandList(list, button));
    note.insertAdjacentElement("afterend", button);
  }

  function scan() {
    document.querySelectorAll(".opencitations-list").forEach(ensureExpandButton);
  }

  function init() {
    scan();
    const result = document.getElementById("result");
    if (!result) return;
    const observer = new MutationObserver(() => window.setTimeout(scan, 0));
    observer.observe(result, { childList: true, subtree: true });
    document.addEventListener("journexis:languagechange", () => window.setTimeout(scan, 0));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
