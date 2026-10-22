// Spell checking. The words are checked by the Windows Spell Checking API in
// the backend; this module finds the words in the editor's visible text,
// remembers the answers and underlines the misspelled words.

import { RangeSetBuilder, StateEffect } from "@codemirror/state";
import type { Extension, Text } from "@codemirror/state";
import { Decoration, ViewPlugin } from "@codemirror/view";
import type { DecorationSet, EditorView, ViewUpdate } from "@codemirror/view";
import * as platform from "./platform";

/** The spell checking language, or off. The click order in the status bar is pl → en → off. */
export type SpellMode = "pl" | "en" | "off";

const nextMode: Record<SpellMode, SpellMode> = { pl: "en", en: "off", off: "pl" };

export const isSpellMode = (value: unknown): value is SpellMode => value === "pl" || value === "en" || value === "off";

// Words are asked about in batches; the answers are kept per language.
const BATCH = 400;
const CACHE_LIMIT = 50_000;

/** Which language is checked, whether Windows has its dictionary, and what is known about words. */
export class SpellService {
  private lang: SpellMode;
  private missing = false;
  private verdicts = new Map<string, Map<string, boolean>>();
  private asked = new Set<string>();
  private listeners = new Set<() => void>();

  constructor(mode: SpellMode) {
    this.lang = mode;
    void this.probe();
  }

  get mode(): SpellMode {
    return this.lang;
  }

  /** The mode is on, but Windows has no dictionary for its language. */
  get dictionaryMissing(): boolean {
    return this.lang !== "off" && this.missing;
  }

  get active(): boolean {
    return this.lang !== "off" && !this.missing;
  }

  cycle(): void {
    this.setMode(nextMode[this.lang]);
  }

  setMode(mode: SpellMode): void {
    if (mode === this.lang) return;
    this.lang = mode;
    this.missing = false;
    this.notify();
    void this.probe();
  }

  /** Calls `listener` when the mode, the dictionary or the known words change. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** `true` for a misspelled word, `false` for a correct one, `undefined` when not known yet. */
  verdict(word: string): boolean | undefined {
    return this.verdicts.get(this.lang)?.get(word);
  }

  /** Asks the backend about the words that are not known yet; listeners are told when it answers. */
  async request(words: string[]): Promise<void> {
    const lang = this.lang;
    if (lang === "off") return;
    const known = this.verdicts.get(lang) ?? new Map<string, boolean>();
    this.verdicts.set(lang, known);
    const fresh = words.filter((word) => !known.has(word) && !this.asked.has(`${lang}:${word}`));
    for (const word of fresh) this.asked.add(`${lang}:${word}`);

    for (let i = 0; i < fresh.length; i += BATCH) {
      const batch = fresh.slice(i, i + BATCH);
      const misspelled = await platform.spellCheck(lang, batch);
      for (const word of batch) this.asked.delete(`${lang}:${word}`);
      if (misspelled === null) {
        if (this.lang === lang && !this.missing) {
          this.missing = true;
          this.notify();
        }
        return;
      }
      if (known.size > CACHE_LIMIT) known.clear();
      const bad = new Set(misspelled);
      for (const word of batch) known.set(word, bad.has(word));
    }
    if (fresh.length > 0) this.notify();
  }

