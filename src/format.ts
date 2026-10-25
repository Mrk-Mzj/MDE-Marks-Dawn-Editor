// Markdown formatting commands of the toolbar (left panel). Each command is a
// single transaction, so one Ctrl+Z undoes it.

import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import { EditorSelection } from "@codemirror/state";
import type { ChangeSpec, EditorState, Line } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { SyntaxNode, Tree } from "@lezer/common";

export type InlineStyle = "bold" | "italic" | "underline";
export type ListKind = "bullet" | "ordered" | "task";

/** Block markers at the start of a line: `> ` quotes, indentation, a list marker (with a task box) and `#` heading marker. */
interface Block {
  quote: string;
  indent: string;
  list: string;
  heading: string;
}

const blockPattern = /^((?:[ \t]*>[ \t]?)*)([ \t]*)((?:[-*+]|\d{1,9}[.)])(?:[ \t]+\[[ xX]\])?(?:[ \t]+|$))?(#{1,6}(?:[ \t]+|$))?/;

function parseBlock(text: string): Block {
  const match = blockPattern.exec(text)!;
  return { quote: match[1], indent: match[2], list: match[3] ?? "", heading: match[4] ?? "" };
}

const prefixLength = (b: Block) => b.quote.length + b.indent.length + b.list.length + b.heading.length;
const headingLevel = (b: Block) => b.heading.trimEnd().length;
const listKind = (b: Block): ListKind | null =>
  b.list ? (b.list.includes("[") ? "task" : /\d/.test(b.list) ? "ordered" : "bullet") : null;
const isBlank = (line: Line) => /^\s*$/.test(line.text);

/** What the line with the cursor is: shown as the pressed state of the toolbar buttons. */
export interface BlockState {
  heading: number;
  list: ListKind | null;
  quote: boolean;
}

export function blockState(state: EditorState): BlockState {
  const block = parseBlock(state.doc.lineAt(state.selection.main.head).text);
  return { heading: headingLevel(block), list: listKind(block), quote: block.quote !== "" };
}

function apply(view: EditorView, changes: ChangeSpec[], selection?: (map: (pos: number, assoc: -1 | 1) => number) => EditorSelection): void {
  const { state } = view;
  const changeSet = state.changes(changes);
  view.dispatch({
    changes: changeSet,
    selection: selection ? selection((pos, assoc) => changeSet.mapPos(pos, assoc)) : state.selection.map(changeSet, 1),
    scrollIntoView: true,
    userEvent: "input.format",
  });
}

// ---------- Bold, italic, underline ----------
//
// Formatted text is found in the GFM syntax tree (see editor.ts), so markers
// in inline code, an escaped `\*` or `snake_case` words never count. Like in
// Word, unformatting part of a bold stretch splits it, and formatting text that
// is partly bold merges it into one stretch.

const insertedMarkers: Record<InlineStyle, [string, string]> = {
  bold: ["**", "**"],
  italic: ["*", "*"],
  underline: ["<u>", "</u>"],
};

/** A stretch of formatted text: `from`–`openTo` is the opening marker, `closeFrom`–`to` the closing one. */
interface Span {
  from: number;
  openTo: number;
  closeFrom: number;
  to: number;
  open: string;
  close: string;
}

/** An inline marker (emphasis marker or HTML tag): not text when looking for where text starts and ends. */
interface Mark {
  from: number;
  to: number;
  closing: boolean;
}

/** Blocks whose content is inline text. */
const inlineBlock = /^(?:Paragraph|ATXHeading\d|SetextHeading\d|TableCell)$/;

function blockAt(tree: Tree, pos: number, side: -1 | 1): SyntaxNode | null {
  for (let node: SyntaxNode | null = tree.resolveInner(pos, side); node; node = node.parent) {
    if (inlineBlock.test(node.name)) return node;
  }
  return null;
}

const underlineTag = /^<(\/?)u\s*>$/i;
const spanNode: Record<InlineStyle, string> = { bold: "StrongEmphasis", italic: "Emphasis", underline: "" };

/** Spans of `style` and all inline markers in the blocks touched by `from`–`to`. */
function inlineMarkup(state: EditorState, from: number, to: number, style: InlineStyle): { spans: Span[]; marks: Mark[] } {
  const tree = ensureSyntaxTree(state, to, 200) ?? syntaxTree(state);
  // Whole blocks, so that spans starting before the selection are found too.
  const start = blockAt(tree, from, 1)?.from ?? state.doc.lineAt(from).from;
  const end = blockAt(tree, to, -1)?.to ?? state.doc.lineAt(to).to;
  const spans: Span[] = [];
  const marks: Mark[] = [];
  // Opening <u> tags still waiting for their </u>, per block.
  const openTags = new Map<number, { from: number; to: number; text: string }[]>();

  tree.iterate({
    from: start,
    to: end,
    enter: (ref) => {
      if (ref.name === "EmphasisMark") {
        marks.push({ from: ref.from, to: ref.to, closing: ref.from !== ref.node.parent!.from });
      } else if (ref.name === "HTMLTag") {
        const text = state.sliceDoc(ref.from, ref.to);
        marks.push({ from: ref.from, to: ref.to, closing: text.startsWith("</") });
        const tag = style === "underline" ? underlineTag.exec(text) : null;
        if (!tag) return;
        const block = blockAt(tree, ref.from, 1)?.from ?? -1;
        const waiting = openTags.get(block) ?? [];
        openTags.set(block, waiting);
        if (!tag[1]) {
          waiting.push({ from: ref.from, to: ref.to, text });
        } else {
          const open = waiting.pop();
          if (open) spans.push({ from: open.from, openTo: open.to, closeFrom: ref.from, to: ref.to, open: open.text, close: text });
        }
      } else if (ref.name === spanNode[style]) {
        const first = ref.node.firstChild;
        const last = ref.node.lastChild;
        if (first?.name !== "EmphasisMark" || last?.name !== "EmphasisMark" || first.from === last.from) return;
        spans.push({
          from: ref.from,
          openTo: first.to,
          closeFrom: last.from,
          to: ref.to,
          open: state.sliceDoc(first.from, first.to),
          close: state.sliceDoc(last.from, last.to),
        });
      }
    },
  });
  return { spans, marks };
}

/** Whether `from`–`to` lies entirely in spans (markers included). */
function covered(spans: Span[], from: number, to: number): boolean {
  for (let pos = from; pos < to; ) {
    const next = Math.max(-1, ...spans.filter((s) => s.from <= pos && s.to > pos).map((s) => s.to));
    if (next < 0) return false;
    pos = next;
  }
  return true;
}

/** The innermost span around the cursor (between its markers), if any. */
const spanAround = (spans: Span[], pos: number): Span | undefined =>
  spans.filter((s) => s.from < pos && pos < s.to).sort((a, b) => a.to - a.from - (b.to - b.from))[0];

const isSpace = (state: EditorState, pos: number) => /\s/.test(state.sliceDoc(pos, pos + 1));

/** End of the last text character in `from`–`to`, moved past closing markers right after it; null without text. */
function textEnd(state: EditorState, marks: Mark[], from: number, to: number): number | null {
  let pos = to;
  while (pos > from) {
    const mark = marks.find((m) => m.from < pos && m.to >= pos);
    if (mark) pos = mark.from;
    else if (isSpace(state, pos - 1)) pos--;
    else break;
  }
  if (pos <= from) return null;
  for (let m: Mark | undefined; (m = marks.find((x) => x.closing && x.from === pos && x.to <= to)); ) pos = m.to;
  return pos;
}

/** Start of the first text character in `from`–`to`, moved before opening markers right before it; null without text. */
function textStart(state: EditorState, marks: Mark[], from: number, to: number): number | null {
  let pos = from;
  while (pos < to) {
    const mark = marks.find((m) => m.from <= pos && m.to > pos);
    if (mark) pos = mark.to;
    else if (isSpace(state, pos)) pos++;
    else break;
  }
  if (pos >= to) return null;
  for (let m: Mark | undefined; (m = marks.find((x) => !x.closing && x.to === pos && x.from >= from)); ) pos = m.from;
  return pos;
}

/**
 * Removes the style from `from`–`to` inside `span`: the text before and after
 * it stays formatted (Word-like splitting); a side with no text left loses its marker.
 */
function unstyle(state: EditorState, marks: Mark[], span: Span, from: number, to: number): ChangeSpec[] {
  const start = Math.max(from, span.openTo);
  const end = Math.min(to, span.closeFrom);
  const leftEnd = textEnd(state, marks, span.openTo, start);
  const rightStart = textStart(state, marks, end, span.closeFrom);
  return [
    leftEnd === null ? { from: span.from, to: span.openTo } : { from: leftEnd, insert: span.close },
    rightStart === null ? { from: span.closeFrom, to: span.to } : { from: rightStart, insert: span.open },
  ];
}

interface Segment {
  from: number;
  to: number;
}

/**
 * Formats the segments; spans they overlap are merged with them, so
 * `**Ala** ma kota` becomes `**Ala ma kota**` rather than nested markers.
 */
function restyle(segments: Segment[], spans: Span[], open: string, close: string): ChangeSpec[] {
  const items = [
    ...segments.map((seg) => ({ from: seg.from, to: seg.to, span: null as Span | null })),
    ...spans
      .filter((sp) => segments.some((seg) => sp.from < seg.to && seg.from < sp.to))
      .map((sp) => ({ from: sp.from, to: sp.to, span: sp as Span | null })),
  ].sort((a, b) => a.from - b.from);

  const groups: { from: number; to: number; spans: Span[] }[] = [];
  for (const item of items) {
    const group = groups[groups.length - 1];
    if (group && item.from < group.to) {
      group.to = Math.max(group.to, item.to);
      if (item.span) group.spans.push(item.span);
    } else {
      groups.push({ from: item.from, to: item.to, spans: item.span ? [item.span] : [] });
    }
  }

  return groups.flatMap((group) => {
    const changes: ChangeSpec[] = [];
    // Markers already at the edges of the merged stretch stay.
    const keepOpen = group.spans.find((sp) => sp.from === group.from);
    const keepClose = group.spans.find((sp) => sp.to === group.to);
    if (!keepOpen) changes.push({ from: group.from, insert: open });
    for (const sp of group.spans) {
      if (sp !== keepOpen) changes.push({ from: sp.from, to: sp.openTo });
      if (sp !== keepClose) changes.push({ from: sp.closeFrom, to: sp.to });
    }
    if (!keepClose) changes.push({ from: group.to, insert: close });
    return changes;
  });
}

/**
 * The selected text of each line, without surrounding spaces and block markers
 * (`- `, `## `, `> `), which must stay outside the inline markers.
 */
function selectedSegments(state: EditorState): Segment[] {
  const { from, to } = state.selection.main;
  const segments: Segment[] = [];
  for (let pos = from; pos <= to; ) {
    const line = state.doc.lineAt(pos);
    let start = Math.max(from, line.from + prefixLength(parseBlock(line.text)));
    let end = Math.min(to, line.to);
    while (start < end && isSpace(state, start)) start++;
    while (end > start && isSpace(state, end - 1)) end--;
    if (start < end) segments.push({ from: start, to: end });
    pos = line.to + 1;
  }
  return segments;
}

/** Which styles the selected text (or the text around the cursor) has: the pressed state of B, I and U. */
export function inlineState(state: EditorState): Record<InlineStyle, boolean> {
  const range = state.selection.main;
  const segments = range.empty ? [] : selectedSegments(state);
  const has = (style: InlineStyle) => {
    const { spans } = inlineMarkup(state, range.from, range.to, style);
    if (segments.length === 0) return spanAround(spans, range.head) !== undefined;
    return segments.every((seg) => covered(spans, seg.from, seg.to));
  };
  return { bold: has("bold"), italic: has("italic"), underline: has("underline") };
}

/** An empty pair of markers around the cursor (`**|**`), which the syntax tree does not see as formatting. */
function emptyPairAround(state: EditorState, pos: number, style: InlineStyle): ChangeSpec[] | null {
  const pairs = { bold: ["**", "__"], italic: ["*", "_"], underline: [] }[style];
  if (style === "underline" && state.sliceDoc(pos - 3, pos + 4).toLowerCase() === "<u></u>") {
    return [{ from: pos - 3, to: pos + 4 }];
  }
  for (const marker of pairs) {
    const char = marker[0];
    let before = 0;
    let after = 0;
    while (state.sliceDoc(pos - before - 1, pos - before) === char) before++;
    while (state.sliceDoc(pos + after, pos + after + 1) === char) after++;
    // `***|***`: bold takes two markers, italic the odd one.
    const width = style === "bold" ? (Math.min(before, after) >= 2 ? 2 : 0) : Math.min(before, after) % 2;
    if (width) return [{ from: pos - width, to: pos + width }];
  }
  return null;
}

/** Nodes whose text must not get markers inserted into it. */
const literalNode = /^(?:InlineCode|FencedCode|CodeBlock|URL|Autolink|HTMLTag|HTMLBlock|Comment)$/;

function inLiteral(state: EditorState, pos: number): boolean {
  for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1); node; node = node.parent) {
    if (literalNode.test(node.name) && node.from < pos && pos < node.to) return true;
  }
  return false;
}

