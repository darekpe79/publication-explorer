#!/usr/bin/env python3
"""Compare freshly generated MNiSW assets with the validated v15 split checkpoint.

This is a semantic comparison: source-file names and descriptive metadata may change,
but the data consumed by the browser should remain equivalent.

Usage from repository root:
    python scripts/compare_ministry_checkpoint.py
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

CHECKPOINT = "4b6f10d"
FILES = {
    "current": Path("data/ministry/current.js"),
    "history": Path("data/ministry/history-points.js"),
    "meta": Path("data/ministry/history-meta.js"),
}


def parse_js_assignment(text: str) -> object:
    _, payload = text.split("=", 1)
    return json.loads(payload.strip().rstrip(";"))


def load_working(path: Path) -> object:
    return parse_js_assignment(path.read_text(encoding="utf-8"))


def load_checkpoint(path: Path) -> object:
    result = subprocess.run(
        ["git", "show", f"{CHECKPOINT}:{path.as_posix()}"],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return parse_js_assignment(result.stdout)


def report_mapping_diff(label: str, old: dict, new: dict, limit: int = 8) -> int:
    keys = set(old) | set(new)
    changed = [key for key in sorted(keys) if old.get(key) != new.get(key)]
    if not changed:
        print(f"OK   {label}: identyczne")
        return 0
    print(f"DIFF {label}: {len(changed)} różnic")
    for key in changed[:limit]:
        print(f"     {key}: v15={old.get(key)!r}  build={new.get(key)!r}")
    if len(changed) > limit:
        print(f"     ... i {len(changed) - limit} kolejnych")
    return len(changed)


def main() -> int:
    old_current = load_checkpoint(FILES["current"])
    new_current = load_working(FILES["current"])
    old_history = load_checkpoint(FILES["history"])
    new_history = load_working(FILES["history"])
    old_meta = load_checkpoint(FILES["meta"])
    new_meta = load_working(FILES["meta"])

    failures = 0

    for key in ("disciplines", "records", "issnIndex", "titleIndex"):
        if old_current.get(key) == new_current.get(key):
            print(f"OK   current.{key}: identyczne")
        else:
            print(f"DIFF current.{key}: różni się od checkpointu v15")
            failures += 1

    for year in ("2019", "2021", "2023"):
        failures += report_mapping_diff(
            f"history.{year}", old_history.get(year, {}), new_history.get(year, {})
        )

    for year in ("2019", "2021", "2023"):
        old_rows = old_meta.get(year, {}).get("rows")
        old_issns = old_meta.get(year, {}).get("issns")
        new_rows = new_meta.get(year, {}).get("records")
        new_issns = new_meta.get(year, {}).get("issns")
        if (old_rows, old_issns) == (new_rows, new_issns):
            print(f"OK   meta.{year}: rows={new_rows}, issns={new_issns}")
        else:
            print(
                f"DIFF meta.{year}: v15 rows/issns={old_rows}/{old_issns}, "
                f"build={new_rows}/{new_issns}"
            )
            failures += 1

    if failures:
        print(f"\nPorównanie wykazało {failures} grup różnic. Nie commituj jeszcze danych.")
        return 1

    print("\nPASS: dane używane przez aplikację są semantycznie zgodne z checkpointem v15.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
