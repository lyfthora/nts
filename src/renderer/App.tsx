import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import NoteWindow from './pages/NoteWindow';
import AuthScreen from './components/AuthScreen';
import './styles/global.css';

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const token = window.api.getAuthToken();
    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload) {
        setUserName((payload.name as string) || (payload.email as string) || 'User');
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleAuthenticated = useCallback(() => {
    const token = window.api.getAuthToken();
    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload) {
        setUserName((payload.name as string) || (payload.email as string) || 'User');
      }
    }
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    window.api.clearAuthToken();
    setIsAuthenticated(false);
    setUserName('');
  }, []);

  if (mode === 'note-window') {
    return <NoteWindow />;
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return <Dashboard userName={userName} onLogout={handleLogout} />;
}
