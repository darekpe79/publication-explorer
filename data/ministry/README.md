# MNiSW data

Publication Explorer uses separate official journal-list snapshots rather than treating ministry data as one timeless table.

Configured sources are listed in `sources.json`. The current set is:

- 2019 — December 2019 list,
- 2021 — December 2021 consolidated list,
- 2023 — November 2023 consolidated project/list,
- 2024 — January 2024 list used for the current journal profile and finder.

## Data flow

Raw official XLSX files are placed locally in:

```text
data/ministry/raw/
```

The browser never parses XLSX directly. Instead run from the repository root:

```powershell
python .\scripts\build_ministry_data.py
```

The script reads the files configured in `sources.json`, identifies the journal worksheet and the official two-row header, normalizes ISSNs for lookup while preserving the canonical display form (`1234-567X`), extracts point values and discipline assignments, and regenerates the three browser assets already used by the application:

```text
data/ministry/current.js
data/ministry/history-points.js
data/ministry/history-meta.js
```

The build uses only the Python standard library, so no `pip install` is required.

The raw XLSX snapshots are working/source files and are not intended to be committed to the repository. The generated browser assets are committed because GitHub Pages needs them at runtime.

## Adding a new ministry list

1. Put the new official XLSX file in `data/ministry/raw/`.
2. Add a new entry to `sources.json`.
3. Set exactly one source to `"role": "current"`. Older sources use `"role": "history"`.
4. Update `effectiveYears` to document which publication years should use a given list.
5. Run `python .\scripts\build_ministry_data.py`.
6. Run `python .\scripts\compare_ministry_checkpoint.py` when checking compatibility with the validated v15 checkpoint.
7. Test Publication Explorer locally before committing generated files.

The parser does not depend on the worksheet name. It looks for the official journal-table header (`Tytuł 1`, `ISSN`, `Punkty`/`Punktacja`) and reads discipline names/codes from the first two rows. This accommodates the naming differences already present in the 2019, 2021, 2023 and 2024 workbooks.

## Conflict policy

For the current list an ISSN should identify a single journal row; the first occurrence is kept if a future source unexpectedly duplicates it. Exact-title fallback is generated only for titles that identify one row unambiguously.

For historical lists, if the same normalized ISSN occurs with different point values in the same official workbook, that ISSN is treated as ambiguous and omitted from the historical points lookup. The build reports the conflict instead of choosing a value silently. This matches the validated v15 behavior; in the 2021 snapshot there is one such case (`25436430`, 40 vs 20).

The original v15 split remains the compatibility checkpoint. `scripts/split_v15.py` can reconstruct the previously embedded data, while `scripts/build_ministry_data.py` is the reproducible path for future ministry-list updates. `scripts/compare_ministry_checkpoint.py` verifies that the generated current records, indexes, historical points and v15-compatible metadata remain semantically equivalent to that checkpoint.
