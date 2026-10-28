import "./styles.css";

import type { EditorState } from "@codemirror/state";
import { AboutDialog } from "./about";
import { isDialogOpen } from "./dialog";
import { countChars, Editor } from "./editor";
import { FindBar, SearchQuery } from "./find";
import { GroupsPopover } from "./groups";
import type { ScrollPosition, Selection } from "./editor";
import { applyLink, blockState, inlineState, insertLink, insertTable, linkAt, setHeading, toggleInline, toggleList, toggleQuote } from "./format";
import { lang, t } from "./i18n";
import { classifyHref, extensionOf, isMarkdownFile, needsConfirmation } from "./links";
import { Menu } from "./menu";
import { Minimap } from "./minimap";
import * as platform from "./platform";
import type { FileFormat, GroupInfo, LineBreak, OpenedFile } from "./platform";
import { Preview } from "./preview";
import { ScrollSync } from "./scrollsync";
import { isSpellMode, SpellService } from "./spell";
import { Splitter, validSplit } from "./split";
import { TabStrip } from "./tabs";
import { initTitleBar } from "./titlebar";
import { icons, LinkPicker, TablePicker, Toolbar } from "./toolbar";
import type { ToolbarPicker } from "./toolbar";
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
  /** The minimap in the editor panel is shown (an app setting); off when missing. */
  minimap?: boolean;
  /** The editor panel's share of the width, 0–1 (an app setting); 0.5 when missing. */
  split?: number;
  /** One pane with the text rendered, or the editor and the preview (an app setting); one when missing. */
  panes?: number;
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
const search = new SearchQuery();
const editor = new Editor($("#editor"), onEdit, spell, search, { followLink, linkHint: t.linkCtrlClick });
const findBar = new FindBar($("#find"), search, editor.view, {
  find: t.findLabel,
  placeholder: t.findPlaceholder,
  previous: t.findPrevious,
  next: t.findNext,
  close: t.findClose,
  matchCase: t.findMatchCase,
  noResults: t.findNoResults,
  count: t.findCount,
  total: t.findTotal,
});
editor.subscribe(() => findBar.refresh());
const scrollSync = new ScrollSync(editor, preview);
const minimap = new Minimap($("#editor-area"), editor);
// Showing or hiding the minimap changes the width of the text: the editor
// keeps showing the same place, and the preview follows it.
minimap.onReflow(() => {
  const scroll = editor.scrollPosition();
  editor.rescale(scroll);
  scrollSync.followEditorSoon();
});

const splitter = new Splitter($(".workspace"), $(".pane-editor"), $(".pane-preview"), $(".pane-divider"), t.splitterTitle);
splitter.onChange(scheduleSessionSave);

// One pane: the editor shows the text rendered (see live.ts). Two panes: the
// Markdown source and the preview. The same for every tab.
let panes: 1 | 2 = 1;
// The preview is not rendered while it is hidden.
let previewStale = true;

let docs: Doc[] = [];
let active: Doc;
// Prevents overlapping dialogs when shortcuts are pressed repeatedly.
let busy = false;
// Work that arrived while busy (files from another MDE.exe, checking the disk).
let pendingFiles: string[] = [];
let pendingDiskCheck = false;
let pendingGroupDelete = false;
// The tab group this window works on; null for the default window.
let group: platform.Group | null = null;

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
  if (panes === 2) preview.scheduleRender(() => editor.text(), () => scrollSync.followEditor());
  else previewStale = true;
  scheduleSessionSave();
}

/** Renders the active tab in the preview when it is shown. */
function renderPreview(text: string, scrollTop: number): void {
  if (panes === 1) {
    previewStale = true;
    return;
  }
  preview.render(text);
  preview.scrollTop = scrollTop;
  previewStale = false;
}

function updateTabs(): void {
  tabs.update(
    docs.map((doc) => ({ id: doc.id, name: doc.name, tooltip: doc.path ?? doc.name, dirty: doc.dirty })),
    active.id,
  );
}

function updateTitle(): void {
  updateTabs();
  void platform.setWindowTitle(`${active.dirty ? "• " : ""}${active.name} – MDE`);
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
  if (panes === 2) active.previewScroll = preview.scrollTop;
}

