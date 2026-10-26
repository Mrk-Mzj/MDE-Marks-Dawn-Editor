// One-pane mode (docs/SPEC.md, "Tryb pracy: jedno lub dwa okna"): the editor
// shows the document rendered and still editable, like Notepad does with
// Markdown. The file stays the source of truth: the Markdown markers are only
// hidden (decorations on the GFM syntax tree), never removed, so saving gives
// the same bytes as in the two-pane mode.
//
// - Inline markers (`**`, `[`…`](url)`, `<u>`), block markers at the start of
//   a line (`# `, `> `, `- `) and escapes are hidden; list markers show as a
//   bullet or the rendered number.
// - Tables, code blocks, raw HTML blocks, horizontal rules and images are
//   rendered; they show their source while the cursor is in them.
// - The cursor skips the hidden markers, Backspace and Delete never remove a
//   single marker, and deleting all of a formatted stretch removes its markers.
// - Enter continues lists and quotes, Backspace at the start of a formatted
//   line removes the line's format, and Ctrl+Z right after typing that turned
//   into formatting keeps the typed characters as plain text.

import { isolateHistory, undo } from "@codemirror/commands";
import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState, Facet, findClusterBreak, Prec, StateField, Transaction } from "@codemirror/state";
import type { ChangeSpec, Extension, Line, Range, SelectionRange } from "@codemirror/state";
import { Decoration, EditorView, keymap, ViewPlugin, WidgetType } from "@codemirror/view";
import type { Command, DecorationSet, ViewUpdate } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { classifyHref } from "./links";
import { renderFragment } from "./preview";
import { allowedColors } from "./sanitize";

export interface LiveConfig {
  /** Opens a link (Ctrl+click). */
  followLink: (href: string) => void;
  /** Shown under the address of a link when hovering it ("Ctrl+click to open"). */
  linkHint: string;
}

const liveConfig = Facet.define<LiveConfig, LiveConfig>({
  combine: (values) => values[0] ?? { followLink: () => {}, linkHint: "" },
});

const liveFlag = Facet.define<boolean, boolean>({ combine: (values) => values.some(Boolean) });

/** Whether the editor state is in the one-pane mode. */
export const isLive = (state: EditorState): boolean => state.facet(liveFlag);

// ---------- Reading the syntax tree ----------

type Role = "heading" | "quote" | "list";

/** Markdown that is not shown: replaced by nothing or by a widget. */
interface Hidden {
  from: number;
  to: number;
  /** Shown instead (a bullet, an image frame, a character). */
  widget?: WidgetType;
  /** A block marker at the start of a line. */
  role?: Role;
  /** The list marker itself, for continuing the list. */
  list?: { markFrom: number; markTo: number; task: boolean };
  /** Where backslashes turn this marker into plain text again (opening markers only). */
  escape?: number[];
}

/** A stretch of formatted text: `from`–`openTo` and `closeFrom`–`to` are its hidden markers. */
interface Span {
  from: number;
  openTo: number;
  closeFrom: number;
  to: number;
}

interface Analysis {
  /** Sorted, not overlapping. */
  hidden: Hidden[];
  marks: { from: number; to: number; className: string; attributes?: Record<string, string> }[];
  /** Classes of whole lines, by the line's start. */
  lines: Map<number, string[]>;
  spans: Span[];
}

/** Top-level blocks rendered as a whole (see `blockField`). */
const RENDERED_BLOCK = /^(?:Table|FencedCode|CodeBlock|HTMLBlock|CommentBlock|ProcessingInstructionBlock|HorizontalRule)$/;

const SPAN_CLASS: Record<string, string> = {
  Emphasis: "cm-live-em",
  StrongEmphasis: "cm-live-strong",
  Strikethrough: "cm-live-strike",
  InlineCode: "cm-live-code",
};

const TAG_CLASS: Record<string, string> = {
  u: "cm-live-u",
  kbd: "cm-live-kbd",
  sub: "cm-live-sub",
  sup: "cm-live-sup",
};

const BULLETS = ["•", "◦", "▪"];

/** Whether a selection range touches `from`–`to` (the cursor at either edge counts). */
const touches = (state: EditorState, from: number, to: number) =>
  state.selection.ranges.some((range) => range.from <= to && range.to >= from);

/** The address of a link as the preview uses it, or null when the preview shows it as plain text. */
function linkTarget(href: string): string | null {
  // Bare e-mail addresses are mail links.
  const address = /^[^\s:@/]+@[^\s@/]+$/.test(href) ? `mailto:${href}` : href;
  const target = classifyHref(address);
  if (!target) return null;
  return target.kind === "external" ? target.url : address;
}

// Link reference definitions (`[ref]: url`) of a document, by lower-case label.
const referenceCache = new WeakMap<object, Map<string, string>>();

function references(state: EditorState): Map<string, string> {
  const { doc } = state;
  let refs = referenceCache.get(doc);
  if (!refs) {
    refs = new Map();
    for (const match of doc.toString().matchAll(/^ {0,3}\[([^\]\n]+)\]:[ \t]*<?([^\s>]+)>?/gm)) {
      const label = match[1].trim().toLowerCase();
      if (!refs.has(label)) refs.set(label, match[2]);
    }
    referenceCache.set(doc, refs);
  }
  return refs;
}

/**
 * What to hide and how to style the text between `from` and `to`. For
 * `search`, nothing is revealed by the cursor and images keep their alt text,
 * so the visible text can be searched.
 */
