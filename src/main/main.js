const { app } = require("electron");
const storage = require("./storage.js");
const { createDashboardWindow } = require("./windows/windowManager.js");
const { registerAllHandlers } = require("./ipc/index.js");
const { checkForUpdatesOnStartup } = require("./ipc/updateHandlers.js");

async function initializeDefaultStructure() {
  const folders = await storage.getAllFolders();
  const indexExists = folders.find((f) => f.id === 1);

  if (!indexExists) {
    const indexFolder = {
      id: 1,
      name: "Index",
      parentId: null,
      isSystem: true,
      expanded: true,
    };
    folders.push(indexFolder);
    await storage.saveFolders(folders);
    console.log("System folder 'Index' created");
  }
}

registerAllHandlers();

app.whenReady().then(async () => {
  await storage.migrateFromElectronStore();
  await initializeDefaultStructure();
  createDashboardWindow();
  checkForUpdatesOnStartup();
});

app.on("window-all-closed", () => {
  app.quit();
});
