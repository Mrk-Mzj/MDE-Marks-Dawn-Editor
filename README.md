# MDE — Mark's Dawn Editor

A fast, lightweight Markdown editor for Windows 11. Portable: a single `MDE.exe`, no installer.

The specification lives in [docs/SPEC.md](docs/SPEC.md) and the visual design in [docs/DESIGN.md](docs/DESIGN.md).

## Status: MVP (0.1)

The first, smallest working version. One document at a time.

### Features

- **Two panels**: Markdown source editor on the left, rendered GitHub Flavored Markdown preview on the right. The panels have a fixed 50/50 split and scroll independently (mouse wheel, keyboard, scroll bar). Long lines always wrap; there are no horizontal scroll bars.
- **Live preview**: headings, emphasis, strikethrough, lists, block quotes, code, tables, links and autolinks. Every Enter in the file is a line break in the preview, as in the editor (an MDE extension beyond GFM; see docs/SPEC.md).
- **Top bar**: hamburger menu and the file name (without extension); a dot marks unsaved changes. The top bar always stays visible; only the panels scroll.
- **Commands** (menu and shortcuts):

  | Command | Shortcut |
  |---|---|
  | New file | Ctrl+N |
  | Open… | Ctrl+O |
  | Save | Ctrl+S |
  | Save as… | Ctrl+Shift+S |
  | Exit | Ctrl+Q |

- **Opening files**: Open dialog, dragging a file from Explorer onto the window, or the command line (`MDE.exe file.md`), which makes Explorer's *Open with* work.
- **Unsaved changes**: New file, Open and Exit (including the window's close button) ask whether to save, discard or cancel.
- **Byte-faithful saving**:
  - UTF-8 with or without BOM; the BOM is kept as it was.
  - LF or CRLF line endings; the file's dominant style is kept. New files use UTF-8 without BOM and LF.
  - A trailing newline (or its absence) and trailing spaces are kept.
  - A file opened and saved without edits is byte-identical, including files with mixed line endings.
  - Files that are not valid UTF-8 (e.g. Windows-1250) or are UTF-16 are refused with a message; bytes are never silently replaced.
- **Safety**: raw HTML is shown as text and never executed; `javascript:`, `data:`, `file:` and `vbscript:` links are not turned into links; links in the preview are inactive and show their full target on hover; images are not loaded (a frame with the alt text is shown instead); the webview runs under a strict Content Security Policy and cannot navigate away from the app.
- **Interface language**: Polish on Polish Windows, English otherwise.

### Known deviations from the spec in this version

- **Exit asks about unsaved changes.** The spec keeps unsaved edits in the session instead; the prompt will go away when session memory is added.
- **Mixed line endings**: a file with mixed line endings is saved with its dominant style once it has been edited (unedited files stay byte-identical).
- **Dialogs are native Windows dialogs** (light, not themed). They will be replaced by dark in-app dialogs.
- **Start-up** takes about 0.55–0.65 s from launch to a visible window with the file loaded (target: < 0.5 s).
- WebView2 keeps its browser cache in `%LOCALAPPDATA%\com.marksdawn.mde\`; the app itself stores no settings yet.

### Not yet implemented

Tabs, single instance, session memory, resizable panels, zoom, formatting toolbar, minimap, moving paragraphs (Ctrl+↑/↓), Find, the multiple-blank-lines extension (N blank lines are still shown as one paragraph gap), the HTML whitelist, clickable links, UTF-16 and Windows-1250, external file change detection, spell checking.

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

Release build — produces the portable `src-tauri/target/release/MDE.exe`:

```bash
npx tauri build
```

Rust tests (file encoding and line ending round-trips):

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

## Project structure

```
index.html            app shell
src/                  frontend (TypeScript)
  main.ts             document state, commands, shortcuts
  editor.ts           CodeMirror 6 editor (left panel) and its theme; the editor
                      runs in a shadow root so its styles are not blocked by the CSP
  preview.ts          markdown-it preview (right panel)
  menu.ts             hamburger menu
  platform.ts         Tauri backend and dialogs
  i18n.ts             UI strings (Polish, English)
  styles.css          design tokens and styles (docs/DESIGN.md)
src-tauri/            backend (Rust, Tauri 2)
  src/main.rs         commands: open, save, initial file; window setup
  src/textfile.rs     byte-faithful decoding/encoding + tests
  tauri.conf.json     app config, Content Security Policy
  capabilities/       permissions granted to the frontend
```

## Tech stack

Tauri 2 (Rust + WebView2), CodeMirror 6, markdown-it, Vite, TypeScript.
