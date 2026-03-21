import React, { useEffect, useRef, useState, memo, useCallback } from "react";
import type { Note, Folder, NoteStatus } from "../types/models";
import './NoteContextMenu.css';
import buttonIcon from '../assets/icons/button.png';
import pauseIcon from '../assets/icons/pause.png';
import checkedIcon from '../assets/icons/checked.png';
import removeIcon from '../assets/icons/remove.png';

interface NoteContextMenuProps {
  note: Note;
  x: number;
  y: number;
  folders: Folder[];
  onPin: (note: Note) => void;
  onSetStatus: (note: Note) => void;
  onMoveToFolder: (noteId: number, folderId: number | null) => void;
  onDuplicate: (note: Note) => void;
  onDelete: (note: Note) => void;
  onClose: () => void;
}

const statusOptions: { value: NoteStatus; label: string; icon: string | null }[] = [
  { value: '', label: 'None', icon: null },
  { value: 'active', label: 'Active', icon: buttonIcon },
  { value: 'onhold', label: 'On Hold', icon: pauseIcon },
  { value: 'completed', label: 'Completed', icon: checkedIcon },
  { value: 'dropped', label: 'Dropped', icon: removeIcon },
];
const NoteContextMenu = memo(function NoteContextMenu({
  note, x, y, folders, onPin, onSetStatus, onMoveToFolder, onDuplicate, onDelete, onClose
}: NoteContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [submenuOpenLeft, setSubmenuOpenLeft] = useState(false);
  const closeTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let newX = x;
    let newY = y;
    if (x + rect.width > window.innerWidth) newX = x - rect.width;
    if (y + rect.height > window.innerHeight) newY = y - rect.height;
    if (newX < 0) newX = 4;
    if (newY < 0) newY = 4;
    setAdjustedPos({ x: newX, y: newY });
    setSubmenuOpenLeft(x + rect.width + 180 > window.innerWidth);
  }, [x, y]);

  useEffect(() => {
    if (!submenuRef.current) return;
    const rect = submenuRef.current.getBoundingClientRect();
    const bottomMargin = 8;
    if (rect.bottom > window.innerHeight - bottomMargin) {
      const availableHeight = window.innerHeight - rect.top - bottomMargin;
      submenuRef.current.style.maxHeight = `${Math.max(availableHeight, 80)}px`;
    } else {
      submenuRef.current.style.maxHeight = '280px';
    }
  }, [activeSubmenu]);
  //cerrar menu con esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePin = useCallback(() => {
    onPin({ ...note, pinned: !note.pinned });
    onClose();
  }, [note, onPin, onClose]);

  const handleStatus = useCallback((status: NoteStatus) => {
    onSetStatus({ ...note, status });
    onClose();
  }, [note, onSetStatus, onClose]);

  const handleMoveToFolder = useCallback((folderId: number | null) => {
    onMoveToFolder(note.id, folderId);
    onClose();
  }, [note.id, onMoveToFolder, onClose]);

  const handleDuplicate = useCallback(() => {
    onDuplicate(note);
    onClose();
  }, [note, onDuplicate, onClose]);

  const handleDelete = useCallback(() => {
    onDelete(note);
    onClose();
  }, [note, onDelete, onClose]);
  const availableFolders = folders.filter(f => !f.isSystem);
  return (
    <>
      <div className="context-menu-overlay" onClick={onClose} />
      <div
        ref={menuRef}
        className="context-menu"
        style={{ left: adjustedPos.x, top: adjustedPos.y }}
      >
        {/* Pin / Unpin */}
        <div className="context-menu-item" onClick={handlePin}>
          <span className="context-menu-item-icon">
            <svg width={14} height={14} viewBox="0 0 24 24" fill={note.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
              <path d="M12 17v5" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
            </svg>
          </span>
          <span className="context-menu-item-label">{note.pinned ? 'Unpin' : 'Pin'}</span>
        </div>
        <div className="context-menu-separator" />
        {/* Set Status (submenu) */}
        <div
          className="context-menu-item has-submenu"
          onMouseEnter={() => {
            clearTimeout(closeTimerRef.current);
            setActiveSubmenu('status');
          }}
          onMouseLeave={() => {
            closeTimerRef.current = window.setTimeout(() => setActiveSubmenu(null), 150);
          }}
        >
          <span className="context-menu-item-icon">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </span>
          <span className="context-menu-item-label">Set Status</span>
          <span className="context-menu-item-chevron">▸</span>
          {activeSubmenu === 'status' && (
            <div
              ref={submenuRef}
              className={`context-submenu${submenuOpenLeft ? ' open-left' : ''}`}
              onMouseEnter={() => clearTimeout(closeTimerRef.current)}
              onMouseLeave={() => {
                closeTimerRef.current = window.setTimeout(() => setActiveSubmenu(null), 150);
              }}
            >
              {statusOptions.map(opt => (
                <div
                  key={opt.value}
                  className={`context-submenu-item${(note.status || '') === opt.value ? ' active-item' : ''}`}
                  onClick={() => handleStatus(opt.value)}
                >
                  <span className="context-submenu-check">
                    {(note.status || '') === opt.value ? '✓' : ''}
                  </span>
                  {opt.icon && (
                    <span className="status-icon" style={{ backgroundImage: `url(${opt.icon})` }} />
                  )}
                  <span>{opt.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Move to Folder (submenu) */}
        <div
          className="context-menu-item has-submenu"
          onMouseEnter={() => {
            clearTimeout(closeTimerRef.current);
            setActiveSubmenu('folder');
          }}
          onMouseLeave={() => {
            closeTimerRef.current = window.setTimeout(() => setActiveSubmenu(null), 150);
          }}
        >
          <span className="context-menu-item-icon">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <span className="context-menu-item-label">Move to Folder</span>
          <span className="context-menu-item-chevron">▸</span>
          {activeSubmenu === 'folder' && (
            <div
              ref={submenuRef}
              className={`context-submenu${submenuOpenLeft ? ' open-left' : ''}`}
              onMouseEnter={() => clearTimeout(closeTimerRef.current)}
              onMouseLeave={() => {
                closeTimerRef.current = window.setTimeout(() => setActiveSubmenu(null), 150);
              }}
            >
              <div
                className={`context-submenu-item${!note.folderId ? ' active-item' : ''}`}
                onClick={() => handleMoveToFolder(null)}
              >
                <span className="context-submenu-check">{!note.folderId ? '✓' : ''}</span>
                <span>No Folder</span>
              </div>
              {availableFolders.map(f => (
                <div
                  key={f.id}
                  className={`context-submenu-item${note.folderId === f.id ? ' active-item' : ''}`}
                  onClick={() => handleMoveToFolder(f.id)}
                >
                  <span className="context-submenu-check">{note.folderId === f.id ? '✓' : ''}</span>
                  <span>{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="context-menu-separator" />
        {/* Duplicate */}
        <div className="context-menu-item" onClick={handleDuplicate}>
          <span className="context-menu-item-icon">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </span>
          <span className="context-menu-item-label">Duplicate</span>
        </div>
        <div className="context-menu-separator" />
        {/* Delete */}
        <div className="context-menu-item danger" onClick={handleDelete}>
          <span className="context-menu-item-icon">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </span>
          <span className="context-menu-item-label">Delete</span>
        </div>
      </div>
    </>
  );
});
export default NoteContextMenu;
