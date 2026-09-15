#!/usr/bin/env python3
"""One-time helper: add/fix Index Copernicus smart links in Publication Explorer.

Run from repository root:
    python scripts/add_index_copernicus.py

The Index Copernicus `search=` URL parameter fills the journal-title field, not the
ISSN field. Therefore the smart link uses the journal title and shows ISSNs as a
manual fallback/reference.
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
    changed = False

    # Migrate the first, incorrect ISSN-based prototype if it is already present locally.
    old_builder = '          const ici=i=>`https://journals.indexcopernicus.com/search/form?search=${encodeURIComponent("ISSN "+i)}`;'
    if old_builder in text:
        text = text.replace(
            old_builder,
            '          const iciTitle=String(record?.journal||"").trim();\n'
            '          const iciUrl=iciTitle?`https://journals.indexcopernicus.com/search/form?search=${encodeURIComponent(iciTitle)}`:"https://journals.indexcopernicus.com/search/form";',
            1,
        )
        changed = True

    old_row = '            <div class="external-service"><div><span class="external-name">Index Copernicus</span><span class="external-desc">ICI World of Journals · inteligentne wyszukiwanie po ISSN</span></div><div class="external-links">${serviceLinks(ids,ici)}</div></div>'
    if old_row in text:
        new_row = '            <div class="external-service"><div><span class="external-name">Index Copernicus</span><span class="external-desc">ICI World of Journals · wyszukiwanie po tytule czasopisma</span></div><div class="external-links"><a class="external-link generic" target="_blank" rel="noopener noreferrer" href="${escapeHtml(iciUrl)}">Otwórz ICI ↗</a><span class="external-desc">${iciTitle?`Tytuł: ${escapeHtml(iciTitle)} · `:""}ISSN do ręcznego sprawdzenia: ${escapeHtml(ids.join(" / "))}</span></div></div>'
        text = text.replace(old_row, new_row, 1)
        changed = True

    # Fresh install path: add the title-based integration if Index Copernicus is absent.
    if "Index Copernicus</span>" not in text:
        sjr_builder = '          const sjr=i=>`https://www.scimagojr.com/journalsearch.php?q=${encodeURIComponent(i)}&tip=iss`;'
        text = replace_once(
            text,
            sjr_builder,
            sjr_builder
            + '\n          const iciTitle=String(record?.journal||"").trim();\n'
            + '          const iciUrl=iciTitle?`https://journals.indexcopernicus.com/search/form?search=${encodeURIComponent(iciTitle)}`:"https://journals.indexcopernicus.com/search/form";',
            "app.js URL builder",
        )
        sjr_row = '            <div class="external-service"><div><span class="external-name">SCImago</span><span class="external-desc">SJR, kwartyle, H-index</span></div><div class="external-links">${serviceLinks(ids,sjr)}</div></div>'
        ici_row = '            <div class="external-service"><div><span class="external-name">Index Copernicus</span><span class="external-desc">ICI World of Journals · wyszukiwanie po tytule czasopisma</span></div><div class="external-links"><a class="external-link generic" target="_blank" rel="noopener noreferrer" href="${escapeHtml(iciUrl)}">Otwórz ICI ↗</a><span class="external-desc">${iciTitle?`Tytuł: ${escapeHtml(iciTitle)} · `:""}ISSN do ręcznego sprawdzenia: ${escapeHtml(ids.join(" / "))}</span></div></div>'
        text = replace_once(text, sjr_row, sjr_row + "\n" + ici_row, "app.js external source row")
        changed = True

    if changed:
        APP.write_text(text, encoding="utf-8")
        print("app.js: Index Copernicus smart link uses journal title; ISSN kept as fallback")
    else:
        print("app.js: Index Copernicus title-based link already present")
    return changed


def patch_index() -> bool:
    text = INDEX.read_text(encoding="utf-8")
    changed = False

    if "ICI · wyszukiwanie czasopisma" not in text:
        old_pill = '        <span class="source-pill issn">ISSN Portal · identyfikacja czasopisma</span>'
        new_pill = old_pill + '\n        <span class="source-pill">ICI · wyszukiwanie czasopisma</span>'
        text = replace_once(text, old_pill, new_pill, "index.html source pill")
        changed = True

    old_about = '<tr><td><strong>Index Copernicus / ICI World of Journals</strong></td><td>Inteligentne linki po ISSN do wyszukiwarki czasopism. Obecność rekordu w ICI World of Journals nie jest utożsamiana z indeksacją w ICI Journals Master List ani z określoną wartością ICV.</td></tr>'
    new_about = '<tr><td><strong>Index Copernicus / ICI World of Journals</strong></td><td>Inteligentny link po tytule czasopisma do wyszukiwarki ICI; ISSN pokazujemy obok jako identyfikator do ręcznej weryfikacji. Obecność rekordu w ICI World of Journals nie jest utożsamiana z indeksacją w ICI Journals Master List ani z określoną wartością ICV.</td></tr>'
    if old_about in text:
        text = text.replace(old_about, new_about, 1)
        changed = True
    elif "Index Copernicus / ICI World of Journals" not in text:
        sjr_about = '<tr><td><strong>SCImago</strong></td><td>Inteligentne linki po ISSN do SJR, kwartylu i innych wskaźników czasopisma.</td></tr>'
        text = replace_once(text, sjr_about, sjr_about + "\n            " + new_about, "index.html About row")
        changed = True

    if changed:
        INDEX.write_text(text, encoding="utf-8")
        print("index.html: documented title-based Index Copernicus link")
    else:
        print("index.html: Index Copernicus documentation already current")
    return changed


def main() -> int:
    patch_app()
    patch_index()
    print("Done. Test locally before committing src/js/app.js and index.html.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
