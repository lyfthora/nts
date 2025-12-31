const { ipcMain } = require("electron");
const storage = require("../storage.js");

function registerFolderHandlers() {
  // Get all folders
  ipcMain.handle("get-all-folders", async () => {
    return await storage.getAllFolders();
  });

  // Create folder
  ipcMain.handle("create-folder", async (event, folderData) => {
    const folders = await storage.getAllFolders();
    const newFolder = {
      id: Date.now(),
      type: "folder",
      name: folderData.name || "New Folder",
      parentId: folderData.parentId || null,
      isSystem: false,
      expanded: true,
      createdAt: Date.now(),
    };
    folders.push(newFolder);
    await storage.saveFolders(folders);
    return newFolder;
  });

  // Update folder
  ipcMain.on("update-folder", async (event, folderData) => {
    const folders = await storage.getAllFolders();
    const index = folders.findIndex((f) => f.id === folderData.id);
    if (index !== -1) {
      folders[index] = { ...folders[index], ...folderData };
      await storage.saveFolders(folders);
    }
  });

  // Delete folder
  ipcMain.handle("delete-folder", async (event, folderId) => {
    const folders = await storage.getAllFolders();
    const folder = folders.find((f) => f.id === folderId);

    if (folder && folder.isSystem) {
      console.log("Cannot delete system folder");
      return;
    }

    const toDelete = [folderId];
    let i = 0;
    while (i < toDelete.length) {
      const currentId = toDelete[i];
      const subfolders = folders.filter((f) => f.parentId === currentId);
      toDelete.push(...subfolders.map((f) => f.id));
      i++;
    }

    const remainingFolders = folders.filter((f) => !toDelete.includes(f.id));
    await storage.saveFolders(remainingFolders);

    const notes = await storage.getMetadata();
    const updateNotes = notes.map((n) => {
      if (toDelete.includes(n.folderId)) {
        return { ...n, deleted: true, folderId: 1 };
      }
      return n;
    });
    await storage.saveNotesMetadata(updateNotes);
  });

  // Move folder
  ipcMain.on("move-folder", async (event, { folderId, newParentId }) => {
    const folders = await storage.getAllFolders();
    const index = folders.findIndex((f) => f.id === folderId);
    if (index !== -1) {
      if (folderId === newParentId) return;
      folders[index].parentId = newParentId;
      await storage.saveFolders(folders);
    }
  });
}

module.exports = { registerFolderHandlers };
