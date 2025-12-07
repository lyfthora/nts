// Estado global de la aplicación
export const state = {
    allNotes: [],
    currentNote: null,
    currentView: 'all-notes',
    searchQuery: ''
};

// Getters y Setters simples para mantener el control
export function getNotes() { return state.allNotes; }
export function setNotes(notes) { state.allNotes = notes; }

export function getCurrentNote() { return state.currentNote; }
export function setCurrentNote(note) { state.currentNote = note; }

export function getCurrentView() { return state.currentView; }
export function setCurrentView(view) { state.currentView = view; }
