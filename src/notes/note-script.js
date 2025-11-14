const { ipcRenderer } = require("electron");
const { BrowserWindow } = require("@electron/remote");
const currentWindow = BrowserWindow.getFocusedWindow();

let noteData = null;

// Recibir datos de la nota
ipcRenderer.on("note-data", (event, data) => {
  noteData = data;
  console.log("Nota cargada:", noteData);
  document.getElementById("noteContent").value = data.content || "";

  // Aplicar color
  const colorBtns = document.querySelectorAll(".color-btn");
  colorBtns.forEach((btn) => {
    if (btn.dataset.color === data.color) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  document.getElementById("noteHeader").style.background = data.color;
  document.getElementById("noteContentArea").style.background = data.color;
});

// BOTÓN CERRAR
document.getElementById("closeBtn").addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log("Botón cerrar clickeado");
  closeNote();
});

// Botón minimizar
document.getElementById("minimizeBtn").addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log("Minimizando ventana");
  currentWindow.hide();
});

// Maximizar
document.getElementById("maximizeBtn").addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (currentWindow.isMaximized()) {
    currentWindow.unmaximize();
  } else {
    currentWindow.maximize();
  }
});

// Interceptar cierre de ventana
currentWindow.on("close", (e) => {
  e.preventDefault();
  closeNote();
});

function closeNote() {
  console.log("Cerrando nota con ID:", noteData ? noteData.id : "sin datos");
  if (noteData) {
    ipcRenderer.send("delete-note", noteData.id);
  }
  currentWindow.destroy();
}

// Cambiar color
document.querySelectorAll(".color-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const color = btn.dataset.color;

    document
      .querySelectorAll(".color-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    document.getElementById("noteHeader").style.background = color;
    document.getElementById("noteContentArea").style.background = color;

    if (noteData) {
      noteData.color = color;
      saveNote();
    }
  });
});

// Guardar contenido automáticamente
document.getElementById("noteContent").addEventListener("input", (e) => {
  if (noteData) {
    noteData.content = e.target.value;
    saveNote();
  }
});

// Botón Save
document.getElementById("saveBtn").addEventListener("click", () => {
  saveNote();
  const btn = document.getElementById("saveBtn");
  const originalText = btn.textContent;
  btn.textContent = "✓ Saved";
  setTimeout(() => {
    btn.textContent = originalText;
  }, 1000);
});

function saveNote() {
  if (noteData) {
    const [x, y] = currentWindow.getPosition();
    noteData.x = x;
    noteData.y = y;
    ipcRenderer.send("update-note", noteData);
    console.log("Nota guardada:", noteData);
  }
}

// Botón Reminder
document.getElementById("reminderBtn").addEventListener("click", () => {
  alert("Recordatorio - próximamente");
});
