// Moving lines and list items up and down (Alt+↑/↓). Works on plain text
// with `\n` line breaks, independent of the editor.

export interface BlockMove {
  /** Replaces `text[from, to)` with `insert`. */
  from: number;
  to: number;
  insert: string;
  /** The selection after the move. */
  anchor: number;
  head: number;
  /**
   * Where a line break (the offset of its newline character) ends up. Each
   * line keeps the break that ends it. Null for a break that disappears.
   */
  mapBreak: (pos: number) => number | null;
}

interface Line {
  from: number;
  to: number;
  text: string;
}

const LIST_ITEM = /^[ \t]*(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/;

function indentOf(line: Line): number {
  let width = 0;
  for (const ch of line.text) {
    if (ch === " ") width++;
    else if (ch === "\t") width += 4 - (width % 4);
    else break;
  }
  return width;
}

const isBlank = (line: Line) => line.text.trim() === "";
const isItem = (line: Line) => LIST_ITEM.test(line.text);

function splitLines(text: string): Line[] {
  const lines: Line[] = [];
  let from = 0;
  for (const part of text.split("\n")) {
    lines.push({ from, to: from + part.length, text: part });
    from += part.length + 1;
  }
  return lines;
}

/** Index of the line containing offset `pos`. */
function lineIndexAt(lines: Line[], pos: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid].from <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** First and last line of the run of non-blank lines around `i`. */
function blockAround(lines: Line[], i: number): [number, number] {
  let first = i;
  let last = i;
  while (first > 0 && !isBlank(lines[first - 1])) first--;
  while (last < lines.length - 1 && !isBlank(lines[last + 1])) last++;
  return [first, last];
}

/**
 * The list item that line `i` belongs to: the line itself when it starts an
 * item, else the closest item above it with less indent. With `level`, climbs
 * to the enclosing item that is indented no more than that. -1 outside a list.
 */
function itemStart(lines: Line[], i: number, level = Infinity): number {
  const parentOf = (index: number): number => {
    for (let j = index - 1; j >= 0 && !isBlank(lines[j]); j--) {
      if (isItem(lines[j]) && indentOf(lines[j]) < indentOf(lines[index])) return j;
    }
    return -1;
  };
  let start = isItem(lines[i]) ? i : parentOf(i);
  while (start >= 0 && indentOf(lines[start]) > level) {
    const parent = parentOf(start);
    if (parent < 0) break;
    start = parent;
  }
  return start;
}

/** Last line of the item starting at `start`: its sub-items and continuation lines. */
function itemEnd(lines: Line[], start: number): number {
  const level = indentOf(lines[start]);
  let end = start;
  for (let j = start + 1; j < lines.length; j++) {
    let k = j;
    while (k < lines.length && isBlank(lines[k])) k++;
    if (k === lines.length || indentOf(lines[k]) <= level) break;
    end = k;
    j = k;
  }
  return end;
}

/**
 * Moves the line with the cursor (or the selected lines) one line up (`dir` -1)
 * or down (1). It passes empty lines one at a time and swaps places with the
 * line it touches. A list item moves together with its sub-items and only
 * among the items of the same level. Returns null when there is nothing to
 * move or nowhere to move it.
 */
export function moveBlock(text: string, anchor: number, head: number, dir: -1 | 1): BlockMove | null {
  const lines = splitLines(text);
  const selFrom = Math.min(anchor, head);
  const selTo = Math.max(anchor, head);
  const first = lineIndexAt(lines, selFrom);
  let last = lineIndexAt(lines, selTo);
  // A selection that ends at the very start of a line does not include that line.
  if (selTo > selFrom && selTo === lines[last].from && last > first) last--;
  if (lines.slice(first, last + 1).every(isBlank)) return null;

  let a = first;
  let b = last;
  let level: number | null = null;
  const sameBlock = !isBlank(lines[first]) && blockAround(lines, first)[1] >= last;
  const s1 = sameBlock ? itemStart(lines, first) : -1;
  const s2 = sameBlock ? itemStart(lines, last) : -1;
  if (s1 >= 0 && s2 >= 0) {
    const shared = Math.min(indentOf(lines[s1]), indentOf(lines[s2]));
    a = itemStart(lines, first, shared);
    b = Math.max(itemEnd(lines, itemStart(lines, last, shared)), last);
    level = indentOf(lines[a]);
  }

  // The neighbour to swap with, as first and last line: an empty line, a
  // sibling list item, or the line (or list item) the selection touches.
  let other: [number, number];
  if (dir < 0) {
    const p = a - 1;
    if (p < 0) return null;
    if (isBlank(lines[p])) {
      other = [p, p];
    } else if (level !== null) {
      let j = p;
      while (j >= 0 && !isBlank(lines[j]) && indentOf(lines[j]) > level) j--;
      if (j < 0 || indentOf(lines[j]) !== level || !isItem(lines[j]) || itemEnd(lines, j) !== p) return null;
      other = [j, p];
    } else {
      const item = itemStart(lines, p, 0);
      other = item >= 0 && itemEnd(lines, item) === p ? [item, p] : [p, p];
    }
  } else {
    const n = b + 1;
    if (n >= lines.length) return null;
    if (isBlank(lines[n])) {
      other = [n, n];
    } else if (level !== null) {
      if (indentOf(lines[n]) !== level || !isItem(lines[n])) return null;
      other = [n, itemEnd(lines, n)];
    } else {
      other = [n, isItem(lines[n]) ? itemEnd(lines, n) : n];
    }
  }

  const [upper, lower] = dir < 0 ? [other, [a, b]] : [[a, b], other];
  const upperFrom = lines[upper[0]].from;
  const upperTo = lines[upper[1]].to;
  const lowerFrom = lines[lower[0]].from;
  const lowerTo = lines[lower[1]].to;
  const upperText = text.slice(upperFrom, upperTo);
  const gap = text.slice(upperTo, lowerFrom);
  const lowerText = text.slice(lowerFrom, lowerTo);

  const shift = dir < 0 ? upperFrom - lowerFrom : lowerText.length + gap.length;
  return {
    from: upperFrom,
    to: lowerTo,
    insert: lowerText + gap + upperText,
    anchor: anchor + shift,
    head: head + shift,
    mapBreak(pos) {
      if (pos >= lowerFrom && pos < lowerTo) return pos - lowerFrom + upperFrom;
      if (pos === lowerTo) return upperFrom + lowerText.length;
      if (pos === upperTo) return lowerTo < text.length ? lowerTo : null;
      if (pos > upperTo && pos < lowerFrom) return pos - upperTo + upperFrom + lowerText.length;
      if (pos >= upperFrom && pos < upperTo) return pos + lowerText.length + gap.length;
      return pos;
    },
  };
}
