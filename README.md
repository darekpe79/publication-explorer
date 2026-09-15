# Publication Explorer

Publication Explorer is a browser-based tool for exploring scholarly publications and journals using several independent data sources, including Crossref, OpenAlex, the Polish MNiSW journal lists, DOAJ, ISSN Portal, Diamond Discovery Hub and Open Policy Finder.

## Project status

The current development branch (`refactor/modular-v1`) is a modular refactor of the working v15 proof of concept. The first goal is **feature parity** with v15 on GitHub Pages before adding new functionality.

## Current scope

- publication lookup by DOI,
- journal lookup by ISSN or title,
- journal finder by MNiSW discipline and point range,
- Open Access signals from independent sources,
- MNiSW current points, disciplines and historical point values,
- links to external journal services and registries,
- export of publication metadata to JSON, BibTeX and RIS.

Publication Explorer intentionally does not calculate a single journal-quality score and does not classify journals as predatory/non-predatory. It presents source-specific information so that users can assess it themselves.

## Planned modular structure

```text
publication-explorer/
├── index.html
├── assets/
│   └── css/
│       └── app.css
├── src/
│   └── js/
│       ├── app.js
│       ├── publication.js
│       ├── journal.js
│       ├── finder.js
│       ├── services/
│       └── utils/
├── data/
│   └── ministry/
├── scripts/
├── tests/
└── docs/
```

Python will be used mainly to prepare and validate local datasets. The published application itself remains static and is intended to run on GitHub Pages.

## Data model note

The current MNiSW profile is based on the January 2024 list. Historical point values are derived from separate official lists for 2019, 2021 and 2023. These sources are kept distinct rather than treated as one spreadsheet.

## Development rule

During the refactor, functional changes are kept separate from structural changes. A modular version is merged into `main` only after its behaviour has been checked against the working v15 POC.
