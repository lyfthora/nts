let noteData = null;

// Recibir datos de la nota (usando el handler expuesto)
window.api.onNoteData((data) => {
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

  // document.getElementById("noteHeader").style.background = data.color;
  // document.getElementById("noteContentArea").style.background = data.color;
  document.getElementById("noteContent").style.background =
    data.color || "#FFFFFF";
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
  window.api.minimizeWindow();
});

// Maximizar
document.getElementById("maximizeBtn").addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  window.api.toggleMaximize();
});

function closeNote() {
  console.log("Cerrando nota con ID:", noteData ? noteData.id : "sin datos");
  if (noteData) {
    window.api.deleteNote(noteData.id);
  }
  // destruir ventana (main la destruirá)
  window.api.destroyWindow();
}

// Cambiar color
document.querySelectorAll(".color-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const color = btn.dataset.color;

    document
      .querySelectorAll(".color-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    //cambia  el color toda la nota
    // document.getElementById("noteHeader").style.background = color;
    // document.getElementById("noteContentArea").style.background = color;

    document.getElementById("noteContent").style.background = color;
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

async function saveNote() {
  if (noteData) {
    // pedimos la posición actual de la ventana al main
    const pos = await window.api.getWindowPosition();
    const [x, y] = pos;
    noteData.x = x;
    noteData.y = y;
    window.api.updateNote(noteData);
    console.log("Nota guardada:", noteData);
  }
}

// Botón Reminder
document.getElementById("reminderBtn").addEventListener("click", () => {
  alert("Recordatorio - próximamente");
});
