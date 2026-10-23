//! The right-click menu of the webview: WebView2's own menu, cut down to the
//! few commands that make sense in a text editor and put in a fixed order.
//! Keeping the native items (instead of drawing a menu) keeps Emoji and
//! Dictation working.

use tauri::WebviewWindow;
use webview2_com::ContextMenuRequestedEventHandler;
use webview2_com::Microsoft::Web::WebView2::Win32::{
    ICoreWebView2ContextMenuItem, ICoreWebView2ContextMenuItemCollection, ICoreWebView2_11,
    COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND, COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND_COMMAND,
    COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND_SEPARATOR,
};
use windows::core::{Interface, PWSTR};
use windows::Win32::System::Com::CoTaskMemFree;

/// The commands kept in the menu, in order; `None` is a separator.
const LAYOUT: [Option<&str>; 9] = [
    Some("selectAll"),
    None,
    Some("copy"),
    Some("cut"),
    Some("paste"),
    None,
    Some("emoji"),
    None,
    Some("dictation"),
];

/// Replaces the webview's default right-click menu with the one in `LAYOUT`.
pub fn install(window: &WebviewWindow) -> tauri::Result<()> {
    window.with_webview(|webview| {
        // SAFETY: called on the UI thread with the webview's own COM objects.
        let _ = unsafe { register(&webview.controller()) };
    })
}

unsafe fn register(
    controller: &webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Controller,
) -> windows::core::Result<()> {
    let core: ICoreWebView2_11 = controller.CoreWebView2()?.cast()?;
    let handler = ContextMenuRequestedEventHandler::create(Box::new(|_, args| {
        if let Some(args) = args {
            // SAFETY: the menu belongs to this event and is only touched inside it.
            let _ = unsafe { args.MenuItems().and_then(|items| rebuild(&items)) };
        }
        Ok(())
    }));
    let mut token = 0;
    core.add_ContextMenuRequested(&handler, &mut token)
}

unsafe fn string_of(read: impl FnOnce(*mut PWSTR) -> windows::core::Result<()>) -> String {
    let mut text = PWSTR::null();
    if read(&mut text).is_err() || text.is_null() {
        return String::new();
    }
    let value = text.to_string().unwrap_or_default();
    CoTaskMemFree(Some(text.as_ptr() as _));
    value
}

unsafe fn name_of(item: &ICoreWebView2ContextMenuItem) -> String {
    string_of(|out| item.Name(out))
}

unsafe fn kind_of(item: &ICoreWebView2ContextMenuItem) -> COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND {
    let mut kind = COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND::default();
    let _ = item.Kind(&mut kind);
    kind
}

unsafe fn children_of(item: &ICoreWebView2ContextMenuItem) -> Vec<ICoreWebView2ContextMenuItem> {
    let mut found = Vec::new();
    if let Ok(children) = item.Children() {
        let mut count = 0;
        if children.Count(&mut count).is_ok() {
            found.extend((0..count).filter_map(|index| children.GetValueAtIndex(index).ok()));
        }
    }
    found
}

/// The item for one `LAYOUT` command among the menu's items, if it is there.
unsafe fn find(items: &[ICoreWebView2ContextMenuItem], name: &str) -> Option<ICoreWebView2ContextMenuItem> {
    if name == "dictation" {
        // WebView2 names it only "other", and it sits under "More tools".
        let more_tools = items.iter().find(|item| name_of(item) == "moreTools")?;
        return children_of(more_tools).into_iter().find(|child| {
            name_of(child) == "other" && kind_of(child) == COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND_COMMAND
        });
    }
    items.iter().find(|item| name_of(item) == name).cloned()
}

unsafe fn rebuild(items: &ICoreWebView2ContextMenuItemCollection) -> windows::core::Result<()> {
    let mut count = 0;
    items.Count(&mut count)?;
    let present: Vec<_> = (0..count).filter_map(|index| items.GetValueAtIndex(index).ok()).collect();

    // Separators come from the original menu; they are only kept between commands.
    let mut separators = present
        .iter()
        .filter(|item| kind_of(item) == COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND_SEPARATOR);
    let mut wanted: Vec<ICoreWebView2ContextMenuItem> = Vec::new();
    let mut pending_separator = None;
    for entry in LAYOUT {
        match entry {
            None => pending_separator = separators.next(),
            Some(name) => {
                let Some(item) = find(&present, name) else { continue };
                if let (false, Some(separator)) = (wanted.is_empty(), pending_separator.take()) {
                    wanted.push(separator.clone());
                }
                wanted.push(item);
            }
        }
    }

    for _ in 0..count {
        items.RemoveValueAtIndex(0)?;
    }
    for (position, item) in wanted.iter().enumerate() {
        items.InsertValueAtIndex(position as u32, item)?;
    }
    Ok(())
}
