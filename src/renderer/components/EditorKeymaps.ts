import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";

const toggleFormat = (
  view: EditorView,
  token: string,
  cursorOffset: number
): boolean => {
  const { from, to, head, anchor } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const lineText = line.text;
  const relFrom = from - line.from;
  const relTo = to - line.from;

  // Find all token pairs in the line
  const indices: number[] = [];
  let pos = 0;
  while ((pos = lineText.indexOf(token, pos)) !== -1) {
    indices.push(pos);
    pos += token.length;
  }

  // Check if selection is inside/covers any pair
  for (let i = 0; i < indices.length - 1; i += 2) {
    const start = indices[i];
    const end = indices[i + 1];
    const blockEnd = end + token.length;

    // If selection is contained within this block (inclusive)
    if (relFrom >= start && relTo <= blockEnd) {
      const startPos = line.from + start;
      const endPos = line.from + end;

      // Helper to map position after removal
      const mapPos = (p: number) => {
        const relP = p - line.from;
        if (relP <= start) return p;
        if (relP <= start + token.length) return line.from + start;
        if (relP <= end) return p - token.length;
        if (relP <= blockEnd) return line.from + end - token.length;
        return p - 2 * token.length;
      };

      view.dispatch({
        changes: [
          { from: startPos, to: startPos + token.length, insert: "" },
          { from: endPos, to: endPos + token.length, insert: "" },
        ],
        selection: { anchor: mapPos(anchor), head: mapPos(head) },
      });
      return true;
    }
  }

  // Default: Add format
  const text = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: `${token}${text}${token}` },
    selection: { anchor: from + cursorOffset, head: to + cursorOffset },
  });
  return true;
};

const toggleBlockFormat = (
  view: EditorView,
  prefix: string,
  type: "ul" | "ol" | "task" | "quote"
): boolean => {
  const { from, to } = view.state.selection.main;
  const startLine = view.state.doc.lineAt(from);
  const endLine = view.state.doc.lineAt(to);

  let allHavePrefix = true;
  const changes: any[] = [];

  for (let i = startLine.number; i <= endLine.number; i++) {
    const line = view.state.doc.line(i);
    const lineText = line.text;
    let hasPrefix = false;

    if (type === "ul") hasPrefix = /^\s*-\s/.test(lineText);
    else if (type === "ol") hasPrefix = /^\s*\d+\.\s/.test(lineText);
    else if (type === "task") hasPrefix = /^\s*-\s\[[ x]\]\s/.test(lineText);
    else if (type === "quote") hasPrefix = /^\s*>\s/.test(lineText);

    if (!hasPrefix) {
      allHavePrefix = false;
      break;
    }
  }

  for (let i = startLine.number; i <= endLine.number; i++) {
    const line = view.state.doc.line(i);
    const lineText = line.text;

    if (allHavePrefix) {
      let matchLength = 0;
      if (type === "ul") matchLength = lineText.match(/^\s*-\s/)![0].length;
      else if (type === "ol")
        matchLength = lineText.match(/^\s*\d+\.\s/)![0].length;
      else if (type === "task")
        matchLength = lineText.match(/^\s*-\s\[[ x]\]\s/)![0].length;
      else if (type === "quote")
        matchLength = lineText.match(/^\s*>\s/)![0].length;

      changes.push({
        from: line.from,
        to: line.from + matchLength,
        insert: "",
      });
    } else {
      let hasPrefix = false;
      if (type === "ul") hasPrefix = /^\s*-\s/.test(lineText);
      else if (type === "ol") hasPrefix = /^\s*\d+\.\s/.test(lineText);
      else if (type === "task") hasPrefix = /^\s*-\s\[[ x]\]\s/.test(lineText);
      else if (type === "quote") hasPrefix = /^\s*>\s/.test(lineText);

      if (!hasPrefix) {
        changes.push({
          from: line.from,
          to: line.from,
          insert: prefix,
        });
      }
    }
  }

  const startLineNum = view.state.doc.lineAt(from).number;
  const firstLineChange = changes.find(
    (c: any) => view.state.doc.lineAt(c.from).number === startLineNum
  );

  let newCursor = from;
  if (firstLineChange) {
    if (allHavePrefix) {
      newCursor = Math.max(
        from - (firstLineChange.to - firstLineChange.from),
        firstLineChange.from
      );
    } else {
      newCursor = from + (firstLineChange.insert?.length || 0);
    }
  }

  view.dispatch({
    changes,
    selection: { anchor: newCursor },
  });
  return true;
};

const toggleCodeBlock = (view: EditorView): boolean => {
  const { from, to } = view.state.selection.main;
  const doc = view.state.doc;

  const startLine = doc.lineAt(from);
  const endLine = doc.lineAt(to);

  let codeBlockStart = -1;
  let codeBlockEnd = -1;

  for (let i = startLine.number; i >= 1; i--) {
    const line = doc.line(i);
    if (line.text.trim().startsWith("```")) {
      codeBlockStart = line.from;
      break;
    }
  }

  if (codeBlockStart !== -1) {
    for (let i = startLine.number + 1; i <= doc.lines; i++) {
      const line = doc.line(i);
      if (line.text.trim() === "```") {
        codeBlockEnd = line.to;
        break;
      }
    }
  }

  if (codeBlockStart !== -1 && codeBlockEnd !== -1) {
    const startLineFull = doc.lineAt(codeBlockStart);
    const endLineFull = doc.lineAt(codeBlockEnd);

    view.dispatch({
      changes: [
        { from: startLineFull.from, to: startLineFull.to + 1, insert: "" },
        { from: endLineFull.from - 1, to: endLineFull.to, insert: "" },
      ],
      selection: { anchor: from - startLineFull.text.length - 1 },
    });
    return true;
  }

  const selectedText = view.state.sliceDoc(from, to);
  const insert = `\`\`\`\n${selectedText}\n\`\`\``;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + 4 },
  });
  return true;
};

