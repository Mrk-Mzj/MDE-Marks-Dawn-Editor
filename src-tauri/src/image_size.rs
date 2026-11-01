// The size of an image, read from the header of its file without decoding it,
// so the page can give an image its box before the image loads (docs/SPEC.md,
// "Obrazki"). The size is the one the webview shows: a JPEG photo turned by
// its EXIF orientation, or an AVIF image by its rotation, has width and height
// swapped.

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

/// Bytes read from the start of a file for every format but JPEG, whose
/// segments are skipped one by one; the size of an AVIF or SVG file is in its
/// first few kilobytes.
const HEAD: u64 = 64 * 1024;

/// Width and height in pixels, or `None` when the header gives no size.
pub fn of(path: &Path) -> Option<(u32, u32)> {
    let mut file = File::open(path).ok()?;
    let mut start = [0u8; 4];
    file.read_exact(&mut start).ok()?;
    if start[..2] == [0xff, 0xd8] {
        file.seek(SeekFrom::Start(2)).ok()?;
        return jpeg(&mut file);
    }
    file.seek(SeekFrom::Start(0)).ok()?;
    let mut head = Vec::new();
    file.take(HEAD).read_to_end(&mut head).ok()?;
    let size = match head.get(..4)? {
        [0x89, b'P', b'N', b'G'] => png(&head),
        [b'G', b'I', b'F', b'8'] => gif(&head),
        [b'B', b'M', ..] => bmp(&head),
        [b'R', b'I', b'F', b'F'] => webp(&head),
        _ if head.get(4..8) == Some(b"ftyp") => avif(&head),
        _ => svg(&head),
    }?;
    (size.0 > 0 && size.1 > 0).then_some(size)
}

fn u16_be(b: &[u8], at: usize) -> Option<u32> {
    Some(u16::from_be_bytes(b.get(at..at + 2)?.try_into().ok()?) as u32)
}

fn u16_le(b: &[u8], at: usize) -> Option<u32> {
    Some(u16::from_le_bytes(b.get(at..at + 2)?.try_into().ok()?) as u32)
}

fn u24_le(b: &[u8], at: usize) -> Option<u32> {
    let bytes = b.get(at..at + 3)?;
    Some(bytes[0] as u32 | (bytes[1] as u32) << 8 | (bytes[2] as u32) << 16)
}

fn u32_be(b: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_be_bytes(b.get(at..at + 4)?.try_into().ok()?))
}

fn u32_le(b: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_le_bytes(b.get(at..at + 4)?.try_into().ok()?))
}

fn png(b: &[u8]) -> Option<(u32, u32)> {
    (b.get(12..16)? == b"IHDR").then_some(())?;
    Some((u32_be(b, 16)?, u32_be(b, 20)?))
}

fn gif(b: &[u8]) -> Option<(u32, u32)> {
    Some((u16_le(b, 6)?, u16_le(b, 8)?))
}

fn bmp(b: &[u8]) -> Option<(u32, u32)> {
    // A BITMAPCOREHEADER has 16-bit sizes; later headers 32-bit ones, the
    // height negative for rows stored from the top.
    if u32_le(b, 14)? == 12 {
        return Some((u16_le(b, 18)?, u16_le(b, 20)?));
    }
    let width = u32_le(b, 18)? as i32;
    let height = u32_le(b, 22)? as i32;
    Some((width.unsigned_abs(), height.unsigned_abs()))
}

