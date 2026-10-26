(() => {
  "use strict";

  const STORAGE_KEY = "journexis_language";
  const SUPPORTED = new Set(["pl", "en"]);
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();

  const EXACT = new Map([
    ["Sprawdź publikację, czasopismo albo znajdź miejsce publikacji.", "Check a publication or journal, or find a publication venue."],
    ["Sprawdź publikację lub czasopismo, porównaj informacje z kilku niezależnych źródeł i znajdź czasopisma według dyscypliny, punktacji oraz Open Access.", "Check a publication or journal, compare information from several independent sources, and find journals by discipline, points and Open Access status."],
    ["OpenAlex · status OA i lokalizacje", "OpenAlex · OA status and locations"],
    ["Crossref · metadane i linki wydawcy", "Crossref · metadata and publisher links"],
    ["Wykaz ministerialny 05.01.2024 · punkty i dyscypliny czasopisma", "Polish ministerial list 05 Jan 2024 · journal points and disciplines"],
    ["DOAJ · OA, APC, licencje i polityki czasopisma", "DOAJ · OA, APC, licences and journal policies"],
    ["ISSN Portal · identyfikacja czasopisma", "ISSN Portal · journal identification"],
    ["ICI · wyszukiwanie czasopisma", "ICI · journal search"],
    ["Publikacja", "Publication"],
    ["Czasopismo", "Journal"],
    ["Znajdź czasopismo", "Find a journal"],
    ["About / źródła", "About / sources"],
    ["DOI publikacji", "Publication DOI"],
    ["Szukaj publikacji", "Search publication"],
    ["Wstaw przykład", "Use example"],
    ["Pobieram i porównuję rekordy OpenAlex oraz Crossref…", "Retrieving and comparing OpenAlex and Crossref records…"],
    ["ISSN lub tytuł czasopisma", "ISSN or journal title"],
    ["Szukaj czasopisma", "Search journal"],
    ["Pobieram profil czasopisma…", "Retrieving journal profile…"],
    ["Dyscyplina czasopisma · MNiSW 2024", "Journal discipline · MNiSW 2024"],
    ["Punkty od", "Points from"],
    ["Punkty do", "Points to"],
    ["Kraj czasopisma · OpenAlex", "Journal country · OpenAlex"],
    ["Wszystkie kraje", "All countries"],
    ["Wszystkie czasopisma (OA i nie-OA)", "All journals (OA and non-OA)"],
    ["Tylko czasopisma w DOAJ", "Journals in DOAJ only"],
    ["Fully OA wg OpenAlex", "Fully OA according to OpenAlex"],
    ["Pokaż", "Show"],
    ["Sprawdzam OA…", "Checking OA…"],
    ["Źródło", "Source"],
    ["Jak korzystamy", "How we use it"],
    ["Ważne:", "Important:"],
    ["Dlaczego APC i OA mogą występować kilka razy?", "Why can APC and OA information appear more than once?"],
    ["Walidacja ISSN", "ISSN validation"],
    ["Status Open Access czasopisma", "Journal Open Access status"],
    ["Jak działa filtr Open Access?", "How does the Open Access filter work?"],
    ["Jak działa wyszukiwanie czasopisma?", "How does journal search work?"],
    ["Wyszukiwarka czasopism", "Journal finder"],
    ["Publikacja a czasopismo — czego dotyczą dane?", "Publication vs journal — what do the data describe?"],
    ["Słowniczek — co oznaczają wskaźniki?", "Glossary — what do the indicators mean?"],
    ["Identyfikacja", "Identification"],
    ["Linki do pełnego tekstu", "Full-text links"],
    ["Najważniejsze:", "Key point:"],
    ["Pełny profil czasopisma", "Full journal profile"],
    ["Pokaż profil", "Show profile"],
    ["Otwórz pełny profil czasopisma", "Open full journal profile"],
    ["Czasopismo bez tytułu", "Untitled journal"],
    ["brak ISSN", "no ISSN"],
    ["brak informacji", "no information"],
    ["brak danych", "no data"],
    ["tak", "yes"],
    ["nie", "no"],
    ["wydawca", "publisher"],
    ["Otwórz ↗", "Open ↗"],
    ["Otwarta kopia", "Open copy"],
    ["Rekordy źródłowe publikacji", "Publication source records"],
    ["Strona DOI", "DOI page"],
    ["Rekord OpenAlex", "OpenAlex record"],
    ["Rekord Crossref", "Crossref record"],
    ["Pobierz metadane", "Download metadata"],
    ["Sprawdź w innych źródłach", "Check other sources"],
    ["self-archiving, polityka OA", "self-archiving, OA policy"],
    ["SJR, kwartyle, H-index", "SJR, quartiles, H-index"],
    ["ICI World of Journals · wyszukiwanie po tytule czasopisma", "ICI World of Journals · search by journal title"],
    ["Otwórz ICI ↗", "Open ICI ↗"],
    ["Otwórz JUFO ↗", "Open JUFO ↗"],
    ["Otwórz COPE ↗", "Open COPE ↗"],
    ["oficjalny rekord identyfikatora", "official identifier record"],
    ["fińska klasyfikacja, APC, indeksowanie — wyszukaj po ISSN", "Finnish classification, APC, indexing — search by ISSN"],
    ["członkostwo i standardy etyki publikacyjnej", "membership and publication ethics standards"],
    ["Wyjaśnienie", "Explanation"],
    ["OpenAlex · profil czasopisma", "OpenAlex · journal profile"],
    ["Open Access w OpenAlex", "Open Access in OpenAlex"],
    ["Bibliometria czasopisma · OpenAlex", "Journal bibliometrics · OpenAlex"],
    ["Status OA", "OA status"],
    ["W DOAJ wg OpenAlex", "In DOAJ according to OpenAlex"],
    ["Wysoki udział OA", "High OA share"],
    ["Prace OA", "OA works"],
    ["Publikacje", "Works"],
    ["Cytowania", "Citations"],
    ["nie jest w pełni OA", "not fully OA"],
    ["Pełny tekst / strona wydawcy", "Full text / publisher page"],
    ["Statystyki Journexis", "Journexis analytics"],
    ["Zgadzam się na Google Analytics", "Allow Google Analytics"],
    ["Nie zgadzam się", "Do not allow"],
    ["Ustawienia analityki", "Analytics settings"],
    ["Dane pochodzą z niezależnych źródeł o różnych zakresach. Zobacz zakładkę About / źródła, aby poznać metodologię i ograniczenia POC-u.", "Data come from independent sources with different coverage. See About / sources for the methodology and limitations of this POC."],
    ["Journexis łączy dane bibliograficzne, bibliometryczne, Open Access oraz informacje o czasopismach. Każdy sygnał pozostaje przypisany do źródła — aplikacja nie tworzy jednego „wyniku jakości” czasopisma.", "Journexis combines bibliographic, bibliometric and Open Access data with journal information. Each signal remains attributed to its source — the application does not create a single journal “quality score”."],
    ["Wklej DOI (sam identyfikator, „doi:…” albo adres doi.org). Po wyszukaniu zobaczysz metadane publikacji, dostęp Open Access, cytowania i informacje o czasopiśmie.", "Paste a DOI (the identifier itself, “doi:…” or a doi.org URL). After searching, you will see publication metadata, Open Access availability, citations and journal information."],
    ["Wpisz ISSN albo tytuł czasopisma. Dokładny ISSN otwiera profil od razu; po tytule najpierw zobaczysz pasujące czasopisma i wybierzesz właściwy profil.", "Enter an ISSN or journal title. An exact ISSN opens the profile immediately; a title search first shows matching journals so you can select the correct profile."],
    ["Wybierz dyscyplinę, zakres punktów i opcjonalny filtr Open Access, a następnie wybierz „Pokaż”. Wyniki są prezentowane alfabetycznie, nie jako ranking. Przy filtrze OA aplikacja sprawdza na żywo maksymalnie 60 pierwszych tytułów z wybranego zakresu.", "Choose a discipline, points range and optional Open Access filter, then select “Show”. Results are alphabetical, not ranked. With an OA filter, the app checks up to the first 60 titles in the selected range live. Official MNiSW discipline names are retained in Polish."],
    ["Wybierz dyscyplinę, aby zobaczyć poniżej 5 najwyżej punktowanych czasopism z tej samej dyscypliny.", "Select a discipline to see five of the highest-point journals from the same discipline below."],
    ["5 najwyżej punktowanych czasopism w wybranej dyscyplinie według wykazu MNiSW 2024.", "Five of the highest-point journals in the selected discipline according to the MNiSW 2024 list."],
    ["Cloudflare Web Analytics pomaga nam mierzyć ruch i wydajność strony. Google Analytics uruchamiamy tylko za Twoją zgodą, aby sprawdzać, które moduły i funkcje aplikacji są używane. Nie wysyłamy do GA treści wpisywanych DOI, ISSN ani tytułów.", "Cloudflare Web Analytics helps us measure traffic and site performance. Google Analytics is enabled only with your consent so we can see which modules and features are used. We do not send entered DOI, ISSN or title values to GA."],
    ["Publiczne, podstawowe metadane JSON-LD z ISSN Portal. Jeśli zapytanie zostanie zablokowane przez przeglądarkę, nadal możesz otworzyć oficjalny rekord jednym kliknięciem.", "Public basic JSON-LD metadata from the ISSN Portal. If the browser blocks the request, you can still open the official record with one click."],
    ["Sprawdzam rekordy ISSN…", "Checking ISSN records…"],
    ["Nie udało się pobrać publicznego JSON-LD w tej przeglądarce. Bezpośrednie linki do rekordów ISSN pozostają dostępne poniżej.", "The public JSON-LD could not be retrieved in this browser. Direct links to ISSN records remain available below."],
    ["Dane na poziomie całego źródła/czasopisma. Status OA czasopisma jest czym innym niż status OA pojedynczego artykułu.", "Data at the whole source/journal level. A journal's OA status is different from the OA status of an individual article."],
    ["Wskaźniki źródłowe OpenAlex — nie są Journal Impact Factor firmy Clarivate.", "OpenAlex source-level indicators — these are not Clarivate's Journal Impact Factor."],
    ["Nie znaleziono jednoznacznego rekordu czasopisma w OpenAlex.", "No unambiguous journal record was found in OpenAlex."],
    ["Eksport bieżącego rekordu. Metadane bibliograficzne pochodzą przede wszystkim z Crossref, a informacje OA są uzupełniane z OpenAlex.", "Export the current record. Bibliographic metadata come primarily from Crossref, while OA information is supplemented from OpenAlex."],
    ["Linki poniżej prowadzą do rekordów identyfikacyjnych i API. Nie są dodatkowymi kopiami pełnego tekstu.", "The links below lead to identification and API records. They are not additional full-text copies."],
    ["Dokładny ISSN", "Exact ISSN"],
    ["Tytuł lub fragment tytułu", "Title or title fragment"],
    ["Dane publikacji", "Publication data"],
    ["Dane czasopisma", "Journal data"],
    ["Dyscypliny MNiSW zawsze dotyczą czasopisma.", "MNiSW disciplines always refer to the journal."],
    ["Podpowiedzi w aplikacji:", "Hints in the application:"],
    ["Punkty MNiSW", "MNiSW points"],
    ["Polityka OA", "OA policy"],
    ["Jak czytać koszty?", "How should costs be read?"],
    ["sprawdź Fully diamond w DDH", "check Fully diamond in DDH"],
    ["sprawdź członkostwo ↗", "check membership ↗"],
    ["brak członkostwa nie jest oceną jakości", "lack of membership is not a quality judgement"],
    ["sprawdź w Open Policy Finder", "check in Open Policy Finder"]
  ]);

  // Audit additions: journal, publication, DOAJ and finder UI
  for (const [pl, en] of [
    ["Brak bezpośredniego dostępu pełnotekstowego w pobranych danych", "No direct full-text access was found in the retrieved data"],
    ["Możesz nadal użyć strony DOI w sekcji rekordów źródłowych.", "You can still use the DOI page in the source records section."],
    ["Dostęp do publikacji", "Publication access"],
    ["Cytowania i bibliometria konkretnej publikacji", "Citations and bibliometrics of this publication"],
    ["Cytowania w czasie · OpenAlex", "Citations over time · OpenAlex"],
    ["OpenAlex nie zwrócił historii cytowań rok po roku dla tej publikacji.", "OpenAlex did not provide annual citation history for this publication."],
    ["Widoczność i metadane czasopisma", "Journal visibility and metadata"],
    ["Wydawca", "Publisher"],
    ["Kraj", "Country"],
    ["Zakres lat w OpenAlex", "Years covered in OpenAlex"],
    ["Dyscypliny czasopisma w wykazie MNiSW 2024", "Journal disciplines in the MNiSW 2024 list"],
    ["Dyscypliny MNiSW nie są automatyczną klasyfikacją tematyczną publikacji.", "MNiSW disciplines are not an automatic subject classification of the publication."],
    ["Historia punktacji czasopisma · MNiSW 2019–2026", "Journal points history · MNiSW 2019–2026"],
    ["Historia dotyczy czasopisma, nie pojedynczego artykułu.", "The history refers to the journal, not to an individual article."],
    ["Właściwy wykaz", "Applicable list"],
    ["Tytuł czasopisma w wykazie", "Journal title in the list"],
    ["ISSN czasopisma w wykazie", "Journal ISSN in the list"],
    ["Tytuł z Crossref / OpenAlex", "Title from Crossref / OpenAlex"],
    ["Dodatkowe identyfikatory zwrócone przez OpenAlex:", "Additional identifiers returned by OpenAlex:"],
    ["Jak czytać dodatkowe ISSN z OpenAlex?", "How should additional OpenAlex ISSNs be interpreted?"],
    ["Dane dotyczą czasopisma.", "The data refer to the journal."],
    ["Ta sekcja dotyczy czasopisma jako całości, nie konkretnego artykułu.", "This section refers to the journal as a whole, not to an individual article."],
    ["Ta sekcja dotyczy czasopisma i jego modelu wydawniczego, nie konkretnego artykułu.", "This section concerns the journal and its publishing model, not the individual article."],
    ["Open Access, koszty i transparentność", "Open Access, costs and transparency"],
    ["DOAJ · informacje o czasopiśmie", "DOAJ · journal information"],
    ["Informacje o modelu Open Access i polityce publikacyjnej czasopisma.", "Information about the journal's Open Access model and publishing policies."],
    ["Dane pobierane na żywo z Directory of Open Access Journals po ISSN/e-ISSN.", "Live data from the Directory of Open Access Journals, retrieved by ISSN/e-ISSN."],
    ["Nie udało się połączyć z DOAJ. Pozostałe części wyniku są nadal aktualne.", "Could not connect to DOAJ. Other result sections remain available."],
    ["Nie znaleziono czasopisma w DOAJ", "Journal not found in DOAJ"],
    ["Open Access od", "Open Access since"],
    ["Archiwizacja / preservation", "Archiving / preservation"],
    ["Czas publikacji", "Publication time"],
    ["Copyright autora", "Author copyright"],
    ["Licencja", "Licence"],
    ["Rekord DOAJ ↗", "DOAJ record ↗"],
    ["Strona czasopisma ↗", "Journal website ↗"],
    ["Peer review", "Peer review"],
    ["Uwaga:", "Note:"],
    ["Sprawdź politykę czasopisma w Open Policy Finder", "Check the journal policy in Open Policy Finder"],
    ["Otwórz Open Policy Finder ↗", "Open Open Policy Finder ↗"],
    ["Inne czasopisma z tej samej dyscypliny", "Other journals in the same discipline"],
    ["Inne czasopisma dla wybranego topicu", "Other journals for the selected topic"],
    ["Tematy czasopisma wg OpenAlex", "Journal topics according to OpenAlex"],
    ["Brak topiców w OpenAlex.", "No topics available in OpenAlex."],
    ["Nie wysyłamy dodatkowego zapytania, dopóki nie wybierzesz topicu.", "No additional request is sent until you select a topic."],
    ["Kliknij topic powyżej, aby uruchomić wyszukiwanie w OpenAlex.", "Select a topic above to search OpenAlex."],
    ["Przykładowe czasopisma w OpenAlex powiązane z tym topicem, posortowane według liczby prac. Bieżące czasopismo jest pomijane.", "Sample journals associated with this topic in OpenAlex, sorted by works count. The current journal is excluded."],
    ["Nie znalazłem innych czasopism dla tego topicu.", "No other journals were found for this topic."],
    ["Nie udało się pobrać przykładowych czasopism z OpenAlex.", "Could not retrieve sample journals from OpenAlex."],
    ["Pobieram czasopisma…", "Retrieving journals…"],
    ["Brak jednoznacznego profilu czasopisma w OpenAlex.", "No unambiguous journal profile was found in OpenAlex."],
    ["Brak dopasowania czasopisma w aktualnym wykazie.", "No journal match in the current list."],
    ["Brak przypisanych dyscyplin.", "No assigned disciplines."],
    ["Źródła wbudowane w POC:", "Sources included in the POC:"],
    ["źródło: DOAJ", "source: DOAJ"],
    ["źródło: OpenAlex", "source: OpenAlex"],
    ["Wykaz MNiSW 2024", "MNiSW 2024 list"],
    ["Punktacja jest wbudowana na podstawie oficjalnych wykazów 2019, 2021 i 2023. Dopasowanie odbywa się po ISSN/e-ISSN. Aktualne dyscypliny i ranking Top 5 pozostają wyłącznie z wykazu 05.01.2024.", "Points history is based on the official lists from 2019, 2021 and 2023, matched by ISSN/e-ISSN. Current disciplines and the top-five list are derived solely from the 5 January 2024 list."],
    ["Zestawiamy informacje o Open Access, kosztach publikacji i podstawowych sygnałach transparentności. Pokazujemy źródła osobno i nie wyliczamy automatycznego score.", "We compare Open Access information, publishing costs and basic transparency indicators. Sources remain separate; no automatic score is calculated."],
    ["OpenAlex i DOAJ mogą podawać różne wartości APC, ponieważ aktualizują dane w różnym czasie i z różnych źródeł. Aplikacja nie wybiera jednej „prawidłowej” kwoty — pokazuje obie wartości osobno.", "OpenAlex and DOAJ may report different APC amounts due to different data sources and update cycles. The app presents both values without choosing one as authoritative."],
    ["Następca serwisów Sherpa. W tym POC nie pobieramy jeszcze polityk automatycznie, ponieważ nowe API Jisc wymaga klucza API, którego nie należy umieszczać w publicznym pliku HTML.", "The successor to Sherpa services. This POC does not retrieve policies automatically because Jisc's newer API requires a key that should not be exposed in a public HTML file."],
    ["Brak innych czasopism przypisanych do tej dyscypliny.", "No other journals are assigned to this discipline."],
    ["5 innych czasopism z wybranej dyscypliny czasopisma, posortowanych według punktacji w tym samym wykazie.", "Five other journals from the selected journal discipline, sorted by points in the same list."],
    ["Poniższe wskaźniki dotyczą tej konkretnej publikacji. Prosty podgląd danych dostępnych w rekordach OpenAlex i Crossref. Liczby z różnych baz mogą się różnić, ponieważ każda z nich ma inny zakres indeksowania i sposób rejestrowania cytowań.", "The indicators below concern this publication. They provide an overview of available OpenAlex and Crossref records. Counts may differ because the databases have different coverage and citation-tracking methods."],
    ["Sprawdź tytuł / ISSN; brak członkostwa nie jest oceną jakości.", "Check the title / ISSN; lack of membership is not a quality judgement."],
    ["Zweryfikowany ISSN / e-ISSN czasopisma", "Verified journal ISSN / e-ISSN"],
    ["ISSN-L czasopisma", "Journal ISSN-L"],
    ["Rok publikacji", "Publication year"],
    ["Status OA publikacji", "Publication OA status"],
    ["Typ publikacji · Crossref", "Publication type · Crossref"],
    ["Tom / numer", "Volume / issue"],
    ["Strony / nr artykułu", "Pages / article number"],
    ["Licencja publikacji", "Publication licence"],
    ["Lokalizacja OA publikacji", "Publication OA location"],
    ["OpenAlex ID publikacji", "Publication OpenAlex ID"],
    ["Wydawca czasopisma", "Journal publisher"],
    ["ISSN / e-ISSN czasopisma", "Journal ISSN / e-ISSN"],
    ["Dodatkowe identyfikatory z OpenAlex", "Additional OpenAlex identifiers"],
    ["ISSN zwrócone przez Crossref", "ISSN returned by Crossref"],
    ["ISSN w wykazie MNiSW 2024", "ISSN in the MNiSW 2024 list"],
    ["Źródło wartości głównej ISSN", "Source of primary ISSN"],
    ["Wstaw przykładowy ISSN", "Insert a sample ISSN"],
    ["Szukaj kolejnych 20", "Find 20 more"],
    ["Ponów wyszukiwanie", "Retry search"],
    ["Brak topiców", "No topics"],
  ]) EXACT.set(pl, en);

  // Tooltip translations, including the data-info attribute.
  for (const [pl, en] of [
    ["Oficjalny międzynarodowy rejestr ISSN. Służy przede wszystkim do potwierdzania tożsamości czasopisma i jego identyfikatorów.", "The official international ISSN register. It is mainly used to verify a journal's identity and identifiers."],
    ["Czy całe czasopismo jest obecnie w pełni Open Access według OpenAlex. To status czasopisma, nie pojedynczego artykułu.", "Whether the entire journal is currently fully Open Access according to OpenAlex. This is a journal-level status, not that of an individual article."],
    ["OpenAlex przechowuje informację, czy czasopismo znajduje się w Directory of Open Access Journals (DOAJ).", "OpenAlex records whether a journal is listed in the Directory of Open Access Journals (DOAJ)."],
    ["OpenAlex oznacza źródła, w których duża część publikacji jest dostępna Open Access. Nie oznacza to automatycznie, że wszystkie artykuły są otwarte.", "OpenAlex identifies sources with a high proportion of Open Access publications. This does not mean that all articles are open."],
    ["Liczba publikacji przypisanych do czasopisma, które OpenAlex rozpoznaje jako dostępne Open Access.", "The number of works assigned to this journal that OpenAlex identifies as Open Access."],
    ["Rok, w którym czasopismo miało przejść z modelu zamkniętego lub mieszanego na pełny Open Access, jeśli OpenAlex zna taką informację.", "The year when the journal may have switched from closed or mixed access to fully Open Access, if recorded by OpenAlex."],
    ["Article Processing Charge: opłata, której wydawca może wymagać od autora lub instytucji za publikację artykułu. Pokazujemy ją tylko, jeśli źródło udostępnia taką informację.", "Article Processing Charge: a fee a publisher may charge an author or institution for publishing an article. It is shown only when the source provides this information."],
    ["Liczba prac przypisanych przez OpenAlex do tego czasopisma. Może różnić się od danych wydawcy lub innych baz.", "Number of works attributed to the journal by OpenAlex. This may differ from publisher data or other databases."],
    ["Łączna liczba cytowań prac z tego czasopisma zarejestrowanych przez OpenAlex. Zakres bazy wpływa na wynik.", "Total citations of the journal's works recorded in OpenAlex. Database coverage affects the count."],
    ["Czasopismo ma h-index równy h, jeśli co najmniej h jego publikacji otrzymało co najmniej h cytowań. Łączy liczbę publikacji i ich cytowalność.", "A journal has an h-index of h when at least h of its works have each received h citations. The metric combines productivity and citations."],
    ["Liczba publikacji czasopisma, które otrzymały co najmniej 10 cytowań w danych OpenAlex.", "Number of journal publications that have received at least 10 citations in OpenAlex."],
    ["Średnia liczba cytowań przypadająca na publikacje z ostatniego dwuletniego okna według OpenAlex. To nie jest Journal Impact Factor (JIF).", "Average citations per publication in OpenAlex's latest two-year window. This is not Journal Impact Factor (JIF)."],
    ["Informacja OpenAlex o tym, czy źródło należy do zestawu CWTS Core używanego przez CWTS Leiden do analiz bibliometrycznych. Traktuj to jako informację o pokryciu, nie ocenę jakości.", "OpenAlex reports whether the source is part of the CWTS Core set used by CWTS Leiden in bibliometric studies. It is a coverage indicator, not a quality assessment."],
    ["Najwcześniejszy i najpóźniejszy rok publikacji widoczny dla tego źródła w OpenAlex. Nie musi odpowiadać pełnej historii czasopisma.", "Earliest and latest publication years visible for this source in OpenAlex. These may not reflect the journal's complete history."],
    ["Czy całe czasopismo jest obecnie w pełni Open Access. Pokazujemy głównie informację OpenAlex i obecność w DOAJ.", "Whether the whole journal is currently fully Open Access. We mainly present OpenAlex data and DOAJ presence."],
    ["Jaki odsetek publikacji przypisanych do czasopisma OpenAlex rozpoznaje jako dostępne Open Access. To nie oznacza automatycznie, że całe czasopismo jest fully OA.", "The percentage of the journal's publications identified by OpenAlex as Open Access. This does not necessarily mean the entire journal is fully OA."],
    ["Katalogowa opłata za publikację artykułu, jeśli OpenAlex ma taką informację. To może nie być ostateczna cena dla konkretnego autora.", "Listed fee for publishing an article, if reported by OpenAlex. The final fee may differ for an individual author."],
    ["Informacja o opłatach za publikację pochodząca z DOAJ. Jeśli DOAJ nie ma danych, nie oznacza to, że opłaty nie istnieją.", "Publication fee information from DOAJ. Missing DOAJ data does not mean there are no fees."],
    ["Rodzaj recenzji naukowej deklarowany w metadanych DOAJ, np. double anonymous peer review.", "Peer-review process reported in DOAJ metadata, e.g. double-anonymous peer review."],
    ["Informacja o długoterminowym zabezpieczaniu treści czasopisma w systemach archiwizacyjnych, np. CLOCKSS, LOCKSS lub Portico.", "Information on long-term preservation of journal content in archiving systems such as CLOCKSS, LOCKSS or Portico."],
    ["Diamond Open Access oznacza publikowanie bez obowiązkowych opłat dla autorów i czytelników. DDH dodatkowo sprawdza otwarte licencje, otwartość dla wszystkich autorów i community ownership.", "Diamond Open Access means publishing without mandatory fees for authors or readers. DDH also checks open licences, access for all authors and community ownership."],
    ["Committee on Publication Ethics. Członkostwo jest jednym z sygnałów stosowania standardów etyki publikacyjnej, ale brak członkostwa nie oznacza, że czasopismo jest niewiarygodne.", "Committee on Publication Ethics. Membership may indicate adherence to publication ethics standards, but lack of membership does not mean a journal is untrustworthy."],
    ["Open Policy Finder opisuje m.in. zasady samoarchiwizacji różnych wersji artykułu, embargo i warunki Open Access.", "Open Policy Finder covers self-archiving policies for different article versions, embargo periods and Open Access conditions."],
  ]) EXACT.set(pl, en);

  for (const [pl, en] of [
    ["FWCI jest pokazywany tylko wtedy, gdy OpenAlex zwraca tę wartość dla publikacji. Nie interpretujemy liczby Crossref jako „tej samej” miary co OpenAlex — prezentujemy źródła osobno.", "FWCI is shown only when OpenAlex provides it for the publication. We do not treat the Crossref count as equivalent to the OpenAlex metric; the sources are presented separately."],
    ["Jeśli czasopismo ma dwa ISSN-y, generujemy osobny link dla każdego. Pozwala to sprawdzić oba warianty bez kopiowania identyfikatora.", "If a journal has two ISSNs, we provide a separate link for each so both can be checked without copying the identifiers."],
    ["Przypisanie do dyscyplin nie oznacza, że każdy artykuł w czasopiśmie należy do tych dyscyplin.", "A journal's discipline assignments do not imply that every article in it belongs to those disciplines."],
    ["MNiSW 2024 · punktacja i dyscypliny czasopisma", "MNiSW 2024 · journal points and disciplines"],
    ["niejednoznaczne dane", "ambiguous data"],
    ["Rekord OpenAlex Source nie zwrócił listy", "The OpenAlex Source record did not return a list of"],
    ["dla identyfikatorów dostępnych w tym rekordzie. Brak rekordu DOAJ nie oznacza, że pojedynczy artykuł nie może być dostępny Open Access.", "for the identifiers in this record. The absence of a DOAJ record does not mean that an individual article cannot be Open Access."],
    ["jeśli dostępna w OpenAlex", "if available in OpenAlex"],
    ["Wszystkie użyteczne linki do treści są w jednym miejscu. Lokalizacje OA pochodzą z OpenAlex. Z Crossref pokazujemy wyłącznie publiczne linki użytkowe; techniczne adresy przeznaczone do", "Useful content links are grouped together. OA locations come from OpenAlex. For Crossref, only public user-facing links are shown; technical links intended for"],
    ["są pomijane.", "are omitted."],
    ["wyszukanie po ISSN · tylko rekordy spełniające komplet kryteriów „Fully diamond”", "ISSN lookup · only records meeting all Fully diamond criteria"],
    ["Inne czasopisma:", "Other journals:"],
    ["Do wyszukania:", "Search for:"],
    ["Szukam…", "Searching…"],
    ["Otwieram wskazaną stronę w nowej karcie. Jeśli pojawi się PDF, możesz zapisać go z poziomu przeglądarki.", "Opening the requested page in a new tab. If it is a PDF, you can save it using the browser."],
  ]) EXACT.set(pl, en);

  // Complete template text and interactive labels after the publication/journal EN audit.
  for (const [pl, en] of [
    ["PUBLIKACJA", "PUBLICATION"],
    ["CZASOPISMO", "JOURNAL"],
    ["Dane o konkretnej publikacji", "Data about this publication"],
    ["OA, cytowania, licencja, pełny tekst i topiki w tej części odnoszą się do wyszukanego artykułu / pracy.", "Open Access, citations, licence, full text and topics in this section refer to the retrieved article or work."],
    ["Czasopismo, w którym ukazała się publikacja", "Journal containing this publication"],
    ["Od tego miejsca informacje odnoszą się do całego czasopisma. Nie należy ich automatycznie przypisywać do konkretnego artykułu.", "From this point on, the data refer to the journal as a whole and should not automatically be attributed to the individual article."],
    ["Metadane publikacji", "Publication metadata"],
    ["Dane czasopisma w wykazie MNiSW 2024", "Journal details in the MNiSW 2024 list"],
    ["Wszystkie poniższe dane odnoszą się do czasopisma jako całości, nie do pojedynczego artykułu.", "All the data below concern the journal as a whole, not the individual article."],
    ["Aktualny wykaz MNiSW może nie zawierać tego tytułu; nadal sprawdzamy historyczną punktację po ISSN i dane zewnętrzne.", "The current MNiSW list may not include this title; historical points and external data are still checked by ISSN."],
    ["Strona publikacji u wydawcy", "Publication page on the publisher's website"],
    ["Strona DOI ↗", "DOI page ↗"],
    ["Rekord OpenAlex ↗", "OpenAlex record ↗"],
    ["Rekord Crossref ↗", "Crossref record ↗"],
    ["Tematy konkretnej publikacji wg OpenAlex", "Topics of this publication according to OpenAlex"],
    ["To klasyfikacja tej konkretnej pracy w OpenAlex. Nie jest to klasyfikacja całego czasopisma. Kliknij topic, aby zobaczyć przykładowe inne czasopisma związane z tym tematem.", "This is OpenAlex's classification of the individual work, not of the entire journal. Select a topic to see other journals related to it."],
    ["To zagregowana charakterystyka całego czasopisma na podstawie prac przypisanych do niego w OpenAlex. Nie oznacza, że każdy artykuł należy do każdego z tych tematów. Kliknij topic, aby zobaczyć inne czasopisma związane z tym tematem.", "This is an aggregated profile of the entire journal based on works assigned to it in OpenAlex. It does not imply that every article belongs to every listed topic. Select a topic to explore related journals."],
    ["Zagregowane tematy czasopisma wg OpenAlex", "Aggregated journal topics according to OpenAlex"],
    ["Czasopisma powiązane z tematem", "Journals associated with this topic"],
    ["Publikacja ·", "Publication ·"],
    ["Open Access", "Open Access"],
    ["Brak informacji o autorach", "No author information"],
    ["pozycje w bibliografii", "references"],
    ["cytowania", "citations"],
    ["ostatnie", "last"],
    ["Zobacz źródło", "View source"],
    ["Pobieranie", "Retrieving"],
    ["Okres", "Period"],
    ["Rok", "Year"],
    ["Nie zastępujemy jej polem", "We do not substitute the field"],
    ["ponieważ ma ono inne znaczenie.", "because it has a different meaning."],
    ["APC", "APC"],
    ["Open Policy Finder", "Open Policy Finder"],
    ["ISSN Registry", "ISSN Registry"],
    ["Źródła danych czasopisma", "Journal data sources"],
    ["Brak dodatkowych identyfikatorów", "No additional identifiers"],
    ["Published version", "Published version"],
    ["submittedVersion", "submitted version"],
    ["publishedVersion", "published version"],
    ["Wybierz „Pokaż profil”.", "Select “Show profile”."],
    ["lub", "or"],
    ["tak ✓", "yes ✓"],
    ["Nie znaleziono czasu publikacji", "Publication time not available"],
  ]) EXACT.set(pl, en);

  for (const [pl, en] of [
    ["Pokazujemy je dla transparentności, ale nie traktujemy automatycznie jako równorzędnych ISSN badanego czasopisma.", "We show them for transparency, but do not automatically treat them as equivalent ISSNs of the journal."],
    ["OpenAlex może zwrócić więcej identyfikatorów powiązanych ze swoim rekordem Source.", "OpenAlex may provide additional identifiers associated with its Source record."],
    ["Pokazujemy je dla transparentności, ale nie uznajemy automatycznie za równorzędne ISSN badanego czasopisma.", "We display these for transparency but do not automatically treat them as equivalent ISSNs of the journal."],
    ["Główne ISSN ustalamy konserwatywnie z Crossref i/lub wykazu MNiSW, a ISSN-L pokazujemy osobno.", "We conservatively establish the primary ISSN from Crossref and/or the MNiSW list, and display ISSN-L separately."],
    ["Dopasowano czasopismo na podstawie identyfikatorów ISSN", "Journal matched using ISSN identifiers"],
    ["i potwierdzono tytułem", "and confirmed by title"],
    ["Źródło:", "Source:"],
    ["Nie znaleziono jednoznacznego wspólnego ISSN; zastosowano dokładne dopasowanie tytułu czasopisma.", "No unambiguous shared ISSN was found; an exact journal-title match was used."],
    ["Sprawdzone identyfikatory czasopisma:", "Checked journal identifiers:"],
    ["Nie udało się uzyskać identyfikatorów ISSN czasopisma.", "Journal ISSN identifiers could not be obtained."],
    ["Sprawdzono również dokładne dopasowanie tytułu.", "An exact title match was also checked."],
    ["Jeśli różne ISSN tego samego bieżącego rekordu prowadzą w dawnym wykazie do różnych wartości punktowych, aplikacja pokazuje „niejednoznaczne dane” wraz z wartościami źródłowymi — nie wybiera jednej arbitralnie.", "If different ISSNs of the same current record correspond to different point values in a historical list, the application displays ambiguous data alongside the original values rather than arbitrarily selecting one."],
    ["Pokaż inne najwyżej punktowane czasopisma w tej dyscyplinie", "Show other highest-point journals in this discipline"],
    ["Brak ISSN w wykazie", "No ISSN in the list"],
    ["punktów", "points"],
  ]) EXACT.set(pl, en);

  const REGEX = [
    [/^(\d+) pkt$/, "$1 pts"],
    [/^(\d+) dyscyplin$/, "$1 disciplines"],
    [/^(\d+) dyscyplina$/, "$1 discipline"],
    [/^od (\d{4})$/, "since $1"],
    [/^ok\. (\d+)% prac w OpenAlex$/, "approx. $1% of works in OpenAlex"],
    [/^Tytuł: (.+) · $/, "Title: $1 · "],
    [/^ISSN do ręcznego sprawdzenia: (.+)$/, "ISSN for manual verification: $1"],
    [/^Znaleziono (\d+)( pierwszych)? pasujących rekordów w wykazie MNiSW 2024\. Wybierz „Pokaż profil”\.$/, (_, n, first) => `Found ${n}${first ? " first" : ""} matching records in the MNiSW 2024 list. Select “Show profile”.`],
    [/^ISSN (.+) ma nieprawidłową cyfrę kontrolną\. Sprawdź identyfikator i spróbuj ponownie\.$/, "ISSN $1 has an invalid check digit. Check the identifier and try again."],
    [/^ISSN (.+) rozpoznany — otwieram pełny profil czasopisma\.$/, "ISSN $1 recognised — opening the full journal profile."],
    [/^ISSN (.+) nie występuje w wykazie MNiSW 2024 — sprawdzam OpenAlex, DOAJ i pozostałe źródła\.$/, "ISSN $1 is not in the MNiSW 2024 list — checking OpenAlex, DOAJ and other sources."],
    [/^Nieprawidłowy zakres punktów: wartość „od” \((\d+)\) jest większa niż „do” \((\d+)\)\.$/, "Invalid points range: the “from” value ($1) is greater than the “to” value ($2)."],
    [/^(.+) · (\d+(?:–\d+)? pkt): sprawdzam filtr „(.+)”…$/, (_, discipline, range, mode) => `${discipline} · ${range.replace(" pkt", " pts")}: checking the “${translateCore(mode)}” filter…`],
    [/^(.+) · (\d+(?:–\d+)? pkt): znaleziono (\d+) czasopism spełniających filtr „(.+)”\.(.*)$/, (_, discipline, range, count, mode, rest) => `${discipline} · ${range.replace(" pkt", " pts")}: found ${count} journals matching the “${translateCore(mode)}” filter.${translateCore(rest)}`],
    [/^(.+) · (\d+(?:–\d+)? pkt): w sprawdzonej części listy nie znaleziono czasopism spełniających filtr „(.+)”\.(.*)$/, (_, discipline, range, mode, rest) => `${discipline} · ${range.replace(" pkt", " pts")}: no journals matching the “${translateCore(mode)}” filter were found in the checked part of the list.${translateCore(rest)}`],
    [/^(.+) · (\d+(?:–\d+)? pkt): ([\d\s,.]+) czasopism spełnia wybrane kryteria\.(.*)$/, (_, discipline, range, count, rest) => `${discipline} · ${range.replace(" pkt", " pts")}: ${count} journals match the selected criteria.${translateCore(rest)}`],
    [/^Brak dopasowania w aktualnym wykazie MNiSW · pobieram OpenAlex i DOAJ…$/, "No match in the current MNiSW list · retrieving OpenAlex and DOAJ…"],
    [/^ISSN (.+) · pobieram dane zewnętrzne…$/, "ISSN $1 · retrieving external data…"],
    [/^Inne wysoko punktowane czasopisma · (.+)$/, "Other high-point journals · $1"],
    [/^Najwyżej punktowane czasopisma · (.+)$/, "Highest-point journals · $1"]
  ];

  const PHRASES = [
    ["Nie znaleziono tytułu w wykazie MNiSW 2024. W tym POC wyszukiwanie po tytule jest ograniczone do wykazu ministerialnego.", "The title was not found in the MNiSW 2024 list. In this POC, title search is limited to the ministerial list."],
    ["Wpisz ISSN albo fragment tytułu.", "Enter an ISSN or a title fragment."],
    ["Nie udało się pobrać profilu czasopisma. Spróbuj ponownie za chwilę.", "The journal profile could not be retrieved. Please try again shortly."],
    ["Nie udało się zakończyć sprawdzania statusu OA. Spróbuj ponownie za chwilę.", "The OA status check could not be completed. Please try again shortly."],
    ["Pokazuję pierwsze 100 alfabetycznie.", "Showing the first 100 alphabetically."],
    ["Sprawdzono wszystkie ", "Checked all "],
    [" czasopisma z tego zakresu.", " journals in this range."],
    [" czasopism z tego zakresu.", " journals in this range."],
    [" Ze względu na liczbę zapytań OA sprawdzono pierwsze 60 z ", " Due to the number of OA requests, the first 60 of "],
    [" czasopism w tym zakresie, w kolejności alfabetycznej.", " journals in this range were checked in alphabetical order."],
    [" Nie udało się jednoznacznie zweryfikować statusu OA dla ", " The OA status could not be verified unambiguously for "],
    [" z powodu chwilowego braku odpowiedzi któregoś API; nie są one liczone jako „nie-OA”.", " because one of the APIs temporarily did not respond; these journals are not counted as non-OA."],
    ["brak zweryfikowanego ISSN", "no verified ISSN"],
    ["brak dodatkowych identyfikatorów", "no additional identifiers"],
    ["brak dopasowania w wykazie MNiSW 2024", "no match in the MNiSW 2024 list"],
    ["brak w rekordzie publikacji Crossref", "not present in the Crossref publication record"],
    ["brak dodatkowych identyfikatorów poza głównym ISSN / ISSN-L", "no additional identifiers beyond the main ISSN / ISSN-L"],
    ["brak potwierdzonego OA", "no confirmed OA"],
    ["brak potwierdzonej lokalizacji", "no confirmed location"],
    ["brak rekordu", "no record"],
    ["artykuł w czasopiśmie", "journal article"],
    ["rozdział książki", "book chapter"],
    ["książka", "book"],
    ["materiały konferencyjne", "conference proceedings"],
    ["artykuł konferencyjny", "conference paper"],
    ["raport", "report"],
    ["rozprawa", "dissertation"],
    ["zbiór danych", "dataset"],
    ["t. ", "vol. "],
    ["nr ", "no. "]
  ];

  function translateCore(value) {
    const text = String(value ?? "");
    if (!text) return text;
    if (EXACT.has(text)) return EXACT.get(text);
    for (const [pattern, replacement] of REGEX) {
      if (pattern.test(text)) {
        pattern.lastIndex = 0;
        return typeof replacement === "function" ? text.replace(pattern, replacement) : text.replace(pattern, replacement);
      }
    }
    let out = text;
    for (const [from, to] of PHRASES) out = out.replaceAll(from, to);
    return out;
  }

  function translateValue(value) {
    const raw = String(value ?? "");
    const match = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match) return translateCore(raw);
    return `${match[1]}${translateCore(match[2])}${match[3]}`;
  }

  function getInitialLanguage() {
    const param = new URLSearchParams(location.search).get("lang");
    if (SUPPORTED.has(param)) return param;
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.has(stored) ? stored : "pl";
  }

  let language = getInitialLanguage();

  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    if (!node.nodeValue || !node.nodeValue.trim()) return;
    const parent = node.parentElement;
    if (!parent || parent.closest("script,style,code,pre")) return;
    // Keep genuine bibliographic titles, author names and dynamic source data unchanged.
    if (parent.closest("[data-journexis-source],.discipline-chip,.result-title,.authors,.journal-result-title,.journal-profile-head h2,.related-name,.ministry-related-name,.topic-chip,.topic-path,.location-title:not(:has(.access-kind)),.oc-meta-title,.oc-meta-byline")) return;

    const current = node.nodeValue;
    const stored = originalText.get(node);
    if (!stored || (language === "en" && current !== translateValue(stored) && current !== stored)) {
      originalText.set(node, current);
    }
    const original = originalText.get(node) ?? current;
    const next = language === "en" ? translateValue(original) : original;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttributes(element) {
    if (!(element instanceof Element)) return;
    const names = ["placeholder", "title", "aria-label", "data-info"];
    let store = originalAttrs.get(element);
    if (!store) {
      store = {};
      originalAttrs.set(element, store);
    }
    for (const name of names) {
      if (!element.hasAttribute(name)) continue;
      const current = element.getAttribute(name) || "";
      if (!(name in store) || (language === "en" && current !== translateValue(store[name]) && current !== store[name])) {
        store[name] = current;
      }
      const next = language === "en" ? translateValue(store[name]) : store[name];
      if (current !== next) element.setAttribute(name, next);
    }
  }

  function translateSubtree(root = document.body) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (root instanceof Element) translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
      else translateAttributes(node);
      node = walker.nextNode();
    }
  }

  function updateMeta() {
    document.documentElement.lang = language;
    document.title = "Journexis · Publication & Journal Explorer";
    const description = language === "en"
      ? "Journexis: explore scholarly publications, journals, Open Access, bibliometrics and MNiSW data."
      : "Journexis: eksploracja publikacji naukowych, czasopism, Open Access, bibliometrii i danych MNiSW.";
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", "Journexis · Publication & Journal Explorer");
    document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", "Journexis · Publication & Journal Explorer");
  }

  function addStyles() {
    if (document.getElementById("journexis-language-styles")) return;
    const style = document.createElement("style");
    style.id = "journexis-language-styles";
    style.textContent = `
      .journexis-language-switch { display:flex; justify-content:flex-end; align-items:center; gap:4px; margin:0 0 8px; }
      .journexis-language-switch span { color:#64748b; font-size:12px; margin-right:4px; }
      .journexis-language-switch button { min-width:38px; min-height:32px; padding:5px 9px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; color:#334155; font:600 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; cursor:pointer; }
      .journexis-language-switch button[aria-pressed="true"] { background:#172033; border-color:#172033; color:#fff; }
      @media (max-width:520px) { .journexis-language-switch { margin-bottom:10px; } }
    `;
    document.head.appendChild(style);
  }

  function updateSwitch() {
    const switcher = document.querySelector(".journexis-language-switch");
    if (!switcher) return;
    switcher.querySelectorAll("button[data-lang]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.lang === language));
    });
  }

  function addSwitcher() {
    if (document.querySelector(".journexis-language-switch")) return;
    const page = document.querySelector("main.page");
    if (!page) return;
    addStyles();
    const wrap = document.createElement("div");
    wrap.className = "journexis-language-switch";
    wrap.setAttribute("aria-label", "Language / Język");
    wrap.innerHTML = `<span>Language</span><button type="button" data-lang="pl">PL</button><button type="button" data-lang="en">EN</button>`;
    wrap.querySelectorAll("button[data-lang]").forEach(button => {
      button.addEventListener("click", () => setLanguage(button.dataset.lang, true));
    });
    page.prepend(wrap);
    updateSwitch();
  }

  function setLanguage(next, updateUrl = false) {
    if (!SUPPORTED.has(next)) return;
    language = next;
    localStorage.setItem(STORAGE_KEY, next);
    if (updateUrl) {
      const url = new URL(location.href);
      if (next === "en") url.searchParams.set("lang", "en");
      else url.searchParams.delete("lang");
      history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    updateMeta();
    translateSubtree(document.body);
    updateSwitch();
    document.dispatchEvent(new CustomEvent("journexis:languagechange", { detail: { language } }));
  }

  function start() {
    updateMeta();
    addSwitcher();
    translateSubtree(document.body);
    const observer = new MutationObserver(mutations => {
      const additions = [];
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          if (language === "en") translateTextNode(mutation.target);
        } else {
          for (const node of mutation.addedNodes) additions.push(node);
        }
      }
      // Translate only newly rendered content. Do not repeatedly walk the whole page.
      if (language === "en") for (const node of additions) translateSubtree(node);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window.JournexisI18n = {
    getLanguage: () => language,
    setLanguage,
    translateValue,
    refresh: () => translateSubtree(document.body)
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
