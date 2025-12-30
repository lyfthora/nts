import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";

const getBlockPattern = (type: "ul" | "ol" | "task" | "quote"): RegExp => {
  const patterns = {
    ul: /^\s*-\s/,
    ol: /^\s*\d+\.\s/,
    task: /^\s*-\s\[[ x]\]\s/,
    quote: /^\s*>\s/,
  };
  return patterns[type];
};

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

  const indices: number[] = [];
  let pos = 0;
  while ((pos = lineText.indexOf(token, pos)) !== -1) {
    indices.push(pos);
    pos += token.length;
  }

  for (let i = 0; i < indices.length - 1; i += 2) {
    const start = indices[i];
    const end = indices[i + 1];
    const blockEnd = end + token.length;

    if (relFrom >= start && relTo <= blockEnd) {
      const startPos = line.from + start;
      const endPos = line.from + end;

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
  const pattern = getBlockPattern(type);

  const changes: any[] = [];
  let allHavePrefix = true;

  for (let i = startLine.number; i <= endLine.number; i++) {
    if (!pattern.test(view.state.doc.line(i).text)) {
      allHavePrefix = false;
      break;
    }
  }

  for (let i = startLine.number; i <= endLine.number; i++) {
    const line = view.state.doc.line(i);
    const hasPrefix = pattern.test(line.text);

    if (allHavePrefix && hasPrefix) {
      const matchLength = line.text.match(pattern)![0].length;
      changes.push({
        from: line.from,
        to: line.from + matchLength,
        insert: "",
      });
    } else if (!allHavePrefix && !hasPrefix) {
      changes.push({ from: line.from, to: line.from, insert: prefix });
    }
  }

  const firstLineChange = changes.find(
    (c) => view.state.doc.lineAt(c.from).number === startLine.number
  );

  const newCursor = firstLineChange
    ? allHavePrefix
      ? Math.max(
          from - (firstLineChange.to - firstLineChange.from),
          firstLineChange.from
        )
      : from + (firstLineChange.insert?.length || 0)
    : from;

  view.dispatch({ changes, selection: { anchor: newCursor } });
  return true;
};

const toggleCodeBlock = (view: EditorView): boolean => {
  const { from, to } = view.state.selection.main;
  const doc = view.state.doc;
  const startLineNum = doc.lineAt(from).number;

  let startLine = null,
    endLine = null;

  for (let i = startLineNum; i >= 1; i--) {
    const line = doc.line(i);
    if (line.text.trim().startsWith("```")) {
      startLine = line;
      break;
    }
  }

  if (startLine) {
    for (let i = startLineNum + 1; i <= doc.lines; i++) {
      const line = doc.line(i);
      if (line.text.trim() === "```") {
        endLine = line;
        break;
      }
    }
  }

  if (startLine && endLine) {
    view.dispatch({
      changes: [
        { from: startLine.from, to: startLine.to + 1, insert: "" },
        { from: endLine.from - 1, to: endLine.to, insert: "" },
      ],
      selection: { anchor: from - startLine.text.length - 1 },
    });
    return true;
  }

  const selectedText = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: `\`\`\`\n${selectedText}\n\`\`\`` },
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
const formatActions: Record<string, (view: EditorView) => boolean> = {
  bold: (v) => toggleFormat(v, "**", 2),
  italic: (v) => toggleFormat(v, "*", 1),
  strikethrough: (v) => toggleFormat(v, "~~", 2),
  inlineCode: (v) => toggleFormat(v, "`", 1),
  h1: cycleHeading,
  ul: (v) => toggleBlockFormat(v, "- ", "ul"),
  ol: (v) => toggleBlockFormat(v, "1. ", "ol"),
  task: (v) => toggleBlockFormat(v, "- [ ] ", "task"),
  quote: (v) => toggleBlockFormat(v, "> ", "quote"),
  code: toggleCodeBlock,
  link: toggleLink,
  hr: (v) => {
    const { from, to } = v.state.selection.main;
    v.dispatch({ changes: { from, to, insert: "\n---\n" } });
    return true;
  },
};

export const applyFormat = (view: EditorView, type: string): boolean => {
  return formatActions[type] ? formatActions[type](view) : false;
};

const shortcuts = [
  { key: "Mod-b", action: "bold" },
  { key: "Mod-i", action: "italic" },
  { key: "Mod-h", action: "h1" },
  { key: "Mod-k", action: "link" },
  { key: "Mod-e", action: "inlineCode" },
  { key: "Mod-u", action: "strikethrough" },
  { key: "Mod-t", action: "code" },
  { key: "Mod-Shift-8", action: "ul" },
  { key: "Mod-Shift-9", action: "ol" },
  { key: "Mod-Shift-7", action: "task" },
  { key: "Mod-Shift-.", action: "quote" },
];

export const markdownKeymap = Prec.highest(
  keymap.of([
    ...shortcuts.map(({ key, action }) => ({
      key,
      run: (view: EditorView) => applyFormat(view, action),
    })),

    {
      key: "Mod-q",
      run: (view) => {
        const line = view.state.doc.lineAt(view.state.selection.main.head);
        view.dispatch({ selection: { anchor: line.from, head: line.to } });
        return true;
      },
    },
    {
      key: "Mod-.",
      run: (view) => {
        const line = view.state.doc.lineAt(view.state.selection.main.head);
        view.dispatch({ selection: { anchor: line.to } });
        return true;
      },
    },
    {
      key: "Mod-,",
      run: (view) => {
        const line = view.state.doc.lineAt(view.state.selection.main.head);
        view.dispatch({ selection: { anchor: line.from } });
        return true;
      },
    },
  ])
);
