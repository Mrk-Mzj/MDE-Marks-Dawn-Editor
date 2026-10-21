// Rendered GFM preview (right panel).

import MarkdownIt from "markdown-it";
import { t } from "./i18n";

// Raw HTML is shown as text until the whitelist sanitizer is added.
// markdown-it's default link validation already drops javascript:, vbscript:,
// file: and data: URLs.
// `breaks`: every Enter in the file is a line break in the preview (an MDE
// extension beyond GFM, see docs/SPEC.md).
const md = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: true });

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
  token.attrSet("title", String(token.attrGet("href") ?? ""));
  return defaultLinkOpen(tokens, idx, options, env, self);
};

export class Preview {
  private timer = 0;

  constructor(private readonly root: HTMLElement) {
    // Links are inactive in this version; they must never navigate the app.
    root.addEventListener("click", (event) => {
      if ((event.target as Element).closest("a")) event.preventDefault();
    });
    root.addEventListener("auxclick", (event) => event.preventDefault());
  }

  render(source: string): void {
    window.clearTimeout(this.timer);
    this.root.innerHTML = source.trim()
      ? md.render(source)
      : `<p class="preview-empty">${md.utils.escapeHtml(t.emptyPreview)}</p>`;
  }

  /** Re-renders after a short pause in typing, keeping the editor responsive. */
  scheduleRender(getSource: () => string): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.render(getSource()), 60);
  }

  resetScroll(): void {
    this.root.scrollTop = 0;
  }
}
