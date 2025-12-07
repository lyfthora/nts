(() => {
  const { createElement: h, useCallback } = React;

  function WindowControls({ onMinimize, onClose }) {
    return h(
      'div',
      { className: 'note-window-bar' },
      h(
        'div',
        { className: 'window-title' },
        h('div', { className: 'window-icon' }),
        h('span', null, 'StickyPad')
      ),
      h(
        'div',
        { className: 'window-controls' },
        h('button', { className: 'window-btn minimize-btn', onClick: onMinimize }),
        h('button', { className: 'window-btn close-btn', onClick: onClose })
      )
    );
  }

  function MainButtons({ onAdd, onDashboard }) {
    return h(
      'div',
      { className: 'main-content' },
      h(
        'div',
        { className: 'buttons-container' },
        h('button', { className: 'tool-btn', onClick: onAdd }, 'add'),
        h('button', { className: 'tool-btn', onClick: onDashboard }, 'dashboard')
      )
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

    return h(
      'div',
      { className: 'main-pad' },
      h(WindowControls, { onMinimize: handleMinimize, onClose: handleClose }),
      h(MainButtons, { onAdd: handleAdd, onDashboard: handleDashboard })
    );
  }

  const rootEl = document.getElementById('root');
  const root = ReactDOM.createRoot(rootEl);
  root.render(h(App));
})();

