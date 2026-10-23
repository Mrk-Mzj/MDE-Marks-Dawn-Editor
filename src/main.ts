import "./styles.css";

import type { EditorState } from "@codemirror/state";
import { Editor } from "./editor";
import type { ScrollPosition, Selection } from "./editor";
import { blockState, inlineState, insertLink, insertTable, setHeading, toggleInline, toggleList, toggleQuote } from "./format";
import { lang, t } from "./i18n";
import { classifyHref, extensionOf, isMarkdownFile, needsConfirmation } from "./links";
import { Menu } from "./menu";
import * as platform from "./platform";
import type { FileFormat, LineBreak, OpenedFile } from "./platform";
import { Preview } from "./preview";
import { ScrollSync } from "./scrollsync";
import { isSpellMode, SpellService } from "./spell";
import { TabStrip } from "./tabs";
import { icons, TablePicker, Toolbar } from "./toolbar";
import { DEFAULT_ZOOM, stepZoom, validZoom, WHEEL_STEP } from "./zoom";

/** An open document: one tab. */
interface Doc {
  /** Also names the tab's stored text in the session. */
  id: string;
  path: string | null;
  name: string;
  format: FileFormat;
  /** Text as last loaded from or saved to disk, used to tell whether there are unsaved changes. */
  savedText: string;
  /** Version of the file on disk when it was last loaded or saved. */
  stamp: string | null;
  /** The file no longer exists on disk: the tab always counts as unsaved and Save asks where to save. */
  missing: boolean;
  /** The file changed on disk while the tab had unsaved changes. */
  conflict: boolean;
  /** The Windows-1250 warning was closed. */
  hideEncodingNotice: boolean;
  dirty: boolean;
  /** Editor state of an inactive tab; the active tab's state lives in the editor. */
  state: EditorState;
  scroll: ScrollPosition | null;
  previewScroll: number;
  /** The tab's text stored in the session is out of date. */
  textStale: boolean;
}

/** A tab as stored in `session.json`. */
interface StoredTab {
  id: string;
  path: string | null;
  name: string;
  format: FileFormat;
  /** Line breaks of the stored text that differ from the dominant style. */
  breaks: LineBreak[];
  stamp: string | null;
  dirty: boolean;
  scroll: ScrollPosition | null;
  previewScroll: number;
  selection: Selection;
}

interface StoredSession {
  version: 1;
  active: number;
  tabs: StoredTab[];
  /** Spell checking mode (an app setting); the language of the system when missing. */
  spell?: string;
  /** File types the user chose to open from links without asking again (an app setting). */
  openTypes?: string[];
  /** Zoom of the text in both panels, in percent (an app setting); 100 when missing. */
  zoom?: number;
  /** Both panels scroll together (an app setting); on when missing. */
  syncScroll?: boolean;
}

/** Unique across runs, because tab ids name files in the session folder. */
const newDocId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

$("#menu-button").setAttribute("aria-label", t.menu);
const noticeEl = $("#notice");
const noticeText = $("#notice-text");
const noticeActions = $("#notice-actions");
const noticeClose = $<HTMLButtonElement>("#notice-close");
// What the close button of the current warning bar does.
let onNoticeClose = () => {};
noticeClose.addEventListener("click", () => onNoticeClose());
const previewEl = $("#preview");
const preview = new Preview(previewEl, followLink);
const spell = new SpellService(lang);
const editor = new Editor($("#editor"), onEdit, spell);
const scrollSync = new ScrollSync(editor, preview);

let docs: Doc[] = [];
let active: Doc;
// Prevents overlapping dialogs when shortcuts are pressed repeatedly.
let busy = false;
// Work that arrived while busy (files from another MDE.exe, checking the disk).
let pendingFiles: string[] = [];
let pendingDiskCheck = false;

