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
| `index.html`, `manifest.webmanifest`, `sw.js` | page, install manifest, offline cache |
| `css/tokens.css` | every colour, radius and size (light and dark) |
| `css/app.css`, `css/print.css` | components and screens; printable report |
| `js/` | data (`db.js`), formatting (`core.js`, `jalali.js`), text (`strings.js`), icons and chart colours, exports |
| `js/ui/`, `js/screens/`, `js/sheets/`, `js/features/` | shell and shared builders; one file per screen; forms; backup and lock |
| `vendor/sql-wasm.*` | SQLite for the browser (sql.js 1.14.2) |

Full documentation (Persian): [`docs/DOCUMENTATION.fa.md`](docs/DOCUMENTATION.fa.md).

## Publishing an update

1. Change the files.
2. In `sw.js`, raise `VERSION` (for example `pfd-v1` → `pfd-v2`). Without this, phones keep the old cached version.
3. Upload the files to the GitHub repository. GitHub Pages republishes in about a minute.
4. On the iPhone, open the app with internet on, close it, and open it again.

Never put a `finance.db` file in this folder: everything here is public.
