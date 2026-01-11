const { ipcMain, app } = require("electron");
const { autoUpdater } = require("electron-updater");
const { getDashboardWindow } = require("../windows/windowManager.js");

function registerUpdateHandlers() {
  autoUpdater.autoDownload = false;
  autoUpdater.logger = console;

  // Check for updates
  ipcMain.handle("check-for-updates", () => {
    if (!app.isPackaged) return null;
    return autoUpdater.checkForUpdates();
  });

  // Download update
  ipcMain.handle("download-update", () => {
    return autoUpdater.downloadUpdate();
  });

  // Quit and install
  ipcMain.on("quit-and-install", () => {
    autoUpdater.quitAndInstall();
  });

  // Auto-updater events
  autoUpdater.on("update-available", (info) => {
    const dashboardWindow = getDashboardWindow();
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.webContents.send("update-available", info);
    }
  });

  autoUpdater.on("update-downloaded", () => {
    const dashboardWindow = getDashboardWindow();
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.webContents.send("update-downloaded");
    }
  });

  autoUpdater.on("error", (err) => {
    console.error("AutoUpdater error:", err);
  });
}

function checkForUpdatesOnStartup() {
  if (app.isPackaged) {
    autoUpdater.checkForUpdates();
  }
}

module.exports = { registerUpdateHandlers, checkForUpdatesOnStartup };
