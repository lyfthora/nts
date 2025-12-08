import React, { useState, useCallback } from "react";
import './StatusDropdown.css';
import buttonIcon from '../assets/icons/button.png';
import pauseIcon from '../assets/icons/pause.png';
import checkedIcon from '../assets/icons/checked.png';
import removeIcon from '../assets/icons/remove.png';

interface StatusDropdownProps {
  status: string;
  onChange: (s: string) => void;
}

export default function StatusDropdown({ status, onChange }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(v => !v), []);

  const getIconForStatus = (s: string) => {
    if (s === 'active') return buttonIcon;
    if (s === 'onhold') return pauseIcon;
    if (s === 'completed') return checkedIcon;
    if (s === 'dropped') return removeIcon;
    return null;
  };

  const dotClass = status === 'active' ? 'status-active' : status === 'onhold' ? 'status-onhold' : status === 'completed' ? 'status-completed' : status === 'dropped' ? 'status-dropped' : '';
  const text = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Status';
  const currentIcon = getIconForStatus(status);

  const Option = (s: string, label: string, cls?: string) => {
    const icon = getIconForStatus(s);
    return (
      <div className="status-option" onClick={() => { onChange(s); setOpen(false); }}>
        {cls ? <span className={`status-dot ${cls}`} style={icon ? { backgroundImage: `url(${icon})` } : {}} /> : null}
        <span>{label}</span>
      </div>
    );
  };

  return (
    <div className={`status-dropdown${open ? ' active' : ''}`}>
      <button className={`status-btn${status ? ' selected' : ''}`} id="statusBtn" onClick={toggle}>
        <span className={`status-dot ${dotClass}`} style={currentIcon ? { backgroundImage: `url(${currentIcon})` } : {}} />
        <span className="status-text" id="statusText">{text}</span>
        <svg className="status-chevron" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      <div className="status-menu" id="statusMenu">
        {Option('', 'None')}
        {Option('active', 'Active', 'status-active')}
        {Option('onhold', 'On Hold', 'status-onhold')}
        {Option('completed', 'Completed', 'status-completed')}
        {Option('dropped', 'Dropped', 'status-dropped')}
      </div>
    </div>
  );
}
