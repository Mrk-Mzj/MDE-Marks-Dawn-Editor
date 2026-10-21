// Thin wrapper over the Tauri backend. Outside Tauri (plain browser during UI
// development) the calls fall back to harmless stand-ins.

import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { message, open, save } from "@tauri-apps/plugin-dialog";
import { t } from "./i18n";

export type Eol = "lf" | "crlf" | "cr";
export type Encoding = "utf8" | "utf8bom" | "utf16le" | "utf16be" | "windows1250";

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
}

export type SaveChoice = "save" | "discard" | "cancel";

const inTauri = isTauri();

const markdownFilter = { name: t.markdownFiles, extensions: ["md", "markdown", "mdown", "mkd", "txt"] };
const allFilter = { name: t.allFiles, extensions: ["*"] };

export function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export async function openFile(docId: string, path: string): Promise<OpenedFile> {
  return invoke<OpenedFile>("open_file", { docId, path });
}

/** Writes the document and returns the new display name. */
export async function saveFile(
  docId: string,
  path: string,
  text: string,
  format: FileFormat,
  breaks: LineBreak[],
): Promise<string> {
  return invoke<string>("save_file", { docId, path, text, encoding: format.encoding, eol: format.eol, breaks });
}

export async function closeDocument(docId: string): Promise<void> {
  if (inTauri) await invoke("close_document", { docId });
}

export async function initialFile(): Promise<string | null> {
  return inTauri ? invoke<string | null>("initial_file") : null;
}

export async function pickFileToOpen(): Promise<string | null> {
  if (!inTauri) return null;
  const picked = await open({ multiple: false, directory: false, filters: [markdownFilter, allFilter] });
  return typeof picked === "string" ? picked : null;
}

export async function pickSavePath(suggestedName: string): Promise<string | null> {
  if (!inTauri) return null;
  return save({ defaultPath: suggestedName, filters: [markdownFilter, allFilter] });
}

export async function askSaveChanges(name: string): Promise<SaveChoice> {
  if (!inTauri) return window.confirm(t.askSave(name)) ? "discard" : "cancel";
  const result = await message(t.askSave(name), {
    title: t.askSaveTitle,
    kind: "warning",
    buttons: { yes: t.saveButton, no: t.discardButton, cancel: t.cancelButton },
  });
  if (result === t.saveButton || result === "Yes") return "save";
  if (result === t.discardButton || result === "No") return "discard";
  return "cancel";
}

/** Asks whether to save in UTF-8 because the file's encoding cannot store `chars`. */
export async function askSaveAsUtf8(name: string, chars: string): Promise<boolean> {
  if (!inTauri) return window.confirm(t.askUtf8(name, chars));
  const result = await message(t.askUtf8(name, chars), {
    title: t.errorTitle,
    kind: "warning",
    buttons: { ok: t.saveUtf8Button, cancel: t.cancelButton },
  });
  return result === t.saveUtf8Button || result === "Ok";
}

export async function showError(text: string): Promise<void> {
  if (!inTauri) {
    window.alert(text);
    return;
  }
  await message(text, { title: t.errorTitle, kind: "error" });
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

/** Calls `handler` when the user closes the window; the close is always cancelled. */
export async function onCloseRequested(handler: () => void): Promise<void> {
  if (!inTauri) return;
  await getCurrentWindow().onCloseRequested((event) => {
    event.preventDefault();
    handler();
  });
}

/** Calls `handler` with the files dropped onto the window. */
export async function onFilesDropped(handler: (paths: string[]) => void): Promise<void> {
  if (!inTauri) return;
  await getCurrentWebview().onDragDropEvent((event) => {
    if (event.payload.type === "drop") handler(event.payload.paths);
  });
}