/** Whether the cursor has a space or the start or end of the line on at least one side. */
function besideSpace(state: EditorState, pos: number): boolean {
  const line = state.doc.lineAt(pos);
  return pos === line.from || pos === line.to || isSpace(state, pos - 1) || isSpace(state, pos);
}

/**
 * Whether an empty pair of markers may be inserted at the cursor: next to a
 * space or a line edge (inside a word the whole word is formatted instead),
 * and never into existing markers, code, addresses or HTML.
 */
function canInsertPair(state: EditorState, pos: number, marks: Mark[]): boolean {
  return besideSpace(state, pos) && !marks.some((m) => m.from <= pos && pos <= m.to) && !inLiteral(state, pos);
}

/** The word the cursor is in, formatted as if it were selected; null next to a space or in code. */
function wordAround(state: EditorState, pos: number): Segment | null {
  if (besideSpace(state, pos) || inLiteral(state, pos)) return null;
  const word = state.wordAt(pos);
  return word ? { from: word.from, to: word.to } : null;
}

/**
 * Formats the selection with `style`, or removes the style when all of the
 * selected text already has it. Without a selection: removes the formatting
 * around the cursor, formats the word the cursor is in, or inserts an empty
 * pair of markers with the cursor inside (only where `canInsertPair` allows it).
 */
