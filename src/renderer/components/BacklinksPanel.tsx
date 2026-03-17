import React, { memo, useEffect, useState } from "react";
import "./BacklinksPanel.css";

interface BacklinkItem {
  id: number;
  name: string;
  preview: string;
}

interface BacklinksPanelProps {
  noteName: string | undefined;
  onBacklinkClick?: (noteName: string) => void;
}
const BacklinksPanel = memo(function BacklinksPanel({
  noteName,
  onBacklinkClick,
}: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!noteName) {
      setBacklinks([]);
      return;
    }
    window.api
      .getBacklinks(noteName)
      .then((links: BacklinkItem[]) => setBacklinks(links))
      .catch(() => setBacklinks([]));
  }, [noteName]);

  if (backlinks.length === 0) return null;

  return (
    <div className="backlinks-panel">
      <div className="backlinks-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className={`backlinks-arrow ${isExpanded ? "expanded" : ""}`}>▶</span>
        <span className="backlinks-label">Backlinks</span>
        <span className="backlinks-count">({backlinks.length})</span>
      </div>
      {isExpanded && (
        <div className="backlinks-list">
          {backlinks.map((link, index) => (
            <div
              key={link.id}
              className="backlinks-item"
              onClick={() => onBacklinkClick?.(link.name)}
            >
              <span className="backlinks-item-prefix">
                {index === backlinks.length - 1 ? "└─" : "├─"}
              </span>
              <span className="backlinks-item-text">{link.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
export default BacklinksPanel;
