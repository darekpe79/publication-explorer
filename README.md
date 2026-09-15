# Publication Explorer

Publication Explorer is a static browser application for exploring scholarly publications and journals by combining several independent scholarly-data sources. It separates information about a **specific publication** from information about the **journal as a whole** and keeps indicators attributed to their original sources.

**Live application:** https://darekpe79.github.io/publication-explorer/

## Status

The application is live on GitHub Pages and is deployed from the `main` branch. The former single-file v15 proof of concept has been split into separate HTML, CSS, JavaScript and data assets, while preserving the validated v15 behaviour.

The current release uses a reproducible Python pipeline to rebuild the Polish MNiSW journal data from official XLSX snapshots. Generated data were compared against the validated v15 checkpoint before release.

## What the application does

- looks up a publication by DOI,
- combines publication metadata from Crossref and OpenAlex,
- shows Open Access, citation and source information for the publication,
- looks up a journal by ISSN or title,
- builds a journal profile using MNiSW, OpenAlex, DOAJ and ISSN-related data,
- shows current MNiSW points and disciplines together with historical point values,
- finds journals by MNiSW discipline and point range,
- optionally filters finder results using DOAJ and/or OpenAlex OA signals,
- provides links to external journal services such as Open Policy Finder, SCImago, Diamond Discovery Hub, ISSN Portal, JUFO, COPE and Index Copernicus,
- exports publication metadata as JSON, BibTeX and RIS.

Publication Explorer intentionally does **not** calculate a single journal-quality score and does **not** classify journals as predatory/non-predatory. Signals from different services are shown separately so users can assess their meaning and provenance.

## Main data sources

- **Crossref** — DOI metadata, references and publisher links.
- **OpenAlex** — publication OA status, citations, topics and journal/source metadata.
- **MNiSW** — journal points and disciplines; separate official snapshots are used for current and historical values.
- **DOAJ** — journal OA status, APC, licence and related policy information when available.
- **ISSN Portal** — journal identity and ISSN-related metadata.
- **Diamond Discovery Hub** — smart journal lookup for Diamond OA verification.
- **Open Policy Finder** — smart ISSN links to self-archiving and OA policies.
- **SCImago** — smart ISSN links to SJR and journal metrics.
- **Index Copernicus / ICI World of Journals** — title-based smart lookup; ISSN is displayed as an additional verification identifier.
- **JUFO / COPE** — external verification links.

## MNiSW data pipeline

The browser does not parse ministry spreadsheets directly. Official XLSX snapshots are kept locally in:

```text
data/ministry/raw/
```

They are intentionally excluded from Git. The browser-ready data are generated with:

```powershell
python .\scripts\build_ministry_data.py
```

The build regenerates:

```text
data/ministry/current.js
data/ministry/history-points.js
data/ministry/history-meta.js
```

The currently configured snapshots are 2019, 2021, 2023 and 2024. The January 2024 list is used as the current journal profile/finder base; earlier snapshots provide historical point values.

Compatibility with the validated v15 data can be checked with:

```powershell
python .\scripts\compare_ministry_checkpoint.py
```

More details are in [`data/ministry/README.md`](data/ministry/README.md).

## Running locally

From the repository root:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

A local HTTP server is preferred over opening `index.html` directly because browser behaviour for fetches, origins and external APIs can differ under `file://`.

## Repository structure

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

The application remains intentionally static: GitHub Pages serves the files, while the browser runs the JavaScript and queries public external APIs where appropriate. Python is currently used for local/build-time data preparation and validation rather than as a server backend.

## Development workflow

`main` is the deployed version. New work should normally start from an up-to-date `main` on a dedicated branch, for example:

```powershell
git switch main
git pull
git switch -c feat/analytics
```

After local testing, changes can be merged back into `main`; GitHub Pages then redeploys the site automatically.

See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the local workflow.

## Near-term improvements

Likely next steps include lightweight usage analytics, further source integrations and incremental UI/data-quality improvements. The current priority is to keep the public GitHub Pages version stable and reproducible rather than refactor working code solely for structural reasons.
