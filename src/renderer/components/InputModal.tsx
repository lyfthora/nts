import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./InputModal.css";

interface InputModalProps {
  isOpen: boolean;
  title: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function InputModal({
  isOpen,
  title,
  defaultValue = "",
  placeholder = "",
  onConfirm,
  onCancel,
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue, isOpen]);

  const handleConfirm = () => {
    if (value.trim()) onConfirm(value.trim());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="input-modal-overlay"
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="input-modal-content"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="input-modal-title">{title}</div>
            <input
              className="input-modal-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
                if (e.key === 'Escape') onCancel();
              }}
            />
            <div className="input-modal-actions">
              <button className="input-modal-btn cancel" onClick={onCancel}>
                Cancelar
              </button>
              <button className="input-modal-btn confirm" onClick={handleConfirm}>
                Confirmar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
