import React, { memo, useEffect, useRef, useState } from "react";
import type { Note, Folder, } from "../types/models";
import { marked } from "marked";
import { useCallback } from "react";
import { EditorView } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState, Prec } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { syntaxHighlighting } from "@codemirror/language";
import { classHighlighter } from "@lezer/highlight";
import StatusDropdown from "./StatusDropdown";
import TagsEditor from "./TagsEditor";
import MarkdownToolbar from "./MarkdownToolbar";
import { applyFormat, markdownKeymap } from "./EditorKeymaps";
import { lineNumbers, keymap } from "@codemirror/view";
import { EditorView as EditorViewWrapping } from "@codemirror/view";
import { Strikethrough } from "@lezer/markdown";
import { gotoLine, closeSearchPanel } from "@codemirror/search";
import { checkboxPlugin } from "./CheckboxWidget";
import MarkdownPreview from "./MarkdownPreview";
import { noteLinkPlugin } from "./NoteLinkPlugin";
import "./EditorPanel.css";
import { languages } from "@codemirror/language-data";
import { imagePreviewPlugin } from "./ImagePreviewPlugin";
import { setupWithoutKeymaps } from "./customSetup";
import NoteInfoPanel from "./NoteInfoPanel";
import DrawingCanvas from './DrawingCanvas';
import DrawingToolbar from './DrawingToolbar';


interface EditorPanelProps {
  note: Note | null;
  folders: Folder[];
  onChange: (n: Note) => void;
  onDelete: (n: Note) => void;
  onRestore?: (n: Note) => void;
  onDeletePermanently?: (n: Note) => void;
  onStatus: (n: Note) => void;
  onTagAdd: (n: Note) => void;
  onTagRemove: (n: Note) => void;
  onPin: (n: Note) => void;
  isTrashView?: boolean;
  onNoteLinkClick?: (noteName: string) => void;
  hideToolbar?: boolean;
  isLinkedNote?: boolean;
  onCloseLinkedNote?: () => void;
  existingTags?: string[];
}

