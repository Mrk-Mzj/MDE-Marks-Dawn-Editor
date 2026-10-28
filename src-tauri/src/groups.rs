//! Tab groups: saved sets of tabs, each opened in a window of its own (like
//! the workspaces of Edge). The list is `groups.json` in `%APPDATA%\MDE`,
//! newest first; each group's session lives in `groups\<id>` (src/session.rs).

use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};

use crate::session::{self, Registry};

#[derive(Clone, Serialize, Deserialize)]
pub struct Group {
    pub id: String,
    pub name: String,
    /// Milliseconds since 1970.
    created: u64,
}

#[derive(Default, Serialize, Deserialize)]
struct GroupList {
    groups: Vec<Group>,
}

/// A group as the list in the top bar shows it.
#[derive(Serialize)]
pub struct GroupInfo {
    id: String,
    name: String,
    tabs: usize,
    /// The window asking works on this group.
    current: bool,
    /// Some window works on this group.
    open: bool,
}

/// Keeps `groups.json` from being read and written by two commands at once.
static LIST: Mutex<()> = Mutex::new(());

fn read_list() -> GroupList {
    session::data_dir()
        .and_then(|dir| std::fs::read(dir.join("groups.json")).ok())
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

fn write_list(list: &GroupList) -> Result<(), String> {
    let dir = session::data_dir().ok_or("APPDATA is not set")?;
    let json = serde_json::to_vec_pretty(list).map_err(|e| e.to_string())?;
    session::write_atomic(&dir.join("groups.json"), &json).map_err(session::io_error)
}

/// The name without surrounding spaces, or an error code for the frontend.
fn clean_name(name: &str, list: &GroupList, except: Option<&str>) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("empty".to_owned());
    }
    let taken = list
        .groups
        .iter()
        .any(|g| Some(g.id.as_str()) != except && g.name.to_lowercase() == name.to_lowercase());
    if taken {
        return Err("exists".to_owned());
    }
    Ok(name.to_owned())
}

/// Tells every window that the list changed (names, counts, the current group).
fn notify(app: &AppHandle) {
    let _ = app.emit("groups-changed", ());
}

fn now_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.as_millis() as u64)
}

#[tauri::command]
pub fn list_groups(window: WebviewWindow, registry: State<Registry>) -> Vec<GroupInfo> {
    let _lock = LIST.lock().unwrap();
    let current = registry.group_of(window.label());
    read_list()
        .groups
        .into_iter()
        .map(|g| GroupInfo {
            tabs: session::session_dir(Some(&g.id)).map_or(0, |dir| session::stored_tab_count(&dir)),
            current: current.as_deref() == Some(g.id.as_str()),
            open: registry.window_of(Some(&g.id)).is_some(),
            id: g.id,
            name: g.name,
        })
        .collect()
}

/// The group of the window asking, or `None` for the default window.
#[tauri::command]
pub fn current_group(window: WebviewWindow, registry: State<Registry>) -> Option<Group> {
    let id = registry.group_of(window.label())?;
    let _lock = LIST.lock().unwrap();
    read_list().groups.into_iter().find(|g| g.id == id)
}

/// Saves the tabs of the window asking as a new group, which the window works
/// on from now on. The frontend then stores its session into the group's folder.
#[tauri::command]
pub fn create_group(name: String, window: WebviewWindow, registry: State<Registry>, app: AppHandle) -> Result<Group, String> {
    let _lock = LIST.lock().unwrap();
    let mut list = read_list();
    let name = clean_name(&name, &list, None)?;
    let created = now_millis();
    let mut id = format!("g{created:x}");
    while list.groups.iter().any(|g| g.id == id) {
        id.push('0');
    }
    let group = Group { id, name, created };
    list.groups.insert(0, group.clone());
    write_list(&list)?;

    let previous = {
        let mut windows = registry.0.lock().unwrap();
        let entry = windows.entry(window.label().to_owned()).or_default();
        std::mem::replace(&mut entry.group, Some(group.id.clone()))
    };
    // The tabs moved to the group, so the next start from Windows begins empty.
    // A group the window worked on before keeps its tabs as they are now.
    if previous.is_none() {
        session::clear_default_session();
    }
    notify(&app);
    Ok(group)
}

#[tauri::command]
pub fn rename_group(id: String, name: String, app: AppHandle) -> Result<(), String> {
    let _lock = LIST.lock().unwrap();
    let mut list = read_list();
    let name = clean_name(&name, &list, Some(&id))?;
    let group = list.groups.iter_mut().find(|g| g.id == id).ok_or("not_found")?;
    group.name = name;
    write_list(&list)?;
    notify(&app);
    Ok(())
}

fn remove_group(id: &str) -> Result<(), String> {
    let _lock = LIST.lock().unwrap();
    let mut list = read_list();
    list.groups.retain(|g| g.id != id);
    write_list(&list)?;
    if let Some(dir) = session::session_dir(Some(id)) {
        let _ = std::fs::remove_dir_all(dir);
    }
    Ok(())
}

/// Deletes a group. When a window works on it, that window is asked to close
/// first ("closing"): it asks about unsaved changes and then calls
/// `finish_delete_group`, or keeps everything when the user cancels.
#[tauri::command]
pub fn delete_group(id: String, registry: State<Registry>, app: AppHandle) -> Result<&'static str, String> {
    if let Some(label) = registry.window_of(Some(&id)) {
        if let Some(window) = app.get_webview_window(&label) {
            crate::bring_to_front(&window);
        }
        app.emit_to(label.as_str(), "delete-group", ()).map_err(|e| e.to_string())?;
        return Ok("closing");
    }
    remove_group(&id)?;
    notify(&app);
    Ok("deleted")
}

/// Deletes the group of the window asking and closes the window.
#[tauri::command]
pub async fn finish_delete_group(window: WebviewWindow, registry: State<'_, Registry>, app: AppHandle) -> Result<(), String> {
    let group = registry.0.lock().unwrap().get_mut(window.label()).and_then(|entry| entry.group.take());
    if let Some(id) = group {
        remove_group(&id)?;
        notify(&app);
    }
    window.destroy().map_err(|e| e.to_string())
}

/// Shows the group's window, opening one when the group is not open yet.
#[tauri::command]
pub async fn open_group(id: String, registry: State<'_, Registry>, app: AppHandle) -> Result<(), String> {
    if let Some(window) = registry.window_of(Some(&id)).and_then(|label| app.get_webview_window(&label)) {
        crate::bring_to_front(&window);
        return Ok(());
    }
    let exists = {
        let _lock = LIST.lock().unwrap();
        read_list().groups.iter().any(|g| g.id == id)
    };
    if !exists {
        return Err("not_found".to_owned());
    }
    crate::open_window(&app, Some(id), Vec::new()).map_err(|e| e.to_string())
}
