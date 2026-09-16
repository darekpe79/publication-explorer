(() => {
  "use strict";

  const BRAND = "Journexis";
  const SUBTITLE = "Publication & Journal Explorer";
  const AUTHOR = "Dariusz Perliński";

  function setTextIfNeeded(element, text) {
    if (element && element.textContent.trim() !== text) element.textContent = text;
  }

  function setMeta(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.setAttribute("content", value);
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
    setMeta('meta[name="description"]', `${BRAND}: eksploracja publikacji naukowych, czasopism, Open Access, bibliometrii i danych MNiSW.`);
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
      "Sprawdź publikację lub czasopismo, porównaj informacje z kilku niezależnych źródeł i znajdź czasopisma według dyscypliny, punktacji oraz Open Access."
    );

    const aboutIntro = document.querySelector("#tab-about .about-card > p");
    if (aboutIntro) {
      setTextIfNeeded(
        aboutIntro,
        `${BRAND} łączy dane bibliograficzne, bibliometryczne, Open Access oraz informacje o czasopismach. Każdy sygnał pozostaje przypisany do źródła — aplikacja nie tworzy jednego „wyniku jakości” czasopisma.`
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
    if (!wrap || wrap.querySelector(".discipline-guidance")) return;
    const title = wrap.querySelector(".discipline-title");
    const chips = wrap.querySelector(".discipline-chips");
    if (!title || !chips) return;

    const note = document.createElement("p");
    note.className = "section-intro-small discipline-guidance";
    note.textContent = "Wybierz dyscyplinę, aby zobaczyć poniżej 5 najwyżej punktowanych czasopism z tej samej dyscypliny.";
    title.insertAdjacentElement("afterend", note);
  }

  function applyGuidance() {
    applyBranding();

    setTextIfNeeded(
      document.querySelector("#search-help span"),
      "Wklej DOI (sam identyfikator, „doi:…” albo adres doi.org). Po wyszukaniu zobaczysz metadane publikacji, dostęp Open Access, cytowania i informacje o czasopiśmie."
    );

    setTextIfNeeded(
      document.querySelector("#journal-search-form .search-help span"),
      "Wpisz ISSN albo tytuł czasopisma. Dokładny ISSN otwiera profil od razu; po tytule najpierw zobaczysz pasujące czasopisma i wybierzesz właściwy profil."
    );

    setTextIfNeeded(
      document.querySelector("#finder-form .search-help span"),
      "Wybierz dyscyplinę, zakres punktów i opcjonalny filtr Open Access, a następnie wybierz „Pokaż”. Wyniki są prezentowane alfabetycznie, nie jako ranking. Przy filtrze OA aplikacja sprawdza na żywo maksymalnie 60 pierwszych tytułów z wybranego zakresu."
    );

    document.querySelectorAll(".discipline-wrap").forEach(addDisciplineHint);

    document.querySelectorAll(".ministry-related-head p").forEach(paragraph => {
      setTextIfNeeded(
        paragraph,
        "5 najwyżej punktowanych czasopism w wybranej dyscyplinie według wykazu MNiSW 2024."
      );
    });
  }

  function start() {
    loadAnalytics();
    applyGuidance();
    const observer = new MutationObserver(applyGuidance);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
