// Synchronized scrolling of the editor and the preview (an MDE extension, see
// README.md). Positions are matched by source line: the preview's blocks know
// the lines they come from (see `Preview.sourceMap`), and lines in between are
// interpolated.
//
// The panels are matched at a reading line a third of the way down the
// preview (at the same height on the screen in the editor), where the eye
// rests while scrolling. Each panel has a place in the document, the source
// line it shows at the reading line, and scrolls as far as it can to show it
// there. The panels work like two gears: while their places are the same, the
// text at the reading line lines up side by side and both panels move. A panel
// that cannot show its place there waits at its start or end: an image at the
// top of the preview is much taller than its one line in the editor, so while
// the preview scrolls past it, the editor would have to scroll above its start
// and stands still until the text after the image reaches the reading line in
// both panels. An image further down needs no such wait: the editor moves only
// as far as one line while the image passes the reading line.
//
// The mouse wheel, over either panel, scrolls the preview evenly and the editor
// with it; where the preview waits (at its start or end), the editor moves
// alone. A wheel step glides like the panel's own wheel scrolling.
//
// The panels are linked where they are: turning syncing on (or switching tabs)
// moves nothing, even when their places differ. The wheel then moves only the
// panel that is behind, until it reaches the place of the other; other
// scrolling (the scroll bar, the keyboard, typing) moves both places by the
// same number of lines. Once both panels are at the start, or both at the end,
// their places are the same again.

import type { Editor } from "./editor";
import type { Preview } from "./preview";

// The editor leads for this long after `followEditorSoon`: scroll events of
// the preview meanwhile are not followed.
const LEAD_MS = 120;

/** How far down the preview the reading line is, as a share of its height. */
const READING_LINE = 1 / 3;

/** A wheel step glides with exponential slowing of this time constant (in ms). */
const GLIDE_MS = 50;

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

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const maxTop = (element: HTMLElement) => Math.max(0, element.scrollHeight - element.clientHeight);
const atStart = (element: HTMLElement) => element.scrollTop <= 1;
const atEnd = (element: HTMLElement) => element.scrollTop >= maxTop(element) - 1;