export function toggleInline(view: EditorView, style: InlineStyle): void {
  const { state } = view;
  const range = state.selection.main;
  const [open, close] = insertedMarkers[style];
  const segments = range.empty ? [] : selectedSegments(state);
  const { spans, marks } = inlineMarkup(state, range.from, range.to, style);

  if (segments.length === 0) {
    const around = spanAround(spans, range.head);
    const pair = around ? null : emptyPairAround(state, range.head, style);
    if (around) {
      apply(view, [
        { from: around.from, to: around.openTo },
        { from: around.closeFrom, to: around.to },
      ]);
    } else if (pair) {
      apply(view, pair);
    } else if (canInsertPair(state, range.head, marks)) {
      apply(view, [{ from: range.head, insert: open + close }], () => EditorSelection.single(range.head + open.length));
    } else {
      const word = wordAround(state, range.head);
      if (word) apply(view, restyle([word], spans, open, close));
    }
    return;
  }

  let changes: ChangeSpec[];
  if (segments.every((seg) => covered(spans, seg.from, seg.to))) {
    // Each span loses the style on the part of the selection inside it. Of
    // nested spans of the same style (`**a **b** c**`) only the innermost is split.
    const from = segments[0].from;
    const to = segments[segments.length - 1].to;
    const touched = spans.filter((sp) => sp.openTo < to && from < sp.closeFrom);
    changes = touched
      .filter((sp) => !touched.some((o) => o !== sp && o.from >= sp.from && o.to <= sp.to))
      .flatMap((sp) => unstyle(state, marks, sp, from, to));
  } else {
    changes = restyle(segments, spans, open, close);
  }

  // The selection keeps covering the text, inside the markers.
  apply(view, changes, (map) => {
    const start = map(range.from, 1);
    const end = Math.max(start, map(range.to, -1));
    return EditorSelection.single(range.anchor <= range.head ? start : end, range.anchor <= range.head ? end : start);
  });
}

