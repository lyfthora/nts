import React from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';

// Import the main App component from the dashboard file and rename it for clarity
import { App as Dashboard } from '../ui/dashboard/dashboard';

// Import the dashboard's CSS to ensure styles are applied
import '../windows/dashboard/styles.css';
import '../windows/dashboard/metadata.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}
