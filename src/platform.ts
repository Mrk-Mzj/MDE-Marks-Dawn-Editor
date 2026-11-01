// Thin wrapper over the Tauri backend. Outside Tauri (plain browser during UI
// development) the calls fall back to harmless stand-ins.

import { getVersion } from "@tauri-apps/api/app";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import { showDialog } from "./dialog";
import { t } from "./i18n";

export type Eol = "lf" | "crlf" | "cr";
/** `windows<code page>`: a legacy single-byte Windows code page, e.g. `windows1250`. */
export type Encoding = "utf8" | "utf8bom" | "utf16le" | "utf16be" | `windows${number}`;

/** A line break that differs from the file's dominant style; `line` is 0-based. */
export interface LineBreak {
  line: number;
  eol: Eol;
}

/** How a document is written to disk. */
export interface FileFormat {
  encoding: Encoding;
  /** Dominant line ending. */
  eol: Eol;
}

export interface OpenedFile extends FileFormat {
  path: string;
  name: string;
  text: string;
  breaks: LineBreak[];
  /** Identifies this version of the file on disk (modification time and size). */
  stamp: string;
}

export interface SavedFile {
  name: string;
  stamp: string;
}

export type SaveChoice = "save" | "discard" | "cancel";
export type OpenChoice = "open" | "always" | "cancel";

/** Where a relative link leads. */
export interface ResolvedLink {
  path: string;
  kind: "file" | "dir";
  /** Windows itself treats the file type as unsafe to open. */
  dangerous: boolean;
}

const inTauri = isTauri();

const markdownExtensions = ["md", "markdown", "mdown", "mkd"];
const openFilter = { name: t.markdownFiles, extensions: [...markdownExtensions, "txt"] };
// The first extension of the first filter is the default one for Save as.
const markdownFilter = { name: t.markdownFiles, extensions: markdownExtensions };
const textFilter = { name: t.textFiles, extensions: ["txt"] };
const allFilter = { name: t.allFiles, extensions: ["*"] };

export function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export async function openFile(docId: string, path: string): Promise<OpenedFile> {
  return invoke<OpenedFile>("open_file", { docId, path });
}

/** Writes the document and returns its new display name and stamp. */
export async function saveFile(
  docId: string,
  path: string,
  text: string,
  format: FileFormat,
  breaks: LineBreak[],
): Promise<SavedFile> {
  return invoke<SavedFile>("save_file", { docId, path, text, encoding: format.encoding, eol: format.eol, breaks });
}

export async function closeDocument(docId: string): Promise<void> {
  if (inTauri) await invoke("close_document", { docId });
}

/** The file's current stamp, or `null` when it no longer exists. */
export async function fileStamp(path: string): Promise<string | null> {
  return inTauri ? invoke<string | null>("file_stamp", { path }) : null;
}

/** Where `relative` leads from the folder of the file `document`, or `null` when nothing is there. */
export async function resolveLink(document: string, relative: string): Promise<ResolvedLink | null> {
  return inTauri ? invoke<ResolvedLink | null>("resolve_link", { document, relative }) : null;
}

/**
 * Where an Obsidian wikilink `[[name]]` in the file `document` leads: next to
 * it, or anywhere in its Obsidian vault; `null` when no such note exists.
 */
export async function resolveWikilink(document: string, name: string): Promise<ResolvedLink | null> {
  return inTauri ? invoke<ResolvedLink | null>("resolve_wikilink", { document, name }) : null;
}

/** Opens a web or mail address in the default program. */
export async function openUrl(url: string): Promise<void> {
  if (inTauri) await invoke("open_url", { url });
  else window.open(url, "_blank", "noopener");
}

/** The version of the app (from tauri.conf.json). */
export async function appVersion(): Promise<string> {
  return inTauri ? getVersion() : "dev";
}

/** Opens an existing file or folder in the default Windows program. */
export async function openWithDefaultProgram(path: string): Promise<void> {
  if (inTauri) await invoke("open_path", { path });
}

/** Starts Windows voice typing (Dictation) for the focused text field; does nothing outside the app. */
export async function startDictation(): Promise<void> {
  if (inTauri) await invoke("start_dictation");
}

/** Files named on the command line. */
export async function initialFiles(): Promise<string[]> {
  return inTauri ? invoke<string[]>("initial_files") : [];
}

/** Calls `handler` with the files passed to another MDE.exe started while this one runs (default window only). */
export async function onOpenFilesRequested(handler: (paths: string[]) => void): Promise<void> {
  // Sent to one window: `listen` of the event module would hear it in every window.
  if (inTauri) await getCurrentWindow().listen<string[]>("open-files", (event) => handler(event.payload));
}

// ---------- Tab groups ----------

/** A saved tab group as the list shows it. */
export interface GroupInfo {
  id: string;
  name: string;
  /** Tabs stored in the group's session. */
  tabs: number;
  /** This window works on the group. */
  current: boolean;
  /** Some window works on the group. */
  open: boolean;
}

