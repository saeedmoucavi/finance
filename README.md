# Personal Finance Dashboard — iPhone web app

The iPhone version of the finance app: a web app you install from Safari with
*Add to Home Screen*. After the first visit it works without internet. All data
stays on the phone, inside the browser's storage.

The data uses the same `finance.db` format as the Windows and Android apps:

- **Import:** More → Import from PC.
- **Backup:** More → Send backup.

## Files

| Path | What it is |
|---|---|
| `index.html`, `css/`, `js/` | the app (plain HTML/JS, no build step) |
| `vendor/sql-wasm.*` | SQLite for the browser (sql.js 1.14.2) |
| `fonts/` | Vazirmatn |
| `sw.js` | offline cache |
| `manifest.webmanifest`, `icons/` | home-screen icon and name |

## Publishing an update

1. Change the files.
2. In `sw.js`, raise `VERSION` (for example `pfd-v1` → `pfd-v2`). Without this, phones keep the old cached version.
3. Upload the files to the GitHub repository. GitHub Pages republishes in about a minute.
4. On the iPhone, open the app with internet on, close it, and open it again.

Never put a `finance.db` file in this folder: everything here is public.
