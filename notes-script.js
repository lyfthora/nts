const { ipcRenderer, remote } = require("electron");
const currentWindow = remote.getCurrentWindow();

let noteData = null;

// Recibir datos de la nota
ipcRenderer.on("note-data", (event, data) => {
  noteData = data;
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

// Botones de ventana
document.getElementById("minimizeBtn").addEventListener("click", () => {
  currentWindow.hide();
});

document.getElementById("closeBtn").addEventListener("click", () => {
  if (noteData) {
    ipcRenderer.send("delete-note", noteData.id);
  }
  currentWindow.close();
});

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

// Guardar contenido
document.getElementById("noteContent").addEventListener("input", (e) => {
  if (noteData) {
    noteData.content = e.target.value;
    saveNote();
  }
});

document.getElementById("saveBtn").addEventListener("click", () => {
  saveNote();
  alert("Nota guardada");
});

function saveNote() {
  if (noteData) {
    const [x, y] = currentWindow.getPosition();
    noteData.x = x;
    noteData.y = y;
    ipcRenderer.send("update-note", noteData);
  }
}

document.getElementById("reminderBtn").addEventListener("click", () => {
  alert("Recordatorio - próximamente");
});
