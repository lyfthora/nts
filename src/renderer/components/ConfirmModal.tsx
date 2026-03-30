import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./ConfirmModal.css";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: ()=> void;
}

export default function ConfirmModal({
 isOpen,
 title,
 message,
 confirmLabel,
 cancelLabel,
 variant = "default",
 onConfirm,
 onCancel,
}: ConfirmModalProps ) {
const confirmBtnRef = useRef<HTMLButtonElement>(null);

useEffect (() => {
  if (isOpen) {
    const previouslyFocused = document.activeElement as HTMLElement;
    setTimeout(() => confirmBtnRef.current?.focus(), 50);
    return () => {
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }
}, [isOpen]);

useEffect(()=> {
  if (!isOpen) return;
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onCancel();

  };
  window.addEventListener("keydown", handleKeyDown);
  return() => window.removeEventListener("keydown", handleKeyDown);
}, [isOpen, onCancel]);
return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="confirm-modal-overlay"
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="confirm-modal-content"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="confirm-modal-title">{title}</div>
            <div className="confirm-modal-message">{message}</div>
            <div className="confirm-modal-actions">
              <button className="confirm-modal-btn cancel" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button
                ref={confirmBtnRef}
                className={`confirm-modal-btn confirm ${variant === "danger" ? "danger" : ""}`}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
