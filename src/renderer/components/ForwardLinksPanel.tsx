import React, { memo, useState, useMemo } from "react";
import "./ForwardLinksPanel.css";

interface ForwardLinksPanelProps {
  content?: string;
  onLinkClick?: (noteName: string) => void;
}

function extractForwardLinks(content: string): string[] {
  if (!content) return [];
  const regex = /@"([^"]+)"|@([^\s]+)/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1] || match[2];
    if (name && !links.includes(name)) {
      links.push(name);
    }
  }
  return links;
}

const ForwardLinksPanel = memo(function ForwardLinksPanel({
  content,
  onLinkClick,
}: ForwardLinksPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const forwardLinks = useMemo(
    () => extractForwardLinks(content || ''),
    [content]
  );

  if (forwardLinks.length === 0) return null;

  return (
    <div className="forward-links-panel">
      <div className="forward-links-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className={`forward-links-arrow ${isExpanded ? "expanded" : ""}`}>▶</span>
        <span className="forward-links-label">Forward Links</span>
        <span className="forward-links-count">({forwardLinks.length})</span>
      </div>
      {isExpanded && (
        <div className="forward-links-list">
          {forwardLinks.map((name, index) => (
            <div
              key={name}
              className="forward-links-item"
              onClick={() => onLinkClick?.(name)}
            >
              <span className="forward-links-item-prefix">
                {index === forwardLinks.length - 1 ? "└─" : "├─"}
              </span>
              <span className="forward-links-item-text">{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default ForwardLinksPanel;