// ---------- Headings, lists, quotes ----------

/** Lines touched by the selection; a selection ending at the very start of a line leaves that line out. */
function selectedLines(state: EditorState): Line[] {
  const { from, to } = state.selection.main;
  const { doc } = state;
  const first = doc.lineAt(from).number;
  let last = doc.lineAt(to).number;
  if (last > first && doc.line(last).from === to) last--;
  const lines: Line[] = [];
  for (let n = first; n <= last; n++) lines.push(doc.line(n));
  return lines;
}

/** Non-empty selected lines, or the cursor's line when all of them are empty (so the marker can be typed after). */
function targetLines(state: EditorState): Line[] {
  const lines = selectedLines(state);
  const filled = lines.filter((line) => !isBlank(line));
  return filled.length > 0 ? filled : [state.doc.lineAt(state.selection.main.head)];
}

/**
 * Makes the selected lines headings of `level` (1–5), or paragraph text for 0
 * and when they already are such headings. List markers are removed either way.
 */
export function setHeading(view: EditorView, level: number): void {
  const lines = targetLines(view.state);
  const blocks = lines.map((line) => parseBlock(line.text));
  const target = level > 0 && blocks.every((b) => headingLevel(b) === level && !b.list) ? 0 : level;
  const insert = target > 0 ? `${"#".repeat(target)} ` : "";
  const changes = lines.flatMap((line, i) => {
    const b = blocks[i];
    if (b.heading === insert && !b.list) return [];
    const at = line.from + b.quote.length + b.indent.length;
    return [{ from: at, to: at + b.list.length + b.heading.length, insert }];
  });
  if (changes.length > 0) apply(view, changes);
}

