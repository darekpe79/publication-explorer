(() => {
  "use strict";

  function setTextIfNeeded(element, text) {
    if (element && element.textContent.trim() !== text) element.textContent = text;
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
