import React, { useState, useCallback, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import NoteWindow from "./pages/NoteWindow";
import AuthScreen from "./components/AuthScreen";
import "./styles/global.css";
import { apiClient } from "./services/apiClient";
import { getSubscriptionStatusKind } from "./utils/subscription";
import { decodeJwt, isTokenExpired } from "./utils/authUtils";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const applyTokenSession = useCallback((token: string | null) => {
    if (!token || isTokenExpired(token)) {
      if (token) {
        window.api.clearAuthToken();
        window.api.clearCachedData();
      }
      setIsAuthenticated(false);
      setUserName("");
      setUserEmail("");
      setHasAccess(null);
      return false;
    }

    const payload = decodeJwt(token);
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
      // Solo "access" habilita premium; "warning" (p. ej. past_due) no.
      setHasAccess(getSubscriptionStatusKind(status.status) === "access");
    } catch {
      // Nunca conceder premium por un fallo de red/API: se conserva el último
      // estado conocido y, si todavía no hay ninguno, se arranca bloqueado.
      setHasAccess((previous) => previous ?? false);
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

  const handleAccessChanged = useCallback((access: boolean) => {
    setHasAccess(access);
  }, []);

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
    return (
      <div className="loading-screen">
        <div className="loader"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  if (hasAccess === null) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
      </div>
    );
  }

  return <Dashboard userName={userName} userEmail={userEmail} onLogout={handleLogout} isPremium={hasAccess === true} onAccessChanged={handleAccessChanged} />;
}
