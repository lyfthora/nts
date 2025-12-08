import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WindowBar from "../components/WindowBar";
import Sidebar from "../components/Sidebar";
import NotesListPanel from "../components/NotesListPanel";
import EditorPanel from "../components/EditorPanel";
import './Dashboard.css';

export default function Dashboard() {
  const [notes, setNotes] = useState<any[]>([]);
  const [view, setView] = useState('all-notes');
  const [currentId, setCurrentId] = useState<number | null>(null);
  const currentNote = useMemo(() => notes.find(n => n.id === currentId) || null, [notes, currentId]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { active: 0, onhold: 0, completed: 0, dropped: 0 };
    notes.forEach(n => { if (n.status && c.hasOwnProperty(n.status)) c[n.status]++; });
    return c;
  }, [notes]);
  const tags = useMemo(() => {
    const m: Record<string, number> = {};
    notes.forEach(n => (n.tags || []).forEach((t: string) => { m[t] = (m[t] || 0) + 1; }));
    return Object.keys(m).sort().map(name => ({ name, count: m[name] }));
  }, [notes]);
  const debRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    window.api.getAllNotes().then((ns: any[]) => { if (mounted) setNotes(ns || []); });
    return () => { mounted = false; };
  }, []);

  const filteredNotes = useMemo(() => {
    if (view === 'all-notes') return notes;
    if (view.startsWith('status-')) {
      const s = view.replace('status-', '');
      return notes.filter(n => n.status === s);
    }
    if (view.startsWith('tag-')) {
      const t = view.replace('tag-', '');
      return notes.filter(n => (n.tags || []).includes(t));
    }
    return notes;
  }, [notes, view]);

  const onAddNote = useCallback(async () => {
    const newNote = await window.api.createNoteDashboard();
    const ns = await window.api.getAllNotes();
    setNotes(ns || []);
    if (newNote) setCurrentId(newNote.id);
  }, []);

  const saveNote = useCallback((note: any) => {
    clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      await window.api.updateNote(note);
      setNotes(prev => prev.map(n => n.id === note.id ? note : n));
    }, 500);
  }, []);

  const onDelete = useCallback(async (note: any) => {
    await window.api.deleteNote(note.id);
    const ns = await window.api.getAllNotes();
    setNotes(ns || []);
    setCurrentId(null);
  }, []);

  const onChange = useCallback((note: any) => { setNotes(prev => prev.map(n => n.id === note.id ? note : n)); saveNote(note); }, [saveNote]);
  const onStatus = useCallback((note: any) => { setNotes(prev => prev.map(n => n.id === note.id ? note : n)); saveNote(note); }, [saveNote]);
  const onTagAdd = useCallback((note: any) => { setNotes(prev => prev.map(n => n.id === note.id ? note : n)); saveNote(note); }, [saveNote]);
  const onTagRemove = useCallback((note: any) => { setNotes(prev => prev.map(n => n.id === note.id ? note : n)); saveNote(note); }, [saveNote]);
  const onColor = useCallback((note: any) => { setNotes(prev => prev.map(n => n.id === note.id ? note : n)); saveNote(note); }, [saveNote]);

  const onSelect = useCallback((n: any) => setCurrentId(n.id), []);
  const onViewChange = useCallback((v: string) => setView(v), []);
  const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
  const onClose = useCallback(() => window.api.closeWindow(), []);

  return (
    <div className="dashboard-container">
      <Sidebar notes={notes} view={view} onViewChange={onViewChange} counts={counts} tags={tags} />
      <div className="main-content">
        <WindowBar onMinimize={onMinimize} onClose={onClose} />
        <div className="content-container">
          <NotesListPanel notes={filteredNotes} currentNoteId={currentId} onAddNote={onAddNote} onSelect={onSelect} />
          <EditorPanel note={currentNote} onChange={onChange} onDelete={onDelete} onStatus={onStatus} onTagAdd={onTagAdd} onTagRemove={onTagRemove} onColor={onColor} />
        </div>
      </div>
    </div>
  );
}
