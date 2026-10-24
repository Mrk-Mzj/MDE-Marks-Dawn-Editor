//! Start-up check for the WebView2 runtime. Windows 11 ships it, but stripped-down
//! installations may not; without it the window would never appear, so we say what
//! is missing and offer to open the official installer download.

use webview2_com::Microsoft::Web::WebView2::Win32::GetAvailableCoreWebView2BrowserVersionString;
use windows::core::{w, HSTRING, PCWSTR, PWSTR};
use windows::Win32::Globalization::GetUserDefaultUILanguage;
use windows::Win32::System::Com::CoTaskMemFree;
use windows::Win32::UI::Controls::{
    TaskDialogIndirect, TASKDIALOGCONFIG, TASKDIALOG_BUTTON, TDF_ALLOW_DIALOG_CANCELLATION, TD_WARNING_ICON,
};

/// Microsoft's Evergreen bootstrapper (a small installer that fetches the runtime).
const INSTALLER_URL: &str = "https://go.microsoft.com/fwlink/p/?LinkId=2124703";

const LANG_POLISH: u16 = 0x15;

/// Whether the Windows display language is Polish; every other language gets English.
pub fn ui_is_polish() -> bool {
    // SAFETY: a plain Win32 call.
    let language = unsafe { GetUserDefaultUILanguage() };
    language & 0x3ff == LANG_POLISH
}

const INSTALL_ID: i32 = 1001;
const CANCEL_ID: i32 = 1002;

fn webview2_installed() -> bool {
    let mut version = PWSTR::null();
    // SAFETY: a null folder means "look for the installed runtime"; on success the
    // returned string is ours to free.
    unsafe {
        let found = GetAvailableCoreWebView2BrowserVersionString(PCWSTR::null(), &mut version).is_ok() && !version.is_null();
        if !version.is_null() {
            CoTaskMemFree(Some(version.0 as *const _));
        }
        found
    }
}

/// Returns `true` when the app may start. Otherwise tells the user what is
/// missing (and offers the installer); the caller should exit.
pub fn ensure_webview2() -> bool {
    if webview2_installed() {
        return true;
    }
    let polish = ui_is_polish();
    let (instruction, content, install, cancel) = if polish {
        (
            "Brakuje składnika Microsoft Edge WebView2",
            "MDE potrzebuje środowiska uruchomieniowego WebView2, aby wyświetlić okno. Kliknij „Zainstaluj”, aby pobrać \
             instalator ze strony Microsoft, uruchom go, a potem otwórz MDE ponownie.",
            "Zainstaluj",
            "Anuluj",
        )
    } else {
        (
            "Microsoft Edge WebView2 is missing",
            "MDE needs the WebView2 runtime to show its window. Click \"Install\" to download the installer from \
             Microsoft, run it, then start MDE again.",
            "Install",
            "Cancel",
        )
    };

    let instruction = HSTRING::from(instruction);
    let content = HSTRING::from(content);
    let install = HSTRING::from(install);
    let cancel = HSTRING::from(cancel);
    let buttons = [
        TASKDIALOG_BUTTON { nButtonID: INSTALL_ID, pszButtonText: PCWSTR(install.as_ptr()) },
        TASKDIALOG_BUTTON { nButtonID: CANCEL_ID, pszButtonText: PCWSTR(cancel.as_ptr()) },
    ];
    let mut config = TASKDIALOGCONFIG::default();
    config.cbSize = std::mem::size_of::<TASKDIALOGCONFIG>() as u32;
    config.dwFlags = TDF_ALLOW_DIALOG_CANCELLATION;
    config.pszWindowTitle = w!("MDE");
    config.Anonymous1.pszMainIcon = TD_WARNING_ICON;
    config.pszMainInstruction = PCWSTR(instruction.as_ptr());
    config.pszContent = PCWSTR(content.as_ptr());
    config.cButtons = buttons.len() as u32;
    config.pButtons = buttons.as_ptr();
    config.nDefaultButton = INSTALL_ID;

    let mut chosen = 0;
    // SAFETY: the config and everything it points to outlive the call.
    let shown = unsafe { TaskDialogIndirect(&config, Some(&mut chosen), None, None) };
    if shown.is_ok() && chosen == INSTALL_ID {
        let _ = crate::shell_open(INSTALLER_URL);
    }
    false
}
