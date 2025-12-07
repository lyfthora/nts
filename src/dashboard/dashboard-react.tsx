import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom/client";

function WindowBar({
  onMinimize,
  onClose,
}: {
  onMinimize: () => void;
  onClose: () => void;
}) {
  return (
    <div className="note-window-bar">
      <div className="window-title" />
      <div className="window-controls">
        <button className="window-btn minimize-btn" onClick={onMinimize} />
        <button className="window-btn close-btn" onClick={onClose} />
      </div>
    </div>
  );
}

function Sidebar({
  notes,
  view,
  onViewChange,
  counts,
  tags,
}: {
  notes: any[];
  view: string;
  onViewChange: (v: string) => void;
  counts: Record<string, number>;
  tags: { name: string; count: number }[];
}) {
  const Item = ({ view: v, children }: any) => (
    <a
      href="#"
      className={`nav-item${view === v ? " active" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        onViewChange(v);
      }}
    >
      {children}
    </a>
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <pre className="ascii-logo">
          _ _ ___ _ _ | | / \ |_ _| \ | | | | / _ \ | || \| | | |__/ ___ \ | ||
          |\ | |___/_/ \_\___|_| \_|
        </pre>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">
          <Item view="all-notes">
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>All Notes</span>
            <span className="nav-count" id="allNotesCount">
              {String(notes.length)}
            </span>
          </Item>
          <Item view="pinned">
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M12 17v5" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
            </svg>
            <span>Pinned Notes</span>
            <span className="nav-count" id="pinnedCount">
              0
            </span>
          </Item>
        </div>
        <div className="nav-section">
          <div className="nav-section-header">
            <button className="nav-collapse-btn" data-section="status">
              <svg
                className="chevron"
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx={12} cy={12} r={10} />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>Status</span>
          </div>
          <div className="nav-subsection" id="statusSection">
            <Item view="status-active">
              <span className="status-dot status-active" />
              <span>Active</span>
              <span className="nav-count" id="count-active">
                {String(counts.active)}
              </span>
            </Item>
            <Item view="status-onhold">
              <span className="status-dot status-onhold" />
              <span>On Hold</span>
              <span className="nav-count" id="count-onhold">
                {String(counts.onhold)}
              </span>
            </Item>
            <Item view="status-completed">
              <span className="status-dot status-completed" />
              <span>Completed</span>
              <span className="nav-count" id="count-completed">
                {String(counts.completed)}
              </span>
            </Item>
            <Item view="status-dropped">
              <span className="status-dot status-dropped" />
              <span>Dropped</span>
              <span className="nav-count" id="count-dropped">
                {String(counts.dropped)}
              </span>
            </Item>
          </div>
        </div>
        <div className="nav-section">
          <div className="nav-section-header">
            <button className="nav-collapse-btn" data-section="tags">
              <svg
                className="chevron"
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1={7} y1={7} x2={7.01} y2={7} />
            </svg>
            <span>Tags</span>
          </div>
          <div className="nav-subsection" id="tagsSection">
            {tags.map((t) => (
              <a
                href="#"
                className="nav-item nav-nested"
                onClick={(e) => {
                  e.preventDefault();
                  onViewChange(`tag-${t.name}`);
                }}
              >
                <span className="tag-hash">#</span>
                <span>{t.name}</span>
                <span className="nav-count">{String(t.count)}</span>
              </a>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}

function NotesListPanel({
  notes,
  currentNoteId,
  onAddNote,
  onSelect,
}: {
  notes: any[];
  currentNoteId: number | null;
  onAddNote: () => void;
  onSelect: (n: any) => void;
}) {
  return (
    <div className="notes-list-panel">
      <div className="panel-header">
        <h2 id="contentTitle">All Notes</h2>
        <div className="panel-actions">
          <button
            className="action-btn"
            id="addNoteBtn"
            title="Add Note"
            onClick={onAddNote}
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="notes-list-body" id="notesListPanel">
        {notes.length === 0 ? (
          <div className="no-items-message">No notes</div>
        ) : (
          notes.map((n) => (
            <div
              className={`note-list-item${
                currentNoteId === n.id ? " active" : ""
              }`}
              style={{ borderLeftColor: n.color || "#667eea" }}
              onClick={() => onSelect(n)}
            >
              <div className="note-list-item-title">{n.name || "Untitled"}</div>
              <div
                className={
                  n.content
                    ? "note-list-item-preview"
                    : "note-list-item-preview note-list-item-empty"
                }
              >
                {n.content || "Empty note"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusDropdown({
  status,
  onChange,
}: {
  status: string;
  onChange: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const dotClass =
    status === "active"
      ? "status-active"
      : status === "onhold"
      ? "status-onhold"
      : status === "completed"
      ? "status-completed"
      : status === "dropped"
      ? "status-dropped"
      : "";
  const text = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : "Status";
  const Option = (s: string, label: string, cls?: string) => (
    <div
      className="status-option"
      onClick={() => {
        onChange(s);
        setOpen(false);
      }}
    >
      {cls ? <span className={`status-dot ${cls}`} /> : null}
      <span>{label}</span>
    </div>
  );
  return (
    <div className={`status-dropdown${open ? " active" : ""}`}>
      <button
        className={`status-btn${status ? " selected" : ""}`}
        id="statusBtn"
        onClick={toggle}
      >
        <span className={`status-dot ${dotClass}`} />
        <span className="status-text" id="statusText">
          {text}
        </span>
        <svg
          className="status-chevron"
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="status-menu" id="statusMenu">
        {Option("", "None")}
        {Option("active", "Active", "status-active")}
        {Option("onhold", "On Hold", "status-onhold")}
        {Option("completed", "Completed", "status-completed")}
        {Option("dropped", "Dropped", "status-dropped")}
      </div>
    </div>
  );
}

function TagsEditor({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
}) {
  const [value, setValue] = useState("");
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const t = value.trim().replace(/,$/g, "");
        if (t) {
          onAdd(t);
          setValue("");
        }
      }
    },
    [value, onAdd]
  );
  return (
    <div className="metadata-item metadata-tags">
      <div className="tags-wrapper" id="tagsWrapper">
        <div className="tags-container" id="tagsContainer">
          {(tags || []).map((tag) => (
            <div className="tag-badge">
              <span>{tag}</span>
              <button className="tag-remove" onClick={() => onRemove(tag)}>
                ×
              </button>
            </div>
          ))}
        </div>
        <input
          type="text"
          className="tag-input"
          id="tagInput"
          placeholder="Add Tags"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
}

function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const colors = ["#A8D5FF", "#B4E7CE", "#FFF4A3", "#FFB5B5"];
  return (
    <div>
      <button
        className="editor-action-btn"
        id="colorPickerBtn"
        title="Change Color"
        onClick={toggle}
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx={12} cy={12} r={10} />
        </svg>
      </button>
      {open ? (
        <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
          {colors.map((c) => (
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: c,
                border: "1px solid #ddd",
                cursor: "pointer",
              }}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EditorPanel({
  note,
  onChange,
  onDelete,
  onStatus,
  onTagAdd,
  onTagRemove,
  onColor,
}: {
  note: any | null;
  onChange: (n: any) => void;
  onDelete: (n: any) => void;
  onStatus: (n: any) => void;
  onTagAdd: (n: any) => void;
  onTagRemove: (n: any) => void;
  onColor: (n: any) => void;
}) {
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

function App() {
  const [notes, setNotes] = useState<any[]>([]);
  const [view, setView] = useState("all-notes");
  const [currentId, setCurrentId] = useState<number | null>(null);
  const currentNote = useMemo(
    () => notes.find((n) => n.id === currentId) || null,
    [notes, currentId]
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      active: 0,
      onhold: 0,
      completed: 0,
      dropped: 0,
    };
    notes.forEach((n) => {
      if (n.status && c.hasOwnProperty(n.status)) c[n.status]++;
    });
    return c;
  }, [notes]);
  const tags = useMemo(() => {
    const m: Record<string, number> = {};
    notes.forEach((n) =>
      (n.tags || []).forEach((t: string) => {
        m[t] = (m[t] || 0) + 1;
      })
    );
    return Object.keys(m)
      .sort()
      .map((name) => ({ name, count: m[name] }));
  }, [notes]);
  const debRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    window.api.getAllNotes().then((ns: any[]) => {
      if (mounted) setNotes(ns || []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredNotes = useMemo(() => {
    if (view === "all-notes") return notes;
    if (view.startsWith("status-")) {
      const s = view.replace("status-", "");
      return notes.filter((n) => n.status === s);
    }
    if (view.startsWith("tag-")) {
      const t = view.replace("tag-", "");
      return notes.filter((n) => (n.tags || []).includes(t));
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
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    }, 500);
  }, []);

  const onDelete = useCallback(async (note: any) => {
    await window.api.deleteNote(note.id);
    const ns = await window.api.getAllNotes();
    setNotes(ns || []);
    setCurrentId(null);
  }, []);

  const onChange = useCallback(
    (note: any) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote]
  );
  const onStatus = useCallback(
    (note: any) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote]
  );
  const onTagAdd = useCallback(
    (note: any) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote]
  );
  const onTagRemove = useCallback(
    (note: any) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote]
  );
  const onColor = useCallback(
    (note: any) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      saveNote(note);
    },
    [saveNote]
  );

  const onSelect = useCallback((n: any) => setCurrentId(n.id), []);
  const onViewChange = useCallback((v: string) => setView(v), []);
  const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
  const onClose = useCallback(() => window.api.closeWindow(), []);

  return (
    <div className="dashboard-container">
      <Sidebar
        notes={notes}
        view={view}
        onViewChange={onViewChange}
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
          />
          <EditorPanel
            note={currentNote}
            onChange={onChange}
            onDelete={onDelete}
            onStatus={onStatus}
            onTagAdd={onTagAdd}
            onTagRemove={onTagRemove}
            onColor={onColor}
          />
        </div>
      </div>
    </div>
  );
}

const container =
  document.querySelector(".dashboard-container") ||
  document.getElementById("root") ||
  document.body;
if (container) {
  container.innerHTML = "";
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}
