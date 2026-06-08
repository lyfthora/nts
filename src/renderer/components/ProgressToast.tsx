import React, { useEffect, useRef } from "react";
import type { ProgressData } from "../types/models";
import "./ProgressToast.css";

interface ProgressToastProps {
  progress: ProgressData | null;
  onClose: () => void;
}

export default function ProgressToast({ progress, onClose}: ProgressToastProps) {
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    if (progress && (progress.status == "success" || progress.status === "error")) {
      timerRef.current = window.setTimeout(onClose, 2500);
    }
    return () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    };
  }, [progress, onClose]);

  if (!progress || progress.status === "idle") return null;

return (
    <div className={`progress-toast toast-state-${progress.status}`}>
      <div className="progress-toast-header">
        <div className="progress-toast-icon">
          {progress.status === "loading" && (
            <div className="progress-toast-spinner" />
          )}
          {progress.status === "success" && (
            <svg className="progress-toast-check" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {progress.status === "error" && (
            <svg className="progress-toast-error-icon" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>
        <span className="progress-toast-message">{progress.message}</span>
      </div>
      <div className="progress-toast-bar-track">
        <div
          className="progress-toast-bar-fill"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}