const tabs = new TabStrip(
  $("#tabs"),
  {
    select: (id) => {
      const doc = docs.find((d) => d.id === id);
      if (doc && !busy) activate(doc);
    },
    close: (id) => {
      const doc = docs.find((d) => d.id === id);
      if (doc) void exclusive(() => closeTab(doc));
    },
    move: (id, index) => {
      const from = docs.findIndex((d) => d.id === id);
      if (from < 0 || index < 0 || index >= docs.length) return;
      const [doc] = docs.splice(from, 1);
      docs.splice(index, 0, doc);
      updateTabs();
      scheduleSessionSave();
    },
    step: (direction) => {
      // The wheel stops at the first and last tab.
      const next = docs[docs.indexOf(active) + direction];
      if (next && !busy) activate(next);
    },
  },
  { closeTab: t.closeTab, unsavedChanges: t.unsavedChanges },
);

function stateOf(doc: Doc): EditorState {
  return doc === active ? editor.state : doc.state;
}

function makeDoc(fields: Partial<Doc> & Pick<Doc, "id" | "name" | "state">): Doc {
  return {
    path: null,
    // New files: UTF-8 without BOM, LF line endings.
    format: { encoding: "utf8", eol: "lf" },
    savedText: "",
    stamp: null,
    missing: false,
    conflict: false,
    hideEncodingNotice: false,
    dirty: false,
    scroll: null,
    previewScroll: 0,
    textStale: true,
    ...fields,
  };
}

const newDoc = (): Doc => makeDoc({ id: newDocId(), name: t.untitled, state: editor.createState("") });

function docFromFile(id: string, file: OpenedFile): Doc {
  return makeDoc({
    id,
    path: file.path,
    name: file.name,
    format: { encoding: file.encoding, eol: file.eol },
    savedText: file.text,
    stamp: file.stamp,
    state: editor.createState(file.text, file.breaks),
  });
}

function isDirty(doc: Doc, text: string): boolean {
  return doc.missing || text.length !== doc.savedText.length || text !== doc.savedText;
}

function onEdit(): void {
  const nowDirty = isDirty(active, editor.text());
  active.textStale = true;
  if (nowDirty !== active.dirty) {
    active.dirty = nowDirty;
    updateTitle();
  }
  preview.scheduleRender(() => editor.text(), () => scrollSync.followEditor());
  scheduleSessionSave();
}

function updateTabs(): void {
  tabs.update(
    docs.map((doc) => ({ id: doc.id, name: doc.name, tooltip: doc.path ?? doc.name, dirty: doc.dirty })),
    active.id,
  );
}

function updateTitle(): void {
  updateTabs();
  void platform.setWindowTitle(`${active.dirty ? "• " : ""}${active.name} — MDE`);
}

interface NoticeAction {
  label: string;
  run: () => void;
}

/**
 * Shows a warning bar above the panels with optional buttons, or hides it for
 * `null`. The close button runs `onClose`, described by `closeLabel`.
 */
function showNotice(text: string | null, actions: NoticeAction[] = [], onClose = () => {}, closeLabel = t.closeNotice): void {
  noticeText.textContent = text ?? "";
  noticeActions.replaceChildren(
    ...actions.map(({ label, run }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button-outline";
      button.dataset.slot = "button";
      button.textContent = label;
      button.addEventListener("click", run);
      return button;
    }),
  );
  noticeActions.hidden = actions.length === 0;
  onNoticeClose = onClose;
  noticeClose.setAttribute("aria-label", closeLabel);
  noticeClose.title = closeLabel;
  noticeEl.hidden = text === null;
}

/** The warning bar of the active tab. */
function updateNotice(): void {
  const doc = active;
  if (doc.conflict) {
    showNotice(
      t.changedOnDisk(doc.name),
      [{ label: t.reload, run: () => void exclusive(() => reloadFromDisk(doc)) }],
      // Closing the bar keeps the unsaved changes.
      () => void exclusive(() => keepMine(doc)),
      t.keepMine,
    );
  } else if (doc.format.encoding === "windows1250" && !doc.hideEncodingNotice) {
    showNotice(t.windows1250Notice, [], () => {
      doc.hideEncodingNotice = true;
      updateNotice();
    });
  } else {
    showNotice(null);
  }
}

/** Remembers the active tab's editor state and scroll positions. */
function stash(): void {
  if (!active) return;
  active.state = editor.state;
  active.scroll = editor.scrollPosition();
  active.previewScroll = preview.scrollTop;
}

