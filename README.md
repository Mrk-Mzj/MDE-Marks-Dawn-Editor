# MDE — Mark's Dawn Editor

A fast, lightweight Markdown editor for Windows 11. Portable: a single `MDE.exe`, no installer.

The specification lives in [docs/SPEC.md](docs/SPEC.md) and the visual design in [docs/DESIGN.md](docs/DESIGN.md).

## Status: 0.5

MVP plus tabs, a single instance, session memory, spell checking, the HTML whitelist, clickable links and the formatting toolbar.

### Features

- **Two panels**: Markdown source editor on the left, rendered GitHub Flavored Markdown preview on the right. The panels have a fixed 50/50 split and scroll independently (mouse wheel, keyboard, scroll bar). Long lines always wrap; there are no horizontal scroll bars.
- **Live preview**: headings, emphasis, strikethrough, lists, block quotes, code, tables, links and autolinks. MDE extensions beyond GFM (see docs/SPEC.md):
  - every Enter in the file is a line break in the preview, as in the editor;
  - N blank lines between two blocks show as the usual paragraph gap plus N−1 empty lines (two blank lines = one extra line, three = two, …). This applies between top-level blocks and between blocks inside block quotes and list items; blank lines at the start of the document, between list items and inside code blocks keep their GFM meaning. The file itself is never changed.
- **Raw HTML** in a file is cleaned with a whitelist (never executed): `<br>`, `<span>` (only `color` and `background-color`, as plain colors: names, `#hex`, `rgb()`/`hsl()`), `<details>` (with `open`) and `<summary>`, `<sub>`, `<sup>`, `<kbd>` and `<u>` are shown; their other attributes are dropped. `<script>`, `<iframe>`, `<object>`, `<style>`, `<form>` (and a few similar tags) are removed with their content, `on*` attributes never survive, and any other tag is dropped while its text stays. HTML comments disappear. The file itself is never changed.
- **Links** in the preview are clickable (a left click; text selected by dragging is not a click). Hovering shows the full target.
  - `http`, `https` and `mailto` open in the default browser or mail program.
  - Web addresses may skip the scheme when they start with `www.`: both `[wp](www.wp.pl)` and plain text `www.wp.pl` become links to `https://www.wp.pl` (hovering shows the full address). Other addresses need `http://` or `https://`, because `notes.md` or `wp.pl` could just as well be file names (`.md` is also a domain).
  - A relative link to a Markdown file (`.md`, `.markdown`, `.mdown`, `.mkd`) opens it in a new tab (or switches to its tab). Relative paths are counted from the folder of the file; `%20` and the like are decoded; `?query` and `#fragment` are ignored. A file that was never saved has no folder, so such links ask you to save it first.
  - A relative link to any other file opens it in its default Windows program. The first time for each file type MDE asks, with the choice *Open and don't ask for .xxx files* (remembered in the session). Programs, scripts and other risky types (`.exe`, `.bat`, `.cmd`, `.ps1`, `.vbs`, `.msi`, `.lnk`, `.chm`, `.hta`, disk images, …, plus every type Windows itself flags as unsafe via `AssocIsDangerous`), folders and files without an extension are asked about every time.
  - Blocked, shown as plain text: `javascript:`, `data:`, `file:` and any other scheme, drive paths (`C:\…`), rooted and network paths (`/x`, `\\server\x`). Links to `#headings` are inactive.
