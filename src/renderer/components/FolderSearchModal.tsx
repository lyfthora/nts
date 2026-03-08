import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Folder } from "../types/models";
import "./FolderSearchModal.css";


interface FolderSearchModalProps {
  isOpen: boolean;
  folders: Folder[];
  folderCounts: Record<number, number>;
  onSelect: (folderId: number) => void;
  onCancel: () => void;
}

interface FolderWithPath {
  folder: Folder;
  path: string;
}

export default function FolderSearchModal({
  isOpen,
  folders,
  folderCounts,
  onSelect,
  onCancel,
}: FolderSearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"recent" | "all">("recent");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const MAX_ALL = 10;

  const RECENT_FOLDERS_KEY = "nts-recent-folders";
  const MAX_RECENT = 5;
  const [recentFolderIds, setRecentFolderIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_FOLDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const foldersWithPaths = useMemo<FolderWithPath[]>(() => {
    const buildPath = (folder: Folder): string => {
      const parts: string[] = [folder.name];
      let currentParentId = folder.parentId;

      while (currentParentId !== null) {
        const parent = folders.find(f => f.id === currentParentId);
        if (parent) {
          parts.unshift(parent.name);
          currentParentId = parent.parentId;
        } else {
          break;
        }
      }
      return parts.join(" : ");
    };
    return folders.filter(f => !f.isSystem).map(folder => ({
      folder,
      path: buildPath(folder),
    }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [folders]);

  const recentFolders = useMemo<FolderWithPath[]>(() => {
    return recentFolderIds
      .map(id => foldersWithPaths.find(f => f.folder.id === id))
      .filter((f): f is FolderWithPath => f !== undefined)
      .slice(0, MAX_RECENT);
  }, [recentFolderIds, foldersWithPaths]);


  const filteredFolders = useMemo<FolderWithPath[]>(() => {
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      return foldersWithPaths.filter(
        ({ path, folder }) =>
          path.toLowerCase().includes(lowerQuery) ||
          folder.name.toLowerCase().includes(lowerQuery)
      );
    }
    if (viewMode === "all") {
      return foldersWithPaths.slice(0, MAX_ALL);
    }
    return recentFolders;
  }, [foldersWithPaths, recentFolders, query, viewMode]);

  const isShowingRecent = !query.trim() && viewMode === "recent";
  const isShowingAll = !query.trim() && viewMode === "all";

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredFolders.length]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setViewMode("recent");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (listRef.current && filteredFolders.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, filteredFolders.length]);


  const saveToRecent = useCallback((folderId: number) => {
    setRecentFolderIds(prev => {
      const filtered = prev.filter(id => id !== folderId);
      const updated = [folderId, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);




  const handleSelect = useCallback(() => {
    if (filteredFolders.length > 0 && filteredFolders[selectedIndex]) {
      const folderId = filteredFolders[selectedIndex].folder.id;
      saveToRecent(folderId);
      onSelect(folderId);
    }
  }, [filteredFolders, selectedIndex, onSelect, saveToRecent]);



  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredFolders.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
          break;
        case "Tab":
          e.preventDefault();
          if (filteredFolders.length > 0 && filteredFolders[selectedIndex]) {
            setQuery(filteredFolders[selectedIndex].path);
          }
          break;
        case "r":
          if (e.ctrlKey) {
            e.preventDefault();
            setViewMode("recent");
            setSelectedIndex(0);
          }
          break;
        case "a":
          if (e.ctrlKey) {
            e.preventDefault();
            setViewMode("all");
            setSelectedIndex(0);
          }
          break;
        case "Enter":
          e.preventDefault();
          handleSelect();
          break;
        case "Escape":
          e.preventDefault();
          onCancel();
          break;
      }
    },
    [filteredFolders, selectedIndex, handleSelect, onCancel]
  );

  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const startIndex = lowerText.indexOf(lowerQuery);

    if (startIndex === -1) return text;

    const before = text.slice(0, startIndex);
    const match = text.slice(startIndex, startIndex + query.length);
    const after = text.slice(startIndex + query.length);

    return (
      <>
        {before}
        <span className="folder-search-highlight">{match}</span>
        {after}
      </>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="folder-search-overlay"
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="folder-search-content"
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="folder-search-header">
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="folder-search-icon"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="folder-search-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search folder..."
                autoFocus
                spellCheck={false}
              />
            </div>
            <div className="folder-search-list" ref={listRef}>
              {filteredFolders.length > 0 ? (
                <>
                  {(isShowingRecent || isShowingAll) && (
                    <div className="folder-search-section-label">
                      {isShowingRecent ? "Recent" : "All"}
                    </div>
                  )}
                  {filteredFolders.map(({ folder, path }, index) => (
                    <div key={folder.id}
                      className={`folder-search-item ${index === selectedIndex ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedIndex(index);
                        saveToRecent(folder.id);
                        onSelect(folder.id);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <svg
                        width={14}
                        height={14}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className="folder-search-item-icon"
                      >
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span className="folder-search-path">
                        {highlightMatch(path, query)}
                      </span>
                      {index === selectedIndex && (
                        <span className="folder-search-hint">Tab to autocomplete</span>
                      )}
                      <span className="folder-search-count">
                        {folderCounts[folder.id] || 0}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="folder-search-empty">
                  {query.trim() ? "No folders found" : (isShowingRecent ? "No recent folders" : "No folders")}
                </div>
              )}
            </div>
            <div className="folder-search-footer">
              <span className="folder-search-shortcut">
                <kbd>↑↓</kbd> navigate
              </span>
              <span className="folder-search-shortcut">
                <kbd>Enter</kbd> select
              </span>
              <span className="folder-search-shortcut">
                <kbd>Ctrl+R</kbd> recent
              </span>
              <span className="folder-search-shortcut">
                <kbd>Ctrl+A</kbd> all
              </span>
              <span className="folder-search-shortcut">
                <kbd>Esc</kbd> close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