export interface Group {
  id: string;
  name: string;
}

export async function listGroups(): Promise<GroupInfo[]> {
  return inTauri ? invoke<GroupInfo[]>("list_groups") : [];
}

/** The group this window works on, or `null` for the default window. */
export async function currentGroup(): Promise<Group | null> {
  return inTauri ? invoke<Group | null>("current_group") : null;
}

/** Makes this window's tabs a new group, which the window works on from now on. */
export async function createGroup(name: string): Promise<Group> {
  if (!inTauri) throw new Error("unavailable");
  return invoke<Group>("create_group", { name });
}

export async function renameGroup(id: string, name: string): Promise<void> {
  if (inTauri) await invoke("rename_group", { id, name });
}

/** Deletes a group, or asks its window to close first ("closing"). */
export async function deleteGroup(id: string): Promise<"deleted" | "closing"> {
  return inTauri ? invoke<"deleted" | "closing">("delete_group", { id }) : "deleted";
}

/** Deletes this window's group and closes the window. */
export async function finishDeleteGroup(): Promise<void> {
  if (inTauri) await invoke("finish_delete_group");
}

/** Shows the group's window, opening it when needed. */
export async function openGroup(id: string): Promise<void> {
  if (inTauri) await invoke("open_group", { id });
}

/** Calls `handler` when any window changed the list of groups. */
export async function onGroupsChanged(handler: () => void): Promise<void> {
  if (inTauri) await listen("groups-changed", () => handler());
}

/** Calls `handler` when another window deletes this window's group. */
export async function onDeleteGroupRequested(handler: () => void): Promise<void> {
  if (inTauri) await getCurrentWindow().listen("delete-group", () => handler());
}

export async function askDeleteGroup(name: string, tabs: number, open: boolean): Promise<boolean> {
  return showDialog({
    title: open ? t.askDeleteOpenGroup : t.askDeleteGroup,
    text: t.deleteGroupText(name, tabs),
    buttons: [
      { label: open ? t.deleteAndCloseButton : t.deleteButton, value: true },
      { label: t.cancelButton, value: false },
    ],
    cancel: false,
  });
}

/**
 * The words that are misspelled in `lang` ("pl" or "en"), or `null` when
 * Windows has no dictionary for it (or outside the app). An empty list only
 * probes whether the dictionary exists.
 */
export async function spellCheck(lang: string, words: string[]): Promise<string[] | null> {
  if (!inTauri) return null;
  try {
    return await invoke<string[] | null>("spell_check", { lang, words });
  } catch (err) {
    console.error("Spell checking failed", err);
    return null;
  }
}

// ---------- Colour scheme (app-wide) ----------

const THEME_KEY = "mde-theme";

/** Whether the light colour scheme is on: set by the backend before the page starts; outside the app, the browser's storage. */
export function initialLightTheme(): boolean {
  const reported = (window as { __MDE_THEME__?: string }).__MDE_THEME__;
  if (reported) return reported === "light";
  try {
    return localStorage.getItem(THEME_KEY) === "light";
  } catch {
    return false;
  }
}

/** Switches every window to the light or dark scheme and remembers it for all sessions. */
export async function setLightTheme(light: boolean): Promise<void> {
  if (inTauri) {
    await invoke("set_theme", { light });
    return;
  }
  try {
    localStorage.setItem(THEME_KEY, light ? "light" : "dark");
  } catch {}
}

/**
 * Dims the native window buttons while a modal dialog is open, as its
 * backdrop dims the page. Call after a dialog opens or closes.
 */
export function syncCaptionDimmed(): void {
  if (inTauri) void invoke("set_caption_dimmed", { dimmed: document.querySelector(":modal") !== null });
}

/** Calls `handler` when any window changed the colour scheme (this one too). */
export async function onThemeChanged(handler: (light: boolean) => void): Promise<void> {
  if (inTauri) await listen<boolean>("theme-changed", (event) => handler(event.payload));
}

// ---------- Session memory ----------

export async function readSession(): Promise<string | null> {
  return inTauri ? invoke<string | null>("read_session") : null;
}

/** Stores the session; the backend adds the window's size and position. */
export async function writeSession(json: string): Promise<void> {
  if (inTauri) await invoke("write_session", { json });
}

/** The text a tab had when the session was last stored. */
export async function readTabText(id: string): Promise<string | null> {
  return inTauri ? invoke<string | null>("read_tab_text", { id }) : null;
}

export async function writeTabText(id: string, text: string): Promise<void> {
  if (inTauri) await invoke("write_tab_text", { id, text });
}

export async function deleteTabText(id: string): Promise<void> {
  if (inTauri) await invoke("delete_tab_text", { id });
}

/** Deletes the stored text of every tab not in `keep`. */
export async function pruneTabTexts(keep: string[]): Promise<void> {
  if (inTauri) await invoke("prune_tab_texts", { keep });
}

export async function pickFilesToOpen(): Promise<string[]> {
  if (!inTauri) return [];
  const picked = await open({ multiple: true, directory: false, filters: [openFilter, allFilter] });
  return picked ?? [];
}