function analyze(state: EditorState, from: number, to: number, purpose: "view" | "search" = "view"): Analysis {
  const { doc } = state;
  const config = state.facet(liveConfig);
  const tree = purpose === "search" ? (ensureSyntaxTree(state, to, 200) ?? syntaxTree(state)) : syntaxTree(state);
  const out: Analysis = { hidden: [], marks: [], lines: new Map(), spans: [] };
  const revealed = (a: number, b: number) => purpose === "view" && touches(state, a, b);
  const hide = (h: Hidden) => {
    if (h.to > h.from) out.hidden.push(h);
  };
  const mark = (a: number, b: number, className: string, attributes?: Record<string, string>) => {
    if (b > a) out.marks.push({ from: a, to: b, className, attributes });
  };
  const lineClass = (a: number, b: number, className: string) => {
    // Only the lines being looked at: a long quote may reach far beyond them.
    for (let pos = Math.max(a, doc.lineAt(from).from); pos <= Math.min(b, to); ) {
      const line = doc.lineAt(pos);
      const classes = out.lines.get(line.from) ?? [];
      classes.push(className);
      out.lines.set(line.from, classes);
      pos = line.to + 1;
    }
  };
  const isBlank = (pos: number) => /^[ \t]$/.test(doc.sliceString(pos, pos + 1));
  const spacesAfter = (pos: number) => {
    while (pos < doc.length && isBlank(pos)) pos++;
    return pos;
  };
  const span = (open: SyntaxNode, close: SyntaxNode, className: string) => {
    const escape: number[] = [];
    for (let pos = open.from; pos < open.to; pos++) escape.push(pos);
    hide({ from: open.from, to: open.to, escape });
    hide({ from: close.from, to: close.to });
    mark(open.to, close.from, className);
    out.spans.push({ from: open.from, openTo: open.to, closeFrom: close.from, to: close.to });
  };
  const tags: { from: number; to: number; name: string; closing: boolean; text: string }[] = [];

  tree.iterate({
    from,
    to,
    enter: (ref) => {
      const { name } = ref;
      const node = ref.node;

      if (RENDERED_BLOCK.test(name)) {
        // Rendered by `blockField`, unless the cursor is in it or it is nested
        // (in a list or quote): then its source shows, in the code font.
        const top = node.parent?.name === "Document";
        if (name !== "HorizontalRule" && (!top || revealed(ref.from, ref.to))) lineClass(ref.from, ref.to, "cm-live-source");
        return false;
      }

      const atx = /^ATXHeading(\d)$/.exec(name);
      if (atx) {
        lineClass(ref.from, ref.from, `cm-live-h${atx[1]}`);
        return;
      }
      const setext = /^SetextHeading(\d)$/.exec(name);
      if (setext) {
        // The underline is hidden by `blockField`.
        const underline = doc.lineAt(ref.to);
        if (underline.from > ref.from) lineClass(ref.from, underline.from - 1, `cm-live-h${setext[1]}`);
        return;
      }
      if (name === "HeaderMark") {
        const heading = node.parent;
        if (!heading?.name.startsWith("ATX")) return;
        if (ref.from === heading.from) {
          hide({ from: ref.from, to: spacesAfter(ref.to), role: "heading", escape: [ref.from] });
        } else {
          // Closing hashes, with the spaces before them.
          let start = ref.from;
          while (start > heading.from && isBlank(start - 1)) start--;
          hide({ from: start, to: ref.to });
        }
        return;
      }

      if (name === "Blockquote") {
        let depth = 1;
        for (let p = node.parent; p; p = p.parent) if (p.name === "Blockquote") depth++;
        lineClass(ref.from, ref.to, `cm-live-quote-${Math.min(depth, 3)}`);
        return;
      }
      if (name === "QuoteMark") {
        hide({ from: ref.from, to: ref.to + (isBlank(ref.to) ? 1 : 0), role: "quote", escape: [ref.from] });
        return;
      }

      if (name === "ListMark") {
        const item = node.parent;
        const list = item?.parent;
        if (item?.name !== "ListItem" || !list) return;
        let depth = 0;
        for (let p: SyntaxNode | null = list; p; p = p.parent) if (p.name === "BulletList" || p.name === "OrderedList") depth++;
        const line = doc.lineAt(ref.from);
        let start = ref.from;
        while (start > line.from && isBlank(start - 1)) start--;
        let end = spacesAfter(ref.to);
        const marker = node.nextSibling?.name === "Task" ? node.nextSibling.firstChild : null;
        const task = marker?.name === "TaskMarker" && marker.from === end ? marker : null;
        if (task) end = spacesAfter(task.to);
        let label: string | null = null;
        let escape = ref.from;
        if (list.name === "OrderedList") {
          // The rendered number: the first item's number counts up.
          const first = list.firstChild?.firstChild;
          const startNumber = first ? parseInt(doc.sliceString(first.from, first.to), 10) : 1;
          let index = 0;
          for (let s = item.prevSibling; s; s = s.prevSibling) if (s.name === "ListItem") index++;
          label = `${startNumber + index}${doc.sliceString(ref.to - 1, ref.to)}`;
          escape = ref.to - 1;
        }
        const checked = task ? /x/i.test(doc.sliceString(task.from, task.to)) : null;
        lineClass(ref.from, ref.from, `cm-live-li cm-live-li-${Math.min(depth, 4)}`);
        hide({
          from: start,
          to: end,
          role: "list",
          widget: new ListWidget(depth, label, checked),
          list: { markFrom: ref.from, markTo: ref.to, task: task !== null },
          escape: [escape],
        });
        return;
      }

      if (name in SPAN_CLASS) {
        const first = node.firstChild;
        const last = node.lastChild;
        if (first && last && first.to <= last.from && first.name.endsWith("Mark") && last.name.endsWith("Mark")) {
          span(first, last, SPAN_CLASS[name]);
        }
        return name === "InlineCode" ? false : undefined;
      }

      if (name === "Link" || name === "Image") {
        const marks = node.getChildren("LinkMark");
        const url = node.getChild("URL");
        const label = node.getChild("LinkLabel");
        // `[text]` without an address is not a link.
        if (marks.length < 2 || (!url && !label)) return;
        if (name === "Image") {
          if (purpose === "search") {
            hide({ from: marks[0].from, to: marks[0].to });
            hide({ from: marks[1].from, to: ref.to });
          } else if (!revealed(ref.from, ref.to)) {
            const alt = doc.sliceString(marks[0].to, marks[1].from);
            const src = url ? doc.sliceString(url.from, url.to) : "";
            hide({ from: ref.from, to: ref.to, widget: new ImageWidget(alt, src) });
          }
          return false;
        }
        let href: string | null = null;
        if (url) href = doc.sliceString(url.from, url.to).replace(/^<(.*)>$/, "$1");
        else if (label) href = references(state).get(doc.sliceString(label.from + 1, label.to - 1).trim().toLowerCase()) ?? null;
        const target = href === null ? null : linkTarget(href);
        // The preview shows blocked links and unknown references as plain text.
        if (target === null) return;
        hide({ from: marks[0].from, to: marks[0].to, escape: [marks[0].from] });
        hide({ from: marks[1].from, to: ref.to });
        mark(marks[0].to, marks[1].from, "cm-live-link", { title: `${target}\n${config.linkHint}`, "data-href": target });
        out.spans.push({ from: ref.from, openTo: marks[0].to, closeFrom: marks[1].from, to: ref.to });
        // Formatting inside the link text.
        return;
      }
      if (name === "Autolink") {
        const url = node.getChild("URL");
        const target = url ? linkTarget(doc.sliceString(url.from, url.to)) : null;
        if (!url || target === null) return false;
        hide({ from: ref.from, to: url.from, escape: [ref.from] });
        hide({ from: url.to, to: ref.to });
        mark(url.from, url.to, "cm-live-link", { title: `${target}\n${config.linkHint}`, "data-href": target });
        return false;
      }
      if (name === "URL") {
        const parent = node.parent?.name;
        if (parent === "Link" || parent === "Image" || parent === "Autolink" || parent === "LinkReference") return;
        // A bare address in the text.
        const target = linkTarget(doc.sliceString(ref.from, ref.to));
        if (target !== null) mark(ref.from, ref.to, "cm-live-link", { title: `${target}\n${config.linkHint}`, "data-href": target });
        return;
      }

      if (name === "Escape") {
        hide({ from: ref.from, to: ref.from + 1 });
        return;
      }
      if (name === "HardBreak") {
        if (doc.sliceString(ref.from, ref.from + 1) === "\\") hide({ from: ref.from, to: ref.from + 1 });
        return;
      }
      if (name === "Entity") {
        const text = doc.sliceString(ref.from, ref.to);
        const char = decodeEntity(text);
        if (purpose === "view" && char !== text) hide({ from: ref.from, to: ref.to, widget: new TextWidget(char) });
        return;
      }
      if (name === "HTMLTag" || name === "Comment" || name === "ProcessingInstruction") {
        const text = doc.sliceString(ref.from, ref.to);
        const tag = /^<(\/?)([a-z][a-z0-9-]*)/i.exec(text);
        hide({ from: ref.from, to: ref.to, escape: tag && !tag[1] ? [ref.from] : undefined });
        if (tag) tags.push({ from: ref.from, to: ref.to, name: tag[2].toLowerCase(), closing: tag[1] === "/", text });
        return;
      }
      // Markers handled with their parent node.
      if (name.endsWith("Mark") || name === "LinkLabel" || name === "LinkTitle") return false;
    },
  });

  // Raw HTML: style the text between whitelisted tags (see sanitize.ts).
  const open = new Map<string, (typeof tags)[number][]>();
  for (const tag of tags) {
    const waiting = open.get(tag.name) ?? [];
    open.set(tag.name, waiting);
    if (!tag.closing) {
      waiting.push(tag);
      continue;
    }
    const start = waiting.pop();
    if (!start) continue;
    const className = tag.name === "span" ? colorClass(start.text) : TAG_CLASS[tag.name];
    if (className) mark(start.to, tag.from, className);
    out.spans.push({ from: start.from, openTo: start.to, closeFrom: tag.from, to: tag.to });
  }

  // Overlapping parts (the indentation before a list marker in a quote) are cut off.
  out.hidden.sort((a, b) => a.from - b.from || b.to - a.to);
  const hidden: Hidden[] = [];
  let end = -1;
  for (const h of out.hidden) {
    if (h.from < end) h.from = end;
    if (h.to <= h.from) continue;
    hidden.push(h);
    end = h.to;
  }
  out.hidden = hidden;
  return out;
}

