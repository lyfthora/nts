const { app, BrowserWindow, ipcMain } = require("electron");
// const fs = require("fs");
const path = require("path");
const Store = require("electron-store");
const storage = require("./storage.js");

// electron-store startttttttttttttttttttttttttttttttttttttttttttttttttaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
const store = new Store({
  name: "notes-data",
  defaults: {
    notes: [],
    folders: [],
  },
});

let mainWindow = null;
let listWindow = null;
let remindersListWindow = null;
let dashboardWindow = null;
let noteWindows = [];

function createNoteWindow(note) {
  const noteWin = new BrowserWindow({
    width: note.width || 355,
    height: note.height || 355,
    resizable: true,
    minWidth: 280,
    minHeight: 280,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    x: note.x,
    y: note.y,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // NOTE: This path doesn't exist anymore, but keeping logic for future use
  noteWin.loadFile(path.join(__dirname, "../windows/note/index.html"));
  // noteWin.webContents.openDevTools({ mode: "detach" });

  noteWin.webContents.on("did-finish-load", () => {
    noteWin.webContents.send("note-data", note);
  });

  noteWin.on("closed", () => {
    noteWindows = noteWindows.filter((w) => w !== noteWin);
  });

  noteWindows.push(noteWin);
  return noteWin;
}

function createListWindow() {
  if (listWindow && !listWindow.isDestroyed()) {
    listWindow.show();
    listWindow.focus();
    return;
  }

  listWindow = new BrowserWindow({
    width: 500,
    height: 660,
    resizable: true,
    minWidth: 400,
    minHeight: 400,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // NOTE: This path doesn't exist anymore, but keeping logic for future use
  listWindow.loadFile(path.join(__dirname, "../windows/notes-list/index.html"));

  listWindow.on("closed", () => {
    listWindow = null;
  });
}

function createRemindersListWindow() {
  if (remindersListWindow && !remindersListWindow.isDestroyed()) {
    remindersListWindow.show();
    remindersListWindow.focus();
    return;
  }

  remindersListWindow = new BrowserWindow({
    width: 500,
    height: 660,
    resizable: true,
    minWidth: 400,
    minHeight: 400,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // NOTE: This path doesn't exist anymore, but keeping logic for future use
  remindersListWindow.loadFile(
    path.join(__dirname, "../windows/reminders-list/index.html")
  );

  remindersListWindow.on("closed", () => {
    remindersListWindow = null;
  });
}

async function createDashboardWindow() {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.show();
    dashboardWindow.focus();
    return;
  }

  dashboardWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    resizable: true,
    minWidth: 1000,
    minHeight: 600,
    frame: false,
    transparent: false,
    alwaysOnTop: false,
    show: false,
    backgroundColor: "#1a1a1a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  dashboardWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  // dashboardWindow.webContents.openDevTools({ mode: "detach" });

  // Esperar 1 segundo después de que React esté listo para asegurar que los datos estén cargados
  dashboardWindow.webContents.once("did-finish-load", () => {
    setTimeout(() => {
      if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.show();
      }
    }, 1000); // Delay de 1 segundo
  });

  dashboardWindow.on("closed", () => {
    dashboardWindow = null;
  });
}

function loadNotes() {
  try {
    return store.get("notes", []);
  } catch (err) {
    console.error("Error loading notes:", err);
    return [];
  }
}
async function getAllNotes() {
  try {
    return await storage.getMetadata();
  } catch (err) {
    console.error("Error reading notes:", err);
    return [];
  }
}

function saveNotes(notes) {
  console.warn("saveNotes() is deprecated");
}

async function getAllFolders() {
  return await storage.getAllFolders();
}

async function saveFolders(folders) {
  await storage.saveFolders(folders);
}

function saveAll(notes, folders) {
  try {
    store.set("notes", notes);
    store.set("folders", folders);
  } catch (err) {
    console.error("Error saving all data:", err);
  }
}

async function initializeDefaultStructure() {
  const folders = await getAllFolders();

  const indexExists = folders.find((f) => f.id === 1);

  if (!indexExists) {
    const indexFolder = {
      id: 1,
      name: "Index",
      parentId: null,
      isSystem: true,
      expanded: true,
    };
    folders.push(indexFolder);
    await saveFolders(folders);
    console.log("System folder 'Index' created");
  }

  // const indexExists = folders.find((f) => f.id === INDEX_FOLDER_ID);
  // if (!indexExists) {
  //   folders.push({
  //     id: INDEX_FOLDER_ID,
  //     type: "folder",
  //     name: "Index",
  //     parentId: null,
  //     isSystem: true,
  //     expanded: true,
  //     createdAt: Date.now(),
  //   });
  //   console.log("Folder Index created");
  // }

  // const guideExists = notes.find((n) => n.id === GUIDE_NOTE_ID);
  // if (!guideExists) {
  //   notes.push({
  //     id: GUIDE_NOTE_ID,
  //     type: "note",
  //     name: "Guide",
  //     folderId: INDEX_FOLDER_ID,
  //     isSystem: true,
  //     content:
  //       "# Bienvenido a tu app de notas\n\nEsta es la nota guía del sistema.\n\n## Características:\n- Organiza tus notas en carpetas\n- Usa etiquetas para categorizar\n- Establece estados (Active, On Hold, etc.)\n- Mueve notas a la papelera",
  //     color: "#667eea",
  //     status: "",
  //     tags: [],
  //     deleted: false,
  //   });
  //   console.log("Guide note created");
  // }
  // saveAll(notes, folders);
}
// IPC handlers
// Create note from main window (opens floating window)
ipcMain.on("create-note", (event) => {
  console.log("IPC 'create-note' recibido en main.js");
  const { screen } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const notes = getAllNotes();

  const note = {
    id: Date.now(),
    name: "",
    x: Math.floor(Math.random() * (width - 300)),
    y: Math.floor(Math.random() * (height - 300)),
    content: "",
    color: "#ffffff",
  };
  console.log("Nueva nota creada:", note);

  notes.push(note);
  saveNotes(notes);
  console.log("Nota guardada. Creando nueva ventana de nota...");

  createNoteWindow(note);
});

// Create note from dashboard (does NOT open floating window)
ipcMain.handle("create-note-dashboard", async (event) => {
  const { screen } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const note = {
    id: Date.now(),
    name: "",
    x: Math.floor(Math.random() * (width - 300)),
    y: Math.floor(Math.random() * (height - 300)),
    content: "",
    color: "#ffffff",
    images: [],
  };
  await storage.addNote(note);
  return note;
});

// Open floating window for existing note
ipcMain.on("open-note-window", (event, noteId, x, y) => {
  const notes = getAllNotes();
  const note = notes.find((n) => n.id === noteId);

  if (note) {
    const existingWindow = noteWindows.find((win) => {
      if (!win.isDestroyed()) {
        const [x, y] = win.getPosition();
        return x === note.x && y === note.y;
      }
      return false;
    });

    if (existingWindow && !existingWindow.isDestroyed()) {
      if (x !== undefined && y !== undefined) {
        existingWindow.setPosition(x, y);
      }
      existingWindow.show();
      existingWindow.focus();
    } else {
      if (x !== undefined && y !== undefined) {
        note.x = x;
        note.y = y;
        const noteIndex = notes.findIndex((n) => n.id === noteId);
        if (noteIndex !== -1) {
          notes[noteIndex] = note;
          saveNotes(notes);
        }
      }
      createNoteWindow(note);
    }
  }
});

// update note
ipcMain.on("update-note", async (event, noteData) => {
  try {
    const { content, ...metadata } = noteData;
    await storage.saveNoteContent(noteData.id, content || "");
    await storage.updateMetadata(noteData.id, metadata);
  } catch (err) {
    console.error("Error updating note:", err);
  }
});

// delete note to trash
ipcMain.on("delete-note", async (event, noteId) => {
  console.log("Deleting note:", noteId);
  await storage.deleteNote(noteId);
  console.log(`Note ${noteId} deleted.`);
});

// restore note from trash
ipcMain.on("restore-note", async (event, noteId) => {
  console.log("Restoring note:", noteId);
  await storage.restoreNote(noteId);
  console.log(`Note ${noteId} restored.`);
});

// delete note permanently
ipcMain.on("delete-note-permanently", async (event, noteId) => {
  console.log("Deleting note permanently:", noteId);
  await storage.deleteNotePermanently(noteId);
  console.log(`Note ${noteId} deleted permanently.`);
});

// show all notes
ipcMain.on("show-all-notes", () => {
  noteWindows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.show();
    }
  });
});

ipcMain.on("show-note-by-id", (event, noteIde) => {
  const noteWin = noteWindows.find((win) => {
    if (!win.isDestroyed()) {
      const notes = getAllNotes();
      const note = notes.find((n) => n.id === noteIde);
      if (note) {
        const [x, y] = win.getPosition();
        return x === note.x && y === note.y;
      }
    }
    return false;
  });
  if (noteWin && !noteWin.isDestroyed()) {
    noteWin.show();
    noteWin.focus();
  }
});

ipcMain.on("open-dashboard", () => {
  createDashboardWindow();
});

ipcMain.on("open-notes-list", () => {
  createListWindow();
});

ipcMain.on("open-reminders-list", () => {
  createRemindersListWindow();
});

// Control de ventanas desde preload
ipcMain.on("window-minimize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.minimize();
});

