const { ipcMain, BrowserWindow } = require("electron");
const storage = require("../storage.js");
const { getNoteWindow } = require("../windows/windowManager.js");

const {
  isValidNote,
  isValidId,
  isValidAssetData,
  isValidArray,
} = require("../utils/validation.js");

function registerNoteHandlers() {
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
      noteType: "text",
    };
    await storage.addNote(note);
    return note;
  });

  // Update note
  ipcMain.on("update-note", async (event, noteData) => {
    if (!isValidNote(noteData)) {
      console.error(
        "[IPC] Invalid note data received in update-note:",
        noteData,
      );
      return;
    }

    try {
      const { content, drawingData, ...metadata } = noteData;
      metadata.updatedAt = Date.now();

      const noteWin = getNoteWindow(noteData.id);
      if (noteWin && !noteWin.isDestroyed()) {
        const senderWin = BrowserWindow.fromWebContents(event.sender);
        if (!senderWin || senderWin.id !== noteWin.id) {
          noteWin.webContents.send("dashboard-note-changed", noteData);
        }
      }

      // Guardar contenido (texto o dibujo)
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
      console.error("Error updating note:", err);
    }
  });

  // Delete note to trash
  ipcMain.on("delete-note", async (event, noteId) => {
    console.log("Deleting note:", noteId);
    await storage.deleteNote(noteId);
    console.log(`Note ${noteId} deleted.`);
  });

  // Restore note from trash
  ipcMain.on("restore-note", async (event, noteId) => {
    console.log("Restoring note:", noteId);
    await storage.restoreNote(noteId);
    console.log(`Note ${noteId} restored.`);
  });

  // Delete note permanently
  ipcMain.on("delete-note-permanently", async (event, noteId) => {
    console.log("Deleting note permanently:", noteId);
    await storage.deleteNotePermanently(noteId);
    console.log(`Note ${noteId} deleted permanently.`);
  });

  // Get all data (notes + folders)
  ipcMain.handle("get-all-data", async () => {
    try {
      return await storage.getAllData();
    } catch (err) {
      console.error("Error reading all data:", err);
      return { notes: [], folders: [] };
    }
  });

  // Get note content
  ipcMain.handle("get-note-content", async (event, noteId) => {
    try {
      return await storage.getNoteContent(noteId);
    } catch (err) {
      console.error(`Error loading content for note ${noteId}:`, err);
      return "";
    }
  });

  // get drawing data
  ipcMain.handle("get-drawing-data", async (event, noteId) => {
    try {
      return await storage.getDrawingData(noteId);
    } catch (err) {
      console.error(`Error loading drawing data for note ${noteId}:`, err);
      return undefined;
    }
  });

  // Save asset
  ipcMain.handle("save-asset", async (event, data) => {
    if (!isValidAssetData(data)) {
      console.error("[IPC] Invalid asset data received in save-asset:", data);
      throw new Error("Invalid asset data");
    }

    try {
      const { fileBuffer, fileName, noteId } = data;
      const relativePath = await storage.saveAsset(
        fileBuffer,
        fileName,
        noteId,
      );
      return relativePath;
    } catch (err) {
      console.error("Error saving asset:", err);
      throw err;
    }
  });

  // Clean unused assets
  ipcMain.handle("clean-unused-assets", async (event, data) => {
    if (
      !data ||
      !isValidId(data.noteId) ||
      !isValidArray(data.referencedImages)
    ) {
      console.error("[IPC] Invalid data in clean-unused-assets:", data);
      return;
    }

    try {
      const { noteId, referencedImages } = data;
      await storage.cleanUnusedAssets(noteId, referencedImages);
    } catch (err) {
      console.error("Error cleaning assets:", err);
    }
  });

  // Get data path
  ipcMain.handle("get-data-path", () => {
    return storage.dataPath;
  });
  // get backlinks
  ipcMain.handle("get-backlinks", async (event, noteName) => {
    return await storage.getBacklinks(noteName);
  });
}

module.exports = { registerNoteHandlers };
