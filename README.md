# MDE — Mark's Dawn Editor

A fast, lightweight Markdown editor for Windows 11. Portable: a single `MDE.exe`, no installer.

The specification lives in [docs/SPEC.md](docs/SPEC.md) and the visual design in [docs/DESIGN.md](docs/DESIGN.md).

## Status: 0.2

MVP plus tabs, a single instance and session memory.

### Features

- **Two panels**: Markdown source editor on the left, rendered GitHub Flavored Markdown preview on the right. The panels have a fixed 50/50 split and scroll independently (mouse wheel, keyboard, scroll bar). Long lines always wrap; there are no horizontal scroll bars.
- **Live preview**: headings, emphasis, strikethrough, lists, block quotes, code, tables, links and autolinks. MDE extensions beyond GFM (see docs/SPEC.md):
  - every Enter in the file is a line break in the preview, as in the editor;
  - N blank lines between two blocks show as the usual paragraph gap plus N−1 empty lines (two blank lines = one extra line, three = two, …). This applies between top-level blocks and between blocks inside block quotes and list items; blank lines at the start of the document, between list items and inside code blocks keep their GFM meaning. The file itself is never changed.
- **Top bar**: hamburger menu and the tab strip. The top bar always stays visible; only the panels scroll.
- **Tabs**: every open file has a tab with its name (without extension); a dot marks unsaved changes. While the pointer is over a tab, a close button (×) takes the dot's place. A tab closes with the middle mouse button, the × button or Ctrl+W.
  - New and opened files get a new tab on the right. Opening a file that is already open switches to its tab. A lone, empty *Untitled* tab is replaced by the opened file.
  - Tabs can be reordered by dragging. The mouse wheel over the tab strip switches to the previous/next tab (stopping at the first and the last one).
  - When there are too many tabs, they shrink to a minimum width; beyond that the strip shifts so the active tab is always visible.
  - Each tab keeps its own undo history, selection and scroll positions (editor and preview).
  - Closing the last tab leaves a new empty *Untitled* tab.
- **Commands** (menu and shortcuts):

  | Command | Shortcut |
  |---|---|
  | New file | Ctrl+N |
  | Open… | Ctrl+O |
  | Save | Ctrl+S |
  | Save as… | Ctrl+Shift+S |
  | Close tab | Ctrl+W |
  | Next / previous tab | Ctrl+Tab / Ctrl+Shift+Tab, Ctrl+PgDn / Ctrl+PgUp |
  | Exit | Ctrl+Q |

