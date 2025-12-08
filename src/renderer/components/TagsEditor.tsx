import React, { useState, useCallback } from "react";
import './TagsEditor.css';

interface TagsEditorProps {
  tags: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
}

export default function TagsEditor({ tags, onAdd, onRemove }: TagsEditorProps) {
  const [value, setValue] = useState('');
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const t = value.trim().replace(/,$/g, '');
      if (t) { onAdd(t); setValue(''); }
    }
  }, [value, onAdd]);
  return (
    <div className="metadata-item metadata-tags">
      <div className="tags-wrapper" id="tagsWrapper">
        <div className="tags-container" id="tagsContainer">
          {(tags || []).map(tag => (
            <div key={tag} className="tag-badge">
              <span>{tag}</span>
              <button className="tag-remove" onClick={() => onRemove(tag)}>×</button>
            </div>
          ))}
        </div>
        <input type="text" className="tag-input" id="tagInput" placeholder="Add Tags" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={onKeyDown} />
      </div>
    </div>
  );
}
