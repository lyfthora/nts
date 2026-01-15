import React, { useState, memo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Note, Folder, StatusCounts, Tag } from "../types/models";
import "./Sidebar.css";
import FolderTree from "./FolderTree";
import InputModal from "./InputModal";
import buttonIcon from "../assets/icons/button.png";
import pauseIcon from "../assets/icons/pause.png";
import checkedIcon from "../assets/icons/checked.png";
import removeIcon from "../assets/icons/remove.png";

interface NavItemProps {
  itemView: string;
  currentView: string;
  onViewChange: (v: string) => void;
  children: React.ReactNode;
}

const NavItem = memo(function NavItem({ itemView, currentView, onViewChange, children }: NavItemProps) {
  return (
    <a
      href="#"
      className={`nav-item${currentView === itemView ? " active" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        onViewChange(itemView);
      }}
    >
      {children}
    </a>
  );
});





interface SidebarProps {
  notes: Note[];
  folders: Folder[];
  view: string;
  selectedFolderId: number | null;
  onViewChange: (v: string) => void;
  onFolderSelect: (id: number) => void;
  onFolderToggle: (id: number) => void;
  onFolderCreate: (parentId: number | null, name: string) => void;
  onFolderRename: (id: number, newName: string) => void;
  onFolderDelete: (id: number) => void;
  folderCounts: Record<number, number>;
  counts: StatusCounts;
  tags: Tag[];
  onNoteDrop?: (noteId: number, targetFolderId: number) => void;
}

const Sidebar = memo(function Sidebar({
  notes,
  folders,
  view,
  selectedFolderId,
  folderCounts,
  onViewChange,
  onFolderSelect,
  onFolderToggle,
  onFolderCreate,
  onFolderDelete,
  onFolderRename,
  counts,
  tags,
  onNoteDrop,
}: SidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = e.clientX;
      if (newWidth >= 180 && newWidth <= 400) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isResizing.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

  }, []);

  return (
    <div className="sidebar" ref={sidebarRef} style={{ width: `${sidebarWidth}px` }}>
      <div className="sidebar-header">
        <pre className="ascii-logo">{`█░░ ▄▀█ █ █▄░█
█▄▄ █▀█ █ █░▀█`}</pre>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section" id="mainLinksSection">
          <NavItem itemView="all-notes" currentView={view} onViewChange={onViewChange}>
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
              {String(notes.filter((n) => !n.deleted).length)}
            </span>
          </NavItem>
          <NavItem itemView="pinned" currentView={view} onViewChange={onViewChange}>
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
              {String(notes.filter((n) => !n.deleted && n.pinned).length)}
            </span>
          </NavItem>
          <NavItem itemView="trash" currentView={view} onViewChange={onViewChange}>
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
            <span>Trash</span>
            <span className="nav-count" id="trashCount">
              {String(notes.filter((n) => n.deleted).length)}
            </span>
          </NavItem>
        </div>
        <div className="nav-section">
          <div className="nav-section-header">
            <button
              className={`nav-collapse-btn ${collapsedSections['folders'] ? 'collapsed' : ''}`}
              onClick={() => toggleSection('folders')}
            >
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
            <span>Notebooks</span>
            <button
              className="section-action-btn"
              onClick={() => setShowCreateModal(true)}
              title="New Folder"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                marginLeft: 'auto',
                fontSize: '16px'
              }}
            >
              +
            </button>
          </div>
          <AnimatePresence initial={false}>
            {!collapsedSections['folders'] && (
              <motion.div
                className="nav-subsection"
                id="foldersSection"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <FolderTree
                  folders={folders}
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={onFolderSelect}
                  folderCounts={folderCounts}
                  onToggleExpand={onFolderToggle}
                  onCreateFolder={onFolderCreate}
                  onDeleteFolder={onFolderDelete}
                  onRenameFolder={onFolderRename}
                  onNoteDrop={onNoteDrop}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="nav-section">
          <div className="nav-section-header">
            <button
              className={`nav-collapse-btn ${collapsedSections['status'] ? 'collapsed' : ''}`}
              onClick={() => toggleSection('status')}
            >
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
            <span>Status</span>
          </div>
          <AnimatePresence initial={false}>
            {!collapsedSections['status'] && (
              <motion.div className="nav-subsection" id="statusSection"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <NavItem itemView="status-active" currentView={view} onViewChange={onViewChange}>
                  <span
                    className="status-dot status-active"
                    style={{ backgroundImage: `url(${buttonIcon})` }}
                  />
                  <span>Active</span>
                  <span className="nav-count" id="count-active">
                    {String(counts.active)}
                  </span>
                </NavItem>


                <NavItem itemView="status-onhold" currentView={view} onViewChange={onViewChange}>
                  <span
                    className="status-dot status-onhold"
                    style={{ backgroundImage: `url(${pauseIcon})` }}
                  />
                  <span>On Hold</span>
                  <span className="nav-count" id="count-onhold">
                    {String(counts.onhold)}
                  </span>
                </NavItem>
                <NavItem itemView="status-completed" currentView={view} onViewChange={onViewChange}>
                  <span
                    className="status-dot status-completed"
                    style={{ backgroundImage: `url(${checkedIcon})` }}
                  />
                  <span>Completed</span>
                  <span className="nav-count" id="count-completed">
                    {String(counts.completed)}
                  </span>
                </NavItem>
                <NavItem itemView="status-dropped" currentView={view} onViewChange={onViewChange}>
                  <span
                    className="status-dot status-dropped"
                    style={{ backgroundImage: `url(${removeIcon})` }}
                  />
                  <span>Dropped</span>
                  <span className="nav-count" id="count-dropped">
                    {String(counts.dropped)}
                  </span>
                </NavItem>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="nav-section">
          <div className="nav-section-header">
            <button
              className={`nav-collapse-btn ${collapsedSections['tags'] ? 'collapsed' : ''}`}
              onClick={() => toggleSection('tags')}
            >
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
            <span>Tags</span>
          </div>
          <AnimatePresence initial={false}>
            {!collapsedSections['tags'] && (
              <motion.div
                className="nav-subsection"
                id="tagsSection"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                {tags.map((t) => (
                  <a
                    key={t.name}
                    href="#"
                    className={`nav-item nav-nested ${view === `tag-${t.name}` ? 'active' : ''}`}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      <InputModal
        isOpen={showCreateModal}
        title="Create Folder"
        placeholder="Folder Name"
        onConfirm={(name) => {
          onFolderCreate(null, name);
          setShowCreateModal(false);
        }}
        onCancel={() => setShowCreateModal(false)}
      />
      <div
        className="sidebar-resize-handle"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
});

export default Sidebar;
