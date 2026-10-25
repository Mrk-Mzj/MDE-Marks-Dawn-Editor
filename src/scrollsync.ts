// Synchronized scrolling of the editor and the preview (an MDE extension, see
// README.md). Positions are matched by source line: the preview's blocks know
// the lines they come from (see `Preview.sourceMap`), and lines in between are
// interpolated.
//
// The matched point moves down the panel as it scrolls: at the top it is the
// top edge, at the very end the bottom edge. So both panels reach their start
// and their end together, even when one is much longer than the other.
//
// The panels are linked where they are: turning syncing on (or switching
// tabs) remembers how many source lines the preview is ahead of the editor,
// and following keeps that difference instead of lining the panels up. A
// panel that reaches the start or end of the document stops while the other
// goes on, also when the mouse wheel is turned over the stopped panel; when
// the user then scrolls the stopped panel back, it takes over from where it is
// (the difference is taken anew) rather than making the other jump. Once both
// panels are at the start, or both at the end, the difference is gone.

import type { Editor } from "./editor";
import type { Preview } from "./preview";

// A panel that scrolled leads for this long; the other panel's scroll events
// meanwhile are the result of following it.
const LEAD_MS = 120;

/** Piecewise linear interpolation of `x` in ascending `xs` onto `ys`. */
function interpolate(xs: number[], ys: number[], x: number): number {
  const last = xs.length - 1;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[last]) return ys[last];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  return ys[lo] + ((ys[hi] - ys[lo]) * (x - xs[lo])) / (xs[hi] - xs[lo]);
}

/** The matched point of a panel scrolled to `top`: as far down its viewport as the panel is scrolled down. */
function probe(element: HTMLElement, top = element.scrollTop): number {
  const max = element.scrollHeight - element.clientHeight;
  return max > 0 ? (top * element.scrollHeight) / max : 0;
}

/** The scroll position that puts the matched point at `height`; the inverse of `probe`. */
function place(element: HTMLElement, height: number): number {
  const max = element.scrollHeight - element.clientHeight;
  return max > 0 ? (height * max) / element.scrollHeight : 0;
}

const atStart = (element: HTMLElement) => element.scrollTop <= 1;
const atEnd = (element: HTMLElement) => element.scrollTop >= element.scrollHeight - element.clientHeight - 1;

export class ScrollSync {
  private on = true;
  // With one pane there is no preview to follow; the setting stays as it is.
  private paused = false;
  private leader: HTMLElement | null = null;
  private leadUntil = 0;
  // Scroll events until then come from restoring both panels (switching tabs) and are not followed.
  private quietUntil = 0;
  /** How many source lines the preview's matched point is below the editor's. */
  private offset = 0;
  /** The follower that last could not go as far as the offset asked: it stopped at the start or end. */
  private stopped: HTMLElement | null = null;
  /** Scroll positions as of the last scroll event (or sync) of each panel. */
  private readonly last = new Map<HTMLElement, number>();
  private readonly editorEl: HTMLElement;
  private readonly previewEl: HTMLElement;

  constructor(
    private readonly editor: Editor,
    private readonly preview: Preview,
  ) {
    this.editorEl = editor.view.scrollDOM;
    this.previewEl = preview.root;
    this.editorEl.addEventListener("scroll", () => this.scrolled(this.editorEl), { passive: true });
    this.previewEl.addEventListener("scroll", () => this.scrolled(this.previewEl), { passive: true });
    this.editorEl.addEventListener("wheel", (event) => this.wheeled(this.editorEl, event), { passive: true });
    this.previewEl.addEventListener("wheel", (event) => this.wheeled(this.previewEl, event), { passive: true });
    // Resizing the window rewraps both panels.
    new ResizeObserver(() => this.followEditorSoon()).observe(this.previewEl);
  }

  get enabled(): boolean {
    return this.on;
  }

