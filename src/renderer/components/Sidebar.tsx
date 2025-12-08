import React from "react";
import './Sidebar.css';
import buttonIcon from '../assets/icons/button.png';
import pauseIcon from '../assets/icons/pause.png';
import checkedIcon from '../assets/icons/checked.png';
import removeIcon from '../assets/icons/remove.png';

interface SidebarProps {
  notes: any[];
  view: string;
  onViewChange: (v: string) => void;
  counts: Record<string, number>;
  tags: { name: string; count: number }[];
}

export default function Sidebar({ notes, view, onViewChange, counts, tags }: SidebarProps) {
  const Item = ({ view: v, children }: any) => (
    <a href="#" className={`nav-item${view === v ? " active" : ""}`} onClick={(e) => { e.preventDefault(); onViewChange(v); }}>{children}</a>
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <pre className="ascii-logo">{`█░░ ▄▀█ █ █▄░█
█▄▄ █▀█ █ █░▀█`}</pre>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">
          <Item view="all-notes">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            <span>All Notes</span>
            <span className="nav-count" id="allNotesCount">{String(notes.length)}</span>
          </Item>
          <Item view="pinned">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>
            <span>Pinned Notes</span>
            <span className="nav-count" id="pinnedCount">0</span>
          </Item>
        </div>
        <div className="nav-section">
          <div className="nav-section-header">
            <button className="nav-collapse-btn" data-section="status"><svg className="chevron" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg></button>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={12} cy={12} r={10} /><path d="M12 6v6l4 2" /></svg>
            <span>Status</span>
          </div>
          <div className="nav-subsection" id="statusSection">
            <Item view="status-active"><span className="status-dot status-active" style={{ backgroundImage: `url(${buttonIcon})` }} /><span>Active</span><span className="nav-count" id="count-active">{String(counts.active)}</span></Item>
            <Item view="status-onhold"><span className="status-dot status-onhold" style={{ backgroundImage: `url(${pauseIcon})` }} /><span>On Hold</span><span className="nav-count" id="count-onhold">{String(counts.onhold)}</span></Item>
            <Item view="status-completed"><span className="status-dot status-completed" style={{ backgroundImage: `url(${checkedIcon})` }} /><span>Completed</span><span className="nav-count" id="count-completed">{String(counts.completed)}</span></Item>
            <Item view="status-dropped"><span className="status-dot status-dropped" style={{ backgroundImage: `url(${removeIcon})` }} /><span>Dropped</span><span className="nav-count" id="count-dropped">{String(counts.dropped)}</span></Item>
          </div>
        </div>
        <div className="nav-section">
          <div className="nav-section-header">
            <button className="nav-collapse-btn" data-section="tags"><svg className="chevron" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg></button>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1={7} y1={7} x2={7.01} y2={7} /></svg>
            <span>Tags</span>
          </div>
          <div className="nav-subsection" id="tagsSection">
            {tags.map(t => (
              <a key={t.name} href="#" className="nav-item nav-nested" onClick={(e) => { e.preventDefault(); onViewChange(`tag-${t.name}`); }}>
                <span className="tag-hash">#</span><span>{t.name}</span><span className="nav-count">{String(t.count)}</span>
              </a>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
