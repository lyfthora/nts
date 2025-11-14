document.getElementById("addNote").addEventListener("click", () => {
  console.log("Botón 'add' presionado. Enviando 'create-note' a main.js");
  window.api.createNote();
});

document.getElementById("listNotes").addEventListener("click", () => {
  window.api.showAllNotes();
});

document.getElementById("reminderNotes").addEventListener("click", () => {
  alert("Recordatorios - próximamente");
});

// Minimizar
document.getElementById("minimizeBtn").addEventListener("click", () => {
  window.api.minimizeMain();
});

// Cerrar (ocultar en lugar de cerrar)
document.getElementById("closeBtn").addEventListener("click", () => {
  window.api.closeMain();
});
