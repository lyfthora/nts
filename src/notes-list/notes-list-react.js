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

  function NotesList({ notes, onOpen }) {
    return h(
      'div',
      { className: 'notes-list-body', id: 'notesListBody' },
      notes.length === 0
        ? h('div', { className: 'no-notes-message' }, 'No tienes notas guardadas')
        : notes.map((note, index) => h(
            'div',
            { className: 'note-item', style: { borderLeftColor: note.color || '#ffffff' }, onClick: () => onOpen(note) },
            h('div', { className: 'note-item-title' }, `Note ${index + 1}`),
            h('div', { className: note.content ? 'note-item-preview' : 'note-item-preview note-item-empty' }, note.content || 'Nota vacia')
          ))
    );
  }

  function App() {
    const [notes, setNotes] = useState([]);
    useEffect(() => {
      let mounted = true;
      window.api.getAllNotes().then(ns => { if (mounted) setNotes(ns || []); });
      return () => { mounted = false; };
    }, []);

    const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
    const onClose = useCallback(() => window.api.destroyWindow(), []);
    const onOpen = useCallback((note) => { window.api.showNoteById(note.id); }, []);

    return h(
      'div',
      { className: 'list-window' },
      h(WindowBar, { onMinimize, onClose }),
      h('div', { className: 'list-header' }, h('h2', null, 'My Notes')),
      h(NotesList, { notes, onOpen })
    );
  }

  const rootEl = document.getElementById('root');
  const root = ReactDOM.createRoot(rootEl);
  root.render(h(App));
})();

