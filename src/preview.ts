// Rendered GFM preview (right panel).

import MarkdownIt from "markdown-it";
import { t } from "./i18n";
import { classifyHref } from "./links";
import { markRawHtml, sanitize } from "./sanitize";

// Raw HTML is let through by markdown-it but tagged by `markRawHtml` and
// reduced to the whitelist by `sanitize` before it reaches the page.
// `breaks`: every Enter in the file is a line break in the preview (an MDE
// extension beyond GFM, see docs/SPEC.md).
const md = new MarkdownIt({ html: true, linkify: true, typographer: false, breaks: true });

md.renderer.rules.html_block = (tokens, idx) => markRawHtml(tokens[idx].content);
md.renderer.rules.html_inline = (tokens, idx) => markRawHtml(tokens[idx].content);

// Only http, https, mailto and relative paths become links; anything else
// (javascript:, data:, file:, unknown schemes) stays plain text.
md.validateLink = (url) => classifyHref(url) !== null;

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
// bullet, like in the one-pane mode, with a check mark when the task is done.
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
  `<span class="task-box" aria-hidden="true"><svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/>${
    (tokens[idx].meta as { checked: boolean }).checked ? '<path d="m9 12 2 2 4-4"/>' : ""
  }</svg></span>`;

md.renderer.rules.blank_lines = (tokens, idx) =>
  '<div class="blank-line" aria-hidden="true"></div>'.repeat((tokens[idx].meta as { count: number }).count);

const imageIcon =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';

// Images are not supported: show a frame with the alt text, never load the file.
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const alt = self.renderInlineAsText(token.children ?? [], options, env);
  const src = String(token.attrGet("src") ?? "");
  return `<span class="image-placeholder" title="${md.utils.escapeHtml(src)}">${imageIcon}<span>${md.utils.escapeHtml(alt)}</span></span>`;
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
  token.attrSet("title", shown);
  return defaultLinkOpen(tokens, idx, options, env, self);
};

/** Renders a piece of Markdown as sanitized DOM, as the preview shows it. */
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

export class Preview {
  private timer = 0;
  // Rendered HTML is parsed here, where nothing runs or loads, and sanitized before it is shown.
  private readonly staging = document.createElement("template");
  private renders = 0;
  private lineCount = 1;
  private map: { key: string; value: SourceMap } | null = null;

  /** `onLink` gets the address of a clicked link; links never navigate the app themselves. */
  constructor(
    readonly root: HTMLElement,
    onLink: (href: string) => void,
  ) {
    root.addEventListener("click", (event) => {
      const link = (event.target as Element).closest("a");
      if (!link) return;
      event.preventDefault();
      // Dragging to select text that starts on a link is not a click on it.
      if (window.getSelection()?.isCollapsed === false) return;
      onLink(link.getAttribute("href") ?? "");
    });
    root.addEventListener("auxclick", (event) => event.preventDefault());
  }

  render(source: string): void {
    window.clearTimeout(this.timer);
    this.renders++;
    this.lineCount = source.split("\n").length;
    if (!source.trim()) {
      this.root.innerHTML = `<p class="preview-empty">${md.utils.escapeHtml(t.emptyPreview)}</p>`;
      return;
    }
    this.staging.innerHTML = md.render(source);
    sanitize(this.staging.content);
    this.root.replaceChildren(this.staging.content);
  }

  /** Re-renders after a short pause in typing, keeping the editor responsive. */
  scheduleRender(getSource: () => string, then?: () => void): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.render(getSource());
      then?.();
    }, 60);
  }

  /** The source map of the rendered blocks, measured again only after the layout changed. */
  sourceMap(): SourceMap {
    const { root } = this;
    // Zoom, the panel width and opening <details> all change the content height or width.
    const key = `${this.renders}:${root.scrollHeight}:${root.clientWidth}`;
    if (this.map?.key === key) return this.map.value;
    const origin = root.getBoundingClientRect().top - root.scrollTop;
    const points: [number, number][] = [];
    for (const element of root.querySelectorAll<HTMLElement>("[data-line]")) {
      const rect = element.getBoundingClientRect();
      // Not shown, e.g. inside a closed <details>.
      if (rect.width === 0 && rect.height === 0) continue;
      points.push([Number(element.dataset.line), rect.top - origin], [Number(element.dataset.lineEnd), rect.bottom - origin]);
    }
    points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const value: SourceMap = { lines: [0], heights: [0] };
    for (const [line, height] of points) {
      // Margins can place a nested block above its parent's start; such points would break the order.
      if (height < value.heights[value.heights.length - 1]) continue;
      value.lines.push(line);
      value.heights.push(height);
    }
    value.lines.push(Math.max(this.lineCount, value.lines[value.lines.length - 1]));
    value.heights.push(Math.max(root.scrollHeight, value.heights[value.heights.length - 1]));
    this.map = { key, value };
    return value;
  }

  get scrollTop(): number {
    return this.root.scrollTop;
  }

  set scrollTop(value: number) {
    this.root.scrollTop = value;
  }
}
