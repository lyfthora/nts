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
import LinkedNotePanel from "../components/LinkedNotePanel";
import "./Dashboard.css";

export default function Dashboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadedContents, setLoadedContents] = useState<Map<number, string>>(new Map());
  const [folders, setFolders] = useState<Folder[]>([]);
  const [view, setView] = useState("all-notes");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [linkedNoteId, setLinkedNoteId] = useState<number | null>(null);
  const [folderToUpdate, setFolderToUpdate] = useState<Folder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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


  const linkedNote = useMemo<Note | null>(
    () => notes.find((n) => n.id === linkedNoteId) || null,
    [notes, linkedNoteId]
  );

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
    window.api.getAllData().then(data => {
      if (mounted) {
        setNotes(data.notes || []);
        setFolders(data.folders || []);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentId && !loadedContents.has(currentId)) {
      window.api.getNoteContent(currentId).then(content => {
        setLoadedContents(prev => new Map(prev).set(currentId, content));
        setNotes(prev => prev.map(n => {
          if (n.id === currentId && n.content === undefined) {
            return { ...n, content };
          }
          return n;
        }));
      });
    }
  }, [currentId, loadedContents]);

  useEffect(() => {
    if (linkedNoteId && !loadedContents.has(linkedNoteId)) {
      window.api.getNoteContent(linkedNoteId).then(content => {
        setLoadedContents(prev => new Map(prev).set(linkedNoteId, content));
        setNotes(prev => prev.map(n => {
          if (n.id === linkedNoteId && n.content === undefined) {
            return { ...n, content };
          }
          return n;
        }));
      });
    }
  }, [linkedNoteId, loadedContents]);

  const filteredNotes = useMemo(() => {
    let filtered: Note[] = [];

    if (view === "pinned") {

      filtered = notes.filter((n) => !n.deleted && n.pinned);
    } else if (selectedFolderId !== null) {
      if (selectedFolderId === 1) {
        filtered = notes.filter(n => !n.deleted && (n.folderId === null || n.folderId === undefined || n.folderId === 1));
      } else {
        filtered = notes.filter(n => !n.deleted && n.folderId === selectedFolderId);
      }
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
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (newNote) {
      setNotes(prev => [...prev, newNote]);
      setCurrentId(newNote.id);
    }
  }, [selectedFolderId]);

  const saveNote = useCallback((note: Note) => {
    const preview = (note.content || '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/[#*_`~\[\]]/g, '')
      .trim()
      .substring(0, 150);

    const noteWithPreview = { ...note, preview };

    setNotes((prev) => prev.map((n) => (n.id === note.id ? noteWithPreview : n)));

    if (debRef.current !== undefined) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {

      const imageRegex = /!\[.*?\]\((assets\/.*?)\)/g;
      const referencedImages: string[] = [];
      let match;
      while ((match = imageRegex.exec(note.content || '')) !== null) {
        referencedImages.push(match[1]);
      }


      if (note.images && note.images.length > 0) {
        await window.api.cleanUnusedAssets({
          noteId: note.id,
          referencedImages
        });
      }


      noteWithPreview.images = referencedImages;

      await window.api.updateNote(noteWithPreview);
    }, 200);
  }, []);

  const onDelete = useCallback(async (note: Note) => {
    await window.api.deleteNote(note.id);
    setNotes(prev => prev.map(n =>
      n.id === note.id ? { ...n, deleted: true } : n
    ));
    setCurrentId(null);
  }, []);

  const onRestore = useCallback(async (note: Note) => {
    await window.api.restoreNote(note.id);
    setNotes(prev => prev.map(n => {
      if (n.id === note.id) {
        const { deleted, ...rest } = n;
        return rest;
      }
      return n;
    }));
    setCurrentId(null);
  }, []);

  const onDeletePermanently = useCallback(async (note: Note) => {
    if (
      confirm(`Are you sure you want to delete note ${note.name} permanently?`)
    ) {
      await window.api.deleteNotePermanently(note.id);
      setNotes(prev => prev.filter(n => n.id !== note.id));
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
    const data = await window.api.getAllData();
    setFolders(data.folders || []);
    setNotes(prevNotes => {
      return (data.notes || []).map((n: Note) => {
        const existing = prevNotes.find(p => p.id === n.id);
        if (existing && existing.content !== undefined) {
          return { ...n, content: existing.content };
        }
        return n;
      });
    });
  }, []);

  const onFolderRename = useCallback(async (id: number, newName: string) => {
    if (!newName.trim()) return;

    setFolders(prev => {
      const updatedFolders = prev.map(f =>
        f.id === id ? { ...f, name: newName } : f
      );

      const folder = updatedFolders.find(f => f.id === id);
      if (folder) {
        window.api.updateFolder(folder);
      }

      return updatedFolders;
    });
  }, []);

  const onFolderDelete = useCallback(async (id: number) => {
    if (!confirm("¿Eliminar carpeta y todo su contenido?")) return;

    await window.api.deleteFolder(id);
    const data = await window.api.getAllData();
    setFolders(data.folders || []);
    setNotes(prevNotes => {
      return (data.notes || []).map((n: Note) => {
        const existing = prevNotes.find(p => p.id === n.id);
        if (existing && existing.content !== undefined) {
          return { ...n, content: existing.content };
        }
        return n;
      });
    });

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
  const handleNoteLinkClick = useCallback((noteName: string) => {
    const note = notes.find(n =>
      !n.deleted && n.name.toLowerCase() === noteName.toLowerCase()
    );

    if (note) {
      setLinkedNoteId(note.id);
      setToastMessage(null);
    } else {
      setToastMessage(`Note "${noteName}" not found`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [notes])

  const handleCloseLinkedNote = useCallback(() => {
    setLinkedNoteId(null);
  }, []);

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
            folders={folders}
            onChange={onChange}
            onDelete={onDelete}
            onRestore={onRestore}
            onDeletePermanently={onDeletePermanently}
            onStatus={onStatus}
            onTagAdd={onTagAdd}
            onTagRemove={onTagRemove}
            onPin={onPin}
            isTrashView={view === "trash"}
            onNoteLinkClick={handleNoteLinkClick}
            existingTags={tags.map(t => t.name)}
          />
          {linkedNote && (
            <LinkedNotePanel
              note={linkedNote}
              folders={folders}
              onClose={handleCloseLinkedNote}
              onChange={onChange}
              onDelete={onDelete}
              onStatus={onStatus}
              onTagAdd={onTagAdd}
              onTagRemove={onTagRemove}
              onPin={onPin}
            />
          )}
        </div>

        {toastMessage && (
          <div className="toast-notification">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
