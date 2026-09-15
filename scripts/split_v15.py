#!/usr/bin/env python3
"""Split the working single-file Publication Explorer v15 into repo assets.

Usage:
    python scripts/split_v15.py path/to/Publication_Explorer_v15.html

The script performs a structural split only. It does not change application
logic. Generated files:
    index.html
    assets/css/app.css
    src/js/app.js
    data/ministry/current.js
    data/ministry/history-points.js
    data/ministry/history-meta.js
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


DATA_CONSTANTS = (
    "MINISTRY_DATA",
    "MINISTRY_HISTORY_POINTS",
    "MINISTRY_HISTORY_META",
)


def extract_const(js: str, name: str) -> tuple[int, int, str]:
    """Return start/end offsets and JS expression assigned to a const."""
    match = re.search(rf"const\s+{re.escape(name)}=", js)
    if not match:
        raise ValueError(f"Cannot find JavaScript constant: {name}")

    expr_start = match.end()
    i = expr_start
    depth = 0
    quote: str | None = None
    escaped = False

    while i < len(js):
        char = js[i]

        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        else:
            if char in ('"', "'", "`"):
                quote = char
            elif char in "[{(":
                depth += 1
            elif char in "]})":
                depth -= 1
            elif char == ";" and depth == 0:
                return match.start(), i + 1, js[expr_start:i]
        i += 1

    raise ValueError(f"Unterminated JavaScript constant: {name}")


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/split_v15.py path/to/v15.html", file=sys.stderr)
        return 2

    source = Path(sys.argv[1]).expanduser().resolve()
    if not source.exists():
        print(f"File not found: {source}", file=sys.stderr)
        return 2

    root = Path(__file__).resolve().parents[1]
    text = source.read_text(encoding="utf-8")

    style_match = re.search(r"<style>(.*?)</style>", text, re.S)
    script_match = re.search(r"<script>(.*?)</script>", text, re.S)
    if not style_match or not script_match:
        raise ValueError("Expected one inline <style> block and one inline <script> block")

    css = style_match.group(1).strip() + "\n"
    js = script_match.group(1).strip() + "\n"

    extracted: dict[str, tuple[int, int, str]] = {
        name: extract_const(js, name) for name in DATA_CONSTANTS
    }

    app_js = js
    for name in reversed(DATA_CONSTANTS):
        start, end, _ = extracted[name]
        app_js = app_js[:start] + f"const {name}=window.{name};" + app_js[end:]

    index_html = re.sub(
        r"<style>.*?</style>",
        '<link rel="stylesheet" href="./assets/css/app.css" />',
        text,
        count=1,
        flags=re.S,
    )
    index_html = re.sub(
        r"<script>.*?</script>",
        "\n"
        '    <script defer src="./data/ministry/current.js"></script>\n'
        '    <script defer src="./data/ministry/history-points.js"></script>\n'
        '    <script defer src="./data/ministry/history-meta.js"></script>\n'
        '    <script defer src="./src/js/app.js"></script>\n',
        index_html,
        count=1,
        flags=re.S,
    )
    index_html = index_html.replace(
        "Publication Explorer · v15 finder range", "Publication Explorer"
    )

    outputs = {
        root / "index.html": index_html,
        root / "assets/css/app.css": css,
        root / "src/js/app.js": app_js,
        root / "data/ministry/current.js":
            "window.MINISTRY_DATA=" + extracted["MINISTRY_DATA"][2] + ";\n",
        root / "data/ministry/history-points.js":
            "window.MINISTRY_HISTORY_POINTS="
            + extracted["MINISTRY_HISTORY_POINTS"][2]
            + ";\n",
        root / "data/ministry/history-meta.js":
            "window.MINISTRY_HISTORY_META="
            + extracted["MINISTRY_HISTORY_META"][2]
            + ";\n",
    }

    for path, content in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        size_mb = path.stat().st_size / (1024 * 1024)
        print(f"generated {path.relative_to(root)} ({size_mb:.2f} MB)")

    print("Structural split complete. Application logic was not intentionally changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