/** Turns the selected lines into list items of `kind`, or back into paragraphs when all of them already are. */
export function toggleList(view: EditorView, kind: ListKind): void {
  const { doc } = view.state;
  const lines = targetLines(view.state);
  const blocks = lines.map((line) => parseBlock(line.text));
  const remove = blocks.every((b) => listKind(b) === kind);

  // Numbers continue an ordered list right above; nested levels count separately.
  const next = new Map<string, number>();
  if (lines[0].number > 1) {
    const above = parseBlock(doc.line(lines[0].number - 1).text);
    if (listKind(above) === "ordered") next.set(above.quote + above.indent, parseInt(above.list, 10) + 1);
  }

  const changes = lines.flatMap((line, i) => {
    const b = blocks[i];
    let insert = "";
    if (!remove) {
      const key = b.quote + b.indent;
      const n = next.get(key) ?? 1;
      next.set(key, n + 1);
      insert = kind === "bullet" ? "- " : kind === "task" ? "- [ ] " : `${n}. `;
    }
    if (b.list === insert) return [];
    const at = line.from + b.quote.length + b.indent.length;
    return [{ from: at, to: at + b.list.length, insert }];
  });
  if (changes.length > 0) apply(view, changes);
}

/** Puts the selected lines in a block quote, or takes one quote level away when all of them are quoted. */
export function toggleQuote(view: EditorView): void {
  let lines = selectedLines(view.state);
  // Empty lines inside the selection join the quote; at its edges they are left alone.
  while (lines.length > 1 && isBlank(lines[0])) lines = lines.slice(1);
  while (lines.length > 1 && isBlank(lines[lines.length - 1])) lines = lines.slice(0, -1);

  const quoted = /^[ \t]*>[ \t]?/;
  const remove = lines.filter((line) => !isBlank(line)).every((line) => quoted.test(line.text)) && lines.some((line) => quoted.test(line.text));
  const changes = lines.flatMap((line): ChangeSpec[] => {
    if (remove) {
      const match = quoted.exec(line.text);
      if (!match) return [];
      const at = line.from + match[0].indexOf(">");
      return [{ from: at, to: line.from + match[0].length }];
    }
    return [{ from: line.from, insert: isBlank(line) && lines.length > 1 ? ">" : "> " }];
  });
  if (changes.length > 0) apply(view, changes);
}

// ---------- Links and tables ----------

const urlLike = /^(?:https?:\/\/|mailto:|www\.)\S+$/i;

/**
 * Makes the selection a link `[text](url)` and selects the part still to be
 * typed: the address, or the text when the selection is an address.
 */
