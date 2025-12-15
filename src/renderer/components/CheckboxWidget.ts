import { EditorView, ViewPlugin } from "@codemirror/view";

function toggleCheckbox(view: EditorView, pos: number): boolean {
  const line = view.state.doc.lineAt(pos);
  const text = line.text;
  const match = text.match(/^(\s*)-\s\[([ x])\]/);

  if (!match) return false;

  const isChecked = match[2] === "x";
  const newText = text.replace(
    /^(\s*)-\s\[([ x])\]/,
    `$1- [${isChecked ? " " : "x"}]`
  );

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newText },
  });

  return true;
}

export const checkboxPlugin = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {}
  },
  {
    eventHandlers: {
      mousedown: (e, view) => {
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
        if (pos) {
          const line = view.state.doc.lineAt(pos);
          const text = line.text;

          if (text.match(/^(\s*)-\s\[([ x])\]/)) {
            const lineStart = view.coordsAtPos(line.from);
            if (lineStart && e.clientX - lineStart.left < 60) {
              return toggleCheckbox(view, pos);
            }
          }
        }
        return false;
      },
      mousemove: (e, view) => {
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
        if (pos) {
          const line = view.state.doc.lineAt(pos);
          const text = line.text;

          if (text.match(/^(\s*)-\s\[([ x])\]/)) {
            const lineStart = view.coordsAtPos(line.from);
            if (lineStart && e.clientX - lineStart.left < 60) {
              view.dom.style.cursor = "pointer";
              return false;
            }
          }
        }
        view.dom.style.cursor = "";
        return false;
      },
    },
  }
);
