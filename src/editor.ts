// Markdown source editor (left panel).

import { defaultKeymap, history, historyKeymap, insertTab } from "@codemirror/commands";
import { EditorState, StateField } from "@codemirror/state";
import { drawSelection, EditorView, keymap } from "@codemirror/view";
import type { Eol, LineBreak } from "./platform";

/** A line break (`\n` at `pos`) that is saved as `eol` instead of the file's dominant style. */
interface TrackedBreak {
  pos: number;
  eol: Eol;
}

// Files with mixed line endings: the breaks that differ from the dominant
// style follow the text through edits. A break that is deleted is forgotten;
// new breaks (Enter, paste) get the dominant style when saved.
const lineBreaks = StateField.define<readonly TrackedBreak[]>({
  create: () => [],
  update(breaks, tr) {
    if (!tr.docChanged || breaks.length === 0) return breaks;
    const kept: TrackedBreak[] = [];
    for (const { pos, eol } of breaks) {
      const from = tr.changes.mapPos(pos, 1);
      const to = tr.changes.mapPos(pos + 1, -1);
      if (to === from + 1 && tr.newDoc.sliceString(from, to) === "\n") kept.push({ pos: from, eol });
    }
    return kept;
  },
});

// Styles use the design tokens (CSS custom properties inherit into the shadow
// root). See docs/DESIGN.md.
const theme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "var(--background)",
      color: "var(--foreground)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--content-font-size)",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": {
      fontFamily: "inherit",
      lineHeight: "1.6",
      overflowX: "hidden",
      overflowY: "auto",
    },
    ".cm-content": { padding: "24px 0", caretColor: "var(--foreground)" },
    ".cm-line": { padding: "0 32px" },
    ".cm-cursor, .cm-dropCursor": { borderLeft: "1.5px solid var(--foreground)" },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: "color-mix(in oklch, var(--foreground) 22%, transparent)" },
    // Dark scroll bars matching the preview panel.
    ".cm-scroller::-webkit-scrollbar": { width: "12px" },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      border: "3px solid transparent",
      borderRadius: "6px",
      background: "var(--input) padding-box",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": { background: "var(--ring) padding-box" },
    ".cm-scroller::-webkit-scrollbar-track": { background: "transparent" },
  },
  { dark: true },
);

export class Editor {
  readonly view: EditorView;

  constructor(host: HTMLElement, onChange: () => void) {
    // CodeMirror injects its styles with constructable stylesheets only inside
    // a shadow root; in the document it would add a <style> element, which the
    // strict Content Security Policy blocks.
    const root = host.attachShadow({ mode: "open" });
    this.view = new EditorView({
      root,
      parent: root,
      state: this.createState(""),
      dispatch: (tr, view) => {
        view.update([tr]);
        if (tr.docChanged) onChange();
      },
    });
  }

  private createState(text: string, breaks: readonly LineBreak[] = []): EditorState {
    return EditorState.create({
      doc: text,
      extensions: [
        lineBreaks.init((state) => breaks.map(({ line, eol }) => ({ pos: state.doc.line(line + 1).to, eol }))),
        history(),
        drawSelection(),
        theme,
        EditorView.lineWrapping,
        // Spell checking will be added with the Windows Spell Checking API.
        EditorView.contentAttributes.of({ spellcheck: "false", autocorrect: "off", autocapitalize: "off" }),
        keymap.of([...defaultKeymap, ...historyKeymap, { key: "Tab", run: insertTab }]),
      ],
    });
  }

  /** Replaces the whole document, clearing undo history. */
  load(text: string, breaks: readonly LineBreak[] = []): void {
    this.view.setState(this.createState(text, breaks));
    this.view.scrollDOM.scrollTop = 0;
  }

  text(): string {
    return this.view.state.doc.toString();
  }

  /** Line breaks that differ from the file's dominant style, by line index. */
  lineBreaks(): LineBreak[] {
    const { doc } = this.view.state;
    return this.view.state.field(lineBreaks).map(({ pos, eol }) => ({ line: doc.lineAt(pos).number - 1, eol }));
  }

  length(): number {
    return this.view.state.doc.length;
  }

  focus(): void {
    this.view.focus();
  }
}