fn webp(b: &[u8]) -> Option<(u32, u32)> {
    (b.get(8..12)? == b"WEBP").then_some(())?;
    match b.get(12..16)? {
        // Lossy: a key frame starts with the code 9d 01 2a, then 14-bit sizes.
        b"VP8 " => {
            (b.get(23..26)? == [0x9d, 0x01, 0x2a]).then_some(())?;
            Some((u16_le(b, 26)? & 0x3fff, u16_le(b, 28)? & 0x3fff))
        }
        // Lossless: 14 bits of width − 1, then 14 bits of height − 1.
        b"VP8L" => {
            let bits = u32_le(b, 21)?;
            Some(((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1))
        }
        // Extended: the canvas, 24 bits each of width − 1 and height − 1.
        b"VP8X" => Some((u24_le(b, 24)? + 1, u24_le(b, 27)? + 1)),
        _ => None,
    }
}

/// A JPEG from just after its start marker: the size from the frame header,
/// turned by the EXIF orientation found before it.
fn jpeg(file: &mut File) -> Option<(u32, u32)> {
    let mut turned = false;
    loop {
        let mut marker = [0u8; 2];
        file.read_exact(&mut marker).ok()?;
        if marker[0] != 0xff {
            return None;
        }
        // Fill bytes before a marker.
        if marker[1] == 0xff {
            file.seek(SeekFrom::Current(-1)).ok()?;
            continue;
        }
        // Markers without a length.
        if matches!(marker[1], 0x01 | 0xd0..=0xd7) {
            continue;
        }
        let mut length = [0u8; 2];
        file.read_exact(&mut length).ok()?;
        let length = u16::from_be_bytes(length) as u64;
        if length < 2 {
            return None;
        }
        match marker[1] {
            // Start of frame (not DHT c4, JPG c8, DAC cc): precision, height, width.
            0xc0..=0xcf if !matches!(marker[1], 0xc4 | 0xc8 | 0xcc) => {
                let mut frame = [0u8; 5];
                file.read_exact(&mut frame).ok()?;
                let (height, width) = (u16_be(&frame, 1)?, u16_be(&frame, 3)?);
                return Some(if turned { (height, width) } else { (width, height) });
            }
            0xe1 => {
                let mut segment = vec![0u8; length as usize - 2];
                file.read_exact(&mut segment).ok()?;
                turned |= exif_orientation(&segment).is_some_and(|o| (5..=8).contains(&o));
            }
            // The image data starts before any frame header: not a JPEG we know.
            0xda => return None,
            _ => {
                file.seek(SeekFrom::Current(length as i64 - 2)).ok()?;
            }
        }
    }
}

/// The orientation tag (1–8) of an APP1 segment holding EXIF data.
fn exif_orientation(segment: &[u8]) -> Option<u32> {
    let tiff = segment.strip_prefix(b"Exif\0\0")?;
    let big = match tiff.get(..2)? {
        b"MM" => true,
        b"II" => false,
        _ => return None,
    };
    let u16_at = |at: usize| if big { u16_be(tiff, at) } else { u16_le(tiff, at) };
    let u32_at = |at: usize| if big { u32_be(tiff, at) } else { u32_le(tiff, at) };
    let ifd = u32_at(4)? as usize;
    let count = u16_at(ifd)? as usize;
    (0..count).find_map(|i| {
        let entry = ifd + 2 + i * 12;
        (u16_at(entry)? == 0x0112).then(|| u16_at(entry + 8)).flatten()
    })
}

/// The boxes of ISO base media (`size`, `type`, contents) in `b`, from `at`.
fn boxes(b: &[u8], mut at: usize) -> impl Iterator<Item = (&[u8], &[u8])> {
    std::iter::from_fn(move || {
        let size = u32_be(b, at)? as usize;
        let kind = b.get(at + 4..at + 8)?;
        // A size of 0 runs to the end of the file; 1 means a 64-bit size (never in the header boxes).
        let end = if size == 0 { b.len() } else { at.checked_add(size)? };
        let contents = b.get(at + 8..end.min(b.len()))?;
        if size < 8 && size != 0 {
            return None;
        }
        at = end;
        Some((kind, contents))
    })
}

/// AVIF (HEIF): the largest image spatial extent (`ispe`) among the item
/// properties, which is the primary image's (a grid's tiles and thumbnails are
/// smaller), turned when a rotation (`irot`) is a quarter or three.
fn avif(b: &[u8]) -> Option<(u32, u32)> {
    let (_, meta) = boxes(b, 0).find(|(kind, _)| *kind == b"meta")?;
    // `meta` is a full box: version and flags come first.
    let (_, iprp) = boxes(meta, 4).find(|(kind, _)| *kind == b"iprp")?;
    let (_, ipco) = boxes(iprp, 0).find(|(kind, _)| *kind == b"ipco")?;
    let mut size: Option<(u32, u32)> = None;
    let mut turned = false;
    for (kind, contents) in boxes(ipco, 0) {
        if kind == b"ispe" {
            let found = (u32_be(contents, 4)?, u32_be(contents, 8)?);
            if size.is_none_or(|(w, h)| found.0 as u64 * found.1 as u64 > w as u64 * h as u64) {
                size = Some(found);
            }
        } else if kind == b"irot" {
            turned |= contents.first().is_some_and(|angle| angle & 1 == 1);
        }
    }
    size.map(|(w, h)| if turned { (h, w) } else { (w, h) })
}

/// The size an SVG asks for: its `width` and `height` in pixels (or without a
/// unit), one of them and the `viewBox`'s shape, or `None` (a size in other
/// units, or only a `viewBox`).
fn svg(b: &[u8]) -> Option<(u32, u32)> {
    let text = String::from_utf8_lossy(b);
    let start = text.find("<svg")?;
    let tag = &text[start..start + text[start..].find('>')?];
    let attribute = |name: &str| -> Option<&str> {
        let mut rest = tag;
        loop {
            let at = rest.find(name)?;
            let before = rest[..at].chars().last();
            rest = &rest[at + name.len()..];
            if !before.is_some_and(char::is_whitespace) {
                continue;
            }
            let value = rest.trim_start().strip_prefix('=')?.trim_start();
            let quote = value.chars().next().filter(|c| *c == '"' || *c == '\'')?;
            let value = &value[1..];
            return Some(&value[..value.find(quote)?]);
        }
    };
    let pixels = |name: &str| -> Option<f64> {
        let value = attribute(name)?.trim();
        let number = value.strip_suffix("px").unwrap_or(value).trim();
        number.parse::<f64>().ok().filter(|n| n.is_finite() && *n > 0.0)
    };
    let shape = attribute("viewBox").and_then(|value| {
        let numbers: Vec<f64> = value.split([' ', ',']).filter(|s| !s.is_empty()).filter_map(|s| s.parse().ok()).collect();
        (numbers.len() == 4 && numbers[2] > 0.0 && numbers[3] > 0.0).then(|| numbers[2] / numbers[3])
    });
    let (width, height) = match (pixels("width"), pixels("height")) {
        (Some(w), Some(h)) => (w, h),
        (Some(w), None) => (w, w / shape?),
        (None, Some(h)) => (h * shape?, h),
        (None, None) => return None,
    };
    Some((width.round().max(1.0) as u32, height.round().max(1.0) as u32))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn size_of(name: &str, bytes: &[u8]) -> Option<(u32, u32)> {
        let dir = std::env::temp_dir().join(format!("mde-size-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join(name);
        std::fs::write(&path, bytes).unwrap();
        let size = of(&path);
        let _ = std::fs::remove_file(&path);
        size
    }

    #[test]
    fn png_gif_bmp_and_webp_sizes_come_from_their_headers() {
        let mut png = b"\x89PNG\r\n\x1a\n\0\0\0\x0dIHDR".to_vec();
        png.extend(800u32.to_be_bytes());
        png.extend(600u32.to_be_bytes());
        assert_eq!(size_of("a.png", &png), Some((800, 600)));

        let mut gif = b"GIF89a".to_vec();
        gif.extend(320u16.to_le_bytes());
        gif.extend(200u16.to_le_bytes());
        assert_eq!(size_of("a.gif", &gif), Some((320, 200)));

        let mut bmp = vec![b'B', b'M'];
        bmp.extend([0u8; 12]);
        bmp.extend(40u32.to_le_bytes());
        bmp.extend(64i32.to_le_bytes());
        bmp.extend((-32i32).to_le_bytes());
        assert_eq!(size_of("a.bmp", &bmp), Some((64, 32)), "rows from the top");

        let mut lossy = b"RIFF\0\0\0\0WEBPVP8 \0\0\0\0\0\0\0\x9d\x01\x2a".to_vec();
        lossy.extend(640u16.to_le_bytes());
        lossy.extend(480u16.to_le_bytes());
        assert_eq!(size_of("a.webp", &lossy), Some((640, 480)));

        let mut lossless = b"RIFF\0\0\0\0WEBPVP8L\0\0\0\0\x2f".to_vec();
        lossless.extend((99u32 | 49 << 14).to_le_bytes());
        assert_eq!(size_of("b.webp", &lossless), Some((100, 50)));

        let mut extended = b"RIFF\0\0\0\0WEBPVP8X\0\0\0\0\0\0\0\0".to_vec();
        extended.extend([0xff, 0x03, 0x00, 0x2b, 0x01, 0x00]);
        assert_eq!(size_of("c.webp", &extended), Some((1024, 300)));
    }

    fn jpeg_with(orientation: Option<u16>) -> Vec<u8> {
        let mut jpeg = vec![0xff, 0xd8];
        if let Some(orientation) = orientation {
            // APP1 with a little-endian TIFF header and one IFD entry.
            let mut exif = b"Exif\0\0II\x2a\0".to_vec();
            exif.extend(8u32.to_le_bytes());
            exif.extend(1u16.to_le_bytes());
            exif.extend(0x0112u16.to_le_bytes());
            exif.extend(3u16.to_le_bytes());
            exif.extend(1u32.to_le_bytes());
            exif.extend((orientation as u32).to_le_bytes());
            jpeg.extend([0xff, 0xe1]);
            jpeg.extend((exif.len() as u16 + 2).to_be_bytes());
            jpeg.extend(exif);
        }
        // A table segment to skip, then the frame header.
        jpeg.extend([0xff, 0xdb, 0x00, 0x04, 0x00, 0x00]);
        jpeg.extend([0xff, 0xc2, 0x00, 0x11, 0x08]);
        jpeg.extend(3000u16.to_be_bytes());
        jpeg.extend(4000u16.to_be_bytes());
        jpeg.extend([0u8; 10]);
        jpeg
    }

    #[test]
    fn jpeg_size_follows_the_exif_orientation() {
        assert_eq!(size_of("a.jpg", &jpeg_with(None)), Some((4000, 3000)));
        assert_eq!(size_of("b.jpg", &jpeg_with(Some(1))), Some((4000, 3000)));
        assert_eq!(size_of("c.jpg", &jpeg_with(Some(6))), Some((3000, 4000)), "turned a quarter");
    }

    #[test]
    fn avif_size_is_the_primary_image_turned_by_its_rotation() {
        fn boxed(kind: &[u8], contents: &[u8]) -> Vec<u8> {
            let mut b = ((contents.len() + 8) as u32).to_be_bytes().to_vec();
            b.extend(kind);
            b.extend(contents);
            b
        }
        let ispe = |w: u32, h: u32| {
            let mut c = vec![0u8; 4];
            c.extend(w.to_be_bytes());
            c.extend(h.to_be_bytes());
            boxed(b"ispe", &c)
        };
        let file = |rotation: Option<u8>| {
            let mut ipco = [ispe(256, 144), ispe(1920, 1080)].concat();
            if let Some(angle) = rotation {
                ipco.extend(boxed(b"irot", &[angle]));
            }
            let meta = [vec![0u8; 4], boxed(b"iprp", &boxed(b"ipco", &ipco))].concat();
            [boxed(b"ftyp", b"avif\0\0\0\0"), boxed(b"meta", &meta)].concat()
        };
        assert_eq!(size_of("a.avif", &file(None)), Some((1920, 1080)));
        assert_eq!(size_of("b.avif", &file(Some(1))), Some((1080, 1920)));
        assert_eq!(size_of("c.avif", &file(Some(2))), Some((1920, 1080)));
    }

    #[test]
    fn svg_size_comes_from_its_attributes() {
        let svg = |tag: &str| size_of("a.svg", format!("<?xml version=\"1.0\"?>\n{tag}<rect/></svg>").as_bytes());
        assert_eq!(svg(r#"<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80px">"#), Some((120, 80)));
        assert_eq!(svg(r#"<svg width='200' viewBox="0 0 100 50">"#), Some((200, 100)));
        assert_eq!(svg(r#"<svg stroke-width="2" height="30" viewBox="0,0,60,30">"#), Some((60, 30)), "not stroke-width");
        assert_eq!(svg(r#"<svg viewBox="0 0 24 24">"#), None);
        assert_eq!(svg(r#"<svg width="50%" height="10em">"#), None);
        assert_eq!(size_of("a.png", b"not an image"), None);
    }
}
