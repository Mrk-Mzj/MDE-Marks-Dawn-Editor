// Hide the console window in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod caption;
mod context_menu;
mod groups;
mod runtime_check;
mod session;
mod settings;
mod spell;
mod textfile;

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use std::sync::atomic::{AtomicUsize, Ordering};

use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};
use textfile::{Encoding, Eol, LineBreak};

/// What a document looked like on disk when it was last opened or saved.
/// Saving unchanged text in the same encoding writes these bytes back.
struct Original {
    text: String,
    encoding: Encoding,
    bytes: Vec<u8>,
}

/// By window label and document id: two windows may open the same file.
#[derive(Default)]
struct Documents(Mutex<HashMap<(String, String), Original>>);

#[derive(Serialize)]
struct OpenedFile {
    path: String,
    name: String,
    text: String,
    encoding: Encoding,
    eol: Eol,
    /// Line breaks that differ from `eol` (files with mixed line endings).
    breaks: Vec<LineBreak>,
    /// Identifies this version of the file on disk; see `file_stamp`.
    stamp: String,
}

#[derive(Serialize)]
struct SavedFile {
    name: String,
    stamp: String,
}

/// Modification time and size: changes when another program writes the file.
fn stamp_of(meta: &std::fs::Metadata) -> String {
    let modified = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map_or(0, |d| d.as_nanos());
    format!("{modified}-{}", meta.len())
}

fn display_name(path: &Path) -> String {
    path.file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default()
}

fn io_error(err: std::io::Error) -> String {
    if err.kind() == std::io::ErrorKind::NotFound {
        return "not_found".to_owned();
    }
    format!("io:{err}")
}

#[tauri::command]
fn open_file(doc_id: String, path: String, window: WebviewWindow, docs: State<Documents>) -> Result<OpenedFile, String> {
    let path = PathBuf::from(path);
    let bytes = std::fs::read(&path).map_err(io_error)?;
    let stamp = std::fs::metadata(&path).map(|m| stamp_of(&m)).unwrap_or_default();
    let decoded = textfile::decode(&bytes).map_err(|e| e.code().to_owned())?;

    docs.0.lock().unwrap().insert(
        (window.label().to_owned(), doc_id),
        Original {
            text: decoded.text.clone(),
            encoding: decoded.encoding,
            bytes,
        },
    );
    Ok(OpenedFile {
        name: display_name(&path),
        path: path.to_string_lossy().into_owned(),
        text: decoded.text,
        encoding: decoded.encoding,
        eol: decoded.eol,
        breaks: decoded.breaks,
        stamp,
    })
}

/// The current stamp of a file, or `None` when it no longer exists.
#[tauri::command]
fn file_stamp(path: String) -> Option<String> {
    std::fs::metadata(path).ok().map(|m| stamp_of(&m))
}

#[tauri::command]
fn save_file(
    doc_id: String,
    path: String,
    text: String,
    encoding: Encoding,
    eol: Eol,
    breaks: Vec<LineBreak>,
    window: WebviewWindow,
    docs: State<Documents>,
) -> Result<SavedFile, String> {
    let path = PathBuf::from(path);
    let key = (window.label().to_owned(), doc_id);
    let mut docs = docs.0.lock().unwrap();

    let bytes = match docs.get(&key) {
        Some(original) if original.text == text && original.encoding == encoding => original.bytes.clone(),
        _ => textfile::encode(&text, encoding, eol, &breaks).map_err(|e| e.code())?,
    };
    std::fs::write(&path, &bytes).map_err(io_error)?;
    let stamp = std::fs::metadata(&path).map(|m| stamp_of(&m)).unwrap_or_default();

    docs.insert(key, Original { text, encoding, bytes });
    Ok(SavedFile { name: display_name(&path), stamp })
}

#[tauri::command]
fn close_document(doc_id: String, window: WebviewWindow, docs: State<Documents>) {
    docs.0.lock().unwrap().remove(&(window.label().to_owned(), doc_id));
}

/// The words that are misspelled in `lang` ("pl" or "en"), or `None` when
/// Windows has no dictionary for it. An empty list only probes the dictionary.
#[tauri::command]
async fn spell_check(lang: String, words: Vec<String>, worker: State<'_, spell::Worker>) -> Result<Option<Vec<String>>, String> {
    let worker = worker.inner().clone();
    tauri::async_runtime::spawn_blocking(move || worker.check(&lang, words))
        .await
        .map_err(|e| e.to_string())?
}

