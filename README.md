# MDE: Mark's "Dawn" Editor

A fast, lightweight editor for text documents and Markdown files on Windows 11. Portable: a single `MDE.exe`, shipped in a ZIP, no installer.

The specification lives in [docs/SPEC.md](docs/SPEC.md) and the visual design in [docs/DESIGN.md](docs/DESIGN.md).

Free and open source under the [GNU GPL v3](LICENSE).

## Screenshots

![One pane: a document with a table and a task list, rendered and editable](docs/screenshots/one-pane.png)

The one-pane mode: the Markdown is rendered as you edit it, with the table, the task list and the headings shown as they will look, and the syntax hidden.

![Two panes: the Markdown source on the left and the preview on the right](docs/screenshots/two-panes.png)

The two-pane mode: the Markdown source on the left and the rendered preview on the right, scrolling together.

![The minimap in the top right corner of the editor panel](docs/screenshots/minimap.png)

The minimap: a small picture of the whole document in the top right corner of the editor, with the visible part highlighted; drag it to scroll.

![The tab groups list open below the button in the top bar](docs/screenshots/tab-groups.png)

Tab groups: saved sets of tabs, each opening in a window of its own, which you can rename or delete right in the list.

The documents in the screenshots are in [docs/samples](docs/samples).

# Download and installation

