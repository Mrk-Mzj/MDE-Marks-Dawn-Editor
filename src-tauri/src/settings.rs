//! App-wide settings, shared by every window and every session (the default
//! one and the tab groups): `settings.json` in `%APPDATA%\MDE`. For now it
//! holds the colour scheme only.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager};

use crate::{caption, session};

/// The light colour scheme is on (the dark one is the default).
static LIGHT: AtomicBool = AtomicBool::new(false);

/// Keeps `settings.json` from being read and written by two commands at once.
static FILE: Mutex<()> = Mutex::new(());

fn read() -> serde_json::Map<String, serde_json::Value> {
    session::data_dir()
        .and_then(|dir| std::fs::read(dir.join("settings.json")).ok())
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

/// Reads the settings once, before the first window opens.
pub fn load() {
    LIGHT.store(read().get("theme").and_then(|v| v.as_str()) == Some("light"), Ordering::Relaxed);
}

pub fn light() -> bool {
    LIGHT.load(Ordering::Relaxed)
}

/// What a new window looks like before its page paints: the window theme
/// (tooltips, scroll bars of native parts) and the background (`background`
/// of docs/DESIGN.md: the page).
pub fn window_theme() -> tauri::Theme {
    if light() { tauri::Theme::Light } else { tauri::Theme::Dark }
}

pub fn window_background() -> tauri::window::Color {
    if light() { tauri::window::Color(0xf2, 0xf2, 0xf2, 255) } else { tauri::window::Color(0x1b, 0x1b, 0x1b, 255) }
}

/// Switches every open window to the light (`true`) or dark colour scheme and
/// remembers the choice for all sessions.
#[tauri::command]
pub fn set_theme(light: bool, app: AppHandle) -> Result<(), String> {
    LIGHT.store(light, Ordering::Relaxed);
    for window in app.webview_windows().values() {
        let _ = window.set_theme(Some(window_theme()));
        let _ = window.set_background_color(Some(window_background()));
        if let Ok(hwnd) = window.hwnd() {
            caption::repaint(hwnd);
        }
    }
    let _ = app.emit("theme-changed", light);

    let _guard = FILE.lock().unwrap();
    let mut settings = read();
    settings.insert("theme".into(), (if light { "light" } else { "dark" }).into());
    let dir = session::data_dir().ok_or("APPDATA is not set")?;
    let json = serde_json::to_vec_pretty(&settings).map_err(|e| e.to_string())?;
    session::write_atomic(&dir.join("settings.json"), &json).map_err(session::io_error)
}
