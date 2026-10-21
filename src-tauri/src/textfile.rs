//! Byte-faithful text file decoding and encoding.
//!
//! The editor works on text with `\n` line breaks only. When a file is read we
//! remember its BOM and dominant line ending so that saving restores them.

const UTF8_BOM: &[u8] = &[0xEF, 0xBB, 0xBF];

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Eol {
    Lf,
    Crlf,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Decoded {
    /// Text with every line break normalized to `\n`.
    pub text: String,
    pub bom: bool,
    pub eol: Eol,
}

#[derive(Debug, PartialEq, Eq)]
pub enum DecodeError {
    /// UTF-16 files are not supported yet.
    Utf16,
    /// The bytes are not valid UTF-8 (e.g. a Windows-1250 file).
    NotUtf8,
}

impl DecodeError {
    /// Stable error code passed to the frontend, which translates it.
    pub fn code(&self) -> &'static str {
        match self {
            DecodeError::Utf16 => "utf16_unsupported",
            DecodeError::NotUtf8 => "not_utf8",
        }
    }
}

pub fn decode(bytes: &[u8]) -> Result<Decoded, DecodeError> {
    if bytes.starts_with(&[0xFF, 0xFE]) || bytes.starts_with(&[0xFE, 0xFF]) {
        return Err(DecodeError::Utf16);
    }
    let bom = bytes.starts_with(UTF8_BOM);
    let body = if bom { &bytes[UTF8_BOM.len()..] } else { bytes };
    // Strict decoding: invalid bytes are an error, never silently replaced.
    let raw = std::str::from_utf8(body).map_err(|_| DecodeError::NotUtf8)?;

    Ok(Decoded {
        text: normalize_line_breaks(raw),
        bom,
        eol: dominant_eol(raw),
    })
}

pub fn encode(text: &str, bom: bool, eol: Eol) -> Vec<u8> {
    let mut out = Vec::with_capacity(text.len() + text.len() / 32 + UTF8_BOM.len());
    if bom {
        out.extend_from_slice(UTF8_BOM);
    }
    match eol {
        Eol::Lf => out.extend_from_slice(text.as_bytes()),
        Eol::Crlf => {
            for (i, line) in text.split('\n').enumerate() {
                if i > 0 {
                    out.extend_from_slice(b"\r\n");
                }
                out.extend_from_slice(line.as_bytes());
            }
        }
    }
    out
}

/// Counts `\r\n` against bare `\n`; ties and files without line breaks get LF.
fn dominant_eol(raw: &str) -> Eol {
    let bytes = raw.as_bytes();
    let (mut crlf, mut lf) = (0usize, 0usize);
    for (i, &b) in bytes.iter().enumerate() {
        if b == b'\n' {
            if i > 0 && bytes[i - 1] == b'\r' {
                crlf += 1;
            } else {
                lf += 1;
            }
        }
    }
    if crlf > lf {
        Eol::Crlf
    } else {
        Eol::Lf
    }
}

/// Mirrors CodeMirror, which treats `\r\n`, `\r` and `\n` as one line break each.
fn normalize_line_breaks(raw: &str) -> String {
    if !raw.contains('\r') {
        return raw.to_owned();
    }
    raw.replace("\r\n", "\n").replace('\r', "\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip(bytes: &[u8]) -> Vec<u8> {
        let d = decode(bytes).expect("decodes");
        encode(&d.text, d.bom, d.eol)
    }

    #[test]
    fn utf8_bom_crlf_roundtrips() {
        let bytes = b"\xEF\xBB\xBF# Tytu\xC5\x82\r\n\r\nZa\xC5\xBC\xC3\xB3\xC5\x82\xC4\x87  \r\n".to_vec();
        let d = decode(&bytes).unwrap();
        assert!(d.bom);
        assert_eq!(d.eol, Eol::Crlf);
        assert!(!d.text.contains('\r'));
        assert_eq!(roundtrip(&bytes), bytes);
    }

    #[test]
    fn utf8_lf_without_final_newline_roundtrips() {
        let bytes = "# Nagłówek\n\n\n\nakapit z dwiema spacjami  \nkoniec".as_bytes();
        let d = decode(bytes).unwrap();
        assert!(!d.bom);
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
    }

    #[test]
    fn mixed_line_endings_pick_dominant_style() {
        let d = decode(b"a\r\nb\r\nc\nd").unwrap();
        assert_eq!(d.eol, Eol::Crlf);
        assert_eq!(d.text, "a\nb\nc\nd");
        assert_eq!(decode(b"a\r\nb\nc\n").unwrap().eol, Eol::Lf);
    }

    #[test]
    fn lone_cr_is_a_line_break() {
        assert_eq!(decode(b"a\rb").unwrap().text, "a\nb");
    }

    #[test]
    fn windows_1250_is_rejected() {
        // "Zażółć" in Windows-1250 is not valid UTF-8.
        let bytes = b"Za\xBF\xF3\xB3\xE6";
        assert_eq!(decode(bytes), Err(DecodeError::NotUtf8));
    }

    #[test]
    fn utf16_is_rejected() {
        assert_eq!(decode(b"\xFF\xFEa\x00"), Err(DecodeError::Utf16));
        assert_eq!(decode(b"\xFE\xFF\x00a"), Err(DecodeError::Utf16));
    }
}
