//! Minimize, maximize/restore and close buttons drawn natively over the right
//! end of the top bar.
//!
//! The window has no system title bar, and the page draws the rest of it.
//! WebView2 paints the page a few frames after the window changes size, so
//! buttons in the page would trail the right edge while it is dragged. This
//! child window is moved in the same `WM_SIZE` as the frame and stays on it.

use std::sync::OnceLock;

use windows::core::{w, PCWSTR, PWSTR};
use windows::Win32::Foundation::{COLORREF, HWND, LPARAM, LRESULT, POINT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::{
    BeginPaint, BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, CreateFontW, CreateSolidBrush, DeleteDC, DeleteObject,
    DrawTextW, EndPaint, FillRect, GetTextFaceW, InvalidateRect, SelectObject, SetBkMode, SetTextColor, ANTIALIASED_QUALITY,
    CLIP_DEFAULT_PRECIS, DEFAULT_CHARSET, DT_CENTER, DT_SINGLELINE, DT_VCENTER, FW_NORMAL, HDC, HFONT, OUT_DEFAULT_PRECIS,
    PAINTSTRUCT, SRCCOPY, TRANSPARENT,
};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Controls::{
    SetWindowTheme, TOOLTIPS_CLASSW, TTF_SUBCLASS, TTM_ADDTOOLW, TTM_NEWTOOLRECTW, TTM_UPDATETIPTEXTW, TTS_ALWAYSTIP,
    TTS_NOPREFIX, TTTOOLINFOW, WM_MOUSELEAVE,
};
use windows::Win32::UI::HiDpi::GetDpiForWindow;
use windows::Win32::UI::Input::KeyboardAndMouse::{ReleaseCapture, SetCapture, TrackMouseEvent, TME_LEAVE, TRACKMOUSEEVENT};
use windows::Win32::UI::Shell::{DefSubclassProc, SetWindowSubclass};
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, GetClientRect, GetWindowLongPtrW, IsZoomed, LoadCursorW, PostMessageW, RegisterClassW,
    SendMessageW, SetWindowLongPtrW, SetWindowPos, CS_HREDRAW, CS_VREDRAW, GWLP_USERDATA, HWND_TOP, IDC_ARROW,
    MA_NOACTIVATE, SC_CLOSE, SC_MAXIMIZE, SC_MINIMIZE, SC_RESTORE, SIZE_MINIMIZED, SWP_NOACTIVATE,
    WM_CAPTURECHANGED, WM_ERASEBKGND, WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MOUSEACTIVATE, WM_MOUSEMOVE,
    WM_NCDESTROY, WM_PAINT, WM_SIZE, WM_SYSCOMMAND, WNDCLASSW, WS_CHILD, WS_CLIPSIBLINGS, WS_EX_LAYERED, WS_EX_TOPMOST, LWA_ALPHA, SetLayeredWindowAttributes, WS_POPUP,
    WS_VISIBLE,
};

/// Width of one button and height of the buttons in CSS pixels: the top bar
/// is 40px high including its 1px bottom border, which stays visible below.
const BUTTON_WIDTH: f64 = 46.0;
const HEIGHT: f64 = 39.0;
/// Size of the icon font in CSS pixels; Windows draws its own caption icons at 10px.
const ICON_SIZE: f64 = 10.0;

// Colors of docs/DESIGN.md (0x00BBGGRR): `topbar`, `accent`, `muted-foreground`,
// `accent-foreground`, and `window-close` with white.
const TOPBAR: COLORREF = rgb(0x15, 0x15, 0x15);
const ACCENT: COLORREF = rgb(0x26, 0x26, 0x26);
const MUTED_FOREGROUND: COLORREF = rgb(0xa1, 0xa1, 0xa1);
const ACCENT_FOREGROUND: COLORREF = rgb(0xfa, 0xfa, 0xfa);
const WINDOW_CLOSE: COLORREF = rgb(0xc4, 0x2b, 0x1c);
const WINDOW_CLOSE_FOREGROUND: COLORREF = rgb(0xff, 0xff, 0xff);

const fn rgb(r: u8, g: u8, b: u8) -> COLORREF {
    COLORREF(r as u32 | (g as u32) << 8 | (b as u32) << 16)
}

#[derive(Clone, Copy, PartialEq)]
enum Button {
    Minimize,
    Maximize,
    Close,
}

const BUTTONS: [Button; 3] = [Button::Minimize, Button::Maximize, Button::Close];

struct Labels {
    minimize: &'static str,
    maximize: &'static str,
    restore: &'static str,
    close: &'static str,
}

