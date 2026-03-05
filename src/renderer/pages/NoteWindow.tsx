import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Note, Folder } from "../types/models";
import WindowBar from "../components/WindowBar";
import EditorPanel from "../components/EditorPanel";
import "./NoteWindow.css";

export default function NoteWindow() {
  const [note, setNote] = useState<Note | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const debRef = useRef<number | undefined>(undefined);
  // pedi rlos datos cuento el componente este reddy
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const noteId = Number(params.get("noteId"));
    if (!noteId) return;
    window.api.getNoteWindowData(noteId).then((data) => {
      if (data.note) {
        setNote(data.note);
      }
      setFolders(data.folders || []);
    });
  }, []);

  useEffect(() => {
    const cleanup = window.api.onDashboardNoteChanged((updatedNote: Note) => {
      setNote(updatedNote);
    });
    return cleanup;
  }, []);

  const saveNote = useCallback((updatedNote: Note) => {
    const preview = (updatedNote.content || '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/[#*_`~\[\]]/g, '')
      .trim()
      .substring(0, 150);
    const hasDrawingData = updatedNote.noteType === 'drawing' && updatedNote.drawingData
      ? (() => { try { const d = JSON.parse(updatedNote.drawingData); return !!(d.strokes && d.strokes.length > 0); } catch { return false; } })()
      : updatedNote.hasDrawingData;
    const noteWithPreview = { ...updatedNote, preview, updatedAt: Date.now(), hasDrawingData };
    setNote(noteWithPreview);
    if (debRef.current !== undefined) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      window.api.sendNoteChange(noteWithPreview);
    }, 200);
  }, []);
  const onChange = useCallback((updatedNote: Note) => {
    setNote(updatedNote);
    saveNote(updatedNote);
  }, [saveNote]);
  const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
  const onClose = useCallback(() => window.api.closeWindow(), []);
  const noop = useCallback(() => { }, []);
  const noopNote = useCallback((_n: Note) => { }, []);
  return (
    <div className="note-window-container">
      <WindowBar onMinimize={onMinimize} onClose={onClose} />
      <EditorPanel
        key={`ext-${note?.id}-${note?.noteType}`}
        note={note}
        folders={folders}
        onChange={onChange}
        onDelete={noopNote}
        onStatus={noopNote}
        onTagAdd={noopNote}
        onTagRemove={noopNote}
        onPin={noopNote}
        isExternalWindow
      />
    </div>
  );
}
