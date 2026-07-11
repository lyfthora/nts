import { useState, useCallback, useEffect } from "react";
import "./AuthScreen.css";

const API_URL = "https://nts-api-production-5785.up.railway.app/api";


interface AuthScreenProps {
  onAuthenticated: () => void;
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);

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


  useEffect(() => {
    if (!oauthPending) return;

    const interval = setInterval(async () => {
      try {
        const token = await window.api.getOAuthToken?.();
        if (token) {
          window.api.setAuthToken(token);
          setOauthPending(false);
          onAuthenticated();
        }
      } catch { /* silenciar */ }
    }, 1000);

    return () => clearInterval(interval);
  }, [oauthPending, onAuthenticated]);

  const handleGitHubLogin = useCallback(() => {
    setError("");
    setOauthPending(true);
    window.api.openOAuth(`${API_URL}/auth/github`);
  }, []);

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

          <div className="auth-divider"><span>or</span></div>

          <button
            className="auth-btn auth-btn-oauth"
            onClick={handleGitHubLogin}
            disabled={oauthPending}
          >
            <GitHubIcon />
            <span style={{ position: 'relative', top: '0.1rem' }}>
              {oauthPending ? "Waiting for GitHub..." : "Continue with GitHub"}
            </span>
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