#[derive(Serialize)]
struct LinkTarget {
    path: String,
    /// "file" or "dir".
    kind: &'static str,
    /// Windows considers the file type unsafe; see `is_dangerous_type`.
    dangerous: bool,
}

/// Where a relative link in the file `document` points, or `None` when nothing is there.
#[tauri::command]
fn resolve_link(document: String, relative: String) -> Option<LinkTarget> {
    link_target(Path::new(&document).parent()?.join(relative))
}

fn link_target(path: PathBuf) -> Option<LinkTarget> {
    let target = std::path::absolute(path).ok()?;
    let meta = std::fs::metadata(&target).ok()?;
    Some(LinkTarget {
        dangerous: meta.is_file() && is_dangerous_type(&target),
        path: target.to_string_lossy().into_owned(),
        kind: if meta.is_dir() { "dir" } else { "file" },
    })
}

/// Where an Obsidian wikilink `[[name]]` in the file `document` points, or
/// `None` when there is no such file. Searching a large vault takes a moment,
/// so it runs off the main thread.
#[tauri::command]
async fn resolve_wikilink(document: String, name: String) -> Option<LinkTarget> {
    tauri::async_runtime::spawn_blocking(move || find_wikilink(Path::new(&document), &name))
        .await
        .ok()
        .flatten()
}

/// Like Obsidian: `[[Note]]` is `Note.md` (a name with another extension,
/// `[[report.pdf]]`, is that file). It is looked for next to the document
/// first, then anywhere in the document's vault (the nearest folder above it
/// that holds `.obsidian`), where `[[Folder/Note]]` matches the end of a path
/// and the shortest matching path wins.
fn find_wikilink(document: &Path, name: &str) -> Option<LinkTarget> {
    let folder = document.parent()?;
    let name = name.replace('\\', "/");
    let mut candidates = Vec::new();
    if Path::new(&name).extension().is_some() {
        candidates.push(name.clone());
    }
    candidates.push(format!("{name}.md"));

    for candidate in &candidates {
        let path = folder.join(candidate);
        if path.is_file() {
            return link_target(path);
        }
    }

    let vault = folder.ancestors().find(|dir| dir.join(".obsidian").is_dir())?;
    let wanted: Vec<String> = candidates.iter().map(|c| c.to_lowercase()).collect();
    let mut best: Option<(usize, String, PathBuf)> = None;
    // Folders still to look into, relative to the vault ("" is the vault itself).
    let mut pending = vec![(vault.to_path_buf(), String::new())];
    // A bound on the work, so a vault on a huge drive cannot hang the search.
    let mut budget = 200_000usize;
    'search: while let Some((dir, relative)) = pending.pop() {
        let Ok(entries) = std::fs::read_dir(&dir) else { continue };
        for entry in entries.flatten() {
            let Some(left) = budget.checked_sub(1) else { break 'search };
            budget = left;
            let file_name = entry.file_name().to_string_lossy().into_owned();
            // `.obsidian`, `.trash`, `.git`: Obsidian does not link into hidden folders.
            if file_name.starts_with('.') {
                continue;
            }
            // Links (symbolic or junctions) are not followed, so the search cannot loop.
            let Ok(kind) = entry.file_type() else { continue };
            let path_in_vault = if relative.is_empty() { file_name.clone() } else { format!("{relative}/{file_name}") };
            if kind.is_dir() {
                pending.push((entry.path(), path_in_vault));
                continue;
            }
            if !kind.is_file() {
                continue;
            }
            let lower = path_in_vault.to_lowercase();
            let matches = wanted.iter().any(|w| lower == *w || lower.ends_with(&format!("/{w}")));
            if !matches {
                continue;
            }
            let depth = path_in_vault.matches('/').count();
            if best.as_ref().map_or(true, |(d, p, _)| (depth, &lower) < (*d, p)) {
                best = Some((depth, lower, entry.path()));
            }
        }
    }
    link_target(best?.2)
}

