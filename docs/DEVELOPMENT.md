# Local development

This project is being refactored from the working single-file v15 POC into a modular static application for GitHub Pages.

## First clone

```powershell
git clone https://github.com/darekpe79/publication-explorer.git
cd publication-explorer
git fetch --all
git switch -c refactor/modular-v1 --track origin/refactor/modular-v1
```

Check the current state:

```powershell
git status
git branch -a
```

## Generate the modular files from the working v15 HTML

Run the splitter against the existing v15 file without copying that source file into the repository:

```powershell
py .\scripts\split_v15.py "C:\path\to\Publication_Explorer_POC_TESTY_PUBLICZNE_v15_finder_range(1).html"
```

Generated files:

```text
index.html
assets/css/app.css
src/js/app.js
data/ministry/current.js
data/ministry/history-points.js
data/ministry/history-meta.js
```

## Run locally

From the repository root:

```powershell
py -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Stop the server with `Ctrl+C`.

## Commit the generated split

After testing:

```powershell
git status
git add index.html assets src data/ministry
git commit -m "refactor: split v15 into static assets"
git push -u origin refactor/modular-v1
```

Do not merge into `main` until the modular build has been checked against the working v15 POC.
