const { remote } = require("electron");
const Store = require("electron-store");
const store = new Store();

let notes = [];
let draggedNote = null;
let offsetX = 0;
let offsetY = 0;

// Cargar notas al iniciar
window.addEventListener("DOMContentLoaded", () => {
  loadNotes();

  document.getElementById("addNote").addEventListener("click", createNewNote);
});

function loadNotes() {
  notes = store.get("notes", []);
  notes.forEach((note) => renderNote(note));
}

function saveNotes() {
  store.set("notes", notes);
}

function createNewNote() {
  const note = {
    id: Date.now(),
    x: Math.random() * (window.innerWidth - 300),
    y: Math.random() * (window.innerHeight - 200) + 50,
    content: "",
    color: "#ffffff",
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
  noteElement.style.backgroundColor = note.color;
  noteElement.dataset.id = note.id;

  noteElement.innerHTML = `
    <div class="note-header">
      <div class="color-picker">
        <div class="color-btn" style="background: #ffcccc" data-color="#ffcccc"></div>
        <div class="color-btn" style="background: #ccffcc" data-color="#ccffcc"></div>
        <div class="color-btn" style="background: #ccccff" data-color="#ccccff"></div>
        <div class="color-btn" style="background: #ffffcc" data-color="#ffffcc"></div>
      </div>
      <button class="delete-btn">✕</button>
    </div>
    <textarea class="note-content" placeholder="Escribe aquí...">${note.content}</textarea>
  `;

  document.getElementById("notesContainer").appendChild(noteElement);

  // Eventos
  const textarea = noteElement.querySelector(".note-content");
  textarea.addEventListener("input", (e) => {
    updateNoteContent(note.id, e.target.value);
  });

  const deleteBtn = noteElement.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", () => {
    deleteNote(note.id, noteElement);
  });

  const colorBtns = noteElement.querySelectorAll(".color-btn");
  colorBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color;
      noteElement.style.backgroundColor = color;
      updateNoteColor(note.id, color);
    });
  });

  // Arrastrar nota
  noteElement.addEventListener("mousedown", startDrag);
}

function startDrag(e) {
  if (
    e.target.classList.contains("note-content") ||
    e.target.classList.contains("delete-btn") ||
    e.target.classList.contains("color-btn")
  ) {
    return;
  }

  draggedNote = e.currentTarget;
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