  /** Stops following while the preview is hidden; resuming brings it to the editor's place (plus the offset). */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) this.followEditorSoon();
  }

  /** Turning it on links the panels where they are; nothing moves. */
  setEnabled(on: boolean): void {
    this.on = on;
    if (on) this.link();
  }

  /** Scrolls the preview to match the editor. */
  followEditor(): void {
    if (!this.on || this.paused) return;
    this.follow(this.editorEl);
  }

  /**
   * `followEditor` once the editor has applied a pending scroll (it does so in
   * the next frame). The editor leads from now on: scroll events of the
   * preview meanwhile must not move the editor.
   */
  followEditorSoon(): void {
    if (!this.on || this.paused) return;
    this.lead(this.editorEl);
    requestAnimationFrame(() => this.followEditor());
  }

  /**
   * Links the panels where they will be once both have applied their restored
   * scroll positions (switching tabs, reloading a file): nothing moves, and
   * that tab's own difference between the panels is kept.
   */
  linkSoon(): void {
    this.quietUntil = Number.POSITIVE_INFINITY;
    requestAnimationFrame(() => {
      this.quietUntil = performance.now() + LEAD_MS;
      if (this.on && !this.paused) this.link();
    });
  }

  /** The source line at the matched point of `element` scrolled to `top`. */
  private lineOf(element: HTMLElement, top = element.scrollTop): number {
    if (element === this.editorEl) return this.editor.lineAtHeight(probe(element, top));
    const map = this.preview.sourceMap();
    return interpolate(map.heights, map.lines, probe(element, top));
  }

  /** Remembers the difference between the panels as they are now. */
  private link(editorTop = this.editorEl.scrollTop, previewTop = this.previewEl.scrollTop): void {
    this.offset = this.lineOf(this.previewEl, previewTop) - this.lineOf(this.editorEl, editorTop);
    this.stopped = null;
    this.remember();
  }

  /** Scrolls the other panel to `leader`'s line plus the offset, as far as it can go. */
  private follow(leader: HTMLElement): void {
    this.lead(leader);
    const fromEditor = leader === this.editorEl;
    const follower = fromEditor ? this.previewEl : this.editorEl;
    const line = this.lineOf(leader) + (fromEditor ? this.offset : -this.offset);
    let lastLine: number;
    let top: number;
    if (fromEditor) {
      const map = this.preview.sourceMap();
      lastLine = map.lines[map.lines.length - 1];
      top = place(follower, interpolate(map.lines, map.heights, line));
    } else {
      lastLine = this.editor.state.doc.lines;
      top = place(follower, this.editor.heightAtLine(line));
    }
    follower.scrollTop = top;
    this.stopped = line < 0 || line > lastLine ? follower : null;
    // Both at the start or both at the end: they are in line again.
    if ((atStart(leader) && atStart(follower)) || (atEnd(leader) && atEnd(follower))) {
      this.offset = 0;
      this.stopped = null;
    }
    this.remember();
  }

  /** The wheel over a panel that cannot go further that way scrolls the other panel. */
  private wheeled(element: HTMLElement, event: WheelEvent): void {
    if (!this.on || this.paused || event.ctrlKey || event.deltaY === 0) return;
    if (!(event.deltaY > 0 ? atEnd(element) : atStart(element))) return;
    const other = element === this.editorEl ? this.previewEl : this.editorEl;
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 40 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? other.clientHeight : 1;
    // The other panel leads now, so its scroll events are followed.
    this.lead(other);
    other.scrollTop += event.deltaY * unit;
  }

  private remember(): void {
    this.last.set(this.editorEl, this.editorEl.scrollTop);
    this.last.set(this.previewEl, this.previewEl.scrollTop);
  }

  private lead(element: HTMLElement): void {
    this.leader = element;
    this.leadUntil = performance.now() + LEAD_MS;
  }

  private scrolled(element: HTMLElement): void {
    const before = this.last.get(element) ?? element.scrollTop;
    this.last.set(element, element.scrollTop);
    if (!this.on || this.paused || performance.now() < this.quietUntil) return;
    if (element !== this.leader && performance.now() < this.leadUntil) return;
    // The stopped panel moves again: link from where both were before this scroll.
    if (element === this.stopped) {
      if (element === this.editorEl) this.link(before, this.previewEl.scrollTop);
      else this.link(this.editorEl.scrollTop, before);
    }
    this.follow(element);
  }
}
