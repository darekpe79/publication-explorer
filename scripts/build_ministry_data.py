#!/usr/bin/env python3
"""Build browser-ready MNiSW data from official XLSX snapshots.

The script intentionally uses only the Python standard library, so it works with a
plain Python 3.11 installation. XLSX is a ZIP container with XML files; we read the
small subset needed by Publication Explorer directly.

Usage from repository root:
    python scripts/build_ministry_data.py

Expected inputs are configured in data/ministry/sources.json and are read from
    data/ministry/raw/

Outputs overwrite the three files already consumed by the browser app:
    data/ministry/current.js
    data/ministry/history-points.js
    data/ministry/history-meta.js
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from pathlib import Path

NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"


def normalize_issn(value: object) -> str:
    return re.sub(r"[^0-9X]", "", str(value or "").upper())


def is_valid_issn_shape(value: object) -> bool:
    return bool(re.fullmatch(r"[0-9]{7}[0-9X]", normalize_issn(value)))


def normalize_title(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).lower()
    return re.sub(r"[^a-z0-9]+", "", text)


def column_index(cell_ref: str) -> int:
    letters = re.match(r"[A-Z]+", cell_ref)
    if not letters:
        return 0
    value = 0
    for char in letters.group(0):
        value = value * 26 + ord(char) - 64
    return value - 1


def read_xlsx(path: Path) -> dict[str, list[list[str]]]:
    """Return worksheet rows as strings, preserving sparse cell positions."""
    ns = {"m": NS_MAIN, "r": NS_REL, "pr": NS_PKG_REL}
    with zipfile.ZipFile(path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("m:si", ns):
                shared_strings.append("".join(t.text or "" for t in item.iter(f"{{{NS_MAIN}}}t")))

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}

        worksheets: dict[str, list[list[str]]] = {}
        for sheet in workbook.find("m:sheets", ns) or []:
            rel_id = sheet.attrib[f"{{{NS_REL}}}id"]
            target = targets[rel_id].replace("\\", "/")
            xml_path = target.lstrip("/") if target.startswith("/") else f"xl/{target}"
            root = ET.fromstring(archive.read(xml_path))
            rows: list[list[str]] = []
            for row in root.findall(".//m:sheetData/m:row", ns):
                values: list[str] = []
                for cell in row.findall("m:c", ns):
                    idx = column_index(cell.attrib.get("r", "A1"))
                    while len(values) <= idx:
                        values.append("")
                    kind = cell.attrib.get("t")
                    value_node = cell.find("m:v", ns)
                    if kind == "s" and value_node is not None:
                        value = shared_strings[int(value_node.text or "0")]
                    elif kind == "inlineStr":
                        inline = cell.find("m:is", ns)
                        value = "" if inline is None else "".join(
                            t.text or "" for t in inline.iter(f"{{{NS_MAIN}}}t")
                        )
                    elif value_node is not None:
                        value = value_node.text or ""
                    else:
                        value = ""
                    values[idx] = value.strip()
                while values and not values[-1]:
                    values.pop()
                rows.append(values)
            worksheets[sheet.attrib["name"]] = rows
        return worksheets


def cell(row: list[str], index: int) -> str:
    return row[index].strip() if index < len(row) else ""


def choose_journal_sheet(sheets: dict[str, list[list[str]]]) -> tuple[str, list[list[str]]]:
    """Find the sheet whose second row looks like the official journal table."""
    for name, rows in sheets.items():
        if len(rows) < 3:
            continue
        header = [x.strip().lower() for x in rows[1]]
        joined = " | ".join(header)
        if "tytuł 1" in joined and "issn" in joined and ("punkty" in joined or "punktacja" in joined):
            return name, rows
    raise ValueError("Nie znaleziono arkusza z tabelą czasopism (Tytuł 1 / ISSN / Punkty).")


def parse_points(value: str) -> int | float | None:
    value = value.strip().replace(",", ".")
    if not value:
        return None
    try:
        number = float(value)
    except ValueError:
        return None
    return int(number) if number.is_integer() else number


def parse_snapshot(path: Path) -> dict:
    sheets = read_xlsx(path)
    sheet_name, rows = choose_journal_sheet(sheets)
    if len(rows) < 3:
        raise ValueError(f"Arkusz {sheet_name!r} nie zawiera danych.")

    names_row = rows[0]
    codes_row = rows[1]
    disciplines: dict[str, str] = {}
    discipline_columns: list[tuple[int, str]] = []
    for index in range(9, max(len(names_row), len(codes_row))):
        code = cell(codes_row, index)
        name = cell(names_row, index)
        if code and name:
            disciplines[code] = name
            discipline_columns.append((index, code))

    records: list[list] = []
    for row in rows[2:]:
        title1 = cell(row, 2)
        title2 = cell(row, 5)
        points = parse_points(cell(row, 8))
        if not title1 and not title2:
            continue
        issns: list[str] = []
        for index in (3, 4, 6, 7):
            key = normalize_issn(cell(row, index))
            if is_valid_issn_shape(key) and key not in issns:
                issns.append(key)
        discipline_codes = [code for index, code in discipline_columns if cell(row, index).lower() == "x"]
        records.append([title1, title2, points, discipline_codes, issns])

    return {
        "sheet": sheet_name,
        "disciplines": disciplines,
        "records": records,
    }


def build_current(snapshot: dict, source: dict) -> dict:
    records = snapshot["records"]
    issn_index: dict[str, int] = {}
    title_candidates: dict[str, list[int]] = defaultdict(list)

    for index, record in enumerate(records):
        title1, title2, _points, _disciplines, issns = record
        for issn in issns:
            # Current official list has unique ISSNs. If a future file does not,
            # keep the first and report the ambiguity instead of silently moving it.
            issn_index.setdefault(issn, index)
        for title in (title1, title2):
            key = normalize_title(title)
            if key and index not in title_candidates[key]:
                title_candidates[key].append(index)

    # Exact-title fallback is only safe when a normalized title identifies one row.
    title_index = {key: indexes[0] for key, indexes in title_candidates.items() if len(indexes) == 1}

    return {
        "sourceFile": source["file"],
        "sourceYear": source["year"],
        "sourceLabel": source.get("label", ""),
        "sourceUrl": source.get("sourceUrl", ""),
        "disciplines": snapshot["disciplines"],
        "records": records,
        "issnIndex": issn_index,
        "titleIndex": title_index,
    }


def build_history(snapshot: dict) -> tuple[dict[str, int | float], list[dict]]:
    points_by_issn: dict[str, int | float] = {}
    conflicts: list[dict] = []
    for row_number, record in enumerate(snapshot["records"], start=3):
        _title1, _title2, points, _disciplines, issns = record
        if points is None:
            continue
        for issn in issns:
            if issn in points_by_issn and points_by_issn[issn] != points:
                conflicts.append(
                    {"issn": issn, "previous": points_by_issn[issn], "replacement": points, "row": row_number}
                )
            # A later duplicate in an official amendment/correction file wins.
            points_by_issn[issn] = points
    return points_by_issn, conflicts


def dump_js(path: Path, variable: str, value: object) -> None:
    payload = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    path.write_text(f"window.{variable}={payload};\n", encoding="utf-8")


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Build Publication Explorer MNiSW assets from XLSX files.")
    parser.add_argument("--config", type=Path, default=repo_root / "data/ministry/sources.json")
    parser.add_argument("--raw-dir", type=Path, default=repo_root / "data/ministry/raw")
    parser.add_argument("--output-dir", type=Path, default=repo_root / "data/ministry")
    args = parser.parse_args()

    config = json.loads(args.config.read_text(encoding="utf-8"))
    sources = config.get("sources", [])
    current_sources = [source for source in sources if source.get("role") == "current"]
    if len(current_sources) != 1:
        raise SystemExit("sources.json musi zawierać dokładnie jedno źródło z role=current.")

    missing = [source["file"] for source in sources if not (args.raw_dir / source["file"]).is_file()]
    if missing:
        print("Brakuje plików XLSX w data/ministry/raw:")
        for name in missing:
            print(f"  - {name}")
        return 2

    parsed: dict[int, dict] = {}
    for source in sources:
        year = int(source["year"])
        path = args.raw_dir / source["file"]
        snapshot = parse_snapshot(path)
        parsed[year] = snapshot
        print(
            f"{year}: {len(snapshot['records']):,} czasopism, "
            f"{len(snapshot['disciplines']):,} dyscyplin ({snapshot['sheet']})"
        )

    current_source = current_sources[0]
    current_year = int(current_source["year"])
    current_data = build_current(parsed[current_year], current_source)

    history_points: dict[str, dict[str, int | float]] = {}
    history_meta: dict[str, dict] = {}
    for source in sources:
        if source.get("role") != "history":
            continue
        year = int(source["year"])
        points_map, conflicts = build_history(parsed[year])
        history_points[str(year)] = points_map
        history_meta[str(year)] = {
            "issns": len(points_map),
            "records": len(parsed[year]["records"]),
            "sourceFile": source["file"],
            "label": source.get("label", ""),
            "sourceUrl": source.get("sourceUrl", ""),
            "conflictsResolvedByLastRow": len(conflicts),
        }
        if conflicts:
            print(f"  UWAGA {year}: {len(conflicts)} konflikt(y) punktacji dla tego samego ISSN; późniejszy wiersz wygrywa.")
            for conflict in conflicts[:5]:
                print(
                    f"    {conflict['issn']}: {conflict['previous']} -> "
                    f"{conflict['replacement']} (wiersz {conflict['row']})"
                )

    args.output_dir.mkdir(parents=True, exist_ok=True)
    dump_js(args.output_dir / "current.js", "MINISTRY_DATA", current_data)
    dump_js(args.output_dir / "history-points.js", "MINISTRY_HISTORY_POINTS", history_points)
    dump_js(args.output_dir / "history-meta.js", "MINISTRY_HISTORY_META", history_meta)

    print("Gotowe:")
    for name in ("current.js", "history-points.js", "history-meta.js"):
        path = args.output_dir / name
        print(f"  {path.relative_to(repo_root)} ({path.stat().st_size / 1024 / 1024:.2f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
