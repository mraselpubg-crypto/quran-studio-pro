# Studio Al-Qalam — Implementation Plans Log

Reverse-chronological log so a fresh agent can pick up where the previous session left off.

---

## Plan #6 — SQLite Migration (Electron DAL) — 2026-05-21

**Status:** ✅ Scaffolded. Local install + db build required by user.

### Added
- `electron/main.cjs` — BrowserWindow + better-sqlite3 + 5 IPC handlers
  (`dal:loadVerses|getPage|getPageRange|getSurahPages|getTotalPages`).
  Opens `data.db` from `process.resourcesPath` (packaged) or `./data.db` (dev). WAL mode.
- `electron/preload.cjs` — `contextBridge.exposeInMainWorld('electronAPI', …)` with `isElectron: true` and 5 thin wrappers.
- `scripts/build-sqlite.cjs` — creates `data.db`:
  - `verses(id PK, s, a, ar, bn)` + `verses_s_idx`
  - `pages(id PK, page_no, surah, json)` + `pages_no_idx`, `pages_surah_idx`
  - `meta(key PK, value)`
- `scripts/dump-pages.mjs` — runs `loadAllVerses()` + `buildAllPages()` in Node and writes JSON to stdout (run under `tsx`).
- `src/data/dal.electron.ts` — `ElectronDAL` class implementing `QuranDAL` via `window.electronAPI.*`.

### Modified
- `src/data/dal.ts` — `pickDAL()` factory: picks `ElectronDAL` when `window.electronAPI?.isElectron` exists, else `BrowserDAL`. ElectronDAL loaded via lazy `require()` to keep it out of the SSR/Worker bundle.
- `package.json` — 4 new scripts: `electron:dump-pages`, `electron:build-db`, `electron:dev`, `electron:package`.

### How to run locally (user)
```bash
npm install --save-dev electron @electron/packager better-sqlite3 tsx
npm run electron:dump-pages   # writes scripts/pages-dump.json
npm run electron:build-db     # writes data.db (~6 MB)
npm run dev                   # terminal 1 — Vite
npm run electron:dev          # terminal 2 — Electron
npm run electron:package      # production build
```

### Not done / future
- `base: './'` not set in `vite.config.ts` — required for packaged Electron `file://` loading. Current config uses `@lovable.dev/vite-tanstack-config` (Cloudflare Workers); recommend a separate `vite.electron.config.ts`.
- Web build (Cloudflare Workers) unaffected — still uses `BrowserDAL`.

---

## Plan #5 — History chip + QuickPublishModal portal — 2026-05-21
- `CanvasToolbar.tsx`: scopeLabel (📍 পেজ N · সারি M) chip in history dropdown.
- `QuickPublishModal.tsx`: wrapped in `createPortal(modal, document.body)`.

## Plan #4 — Scope fan-out + font-size display fix — 2026-05-21
- `PropertiesPanel.tsx::DSlider`: routes via `setGlobal` (global) or `patchScoped(scope)` (page/surah/local).
- `CharacterPanel` fontPx falls back to correct global default (50/18) instead of 0.

## Plan #3 — Scope-aware history + Quick-Publish print range — 2026-05-21
- `overridesStore.patchScoped`: `beginSilent/endSilent` fan-out, one synthetic history entry with real scope label.
- `historyStore.captureHistory`: scope-aware label generation.
- `Artboard.tsx`: `data-artboard` + `data-page-num`.
- Print stylesheet respects page range via `dataset.printSkip`.

## Plan #2 — History panel + Quick Publish modal — 2026-05-21
- HistoryTab scope chip, history entries carry scope/pageId/rowIndex.
- `QuickPublishModal.tsx` created, wired to TopBar ⚡ button.