const toggleLink = (view: EditorView): boolean => {
  const { from, to } = view.state.selection.main;
  const doc = view.state.doc.toString();
  const selectedText = view.state.sliceDoc(from, to);

  const match = selectedText.match(/^\[(.*?)\]\((.*?)\)$/);

  if (match) {
    const text = match[1];
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from, head: from + text.length },
    });
    return true;
  }

  const searchStart = Math.max(0, from - 200);
  const searchEnd = Math.min(doc.length, to + 200);
  const context = doc.slice(searchStart, searchEnd);
  const relFrom = from - searchStart;
  const relTo = to - searchStart;

  const linkRegex = /\[(.*?)\]\((.*?)\)/g;
  let linkMatch;

  while ((linkMatch = linkRegex.exec(context)) !== null) {
    const linkStart = linkMatch.index;
    const linkEnd = linkStart + linkMatch[0].length;

    if (relFrom >= linkStart && relTo <= linkEnd) {
      const absoluteStart = searchStart + linkStart;
      const absoluteEnd = searchStart + linkEnd;
      const linkText = linkMatch[1];

      view.dispatch({
        changes: { from: absoluteStart, to: absoluteEnd, insert: linkText },
        selection: {
          anchor: absoluteStart,
          head: absoluteStart + linkText.length,
        },
      });
      return true;
    }
  }

  const insert = `[${selectedText}](url)`;
  view.dispatch({
    changes: { from, to, insert },
    selection: {
      anchor: from + insert.length - 4,
      head: from + insert.length - 1,
    },
  });
  return true;
};

export const applyFormat = (view: EditorView, type: string): boolean => {
  const { from, to } = view.state.selection.main;
  const selectedText = view.state.sliceDoc(from, to);

  switch (type) {
    case "bold":
      return toggleFormat(view, "**", 2);
    case "italic":
      return toggleFormat(view, "*", 1);
    case "strikethrough":
      return toggleFormat(view, "~~", 2);
    case "inlineCode":
      return toggleFormat(view, "`", 1);

    case "h1":
      return cycleHeading(view);

    case "ul":
      return toggleBlockFormat(view, "- ", "ul");
    case "ol":
      return toggleBlockFormat(view, "1. ", "ol");
    case "task":
      return toggleBlockFormat(view, "- [ ] ", "task");
    case "quote":
      return toggleBlockFormat(view, "> ", "quote");

    case "code":
      return toggleCodeBlock(view);

    case "link":
      return toggleLink(view);

    case "hr":
      view.dispatch({
        changes: { from, to, insert: "\n---\n" },
      });
      return true;
  }
  return false;
};

const cycleHeading = (view: EditorView): boolean => {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const lineText = line.text;

  const match = lineText.match(/^\s*((?:#\s*)+)(.*)$/);

  let newText: string;

  if (match) {
    const currentHashes = match[1].replace(/\s/g, "");
    const currentLevel = currentHashes.length;
    const content = match[2].trim();

    const nextLevel = currentLevel >= 4 ? 1 : currentLevel + 1;
    newText = `${"#".repeat(nextLevel)} ${content}`;
  } else {
    newText = `# ${lineText.trim()}`;
  }

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newText },
    selection: { anchor: line.from + newText.length },
  });

  return true;
};

export const markdownKeymap = Prec.highest(
  keymap.of([
    {
      key: "Mod-b",
      run: (view) => applyFormat(view, "bold"),
    },
    {
      key: "Mod-i",
      run: (view) => applyFormat(view, "italic"),
    },
    {
      key: "Mod-h",
      run: (view) => cycleHeading(view),
    },
    {
      key: "Mod-k",
      run: (view) => applyFormat(view, "link"),
    },
    {
      key: "Mod-e",
      run: (view) => applyFormat(view, "inlineCode"),
    },
    {
      key: "Mod-u",
      run: (view) => applyFormat(view, "strikethrough"),
    },
    {
      key: "Mod-t",
      run: (view) => applyFormat(view, "code"),
    },
    {
      key: "Mod-q",
      run: (view) => {
        const line = view.state.doc.lineAt(view.state.selection.main.head);
        view.dispatch({
          selection: { anchor: line.from, head: line.to },
        });
        return true;
      },
    },
    {
      key: "Mod-.",
      run: (view) => {
        const line = view.state.doc.lineAt(view.state.selection.main.head);
        view.dispatch({
          selection: { anchor: line.to },
        });
        return true;
      },
    },
    {
      key: "Mod-,",
      run: (view) => {
        const line = view.state.doc.lineAt(view.state.selection.main.head);
        view.dispatch({
          selection: { anchor: line.from },
        });
        return true;
      },
    },
  ])
);
