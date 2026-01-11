const { ipcMain } = require("electron");
const storage = require("../storage.js");
const {
  createNoteWindow,
  getNoteWindows,
} = require("../windows/windowManager.js");
const { setReminder } = require("../reminder.js");

function registerNoteHandlers() {
  // Create note from main window (opens floating window)
  ipcMain.on("create-note", (event) => {
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
    };

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
  ipcMain.on("open-note-window", async (event, noteId, x, y) => {
    const notes = await storage.getMetadata();
    const note = notes.find((n) => n.id === noteId);
    const noteWindows = getNoteWindows();

    if (note) {
      const existingWindow = noteWindows.find((win) => {
        if (!win.isDestroyed()) {
          const [wx, wy] = win.getPosition();
          return wx === note.x && wy === note.y;
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
        }
        createNoteWindow(note);
      }
    }
  });

  // Update note
  ipcMain.on("update-note", async (event, noteData) => {
    try {
      const { content, ...metadata } = noteData;
      await storage.saveNoteContent(noteData.id, content || "");
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

  // Show all notes
  ipcMain.on("show-all-notes", () => {
    const noteWindows = getNoteWindows();
    noteWindows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.show();
      }
    });
  });

  // Show note by id
  ipcMain.on("show-note-by-id", async (event, noteId) => {
    const notes = await storage.getMetadata();
    const noteWindows = getNoteWindows();
    const noteWin = noteWindows.find((win) => {
      if (!win.isDestroyed()) {
        const note = notes.find((n) => n.id === noteId);
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

  // Get all notes
  ipcMain.handle("get-all-notes", async () => {
    try {
      return await storage.getMetadata();
    } catch (err) {
      console.error("Error reading notes:", err);
      return [];
    }
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

  // Save asset
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

  // Clean unused assets
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

  // Get data path
  ipcMain.handle("get-data-path", () => {
    return storage.dataPath;
  });

  // Get all reminders
  ipcMain.handle("get-all-reminders", async () => {
    const notes = await storage.getMetadata();
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

  // Set reminder
  ipcMain.on("set-reminder", async (event, data) => {
    const notes = await storage.getMetadata();
    setReminder(ipcMain, () => notes, getNoteWindows(), data);
  });

  // Cancel reminder
  ipcMain.on("cancel-reminder", async (event, noteId) => {
    await storage.updateMetadata(noteId, { reminder: undefined });
  });
}

module.exports = { registerNoteHandlers };