- **Opening files**: Open dialog (several files can be selected), dragging files from Explorer onto the window (each file gets its own tab), or the command line (`MDE.exe file.md`), which makes Explorer's *Open with* work.
- **Single instance**: starting `MDE.exe` again (also with a file) brings the running window to the front and opens the file there in a new tab, or switches to its tab if it is already open.
- **Unsaved changes**: closing a tab with unsaved changes asks whether to save, discard or cancel. Exit (Ctrl+Q or the window's close button) does not ask: unsaved edits stay in the session.
- **Session memory**: the next start restores the open tabs in their order, the active tab, unsaved edits, the scroll positions of both panels, the cursor/selection, and the window's size, position and maximized state (a position on a monitor that is no longer connected is ignored). The session is stored a second after each change and on exit, so a crash loses at most about a second of work.
  - Stored in `%APPDATA%\MDE\`: `session.json` (tabs), `window.json` (window) and `tabs\<id>.txt` (the current text of each open tab). A tab's text is deleted as soon as the tab is closed; leftovers (e.g. after a crash) are removed at the next start.
  - Files are read again from disk at start-up. A tab whose file no longer exists is restored from its stored text and marked with the unsaved-changes dot; Save then asks where to save it (*Save as*).
- **Changes made by other programs** are checked at start-up and whenever the MDE window gets the focus back:
  - a tab without unsaved changes silently reloads the file;
  - a tab with unsaved changes keeps them and shows a bar *“changed by another program”* with a **Refresh** button (*Odśwież*: load the version from disk, dropping the edits) and a close button × (keep the edits and ignore that version; saving overwrites it);
  - a file deleted while open: the tab keeps its text and gets the unsaved-changes dot.
- **Byte-faithful saving**:
  - Encodings: UTF-8 with or without BOM, UTF-16 LE/BE (recognized by their BOM) and Windows-1250. A file is saved in the encoding it was read in, with the same BOM or none. New files use UTF-8 without BOM and LF.
  - Files without a BOM are read as strict UTF-8; if that fails they are read as Windows-1250 and a warning bar is shown above the panels. Every Windows-1250 byte maps to a character, so no byte is ever replaced or lost.
  - If an edited Windows-1250 file contains characters that encoding cannot store (e.g. emoji), saving asks whether to save it in UTF-8 instead; nothing is replaced silently. Cancelling leaves the file on disk untouched.
  - Line endings: LF, CRLF and lone CR are recognized. The file's dominant style is used for new lines (Enter, pasted text). In files with mixed line endings every other line break is remembered and follows its line through edits, so untouched lines keep their original ending; a line break that is deleted and retyped (or restored with undo) gets the dominant style.
  - A trailing newline (or its absence) and trailing spaces are kept.
  - A file opened and saved without edits is byte-identical (UTF-8 with/without BOM, UTF-16, Windows-1250, LF, CRLF, mixed).
  - UTF-16 files with invalid data are refused with a message.
- **Safety**: raw HTML is shown as text and never executed; `javascript:`, `data:`, `file:` and `vbscript:` links are not turned into links; links in the preview are inactive and show their full target on hover; images are not loaded (a frame with the alt text is shown instead); the webview runs under a strict Content Security Policy and cannot navigate away from the app.
- **Interface language**: Polish on Polish Windows, English otherwise.

### Known deviations from the spec in this version

- **Changing the encoding** in the *Save as* dialog (UTF-8 / UTF-8 with BOM) is not available yet; a Windows-1250 file is converted to UTF-8 only when it contains characters Windows-1250 cannot store.
- **Dialogs are native Windows dialogs** (light, not themed). They will be replaced by dark in-app dialogs.
- **Start-up** takes about 0.55–0.65 s from launch to a visible window with the file loaded (target: < 0.5 s).
- WebView2 keeps its browser cache in `%LOCALAPPDATA%\com.marksdawn.mde\`; the session lives in `%APPDATA%\MDE\`.
- Changes by other programs are noticed when the MDE window gets the focus back, not instantly while it is in the foreground.

### Not yet implemented

Resizable panels (and remembering their proportions), zoom, formatting toolbar, minimap, moving paragraphs (Ctrl+↑/↓), Find, the HTML whitelist, clickable links, spell checking.

## Building

### Requirements

- [Rust](https://rustup.rs/) (stable, `x86_64-pc-windows-msvc`)
- Visual Studio Build Tools with the *Desktop development with C++* workload
- [Node.js](https://nodejs.org/) LTS
- WebView2 runtime (preinstalled on Windows 11)

### Commands

```bash
npm install
```

Development (hot reload):

```bash
npx tauri dev
```

Portable build — builds the release and copies the single `MDE.exe` to `portable/MDE.exe` in the repository root (ignored by git). This is the only file to hand out:

```bash
npm run portable
```

`npx tauri build` alone leaves the exe in `src-tauri/target/release/MDE.exe`. The other `mde.exe` files under `target/` (`release/deps/`, `debug/`) are compiler intermediates, not for distribution.

Rust tests (encoding and line ending round-trips: UTF-8 ± BOM, UTF-16 LE/BE, Windows-1250, LF/CRLF/CR, mixed endings after edits):

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

## Project structure

```
index.html            frontend entry point for Vite (built into the exe, not opened directly)
portable/             MDE.exe from `npm run portable` (generated, not in git)
src/                  frontend (TypeScript)
  main.ts             documents (tabs), commands, shortcuts, session memory,
                      changes made by other programs
  tabs.ts             tab strip (selecting, closing, dragging, mouse wheel)
  editor.ts           CodeMirror 6 editor (left panel) and its theme; the editor
                      runs in a shadow root so its styles are not blocked by the CSP;
                      it also tracks line breaks that differ from the dominant style
  preview.ts          markdown-it preview (right panel), incl. the blank-lines extension
  menu.ts             hamburger menu
  platform.ts         Tauri backend and dialogs
  i18n.ts             UI strings (Polish, English)
  styles.css          design tokens and styles (docs/DESIGN.md)
src-tauri/            backend (Rust, Tauri 2)
  src/main.rs         commands: open, save, file stamps, command-line files;
                      single instance; window setup
  src/session.rs      session storage in %APPDATA%\MDE (tabs, tab texts, window)
  src/textfile.rs     byte-faithful decoding/encoding (UTF-8, UTF-16, Windows-1250,
                      per-line line endings) + tests
  tauri.conf.json     app config, Content Security Policy
  capabilities/       permissions granted to the frontend
```

## Tech stack

Tauri 2 (Rust + WebView2) with tauri-plugin-single-instance, CodeMirror 6, markdown-it, Vite, TypeScript.
