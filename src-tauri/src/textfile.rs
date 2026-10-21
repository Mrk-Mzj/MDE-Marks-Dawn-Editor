//! Byte-faithful text file decoding and encoding.
//!
//! The editor works on text with `\n` line breaks only. When a file is read we
//! remember its encoding, its dominant line ending and every line break that
//! differs from it, so that saving restores them.

const UTF8_BOM: &[u8] = &[0xEF, 0xBB, 0xBF];
const UTF16LE_BOM: &[u8] = &[0xFF, 0xFE];
const UTF16BE_BOM: &[u8] = &[0xFE, 0xFF];

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Encoding {
    Utf8,
    Utf8Bom,
    Utf16Le,
    Utf16Be,
    Windows1250,
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
    /// Characters the target encoding cannot store (distinct, in order of appearance).
    Unrepresentable(String),
}

impl EncodeError {
    /// Stable error code passed to the frontend: `unrepresentable:<chars>`.
    pub fn code(&self) -> String {
        match self {
            EncodeError::Unrepresentable(chars) => format!("unrepresentable:{chars}"),
        }
    }
}

pub fn decode(bytes: &[u8]) -> Result<Decoded, DecodeError> {
    let (raw, encoding) = if let Some(body) = bytes.strip_prefix(UTF8_BOM) {
        (decode_utf8_or_1250(body).0, Encoding::Utf8Bom)
    } else if let Some(body) = bytes.strip_prefix(UTF16LE_BOM) {
        (decode_utf16(body, u16::from_le_bytes)?, Encoding::Utf16Le)
    } else if let Some(body) = bytes.strip_prefix(UTF16BE_BOM) {
        (decode_utf16(body, u16::from_be_bytes)?, Encoding::Utf16Be)
    } else {
        decode_utf8_or_1250(bytes)
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
        Encoding::Windows1250 => {
            let mut missing = String::new();
            for ch in raw.chars() {
                match to_windows_1250(ch) {
                    Some(b) => out.push(b),
                    None if !missing.contains(ch) => missing.push(ch),
                    None => {}
                }
            }
            if !missing.is_empty() {
                return Err(EncodeError::Unrepresentable(missing));
            }
        }
    }
    Ok(out)
}

/// Strict UTF-8 first; anything else is read as Windows-1250, which maps every
/// byte to a character, so no byte is ever replaced or lost.
fn decode_utf8_or_1250(bytes: &[u8]) -> (String, Encoding) {
    match std::str::from_utf8(bytes) {
        Ok(text) => (text.to_owned(), Encoding::Utf8),
        Err(_) => (bytes.iter().map(|&b| from_windows_1250(b)).collect(), Encoding::Windows1250),
    }
}

fn decode_utf16(body: &[u8], unit: fn([u8; 2]) -> u16) -> Result<String, DecodeError> {
    if body.len() % 2 != 0 {
        return Err(DecodeError::InvalidUtf16);
    }
    let units: Vec<u16> = body.chunks_exact(2).map(|c| unit([c[0], c[1]])).collect();
    String::from_utf16(&units).map_err(|_| DecodeError::InvalidUtf16)
}

/// Windows-1250 bytes 0x80–0xFF, as decoded by Windows itself. The five
/// unassigned bytes (0x81, 0x83, 0x88, 0x90, 0x98) map to the C1 controls of
/// the same value, so they survive a round trip.
const WINDOWS_1250_HIGH: [u16; 128] = [
    0x20AC, 0x0081, 0x201A, 0x0083, 0x201E, 0x2026, 0x2020, 0x2021, 0x0088, 0x2030, 0x0160, 0x2039, 0x015A, 0x0164, 0x017D, 0x0179,
    0x0090, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014, 0x0098, 0x2122, 0x0161, 0x203A, 0x015B, 0x0165, 0x017E, 0x017A,
    0x00A0, 0x02C7, 0x02D8, 0x0141, 0x00A4, 0x0104, 0x00A6, 0x00A7, 0x00A8, 0x00A9, 0x015E, 0x00AB, 0x00AC, 0x00AD, 0x00AE, 0x017B,
    0x00B0, 0x00B1, 0x02DB, 0x0142, 0x00B4, 0x00B5, 0x00B6, 0x00B7, 0x00B8, 0x0105, 0x015F, 0x00BB, 0x013D, 0x02DD, 0x013E, 0x017C,
    0x0154, 0x00C1, 0x00C2, 0x0102, 0x00C4, 0x0139, 0x0106, 0x00C7, 0x010C, 0x00C9, 0x0118, 0x00CB, 0x011A, 0x00CD, 0x00CE, 0x010E,
    0x0110, 0x0143, 0x0147, 0x00D3, 0x00D4, 0x0150, 0x00D6, 0x00D7, 0x0158, 0x016E, 0x00DA, 0x0170, 0x00DC, 0x00DD, 0x0162, 0x00DF,
    0x0155, 0x00E1, 0x00E2, 0x0103, 0x00E4, 0x013A, 0x0107, 0x00E7, 0x010D, 0x00E9, 0x0119, 0x00EB, 0x011B, 0x00ED, 0x00EE, 0x010F,
    0x0111, 0x0144, 0x0148, 0x00F3, 0x00F4, 0x0151, 0x00F6, 0x00F7, 0x0159, 0x016F, 0x00FA, 0x0171, 0x00FC, 0x00FD, 0x0163, 0x02D9,
];

fn from_windows_1250(b: u8) -> char {
    if b < 0x80 {
        b as char
    } else {
        // Every table entry is a valid scalar value.
        char::from_u32(WINDOWS_1250_HIGH[(b - 0x80) as usize] as u32).unwrap()
    }
}

fn to_windows_1250(ch: char) -> Option<u8> {
    if (ch as u32) < 0x80 {
        return Some(ch as u8);
    }
    let code = u16::try_from(ch as u32).ok()?;
    WINDOWS_1250_HIGH.iter().position(|&c| c == code).map(|i| 0x80 + i as u8)
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
    fn windows_1250_falls_back_and_roundtrips() {
        // "Zażółć gęślą jaźń" in Windows-1250 is not valid UTF-8.
        let bytes = b"Za\xBF\xF3\xB3\xE6 g\xEA\x9Cl\xB9 ja\x9F\xF1\r\n\x81\x83\x88\x90\x98";
        let d = decode(bytes).unwrap();
        assert_eq!(d.encoding, Encoding::Windows1250);
        assert!(d.text.starts_with("Zażółć gęślą jaźń\n"));
        assert_eq!(roundtrip(bytes), bytes);
    }

    #[test]
    fn windows_1250_table_is_a_bijection() {
        for b in 0..=255u8 {
            assert_eq!(to_windows_1250(from_windows_1250(b)), Some(b));
        }
    }

    #[test]
    fn windows_1250_reports_unrepresentable_characters() {
        let err = encode("ok 😀 → 😀", Encoding::Windows1250, Eol::Lf, &[]).unwrap_err();
        assert_eq!(err, EncodeError::Unrepresentable("😀→".to_owned()));
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
