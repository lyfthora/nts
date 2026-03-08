import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { Range } from "@codemirror/state";

let activeView: EditorView | null = null;

class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly width: number | null,
    readonly lineFrom: number,
    readonly originalMatch: string,
  ) {
    super();
  }

  eq(other: ImageWidget): boolean {
    return this.src === other.src && this.width === other.width;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-image-wrapper";

    const img = document.createElement("img");
    img.src = this.src;
    img.className = "cm-image-preview";
    img.style.display = "block";
    img.style.marginTop = "4px";

    if (this.width) {
      img.style.width = `${this.width}px`;
      img.style.maxWidth = "100%";
    }

    img.onerror = () => {
      wrapper.style.display = "none";
    };

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "cm-image-resize-handle";

    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let aspectRatio = 1;
    const lineFrom = this.lineFrom;
    const originalMatch = this.originalMatch;
    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const delta = (deltaX + deltaY) / 2;

      const newWidth = Math.max(50, startWidth + delta);
      const newHeight = newWidth / aspectRatio;

      img.style.width = `${newWidth}px`;
      img.style.height = `${newHeight}px`;
    };

    const onMouseUp = (e: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      wrapper.classList.remove("resizing");

      if (!activeView) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const delta = (deltaX + deltaY) / 2;
      const finalWidth = Math.max(50, startWidth + delta);

      try {
        const line = activeView.state.doc.lineAt(lineFrom);
        const lineText = line.text;

        const imgRegex = /!\[.*?\]\([^)]+\)(\{width=\d+\})?/g;
        let match;
        let newText = lineText;

        while ((match = imgRegex.exec(lineText)) !== null) {
          const basePattern = originalMatch.split("{")[0];
          if (
            match[0].includes(basePattern) ||
            basePattern.includes(match[0].split("{")[0])
          ) {
            const baseMatch = match[0].replace(/\{width=\d+\}/, "");
            newText = lineText.replace(
              match[0],
              `${baseMatch}{width=${Math.round(finalWidth)}}`,
            );
            break;
          }
        }

        if (newText !== lineText) {
          activeView.dispatch({
            changes: {
              from: line.from,
              to: line.to,
              insert: newText,
            },
          });
        }
      } catch (err) {
        console.error("Error updating image width:", err);
      }
    };

    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      startWidth = img.offsetWidth;
      startHeight = img.offsetHeight;
      aspectRatio = startWidth / startHeight;
      document.body.style.cursor = "nwse-resize";
      wrapper.classList.add("resizing");
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    wrapper.appendChild(img);
    wrapper.appendChild(resizeHandle);

    return wrapper;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

const hideWidthMark = Decoration.mark({ class: "cm-image-width-hidden" });
function buildDecorations(view: EditorView, dataPath: string): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const regex = /!\[.*?\]\((assets\/[^)]+)\)(\{width=(\d+)\})?/g;
  for (let i = 1; i <= view.state.doc.lines; i++) {
    const line = view.state.doc.line(i);
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(line.text)) !== null) {
      const relativePath = match[1];
      const width = match[3] ? parseInt(match[3], 10) : null;
      const fullPath = `file:///${dataPath}/${relativePath}`.replace(
        /\\/g,
        "/",
      );
      const deco = Decoration.widget({
        widget: new ImageWidget(fullPath, width, line.from, match[0]),
        side: 1,
        block: false,
      });
      decorations.push(deco.range(line.to));
      if (match[2]) {
        const widthStart = line.from + match.index + match[0].indexOf(match[2]);
        const widthEnd = widthStart + match[2].length;
        decorations.push(hideWidthMark.range(widthStart, widthEnd));
      }
    }
  }
  return Decoration.set(
    decorations.sort((a, b) => a.from - b.from),
    true,
  );
}

export function imagePreviewPlugin(dataPath: string) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        activeView = view;
        this.decorations = buildDecorations(view, dataPath);
      }

      update(update: ViewUpdate) {
        activeView = update.view;
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view, dataPath);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}
