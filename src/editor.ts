// Markdown source editor (left panel).

import { defaultKeymap, history, historyKeymap, insertTab } from "@codemirror/commands";
import type { Command } from "@codemirror/view";
import { defineLanguageFacet, Language } from "@codemirror/language";
import { EditorSelection, EditorState, StateEffect, StateField } from "@codemirror/state";
import type { Text } from "@codemirror/state";
import { drawSelection, EditorView, keymap } from "@codemirror/view";
import { GFM, parser } from "@lezer/markdown";
import { searchHighlighting } from "./find";
import type { SearchQuery } from "./find";
import { moveBlock } from "./moveblock";
import type { Eol, LineBreak } from "./platform";
import { spellChecking } from "./spell";
import type { SpellService } from "./spell";

/** A line break (`\n` at `pos`) that is saved as `eol` instead of the file's dominant style. */
interface TrackedBreak {
  pos: number;
  eol: Eol;
}

// Sets the tracked breaks outright, for edits that move text around.
const replaceBreaks = StateEffect.define<readonly TrackedBreak[]>();

// Files with mixed line endings: the breaks that differ from the dominant
// style follow the text through edits. A break that is deleted is forgotten;
// new breaks (Enter, paste) get the dominant style when saved.
const lineBreaks = StateField.define<readonly TrackedBreak[]>({
  create: () => [],
  update(breaks, tr) {
    for (const effect of tr.effects) if (effect.is(replaceBreaks)) return effect.value;
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

// GFM syntax tree, kept up to date incrementally while typing. The formatting
// toolbar reads it to find bold, italic and underlined text; nothing is highlighted.
const markdown = new Language(defineLanguageFacet(), parser.configure(GFM), [], "markdown");

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
    // On the right, the fixed margin for the minimap when it is shown.
    ".cm-line": { padding: "0 calc(var(--content-padding-x) + var(--minimap-space, 0px)) 0 var(--content-padding-x)" },
    // Thin orange underline for misspelled words.
    ".cm-spell-error": {
      textDecoration: "underline",
      textDecorationColor: "var(--warning)",
      textDecorationThickness: "1px",
      textUnderlineOffset: "3px",
    },
    // Find: every match, and the selected one more strongly.
    ".cm-search-match": {
      backgroundColor: "var(--search-match)",
      borderRadius: "2px",
    },
    ".cm-search-current": { backgroundColor: "var(--search-current)" },
    ".cm-cursor, .cm-dropCursor": { borderLeft: "1.5px solid var(--foreground)" },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: "color-mix(in oklch, var(--foreground) 22%, transparent)" },
    // Dark scroll bars matching the preview panel.
    // None while the minimap is shown: it takes the scroll bar's place.
    ".cm-scroller::-webkit-scrollbar": { width: "var(--editor-scrollbar-width, 12px)" },
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

/** Moves the paragraph or list item at the selection up or down; see moveblock.ts. */
function moveBlockCommand(dir: -1 | 1): Command {
  return (view) => {
    const { state } = view;
    const { anchor, head } = state.selection.main;
    const move = moveBlock(state.doc.toString(), anchor, head, dir);
    if (move) {
      const breaks = state.field(lineBreaks).flatMap(({ pos, eol }) => {
        const moved = move.mapBreak(pos);
        return moved === null ? [] : [{ pos: moved, eol }];
      });
      view.dispatch({
        changes: { from: move.from, to: move.to, insert: move.insert },
        selection: EditorSelection.single(move.anchor, move.head),
        effects: replaceBreaks.of(breaks),
        scrollIntoView: true,
        userEvent: "move.line",
      });
    }
    // Handled even when nothing moves, so the key does nothing else.
    return true;
  };
}

/**
 * Where the editor is scrolled to: the first visible line (`pos` is its start)
 * and where the top of its text is, relative to the top of the panel
 * (negative when the line sticks out above it).
 */
export interface ScrollPosition {
  pos: number;
  margin: number;
}

/**
 * The number of characters between `from` and `to`, as a reader counts them:
 * spaces and tabs count, line breaks do not, and a character outside the
 * Basic Multilingual Plane (e.g. an emoji) counts once, not as two UTF-16 units.
 */
export function countChars(doc: Text, from: number, to: number): number {
  let count = 0;
  for (const iter = doc.iterRange(from, to); !iter.next().done; ) {
    if (iter.lineBreak) continue;
    const chunk = iter.value;
    count += chunk.length;
    for (let i = 1; i < chunk.length; i++) {
      const code = chunk.charCodeAt(i);
      const previous = chunk.charCodeAt(i - 1);
      if (code >= 0xdc00 && code <= 0xdfff && previous >= 0xd800 && previous <= 0xdbff) count--;
    }
  }
  return count;
}

/** What is selected, as document offsets. */
export interface Selection {
  anchor: number;
  head: number;
}

export class Editor {
  readonly view: EditorView;
  private readonly listeners: (() => void)[] = [];
  private readonly layoutListeners: (() => void)[] = [];

  constructor(
    host: HTMLElement,
    onChange: () => void,
    private readonly spell: SpellService,
    private readonly search: SearchQuery,
  ) {
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
        if (tr.docChanged || tr.selection) this.notify();
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
        markdown,
        drawSelection(),
        theme,
        EditorView.lineWrapping,
        // The browser's own spell checking is off; see spell.ts.
        spellChecking(this.spell),
        searchHighlighting(this.search),
        EditorView.updateListener.of((update) => {
          if (update.docChanged || update.geometryChanged || update.heightChanged || update.viewportChanged) {
            for (const listener of this.layoutListeners) listener();
          }
        }),
        EditorView.contentAttributes.of({ spellcheck: "false", autocorrect: "off", autocapitalize: "off" }),
        keymap.of([
          { key: "Alt-ArrowUp", run: moveBlockCommand(-1) },
          { key: "Alt-ArrowDown", run: moveBlockCommand(1) },
          ...defaultKeymap,
          ...historyKeymap,
          { key: "Tab", run: insertTab },
        ]),
      ],
    });
  }

  /** Shows `state` (another tab's document), scrolled to `scroll`. */
  setState(state: EditorState, scroll: ScrollPosition | null = null): void {
    this.view.setState(state);
    if (scroll && scroll.pos <= state.doc.length) {
      this.scrollTo(scroll);
    } else {
      this.view.scrollDOM.scrollTop = 0;
    }
    this.notify();
  }

  /** Scrolls so the top of the text of the line at `scroll.pos` is `scroll.margin` below the top of the panel. */
  scrollTo(scroll: ScrollPosition): void {
    // Measured against the rendered line, so it does not depend on the
    // estimated heights of the lines above it (a new state has only those).
    this.view.dispatch({ effects: EditorView.scrollIntoView(scroll.pos, { y: "start", yMargin: scroll.margin }) });
  }

  /**
   * The text size (a CSS variable) changed: forgets the line heights, which
   * CodeMirror would otherwise keep estimating at the old size, and scrolls
   * back to `scroll`.
   */
  rescale(scroll: ScrollPosition): void {
    this.view.setState(this.view.state);
    this.scrollTo(scroll);
  }

  /** Calls `listener` whenever the text, the selection or the shown document changes. */
  subscribe(listener: () => void): void {
    this.listeners.push(listener);
  }

  /** Calls `listener` whenever the text, the line heights or the size of the editor change. */
  onLayout(listener: () => void): void {
    this.layoutListeners.push(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  get state(): EditorState {
    return this.view.state;
  }

  scrollPosition(): ScrollPosition {
    const { scrollDOM, documentPadding } = this.view;
    const top = scrollDOM.scrollTop - documentPadding.top;
    const block = this.view.lineBlockAtHeight(Math.max(0, top));
    // The same measure `scrollTo` uses: the top of the text (not of the line
    // box, which is higher by half the leading) relative to the panel.
    const coords = this.view.coordsAtPos(block.from, 1);
    const margin = coords ? coords.top - scrollDOM.getBoundingClientRect().top : block.top - top;
    return { pos: block.from, margin };
  }

  /**
   * The line at height `y` of the scrolled content, from 0, plus the part of
   * the line above `y`; the line count below the last line.
   */
  lineAtHeight(y: number): number {
    const { view } = this;
    const top = y - view.documentPadding.top;
    if (top <= 0) return 0;
    const block = view.lineBlockAtHeight(top);
    if (top >= block.bottom) return view.state.doc.lines;
    return view.state.doc.lineAt(block.from).number - 1 + (top - block.top) / Math.max(1, block.height);
  }

  /** The height in the scrolled content where `lineAtHeight` gives `line`. */
  heightAtLine(line: number): number {
    const { view } = this;
    const { doc } = view.state;
    if (line >= doc.lines) return view.scrollDOM.scrollHeight;
    const index = Math.max(0, Math.floor(line));
    const block = view.lineBlockAt(doc.line(index + 1).from);
    return view.documentPadding.top + block.top + (line - index) * block.height;
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
