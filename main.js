const { app, BrowserWindow } = require("electron");
const Store = require("electron-store");

// Esto guarda los datos automáticamente
const store = new Store();

// Hacemos la tienda accesible globalmente
global.store = store;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
