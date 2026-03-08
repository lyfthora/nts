import React from 'react';
import Dashboard from './pages/Dashboard';
import NoteWindow from './pages/NoteWindow';
import './styles/global.css';
const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
export default function App() {
  if (mode === 'note-window') {
    return <NoteWindow />;
  }
  return <Dashboard />;
}
