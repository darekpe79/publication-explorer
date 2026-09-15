#!/usr/bin/env python3
"""One-time helper: add Index Copernicus smart links to Publication Explorer.

Run from repository root:
    python scripts/add_index_copernicus.py

The helper is deliberately small and idempotent. It updates the current v15-derived
app.js and the About/source description without changing other application logic.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src/js/app.js"
INDEX = ROOT / "index.html"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}.")
    return text.replace(old, new, 1)


def patch_app() -> bool:
    text = APP.read_text(encoding="utf-8")
    if "const ici=i=>" in text and "Index Copernicus" in text:
        print("app.js: Index Copernicus already present")
        return False

    old_builder = '          const sjr=i=>`https://www.scimagojr.com/journalsearch.php?q=${encodeURIComponent(i)}&tip=iss`;'
    new_builder = old_builder + '\n          const ici=i=>`https://journals.indexcopernicus.com/search/form?search=${encodeURIComponent("ISSN "+i)}`;'
    text = replace_once(text, old_builder, new_builder, "app.js URL builder")

    old_row = '            <div class="external-service"><div><span class="external-name">SCImago</span><span class="external-desc">SJR, kwartyle, H-index</span></div><div class="external-links">${serviceLinks(ids,sjr)}</div></div>'
    new_row = old_row + '\n            <div class="external-service"><div><span class="external-name">Index Copernicus</span><span class="external-desc">ICI World of Journals · inteligentne wyszukiwanie po ISSN</span></div><div class="external-links">${serviceLinks(ids,ici)}</div></div>'
    text = replace_once(text, old_row, new_row, "app.js external source row")

    APP.write_text(text, encoding="utf-8")
    print("app.js: added Index Copernicus smart ISSN links")
    return True


def patch_index() -> bool:
    text = INDEX.read_text(encoding="utf-8")
    changed = False

    if "ICI · wyszukiwanie czasopisma" not in text:
        old_pill = '        <span class="source-pill issn">ISSN Portal · identyfikacja czasopisma</span>'
        new_pill = old_pill + '\n        <span class="source-pill">ICI · wyszukiwanie czasopisma</span>'
        text = replace_once(text, old_pill, new_pill, "index.html source pill")
        changed = True

    if "Index Copernicus / ICI World of Journals" not in text:
        old_row = '            <tr><td><strong>SCImago</strong></td><td>Inteligentne linki po ISSN do SJR, kwartylu i innych wskaźników czasopisma.</td></tr>'
        new_row = old_row + '\n            <tr><td><strong>Index Copernicus / ICI World of Journals</strong></td><td>Inteligentne linki po ISSN do wyszukiwarki czasopism. Obecność rekordu w ICI World of Journals nie jest utożsamiana z indeksacją w ICI Journals Master List ani z określoną wartością ICV.</td></tr>'
        text = replace_once(text, old_row, new_row, "index.html About row")
        changed = True

    if changed:
        INDEX.write_text(text, encoding="utf-8")
        print("index.html: documented Index Copernicus as an additional source")
    else:
        print("index.html: Index Copernicus already present")
    return changed


def main() -> int:
    changed = patch_app() or patch_index()
    # patch_index still needs to run when app.js changed because of short-circuiting.
    if changed:
        patch_index()
    print("Done. Test locally before committing src/js/app.js and index.html.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
