(() => {
  const { createElement: h, useState, useEffect, useMemo, useCallback, useRef } = React;

  function WindowBar({ onMinimize, onClose }) {
    return h(
      'div',
      { className: 'note-window-bar' },
      h('div', { className: 'window-title' }),
      h(
        'div',
        { className: 'window-controls' },
        h('button', { className: 'window-btn minimize-btn', onClick: onMinimize }),
        h('button', { className: 'window-btn close-btn', onClick: onClose })
      )
    );
  }

  function Sidebar({ notes, view, onViewChange, counts, tags }) {
    const Item = (props) => h(
      'a',
      {
        href: '#',
        className: `nav-item${view === props.view ? ' active' : ''}`,
        onClick: (e) => { e.preventDefault(); onViewChange(props.view); }
      },
      props.children
    );

    return h(
      'div',
      { className: 'sidebar' },
      h(
        'div',
        { className: 'sidebar-header' },
        h('pre', { className: 'ascii-logo' }, '_      _    ___ _   _\n| |    / \\  |_ _| \\ | |\n| |   / _ \\  | ||  \\| |\n| |__/ ___ \\ | || |\\  |\n|___/_/   \\_\\___|_| \\\_|')
      ),
      h(
        'nav',
        { className: 'sidebar-nav' },
        h(
          'div',
          { className: 'nav-section' },
          h(Item, { view: 'all-notes' },
            h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
              h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
              h('polyline', { points: '14 2 14 8 20 8' })
            ),
            h('span', null, 'All Notes'),
            h('span', { className: 'nav-count', id: 'allNotesCount' }, String(notes.length))
          ),
          h(Item, { view: 'pinned' },
            h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
              h('path', { d: 'M12 17v5' }),
              h('path', { d: 'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z' })
            ),
            h('span', null, 'Pinned Notes'),
            h('span', { className: 'nav-count', id: 'pinnedCount' }, '0')
          )
        ),
        h(
          'div',
          { className: 'nav-section' },
          h(
            'div',
            { className: 'nav-section-header' },
            h('button', { className: 'nav-collapse-btn', 'data-section': 'status' },
              h('svg', { className: 'chevron', width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
                h('polyline', { points: '9 18 15 12 9 6' })
              )
            ),
            h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
              h('circle', { cx: 12, cy: 12, r: 10 }),
              h('path', { d: 'M12 6v6l4 2' })
            ),
            h('span', null, 'Status')
          ),
          h(
            'div',
            { className: 'nav-subsection', id: 'statusSection' },
            h(Item, { view: 'status-active' }, h('span', { className: 'status-dot status-active' }), h('span', null, 'Active'), h('span', { className: 'nav-count', id: 'count-active' }, String(counts.active))),
            h(Item, { view: 'status-onhold' }, h('span', { className: 'status-dot status-onhold' }), h('span', null, 'On Hold'), h('span', { className: 'nav-count', id: 'count-onhold' }, String(counts.onhold))),
            h(Item, { view: 'status-completed' }, h('span', { className: 'status-dot status-completed' }), h('span', null, 'Completed'), h('span', { className: 'nav-count', id: 'count-completed' }, String(counts.completed))),
            h(Item, { view: 'status-dropped' }, h('span', { className: 'status-dot status-dropped' }), h('span', null, 'Dropped'), h('span', { className: 'nav-count', id: 'count-dropped' }, String(counts.dropped)))
          )
        ),
        h(
          'div',
          { className: 'nav-section' },
          h(
            'div',
            { className: 'nav-section-header' },
            h('button', { className: 'nav-collapse-btn', 'data-section': 'tags' },
              h('svg', { className: 'chevron', width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
                h('polyline', { points: '9 18 15 12 9 6' })
              )
            ),
            h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
              h('path', { d: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' }),
              h('line', { x1: 7, y1: 7, x2: 7.01, y2: 7 })
            ),
            h('span', null, 'Tags')
          ),
          h(
            'div',
            { className: 'nav-subsection', id: 'tagsSection' },
            tags.map(t => h('a', { href: '#', className: 'nav-item nav-nested', onClick: (e) => { e.preventDefault(); onViewChange(`tag-${t.name}`); } }, h('span', { className: 'tag-hash' }, '#'), h('span', null, t.name), h('span', { className: 'nav-count' }, String(t.count))))
          )
        )
      )
    );
  }

  function NotesListPanel({ notes, currentNoteId, onAddNote, onSelect }) {
    return h(
      'div',
      { className: 'notes-list-panel' },
      h(
        'div',
        { className: 'panel-header' },
        h('h2', { id: 'contentTitle' }, 'All Notes'),
        h('div', { className: 'panel-actions' }, h('button', { className: 'action-btn', id: 'addNoteBtn', title: 'Add Note', onClick: onAddNote }, h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z' }), h('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })))))
      ,
      h(
        'div',
        { className: 'notes-list-body', id: 'notesListPanel' },
        notes.length === 0 ? h('div', { className: 'no-items-message' }, 'No notes') : notes.map(n => h('div', { className: `note-item${currentNoteId === n.id ? ' active' : ''}`, style: { borderLeftColor: n.color || '#667eea' }, onClick: () => onSelect(n) }, h('div', { className: 'note-item-title' }, n.name || 'Untitled'), h('div', { className: n.content ? 'note-item-preview' : 'note-item-preview note-item-empty' }, n.content || 'Empty note')))
      )
    );
  }

  function StatusDropdown({ status, onChange }) {
    const [open, setOpen] = useState(false);
    const toggle = useCallback(() => setOpen(v => !v), []);
    const Option = (s, label, cls) => h('div', { className: 'status-option', onClick: () => { onChange(s); setOpen(false); } }, cls ? h('span', { className: `status-dot ${cls}` }) : null, h('span', null, label));
    const dotClass = status === 'active' ? 'status-active' : status === 'onhold' ? 'status-onhold' : status === 'completed' ? 'status-completed' : status === 'dropped' ? 'status-dropped' : '';
    const text = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Status';
    return h(
      'div',
      { className: 'status-dropdown' + (open ? ' active' : '') },
      h('button', { className: 'status-btn' + (status ? ' selected' : ''), id: 'statusBtn', onClick: toggle }, h('span', { className: `status-dot ${dotClass}` }), h('span', { className: 'status-text', id: 'statusText' }, text), h('svg', { className: 'status-chevron', width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('polyline', { points: '6 9 12 15 18 9' }))),
      h('div', { className: 'status-menu', id: 'statusMenu' }, Option('', 'None', ''), Option('active', 'Active', 'status-active'), Option('onhold', 'On Hold', 'status-onhold'), Option('completed', 'Completed', 'status-completed'), Option('dropped', 'Dropped', 'status-dropped'))
    );
  }

  function TagsEditor({ tags, onAdd, onRemove }) {
    const [value, setValue] = useState('');
    const onKeyDown = useCallback((e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const t = value.trim().replace(/,$/g, '');
        if (t) { onAdd(t); setValue(''); }
      }
    }, [value, onAdd]);
    return h(
      'div',
      { className: 'metadata-item metadata-tags' },
      h('div', { className: 'tags-wrapper', id: 'tagsWrapper' },
        h('div', { className: 'tags-container', id: 'tagsContainer' },
          (tags || []).map(tag => h('div', { className: 'tag-badge' }, h('span', null, tag), h('button', { className: 'tag-remove', onClick: () => onRemove(tag) }, '×')))
        ),
        h('input', { type: 'text', className: 'tag-input', id: 'tagInput', placeholder: 'Add Tags', value, onChange: (e) => setValue(e.target.value), onKeyDown })
      )
    );
  }

  function ColorPicker({ color, onChange }) {
    const [open, setOpen] = useState(false);
    const toggle = useCallback(() => setOpen(v => !v), []);
    const colors = ['#A8D5FF', '#B4E7CE', '#FFF4A3', '#FFB5B5'];
    return h(
      'div',
      null,
      h('button', { className: 'editor-action-btn', id: 'colorPickerBtn', title: 'Change Color', onClick: toggle }, h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('circle', { cx: 12, cy: 12, r: 10 }))),
      open ? h('div', { style: { display: 'flex', gap: '6px', marginTop: '6px' } }, colors.map(c => h('div', { style: { width: 18, height: 18, borderRadius: 4, background: c, border: '1px solid #ddd', cursor: 'pointer' }, onClick: () => { onChange(c); setOpen(false); } }))) : null
    );
  }

  function EditorPanel({ note, onChange, onDelete, onStatus, onTagAdd, onTagRemove, onColor }) {
    if (!note) {
      return h('div', { className: 'note-editor-panel' }, h('div', { className: 'editor-placeholder', id: 'editorPlaceholder' }, h('svg', { width: 64, height: 64, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }, h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }), h('polyline', { points: '14 2 14 8 20 8' })), h('p', null, 'Select a note to view')));
    }
    return h(
      'div',
      { className: 'note-editor-panel' },
      h(
        'div',
        { className: 'editor-header' },
        h('input', { type: 'text', className: 'note-title-input', id: 'noteTitleInput', placeholder: 'Note title...', value: note.name || '', onChange: (e) => onChange({ ...note, name: e.target.value }) }),
        h(
          'div',
          { className: 'editor-actions' },
          h('button', { className: 'editor-action-btn', id: 'deleteNoteBtn', title: 'Delete Note', onClick: () => onDelete(note) }, h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('polyline', { points: '3 6 5 6 21 6' }), h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }))),
          h(ColorPicker, { color: note.color, onChange: (c) => onColor({ ...note, color: c }) })
        )
      ),
      h(
        'div',
        { className: 'note-metadata' },
        h('div', { className: 'metadata-item metadata-folder' }, h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' })), h('span', { className: 'metadata-folder-name' }, 'study')),
        h('div', { className: 'metadata-item metadata-status' }, h(StatusDropdown, { status: note.status || '', onChange: (s) => onStatus({ ...note, status: s }) })),
        h(TagsEditor, { tags: note.tags || [], onAdd: (t) => onTagAdd({ ...note, tags: Array.from(new Set([...(note.tags || []), t])) }), onRemove: (t) => onTagRemove({ ...note, tags: (note.tags || []).filter(x => x !== t) }) })
      ),
      h('div', { className: 'editor-body' }, h('textarea', { className: 'note-content-editor', id: 'noteContentEditor', placeholder: 'Start typing...', value: note.content || '', onChange: (e) => onChange({ ...note, content: e.target.value }) }))
    );
  }

  function App() {
    const [notes, setNotes] = useState([]);
    const [view, setView] = useState('all-notes');
    const [currentId, setCurrentId] = useState(null);
    const currentNote = useMemo(() => notes.find(n => n.id === currentId) || null, [notes, currentId]);
    const counts = useMemo(() => {
      const c = { active: 0, onhold: 0, completed: 0, dropped: 0 };
      notes.forEach(n => { if (n.status && c.hasOwnProperty(n.status)) c[n.status]++; });
      return c;
    }, [notes]);
    const tags = useMemo(() => {
      const m = {};
      notes.forEach(n => (n.tags || []).forEach(t => { m[t] = (m[t] || 0) + 1; }));
      return Object.keys(m).sort().map(name => ({ name, count: m[name] }));
    }, [notes]);
    const debRef = useRef(null);

    useEffect(() => {
      let mounted = true;
      window.api.getAllNotes().then(ns => { if (mounted) setNotes(ns || []); });
      return () => { mounted = false; };
    }, []);

    const filteredNotes = useMemo(() => {
      if (view === 'all-notes') return notes;
      if (view.startsWith('status-')) {
        const s = view.replace('status-', '');
        return notes.filter(n => n.status === s);
      }
      if (view.startsWith('tag-')) {
        const t = view.replace('tag-', '');
        return notes.filter(n => (n.tags || []).includes(t));
      }
      return notes;
    }, [notes, view]);

    const onAddNote = useCallback(async () => {
      const newNote = await window.api.createNoteDashboard();
      const ns = await window.api.getAllNotes();
      setNotes(ns || []);
      if (newNote) setCurrentId(newNote.id);
    }, []);

    const saveNote = useCallback((note) => {
      clearTimeout(debRef.current);
      debRef.current = setTimeout(async () => {
        await window.api.updateNote(note);
        setNotes(prev => prev.map(n => n.id === note.id ? note : n));
      }, 500);
    }, []);

    const onDelete = useCallback(async (note) => {
      await window.api.deleteNote(note.id);
      const ns = await window.api.getAllNotes();
      setNotes(ns || []);
      setCurrentId(null);
    }, []);

    const onChange = useCallback((note) => {
      setNotes(prev => prev.map(n => n.id === note.id ? note : n));
      saveNote(note);
    }, [saveNote]);

    const onStatus = useCallback((note) => {
      setNotes(prev => prev.map(n => n.id === note.id ? note : n));
      saveNote(note);
    }, [saveNote]);

    const onTagAdd = useCallback((note) => {
      setNotes(prev => prev.map(n => n.id === note.id ? note : n));
      saveNote(note);
    }, [saveNote]);

    const onTagRemove = useCallback((note) => {
      setNotes(prev => prev.map(n => n.id === note.id ? note : n));
      saveNote(note);
    }, [saveNote]);

    const onColor = useCallback((note) => {
      setNotes(prev => prev.map(n => n.id === note.id ? note : n));
      saveNote(note);
    }, [saveNote]);

    const onSelect = useCallback((n) => setCurrentId(n.id), []);
    const onViewChange = useCallback((v) => setView(v), []);
    const onMinimize = useCallback(() => window.api.minimizeWindow(), []);
    const onClose = useCallback(() => window.api.closeWindow(), []);

    return h(
      'div',
      { className: 'dashboard-container' },
      h(Sidebar, { notes, view, onViewChange, counts, tags }),
      h(
        'div',
        { className: 'main-content' },
        h(WindowBar, { onMinimize, onClose }),
        h(
          'div',
          { className: 'content-container' },
          h(NotesListPanel, { notes: filteredNotes, currentNoteId: currentId, onAddNote, onSelect }),
          h(EditorPanel, { note: currentNote, onChange, onDelete, onStatus, onTagAdd, onTagRemove, onColor })
        )
      )
    );
  }

  const container = document.querySelector('.dashboard-container') || document.getElementById('root') || document.body;
  container.innerHTML = '';
  const root = ReactDOM.createRoot(container);
  root.render(h(App));
})();