function activate(doc: Doc): void {
  if (doc === active) {
    editor.focus();
    return;
  }
  if (active && docs.includes(active)) stash();
  active = doc;
  editor.setState(doc.state, doc.scroll);
  preview.render(doc.state.doc.toString());
  preview.scrollTop = doc.previewScroll;
  scrollSync.followEditorSoon();
  updateNotice();
  updateTitle();
  editor.focus();
  scheduleSessionSave();
}

function stepTab(direction: 1 | -1): void {
  const index = docs.indexOf(active);
  activate(docs[(index + direction + docs.length) % docs.length]);
}

/** Adds `doc` as the last tab and switches to it. */
function addDoc(doc: Doc): void {
  docs.push(doc);
  activate(doc);
}

/** Closes a tab without asking; the last tab is replaced by a new empty one. */
function removeDoc(doc: Doc): void {
  const index = docs.indexOf(doc);
  if (index < 0) return;
  docs.splice(index, 1);
  void platform.closeDocument(doc.id);
  void platform.deleteTabText(doc.id);
  if (docs.length === 0) {
    addDoc(newDoc());
  } else if (doc === active) {
    activate(docs[Math.min(index, docs.length - 1)]);
  } else {
    updateTabs();
  }
  scheduleSessionSave();
}

function errorText(code: string): string {
  if (code === "invalid_utf16") return t.invalidUtf16;
  if (code === "not_found") return t.notFound;
  return code.replace(/^io:/, "");
}

/** Runs one user command at a time; work that arrived meanwhile runs afterwards. */
async function exclusive(action: () => Promise<unknown>): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    await action();
  } finally {
    busy = false;
  }
  if (pendingFiles.length > 0) {
    const files = pendingFiles;
    pendingFiles = [];
    await exclusive(() => openPaths(files));
  } else if (pendingDiskCheck) {
    pendingDiskCheck = false;
    await exclusive(checkDisk);
  }
}

async function newFile(): Promise<void> {
  addDoc(newDoc());
}

const samePath = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Opens each file in a new tab, or switches to its tab when it is already open. */
async function openPaths(paths: string[]): Promise<void> {
  for (const path of paths) await openPath(path);
}

async function openPath(path: string): Promise<void> {
  const open = docs.find((doc) => doc.path !== null && samePath(doc.path, path));
  if (open) {
    activate(open);
    return;
  }
  // A lone empty "Untitled" tab is replaced rather than kept next to the file.
  const blank = docs.length === 1 && active.path === null && !active.dirty && editor.length() === 0 ? active : null;
  const id = newDocId();
  try {
    addDoc(docFromFile(id, await platform.openFile(id, path)));
    if (blank) removeDoc(blank);
  } catch (err) {
    // The window may still be hidden when a start-up file fails to open.
    await platform.showWindow();
    await platform.showError(`${t.openFailed(platform.fileNameOf(path))}\n\n${errorText(String(err))}`);
  }
}

async function openWithDialog(): Promise<void> {
  await openPaths(await platform.pickFilesToOpen());
}

async function writeTo(doc: Doc, path: string, format = doc.format): Promise<boolean> {
  const state = stateOf(doc);
  const text = state.doc.toString();
  const breaks = editor.lineBreaks(state);
  try {
    const saved = await platform.saveFile(doc.id, path, text, format, breaks);
    Object.assign(doc, {
      path,
      name: saved.name,
      format,
      savedText: text,
      stamp: saved.stamp,
      missing: false,
      conflict: false,
    });
    // Typing may have happened while the file was being written.
    doc.dirty = isDirty(doc, stateOf(doc).doc.toString());
    if (doc === active) {
      updateNotice();
      updateTitle();
    } else {
      updateTabs();
    }
    scheduleSessionSave();
    return true;
  } catch (err) {
    const code = String(err);
    // The text has characters Windows-1250 cannot store: offer UTF-8 instead
    // of replacing them.
    if (code.startsWith("unrepresentable:")) {
      const chars = [...code.slice("unrepresentable:".length)].slice(0, 20).join(" ");
      if (!(await platform.askSaveAsUtf8(doc.name, chars))) return false;
      return writeTo(doc, path, { ...format, encoding: "utf8" });
    }
    await platform.showError(`${t.saveFailed(platform.fileNameOf(path))}\n\n${errorText(code)}`);
    return false;
  }
}

