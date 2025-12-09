import React, { useState, useEffect } from "react";
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

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (value.trim()) onConfirm(value.trim());
  };

  return (
    <div className="input-modal-overlay" onClick={onCancel}>
      <div className="input-modal-content" onClick={(e) => e.stopPropagation()}>
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
      </div>
    </div>
  );
}
