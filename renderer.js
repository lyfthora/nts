const fs = require("fs");
const path = require("path");

const userDataPath =
  process.env.APPDATA ||
  (process.platform == "darwin"
    ? process.env.HOME + "/Library/Application Support"
    : process.env.HOME + "/.local/share");
const notesPath = path.join(userDataPath, "nts", "notes.json");

let notes = [];
let draggedNote = null;
let offsetX = 0;
let offsetY = 0;

window.addEventListener("DOMContentLoaded", () => {
  loadNotes();

  document.getElementById("addNote").addEventListener("click", createNewNote);
  document.getElementById("listNotes").addEventListener("click", showAllNotes);
  document
    .getElementById("reminderNotes")
    .addEventListener("click", showReminders);
});

function loadNotes() {
  try {
    const dir = path.dirname(notesPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(notesPath)) {
      const data = fs.readFileSync(notesPath, "utf8");
      notes = JSON.parse(data);
      notes.forEach((note) => renderNote(note));
    }
  } catch (error) {
    console.error("Error cargando notas:", error);
    notes = [];
  }
}

function saveNotes() {
  try {
    const dir = path.dirname(notesPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));
  } catch (error) {
    console.error("Error guardando notas:", error);
  }
}

function createNewNote() {
  const note = {
    id: Date.now(),
    x: Math.random() * (window.innerWidth - 350) + 50,
    y: Math.random() * (window.innerHeight - 300) + 50,
    content: "",
    color: "#ffffff",
    hasReminder: false,
  };

  notes.push(note);
  renderNote(note);
  saveNotes();
}

function renderNote(note) {
  const noteElement = document.createElement("div");
  noteElement.className = "note";
  noteElement.style.left = note.x + "px";
  noteElement.style.top = note.y + "px";
  noteElement.dataset.id = note.id;

  noteElement.innerHTML = `
    <div class="note-window-bar">
      <div class="window-title">
        <div class="window-icon"></div>
        <span>New Pad</span>
      </div>
      <div class="window-controls">
        <button class="window-btn minimize-btn"></button>
        <button class="window-btn maximize-btn"></button>
        <button class="window-btn close-btn"></button>
      </div>
    </div>

    <div class="note-header" style="background: ${note.color}">
      <div class="color-picker">
        <div class="color-btn ${
          note.color === "#A8D5FF" ? "active" : ""
        }" style="background: #A8D5FF" data-color="#A8D5FF"></div>
        <div class="color-btn ${
          note.color === "#B4E7CE" ? "active" : ""
        }" style="background: #B4E7CE" data-color="#B4E7CE"></div>
        <div class="color-btn ${
          note.color === "#FFF4A3" ? "active" : ""
        }" style="background: #FFF4A3" data-color="#FFF4A3"></div>
        <div class="color-btn ${
          note.color === "#FFB5B5" ? "active" : ""
        }" style="background: #FFB5B5" data-color="#FFB5B5"></div>
        <div class="color-btn ${
          note.color === "#ffffff" ? "active" : ""
        }" style="background: #ffffff" data-color="#ffffff"></div>
      </div>
    </div>

    <div class="note-content-area" style="background: ${note.color}">
      <textarea class="note-content" placeholder="Escribe tu nota aquí...">${
        note.content
      }</textarea>
    </div>

    <div class="note-footer">
      <button class="footer-btn save-btn">Save</button>
      <button class="footer-btn reminder-btn">Set Reminder</button>
    </div>
  `;

  document.getElementById("notesContainer").appendChild(noteElement);

  // Eventos
  const textarea = noteElement.querySelector(".note-content");
  textarea.addEventListener("input", (e) => {
    updateNoteContent(note.id, e.target.value);
  });

  const closeBtn = noteElement.querySelector(".close-btn");
  closeBtn.addEventListener("click", () => {
    deleteNote(note.id, noteElement);
  });

  const minimizeBtn = noteElement.querySelector(".minimize-btn");
  minimizeBtn.addEventListener("click", () => {
    noteElement.style.display = "none";
  });

  const colorBtns = noteElement.querySelectorAll(".color-btn");
  colorBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color;

      // Actualizar clases activas
      colorBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Actualizar colores
      noteElement.querySelector(".note-header").style.background = color;
      noteElement.querySelector(".note-content-area").style.background = color;
      updateNoteColor(note.id, color);
    });
  });

  const reminderBtn = noteElement.querySelector(".reminder-btn");
  reminderBtn.addEventListener("click", () => {
    alert("Función de recordatorio - próximamente");
  });

  // Arrastrar solo desde la barra de título
  const windowBar = noteElement.querySelector(".note-window-bar");
  windowBar.addEventListener("mousedown", (e) => startDrag(e, noteElement));
}

function startDrag(e, element) {
  draggedNote = element;
  const rect = draggedNote.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", stopDrag);
}

function drag(e) {
  if (!draggedNote) return;

  const x = e.clientX - offsetX;
  const y = e.clientY - offsetY;

  draggedNote.style.left = x + "px";
  draggedNote.style.top = y + "px";
}

function stopDrag() {
  if (draggedNote) {
    const id = parseInt(draggedNote.dataset.id);
    const x = parseInt(draggedNote.style.left);
    const y = parseInt(draggedNote.style.top);

    updateNotePosition(id, x, y);

    draggedNote = null;
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);
  }
}

function updateNoteContent(id, content) {
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.content = content;
    saveNotes();
  }
}

function updateNoteColor(id, color) {
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.color = color;
    saveNotes();
  }
}

function updateNotePosition(id, x, y) {
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.x = x;
    note.y = y;
    saveNotes();
  }
}

function deleteNote(id, element) {
  notes = notes.filter((n) => n.id !== id);
  element.remove();
  saveNotes();
}

function showAllNotes() {
  const allNotes = document.querySelectorAll(".note");
  allNotes.forEach((note) => {
    note.style.display = "block";
  });
}

function showReminders() {
  alert("Vista de recordatorios - próximamente");
}
