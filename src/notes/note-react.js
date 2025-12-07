(() => {
  const { createElement: h, useState, useEffect, useMemo, useCallback } = React;

  function WindowBar({ title, onMinimize, onMaximize, onClose }) {
    return h(
      'div',
      { className: 'note-window-bar' },
      h('div', { className: 'window-title' }, h('div', { className: 'window-icon' }), h('span', { className: 'window-title-text', id: 'windowTitleText' }, title || 'Note')),
      h('div', { className: 'window-controls' },
        h('button', { className: 'window-btn minimize-btn', id: 'minimizeBtn', onClick: onMinimize }),
        h('button', { className: 'window-btn maximize-btn', id: 'maximizeBtn', onClick: onMaximize }),
        h('button', { className: 'window-btn close-btn', id: 'closeBtn', onClick: onClose })
      )
    );
  }

  function ColorPicker({ color, onPick }) {
    const colors = ['#A8D5FF', '#B4E7CE', '#FFF4A3', '#FFB5B5', '#ffffff'];
    return h(
      'div',
      { className: 'note-header', id: 'noteHeader' },
      h(
        'div',
        { className: 'color-picker' },
        colors.map(c => h('div', {
          className: `color-btn${color === c ? ' active' : ''}`,
          style: { background: c },
          'data-color': c,
          onClick: () => onPick(c)
        }))
      )
    );
  }

  function ReminderModal({ open, reminder, onChange, onCancel, onSave }) {
    const { date = '', time = '', repeat = false } = reminder || {};
    if (!open) return null;
    return h(
      'div',
      { className: 'reminder-modal active', id: 'reminderModal' },
      h(
        'div',
        { className: 'reminder-modal-content' },
        h('h3', null, 'Set Reminder'),
        h('label', null, 'Date:'),
        h('input', { type: 'date', id: 'reminderDate', value: date, onChange: (e) => onChange({ ...reminder, date: e.target.value }) }),
        h('label', null, 'Time:'),
        h('input', { type: 'time', id: 'reminderTime', value: time, onChange: (e) => onChange({ ...reminder, time: e.target.value }) }),
        h('label', null, h('input', { type: 'checkbox', id: 'reminderRepeat', checked: !!repeat, onChange: (e) => onChange({ ...reminder, repeat: e.target.checked }) }), 'Repeat daily'),
        h('div', { className: 'reminder-modal-buttons' },
          h('button', { className: 'modal-btn cancel-btn', id: 'cancelReminderBtn', onClick: onCancel }, 'Cancel'),
          h('button', { className: 'modal-btn save-btn', id: 'saveReminderBtn', onClick: onSave }, 'Save Reminder')
        ),
        h('div', { id: 'reminderStatus' })
      )
    );
  }

  function App() {
    const [note, setNote] = useState(null);
    const [content, setContent] = useState('');
    const [color, setColor] = useState('#ffffff');
    const [saveLabel, setSaveLabel] = useState('Save');
    const [reminderOpen, setReminderOpen] = useState(false);
    const [reminder, setReminder] = useState({ date: '', time: '', repeat: false });
    const title = useMemo(() => (note && note.name) || 'Note', [note]);

    useEffect(() => {
      const cleanup = window.api.onNoteData((data) => {
        setNote(data);
        setContent(data.content || '');
        setColor(data.color || '#ffffff');
        setReminder(data.reminder || { date: '', time: '', repeat: false });
      });
      return () => { if (typeof cleanup === 'function') cleanup(); };
    }, []);

    const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
    const onMaximize = useCallback(() => window.api.toggleMaximize(), []);
    const onClose = useCallback(async () => {
      if (note) {
        await window.api.deleteNote(note.id);
      }
      window.api.destroyWindow();
    }, [note]);

    const pickColor = useCallback((c) => {
      setColor(c);
      setNote(prev => prev ? { ...prev, color: c } : prev);
    }, []);

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

    const openReminder = useCallback(() => {
      setReminderOpen(true);
    }, []);

    const cancelReminder = useCallback(() => {
      setReminderOpen(false);
    }, []);

    const saveReminder = useCallback(async () => {
      if (!note) return;
      const { date, time, repeat } = reminder || {};
      if (!date || !time) {
        alert('Please select date and time');
        return;
      }
      const updated = { ...note, reminder: { date, time, repeat } };
      setNote(updated);
      setReminderOpen(false);
      await window.api.updateNote(updated);
      window.api.setReminder(updated.id, date, time, repeat);
    }, [note, reminder]);

    return h(
      'div',
      { className: 'note' },
      h(WindowBar, { title, onMinimize, onMaximize, onClose }),
      h(ColorPicker, { color, onPick: pickColor }),
      h('div', { className: 'note-content-area', id: 'noteContentArea' },
        h('textarea', {
          className: 'note-content',
          spellCheck: false,
          id: 'noteContent',
          placeholder: 'Escribe tu nota aquí...',
          style: { background: color },
          value: content,
          onChange: (e) => setContent(e.target.value)
        })
      ),
      h('div', { className: 'note-footer' },
        h('button', { className: 'footer-btn', id: 'saveBtn', onClick: saveNote }, saveLabel),
        h('button', { className: 'footer-btn', id: 'reminderBtn', onClick: openReminder }, 'Set Reminder')
      ),
      h(ReminderModal, {
        open: reminderOpen,
        reminder,
        onChange: setReminder,
        onCancel: cancelReminder,
        onSave: saveReminder
      })
    );
  }

  const rootEl = document.getElementById('root');
  const root = ReactDOM.createRoot(rootEl);
  root.render(h(App));
})();

