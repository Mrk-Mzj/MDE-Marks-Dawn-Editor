// Rendered GFM preview (right panel).

import MarkdownIt from "markdown-it";
import { t } from "./i18n";
import { imageSize, imageUrl, isDrivePath, isImageFile, loadImages, placeholderIcon, sizeImages } from "./images";
import { classifyHref, classifyWikiTarget, WIKILINK, wikiHref, wikiLabel } from "./links";
import { markRawHtml, sanitize } from "./sanitize";
import { taskBoxHtml } from "./taskbox";

// Raw HTML is let through by markdown-it but tagged by `markRawHtml` and
// reduced to the whitelist by `sanitize` before it reaches the page.
// `breaks`: every Enter in the file is a line break in the preview (an MDE
// extension beyond GFM, see docs/SPEC.md).
const md = new MarkdownIt({ html: true, linkify: true, typographer: false, breaks: true });

// Setext headings are off (as in the editor, see editor.ts): headings are `#`
// only, and `---` under text is a horizontal rule.
md.disable("lheading");

md.renderer.rules.html_block = (tokens, idx) => markRawHtml(tokens[idx].content);
md.renderer.rules.html_inline = (tokens, idx) => markRawHtml(tokens[idx].content);

// Only http, https, mailto and relative paths become links; anything else
// (javascript:, data:, file:, unknown schemes) stays plain text. A full path to
// an image is let through for the images of a file not saved yet (images.ts
// decides what loads).
md.validateLink = (url) => classifyHref(url) !== null || (isDrivePath(url) && isImageFile(url));

