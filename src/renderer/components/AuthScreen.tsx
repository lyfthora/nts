import { useState, useCallback } from "react";
import "./AuthScreen.css";

const API_URL = "https://nts-api-production.up.railway.app/api";

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email || !password) {
      setError("Email and password required");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const body = isRegister
        ? { email, password, name: name || undefined }
        : { email, password };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        return;
      }

      window.api.setAuthToken(data.token);
      onAuthenticated();
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }, [email, password, name, isRegister, onAuthenticated]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">{isRegister ? "Create account" : "Welcome back"}</h1>
        <p className="auth-subtitle">
          {isRegister ? "Sign up to sync your notes" : "Sign in to access your notes"}
        </p>

        <div className="auth-form">
          {isRegister && (
            <input
              type="text"
              className="auth-input"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            type="email"
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="auth-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          {error && <p className="auth-error">{error}</p>}

          <button
            className="auth-btn auth-btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "..." : isRegister ? "Sign up" : "Sign in"}
          </button>
        </div>

        <p className="auth-switch">
          {isRegister ? "Already have an account? " : "Don't have an account? "}
          <button onClick={() => { setIsRegister(!isRegister); setError(""); }}>
            {isRegister ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
