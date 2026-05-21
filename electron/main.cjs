// Electron main process — Studio Al-Qalam
// Opens a BrowserWindow, loads the Vite-built renderer, and exposes
// SQLite-backed Quran data over IPC.
//
// Requires (install locally before first run):
//   npm install --save-dev electron @electron/packager better-sqlite3
//
// IMPORTANT: better-sqlite3 contains native bindings — only the main
// process may require() it. The renderer uses preload.cjs → window.electronAPI.

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

let db = null;

function openDatabase() {
  if (db) return db;
  const Database = require("better-sqlite3");
  // data.db sits beside the Electron executable in packaged builds, or in
  // the project root during `npm run electron:dev`.
  const candidates = [
    path.join(process.resourcesPath || "", "data.db"),
    path.join(__dirname, "..", "data.db"),
    path.join(app.getPath("userData"), "data.db"),
  ];
  const dbPath = candidates.find((p) => p && fs.existsSync(p)) ?? candidates[1];
  db = new Database(dbPath, { readonly: false, fileMustExist: false });
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  return db;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

// ── IPC handlers (the renderer's ElectronDAL calls these) ────────────────
ipcMain.handle("dal:loadVerses", (_e, surah) => {
  const d = openDatabase();
  const rows = surah == null
    ? d.prepare("SELECT id, s, a, ar, bn FROM verses ORDER BY id").all()
    : d.prepare("SELECT id, s, a, ar, bn FROM verses WHERE s = ? ORDER BY id").all(surah);
  return rows;
});

ipcMain.handle("dal:getPage", (_e, pageId) => {
  const d = openDatabase();
  const row = d.prepare("SELECT json FROM pages WHERE id = ?").get(pageId);
  return row ? JSON.parse(row.json) : null;
});

ipcMain.handle("dal:getPageRange", (_e, from, to) => {
  const d = openDatabase();
  const rows = d
    .prepare("SELECT json FROM pages WHERE page_no BETWEEN ? AND ? ORDER BY page_no")
    .all(from, to);
  return rows.map((r) => JSON.parse(r.json));
});

ipcMain.handle("dal:getSurahPages", (_e, surahNo) => {
  const d = openDatabase();
  const rows = d
    .prepare("SELECT json FROM pages WHERE surah = ? ORDER BY page_no")
    .all(surahNo);
  return rows.map((r) => JSON.parse(r.json));
});

ipcMain.handle("dal:getTotalPages", () => {
  const d = openDatabase();
  const r = d.prepare("SELECT COUNT(*) AS c FROM pages").get();
  return r.c;
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (db) { db.close(); db = null; }
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
