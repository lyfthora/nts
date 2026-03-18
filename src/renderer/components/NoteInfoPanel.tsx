import React, { memo, useEffect, useState } from "react";
import type { Note, Folder } from "../types/models";
import "./NoteInfoPanel.css";


interface NoteInfoPanelProps {
  note: Note | null;
  folders: Folder[];
}

const NoteInfoPanel = memo(function NoteInfoPanel({
  note,
  folders,
}: NoteInfoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastModified, setLastModified] = useState<number>(note?.updatedAt || Date.now());

  useEffect(() => {
    if (note?.content !== undefined) {
      setLastModified(Date.now());
    }
  }, [note?.content]);

  useEffect(() => {
    if (note?.updatedAt) {
      setLastModified(note.updatedAt);
    }
  }, [note?.id]);

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
          <span className="note-info-value">{formatDate(lastModified)}</span>
        </div>
        <div className="note-info-item">
          <span className="note-info-label">Folder</span>
          <span className="note-info-value">{getFolderPath()}</span>
        </div>
      </div>
    </div>
  );
});

export default NoteInfoPanel;