// Plain text "www.example.com" becomes a link too. Other addresses without a
// scheme stay text: "README.md" would otherwise be a domain (.md is a TLD).
let wwwTail: RegExp | null = null;
md.linkify.add("www.", {
  validate: (text, pos, self) => {
    wwwTail ??= new RegExp(self.re.get_url_host_port().source + self.re.get_path().source, "iy");
    wwwTail.lastIndex = pos;
    const tail = wwwTail.exec(text)?.[0] ?? "";
    // The host after "www." needs a dot ("www.example.com", not "www.example").
    return /^[^/?#:]*\./.test(tail) ? tail.length : 0;
  },
  normalize: (match) => {
    match.url = `https://${match.url}`;
  },
});

// MDE extension beyond GFM (see docs/SPEC.md): the space between blocks comes
// only from the blank lines in the file, as in the editor. Each blank line is
// an empty line of text; blocks with no blank line between them touch (a
// heading right above a list). Blocks have no margins of their own (see
// styles.css), so the preview looks like the one-pane mode.
md.core.ruler.push("blank_lines", (state) => {
  const lines = state.src.split("\n");
  const tokens: typeof state.tokens = [];
  // Several tokens start on one line (a list, its first item, the item's
  // paragraph); the blank lines above it count once, for the outermost.
  const counted = new Set<number>();
  for (const token of state.tokens) {
    if (token.map && token.block && token.nesting !== -1 && token.type !== "inline" && !counted.has(token.map[0])) {
      counted.add(token.map[0]);
      // Inside a block quote, a line holding only `>` markers is blank too.
      const blank = token.level === 0 ? /^[ \t]*$/ : /^[ \t>]*$/;
      let count = 0;
      for (let line = token.map[0] - 1; line >= 0 && blank.test(lines[line]); line--) count++;
      if (count > 0) {
        const spacer = new state.Token("blank_lines", "", 0);
        spacer.block = true;
        spacer.level = token.level;
        spacer.meta = { count };
        tokens.push(spacer);
      }
    }
    tokens.push(token);
  }
  state.tokens = tokens;
});

// Block elements carry the source lines they come from (`data-line` is the
// first line, `data-line-end` the line after the last, both from 0), so
// synchronized scrolling can match the preview to the editor.
md.core.ruler.push("source_lines", (state) => {
  for (const token of state.tokens) {
    if (token.map && token.block && token.nesting !== -1 && token.type !== "inline" && token.type !== "html_block") {
      token.attrSet("data-line", String(token.map[0]));
      token.attrSet("data-line-end", String(token.map[1]));
    }
  }
});

// GFM task list items (`- [ ] `, `- [x] `): the box is drawn in place of the
// bullet, like in the one-pane mode, with a dot in it when the task is done.
const taskBox = /^\[([ xX])\](?:[ \t]+|$)/;
md.core.ruler.push("task_lists", (state) => {
  const { tokens } = state;
  for (let i = 2; i < tokens.length; i++) {
    const inline = tokens[i];
    if (inline.type !== "inline" || tokens[i - 1].type !== "paragraph_open" || tokens[i - 2].type !== "list_item_open") continue;
    const first = inline.children?.[0];
    const match = first?.type === "text" ? taskBox.exec(first.content) : null;
    if (!first || !match) continue;
    first.content = first.content.slice(match[0].length);
    inline.content = inline.content.slice(match[0].length);
    const box = new state.Token("task_box", "", 0);
    box.meta = { checked: match[1] !== " " };
    inline.children!.unshift(box);
    tokens[i - 2].attrJoin("class", "task-list-item");
  }
});

md.renderer.rules.task_box = (tokens, idx) =>
  `<span class="task-box" aria-hidden="true">${taskBoxHtml("task-check", (tokens[idx].meta as { checked: boolean }).checked)}</span>`;

md.renderer.rules.blank_lines = (tokens, idx) =>
  '<div class="blank-line" aria-hidden="true"></div>'.repeat((tokens[idx].meta as { count: number }).count);

const escape = md.utils.escapeHtml;

/** An image that `loadImages` loads (see images.ts): no `src` yet, so nothing loads while it is staged. */
function imageHtml(src: string, alt: string, wiki: boolean, title: string | null, width: string | null): string {
  const attributes = [`data-src="${escape(src)}"`, `alt="${escape(alt)}"`];
  if (wiki) attributes.push('data-wiki="1"');
  if (title) attributes.push(`title="${escape(title)}"`);
  if (width) attributes.push(`width="${width}"`);
  return `<img ${attributes.join(" ")}>`;
}

md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const alt = self.renderInlineAsText(token.children ?? [], options, env);
  const title = token.attrGet("title");
  return imageHtml(String(token.attrGet("src") ?? ""), alt, false, title === null ? null : String(title), null);
};

// Obsidian wikilinks (an MDE extension beyond GFM, see docs/SPEC.md):
// `[[Note]]`, `[[Note|text]]`, `[[Note#Heading]]`, `[[#Heading]]` become links
// whose address is `[[target]]`. Embeds `![[…]]` of images show the image
// (`![[a.png|300]]` 300 pixels wide), other embeds a frame with the name.
md.inline.ruler.before("link", "wikilink", (state, silent) => {
  const { src, pos } = state;
  const embed = src.charCodeAt(pos) === 0x21; /* ! */
  const start = embed ? pos + 1 : pos;
  if (src.charCodeAt(start) !== 0x5b /* [ */ || src.charCodeAt(start + 1) !== 0x5b || state.linkLevel > 0) return false;
  WIKILINK.lastIndex = start;
  const match = WIKILINK.exec(src);
  const target = match?.[1].trim() ?? "";
  if (!match || !classifyWikiTarget(target)) return false;
  if (!silent) {
    if (embed) {
      state.push("wiki_embed", "", 0).meta = { name: target, text: match[2]?.trim() ?? "" };
    } else {
      state.push("link_open", "a", 1).attrs = [["href", wikiHref(target)]];
      state.push("text", "", 0).content = match[2]?.trim() || wikiLabel(target);
      state.push("link_close", "a", -1);
    }
  }
  state.pos = start + match[0].length;
  return true;
});

