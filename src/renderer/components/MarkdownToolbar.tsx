import React from "react";
import "./MarkdownToolbar.css";

interface MarkdownToolbarProps {
  onToggleLineNumbers: () => void;
  onFormat: (type: string) => void;
  showLineNumbers: boolean;
}

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ onFormat, onToggleLineNumbers, showLineNumbers }) => {
  return (
    <div className="markdown-toolbar">
      <button
        className="toolbar-btn"
        title="Bold (Ctrl+B)"
        onClick={() => onFormat("bold")}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
        </svg>
      </button>

      <button
        className="toolbar-btn"
        title="Italic (Ctrl+I)"
        onClick={() => onFormat("italic")}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
        </svg>
      </button>

      <button
        className="toolbar-btn"
        title="Strikethrough (Ctrl+U)"
        onClick={() => onFormat("strikethrough")}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 3.6 3.9h.2m8.2 3.7c.3.4.4.8.4 1.3 0 2.9-2.7 3.6-5.3 3.6-2.3 0-4.4-.3-6.2-.9M4 11.5h16" />
        </svg>
      </button>

      <div className="toolbar-separator"></div>

      <button
        className="toolbar-btn"
        title="Heading"
        onClick={() => onFormat("h1")}
      >
        <span className="toolbar-text">H</span>
      </button>

      <div className="toolbar-separator"></div>

      <button
        className="toolbar-btn"
        title="Bullet List"
        onClick={() => onFormat("ul")}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1={8} y1={6} x2={21} y2={6} />
          <line x1={8} y1={12} x2={21} y2={12} />
          <line x1={8} y1={18} x2={21} y2={18} />
          <line x1={3} y1={6} x2={3.01} y2={6} />
          <line x1={3} y1={12} x2={3.01} y2={12} />
          <line x1={3} y1={18} x2={3.01} y2={18} />
        </svg>
      </button>

      <button
        className="toolbar-btn"
        title="Numbered List"
        onClick={() => onFormat("ol")}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1={10} y1={6} x2={21} y2={6} />
          <line x1={10} y1={12} x2={21} y2={12} />
          <line x1={10} y1={18} x2={21} y2={18} />
          <path d="M4 6h1v4M4 10h2" />
          <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        </svg>
      </button>

      <button
        className="toolbar-btn"
        title="Task List"
        onClick={() => onFormat("task")}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </button>

      <div className="toolbar-separator"></div>

      <button
        className="toolbar-btn"
        title="Quote"
        onClick={() => onFormat("quote")}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
        </svg>
      </button>

      <button
        className="toolbar-btn"
        title="Code Block (Ctrl+T)"
        onClick={() => onFormat("code")}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </button>

      <button
        className="toolbar-btn"
        title="Inline Code (Ctrl+E)"
        onClick={() => onFormat("inlineCode")}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </button>

      <div className="toolbar-separator"></div>

      <button
        className="toolbar-btn"
        title="Link (Ctrl+K)"
        onClick={() => onFormat("link")}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
      <button
        className={`toolbar-btn ${showLineNumbers ? 'active' : ''}`}
        title="Toggle Line Numbers"
        onClick={onToggleLineNumbers}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1={4} y1={6} x2={4} y2={6} strokeLinecap="round" />
          <line x1={4} y1={12} x2={4} y2={12} strokeLinecap="round" />
          <line x1={4} y1={18} x2={4} y2={18} strokeLinecap="round" />
          <line x1={8} y1={6} x2={20} y2={6} />
          <line x1={8} y1={12} x2={20} y2={12} />
          <line x1={8} y1={18} x2={20} y2={18} />
        </svg>
      </button>
    </div>
  );
};

export default MarkdownToolbar;
