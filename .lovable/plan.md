## Phase 3C — SQLite / Electron DAL: verify & finalize

Most of Phase 3C is already implemented in the repo. This plan **verifies what exists, fixes the gaps**, and avoids redundant work. The web/browser build remains untouched.

### Current state (already in place)

- `electron/main.cjs` — all 5 IPC handlers exist (`dal:loadVerses`, `dal:getPage`, `dal:getPageRange`, `dal:getSurahPages`, `dal:getTotalPages`), using `better-sqlite3` sync API.
- `electron/preload.cjs` — exposes `window.electronAPI` with matching method names.
- `src/data/dal.ts` — `pickDAL()` already returns `ElectronDAL` when `window.electronAPI?.isElectron`, else `BrowserDAL`.
- `src/data/dal.electron.ts` — full ElectronDAL implementation with verses caching.
- `scripts/build-sqlite.cjs` — migration script exists.
- `scripts/dump-pages.mjs` — generates `pages-dump.json` for the build step.
- `package.json` — has `electron:build-db`, `electron:dump-pages`, `electron:dev`, `electron:package` scripts.

### Discrepancy with prompt (intentional — keep existing)

The continuation prompt suggests handler names like `getVerses` and column names `surah/ayah/arabic/bangla`. The existing implementation uses `dal:` prefixed handlers and short columns `s/a/ar/bn` matching the source `verses.json` shape and `FlowVerse` type. The existing names are internally consistent across main↔preload↔ElectronDAL↔build-sqlite — **do not rename**, that would break the chain for no benefit.

### Gaps to fix

1. **`electron/main.cjs` — `surah` column missing for non-`surah-open` pages.** Currently `build-sqlite.cjs` always inserts `surah = null`, so `getSurahPages` returns nothing. Fix by deriving surah from `page.ayahs[0].s` (or equivalent field on the generated page object) during the dump→insert step.

2. **`scripts/build-sqlite.cjs` — small robustness fixes.**
   - Derive `surah` per page from the dumped page object instead of always `null`.
   - Print a clearer message + non-zero exit when `pages-dump.json` is missing so users run `electron:dump-pages` first.

3. **`package.json` — add a convenience composite script.**
   - `"electron:db": "npm run electron:dump-pages && npm run electron:build-db"` so the full Electron data pipeline is one command.

4. **`electron/main.cjs` — read-only DB & better error messages.**
   - Open the DB with `readonly: true, fileMustExist: true` (we only SELECT from it) and surface a friendlier error if `data.db` is missing.

5. **No changes to `src/data/dal.ts` or `src/data/dal.electron.ts`.** Both already match the spec.

### Verification

- `npx tsc --noEmit` must exit 0 (no TS files change, but re-check).
- Web build unaffected: `pickDAL()` returns `BrowserDAL` in the browser because `window.electronAPI` is undefined; `dal.electron.ts` is only `require()`d lazily inside that branch, so it never enters the Vite/Worker bundle.
- Manual Electron smoke: out of scope for this sandbox (no Electron runtime here); the user runs `npm run electron:db && npm run electron:dev` locally.

### Out of scope

- Phase 3B (Tajweed font) and Phase 4A/4B — separate follow-ups per the continuation prompt.
- Any rename of handlers or columns.

### Commit

`feat(Phase3C): finalize SQLite Electron DAL (surah derivation, read-only, convenience script)`
