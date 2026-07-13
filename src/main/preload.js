const { contextBridge, ipcRenderer } = require("electron");

const isDev = !process.resourcesPath || !process.resourcesPath.includes("app.asar");
const API_URL = isDev
  ? "http://localhost:3001/api"
  : "https://nts-api-production-5785.up.railway.app/api";

const TOKEN_KEY = "nts_auth_token";
async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
const existingToken = localStorage.getItem(TOKEN_KEY);
if (existingToken) {
  ipcRenderer.send("set-auth-token", existingToken);
}

contextBridge.exposeInMainWorld("api", {
  isDev,
  // Auth
  setAuthToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    ipcRenderer.send("set-auth-token", token);
  },
  getAuthToken: () => localStorage.getItem(TOKEN_KEY),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  openOAuth: (url) => ipcRenderer.invoke("open-oauth", url),
  getOAuthToken: () => ipcRenderer.invoke("get-oauth-token"),
  clearAuthToken: () => {
    localStorage.removeItem(TOKEN_KEY);
    ipcRenderer.send("set-auth-token", null);
  },

  //cache
  getCachedData: () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return null;
      const payload = JSON.parse(atob(token.split(".")[1]));
      const key = `nts_cache_${payload.id || payload.sub || "default"}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setCachedData: (data) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;
      const payload = JSON.parse(atob(token.split(".")[1]));
      const key = `nts_cache_${payload.id || payload.sub || "default"}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch { }
  },
  clearCachedData: () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;
      const payload = JSON.parse(atob(token.split(".")[1]));
      const key = `nts_cache_${payload.id || payload.sub || "default"}`;
      localStorage.removeItem(key);
    } catch {
      /* silenciar */
    }
  },

  // =============================================
  // data → http to api
  // =============================================
  createNoteDashboard: async () => {
    return apiRequest("/notes", {
      method: "POST",
      body: JSON.stringify({ noteType: "text" }),
    });
  },
  getAllData: () => apiRequest("/notes/all"),
  updateNote: async (note) => {
    const { id, ...data } = note;
    const result = await apiRequest(`/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    ipcRenderer.send("sync-note-change", note);
    return result;
  },
  deleteNote: (id) => apiRequest(`/notes/${id}`, { method: "DELETE" }),
  deleteNotePermanently: (id) =>
    apiRequest(`/notes/${id}/permanent`, { method: "DELETE" }),
  restoreNote: (id) => apiRequest(`/notes/${id}/restore`, { method: "POST" }),
  getNoteContent: async (noteId) => {
    const data = await apiRequest(`/notes/${noteId}/content`);
    return data.content;
  },
  getDrawingData: async (noteId) => {
    const data = await apiRequest(`/notes/${noteId}/content`);
    return data.drawingData;
  },
  saveAsset: async (data) => {
    const { fileBuffer, fileName, noteId } = data;
    const result = await apiRequest("/assets/upload", {
      method: "POST",
      body: JSON.stringify({
        fileBuffer: Array.from(new Uint8Array(fileBuffer)),
        fileName,
        noteId,
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
  createFolder: (folderData) =>
    apiRequest("/folders", {
      method: "POST",
      body: JSON.stringify(folderData),
    }),
  updateFolder: async (folder) => {
    const { id, ...data } = folder;
    return apiRequest(`/folders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  deleteFolder: (id) => apiRequest(`/folders/${id}`, { method: "DELETE" }),
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
  // =============================================
  // WINDOW → IPC local
  // =============================================
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
  getNoteWindowData: (noteId) =>
    ipcRenderer.invoke("get-note-window-data", noteId),
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
