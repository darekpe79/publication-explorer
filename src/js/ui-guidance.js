(() => {
  "use strict";

  const BRAND = "Journexis";
  const SUBTITLE = "Publication & Journal Explorer";
  const AUTHOR = "Dariusz Perliński";

  function language() {
    return window.JournexisI18n?.getLanguage?.() || document.documentElement.lang || "pl";
  }

  function tr(pl, en) {
    return language() === "en" ? en : pl;
  }

  function setTextIfNeeded(element, text) {
    if (element && element.textContent.trim() !== text) element.textContent = text;
  }

  function setMeta(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.setAttribute("content", value);
  }

  function loadI18n() {
    if (window.JournexisI18n) return Promise.resolve();
    const existing = document.querySelector('script[data-journexis-i18n]');
    if (existing) {
      return new Promise(resolve => {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", resolve, { once: true });
      });
    }
    return new Promise(resolve => {
      const script = document.createElement("script");
      script.defer = true;
      script.src = "./src/js/i18n.js";
      script.dataset.journexisI18n = "true";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", resolve, { once: true });
      document.head.appendChild(script);
    });
  }

  function loadAnalytics() {
    if (document.querySelector('script[data-journexis-analytics]')) return;
    const script = document.createElement("script");
    script.defer = true;
    script.src = "./src/js/analytics.js";
    script.dataset.journexisAnalytics = "true";
    document.head.appendChild(script);
  }

  function applyBranding() {
    document.title = `${BRAND} · ${SUBTITLE}`;
    setMeta(
      'meta[name="description"]',
      tr(
        `${BRAND}: eksploracja publikacji naukowych, czasopism, Open Access, bibliometrii i danych MNiSW.`,
        `${BRAND}: explore scholarly publications, journals, Open Access, bibliometrics and MNiSW data.`
      )
    );
    setMeta('meta[property="og:title"]', `${BRAND} · ${SUBTITLE}`);
    setMeta('meta[name="twitter:title"]', `${BRAND} · ${SUBTITLE}`);

    const eyebrow = document.querySelector(".eyebrow");
    if (eyebrow && !eyebrow.dataset.journexisBranded) {
      eyebrow.innerHTML = `<span class="eyebrow-dot"></span>${BRAND} · ${SUBTITLE}`;
      eyebrow.dataset.journexisBranded = "true";
    }

    const lead = document.querySelector(".lead");
    setTextIfNeeded(
      lead,
      tr(
        "Sprawdź publikację lub czasopismo, porównaj informacje z kilku niezależnych źródeł i znajdź czasopisma według dyscypliny, punktacji oraz Open Access.",
        "Check a publication or journal, compare information from several independent sources, and find journals by discipline, points and Open Access status."
      )
    );

    const aboutIntro = document.querySelector("#tab-about .about-card > p");
    if (aboutIntro) {
      setTextIfNeeded(
        aboutIntro,
        tr(
          `${BRAND} łączy dane bibliograficzne, bibliometryczne, Open Access oraz informacje o czasopismach. Każdy sygnał pozostaje przypisany do źródła — aplikacja nie tworzy jednego „wyniku jakości” czasopisma.`,
          `${BRAND} combines bibliographic, bibliometric and Open Access data with journal information. Each signal remains attributed to its source — the application does not create a single journal “quality score”.`
        )
      );
    }

    let footer = document.querySelector(".author-credit");
    if (!footer) {
      footer = document.createElement("p");
      footer.className = "footer-note author-credit";
      footer.innerHTML = `${BRAND} · ${SUBTITLE} · © 2026 ${AUTHOR} · <a href="https://github.com/darekpe79/publication-explorer/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a>`;
      const main = document.querySelector("main.page");
      if (main) main.appendChild(footer);
    }
  }

  function addDisciplineHint(wrap) {
    if (!wrap) return;
    const title = wrap.querySelector(".discipline-title");
    const chips = wrap.querySelector(".discipline-chips");
    if (!title || !chips) return;

    let note = wrap.querySelector(".discipline-guidance");
    if (!note) {
      note = document.createElement("p");
      note.className = "section-intro-small discipline-guidance";
      title.insertAdjacentElement("afterend", note);
    }
    setTextIfNeeded(
      note,
      tr(
        "Wybierz dyscyplinę, aby zobaczyć poniżej 5 najwyżej punktowanych czasopism z tej samej dyscypliny.",
        "Select a discipline to see five of the highest-point journals from the same discipline below."
      )
    );
  }

  function applyGuidance() {
    applyBranding();

    setTextIfNeeded(
      document.querySelector("#search-help span"),
      tr(
        "Wklej DOI (sam identyfikator, „doi:…” albo adres doi.org). Po wyszukaniu zobaczysz metadane publikacji, dostęp Open Access, cytowania i informacje o czasopiśmie.",
        "Paste a DOI (the identifier itself, “doi:…” or a doi.org URL). After searching, you will see publication metadata, Open Access availability, citations and journal information."
      )
    );

    setTextIfNeeded(
      document.querySelector("#journal-search-form .search-help span"),
      tr(
        "Wpisz ISSN albo tytuł czasopisma. Dokładny ISSN otwiera profil od razu; po tytule najpierw zobaczysz pasujące czasopisma i wybierzesz właściwy profil.",
        "Enter an ISSN or journal title. An exact ISSN opens the profile immediately; a title search first shows matching journals so you can select the correct profile."
      )
    );

    setTextIfNeeded(
      document.querySelector("#finder-form .search-help span"),
      tr(
        "Wybierz dyscyplinę, zakres punktów i opcjonalny filtr Open Access, a następnie wybierz „Pokaż”. Wyniki są prezentowane alfabetycznie, nie jako ranking. Przy filtrze OA aplikacja sprawdza na żywo maksymalnie 60 pierwszych tytułów z wybranego zakresu.",
        "Choose a discipline, points range and optional Open Access filter, then select “Show”. Results are alphabetical, not ranked. With an OA filter, the app checks up to the first 60 titles in the selected range live. Official MNiSW discipline names are retained in Polish."
      )
    );

    document.querySelectorAll(".discipline-wrap").forEach(addDisciplineHint);

    document.querySelectorAll(".ministry-related-head p").forEach(paragraph => {
      setTextIfNeeded(
        paragraph,
        tr(
          "5 najwyżej punktowanych czasopism w wybranej dyscyplinie według wykazu MNiSW 2024.",
          "Five of the highest-point journals in the selected discipline according to the MNiSW 2024 list."
        )
      );
    });

    window.JournexisI18n?.refresh?.();
  }

  async function start() {
    await loadI18n();
    applyGuidance();
    loadAnalytics();
    document.addEventListener("journexis:languagechange", applyGuidance);
    const observer = new MutationObserver(applyGuidance);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
