import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";

export const applyFormat = (view: EditorView, type: string): boolean => {
  const { from, to } = view.state.selection.main;
  const selectedText = view.state.sliceDoc(from, to);

  let insert = "";
  let cursorOffset = 0;

  switch (type) {
    case "bold":
      insert = `**${selectedText}**`;
      cursorOffset = selectedText ? insert.length : 2;
      break;
    case "italic":
      insert = `*${selectedText}*`;
      cursorOffset = selectedText ? insert.length : 1;
      break;
    case "strikethrough":
      insert = `~~${selectedText}~~`;
      cursorOffset = selectedText ? insert.length : 2;
      break;
    case "h1":
      insert = `# ${selectedText}`;
      cursorOffset = selectedText ? insert.length : 2;
      break;

    case "ul":
      insert = `- ${selectedText}`;
      cursorOffset = selectedText ? insert.length : 2;
      break;
    case "ol":
      insert = `1. ${selectedText}`;
      cursorOffset = selectedText ? insert.length : 3;
      break;
    case "task":
      insert = `- [ ] ${selectedText}`;
      cursorOffset = selectedText ? insert.length : 6;
      break;
    case "quote":
      insert = `> ${selectedText}`;
      cursorOffset = selectedText ? insert.length : 2;
      break;
    case "code":
      insert = `\`\`\`\n${selectedText}\n\`\`\``;
      cursorOffset = selectedText ? insert.length - 4 : 4;
      break;
    case "inlineCode":
      insert = `\`${selectedText}\``;
      cursorOffset = selectedText ? insert.length : 1;
      break;
    case "link":
      insert = `[${selectedText}](url)`;
      cursorOffset = selectedText ? insert.length - 4 : 1;
      break;
    case "hr":
      insert = "\n---\n";
      cursorOffset = insert.length;
      break;
    default:
      return false;
  }

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + cursorOffset },
  });

  return true;
};

const cycleHeading = (view: EditorView): boolean => {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const lineText = line.text;

  const headingMatch = lineText.match(/^(#{1,4})\s/);

  let newText: string;

  if (!headingMatch) {
    newText = `# ${lineText}`;
  } else {
    const currentLevel = headingMatch[1].length;

    if (currentLevel >= 4) {
      newText = lineText.replace(/^#{1,4}\s/, "");
    } else {
      const newHashes = "#".repeat(currentLevel + 1);
      newText = lineText.replace(/^#{1,4}\s/, `${newHashes} `);
    }
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
