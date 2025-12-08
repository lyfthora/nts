const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // acciones de la ventana main
  createNote: () => ipcRenderer.send("create-note"),
  createNoteDashboard: () => ipcRenderer.invoke("create-note-dashboard"),
  openNoteWindow: (noteId, x, y) => ipcRenderer.send("open-note-window", noteId, x, y),
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

  // recibir datos de la nota
  onNoteData: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("note-data", handler);
    // retornamos una función de cleanup opcional
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
});
