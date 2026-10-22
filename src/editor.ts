// Markdown source editor (left panel).

import { defaultKeymap, history, historyKeymap, insertTab } from "@codemirror/commands";
import { EditorSelection, EditorState, StateField } from "@codemirror/state";
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

/** Where the editor is scrolled to: the first visible line and how far it sticks out above the top. */
export interface ScrollPosition {
  pos: number;
  margin: number;
}

/** What is selected, as document offsets. */
export interface Selection {
  anchor: number;
  head: number;
}

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

  /**
   * A complete editor state for a document. Each tab keeps its own state, so
   * switching tabs keeps undo history, selection and line break tracking.
   */
  createState(text: string, breaks: readonly LineBreak[] = [], selection?: Selection): EditorState {
    const length = text.length;
    const clamp = (pos: number) => Math.max(0, Math.min(pos, length));
    return EditorState.create({
      doc: text,
      selection: selection ? EditorSelection.single(clamp(selection.anchor), clamp(selection.head)) : undefined,
      extensions: [
        lineBreaks.init((state) =>
          breaks.filter(({ line }) => line < state.doc.lines).map(({ line, eol }) => ({ pos: state.doc.line(line + 1).to, eol })),
        ),
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

  /** Shows `state` (another tab's document), scrolled to `scroll`. */
  setState(state: EditorState, scroll: ScrollPosition | null = null): void {
    this.view.setState(state);
    if (scroll && scroll.pos <= state.doc.length) {
      this.view.dispatch({ effects: EditorView.scrollIntoView(scroll.pos, { y: "start", yMargin: scroll.margin }) });
    } else {
      this.view.scrollDOM.scrollTop = 0;
    }
  }

  get state(): EditorState {
    return this.view.state;
  }

  scrollPosition(): ScrollPosition {
    const { scrollTop } = this.view.scrollDOM;
    const top = scrollTop - this.view.documentPadding.top;
    const block = this.view.lineBlockAtHeight(Math.max(0, top));
    return { pos: block.from, margin: block.top - top };
  }

  selection(): Selection {
    const { anchor, head } = this.view.state.selection.main;
    return { anchor, head };
  }

  text(): string {
    return this.view.state.doc.toString();
  }

  /** Line breaks that differ from the file's dominant style, by line index. */
  lineBreaks(state = this.view.state): LineBreak[] {
    const { doc } = state;
    return state.field(lineBreaks).map(({ pos, eol }) => ({ line: doc.lineAt(pos).number - 1, eol }));
  }

  length(): number {
    return this.view.state.doc.length;
  }

  focus(): void {
    this.view.focus();
  }
}