export function insertLink(view: EditorView, placeholder: string): void {
  const range = view.state.selection.main;
  const selected = view.state.sliceDoc(range.from, range.to);
  const trimmed = selected.trim();
  let insert: string;
  let select: [number, number];
  if (urlLike.test(trimmed)) {
    insert = `[${placeholder}](${trimmed})`;
    select = [1, 1 + placeholder.length];
  } else if (trimmed === "" || selected.includes("\n")) {
    const text = trimmed === "" ? placeholder : selected;
    insert = `[${text}](url)`;
    select = trimmed === "" ? [1, 1 + placeholder.length] : [text.length + 3, text.length + 6];
  } else {
    insert = `[${selected}](url)`;
    select = [selected.length + 3, selected.length + 6];
  }
  apply(view, [{ from: range.from, to: range.to, insert }], () =>
    EditorSelection.single(range.from + select[0], range.from + select[1]),
  );
}

/** A link `[text](url)`: the whole of it, its text and its address. */
export interface LinkInfo {
  from: number;
  to: number;
  textFrom: number;
  textTo: number;
  urlFrom: number;
  urlTo: number;
}

/** The link with an address (not a reference) that `from`–`to` lies in, if any. */
export function linkAt(state: EditorState, from: number, to = from): LinkInfo | null {
  for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(from, 1); node; node = node.parent) {
    if (node.name !== "Link") continue;
    const marks = node.getChildren("LinkMark");
    const url = node.getChild("URL");
    if (marks.length < 2 || !url || from < node.from || to > node.to) return null;
    return { from: node.from, to: node.to, textFrom: marks[0].to, textTo: marks[1].from, urlFrom: url.from, urlTo: url.to };
  }
  return null;
}

/** The address as written in a link: in angle brackets when it has spaces or brackets. */
const linkAddress = (url: string) => (/[\s()<>]/.test(url) ? `<${url.replace(/[<>]/g, encodeURIComponent)}>` : url);

/**
 * Sets the address of the link at the selection, or removes the link (keeping
 * its text) for an empty address. Without a link there, makes the selected
 * text a link, or inserts the address as a link at the cursor.
 */
export function applyLink(view: EditorView, url: string): void {
  const { state } = view;
  const range = state.selection.main;
  const link = linkAt(state, range.from, range.to);
  if (link) {
    if (url) {
      apply(view, [{ from: link.urlFrom, to: link.urlTo, insert: linkAddress(url) }]);
    } else {
      apply(view, [
        { from: link.from, to: link.textFrom },
        { from: link.textTo, to: link.to },
      ]);
    }
    return;
  }
  if (!url) return;
  const text = range.empty ? url.replace(/[[\]]/g, "\\$&") : state.sliceDoc(range.from, range.to);
  const insert = `[${text}](${linkAddress(url)})`;
  apply(view, [{ from: range.from, to: range.to, insert }], () => EditorSelection.single(range.from + insert.length));
}

/**
 * Inserts an empty table with `columns` columns and `rows` rows (the header row
 * included) below the line with the cursor, separated from other text by empty
 * lines. The first header cell is selected.
 */
export function insertTable(view: EditorView, columns: number, rows: number, header: (n: number) => string): void {
  const { doc } = view.state;
  const names = Array.from({ length: columns }, (_, i) => header(i + 1));
  const row = (cells: string[]) => `| ${cells.join(" | ")} |`;
  const table = [
    row(names),
    row(names.map((name) => "-".repeat(Math.max(3, name.length)))),
    ...Array.from({ length: rows - 1 }, () => row(names.map((name) => " ".repeat(name.length)))),
  ].join("\n");

  const line = doc.lineAt(view.state.selection.main.to);
  const below = line.number < doc.lines ? doc.line(line.number + 1) : null;
  let at: number;
  let before: string;
  let after: string;
  if (isBlank(line)) {
    at = line.from;
    before = line.number > 1 && !isBlank(doc.line(line.number - 1)) ? "\n" : "";
    after = below && !isBlank(below) ? "\n" : "";
  } else {
    at = line.to;
    before = "\n\n";
    after = below && !isBlank(below) ? "\n" : "";
  }
  const start = at + before.length + 2;
  apply(view, [{ from: at, to: isBlank(line) ? line.to : at, insert: before + table + after }], () =>
    EditorSelection.single(start, start + names[0].length),
  );
}
