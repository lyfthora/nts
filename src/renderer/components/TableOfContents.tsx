import React, { memo, useState, useMemo } from "react";
import "./TableOfContents.css";

interface Heading {
  level: number;
  text: string;
  line: number;
}
interface TableOfContentsProps {
  content: string;
  onHeadingClick: (line: number) => void;
}

const TableOfContents = memo(function TableOfContents({
  content,
  onHeadingClick,
}: TableOfContentsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const headings = useMemo((): Heading[] => {
    if (!content) return [];
    const result: Heading[] = [];
    const lines = content.split("\n");
    let inCodeBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trimStart().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        result.push({
          level: match[1].length,
          text: match[2].replace(/[#*_`~\[\]]/g, "").trim(),
          line: i + 1,
        });
      }
    }
    return result;
  }, [content]);
  if (headings.length === 0) return null;
  return (
    <div className="toc-panel">
      <div className="toc-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className={`toc-arrow ${isExpanded ? "expanded" : ""}`}>▶</span>
        <span className="toc-label">Contents</span>
        <span className="toc-count">({headings.length})</span>
      </div>
      {isExpanded && headings.length > 0 && (
        <div className="toc-list">
          {headings.map((h, index) => (
            <div
              key={`${h.line}-${index}`}
              className="toc-item"
              style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
              onClick={() => onHeadingClick(h.line)}
              title={h.text}
            >
              <span className="toc-item-prefix">
                {index === headings.length - 1 ? "└─" : "├─"}
              </span>
              <span className="toc-item-text">{h.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
export default TableOfContents;