/// Tooltips in the language of the rest of the UI (Polish for Polish Windows).
fn labels() -> &'static Labels {
    if crate::runtime_check::ui_is_polish() {
        &Labels { minimize: "Minimalizuj", maximize: "Maksymalizuj", restore: "Przywróć w dół", close: "Zamknij" }
    } else {
        &Labels { minimize: "Minimize", maximize: "Maximize", restore: "Restore Down", close: "Close" }
    }
}

/// State of the buttons' window, kept in its `GWLP_USERDATA`.
struct Caption {
    parent: HWND,
    tooltip: HWND,
    hover: Option<usize>,
    pressed: Option<usize>,
    tracking: bool,
    maximized: bool,
}

const SUBCLASS_ID: usize = 0x4d44_4543; // "MDEC"

/// Adds the buttons to the top right corner of `parent`'s client area.
pub fn install(parent: HWND) -> windows::core::Result<()> {
    static CLASS: OnceLock<()> = OnceLock::new();
    // SAFETY: Win32 calls on windows of this thread; the `Caption` box lives
    // until WM_NCDESTROY of the window that owns it.
    unsafe {
        let instance = GetModuleHandleW(None)?;
        CLASS.get_or_init(|| {
            RegisterClassW(&WNDCLASSW {
                style: CS_HREDRAW | CS_VREDRAW,
                lpfnWndProc: Some(caption_proc),
                hInstance: instance.into(),
                hCursor: LoadCursorW(None, IDC_ARROW).unwrap_or_default(),
                lpszClassName: w!("MDECaptionButtons"),
                ..Default::default()
            });
        });
        let hwnd = CreateWindowExW(
            WS_EX_LAYERED,
            w!("MDECaptionButtons"),
            PCWSTR::null(),
            WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS,
            0,
            0,
            0,
            0,
            Some(parent),
            None,
            Some(instance.into()),
            None,
        )?;
        let tooltip = CreateWindowExW(
            WS_EX_TOPMOST,
            TOOLTIPS_CLASSW,
            PCWSTR::null(),
            WS_POPUP | windows::Win32::UI::WindowsAndMessaging::WINDOW_STYLE(TTS_ALWAYSTIP | TTS_NOPREFIX),
            0,
            0,
            0,
            0,
            Some(hwnd),
            None,
            Some(instance.into()),
            None,
        )?;
        let _ = SetLayeredWindowAttributes(hwnd, COLORREF(0), 255, LWA_ALPHA);
        // The dark tooltip style of Explorer, matching the dark window.
        let _ = SetWindowTheme(tooltip, w!("DarkMode_Explorer"), PCWSTR::null());

        let caption = Box::new(Caption {
            parent,
            tooltip,
            hover: None,
            pressed: None,
            tracking: false,
            maximized: IsZoomed(parent).as_bool(),
        });
        SetWindowLongPtrW(hwnd, GWLP_USERDATA, Box::into_raw(caption) as isize);
        for index in 0..BUTTONS.len() {
            let mut text = wide(label(BUTTONS[index], false));
            let info = tool_info(hwnd, index, &mut text);
            SendMessageW(tooltip, TTM_ADDTOOLW, None, Some(LPARAM(&info as *const _ as isize)));
        }
        if !SetWindowSubclass(parent, Some(parent_proc), SUBCLASS_ID, hwnd.0 as usize).as_bool() {
            return Err(windows::core::Error::from_thread());
        }
        place(parent, hwnd);
    }
    Ok(())
}

fn label(button: Button, maximized: bool) -> &'static str {
    let labels = labels();
    match button {
        Button::Minimize => labels.minimize,
        Button::Maximize if maximized => labels.restore,
        Button::Maximize => labels.maximize,
        Button::Close => labels.close,
    }
}

fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(Some(0)).collect()
}

fn tool_info(hwnd: HWND, index: usize, text: &mut [u16]) -> TTTOOLINFOW {
    TTTOOLINFOW {
        cbSize: std::mem::size_of::<TTTOOLINFOW>() as u32,
        uFlags: TTF_SUBCLASS,
        hwnd,
        uId: index,
        rect: button_rect(hwnd, index),
        lpszText: PWSTR(text.as_mut_ptr()),
        ..Default::default()
    }
}

/// Physical pixels per CSS pixel of `hwnd`.
fn scale(hwnd: HWND) -> f64 {
    // SAFETY: a plain Win32 call.
    let dpi = unsafe { GetDpiForWindow(hwnd) };
    if dpi == 0 { 1.0 } else { dpi as f64 / 96.0 }
}

fn button_width(hwnd: HWND) -> i32 {
    (BUTTON_WIDTH * scale(hwnd)).round() as i32
}