const lineAnalysis = (state: EditorState, line: Line) => analyze(state, line.from, line.to);

/** The block markers at the start of `line` (`> `, `# `, `- `), outermost first. */
function prefixOf(analysis: Analysis, line: Line): Hidden[] {
  const pieces: Hidden[] = [];
  let pos = line.from;
  for (const h of analysis.hidden) {
    // Markers of formatting that starts on an earlier line.
    if (h.from < line.from) continue;
    if (h.from !== pos || !h.role) break;
    pieces.push(h);
    pos = h.to;
  }
  return pieces;
}

/** Where the visible text of `line` starts: after its hidden block markers. */
function prefixEnd(state: EditorState, line: Line): number {
  const pieces = prefixOf(lineAnalysis(state, line), line);
  return pieces.length > 0 ? pieces[pieces.length - 1].to : line.from;
}

// ---------- Widgets ----------

/** A bullet, the rendered number of an ordered list item, or a task check box. */
class ListWidget extends WidgetType {
  constructor(
    readonly depth: number,
    readonly label: string | null,
    readonly checked: boolean | null,
  ) {
    super();
  }

  eq(other: ListWidget): boolean {
    return other.depth === this.depth && other.label === this.label && other.checked === this.checked;
  }

  toDOM(): HTMLElement {
    const el = document.createElement("span");
    el.className = "cm-live-bullet";
    if (this.checked !== null) {
      el.classList.add("cm-live-task");
      el.innerHTML = `<span class="cm-live-check">${this.checked ? '<span class="cm-live-check-dot"></span>' : ""}</span>`;
    } else if (this.label !== null) {
      el.classList.add("cm-live-number");
      el.textContent = this.label;
    } else {
      const dot = document.createElement("span");
      dot.className = "cm-live-dot";
      dot.textContent = BULLETS[(this.depth - 1) % BULLETS.length];
      el.append(dot);
    }
    return el;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

const imageIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';

/** An image: a frame with the alt text, as in the preview. The file is never loaded. */
class ImageWidget extends WidgetType {
  constructor(
    readonly alt: string,
    readonly src: string,
  ) {
    super();
  }

  eq(other: ImageWidget): boolean {
    return other.alt === this.alt && other.src === this.src;
  }

  toDOM(): HTMLElement {
    const el = document.createElement("span");
    el.className = "cm-live-image";
    el.title = this.src;
    el.innerHTML = imageIcon;
    const alt = document.createElement("span");
    alt.textContent = this.alt;
    el.append(alt);
    return el;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/** A character written as an entity (`&amp;`). */
class TextWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  eq(other: TextWidget): boolean {
    return other.text === this.text;
  }

  toDOM(): HTMLElement {
    const el = document.createElement("span");
    el.textContent = this.text;
    return el;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

const entityDecoder = document.createElement("textarea");
const entities = new Map<string, string>();

function decodeEntity(entity: string): string {
  let char = entities.get(entity);
  if (char === undefined) {
    // A textarea only decodes character references; it never creates elements.
    entityDecoder.innerHTML = entity;
    char = entityDecoder.value;
    entities.set(entity, char);
  }
  return char;
}

/** A table, code block, raw HTML block or horizontal rule, rendered like in the preview. */
class BlockWidget extends WidgetType {
  constructor(readonly source: string) {
    super();
  }

  eq(other: BlockWidget): boolean {
    return other.source === this.source;
  }

  toDOM(view: EditorView): HTMLElement {
    const el = document.createElement("div");
    el.className = "cm-live-block";
    el.append(renderFragment(this.source));
    // A click shows the source; Ctrl+click on a link follows it.
    el.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const link = (event.target as Element).closest("a");
      if (link && event.ctrlKey) {
        view.state.facet(liveConfig).followLink(link.getAttribute("href") ?? "");
        return;
      }
      const pos = view.posAtDOM(el);
      view.dispatch({ selection: EditorSelection.cursor(pos), scrollIntoView: true, userEvent: "select.pointer" });
      view.focus();
    });
    return el;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

// Colors of `<span style="…">`: the Content Security Policy forbids style
// attributes, so each color gets a class in a style sheet of the editor.
const colorSheet = new CSSStyleSheet();
const colorClasses = new Map<string, string>();

function colorClass(tag: string): string | undefined {
  const style = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
  const colors = allowedColors(style ? (style[1] ?? style[2]) : "");
  if (colors.length === 0) return undefined;
  const rule = colors.map(([property, value]) => `${property}: ${value}`).join("; ");
  let className = colorClasses.get(rule);
  if (!className) {
    className = `cm-live-color-${colorClasses.size}`;
    colorClasses.set(rule, className);
    colorSheet.insertRule(`.${className} { ${rule} }`, colorSheet.cssRules.length);
  }
  return className;
}

// ---------- Decorations ----------

/** Rendered blocks and hidden setext underlines; they span lines, so they come from a state field. */
function buildBlocks(state: EditorState): DecorationSet {
  const { doc } = state;
  const ranges: Range<Decoration>[] = [];
  for (let node = syntaxTree(state).topNode.firstChild; node; node = node.nextSibling) {
    if (touches(state, node.from, node.to)) continue;
    if (RENDERED_BLOCK.test(node.name)) {
      let end = node.to;
      if (end > node.from && doc.sliceString(end - 1, end) === "\n") end--;
      const from = doc.lineAt(node.from).from;
      const to = doc.lineAt(end).to;
      ranges.push(Decoration.replace({ widget: new BlockWidget(doc.sliceString(from, to)), block: true }).range(from, to));
    } else if (node.name.startsWith("SetextHeading")) {
      const underline = doc.lineAt(node.to);
      if (underline.from > node.from) ranges.push(Decoration.replace({}).range(underline.from - 1, underline.to));
    }
  }
  return Decoration.set(ranges, true);
}

const blockField = StateField.define<DecorationSet>({
  create: buildBlocks,
  update(blocks, tr) {
    if (tr.docChanged || tr.selection || syntaxTree(tr.state) !== syntaxTree(tr.startState)) return buildBlocks(tr.state);
    return blocks;
  },
  provide: (field) => [EditorView.decorations.from(field), EditorView.atomicRanges.of((view) => view.state.field(field))],
});

/** Hidden markers, styles and line classes of the visible part of the document. */
const inlinePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;
    atomic: DecorationSet = Decoration.none;

    constructor(view: EditorView) {
      const root = view.root;
      if (!root.adoptedStyleSheets.includes(colorSheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, colorSheet];
      this.build(view);
    }

    update(update: ViewUpdate): void {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        syntaxTree(update.state) !== syntaxTree(update.startState)
      ) {
        this.build(update.view);
      }
    }

    private build(view: EditorView): void {
      const { state } = view;
      const { from, to } = view.viewport;
      const analysis = analyze(state, from, to);
      const ranges: Range<Decoration>[] = [];
      const atomic: Range<Decoration>[] = [];
      for (const h of analysis.hidden) {
        // Hiding a line break is up to `blockField`.
        if (state.doc.lineAt(h.from).to < h.to) continue;
        const range = Decoration.replace(h.widget ? { widget: h.widget } : {}).range(h.from, h.to);
        ranges.push(range);
        atomic.push(range);
      }
      for (const m of analysis.marks) {
        ranges.push(Decoration.mark({ class: m.className, attributes: m.attributes }).range(m.from, m.to));
      }
      for (const [pos, classes] of analysis.lines) ranges.push(Decoration.line({ class: classes.join(" ") }).range(pos));
      this.decorations = Decoration.set(ranges, true);
      this.atomic = Decoration.set(atomic, true);
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
    provide: (plugin) => EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomic ?? Decoration.none),
  },
);

// ---------- The cursor ----------

/** A cursor before a line's hidden block markers moves after them, so typing never goes in front of `# ` or `- `. */
const cursorAfterPrefix = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged && !tr.selection) return tr;
  const { state } = tr;
  let moved = false;
  const ranges = state.selection.ranges.map((range) => {
    if (!range.empty) return range;
    const end = prefixEnd(state, state.doc.lineAt(range.head));
    if (range.head >= end) return range;
    moved = true;
    return EditorSelection.cursor(end);
  });
  if (!moved) return tr;
  return [tr, { selection: EditorSelection.create(ranges, state.selection.mainIndex), sequential: true }];
});