**[Download MDE.zip](https://github.com/Mrk-Mzj/MDE-Marks-Dawn-Editor/releases/latest/download/MDE.zip)** — the latest version (`MDE.exe` and the license in `LICENSE.txt`). Older versions and the release notes are on the [Releases](https://github.com/Mrk-Mzj/MDE-Marks-Dawn-Editor/releases) page.

There is nothing to install: unpack the ZIP (right-click › *Extract All…*) and put `MDE.exe` anywhere (e.g. a `Programs` folder in your user folder, or a USB stick) and run it. No administrator rights are needed. To open Markdown files with a double click, right-click a `.md` file in Explorer, choose *Open with › Choose another app*, then *Choose an app on your PC* and point to `MDE.exe` (MDE is portable, so it does not register itself).

To uninstall, delete `MDE.exe`, and, if you want to remove your session and settings too, the folders `%APPDATA%\MDE` and `%LOCALAPPDATA%\com.marksdawn.mde`.

## Requirements

- Windows 11, 64-bit (x64; ARM PCs run it through Windows' built-in emulation). Windows 10 with the WebView2 runtime should work too, but it is not tested.
- The Microsoft Edge WebView2 runtime, which comes with Windows 11. If it is missing, MDE says so and offers to open Microsoft's download page.
- Spell checking uses the dictionaries of the languages installed in Windows (*Settings › Time & language › Language & region*). Without a Polish or English language there, MDE works normally but shows *no dictionary* for that language.

## The Windows security warning

The first time you download the ZIP and run `MDE.exe`, Windows (and your browser) may warn you that the file may be unsafe. This is expected.

**Why:** Windows trusts a program when its file is digitally signed with a code signing certificate, which costs a few hundred dollars a year, and when many people have already downloaded it. MDE is a free hobby project without such a certificate and with few downloads, so Microsoft Defender SmartScreen cannot tell who made it and treats it as unknown. The warning does not mean that anything harmful was found in the file. The whole source code is in this repository, so anyone can check what the program does or build `MDE.exe` themselves (see [Building](#building)). Download it only from the [Releases](https://github.com/Mrk-Mzj/MDE-Marks-Dawn-Editor/releases) page of this repository.

**How to run it anyway:**

1. **In the browser** (Microsoft Edge): if the download shows *MDE.zip isn't commonly downloaded*, point to it in the downloads list, click **⋯ › Keep**, then **Show more › Keep anyway**. Other browsers may ask a similar question; choose to keep the file.
2. **In Windows:** when you start the file, a blue window says *Windows protected your PC*. Click **More info**; the publisher shows as *Unknown publisher*. Click **Run anyway**.

Windows remembers the choice, so the warning does not come back for this file. After downloading a new version you may see it again.

If there is no *Run anyway* button (some company or school PCs block unknown programs), right-click `MDE.zip` (before unpacking) or `MDE.exe` in Explorer, choose *Properties*, tick **Unblock** at the bottom of the *General* tab and click *OK*. If that option is missing too, your administrator does not allow such programs.

# Status: 1.1.1

## Features

- **One pane or two.** Edit with the text already formatted and the Markdown syntax hidden, like Notepad does, or edit the source next to a live preview.
- **GitHub Flavored Markdown** with tables, task lists and a whitelist of safe HTML. Every Enter is a line break and blank lines show exactly as they are in the file.
- **Formatting toolbar** and shortcuts: bold, italic, underline, headings, lists, task lists, quotes, tables, links and Windows dictation.
- **Tabs and tab groups.** Tabs can be dragged into a new order; a tab group is a saved set of tabs that opens in a window of its own.
- **Session memory.** Open tabs, unsaved edits, scroll positions, the window and the settings come back after a restart.
- **Minimap**, a small picture of the whole document for finding your way and scrolling.
- **Synchronized scrolling** of the source and the preview.
- **Find** (Ctrl+F) with every match highlighted.
- **Spell checking** in Polish and English, with the dictionaries of Windows.
- **Byte-faithful saving.** The encoding (UTF-8, UTF-16, Windows-1250) and the line endings are kept; a file opened and saved without edits stays identical to the byte.
- **Safe links and HTML.** Web links open in the browser, links to Markdown files in a new tab and other files after a question; nothing in a file is ever executed.
- **Fast and portable**: a single exe of about 5 MB, no installer, starts in about half a second. The interface is Polish or English, following Windows.

| Command | Shortcut |
|---|---|
| New file / Open… / Save / Save as… | Ctrl+N / Ctrl+O / Ctrl+S / Ctrl+Shift+S |
| Find / next / previous match | Ctrl+F / F3 / Shift+F3 |
| Close tab / Exit | Ctrl+W / Ctrl+Q |
| Next / previous tab | Ctrl+Tab / Ctrl+Shift+Tab, Ctrl+PgDn / Ctrl+PgUp |
| Bold / italic / underline | Ctrl+B / Ctrl+I / Ctrl+U |
| Heading 1–5 / link | Ctrl+1 … Ctrl+5 / Ctrl+K |
| Move lines up / down | Alt+↑ / Alt+↓ |
| Open a link (one pane) | Ctrl+click |
| Zoom in / out / 100% | Ctrl+plus / Ctrl+minus / Ctrl+0 (or Ctrl + mouse wheel) |

Every feature is described in detail in [docs/FEATURES.md](docs/FEATURES.md).

## Known limitations

- **Changing the encoding** in the *Save as* dialog (UTF-8 / UTF-8 with BOM) is not available yet; a Windows-1250 file is converted to UTF-8 only when it contains characters Windows-1250 cannot store.
- **Start-up** takes about 0.55–0.65 s from launch to a visible window with the file loaded (the target is under 0.5 s).
- **The minimap in the one-pane mode** draws the Markdown source lines (markers included), not the formatted text.
- **Images are not shown** (by design): a frame with the alt text takes their place, and the image file is not read.

# Building

## Build requirements

- [Rust](https://rustup.rs/) (stable, `x86_64-pc-windows-msvc`)
- Visual Studio Build Tools with the *Desktop development with C++* workload
- [Node.js](https://nodejs.org/) LTS
- WebView2 runtime (preinstalled on Windows 11). If it is missing, MDE shows a dialog (Polish or English, by the Windows UI language) with "Install" (opens Microsoft's installer download) and "Cancel", then exits (`src-tauri/src/runtime_check.rs`).
- Fonts: Segoe UI and Cascadia Mono from Windows; fallbacks are Arial and Consolas / Courier New. The window buttons use Segoe Fluent Icons, else Segoe MDL2 Assets.

## Commands

```bash
npm install
```

Development (hot reload):

```bash
npx tauri dev
```

Release build — the single portable `MDE.exe` lands in `src-tauri/target/release/MDE.exe`:

```bash
npx tauri build
```

The other `mde.exe` files under `target/` (`release/deps/`, `debug/`) are compiler intermediates, not for distribution.

Versions are numbered x.y.z (major.minor.patch); the number lives in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` (the About dialog reads it from there).

Publishing a version: built files are not kept in the repository. MDE is shared as a ZIP holding `MDE.exe` and `LICENSE.txt`; `release/` is ignored by git. Pack it after the build:

```bash
npm run release
```

It writes `release/LICENSE.txt` (`tools/license-txt.mjs`: the text of `LICENSE` with each paragraph on one line and Windows line endings, so it opens in Notepad with a double click and wraps to the window width; the words are unchanged) and packs it with `MDE.exe` into `release/MDE.zip`.

Then create a [GitHub release](https://github.com/Mrk-Mzj/MDE-Marks-Dawn-Editor/releases) with a version tag (e.g. `v1.1.1`) and attach the ZIP under the exact name `MDE.zip`, so the download link at the top of this file (`releases/latest/download/MDE.zip`) always points to the newest version. With the [GitHub CLI](https://cli.github.com/):

```bash
gh release create v1.1.1 release/MDE.zip --title "MDE 1.1.1" --notes "What changed"
```

The app icon comes from `src-tauri/icons/icon.svg`. After changing it, rebuild `icon.ico` (16–256px) and `icon.png` (512px) with `npx tauri icon src-tauri/icons/icon.svg -o <temp folder>` and copy those two files into `src-tauri/icons/`; touch `src-tauri/build.rs` before the next build, or Cargo keeps the old icon in the exe.

Rust tests (encoding and line ending round-trips: UTF-8 ± BOM, UTF-16 LE/BE, Windows-1250, LF/CRLF/CR, mixed endings after edits):

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

# Project structure

```
LICENSE               GNU General Public License v3 (full text)
docs/                 SPEC.md (the specification), DESIGN.md (the visual design),
                      FEATURES.md (every feature in detail),
                      screenshots/ (the README images), samples/ (their documents)
index.html            frontend entry point for Vite (built into the exe, not opened directly)
src/                  frontend (TypeScript)
  main.ts             documents (tabs), commands, shortcuts, zoom, session memory,
                      changes made by other programs
  tabs.ts             tab strip (selecting, closing, dragging, mouse wheel)
  groups.ts           the tab groups button and its list (save, rename, delete, open)
  titlebar.ts         moving the window by the top bar (the window has no system
                      title bar) and the space for the native window buttons
  editor.ts           CodeMirror 6 editor (left panel) and its theme; the editor
                      runs in a shadow root so its styles are not blocked by the CSP;
                      it also tracks line breaks that differ from the dominant style
                      and keeps the GFM syntax tree up to date (used by the toolbar)
  find.ts             find bar (Ctrl+F, F3 / Shift+F3) and the match highlighting in
                      the editor (a CodeMirror plugin); in one pane it searches the visible text
  live.ts             the one-pane mode: hidden Markdown markers, rendered blocks and
                      widgets, cursor movement, Backspace/Delete/Enter, typed formatting
  moveblock.ts        finding and swapping the line / list item to move (Alt+↑/↓)
  spell.ts            spell checking: word finding, answer cache, underlines in the
                      editor (a CodeMirror plugin)
  preview.ts          markdown-it preview (right panel), incl. the blank-lines extension,
                      link clicks and the source-line map of its blocks
  sanitize.ts         whitelist sanitizer for raw HTML
  taskbox.ts          the task-list box (CSS frame, SVG tick), shared by the preview and one pane
  links.ts            which links are followed and how (web, relative, blocked)
  format.ts           formatting commands (bold, headings, lists, quote, link, table);
                      bold/italic/underline work on the GFM syntax tree (@lezer/markdown)
  toolbar.ts          formatting toolbar, its "more" menu, the table size picker and the
                      link address field (one pane)
  zoom.ts             zoom levels and stepping (Ctrl+plus/minus/0, Ctrl+wheel)
  scrollsync.ts       synchronized scrolling of the two panels (matched by source line)
  minimap.ts          minimap of the editor panel (own word wrapping, canvas drawing,
                      dragging the slider)
  menu.ts             drop-down menus (hamburger menu, toolbar menus)
  about.ts            the About dialog (name, version, copyright, license)
  dialog.ts           in-app dialogs (questions and messages)
  platform.ts         Tauri backend, file pickers and the app's questions
  i18n.ts             UI strings (Polish, English)
  styles.css          design tokens and styles (docs/DESIGN.md)
tools/license-txt.mjs the license as LICENSE.txt for the release ZIP
src-tauri/            backend (Rust, Tauri 2)
  src/main.rs         commands: open, save, file stamps, command-line files,
                      opening links (relative path lookup, ShellExecute), starting Windows
                      voice typing (Win+H);
                      single instance; opening windows (default and tab groups)
  src/spell.rs        Windows Spell Checking API on a dedicated COM thread
  src/caption.rs      native minimize / maximize / close buttons over the top bar
  src/context_menu.rs the right-click menu (WebView2 menu trimmed and reordered)
  src/session.rs      session storage in %APPDATA%\MDE (tabs, tab texts, window), one
                      folder per window; the open windows and their groups
  src/groups.rs       tab groups: the list (groups.json), creating, renaming, deleting,
                      opening a group's window
  src/textfile.rs     byte-faithful decoding/encoding (UTF-8, UTF-16, Windows-1250,
                      per-line line endings) + tests
  windows-app-manifest.xml  exe manifest (common controls 6, Windows 10/11 compatibility)
  tauri.conf.json     app config, Content Security Policy
  capabilities/       permissions granted to the frontend
  icons/              app icon: icon.svg (source), icon.ico and icon.png (built from it)
```

# Tech stack

Tauri 2 (Rust + WebView2) with tauri-plugin-single-instance, the `windows` crate (spell checking, opening links), CodeMirror 6 (with the @lezer/markdown parser for the syntax tree), markdown-it, Vite, TypeScript.

# Contributing

This is a personal project; pull requests are not accepted, but bug reports in [Issues](https://github.com/Mrk-Mzj/MDE-Marks-Dawn-Editor/issues) are welcome.

# License

Copyright © 2026 Marek Mazij.

MDE is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 (GPL-3.0-only), as published by the Free Software Foundation. The full text is in [LICENSE](LICENSE).

MDE is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

In short: you may use MDE for any purpose, share it and change it. If you distribute it, or a program based on its code, you must do so under the same license and make the source code available.

The libraries MDE is built with keep their own licenses, all compatible with the GPL v3: Tauri, CodeMirror, markdown-it, @lezer/markdown and the `windows` crate are under MIT or Apache-2.0.
