document.getElementById("addNote").addEventListener("click", () => {
  console.log("Botón 'add' presionado. Enviando 'create-note' a main.js");
  window.api.createNote();
});

document.getElementById("listNotes").addEventListener("click", () => {
  window.api.openNotesList();
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



// no sirve xd
// // Cerrar modal de lista de notas
// document.getElementById("closeNotesListBtn").addEventListener("click", () => {
//   document.getElementById("notesListModal").classList.remove("active");
// });

// // Cerrar modal al hacer clic fuera
// document.getElementById("notesListModal").addEventListener("click", (e) => {
//   if (e.target.id === "notesListModal") {
//     document.getElementById("notesListModal").classList.remove("active");
//   }
// });