/** Hidden markers without a widget (nothing is shown for them). */
const markersOnly = (analysis: Analysis) => analysis.hidden.filter((h) => !h.widget && !h.role);

/** Moves `pos` over markers starting (forward) or ending (backward) there. */
function skipMarkers(analysis: Analysis, pos: number, forward: boolean): number {
  const markers = markersOnly(analysis);
  for (let again = true; again; ) {
    again = false;
    for (const h of markers) {
      if (forward ? h.from === pos : h.to === pos) {
        pos = forward ? h.to : h.from;
        again = true;
      }
    }
  }
  return pos;
}

/** One visible character to the left or right; hidden markers do not take a key press. */
function stepChar(state: EditorState, head: number, forward: boolean): number {
  const line = state.doc.lineAt(head);
  const analysis = lineAnalysis(state, line);
  const pos = skipMarkers(analysis, head, forward);
  if (forward) {
    if (pos >= line.to) return Math.min(line.to + 1, state.doc.length);
    const widget = analysis.hidden.find((h) => h.from === pos && h.widget && !h.role);
    return widget ? widget.to : line.from + findClusterBreak(line.text, pos - line.from, true);
  }
  const start = prefixOf(analysis, line);
  if (pos <= line.from || (start.length > 0 && pos <= start[start.length - 1].to)) return Math.max(line.from - 1, 0);
  const widget = analysis.hidden.find((h) => h.to === pos && h.widget && !h.role);
  return widget ? widget.from : line.from + findClusterBreak(line.text, pos - line.from, false);
}

