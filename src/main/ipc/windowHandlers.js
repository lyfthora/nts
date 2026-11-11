const { ipcMain, BrowserWindow } = require("electron");
const {
  createNoteWindow,
  getDashboardWindow,
  getNoteWindow,
} = require("../windows/windowManager.js");
const { apiRequest } = require("../apiProxy.js");
const { getOfflineSync } = require("../offlineSync.js");

function registerWindowHandlers() {
  // Window minimize
  ipcMain.on("window-minimize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.minimize();
  });

  // Window close
  ipcMain.on("window-close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.close();
  });

  // Get window position
  ipcMain.handle("get-window-position", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      return win.getPosition();
    }
    return [0, 0];
  });

  // Get window size
  ipcMain.handle("get-window-size", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      return win.getSize();
    }
    return [355, 355];
  });

  //open note in otehr window
  ipcMain.handle("open-note-window", async (event, { noteId, x, y }) => {
    await createNoteWindow(noteId, x, y);
  });
  // note window request its data when redy
ipcMain.handle("get-note-window-data", async (_event, noteId) => {
  try {
    return await getOfflineSync().getNoteWindowData(noteId);
  } catch (err) {
    console.error("Error fetching note window data:", err);
    return { note: null, folders: [] };
  }
});
  // note window sends changes back
  ipcMain.on("note-window-change", async (event, noteData) => {
  const dashboard = getDashboardWindow();
  if (dashboard && !dashboard.isDestroyed()) {
    dashboard.webContents.send("external-note-changed", noteData);
  }
  try {
    await getOfflineSync().updateNote(noteData);
  } catch (err) {
    console.error("Error updating note from external window:", err);
  }
});

//sync note
ipcMain.on("sync-note-change", (event, noteData) => {
  const noteWin = getNoteWindow(noteData.id);
  if (noteWin && !noteWin.isDestroyed()) {
    noteWin.webContents.send("dashboard-note-changed", noteData);
  }
});

}
module.exports = { registerWindowHandlers };