function activate(doc: Doc): void {
  if (doc === active) {
    editor.focus();
    return;
  }
  if (active && docs.includes(active)) stash();
  active = doc;
  editor.setState(doc.state, doc.scroll);
  renderPreview(doc.state.doc.toString(), doc.previewScroll);
  scrollSync.linkSoon();
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
  if (pendingGroupDelete) {
    pendingGroupDelete = false;
    await exclusive(closeForGroupDelete);
  } else if (pendingFiles.length > 0) {
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

// ---------- Tab groups ----------

/** Saves this window's tabs as a new group; the window works on it from now on. */
async function createGroup(name: string): Promise<string | null> {
  // Whatever the window worked on so far keeps its tabs as they are now.
  await saveSession();
  try {
    group = await platform.createGroup(name);
  } catch (err) {
    const code = String(err);
    if (code !== "exists" && code !== "empty") await platform.showError(`${t.groupFailed}\n\n${errorText(code)}`);
    return code;
  }
  for (const doc of docs) doc.textStale = true;
  await saveSession();
  updateTitle();
  return null;
}

async function renameGroup(id: string, name: string): Promise<string | null> {
  try {
    await platform.renameGroup(id, name);
    return null;
  } catch (err) {
    return String(err);
  }
}

async function removeGroup(info: GroupInfo): Promise<void> {
  const tabsCount = info.current ? docs.length : info.tabs;
  if (!(await platform.askDeleteGroup(info.name, tabsCount, info.open))) return;
  try {
    await platform.deleteGroup(info.id);
  } catch (err) {
    await platform.showError(`${t.groupFailed}\n\n${errorText(String(err))}`);
  }
}

/**
 * The group of this window is being deleted: asks about unsaved changes as
 * closing the tabs would, then deletes the group with the window. Cancel keeps both.
 */
async function closeForGroupDelete(): Promise<void> {
  for (const doc of [...docs]) {
    if (!doc.dirty || !docs.includes(doc)) continue;
    activate(doc);
    const choice = await platform.askSaveChanges(doc.name);
    if (choice === "cancel" || (choice === "save" && !(await save(doc)))) return;
  }
  // Nothing is stored any more: the group's folder goes away.
  sessionReady = false;
  window.clearTimeout(sessionTimer);
  await sessionQueue;
  await platform.finishDeleteGroup();
}

const groupsPopover = new GroupsPopover(
  $<HTMLButtonElement>("#groups-button"),
  {
    groups: t.groups,
    saveNew: t.groupsSaveNew,
    openIn: t.groupsOpenIn,
    current: t.groupCurrent,
    placeholder: t.groupName,
    tabs: t.groupTabs,
    rename: t.groupRename,
    remove: t.groupDelete,
    exists: t.groupExists,
    cancel: t.cancelButton,
    save: t.saveButton,
  },
  {
    list: () => platform.listGroups(),
    create: createGroup,
    rename: renameGroup,
    open: (id) => void platform.openGroup(id).catch((err) => platform.showError(errorText(String(err)))),
    remove: removeGroup,
    tabCount: () => docs.length,
    closed: () => editor.focus(),
  },
);

async function onGroupsChanged(): Promise<void> {
  if (group) {
    group = await platform.currentGroup();
    if (active) updateTitle();
  }
  await groupsPopover.refresh();
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
    renderPreview(file.text, previewScroll);
    scrollSync.linkSoon();
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
    previewScroll: isActive && panes === 2 ? preview.scrollTop : doc.previewScroll,
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
      minimap: minimap.enabled,
      split: splitter.value,
      panes,
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
  splitter.set(validSplit(session.split));
  if (typeof session.syncScroll === "boolean") scrollSync.setEnabled(session.syncScroll);
  if (typeof session.minimap === "boolean") minimap.setEnabled(session.minimap);
  panes = session.panes === 2 ? 2 : 1;
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
  find: () => findBar.toggle(),
  findNext: () => findBar.step(1),
  findPrevious: () => findBar.step(-1),
  nextTab: () => (busy ? undefined : stepTab(1)),
  previousTab: () => (busy ? undefined : stepTab(-1)),
  exit: () => exclusive(exit),
};

const aboutDialog = new AboutDialog(() => editor.focus());

new Menu($<HTMLButtonElement>("#menu-button"), [
  { label: t.newFile, shortcut: "Ctrl+N", run: commands.newFile },
  { label: t.open, shortcut: "Ctrl+O", run: commands.open },
  "separator",
  { label: t.save, shortcut: "Ctrl+S", run: commands.save },
  { label: t.saveAs, shortcut: "Ctrl+Shift+S", run: commands.saveAs },
  "separator",
  { label: t.find, shortcut: "Ctrl+F", run: () => findBar.open() },
  "separator",
  { label: t.about, run: () => aboutDialog.show() },
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
  taskList: format((view) => toggleList(view, "task")),
  quote: format(toggleQuote),
  link: format((view) => insertLink(view, t.linkText)),
};

// One pane: the address of a link is typed in a field below the link button,
// because the Markdown of the link is hidden.
const linkPicker = new LinkPicker({ title: t.linkAddress, placeholder: t.linkPlaceholder }, () => editor.focus());

function editLink(anchor: HTMLElement, align: "start" | "end"): void {
  if (panes === 2) {
    formatting.link();
    return;
  }
  const { state } = editor;
  const range = state.selection.main;
  const link = linkAt(state, range.from, range.to);
  const url = link ? state.sliceDoc(link.urlFrom, link.urlTo).replace(/^<(.*)>$/, "$1") : "";
  linkPicker.show(anchor, align, url, (address) => format((view) => applyLink(view, address))());
}

const linkItem: ToolbarPicker = { kind: "picker", label: t.link, shortcut: "Ctrl+K", icon: icons.link, open: editLink };

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
      { kind: "menu", label: t.headingMenu, icon: icons.heading, entries: headingEntries },
      { kind: "button", label: t.bulletList, icon: icons.bulletList, run: formatting.bulletList,
        pressed: () => blockState(editor.state).list === "bullet" },
      { kind: "button", label: t.orderedList, icon: icons.orderedList, run: formatting.orderedList,
        pressed: () => blockState(editor.state).list === "ordered" },
      { kind: "button", label: t.taskList, icon: icons.taskList, run: formatting.taskList,
        pressed: () => blockState(editor.state).list === "task" },
      { kind: "button", label: t.quote, icon: icons.quote, run: formatting.quote, pressed: () => blockState(editor.state).quote },
      { kind: "picker", label: t.table, icon: icons.table, open: (anchor, align) => tablePicker.show(anchor, align) },
      linkItem,
      { kind: "button", label: t.dictation, shortcut: "Win+H", icon: icons.mic, run: () => void platform.startDictation() },
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

// The character count follows the text and the selection, at most once per frame.
const charCount = $("#char-count");
const numberFormat = new Intl.NumberFormat(lang);
let charCountFrame = 0;
function updateCharCount(): void {
  const { doc, selection } = editor.view.state;
  const total = countChars(doc, 0, doc.length);
  const selected = selection.ranges.reduce((sum, range) => sum + countChars(doc, range.from, range.to), 0);
  charCount.textContent =
    selected > 0
      ? t.charCountSelected(numberFormat.format(selected), numberFormat.format(total))
      : t.charCount(numberFormat.format(total), total);
}
editor.subscribe(() => {
  if (charCountFrame) return;
  charCountFrame = requestAnimationFrame(() => {
    charCountFrame = 0;
    updateCharCount();
  });
});
updateCharCount();

// Shortcuts use physical key codes so they work on any keyboard layout.
// Alt is excluded because Ctrl+Alt is AltGr on Polish keyboards.
const shortcuts: Record<string, () => void> = {
  KeyN: commands.newFile,
  KeyO: commands.open,
  KeyS: commands.save,
  "Shift+KeyS": commands.saveAs,
  KeyW: commands.closeTab,
  KeyQ: commands.exit,
  KeyF: commands.find,
  Tab: commands.nextTab,
  "Shift+Tab": commands.previousTab,
  PageDown: commands.nextTab,
  PageUp: commands.previousTab,
  KeyB: formatting.bold,
  KeyI: formatting.italic,
  KeyU: formatting.underline,
  KeyK: () => {
    const { anchor, align } = toolbar.anchorOf(linkItem);
    editLink(anchor, align);
  },
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

// Formatting shortcuts, which act on the editor only while it has the focus or no field does.
const editorOnly = new Set(["KeyB", "KeyI", "KeyU", "KeyK", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5"]);
const editorHost = $("#editor");

// Browser shortcuts that make no sense in the app (reload, print, find, …).
const blockedCtrl = new Set(["KeyR", "KeyP", "KeyG", "KeyH", "KeyJ", "KeyL", "KeyT"]);
const blockedPlain = new Set(["F5", "F7", "BrowserBack", "BrowserForward", "BrowserRefresh"]);

window.addEventListener(
  "keydown",
  (event) => {
    // A modal dialog keeps the app's shortcuts (Ctrl+W, F3, …) from acting behind it.
    if (isDialogOpen()) {
      if (blockedPlain.has(event.code) || event.code === "F3" || (event.ctrlKey && blockedCtrl.has(event.code))) {
        event.preventDefault();
      }
      return;
    }
    if (event.code === "F3" && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) commands.findPrevious();
      else commands.findNext();
      return;
    }
    if (blockedPlain.has(event.code)) {
      event.preventDefault();
      return;
    }
    // Escape in the editor also closes the find bar.
    if (event.key === "Escape" && findBar.isOpen && document.activeElement === editorHost) {
      event.preventDefault();
      findBar.close();
      return;
    }
    if (!event.ctrlKey || event.altKey || event.metaKey) return;
    // In the find field, Ctrl+B and the like would format the editor's text unseen.
    if (event.target instanceof HTMLInputElement && editorOnly.has(event.code)) return;
    // While a group's name is typed, Ctrl+W, Ctrl+S and the like stay out of the way.
    if (event.target instanceof Element && event.target.closest(".groups")) return;
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
spellStatus.addEventListener("click", async () => {
  // Without the dictionary, offer to add the language instead of silently switching on.
  if (spell.dictionaryMissing && spell.mode !== "off") {
    const choice = await platform.askMissingDictionary(t.languageName(spell.mode));
    if (choice === "settings") void platform.openLanguageSettings();
    if (choice !== "change") {
      editor.focus();
      return;
    }
  }
  spell.cycle();
  scheduleSessionSave();
  editor.focus();
});

const minimapStatus = $<HTMLButtonElement>("#minimap-status");
function updateMinimapStatus(): void {
  $("#minimap-status-text").textContent = t.minimapStatus(minimap.enabled);
  minimapStatus.title = t.minimapTitle(minimap.enabled);
}
updateMinimapStatus();
minimapStatus.addEventListener("click", () => {
  minimap.setEnabled(!minimap.enabled);
  updateMinimapStatus();
  scheduleSessionSave();
  editor.focus();
});

const panesStatus = $<HTMLButtonElement>("#panes-status");
function updatePanesStatus(): void {
  $("#panes-status-text").textContent = t.panesStatus(panes);
  panesStatus.title = t.panesTitle(panes);
}

/**
 * One pane (the text rendered in the editor) or two (the source and the
 * preview). The editor keeps showing the same place.
 */
function setPanes(count: 1 | 2): void {
  const scroll = editor.scrollPosition();
  panes = count;
  document.documentElement.classList.toggle("single-pane", count === 1);
  editor.setLive(count === 1);
  editor.rescale(scroll);
  if (count === 2 && previewStale && active) renderPreview(editor.text(), active.previewScroll);
  scrollSync.setPaused(count === 1);
  findBar.refresh();
  updatePanesStatus();
  updateSyncStatus();
}

panesStatus.addEventListener("click", () => {
  setPanes(panes === 1 ? 2 : 1);
  scheduleSessionSave();
  editor.focus();
});

// Scrolling together needs both panes: with one it is shown dimmed and does nothing.
const syncStatus = $<HTMLButtonElement>("#sync-status");
function updateSyncStatus(): void {
  $("#sync-status-text").textContent = t.syncStatus(scrollSync.enabled);
  syncStatus.title = panes === 1 ? t.syncUnavailable : t.syncTitle(scrollSync.enabled);
  syncStatus.setAttribute("aria-disabled", String(panes === 1));
}
updateSyncStatus();
syncStatus.addEventListener("click", () => {
  if (panes === 1) {
    editor.focus();
    return;
  }
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
// The top bar itself and the free part of the tab strip move the window.
initTitleBar(
  $(".topbar"),
  (target) => target === $(".topbar") || target === $("#tabs") || target === $(".groups-anchor"),
);
void platform.onGroupsChanged(() => void onGroupsChanged());
void platform.onDeleteGroupRequested(() => {
  if (busy) pendingGroupDelete = true;
  else void exclusive(closeForGroupDelete);
});
void platform.onFilesDropped(openRequested);
void platform.onOpenFilesRequested(openRequested);
void platform.onWindowFocused(requestDiskCheck);

async function start(): Promise<void> {
  busy = true;
  try {
    group = await platform.currentGroup();
    const [activeIndex, files] = await Promise.all([restoreSession(), platform.initialFiles()]);
    if (docs.length === 0) docs.push(newDoc());
    setPanes(panes);
    activate(docs[activeIndex]);
    updatePanesStatus();
    updateSyncStatus();
    updateMinimapStatus();
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
