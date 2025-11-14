const { ipcRenderer, remote } = require("electron");
const currentWindow = remote.getCurrentWindow();

document.getElementById("addNote").addEventListener("click", () => {
  ipcRenderer.send("create-note");
});

document.getElementById("listNotes").addEventListener("click", () => {
  ipcRenderer.send("show-all-notes");
});

document.getElementById("reminderNotes").addEventListener("click", () => {
  alert("Recordatorios - próximamente");
});

// Minimizar
document.getElementById("minimizeBtn").addEventListener("click", () => {
  currentWindow.hide();
});

// Cerrar (ocultar en lugar de cerrar)
document.getElementById("closeBtn").addEventListener("click", () => {
  currentWindow.hide();
});