md.renderer.rules.wiki_embed = (tokens, idx) => {
  const { name, text } = tokens[idx].meta as { name: string; text: string };
  if (isImageFile(name)) {
    // Obsidian's `|300` or `|300x200` is a width; other text is the alt text.
    const size = /^(\d+)(?:x\d+)?$/.exec(text);
    return imageHtml(name, size ? name : text || name, true, null, imageSize(size?.[1]));
  }
  return `<span class="image-placeholder" title="${escape(name)}">${placeholderIcon}<span>${escape(name)}</span></span>`;
};

// Hovering a link shows its real target, so the link text cannot hide it.
const defaultLinkOpen =
  md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = String(token.attrGet("href") ?? "");
  const target = classifyHref(href);
  // Web addresses written without a scheme show (and open) their full form.
  const shown = target?.kind === "external" ? target.url : href;
  token.attrSet("href", shown);
  // A wikilink shows its target without the brackets.
  token.attrSet("title", href.startsWith("[[") ? href.slice(2, -2) : shown);
  return defaultLinkOpen(tokens, idx, options, env, self);
};

/** The headings of a document, in order: their source line (from 0) and plain text. */
export function headingsOf(source: string): { line: number; text: string }[] {
  const tokens = md.parse(source, {});
  const headings: { line: number; text: string }[] = [];
  for (let i = 0; i + 1 < tokens.length; i++) {
    if (tokens[i].type !== "heading_open" || !tokens[i].map) continue;
    const text = (tokens[i + 1].children ?? [])
      .filter((child) => child.type === "text" || child.type === "code_inline")
      .map((child) => child.content)
      .join("");
    headings.push({ line: tokens[i].map![0], text });
  }
  return headings;
}

/** Renders a piece of Markdown as sanitized DOM, as the preview shows it; its images load once `loadImages` is called. */
export function renderFragment(source: string): DocumentFragment {
  const staging = document.createElement("template");
  staging.innerHTML = md.render(source);
  sanitize(staging.content);
  return staging.content;
}

/**
 * Where the source lines show in the preview: `heights[i]` (from the top of
 * the scrolled content) is where line `lines[i]` starts. Both ascend; lines
 * in between are interpolated.
 */
export interface SourceMap {
  lines: number[];
  heights: number[];
}

/** An image as written in Markdown: `![alt](path)`, `![alt][ref]`, `![[name]]` or `<img …>`. */
const IMAGE_SOURCE = /!\[[^\]\n]*\]\([^)\n]*\)|!\[[^\]\n]*\]\[[^\]\n]*\]|!\[\[[^\]\n]*\]\]|<img\b[^>\n]*>/gi;

export class Preview {
  private timer = 0;
  // Rendered HTML is parsed here, where nothing runs or loads, and sanitized before it is shown.
  private readonly staging = document.createElement("template");
  private renders = 0;
  private lines: string[] = [""];
  private map: { key: string; value: SourceMap } | null = null;

  /**
   * `onLink` gets the address of a clicked link; links never navigate the app
   * themselves. `onImage` gets the address of a clicked image (outside a link).
   * `onImageLoad` runs when an image has loaded and changed the layout.
   * Without `loadsImages` images are only boxes of their size (see
   * `sizeImages`), for a preview that is never shown.
   */
  constructor(
    readonly root: HTMLElement,
    onLink: (href: string) => void,
    onImage: (src: string, wiki: boolean) => void,
    private readonly onImageLoad: () => void,
    private readonly loadsImages = true,
  ) {
    root.addEventListener("click", (event) => {
      const target = event.target as Element;
      const link = target.closest("a");
      const image = link ? null : target.closest<HTMLImageElement>("img.md-image");
      if (!link && !image) return;
      event.preventDefault();
      // Dragging to select text that starts on a link is not a click on it.
      if (window.getSelection()?.isCollapsed === false) return;
      if (link) onLink(link.getAttribute("href") ?? "");
      else if (image) onImage(image.dataset.src ?? "", image.dataset.wiki === "1");
    });
    root.addEventListener("auxclick", (event) => event.preventDefault());
  }

