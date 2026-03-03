const { ipcMain, BrowserWindow } = require("electron");
const {
  createNoteWindow,
  getDashboardWindow,
  getNoteWindow,
} = require("../windows/windowManager.js");
const storage = require("../storage.js");

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
  ipcMain.handle("get-note-window-data", async (event, noteId) => {
    const allData = await storage.getAllData();
    const note = allData.notes.find((n) => n.id === noteId);

    if (note) {
      if (note.noteType === "drawing") {
        note.drawingData = await storage.getDrawingData(noteId);
      } else {
        note.content = await storage.getNoteContent(noteId);
      }
    }
    return { note, folders: allData.folders };
  });
  // note window sends changes back
  ipcMain.on("note-window-change", async (event, noteData) => {
    const dashboard = getDashboardWindow();
    if (dashboard && !dashboard.isDestroyed()) {
      dashboard.webContents.send("external-note-changed", noteData);
    }
    try {
      const { content, drawingData, ...metadata } = noteData;
      metadata.updatedAt = Date.now();
      if (noteData.noteType === "drawing" && drawingData !== undefined) {
        try {
          const parsed = JSON.parse(drawingData);
          metadata.hasDrawingData = !!(
            parsed.strokes && parsed.strokes.length > 0
          );
        } catch {
          metadata.hasDrawingData = false;
        }
        await storage.saveNoteContent(noteData.id, "", drawingData);
      } else {
        await storage.saveNoteContent(noteData.id, content || "");
      }
      await storage.updateMetadata(noteData.id, metadata);
    } catch (err) {
      console.error("Error updating note from external window:", err);
    }
  });
}
module.exports = { registerWindowHandlers };