ipcMain.on("window-close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.close();
});

ipcMain.on("window-destroy", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.destroy();
});

ipcMain.on("window-maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});

// Obtener posición de la ventana (invocable)
ipcMain.handle("get-window-position", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    return win.getPosition();
  }
  return [0, 0];
});

// Obtener tamaño de la ventana (invocable)
ipcMain.handle("get-window-size", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    return win.getSize();
  }
  return [355, 355];
});

//Obtener todas las notas
ipcMain.handle("get-all-notes", async () => {
  try {
    return await storage.getMetadata();
  } catch (err) {
    console.error("Error reading notes:", err);
    return [];
  }
});
// Obtener todos los datos (notas + carpetas) en una sola llamada
ipcMain.handle("get-all-data", async () => {
  try {
    return await storage.getAllData();
  } catch (err) {
    console.error("Error reading all data:", err);
    return { notes: [], folders: [] };
  }
});
// Obtener contenido de una nota
ipcMain.handle("get-note-content", async (event, noteId) => {
  try {
    return await storage.getNoteContent(noteId);
  } catch (err) {
    console.error(`Error loading content for note ${noteId}:`, err);
    return "";
  }
});

//Obtener todos los recordatorios
ipcMain.handle("get-all-reminders", () => {
  const notes = getAllNotes();
  const reminders = [];

  notes.forEach((note) => {
    if (note.reminder) {
      reminders.push({
        noteId: note.id,
        noteName: note.name,
        date: note.reminder.date,
        time: note.reminder.time,
        repeat: note.reminder.repeat || false,
        color: note.color || "#ffffff",
      });
    }
  });

  return reminders;
});

