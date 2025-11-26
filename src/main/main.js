const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

const userDataPath = app.getPath("userData");
const notesPath = path.join(userDataPath, "notes.json");

let mainWindow = null;
let noteWindows = [];

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 115,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  // mainWindow.webContents.openDevTools({ mode: "detach" });

  const { screen } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow.setPosition(width - 420, height - 135);
}

function createNoteWindow(note) {
  const noteWin = new BrowserWindow({
    width: 355,
    height: 355,
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

  noteWin.loadFile(path.join(__dirname, "../notes/note.html"));
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
    fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));
  } catch (error) {
    console.error("Error guardando notas:", error);
  }
}

function getAllNotes() {
  try {
    if (fs.existsSync(notesPath)) {
      const data = fs.readFileSync(notesPath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error obteniendo notas:", error);
  }
  return [];
}

// IPC handlers
ipcMain.on("create-note", (event) => {
  console.log("IPC 'create-note' recibido en main.js");
  const { screen } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const note = {
    id: Date.now(),
    x: Math.floor(Math.random() * (width - 300)),
    y: Math.floor(Math.random() * (height - 300)),
    content: "",
    color: "#ffffff",
  };
  console.log("Nueva nota creada:", note);

  const notes = getAllNotes();
  notes.push(note);
  saveNotes(notes);
  console.log("Nota guardada. Creando nueva ventana de nota...");

  createNoteWindow(note);
});

ipcMain.on("update-note", (event, noteData) => {
  const notes = getAllNotes();
  const index = notes.findIndex((n) => n.id === noteData.id);

  if (index !== -1) {
    notes[index] = noteData;
    saveNotes(notes);
  }
});

ipcMain.on("delete-note", (event, noteId) => {
  console.log("Eliminando nota:", noteId);
  let notes = getAllNotes();
  const originalLength = notes.length;
  notes = notes.filter((n) => n.id !== noteId);
  console.log(`Notas antes: ${originalLength}, después: ${notes.length}`);
  saveNotes(notes);

  // const win = BrowserWindow.fromWebContents(event.sender);
  // if (win) win.destroy();
});

ipcMain.on("show-all-notes", () => {
  noteWindows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.show();
    }
  });
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

// Sistema de Recordatorios
const { setReminder } = require("./reminder.js");

ipcMain.on("set-reminder", (event, data) => {
  setReminder(ipcMain, getAllNotes, noteWindows, data);
});

app.whenReady().then(() => {
  createMainWindow();
  loadNotes();
});

app.on("window-all-closed", () => {
  app.quit();
});