function moveChar(forward: boolean, extend: boolean): Command {
  return (view) => {
    const { state } = view;
    const selection = EditorSelection.create(
      state.selection.ranges.map((range: SelectionRange) => {
        if (!extend && !range.empty) return EditorSelection.cursor(forward ? range.to : range.from);
        const head = stepChar(state, range.head, forward);
        return extend ? EditorSelection.range(range.anchor, head) : EditorSelection.cursor(head);
      }),
      state.selection.mainIndex,
    );
    view.dispatch({ selection, scrollIntoView: true, userEvent: "select" });
    return true;
  };
}

// ---------- Deleting ----------

/**
 * Deletes `from`–`to` and inserts `insert` there, keeping the markers of
 * formatting that is only partly deleted (so `**bo|ld** te|xt` leaves
 * `**bo**xt`) and removing formatting whose text is all gone.
 */
function safeReplace(state: EditorState, from: number, to: number, insert = ""): ChangeSpec[] {
  if (to <= from) return insert ? [{ from, insert }] : [];
  const analysis = analyze(state, state.doc.lineAt(from).from, state.doc.lineAt(to).to);
  const deleted: [number, number][] = [[from, to]];
  const covered = (a: number, b: number) => deleted.some(([x, y]) => x <= a && b <= y);
  const emptied = new Set<Span>();
  for (let changed = true; changed; ) {
    changed = false;
    for (const s of analysis.spans) {
      if (emptied.has(s) || covered(s.from, s.to) || s.closeFrom <= s.openTo) continue;
      // Text typed in place of all of the text stays formatted.
      const refilled = insert !== "" && from >= s.openTo && from <= s.closeFrom;
      if (!refilled && covered(s.openTo, s.closeFrom)) {
        emptied.add(s);
        deleted.push([s.from, s.to]);
        changed = true;
      }
    }
  }
  const kept: [number, number][] = [];
  for (const s of analysis.spans) {
    if (emptied.has(s) || covered(s.from, s.to)) continue;
    for (const [a, b] of [
      [s.from, s.openTo],
      [s.closeFrom, s.to],
    ]) {
      if (b > a && deleted.some(([x, y]) => x < b && a < y)) kept.push([a, b]);
    }
  }
  // Merge the deleted ranges, then take out the kept markers.
  deleted.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [a, b] of deleted) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  const pieces: [number, number][] = [];
  for (const [a, b] of merged) {
    let start = a;
    for (const [x, y] of kept.filter(([x, y]) => x < b && a < y).sort((p, q) => p[0] - q[0])) {
      if (x > start) pieces.push([start, x]);
      start = Math.max(start, y);
    }
    if (start < b) pieces.push([start, b]);
  }
  const changes: ChangeSpec[] = pieces.map(([a, b]) => ({ from: a, to: b }));
  if (insert) {
    // Typed text goes where the replaced text started (inside formatting
    // removed as a whole: where that formatting was).
    const inside = pieces.find(([a, b]) => a < from && from < b);
    changes.push({ from: inside ? inside[0] : from, insert });
  }
  return changes;
}

/** Applies `changes` with the cursor where `cursor` (a position before them) ends up. */
function dispatchChanges(view: EditorView, changes: ChangeSpec[], userEvent: string, cursor: number, assoc: -1 | 1 = 1): void {
  const changeSet = view.state.changes(changes);
  if (changeSet.empty) return;
  const head = changeSet.mapPos(cursor, assoc);
  view.dispatch({ changes: changeSet, selection: EditorSelection.cursor(head), scrollIntoView: true, userEvent });
}

/**
 * Backspace: at the start of a heading, list item or quote it removes the
 * line's innermost format; otherwise it deletes one visible character (an
 * image or entity as a whole), never a marker alone.
 */
const deleteBackward: Command = (view) => {
  const { state } = view;
  const range = state.selection.main;
  if (!range.empty) {
    dispatchChanges(view, safeReplace(state, range.from, range.to), "delete.backward", range.from);
    return true;
  }
  const line = state.doc.lineAt(range.head);
  const analysis = lineAnalysis(state, line);
  const prefix = prefixOf(analysis, line);
  if (prefix.length > 0 && range.head <= prefix[prefix.length - 1].to) {
    const inner = prefix[prefix.length - 1];
    view.dispatch({
      changes: { from: inner.from, to: inner.to },
      selection: EditorSelection.cursor(inner.from),
      scrollIntoView: true,
      userEvent: "delete.backward",
    });
    return true;
  }
  const pos = skipMarkers(analysis, range.head, false);
  if (pos <= line.from) {
    if (line.from === 0) return true;
    dispatchChanges(view, [{ from: line.from - 1, to: line.from }], "delete.backward", line.from - 1);
    return true;
  }
  const widget = analysis.hidden.find((h) => h.to === pos && h.widget && !h.role);
  const start = widget ? widget.from : line.from + findClusterBreak(line.text, pos - line.from, false);
  // The cursor stays where the character was: inside its formatting, so typing goes on in it.
  dispatchChanges(view, safeReplace(state, start, pos), "delete.backward", start);
  return true;
};