fn button_rect(hwnd: HWND, index: usize) -> RECT {
    let width = button_width(hwnd);
    let mut client = RECT::default();
    // SAFETY: a plain Win32 call.
    let _ = unsafe { GetClientRect(hwnd, &mut client) };
    RECT { left: width * index as i32, top: 0, right: width * (index as i32 + 1), bottom: client.bottom }
}

/// Moves the buttons to the top right corner of the parent's client area.
unsafe fn place(parent: HWND, hwnd: HWND) {
    let mut client = RECT::default();
    let _ = GetClientRect(parent, &mut client);
    let s = scale(parent);
    let width = (BUTTON_WIDTH * s).round() as i32 * BUTTONS.len() as i32;
    let height = (HEIGHT * s).round() as i32;
    // Synchronous (no SWP_ASYNCWINDOWPOS): the buttons move in the same frame as the edge.
    let _ = SetWindowPos(hwnd, Some(HWND_TOP), client.right - width, 0, width, height, SWP_NOACTIVATE);

    if let Some(caption) = state(hwnd) {
        let maximized = IsZoomed(parent).as_bool();
        if caption.maximized != maximized {
            caption.maximized = maximized;
            let mut text = wide(label(Button::Maximize, maximized));
            let info = tool_info(hwnd, 1, &mut text);
            SendMessageW(caption.tooltip, TTM_UPDATETIPTEXTW, None, Some(LPARAM(&info as *const _ as isize)));
        }
        for index in 0..BUTTONS.len() {
            let mut text = [0u16];
            let info = tool_info(hwnd, index, &mut text);
            SendMessageW(caption.tooltip, TTM_NEWTOOLRECTW, None, Some(LPARAM(&info as *const _ as isize)));
        }
        let _ = InvalidateRect(Some(hwnd), None, false);
    }
}

unsafe fn state<'a>(hwnd: HWND) -> Option<&'a mut Caption> {
    (GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *mut Caption).as_mut()
}

unsafe extern "system" fn parent_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _id: usize,
    data: usize,
) -> LRESULT {
    let result = DefSubclassProc(hwnd, msg, wparam, lparam);
    if msg == WM_SIZE && wparam.0 != SIZE_MINIMIZED as usize {
        place(hwnd, HWND(data as *mut _));
    }
    result
}

/// Which button is under the point `lparam` (client coordinates).
fn hit(hwnd: HWND, lparam: LPARAM) -> Option<usize> {
    let point = POINT { x: (lparam.0 & 0xffff) as i16 as i32, y: ((lparam.0 >> 16) & 0xffff) as i16 as i32 };
    let mut client = RECT::default();
    // SAFETY: a plain Win32 call.
    let _ = unsafe { GetClientRect(hwnd, &mut client) };
    if point.x < 0 || point.y < 0 || point.x >= client.right || point.y >= client.bottom {
        return None;
    }
    Some(((point.x / button_width(hwnd).max(1)) as usize).min(BUTTONS.len() - 1))
}

