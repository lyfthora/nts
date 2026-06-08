const { ipcMain, dialog } = require("electron");
const fs = require("fs").promises;
const path = require("path");
const fsSync = require("fs");
const archiver = require("archiver");
const AdmZip = require("adm-zip");
const { apiRequest } = require("../apiProxy.js");

function registerExportHandlers() {
  ipcMain.handle("export-note-json", async (event, noteId) => {
    try {
      const allData = await apiRequest("/notes/all");
      const note = allData.notes.find((n) => n.id === noteId);
      const contentData = await apiRequest(`/notes/${noteId}/content`);
      note.content = contentData.content;
      note.drawingData = contentData.drawingData;
      const exportData = { note, assets: [] };
      const noteName = exportData.note.name || "untitled";
      const safeName = noteName.replace(/[<>:"/\\|?*]/g, "_");
      const result = await dialog.showSaveDialog({
        title: "Export Note as JSON",
        defaultPath: `${safeName}.json`,
        filters: [{ name: "JSON Files", extensions: ["json"] }],
      });
      if (result.canceled || !result.filePath) return { success: false };
      const jsonContent = JSON.stringify(
        {
          ntsVersion: "1.0",
          exportedAt: new Date().toISOString(),
          ...exportData,
        },
        null,
        2,
      );
      await fs.writeFile(result.filePath, jsonContent, "utf-8");
      return { success: true, path: result.filePath };
    } catch (err) {
      console.error("error exporting ntoe as JSON:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("export-note-md", async (event, noteId) => {
    try {
      const allData = await apiRequest("/notes/all");
      const note = allData.notes.find((n) => n.id === noteId);
      const contentData = await apiRequest(`/notes/${noteId}/content`);
      note.content = contentData.content;
      note.drawingData = contentData.drawingData;
      const exportData = { note, assets: [] };
      const assets = exportData.assets || [];
      const noteName = note.name || "untitled";
      const safeName = noteName.replace(/[<>:"/\\|?*]/g, "_");
      const hasAssets = assets.length > 0;
      const frontmatter = ["---"];
      frontmatter.push(`name: "${(note.name || "").replace(/"/g, '\\"')}"`);
      frontmatter.push(`color: "${note.color || "#ffffff"}"`);
      if (note.pinned) frontmatter.push(`pinned: true`);
      if (note.status) frontmatter.push(`status: ${note.status}`);
      if (note.tags && note.tags.length > 0) {
        frontmatter.push("tags:");
        note.tags.forEach((t) => frontmatter.push(`  - ${t}`));
      }
      if (note.createdAt) {
        frontmatter.push(
          `createdAt: ${new Date(note.createdAt).toISOString()}`,
        );
      }
      if (note.updatedAt) {
        frontmatter.push(
          `updatedAt: ${new Date(note.updatedAt).toISOString()}`,
        );
      }
      frontmatter.push("---");
      let mdContent = note.content || "";
      if (hasAssets) {
        for (const asset of assets) {
          mdContent = mdContent
            .split(asset.originalPath)
            .join(`assets/${asset.filename}`);
        }
      }
      mdContent = `${frontmatter.join("\n")}\n\n${mdContent}`;
      if (!hasAssets) {
        const result = await dialog.showSaveDialog({
          title: "Export Note as Markdown",
          defaultPath: `${safeName}.md`,
          filters: [{ name: "Markdown Files", extensions: ["md"] }],
        });
        if (result.canceled || !result.filePath) return { success: false };
        await fs.writeFile(result.filePath, mdContent, "utf-8");
        return { success: true, path: result.filePath };
      }

      const result = await dialog.showSaveDialog({
        title: "Export Note as Markdown (ZIP)",
        defaultPath: `${safeName}.zip`,
        filters: [{ name: "ZIP Files", extensions: ["zip"] }],
      });
      if (result.canceled || !result.filePath) return { success: false };
      await new Promise((resolve, reject) => {
        const output = fsSync.createWriteStream(result.filePath);
        const archive = archiver("zip", { zlib: { level: 9 } });
        output.on("close", resolve);
        archive.on("error", reject);
        archive.pipe(output);

        archive.append(mdContent, { name: `${safeName}.md` });

        for (const asset of assets) {
          const buffer = Buffer.from(asset.data, "base64");
          archive.append(buffer, { name: `assets/${asset.filename}` });
        }
        archive.finalize();
      });
      return { success: true, path: result.filePath };
    } catch (err) {
      console.error("Error exporting note as Markdown:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("import-note", async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: "Import Note(s)",
        filters: [
          {
            name: "Supported Files",
            extensions: ["json", "md", "txt", "zip"],
          },
        ],
        properties: ["openFile"],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false };
      }
      const filePath = result.filePaths[0];
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".zip") {
        const zip = new AdmZip(filePath);
        const entries = zip.getEntries();
        const mdEntries = entries.filter(
          (e) => !e.isDirectory && e.entryName.endsWith(".md"),
        );
        if (mdEntries.length === 0) {
          return { success: false, error: "No .md files found in ZIP" };
        }
        const allData = await apiRequest("/notes/all");
        const existingFolders = allData.folders || [];
        const folderPathToId = { "": null };
        const importedNotes = [];
        for (const entry of mdEntries) {
          const entryName = entry.entryName;
          const entryDir = entryName.includes("/")
            ? entryName.substring(0, entryName.lastIndexOf("/"))
            : "";

          const parts = entryDir.split("/").filter((p) => p && p !== ".");
          let lastFolderId = null;
          let currentPathBuilder = "";
          for (const part of parts) {
            currentPathBuilder = currentPathBuilder
              ? `${currentPathBuilder}/${part}`
              : part;

            if (!folderPathToId[currentPathBuilder]) {
              let folder = existingFolders.find(
                (f) => f.name === part && f.parentId === lastFolderId,
              );
              if (!folder) {
                folder = await apiRequest("/folders", {
                  method: "POST",
                  body: JSON.stringify({ name: part, parentId: lastFolderId }),
                });
                existingFolders.push(folder);
              }
              folderPathToId[currentPathBuilder] = folder.id;
            }
            lastFolderId = folderPathToId[currentPathBuilder];
          }
          const mdContent = entry.getData().toString("utf-8");
          let content = mdContent;
          let metadata = {};
          if (mdContent.startsWith("---")) {
            const endIndex = mdContent.indexOf("\n---", 3);
            if (endIndex !== -1) {
              const frontmatterStr = mdContent.substring(3, endIndex).trim();
              metadata = parseFrontmatter(frontmatterStr);
              content = mdContent.substring(endIndex + 4).trim();
            }
          }

          const noteData = {
            name: metadata.name || path.basename(entryName, ".md"),
            content,
            preview: content
              .replace(/!\[.*?\]\(.*?\)/g, "")
              .replace(/[#*_`~\[\]]/g, "")
              .trim()
              .substring(0, 150),
            color: metadata.color || "#ffffff",
            pinned:
              metadata.pinned === true || String(metadata.pinned) === "true",
            status: metadata.status || "",
            tags: metadata.tags || [],
            noteType: "text",
            folderId: lastFolderId,
          };

          const newNote = await apiRequest("/notes", {
            method: "POST",
            body: JSON.stringify(noteData),
          });
          importedNotes.push(newNote);
        }
        return { success: true, notes: importedNotes };
      }

      const fileContent = await fs.readFile(filePath, "utf-8");
      const fileBaseName = path.basename(filePath, ext);
      let importData;
      if (ext === ".json") {
        const parsed = JSON.parse(fileContent);
        importData = { note: parsed.note, assets: parsed.assets || [] };
      } else {
        let content = fileContent;
        let metadata = {};
        if (ext === ".md" && fileContent.startsWith("---")) {
          const endIndex = fileContent.indexOf("\n---", 3);
          if (endIndex !== -1) {
            const frontmatterStr = fileContent.substring(3, endIndex).trim();
            metadata = parseFrontmatter(frontmatterStr);
            content = fileContent.substring(endIndex + 4).trim();
          }
        }
        importData = {
          note: {
            name: metadata.name || fileBaseName,
            content,
            preview: content
              .replace(/!\[.*?\]\(.*?\)/g, "")
              .replace(/[#*_`~\[\]]/g, "")
              .trim()
              .substring(0, 150),
            color: metadata.color || "#ffffff",
            pinned:
              metadata.pinned === true || String(metadata.pinned) === "true",
            status: metadata.status || "",
            tags: metadata.tags || [],
            noteType: "text",
          },
          assets: [],
        };
      }
      const newNote = await apiRequest("/notes", {
        method: "POST",
        body: JSON.stringify(importData.note),
      });
      return { success: true, note: newNote };
    } catch (err) {
      console.error("Error importing:", err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle("export-all-notes", async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: "Export All Notes",
        defaultPath: `nts_export_${new Date().toISOString().split("T")[0]}.zip`,
        filters: [{ name: "ZIP Files", extensions: ["zip"] }],
      });
      if (result.canceled || !result.filePath) return { success: false };
      const allData = await apiRequest("/notes/all");
      const { notes, folders } = allData;
      const getFolderPath = (folderId, foldersList) => {
        if (!folderId) return "";
        const folder = foldersList.find((f) => f.id === folderId);
        if (!folder) return "";
        const parentPath = getFolderPath(folder.parentId, foldersList);
        return path.join(
          parentPath,
          (folder.name || "untitled").replace(/[<>:"/\\|?*]/g, "_"),
        );
      };
      const activeNotes = notes.filter((n) => !n.deleted);
      for (const note of activeNotes) {
        const contentData = await apiRequest(`/notes/${note.id}/content`);
        note.content = contentData.content;
        note.drawingData = contentData.drawingData;
      }
      await new Promise((resolve, reject) => {
        const output = require("fs").createWriteStream(result.filePath);
        const archive = archiver("zip", { zlib: { level: 9 } });
        output.on("close", resolve);
        archive.on("error", reject);
        archive.pipe(output);
        for (const note of activeNotes) {
          const folderPath = getFolderPath(note.folderId, folders);
          const fileName = `${(note.name || "untitled").replace(/[<>:"/\\|?*]/g, "_")}.md`;
          const fullPathInZip = path.join(folderPath, fileName);
          const frontmatter = [
            "---",
            `name: "${(note.name || "").replace(/"/g, '\\"')}"`,
            `color: "${note.color || "#ffffff"}"`,
            note.pinned ? "pinned: true" : "pinned: false",
            `status: "${note.status || ""}"`,
            "tags:",
            ...(note.tags || []).map((t) => `  - ${t}`),
            `createdAt: ${new Date(note.createdAt).toISOString()}`,
            `updatedAt: ${new Date(note.updatedAt).toISOString()}`,
            "---",
            "",
            note.content || "",
          ].join("\n");
          archive.append(frontmatter, { name: fullPathInZip });
        }
        archive.finalize();
      });
      return { success: true, path: result.filePath };
    } catch (err) {
      console.error("Error exporting all notes:", err);
      return { success: false, error: err.message };
    }
  });
}
function parseFrontmatter(str) {
  const result = {};
  const lines = str.split("\n");
  let currentKey = null;
  let currentArray = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("- ") && currentKey && currentArray) {
      currentArray.push(trimmed.substring(2).trim());
      continue;
    }
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      if (currentKey && currentArray) {
        result[currentKey] = currentArray;
        currentArray = null;
      }
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      if (!value) {
        currentKey = key;
        currentArray = [];
      } else {
        currentKey = null;
        currentArray = null;
        result[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  }
  if (currentKey && currentArray) {
    result[currentKey] = currentArray;
  }
  for (const key of Object.keys(result)) {
    if (result[key] === "true") result[key] = true;
    if (result[key] === "false") result[key] = false;
  }
  return result;
}
module.exports = { registerExportHandlers };
