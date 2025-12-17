const { app } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const crypto = require("crypto");

/**
 *  idea, resultado ya se vera xd
 *
 *   AppData/nts-data/
 *     ├── metadata.json
 *     ├── notes/
 *     │   ├── note-123.json
 *     │   └── note-456.json
 *     └── assets/
 *         ├── img-abc.png
 *         └── img-def.jpg
 */

class Storage {
  constructor() {
    const dataDirName = app.isPackaged ? "nts-data" : "nts-dev-data";
    this.dataPath = path.join(app.getPath("userData"), dataDirName);
    this.metadataPath = path.join(this.dataPath, "metadata.json");
    this.notesDir = path.join(this.dataPath, "notes");
    this.assetsDir = path.join(this.dataPath, "assets");
    this.oldStorePath = path.join(app.getPath("userData"), "notes-data.json");

    this._ensureDirectories();
  }

  _ensureDirectories() {
    const dirs = [this.dataPath, this.notesDir, this.assetsDir];
    dirs.forEach((dir) => {
      if (!fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // migreshion
  async migrateFromElectronStore() {
    try {
      if (fsSync.existsSync(this.metadataPath)) {
        return;
      }

      console.log("Iniciando migración de datos...");

      if (!fsSync.existsSync(this.oldStorePath)) {
        await this._createEmptyStructure();
        return;
      }

      const oldData = JSON.parse(await fs.readFile(this.oldStorePath, "utf-8"));
      const notes = oldData.notes || [];
      const folders = oldData.folders || [];

      const metadata = notes.map((note) => {
        const { content, ...meta } = note;
        const preview = (content || "")
          .replace(/!\[.*?\]\(.*?\)/g, "")
          .replace(/[#*_`~\[\]]/g, "")
          .trim()
          .substring(0, 150);

        return { ...meta, preview };
      });
      await fs.writeFile(
        this.metadataPath,
        JSON.stringify({ notes: metadata, folders }, null, 2)
      );

      for (const note of notes) {
        const notePath = path.join(this.notesDir, `note-${note.id}.json`);
        await fs.writeFile(
          notePath,
          JSON.stringify({ content: note.content || "" }, null, 2)
        );
      }

      console.log(`Migración completada: ${notes.length} notas migradas`);
    } catch (err) {
      console.error("Error durante migración:", err);
      await this._createEmptyStructure();
    }
  }

  async _createEmptyStructure() {
    const emptyData = {
      notes: [],
      folders: [
        {
          id: 1,
          name: "Index",
          parentId: null,
          isSystem: true,
          expanded: true,
        },
      ],
    };
    await fs.writeFile(this.metadataPath, JSON.stringify(emptyData, null, 2));
  }

  async getMetadata() {
    try {
      const data = await fs.readFile(this.metadataPath, "utf-8");
      return JSON.parse(data).notes || [];
    } catch (err) {
      console.error("Error leyendo metadata:", err);
      return [];
    }
  }

  async getNoteContent(noteId) {
    try {
      const notePath = path.join(this.notesDir, `note-${noteId}.json`);
      const data = await fs.readFile(notePath, "utf-8");
      const parsed = JSON.parse(data);
      return parsed.content || "";
    } catch (err) {
      console.error(`Error leyendo contenido de nota ${noteId}:`, err);
      return "";
    }
  }

  async saveNoteContent(noteId, content) {
    try {
      const notePath = path.join(this.notesDir, `note-${noteId}.json`);
      await fs.writeFile(notePath, JSON.stringify({ content }, null, 2));
    } catch (err) {
      console.error(`Error guardando contenido de nota ${noteId}:`, err);
    }
  }

  async updateMetadata(noteId, updates) {
    try {
      const data = await fs.readFile(this.metadataPath, "utf-8");
      const parsed = JSON.parse(data);
      const noteIndex = parsed.notes.findIndex((n) => n.id === noteId);

      if (noteIndex !== -1) {
        parsed.notes[noteIndex] = {
          ...parsed.notes[noteIndex],
          ...updates,
        };
        await fs.writeFile(this.metadataPath, JSON.stringify(parsed, null, 2));
      }
    } catch (err) {
      console.error(`Error actualizando metadata de nota ${noteId}:`, err);
    }
  }

  async addNote(note) {
    try {
      const data = await fs.readFile(this.metadataPath, "utf-8");
      const parsed = JSON.parse(data);
      const { content, ...metadata } = note;

      parsed.notes.push(metadata);
      await fs.writeFile(this.metadataPath, JSON.stringify(parsed, null, 2));

      await this.saveNoteContent(note.id, content || "");
    } catch (err) {
      console.error("Error agregando nota:", err);
    }
  }

  async deleteNote(noteId) {
    await this.updateMetadata(noteId, { deleted: true });
  }
  async restoreNote(noteId) {
    try {
      const data = await fs.readFile(this.metadataPath, "utf-8");
      const parsed = JSON.parse(data);
      const noteIndex = parsed.notes.findIndex((n) => n.id === noteId);

      if (noteIndex !== -1) {
        delete parsed.notes[noteIndex].deleted;
        await fs.writeFile(this.metadataPath, JSON.stringify(parsed, null, 2));
      }
    } catch (err) {
      console.error(`Error restaurando nota ${noteId}:`, err);
    }
  }

  async deleteNotePermanently(noteId) {
    try {
      const data = await fs.readFile(this.metadataPath, "utf-8");
      const parsed = JSON.parse(data);
      parsed.notes = parsed.notes.filter((n) => n.id !== noteId);
      await fs.writeFile(this.metadataPath, JSON.stringify(parsed, null, 2));

      const notePath = path.join(this.notesDir, `note-${noteId}.json`);
      if (fsSync.existsSync(notePath)) {
        await fs.unlink(notePath);
      }
    } catch (err) {
      console.error(`Error eliminando permanentemente nota ${noteId}:`, err);
    }
  }

  async saveAsset(fileBuffer, fileName, noteId) {
    try {
      const buffer = Buffer.from(fileBuffer);

      const hash = crypto.createHash("md5").update(buffer).digest("hex");
      const ext = path.extname(fileName);
      const uniqueName = `img-${noteId}-${hash.substring(0, 8)}${ext}`;
      const assetPath = path.join(this.assetsDir, uniqueName);

      await fs.writeFile(assetPath, buffer);

      return `assets/${uniqueName}`;
    } catch (err) {
      console.error("Error guardando asset:", err);
      throw err;
    }
  }

  async cleanUnusedAssets(noteId, referencedImages) {
    try {
      const data = await fs.readFile(this.metadataPath, "utf-8");
      const parsed = JSON.parse(data);
      const note = parsed.notes.find((n) => n.id === noteId);

      if (!note || !note.images || note.images.length === 0) return;

      const unusedImages = note.images.filter(
        (img) => !referencedImages.includes(img)
      );
      for (const imgPath of unusedImages) {
        const fullPath = path.join(this.dataPath, imgPath);
        if (fsSync.existsSync(fullPath)) {
          await fs.unlink(fullPath);
          console.log(`Asset eliminado: ${imgPath}`);
        }
      }
    } catch (err) {
      console.error("Error limpiando assets:", err);
    }
  }

  async getAllFolders() {
    try {
      const data = await fs.readFile(this.metadataPath, "utf-8");
      return JSON.parse(data).folders || [];
    } catch (err) {
      console.error("Error leyendo folders:", err);
      return [];
    }
  }

  async saveFolders(folders) {
    try {
      const data = await fs.readFile(this.metadataPath, "utf-8");
      const parsed = JSON.parse(data);
      parsed.folders = folders;
      await fs.writeFile(this.metadataPath, JSON.stringify(parsed, null, 2));
    } catch (err) {
      console.error("Error guardando folders:", err);
    }
  }
  async saveNotesMetadata(notes) {
    try {
      const data = await fs.readFile(this.metadataPath, "utf-8");
      const parsed = JSON.parse(data);
      parsed.notes = notes;
      await fs.writeFile(this.metadataPath, JSON.stringify(parsed, null, 2));
    } catch (err) {
      console.error("Error guardando metadata de notas:", err);
    }
  }
  async getAllData() {
    try {
      const data = await fs.readFile(this.metadataPath, "utf-8");
      const parsed = JSON.parse(data);
      return {
        notes: parsed.notes || [],
        folders: parsed.folders || [],
      };
    } catch (err) {
      console.error("Error leyendo datos:", err);
      return { notes: [], folders: [] };
    }
  }
}

const storage = new Storage();

module.exports = storage;
