import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';

function WindowBar({ title, onMinimize, onMaximize, onClose }: { title: string; onMinimize: () => void; onMaximize: () => void; onClose: () => void; }) {
  return (
    <div className="note-window-bar">
      <div className="window-title"><div className="window-icon" /><span className="window-title-text" id="windowTitleText">{title || 'Note'}</span></div>
      <div className="window-controls"><button className="window-btn minimize-btn" id="minimizeBtn" onClick={onMinimize} /><button className="window-btn maximize-btn" id="maximizeBtn" onClick={onMaximize} /><button className="window-btn close-btn" id="closeBtn" onClick={onClose} /></div>
    </div>
  );
}

function ColorPicker({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  const colors = ['#A8D5FF', '#B4E7CE', '#FFF4A3', '#FFB5B5', '#ffffff'];
  return (
    <div className="note-header" id="noteHeader">
      <div className="color-picker">
        {colors.map(c => (<div className={`color-btn${color === c ? ' active' : ''}`} style={{ background: c }} data-color={c} onClick={() => onPick(c)} />))}
      </div>
    </div>
  );
}

function ReminderModal({ open, reminder, onChange, onCancel, onSave }: { open: boolean; reminder: { date?: string; time?: string; repeat?: boolean }; onChange: (r: any) => void; onCancel: () => void; onSave: () => void; }) {
  const { date = '', time = '', repeat = false } = reminder || {};
  if (!open) return null;
  return (
    <div className="reminder-modal active" id="reminderModal">
      <div className="reminder-modal-content">
        <h3>Set Reminder</h3>
        <label>Date:</label>
        <input type="date" id="reminderDate" value={date} onChange={(e) => onChange({ ...reminder, date: e.target.value })} />
        <label>Time:</label>
        <input type="time" id="reminderTime" value={time} onChange={(e) => onChange({ ...reminder, time: e.target.value })} />
        <label><input type="checkbox" id="reminderRepeat" checked={!!repeat} onChange={(e) => onChange({ ...reminder, repeat: e.target.checked })} />Repeat daily</label>
        <div className="reminder-modal-buttons"><button className="modal-btn cancel-btn" id="cancelReminderBtn" onClick={onCancel}>Cancel</button><button className="modal-btn save-btn" id="saveReminderBtn" onClick={onSave}>Save Reminder</button></div>
        <div id="reminderStatus" />
      </div>
    </div>
  );
}

function App() {
  const [note, setNote] = useState<any>(null);
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [saveLabel, setSaveLabel] = useState('Save');
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminder, setReminder] = useState<{ date?: string; time?: string; repeat?: boolean }>({ date: '', time: '', repeat: false });
  const title = useMemo(() => (note && note.name) || 'Note', [note]);

  useEffect(() => {
    const cleanup = window.api.onNoteData((data: any) => {
      setNote(data);
      setContent(data.content || '');
      setColor(data.color || '#ffffff');
      setReminder(data.reminder || { date: '', time: '', repeat: false });
    });
    return () => { if (typeof cleanup === 'function') cleanup(); };
  }, []);

  const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
  const onMaximize = useCallback(() => window.api.toggleMaximize(), []);
  const onClose = useCallback(async () => { if (note) { await window.api.deleteNote(note.id); } window.api.destroyWindow(); }, [note]);

  const pickColor = useCallback((c: string) => { setColor(c); setNote((prev: any) => (prev ? { ...prev, color: c } : prev)); }, []);

  const saveNote = useCallback(async () => {
    if (!note) return;
    const pos = await window.api.getWindowPosition();
    const size = await window.api.getWindowSize();
    const [x, y] = pos;
    const [width, height] = size;
    const updated = { ...note, content, color, x, y, width, height };
    setNote(updated);
    await window.api.updateNote(updated);
    setSaveLabel('✓ Saved');
    setTimeout(() => setSaveLabel('Save'), 1000);
  }, [note, content, color]);

  const openReminder = useCallback(() => { setReminderOpen(true); }, []);
  const cancelReminder = useCallback(() => { setReminderOpen(false); }, []);
  const saveReminder = useCallback(async () => {
    if (!note) return;
    const { date, time, repeat } = reminder || {};
    if (!date || !time) { alert('Please select date and time'); return; }
    const updated = { ...note, reminder: { date, time, repeat } };
    setNote(updated);
    setReminderOpen(false);
    await window.api.updateNote(updated);
    window.api.setReminder(updated.id, date, time, repeat);
  }, [note, reminder]);

  return (
    <div className="note">
      <WindowBar title={title} onMinimize={onMinimize} onMaximize={onMaximize} onClose={onClose} />
      <ColorPicker color={color} onPick={pickColor} />
      <div className="note-content-area" id="noteContentArea">
        <textarea className="note-content" spellCheck={false} id="noteContent" placeholder="Escribe tu nota aquí..." style={{ background: color }} value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      <div className="note-footer"><button className="footer-btn" id="saveBtn" onClick={saveNote}>{saveLabel}</button><button className="footer-btn" id="reminderBtn" onClick={openReminder}>Set Reminder</button></div>
      <ReminderModal open={reminderOpen} reminder={reminder} onChange={setReminder} onCancel={cancelReminder} onSave={saveReminder} />
    </div>
  );
}

const rootEl = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootEl);
root.render(<App />);

