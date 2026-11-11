const { contextBridge, ipcRenderer } = require("electron");
const { getOfflineSync } = require("./offlineSync.js");
const isDev = !process.resourcesPath || !process.resourcesPath.includes("app.asar");
const API_URL = "https://nts-api-3e8i.onrender.com/api";

// Obtener el token de forma síncrona al arrancar y guardarlo en memoria local
let cachedToken = ipcRenderer.sendSync("get-auth-token-sync") || null;
const offlineSync = getOfflineSync({
  getToken: () => cachedToken,
  apiRequest: (path, options) => apiRequest(path, options),
});

try {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("nts_auth_token");
  }
} catch (e) { }

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = cachedToken;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const error = new Error(`API error: ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

contextBridge.exposeInMainWorld("api", {
  isDev,
  // Auth
  setAuthToken: (token) => {
    cachedToken = token;
    ipcRenderer.send("set-auth-token", token);
    if (cachedToken) offlineSync.flushPendingSync().catch(() => {});
  },
  getAuthToken: () => cachedToken,
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  openOAuth: (url) => ipcRenderer.invoke("open-oauth", url),
  getOAuthToken: () => ipcRenderer.invoke("get-oauth-token"),
  clearAuthToken: () => {
    cachedToken = null;
    ipcRenderer.send("set-auth-token", null);
  },

  //cache
  saveNoteLocally: (note) => {
    try {
      return !!cachedToken && offlineSync.saveNoteLocally(note);
    } catch {
      return false;
    }
  },
  getCachedData: () => {
    try {
      if (!cachedToken) return null;
      return offlineSync.getCachedData();
    } catch {
      return null;
    }
  },
  setCachedData: (data) => {
    try {
      if (!cachedToken) return;
      offlineSync.setCachedData(data);
    } catch { }
  },
  clearCachedData: () => {
    try {
      if (!cachedToken) return;
      offlineSync.clearCachedData();
    } catch {
      /* silenciar */
    }
  },

  // data → http to api
  createNoteDashboard: async () => offlineSync.createNote("text"),
  getAllData: () => offlineSync.getAllData(),
  getSyncStatus: () => offlineSync.getSyncStatus(),
  retryPendingSync: () => offlineSync.flushPendingSync(),
  onOfflineDataChanged: (callback) => {
    const handler = (data) => callback(data);
    return offlineSync.onDataChange(handler);
  },
  updateNote: async (note) => {
    const result = await offlineSync.updateNote(note);
    ipcRenderer.send("sync-note-change", note);
    return result;
  },
  deleteNote: (id) => offlineSync.deleteNote(id),
  deleteNotePermanently: (id) => offlineSync.deleteNotePermanently(id),
  restoreNote: (id) => offlineSync.restoreNote(id),
  getNoteContent: (noteId) => offlineSync.getNoteContent(noteId, "text"),
  getDrawingData: (noteId) => offlineSync.getNoteContent(noteId, "drawing"),
  saveAsset: async (data) => {
    const { fileBuffer, fileName, noteId } = data;
    const note = offlineSync.getCachedData().notes.find((item) => item.id === noteId);
    const remoteNoteId = note?.remoteId ?? noteId;
    const result = await apiRequest("/assets/upload", {
      method: "POST",
      body: JSON.stringify({
        fileBuffer: Buffer.from(fileBuffer).toString("base64"),
        fileName,
        noteId: remoteNoteId,
      }),
    });
    return result.url;
  },
  cleanUnusedAssets: (data) =>
    apiRequest("/assets/clean", {
      method: "POST",
      body: JSON.stringify({
        currentImages: data.referencedImages || [],
        referencedImages: data.referencedImages || [],
      }),
    }),
  getDataPath: () => Promise.resolve(""),
  // backlinks
  getBacklinks: (noteName) =>
    apiRequest(`/notes/${encodeURIComponent(noteName)}/backlinks`),
  // folders
  createFolder: (folderData) => offlineSync.createFolder(folderData),
  updateFolder: (folder) => offlineSync.updateFolder(folder),
  deleteFolder: (id) => offlineSync.deleteFolder(id),
  // import/export
  exportNote: (noteId, format) =>
    ipcRenderer.invoke(`export-note-${format}`, noteId),
  importNote: () => ipcRenderer.invoke("import-note"),
  exportAllNotes: () => ipcRenderer.invoke("export-all-notes"),
  onExportImportProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("export-import-progress", handler);
    return () => ipcRenderer.removeListener("export-import-progress", handler);
  },
  // WINDOW → IPC local
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  closeWindow: () => ipcRenderer.send("window-close"),
  onNoteData: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("note-data", handler);
    return () => ipcRenderer.removeListener("note-data", handler);
  },
  getWindowPosition: () => ipcRenderer.invoke("get-window-position"),
  getWindowSize: () => ipcRenderer.invoke("get-window-size"),
  openNoteWindow: (noteId, x, y) =>
    ipcRenderer.invoke("open-note-window", { noteId, x, y }),
  getNoteWindowData: (noteId) => offlineSync.getNoteWindowData(noteId),
  sendNoteChange: (note) => ipcRenderer.send("note-window-change", note),
  onExternalNoteChanged: (callback) => {
    const handler = (event, note) => callback(note);
    ipcRenderer.on("external-note-changed", handler);
    return () => ipcRenderer.removeListener("external-note-changed", handler);
  },
  onNoteWindowClosed: (callback) => {
    const handler = (event, noteId) => callback(noteId);
    ipcRenderer.on("note-window-closed", handler);
    return () => ipcRenderer.removeListener("note-window-closed", handler);
  },
  onDashboardNoteChanged: (callback) => {
    const handler = (event, note) => callback(note);
    ipcRenderer.on("dashboard-note-changed", handler);
    return () => ipcRenderer.removeListener("dashboard-note-changed", handler);
  },
  onNoteWindowInit: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("note-window-init", handler);
    return () => ipcRenderer.removeListener("note-window-init", handler);
  },
  onPaymentEvent: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("payment-event", handler);
    return () => ipcRenderer.removeListener("payment-event", handler);
  },
  // Auto-Update
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  quitAndInstall: () => ipcRenderer.send("quit-and-install"),
  onUpdateAvailable: (callback) => {
    const handler = (event, info) => callback(info);
    ipcRenderer.on("update-available", handler);
    return () => ipcRenderer.removeListener("update-available", handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (event) => callback();
    ipcRenderer.on("update-downloaded", handler);
    return () => ipcRenderer.removeListener("update-downloaded", handler);
  },
});