/// Whether Windows itself treats the file's type as unsafe to open (programs,
/// scripts, shortcuts, …), the list behind its "Open File - Security Warning".
fn is_dangerous_type(path: &Path) -> bool {
    use windows::core::HSTRING;
    use windows::Win32::UI::Shell::AssocIsDangerous;

    let Some(extension) = path.extension() else { return true };
    let extension = format!(".{}", extension.to_string_lossy());
    // SAFETY: a plain Win32 call with a string that outlives it.
    unsafe { AssocIsDangerous(&HSTRING::from(extension)).as_bool() }
}

/// Opens a file or address with the program Windows has registered for it.
fn shell_open(target: &str) -> Result<(), String> {
    use windows::core::{w, HSTRING, PCWSTR};
    use windows::Win32::System::Com::{CoInitializeEx, COINIT_APARTMENTTHREADED, COINIT_DISABLE_OLE1DDE};
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    // SAFETY: plain Win32 calls with strings that outlive them.
    let result = unsafe {
        // Some handlers need COM; an already initialized thread is fine.
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE);
        ShellExecuteW(None, w!("open"), &HSTRING::from(target), PCWSTR::null(), PCWSTR::null(), SW_SHOWNORMAL)
    };
    // Values above 32 mean success.
    if result.0 as isize > 32 {
        Ok(())
    } else {
        Err(format!("shell:{}", result.0 as isize))
    }
}

/// Opens the Windows page where languages (and with them spell checking
/// dictionaries) are added.
#[tauri::command]
fn open_language_settings() -> Result<(), String> {
    shell_open("ms-settings:regionlanguage")
}

/// Only web and mail addresses may be handed to Windows.
fn is_openable_url(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    let allowed = ["http://", "https://", "mailto:"].iter().any(|scheme| lower.starts_with(scheme));
    // The preview percent-encodes links, so spaces and quotes never belong
    // here; refusing them keeps the address a single argument for the browser.
    let plain = url.chars().all(|c| c.is_ascii_graphic() && !"\"<>\\^`{|}".contains(c));
    allowed && plain
}

/// Opens a link to the web or a mail address in the default program.
#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    if !is_openable_url(&url) {
        return Err("blocked".to_owned());
    }
    tauri::async_runtime::spawn_blocking(move || shell_open(&url)).await.map_err(|e| e.to_string())?
}

/// Opens an existing file or folder in the default Windows program. The
/// frontend asks the user first where that is needed.
#[tauri::command]
async fn open_path(path: String) -> Result<(), String> {
    if !Path::new(&path).is_absolute() {
        return Err("blocked".to_owned());
    }
    if !Path::new(&path).exists() {
        return Err("not_found".to_owned());
    }
    tauri::async_runtime::spawn_blocking(move || shell_open(&path)).await.map_err(|e| e.to_string())?
}

/// Dims the native window buttons while the page shows a modal dialog, like
/// the dialog's backdrop dims the rest of the window.
#[tauri::command]
fn set_caption_dimmed(dimmed: bool, window: tauri::WebviewWindow) {
    if let Ok(hwnd) = window.hwnd() {
        caption::set_dimmed(hwnd, dimmed);
    }
}

/// Starts Windows voice typing (Dictation) for the focused text field by
/// pressing Win+H, the same shortcut as the Dictation item of the right-click menu.
#[tauri::command]
fn start_dictation() -> Result<(), String> {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
        VIRTUAL_KEY, VK_H, VK_LWIN,
    };
    let key = |vk: VIRTUAL_KEY, flags: KEYBD_EVENT_FLAGS| INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 { ki: KEYBDINPUT { wVk: vk, wScan: 0, dwFlags: flags, time: 0, dwExtraInfo: 0 } },
    };
    let inputs = [
        key(VK_LWIN, KEYBD_EVENT_FLAGS(0)),
        key(VK_H, KEYBD_EVENT_FLAGS(0)),
        key(VK_H, KEYEVENTF_KEYUP),
        key(VK_LWIN, KEYEVENTF_KEYUP),
    ];
    // SAFETY: `inputs` is a valid array of INPUT structures for the whole call.
    let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };
    if sent as usize == inputs.len() {
        Ok(())
    } else {
        Err("send_input".to_owned())
    }
}

/// Absolute paths of the files named on a command line (without the program itself).
fn file_args(args: impl IntoIterator<Item = std::ffi::OsString>, cwd: &Path) -> Vec<String> {
    args.into_iter()
        .skip(1)
        .filter(|arg| !arg.to_string_lossy().starts_with('-'))
        .map(|arg| std::path::absolute(cwd.join(arg)).unwrap_or_default().to_string_lossy().into_owned())
        .filter(|path| !path.is_empty())
        .collect()
}

