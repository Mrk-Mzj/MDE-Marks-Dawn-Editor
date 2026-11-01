//! Byte-faithful text file decoding and encoding.
//!
//! The editor works on text with `\n` line breaks only. When a file is read we
//! remember its encoding, its dominant line ending and every line break that
//! differs from it, so that saving restores them.

use windows::core::{BOOL, PCSTR};
use windows::Win32::Globalization::{GetACP, MultiByteToWideChar, WideCharToMultiByte, MULTI_BYTE_TO_WIDE_CHAR_FLAGS, WC_NO_BEST_FIT_CHARS};

const UTF8_BOM: &[u8] = &[0xEF, 0xBB, 0xBF];
const UTF16LE_BOM: &[u8] = &[0xFF, 0xFE];
const UTF16BE_BOM: &[u8] = &[0xFE, 0xFF];

/// Single-byte Windows code pages ("ANSI") a file without a BOM may be read in:
/// Thai, Central European, Cyrillic, Western European, Greek, Turkish, Hebrew,
/// Arabic, Baltic and Vietnamese. Each maps every byte to a character of its
/// own, so no byte is ever replaced or lost.
const CODE_PAGES: [u16; 10] = [874, 1250, 1251, 1252, 1253, 1254, 1255, 1256, 1257, 1258];

/// Passed to the frontend as "utf8", "utf8bom", "utf16le", "utf16be" or
/// "windows<code page>" (e.g. "windows1250").
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(into = "String", try_from = "String")]
pub enum Encoding {
    Utf8,
    Utf8Bom,
    Utf16Le,
    Utf16Be,
    /// One of `CODE_PAGES`.
    Windows(u16),
}

impl From<Encoding> for String {
    fn from(encoding: Encoding) -> String {
        match encoding {
            Encoding::Utf8 => "utf8".to_owned(),
            Encoding::Utf8Bom => "utf8bom".to_owned(),
            Encoding::Utf16Le => "utf16le".to_owned(),
            Encoding::Utf16Be => "utf16be".to_owned(),
            Encoding::Windows(cp) => format!("windows{cp}"),
        }
    }
}

impl TryFrom<String> for Encoding {
    type Error = String;

