// Minimaps of the rendered document (see src/minimap.ts for the box): of the
// preview panel with two panes (PreviewMinimap), and of the editor with one
// pane (LiveMinimap), which shows the document rendered too.
//
// The picture is read from the rendered blocks: every word is a bar where the
// blocks show it, with the width of the text scaled to the box and every line
// of body text two pixels high, as in the editor's minimap. Taller lines
// (headings) take proportionally more room. Tables, code blocks and the frames
// of images that do not load are outlined, and images are filled boxes of
// their size (--minimap-frame, --minimap-image), under the bars. Words and shapes are measured block by block, only for the
// blocks inside the box, and remembered until the blocks are rendered again
// or change their width.
//
// The one-pane editor shows only the part of the document near the screen,
// so its minimap renders the whole document like the preview, out of sight
// and with the editor's text width, without loading the images (their boxes
// come from the sizes in the image files). Scroll positions are matched by
// source line, as between the two panels (see scrollsync.ts).

import type { Text as Doc } from "@codemirror/state";
import type { Editor } from "./editor";
import { BAR_HEIGHT, MinimapBox, PADDING_X, PADDING_Y, ROW_HEIGHT } from "./minimap";
import type { MinimapPaths, SliderGeometry } from "./minimap";
import { Preview } from "./preview";
import { interpolate } from "./scrollsync";

/** Rendered parts drawn as shapes: outlined frames, and images as filled boxes. */
const FRAMES = "table, pre, .image-placeholder";
const IMAGES = "img.md-image, .image-box";
const SHAPES = `${FRAMES}, ${IMAGES}`;

/** A word (or the part of it on one line), in pixels of the rendered text: x from the left of the text, y its middle from the top of its block. */
interface WordBar {
  x: number;
  y: number;
  width: number;
  /** 1 or 2 inside an H1 or H2 heading, else 0. */
  level: number;
}

/** A frame or an image, in pixels of the rendered text: x from the left of the text, y from the top of its block. */
interface Shape {
  x: number;
  y: number;
  width: number;
  height: number;
  image: boolean;
}

/** What a block shows in the picture. */
interface BlockPicture {
  bars: WordBar[];
  shapes: Shape[];
}

export class PreviewMinimap extends MinimapBox {
  private pictures = new WeakMap<Element, BlockPicture>();
  /** The text width and font size the blocks were measured at. */
  private key = "";
  // The rendered blocks' layout at the last drawing: their top padding, and
  // how many picture pixels one pixel of them is.
  private paddingTop = 0;
  private scaleY = 0;

