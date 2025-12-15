const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // acciones de la ventana main
  createNote: () => ipcRenderer.send("create-note"),
  createNoteDashboard: () => ipcRenderer.invoke("create-note-dashboard"),
  openNoteWindow: (noteId, x, y) =>
    ipcRenderer.send("open-note-window", noteId, x, y),
  showAllNotes: () => ipcRenderer.send("show-all-notes"),
  getAllNotes: () => ipcRenderer.invoke("get-all-notes"),
  showNoteById: (noteId) => ipcRenderer.send("show-note-by-id", noteId),
  openNotesList: () => ipcRenderer.send("open-notes-list"),
  openRemindersList: () => ipcRenderer.send("open-reminders-list"),
  openDashboard: () => ipcRenderer.send("open-dashboard"),

  // acciones (nota o main)
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  closeWindow: () => ipcRenderer.send("window-close"),
  destroyWindow: () => ipcRenderer.send("window-destroy"),
  toggleMaximize: () => ipcRenderer.send("window-maximize"),

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

  // carpetas
  getAllFolders: () => ipcRenderer.invoke("get-all-folders"),
  createFolder: (folderData) => ipcRenderer.invoke("create-folder", folderData),
  updateFolder: (folder) => ipcRenderer.send("update-folder", folder),
  deleteFolder: (id) => ipcRenderer.invoke("delete-folder", id),
  moveFolder: (folderId, newParentId) =>
    ipcRenderer.send("move-folder", { folderId, newParentId }),

  // recibir datos de la nota
  onNoteData: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("note-data", handler);
    return () => ipcRenderer.removeListener("note-data", handler);
  },

  // Recordatorios
  setReminder: (noteId, date, time, repeat) =>
    ipcRenderer.send("set-reminder", { noteId, date, time, repeat }),

  // obtener posición y tamaño
  getWindowPosition: () => ipcRenderer.invoke("get-window-position"),
  getWindowSize: () => ipcRenderer.invoke("get-window-size"),

  // Recordatorios - lista
  getAllReminders: () => ipcRenderer.invoke("get-all-reminders"),
  cancelReminder: (noteId) => ipcRenderer.send("cancel-reminder", noteId),

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
