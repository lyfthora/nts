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
import type { ProgressData } from "../types/models";
import { apiClient } from "../services/apiClient";
import { getSubscriptionSummary, getSubscriptionAction, } from "../utils/subscription";

interface DashboardProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
}
export default function Dashboard({ userName, userEmail, onLogout }: DashboardProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadedContents, setLoadedContents] = useState<Map<number, string>>(
    new Map(),
  );
  const [folders, setFolders] = useState<Folder[]>([]);
  const [view, setView] = useState("all-notes");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [linkedNoteId, setLinkedNoteId] = useState<number | null>(null);
  const [folderToUpdate, setFolderToUpdate] = useState<Folder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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
    [notes, linkedNoteId],
  );

  const folderCounts = useMemo<FolderCounts>(() => {
    const getAllDescendantIds = (parentId: number): number[] => {
      const children = folders.filter((f) => f.parentId === parentId);
      const ids: number[] = [];
      children.forEach((child) => {
        ids.push(child.id);
        ids.push(...getAllDescendantIds(child.id));
      });
      return ids;
    };
    const counts: FolderCounts = {};
    folders.forEach((folder) => {
      const directCount = notes.filter((n) => {
        if (n.deleted) return false;
        if (folder.id === 1) {
          return (
            n.folderId === null || n.folderId === undefined || n.folderId === 1
          );
        }
        return n.folderId === folder.id;
      }).length;
      if (!folder.expanded) {
        const descendantIds = getAllDescendantIds(folder.id);
        const descendantCount = notes.filter(
          (n) => !n.deleted && descendantIds.includes(n.folderId as number),
        ).length;
        counts[folder.id] = directCount + descendantCount;
      } else {
        counts[folder.id] = directCount;
      }
    });
    return counts;
  }, [notes, folders]);

  const tags = useMemo<Tag[]>(() => {
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
  const debRef = useRef<number | undefined>(undefined);

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
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentId && !loadedContents.has(currentId)) {
      const note = notes.find((n) => n.id === currentId);
      if (note?.noteType === "drawing") {
        window.api.getDrawingData(currentId).then((drawingData) => {
          setLoadedContents((prev) =>
            new Map(prev).set(currentId, drawingData || ""),
          );
          setNotes((prev) =>
            prev.map((n) => {
              if (n.id === currentId && n.drawingData === undefined) {
                return { ...n, drawingData };
              }
              return n;
            }),
          );
        });
      } else {
        window.api.getNoteContent(currentId).then((content) => {
          setLoadedContents((prev) => new Map(prev).set(currentId, content));
          setNotes((prev) =>
            prev.map((n) => {
              if (n.id === currentId && n.content === undefined) {
                return { ...n, content };
              }
              return n;
            }),
          );
        });
      }
    }
  }, [currentId, loadedContents, notes]);

  useEffect(() => {
    if (linkedNoteId && !loadedContents.has(linkedNoteId)) {
      window.api.getNoteContent(linkedNoteId).then((content) => {
        setLoadedContents((prev) => new Map(prev).set(linkedNoteId, content));
        setNotes((prev) =>
          prev.map((n) => {
            if (n.id === linkedNoteId && n.content === undefined) {
              return { ...n, content };
            }
            return n;
          }),
        );
      });
    }
  }, [linkedNoteId, loadedContents]);

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
      const newNote = await window.api.createNoteDashboard();
      if (newNote && selectedFolderId) {
        newNote.folderId = selectedFolderId;
        newNote.noteType = noteType;
        await window.api.updateNote(newNote);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (newNote) {
        newNote.noteType = noteType;
        setNotes((prev) => [...prev, newNote]);
        setCurrentId(newNote.id);
      }
    },
    [selectedFolderId],
  );

  const saveNote = useCallback((note: Note) => {
    const preview = (note.content || "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/[#*_`~\[\]]/g, "")
      .trim()
      .substring(0, 150);

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
      ...note,
      preview,
      updatedAt: Date.now(),
      hasDrawingData,
    };

    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? noteWithPreview : n)),
    );

    if (debRef.current !== undefined) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      const imageRegex = /!\[.*?\]\((assets\/.*?)\)/g;
      const referencedImages: string[] = [];
      let match;
      while ((match = imageRegex.exec(note.content || "")) !== null) {
        referencedImages.push(match[1]);
      }

      if (note.images && note.images.length > 0) {
        await window.api.cleanUnusedAssets({
          noteId: note.id,
          referencedImages,
        });
      }

      noteWithPreview.images = referencedImages;

      await window.api.updateNote(noteWithPreview);
    }, 200);
  }, []);

  const onDelete = useCallback(async (note: Note) => {
    await window.api.deleteNote(note.id);
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, deleted: true } : n)),
    );
    setCurrentId(null);
  }, []);

  const onRestore = useCallback(async (note: Note) => {
    await window.api.restoreNote(note.id);
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
  }, []);

  const onDeletePermanently = useCallback(async (note: Note) => {
    setNoteToDeletePermanently(note);
  }, []);
  const handleConfirmDeletePermanently = useCallback(async () => {
    if (!noteToDeletePermanently) return;
    await window.api.deleteNotePermanently(noteToDeletePermanently.id);
    setNotes((prev) => prev.filter((n) => n.id !== noteToDeletePermanently.id));
    setCurrentId(null);
    setNoteToDeletePermanently(null);
  }, [noteToDeletePermanently]);

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
      const timeout = setTimeout(() => {
        window.api.updateFolder(folderToUpdate);
        setFolderToUpdate(null);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [folderToUpdate]);

  const onFolderCreate = useCallback(
    async (parentId: number | null, name: string) => {
      if (!name.trim()) return;

      await window.api.createFolder({ name, parentId });
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
    },
    [],
  );

  const onFolderRename = useCallback(async (id: number, newName: string) => {
    if (!newName.trim()) return;

    setFolders((prev) => {
      const updatedFolders = prev.map((f) =>
        f.id === id ? { ...f, name: newName } : f,
      );

      const folder = updatedFolders.find((f) => f.id === id);
      if (folder) {
        window.api.updateFolder(folder);
      }

      return updatedFolders;
    });
  }, []);

  const onFolderDelete = useCallback((id: number) => {
    setFolderToDelete(id);
  }, []);
  const handleConfirmFolderDelete = useCallback(async () => {
    if (folderToDelete === null) return;
    const id = folderToDelete;
    setFolderToDelete(null);
    await window.api.deleteFolder(id);
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
    if (selectedFolderId === id) {
      setSelectedFolderId(null);
      setView("all-notes");
    }
  }, [folderToDelete, selectedFolderId]);

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
    const newNote = await window.api.createNoteDashboard();
    if (!newNote) return;
    const duplicated: Note = {
      ...newNote,
      name: `${note.name || "Untitled"} (copy)`,
      content: note.content,
      preview: note.preview,
      status: note.status,
      tags: note.tags ? [...note.tags] : [],
      folderId: note.folderId,
      color: note.color,
      noteType: note.noteType,
    };
    await window.api.updateNote(duplicated);
    setNotes((prev) => [...prev, duplicated]);
    setCurrentId(duplicated.id);
  }, []);

  const onExport = useCallback(async (note: Note, format: "json" | "md") => {
    await window.api.exportNote(note.id, format);
  }, []);

  const onImport = useCallback(async () => {
    const result = await window.api.importNote();
    if (result?.success) {
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
    }
  }, []);

  const onMoveToFolder = useCallback(
    (noteId: number, folderId: number | null) => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      const updatedNote = { ...note, folderId };
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updatedNote : n)));
      window.api.updateNote(updatedNote);
    },
    [notes],
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
    (noteId: number, targetFolderId: number) => {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        const updatedNote = { ...note, folderId: targetFolderId };
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? updatedNote : n)),
        );
        window.api.updateNote(updatedNote);
      }
    },
    [notes],
  );

  const onFolderDrop = useCallback(
    async (folderId: number, targetFolderId: number | null) => {
      const folder = folders.find((f) => f.id === folderId);
      if (folder) {
        const updatedFolder = { ...folder, parentId: targetFolderId };
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? updatedFolder : f)),
        );
        await window.api.updateFolder(updatedFolder);
      }
    },
    [folders],
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
        setToastMessage("Payment succeeded! Updating subscription...");
        setIsSubscriptionModalOpen(false);
        setIsSubscriptionLoading(true);
        try {
          const nextStatus = await loadSubscriptionStatus();
          if (nextStatus.status === "active") {
            setIsSubscriptionLoading(false);
            setToastMessage("Premium activated successfully!");
            setTimeout(() => setToastMessage(null), 3000);
            return;
          }
          let attempt = 0;
          const interval = setInterval(async () => {
            attempt++;
            const s = await loadSubscriptionStatus();
            if (s.status === "active") {
              clearInterval(interval);
              setIsSubscriptionLoading(false);
              setToastMessage("Premium activated successfully!");
              setTimeout(() => setToastMessage(null), 3000);
            } else if (attempt >= 5) {
              clearInterval(interval);
              setIsSubscriptionLoading(false);
              setToastMessage("Subscription update not detected yet. Webhook might be delayed.");
              setTimeout(() => setToastMessage(null), 5000);
            }
          }, 2000);
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
  }, [loadSubscriptionStatus]);

  const handleSubscriptionPrimaryAction = useCallback(async () => {
    setIsSubscriptionLoading(true);
    setSubscriptionError("");

    try {
      const status = subscriptionStatus ?? (await loadSubscriptionStatus());
      const { url } =
        status.status === "active"
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
      await loadSubscriptionStatus();
    } catch {
      setSubscriptionError(
        "Could not refresh subscription status. Please try again.",
      );
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, [loadSubscriptionStatus]);

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
  const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
  const onClose = useCallback(() => window.api.closeWindow(), []);

  return (
    <div className="dashboard-container">
      {!isFocusMode && (
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
        />
      )}
      <div className="main-content">
        <WindowBar onMinimize={onMinimize} onClose={onClose} />
        <div className="content-container">
          {!isSettingsView ? (
            <>
              {!isFocusMode && (
                <NotesListPanel
                  notes={filteredNotes}
                  currentNoteId={currentId}
                  onAddNote={() => onAddNote("text")}
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
                existingTags={tags.map((t) => t.name)}
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
                        <button
                          className="settings-primary-btn"
                          onClick={handleSubscriptionPrimaryAction}
                          disabled={isSubscriptionLoading}
                        >
                          {getSubscriptionAction(subscriptionStatus.status).label}
                        </button>
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
          <div className="toast-notification">{toastMessage}</div>
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
