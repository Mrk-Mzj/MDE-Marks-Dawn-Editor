// Minimap: a small picture of the whole document in the top right corner of
// a panel (docs/SPEC.md), growing with the document down to the bottom of the
// panel. It takes the place of the panel's scroll bar. Every word is drawn as
// a thin bar where the panel shows it: the width of the text is scaled to the
// width of the box, and every row of text is a few pixels high. The part of
// the text on screen is a lighter slider that can be dragged to scroll.
//
// In the one-pane mode the box pictures the editor (Minimap, below); with two
// panes it pictures the preview (PreviewMinimap, src/previewmap.ts).
// MinimapBox has what both share: the box, the slider, dragging and the wheel.
//
// The editor's minimap wraps every line itself, measuring the words in the
// editor's font at the editor's text width, so the picture is right also for
// the parts of the file the editor has never displayed (it only estimates
// their height). Scroll positions are matched by source line, like the two
// panels (see scrollsync.ts). Only the lines inside the box are drawn, and the
// row count of a line is remembered by its text, so long files stay fast. H1
// and H2 headings are drawn lighter (--minimap-h1, --minimap-h2), so the
// document's sections stand out.

import { syntaxTree } from "@codemirror/language";
import type { Text } from "@codemirror/state";
import type { Editor } from "./editor";

// The least height of the box (when the panel has room); docs/DESIGN.md.
const MIN_HEIGHT = 100;
// Empty space around the picture, inside the box.
export const PADDING_X = 5;
export const PADDING_Y = 3;
// Height of one row of text in the picture, and of the bars in it.
export const ROW_HEIGHT = 2;
export const BAR_HEIGHT = 1;
// Measured word widths and row counts of lines are forgotten beyond this many.
const CACHE_LIMIT = 20000;

/** Where the slider is in the box, and how far the picture is scrolled. */
export interface SliderGeometry {
  top: number;
  height: number;
  offset: number;
}

/** The bars of a picture: plain text, and the lines of H1 and H2 headings. */
export interface MinimapPaths {
  text: Path2D;
  h1: Path2D;
  h2: Path2D;
}

/** The box, its slider, dragging and the wheel; subclasses draw the picture. */
export abstract class MinimapBox {
  protected on = false;
  protected readonly box: HTMLElement;
  protected readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly slider: HTMLElement;
  private frame = 0;
  private readonly listeners: (() => void)[] = [];

  // Geometry of the last drawing: the height of the picture and of the box,
  // and the slider in the box.
  protected total = 0;
  protected height = 0;
  private sliderTop = 0;
  private sliderHeight = 0;
  /**
   * Dragging: where the pointer holds the slider (from its top), where the
   * slider should be, and how often it was put back there after the panel
   * corrected its line heights.
   */
  private grab: { pointer: number; offset: number; target: number; corrections: number } | null = null;

  /**
   * The box goes in the top right corner of `area`; `scroller` is the panel
   * it scrolls. `rootClass` is on <html> while the box is shown (the panel's
   * text keeps a margin for it); `lineHeight` is one wheel line in pixels.
   */
  constructor(
    protected readonly area: HTMLElement,
    protected readonly scroller: HTMLElement,
    private readonly rootClass: string,
    lineHeight: () => number,
  ) {
    this.box = document.createElement("div");
    this.box.className = "minimap";
    this.box.dataset.slot = "minimap";
    this.box.hidden = true;
    this.box.setAttribute("aria-hidden", "true");
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
    this.slider = document.createElement("div");
    this.slider.className = "minimap-slider";
    this.box.append(this.canvas, this.slider);
    area.append(this.box);

    scroller.addEventListener("scroll", () => this.schedule(), { passive: true });
    new ResizeObserver(() => this.schedule()).observe(area);

    // Pressing keeps the focus (and the selection) where it is.
    this.box.addEventListener("mousedown", (event) => event.preventDefault());
    this.box.addEventListener("pointerdown", (event) => this.pointerDown(event));
    this.box.addEventListener("pointermove", (event) => this.pointerMove(event));
    this.box.addEventListener("pointerup", (event) => this.pointerUp(event));
    this.box.addEventListener("pointercancel", (event) => this.pointerUp(event));
    // The wheel over the box scrolls the panel, as anywhere else in it.
    // Ctrl + wheel zooms (handled for the whole window).
    this.box.addEventListener(
      "wheel",
      (event) => {
        if (event.ctrlKey) return;
        event.preventDefault();
        const unit = event.deltaMode === 1 ? lineHeight() : event.deltaMode === 2 ? scroller.clientHeight : 1;
        scroller.scrollBy({ top: event.deltaY * unit });
      },
      { passive: false },
    );
  }

