const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const userDataPath = app.getPath("userData");
const notesPath = path.join(userDataPath, "notes.json");

let mainWindow = null;
let noteWindows = [];

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 300,
    height: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("main.html");

  // Posicionar en la esquina inferior derecha
  const { screen } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow.setPosition(width - 320, height - 220);
}

function createNoteWindow(note) {
  const noteWin = new BrowserWindow({
    width: 280,
    height: 250,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    x: note.x,
    y: note.y,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  noteWin.loadFile("note.html");

  // Enviar datos de la nota cuando esté lista
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
const { ipcMain } = require("electron");

ipcMain.on("create-note", (event) => {
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

  const notes = getAllNotes();
  notes.push(note);
  saveNotes(notes);

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
  let notes = getAllNotes();
  notes = notes.filter((n) => n.id !== noteId);
  saveNotes(notes);
});

ipcMain.on("show-all-notes", () => {
  noteWindows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.show();
    }
  });
});

app.whenReady().then(() => {
  createMainWindow();
  loadNotes();
});

app.on("window-all-closed", () => {
  app.quit();
});