async function save(doc = active): Promise<boolean> {
  return doc.path && !doc.missing ? writeTo(doc, doc.path) : saveAs(doc);
}

async function saveAs(doc = active): Promise<boolean> {
  const path = await platform.pickSavePath(doc.path ?? `${doc.name}.md`);
  return path ? writeTo(doc, path) : false;
}

/** Asks about unsaved changes, then closes the tab. */
async function closeTab(doc = active): Promise<void> {
  if (doc.dirty) {
    activate(doc);
    const choice = await platform.askSaveChanges(doc.name);
    if (choice === "cancel" || (choice === "save" && !(await save(doc)))) return;
  }
  removeDoc(doc);
}

/** Unsaved changes are not asked about: they stay in the session. */
async function exit(): Promise<void> {
  try {
    await saveSession();
  } finally {
    await platform.destroyWindow();
  }
}

// ---------- Zoom ----------

// Scale of the text in both panels, in percent; the same for every tab.
let zoom = DEFAULT_ZOOM;

/** The base text size is 16px at 100%; the panels take their font size from this variable. */
function applyZoom(percent: number): void {
  zoom = percent;
  document.documentElement.style.setProperty("--content-font-size", `${(16 * percent) / 100}px`);
}

/** Rescales the text and keeps both panels looking at the same place. */
function setZoom(percent: number): void {
  if (percent === zoom) return;
  const factor = percent / zoom;
  const scroll = editor.scrollPosition();
  const previewRatio = previewEl.scrollTop / Math.max(1, previewEl.scrollHeight);
  applyZoom(percent);
  editor.rescale(scroll);
  previewEl.scrollTop = previewRatio * previewEl.scrollHeight;
  // Stored scroll positions of the other tabs are in pixels of the old size.
  for (const doc of docs) {
    if (doc === active) continue;
    doc.previewScroll *= factor;
    if (doc.scroll) doc.scroll = { ...doc.scroll, margin: doc.scroll.margin * factor };
  }
  scrollSync.followEditorSoon();
  scheduleSessionSave();
}

// ---------- Links ----------

// Extensions whose linked files open without asking.
let trustedTypes = new Set<string>();

/** Web and mail links open in the default program, relative ones in a tab or the Windows program for the file. */
function followLink(href: string): void {
  const link = classifyHref(href);
  if (link?.kind === "external") {
    void platform.openUrl(link.url).catch((err) => platform.showError(`${t.linkOpenFailed(link.url)}\n\n${errorText(String(err))}`));
  } else if (link?.kind === "relative") {
    void exclusive(() => openRelative(active, link.path));
  }
}

async function openRelative(doc: Doc, relative: string): Promise<void> {
  if (!doc.path) {
    await platform.showError(t.linkNeedsSave);
    return;
  }
  const target = await platform.resolveLink(doc.path, relative);
  if (!target) {
    await platform.showError(t.linkNotFound(relative));
    return;
  }
  const extension = extensionOf(target.path);
  if (target.kind === "file" && isMarkdownFile(extension)) {
    await openPath(target.path);
    return;
  }

  const name = platform.fileNameOf(target.path);
  // Programs, scripts and folders are asked about every time, whatever was chosen before.
  const always = target.kind === "dir" || target.dangerous || needsConfirmation(extension);
  if (always || !trustedTypes.has(extension)) {
    const choice = await platform.askOpenLinked(name, target.path, extension, always);
    if (choice === "cancel") return;
    if (choice === "always") {
      trustedTypes.add(extension);
      scheduleSessionSave();
    }
  }
  try {
    await platform.openWithDefaultProgram(target.path);
  } catch (err) {
    await platform.showError(`${t.linkOpenFailed(name)}\n\n${errorText(String(err))}`);
  }
}

// ---------- Changes on disk ----------

