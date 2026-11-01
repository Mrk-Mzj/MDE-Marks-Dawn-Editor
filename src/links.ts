// Which links the preview follows (see docs/SPEC.md, "Linki").

export type LinkTarget =
  /** http, https or mailto: opened in the default browser or mail program. */
  | { kind: "external"; url: string }
  /** A path relative to the folder of the open file, already percent-decoded; `heading` is its `#…` part. */
  | { kind: "relative"; path: string; heading: string | null }
  /** An Obsidian wikilink to a note (or file) found next to the open file or in its vault. */
  | { kind: "wiki"; name: string; heading: string | null }
  /** A heading of the open document (`#…`, percent-decoded). */
  | { kind: "anchor"; heading: string };

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

/** Percent-decodes the `#…` part of an address; `null` when there is none. */
function fragmentOf(address: string): string | null {
  const hash = address.indexOf("#");
  if (hash < 0) return null;
  const fragment = address.slice(hash + 1);
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

/** What a link's address points to, or `null` when the link is blocked. */
export function classifyHref(href: string): LinkTarget | null {
  const address = href.trim();
  // Browsers ignore control characters inside an address ("java\nscript:").
  if (!address || /[\u0000-\u001f\u007f]/.test(address)) return null;

  const wiki = WIKI_HREF.exec(address);
  if (wiki) return classifyWikiTarget(wiki[1]);

  const scheme = SCHEME.exec(address)?.[1].toLowerCase();
  if (scheme) {
    const allowed = scheme === "mailto" || ((scheme === "http" || scheme === "https") && /^https?:\/\/[^/\s]/i.test(address));
    return allowed ? { kind: "external", url: address } : null;
  }
  if (address.startsWith("#")) return { kind: "anchor", heading: fragmentOf(address) ?? "" };
  // "www.example.com" without a scheme is a web address, not a file next to the document.
  if (/^www\.[^/\\?#:]+\.[^/\\?#:.]/i.test(address)) return { kind: "external", url: `https://${address}` };
  // Rooted and network paths have no folder to be relative to.
  if (/^[/\\]/.test(address)) return null;

  let path: string;
  try {
    path = decodeURIComponent(address.replace(/[?#].*$/s, ""));
  } catch {
    return null;
  }
  // A colon would be a drive letter or an NTFS stream name.
  if (!path || /^[/\\]|[:\u0000-\u001f]/.test(path)) return null;
  return { kind: "relative", path, heading: fragmentOf(address.replace(/\?[^#]*/, "")) };
}

// ---------- Obsidian wikilinks (an MDE extension beyond GFM, see docs/SPEC.md) ----------

/** `[[target]]` or `[[target|text]]`; `!` before it makes an embed. */
export const WIKILINK = /\[\[([^[\]|\n]+)(?:\|([^[\]\n]*))?\]\]/y;

// Rendered wikilinks carry their target as the address `[[target]]` (without the text).
const WIKI_HREF = /^\[\[([^[\]|\n]+)\]\]$/;

export const wikiHref = (target: string) => `[[${target}]]`;

/** What a wikilink's target (`Note`, `Folder/Note#Heading`, `#Heading`) points to, or `null` when it is blocked. */
export function classifyWikiTarget(target: string): LinkTarget | null {
  const hash = target.indexOf("#");
  const name = (hash < 0 ? target : target.slice(0, hash)).trim();
  // Obsidian's nested headings (`Note#Chapter#Section`) point to the last one.
  const heading = hash < 0 ? null : (target.slice(hash + 1).split("#").pop() ?? "").trim();
  if (!name) return heading === null ? null : { kind: "anchor", heading };
  // Like relative links: no rooted paths, drive letters or control characters.
  if (/^[/\\]|[:\u0000-\u001f]/.test(name)) return null;
  return { kind: "wiki", name, heading };
}

/** The text a wikilink without its own text shows: `Note`, `Note > Heading`, `Heading`. */
export function wikiLabel(target: string): string {
  return target
    .split("#")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" > ");
}

// ---------- Headings ----------

/** GitHub's anchor for a heading: lower case, punctuation removed, each space a hyphen. */
export function githubSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
    .replace(/ /g, "-");
}

const plainText = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");
const lettersOnly = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Which of `headings` (their text, in document order) a link's `#…` part
 * points to, or -1. GitHub anchors (`#grupy-kart`, repeated headings
 * `-1`, `-2`) are tried first, then Obsidian's (the heading text itself), then
 * the text with punctuation ignored (Obsidian drops characters such as `:`
 * from links). Case never matters. Block references (`#^id`) go nowhere.
 */
export function findHeading(headings: readonly string[], fragment: string): number {
  const wanted = fragment.trim();
  if (!wanted || wanted.startsWith("^")) return -1;
  const seen = new Map<string, number>();
  const slugs = headings.map((text) => {
    const slug = githubSlug(text);
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    return count === 0 ? slug : `${slug}-${count}`;
  });
  const lower = wanted.toLowerCase();
  let index = slugs.indexOf(lower);
  if (index < 0) index = headings.findIndex((text) => plainText(text) === plainText(wanted));
  const letters = lettersOnly(wanted);
  if (index < 0 && letters) index = headings.findIndex((text) => lettersOnly(text) === letters);
  return index;
}

export function extensionOf(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Linked files with these extensions open in a new tab. */
const MARKDOWN = new Set(["md", "markdown", "mdown", "mkd"]);

/**
 * Types that can run code or change the system when opened: always confirmed.
 * The backend adds every type Windows itself considers unsafe (AssocIsDangerous).
 */
const EXECUTABLE = new Set([
  // programs and installers
  "exe", "com", "scr", "pif", "msi", "msp", "mst", "appx", "appxbundle", "msix", "msixbundle",
  "application", "appref-ms", "gadget", "cpl", "msc", "jar", "jnlp", "xbap", "xll", "diagcab",
  // scripts
  "bat", "cmd", "ps1", "psm1", "psd1", "ps1xml", "psc1", "vb", "vbs", "vbe", "js", "jse", "ws", "wsf",
  "wsh", "wsc", "sct", "hta", "chm", "py", "pyw", "pyz", "pl", "rb", "sh",
  // shortcuts and shell files
  "lnk", "url", "website", "scf", "library-ms", "search-ms", "searchconnector-ms", "settingcontent-ms",
  // system changes and disk images
  "reg", "inf", "ins", "isp", "theme", "themepack", "iso", "img", "vhd", "vhdx",
]);

export const isMarkdownFile = (extension: string) => MARKDOWN.has(extension);

/** Files that are confirmed every time. No extension counts too: Windows would ask which program to use. */
export const needsConfirmation = (extension: string) => extension === "" || EXECUTABLE.has(extension);