  /**
   * `blocks` holds the rendered blocks the box pictures; `scroller` is the
   * panel the box scrolls (the preview itself with two panes).
   */
  constructor(
    area: HTMLElement,
    protected readonly blocks: HTMLElement,
    scroller = blocks,
    rootClass = "has-preview-minimap",
    lineHeight = () => parseFloat(getComputedStyle(blocks).lineHeight) || 25.6,
  ) {
    super(area, scroller, rootClass, lineHeight);
    new MutationObserver(() => {
      this.pictures = new WeakMap();
      this.schedule();
    }).observe(blocks, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["open"] });
    new ResizeObserver(() => this.schedule()).observe(blocks);
  }

  /** Where height `y` of the panel's scrolled content is in the rendered blocks (from the top of their content). */
  protected contentAt(y: number): number {
    return y;
  }

  /**
   * The slider covers the panel's view at the picture's scale, also over the
   * padding above and below the text, so it keeps its height all the way
   * (it stops a pixel or two short of the box's edges); the picture scrolls
   * along with the panel.
   */
  protected geometry(scrollTop: number): SliderGeometry {
    const scroller = this.scroller;
    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
    const toPicture = (y: number) => Math.min(this.total, Math.max(0, PADDING_Y + (this.contentAt(y) - this.paddingTop) * this.scaleY));
    return this.slide(toPicture(scrollTop), toPicture(scrollTop + scroller.clientHeight), maxScroll > 0 ? scrollTop / maxScroll : 0);
  }

  /** The words and shapes of `block`, measured once. */
  private pictureOf(block: Element, textLeft: number): BlockPicture {
    let picture = this.pictures.get(block);
    if (picture) return picture;
    picture = { bars: [], shapes: [] };
    const blockTop = block.getBoundingClientRect().top;
    const range = document.createRange();
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const heading = node.parentElement?.closest("h1, h2");
      const level = heading ? (heading.tagName === "H1" ? 1 : 2) : 0;
      for (const match of node.data.matchAll(/\S+/g)) {
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        for (const rect of range.getClientRects()) {
          if (rect.width <= 0) continue;
          picture.bars.push({ x: rect.left - textLeft, y: rect.top + rect.height / 2 - blockTop, width: rect.width, level });
        }
      }
    }
    for (const el of [block, ...block.querySelectorAll(SHAPES)]) {
      if (!el.matches(SHAPES)) continue;
      const rect = el.getBoundingClientRect();
      // Not shown, e.g. inside a closed <details>.
      if (rect.width === 0 || rect.height === 0) continue;
      picture.shapes.push({ x: rect.left - textLeft, y: rect.top - blockTop, width: rect.width, height: rect.height, image: el.matches(IMAGES) });
    }
    this.pictures.set(block, picture);
    return picture;
  }

  protected draw(): void {
    const blocks = this.blocks;
    const style = getComputedStyle(blocks);
    const paddingLeft = parseFloat(style.paddingLeft);
    const textWidth = blocks.clientWidth - paddingLeft - parseFloat(style.paddingRight);
    const key = `${textWidth}|${style.fontSize}`;
    if (key !== this.key) {
      this.key = key;
      this.pictures = new WeakMap();
    }
    this.paddingTop = parseFloat(style.paddingTop);
    this.scaleY = ROW_HEIGHT / (parseFloat(style.lineHeight) || 25.6);
    const contentHeight = blocks.scrollHeight - this.paddingTop - parseFloat(style.paddingBottom);
    const { offset, inner, ratio } = this.prepare(2 * PADDING_Y + Math.max(0, contentHeight) * this.scaleY, style.font);
    const height = this.height;

    const box = blocks.getBoundingClientRect();
    const textLeft = box.left + blocks.clientLeft + paddingLeft;
    // The top of the text, as if the blocks were not scrolled.
    const textTop = box.top + blocks.clientTop + this.paddingTop - blocks.scrollTop;
    const scaleX = (inner - 2 * PADDING_X) / Math.max(1, textWidth);
    const line = Math.max(1, Math.round(BAR_HEIGHT * ratio));
    // Device pixels of the picture, from pixels of the rendered text.
    const px = (x: number) => Math.round((PADDING_X + x * scaleX) * ratio);
    const py = (y: number) => Math.round((PADDING_Y + y * this.scaleY - offset) * ratio);
    // The part of the rendered text inside the box.
    const from = (offset - PADDING_Y) / this.scaleY;
    const to = (offset + height - PADDING_Y) / this.scaleY;
    const images = new Path2D();
    const frames = new Path2D();
    const paths: MinimapPaths = { text: new Path2D(), h1: new Path2D(), h2: new Path2D(), images, frames };
    const byLevel = [paths.text, paths.h1, paths.h2];
    for (const block of blocks.children) {
      const rect = block.getBoundingClientRect();
      const top = rect.top - textTop;
      if (top + rect.height < from) continue;
      if (top > to) break;
      const picture = this.pictureOf(block, textLeft);
      for (const bar of picture.bars) {
        const y = Math.round((PADDING_Y + (top + bar.y) * this.scaleY - offset - BAR_HEIGHT / 2) * ratio);
        const left = px(bar.x);
        byLevel[bar.level].rect(left, y, Math.max(1, px(bar.x + bar.width) - left), line);
      }
      for (const shape of picture.shapes) {
        const left = px(shape.x);
        const right = Math.max(left + 1, px(shape.x + shape.width));
        const y = py(top + shape.y);
        const bottom = Math.max(y + 1, py(top + shape.y + shape.height));
        if (shape.image) {
          images.rect(left, y, right - left, bottom - y);
          continue;
        }
        frames.rect(left, y, right - left, line);
        frames.rect(left, bottom - line, right - left, line);
        frames.rect(left, y, line, bottom - y);
        frames.rect(right - line, y, line, bottom - y);
      }
    }
    this.fill(paths);
  }
}

