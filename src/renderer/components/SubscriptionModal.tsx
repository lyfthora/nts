import React, { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SubscriptionStatus } from "../types/models";
import {
  getSubscriptionAction,
  getSubscriptionStatusKind,
  getSubscriptionSummary,
} from "../utils/subscription";
import "./SubscriptionModal.css";

interface SubscriptionModalProps {
  isOpen: boolean;
  status: SubscriptionStatus | null;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onPrimaryAction: () => void;
  onRefresh: () => void;
}

export default function SubscriptionModal({
  isOpen,
  status,
  loading = false,
  error,
  onClose,
  onPrimaryAction,
  onRefresh,
}: SubscriptionModalProps) {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const timeout = setTimeout(() => primaryButtonRef.current?.focus(), 50);

    return () => {
      clearTimeout(timeout);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const action = useMemo(
    () => getSubscriptionAction(status?.status ?? "expired"),
    [status],
  );
  const summary = status ? getSubscriptionSummary(status) : null;
  const kind = status ? getSubscriptionStatusKind(status.status) : "blocked";
  const heading =
    kind === "access"
      ? status?.status === "active"
        ? "Premium active"
        : "Trial active"
      : kind === "warning"
        ? "Subscription attention needed"
        : "Premium required";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="subscription-modal-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="subscription-modal-content"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="subscription-modal-header">
              <div>
                <div className="subscription-modal-eyebrow">Billing</div>
                <h2 className="subscription-modal-title">{heading}</h2>
              </div>
              {status && (
                <span
                  className={`subscription-modal-pill subscription-modal-pill-${status.status}`}
                >
                  {status.status}
                </span>
              )}
            </div>

            <p className="subscription-modal-description">
              {summary ||
                "Check your subscription status, remaining trial time, and billing access."}
            </p>

            <div className="subscription-modal-card">
              <div className="subscription-modal-price">
                <span className="subscription-modal-price-value">$3</span>
                <span className="subscription-modal-price-period">/ month</span>
              </div>
              <ul className="subscription-modal-list">
                <li>Cloud sync across devices</li>
                <li>Drawing and handwritten notes</li>
                <li>Image attachments</li>
                <li>Managed billing from the app</li>
              </ul>
            </div>

            {error && <div className="subscription-modal-error">{error}</div>}

            <div className="subscription-modal-actions">
              <button
                className="subscription-modal-btn subscription-modal-btn-secondary"
                onClick={onRefresh}
                disabled={loading}
              >
                Refresh status
              </button>
              <button
                ref={primaryButtonRef}
                className="subscription-modal-btn subscription-modal-btn-primary"
                onClick={onPrimaryAction}
                disabled={loading}
              >
                {loading ? "Processing..." : action.label}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