/** Loads the file's current version into its tab, dropping unsaved changes. */
async function reloadFromDisk(doc: Doc): Promise<void> {
  if (!doc.path) return;
  let file: OpenedFile;
  try {
    file = await platform.openFile(doc.id, doc.path);
  } catch {
    markMissing(doc);
    return;
  }
  const isActive = doc === active;
  const old = stateOf(doc);
  const { anchor, head } = old.selection.main;
  const state = editor.createState(file.text, file.breaks, { anchor, head });
  Object.assign(doc, {
    name: file.name,
    format: { encoding: file.encoding, eol: file.eol },
    savedText: file.text,
    stamp: file.stamp,
    missing: false,
    conflict: false,
    dirty: false,
    textStale: true,
    state,
  });
  if (isActive) {
    const scroll = editor.scrollPosition();
    const previewScroll = preview.scrollTop;
    editor.setState(state, scroll);
    preview.render(file.text);
    preview.scrollTop = previewScroll;
    scrollSync.followEditorSoon();
    updateNotice();
    updateTitle();
  } else {
    updateTabs();
  }
  scheduleSessionSave();
}

/** "Keep mine": the file's newer version on disk is ignored until it changes again. */
async function keepMine(doc: Doc): Promise<void> {
  doc.conflict = false;
  doc.stamp = doc.path ? await platform.fileStamp(doc.path) : null;
  if (doc.stamp === null) markMissing(doc);
  if (doc === active) updateNotice();
  scheduleSessionSave();
}

/** The file was deleted or moved: the tab keeps its text and counts as unsaved. */
function markMissing(doc: Doc): void {
  Object.assign(doc, { missing: true, conflict: false, dirty: true, stamp: null });
  if (doc === active) {
    updateNotice();
    updateTitle();
  } else {
    updateTabs();
  }
  scheduleSessionSave();
}

/** Picks up changes other programs made to the open files. */
async function checkDisk(): Promise<void> {
  const stamps = await Promise.all(
    docs.map((doc) => (doc.path && !doc.missing && !doc.conflict ? platform.fileStamp(doc.path) : undefined)),
  );
  const checked = [...docs];
  for (const [i, doc] of checked.entries()) {
    const stamp = stamps[i];
    if (stamp === undefined || stamp === doc.stamp || !docs.includes(doc)) continue;
    if (stamp === null) {
      markMissing(doc);
    } else if (!doc.dirty) {
      await reloadFromDisk(doc);
    } else {
      doc.conflict = true;
      if (doc === active) updateNotice();
    }
  }
}

function requestDiskCheck(): void {
  if (busy) pendingDiskCheck = true;
  else void exclusive(checkDisk);
}

// ---------- Session memory ----------

let sessionTimer = 0;
let sessionQueue: Promise<void> = Promise.resolve();
// Nothing is stored until the previous session has been restored.
let sessionReady = false;

function scheduleSessionSave(): void {
  if (!sessionReady) return;
  window.clearTimeout(sessionTimer);
  sessionTimer = window.setTimeout(() => void saveSession(), 1000);
}

function storedTab(doc: Doc): StoredTab {
  const state = stateOf(doc);
  const isActive = doc === active;
  return {
    id: doc.id,
    path: doc.path,
    name: doc.name,
    format: doc.format,
    breaks: editor.lineBreaks(state),
    stamp: doc.stamp,
    dirty: doc.dirty,
    scroll: isActive ? editor.scrollPosition() : doc.scroll,
    previewScroll: isActive ? preview.scrollTop : doc.previewScroll,
    selection: { anchor: state.selection.main.anchor, head: state.selection.main.head },
  };
}

/** Stores the tabs and the text of tabs that changed since the last time. */
function saveSession(): Promise<void> {
  window.clearTimeout(sessionTimer);
  if (!sessionReady) return sessionQueue;
  const run = async () => {
    for (const doc of docs) {
      if (!doc.textStale) continue;
      doc.textStale = false;
      try {
        await platform.writeTabText(doc.id, stateOf(doc).doc.toString());
      } catch {
        doc.textStale = true;
      }
    }
    const session: StoredSession = { version: 1, active: docs.indexOf(active), tabs: docs.map(storedTab),
      spell: spell.mode,
      openTypes: [...trustedTypes],
      zoom,
      syncScroll: scrollSync.enabled,
    };
    await platform.writeSession(JSON.stringify(session));
  };
  sessionQueue = sessionQueue.then(run).catch((err) => console.error("Could not store the session", err));
  return sessionQueue;
}