  render(source: string): void {
    window.clearTimeout(this.timer);
    this.renders++;
    this.lines = source.split("\n");
    if (!source.trim()) {
      if (this.loadsImages) this.root.innerHTML = `<p class="preview-empty">${md.utils.escapeHtml(t.emptyPreview)}</p>`;
      else this.root.replaceChildren();
      return;
    }
    this.staging.innerHTML = md.render(source);
    sanitize(this.staging.content);
    if (this.loadsImages) {
      this.reuseImages(this.staging.content);
      loadImages(this.staging.content, this.onImageLoad);
    } else {
      sizeImages(this.staging.content, this.onImageLoad);
      // The editor shows the blank lines at the end of the file (and the
      // empty last line after a final Enter) as lines; so does this picture.
      const ends = [...this.staging.content.children].filter((el): el is HTMLElement => el instanceof HTMLElement && "lineEnd" in el.dataset);
      const trailing = this.lines.length - Math.max(0, ...ends.map((el) => Number(el.dataset.lineEnd)));
      for (let i = 0; i < trailing; i++) this.staging.content.append(Object.assign(document.createElement("div"), { className: "blank-line" }));
    }
    this.root.replaceChildren(this.staging.content);
  }

  /**
   * Keeps the images already shown: rendering again after every pause in
   * typing would otherwise load them anew, and the text around would jump.
   */
  private reuseImages(fresh: DocumentFragment): void {
    const shown = new Map<string, HTMLImageElement[]>();
    const key = (img: HTMLImageElement, url: string | null) => `${url}|${img.getAttribute("width") ?? ""}`;
    for (const img of this.root.querySelectorAll<HTMLImageElement>("img.md-image")) {
      const k = key(img, img.getAttribute("src"));
      shown.set(k, [...(shown.get(k) ?? []), img]);
    }
    if (shown.size === 0) return;
    for (const img of fresh.querySelectorAll<HTMLImageElement>("img[data-src]")) {
      const old = shown.get(key(img, imageUrl(img.dataset.src ?? "", img.dataset.wiki === "1")))?.shift();
      if (!old) continue;
      old.alt = img.alt;
      old.title = img.title || (img.dataset.src ?? "");
      img.replaceWith(old);
    }
  }

