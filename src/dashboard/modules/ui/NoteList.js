import { state } from '../data/State.js';

export const NoteList = {
    init(onNoteSelect) {
        this.onNoteSelect = onNoteSelect;
        this.setupAddButton();
    },

    setupAddButton() {
        // El botón de añadir está en la cabecera de la lista
        const btn = document.getElementById("addNoteBtn");
        if (btn && this.onAddNote) {
            btn.addEventListener("click", this.onAddNote);
        }
    },

    // Renderizar la lista completa
    render(notes) {
        const listBody = document.getElementById("notesListPanel");
        listBody.innerHTML = "";

        if (notes.length === 0) {
            listBody.innerHTML = '<div class="no-items-message">No notes found.</div>';
            return;
        }

        // Ordenar por ID (más reciente primero)
        const sortedNotes = [...notes].sort((a, b) => b.id - a.id);

        sortedNotes.forEach((note) => {
            const noteItem = this.createNoteItem(note);
            listBody.appendChild(noteItem);
        });
    },

    createNoteItem(note) {
        const noteItem = document.createElement("div");
        noteItem.className = "note-list-item";
        noteItem.style.borderLeftColor = note.color || "#667eea";
        noteItem.dataset.noteId = note.id;
        noteItem.draggable = true;

        // Marcar como activa si es la nota actual
        if (state.currentNote && state.currentNote.id === note.id) {
            noteItem.classList.add("active");
        }

        const title = document.createElement("div");
        title.className = "note-list-item-title";
        title.textContent = note.name || "Untitled";

        const preview = document.createElement("div");
        preview.className = note.content
            ? "note-list-item-preview"
            : "note-list-item-preview note-list-item-empty";
        preview.textContent = note.content || "Empty note";

        noteItem.appendChild(title);
        noteItem.appendChild(preview);

        // Eventos
        noteItem.addEventListener("click", () => {
            if (this.onNoteSelect) this.onNoteSelect(note);
        });

        this.setupDragAndDrop(noteItem, note);

        return noteItem;
    },

    setupDragAndDrop(item, note) {
        item.addEventListener("dragstart", (e) => {
            e.dataTransfer.effectAllowed = "copy";
            e.dataTransfer.setData("text/plain", note.id);
            item.style.opacity = "0.5";
        });

        item.addEventListener("dragend", (e) => {
            item.style.opacity = "1";
            window.api.openNoteWindow(note.id, e.screenX, e.screenY);
        });
    },

    updateNoteInList(note) {
        const noteItem = document.querySelector(`[data-note-id="${note.id}"]`);
        if (noteItem) {
            const titleEl = noteItem.querySelector(".note-list-item-title");
            const previewEl = noteItem.querySelector(".note-list-item-preview");

            titleEl.textContent = note.name || "Untitled";
            previewEl.textContent = note.content || "Empty note";
            previewEl.className = note.content
                ? "note-list-item-preview"
                : "note-list-item-preview note-list-item-empty";

            // Actualizar borde de color si cambió
            noteItem.style.borderLeftColor = note.color || "#667eea";
        }
    },

    updateTitle(text) {
        const titleEl = document.getElementById("contentTitle");
        if (titleEl) titleEl.textContent = text;
    },

    // Helper para marcar visualmente la nota activa
    setActiveNote(noteId) {
        document.querySelectorAll(".note-list-item").forEach(item => {
            if (item.dataset.noteId == noteId) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });
    }
};