const EditorPanel = memo(function EditorPanel({
  note,
  folders,
  onChange,
  onDelete,
  onRestore,
  onDeletePermanently,
  onStatus,
  onTagAdd,
  onTagRemove,
  onPin,
  isTrashView,
  onNoteLinkClick,
  hideToolbar,
  isLinkedNote,
  onCloseLinkedNote,
  existingTags = [],
}: EditorPanelProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const noteRef = useRef(note);
  const [isDragging, setIsDragging] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const editorBodyRef = useRef<HTMLDivElement>(null);
  const [dataPath, setDataPath] = useState<string>("");
  const [showToolbar, setShowToolbar] = useState(true);
  const [drawingColor, setDrawingColor] = useState('#FFFFFF');
  const [drawingWidth, setDrawingWidth] = useState(2);
  const [drawingBackground, setDrawingBackground] = useState<'black' | 'white' | 'grid'>('black');
  const [isEraser, setIsEraser] = useState(false);

  const isResizingPreview = useRef(false);

  const handleDrawingChange = useCallback((canvasJSON: string) => {
    if (!note) return;
    onChange({ ...note, drawingData: canvasJSON });
  }, [note, onChange]);

  const handleBackgroundChange = useCallback((bg: 'black' | 'white' | 'grid') => {
    setDrawingBackground(bg);
  }, []);
  const handleClearCanvas = useCallback(() => {
    if (note && confirm('Clear canvas?')) {
      // Limpiar el canvas pasando un drawingData vacío
      onChange({
        ...note, drawingData: JSON.stringify({
          version: '1.0',
          background: drawingBackground,
          strokes: []
        })
      });
    }
  }, [note, onChange, drawingBackground]);



  const handlePreviewMouseDown = useCallback((e: React.MouseEvent) => {
    isResizingPreview.current = true;
    e.preventDefault();
  }, []);


  useEffect(() => {
    window.api.getDataPath().then(setDataPath);
  }, []);



  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingPreview.current || !editorBodyRef.current) return;

      const containerRect = editorBodyRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;

      if (newWidth >= 200 && newWidth <= containerRect.width - 100) {
        setPreviewWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingPreview.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (showPreview && previewWidth === null && editorBodyRef.current) {
      const containerWidth = editorBodyRef.current.getBoundingClientRect().width;
      setPreviewWidth(Math.floor(containerWidth * 0.5));
    }
  }, [showPreview, previewWidth]);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  const getFolderPath = useCallback((folderId: number | null | undefined): string => {
    if (!folderId || !folders || folders.length === 0) return "";

    const path: string[] = [];
    let currentId: number | null | undefined = folderId;

    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (!folder) break;
      if (!folder.isSystem) {
        path.unshift(folder.name);
      }
      currentId = folder.parentId;
    }
    return path.join(" : ");
  }, [folders]);


  useEffect(() => {
    if (!editorRef.current || !note || !dataPath || note.noteType === 'drawing') return;

    const startState = EditorState.create({
      doc: note.content || "",
      extensions: [
        ...setupWithoutKeymaps,
        markdown({ extensions: [Strikethrough], codeLanguages: languages }),
        oneDark,
        syntaxHighlighting(classHighlighter),

        EditorView.lineWrapping,
        markdownKeymap,
        checkboxPlugin,
        ...(dataPath ? [imagePreviewPlugin(dataPath)] : []),
        Prec.highest(
          keymap.of([
            {
              key: "Mod-g",
              run: gotoLine,
            },
            {
              key: "Mod-p",
              run: () => {
                setShowPreview(prev => !prev);
                return true;
              },
            },
            {
              key: "mod-shift-m",
              run: () => {
                setShowToolbar(prev => !prev);
                return true;
              },
            },
          ]),
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString();
            const currentNote = noteRef.current;
            if (currentNote && newContent !== currentNote.content) {
              onChange({ ...currentNote, content: newContent });
            }
          }
        }),
        ...(onNoteLinkClick ? [noteLinkPlugin(onNoteLinkClick)] : []),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [note?.id, dataPath]);


  useEffect(() => {
    const handleGotoLineClose = (e: KeyboardEvent) => {
      if (e.key === "Escape" && viewRef.current) {
        const gotoLinePanel = document.querySelector(".cm-panel.cm-gotoLine");
        if (gotoLinePanel) {
          closeSearchPanel(viewRef.current);
          viewRef.current.focus();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (!viewRef.current) return;
      const gotoLinePanel = document.querySelector(".cm-panel.cm-gotoLine");
      if (gotoLinePanel && !gotoLinePanel.contains(e.target as Node)) {
        closeSearchPanel(viewRef.current);
        viewRef.current.focus();
      }
    };

    document.addEventListener("keydown", handleGotoLineClose);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleGotoLineClose);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);





  useEffect(() => {
    if (!viewRef.current || !note) return;
    const currentContent = viewRef.current.state.doc.toString();
    if (currentContent !== note.content) {
      const scrollInfo = viewRef.current.scrollDOM.scrollTop;

      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: note.content || "",
        },
      });

      requestAnimationFrame(() => {
        if (viewRef.current) {
          viewRef.current.scrollDOM.scrollTop = scrollInfo;
        }
      });
    }
  }, [note?.content]);
  const handleFormat = (type: string) => {
    if (!viewRef.current) return;
    applyFormat(viewRef.current, type);
    viewRef.current.focus();
  };
  const toggleLineNumbers = () => {
    setShowLineNumbers(!showLineNumbers);
  };
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!viewRef.current || !note) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file =>
      /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name)
    );

    if (imageFiles.length === 0) return;

    for (const file of imageFiles) {

      const buffer = await file.arrayBuffer();


      const relativePath = await window.api.saveAsset({
        fileBuffer: buffer,
        fileName: file.name,
        noteId: note.id
      });


      const view = viewRef.current;
      const cursor = view.state.selection.main.head;
      const markdown = `![](${relativePath})`;

      view.dispatch({
        changes: { from: cursor, insert: markdown + '\n' }
      });
    }
  }, [note]);


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
          className={`note-title-input ${isLinkedNote ? 'linked-note-title' : ''}`}
          id="noteTitleInput"
          placeholder="Untitled"
          value={isLinkedNote ? `@${note.name || ""}` : (note.name || "")}
          onChange={(e) => {
            if (isLinkedNote) {
              const value = e.target.value.startsWith('@') ? e.target.value.slice(1) : e.target.value;
              onChange({ ...note, name: value });
            } else {
              onChange({ ...note, name: e.target.value });
            }
          }}
          readOnly={isLinkedNote}
        />
        <div className="editor-actions">
          {isTrashView ? (
            <>
              <button
                className="editor-action-btn"
                title="Restore Note"
                onClick={() => onRestore && onRestore(note)}
              >
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
              <button
                className="editor-action-btn"
                title="Delete Permanently"
                onClick={() =>
                  onDeletePermanently && onDeletePermanently(note)
                }
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
                  <line x1={10} y1={11} x2={10} y2={17} />
                  <line x1={14} y1={11} x2={14} y2={17} />
                </svg>
              </button>
            </>
          ) : isLinkedNote ? (
            <button
              className="editor-action-btn"
              title="Close Linked Note"
              onClick={() => onCloseLinkedNote && onCloseLinkedNote()}
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <line x1={18} y1={6} x2={6} y2={18} />
                <line x1={6} y1={6} x2={18} y2={18} />
              </svg>
            </button>
          ) : (
            <>
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
              <button
                className="editor-action-btn"
                id="pinNoteBtn"
                title={note.pinned ? "Unpin Note" : "Pin Note"}
                onClick={() => onPin({ ...note, pinned: !note.pinned })}
              >
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill={note.pinned ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 17v5" />
                  <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                </svg>
              </button>
            </>
          )}
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
          <span className="metadata-folder-name">{getFolderPath(note.folderId) || "Index"}</span>
        </div>
        <div className="metadata-item metadata-status">
          <StatusDropdown
            status={note.status || ""}
            onChange={(s) => onStatus({ ...note, status: s })}
          />
        </div>
        <TagsEditor
          tags={note.tags || []}
          existingTags={existingTags}
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

      {note.noteType === 'drawing' ? (
        <DrawingToolbar
          currentColor={drawingColor}
          lineWidth={drawingWidth}
          background={drawingBackground}
          onColorChange={(newColor) => {
            setDrawingColor(newColor);
          }}
          onWidthChange={(newWidth) => {
            setDrawingWidth(newWidth);
          }}
          onBackgroundChange={handleBackgroundChange}
          onClear={handleClearCanvas}
          onEraserToggle={() => {
            setIsEraser(prev => !prev);
          }}
          isEraser={isEraser}
        />
      ) : (
        !hideToolbar && showToolbar && (
          <MarkdownToolbar
            onFormat={handleFormat}
            onToggleLineNumbers={toggleLineNumbers}
            showLineNumbers={showLineNumbers}
          />
        )
      )}
      <div className="editor-main-container">
        <div className="editor-body" ref={editorBodyRef}>
          {/* Editor condicional según tipo de nota */}
          {note.noteType === 'drawing' ? (
            <DrawingCanvas
              drawingData={note.drawingData}
              background={drawingBackground}
              onChange={handleDrawingChange}
              color={drawingColor}
              lineWidth={drawingWidth}
              isEraser={isEraser}
            />
          ) : (
            <>
              <div
                ref={editorRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`codemirror-container ${isDragging ? 'dragging' : ''} ${showLineNumbers ? 'show-line-numbers' : ''}`}
              />
              {/* Botón de Preview y panel solo para notas de texto */}
              <button
                className="preview-toggle-btn"
                title="Toggle Preview (Ctrl+P)"
                onClick={() => {
                  if (showPreview) {
                    setPreviewWidth(null);
                  }
                  setShowPreview(!showPreview);
                }}
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx={12} cy={12} r={3} />
                </svg>
              </button>
              {showPreview && (
                <div className="preview-container" style={{ width: previewWidth ?? '50%' }}>
                  <div
                    className="preview-resize-handle"
                    onMouseDown={handlePreviewMouseDown}
                  />
                  <NoteInfoPanel
                    note={note}
                    folders={folders}
                    onBacklinkClick={onNoteLinkClick}
                  />
                  <MarkdownPreview
                    content={note?.content || ""}
                    onContentChange={(newContent) => onChange({ ...note, content: newContent })}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default EditorPanel;
