import "./styles.css";

import { Editor } from "./editor";
import { t } from "./i18n";
import { Menu } from "./menu";
import * as platform from "./platform";
import type { FileFormat, LineBreak } from "./platform";
import { Preview } from "./preview";

/** The single open document of this version. */
interface Doc {
  id: string;
  path: string | null;
  name: string;
  format: FileFormat;
  /** Line breaks that differ from the dominant style, as loaded. */
  breaks: LineBreak[];
  /** Text as last loaded or saved, used to tell whether there are unsaved changes. */
  savedText: string;
}

let docCounter = 0;
const newDocId = () => `doc-${++docCounter}`;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

const titleEl = $("#doc-title");
const dirtyEl = $("#doc-dirty");
dirtyEl.title = t.unsavedChanges;
dirtyEl.setAttribute("aria-label", t.unsavedChanges);
$("#menu-button").setAttribute("aria-label", t.menu);
const noticeEl = $("#notice");
const noticeText = $("#notice-text");
const noticeClose = $<HTMLButtonElement>("#notice-close");
noticeClose.setAttribute("aria-label", t.closeNotice);
noticeClose.title = t.closeNotice;
noticeClose.addEventListener("click", () => showNotice(null));
const preview = new Preview($("#preview"));
const editor = new Editor($("#editor"), onEdit);

// New files: UTF-8 without BOM, LF line endings.
const newDoc = (): Doc => ({
  id: newDocId(),
  path: null,
  name: t.untitled,
  format: { encoding: "utf8", eol: "lf" },
  breaks: [],
  savedText: "",
});

let doc: Doc = newDoc();
let dirty = false;
// Prevents overlapping dialogs when shortcuts are pressed repeatedly.
let busy = false;

function onEdit(): void {
  const length = editor.length();
  const nowDirty = length !== doc.savedText.length || editor.text() !== doc.savedText;
  if (nowDirty !== dirty) {
    dirty = nowDirty;
    updateTitle();
  }
  preview.scheduleRender(() => editor.text());
}

function updateTitle(): void {
  titleEl.textContent = doc.name;
  titleEl.title = doc.path ?? doc.name;
  dirtyEl.hidden = !dirty;
  void platform.setWindowTitle(`${dirty ? "• " : ""}${doc.name} — MDE`);
}

/** Shows a warning bar above the panels, or hides it for `null`. */
function showNotice(text: string | null): void {
  noticeText.textContent = text ?? "";
  noticeEl.hidden = text === null;
}

function showDoc(next: Doc): void {
  const previous = doc;
  doc = next;
  dirty = false;
  showNotice(next.format.encoding === "windows1250" ? t.windows1250Notice : null);
  editor.load(next.savedText, next.breaks);
  preview.render(next.savedText);
  preview.resetScroll();
  updateTitle();
  editor.focus();
  if (previous.id !== next.id) void platform.closeDocument(previous.id);
}

function errorText(code: string): string {
  if (code === "invalid_utf16") return t.invalidUtf16;
  return code.replace(/^io:/, "");
}

/** Returns true when it is fine to replace or close the current document. */
async function confirmDiscard(): Promise<boolean> {
  if (!dirty) return true;
  const choice = await platform.askSaveChanges(doc.name);
  if (choice === "save") return save();
  return choice === "discard";
}

async function exclusive(action: () => Promise<unknown>): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    await action();
  } finally {
    busy = false;
  }
}

async function newFile(): Promise<void> {
  if (!(await confirmDiscard())) return;
  showDoc(newDoc());
}

async function openPath(path: string): Promise<void> {
  if (!(await confirmDiscard())) return;
  const id = newDocId();
  try {
    const file = await platform.openFile(id, path);
    showDoc({
      id,
      path: file.path,
      name: file.name,
      format: { encoding: file.encoding, eol: file.eol },
      breaks: file.breaks,
      savedText: file.text,
    });
  } catch (err) {
    // The window may still be hidden when the start-up file fails to open.
    await platform.showWindow();
    await platform.showError(`${t.openFailed(platform.fileNameOf(path))}\n\n${errorText(String(err))}`);
  }
}

