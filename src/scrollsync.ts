// Synchronized scrolling of the editor and the preview (an MDE extension, see
// README.md). Positions are matched by source line: the preview's blocks know
// the lines they come from (see `Preview.sourceMap`), and lines in between are
// interpolated.
//
// The matched point moves down the panel as it scrolls: at the top it is the
// top edge, at the very end the bottom edge. So both panels reach their start
// and their end together, even when one is much longer than the other.

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

/** The matched point of a panel: as far down its viewport as the panel is scrolled down. */
function probe(element: HTMLElement): number {
  const max = element.scrollHeight - element.clientHeight;
  return max > 0 ? (element.scrollTop * element.scrollHeight) / max : 0;
}

/** The scroll position that puts the matched point at `height`; the inverse of `probe`. */
function place(element: HTMLElement, height: number): number {
  const max = element.scrollHeight - element.clientHeight;
  return max > 0 ? (height * max) / element.scrollHeight : 0;
}

export class ScrollSync {
  private on = true;
  private leader: HTMLElement | null = null;
  private leadUntil = 0;
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
    // Resizing the window rewraps both panels.
    new ResizeObserver(() => this.followEditorSoon()).observe(this.previewEl);
  }

  get enabled(): boolean {
    return this.on;
  }

  /** Turning it on brings the preview to the editor's place. */
  setEnabled(on: boolean): void {
    this.on = on;
    if (on) this.followEditor();
  }

  /** Scrolls the preview to match the editor. */
  followEditor(): void {
    if (!this.on) return;
    this.lead(this.editorEl);
    const map = this.preview.sourceMap();
    const line = this.editor.lineAtHeight(probe(this.editorEl));
    this.previewEl.scrollTop = place(this.previewEl, interpolate(map.lines, map.heights, line));
  }

  /** `followEditor` once the editor has applied a pending scroll (it does so in the next frame). */
  followEditorSoon(): void {
    if (this.on) requestAnimationFrame(() => this.followEditor());
  }

  private followPreview(): void {
    this.lead(this.previewEl);
    const map = this.preview.sourceMap();
    const line = interpolate(map.heights, map.lines, probe(this.previewEl));
    this.editorEl.scrollTop = place(this.editorEl, this.editor.heightAtLine(line));
  }

  private lead(element: HTMLElement): void {
    this.leader = element;
    this.leadUntil = performance.now() + LEAD_MS;
  }

  private scrolled(element: HTMLElement): void {
    if (!this.on) return;
    if (element !== this.leader && performance.now() < this.leadUntil) return;
    if (element === this.editorEl) this.followEditor();
    else this.followPreview();
  }
}
