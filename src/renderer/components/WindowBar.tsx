import React from "react";
import './WindowBar.css';

interface WindowBarProps {
  onMinimize: () => void;
  onClose: () => void;
}

export default function WindowBar({ onMinimize, onClose }: WindowBarProps) {
  return (
    <div className="note-window-bar">
      <div className="window-title" />
      <div className="window-controls">
        <button className="window-btn minimize-btn" onClick={onMinimize} />
        <button className="window-btn close-btn" onClick={onClose} />
      </div>
    </div>
  );
}
