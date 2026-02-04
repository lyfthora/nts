const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // acciones de la ventana main
  createNoteDashboard: () => ipcRenderer.invoke("create-note-dashboard"),
  getAllData: () => ipcRenderer.invoke("get-all-data"),

  // acciones (nota o main)
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  closeWindow: () => ipcRenderer.send("window-close"),

  // Notas: enviar/recibir
  updateNote: (note) => ipcRenderer.send("update-note", note),
  deleteNote: (id) => ipcRenderer.send("delete-note", id),
  deleteNotePermanently: (id) =>
    ipcRenderer.send("delete-note-permanently", id),
  restoreNote: (id) => ipcRenderer.send("restore-note", id),
  getNoteContent: (noteId) => ipcRenderer.invoke("get-note-content", noteId),
  saveAsset: (data) => ipcRenderer.invoke("save-asset", data),
  cleanUnusedAssets: (data) => ipcRenderer.invoke("clean-unused-assets", data),
  getDataPath: () => ipcRenderer.invoke("get-data-path"),

  // backlinks
  getBacklinks: (noteName) => ipcRenderer.invoke("get-backlinks", noteName),

  // carpetas
  createFolder: (folderData) => ipcRenderer.invoke("create-folder", folderData),
  updateFolder: (folder) => ipcRenderer.send("update-folder", folder),
  deleteFolder: (id) => ipcRenderer.invoke("delete-folder", id),

  // recibir datos de la nota
  onNoteData: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("note-data", handler);
    return () => ipcRenderer.removeListener("note-data", handler);
  },

  // obtener posición y tamaño
  getWindowPosition: () => ipcRenderer.invoke("get-window-position"),
  getWindowSize: () => ipcRenderer.invoke("get-window-size"),

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