unsafe extern "system" fn caption_proc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    let Some(caption) = state(hwnd) else {
        return DefWindowProcW(hwnd, msg, wparam, lparam);
    };
    match msg {
        WM_PAINT => {
            paint(hwnd, caption);
            LRESULT(0)
        }
        WM_ERASEBKGND => LRESULT(1),
        // Clicking a button leaves the keyboard focus in the editor.
        WM_MOUSEACTIVATE => LRESULT(MA_NOACTIVATE as isize),
        WM_MOUSEMOVE => {
            if !caption.tracking {
                let mut track = TRACKMOUSEEVENT {
                    cbSize: std::mem::size_of::<TRACKMOUSEEVENT>() as u32,
                    dwFlags: TME_LEAVE,
                    hwndTrack: hwnd,
                    dwHoverTime: 0,
                };
                caption.tracking = TrackMouseEvent(&mut track).is_ok();
            }
            let hover = hit(hwnd, lparam);
            if hover != caption.hover {
                caption.hover = hover;
                let _ = InvalidateRect(Some(hwnd), None, false);
            }
            LRESULT(0)
        }
        WM_MOUSELEAVE => {
            caption.tracking = false;
            caption.hover = None;
            let _ = InvalidateRect(Some(hwnd), None, false);
            LRESULT(0)
        }
        WM_LBUTTONDOWN => {
            caption.pressed = hit(hwnd, lparam);
            SetCapture(hwnd);
            let _ = InvalidateRect(Some(hwnd), None, false);
            LRESULT(0)
        }
        WM_LBUTTONUP => {
            let pressed = caption.pressed.take();
            let _ = ReleaseCapture();
            let _ = InvalidateRect(Some(hwnd), None, false);
            if let Some(index) = pressed.filter(|&index| hit(hwnd, lparam) == Some(index)) {
                let command = match BUTTONS[index] {
                    Button::Minimize => SC_MINIMIZE,
                    Button::Maximize if IsZoomed(caption.parent).as_bool() => SC_RESTORE,
                    Button::Maximize => SC_MAXIMIZE,
                    // The frontend handles closing (the session is saved first).
                    Button::Close => SC_CLOSE,
                };
                let _ = PostMessageW(Some(caption.parent), WM_SYSCOMMAND, WPARAM(command as usize), LPARAM(0));
            }
            LRESULT(0)
        }
        WM_CAPTURECHANGED => {
            if caption.pressed.take().is_some() {
                let _ = InvalidateRect(Some(hwnd), None, false);
            }
            LRESULT(0)
        }
        WM_NCDESTROY => {
            SetWindowLongPtrW(hwnd, GWLP_USERDATA, 0);
            drop(Box::from_raw(caption as *mut Caption));
            DefWindowProcW(hwnd, msg, wparam, lparam)
        }
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

/// The system's icon font: Segoe Fluent Icons on Windows 11, else Segoe MDL2 Assets.
unsafe fn icon_font(dc: HDC, height: i32) -> HFONT {
    for face in [w!("Segoe Fluent Icons"), w!("Segoe MDL2 Assets")] {
        let font = CreateFontW(
            -height,
            0,
            0,
            0,
            FW_NORMAL.0 as i32,
            0,
            0,
            0,
            DEFAULT_CHARSET,
            OUT_DEFAULT_PRECIS,
            CLIP_DEFAULT_PRECIS,
            ANTIALIASED_QUALITY,
            0,
            face,
        );
        let previous = SelectObject(dc, font.into());
        let mut name = [0u16; 32];
        let len = GetTextFaceW(dc, Some(&mut name)) as usize;
        SelectObject(dc, previous);
        // Windows substitutes another font for a missing one.
        if name[..len.saturating_sub(1).min(name.len())] == face.as_wide()[..] {
            return font;
        }
        let _ = DeleteObject(font.into());
    }
    HFONT::default()
}

unsafe fn paint(hwnd: HWND, caption: &Caption) {
    let mut ps = PAINTSTRUCT::default();
    let dc = BeginPaint(hwnd, &mut ps);
    let mut client = RECT::default();
    let _ = GetClientRect(hwnd, &mut client);

    // Drawn off screen first, so hovering never flickers.
    let memory = CreateCompatibleDC(Some(dc));
    let bitmap = CreateCompatibleBitmap(dc, client.right, client.bottom);
    let old_bitmap = SelectObject(memory, bitmap.into());
    let background = CreateSolidBrush(TOPBAR);
    FillRect(memory, &client, background);
    let _ = DeleteObject(background.into());

    let font = icon_font(memory, (ICON_SIZE * scale(hwnd)).round() as i32);
    let old_font = SelectObject(memory, font.into());
    SetBkMode(memory, TRANSPARENT);
    for (index, &button) in BUTTONS.iter().enumerate() {
        let mut rect = button_rect(hwnd, index);
        let active = caption.hover == Some(index) || caption.pressed == Some(index);
        let (fill, color) = match (button, active) {
            (Button::Close, true) => (Some(WINDOW_CLOSE), WINDOW_CLOSE_FOREGROUND),
            (_, true) => (Some(ACCENT), ACCENT_FOREGROUND),
            _ => (None, MUTED_FOREGROUND),
        };
        if let Some(fill) = fill {
            let brush = CreateSolidBrush(fill);
            FillRect(memory, &rect, brush);
            let _ = DeleteObject(brush.into());
        }
        let glyph = match button {
            Button::Minimize => '\u{E921}',
            Button::Maximize if caption.maximized => '\u{E923}',
            Button::Maximize => '\u{E922}',
            Button::Close => '\u{E8BB}',
        };
        let mut text: Vec<u16> = glyph.to_string().encode_utf16().collect();
        SetTextColor(memory, color);
        DrawTextW(memory, &mut text, &mut rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    }
    SelectObject(memory, old_font);
    let _ = DeleteObject(font.into());

    let _ = BitBlt(dc, 0, 0, client.right, client.bottom, Some(memory), 0, 0, SRCCOPY);
    SelectObject(memory, old_bitmap);
    let _ = DeleteObject(bitmap.into());
    let _ = DeleteDC(memory);
    let _ = EndPaint(hwnd, &ps);
}