  /** Re-renders after a short pause in typing, keeping the editor responsive. */
  scheduleRender(getSource: () => string, then?: () => void): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.render(getSource());
      then?.();
    }, 60);
  }

  /**
   * The source map of the rendered blocks, measured again only after the
   * layout changed. Matched against the Markdown source (the editor with two
   * panes), an image is placed where it is written in its line. Matched
   * against the document rendered too (`rendered`: the one-pane editor,
   * whose lines hold their images), a line is matched by its height, images
   * and all, and every source line of a paragraph gets its own point.
   */
  sourceMap(rendered = false): SourceMap {
    const { root } = this;
    // Zoom, the panel width and opening <details> all change the content height or width.
    const key = `${this.renders}:${root.scrollHeight}:${root.clientWidth}:${rendered}`;
    if (this.map?.key === key) return this.map.value;
    const origin = root.getBoundingClientRect().top - root.scrollTop;
    const points: [number, number][] = [];
    for (const element of root.querySelectorAll<HTMLElement>("[data-line]")) {
      const rect = element.getBoundingClientRect();
      // Not shown, e.g. inside a closed <details>.
      if (rect.width === 0 && rect.height === 0) continue;
      // The one-pane editor's line holds the block's margins too (a rule's, a table's).
      let [above, below] = [0, 0];
      if (rendered) {
        const style = getComputedStyle(element);
        [above, below] = [parseFloat(style.marginTop) || 0, parseFloat(style.marginBottom) || 0];
      }
      points.push([Number(element.dataset.line), rect.top - above - origin], [Number(element.dataset.lineEnd), rect.bottom + below - origin]);
    }
    if (rendered) this.linePoints(origin, points);
    else this.imagePoints(origin, points);
    points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    // Matched against the rendered editor, the text runs from the top to the
    // bottom padding, as the editor's lines do.
    const style = getComputedStyle(root);
    const start = rendered ? parseFloat(style.paddingTop) || 0 : 0;
    const end = root.scrollHeight - (rendered ? parseFloat(style.paddingBottom) || 0 : 0);
    const value: SourceMap = { lines: [0], heights: [start] };
    for (const [line, height] of points) {
      // Margins can place a nested block above its parent's start; such points would break the order.
      if (height < value.heights[value.heights.length - 1]) continue;
      value.lines.push(line);
      value.heights.push(height);
    }
    value.lines.push(Math.max(this.lines.length, value.lines[value.lines.length - 1]));
    value.heights.push(Math.max(end, value.heights[value.heights.length - 1]));
    this.map = { key, value };
    return value;
  }

  /**
   * Points for the source lines inside a paragraph or heading: every Enter in
   * the file is a line break there (see `breaks`), and the next source line
   * starts below the line box that the break ends. A block with breaks that
   * are not the file's (a raw `<br>`) keeps its two points.
   */
  private linePoints(origin: number, points: [number, number][]): void {
    const lineHeight = parseFloat(getComputedStyle(this.root).lineHeight) || 0;
    for (const block of this.root.querySelectorAll<HTMLElement>(":is(p, h1, h2, h3, h4, h5, h6)[data-line]")) {
      const first = Number(block.dataset.line);
      const end = Number(block.dataset.lineEnd);
      if (end - first < 2) continue;
      const breaks = [...block.querySelectorAll("br")].filter((br) => br.parentElement?.closest("[data-line]") === block);
      if (breaks.length !== end - first - 1) continue;
      breaks.forEach((br, k) => {
        const rect = br.getBoundingClientRect();
        if (rect.height === 0) return;
        // The break's box is the font's height; the half-leading below it ends the line box.
        const leading = Math.max(0, (parseFloat(getComputedStyle(br.parentElement!).lineHeight) || lineHeight) - rect.height) / 2;
        points.push([first + k + 1, rect.bottom + leading - origin]);
      });
    }
  }

  /**
   * Points for the images inside a block of text: an image is a few characters
   * of a source line but takes much room in the preview, so without them the
   * text around it would be matched as if the image's height were spread over
   * the whole paragraph. The k-th image of a block is the k-th image written in
   * its source lines; its place in the line is the share of the line before it
   * (a long line wraps into rows of about the same length in the editor).
   */
  private imagePoints(origin: number, points: [number, number][]): void {
    const selector = "img.md-image, .image-box, .image-placeholder";
    const blocks = new Set<HTMLElement>();
    for (const image of this.root.querySelectorAll<HTMLElement>(selector)) {
      const block = image.parentElement?.closest<HTMLElement>("[data-line]");
      if (block) blocks.add(block);
    }
    for (const block of blocks) {
      const images = [...block.querySelectorAll<HTMLElement>(selector)].filter((image) => image.parentElement?.closest("[data-line]") === block);
      const written: [number, number][] = [];
      for (let line = Number(block.dataset.line); line < Number(block.dataset.lineEnd) && line < this.lines.length; line++) {
        const text = this.lines[line];
        const length = Math.max(1, text.length);
        for (const match of text.matchAll(IMAGE_SOURCE)) {
          written.push([line + match.index / length, line + (match.index + match[0].length) / length]);
        }
      }
      // Images not written plainly (e.g. in an HTML block): this block keeps its two points.
      if (written.length !== images.length) continue;
      images.forEach((image, k) => {
        const rect = image.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        points.push([written[k][0], rect.top - origin], [written[k][1], rect.bottom - origin]);
      });
    }
  }

  get scrollTop(): number {
    return this.root.scrollTop;
  }

  set scrollTop(value: number) {
    this.root.scrollTop = value;
  }
}
