const { BrowserWindow } = require("electron");
const path = require("path");

let dashboardWindow = null;
const noteWindows = new Map();

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
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  dashboardWindow.loadFile(path.join(__dirname, "../../../dist/index.html"));

  dashboardWindow.webContents.once("did-finish-load", () => {
    setTimeout(() => {
      if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.show();
      }
    }, 1000);
  });

  dashboardWindow.on("closed", () => {
    dashboardWindow = null;
  });
}

async function createNoteWindow(noteId, x, y) {
  if (noteWindows.has(noteId)) {
    const existing = noteWindows.get(noteId);
    if (existing && !existing.isDestroyed()) {
      existing.show();
      existing.focus();
      return;
    }
  }
  const noteWin = new BrowserWindow({
    width: 800,
    height: 600,
    x: Math.round(x - 400),
    y: Math.round(y - 50),
    resizable: true,
    minWidth: 500,
    minHeight: 400,
    frame: false,
    transparent: false,
    show: false,
    backgroundColor: "#1a1a1a",
    webPreferences: {
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  noteWindows.set(noteId, noteWin);
  noteWin.loadFile(path.join(__dirname, "../../../dist/index.html"), {
    query: { mode: "note-window", noteId: String(noteId) },
  });
  noteWin.webContents.once("did-finish-load", () => {
    if (noteWin && !noteWin.isDestroyed()) {
      noteWin.show();
    }
  });
  noteWin.on("closed", () => {
    noteWindows.delete(noteId);
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.webContents.send("note-window-closed", noteId);
    }
  });
}

function getDashboardWindow() {
  return dashboardWindow;
}

function getNoteWindow(noteId) {
  return noteWindows.get(noteId) || null;
}

function closeAllNoteWindows() {
  for (const [, win] of noteWindows) {
    if (win && !win.isDestroyed()) {
      win.close();
    }
  }
  noteWindows.clear();
}

module.exports = {
  createDashboardWindow,
  getDashboardWindow,
  createNoteWindow,
  getNoteWindow,
  closeAllNoteWindows,
};
