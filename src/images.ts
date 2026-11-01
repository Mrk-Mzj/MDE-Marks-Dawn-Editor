// Local images (docs/SPEC.md, "Obrazki"). Rendered Markdown carries an image
// as <img data-src="…"> without a `src`, so nothing loads before `loadImages`
// gives it an address of the backend's `mdeimg` protocol (src-tauri/src/
// images.rs), which finds the file the way the document names it. Images from
// the web, full paths in a saved file and file: or data: addresses never load;
// they show as a frame with the alt text, like a file that is not there.

import { imageSizes } from "./platform";

const IMAGE_EXTENSIONS =new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg"]);

const ORIGIN = "http://mdeimg.localhost/";

export const placeholderIcon =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';

// The file of the active tab; images lead from its folder. Null before it is saved.
let documentPath: string | null = null;

// Addresses that could not be loaded: re-rendering shows the frame at once
// instead of asking again after every keystroke.
const failed = new Set<string>();

export function setImageDocument(path: string | null): void {
  documentPath = path;
}

/** Tries the images that could not be loaded again (the files may be there now). */
export function forgetFailedImages(): void {
  failed.clear();
}

/** Reads the sizes of images anew (the files may have changed). */
export function forgetImageSizes(): void {
  sizes.clear();
}

export function isImageFile(path: string): boolean {
  const name = path.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot > 0 && IMAGE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

/** `C:\…` or `C:/…`. */
export const isDrivePath = (path: string) => /^[a-z]:[\\/]/i.test(path);

/** What an image's address in the document names: a path (percent-decoded) or a wikilink name; null when it is not loaded. */
export function imageReference(src: string, wiki: boolean): string | null {
  let reference = src.trim();
  // Browsers ignore control characters inside an address ("java\nscript:").
  if (!reference || /[\u0000-\u001f\u007f]/.test(reference)) return null;
  if (!wiki) {
    if (!isDrivePath(reference) && /^[a-z][a-z0-9+.-]*:|^[/\\]/i.test(reference)) return null;
    try {
      reference = decodeURIComponent(reference.replace(/[?#].*$/s, ""));
    } catch {
      return null;
    }
  }
  if (!isImageFile(reference)) return null;
  // A full path only in a file that has not been saved yet, which has no folder.
  if (isDrivePath(reference) !== (documentPath === null)) return null;
  return reference;
}

/** The address the page loads an image from, or null when it is not loaded. */
export function imageUrl(src: string, wiki: boolean): string | null {
  const reference = imageReference(src, wiki);
  if (reference === null) return null;
  const query = new URLSearchParams({ d: documentPath ?? "", r: reference, w: wiki ? "1" : "0" });
  return `${ORIGIN}?${query}`;
}

/** The frame shown instead of an image that is not loaded. */
export function imagePlaceholder(alt: string, title: string): HTMLElement {
  const el = document.createElement("span");
  el.className = "image-placeholder";
  el.title = title;
  el.innerHTML = placeholderIcon;
  const text = document.createElement("span");
  text.textContent = alt;
  el.append(text);
  return el;
}

/** Width and height in pixels, as an image is shown; 0 and 0 when its file tells no size. */
type Size = [number, number];

// Sizes read from the image files' headers (src-tauri/src/image_size.rs), by
// address; null when the file is not there.
const sizes = new Map<string, Size | null>();
// Images waiting for their size, by address: asked together in one call.
const waiting = new Map<string, { document: string; reference: string; wiki: boolean; then: ((size: Size | null) => void)[] }>();

/** Calls `then` with the size of the image at `url` (at once when it is known). */
function sizeOf(url: string, src: string, wiki: boolean, then: (size: Size | null) => void): void {
  const known = sizes.get(url);
  if (known !== undefined) return then(known);
  const entry = waiting.get(url);
  if (entry) return void entry.then.push(then);
  const reference = imageReference(src, wiki);
  if (reference === null) return then(null);
  if (waiting.size === 0) queueMicrotask(askSizes);
  waiting.set(url, { document: documentPath ?? "", reference, wiki, then: [then] });
}

async function askSizes(): Promise<void> {
  const asked = [...waiting];
  waiting.clear();
  const byDocument = new Map<string, [string, (typeof asked)[number][1]][]>();
  for (const item of asked) byDocument.set(item[1].document, [...(byDocument.get(item[1].document) ?? []), item]);
  for (const [document, items] of byDocument) {
    const answers = await imageSizes(document, items.map(([, { reference, wiki }]) => ({ reference, wiki }))).catch(() => []);
    items.forEach(([url, entry], i) => {
      const size = answers[i] ?? null;
      sizes.set(url, size);
      for (const then of entry.then) then(size);
    });
  }
}

/**
 * Gives `img` the box of its image before it loads, so the text around it
 * does not move when it does: the image's shape, and its width unless the
 * document gives one.
 */
function reserve(img: HTMLElement, [width, height]: Size): void {
  img.style.aspectRatio = `${width} / ${height}`;
  if (!img.hasAttribute("width")) img.style.width = `${width}px`;
}

/**
 * Like `loadImage`, but nothing loads: the image becomes a box of its size
 * (an element of the class `image-box`), or the frame when the file is not
 * there. Used for the picture of the document in the one-pane minimap.
 * `onChange` runs when a size arrived later and changed the layout.
 */
export function sizeImages(root: ParentNode, onChange: () => void): void {
  for (const img of root.querySelectorAll<HTMLImageElement>("img[data-src]")) {
    const src = img.dataset.src ?? "";
    const wiki = img.dataset.wiki === "1";
    const url = imageUrl(src, wiki);
    let sync = true;
    const place = (size: Size | null) => {
      const el = size ? document.createElement("span") : imagePlaceholder(img.alt || src, src);
      if (size) {
        el.className = "image-box";
        el.style.width = `${img.getAttribute("width") ?? size[0]}px`;
        el.style.aspectRatio = `${size[0]} / ${size[1]}`;
      }
      img.replaceWith(el);
      if (!sync) onChange();
    };
    if (url === null || failed.has(url)) place(null);
    // Without a size the box is the one browsers give such an image.
    else sizeOf(url, src, wiki, (size) => place(size && size[0] > 0 ? size : size && [300, 150]));
    sync = false;
  }
}

/** Turns an <img data-src> into a loading image, or into the frame when it is not loaded. */
export function loadImage(img: HTMLImageElement, onLoad?: () => void): HTMLElement {
  const src = img.dataset.src ?? "";
  const wiki = img.dataset.wiki === "1";
  const url = imageUrl(src, wiki);
  const frame = () => {
    const el = imagePlaceholder(img.alt || src, src);
    img.replaceWith(el);
    return el;
  };
  if (url === null || failed.has(url)) return frame();
  // The box comes at once when the size is known, else as soon as it is
  // (unless the image has loaded by then and has its own size). An image
  // whose file is not there is the frame at once, also far from the visible
  // part, where it would not try to load yet.
  let sync = true;
  let missing = false;
  sizeOf(url, src, wiki, (size) => {
    if (!size) {
      failed.add(url);
      if (sync) missing = true;
      else {
        frame();
        onLoad?.();
      }
      return;
    }
    if (size[0] === 0 || (img.complete && img.naturalWidth > 0)) return;
    reserve(img, size);
    if (!sync) onLoad?.();
  });
  sync = false;
  if (missing) return frame();
  img.classList.add("md-image");
  img.title ||= src;
  img.draggable = false;
  // Before `src`, or the image would not wait until it is near the visible part.
  img.loading = "lazy";
  img.decoding = "async";
  img.addEventListener(
    "error",
    () => {
      failed.add(url);
      frame();
      onLoad?.();
    },
    { once: true },
  );
  if (onLoad) img.addEventListener("load", onLoad, { once: true });
  img.src = url;
  return img;
}

/** Loads every <img data-src> inside `root`. */
export function loadImages(root: ParentNode, onLoad?: () => void): void {
  for (const img of root.querySelectorAll<HTMLImageElement>("img[data-src]:not([src])")) loadImage(img, onLoad);
}

/** A size written in the document (`300` in `![[a.png|300]]`, `width="300"`), or null. */
export function imageSize(value: string | null | undefined): string | null {
  const size = value?.trim() ?? "";
  return /^\d{1,5}$/.test(size) && Number(size) > 0 ? size : null;
}

/**
 * The Markdown path of an image that `place_image` placed (or a full path),
 * as standard links write it: `/` between folders, spaces and the characters
 * that would end or break the address percent-encoded; letters stay readable.
 */
export function markdownPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/[%\s()<>#?]/g, (char) => (char === " " ? "%20" : encodeURIComponent(char)));
}

/** The text of an image link: `![alt](path)`. */
export function imageMarkdown(alt: string, path: string): string {
  return `![${alt.replace(/([\\[\]])/g, "\\$1")}](${markdownPath(path)})`;
}