const imageFilter = { name: t.imageFiles, extensions: ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg"] };

export async function pickImages(): Promise<string[]> {
  if (!inTauri) return [];
  const picked = await open({ multiple: true, directory: false, filters: [imageFilter, allFilter] });
  return picked ?? [];
}

/**
 * Makes the image `image` usable from the file `document`: linked where it
 * is, or copied next to the document (see src-tauri/src/images.rs). Returns
 * the path to write in the link, relative to the document's folder.
 */
export async function placeImage(document: string, image: string): Promise<string> {
  if (!inTauri) throw new Error("unavailable");
  return invoke<string>("place_image", { document, image });
}

/** The full path of an image of `document` (empty when not saved yet), or `null` when it is not there. */
export async function imagePath(document: string, reference: string, wiki: boolean): Promise<string | null> {
  return inTauri ? invoke<string | null>("image_path", { document, reference, wiki }) : null;
}

export async function pickSavePath(suggestedName: string): Promise<string | null> {
  if (!inTauri) return null;
  return save({ defaultPath: suggestedName, filters: [markdownFilter, textFilter, allFilter] });
}

export async function askSaveChanges(name: string): Promise<SaveChoice> {
  return showDialog<SaveChoice>({
    title: t.askSaveTitle,
    text: t.askSave(name),
    buttons: [
      { label: t.saveButton, value: "save" },
      { label: t.discardButton, value: "discard" },
      { label: t.cancelButton, value: "cancel" },
    ],
    cancel: "cancel",
  });
}

/**
 * Asks before a linked file is opened by another program. `extension` is
 * offered for "don't ask again" unless `program` says the file can run code.
 */
export async function askOpenLinked(name: string, path: string, extension: string, program: boolean): Promise<OpenChoice> {
  if (program) {
    return showDialog<OpenChoice>({
      title: t.openLinkTitle,
      text: t.askOpenProgram(name, path),
      buttons: [
        { label: t.openButton, value: "open" },
        { label: t.cancelButton, value: "cancel" },
      ],
      cancel: "cancel",
    });
  }
  return showDialog<OpenChoice>({
    title: t.openLinkTitle,
    text: t.askOpenLinked(name, path),
    buttons: [
      { label: t.openButton, value: "open" },
      { label: t.openAlwaysButton(extension), value: "always" },
      { label: t.cancelButton, value: "cancel" },
    ],
    cancel: "cancel",
  });
}

export type DictionaryChoice = "settings" | "change" | "cancel";

/** Tells that Windows lacks the dictionary of `language` and offers to open the language settings. */
export async function askMissingDictionary(language: string): Promise<DictionaryChoice> {
  if (!inTauri) return "change";
  return showDialog<DictionaryChoice>({
    title: t.missingDictionaryTitle,
    text: t.missingDictionary(language),
    buttons: [
      { label: t.openSettingsButton, value: "settings" },
      { label: t.nextLanguageButton, value: "change" },
      { label: t.cancelButton, value: "cancel" },
    ],
    cancel: "cancel",
  });
}

export async function openLanguageSettings(): Promise<void> {
  if (inTauri) await invoke("open_language_settings");
}

export async function showError(text: string): Promise<void> {
  await showDialog({ text, buttons: [{ label: t.okButton, value: undefined }], cancel: undefined });
}

export async function setWindowTitle(title: string): Promise<void> {
  document.title = title;
  if (inTauri) await getCurrentWindow().setTitle(title);
}

export async function showWindow(): Promise<void> {
  if (inTauri) await getCurrentWindow().show();
}

export async function destroyWindow(): Promise<void> {
  if (inTauri) await getCurrentWindow().destroy();
}

export async function toggleMaximizeWindow(): Promise<void> {
  if (inTauri) await getCurrentWindow().toggleMaximize();
}

/** Moves the window with the mouse while its left button is held (the press must have just happened). */
export async function startWindowDrag(): Promise<void> {
  if (inTauri) await getCurrentWindow().startDragging();
}

/** Calls `handler` when the user closes the window; the close is always cancelled. */
export async function onCloseRequested(handler: () => void): Promise<void> {
  if (!inTauri) return;
  await getCurrentWindow().onCloseRequested((event) => {
    event.preventDefault();
    handler();
  });
}

/** Calls `handler` when the window gets the keyboard focus back. */
export async function onWindowFocused(handler: () => void): Promise<void> {
  if (!inTauri) return;
  await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
    if (focused) handler();
  });
}

/** Calls `handler` with the files dropped onto the window and where (in CSS pixels of the page). */
export async function onFilesDropped(handler: (paths: string[], x: number, y: number) => void): Promise<void> {
  if (!inTauri) return;
  await getCurrentWebview().onDragDropEvent((event) => {
    if (event.payload.type !== "drop") return;
    const { x, y } = event.payload.position;
    handler(event.payload.paths, x / devicePixelRatio, y / devicePixelRatio);
  });
}
