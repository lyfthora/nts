import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { Range } from "@codemirror/state";

class ImageWidget extends WidgetType {
  constructor(readonly src: string) {
    super();
  }

  eq(other: ImageWidget): boolean {
    return this.src === other.src;
  }

  toDOM(): HTMLElement {
    const img = document.createElement("img");
    img.src = this.src;
    img.className = "cm-image-preview";
    img.style.display = "block";
    img.style.marginTop = "4px";

    img.onerror = () => {
      img.style.display = "none";
    };

    return img;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function buildDecorations(view: EditorView, dataPath: string): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const regex = /!\[.*?\]\((assets\/[^)]+)\)/g;

  for (let i = 1; i <= view.state.doc.lines; i++) {
    const line = view.state.doc.line(i);
    let match;

    // Reset regex lastIndex para cada línea
    regex.lastIndex = 0;

    while ((match = regex.exec(line.text)) !== null) {
      const relativePath = match[1];
      const fullPath = `file:///${dataPath}/${relativePath}`.replace(
        /\\/g,
        "/"
      );

      const deco = Decoration.widget({
        widget: new ImageWidget(fullPath),
        side: 1,
        block: false,
      });

      decorations.push(deco.range(line.to));
    }
  }

  return Decoration.set(decorations, true);
}

export function imagePreviewPlugin(dataPath: string) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, dataPath);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view, dataPath);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}
