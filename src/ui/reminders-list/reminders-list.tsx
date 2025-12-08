import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

function WindowBar({
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
      </div>
      <div className="window-controls">
        <button
          className="window-btn minimize-btn"
          id="minimizeBtn"
          onClick={onMinimize}
        />
        <button
          className="window-btn close-btn"
          id="closeBtn"
          onClick={onClose}
        />
      </div>
    </div>
  );
}

function ReminderItem({
  reminder,
  onCancel,
}: {
  reminder: any;
  onCancel: (id: number) => void;
}) {
  return (
    <div
      className="reminder-item"
      style={{ borderLeftColor: reminder.color || "#ffffff" }}
    >
      <div className="reminder-item-header">
        <div className="reminder-item-title">
          {reminder.noteName || `Note ${reminder.noteId}`}
        </div>
        {reminder.repeat ? (
          <div
            className="reminder-item-badge"
            style={{ backgroundColor: reminder.color || "#4cd964" }}
          >
            Repeat daily
          </div>
        ) : null}
      </div>
      <div className="reminder-item-info">
        <span className="reminder-item-date">
          <img
            src="../../icons/calendar.png"
            alt="Calendar"
            className="reminder-icon"
          />
          {new Date(reminder.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        <span className="reminder-item-time">
          <img
            src="../../icons/clock.png"
            alt="Clock"
            className="reminder-icon"
          />
          {reminder.time}
        </span>
      </div>
      <div className="reminder-item-actions">
        <button
          className="cancel-reminder-btn"
          onClick={() => onCancel(reminder.noteId)}
        >
          Cancel Reminder
        </button>
      </div>
    </div>
  );
}

function App() {
  const [reminders, setReminders] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    window.api.getAllReminders().then((rs: any[]) => {
      if (mounted) setReminders(rs || []);
    });
    return () => {
      mounted = false;
    };
  }, []);
  const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
  const onClose = useCallback(() => window.api.destroyWindow(), []);
  const onCancel = useCallback(async (noteId: number) => {
    await window.api.cancelReminder(noteId);
    const rs = await window.api.getAllReminders();
    setReminders(rs || []);
  }, []);
  return (
    <div className="list-window">
      <WindowBar onMinimize={onMinimize} onClose={onClose} />
      <div className="list-header">
        <h2>My Reminders</h2>
      </div>
      <div className="reminders-list-body" id="remindersListBody">
        {reminders.length === 0 ? (
          <div className="no-reminders-message">
            You have no active reminders
          </div>
        ) : (
          reminders.map((r) => (
            <ReminderItem reminder={r} onCancel={onCancel} />
          ))
        )}
      </div>
    </div>
  );
}

const rootEl = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootEl);
root.render(<App />);