/** Delete: one visible character forward; at the end of a line, the next line joins it without its block markers. */
const deleteForward: Command = (view) => {
  const { state } = view;
  const range = state.selection.main;
  if (!range.empty) {
    dispatchChanges(view, safeReplace(state, range.from, range.to), "delete.forward", range.from);
    return true;
  }
  const line = state.doc.lineAt(range.head);
  const analysis = lineAnalysis(state, line);
  const pos = skipMarkers(analysis, range.head, true);
  if (pos >= line.to) {
    if (line.to >= state.doc.length) return true;
    const next = state.doc.line(line.number + 1);
    dispatchChanges(view, [{ from: line.to, to: prefixEnd(state, next) }], "delete.forward", line.to, -1);
    return true;
  }
  const widget = analysis.hidden.find((h) => h.from === pos && h.widget && !h.role);
  const end = widget ? widget.to : line.from + findClusterBreak(line.text, pos - line.from, true);
  dispatchChanges(view, safeReplace(state, pos, end), "delete.forward", pos, -1);
  return true;
};

/** Ctrl+Backspace / Ctrl+Delete: a word, through `safeReplace`. */
function deleteGroup(forward: boolean): Command {
  return (view) => {
    const { state } = view;
    const range = state.selection.main;
    if (!range.empty) return forward ? deleteForward(view) : deleteBackward(view);
    const target = view.moveByGroup(range, forward).head;
    if (target === range.head) return true;
    const [from, to] = forward ? [range.head, target] : [target, range.head];
    dispatchChanges(view, safeReplace(state, from, to), forward ? "delete.forward" : "delete.backward", from);
    return true;
  };
}

/** Typing, pasting or cutting over a selection keeps the markers of formatting that is only partly replaced. */
const safeReplacement = EditorState.transactionFilter.of((tr) => {
  // Composition (dictation, input methods) is left alone: the browser owns that text.
  if (
    !tr.docChanged ||
    tr.isUserEvent("input.type.compose") ||
    !["input.type", "input.paste", "input.drop", "delete.cut"].some((event) => tr.isUserEvent(event))
  ) {
    return tr;
  }
  const replaced: { from: number; to: number; insert: string }[] = [];
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    replaced.push({ from: fromA, to: toA, insert: inserted.toString() });
  });
  if (replaced.length !== 1 || replaced[0].to === replaced[0].from) return tr;
  const { from, to, insert } = replaced[0];
  const changes = tr.startState.changes(safeReplace(tr.startState, from, to, insert));
  // The same text as the browser's own change: keep that change and its cursor.
  if (changes.apply(tr.startState.doc).eq(tr.newDoc)) return tr;
  // The cursor goes after the typed or pasted text (mapping `from` would put
  // it before text inserted where the deletion starts).
  let cursor = changes.mapPos(from, 1);
  changes.iterChanges((_fromA, _toA, _fromB, toB, inserted) => {
    if (inserted.length && inserted.toString() === insert) cursor = toB;
  });
  return {
    changes,
    selection: EditorSelection.cursor(cursor),
    scrollIntoView: true,
    userEvent: tr.annotation(Transaction.userEvent),
  };
});

// ---------- Enter ----------

/**
 * Enter in a list item starts the next item (an ordered list counts on); in an
 * empty item it ends the list. In a quote it continues the quote, and on an
 * empty quote line it ends it.
 */
const continueBlock: Command = (view) => {
  const { state } = view;
  const range = state.selection.main;
  if (!range.empty) return false;
  const line = state.doc.lineAt(range.head);
  const prefix = prefixOf(lineAnalysis(state, line), line);
  const list = prefix.find((h) => h.role === "list");
  const quote = prefix.filter((h) => h.role === "quote");
  if (!list && quote.length === 0) return false;
  const end = prefix[prefix.length - 1].to;
  const empty = state.sliceDoc(end, line.to).trim() === "";

  if (empty) {
    // An empty item or quote line: the list or quote ends here.
    const remove = list ?? quote[quote.length - 1];
    view.dispatch({
      changes: { from: remove.from, to: line.to },
      selection: EditorSelection.cursor(remove.from),
      scrollIntoView: true,
      userEvent: "input",
    });
    return true;
  }

  let insert: string;
  if (list?.list) {
    const { markFrom, markTo, task } = list.list;
    const mark = state.sliceDoc(markFrom, markTo);
    const number = /^(\d+)([.)])$/.exec(mark);
    const next = number ? `${parseInt(number[1], 10) + 1}${number[2]}` : mark;
    insert = `${state.sliceDoc(line.from, markFrom)}${next} ${task ? "[ ] " : ""}`;
  } else {
    // Only the quote goes on, not a heading inside it.
    insert = state.sliceDoc(line.from, quote[quote.length - 1].to);
  }
  view.dispatch({
    changes: { from: range.head, insert: `\n${insert}` },
    selection: EditorSelection.cursor(range.head + 1 + insert.length),
    scrollIntoView: true,
    userEvent: "input",
  });
  return true;
};

// ---------- Typing that turns into formatting ----------

/**
 * Remembers, after typing that made new formatting (a closing `**`, `# ` at
 * the start of a line), where backslashes make the markers plain text again:
 * Ctrl+Z right after it does that instead of undoing the typing.
 */
const autoformat = ViewPlugin.fromClass(
  class {
    record: { doc: EditorState["doc"]; escape: number[] } | null = null;

    update(update: ViewUpdate): void {
      if (!update.docChanged) return;
      this.record = null;
      const tr = update.transactions.find((t) => t.docChanged);
      if (!tr || update.transactions.length !== 1 || !tr.isUserEvent("input.type")) return;
      const before = tr.startState;
      const oldLine = before.doc.lineAt(before.selection.main.head);
      const known = new Set(
        lineAnalysis(before, oldLine).hidden.map((h) => `${tr.changes.mapPos(h.from, 1)}:${tr.changes.mapPos(h.to, -1)}`),
      );
      const { state } = update;
      const line = state.doc.lineAt(state.selection.main.head);
      const escape = lineAnalysis(state, line)
        .hidden.filter((h) => h.escape && !known.has(`${h.from}:${h.to}`))
        .flatMap((h) => h.escape!);
      if (escape.length > 0) this.record = { doc: state.doc, escape };
    }
  },
);

/**
 * Takes back the typing and types it again with the new markers escaped, as
 * one undo step: the next Ctrl+Z removes the typed text, escapes included.
 */
