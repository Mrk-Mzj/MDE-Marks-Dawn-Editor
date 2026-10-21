// Hide the console window in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod textfile;

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{State, WebviewUrl, WebviewWindowBuilder};
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
}

fn display_name(path: &Path) -> String {
    path.file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default()
}

fn io_error(err: std::io::Error) -> String {
    format!("io:{err}")
}

#[tauri::command]
fn open_file(doc_id: String, path: String, docs: State<Documents>) -> Result<OpenedFile, String> {
    let path = PathBuf::from(path);
    let bytes = std::fs::read(&path).map_err(io_error)?;
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
    })
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
) -> Result<String, String> {
    let path = PathBuf::from(path);
    let mut docs = docs.0.lock().unwrap();

    let bytes = match docs.get(&doc_id) {
        Some(original) if original.text == text && original.encoding == encoding => original.bytes.clone(),
        _ => textfile::encode(&text, encoding, eol, &breaks).map_err(|e| e.code())?,
    };
    std::fs::write(&path, &bytes).map_err(io_error)?;

    docs.insert(doc_id, Original { text, encoding, bytes });
    Ok(display_name(&path))
}

#[tauri::command]
fn close_document(doc_id: String, docs: State<Documents>) {
    docs.0.lock().unwrap().remove(&doc_id);
}

/// The file passed on the command line, e.g. by Explorer's "Open with".
#[tauri::command]
fn initial_file() -> Option<String> {
    let arg = std::env::args_os().nth(1)?;
    let path = std::path::absolute(PathBuf::from(arg)).ok()?;
    Some(path.to_string_lossy().into_owned())
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
        .plugin(tauri_plugin_dialog::init())
        .manage(Documents::default())
        .invoke_handler(tauri::generate_handler![
            open_file,
            save_file,
            close_document,
            initial_file
        ])
        .setup(|app| {
            WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("MDE")
                .inner_size(1200.0, 800.0)
                .min_inner_size(640.0, 400.0)
                .theme(Some(tauri::Theme::Dark))
                .background_color(tauri::window::Color(10, 10, 10, 255))
                // Shown by the frontend after the first paint to avoid a flash.
                .visible(false)
                .on_navigation(is_app_url)
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MDE");
}
