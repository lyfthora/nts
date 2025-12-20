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
  if (!note) return null;
  return (
    <div className="linked-note-panel">
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


