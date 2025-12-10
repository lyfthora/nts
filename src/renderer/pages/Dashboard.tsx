import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Note, Folder, StatusCounts, Tag, FolderCounts } from "../types/models";
import WindowBar from "../components/WindowBar";
import Sidebar from "../components/Sidebar";
import NotesListPanel from "../components/NotesListPanel";
import EditorPanel from "../components/EditorPanel";
import "./Dashboard.css";

export default function Dashboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [view, setView] = useState("all-notes");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [folderToUpdate, setFolderToUpdate] = useState<Folder | null>(null);
  const currentNote = useMemo<Note | null>(
    () => notes.find((n) => n.id === currentId) || null,
    [notes, currentId]
  );
  const counts = useMemo<StatusCounts>(() => {
    const activeNotes = notes.filter((n) => !n.deleted);
    const c: StatusCounts = {
      active: 0,
      onhold: 0,
      completed: 0,
      dropped: 0,
    };
    activeNotes.forEach((n) => {
      if (n.status && c.hasOwnProperty(n.status)) c[n.status]++;
    });
    return c;
  }, [notes]);

  const folderCounts = useMemo<FolderCounts>(() => {
    const counts: FolderCounts = {};
    folders.forEach(folder => {
      counts[folder.id] = notes.filter(n => !n.deleted && n.folderId === folder.id).length;
    });
    return counts;
  }, [notes, folders]);

  const tags = useMemo<Tag[]>(() => {
    const activeNotes = notes.filter((n) => !n.deleted);
    const m: Record<string, number> = {};
    activeNotes.forEach((n) =>
      (n.tags || []).forEach((t: string) => {
        m[t] = (m[t] || 0) + 1;
      })
    );
    return Object.keys(m)
      .sort()
      .map((name) => ({ name, count: m[name] }));
  }, [notes]);
  const debRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      window.api.getAllNotes(),
      window.api.getAllFolders()
    ]).then(([ns, fs]) => {
      if (mounted) {
        setNotes(ns || []);
        setFolders(fs || []);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredNotes = useMemo(() => {
    let filtered: Note[] = [];

    if (view === "pinned") {

      filtered = notes.filter((n) => !n.deleted && n.pinned);
    } else if (selectedFolderId !== null) {
      filtered = notes.filter(n => !n.deleted && n.folderId === selectedFolderId);
    } else if (view === "trash") {
      return notes.filter((n) => n.deleted === true);
    } else {
      const activeNotes = notes.filter((n) => !n.deleted);
      if (view === "all-notes") {
        filtered = activeNotes;
      } else if (view.startsWith("status-")) {
        const s = view.replace("status-", "");
        filtered = activeNotes.filter((n) => n.status === s);
      } else if (view.startsWith("tag-")) {
        const t = view.replace("tag-", "");
        filtered = activeNotes.filter((n) => (n.tags || []).includes(t));
      } else {
        filtered = activeNotes;
      }
    }


    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [notes, view, selectedFolderId]);

  const onAddNote = useCallback(async () => {
    const newNote = await window.api.createNoteDashboard();
    if (newNote && selectedFolderId) {
      newNote.folderId = selectedFolderId;
      await window.api.updateNote(newNote);
    }
    const ns = await window.api.getAllNotes();
    setNotes(ns || []);
    if (newNote) setCurrentId(newNote.id);
  }, [selectedFolderId]);

  const saveNote = useCallback((note: Note) => {
    if (debRef.current !== undefined) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      await window.api.updateNote(note);
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    }, 500);
  }, []);

  const onDelete = useCallback(async (note: Note) => {
    await window.api.deleteNote(note.id);
    const ns = await window.api.getAllNotes();
    setNotes(ns || []);
    setCurrentId(null);
  }, []);

  const onRestore = useCallback(async (notes: Note) => {
    await window.api.restoreNote(notes.id);
    const ns = await window.api.getAllNotes();
    setNotes(ns || []);
    setCurrentId(null);
  }, []);

  const onDeletePermanently = useCallback(async (note: Note) => {
    if (
      confirm(`Are you sure you want to delete note ${note.name} permanently?`)
    ) {
      await window.api.deleteNotePermanently(note.id);
      const ns = await window.api.getAllNotes();
      setNotes(ns || []);
      setCurrentId(null);
    }
  }, []);


  const onFolderSelect = useCallback((id: number) => {
    setSelectedFolderId(id);
    setView('folder');
    setCurrentId(null);
  }, []);

  const onFolderToggle = useCallback((id: number) => {
    setFolders(prev => {
      const newFolders = prev.map(f =>
        f.id === id ? { ...f, expanded: !f.expanded } : f
      );
      const updated = newFolders.find(f => f.id === id);
      if (updated) setFolderToUpdate(updated);
      return newFolders;
    });
  }, []);
  useEffect(() => {
    if (folderToUpdate) {
      const timeout = setTimeout(() => {
        window.api.updateFolder(folderToUpdate);
        setFolderToUpdate(null);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [folderToUpdate]);


  const onFolderCreate = useCallback(async (parentId: number | null, name: string) => {
    if (!name.trim()) return;

    await window.api.createFolder({ name, parentId });
    const fs = await window.api.getAllFolders();
    setFolders(fs || []);
  }, []);

  const onFolderRename = useCallback(async (id: number, newName: string) => {
    if (!newName.trim()) return;

    const folder = folders.find(f => f.id === id);
    if (folder) {
      folder.name = newName;
      await window.api.updateFolder(folder);
      const fs = await window.api.getAllFolders();
      setFolders(fs || []);
    }
  }, [folders]);

  const onFolderDelete = useCallback(async (id: number) => {
    if (!confirm("¿Eliminar carpeta y todo su contenido?")) return;

    await window.api.deleteFolder(id);
    const fs = await window.api.getAllFolders();
    const ns = await window.api.getAllNotes();
    setFolders(fs || []);
    setNotes(ns || []);

    if (selectedFolderId === id) {
      setSelectedFolderId(null);
      setView('all-notes');
    }
  }, [selectedFolderId]);


  const onViewChange = useCallback((v: string) => {
    setView(v);
    setSelectedFolderId(null);
  }, []);

  const onChange = useCallback(
    (note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote]
  );
  const onStatus = useCallback(
    (note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote]
  );
  const onTagAdd = useCallback(
    (note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote]
  );
  const onTagRemove = useCallback(
    (note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote]
  );
  const onColor = useCallback(
    (note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote]
  );

  const onPin = useCallback(
    (note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote]
  );

  const onSelect = useCallback((n: Note) => setCurrentId(n.id), []);
  const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
  const onClose = useCallback(() => window.api.closeWindow(), []);

  return (
    <div className="dashboard-container">
      <Sidebar
        notes={notes}
        folders={folders}
        view={view}
        selectedFolderId={selectedFolderId}
        onViewChange={onViewChange}
        onFolderSelect={onFolderSelect}
        folderCounts={folderCounts}
        onFolderToggle={onFolderToggle}
        onFolderCreate={onFolderCreate}
        onFolderDelete={onFolderDelete}
        onFolderRename={onFolderRename}
        counts={counts}
        tags={tags}
      />
      <div className="main-content">
        <WindowBar onMinimize={onMinimize} onClose={onClose} />
        <div className="content-container">
          <NotesListPanel
            notes={filteredNotes}
            currentNoteId={currentId}
            onAddNote={onAddNote}
            onSelect={onSelect}
            isTrashView={view === 'trash'}
            title={
              view === 'trash' ? 'Trash' :
                view === 'pinned' ? 'Pinned Notes' :
                  view === 'all-notes' ? 'All Notes' :
                    view.startsWith('status-') ? view.replace('status-', '').charAt(0).toUpperCase() + view.replace('status-', '').slice(1) :
                      view.startsWith('tag-') ? `#${view.replace('tag-', '')}` :
                        'Notes'
            }
          />
          <EditorPanel
            note={currentNote}
            onChange={onChange}
            onDelete={onDelete}
            onRestore={onRestore}
            onDeletePermanently={onDeletePermanently}
            onStatus={onStatus}
            onTagAdd={onTagAdd}
            onTagRemove={onTagRemove}
            onPin={onPin}
            onColor={onColor}
            isTrashView={view === "trash"}
          />
        </div>

      </div>
    </div>
  );
}
