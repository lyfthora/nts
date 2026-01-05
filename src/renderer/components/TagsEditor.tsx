import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from "react";
import './TagsEditor.css';

interface TagsEditorProps {
  tags: string[];
  existingTags?: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
}
const TagsEditor = memo(function TagsEditor({ tags, existingTags = [], onAdd, onRemove }: TagsEditorProps) {
  const [value, setValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!value.trim()) return [];
    const query = value.toLowerCase();
    return existingTags.filter(tag => tag.toLowerCase().includes(query) && !tags.includes(tag)).slice(0, 6);
  }, [value, existingTags, tags]);

  useEffect(() => {
    setShowSuggestions(suggestions.length > 0);
    setSelectedIndex(0);
  }, [suggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTag = useCallback((tag: string) => {
    const t = tag.trim().replace(/,$/g, '');
    if (t) {
      onAdd(t);
      setValue('');
      setShowSuggestions(false);
    }
  }, [onAdd]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag(suggestions[selectedIndex]);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setValue(suggestions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(value);
    }
  }, [value, showSuggestions, suggestions, selectedIndex, handleAddTag]);

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
        <div className="tag-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="tag-input"
            id="tagInput"
            placeholder="Add Tags"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
          {showSuggestions && (
            <div ref={suggestionsRef} className="tag-suggestions">
              {suggestions.map((tag, index) => (
                <div
                  key={tag}
                  className={`tag-suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleAddTag(tag)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {tag}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default TagsEditor;
