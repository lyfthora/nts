import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { Range } from "@codemirror/state";

function findNoteLinks(view: EditorView): Range<Decoration>[] {
  const decorations: Range<Decoration>[] = [];
  const text = view.state.doc.toString();
  const regex = /@([^\s]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const from = match.index;
    const to = from + match[0].length;

    const deco = Decoration.mark({
      class: "cm-note-link",
      attributes: {
        title: `Click to open "@${match[1]}"`,
      },
    });

    decorations.push(deco.range(from, to));
  }

  return decorations;
}

export function noteLinkPlugin(onClick: (noteName: string) => void) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = Decoration.set(findNoteLinks(view));

        // Añadir event listener para Ctrl+Click
        view.dom.addEventListener("mousedown", this.handleMouseDown);
      }

      handleMouseDown = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains("cm-note-link")) {
          e.preventDefault();
          e.stopPropagation();

          const text = target.textContent || "";
          const match = text.match(/@([^\s]+)/);
          if (match) {
            onClick(match[1]);
          }
        }
      };

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = Decoration.set(findNoteLinks(update.view));
        }
      }
      destroy() {
        const view = this as any;
        if (view.view) {
          view.view.dom.removeEventListener("mousedown", this.handleMouseDown);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}
