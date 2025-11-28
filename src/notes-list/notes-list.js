//control de ventanas
document.getElementById("minimizeBtn").addEventListener("click", () => {
  window.api.minimizeWindow();
});

document.getElementById("closeBtn").addEventListener("click", () => {
  window.api.destroyWindow();
});

//cargar ntoas al abrir la ventan
async function loadNotes() {
  const body = document.getElementById("notesListBody");
  const notes = await window.api.getAllNotes();

  body.innerHTML = "";

  if (notes.length === 0) {
    body.innerHTML = '<div class="no-notes-message">No tienes notas guardadas</div>';
  } else {
    notes.forEach((note, index) => {
      const noteItem = document.createElement("div");
      noteItem.className = "note-item";
      noteItem.style.borderLeftColor = note.color || "#ffffff";


      const title = document.createElement("div");
      title.className = "note-item-title";
      title.textContent = `Note ${index + 1}`;

      const preview = document.createElement("div");
      preview.className = note.content ? "note-item-preview" : "note-item-preview note-item-empty";
      preview.textContent = note.content || "Nota vacia";

      noteItem.appendChild(title);
      noteItem.appendChild(preview);
      noteItem.addEventListener("click", () => {
        window.api.showAllNotes();
        window.api.destroyWindow();
      });
      body.appendChild(noteItem);
    });
  }
}


loadNotes();
