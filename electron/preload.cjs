// Preload — exposes a typed, narrow IPC surface to the renderer.
// The renderer (src/data/dal.electron.ts) checks for window.electronAPI
// and uses it instead of the BrowserDAL when running inside Electron.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  loadVerses: (surah) => ipcRenderer.invoke("dal:loadVerses", surah),
  getPage: (pageId) => ipcRenderer.invoke("dal:getPage", pageId),
  getPageRange: (from, to) => ipcRenderer.invoke("dal:getPageRange", from, to),
  getSurahPages: (surahNo) => ipcRenderer.invoke("dal:getSurahPages", surahNo),
  getTotalPages: () => ipcRenderer.invoke("dal:getTotalPages"),
});
