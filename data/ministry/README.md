# MNiSW data

Publication Explorer uses separate official journal-list snapshots rather than treating ministry data as one timeless table.

Configured sources are listed in `sources.json`. The current set is:

- 2019 — December 2019 list,
- 2021 — December 2021 consolidated list,
- 2023 — November 2023 consolidated project/list,
- 2024 — January 2024 list used for the current journal profile and finder.

## Data flow

Raw official XLSX files are placed in:

```text
data/ministry/raw/
```

The browser never parses XLSX directly. Instead run from the repository root:

```powershell
python .\scripts\build_ministry_data.py
```

The script reads the files configured in `sources.json`, identifies the journal worksheet and the official two-row header, normalizes ISSNs, extracts point values and discipline assignments, and regenerates the three browser assets already used by the application:

```text
data/ministry/current.js
data/ministry/history-points.js
data/ministry/history-meta.js
```

The build uses only the Python standard library, so no `pip install` is required.

## Adding a new ministry list

1. Put the new official XLSX file in `data/ministry/raw/`.
2. Add a new entry to `sources.json`.
3. Set exactly one source to `"role": "current"`. Older sources use `"role": "history"`.
4. Update `effectiveYears` to document which publication years should use a given list.
5. Run `python .\scripts\build_ministry_data.py`.
6. Test Publication Explorer locally before committing generated files.

The parser does not depend on the worksheet name. It looks for the official journal-table header (`Tytuł 1`, `ISSN`, `Punkty`/`Punktacja`) and reads discipline names/codes from the first two rows. This accommodates the naming differences already present in the 2019, 2021, 2023 and 2024 workbooks.

## Conflict policy

For the current list an ISSN should identify a single journal row; the first occurrence is kept if a future source unexpectedly duplicates it. Exact-title fallback is generated only for titles that identify one row unambiguously.

For historical lists, if the same ISSN occurs later in the same official workbook with a different point value, the later row wins and the build prints a warning. This is intended for amendment/correction workbooks where a later row can supersede an earlier one.

The original v15 split remains a useful checkpoint. `scripts/split_v15.py` can still reconstruct the previously embedded data, while `scripts/build_ministry_data.py` is the reproducible path for future ministry-list updates.