function parseSession(json: string | null): StoredSession | null {
  if (!json) return null;
  try {
    const session = JSON.parse(json) as StoredSession;
    return session.version === 1 && Array.isArray(session.tabs) ? session : null;
  } catch {
    return null;
  }
}

/**
 * Rebuilds a stored tab. Files are read again from disk; the stored text is
 * used for unsaved changes and for files that no longer exist.
 */
async function restoreTab(tab: StoredTab): Promise<Doc | null> {
  const base = { id: tab.id, name: tab.name, scroll: tab.scroll, previewScroll: tab.previewScroll };
  if (!tab.path) {
    const text = (await platform.readTabText(tab.id)) ?? "";
    return makeDoc({ ...base, dirty: text.length > 0, state: editor.createState(text, tab.breaks, tab.selection) });
  }

  let file: OpenedFile;
  try {
    file = await platform.openFile(tab.id, tab.path);
  } catch {
    const text = await platform.readTabText(tab.id);
    if (text === null) return null;
    return makeDoc({
      ...base,
      path: tab.path,
      format: tab.format,
      missing: true,
      dirty: true,
      textStale: false,
      state: editor.createState(text, tab.breaks, tab.selection),
    });
  }

  const changedOnDisk = file.stamp !== tab.stamp;
  const stored = tab.dirty ? await platform.readTabText(tab.id) : null;
  const doc = docFromFile(tab.id, file);
  Object.assign(doc, base, { name: file.name });
  if (stored !== null) {
    doc.state = editor.createState(stored, tab.breaks, tab.selection);
    doc.dirty = isDirty(doc, stored);
    doc.conflict = changedOnDisk && doc.dirty;
    doc.textStale = false;
  } else {
    doc.state = editor.createState(file.text, file.breaks, tab.selection);
    doc.textStale = changedOnDisk || tab.dirty;
  }
  return doc;
}

async function restoreSession(): Promise<number> {
  const session = parseSession(await platform.readSession());
  if (!session) return 0;
  if (isSpellMode(session.spell)) spell.setMode(session.spell);
  applyZoom(validZoom(session.zoom));
  if (typeof session.syncScroll === "boolean") scrollSync.setEnabled(session.syncScroll);
  if (Array.isArray(session.openTypes)) {
    trustedTypes = new Set(session.openTypes.filter((type): type is string => typeof type === "string"));
  }
  const restored = await Promise.all(session.tabs.map((tab) => restoreTab(tab).catch(() => null)));
  const activeTab = session.tabs[session.active];
  docs = restored.filter((doc): doc is Doc => doc !== null);
  const index = docs.findIndex((doc) => doc.id === activeTab?.id);
  return Math.max(0, index);
}

// ---------- Commands ----------

const commands = {
  newFile: () => exclusive(newFile),
  open: () => exclusive(openWithDialog),
  save: () => exclusive(() => save()),
  saveAs: () => exclusive(() => saveAs()),
  closeTab: () => exclusive(() => closeTab()),
  nextTab: () => (busy ? undefined : stepTab(1)),
  previousTab: () => (busy ? undefined : stepTab(-1)),
  exit: () => exclusive(exit),
};

new Menu($<HTMLButtonElement>("#menu-button"), [
  { label: t.newFile, shortcut: "Ctrl+N", run: commands.newFile },
  { label: t.open, shortcut: "Ctrl+O", run: commands.open },
  "separator",
  { label: t.save, shortcut: "Ctrl+S", run: commands.save },
  { label: t.saveAs, shortcut: "Ctrl+Shift+S", run: commands.saveAs },
  "separator",
  { label: t.closeTab, shortcut: "Ctrl+W", run: commands.closeTab },
  { label: t.exit, shortcut: "Ctrl+Q", run: commands.exit },
]);

