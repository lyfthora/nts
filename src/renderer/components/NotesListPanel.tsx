import React from "react";
import './NotesListPanel.css';

interface NotesListPanelProps {
  notes: any[];
  currentNoteId: number | null;
  onAddNote: () => void;
  onSelect: (n: any) => void;
}

export default function NotesListPanel({ notes, currentNoteId, onAddNote, onSelect }: NotesListPanelProps) {
  return (
    <div className="notes-list-panel">
      <div className="panel-header">
        <h2 id="contentTitle">All Notes</h2>
        <div className="panel-actions">
          <button className="action-btn" id="addNoteBtn" title="Add Note" onClick={onAddNote}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
        </div>
      </div>
      <div className="notes-list-body" id="notesListPanel">
        {notes.length === 0 ? (
          <div className="no-items-message">No notes</div>
        ) : (
          notes.map(n => (
            <div key={n.id} className={`note-list-item${currentNoteId === n.id ? ' active' : ''}`} style={{ borderLeftColor: n.color || '#667eea' }} onClick={() => onSelect(n)}>
              <div className="note-list-item-title">{n.name || 'Untitled'}</div>
              <div className={n.content ? 'note-list-item-preview' : 'note-list-item-preview note-list-item-empty'}>{n.content || 'Empty note'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
