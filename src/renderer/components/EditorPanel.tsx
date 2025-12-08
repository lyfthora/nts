import React from "react";
import StatusDropdown from "./StatusDropdown";
import TagsEditor from "./TagsEditor";
import ColorPicker from "./ColorPicker";
import "./EditorPanel.css";

interface EditorPanelProps {
  note: any | null;
  onChange: (n: any) => void;
  onDelete: (n: any) => void;
  onRestore?: (n: any) => void;
  onDeletePermanently?: (n: any) => void;
  onStatus: (n: any) => void;
  onTagAdd: (n: any) => void;
  onTagRemove: (n: any) => void;
  onColor: (n: any) => void;
  isTrashView?: boolean;
}

export default function EditorPanel({
  note,
  onChange,
  onDelete,
  onRestore,
  onDeletePermanently,
  onStatus,
  onTagAdd,
  onTagRemove,
  onColor,
  isTrashView,
}: EditorPanelProps) {
  if (!note) {
    return (
      <div className="note-editor-panel">
        <div className="editor-placeholder" id="editorPlaceholder">
          <svg
            width={64}
            height={64}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p>Select a note to view</p>
        </div>
      </div>
    );
  }
  return (
    <div className="note-editor-panel">
      <div className="editor-header">
        <input
          type="text"
          className="note-title-input"
          id="noteTitleInput"
          placeholder="Note title..."
          value={note.name || ""}
          onChange={(e) => onChange({ ...note, name: e.target.value })}
        />
        <div className="editor-actions">
          {isTrashView ? (
            // Botones para vista Trash
            <>
              <button className="editor-action-btn" title="Restore Note" onClick={() => onRestore && onRestore(note)}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
              <button className="editor-action-btn" title="Delete Permanently" onClick={() => onDeletePermanently && onDeletePermanently(note)}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1={10} y1={11} x2={10} y2={17} />
                  <line x1={14} y1={11} x2={14} y2={17} />
                </svg>
              </button>
            </>
          ) : (
            // Botones para vista normal
            <>
              <button
                className="editor-action-btn"
                id="deleteNoteBtn"
                title="Delete Note"
                onClick={() => onDelete(note)}
              >
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
              <ColorPicker
                color={note.color}
                onChange={(c) => onColor({ ...note, color: c })}
              />
            </>
          )}
        </div>
      </div>
      <div className="note-metadata">
        <div className="metadata-item metadata-folder">
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="metadata-folder-name">study</span>
        </div>
        <div className="metadata-item metadata-status">
          <StatusDropdown
            status={note.status || ""}
            onChange={(s) => onStatus({ ...note, status: s })}
          />
        </div>
        <TagsEditor
          tags={note.tags || []}
          onAdd={(t) =>
            onTagAdd({
              ...note,
              tags: Array.from(new Set([...(note.tags || []), t])),
            })
          }
          onRemove={(t) =>
            onTagRemove({
              ...note,
              tags: (note.tags || []).filter((x: string) => x !== t),
            })
          }
        />
      </div>
      <div className="editor-body">
        <textarea
          className="note-content-editor"
          id="noteContentEditor"
          placeholder="Start typing..."
          value={note.content || ""}
          onChange={(e) => onChange({ ...note, content: e.target.value })}
        />
      </div>
    </div>
  );
}
