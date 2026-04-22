import React, { useState, useCallback } from 'react';
import Dashboard from './pages/Dashboard';
import NoteWindow from './pages/NoteWindow';
import AuthScreen from './components/AuthScreen';
import './styles/global.css';

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAuthenticated = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  if (mode === 'note-window') {
    return <NoteWindow />;
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return <Dashboard />;
}