/// The files the window was opened with: the command line of the first
/// window (e.g. Explorer's "Open with") or of a later MDE.exe.
#[tauri::command]
fn initial_files(window: WebviewWindow, registry: State<session::Registry>) -> Vec<String> {
    registry.0.lock().unwrap().get_mut(window.label()).map(|entry| std::mem::take(&mut entry.files)).unwrap_or_default()
}

/// Only the app's own pages may load in the webview; links in the preview
/// must never navigate it.
fn is_app_url(url: &tauri::Url) -> bool {
    match url.host_str() {
        Some("tauri.localhost") => true,
        Some("localhost") => cfg!(debug_assertions),
        _ => url.scheme() == "tauri",
    }
}

/// Unminimizes the window and gives it the focus.
fn bring_to_front(window: &WebviewWindow) {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

fn install_native(window: &WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    caption::install(window.hwnd()?)?;
    context_menu::install(window)?;
    Ok(())
}

/// Opens a window for the default session (`group` is `None`) or a tab
/// group; its page opens `files` once it has started.
fn open_window(app: &AppHandle, group: Option<String>, files: Vec<String>) -> Result<(), Box<dyn std::error::Error>> {
    static NEXT: AtomicUsize = AtomicUsize::new(0);
    let n = NEXT.fetch_add(1, Ordering::Relaxed);
    let label = if n == 0 { "main".to_owned() } else { format!("window-{n}") };
    // Registered first: the page asks for its session as soon as it starts.
    app.state::<session::Registry>()
        .0
        .lock()
        .unwrap()
        .insert(label.clone(), session::WindowEntry { group: group.clone(), files, ..Default::default() });

    let window = WebviewWindowBuilder::new(app, &label, WebviewUrl::default())
        .title("MDE")
        // The UI language follows the Windows display language, the same
        // source as the native strings (the webview's own language can differ).
        .initialization_script(if runtime_check::ui_is_polish() {
            "window.__MDE_LANG__ = 'pl';"
        } else {
            "window.__MDE_LANG__ = 'en';"
        })
        // The colour scheme is app-wide (src/settings.rs); the page applies it
        // before its first paint.
        .initialization_script(if settings::light() {
            "window.__MDE_THEME__ = 'light';"
        } else {
            "window.__MDE_THEME__ = 'dark';"
        })
        .inner_size(1200.0, 800.0)
        .min_inner_size(640.0, 400.0)
        .theme(Some(settings::window_theme()))
        // The top bar replaces the title bar: the frontend draws the tabs,
        // src/caption.rs the window buttons. Windows keeps the shadow,
        // rounded corners and resize borders.
        .decorations(false)
        .shadow(true)
        .background_color(settings::window_background())
        // Shown by the frontend after the first paint to avoid a flash.
        .visible(false)
        .on_navigation(is_app_url)
        .build()?;
    session::restore_window(&window, group.as_deref());
    // The window buttons and the context menu belong to the thread of the
    // window (the main one); a window may be opened from another thread.
    let native = window.clone();
    window.run_on_main_thread(move || {
        if let Err(err) = install_native(&native) {
            eprintln!("Could not set up the window: {err}");
        }
    })?;
    let tracked = window.clone();
    window.on_window_event(move |event| match event {
        WindowEvent::Moved(_) | WindowEvent::Resized(_) => session::track_window(&tracked),
        WindowEvent::Destroyed => {
            let label = tracked.label().to_owned();
            tracked.state::<session::Registry>().0.lock().unwrap().remove(&label);
            tracked.state::<Documents>().0.lock().unwrap().retain(|(window, _), _| *window != label);
        }
        _ => {}
    });
    Ok(())
}

fn main() {
    if !runtime_check::ensure_webview2() {
        return;
    }
    settings::load();
    tauri::Builder::default()
        // Must be the first plugin: a second MDE.exe hands its files over to
        // the running one and exits before anything else starts.
        // A later MDE.exe always goes to the default window, which is opened
        // (with its session) when it is closed.
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let files = file_args(args.into_iter().map(Into::into), Path::new(&cwd));
            let open = app.state::<session::Registry>().window_of(None).and_then(|label| app.get_webview_window(&label));
            if let Some(window) = open {
                bring_to_front(&window);
                let _ = app.emit_to(window.label(), "open-files", files);
            } else {
                let app = app.clone();
                // Not built inside this callback, which runs on the event loop.
                tauri::async_runtime::spawn(async move {
                    if let Err(err) = open_window(&app, None, files) {
                        eprintln!("Could not open the window: {err}");
                    }
                });
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .manage(Documents::default())
        .manage(session::Registry::default())
        .manage(spell::Worker::start())
        .invoke_handler(tauri::generate_handler![
            open_file,
            save_file,
            close_document,
            file_stamp,
            initial_files,
            resolve_link,
            resolve_wikilink,
            open_url,
            open_path,
            start_dictation,
            set_caption_dimmed,
            open_language_settings,
            spell_check,
            settings::set_theme,
            session::read_session,
            session::write_session,
            session::read_tab_text,
            session::write_tab_text,
            session::delete_tab_text,
            session::prune_tab_texts,
            groups::list_groups,
            groups::current_group,
            groups::create_group,
            groups::rename_group,
            groups::delete_group,
            groups::finish_delete_group,
            groups::open_group
        ])
        .setup(|app| {
            let cwd = std::env::current_dir().unwrap_or_default();
            open_window(app.handle(), None, file_args(std::env::args_os(), &cwd))?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MDE");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_web_and_mail_addresses_are_opened() {
        assert!(is_openable_url("https://example.com/a?b=1#c"));
        assert!(is_openable_url("HTTP://example.com"));
        assert!(is_openable_url("mailto:a@b.pl"));
        for url in [
            "file:///C:/Windows/notepad.exe",
            "javascript:alert(1)",
            "ms-settings:display",
            "\\\\server\\share",
            "C:\\Windows\\notepad.exe",
            "https://example.com/\" --flag",
            "https://example.com/a b",
            "https://example.com/\n",
            "https://example.com/ą",
        ] {
            assert!(!is_openable_url(url), "{url}");
        }
    }

    #[test]
    fn windows_flags_programs_as_dangerous() {
        for name in ["a.exe", "a.BAT", "a.lnk", "a.ps1", "a.hta", "noextension"] {
            assert!(is_dangerous_type(Path::new(name)), "{name}");
        }
        for name in ["a.txt", "a.pdf", "a.md"] {
            assert!(!is_dangerous_type(Path::new(name)), "{name}");
        }
    }

    #[test]
    fn wikilinks_are_found_next_to_the_note_and_in_the_vault() {
        let vault = std::env::temp_dir().join(format!("mde-vault-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&vault);
        for dir in [".obsidian", ".trash", "Notes/Deep", "Other", "Notes/Deep/Deeper"] {
            std::fs::create_dir_all(vault.join(dir)).unwrap();
        }
        for file in [
            "Notes/Start.md",
            "Notes/Sibling.md",
            "Other/Far.md",
            "Notes/Deep/Twice.md",
            "Notes/Deep/Deeper/Twice.md",
            "Other/report.pdf",
            ".trash/Hidden.md",
        ] {
            std::fs::write(vault.join(file), "").unwrap();
        }
        let start = vault.join("Notes/Start.md");
        let found = |name: &str| find_wikilink(&start, name).map(|t| t.path.replace('\\', "/"));
        let ends = |name: &str, tail: &str| found(name).is_some_and(|p| p.ends_with(tail));

        assert!(ends("Sibling", "/Notes/Sibling.md"));
        assert!(ends("far", "/Other/Far.md"), "case does not matter");
        assert!(ends("Twice", "/Notes/Deep/Twice.md"), "the shortest path wins");
        assert!(ends("Deeper/Twice", "/Deeper/Twice.md"));
        assert!(ends("report.pdf", "/Other/report.pdf"));
        assert_eq!(found("Hidden"), None, "hidden folders are skipped");
        assert_eq!(found("Missing"), None);
        // Outside a vault only the note's own folder counts.
        std::fs::remove_dir_all(vault.join(".obsidian")).unwrap();
        assert_eq!(found("Far"), None);
        assert!(ends("Sibling", "/Notes/Sibling.md"));
        let _ = std::fs::remove_dir_all(&vault);
    }
}
