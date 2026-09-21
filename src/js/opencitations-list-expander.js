(() => {
  "use strict";

  const INDEX_API_BASE = "https://api.opencitations.net/index/v2";
  const META_API_BASE = "https://api.opencitations.net/meta/v1";
  const META_BATCH_SIZE = 20;
  const metaCache = new Map();

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

  function cleanAgentName(value) {
    return String(value || "").replace(/\s*\[[^\]]*\]\s*$/, "").trim();
  }

  function authorText(value) {
    const names = String(value || "")
      .split(";")
      .map(cleanAgentName)
      .filter(Boolean);
    if (!names.length) return "";
    const shown = names.slice(0, 2);
    const suffix = names.length > 2 ? (language() === "en" ? "; et al." : "; i in.") : "";
    return shown.join("; ") + suffix;
  }

  function publicationYear(value) {
    const match = String(value || "").match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : "";
  }

  function metadataDoi(row) {
    return extractDoi(row?.id || "");
  }

  function addStyles() {
    if (document.getElementById("journexis-opencitations-meta-styles")) return;
    const style = document.createElement("style");
    style.id = "journexis-opencitations-meta-styles";
    style.textContent = `
      .opencitations-list li.oc-meta-item {
        margin: 10px 0;
      }
      .oc-meta-title {
        display: block;
        font-weight: 700;
        color: #172033;
        line-height: 1.35;
      }
      .oc-meta-byline {
        display: block;
        margin-top: 2px;
        color: #52627a;
        font-size: 12px;
        line-height: 1.4;
      }
      .oc-meta-doi {
        display: inline-block;
        margin-top: 3px;
        font-size: 12px;
      }
      .oc-meta-loading {
        color: #64748b;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  function renderAll(kind, rows) {
    const isCitations = kind === "citations";
    const dois = rows
      .map(row => extractDoi(isCitations ? row?.citing : row?.cited))
      .filter(Boolean);
    const unique = [...new Set(dois)];
    const title = isCitations
      ? tr("Publikacje cytujące dostępne w OpenCitations", "Citing publications available in OpenCitations")
      : tr("Pozycje z bibliografii dostępne w OpenCitations", "References available in OpenCitations");

    if (!unique.length) {
      return `<p class="opencitations-note">${escapeHtml(tr("OpenCitations nie zwróciło DOI do wyświetlenia dla tej listy.", "OpenCitations returned no DOI values to display for this list."))}</p>`;
    }

    const items = unique
      .map(doi => `<li data-oc-doi="${escapeHtml(doi)}"><a href="https://doi.org/${encodeURIComponent(doi)}" target="_blank" rel="noopener noreferrer">${escapeHtml(doi)}</a></li>`)
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
      const response = await fetch(`${INDEX_API_BASE}/${kind}/doi:${encodeURIComponent(doi)}`, {
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

  function doiFromListItem(li) {
    const fromData = normalizeDoi(li?.dataset?.ocDoi);
    if (fromData) return fromData;
    const link = li?.querySelector('a[href*="doi.org/"]');
    if (!link) return "";
    try {
      const url = new URL(link.href);
      return normalizeDoi(decodeURIComponent(url.pathname.replace(/^\//, "")));
    } catch (_) {
      return normalizeDoi(link.textContent);
    }
  }

  async function fetchMetadata(dois) {
    const unique = [...new Set((dois || []).map(normalizeDoi).filter(Boolean))];
    const missing = unique.filter(doi => !metaCache.has(doi.toLowerCase()));
    for (let start = 0; start < missing.length; start += META_BATCH_SIZE) {
      const batch = missing.slice(start, start + META_BATCH_SIZE);
      const ids = batch.map(doi => `doi:${encodeURIComponent(doi)}`).join("__");
      try {
        const response = await fetch(`${META_API_BASE}/metadata/${ids}`, {
          headers: { Accept: "application/json" }
        });
        if (!response.ok) throw new Error(`OpenCitations Meta HTTP ${response.status}`);
        const rows = await response.json();
        const seen = new Set();
        for (const row of Array.isArray(rows) ? rows : []) {
          const doi = metadataDoi(row);
          if (!doi) continue;
          const key = doi.toLowerCase();
          metaCache.set(key, row);
          seen.add(key);
        }
        batch.forEach(doi => {
          const key = doi.toLowerCase();
          if (!seen.has(key)) metaCache.set(key, null);
        });
      } catch (_) {
        batch.forEach(doi => {
          const key = doi.toLowerCase();
          if (!metaCache.has(key)) metaCache.set(key, null);
        });
      }
    }
  }

  function renderMetadata(li, doi, meta) {
    if (!li || li.dataset.ocMetaEnhanced === "true") return;
    const link = li.querySelector('a[href*="doi.org/"]');
    if (!link) return;

    li.dataset.ocMetaEnhanced = "true";
    li.classList.add("oc-meta-item");

    if (!meta) {
      link.textContent = `DOI: ${doi}`;
      link.classList.add("oc-meta-doi");
      return;
    }

    const title = String(meta.title || "").trim();
    const authors = authorText(meta.author);
    const year = publicationYear(meta.pub_date);
    const byline = [authors, year].filter(Boolean).join(" · ");

    const fragments = [];
    if (title) fragments.push(`<span class="oc-meta-title">${escapeHtml(title)}</span>`);
    if (byline) fragments.push(`<span class="oc-meta-byline">${escapeHtml(byline)}</span>`);
    fragments.push(`<a class="oc-meta-doi" href="https://doi.org/${encodeURIComponent(doi)}" target="_blank" rel="noopener noreferrer">DOI: ${escapeHtml(doi)}</a>`);
    li.innerHTML = fragments.join("");
  }

  async function enrichList(list) {
    if (!list || list.hidden) return;
    const items = [...list.querySelectorAll("ol > li")]
      .filter(li => li.dataset.ocMetaEnhanced !== "true");
    if (!items.length) return;

    const pairs = items
      .map(li => ({ li, doi: doiFromListItem(li) }))
      .filter(item => item.doi);
    if (!pairs.length) return;

    pairs.forEach(({ li }) => {
      li.dataset.ocMetaPending = "true";
    });

    await fetchMetadata(pairs.map(item => item.doi));

    pairs.forEach(({ li, doi }) => {
      if (!document.contains(li)) return;
      delete li.dataset.ocMetaPending;
      renderMetadata(li, doi, metaCache.get(doi.toLowerCase()) || null);
    });
  }

  function scan() {
    document.querySelectorAll(".opencitations-list").forEach(list => {
      ensureExpandButton(list);
      enrichList(list);
    });
  }

  function init() {
    addStyles();
    scan();
    const result = document.getElementById("result");
    if (!result) return;
    const observer = new MutationObserver(() => window.setTimeout(scan, 0));
    observer.observe(result, { childList: true, subtree: true });
    document.addEventListener("journexis:languagechange", () => {
      document.querySelectorAll(".opencitations-list li[data-oc-meta-enhanced]").forEach(li => {
        delete li.dataset.ocMetaEnhanced;
      });
      window.setTimeout(scan, 0);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