  get enabled(): boolean {
    return this.on;
  }

  /**
   * Shows or hides the minimap. The panel's text gets (or loses) the fixed
   * right margin the box needs, so the text rewraps: listeners keep the
   * panels looking at the same place.
   */
  setEnabled(on: boolean): void {
    if (on === this.on) return;
    this.on = on;
    this.box.hidden = !on;
    document.documentElement.classList.toggle(this.rootClass, on);
    for (const listener of this.listeners) listener();
    this.schedule();
  }

  /** Calls `listener` after the text width changed because the minimap appeared or disappeared. */
  onReflow(listener: () => void): void {
    this.listeners.push(listener);
  }

  /** Redraws the box on the next frame (also after the colour scheme changed). */
  schedule(): void {
    if (!this.on || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.on) this.draw();
    });
  }

  protected abstract draw(): void;

  /** The slider, and how far the picture is scrolled, when the panel is scrolled to `scrollTop`. */
  protected abstract geometry(scrollTop: number): SliderGeometry;

  /**
   * The slider from the top and bottom of the panel's view in the picture.
   * When the picture is taller than the box it scrolls along with the
   * slider, so both reach their ends together.
   */
  protected slide(top: number, bottom: number): SliderGeometry {
    // How far the slider is along the picture, from 0 to 1.
    const room = this.total - (bottom - top);
    const along = room > 0 ? Math.min(1, Math.max(0, top / room)) : 0;
    const ratio = window.devicePixelRatio || 1;
    const scrolled = along * Math.max(0, this.total - this.height);
    // Whole device pixels, so the bars do not shimmer while scrolling.
    const offset = Math.round(scrolled * ratio) / ratio;
    return { top: top - offset, height: bottom - top, offset };
  }

  /**
   * Sizes the box for a picture `total` high, places the slider, and clears
   * the canvas (with `font` set). Returns how far the picture is scrolled,
   * the inner width of the box and the device pixel ratio.
   */
  protected prepare(total: number, font: string): { offset: number; inner: number; ratio: number } {
    this.total = total;
    // The box grows with the picture. Reaching the bottom of the panel, it
    // loses its bottom border, which would double the status bar's.
    const available = this.area.clientHeight;
    const full = Math.max(MIN_HEIGHT, Math.ceil(total) + 1) >= available;
    this.box.classList.toggle("minimap-full", full);
    const border = this.box.offsetHeight - this.box.clientHeight;
    const height = Math.max(0, full ? available - border : Math.max(MIN_HEIGHT - border, Math.ceil(total)));
    this.height = height;
    this.box.style.height = `${height + border}px`;

    const { top, height: sliderHeight, offset } = this.geometry(this.scroller.scrollTop);
    this.sliderTop = top;
    this.sliderHeight = sliderHeight;
    this.slider.style.transform = `translateY(${top}px)`;
    this.slider.style.height = `${sliderHeight}px`;
    // Scrolling to a part the panel had not laid out yet can make it measure
    // those lines, which moves them: put the slider back under the pointer
    // (scrolling again draws again).
    const grab = this.grab;
    if (grab && Math.abs(top - grab.target) > 1 && grab.corrections < 3) {
      grab.corrections++;
      this.scrollSliderTo(grab.target);
    }

    // Canvas in device pixels, so the bars stay sharp at any display scaling.
    const inner = this.box.clientWidth;
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(inner * ratio);
    const pixels = Math.round(height * ratio);
    if (this.canvas.width !== width || this.canvas.height !== pixels) {
      this.canvas.width = width;
      this.canvas.height = pixels;
    }
    // Set every time: resizing the canvas resets the context.
    this.ctx.font = font;
    this.canvas.style.width = `${inner}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.clearRect(0, 0, width, pixels);
    return { offset, inner, ratio };
  }

  /** Fills the bars of text and of H1 and H2 headings, each in its colour. */
  protected fill(paths: MinimapPaths): void {
    const ctx = this.ctx;
    const boxStyle = getComputedStyle(this.box);
    ctx.fillStyle = boxStyle.color;
    ctx.fill(paths.text);
    ctx.fillStyle = boxStyle.getPropertyValue("--minimap-h1");
    ctx.fill(paths.h1);
    ctx.fillStyle = boxStyle.getPropertyValue("--minimap-h2");
    ctx.fill(paths.h2);
  }

  /** The pointer's distance from the top of the inside of the box. */
  private pointerY(event: PointerEvent): number {
    return event.clientY - this.box.getBoundingClientRect().top - this.box.clientTop;
  }

  /** Scrolls the panel so the slider's top is `top` pixels from the top of the box. */
  private scrollSliderTo(top: number): void {
    const scroller = this.scroller;
    // The slider moves down as the panel scrolls down; find the place by halving.
    let lo = 0;
    let hi = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    for (let i = 0; i < 40 && hi - lo > 0.5; i++) {
      const mid = (lo + hi) / 2;
      if (this.geometry(mid).top < top) lo = mid;
      else hi = mid;
    }
    scroller.scrollTop = Math.round(hi);
  }

  private pointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const y = this.pointerY(event);
    // Outside the slider: jump so the slider is centred on the pointer, then drag from there.
    let offset = y - this.sliderTop;
    const outside = offset < 0 || offset > this.sliderHeight;
    if (outside) offset = this.sliderHeight / 2;
    this.grab = { pointer: event.pointerId, offset, target: y - offset, corrections: 0 };
    if (outside) this.scrollSliderTo(y - offset);
    this.box.setPointerCapture(event.pointerId);
    this.box.classList.add("minimap-dragging");
  }

  private pointerMove(event: PointerEvent): void {
    const grab = this.grab;
    if (!grab || event.pointerId !== grab.pointer) return;
    grab.target = this.pointerY(event) - grab.offset;
    grab.corrections = 0;
    this.scrollSliderTo(grab.target);
  }

  private pointerUp(event: PointerEvent): void {
    if (!this.grab || event.pointerId !== this.grab.pointer) return;
    this.grab = null;
    this.box.classList.remove("minimap-dragging");
  }
}

/** A word in a row, in pixels of the editor's text. */
interface Bar {
  x: number;
  width: number;
}

/** The minimap of the editor (the one-pane mode). */
export class Minimap extends MinimapBox {
  // Wrapping: word widths in the editor's font, and the rows of every line.
  private font = "";
  private spaceWidth = 0;
  private readonly widths = new Map<string, number>();
  private readonly rowCounts = new Map<string, number>();
  private layoutKey = "";
  private layoutDoc: Text | null = null;
  /** The first row of each line (by index), and the total number of rows at the end. */
  private rowStart = new Float64Array(2);

  constructor(
    area: HTMLElement,
    private readonly editor: Editor,
  ) {
    super(area, editor.view.scrollDOM, "has-minimap", () => editor.view.defaultLineHeight);
    editor.onLayout(() => this.schedule());
    editor.subscribe(() => this.schedule());
  }

  private wordWidth(word: string): number {
    let width = this.widths.get(word);
    if (width === undefined) {
      if (this.widths.size >= CACHE_LIMIT) this.widths.clear();
      width = this.ctx.measureText(word).width;
      this.widths.set(word, width);
    }
    return width;
  }

  /** Splits a line into rows of words, wrapping like the editor (pre-wrap: spaces stay, long words break). */
  private wrap(text: string, width: number, tabSize: number): Bar[][] {
    const rows: Bar[][] = [[]];
    const tab = this.spaceWidth * tabSize;
    let x = 0;
    for (const token of text.match(/\t| +|[^\t ]+/g) ?? []) {
      if (token === "\t") {
        x = (Math.floor(x / tab) + 1) * tab;
        continue;
      }
      if (token[0] === " ") {
        x += token.length * this.spaceWidth;
        continue;
      }
      let word = this.wordWidth(token);
      if (x > 0 && x + word > width) {
        rows.push([]);
        x = 0;
      }
      while (x + word > width && width > 0) {
        const part = width - x;
        rows[rows.length - 1].push({ x, width: part });
        rows.push([]);
        word -= part;
        x = 0;
      }
      rows[rows.length - 1].push({ x, width: word });
      x += word;
    }
    return rows;
  }

  private rowsOf(text: string, width: number, tabSize: number): number {
    if (text.length === 0) return 1;
    let rows = this.rowCounts.get(text);
    if (rows === undefined) {
      if (this.rowCounts.size >= CACHE_LIMIT) this.rowCounts.clear();
      rows = this.wrap(text, width, tabSize).length;
      this.rowCounts.set(text, rows);
    }
    return rows;
  }

  /** Counts the rows of every line of `doc` (again when the text, its width or the font changed). */
  private layout(doc: Text, width: number, tabSize: number): void {
    const key = `${this.font}|${width}|${tabSize}`;
    if (key !== this.layoutKey) {
      this.layoutKey = key;
      this.rowCounts.clear();
      this.layoutDoc = null;
    }
    if (doc === this.layoutDoc) return;
    this.layoutDoc = doc;
    const starts = new Float64Array(doc.lines + 1);
    let rows = 0;
    let index = 0;
    for (const lines = doc.iterLines(); !lines.next().done; ) {
      starts[index++] = rows;
      rows += this.rowsOf(lines.value, width, tabSize);
    }
    starts[index] = rows;
    this.rowStart = starts;
  }

  /** Where line `line` (from 0, with the part of the line above as a fraction) is in the picture. */
  private yOfLine(line: number): number {
    const starts = this.rowStart;
    const last = starts.length - 1;
    if (line >= last) return PADDING_Y + starts[last] * ROW_HEIGHT;
    const index = Math.max(0, Math.floor(line));
    const row = starts[index] + (line - index) * (starts[index + 1] - starts[index]);
    return PADDING_Y + row * ROW_HEIGHT;
  }

  /**
   * Everything follows from the lines at the top and bottom of the editor,
   * which stay put when the editor corrects its estimated line heights.
   */
  protected geometry(scrollTop: number): SliderGeometry {
    const scroller = this.scroller;
    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
    const top = scrollTop <= 0 ? 0 : this.yOfLine(this.editor.lineAtHeight(scrollTop));
    const bottom = scrollTop >= maxScroll ? this.total : this.yOfLine(this.editor.lineAtHeight(scrollTop + scroller.clientHeight));
    return this.slide(top, bottom);
  }

  protected draw(): void {
    const { view } = this.editor;
    const { doc, tabSize } = view.state;
    const content = view.contentDOM;
    const line = content.querySelector<HTMLElement>(".cm-line");
    if (!line) return;

    // The editor's text width and font: the picture wraps the same way.
    const lineStyle = getComputedStyle(line);
    const textWidth = content.clientWidth - parseFloat(lineStyle.paddingLeft) - parseFloat(lineStyle.paddingRight);
    const contentStyle = getComputedStyle(content);
    const font = `${contentStyle.fontSize} ${contentStyle.fontFamily}`;
    this.ctx.font = font;
    if (font !== this.font) {
      this.font = font;
      this.widths.clear();
      this.spaceWidth = this.ctx.measureText(" ").width;
    }
    this.layout(doc, textWidth, tabSize);
    const starts = this.rowStart;
    const { offset, inner, ratio } = this.prepare(2 * PADDING_Y + starts[starts.length - 1] * ROW_HEIGHT, font);
    const height = this.height;

    const scaleX = (inner - 2 * PADDING_X) / Math.max(1, textWidth);
    const barHeight = Math.max(1, Math.round(BAR_HEIGHT * ratio));
    // The first line inside the box: the last one starting at or above its top.
    const firstRow = (offset - PADDING_Y) / ROW_HEIGHT;
    let lo = 0;
    let hi = starts.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= firstRow) lo = mid;
      else hi = mid - 1;
    }
    let last = lo;
    while (last < doc.lines && PADDING_Y + starts[last] * ROW_HEIGHT - offset <= height) last++;
    // Lines of H1 and H2 headings (as far as the editor has parsed the file).
    const paths: MinimapPaths = { text: new Path2D(), h1: new Path2D(), h2: new Path2D() };
    const headings = new Map<number, Path2D>();
    syntaxTree(view.state).iterate({
      from: doc.line(lo + 1).from,
      to: doc.line(Math.max(lo + 1, last)).to,
      enter: (node) => {
        const level = /^(?:ATX|Setext)Heading([12])$/.exec(node.name)?.[1];
        if (!level) return;
        for (let n = doc.lineAt(node.from).number; n <= doc.lineAt(node.to).number; n++) headings.set(n - 1, level === "1" ? paths.h1 : paths.h2);
        return false;
      },
    });
    for (let index = lo; index < last; index++) {
      const rowTop = PADDING_Y + starts[index] * ROW_HEIGHT - offset;
      const path = headings.get(index) ?? paths.text;
      const rows = this.wrap(doc.line(index + 1).text, textWidth, tabSize);
      rows.forEach((row, n) => {
        const y = Math.round((rowTop + n * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2) * ratio);
        for (const bar of row) {
          const left = Math.round((PADDING_X + bar.x * scaleX) * ratio);
          const right = Math.round((PADDING_X + (bar.x + bar.width) * scaleX) * ratio);
          path.rect(left, y, Math.max(1, right - left), barHeight);
        }
      });
    }
    this.fill(paths);
  }
}
