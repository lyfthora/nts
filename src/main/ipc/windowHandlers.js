const { ipcMain, BrowserWindow } = require("electron");
const {
  createDashboardWindow,
  createListWindow,
  createRemindersListWindow,
} = require("../windows/windowManager.js");

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

  // Window destroy
  ipcMain.on("window-destroy", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.destroy();
  });

  // Window maximize/unmaximize toggle
  ipcMain.on("window-maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
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

  // Open dashboard
  ipcMain.on("open-dashboard", () => {
    createDashboardWindow();
  });

  // Open notes list
  ipcMain.on("open-notes-list", () => {
    createListWindow();
  });

  // Open reminders list
  ipcMain.on("open-reminders-list", () => {
    createRemindersListWindow();
  });
}

module.exports = { registerWindowHandlers };