ipcMain.handle(
  "save-asset",
  async (event, { fileBuffer, fileName, noteId }) => {
    try {
      const relativePath = await storage.saveAsset(
        fileBuffer,
        fileName,
        noteId
      );
      return relativePath;
    } catch (err) {
      console.error("Error saving asset:", err);
      throw err;
    }
  }
);
ipcMain.handle(
  "clean-unused-assets",
  async (event, { noteId, referencedImages }) => {
    try {
      await storage.cleanUnusedAssets(noteId, referencedImages);
    } catch (err) {
      console.error("Error cleaning assets:", err);
    }
  }
);

//Cancelar recordatorio
ipcMain.on("cancel-reminder", (event, noteId) => {
  const notes = getAllNotes();
  const noteIndex = notes.findIndex((n) => n.id === noteId);

  if (noteIndex !== -1) {
    delete notes[noteIndex].reminder;
    saveNotes(notes);
  }
});
// Obtener ruta de datos
ipcMain.handle("get-data-path", () => {
  return storage.dataPath;
});

// Sistema de Recordatorios
const { setReminder } = require("./reminder.js");

ipcMain.on("set-reminder", (event, data) => {
  setReminder(ipcMain, getAllNotes, noteWindows, data);
});

// obtener todas las carpetas
ipcMain.handle("get-all-folders", async () => {
  return await storage.getAllFolders();
});
// crear carpetas
ipcMain.handle("create-folder", async (event, folderData) => {
  const folders = await getAllFolders();
  const newFolder = {
    id: Date.now(),
    type: "folder",
    name: folderData.name || "New Folder",
    parentId: folderData.parentId || null,
    isSystem: false,
    expanded: true,
    createdAt: Date.now(),
  };
  folders.push(newFolder);
  await saveFolders(folders);
  return newFolder;
});

