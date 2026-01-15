const { BrowserWindow } = require("electron");
const path = require("path");

let dashboardWindow = null;

async function createDashboardWindow() {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.show();
    dashboardWindow.focus();
    return;
  }

  dashboardWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    resizable: true,
    minWidth: 1000,
    minHeight: 600,
    frame: false,
    transparent: false,
    alwaysOnTop: false,
    show: false,
    backgroundColor: "#1a1a1a",
    webPreferences: {
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  dashboardWindow.loadFile(path.join(__dirname, "../../../dist/index.html"));

  dashboardWindow.webContents.once("did-finish-load", () => {
    setTimeout(() => {
      if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.show();
      }
    }, 1000);
  });

  dashboardWindow.on("closed", () => {
    dashboardWindow = null;
  });
}

function getDashboardWindow() {
  return dashboardWindow;
}

module.exports = {
  createDashboardWindow,
  getDashboardWindow,
};