    fn try_from(name: String) -> Result<Self, String> {
        match name.as_str() {
            "utf8" => Ok(Encoding::Utf8),
            "utf8bom" => Ok(Encoding::Utf8Bom),
            "utf16le" => Ok(Encoding::Utf16Le),
            "utf16be" => Ok(Encoding::Utf16Be),
            _ => name
                .strip_prefix("windows")
                .and_then(|cp| cp.parse().ok())
                .filter(|cp| CODE_PAGES.contains(cp))
                .map(Encoding::Windows)
                .ok_or_else(|| format!("unknown encoding: {name}")),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Eol {
    Lf,
    Crlf,
    Cr,
}

impl Eol {
    fn as_str(self) -> &'static str {
        match self {
            Eol::Lf => "\n",
            Eol::Crlf => "\r\n",
            Eol::Cr => "\r",
        }
    }
}

/// A line break that differs from the file's dominant style. `line` is the
/// 0-based index of the line it ends.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct LineBreak {
    pub line: usize,
    pub eol: Eol,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Decoded {
    /// Text with every line break normalized to `\n`.
    pub text: String,
    pub encoding: Encoding,
    pub eol: Eol,
    /// Line breaks other than `eol`, in line order.
    pub breaks: Vec<LineBreak>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum DecodeError {
    /// A UTF-16 file with an odd byte count or unpaired surrogates.
    InvalidUtf16,
}

impl DecodeError {
    /// Stable error code passed to the frontend, which translates it.
    pub fn code(&self) -> &'static str {
        match self {
            DecodeError::InvalidUtf16 => "invalid_utf16",
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum EncodeError {
    /// The text has characters the code page cannot store (e.g. emoji); the
    /// frontend then saves the file in UTF-8.
    Unrepresentable,
}

impl EncodeError {
    /// Stable error code passed to the frontend.
    pub fn code(&self) -> String {
        match self {
            EncodeError::Unrepresentable => "unrepresentable".to_owned(),
        }
    }
}

pub fn decode(bytes: &[u8]) -> Result<Decoded, DecodeError> {
    let (raw, encoding) = if let Some(body) = bytes.strip_prefix(UTF8_BOM) {
        (decode_utf8_or_ansi(body).0, Encoding::Utf8Bom)
    } else if let Some(body) = bytes.strip_prefix(UTF16LE_BOM) {
        (decode_utf16(body, u16::from_le_bytes)?, Encoding::Utf16Le)
    } else if let Some(body) = bytes.strip_prefix(UTF16BE_BOM) {
        (decode_utf16(body, u16::from_be_bytes)?, Encoding::Utf16Be)
    } else {
        decode_utf8_or_ansi(bytes)
    };
    let (text, eol, breaks) = split_line_breaks(&raw);
    Ok(Decoded {
        text,
        encoding,
        eol,
        breaks,
    })
}

pub fn encode(text: &str, encoding: Encoding, eol: Eol, breaks: &[LineBreak]) -> Result<Vec<u8>, EncodeError> {
    let raw = join_line_breaks(text, eol, breaks);
    let mut out = Vec::with_capacity(raw.len() + 3);
    match encoding {
        Encoding::Utf8 => out.extend_from_slice(raw.as_bytes()),
        Encoding::Utf8Bom => {
            out.extend_from_slice(UTF8_BOM);
            out.extend_from_slice(raw.as_bytes());
        }
        Encoding::Utf16Le => {
            out.extend_from_slice(UTF16LE_BOM);
            raw.encode_utf16().for_each(|u| out.extend_from_slice(&u.to_le_bytes()));
        }
        Encoding::Utf16Be => {
            out.extend_from_slice(UTF16BE_BOM);
            raw.encode_utf16().for_each(|u| out.extend_from_slice(&u.to_be_bytes()));
        }
        Encoding::Windows(cp) => out = encode_ansi(&raw, cp).ok_or(EncodeError::Unrepresentable)?,
    }
    Ok(out)
}

/// The legacy code page of the Windows language (the "ANSI code page": 1250 on
/// Polish Windows, 1252 on English, French or Spanish Windows); Western
/// European where that is not a single-byte one (e.g. Japanese).
fn system_code_page() -> u16 {
    let cp = unsafe { GetACP() };
    u16::try_from(cp).ok().filter(|cp| CODE_PAGES.contains(cp)).unwrap_or(1252)
}

/// Strict UTF-8 first; anything else is read in the Windows code page.
fn decode_utf8_or_ansi(bytes: &[u8]) -> (String, Encoding) {
    match std::str::from_utf8(bytes) {
        Ok(text) => (text.to_owned(), Encoding::Utf8),
        Err(_) => {
            let cp = system_code_page();
            (decode_ansi(bytes, cp), Encoding::Windows(cp))
        }
    }
}

/// Decodes as Windows itself does. Unassigned bytes become characters of their
/// own (C1 controls or private use), so they survive a round trip.
fn decode_ansi(bytes: &[u8], cp: u16) -> String {
    if bytes.is_empty() {
        return String::new();
    }
    // A single-byte code page gives one UTF-16 unit per byte.
    let mut units = vec![0u16; bytes.len()];
    let len = unsafe { MultiByteToWideChar(cp.into(), MULTI_BYTE_TO_WIDE_CHAR_FLAGS(0), bytes, Some(&mut units)) };
    units.truncate(len.max(0) as usize);
    String::from_utf16_lossy(&units)
}

/// `None` when the text has characters the code page cannot store exactly.
fn encode_ansi(text: &str, cp: u16) -> Option<Vec<u8>> {
    if text.is_empty() {
        return Some(Vec::new());
    }
    let units: Vec<u16> = text.encode_utf16().collect();
    let mut out = vec![0u8; units.len()];
    let mut replaced = BOOL(0);
    // No "best fit" (ł → l and the like): a character is stored exactly or not at all.
    let len = unsafe { WideCharToMultiByte(cp.into(), WC_NO_BEST_FIT_CHARS, &units, Some(&mut out), PCSTR::null(), Some(&mut replaced)) };
    if len <= 0 || replaced.as_bool() {
        return None;
    }
    out.truncate(len as usize);
    // Reading the bytes back must give the same text.
    (decode_ansi(&out, cp) == text).then_some(out)
}

fn decode_utf16(body: &[u8], unit: fn([u8; 2]) -> u16) -> Result<String, DecodeError> {
    if body.len() % 2 != 0 {
        return Err(DecodeError::InvalidUtf16);
    }
    let units: Vec<u16> = body.chunks_exact(2).map(|c| unit([c[0], c[1]])).collect();
    String::from_utf16(&units).map_err(|_| DecodeError::InvalidUtf16)
}

/// Normalizes `\r\n`, `\r` and `\n` to `\n` (as CodeMirror does), returning the
/// dominant style and the breaks that differ from it.
fn split_line_breaks(raw: &str) -> (String, Eol, Vec<LineBreak>) {
    if !raw.contains('\r') {
        return (raw.to_owned(), Eol::Lf, Vec::new());
    }
    let bytes = raw.as_bytes();
    let mut text = String::with_capacity(raw.len());
    let mut found: Vec<Eol> = Vec::new();
    let mut start = 0;
    let mut i = 0;
    while i < bytes.len() {
        let eol = match bytes[i] {
            b'\n' => Eol::Lf,
            b'\r' if bytes.get(i + 1) == Some(&b'\n') => Eol::Crlf,
            b'\r' => Eol::Cr,
            _ => {
                i += 1;
                continue;
            }
        };
        text.push_str(&raw[start..i]);
        text.push('\n');
        found.push(eol);
        i += eol.as_str().len();
        start = i;
    }
    text.push_str(&raw[start..]);

    let count = |kind: Eol| found.iter().filter(|&&e| e == kind).count();
    let (lf, crlf, cr) = (count(Eol::Lf), count(Eol::Crlf), count(Eol::Cr));
    // Ties prefer LF, then CRLF.
    let dominant = if lf >= crlf && lf >= cr {
        Eol::Lf
    } else if crlf >= cr {
        Eol::Crlf
    } else {
        Eol::Cr
    };
    let breaks = found
        .iter()
        .enumerate()
        .filter(|(_, &e)| e != dominant)
        .map(|(line, &eol)| LineBreak { line, eol })
        .collect();
    (text, dominant, breaks)
}

fn join_line_breaks(text: &str, eol: Eol, breaks: &[LineBreak]) -> String {
    if eol == Eol::Lf && breaks.is_empty() {
        return text.to_owned();
    }
    let mut out = String::with_capacity(text.len() + text.len() / 32);
    let mut exceptions = breaks.iter().peekable();
    for (line, part) in text.split('\n').enumerate() {
        if line > 0 {
            let index = line - 1;
            while exceptions.next_if(|b| b.line < index).is_some() {}
            let kind = exceptions.next_if(|b| b.line == index).map_or(eol, |b| b.eol);
            out.push_str(kind.as_str());
        }
        out.push_str(part);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip(bytes: &[u8]) -> Vec<u8> {
        let d = decode(bytes).expect("decodes");
        encode(&d.text, d.encoding, d.eol, &d.breaks).expect("encodes")
    }

    #[test]
    fn utf8_bom_crlf_roundtrips() {
        let bytes = b"\xEF\xBB\xBF# Tytu\xC5\x82\r\n\r\nZa\xC5\xBC\xC3\xB3\xC5\x82\xC4\x87  \r\n".to_vec();
        let d = decode(&bytes).unwrap();
        assert_eq!(d.encoding, Encoding::Utf8Bom);
        assert_eq!(d.eol, Eol::Crlf);
        assert!(d.breaks.is_empty());
        assert!(!d.text.contains('\r'));
        assert_eq!(roundtrip(&bytes), bytes);
    }

    #[test]
    fn utf8_lf_without_final_newline_roundtrips() {
        let bytes = "# Nagłówek\n\n\n\nakapit z dwiema spacjami  \nkoniec".as_bytes();
        let d = decode(bytes).unwrap();
        assert_eq!(d.encoding, Encoding::Utf8);
        assert_eq!(d.eol, Eol::Lf);
        assert_eq!(roundtrip(bytes), bytes);
    }

    #[test]
    fn crlf_with_final_newline_roundtrips() {
        let bytes = b"a\r\nb\r\n";
        assert_eq!(roundtrip(bytes), bytes);
    }

    #[test]
    fn empty_file_roundtrips() {
        assert_eq!(roundtrip(b""), b"");
        assert_eq!(roundtrip(UTF8_BOM), UTF8_BOM);
        assert_eq!(roundtrip(UTF16LE_BOM), UTF16LE_BOM);
    }

    #[test]
    fn mixed_line_endings_roundtrip() {
        let bytes = b"a\r\nb\r\nc\nd\re\r\n";
        let d = decode(bytes).unwrap();
        assert_eq!(d.text, "a\nb\nc\nd\ne\n");
        assert_eq!(d.eol, Eol::Crlf);
        assert_eq!(
            d.breaks,
            vec![LineBreak { line: 2, eol: Eol::Lf }, LineBreak { line: 3, eol: Eol::Cr }]
        );
        assert_eq!(roundtrip(bytes), bytes);
        assert_eq!(decode(b"a\r\nb\nc\n").unwrap().eol, Eol::Lf);
    }

    #[test]
    fn edited_mixed_file_keeps_breaks_of_untouched_lines() {
        let d = decode(b"a\r\nb\nc\r\n").unwrap();
        assert_eq!(d.eol, Eol::Crlf);
        // A new line inserted before "b": the LF break moves from line 1 to 2.
        let breaks = [LineBreak { line: 2, eol: Eol::Lf }];
        let bytes = encode("a\nnew\nb\nc\n", d.encoding, d.eol, &breaks).unwrap();
        assert_eq!(bytes, b"a\r\nnew\r\nb\nc\r\n");
    }

    #[test]
    fn lone_cr_is_a_line_break() {
        assert_eq!(decode(b"a\rb").unwrap().text, "a\nb");
        assert_eq!(decode(b"a\rb\r").unwrap().eol, Eol::Cr);
    }

    #[test]
    fn non_utf8_falls_back_to_the_windows_code_page_and_roundtrips() {
        // "Zażółć gęślą jaźń" in Windows-1250 is not valid UTF-8.
        let bytes = b"Za\xBF\xF3\xB3\xE6 g\xEA\x9Cl\xB9 ja\x9F\xF1\r\n\x81\x83\x88\x90\x98";
        let d = decode(bytes).unwrap();
        assert_eq!(d.encoding, Encoding::Windows(system_code_page()));
        assert_eq!(roundtrip(bytes), bytes);
        assert!(decode_ansi(bytes, 1250).starts_with("Zażółć gęślą jaźń\r\n"));
    }

    #[test]
    fn windows_1252_reads_western_letters() {
        // "Señor, à côté" in Windows-1252.
        assert_eq!(decode_ansi(b"Se\xF1or, \xE0 c\xF4t\xE9", 1252), "Señor, à côté");
        assert_eq!(encode_ansi("Señor, à côté", 1252).unwrap(), b"Se\xF1or, \xE0 c\xF4t\xE9");
    }

    #[test]
    fn every_code_page_roundtrips_every_byte() {
        let bytes: Vec<u8> = (0..=255).collect();
        for cp in CODE_PAGES {
            let text = decode_ansi(&bytes, cp);
            assert_eq!(text.chars().count(), 256, "code page {cp}");
            assert_eq!(encode_ansi(&text, cp), Some(bytes.clone()), "code page {cp}");
        }
    }

    #[test]
    fn code_pages_report_unrepresentable_characters() {
        for text in ["ok 😀", "→", "ł", "\u{FFFD}"] {
            assert_eq!(encode(text, Encoding::Windows(1252), Eol::Lf, &[]), Err(EncodeError::Unrepresentable), "{text}");
        }
        assert_eq!(encode("ł", Encoding::Windows(1250), Eol::Lf, &[]), Ok(vec![0xB3]));
    }

    #[test]
    fn encoding_names_roundtrip() {
        for encoding in [Encoding::Utf8, Encoding::Utf8Bom, Encoding::Utf16Le, Encoding::Utf16Be, Encoding::Windows(1250), Encoding::Windows(874)] {
            assert_eq!(Encoding::try_from(String::from(encoding)), Ok(encoding));
        }
        assert_eq!(String::from(Encoding::Windows(1250)), "windows1250");
        assert!(Encoding::try_from("windows932".to_owned()).is_err());
    }

    #[test]
    fn utf16_roundtrips() {
        let le = b"\xFF\xFE#\x00 \x00B\x01\r\x00\n\x00a\x00\n\x00";
        let d = decode(le).unwrap();
        assert_eq!(d.encoding, Encoding::Utf16Le);
        assert_eq!(d.text, "# ł\na\n");
        assert_eq!(roundtrip(le), le);

        let be = b"\xFE\xFF\x00a\xD8\x3D\xDE\x00\x00\n";
        let d = decode(be).unwrap();
        assert_eq!(d.encoding, Encoding::Utf16Be);
        assert_eq!(d.text, "a😀\n");
        assert_eq!(roundtrip(be), be);
    }

    #[test]
    fn invalid_utf16_is_rejected() {
        assert_eq!(decode(b"\xFF\xFEa"), Err(DecodeError::InvalidUtf16));
        assert_eq!(decode(b"\xFF\xFE\x00\xD8"), Err(DecodeError::InvalidUtf16));
    }
}
