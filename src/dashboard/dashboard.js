import { NoteManager } from './modules/data/NoteManager.js';
import { state } from './modules/data/State.js';
import { Sidebar } from './modules/ui/Sidebar.js';
import { NoteList } from './modules/ui/NoteList.js';
import { Editor } from './modules/ui/Editor.js';

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {

    // 1. Inicializar Módulos UI
    Sidebar.init((view) => handleViewChange(view));

    NoteList.init((note) => {
        Editor.loadNote(note);
    });

    // Configurar botón de añadir nota (desde NoteList)
    NoteList.onAddNote = async () => {
        const newNote = await NoteManager.createNote();
        if (newNote) {
            refreshDashboard();
            Editor.loadNote(newNote);
        }
    };

    Editor.init(async (note) => {
        await NoteManager.updateNote(note);
        NoteList.updateNoteInList(note);
        Sidebar.updateCounts(state.allNotes);
        Sidebar.updateTags(state.allNotes);
    });

    // Configurar borrado
    Editor.onDelete = async (note) => {
        if (confirm(`Delete "${note.name}"?`)) {
            await NoteManager.deleteNote(note.id);
            Editor.clear();
            refreshDashboard();
        }
    };

    // 2. Cargar datos iniciales
    await refreshDashboard();

    // 3. Control de ventana (Minimizar/Cerrar)
    setupWindowControls();
});

// Función central para refrescar la vista
async function refreshDashboard() {
    const notes = await NoteManager.loadNotes();

    // Filtrar según la vista actual
    const filteredNotes = filterNotesByView(notes, state.currentView);

    NoteList.render(filteredNotes);
    Sidebar.updateCounts(notes);
    Sidebar.updateTags(notes);
}

// Manejar cambios de vista (Sidebar)
function handleViewChange(view) {
    const notes = state.allNotes;
    const filteredNotes = filterNotesByView(notes, view);

    NoteList.render(filteredNotes);
    NoteList.updateTitle(getFriendlyTitle(view));
}

// Lógica de filtrado
function filterNotesByView(notes, view) {
    if (view === 'all-notes') return notes;

    if (view.startsWith('status-')) {
        const status = view.replace('status-', '');
        return notes.filter(n => n.status === status);
    }

    if(view.startsWith('tag-')) {
        const tag = view.replace('tag-', '');
        return notes.filter(n => n.tags.includes(tag));
    }

    return notes;
}

function getFriendlyTitle(view) {
    const map = {
        'all-notes': 'All Notes',
        'status-active': 'Active Notes',
        'status-onhold': 'On Hold',
        'status-completed': 'Completed',
        'status-dropped': 'Dropped'
    };
    return map[view] || view;
}

function setupWindowControls() {
    document.getElementById("minimizeBtn").addEventListener("click", () => {
        window.api.minimizeWindow();
    });
    document.getElementById("closeBtn").addEventListener("click", () => {
        window.api.destroyWindow();
    });
}