const undoAutoformat: Command = (view) => {
  const plugin = view.plugin(autoformat);
  const record = plugin?.record;
  if (!record || record.doc !== view.state.doc) return false;
  plugin.record = null;
  const typed = view.state;
  let undone: Transaction | null = null;
  if (!undo({ state: typed, dispatch: (tr) => (undone = tr) }) || !undone) return false;
  const retype = (undone as Transaction).changes.invert(typed.doc);
  view.dispatch(undone);
  const escapes = typed.changes(record.escape.map((pos) => ({ from: pos, insert: "\\" })));
  view.dispatch({
    changes: retype.compose(escapes),
    selection: typed.selection.map(escapes),
    annotations: isolateHistory.of("full"),
    scrollIntoView: true,
    userEvent: "input.escape",
  });
  return true;
};

// ---------- Links and task boxes ----------

/** A click on a task box checks or unchecks it: `[ ]` ⇄ `[x]` in the file. */
function toggleTask(event: MouseEvent, view: EditorView): boolean {
  const box = (event.target as Element).closest(".cm-live-task");
  if (!box) return false;
  const pos = view.posAtDOM(box);
  const line = view.state.doc.lineAt(pos);
  const match = /^([ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+\[)([ xX])\]/.exec(line.text.slice(pos - line.from));
  if (!match) return false;
  event.preventDefault();
  const at = pos + match[1].length;
  view.dispatch({ changes: { from: at, to: at + 1, insert: match[2] === " " ? "x" : " " }, userEvent: "input.toggle" });
  return true;
}

const linkEvents = EditorView.domEventHandlers({
  // Ctrl+click follows a link; a plain click only places the cursor.
  mousedown(event, view) {
    if (event.button === 0 && !event.ctrlKey && toggleTask(event, view)) return true;
    if (event.button !== 0 || !event.ctrlKey) return false;
    const link = (event.target as Element).closest<HTMLElement>("[data-href]");
    if (!link) return false;
    event.preventDefault();
    view.state.facet(liveConfig).followLink(link.dataset.href ?? "");
    return true;
  },
  // The pointing hand shows over links while Ctrl is held.
  mousemove(event, view) {
    view.dom.classList.toggle("cm-live-ctrl", event.ctrlKey);
    return false;
  },
  keydown(event, view) {
    if (event.key === "Control") view.dom.classList.add("cm-live-ctrl");
    return false;
  },
  keyup(event, view) {
    if (event.key === "Control") view.dom.classList.remove("cm-live-ctrl");
    return false;
  },
});

// ---------- Search ----------

// The hidden markers of the last document searched: typing in the find field reuses them.
const searchCache = new WeakMap<object, Hidden[]>();

/** The document's hidden markers for searching the visible text, or null outside the one-pane mode. */
export function hiddenRanges(state: EditorState): { from: number; to: number }[] | null {
  if (!isLive(state)) return null;
  let hidden = searchCache.get(state.doc);
  if (!hidden) {
    hidden = analyze(state, 0, state.doc.length, "search").hidden;
    searchCache.set(state.doc, hidden);
  }
  return hidden;
}

// ---------- Styles ----------

// Styles shared with the preview (src/styles.css, .markdown-body).
const quoteLine = (depth: number) => {
  const step = "(1em + 3px)";
  const lines = Array.from({ length: depth }, (_, i) => `linear-gradient(var(--input), var(--input)) no-repeat calc(var(--content-padding-x) + ${i} * ${step}) 0 / 3px 100%`);
  return {
    color: "var(--muted-foreground)",
    paddingLeft: `calc(var(--content-padding-x) + ${depth} * ${step})`,
    background: lines.join(", "),
    // A list item in the quote starts after the quote's own indent.
    "--quote-indent": `calc(${depth} * ${step})`,
  };
};

// The line of a list item: indented like a list in the preview, with a
// hanging indent so that wrapped text lines up with the item's text.
const listLine = (depth: number) => ({
  paddingLeft: `calc(var(--content-padding-x) + var(--quote-indent, 0px) + var(--list-indent) + ${depth} * var(--list-marker))`,
  textIndent: "calc(-1 * var(--list-marker))",
});

const headingRule = (size: string, spacing: string, border: string | null) => ({
  fontSize: size,
  fontWeight: "600",
  letterSpacing: spacing,
  color: "var(--content-strong)",
  lineHeight: "1.25",
  paddingTop: "0.35em",
  paddingBottom: border ? "0.3em" : "0.15em",
  ...(border
    ? {
        background:
          `linear-gradient(${border}, ${border}) no-repeat var(--content-padding-x) 100% / calc(100% - 2 * var(--content-padding-x) - var(--minimap-space, 0px)) 1px`,
      }
    : {}),
});

const icon = { width: "1em", height: "1em", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };

const liveTheme = EditorView.theme({
  ".cm-line.cm-live-h1": headingRule("1.875em", "-0.025em", "var(--h1-rule)"),
  ".cm-line.cm-live-h2": headingRule("1.5em", "-0.02em", "var(--h2-rule)"),
  ".cm-line.cm-live-h3": headingRule("1.25em", "-0.01em", null),
  ".cm-line.cm-live-h4": headingRule("1.1em", "normal", null),
  ".cm-line.cm-live-h5": headingRule("1em", "normal", null),
  ".cm-line.cm-live-h6": { ...headingRule("1em", "normal", null), color: "var(--muted-foreground)" },
  ".cm-line.cm-live-quote-1": quoteLine(1),
  ".cm-line.cm-live-quote-2": quoteLine(2),
  ".cm-line.cm-live-quote-3": quoteLine(3),
  ".cm-line.cm-live-li-1": listLine(1),
  ".cm-line.cm-live-li-2": listLine(2),
  ".cm-line.cm-live-li-3": listLine(3),
  ".cm-line.cm-live-li-4": listLine(4),
  ".cm-live-li *": { textIndent: "0" },
  ".cm-line.cm-live-source": { fontFamily: "var(--font-mono)", fontSize: "0.875em", backgroundColor: "var(--card)" },
  ".cm-live-strong": { fontWeight: "700", color: "var(--content-strong)" },
  ".cm-live-em": { fontStyle: "italic", color: "var(--content-strong)" },
  ".cm-live-strike": { textDecoration: "line-through" },
  ".cm-live-u": { textDecoration: "underline", textUnderlineOffset: "3px", color: "var(--content-strong)" },
  ".cm-live-code": {
    padding: "0.15em 0.2em",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--muted)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.875em",
  },
  ".cm-live-kbd": {
    padding: "0.1em 0.2em",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--card)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.875em",
  },
  ".cm-live-sub": { verticalAlign: "sub", fontSize: "0.75em" },
  ".cm-live-sup": { verticalAlign: "super", fontSize: "0.75em" },
  ".cm-live-link": {
    textDecoration: "underline",
    textDecorationColor: "var(--muted-foreground)",
    textUnderlineOffset: "3px",
    transition: "text-decoration-color 150ms",
  },
  ".cm-live-link:hover": { textDecorationColor: "var(--foreground)" },
  "&.cm-live-ctrl .cm-live-link": { cursor: "pointer" },
  // Bullets, numbers and task boxes start the marker column; a bullet sits
  // on the axis of a task box, 30% larger than the glyph.
  ".cm-live-bullet": { display: "inline-block", minWidth: "var(--list-marker)", color: "var(--warning)" },
  ".cm-live-dot": { display: "inline-block", width: "1em", textAlign: "center", transform: "scale(1.3)" },
  ".cm-live-number": { fontVariantNumeric: "tabular-nums" },
  ".cm-live-task": { cursor: "pointer" },
  // The box is a CSS border, so its lines stay on whole device pixels (same
  // as .task-check in src/styles.css); a done task has a large white dot.
  ".cm-live-check": {
    position: "relative",
    display: "inline-block",
    boxSizing: "border-box",
    width: "0.75em",
    height: "0.75em",
    margin: "0 0.125em",
    overflow: "hidden",
    border: "calc(1em / 12) solid var(--warning)",
    borderRadius: "calc(1em / 12)",
  },
  ".cm-live-check-dot": {
    position: "absolute",
    inset: "0",
    width: "0.367em",
    height: "0.367em",
    margin: "auto",
    borderRadius: "50%",
    background: "var(--content-strong)",
  },
  ".cm-live-image, .cm-live-block .image-placeholder": {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    maxWidth: "100%",
    padding: "2px 8px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    color: "var(--muted-foreground)",
    fontSize: "0.875em",
    verticalAlign: "middle",
  },
  ".cm-live-image svg, .cm-live-block .image-placeholder svg": icon,
  // Rendered blocks: the same look as in the preview.
  ".cm-live-block": {
    display: "flow-root",
    padding: "0.25em calc(var(--content-padding-x) + var(--minimap-space, 0px)) 0.25em var(--content-padding-x)",
    whiteSpace: "normal",
    cursor: "default",
  },
  ".cm-live-block > *": { margin: "0" },
  ".cm-live-block hr": { height: "1px", margin: "0.8em 0", border: "0", background: "var(--border)" },
  ".cm-live-block pre": {
    padding: "12px 16px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    background: "var(--card)",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  ".cm-live-block code": {
    padding: "0.15em 0.4em",
    borderRadius: "var(--radius-sm)",
    background: "var(--muted)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.875em",
  },
  ".cm-live-block pre code": { padding: "0", background: "transparent" },
  ".cm-live-block table": {
    display: "block",
    width: "fit-content",
    maxWidth: "100%",
    border: "1px solid var(--warning)",
    borderRadius: "var(--radius-lg)",
    borderCollapse: "separate",
    borderSpacing: "0",
    overflow: "hidden",
    overflowWrap: "anywhere",
  },
  ".cm-live-block th, .cm-live-block td": {
    padding: "6px 12px",
    borderRight: "1px solid var(--border)",
    borderBottom: "1px solid var(--border)",
  },
  ".cm-live-block tr > :last-child": { borderRight: "0" },
  ".cm-live-block :is(thead, tbody):last-child > tr:last-child > *": { borderBottom: "0" },
  ".cm-live-block th": { borderColor: "var(--background) var(--background) var(--warning)", background: "var(--table-header)", color: "var(--background)", fontWeight: "700" },
  ".cm-live-block th *": { color: "inherit" },
  ".cm-live-block tr:nth-child(2n) td": { background: "color-mix(in oklch, var(--card) 50%, transparent)" },
  ".cm-live-block a": { color: "var(--foreground)", textDecoration: "underline", textDecorationColor: "var(--muted-foreground)", textUnderlineOffset: "3px" },
  "&.cm-live-ctrl .cm-live-block a": { cursor: "pointer" },
  ".cm-live-block kbd": {
    padding: "0.1em 0.4em",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    background: "var(--card)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.875em",
  },
  ".cm-live-block summary": { listStyle: "none", fontWeight: "500" },
  ".cm-live-block summary::-webkit-details-marker": { display: "none" },
  ".cm-live-block summary::before": {
    content: '""',
    display: "inline-block",
    width: "0.4em",
    height: "0.4em",
    marginRight: "0.7em",
    borderRight: "1.5px solid var(--muted-foreground)",
    borderBottom: "1.5px solid var(--muted-foreground)",
    transform: "translateY(-0.1em) rotate(-45deg)",
  },
  ".cm-live-block details[open] > summary::before": { transform: "translateY(-0.2em) rotate(45deg)" },
  ".cm-live-block details[open] > summary": { marginBottom: "0.5em" },
  ".cm-live-block blockquote": { padding: "0 1em", borderLeft: "3px solid var(--input)", color: "var(--muted-foreground)" },
});

// ---------- The mode ----------

/** The one-pane mode for the editor; see the top of this file. */
export function liveMode(config: LiveConfig): Extension {
  return [
    liveConfig.of(config),
    liveFlag.of(true),
    blockField,
    inlinePlugin,
    cursorAfterPrefix,
    safeReplacement,
    autoformat,
    linkEvents,
    liveTheme,
    Prec.high(
      keymap.of([
        { key: "ArrowLeft", run: moveChar(false, false), shift: moveChar(false, true) },
        { key: "ArrowRight", run: moveChar(true, false), shift: moveChar(true, true) },
        { key: "Backspace", run: deleteBackward, shift: deleteBackward },
        { key: "Delete", run: deleteForward },
        { key: "Mod-Backspace", run: deleteGroup(false) },
        { key: "Mod-Delete", run: deleteGroup(true) },
        { key: "Enter", run: continueBlock },
        { key: "Mod-z", run: undoAutoformat },
      ]),
    ),
  ];
}
