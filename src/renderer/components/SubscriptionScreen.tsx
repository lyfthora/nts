import React, { useState, useCallback, useEffect } from "react";
import { apiClient } from "../services/apiClient";
import type { SubscriptionStatus } from "../types/models";
import {
  canAccessApp,
  getSubscriptionAction,
  getSubscriptionSummary,
  getSubscriptionStatusKind,
} from "../utils/subscription";
import "./SubscriptionScreen.css";

interface SubscriptionScreenProps {
  onLogout: () => void;
  onSubscribed: () => void;
}

export default function SubscriptionScreen({
  onLogout,
  onSubscribed,
}: SubscriptionScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  const loadStatus = useCallback(async () => {
    const nextStatus = await apiClient.getSubscriptionStatus();
    setStatus(nextStatus);
    return nextStatus;
  }, []);

  useEffect(() => {
    loadStatus().catch(() => {
      setError("Could not load subscription details. Please try again.");
    });
  }, [loadStatus]);

  useEffect(() => {
    const cleanup = window.api.onPaymentEvent(async (data) => {
      if (data.status === "success") {
        setError("");
        setLoading(true);
        try {
          const nextStatus = await loadStatus();
          if (canAccessApp(nextStatus.status)) {
            onSubscribed();
            setLoading(false);
            return;
          }
          let attempt = 0;
          const interval = setInterval(async () => {
            attempt++;
            const s = await loadStatus();
            if (canAccessApp(s.status)) {
              clearInterval(interval);
              onSubscribed();
              setLoading(false);
            } else if (attempt >= 5) {
              clearInterval(interval);
              setLoading(false);
              setError("Subscription update not detected yet. Please tap 'Refresh subscription status'.");
            }
          }, 2000);
        } catch (err) {
          setLoading(false);
          setError("Error refreshing status. Please try manually.");
        }
      } else if (data.status === "cancel") {
        setError("Subscription flow canceled.");
      }
    });
    return cleanup;
  }, [loadStatus, onSubscribed]);

  const handleSubscriptionAction = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const currentStatus = status ?? (await loadStatus());
      const statusKind = getSubscriptionStatusKind(currentStatus.status);

      if (statusKind === "access") {
        onSubscribed();
        return;
      }

      const action = getSubscriptionAction(currentStatus.status);
      const { url } =
        action.mode === "portal"
          ? await apiClient.createPortalSession()
          : await apiClient.createCheckoutSession();

      window.api.openExternal(url);
    } catch {
      setError("Could not open the subscription flow. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loadStatus, status]);

  const handleCheckStatus = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const nextStatus = await loadStatus();
      if (canAccessApp(nextStatus.status)) {
        onSubscribed();
      }
    } catch {
      setError(
        "Subscription update not detected yet. Please try again in a few seconds.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadStatus, onSubscribed]);

  const action = getSubscriptionAction(status?.status ?? "expired");
  const statusLabel =
    status?.status === "active"
      ? "Premium active"
      : status?.status === "trial" || status?.status === "trialing"
        ? "Trial active"
        : "Premium required";
  const statusSummary = status ? getSubscriptionSummary(status) : null;

  return (
    <div className="sub-container">
      <div className="sub-card">
        <div className="sub-badge">Premium</div>
        <h1 className="sub-title">Keep your notes synced everywhere</h1>
        <p className="sub-description">
          Unlock cloud sync, drawings, image attachments, and multi-device
          access with the premium plan.
        </p>

        <div className="sub-status-panel">
          <div className="sub-status-header">
            <span className="sub-status-label">{statusLabel}</span>
            {status && (
              <span className={`sub-status-pill sub-status-${status.status}`}>
                {status.status}
              </span>
            )}
          </div>
          {statusSummary && (
            <p className="sub-status-summary">{statusSummary}</p>
          )}
        </div>

        <div className="sub-price-tag">
          <span className="price">$3</span>
          <span className="period">/ month</span>
        </div>

        <ul className="sub-features">
          <li>Unlimited cloud sync</li>
          <li>Drawing and handwritten notes</li>
          <li>Image attachments</li>
          <li>Multi-device support</li>
        </ul>

        {error && <p className="sub-error">{error}</p>}

        <div className="sub-actions">
          <button
            className="sub-btn sub-btn-primary"
            onClick={handleSubscriptionAction}
            disabled={loading}
          >
            {loading ? "Processing..." : action.label}
          </button>

          <button
            className="sub-btn sub-btn-secondary"
            onClick={handleCheckStatus}
            disabled={loading}
          >
            Refresh subscription status
          </button>

          <button className="sub-btn sub-btn-link" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
