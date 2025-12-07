import { state, setNotes, getNotes } from './State.js';

export const NoteManager = {
    // Cargar todas las notas desde el sistema
    async loadNotes() {
        const notes = await window.api.getAllNotes();
        setNotes(notes);
        return notes;
    },

    // Crear una nueva nota
    async createNote() {
        const newNote = await window.api.createNoteDashboard();
        if (newNote) {
            // Recargamos para asegurar sincronización
            await this.loadNotes();
        }
        return newNote;
    },

    // Guardar la nota actual (sin debounce, eso va en la UI)
    async updateNote(note) {
        if (!note) return;
        await window.api.updateNote(note);

        // Actualizamos la lista local también
        const notes = getNotes().map(n => n.id === note.id ? note : n);
        setNotes(notes);
    },

    // Borrar nota
    async deleteNote(noteId) {
        await window.api.deleteNote(noteId);
        // Actualizamos estado local
        const notes = getNotes().filter(n => n.id !== noteId);
        setNotes(notes);
    },

    // Obtener nota por ID
    getNoteById(id) {
        return getNotes().find(n => n.id === id);
    }
};
