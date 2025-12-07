(() => {
  const { createElement: h, useState, useEffect, useCallback } = React;

  function WindowBar({ onMinimize, onClose }) {
    return h(
      'div',
      { className: 'note-window-bar' },
      h('div', { className: 'window-title' }, h('div', { className: 'window-icon' })),
      h(
        'div',
        { className: 'window-controls' },
        h('button', { className: 'window-btn minimize-btn', id: 'minimizeBtn', onClick: onMinimize }),
        h('button', { className: 'window-btn close-btn', id: 'closeBtn', onClick: onClose })
      )
    );
  }

  function ReminderItem({ reminder, onCancel }) {
    const badge = reminder.repeat ? h('div', { className: 'reminder-item-badge', style: { backgroundColor: reminder.color || '#4cd964' } }, 'Repeat daily') : null;
    const info = h('div', { className: 'reminder-item-info' },
      h('span', { className: 'reminder-item-date', dangerouslySetInnerHTML: { __html: `<img src="../icons/calendar.png" alt="Calendar" class="reminder-icon"> ${new Date(reminder.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` } }),
      h('span', { className: 'reminder-item-time', dangerouslySetInnerHTML: { __html: `<img src="../icons/clock.png" alt="Clock" class="reminder-icon"> ${reminder.time}` } })
    );
    const actions = h('div', { className: 'reminder-item-actions' }, h('button', { className: 'cancel-reminder-btn', onClick: () => onCancel(reminder.noteId) }, 'Cancel Reminder'));
    return h('div', { className: 'reminder-item', style: { borderLeftColor: reminder.color || '#ffffff' } },
      h('div', { className: 'reminder-item-header' }, h('div', { className: 'reminder-item-title' }, reminder.noteName || `Note ${reminder.noteId}`), badge),
      info,
      actions
    );
  }

  function App() {
    const [reminders, setReminders] = useState([]);
    useEffect(() => {
      let mounted = true;
      window.api.getAllReminders().then(rs => { if (mounted) setReminders(rs || []); });
      return () => { mounted = false; };
    }, []);

    const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
    const onClose = useCallback(() => window.api.destroyWindow(), []);
    const onCancel = useCallback(async (noteId) => { await window.api.cancelReminder(noteId); const rs = await window.api.getAllReminders(); setReminders(rs || []); }, []);

    return h(
      'div',
      { className: 'list-window' },
      h(WindowBar, { onMinimize, onClose }),
      h('div', { className: 'list-header' }, h('h2', null, 'My Reminders')),
      h('div', { className: 'reminders-list-body', id: 'remindersListBody' }, reminders.length === 0 ? h('div', { className: 'no-reminders-message' }, 'You have no active reminders') : reminders.map(r => h(ReminderItem, { reminder: r, onCancel })))
    );
  }

  const rootEl = document.getElementById('root');
  const root = ReactDOM.createRoot(rootEl);
  root.render(h(App));
})();

