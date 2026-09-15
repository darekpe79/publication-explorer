# MNiSW data

Publication Explorer uses several separate official journal-list snapshots rather than treating the ministry data as one timeless table.

Current source set used by the v15 POC:

- 2019 — December 2019 list,
- 2021 — December 2021 consolidated list,
- 2023 — November 2023 consolidated project/list,
- 2024 — January 2024 list used for the current journal profile and finder.

The browser app should consume prepared data files, not parse XLSX files at runtime.

During the first refactor stage `scripts/split_v15.py` extracts the already validated data embedded in v15 into separate JavaScript data assets. In the next stage these generated assets will be replaced by a reproducible Python pipeline that reads the source XLSX files and produces normalized JSON/JS data for GitHub Pages.

Large generated data files are intentionally separated from application logic so that UI and source integrations can be maintained independently of ministry-list updates.
