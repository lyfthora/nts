const { BrowserWindow } = require("electron");
const path = require("path");

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
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  noteWin.loadFile(path.join(__dirname, "../windows/note/index.html"));
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
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  listWindow.loadFile(
    path.join(__dirname, "../../windows/notes-list/index.html")
  );

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
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  remindersListWindow.loadFile(
    path.join(__dirname, "../../windows/reminders-list/index.html")
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
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
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

function getDashboardWindow() {
  return dashboardWindow;
}

function getNoteWindows() {
  return noteWindows;
}

module.exports = {
  createNoteWindow,
  createListWindow,
  createRemindersListWindow,
  createDashboardWindow,
  getDashboardWindow,
  getNoteWindows,
};