// ---------- Formatting toolbar ----------

/** Runs a formatting command on the editor. */
const format = (command: (view: typeof editor.view) => void) => () => {
  command(editor.view);
  editor.focus();
};

const formatting = {
  bold: format((view) => toggleInline(view, "bold")),
  italic: format((view) => toggleInline(view, "italic")),
  underline: format((view) => toggleInline(view, "underline")),
  heading: (level: number) => format((view) => setHeading(view, level)),
  bulletList: format((view) => toggleList(view, "bullet")),
  orderedList: format((view) => toggleList(view, "ordered")),
  quote: format(toggleQuote),
  link: format((view) => insertLink(view, t.linkText)),
};

const tablePicker = new TablePicker(
  { columns: 8, rows: 8 },
  { title: t.table, size: t.tableSize },
  (columns, rows) => format((view) => insertTable(view, columns, rows, t.tableColumn))(),
  () => editor.focus(),
);

const headingEntries = () => {
  const current = blockState(editor.state).heading;
  return [1, 2, 3, 4, 5, 0].map((level) => ({
    label: level === 0 ? t.paragraph : t.heading(level),
    shortcut: level === 0 ? undefined : `Ctrl+${level}`,
    checked: current === level,
    run: formatting.heading(level),
  }));
};

// The pressed state of B, I and U, worked out once per editor state.
let inlineCache: { state: EditorState; styles: ReturnType<typeof inlineState> } | null = null;
const inlineStyles = () => {
  if (inlineCache?.state !== editor.state) inlineCache = { state: editor.state, styles: inlineState(editor.state) };
  return inlineCache.styles;
};

const toolbar = new Toolbar(
  $("#toolbar"),
  [
    [
      { kind: "button", label: t.bold, shortcut: "Ctrl+B", icon: icons.bold, run: formatting.bold,
        pressed: () => inlineStyles().bold },
      { kind: "button", label: t.italic, shortcut: "Ctrl+I", icon: icons.italic, run: formatting.italic,
        pressed: () => inlineStyles().italic },
      { kind: "button", label: t.underline, shortcut: "Ctrl+U", icon: icons.underline, run: formatting.underline,
        pressed: () => inlineStyles().underline },
    ],
    [{ kind: "menu", label: t.headingMenu, icon: icons.heading, entries: headingEntries }],
    [
      { kind: "button", label: t.bulletList, icon: icons.bulletList, run: formatting.bulletList,
        pressed: () => blockState(editor.state).list === "bullet" },
      { kind: "button", label: t.orderedList, icon: icons.orderedList, run: formatting.orderedList,
        pressed: () => blockState(editor.state).list === "ordered" },
      { kind: "button", label: t.quote, icon: icons.quote, run: formatting.quote, pressed: () => blockState(editor.state).quote },
    ],
    [
      { kind: "button", label: t.link, shortcut: "Ctrl+K", icon: icons.link, run: formatting.link },
      { kind: "picker", label: t.table, icon: icons.table, open: (anchor, align) => tablePicker.show(anchor, align) },
    ],
  ],
  { toolbar: t.formatting, more: t.more },
  () => editor.focus(),
);

// The pressed state follows the cursor, at most once per frame.
let toolbarFrame = 0;
editor.subscribe(() => {
  if (toolbarFrame) return;
  toolbarFrame = requestAnimationFrame(() => {
    toolbarFrame = 0;
    toolbar.refresh();
  });
});

