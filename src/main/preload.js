const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // actions main window
  createNoteDashboard: () => ipcRenderer.invoke("create-note-dashboard"),
  getAllData: () => ipcRenderer.invoke("get-all-data"),

  // actions (note or main)
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  closeWindow: () => ipcRenderer.send("window-close"),

  // notes: send/receive
  updateNote: (note) => ipcRenderer.send("update-note", note),
  deleteNote: (id) => ipcRenderer.send("delete-note", id),
  deleteNotePermanently: (id) =>
    ipcRenderer.send("delete-note-permanently", id),
  restoreNote: (id) => ipcRenderer.send("restore-note", id),
  getNoteContent: (noteId) => ipcRenderer.invoke("get-note-content", noteId),
  saveAsset: (data) => ipcRenderer.invoke("save-asset", data),
  cleanUnusedAssets: (data) => ipcRenderer.invoke("clean-unused-assets", data),
  getDataPath: () => ipcRenderer.invoke("get-data-path"),
  getDrawingData: (noteId) => ipcRenderer.invoke("get-drawing-data", noteId),
  // import/export
  exportNote: (noteId, format) =>
    ipcRenderer.invoke(`export-note-${format}`, noteId),
  importNote: () => ipcRenderer.invoke("import-note"),

  // backlinks
  getBacklinks: (noteName) => ipcRenderer.invoke("get-backlinks", noteName),

  // folders
  createFolder: (folderData) => ipcRenderer.invoke("create-folder", folderData),
  updateFolder: (folder) => ipcRenderer.send("update-folder", folder),
  deleteFolder: (id) => ipcRenderer.invoke("delete-folder", id),

  // get ntoe data
  onNoteData: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("note-data", handler);
    return () => ipcRenderer.removeListener("note-data", handler);
  },

  // get pos and size
  getWindowPosition: () => ipcRenderer.invoke("get-window-position"),
  getWindowSize: () => ipcRenderer.invoke("get-window-size"),

  // note window out dashboard
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
  // onInitialData: (callback) => {
  //   const handler = (event, data) => callback(data);
  //   ipcRenderer.once("initial-data", handler);
  //   return () => ipcRenderer.removeListener("initial-data", handler);
  // },
});
