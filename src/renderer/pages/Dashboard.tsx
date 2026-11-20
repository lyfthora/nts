import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Note,
  Folder,
  StatusCounts,
  Tag,
  FolderCounts,
  SubscriptionStatus,
} from "../types/models";
import WindowBar from "../components/WindowBar";
import Sidebar from "../components/Sidebar";
import NotesListPanel from "../components/NotesListPanel";
import EditorPanel from "../components/EditorPanel";
import LinkedNotePanel from "../components/LinkedNotePanel";
import "./Dashboard.css";
import FolderSearchModal from "../components/FolderSearchModal";
import ConfirmModal from "../components/ConfirmModal";
import SubscriptionModal from "../components/SubscriptionModal";
import ProgressToast from "../components/ProgressToast";
const BrainGraph = React.lazy(() => import("../components/BrainGraph"));
import type { ProgressData } from "../types/models";
import { apiClient } from "../services/apiClient";
import { getSubscriptionSummary, getSubscriptionAction, getPremiumRejectionMessage } from "../utils/subscription";
import { getCachedContent, setCachedContent } from "../utils/contentCache";

// Devuelve la misma referencia mientras el valor sea equivalente: evita que
// Sidebar vuelva a medir el layout en cada guardado mientras se escribe.
function useStableValue<T>(value: T, isEqual: (a: T, b: T) => boolean): T {
  const ref = useRef(value);
  if (!isEqual(ref.current, value)) ref.current = value;
  return ref.current;
}

// Cada emisión del store llega como objetos nuevos (el preload los copia), así
// que la lista, el sidebar y la nota activa se repintaban aunque nada hubiera
// cambiado. Se reutiliza el objeto anterior cuando los datos son equivalentes.
function recordsEqual(a: object, b: object): boolean {
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  keys.delete("content");
  keys.delete("drawingData");
  for (const key of keys) {
    if (!Object.is(left[key], right[key])) return false;
  }
  // El contenido cargado en memoria sí importa (puede venir de otra ventana o
  // de la API). Cuando está desalojado (`undefined`) se ignora, para que una
  // emisión no vuelva a hidratar las notas que el editor acaba de vaciar.
  for (const field of ["content", "drawingData"]) {
    const previous = left[field];
    if (previous !== undefined && previous !== right[field]) return false;
  }
  return true;
}

function reconcileById<T extends { id: number }>(
  prev: T[],
  incoming: T[],
  isEqual: (a: T, b: T) => boolean = recordsEqual,
): T[] {
  if (prev === incoming) return prev;
  const previousById = new Map(prev.map((item) => [item.id, item]));
  let changed = prev.length !== incoming.length;
  const next = incoming.map((item) => {
    const previous = previousById.get(item.id);
    if (previous && isEqual(previous, item)) return previous;
    changed = true;
    return item;
  });
  if (!changed) {
    for (let i = 0; i < next.length; i++) {
      if (next[i] !== prev[i]) {
        changed = true;
        break;
      }
    }
  }
  return changed ? next : prev;
}

