(() => {
  "use strict";

  const BRAND = "Journexis";
  const SUBTITLE = "Publication & Journal Explorer";
  const AUTHOR = "Dariusz Perliński";
  let aboutPolishHtml = null;

  const ABOUT_EN_HTML = `
          <h2>About · Sources & Methodology</h2>
          <p>Journexis combines bibliographic, bibliometric and Open Access data with journal information. Each signal remains attributed to its source — the application does not create a single journal “quality score”.</p>
          <table class="about-table"><thead><tr><th>Source</th><th>How we use it</th></tr></thead><tbody>
            <tr><td><strong>Crossref</strong></td><td>DOI metadata, references and the source <em>is-referenced-by</em> count.</td></tr>
            <tr><td><strong>OpenAlex</strong></td><td>For publications: OA status, citations, FWCI, locations and topics of the individual work. For journals: source-level OA status, metrics and the <code>topics</code> field. We do not use <code>topic_share</code> as a substitute for the topics list because it describes a different property of the source.</td></tr>
            <tr><td><strong>MNiSW</strong></td><td>Journal-level data: the 2024 list provides current journal points and disciplines; the 2019, 2021 and 2023 lists are used for points history.</td></tr>
            <tr><td><strong>DOAJ</strong></td><td>OA status, APC, waivers, licences, peer review, publication time and preservation — when these data are present in the record.</td></tr>
            <tr><td><strong>ISSN Portal</strong></td><td>We try to retrieve public basic JSON-LD metadata and always provide direct links for each ISSN as well.</td></tr>
            <tr><td><strong>Diamond Discovery Hub</strong></td><td>At this stage, smart search by ISSN. DDH also provides OAI-PMH/JMEF data with Diamond OA criteria for possible full integration later.</td></tr>
            <tr><td><strong>Open Policy Finder</strong></td><td>Smart ISSN links to self-archiving and Open Access policies. The full API requires a key, so we do not expose it in public HTML.</td></tr>
            <tr><td><strong>SCImago</strong></td><td>Smart ISSN links to SJR, quartiles and other journal indicators.</td></tr>
            <tr><td><strong>Index Copernicus / ICI World of Journals</strong></td><td>A smart journal-title link to ICI search; the ISSN is shown alongside it for manual verification. The presence of a record in ICI World of Journals is not treated as equivalent to indexing in the ICI Journals Master List or to any particular ICV value.</td></tr>
            <tr><td><strong>JUFO / COPE</strong></td><td>Reference links for independently checking classifications and publishing standards; absence of a result is not interpreted as an assessment of the journal.</td></tr>
          </tbody></table>
          <div class="method-note"><strong>Important:</strong> database coverage differs. Different citation counts are not necessarily errors. A journal being absent from DOAJ, DDH, COPE or another registry does not automatically imply a reliability problem. The “Open Access, costs and transparency” section presents verifiable information only and does not classify journals as “predatory” or “non-predatory”.</div>

          <h3 style="margin-top:20px">Why can APC and OA information appear more than once?</h3>
          <p>Open Access and publication-fee information may come from several independent sources. OpenAlex and DOAJ are not always updated at the same time, so the application shows them separately. If APC values differ, we do not arbitrarily select one as correct. They should be treated as source data, and the current publisher price should be checked before submitting an article.</p>
          <p>Likewise, OA status can be described from several perspectives: OpenAlex has its own field indicating whether a journal is fully Open Access, while DOAJ confirms whether the title is present in its directory. A high share of OA works does not necessarily mean that the whole journal is fully OA.</p>

          <h3 style="margin-top:20px">ISSN validation</h3>
          <p>When a user enters an ISSN manually, the application also checks its check digit. This validation applies to user input; identifiers originating from official or external datasets are preserved as source data and are not silently discarded.</p>

          <h3 style="margin-top:20px">Journal Open Access status</h3>
          <p>For journals, we present two independently described sources. DOAJ confirms presence in the DOAJ directory, while OpenAlex has its own <code>is_oa</code> field indicating whether the source is currently fully Open Access. OpenAlex also provides, among other things, information about DOAJ presence, a high share of OA works, the OA flip year, the number of OA works and — when available — the listed APC price. We do not apply the Gold, Green, Hybrid and Bronze categories used for individual publications to a journal as a whole.</p>

          <h3 style="margin-top:20px">How does the Open Access filter work?</h3>
          <p><strong>All journals (OA and non-OA)</strong> applies no Open Access condition. Titles are shown regardless of publishing model.</p>
          <p><strong>Fully OA — DOAJ or OpenAlex</strong> shows journals for which full Open Access is confirmed by at least one of two sources: a DOAJ record or <code>is_oa=true</code> in OpenAlex. The result indicates which source provided the match.</p>
          <p><strong>Journals in DOAJ only</strong> requires a record in the Directory of Open Access Journals. <strong>Fully OA according to OpenAlex</strong> requires <code>is_oa=true</code> in the OpenAlex source profile.</p>
          <p>We do not infer <strong>Diamond OA</strong> status merely from full OA and the absence of APC. That is not sufficient for a reliable classification. Diamond remains a separate signal checked in a specialised source such as Diamond Discovery Hub.</p>

          <h3 style="margin-top:20px">How does journal search work?</h3>
          <p>An <strong>exact ISSN</strong> is an unambiguous identifier, so the application immediately builds a full journal profile. If the ISSN is present in the MNiSW 2024 list, the profile combines ministerial data with OpenAlex, DOAJ and other sources. If the ISSN is not present in MNiSW, the application still attempts to build the profile from available external sources.</p>
          <p>A <strong>title or title fragment</strong> may match several records, so we first show a list of candidates with a “Show profile” button. The same list mechanism is used in the “Find a journal” module.</p>

          <h3 style="margin-top:20px">Journal finder</h3>
          <p>The “Find a journal” mode uses <strong>disciplines assigned to journals</strong> and points from the MNiSW 2024 list. The user selects a points range; results are not a “Top” ranking but an alphabetical list of journals that meet the selected criteria. The OA filter can keep all titles, require DOAJ presence, require <code>is_oa=true</code> in OpenAlex, or accept confirmation from at least one of those two sources.</p>

          <h3 style="margin-top:20px">Publication vs journal — what do the data describe?</h3>
          <p><strong>Publication data</strong> include, among other things, DOI, the OA status of the individual work, citations, licence, full text and article topics. <strong>Journal data</strong> include, among other things, ISSN, MNiSW points and disciplines, DOAJ, APC, source-level OA status, journal metrics and aggregated OpenAlex topics.</p>
          <p><strong>MNiSW disciplines always refer to the journal.</strong> They are not an automatic subject classification of a particular article. Likewise, journal topics in OpenAlex describe the aggregated profile of the source and do not mean that every article belongs to every one of those topics.</p>

          <h3 style="margin-top:20px">Glossary — what do the indicators mean?</h3>
          <p class="plain-note"><strong>Hints in the application:</strong> hover over or click the small <strong>i</strong>. Only one explanation is shown at a time so it does not cover the profile.</p>
          <p>You do not need to know bibliometrics or Open Access rules to use the application. The concepts below are explained as simply as possible. The same explanations are available next to fields marked with the <strong>i</strong> symbol.</p>
          <div class="glossary-grid">
            <div class="glossary-card"><strong>H-index</strong><p>Combines publication count and citation impact. An h-index of 20 means that at least 20 journal publications have received at least 20 citations each.</p></div>
            <div class="glossary-card"><strong>i10-index</strong><p>The number of publications with at least 10 citations. It is a simpler indicator than the h-index.</p></div>
            <div class="glossary-card"><strong>2-year mean citedness</strong><p>Average citation rate of works in a two-year window according to OpenAlex. It is not the Journal Impact Factor and the two should not be treated as equivalent.</p></div>
            <div class="glossary-card"><strong>CWTS Core</strong><p>Indicates whether the source belongs to a set used by CWTS Leiden in bibliometric analyses. It is information about coverage, not a “quality score”.</p></div>
            <div class="glossary-card"><strong>Fully Open Access</strong><p>According to the source, the entire journal currently operates as Open Access. This is not exactly the same as the OA status of an individual article.</p></div>
            <div class="glossary-card"><strong>OA flip year</strong><p>The year in which the journal changed to full Open Access, if such a change is known to OpenAlex.</p></div>
            <div class="glossary-card"><strong>APC</strong><p>Article Processing Charge — a fee for publishing an article. No APC means the author is not charged this mandatory publication fee.</p></div>
            <div class="glossary-card"><strong>DOAJ</strong><p>Directory of Open Access Journals — a directory of Open Access journals that also includes data on licences, APC, peer review and other publishing policies.</p></div>
            <div class="glossary-card"><strong>Diamond Open Access / DDH</strong><p>An Open Access model without mandatory fees for authors or readers. In Diamond Discovery Hub, “Fully diamond” means that the complete DDH criteria set is met.</p></div>
            <div class="glossary-card"><strong>Peer review</strong><p>The scholarly review process before publication. “Double anonymous” means that authors and reviewers do not know each other's identities.</p></div>
            <div class="glossary-card"><strong>Preservation</strong><p>Long-term safeguarding of content in independent archiving systems so articles do not disappear if a publisher's website does.</p></div>
            <div class="glossary-card"><strong>ISSN / eISSN / ISSN-L</strong><p>ISSN identifies a journal edition, for example print or electronic. ISSN-L links different media versions of the same title.</p></div>
            <div class="glossary-card"><strong>COPE</strong><p>Committee on Publication Ethics. Membership can be one positive signal concerning ethical standards, but lack of membership is not an assessment of a journal.</p></div>
            <div class="glossary-card"><strong>Open Policy Finder</strong><p>A service showing publishers' Open Access and self-archiving policies, for example whether an accepted manuscript may be deposited in a repository.</p></div>
            <div class="glossary-card"><strong>SCImago / SJR</strong><p>An external service using Scopus-based data, including SJR, journal quartiles and h-index. In this POC we open it through a smart link.</p></div>
            <div class="glossary-card"><strong>MNiSW points</strong><p>Points from the Polish journal list. We show the current value together with the relevant historical values for 2019–2026.</p></div>
          </div>
          <div class="plain-note"><strong>Key point:</strong> no single indicator determines whether a journal is “good” or “bad”. The application brings together different facts so users can make their own decisions more easily.</div>

          <h3 style="margin-top:20px">Identification</h3>
          <p>ISSN/eISSN are the primary basis for linking records, but the application does not automatically treat the entire <code>OpenAlex Source.issn</code> array as a set of equivalent identifiers for the journal being examined. For publications, we prefer ISSNs returned by Crossref and — where possible — confirmed in the MNiSW list. ISSN-L is shown separately. Additional identifiers from OpenAlex remain visible as source data, but are not used uncritically for external links or historical points.</p>
          <p>When searching by an exact ISSN, the identifier entered by the user remains the primary identifier of the profile. Other ISSNs returned by OpenAlex are displayed separately as additional identifiers.</p>

          <h3 style="margin-top:20px">Full-text links</h3>
          <p>In the “Access to publication” section, useful locations are combined in one place and duplicates are removed. Technical Crossref links intended for <code>similarity-checking</code> and <code>text-mining</code> are not presented to users as full-text links. We also reject addresses without a public hostname, for example URLs such as <code>https://cochrane/...</code>.</p>
  `;

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

  function captureAboutPolish() {
    if (aboutPolishHtml) return;
    const card = document.querySelector("#tab-about .about-card");
    if (!card) return;
    aboutPolishHtml = card.innerHTML.replace(
      "Publication Explorer jest demonstratorem łączącym dane bibliograficzne, bibliometryczne, Open Access oraz informacje o czasopismach. Każdy sygnał pozostaje przypisany do źródła — aplikacja nie tworzy jednego „wyniku jakości” czasopisma.",
      "Journexis łączy dane bibliograficzne, bibliometryczne, Open Access oraz informacje o czasopismach. Każdy sygnał pozostaje przypisany do źródła — aplikacja nie tworzy jednego „wyniku jakości” czasopisma."
    );
  }

  function applyAboutLanguage() {
    const card = document.querySelector("#tab-about .about-card");
    if (!card || !aboutPolishHtml) return;
    const lang = language();
    if (card.dataset.journexisAboutLang === lang) return;
    card.innerHTML = lang === "en" ? ABOUT_EN_HTML : aboutPolishHtml;
    card.dataset.journexisAboutLang = lang;
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
    applyAboutLanguage();
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
    captureAboutPolish();
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
