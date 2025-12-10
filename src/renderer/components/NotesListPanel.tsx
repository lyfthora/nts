import React, { memo } from "react";
import './NotesListPanel.css';

interface NotesListPanelProps {
  notes: any[];
  currentNoteId: number | null;
  onAddNote: () => void;
  onSelect: (n: any) => void;
  isTrashView?: boolean;
  title?: string;
}

const NotesListPanel = memo(function NotesListPanel({ notes, currentNoteId, onAddNote, onSelect, isTrashView, title }: NotesListPanelProps) {
  return (
    <div className="notes-list-panel">
      <div className="panel-header">
        <h2 id="contentTitle">{title || 'All Notes'}</h2>
        <div className="panel-actions">
          {!isTrashView && (
            <button className="action-btn" id="addNoteBtn" title="Add Note" onClick={onAddNote}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
          )}
        </div>
      </div>
      <div className="notes-list-body" id="notesListPanel">
        {notes.length === 0 ? (
          <div className="no-items-message">No notes</div>
        ) : (
          notes.map(n => (
            <div key={n.id} className={`note-list-item${currentNoteId === n.id ? ' active' : ''}`} style={{ borderLeftColor: n.color || '#667eea' }} onClick={() => onSelect(n)}>
              <div className="note-list-item-title">
                {n.pinned && (
                  <svg
                    className="pin-icon"
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ marginRight: '6px' }}
                  >
                    <path d="M12 17v5" />
                    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                  </svg>
                )}
                {n.name || 'Untitled'}
              </div>
              <div className={n.content ? 'note-list-item-preview' : 'note-list-item-preview note-list-item-empty'}>{n.content || 'Empty note'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
export default NotesListPanel;