// The hidden document is rendered again after a pause this long in typing (ms).
const RENDER_PAUSE = 150;

/** The minimap of the editor with one pane: a picture of the document rendered like the preview. */
export class LiveMinimap extends PreviewMinimap {
  private readonly source: Preview;
  /** The text the blocks were rendered from, and the newer text waiting for a pause in typing. */
  private rendered: Doc | null = null;
  private waiting: Doc | null = null;
  private timer = 0;

  constructor(
    area: HTMLElement,
    private readonly editor: Editor,
  ) {
    const blocks = document.createElement("div");
    blocks.className = "markdown-body minimap-source";
    blocks.setAttribute("aria-hidden", "true");
    // Out of every panel, so its height scrolls nothing.
    document.body.append(blocks);
    super(area, blocks, editor.view.scrollDOM, "has-minimap", () => editor.view.defaultLineHeight);
    // A size that arrives later changes the layout of the picture.
    this.source = new Preview(blocks, () => {}, () => {}, () => this.schedule(), false);
    editor.onLayout(() => this.schedule());
  }

  setEnabled(on: boolean): void {
    super.setEnabled(on);
    if (on) return;
    // Nothing is kept while the minimap is hidden.
    this.forget();
    this.source.render("");
  }

  /** Renders the document at the next drawing, without waiting (another tab is shown). */
  forget(): void {
    window.clearTimeout(this.timer);
    this.timer = 0;
    this.rendered = null;
    this.waiting = null;
    this.schedule();
  }

  /**
   * Through the source line at height `y` of the editor; the padding above
   * and below the text is the same in both (see .minimap-source).
   */
  protected contentAt(y: number): number {
    const { view } = this.editor;
    const top = view.documentPadding.top;
    if (y <= top) return y;
    const map = this.source.sourceMap(true);
    const textEnd = top + view.lineBlockAt(view.state.doc.length).bottom;
    if (y >= textEnd) return map.heights[map.heights.length - 1] + (y - textEnd);
    return interpolate(map.lines, map.heights, this.editor.lineAtHeight(y));
  }

  /**
   * Renders the editor's text: at once the first time, else after a pause
   * in typing, like the preview, so typing stays smooth in long documents.
   */
  private renderSource(doc: Doc): void {
    if (this.rendered !== null && this.waiting !== doc) {
      this.waiting = doc;
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => {
        this.timer = 0;
        this.waiting = null;
        this.rendered = null;
        this.schedule();
      }, RENDER_PAUSE);
      return;
    }
    if (this.rendered !== null) return;
    this.rendered = doc;
    this.source.render(doc.toString());
  }

  protected draw(): void {
    const { view } = this.editor;
    // The editor's text width: the blocks wrap the same way.
    const line = view.contentDOM.querySelector<HTMLElement>(".cm-line");
    if (!line) return;
    const padding = parseFloat(getComputedStyle(view.contentDOM).getPropertyValue("--content-padding-x")) || 0;
    const width = `${Math.max(1, view.contentDOM.clientWidth - padding - parseFloat(getComputedStyle(line).paddingRight))}px`;
    if (this.blocks.style.width !== width) this.blocks.style.width = width;
    if (view.state.doc !== this.rendered) this.renderSource(view.state.doc);
    super.draw();
  }
}
