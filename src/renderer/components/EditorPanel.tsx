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
import TableOfContents from './TableOfContents';
import BacklinksPanel from './BacklinksPanel';
import ForwardLinksPanel from './ForwardLinksPanel';

let cachedDataPath = '';

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
  onNoteTypeChange?: (noteType: 'text' | 'drawing') => void;
  isExternalWindow?: boolean;
  originNoteName?: string;
  onPopOutLinkedNote?: () => void;
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
  onNoteTypeChange,
  isExternalWindow,
  originNoteName,
  onPopOutLinkedNote,
}: EditorPanelProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const noteRef = useRef(note);
  const [isDragging, setIsDragging] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const editorBodyRef = useRef<HTMLDivElement>(null);
  const [dataPath, setDataPath] = useState<string>(cachedDataPath);
  const [showToolbar, setShowToolbar] = useState(true);
  const [drawingColor, setDrawingColor] = useState('#FFFFFF');
  const [drawingWidth, setDrawingWidth] = useState(2);
  const [drawingBackground, setDrawingBackground] = useState<'black' | 'white' | 'grid'>('black');
  const [isEraser, setIsEraser] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const isResizingPreview = useRef(false);
  const [hideEditor, setHideEditor] = useState(false);
  const showPreviewRef = useRef(showPreview);
  const hideEditorRef = useRef(hideEditor);

  useEffect(() => {
    showPreviewRef.current = showPreview;
  }, [showPreview]);

  useEffect(() => {
    hideEditorRef.current = hideEditor;
  }, [hideEditor]);

  useEffect(() => {
    if (note?.noteType === 'text') {
      setIsEraser(false);
    }
    setZoomLevel(1);
  }, [note?.noteType])

  useEffect(() => {
    setZoomLevel(1);
  }, [note?.id]);

  useEffect(() => {
    if (note?.noteType === 'drawing' && note.drawingData) {
      try {
        const data = JSON.parse(note.drawingData);
        if (data.background) {
          setDrawingBackground(data.background);
        }
      } catch {
      }
    }
  }, [note?.id, note?.drawingData]);

  const isNoteEmpty = note
    ? note.noteType === 'drawing'
      ? !note.drawingData || (() => { try { return JSON.parse(note.drawingData).strokes?.length === 0; } catch { return true; } })()
      : !note.content && !note.name
    : true;


  const handleDrawingChange = useCallback((canvasJSON: string) => {
    if (!note) return;
    onChange({ ...note, drawingData: canvasJSON });
  }, [note, onChange]);

  const handleBackgroundChange = useCallback((bg: 'black' | 'white' | 'grid') => {
    setDrawingBackground(bg);
    if (note) {
      let currentData: { version: string; background: string; strokes: unknown[] } = {
        version: '1.0',
        background: bg,
        strokes: [],
      };
      if (note.drawingData) {
        try {
          const parsed = JSON.parse(note.drawingData);
          currentData = { ...parsed, background: bg };
        } catch {
        }
      }
      onChange({ ...note, drawingData: JSON.stringify(currentData) });
    }
  }, [note, onChange]);

  const handleClearCanvas = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const confirmClearCanvas = useCallback(() => {
    if (note) {
      onChange({
        ...note, drawingData: JSON.stringify({
          version: '1.0',
          background: drawingBackground,
          strokes: []
        })
      });
    }
    setShowClearConfirm(false);
  }, [note, onChange, drawingBackground]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(5.0, prev * 1.1));
  }, []);
  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(0.1, prev / 1.1));
  }, []);
  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
  }, []);

  const handlePreviewMouseDown = useCallback((e: React.MouseEvent) => {
    isResizingPreview.current = true;
    e.preventDefault();
  }, []);


  useEffect(() => {
    if (!cachedDataPath) {
      window.api.getDataPath().then(path => {
        cachedDataPath = path;
        setDataPath(path);
      });
    }
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
    if (!note || !dataPath || note.noteType === 'drawing') return;

    const createEditor = () => {
      if (!editorRef.current) return;

      // Destruir editor previo si existe
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }

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
      setTimeout(() => {
        if (viewRef.current && !viewRef.current.hasFocus) {
          viewRef.current.focus();
        }
      }, 50);
    };

    if (editorRef.current) {
      createEditor();
    } else {
      // Fallback: si el ref aún no está listo, esperar al siguiente tick
      const timerId = setTimeout(createEditor, 0);
      return () => {
        clearTimeout(timerId);
        if (viewRef.current) {
          viewRef.current.destroy();
          viewRef.current = null;
        }
      };
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [note?.id, dataPath, note?.noteType]);


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
    if (!isExternalWindow) return;
    const handleExternalShortcuts = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      const key = e.key.toLowerCase();
      // ctrl shift p hide editor
      if (key === 'p') {
        e.preventDefault();
        if (showPreviewRef.current) {
          setHideEditor(prev => !prev);
        }
      }
      // ctrl shift m hide toolbar
      if (key === 'm' && hideEditorRef.current) {
        e.preventDefault();
        setShowToolbar(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleExternalShortcuts);
    return () => document.removeEventListener('keydown', handleExternalShortcuts);
  }, [isExternalWindow]);

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

  const handleTocClick = useCallback((line: number) => {
    if (!viewRef.current) return;
    const lineInfo = viewRef.current.state.doc.line(line);
    viewRef.current.dispatch({
      effects: EditorView.scrollIntoView(lineInfo.from, {
        y: 'start'
      })
    });
    viewRef.current.focus();
  }, []);

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
      const coords = { x: e.clientX, y: e.clientY };
      const dropPos = view.posAtCoords(coords);
      const insertAt = dropPos ?? view.state.doc.length;
      const markdown = `![](${relativePath})`;

      view.dispatch({
        changes: { from: insertAt, insert: markdown + '\n' }
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
            <>
              {onPopOutLinkedNote && (
                <button
                  className="editor-action-btn"
                  title="Open in new window"
                  onClick={onPopOutLinkedNote}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <polyline points="15 3 21 3 21 9" />
                    <line x1={10} y1={14} x2={21} y2={3} />
                    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                  </svg>
                </button>
              )}
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
            </>
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
        <div className="toolbar-with-toggle">
          <DrawingToolbar
            currentColor={drawingColor}
            lineWidth={drawingWidth}
            background={drawingBackground}
            onColorChange={(newColor) => { setDrawingColor(newColor); }}
            onWidthChange={(newWidth) => { setDrawingWidth(newWidth); }}
            onBackgroundChange={handleBackgroundChange}
            onClear={handleClearCanvas}
            onEraserToggle={() => { setIsEraser(prev => !prev); }}
            isEraser={isEraser}
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            isNoteEmpty={isNoteEmpty}
            onNoteTypeChange={onNoteTypeChange}
          />
        </div>
      ) : (
        !hideToolbar && showToolbar && (
          <div className="toolbar-with-toggle">
            <MarkdownToolbar
              onFormat={handleFormat}
              onToggleLineNumbers={toggleLineNumbers}
              showLineNumbers={showLineNumbers}
              isNoteEmpty={isNoteEmpty}
              onNoteTypeChange={onNoteTypeChange}
            />
          </div>
        )
      )}
      <div className="editor-main-container">
        <div className="editor-body" ref={editorBodyRef}>
          {/* Editor condicional según tipo de nota */}
          {note.noteType === 'drawing' ? (
            <>
              <DrawingCanvas
                drawingData={note.drawingData}
                background={drawingBackground}
                onChange={handleDrawingChange}
                color={drawingColor}
                lineWidth={drawingWidth}
                isEraser={isEraser}
                zoomLevel={zoomLevel}
                onZoomChange={setZoomLevel}
              />
              {showClearConfirm && (
                <div className="clear-confirm-overlay">
                  <div className="clear-confirm-card">
                    <span>Clear canvas?</span>
                    <div className="clear-confirm-actions">
                      <button className="clear-confirm-yes" onClick={confirmClearCanvas}>Yes</button>
                      <button className="clear-confirm-no" onClick={() => setShowClearConfirm(false)}>No</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div
                ref={editorRef}
                onClick={() => {
                  if (viewRef.current) {
                    viewRef.current.focus();
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`codemirror-container ${isDragging ? 'dragging' : ''} ${showLineNumbers ? 'show-line-numbers' : ''} ${hideEditor ? 'editor-hidden' : ''}`}
              />
              {/* Botón de Preview y panel solo para notas de texto */}
              {!hideEditor && (
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
              )}
              {showPreview && (
                <div className="preview-container" style={{ width: hideEditor ? '100%' : (previewWidth ?? '50%') }}>
                  {!hideEditor && (
                    <div
                      className="preview-resize-handle"
                      onMouseDown={handlePreviewMouseDown}
                    />
                  )}
                  <NoteInfoPanel
                    note={note}
                    folders={folders}
                  />
                  <ForwardLinksPanel
                    content={note?.content}
                    onLinkClick={onNoteLinkClick}
                  />
                  <BacklinksPanel
                    noteName={note?.name}
                    onBacklinkClick={onNoteLinkClick}
                  />
                  <TableOfContents
                    content={note?.content || ''}
                    onHeadingClick={handleTocClick}
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