async function openWithDialog(): Promise<void> {
  const path = await platform.pickFileToOpen();
  if (path) await openPath(path);
}

async function writeTo(path: string, format = doc.format): Promise<boolean> {
  const text = editor.text();
  const breaks = editor.lineBreaks();
  try {
    const name = await platform.saveFile(doc.id, path, text, format, breaks);
    doc = { ...doc, path, name, format, breaks, savedText: text };
    if (format.encoding !== "windows1250") showNotice(null);
    // Typing may have happened while the file was being written.
    dirty = editor.text() !== text;
    updateTitle();
    return true;
  } catch (err) {
    const code = String(err);
    // The text has characters Windows-1250 cannot store: offer UTF-8 instead
    // of replacing them.
    if (code.startsWith("unrepresentable:")) {
      const chars = [...code.slice("unrepresentable:".length)].slice(0, 20).join(" ");
      if (!(await platform.askSaveAsUtf8(doc.name, chars))) return false;
      return writeTo(path, { ...format, encoding: "utf8" });
    }
    await platform.showError(`${t.saveFailed(platform.fileNameOf(path))}\n\n${errorText(String(err))}`);
    return false;
  }
}

async function save(): Promise<boolean> {
  return doc.path ? writeTo(doc.path) : saveAs();
}

async function saveAs(): Promise<boolean> {
  const path = await platform.pickSavePath(doc.path ?? `${doc.name}.md`);
  return path ? writeTo(path) : false;
}

async function exit(): Promise<void> {
  if (await confirmDiscard()) await platform.destroyWindow();
}

const commands = {
  newFile: () => exclusive(newFile),
  open: () => exclusive(openWithDialog),
  save: () => exclusive(save),
  saveAs: () => exclusive(saveAs),
  exit: () => exclusive(exit),
};

new Menu($<HTMLButtonElement>("#menu-button"), [
  { label: t.newFile, shortcut: "Ctrl+N", run: commands.newFile },
  { label: t.open, shortcut: "Ctrl+O", run: commands.open },
  "separator",
  { label: t.save, shortcut: "Ctrl+S", run: commands.save },
  { label: t.saveAs, shortcut: "Ctrl+Shift+S", run: commands.saveAs },
  "separator",
  { label: t.exit, shortcut: "Ctrl+Q", run: commands.exit },
]);

// Shortcuts use physical key codes so they work on any keyboard layout.
// Alt is excluded because Ctrl+Alt is AltGr on Polish keyboards.
const shortcuts: Record<string, () => void> = {
  KeyN: commands.newFile,
  KeyO: commands.open,
  KeyS: commands.save,
  "Shift+KeyS": commands.saveAs,
  KeyQ: commands.exit,
};

// Browser shortcuts that make no sense in the app (reload, print, find, …).
const blockedCtrl = new Set(["KeyR", "KeyP", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyU", "KeyL", "KeyT"]);
const blockedPlain = new Set(["F3", "F5", "F7", "BrowserBack", "BrowserForward", "BrowserRefresh"]);

window.addEventListener(
  "keydown",
  (event) => {
    if (blockedPlain.has(event.code)) {
      event.preventDefault();
      return;
    }
    if (!event.ctrlKey || event.altKey || event.metaKey) return;
    const command = shortcuts[(event.shiftKey ? "Shift+" : "") + event.code];
    if (command) {
      event.preventDefault();
      event.stopPropagation();
      command();
    } else if (blockedCtrl.has(event.code)) {
      event.preventDefault();
    }
  },
  { capture: true },
);

void platform.onCloseRequested(commands.exit);
void platform.onFilesDropped((paths) => {
  if (paths.length > 0) void exclusive(() => openPath(paths[0]));
});

async function start(): Promise<void> {
  updateTitle();
  preview.render("");
  const initial = await platform.initialFile();
  if (initial) await exclusive(() => openPath(initial));
  // Show the window only once the dark UI is painted, avoiding a white flash.
  await new Promise(requestAnimationFrame);
  await platform.showWindow();
  editor.focus();
}

void start();
