// Minimap of the preview panel (two panes; see src/minimap.ts for the box).
// The picture is read from the rendered preview: every word is a bar where
// the preview shows it, with the width of the text scaled to the box and every
// line of body text two pixels high, as in the editor's minimap. Taller lines
// (headings) take proportionally more room. Words are measured block by
// block, only for the blocks inside the box, and remembered until the
// preview is rendered again or changes its width.

import { BAR_HEIGHT, MinimapBox, PADDING_X, PADDING_Y, ROW_HEIGHT } from "./minimap";
import type { MinimapPaths, SliderGeometry } from "./minimap";

/** A word (or the part of it on one line), in pixels of the preview: x from the left of the text, y its middle from the top of its block. */
interface WordBar {
  x: number;
  y: number;
  width: number;
  /** 1 or 2 inside an H1 or H2 heading, else 0. */
  level: number;
}

export class PreviewMinimap extends MinimapBox {
  private bars = new WeakMap<Element, WordBar[]>();
  /** The text width and font size the bars were measured at. */
  private key = "";
  // The preview's layout at the last drawing: its top padding, and how many
  // picture pixels one pixel of the preview is.
  private paddingTop = 0;
  private scaleY = 0;

  constructor(
    area: HTMLElement,
    private readonly preview: HTMLElement,
  ) {
    super(area, preview, "has-preview-minimap", () => parseFloat(getComputedStyle(preview).lineHeight) || 25.6);
    new MutationObserver(() => {
      this.bars = new WeakMap();
      this.schedule();
    }).observe(preview, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["open"] });
    new ResizeObserver(() => this.schedule()).observe(preview);
  }

  protected geometry(scrollTop: number): SliderGeometry {
    const scroller = this.scroller;
    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
    const toPicture = (y: number) => PADDING_Y + Math.max(0, y - this.paddingTop) * this.scaleY;
    const top = scrollTop <= 0 ? 0 : toPicture(scrollTop);
    const bottom = scrollTop >= maxScroll ? this.total : Math.min(this.total, toPicture(scrollTop + scroller.clientHeight));
    return this.slide(top, bottom);
  }

  /** The words of `block`, measured once. */
  private barsOf(block: Element, textLeft: number): WordBar[] {
    let bars = this.bars.get(block);
    if (bars) return bars;
    bars = [];
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
          bars.push({ x: rect.left - textLeft, y: rect.top + rect.height / 2 - blockTop, width: rect.width, level });
        }
      }
    }
    this.bars.set(block, bars);
    return bars;
  }

  protected draw(): void {
    const preview = this.preview;
    const style = getComputedStyle(preview);
    const paddingLeft = parseFloat(style.paddingLeft);
    const textWidth = preview.clientWidth - paddingLeft - parseFloat(style.paddingRight);
    const key = `${textWidth}|${style.fontSize}`;
    if (key !== this.key) {
      this.key = key;
      this.bars = new WeakMap();
    }
    this.paddingTop = parseFloat(style.paddingTop);
    this.scaleY = ROW_HEIGHT / (parseFloat(style.lineHeight) || 25.6);
    const contentHeight = preview.scrollHeight - this.paddingTop - parseFloat(style.paddingBottom);
    const { offset, inner, ratio } = this.prepare(2 * PADDING_Y + Math.max(0, contentHeight) * this.scaleY, style.font);
    const height = this.height;

    const box = preview.getBoundingClientRect();
    const textLeft = box.left + preview.clientLeft + paddingLeft;
    // The top of the text, as if the preview were not scrolled.
    const textTop = box.top + preview.clientTop + this.paddingTop - preview.scrollTop;
    const scaleX = (inner - 2 * PADDING_X) / Math.max(1, textWidth);
    const barHeight = Math.max(1, Math.round(BAR_HEIGHT * ratio));
    // The part of the preview inside the box.
    const from = (offset - PADDING_Y) / this.scaleY;
    const to = (offset + height - PADDING_Y) / this.scaleY;
    const paths: MinimapPaths = { text: new Path2D(), h1: new Path2D(), h2: new Path2D() };
    const byLevel = [paths.text, paths.h1, paths.h2];
    for (const block of preview.children) {
      const rect = block.getBoundingClientRect();
      const top = rect.top - textTop;
      if (top + rect.height < from) continue;
      if (top > to) break;
      for (const bar of this.barsOf(block, textLeft)) {
        const y = Math.round((PADDING_Y + (top + bar.y) * this.scaleY - offset - BAR_HEIGHT / 2) * ratio);
        const left = Math.round((PADDING_X + bar.x * scaleX) * ratio);
        const right = Math.round((PADDING_X + (bar.x + bar.width) * scaleX) * ratio);
        byLevel[bar.level].rect(left, y, Math.max(1, right - left), barHeight);
      }
    }
    this.fill(paths);
  }
}
