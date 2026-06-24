import React, { useState, useCallback, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import NoteWindow from "./pages/NoteWindow";
import AuthScreen from "./components/AuthScreen";
import "./styles/global.css";
import SubscriptionScreen from "./components/SubscriptionScreen";
import { apiClient } from "./services/apiClient";
import { canAccessApp, getSubscriptionStatusKind } from "./utils/subscription";
const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [userName, setUserName] = useState("");
const [userEmail, setUserEmail] = useState("");

  const applyTokenSession = useCallback((token: string | null) => {
    if (!token) {
      setIsAuthenticated(false);
      setUserName("");
      setUserEmail("");
      setHasAccess(null);
      return false;
    }

    const payload = decodeJwtPayload(token);
    if (!payload) {
      window.api.clearAuthToken();
      setIsAuthenticated(false);
      setUserName("");
      setHasAccess(null);
      return false;
    }

    const email = (payload.email as string) || "";
    setUserName((payload.name as string) || email || "User");
    setUserEmail(email);
    setIsAuthenticated(true);
    return true;
  }, []);

  const checkAccess = useCallback(async () => {
    try {
      const status = await apiClient.getSubscriptionStatus();
      const kind = getSubscriptionStatusKind(status.status);

      if (kind === "access") {
        setHasAccess(true);
        return;
      }

      if (kind === "blocked") {
        setHasAccess(false);
        return;
      }

      setHasAccess(true);
    } catch {
      setHasAccess(true);
    }
  }, []);

  useEffect(() => {
    const token = window.api.getAuthToken();
    const hasValidSession = applyTokenSession(token);

    if (hasValidSession) {
      checkAccess().finally(() => setIsBootstrapping(false));
    } else {
      setIsBootstrapping(false);
    }
  }, [applyTokenSession, checkAccess]);

  const handleAuthenticated = useCallback(() => {
    const token = window.api.getAuthToken();
    const hasValidSession = applyTokenSession(token);

    if (!hasValidSession) {
      return;
    }

    setHasAccess(null);
    checkAccess();
  }, [applyTokenSession, checkAccess]);

  const handleLogout = useCallback(() => {
    window.api.clearCachedData();
    window.api.clearAuthToken();
    setIsAuthenticated(false);
    setHasAccess(null);
    setUserName("");
     setUserEmail("");
  }, []);
  // what show
  if (mode === "note-window") {
    return <NoteWindow />;
  }
  if (isBootstrapping) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  if (hasAccess === null) {
    return <div className="loading-screen">Checking subscription...</div>;
  }

  if (!hasAccess) {
    return (
      <SubscriptionScreen
        onLogout={handleLogout}
        onSubscribed={() => setHasAccess(true)}
      />
    );
  }

  return <Dashboard userName={userName} userEmail={userEmail} onLogout={handleLogout} />;
}
