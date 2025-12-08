import React, { useCallback } from "react";
import ReactDOM from "react-dom/client";

function WindowControls({
  onMinimize,
  onClose,
}: {
  onMinimize: () => void;
  onClose: () => void;
}) {
  return (
    <div className="note-window-bar">
      <div className="window-title">
        <div className="window-icon" />
        <span>StickyPad</span>
      </div>
      <div className="window-controls">
        <button className="window-btn minimize-btn" onClick={onMinimize} />
        <button className="window-btn close-btn" onClick={onClose} />
      </div>
    </div>
  );
}

function MainButtons({
  onAdd,
  onDashboard,
}: {
  onAdd: () => void;
  onDashboard: () => void;
}) {
  return (
    <div className="main-content">
      <div className="buttons-container">
        <button className="tool-btn" onClick={onAdd}>
          add
        </button>
        <button className="tool-btn" onClick={onDashboard}>
          dashboard
        </button>
      </div>
    </div>
  );
}

function App() {
  const handleAdd = useCallback(() => {
    window.api.createNote();
  }, []);
  const handleDashboard = useCallback(() => {
    window.api.openDashboard();
  }, []);
  const handleMinimize = useCallback(() => {
    window.api.minimizeMain();
  }, []);
  const handleClose = useCallback(() => {
    window.api.closeMain();
  }, []);

  return (
    <div className="main-pad">
      <WindowControls onMinimize={handleMinimize} onClose={handleClose} />
      <MainButtons onAdd={handleAdd} onDashboard={handleDashboard} />
    </div>
  );
}

const rootEl = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootEl);
root.render(<App />);
