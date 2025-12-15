import React, { useEffect, useState } from 'react';
import './UpdateIndicator.css';

export default function UpdateIndicator() {
  const [status, setStatus] = useState<'idle' | 'available' | 'downloading' | 'ready'>('idle');

  useEffect(() => {
    const removeAvailable = window.api.onUpdateAvailable(() => {
      setStatus('available');
    });
    const removeDownloaded = window.api.onUpdateDownloaded(() => {
      setStatus('ready');
    });

    return () => {
      removeAvailable();
      removeDownloaded();
    };
  }, []);

  const handleClick = async () => {
    if (status === 'available') {
      setStatus('downloading');
      await window.api.downloadUpdate();
    } else if (status === 'ready') {
      window.api.quitAndInstall();
    }
  };

  if (status === 'idle') return null;

  return (
    <button
      className={`update-indicator ${status}`}
      onClick={handleClick}
      title={status === 'ready' ? "Click to restart and update" : "Update available"}
      disabled={status === 'downloading'}
    >
      {status === 'downloading' ? (
        <div className="spinner" />
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
      {status === 'ready' && <span className="update-badge" />}
    </button>
  );
}
