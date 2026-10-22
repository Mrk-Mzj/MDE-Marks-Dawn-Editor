// Which links the preview follows (see docs/SPEC.md, "Linki").

export type LinkTarget =
  /** http, https or mailto: opened in the default browser or mail program. */
  | { kind: "external"; url: string }
  /** A path relative to the folder of the open file, already percent-decoded. */
  | { kind: "relative"; path: string }
  /** A link within the document; there is nowhere to go. */
  | { kind: "anchor" };

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

/** What a link's address points to, or `null` when the link is blocked. */
export function classifyHref(href: string): LinkTarget | null {
  const address = href.trim();
  // Browsers ignore control characters inside an address ("java\nscript:").
  if (!address || /[\u0000-\u001f\u007f]/.test(address)) return null;

  const scheme = SCHEME.exec(address)?.[1].toLowerCase();
  if (scheme) {
    const allowed = scheme === "mailto" || ((scheme === "http" || scheme === "https") && /^https?:\/\/[^/\s]/i.test(address));
    return allowed ? { kind: "external", url: address } : null;
  }
  if (address.startsWith("#")) return { kind: "anchor" };
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
  return { kind: "relative", path };
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
