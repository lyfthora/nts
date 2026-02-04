import React, { memo, useEffect, useState } from "react";
import type { Note, Folder } from "../types/models";
import "./NoteInfoPanel.css";

interface BacklinkItem {
  id: number;
  name: string;
  preview: string;
}

interface NoteInfoPanelProps {
  note: Note | null;
  folders: Folder[];
  onBacklinkClick?: (noteName: string) => void;
}

const NoteInfoPanel = memo(function NoteInfoPanel({
  note,
  folders,
  onBacklinkClick,
}: NoteInfoPanelProps) {
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!note?.name) {
      setBacklinks([]);
      return;
    }
    window.api
      .getBacklinks(note.name)
      .then((links: BacklinkItem[]) => setBacklinks(links))
      .catch(() => setBacklinks([]));
  }, [note?.name]);

  if (!note) return null;

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFolderPath = () => {
    if (!note.folderId) return "Root";
    const path: string[] = [];
    let currentId: number | null = note.folderId;
    while (currentId !== null) {
      const folder = folders.find((f) => f.id === currentId);
      if (!folder) break;
      if (!folder.isSystem) path.unshift(folder.name);
      currentId = folder.parentId;
    }
    return path.length > 0 ? path.join(" / ") : "Root";
  };

  return (
    <div className="note-info-panel">
      <div className="note-info-content">
        <div className="note-info-item">
          <span className="note-info-label">Created</span>
          <span className="note-info-value">
            {formatDate(note.createdAt || note.id)}
          </span>
        </div>
        <div className="note-info-item">
          <span className="note-info-label">Modified</span>
          <span className="note-info-value">{formatDate(note.updatedAt)}</span>
        </div>
        <div className="note-info-item">
          <span className="note-info-label">Folder</span>
          <span className="note-info-value">{getFolderPath()}</span>
        </div>
        <div
          className="note-info-item note-info-backlinks-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className={`backlinks-arrow ${isExpanded ? "expanded" : ""}`}>▶</span>
          <span className="note-info-label">Backlinks</span>
          <span className="note-info-value">({backlinks.length})</span>
        </div>
      </div>

      {isExpanded && backlinks.length > 0 && (
        <div className="note-info-backlinks">
          {backlinks.map((link, index) => (
            <div
              key={link.id}
              className="backlink-item"
              onClick={() => onBacklinkClick?.(link.name)}
            >
              <span className="backlink-tree">
                {index === backlinks.length - 1 ? "└──" : "├──"}
              </span>
              <span className="backlink-name">{link.name}</span>
            </div>
          ))}
        </div>
      )}

      {isExpanded && backlinks.length === 0 && (
        <div className="note-info-backlinks note-info-empty">
          └── No references
        </div>
      )}
    </div>
  );
});

export default NoteInfoPanel;