export class ScrollSync {
  private on = true;
  // With one pane there is no preview to follow; the setting stays as it is.
  private paused = false;
  private leader: HTMLElement | null = null;
  private leadUntil = 0;
  // Scroll events until then come from restoring both panels (switching tabs) and are not followed.
  private quietUntil = 0;
  /** Each panel's place in the document: the source line it shows at the reading line (see the top of this file). */
  private readonly places = new Map<HTMLElement, number>();
  /** Scroll positions as of the last scroll event of each panel, or as this class set them. */
  private readonly last = new Map<HTMLElement, number>();
  /** Wheel scrolling still to glide, in pixels. */
  private glide = 0;
  private glideFrame = 0;
  private glideTime = 0;
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
    // Not passive: while syncing, the wheel moves both panels its own way.
    this.editorEl.addEventListener("wheel", (event) => this.wheeled(event), { passive: false });
    this.previewEl.addEventListener("wheel", (event) => this.wheeled(event), { passive: false });
    // Resizing the window rewraps both panels.
    new ResizeObserver(() => this.followEditorSoon()).observe(this.previewEl);
  }

  get enabled(): boolean {
    return this.on;
  }

  /** Stops following while the preview is hidden; resuming brings the preview to the editor's place. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.stopGlide();
    else this.followEditorSoon(true);
  }

  /** Turning it on links the panels where they are; nothing moves. */
  setEnabled(on: boolean): void {
    this.on = on;
    if (on) this.link();
    else this.stopGlide();
  }

  /** Scrolls the preview to match the editor; `align` brings it to the editor's place. */
  followEditor(align = false): void {
    if (!this.on || this.paused) return;
    this.moved(this.editorEl, align);
  }

  /**
   * `followEditor` once the editor has applied a pending scroll (it does so in
   * the next frame). The editor leads from now on: scroll events of the
   * preview meanwhile must not move the editor.
   */
  followEditorSoon(align = false): void {
    if (!this.on || this.paused) return;
    this.lead(this.editorEl);
    requestAnimationFrame(() => this.followEditor(align));
  }

  /**
   * Links the panels where they will be once both have applied their restored
   * scroll positions (switching tabs, reloading a file): nothing moves.
   */
  linkSoon(): void {
    this.quietUntil = Number.POSITIVE_INFINITY;
    requestAnimationFrame(() => {
      this.quietUntil = performance.now() + LEAD_MS;
      if (this.on && !this.paused) this.link();
    });
  }

  /**
   * The preview's layout changed (an image has loaded): it keeps showing its
   * place at the reading line, so the text being read stays where it is.
   */
  relink(): void {
    if (!this.on || this.paused) return;
    this.show(this.previewEl);
    this.settle();
  }

  private other(panel: HTMLElement): HTMLElement {
    return panel === this.editorEl ? this.previewEl : this.editorEl;
  }

  private placeOf(panel: HTMLElement): number {
    return this.places.get(panel) ?? 0;
  }

  /** How far below the top of `panel` the reading line is: a third of the preview, at the same height on the screen in the editor. */
  private reading(panel: HTMLElement): number {
    const line = this.previewEl.getBoundingClientRect().top + this.previewEl.clientHeight * READING_LINE;
    return line - panel.getBoundingClientRect().top;
  }

  private lastLine(panel: HTMLElement): number {
    if (panel === this.editorEl) return this.editor.state.doc.lines;
    const { lines } = this.preview.sourceMap();
    return lines[lines.length - 1];
  }

  /** The height in `panel`'s scrolled content where source line `line` is. */
  private heightOf(panel: HTMLElement, line: number): number {
    if (panel === this.editorEl) return this.editor.heightAtLine(line);
    const map = this.preview.sourceMap();
    return interpolate(map.lines, map.heights, line);
  }

  /** The source line at height `y` in `panel`'s scrolled content. */
  private lineOf(panel: HTMLElement, y: number): number {
    if (panel === this.editorEl) return this.editor.lineAtHeight(y);
    const map = this.preview.sourceMap();
    return interpolate(map.heights, map.lines, y);
  }

  /**
   * The places `panel` can stand for where it is: the line at its reading
   * line, or, at its start or end, also every line it cannot scroll far
   * enough to show there.
   */
  private span(panel: HTMLElement): [number, number] {
    const top = panel.scrollTop;
    const max = maxTop(panel);
    const last = this.lastLine(panel);
    if (max <= 0) return [0, last];
    const reading = this.reading(panel);
    if (top <= 1) return [0, this.lineOf(panel, reading)];
    if (top >= max - 1) return [this.lineOf(panel, max + reading), last];
    const line = this.lineOf(panel, top + reading);
    return [line, line];
  }

  /** Scrolls each of `panels` as far as it can to show its place at the reading line. */
  private show(...panels: HTMLElement[]): void {
    for (const panel of panels) {
      panel.scrollTop = clamp(this.heightOf(panel, this.placeOf(panel)) - this.reading(panel), 0, maxTop(panel));
      this.last.set(panel, panel.scrollTop);
    }
  }

  /** Both panels at their start (or both at their end) show the same place: their places become one. */
  private settle(): void {
    const editor = this.placeOf(this.editorEl);
    const preview = this.placeOf(this.previewEl);
    let place: number;
    if (atStart(this.editorEl) && atStart(this.previewEl)) place = Math.min(editor, preview);
    else if (atEnd(this.editorEl) && atEnd(this.previewEl)) place = Math.max(editor, preview);
    else return;
    this.places.set(this.editorEl, place);
    this.places.set(this.previewEl, place);
  }

  /** Takes the panels' places from where they are, as close to each other as they can be. */
  private link(): void {
    this.stopGlide();
    const [editorLo, editorHi] = this.span(this.editorEl);
    const [previewLo, previewHi] = this.span(this.previewEl);
    const lo = Math.max(editorLo, previewLo);
    const hi = Math.min(editorHi, previewHi);
    if (lo <= hi) {
      // Both at the start: the latest place both show; both at the end: the earliest.
      const place = clamp(this.lastLine(this.editorEl) / 2, lo, hi);
      this.places.set(this.editorEl, place);
      this.places.set(this.previewEl, place);
    } else if (editorHi < previewLo) {
      this.places.set(this.editorEl, editorHi);
      this.places.set(this.previewEl, previewLo);
    } else {
      this.places.set(this.editorEl, editorLo);
      this.places.set(this.previewEl, previewHi);
    }
    this.remember();
  }

  /**
   * `panel` was scrolled by something else than the wheel while syncing: its
   * place follows it, and the other panel's place moves by as many lines (or,
   * with `align`, becomes the same).
   */
  private moved(panel: HTMLElement, align = false): void {
    const other = this.other(panel);
    const [lo, hi] = this.span(panel);
    const before = this.placeOf(panel);
    const place = clamp(before, lo, hi);
    this.places.set(panel, place);
    const follows = align ? place : this.placeOf(other) + place - before;
    this.places.set(other, clamp(follows, 0, this.lastLine(other)));
    this.show(other);
    this.settle();
  }

  /**
   * Moves `panel`'s place from `line` by `pixels` of its scrolling in
   * direction `dir`, but not past `limit`; returns the new place and the
   * pixels used, or null when the panel is at its end that way. A place the
   * panel cannot show at its reading line (above its start when going down,
   * below its end when going up) costs nothing: the place skips to where the
   * panel starts moving, or to `limit`.
   */
  private travel(panel: HTMLElement, line: number, dir: number, pixels: number, limit: number): { line: number; used: number } | null {
    const reading = this.reading(panel);
    const max = maxTop(panel);
    const top = this.heightOf(panel, line) - reading;
    const past = (place: number) => dir * (place - limit) > 0;
    if (dir > 0 ? top >= max - 0.5 : top <= 0.5) return null;
    if (dir > 0 ? top < -0.5 : top > max + 0.5) {
      const start = this.lineOf(panel, (dir > 0 ? 0 : max) + reading);
      return { line: past(start) ? limit : start, used: 0 };
    }
    const target = clamp(top + dir * pixels, 0, max);
    const place = this.lineOf(panel, target + reading);
    if (!past(place)) return { line: place, used: Math.abs(target - top) };
    return { line: limit, used: Math.min(pixels, Math.abs(this.heightOf(panel, limit) - reading - top)) };
  }

  /** Moves the places by a wheel step of `delta` pixels (see the top of this file); returns whether a panel moved. */
  private advance(delta: number): boolean {
    const dir = Math.sign(delta);
    const end = dir > 0 ? Math.max(this.lastLine(this.editorEl), this.lastLine(this.previewEl)) : 0;
    let rest = Math.abs(delta);
    let moved = false;
    for (let step = 0; step < 8 && rest > 0.01; step++) {
      const editor = this.placeOf(this.editorEl);
      const preview = this.placeOf(this.previewEl);
      if (Math.abs(preview - editor) > 1e-6) {
        // Out of line: the panel behind moves alone until it reaches the other's place.
        const behind = dir * (preview - editor) > 0 ? this.editorEl : this.previewEl;
        const goal = behind === this.editorEl ? preview : editor;
        const result = this.travel(behind, this.placeOf(behind), dir, rest, goal);
        // At its end it cannot get closer: it is as close as it can be.
        this.places.set(behind, result ? result.line : goal);
        if (result) {
          rest -= result.used;
          moved ||= result.used > 0;
        }
        continue;
      }
      // In line: the preview leads, and the editor goes with it.
      const lead = this.travel(this.previewEl, preview, dir, rest, end);
      let result = lead;
      if (!lead || lead.used === 0) {
        // The preview waits (at its end, or above its start / below its end):
        // the editor moves alone, up to where the preview moves again.
        result = this.travel(this.editorEl, editor, dir, rest, lead ? lead.line : end);
        if (!result) {
          if (!lead) break;
          result = lead;
        }
      }
      this.places.set(this.editorEl, result!.line);
      this.places.set(this.previewEl, result!.line);
      rest -= result!.used;
      moved ||= result!.used > 0;
    }
    return moved;
  }

  /** One frame of wheel scrolling: moves the places and both panels; returns whether a panel moved. */
  private step(delta: number): boolean {
    const moved = this.advance(delta);
    this.show(this.editorEl, this.previewEl);
    this.settle();
    return moved;
  }

  /**
   * While syncing, the wheel over either panel moves both (see the top of
   * this file). A mouse wheel step glides like the panel's own wheel
   * scrolling, and steps turned while it glides add up; a touchpad's many
   * small steps are applied at once.
   */
  private wheeled(event: WheelEvent): void {
    if (!this.on || this.paused || event.ctrlKey || event.deltaY === 0) return;
    event.preventDefault();
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 40 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? this.previewEl.clientHeight : 1;
    const delta = event.deltaY * unit;
    if (Math.abs(delta) < 50 && this.glide === 0) {
      this.step(delta);
      return;
    }
    // Turning the wheel back drops the rest of the glide.
    if (Math.sign(delta) !== Math.sign(this.glide)) this.glide = 0;
    this.glide += delta;
    if (!this.glideFrame) {
      this.glideTime = performance.now() - 16;
      this.glideFrame = requestAnimationFrame(this.glideStep);
    }
  }

  private readonly glideStep = (time: number): void => {
    const elapsed = clamp(time - this.glideTime, 1, 100);
    this.glideTime = time;
    let delta = this.glide * (1 - Math.exp(-elapsed / GLIDE_MS));
    if (Math.abs(this.glide - delta) < 0.5) delta = this.glide;
    this.glide -= delta;
    // Both panels at their end that way: the rest goes nowhere.
    if (!this.step(delta)) this.glide = 0;
    this.glideFrame = this.glide !== 0 ? requestAnimationFrame(this.glideStep) : 0;
  };

  private stopGlide(): void {
    cancelAnimationFrame(this.glideFrame);
    this.glideFrame = 0;
    this.glide = 0;
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
    // Scroll positions set by this class are not followed back.
    const ours = Math.abs(element.scrollTop - (this.last.get(element) ?? Number.NaN)) < 1;
    this.last.set(element, element.scrollTop);
    if (ours || !this.on || this.paused || performance.now() < this.quietUntil) return;
    if (element !== this.leader && performance.now() < this.leadUntil) return;
    this.moved(element);
  }
}
