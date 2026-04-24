const { app, ipcMain } = require("electron");
const path = require("path");
const storage = require("./storage.js");
const {
  createDashboardWindow,
  getDashboardWindow,
  closeAllNoteWindows,
} = require("./windows/windowManager.js");
const { registerAllHandlers } = require("./ipc/index.js");
const { checkForUpdatesOnStartup } = require("./ipc/updateHandlers.js");

// oath: registrar protocol handler nts://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("nts", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("nts");
}

let pendingOAuthToken = null;

function handleOAuthUrl(url) {
  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get("token");
    if (token) {
      pendingOAuthToken = token;
      const win = getDashboardWindow();
      if (win && !win.isDestroyed()) {
        win.focus();
      }
    }
  } catch { /* */ }
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const url = argv.find((arg) => arg.startsWith("nts://"));
    if (url) handleOAuthUrl(url);

    const win = getDashboardWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

// IPC handlers
registerAllHandlers();
ipcMain.handle("open-oauth", async (_event, url) => {
  const { shell } = require("electron");
  shell.openExternal(url);
});

ipcMain.handle("get-oauth-token", () => {
  const token = pendingOAuthToken;
  pendingOAuthToken = null;
  return token;
});

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

app.whenReady().then(async () => {
  await storage.migrateFromElectronStore();
  await storage.addMissingFields();
  await initializeDefaultStructure();
  createDashboardWindow();
  checkForUpdatesOnStartup();
});

app.on("window-all-closed", () => {
  closeAllNoteWindows();
  app.quit();
});
