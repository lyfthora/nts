import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./FolderTree.css";
import InputModal from "./InputModal";
import type { Folder } from "../types/models";


interface FolderTreeProps {
  folders: Folder[];
  selectedFolderId: number | null;
  folderCounts: Record<number, number>;
  onSelectFolder: (id: number) => void;
  onToggleExpand: (id: number) => void;
  onCreateFolder: (parentId: number | null, name: string) => void;
  onDeleteFolder: (id: number) => void;
  onRenameFolder: (id: number, newName: string) => void;
  onNoteDrop?: (noteId: number, targetFolderId: number) => void;
  onFolderDrop?: (folderId: number, targetFolderId: number | null) => void;
}

export default function FolderTree({
  folders,
  selectedFolderId,
  folderCounts,
  onSelectFolder,
  onToggleExpand,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onNoteDrop,
  onFolderDrop,
}: FolderTreeProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folderId: number } | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [modalType, setModalType] = useState<'create' | 'rename' | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null>(null);
  const [draggingFolderId, setDraggingFolderId] = useState<number | null>(null);

  const handleContextMenu = (e: React.MouseEvent, folderId: number, isSystem?: boolean) => {
    if (isSystem) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, folderId });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    if (contextMenu) {
      document.addEventListener('click', closeContextMenu);
      return () => document.removeEventListener('click', closeContextMenu);
    }
  }, [contextMenu]);

  const handleCreateSubfolder = () => {
    if (!contextMenu) return;
    setActiveFolderId(contextMenu.folderId);
    setModalType('create');
  };

  const handleRename = () => {
    if (!contextMenu) return;
    const folder = folders.find(f => f.id === contextMenu.folderId);
    if (!folder) return;
    setActiveFolderId(contextMenu.folderId);
    setEditingName(folder.name);
    setModalType('rename');
  };


  // aqui se contruye el arbolgod
  const buildTree = (parentId: number | null = null, level: number = 0): JSX.Element[] => {
    return folders
      .filter(f => f.parentId === parentId)
      .map(folder => (
        <div key={folder.id}>
          <div
            draggable={!folder.isSystem}
            className={`folder-item ${selectedFolderId === folder.id ? "active" : ""} ${dragOverFolderId === folder.id ? "drag-over" : ""}`}
            style={{
              paddingLeft: `${level * 12 + (folder.isSystem ? 22 : 2)}px`
            }}
            onClick={() => onSelectFolder(folder.id)}
            onDragStart={(e) => {
              if (folder.isSystem) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('folder/id', folder.id.toString());
              setDraggingFolderId(folder.id);
            }}
            onDragEnd={() => {
              setDraggingFolderId(null);
            }}
            onContextMenu={(e) => handleContextMenu(e, folder.id, folder.isSystem)}
            onDragOver={(e) => {
              e.preventDefault();
              const draggingFolderData = e.dataTransfer.types.includes('folder/id');
              if (draggingFolderData && draggingFolderId === folder.id) {
                e.dataTransfer.dropEffect = 'none';
                return;
              }

              e.dataTransfer.dropEffect = 'move';
              setDragOverFolderId(folder.id);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverFolderId(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const noteIdData = e.dataTransfer.getData('text/plain');
              if (noteIdData) {
                const noteId = parseInt(noteIdData, 10);
                if (!isNaN(noteId) && onNoteDrop) {
                  onNoteDrop(noteId, folder.id);
                }
              }

              const folderIdData = e.dataTransfer.getData('folder/id');
              if (folderIdData) {
                const folderId = parseInt(folderIdData, 10);
                if (!isNaN(folderId) && folderId !== folder.id && onFolderDrop) {
                  const isDescendant = (parentId: number, childId: number): boolean => {
                    const children = folders.filter(f => f.parentId === parentId);
                    if (children.some(f => f.id === childId)) return true;
                    return children.some(child => isDescendant(child.id, childId));
                  };

                  if (!isDescendant(folderId, folder.id)) {
                    onFolderDrop(folderId, folder.id);
                  }
                }
              }

              setDragOverFolderId(null);
              setDraggingFolderId(null);
            }}
          >
            {!folder.isSystem && (
              <button
                className="folder-chevron"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(folder.id);
                }}
                style={{
                  visibility: folders.some(f => f.parentId === folder.id) ? 'visible' : 'hidden'
                }}
              >
                <svg
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{
                    transform: folder.expanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s"
                  }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="folder-icon"
              style={{ marginLeft: folder.isSystem ? '4px' : '0' }}
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>

            <span className="folder-name">
              {folder.name}
            </span>
            <span className="nav-count">{folderCounts[folder.id] || 0}</span>


          </div>

          <AnimatePresence initial={false}>
            {folder.expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ overflow: "hidden", pointerEvents: "auto" }}
              >
                {buildTree(folder.id, level + 1)}
              </motion.div>
            )}
          </AnimatePresence>
        </div >
      ));
  };

  return (
    <div className="folder-tree">
      {buildTree()}

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={handleCreateSubfolder}>
            Create Subfolder
          </div>
          <div className="context-menu-item" onClick={handleRename}>
            Rename Folder
          </div>
          {contextMenu && folders.find(f => f.id === contextMenu.folderId)?.parentId !== null && (
            <div className="context-menu-item" onClick={() => {
              if (contextMenu && onFolderDrop) {
                onFolderDrop(contextMenu.folderId, null);
                closeContextMenu();
              }
            }}>
              Move to Root
            </div>
          )}
          <div className="context-menu-item" onClick={() => {
            if (contextMenu) {
              onDeleteFolder(contextMenu.folderId);
              closeContextMenu();
            }
          }}>
            Delete Folder
          </div>
        </div>
      )}

      <InputModal
        isOpen={modalType !== null}
        title={modalType === 'create' ? 'Create Subfolder' : 'Rename Folder'}
        defaultValue={modalType === 'rename' ? editingName : ''}
        placeholder={modalType === 'create' ? 'Subfolder Name' : 'Folder Name'}
        onConfirm={(name) => {
          if (modalType === 'create' && activeFolderId !== null) {
            onCreateFolder(activeFolderId, name);
          } else if (modalType === 'rename' && activeFolderId !== null) {
            onRenameFolder(activeFolderId, name);
          }
          setModalType(null);
          closeContextMenu();
          setActiveFolderId(null);
        }}
        onCancel={() => {
          setModalType(null);
          closeContextMenu();
        }}
      />
    </div>
  );
}
