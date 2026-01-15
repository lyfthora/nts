const { ipcMain, BrowserWindow } = require("electron");

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
}

module.exports = { registerWindowHandlers };
