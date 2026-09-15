# Publication Explorer

Publication Explorer to statyczna aplikacja przeglądarkowa do eksplorowania publikacji naukowych i czasopism z wykorzystaniem kilku niezależnych źródeł danych. Rozdziela informacje o **konkretnej publikacji** od informacji o **czasopiśmie jako całości** i zachowuje informację o pochodzeniu poszczególnych wskaźników.

**Aplikacja online:** https://darekpe79.github.io/publication-explorer/

## Status

Aplikacja działa publicznie na GitHub Pages i jest wdrażana z gałęzi `main`. Pierwotny jednoplikowy proof of concept v15 został rozdzielony na osobne pliki HTML, CSS, JavaScript oraz dane, przy zachowaniu zweryfikowanego działania wersji v15.

Obecna wersja korzysta z powtarzalnego pipeline'u w Pythonie do budowania danych o czasopismach MNiSW z oficjalnych plików XLSX. Wygenerowane dane zostały porównane z zatwierdzonym checkpointem v15 przed publikacją.

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

Publication Explorer celowo **nie wylicza jednego zbiorczego wyniku jakości czasopisma** i **nie klasyfikuje czasopism jako drapieżne/niedrapieżne**. Informacje z różnych źródeł są prezentowane osobno, tak aby użytkownik mógł samodzielnie ocenić ich znaczenie i pochodzenie.

## Główne źródła danych

- **Crossref** — metadane DOI, bibliografia i linki wydawcy.
- **OpenAlex** — status OA publikacji, cytowania, topiki oraz dane o czasopiśmie/źródle.
- **MNiSW** — punktacja i dyscypliny czasopism; oddzielne oficjalne wykazy służą do danych bieżących i historycznych.
- **DOAJ** — status OA czasopisma, APC, licencje i informacje o politykach, jeśli są dostępne.
- **ISSN Portal** — identyfikacja czasopisma i metadane związane z ISSN.
- **Diamond Discovery Hub** — inteligentne wyszukiwanie czasopisma do weryfikacji Diamond OA.
- **Open Policy Finder** — inteligentne linki po ISSN do polityk samoarchiwizacji i Open Access.
- **SCImago** — inteligentne linki po ISSN do SJR i innych wskaźników czasopisma.
- **Index Copernicus / ICI World of Journals** — inteligentne wyszukiwanie po tytule; ISSN jest pokazywany jako dodatkowy identyfikator do weryfikacji.
- **JUFO / COPE** — linki do niezależnej weryfikacji klasyfikacji i standardów wydawniczych.

## Pipeline danych MNiSW

Przeglądarka nie czyta bezpośrednio plików ministerialnych XLSX. Oficjalne pliki źródłowe są przechowywane lokalnie w:

```text
data/ministry/raw/
```

Są celowo wyłączone z Gita. Dane gotowe do użycia przez aplikację generuje się poleceniem:

```powershell
python .\scripts\build_ministry_data.py
```

Skrypt odtwarza pliki:

```text
data/ministry/current.js
data/ministry/history-points.js
data/ministry/history-meta.js
```

Obecnie skonfigurowane są wykazy z lat 2019, 2021, 2023 i 2024. Wykaz ze stycznia 2024 służy jako aktualna podstawa profilu czasopisma i Findera, natomiast wcześniejsze wykazy dostarczają historycznych wartości punktowych.

Zgodność z danymi zatwierdzonej wersji v15 można sprawdzić poleceniem:

```powershell
python .\scripts\compare_ministry_checkpoint.py
```

Więcej szczegółów znajduje się w [`data/ministry/README.md`](data/ministry/README.md).

## Uruchomienie lokalne

Z katalogu głównego repozytorium:

```powershell
python -m http.server 8000
```

Następnie otwórz:

```text
http://localhost:8000/
```

Lokalny serwer HTTP jest zalecany zamiast otwierania `index.html` bezpośrednio, ponieważ zachowanie przeglądarki dla `fetch`, origin/CORS i zewnętrznych API może różnić się przy `file://`.

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
│       ├── current.js
│       ├── history-points.js
│       ├── history-meta.js
│       ├── sources.json
│       └── raw/
├── scripts/
│   ├── build_ministry_data.py
│   ├── compare_ministry_checkpoint.py
│   ├── split_v15.py
│   └── add_index_copernicus.py
└── docs/
    └── DEVELOPMENT.md
```

Aplikacja pozostaje celowo statyczna: GitHub Pages serwuje pliki, a przeglądarka uruchamia JavaScript i odpytuje publiczne zewnętrzne API tam, gdzie ma to sens. Python jest obecnie używany lokalnie i na etapie przygotowania/walidacji danych, a nie jako backend serwerowy.

## Workflow rozwoju

`main` to wersja wdrożona publicznie. Nowe prace powinny zwykle rozpoczynać się od aktualnego `main` na osobnej gałęzi, np.:

```powershell
git switch main
git pull
git switch -c feat/analytics
```

Po testach lokalnych zmiany można scalić z powrotem do `main`; GitHub Pages automatycznie wdroży wtedy nową wersję strony.

Więcej informacji o pracy lokalnej: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

## Najbliższe kierunki rozwoju

Najbliższe kroki to przede wszystkim lekkie statystyki użycia, kolejne integracje źródeł oraz stopniowe poprawki interfejsu i jakości danych. Priorytetem jest utrzymanie stabilnej, powtarzalnej wersji publicznej na GitHub Pages, a nie dalszy refaktor działającego kodu wyłącznie dla porządku strukturalnego.
