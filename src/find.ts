// Find (Ctrl+F): a bar above the editor that searches the left panel, with
// the next and previous match on Enter / Shift+Enter and F3 / Shift+F3.
// Letter case is ignored unless "Match case" is on; there is no replace.

import { EditorSelection, RangeSetBuilder, StateEffect } from "@codemirror/state";
import type { EditorState, Extension, Text } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin } from "@codemirror/view";
import type { DecorationSet, ViewUpdate } from "@codemirror/view";

interface Match {
  from: number;
  to: number;
}

/** What is searched for; empty while the find bar is closed. */
export class SearchQuery {
  private source = "";
  private matchCase = false;
  private regexp: RegExp | null = null;
  private listeners = new Set<() => void>();

  get text(): string {
    return this.source;
  }

  get caseSensitive(): boolean {
    return this.matchCase;
  }

  set(text: string, caseSensitive = this.matchCase): void {
    if (text === this.source && caseSensitive === this.matchCase) return;
    this.source = text;
    this.matchCase = caseSensitive;
    const pattern = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    this.regexp = text ? new RegExp(pattern, caseSensitive ? "gu" : "giu") : null;
    for (const listener of this.listeners) listener();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // The matches of the last document searched, so the highlighting and the
  // counter share one pass over the text.
  private cache: { doc: Text; regexp: RegExp; matches: Match[] } | null = null;

  /** Every match in `doc`, in order. */
  matches(doc: Text): Match[] {
    const { regexp } = this;
    if (!regexp) return [];
    if (this.cache?.doc !== doc || this.cache.regexp !== regexp) {
      const matches: Match[] = [];
      for (const match of doc.toString().matchAll(regexp)) {
        matches.push({ from: match.index, to: match.index + match[0].length });
      }
      this.cache = { doc, regexp, matches };
    }
    return this.cache.matches;
  }
}

/** Index of the first match that ends after `pos`. */
function firstEndingAfter(matches: Match[], pos: number): number {
  let low = 0;
  let high = matches.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (matches[mid].to <= pos) low = mid + 1;
    else high = mid;
  }
  return low;
}

// ---------- Editor extension ----------

const refresh = StateEffect.define<null>();
const matchMark = Decoration.mark({ class: "cm-search-match" });
const currentMark = Decoration.mark({ class: "cm-search-match cm-search-current" });

/** Highlights the matches in the editor's visible text; the selected one more strongly. */
export function searchHighlighting(query: SearchQuery): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      private readonly unsubscribe: () => void;

      constructor(private readonly view: EditorView) {
        // Deferred: the query can change while the editor is updating.
        this.unsubscribe = query.subscribe(() => queueMicrotask(() => this.view.dispatch({ effects: refresh.of(null) })));
        this.build();
      }

      update(update: ViewUpdate): void {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.selectionSet ||
          update.transactions.some((tr) => tr.effects.some((effect) => effect.is(refresh)))
        ) {
          this.build();
        }
      }

      destroy(): void {
        this.unsubscribe();
      }

      private build(): void {
        const { state } = this.view;
        const matches = query.matches(state.doc);
        const { main } = state.selection;
        const builder = new RangeSetBuilder<Decoration>();
        let next = 0;
        for (const { from, to } of this.view.visibleRanges) {
          for (let i = Math.max(next, firstEndingAfter(matches, from)); i < matches.length && matches[i].from < to; i++) {
            const match = matches[i];
            builder.add(match.from, match.to, match.from === main.from && match.to === main.to ? currentMark : matchMark);
            next = i + 1;
          }
        }
        this.decorations = builder.finish();
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}

// ---------- Find bar ----------

export interface FindStrings {
  find: string;
  placeholder: string;
  previous: string;
  next: string;
  close: string;
  matchCase: string;
  noResults: string;
  count: (current: number, total: number) => string;
  total: (total: number) => string;
}

const ICONS = {
  search: "m21 21-4.34-4.34M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
  matchCase: "m3 15 4-8 4 8M4 13h6M15 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0M21 9v6",
  chevronUp: "m18 15-6-6-6 6",
  chevronDown: "m6 9 6 6 6-6",
  close: "M18 6 6 18M6 6l12 12",
};

