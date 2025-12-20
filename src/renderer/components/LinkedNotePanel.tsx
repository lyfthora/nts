import React, { memo } from "react";
import EditorPanel from "./EditorPanel";
import "./LinkedNotePanel.css";

interface LinkedNotePanelProps {
  note: any | null;
  folders: any[];
  onClose: () => void;
  onChange: (n: any) => void;
  onDelete: (n: any) => void;
  onStatus: (n: any) => void;
  onTagAdd: (n: any) => void;
  onTagRemove: (n: any) => void;
  onPin: (n: any) => void;
}

const LinkedNotePanel = memo(function LinkedNotePanel({
  note,
  folders,
  onClose,
  onChange,
  onDelete,
  onStatus,
  onTagAdd,
  onTagRemove,
  onPin,
}: LinkedNotePanelProps) {
  const [panelWidth, setPanelWidth] = React.useState(400);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const isResizing = React.useRef(false);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    e.preventDefault();
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();

      const newWidth = rect.right - e.clientX;

      if (newWidth >= 150 && newWidth <= 2000) {
        setPanelWidth(newWidth);
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

  if (!note) return null;
  return (
    <div className="linked-note-panel" ref={panelRef} style={{ width: `${panelWidth}px` }}>
      <div
        className="linked-note-resize-handle"
        onMouseDown={handleMouseDown}
      />
      <EditorPanel
        note={note}
        folders={folders}
        onChange={onChange}
        onDelete={onDelete}
        onStatus={onStatus}
        onTagAdd={onTagAdd}
        onTagRemove={onTagRemove}
        onPin={onPin}
        isTrashView={false}
        hideToolbar={true}
        isLinkedNote={true}
        onCloseLinkedNote={onClose}
      />
    </div>
  );
});

export default LinkedNotePanel;