// actualizar carpeta
ipcMain.on("update-folder", async (event, folderData) => {
  const folders = await getAllFolders();
  const index = folders.findIndex((f) => f.id === folderData.id);
  if (index !== -1) {
    folders[index] = { ...folders[index], ...folderData };
    await saveFolders(folders);
  }
});

// eliminar carpeta (no se puede al main)
ipcMain.handle("delete-folder", async (event, folderId) => {
  const folders = await getAllFolders();
  const folder = folders.find((f) => f.id === folderId);

  if (folder && folder.isSystem) {
    console.log("Cannot delete system folder");
    return;
  }

  const toDelete = [folderId];
  let i = 0;
  while (i < toDelete.length) {
    const currentId = toDelete[i];
    const subfolders = folders.filter((f) => f.parentId === currentId);
    toDelete.push(...subfolders.map((f) => f.id));
    i++;
  }

  const remainingFolders = folders.filter((f) => !toDelete.includes(f.id));
  await saveFolders(remainingFolders);

  const notes = await getAllNotes();
  const updateNotes = notes.map((n) => {
    if (toDelete.includes(n.folderId)) {
      return { ...n, deleted: true, folderId: 1 };
    }
    return n;
  });
  await storage.saveNotesMetadata(updateNotes);
});

//mover carpeta a otra carpeta padre
ipcMain.on("move-folder", async (event, { folderId, newParentId }) => {
  const folders = await getAllFolders();
  const index = folders.findIndex((f) => f.id === folderId);
  if (index !== -1) {
    if (folderId === newParentId) return;

    folders[index].parentId = newParentId;
    await saveFolders(folders);
  }
});

// Auto-Update Logic
const { autoUpdater } = require("electron-updater");

autoUpdater.autoDownload = false;
autoUpdater.logger = console;

ipcMain.handle("check-for-updates", () => {
  if (!app.isPackaged) return null;
  return autoUpdater.checkForUpdates();
});

ipcMain.handle("download-update", () => {
  return autoUpdater.downloadUpdate();
});

ipcMain.on("quit-and-install", () => {
  autoUpdater.quitAndInstall();
});

autoUpdater.on("update-available", (info) => {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send("update-available", info);
  }
});

autoUpdater.on("update-downloaded", () => {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send("update-downloaded");
  }
});

autoUpdater.on("error", (err) => {
  console.error("AutoUpdater error:", err);
});

// CHANGED: Solo abre el dashboard al inicio, no carga ventanas flotantes
app.whenReady().then(async () => {
  await storage.migrateFromElectronStore();
  await initializeDefaultStructure();
  createDashboardWindow();

  if (app.isPackaged) {
    autoUpdater.checkForUpdates();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