- **Formatting toolbar** above the editor; its first icon lines up with the left edge of the text. Every action is one undo step and works on the selection (or the line with the cursor):
  - **Bold**, *Italic*, Underline (Ctrl+B / Ctrl+I / Ctrl+U) work like in Word. Formatting is recognized from the Markdown syntax tree (`**…**`/`__…__`, `*…*`/`_…_`, `<u>…</u>`), so markers in inline code, escaped `\*` and `snake_case` words never count:
    - the button shows as pressed when all of the selected text (or the text around the cursor) has the style;
    - clicking it then removes the style even when the markers do not touch the selection: in `**<u>WORD</u>**` with *WORD* selected, Bold leaves `<u>WORD</u>`. Removing it from part of a stretch splits it: *ma* in `**Ala ma kota**` gives `**Ala** ma **kota**`;
    - text that is only partly formatted is formatted as a whole and the markers are merged: `**Ala** ma kota` gives `**Ala ma kota**`;
    - without a selection the cursor acts like a selection of the word it is in: a click inside formatted text removes that formatting, and a click in the middle of an unformatted word formats the whole word (the cursor stays where it was). Next to a space or at the start or end of a line an empty pair of markers is inserted with the cursor inside (clicking again removes it); nothing is inserted right next to other markers or inside code, addresses and HTML tags;
    - a selection over several lines is formatted line by line; spaces at its edges and block markers (`- `, `## `, `> `) stay outside the markers. Formatting spanning several lines of one paragraph is recognized.
  - **Paragraph style** menu: *Heading 1–5* (Ctrl+1 … Ctrl+5) and *Paragraph text*. The current style is checked. Choosing the current heading level again turns the line back into paragraph text; a list item made a heading loses its list marker.
  - **Bulleted list** (`- `), **Numbered list** (`1. `, `2. `, …; numbering continues a numbered list right above) and **Quote** (`> `) toggle on all selected lines; the buttons show as pressed when the line with the cursor already has that format. Empty lines are left alone (inside a quote they get `>` so the quote stays one block).
  - **Link** (Ctrl+K): the selection becomes `[text](url)` with `url` selected for typing; a selected web address goes into the parentheses and the link text is selected instead.
  - **Table**: a grid (up to 8 × 8, mouse or arrow keys + Enter) picks the number of columns and rows (the header row included). The table is inserted below the line with the cursor, separated by empty lines, with the first header cell selected.
  - When the panel is too narrow, the buttons that do not fit move to a *More* (…) menu at the end of the toolbar.
- **Moving paragraphs** (Alt+↑ / Alt+↓): moves the paragraph with the cursor (a block of text between empty lines, e.g. a whole table) one paragraph up or down. Inside a list it moves the single item with its sub-items among the items of the same level; at the edge of the list nothing happens. Empty lines stay where they are, and a selection over several lines of one paragraph or list moves as a whole. The cursor or selection travels with the text, one undo step undoes the move.
- **Zoom**: Ctrl+plus / Ctrl+minus (also the numeric keypad) or Ctrl + mouse wheel (over any part of the window, also the tab strip) scale the text of both panels and Ctrl+0 returns to 100%. The levels are 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 250 and 300%. One wheel notch is one level; touchpads add up small movements. Zoom is a global setting: it applies to every tab and to files opened later, and it is remembered in the session (`zoom` in `session.json`). Each panel keeps showing the same place of the text while zooming. The toolbar, tabs, menus and status bar keep their size.
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
  | Bold / italic / underline | Ctrl+B / Ctrl+I / Ctrl+U |
  | Heading 1–5 | Ctrl+1 … Ctrl+5 |
  | Link | Ctrl+K |
  | Zoom in / out / 100% | Ctrl+plus / Ctrl+minus / Ctrl+0 (or Ctrl + mouse wheel) |

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
- **Safety**: raw HTML is reduced to the whitelist above and never executed; only `http`, `https`, `mailto` and relative links are made into links; images are not loaded (a frame with the alt text is shown instead); the webview runs under a strict Content Security Policy and cannot navigate away from the app. How the sanitizer works: every tag written in the file is renamed (`<u>` → `<raw-u>`) before the page is built, and the result is rebuilt element by element, so only whitelisted elements with whitelisted attributes are ever created from the user's HTML. Colors are applied through the style object because the Content Security Policy forbids `style` attributes.
- **Spell checking** in the editor, using the Windows Spell Checking API (no dictionaries are bundled; they come from the languages installed in Windows):
  - misspelled words get a thin orange underline; only the visible part of the text is checked, so large files stay fast. After an edit the underlines are updated when typing pauses (about half a second), so a word still being typed is not flagged;
  - the status bar at the bottom shows the mode with a page-and-pencil icon (*Spelling: Polish*). Clicking it cycles Polish → English → off. The first mode is the language of Windows (Polish or English); the choice is remembered in the session;
  - if Windows has no dictionary for the chosen language, the status says so (*no dictionary*) and nothing is underlined. A language is added in Windows *Settings › Time & language › Language & region*;
  - not checked: inline code, fenced code blocks, links and addresses, HTML tags, words with digits or underscores, ALL-CAPS acronyms and CamelCase words (e.g. HTML, GitHub), single letters.