  /** Finds out whether Windows has a dictionary for the current language. */
  private async probe(): Promise<void> {
    const lang = this.lang;
    if (lang === "off") return;
    const missing = (await platform.spellCheck(lang, [])) === null;
    if (this.lang === lang && missing !== this.missing) {
      this.missing = missing;
      this.notify();
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

// ---------- Finding words ----------

// Text that is not prose: inline code, HTML tags and entities, link targets, addresses.
const IGNORED = /`[^`\n]*`|<\/?[A-Za-z][^>\n]*>|&#?\w+;|\]\([^)\n]*\)|(?:https?:\/\/|www\.)\S+|\S+@\S+\.\S+/g;
const WORD = /[\p{L}\p{M}\p{N}_]+(?:['’][\p{L}\p{M}]+)*/gu;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

interface Word {
  from: number;
  to: number;
  text: string;
}

/** Words worth checking in one line: no code, links, numbers, acronyms or CamelCase. */
function wordsInLine(text: string, offset: number): Word[] {
  const masked = text.replace(IGNORED, (ignored) => " ".repeat(ignored.length));
  const words: Word[] = [];
  for (const match of masked.matchAll(WORD)) {
    const word = match[0];
    if (word.length < 2 || /[\p{N}_]/u.test(word) || /\p{Lu}/u.test(word.slice(1))) continue;
    words.push({ from: offset + match.index, to: offset + match.index + word.length, text: word });
  }
  return words;
}

/** Document ranges of fenced code blocks, which are not spell checked. */
function fencedRanges(doc: Text): [number, number][] {
  const ranges: [number, number][] = [];
  let open: { char: string; length: number; from: number } | null = null;
  let pos = 0;
  for (const line of doc.iterLines()) {
    const fence = FENCE.exec(line);
    if (!open && fence) {
      open = { char: fence[1][0], length: fence[1].length, from: pos };
    } else if (open && fence && fence[1][0] === open.char && fence[1].length >= open.length && line.trim() === fence[1]) {
      ranges.push([open.from, pos + line.length]);
      open = null;
    }
    pos += line.length + 1;
  }
  if (open) ranges.push([open.from, doc.length]);
  return ranges;
}

// ---------- Editor extension ----------

const refresh = StateEffect.define<null>();
const misspelledMark = Decoration.mark({ class: "cm-spell-error" });

// After an edit the underlines are updated only when typing pauses, so a word
// that is still being typed is not flagged.
const EDIT_PAUSE = 500;

/** Underlines misspelled words in the editor's visible text. */
export function spellChecking(service: SpellService): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      private timer = 0;
      private fences: { doc: Text; ranges: [number, number][] } | null = null;
      private readonly unsubscribe: () => void;

      constructor(private readonly view: EditorView) {
        this.unsubscribe = service.subscribe(() => this.view.dispatch({ effects: refresh.of(null) }));
        this.build();
      }

      update(update: ViewUpdate): void {
        if (update.transactions.some((tr) => tr.effects.some((effect) => effect.is(refresh)))) {
          this.build();
        } else if (update.docChanged) {
          this.decorations = this.decorations.map(update.changes);
          window.clearTimeout(this.timer);
          this.timer = window.setTimeout(() => this.view.dispatch({ effects: refresh.of(null) }), EDIT_PAUSE);
        } else if (update.viewportChanged) {
          this.build();
        }
      }

      destroy(): void {
        window.clearTimeout(this.timer);
        this.unsubscribe();
      }

      private build(): void {
        window.clearTimeout(this.timer);
        if (!service.active) {
          this.decorations = Decoration.none;
          return;
        }
        const { doc } = this.view.state;
        if (this.fences?.doc !== doc) this.fences = { doc, ranges: fencedRanges(doc) };
        const { ranges } = this.fences;

        const builder = new RangeSetBuilder<Decoration>();
        const unknown = new Set<string>();
        for (const { from, to } of this.view.visibleRanges) {
          for (let pos = from; pos <= to; ) {
            const line = doc.lineAt(pos);
            pos = line.to + 1;
            if (ranges.some(([start, end]) => line.from >= start && line.from <= end)) continue;
            for (const word of wordsInLine(line.text, line.from)) {
              const misspelled = service.verdict(word.text);
              if (misspelled === undefined) unknown.add(word.text);
              else if (misspelled) builder.add(word.from, word.to, misspelledMark);
            }
          }
        }
        this.decorations = builder.finish();
        if (unknown.size > 0) void service.request([...unknown]);
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}
