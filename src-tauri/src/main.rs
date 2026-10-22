// Hide the console window in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod session;
mod spell;
mod textfile;

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use textfile::{Encoding, Eol, LineBreak};

/// What a document looked like on disk when it was last opened or saved.
/// Saving unchanged text in the same encoding writes these bytes back.
struct Original {
    text: String,
    encoding: Encoding,
    bytes: Vec<u8>,
}

#[derive(Default)]
struct Documents(Mutex<HashMap<String, Original>>);

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
fn open_file(doc_id: String, path: String, docs: State<Documents>) -> Result<OpenedFile, String> {
    let path = PathBuf::from(path);
    let bytes = std::fs::read(&path).map_err(io_error)?;
    let stamp = std::fs::metadata(&path).map(|m| stamp_of(&m)).unwrap_or_default();
    let decoded = textfile::decode(&bytes).map_err(|e| e.code().to_owned())?;

    docs.0.lock().unwrap().insert(
        doc_id,
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
    docs: State<Documents>,
) -> Result<SavedFile, String> {
    let path = PathBuf::from(path);
    let mut docs = docs.0.lock().unwrap();

    let bytes = match docs.get(&doc_id) {
        Some(original) if original.text == text && original.encoding == encoding => original.bytes.clone(),
        _ => textfile::encode(&text, encoding, eol, &breaks).map_err(|e| e.code())?,
    };
    std::fs::write(&path, &bytes).map_err(io_error)?;
    let stamp = std::fs::metadata(&path).map(|m| stamp_of(&m)).unwrap_or_default();

    docs.insert(doc_id, Original { text, encoding, bytes });
    Ok(SavedFile { name: display_name(&path), stamp })
}

#[tauri::command]
fn close_document(doc_id: String, docs: State<Documents>) {
    docs.0.lock().unwrap().remove(&doc_id);
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

/// Absolute paths of the files named on a command line (without the program itself).
fn file_args(args: impl IntoIterator<Item = std::ffi::OsString>, cwd: &Path) -> Vec<String> {
    args.into_iter()
        .skip(1)
        .filter(|arg| !arg.to_string_lossy().starts_with('-'))
        .map(|arg| std::path::absolute(cwd.join(arg)).unwrap_or_default().to_string_lossy().into_owned())
        .filter(|path| !path.is_empty())
        .collect()
}

/// The files passed on the command line, e.g. by Explorer's "Open with".
#[tauri::command]
fn initial_files() -> Vec<String> {
    let cwd = std::env::current_dir().unwrap_or_default();
    file_args(std::env::args_os(), &cwd)
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

fn main() {
    tauri::Builder::default()
        // Must be the first plugin: a second MDE.exe hands its files over to
        // the running one and exits before anything else starts.
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let files = file_args(args.into_iter().map(Into::into), Path::new(&cwd));
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
            let _ = app.emit("open-files", files);
        }))
        .plugin(tauri_plugin_dialog::init())
        .manage(Documents::default())
        .manage(session::Geometry::default())
        .manage(spell::Worker::start())
        .invoke_handler(tauri::generate_handler![
            open_file,
            save_file,
            close_document,
            file_stamp,
            initial_files,
            spell_check,
            session::read_session,
            session::write_session,
            session::read_tab_text,
            session::write_tab_text,
            session::delete_tab_text,
            session::prune_tab_texts
        ])
        .setup(|app| {
            let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("MDE")
                .inner_size(1200.0, 800.0)
                .min_inner_size(640.0, 400.0)
                .theme(Some(tauri::Theme::Dark))
                .background_color(tauri::window::Color(10, 10, 10, 255))
                // Shown by the frontend after the first paint to avoid a flash.
                .visible(false)
                .on_navigation(is_app_url)
                .build()?;
            session::restore_window(&window);
            let tracked = window.clone();
            window.on_window_event(move |event| {
                if matches!(event, WindowEvent::Moved(_) | WindowEvent::Resized(_)) {
                    session::track_window(&tracked);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MDE");
}
