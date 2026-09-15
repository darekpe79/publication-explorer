# Journexis · Publication & Journal Explorer

Journexis to statyczna aplikacja przeglądarkowa do eksplorowania publikacji naukowych i czasopism z wykorzystaniem kilku niezależnych źródeł danych. Rozdziela informacje o **konkretnej publikacji** od informacji o **czasopiśmie jako całości** i zachowuje informację o pochodzeniu poszczególnych wskaźników.

**Autor:** Dariusz Perliński  
**Aplikacja online:** https://darekpe79.github.io/publication-explorer/

## Co potrafi aplikacja

- wyszukuje publikację po DOI,
- łączy metadane publikacji z Crossref i OpenAlex,
- pokazuje informacje o Open Access, cytowaniach i źródłach dotyczące konkretnej publikacji,
- wyszukuje czasopismo po ISSN lub tytule,
- buduje profil czasopisma z wykorzystaniem danych MNiSW, OpenAlex, DOAJ i ISSN,
- pokazuje aktualną punktację MNiSW, dyscypliny i historię punktacji,
- wyszukuje czasopisma po dyscyplinie MNiSW i zakresie punktów,
- opcjonalnie filtruje wyniki według sygnałów OA z DOAJ i/lub OpenAlex,
- udostępnia linki do zewnętrznych serwisów, takich jak Open Policy Finder, SCImago, Diamond Discovery Hub, ISSN Portal, JUFO, COPE i Index Copernicus,
- eksportuje metadane publikacji do JSON, BibTeX i RIS.

Journexis celowo **nie wylicza jednego zbiorczego wyniku jakości czasopisma** i **nie klasyfikuje czasopism jako drapieżne/niedrapieżne**. Informacje z różnych źródeł są prezentowane osobno, tak aby użytkownik mógł samodzielnie ocenić ich znaczenie i pochodzenie.

## Główne źródła danych

- **Crossref** — metadane DOI, bibliografia i linki wydawcy.
- **OpenAlex** — status OA publikacji, cytowania, topiki oraz dane o czasopiśmie/źródle.
- **MNiSW** — punktacja i dyscypliny czasopism; oddzielne oficjalne wykazy służą do danych bieżących i historycznych.
- **DOAJ** — status OA czasopisma, APC, licencje i informacje o politykach, jeśli są dostępne.
- **ISSN Portal** — identyfikacja czasopisma i metadane związane z ISSN.
- **Diamond Discovery Hub** — wyszukiwanie czasopisma do weryfikacji Diamond OA.
- **Open Policy Finder** — linki po ISSN do polityk samoarchiwizacji i Open Access.
- **SCImago** — linki po ISSN do SJR i innych wskaźników czasopisma.
- **Index Copernicus / ICI World of Journals** — wyszukiwanie po tytule; ISSN jest pokazywany jako dodatkowy identyfikator do weryfikacji.
- **JUFO / COPE** — linki do niezależnej weryfikacji klasyfikacji i standardów wydawniczych.

## Dane MNiSW

Aplikacja wykorzystuje osobne oficjalne wykazy MNiSW dla danych bieżących i historycznych. Obecnie skonfigurowane są wykazy z lat **2019, 2021, 2023 i 2024**. Wykaz ze stycznia 2024 służy jako podstawa aktualnego profilu czasopisma i Findera, natomiast wcześniejsze wykazy dostarczają historycznych wartości punktowych.

Dane źródłowe XLSX są przetwarzane lokalnie przez skrypt w Pythonie do plików używanych przez aplikację. Szczegóły techniczne znajdują się w [`data/ministry/README.md`](data/ministry/README.md).

## Uruchomienie lokalne

Z katalogu głównego repozytorium:

```powershell
python -m http.server 8000
```

Następnie otwórz:

```text
http://localhost:8000/
```

## Struktura repozytorium

```text
publication-explorer/
├── index.html
├── assets/
│   └── css/
│       └── app.css
├── src/
│   └── js/
│       └── app.js
├── data/
│   └── ministry/
├── scripts/
└── docs/
```

Aplikacja działa jako statyczna strona na GitHub Pages. JavaScript uruchamiany w przeglądarce odpytuje publiczne zewnętrzne API tam, gdzie ma to sens. Python służy obecnie do przygotowania i walidacji danych, a nie jako backend serwerowy.

## Licencja

Kod jest udostępniany na licencji **MIT**. Można go używać, modyfikować i rozpowszechniać zgodnie z warunkami licencji, z zachowaniem informacji o prawach autorskich i treści licencji.

Copyright © 2026 Dariusz Perliński.

## Rozwój

Informacje dla osób rozwijających projekt, w tym praca lokalna i sposób aktualizacji danych, znajdują się w [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).