// Shortcuts use physical key codes so they work on any keyboard layout.
// Alt is excluded because Ctrl+Alt is AltGr on Polish keyboards.
const shortcuts: Record<string, () => void> = {
  KeyN: commands.newFile,
  KeyO: commands.open,
  KeyS: commands.save,
  "Shift+KeyS": commands.saveAs,
  KeyW: commands.closeTab,
  KeyQ: commands.exit,
  Tab: commands.nextTab,
  "Shift+Tab": commands.previousTab,
  PageDown: commands.nextTab,
  PageUp: commands.previousTab,
  KeyB: formatting.bold,
  KeyI: formatting.italic,
  KeyU: formatting.underline,
  KeyK: formatting.link,
  Digit1: formatting.heading(1),
  Digit2: formatting.heading(2),
  Digit3: formatting.heading(3),
  Digit4: formatting.heading(4),
  Digit5: formatting.heading(5),
  // Ctrl+plus is Ctrl+Shift+= on many keyboards, so both spellings count.
  Equal: () => setZoom(stepZoom(zoom, 1)),
  "Shift+Equal": () => setZoom(stepZoom(zoom, 1)),
  NumpadAdd: () => setZoom(stepZoom(zoom, 1)),
  Minus: () => setZoom(stepZoom(zoom, -1)),
  NumpadSubtract: () => setZoom(stepZoom(zoom, -1)),
  Digit0: () => setZoom(DEFAULT_ZOOM),
  Numpad0: () => setZoom(DEFAULT_ZOOM),
};

// Browser shortcuts that make no sense in the app (reload, print, find, …).
const blockedCtrl = new Set(["KeyR", "KeyP", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyL", "KeyT"]);
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

// Ctrl + mouse wheel zooms wherever the pointer is (also over the tab strip).
let zoomWheel = 0;
window.addEventListener(
  "wheel",
  (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    event.stopPropagation();
    if (Math.sign(event.deltaY) !== Math.sign(zoomWheel)) zoomWheel = 0;
    zoomWheel += event.deltaY;
    // One level per notch; touchpads add up small movements.
    if (Math.abs(zoomWheel) >= WHEEL_STEP) {
      setZoom(stepZoom(zoom, zoomWheel < 0 ? 1 : -1));
      zoomWheel = 0;
    }
  },
  { capture: true, passive: false },
);

const spellStatus = $<HTMLButtonElement>("#spell-status");
function updateSpellStatus(): void {
  $("#spell-status-text").textContent = t.spellStatus(spell.mode, spell.dictionaryMissing);
  spellStatus.title = t.spellTitle(spell.dictionaryMissing);
}
updateSpellStatus();
spell.subscribe(updateSpellStatus);
spellStatus.addEventListener("click", () => {
  spell.cycle();
  scheduleSessionSave();
  editor.focus();
});

const syncStatus = $<HTMLButtonElement>("#sync-status");
function updateSyncStatus(): void {
  $("#sync-status-text").textContent = t.syncStatus(scrollSync.enabled);
  syncStatus.title = t.syncTitle(scrollSync.enabled);
}
updateSyncStatus();
syncStatus.addEventListener("click", () => {
  scrollSync.setEnabled(!scrollSync.enabled);
  updateSyncStatus();
  scheduleSessionSave();
  editor.focus();
});

// Scroll positions are part of the session.
editor.view.scrollDOM.addEventListener("scroll", scheduleSessionSave, { passive: true });
$("#preview").addEventListener("scroll", scheduleSessionSave, { passive: true });

/** Files from Explorer (drag and drop) or from another MDE.exe started meanwhile. */
function openRequested(paths: string[]): void {
  if (paths.length === 0) return;
  if (busy) pendingFiles.push(...paths);
  else void exclusive(() => openPaths(paths));
}

void platform.onCloseRequested(() => void commands.exit());
void platform.onFilesDropped(openRequested);
void platform.onOpenFilesRequested(openRequested);
void platform.onWindowFocused(requestDiskCheck);

async function start(): Promise<void> {
  busy = true;
  try {
    const [activeIndex, files] = await Promise.all([restoreSession(), platform.initialFiles()]);
    if (docs.length === 0) docs.push(newDoc());
    activate(docs[activeIndex]);
    updateSyncStatus();
    sessionReady = true;
    await openPaths(files);
    void platform.pruneTabTexts(docs.map((doc) => doc.id));
  } finally {
    busy = false;
  }
  // Show the window only once the dark UI is painted, avoiding a white flash.
  await new Promise(requestAnimationFrame);
  await platform.showWindow();
  editor.focus();
  void saveSession();
  if (pendingFiles.length > 0) openRequested(pendingFiles.splice(0));
}

void start();