function iconButton(path: string, label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.dataset.slot = "button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" /></svg>`;
  button.addEventListener("click", onClick);
  return button;
}

export class FindBar {
  private readonly bar: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly counter: HTMLElement;
  private readonly caseButton: HTMLButtonElement;
  private frame = 0;

  /** Builds the bar inside `host`; closing it returns the focus to `view`. */
  constructor(
    host: HTMLElement,
    private readonly query: SearchQuery,
    private readonly view: EditorView,
    private readonly strings: FindStrings,
  ) {
    this.bar = host;
    this.bar.setAttribute("role", "search");
    this.bar.hidden = true;

    const field = document.createElement("label");
    field.className = "find-field";
    field.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS.search}" /></svg>`;
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.className = "find-input";
    this.input.dataset.slot = "input";
    this.input.placeholder = strings.placeholder;
    this.input.spellcheck = false;
    this.input.setAttribute("aria-label", strings.find);
    field.append(this.input);

    this.counter = document.createElement("span");
    this.counter.className = "find-count";
    this.counter.setAttribute("aria-live", "polite");

    // A toggle like Bold in the toolbar; the focus stays in the field.
    this.caseButton = iconButton(ICONS.matchCase, strings.matchCase, () => {
      this.query.set(this.input.value, !this.query.caseSensitive);
      this.caseButton.setAttribute("aria-pressed", String(this.query.caseSensitive));
      this.input.focus();
      this.select(0);
    });
    this.caseButton.classList.add("find-case");
    this.caseButton.setAttribute("aria-pressed", "false");
    this.caseButton.addEventListener("pointerdown", (event) => event.preventDefault());

    const actions = document.createElement("div");
    actions.className = "find-actions";
    actions.append(
      iconButton(ICONS.chevronUp, `${strings.previous} (Shift+F3)`, () => this.step(-1)),
      iconButton(ICONS.chevronDown, `${strings.next} (F3)`, () => this.step(1)),
      iconButton(ICONS.close, `${strings.close} (Esc)`, () => this.close()),
    );

    // The same divider as between the groups of the formatting toolbar.
    const separator = document.createElement("div");
    separator.className = "toolbar-separator";
    separator.setAttribute("role", "separator");
    separator.setAttribute("aria-orientation", "vertical");

    this.bar.append(field, this.caseButton, separator, this.counter, actions);

    this.input.addEventListener("input", () => {
      this.query.set(this.input.value);
      this.select(0);
    });
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.step(event.shiftKey ? -1 : 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
    });
  }

  get isOpen(): boolean {
    return !this.bar.hidden;
  }

  /** Shows the bar with the selected text (one line of it) as the query, ready for typing. */
  open(): void {
    const { state } = this.view;
    const { main } = state.selection;
    const selected = state.sliceDoc(main.from, main.to);
    if (selected && !selected.includes("\n") && selected.length <= 200) this.input.value = selected;
    this.bar.hidden = false;
    this.query.set(this.input.value);
    this.input.focus();
    this.input.select();
    this.refresh();
  }

  /** Ctrl+F: opens the bar, or closes it like Escape when it is open. */
  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  close(): void {
    if (!this.isOpen) return;
    this.bar.hidden = true;
    this.query.set("");
    this.view.focus();
  }

  /** Selects the next (1) or previous (-1) match; F3 also opens the bar. */
  step(direction: 1 | -1): void {
    if (!this.isOpen) {
      this.open();
      if (this.input.value) this.select(direction);
      return;
    }
    this.select(direction);
  }

  /** The editor's text or selection changed, or another tab is shown. */
  refresh(): void {
    if (!this.isOpen || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.updateCounter();
    });
  }

  /**
   * Selects a match: the first one from the start of the selection (0, while
   * typing, so the match grows with the query), or the next or previous one,
   * wrapping around the document.
   */
  private select(direction: -1 | 0 | 1): void {
    const { state } = this.view;
    const matches = this.query.matches(state.doc);
    this.updateCounter();
    if (matches.length === 0) return;
    const { main } = state.selection;
    let index: number;
    if (direction === -1) {
      index = matches.length - 1;
      while (index >= 0 && matches[index].from >= main.from) index--;
      if (index < 0) index = matches.length - 1;
    } else {
      const from = direction === 0 ? main.from : main.to;
      index = matches.findIndex((match) => match.from >= from);
      if (index < 0) index = 0;
    }
    const { from, to } = matches[index];
    this.view.dispatch({
      selection: EditorSelection.single(from, to),
      effects: EditorView.scrollIntoView(EditorSelection.range(from, to), { y: "nearest", yMargin: 64 }),
      userEvent: "select.search",
    });
    this.updateCounter();
  }

  private updateCounter(): void {
    const { state } = this.view;
    if (!this.query.text) {
      this.counter.textContent = "";
      return;
    }
    const matches = this.query.matches(state.doc);
    const current = currentIndex(state, matches);
    this.counter.textContent =
      matches.length === 0
        ? this.strings.noResults
        : current < 0
          ? this.strings.total(matches.length)
          : this.strings.count(current + 1, matches.length);
  }
}

/** Index of the match that is selected, or -1. */
function currentIndex(state: EditorState, matches: Match[]): number {
  const { main } = state.selection;
  const index = firstEndingAfter(matches, main.from);
  const match = matches[index];
  return match && match.from === main.from && match.to === main.to ? index : -1;
}