- **Interface language**: Polish on Polish Windows, English otherwise.

### Known deviations from the spec in this version

- **Changing the encoding** in the *Save as* dialog (UTF-8 / UTF-8 with BOM) is not available yet; a Windows-1250 file is converted to UTF-8 only when it contains characters Windows-1250 cannot store.
- **Dialogs are native Windows dialogs** (light, not themed). They will be replaced by dark in-app dialogs. The question about opening a linked file offers *Open and don't ask for .xxx files* as a button, because the native dialog has no checkbox.
- **Start-up** takes about 0.55–0.65 s from launch to a visible window with the file loaded (target: < 0.5 s).
- WebView2 keeps its browser cache in `%LOCALAPPDATA%\com.marksdawn.mde\`; the session lives in `%APPDATA%\MDE\`.
- Changes by other programs are noticed when the MDE window gets the focus back, not instantly while it is in the foreground.

### Not yet implemented

Resizable panels (and remembering their proportions), minimap, Find.

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
  main.ts             documents (tabs), commands, shortcuts, zoom, session memory,
                      changes made by other programs
  tabs.ts             tab strip (selecting, closing, dragging, mouse wheel)
  editor.ts           CodeMirror 6 editor (left panel) and its theme; the editor
                      runs in a shadow root so its styles are not blocked by the CSP;
                      it also tracks line breaks that differ from the dominant style
                      and keeps the GFM syntax tree up to date (used by the toolbar)
  moveblock.ts        finding and swapping the paragraph / list item to move (Alt+↑/↓)
  spell.ts            spell checking: word finding, answer cache, underlines in the
                      editor (a CodeMirror plugin)
  preview.ts          markdown-it preview (right panel), incl. the blank-lines extension
                      and link clicks
  sanitize.ts         whitelist sanitizer for raw HTML
  links.ts            which links are followed and how (web, relative, blocked)
  format.ts           formatting commands (bold, headings, lists, quote, link, table);
                      bold/italic/underline work on the GFM syntax tree (@lezer/markdown)
  toolbar.ts          formatting toolbar, its "more" menu and the table size picker
  zoom.ts             zoom levels and stepping (Ctrl+plus/minus/0, Ctrl+wheel)
  menu.ts             drop-down menus (hamburger menu, toolbar menus)
  platform.ts         Tauri backend and dialogs
  i18n.ts             UI strings (Polish, English)
  styles.css          design tokens and styles (docs/DESIGN.md)
src-tauri/            backend (Rust, Tauri 2)
  src/main.rs         commands: open, save, file stamps, command-line files,
                      opening links (relative path lookup, ShellExecute);
                      single instance; window setup
  src/spell.rs        Windows Spell Checking API on a dedicated COM thread
  src/session.rs      session storage in %APPDATA%\MDE (tabs, tab texts, window)
  src/textfile.rs     byte-faithful decoding/encoding (UTF-8, UTF-16, Windows-1250,
                      per-line line endings) + tests
  tauri.conf.json     app config, Content Security Policy
  capabilities/       permissions granted to the frontend
```

## Tech stack

Tauri 2 (Rust + WebView2) with tauri-plugin-single-instance, the `windows` crate (spell checking, opening links), CodeMirror 6 (with the @lezer/markdown parser for the syntax tree), markdown-it, Vite, TypeScript.
