const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

const userDataPath = app.getPath("userData");
const notesPath = path.join(userDataPath, "notes.json");

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
  noteWin.webContents.openDevTools({ mode: "detach" });

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

function createDashboardWindow() {
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
    alwaysOnTop: false, //xd // xd //x d//xd //xd //xd //xd //xd //xd xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  dashboardWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  dashboardWindow.webContents.openDevTools({ mode: "detach" });

  dashboardWindow.on("closed", () => {
    dashboardWindow = null;
  });
}

function loadNotes() {
  try {
    if (fs.existsSync(notesPath)) {
      const data = fs.readFileSync(notesPath, "utf8");
      const notes = JSON.parse(data);
      notes.forEach((note) => createNoteWindow(note));
    }
  } catch (error) {
    console.error("Error cargando notas:", error);
  }
}

function saveNotes(notes) {
  try {
    let data = { folders: [], notes: [] };
    if (fs.existsSync(notesPath)) {
      const existing = fs.readFileSync(notesPath, "utf8");
      const parsed = JSON.parse(existing);
      if (!Array.isArray(parsed)) {
        data.folders = parsed.folders || [];
      }
    }

    data.notes = notes;
    fs.writeFileSync(notesPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving notes:", error);
  }
}

function getAllNotes() {
  try {
    if (fs.existsSync(notesPath)) {
      const data = fs.readFileSync(notesPath, "utf8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return parsed.notes || [];
    }
  } catch (error) {
    console.error("Error obteniendo notas:", error);
  }
  return [];
}

function getAllFolders() {
  try {
    if (fs.existsSync(notesPath)) {
      const data = fs.readFileSync(notesPath, "utf8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return [];
      }
      return parsed.folders || [];
    }
  } catch (error) {
    console.error("Error folders:", error);
  }
  return [];
}

function saveFolders(folders) {
  try {
    let data = { folders: [], notes: [] };
    if (fs.existsSync(notesPath)) {
      const existing = fs.readFileSync(notesPath, "utf8");
      const parsed = JSON.parse(existing);
      if (!Array.isArray(parsed)) {
        data.notes = parsed.notes || [];
      } else {
        data.notes = parsed;
      }
    }
    data.folders = folders;
    fs.writeFileSync(notesPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving folders:", error);
  }
}

function saveAll(notes, folders) {
  try {
    const data = { folders, notes };
    fs.writeFileSync(notesPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving all:", error);
  }
}

function initializeDefaultStructure() {
  let folders = getAllFolders();
  let notes = getAllNotes();

  if (!Array.isArray(folders) || !Array.isArray(notes)) {
    saveAll(notes, folders);
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
  const noteNumber = notes.length + 1;

  const note = {
    id: Date.now(),
    name: `Note ${noteNumber}`,
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
ipcMain.handle("create-note-dashboard", (event) => {
  const { screen } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const notes = getAllNotes();
  const noteNumber = notes.length + 1;

  const note = {
    id: Date.now(),
    name: `Note ${noteNumber}`,
    x: Math.floor(Math.random() * (width - 300)),
    y: Math.floor(Math.random() * (height - 300)),
    content: "",
    color: "#ffffff",
  };

  notes.push(note);
  saveNotes(notes);

  return note; // Return the created note
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
ipcMain.on("update-note", (event, noteData) => {
  const notes = getAllNotes();
  const index = notes.findIndex((n) => n.id === noteData.id);

  if (index !== -1) {
    notes[index] = noteData;
    saveNotes(notes);
  }
});

// delete note to trash
ipcMain.on("delete-note", (event, noteId) => {
  console.log("Deleting note:", noteId);
  const notes = getAllNotes();
  const noteIndex = notes.findIndex((n) => n.id === noteId);

  if (noteIndex !== -1) {
    notes[noteIndex].deleted = true;
    saveNotes(notes);
    console.log(`Note ${noteId} deleted.`);
  }
});

// restore note from trash
ipcMain.on("restore-note", (event, noteId) => {
  console.log("Restoring note:", noteId);
  const notes = getAllNotes();
  const noteIndex = notes.findIndex((n) => n.id === noteId);

  if (noteIndex !== -1) {
    delete notes[noteIndex].deleted;
    saveNotes(notes);
    console.log(`Note ${noteId} restored.`);
  }
});

// delete note permanently
ipcMain.on("delete-note-permanently", (event, noteId) => {
  console.log("Deleting note permanently:", noteId);
  let notes = getAllNotes();
  notes = notes.filter((n) => n.id !== noteId);
  saveNotes(notes);
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
  if (win && !win.isDestroyed()) win.hide();
});

ipcMain.on("window-close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.hide();
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
ipcMain.handle("get-all-notes", () => {
  return getAllNotes();
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

//Cancelar recordatorio
ipcMain.on("cancel-reminder", (event, noteId) => {
  const notes = getAllNotes();
  const noteIndex = notes.findIndex((n) => n.id === noteId);

  if (noteIndex !== -1) {
    delete notes[noteIndex].reminder;
    saveNotes(notes);
  }
});

// Sistema de Recordatorios
const { setReminder } = require("./reminder.js");

ipcMain.on("set-reminder", (event, data) => {
  setReminder(ipcMain, getAllNotes, noteWindows, data);
});

// obtener todas las carpetas
ipcMain.handle("get-all-folders", () => {
  return getAllFolders();
});
// crear carpetas
ipcMain.handle("create-folder", (event, folderData) => {
  const folders = getAllFolders();
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
  saveFolders(folders);
  return newFolder;
});

// actualizar carpeta
ipcMain.on("update-folder", (event, folderData) => {
  const folders = getAllFolders();
  const index = folders.findIndex((f) => f.id === folderData.id);
  if (index !== -1) {
    folders[index] = { ...folders[index], ...folderData };
    saveFolders(folders);
  }
});

// eliminar carpeta (no se puede al main)
ipcMain.on("delete-folder", (event, folderId) => {
  const folders = getAllFolders();
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
  saveFolders(remainingFolders);

  const notes = getAllNotes();
  const updateNotes = notes.map((n) => {
    if (toDelete.includes(n.folderId)) {
      return { ...n, folderId: null };
    }
    return n;
  });
  saveNotes(updateNotes);
});

//mover carpeta a otra carpeta padre
ipcMain.on("move-folder", (event, { folderId, newParentId }) => {
  const folders = getAllFolders();
  const index = folders.findIndex((f) => f.id === folderId);
  if (index !== -1) {
    if (folderId === newParentId) return;

    folders[index].parentId = newParentId;
    saveFolders(folders);
  }
});

// CHANGED: Solo abre el dashboard al inicio, no carga ventanas flotantes
app.whenReady().then(() => {
  initializeDefaultStructure();
  createDashboardWindow();
  // loadNotes(); // Comentado - no carga ventanas flotantes automáticamente
});

app.on("window-all-closed", () => {
  app.quit();
});
