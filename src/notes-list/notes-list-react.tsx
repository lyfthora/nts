import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

function WindowBar({ onMinimize, onClose }: { onMinimize: () => void; onClose: () => void }) {
  return (
    <div className="note-window-bar">
      <div className="window-title"><div className="window-icon" /></div>
      <div className="window-controls"><button className="window-btn minimize-btn" id="minimizeBtn" onClick={onMinimize} /><button className="window-btn close-btn" id="closeBtn" onClick={onClose} /></div>
    </div>
  );
}

function NotesList({ notes, onOpen }: { notes: any[]; onOpen: (n: any) => void }) {
  return (
    <div className="notes-list-body" id="notesListBody">
      {notes.length === 0 ? (
        <div className="no-notes-message">No tienes notas guardadas</div>
      ) : (
        notes.map((note, index) => (
          <div className="note-item" style={{ borderLeftColor: note.color || '#ffffff' }} onClick={() => onOpen(note)}>
            <div className="note-item-title">{`Note ${index + 1}`}</div>
            <div className={note.content ? 'note-item-preview' : 'note-item-preview note-item-empty'}>{note.content || 'Nota vacia'}</div>
          </div>
        ))
      )}
    </div>
  );
}

function App() {
  const [notes, setNotes] = useState<any[]>([]);
  useEffect(() => { let mounted = true; window.api.getAllNotes().then((ns: any[]) => { if (mounted) setNotes(ns || []); }); return () => { mounted = false; }; }, []);
  const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
  const onClose = useCallback(() => window.api.destroyWindow(), []);
  const onOpen = useCallback((note: any) => { window.api.showNoteById(note.id); }, []);
  return (
    <div className="list-window">
      <WindowBar onMinimize={onMinimize} onClose={onClose} />
      <div className="list-header"><h2>My Notes</h2></div>
      <NotesList notes={notes} onOpen={onOpen} />
    </div>
  );
}

const rootEl = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootEl);
root.render(<App />);

