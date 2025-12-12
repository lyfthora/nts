import React, { memo, useEffect, useRef, useState } from "react";
import { EditorView, basicSetup } from "codemirror";
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
import { gotoLine } from "@codemirror/search";

import "./EditorPanel.css";

interface EditorPanelProps {
  note: any | null;
  onChange: (n: any) => void;
  onDelete: (n: any) => void;
  onRestore?: (n: any) => void;
  onDeletePermanently?: (n: any) => void;
  onStatus: (n: any) => void;
  onTagAdd: (n: any) => void;
  onTagRemove: (n: any) => void;
  onPin: (n: any) => void;
  isTrashView?: boolean;
}

const EditorPanel = memo(function EditorPanel({
  note,
  onChange,
  onDelete,
  onRestore,
  onDeletePermanently,
  onStatus,
  onTagAdd,
  onTagRemove,
  onPin,
  isTrashView,
}: EditorPanelProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [showLineNumbers, setShowLineNumbers] = useState(false);

  useEffect(() => {
    if (!editorRef.current || !note) return;

    const startState = EditorState.create({
      doc: note.content || "",
      extensions: [
        basicSetup,
        markdown({ extensions: [Strikethrough] }),
        oneDark,
        syntaxHighlighting(classHighlighter),

        EditorView.lineWrapping,
        markdownKeymap,
        Prec.highest(
          keymap.of([
            {
              key: "Mod-g",
              run: gotoLine,
            },
          ])
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString();
            onChange({ ...note, content: newContent });
          }
        }),
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
  }, [note?.id]);

  useEffect(() => {
    if (!viewRef.current || !note) return;

    const currentContent = viewRef.current.state.doc.toString();
    if (currentContent !== note.content) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: note.content || "",
        },
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
          placeholder="Untitled"
          value={note.name || ""}
          onChange={(e) => onChange({ ...note, name: e.target.value })}
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

      <MarkdownToolbar
        onFormat={handleFormat}
        onToggleLineNumbers={toggleLineNumbers}
        showLineNumbers={showLineNumbers}
      />

      <div className="editor-body">
        <div ref={editorRef} className={`codemirror-container ${showLineNumbers ? 'show-line-numbers' : ''}`}></div>
      </div>
    </div>
  );
});

export default EditorPanel;