interface DashboardProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
  isPremium: boolean;
  onAccessChanged: (access: boolean) => void;
}
export default function Dashboard({ userName, userEmail, onLogout, isPremium, onAccessChanged }: DashboardProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [view, setView] = useState("all-notes");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [graphTag, setGraphTag] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [linkedNoteId, setLinkedNoteId] = useState<number | null>(null);
  const [folderToUpdate, setFolderToUpdate] = useState<Folder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("error");


  const showErrorToast = useCallback((msg: string) => {
    setToastType("error");
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const safeUpdate = useCallback(
    async <T,>(operation: () => Promise<T>, errorMsg: string): Promise<T | null> => {
      try {
        return await operation();
      } catch (err) {
        console.error(errorMsg, err);
        showErrorToast(`Error: ${errorMsg}`);
        return null;
      }
    },
    [showErrorToast]
  );
  const [isFolderSearchOpen, setIsFolderSearchOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [externalNoteIds, setExternalNoteIds] = useState<Set<number>>(
    new Set(),
  );
  const [folderToDelete, setFolderToDelete] = useState<number | null>(null);
  const [noteToDeletePermanently, setNoteToDeletePermanently] =
    useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [isSettingsView, setIsSettingsView] = useState(false);
  const [settingsSection, setSettingsSection] =
    useState<"account">("account");

  const handleOpenSettings = useCallback(() => {
    setIsSettingsView(true);
    setSettingsSection("account");
  }, []);
  const handleCloseSettings = useCallback(() => {
    setIsSettingsView(false);
  }, []);
  const handleSettingsSectionChange = useCallback((section: "account") => {
    setSettingsSection(section);
  }, []);
  const currentNote = useMemo<Note | null>(
    () => notes.find((n) => n.id === currentId) || null,
    [notes, currentId],
  );

  const computedCounts = useMemo<StatusCounts>(() => {
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

  // Sidebar está memoizado: recibe escalares (y la hora redondeada al minuto)
  // para que escribir una nota no lo vuelva a renderizar en cada guardado.
  const sidebarStats = useMemo(() => {
    let allNotes = 0;
    let pinned = 0;
    let trash = 0;
    let lastSync = 0;
    for (const n of notes) {
      if (n.deleted) {
        trash++;
        continue;
      }
      allNotes++;
      if (n.pinned) pinned++;
      const t = n.updatedAt;
      if (!t) continue;
      const ms =
        typeof t === "number" ? t : new Date(t as unknown as string).getTime();
      if (Number.isFinite(ms) && ms > lastSync) lastSync = ms;
    }
    return {
      allNotes,
      pinned,
      trash,
      lastSync: Math.floor(lastSync / 60000) * 60000,
    };
  }, [notes]);

  const counts = useStableValue(
    computedCounts,
    (a, b) =>
      a.active === b.active &&
      a.onhold === b.onhold &&
      a.completed === b.completed &&
      a.dropped === b.dropped,
  );

  const linkedNote = useMemo<Note | null>(
    () => notes.find((n) => n.id === linkedNoteId) || null,
    [notes, linkedNoteId],
  );

  const computedFolderCounts = useMemo<FolderCounts>(() => {
    // 1. Count direct notes per folder in a single pass over notes
    const directCounts: Record<number, number> = {};
    folders.forEach((f) => {
      directCounts[f.id] = 0;
    });

    notes.forEach((n) => {
      if (n.deleted) return;
      let folderId = n.folderId;
      if (folderId === null || folderId === undefined || folderId === 1) {
        folderId = 1;
      }
      if (directCounts[folderId] !== undefined) {
        directCounts[folderId]++;
      } else {
        directCounts[folderId] = (directCounts[folderId] || 0) + 1;
      }
    });

    // 2. Build parent -> children folder lookup map
    const childrenMap: Record<number, number[]> = {};
    folders.forEach((f) => {
      if (f.parentId !== null && f.parentId !== undefined) {
        if (!childrenMap[f.parentId]) {
          childrenMap[f.parentId] = [];
        }
        childrenMap[f.parentId].push(f.id);
      }
    });

    // 3. Memoized calculation for descendant note counts
    const descendantCountsMemo: Record<number, number> = {};
    const visiting = new Set<number>();
    const getDescendantCount = (folderId: number): number => {
      if (descendantCountsMemo[folderId] !== undefined) {
        return descendantCountsMemo[folderId];
      }
      if (visiting.has(folderId)) {
        return 0;
      }
      visiting.add(folderId);
      let total = 0;
      const children = childrenMap[folderId] || [];
      for (const childId of children) {
        total += (directCounts[childId] || 0) + getDescendantCount(childId);
      }
      visiting.delete(folderId);
      descendantCountsMemo[folderId] = total;
      return total;
    };

    // 4. Compute final counts per folder
    const counts: FolderCounts = {};
    folders.forEach((folder) => {
      const directCount = directCounts[folder.id] || 0;
      if (!folder.expanded) {
        counts[folder.id] = directCount + getDescendantCount(folder.id);
      } else {
        counts[folder.id] = directCount;
      }
    });
    return counts;
  }, [notes, folders]);

  const folderCounts = useStableValue(computedFolderCounts, (a, b) => {
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every((key) => a[Number(key)] === b[Number(key)]);
  });

  const computedTags = useMemo<Tag[]>(() => {
    const activeNotes = notes.filter((n) => !n.deleted);
    const m: Record<string, number> = {};
    activeNotes.forEach((n) =>
      (n.tags || []).forEach((t: string) => {
        m[t] = (m[t] || 0) + 1;
      }),
    );
    return Object.keys(m)
      .sort()
      .map((name) => ({ name, count: m[name] }));
  }, [notes]);

  const tags = useStableValue(
    computedTags,
    (a, b) => a.length === b.length && a.every((tag, i) => tag.name === b[i].name && tag.count === b[i].count),
  );

  // `tags.map(...)` crea un arreglo nuevo en cada render y rompía el memo de
  // EditorPanel, que así se repintaba (con su TOC y su preview) en cada guardado.
  const existingTagNames = useMemo(() => tags.map((t) => t.name), [tags]);
  const saveTimersRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    let mounted = true;
    const cached = window.api.getCachedData();
    if (cached) {
      setNotes(cached.notes || []);
      setFolders(cached.folders || []);
      setIsLoading(false);
    }
    window.api
      .getAllData()
      .then((data) => {
        if (mounted) {
          setNotes(data.notes || []);
          setFolders(data.folders || []);
          window.api.setCachedData(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    const unsubscribeOfflineData = window.api.onOfflineDataChanged((data) => {
      if (!mounted) return;
      setNotes((prev) => reconcileById(prev, data.notes || []));
      setFolders((prev) => reconcileById(prev, data.folders || []));
    });
    return () => {
      mounted = false;
      unsubscribeOfflineData();
    };
  }, []);

  const fetchedNotesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!currentId) return;

    const note = notes.find((n) => n.id === currentId);
    if (!note) return;

    const noteType = note.noteType || "text";

    // 1. Cargar del caché local inmediatamente si no está en RAM
    if (noteType === "drawing") {
      if (note.drawingData === undefined) {
        const cached = getCachedContent(currentId, "drawing");
        if (cached !== null) {
          setNotes((prev) =>
            prev.map((n) => (n.id === currentId ? { ...n, drawingData: cached } : n))
          );
        }
      }
    } else {
      if (note.content === undefined) {
        const cached = getCachedContent(currentId, "text");
        if (cached !== null) {
          setNotes((prev) =>
            prev.map((n) => (n.id === currentId ? { ...n, content: cached } : n))
          );
        }
      }
    }

    // 2. Fetch en segundo plano desde la API si no se ha buscado en esta sesión
    if (!fetchedNotesRef.current.has(currentId)) {
      fetchedNotesRef.current.add(currentId);
      if (noteType === "drawing") {
        window.api.getDrawingData(currentId).then((drawingData) => {
          const val = drawingData || "";
          setCachedContent(currentId, val, "drawing");
          setNotes((prev) =>
            prev.map((n) => (n.id === currentId && n.drawingData === undefined ? { ...n, drawingData: val } : n))
          );
        }).catch(() => fetchedNotesRef.current.delete(currentId));
      } else {
        window.api.getNoteContent(currentId).then((content) => {
          const val = content || "";
          setCachedContent(currentId, val, "text");
          setNotes((prev) =>
            prev.map((n) => (n.id === currentId && n.content === undefined ? { ...n, content: val } : n))
          );
        }).catch(() => fetchedNotesRef.current.delete(currentId));
      }
    }

  }, [currentId, notes, linkedNoteId]);

  // 3. Desalojar de memoria el contenido de las demás notas. Está separado del
  // efecto anterior porque, al depender de `notes`, lanzaba un render extra en
  // cada guardado; ahora solo reacciona al cambio de nota y devuelve el mismo
  // estado cuando no hay nada que desalojar.
  useEffect(() => {
    if (!currentId) return;
    setNotes((prev) => {
      let changed = false;
      const next = prev.map((n) => {
        if (
          n.id !== currentId &&
          n.id !== linkedNoteId &&
          (n.content !== undefined || n.drawingData !== undefined)
        ) {
          changed = true;
          return { ...n, content: undefined, drawingData: undefined };
        }
        return n;
      });
      return changed ? next : prev;
    });
  }, [currentId, linkedNoteId]);

  useEffect(() => {
    if (!linkedNoteId) return;

    const note = notes.find((n) => n.id === linkedNoteId);
    if (!note) return;

    if (note.content === undefined) {
      const cached = getCachedContent(linkedNoteId, "text");
      if (cached !== null) {
        setNotes((prev) =>
          prev.map((n) => (n.id === linkedNoteId ? { ...n, content: cached } : n))
        );
      }
    }

    if (!fetchedNotesRef.current.has(linkedNoteId)) {
      fetchedNotesRef.current.add(linkedNoteId);
      window.api.getNoteContent(linkedNoteId).then((content) => {
        const val = content || "";
        setCachedContent(linkedNoteId, val, "text");
        setNotes((prev) =>
          prev.map((n) => (n.id === linkedNoteId && n.content === undefined ? { ...n, content: val } : n))
        );
      }).catch(() => fetchedNotesRef.current.delete(linkedNoteId));
    }
  }, [linkedNoteId, notes]);

  useEffect(() => {
    const cleanupChanged = window.api.onExternalNoteChanged((note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    });
    const cleanupClosed = window.api.onNoteWindowClosed((noteId: number) => {
      setExternalNoteIds((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    });
    return () => {
      cleanupChanged();
      cleanupClosed();
    };
  }, []);

  useEffect(() => {
    const cleanup = window.api.onExportImportProgress((data: ProgressData) => {
      setProgressData(data);
    });
    return cleanup;
  }, []);

  const filteredNotes = useMemo(() => {
    let filtered: Note[] = [];

    if (view === "pinned") {
      filtered = notes.filter((n) => !n.deleted && n.pinned);
    } else if (selectedFolderId !== null) {
      if (selectedFolderId === 1) {
        filtered = notes.filter(
          (n) =>
            !n.deleted &&
            (n.folderId === null ||
              n.folderId === undefined ||
              n.folderId === 1),
        );
      } else {
        filtered = notes.filter(
          (n) => !n.deleted && n.folderId === selectedFolderId,
        );
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

  const onAddNote = useCallback(
    async (noteType: "text" | "drawing" = "text") => {
      const newNote = await safeUpdate(
        () => window.api.createNoteDashboard(),
        "Could not create note"
      );
      if (newNote && selectedFolderId) {
        newNote.folderId = selectedFolderId;
        newNote.noteType = noteType;
        await safeUpdate(
          () => window.api.updateNote(newNote),
          "Could not save note"
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (newNote) {
        newNote.noteType = noteType;
        fetchedNotesRef.current.add(newNote.id);
        // createNote ya emite la nota desde el store local; insertarla solo si no existe
        setNotes((prev) =>
          prev.some((n) => n.id === newNote.id)
            ? prev.map((n) => (n.id === newNote.id ? { ...n, ...newNote } : n))
            : [...prev, newNote],
        );
        setCurrentId(newNote.id);
      }
    },
    [selectedFolderId, safeUpdate],
  );

  const handleAddTextNote = useCallback(() => onAddNote("text"), [onAddNote]);

  const saveNote = useCallback((note: Note) => {
    // La persistencia local se agenda más abajo, una sola vez por ráfaga de tecleo
    const durableNote = {
      ...note,
      preview: (note.content || "").replace(/!\\[.*?\\]\\(.*?\\)/g, "").replace(/[#*_`~\\[\\]]/g, "").trim().substring(0, 150),
      updatedAt: Date.now(),
      ...(note.noteType === "drawing" && note.drawingData !== undefined ? { drawingData: note.drawingData } : {}),
    };
    if (note.noteType !== "drawing" && note.content !== undefined) {
      setCachedContent(note.id, note.content, "text");
    }

    // Asegurar que no hagamos fetch en segundo plano de lo que acabamos de guardar
    fetchedNotesRef.current.add(note.id);

    const hasDrawingData =
      note.noteType === "drawing" && note.drawingData
        ? (() => {
          try {
            const d = JSON.parse(note.drawingData);
            return !!(d.strokes && d.strokes.length > 0);
          } catch {
            return false;
          }
        })()
        : note.hasDrawingData;
    const noteWithPreview = {
      ...durableNote,
      hasDrawingData,
    };

    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? noteWithPreview : n)),
    );

    const pending = saveTimersRef.current;
    const scheduled = pending.get(note.id);
    if (scheduled !== undefined) clearTimeout(scheduled);
    pending.set(
      note.id,
      window.setTimeout(async () => {
        pending.delete(note.id);

        const imageRegex = /!\[.*?\]\((assets\/.*?)\)/g;
        const referencedImages: string[] = [];
        let match;
        while ((match = imageRegex.exec(note.content || "")) !== null) {
          referencedImages.push(match[1]);
        }
        noteWithPreview.images = referencedImages;

        // `updateNote` ya persiste en el store local y encola la subida, así
        // que se guarda una sola vez por ráfaga: cada escritura del store es un
        // fsync síncrono sobre el hilo de la UI.
        const saved = await safeUpdate(
          () => window.api.updateNote(noteWithPreview),
          "Could not save note locally. Changes may be lost if the app closes."
        );
        if (!saved) return;

        if (note.images && note.images.length > 0 && navigator.onLine) {
          try {
            await window.api.cleanUnusedAssets({
              noteId: note.id,
              referencedImages,
            });
          } catch {
            // Limpiar assets no debe impedir que la nota quede guardada.
          }
        }
      }, 250),
    );
  }, [safeUpdate]);

  const onDelete = useCallback(async (note: Note) => {
    const result = await safeUpdate(
      () => window.api.deleteNote(note.id),
      "Could not move note to trash"
    );
    if (result) {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, deleted: true } : n)),
      );
      setCurrentId(null);
    }
  }, [safeUpdate]);

  const onRestore = useCallback(async (note: Note) => {
    const result = await safeUpdate(
      () => window.api.restoreNote(note.id),
      "Could not restore note"
    );
    if (result) {
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id === note.id) {
            const { deleted, ...rest } = n;
            return rest;
          }
          return n;
        }),
      );
      setCurrentId(null);
    }
  }, [safeUpdate]);

  const onDeletePermanently = useCallback(async (note: Note) => {
    setNoteToDeletePermanently(note);
  }, []);
  const handleConfirmDeletePermanently = useCallback(async () => {
    if (!noteToDeletePermanently) return;
    const result = await safeUpdate(
      () => window.api.deleteNotePermanently(noteToDeletePermanently.id),
      "Could not permanently delete note"
    );
    if (result) {
      setNotes((prev) => prev.filter((n) => n.id !== noteToDeletePermanently.id));
      setCurrentId(null);
    }
    setNoteToDeletePermanently(null);
  }, [noteToDeletePermanently, safeUpdate]);

  const onFolderSelect = useCallback((id: number) => {
    setSelectedFolderId(id);
    setView("folder");
    setCurrentId(null);
  }, []);

  const onFolderSearchSelect = useCallback(
    (folderId: number) => {
      setIsFolderSearchOpen(false);
      onFolderSelect(folderId);
    },
    [onFolderSelect],
  );

  const onFolderToggle = useCallback((id: number) => {
    setFolders((prev) => {
      const newFolders = prev.map((f) =>
        f.id === id ? { ...f, expanded: !f.expanded } : f,
      );
      const updated = newFolders.find((f) => f.id === id);
      if (updated) setFolderToUpdate(updated);
      return newFolders;
    });
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setIsFolderSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
        e.preventDefault();
        onAddNote("drawing");
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onAddNote]);

  useEffect(() => {
    if (folderToUpdate) {
      const timeout = setTimeout(async () => {
        await safeUpdate(
          () => window.api.updateFolder(folderToUpdate),
          "Could not update folder"
        );
        setFolderToUpdate(null);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [folderToUpdate, safeUpdate]);

  const onFolderCreate = useCallback(
    async (parentId: number | null, name: string) => {
      if (!name.trim()) return;

      const newFolder = await safeUpdate(
        () => window.api.createFolder({ name, parentId }),
        "Could not create folder"
      );
      if (!newFolder) return;

      const data = await safeUpdate(
        () => window.api.getAllData(),
        "Could not refresh data"
      );
      if (data) {
        setFolders(data.folders || []);
        setNotes((prevNotes) => {
          return (data.notes || []).map((n: Note) => {
            const existing = prevNotes.find((p) => p.id === n.id);
            if (existing && existing.content !== undefined) {
              return { ...n, content: existing.content };
            }
            return n;
          });
        });
      }
    },
    [safeUpdate],
  );

  const onFolderRename = useCallback(async (id: number, newName: string) => {
    if (!newName.trim()) return;

    const originalFolder = folders.find((f) => f.id === id);
    if (!originalFolder) return;

    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
    );

    const result = await safeUpdate(
      () => window.api.updateFolder({ ...originalFolder, name: newName }),
      "Could not rename folder"
    );

    if (!result) {
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? originalFolder : f))
      );
    }
  }, [folders, safeUpdate]);

  const onFolderDelete = useCallback((id: number) => {
    setFolderToDelete(id);
  }, []);
  const handleConfirmFolderDelete = useCallback(async () => {
    if (folderToDelete === null) return;
    const id = folderToDelete;
    setFolderToDelete(null);
    const result = await safeUpdate(
      () => window.api.deleteFolder(id),
      "Could not delete folder"
    );
    if (result) {
      const data = await safeUpdate(
        () => window.api.getAllData(),
        "Could not refresh data"
      );
      if (data) {
        setFolders(data.folders || []);
        setNotes((prevNotes) => {
          return (data.notes || []).map((n: Note) => {
            const existing = prevNotes.find((p) => p.id === n.id);
            if (existing && existing.content !== undefined) {
              return { ...n, content: existing.content };
            }
            return n;
          });
        });
      }
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
        setView("all-notes");
      }
    }
  }, [folderToDelete, selectedFolderId, safeUpdate]);

  const onViewChange = useCallback((v: string) => {
    setView(v);
    setSelectedFolderId(null);
  }, []);

  const onChange = useCallback(
    (note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote],
  );
  const onStatus = useCallback(
    (note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote],
  );
  const onTagAdd = useCallback(
    (note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote],
  );
  const onTagRemove = useCallback(
    (note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote],
  );
  const handleNoteLinkClick = useCallback(
    (noteName: string) => {
      const note = notes.find(
        (n) => !n.deleted && n.name.toLowerCase() === noteName.toLowerCase(),
      );

      if (note) {
        setLinkedNoteId(note.id);
        setToastMessage(null);
      } else {
        setToastMessage(`Note "${noteName}" not found`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    },
    [notes],
  );

  const handleCloseLinkedNote = useCallback(() => {
    setLinkedNoteId(null);
  }, []);

  const handleLinkedNotePopOut = useCallback(async () => {
    if (!linkedNote) return;
    const [winX, winY] = await window.api.getWindowPosition();
    const [winW] = await window.api.getWindowSize();
    await window.api.openNoteWindow(linkedNote.id, winX + winW, winY + 50);
    setExternalNoteIds((prev) => new Set(prev).add(linkedNote.id));
    setLinkedNoteId(null);
  }, [linkedNote]);

  const onPin = useCallback(
    (note: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote],
  );

  const onDuplicate = useCallback(async (note: Note) => {
    const newNote = await safeUpdate(
      () => window.api.createNoteDashboard(),
      "Could not create note"
    );
    if (!newNote) return;

    const content = note.content ?? getCachedContent(note.id, "text") ?? undefined;
    const drawingData = note.drawingData ?? getCachedContent(note.id, "drawing") ?? undefined;

    const duplicated: Note = {
      ...newNote,
      name: `${note.name || "Untitled"} (copy)`,
      content,
      drawingData,
      preview: note.preview,
      status: note.status,
      tags: note.tags ? [...note.tags] : [],
      folderId: note.folderId,
      color: note.color,
      noteType: note.noteType,
    };
    const result = await safeUpdate(
      () => window.api.updateNote(duplicated),
      "Could not duplicate note"
    );
    if (result) {
      setNotes((prev) =>
        prev.some((n) => n.id === duplicated.id)
          ? prev.map((n) => (n.id === duplicated.id ? { ...n, ...duplicated } : n))
          : [...prev, duplicated],
      );
      setCurrentId(duplicated.id);
    }
  }, [safeUpdate]);

  const onExport = useCallback(async (note: Note, format: "json" | "md") => {
    if (!isPremium) {
      setToastMessage("Premium feature — subscribe to export notes");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    const result = await window.api.exportNote(note.id, format);
    const rejection = getPremiumRejectionMessage(result?.code, "export");
    if (rejection) showErrorToast(rejection);
  }, [isPremium, showErrorToast]);

  const onImport = useCallback(async () => {
    if (!isPremium) {
      setToastMessage("Premium feature — subscribe to import notes");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    const result = await window.api.importNote();
    if (!result?.success) {
      const rejection = getPremiumRejectionMessage(result?.code, "import");
      if (rejection) showErrorToast(rejection);
      return;
    }
    const data = await window.api.getAllData();
    setFolders(data.folders || []);
    setNotes((prevNotes) => {
      return (data.notes || []).map((n: Note) => {
        const existing = prevNotes.find((p) => p.id === n.id);
        if (existing && existing.content !== undefined) {
          return { ...n, content: existing.content };
        }
        return n;
      });
    });
    if (result.notes && result.notes.length > 0) {
      setCurrentId(result.notes[0].id);
    } else if (result.note) {
      setCurrentId(result.note.id);
    }
  }, [isPremium, showErrorToast]);

  const onMoveToFolder = useCallback(
    async (noteId: number, folderId: number | null) => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      const updatedNote = { ...note, folderId };
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updatedNote : n)));
      const result = await safeUpdate(
        () => window.api.updateNote(updatedNote),
        "Could not move note to folder"
      );
      if (!result) {
        setNotes((prev) => prev.map((n) => (n.id === noteId ? note : n)));
      }
    },
    [notes, safeUpdate],
  );

  const onNoteTypeChange = useCallback(
    (noteType: "text" | "drawing") => {
      if (!currentNote) return;
      const updatedNote = { ...currentNote, noteType };
      setNotes((prev) =>
        prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)),
      );
      saveNote(updatedNote);
    },
    [currentNote, saveNote],
  );

  const handlePopOut = useCallback(
    async (noteId: number, screenX: number, screenY: number) => {
      await window.api.openNoteWindow(noteId, screenX, screenY);
      setExternalNoteIds((prev) => new Set(prev).add(noteId));
      if (currentId === noteId) {
        setCurrentId(null);
      }
    },
    [currentId],
  );

  const panelTitle = useMemo(() => {
    const titleMap: Record<string, string> = {
      trash: "Trash",
      pinned: "Pinned Notes",
      "all-notes": "All Notes",
    };

    if (titleMap[view]) return titleMap[view];

    if (view.startsWith("status-")) {
      const status = view.replace("status-", "");
      return status.charAt(0).toUpperCase() + status.slice(1);
    }

    if (view.startsWith("tag-")) {
      return `#${view.replace("tag-", "")}`;
    }

    return "Notes";
  }, [view]);

  const onNoteDrop = useCallback(
    async (noteId: number, targetFolderId: number) => {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        const updatedNote = { ...note, folderId: targetFolderId };
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? updatedNote : n)),
        );
        const result = await safeUpdate(
          () => window.api.updateNote(updatedNote),
          "Could not drop note in folder"
        );
        if (!result) {
          setNotes((prev) =>
            prev.map((n) => (n.id === noteId ? note : n)),
          );
        }
      }
    },
    [notes, safeUpdate],
  );

  const onFolderDrop = useCallback(
    async (folderId: number, targetFolderId: number | null) => {
      const folder = folders.find((f) => f.id === folderId);
      if (folder) {
        const updatedFolder = { ...folder, parentId: targetFolderId };
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? updatedFolder : f)),
        );
        const result = await safeUpdate(
          () => window.api.updateFolder(updatedFolder),
          "Could not move folder"
        );
        if (!result) {
          setFolders((prev) =>
            prev.map((f) => (f.id === folderId ? folder : f)),
          );
        }
      }
    },
    [folders, safeUpdate],
  );

  const loadSubscriptionStatus = useCallback(async () => {
    const status = await apiClient.getSubscriptionStatus();
    setSubscriptionStatus(status);
    return status;
  }, []);

  useEffect(() => {
    if (isSettingsView && !subscriptionStatus && !isSubscriptionLoading) {
      setIsSubscriptionLoading(true);
      loadSubscriptionStatus()
        .catch(() =>
          setSubscriptionError("Could not load subscription details.")
        )
        .finally(() => setIsSubscriptionLoading(false));
    }
  }, [isSettingsView, subscriptionStatus, isSubscriptionLoading, loadSubscriptionStatus]);

  useEffect(() => {
    const cleanup = window.api.onPaymentEvent(async (data) => {
      if (data.status === "success") {
        setToastType("success");
        setToastMessage("Payment succeeded! Updating subscription...");
        setIsSubscriptionModalOpen(false);
        setIsSubscriptionLoading(true);
        try {
          const nextStatus = await loadSubscriptionStatus();
          if (nextStatus.status === "active") {
            setIsSubscriptionLoading(false);
            onAccessChanged(true);
            setToastType("success");
            setToastMessage("Premium activated successfully!");
            setTimeout(() => setToastMessage(null), 3000);
            return;
          }
          let attempt = 0;
          const interval = setInterval(async () => {
            attempt++;
            try {
              const s = await loadSubscriptionStatus();
              if (s.status === "active") {
                clearInterval(interval);
                setIsSubscriptionLoading(false);
                onAccessChanged(true);
                setToastType("success");
                setToastMessage("Premium activated successfully!");
                setTimeout(() => setToastMessage(null), 3000);
              } else if (attempt === 5) {
                setToastType("success");
                setToastMessage("Waiting for payment confirmation...");
              } else if (attempt >= 15) {
                // Sin confirmación del backend no se concede acceso.
                clearInterval(interval);
                setIsSubscriptionLoading(false);
                setToastType("error");
                setToastMessage("We couldn't confirm the payment yet. Check your status in Settings.");
                setTimeout(() => setToastMessage(null), 6000);
              }
            } catch {
              // Network error during poll — keep trying
              if (attempt >= 15) {
                clearInterval(interval);
                setIsSubscriptionLoading(false);
                setToastType("error");
                setToastMessage("Could not confirm payment. Please refresh in Settings.");
                setTimeout(() => setToastMessage(null), 5000);
              }
            }
          }, 3000);
        } catch (err) {
          setIsSubscriptionLoading(false);
          setToastMessage("Error refreshing subscription status.");
          setTimeout(() => setToastMessage(null), 3000);
        }
      } else if (data.status === "cancel") {
        setToastMessage("Subscription process was canceled.");
        setIsSubscriptionModalOpen(false);
        setTimeout(() => setToastMessage(null), 3000);
      }
    });
    return cleanup;
  }, [loadSubscriptionStatus, onAccessChanged]);

  const handleSubscriptionPrimaryAction = useCallback(async () => {
    setIsSubscriptionLoading(true);
    setSubscriptionError("");

    try {
      const status = subscriptionStatus ?? (await loadSubscriptionStatus());
      const action = getSubscriptionAction(status.status);
      const { url } =
        action.mode === "portal"
          ? await apiClient.createPortalSession()
          : await apiClient.createCheckoutSession();
      window.api.openExternal(url);
    } catch {
      setSubscriptionError(
        "Could not open the subscription flow. Please try again.",
      );
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, [loadSubscriptionStatus, subscriptionStatus]);

  const handleRefreshSubscriptionStatus = useCallback(async () => {
    setIsSubscriptionLoading(true);
    setSubscriptionError("");

    try {
      const status = await loadSubscriptionStatus();
      if (status.status === "active") {
        onAccessChanged(true);
      }
    } catch {
      setSubscriptionError(
        "Could not refresh subscription status. Please try again.",
      );
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, [loadSubscriptionStatus, onAccessChanged]);

  const handleManageSubscription = useCallback(async () => {
    setIsSubscriptionModalOpen(true);
    setIsSubscriptionLoading(true);
    setSubscriptionError("");

    try {
      await loadSubscriptionStatus();
    } catch {
      setSubscriptionError(
        "Could not load subscription details. Please try again.",
      );
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, [loadSubscriptionStatus]);

  const onSelect = useCallback((n: Note) => setCurrentId(n.id), []);
  const handleOpenBrainNote = useCallback((noteId: number) => {
    setLinkedNoteId(null);
    setSelectedFolderId(null);
    setView("all-notes");
    setCurrentId(noteId);
  }, []);
  const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
  const onClose = useCallback(() => window.api.closeWindow(), []);

  return (
    <div className="dashboard-container">
      {!isFocusMode && (
        <Sidebar
          allNotesCount={sidebarStats.allNotes}
          pinnedCount={sidebarStats.pinned}
          trashCount={sidebarStats.trash}
          lastSyncTime={sidebarStats.lastSync}
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
          activeTag={graphTag}
          onBrainTagChange={setGraphTag}
          onNoteDrop={onNoteDrop}
          onFolderDrop={onFolderDrop}
          userName={userName}
          onLogout={onLogout}
          onManageSubscription={handleManageSubscription}
          isSettingsView={isSettingsView}
          settingsSection={settingsSection}
          onOpenSettings={handleOpenSettings}
          onCloseSettings={handleCloseSettings}
          onSettingsSectionChange={handleSettingsSectionChange}
          isPremium={isPremium}
          onErrorToast={showErrorToast}
        />
      )}
      <div className="main-content">
        <WindowBar onMinimize={onMinimize} onClose={onClose} />
        <div className="content-container">
          {!isSettingsView ? (
            view === "brain" ? (
              <React.Suspense fallback={null}>
                <BrainGraph
                  notes={notes}
                  folders={folders}
                  activeNoteId={currentId}
                  onOpenNote={handleOpenBrainNote}
                  activeTag={graphTag}
                  onActiveTagChange={setGraphTag}
                />
              </React.Suspense>
            ) : (
            <>
              {!isFocusMode && (
                <NotesListPanel
                  notes={filteredNotes}
                  currentNoteId={currentId}
                  onAddNote={handleAddTextNote}
                  onSelect={onSelect}
                  isTrashView={view === "trash"}
                  title={panelTitle}
                  onPopOut={handlePopOut}
                  folders={folders}
                  onPin={onPin}
                  onSetStatus={onStatus}
                  onMoveToFolder={onMoveToFolder}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onExport={onExport}
                  onImport={onImport}
                  isPremium={isPremium}
                />
              )}

              <EditorPanel
                key={`editor-${currentNote?.id}-${currentNote?.noteType}`}
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
                existingTags={existingTagNames}
                onNoteTypeChange={onNoteTypeChange}
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
                  onPopOutLinkedNote={handleLinkedNotePopOut}
                />
              )}
            </>
            )
          ) : (
            <div className="settings-content">
              {settingsSection === "account" && (
                <div className="settings-panel">
                  <div className="settings-panel-header">
                    <h2>Account</h2>
                  </div>
                  {/* Account info rows */}
                  <div className="account-info-section">
                    <div className="account-row">
                      <span className="account-row-label">Name</span>
                      <span className="account-row-value">{userName}</span>
                    </div>
                    <div className="account-row">
                      <span className="account-row-label">Email</span>
                      <span className="account-row-value">{userEmail}</span>
                    </div>
                  </div>
                  {/* Subscription section */}
                  <div className="account-section-title">Subscription</div>
                  {isSubscriptionLoading && !subscriptionStatus ? (
                    <p style={{ color: "#999", fontSize: 13 }}>Loading…</p>
                  ) : subscriptionStatus ? (
                    <>
                      <div className="settings-sub-status">
                        <div className="settings-sub-status-row">
                          <span className="settings-sub-status-label">Plan</span>
                          <span
                            className={`settings-sub-pill settings-sub-pill-${subscriptionStatus.status}`}
                          >
                            {subscriptionStatus.status === "trialing"
                              ? "trial"
                              : subscriptionStatus.status.replace("_", " ")}
                          </span>
                        </div>
                        {getSubscriptionSummary(subscriptionStatus) && (
                          <p className="settings-sub-summary">
                            {getSubscriptionSummary(subscriptionStatus)}
                          </p>
                        )}
                      </div>
                      {subscriptionError && (
                        <p className="settings-sub-error">{subscriptionError}</p>
                      )}
                      <div className="settings-sub-actions">
                        {!subscriptionStatus.owner && (
                          <button
                            className="settings-primary-btn"
                            onClick={handleSubscriptionPrimaryAction}
                            disabled={isSubscriptionLoading}
                          >
                            {getSubscriptionAction(subscriptionStatus.status).label}
                          </button>
                        )}
                        <button
                          className="settings-secondary-btn"
                          onClick={handleRefreshSubscriptionStatus}
                          disabled={isSubscriptionLoading}
                        >
                          Refresh
                        </button>
                      </div>
                    </>
                  ) : subscriptionError ? (
                    <>
                      <p className="settings-sub-error">{subscriptionError}</p>
                      <button
                        className="settings-secondary-btn"
                        onClick={handleRefreshSubscriptionStatus}
                        disabled={isSubscriptionLoading}
                      >
                        Retry
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {toastMessage && (
          <div className={`toast-notification${toastType === "success" ? " toast-success" : ""}`}>{toastMessage}</div>
        )}
        <ProgressToast
          progress={progressData}
          onClose={() => setProgressData(null)}
        />
      </div>
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        status={subscriptionStatus}
        loading={isSubscriptionLoading}
        error={subscriptionError}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onPrimaryAction={handleSubscriptionPrimaryAction}
        onRefresh={handleRefreshSubscriptionStatus}
      />
      {isFolderSearchOpen && (
        <FolderSearchModal
          isOpen={isFolderSearchOpen}
          folders={folders}
          folderCounts={folderCounts}
          onSelect={onFolderSearchSelect}
          onCancel={() => setIsFolderSearchOpen(false)}
        />
      )}
      <ConfirmModal
        isOpen={folderToDelete !== null}
        title="Delete folder"
        message="Delete this folder and all its contents? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmFolderDelete}
        onCancel={() => setFolderToDelete(null)}
      />
      <ConfirmModal
        isOpen={noteToDeletePermanently !== null}
        title="Delete permanently"
        message={`Are you sure you want to delete "${noteToDeletePermanently?.name || "Untitled"}" permanently? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeletePermanently}
        onCancel={() => setNoteToDeletePermanently(null)}
      />
      {isLoading && notes.length === 0 && (
        <div className="dashboard-loading">
          <div className="loader"></div>
        </div>
      )}
    </div>
  );
}
