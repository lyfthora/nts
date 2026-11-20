import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { Range } from "@codemirror/state";

const linkMarker = Decoration.mark({ class: "cm-note-link" });

function findNoteLinks(view: EditorView): Range<Decoration>[] {
  const decorations: Range<Decoration>[] = [];
  const regex = /@"([^"]+)"|@([^\s]+)/g;

  // Solo el texto visible: convertir el documento entero a string y recorrerlo
  // con regex en cada tecla es lo que frenaba la escritura en notas largas.
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line.text)) !== null) {
        const start = line.from + match.index;
        const end = start + match[0].length;
        decorations.push(linkMarker.range(start, end));
      }
      if (line.to >= to) break;
      pos = line.to + 1;
    }
  }

  return decorations;
}

export function noteLinkPlugin(onClick: (noteName: string) => void) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = Decoration.set(findNoteLinks(view));

        //  Ctrl+Click
        view.dom.addEventListener("mousedown", this.handleMouseDown);
      }

      handleMouseDown = (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        if (target.classList.contains("cm-note-link")) {
          e.preventDefault();
          e.stopPropagation();

          const text = target.textContent || "";
          const match = text.match(/@"([^"]+)"|@([^\s]+)/);

          if (match) {
            const noteName = match[1] || match[2];
            onClick(noteName);
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
