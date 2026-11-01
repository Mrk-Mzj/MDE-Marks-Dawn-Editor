// Local images in documents (docs/SPEC.md, "Obrazki"): the page loads them
// from the `mdeimg` protocol, which finds the file the way the document names
// it and serves only image files. Inserting an image links it where it is when
// it lies next to the document (or in its Obsidian vault), else copies it into
// an images folder next to the document.

use std::borrow::Cow;
use std::path::{Component, Path, PathBuf};

use tauri::http::{header, Request, Response, StatusCode};

/// The protocol's name: the page loads `http://mdeimg.localhost/?d=…&r=…&w=…`.
pub const SCHEME: &str = "mdeimg";

/// Image types the webview shows, by extension, with their media type.
const TYPES: &[(&str, &str)] = &[
    ("png", "image/png"),
    ("jpg", "image/jpeg"),
    ("jpeg", "image/jpeg"),
    ("gif", "image/gif"),
    ("webp", "image/webp"),
    ("avif", "image/avif"),
    ("bmp", "image/bmp"),
    ("svg", "image/svg+xml"),
];

fn media_type(path: &Path) -> Option<&'static str> {
    let extension = path.extension()?.to_string_lossy().to_lowercase();
    TYPES.iter().find(|(e, _)| *e == extension).map(|(_, t)| *t)
}

/// `C:\…` or `C:/…`: a full path with a drive letter.
fn is_drive_path(reference: &str) -> bool {
    let bytes = reference.as_bytes();
    bytes.len() > 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':' && (bytes[2] == b'/' || bytes[2] == b'\\')
}

/// The image file an image in `document` points to, or `None` when it is not
/// there or not allowed. `reference` is the percent-decoded path from the
/// document (a wikilink name when `wiki`). Relative paths lead from the
/// document's folder; a full path is allowed only in a document that has not
/// been saved yet (`document` is empty), which has no folder.
pub fn resolve(document: &str, reference: &str, wiki: bool) -> Option<PathBuf> {
    let path = if wiki {
        if document.is_empty() {
            return None;
        }
        PathBuf::from(crate::find_wikilink(Path::new(document), reference)?.path)
    } else if is_drive_path(reference) {
        if !document.is_empty() {
            return None;
        }
        PathBuf::from(reference)
    } else {
        // Rooted and network paths, streams (`a.png:x`) and other drives are never followed.
        if document.is_empty() || reference.starts_with(['/', '\\']) || reference.contains(':') {
            return None;
        }
        Path::new(document).parent()?.join(reference)
    };
    let path = std::path::absolute(path).ok()?;
    (media_type(&path).is_some() && path.is_file()).then_some(path)
}

/// Answers a request of the page for an image.
pub fn respond(request: &Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
    let url = tauri::Url::parse(&request.uri().to_string()).ok();
    let param = |name: &str| {
        url.as_ref()
            .and_then(|u| u.query_pairs().find(|(k, _)| k == name).map(|(_, v)| v.into_owned()))
            .unwrap_or_default()
    };
    let found = resolve(&param("d"), &param("r"), param("w") == "1")
        .and_then(|path| Some((media_type(&path)?, std::fs::read(&path).ok()?)));
    let Some((media_type, bytes)) = found else {
        return Response::builder().status(StatusCode::NOT_FOUND).body(Cow::Borrowed(&[][..])).unwrap();
    };
    Response::builder()
        .header(header::CONTENT_TYPE, media_type)
        .header(header::X_CONTENT_TYPE_OPTIONS, "nosniff")
        // An image file may change on disk: the page asks again when it shows it anew.
        .header(header::CACHE_CONTROL, "no-cache")
        // Even opened on its own, an SVG could run nothing and load nothing.
        .header(header::CONTENT_SECURITY_POLICY, "default-src 'none'; style-src 'unsafe-inline'")
        .body(Cow::Owned(bytes))
        .unwrap()
}

/// The full path of an image in `document`, for opening it in the default
/// Windows program; `None` when it is not there.
#[tauri::command]
pub async fn image_path(document: String, reference: String, wiki: bool) -> Option<String> {
    tauri::async_runtime::spawn_blocking(move || resolve(&document, &reference, wiki))
        .await
        .ok()
        .flatten()
        .map(|path| path.to_string_lossy().into_owned())
}

/// Lower case components, for comparing Windows paths.
fn parts(path: &Path) -> Vec<String> {
    path.components()
        .filter(|c| !matches!(c, Component::CurDir))
        .map(|c| c.as_os_str().to_string_lossy().to_lowercase())
        .collect()
}

/// `path` relative to the folder `base`, with `/` and `..` (both absolute and
/// normalized), or `None` when it is not inside `within`.
fn relative_within(path: &Path, base: &Path, within: &Path) -> Option<String> {
    let (path_parts, base_parts, within_parts) = (parts(path), parts(base), parts(within));
    if !path_parts.starts_with(&within_parts) || !base_parts.starts_with(&within_parts) {
        return None;
    }
    let common = path_parts.iter().zip(&base_parts).take_while(|(a, b)| a == b).count();
    // The original spelling of the names, not the lower case used for comparing.
    let names: Vec<String> = path.components().map(|c| c.as_os_str().to_string_lossy().into_owned()).collect();
    let mut relative: Vec<String> = vec!["..".to_owned(); base_parts.len() - common];
    relative.extend(names[common..].iter().cloned());
    Some(relative.join("/"))
}

fn same_content(a: &Path, b: &Path) -> bool {
    let same_size = matches!((std::fs::metadata(a), std::fs::metadata(b)), (Ok(x), Ok(y)) if x.len() == y.len());
    same_size && std::fs::read(a).ok().is_some_and(|bytes| std::fs::read(b).ok().is_some_and(|other| bytes == other))
}

/// Where `image` goes in `folder`: its own name, or the same file already
/// there, or the name with a number ("photo (2).png") when another file has it.
fn copy_target(image: &Path, folder: &Path) -> Option<PathBuf> {
    let name = image.file_name()?;
    let stem = image.file_stem()?.to_string_lossy();
    let extension = image.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
    for n in 1.. {
        let target = if n == 1 { folder.join(name) } else { folder.join(format!("{stem} ({n}){extension}")) };
        if !target.exists() || same_content(image, &target) {
            return Some(target);
        }
    }
    None
}

/// Makes `image` (a full path) usable from the Markdown file `document` and
/// returns the path to write in the link, relative to the document's folder,
/// with `/`. An image in the document's folder or below it, or anywhere in its
/// Obsidian vault, is linked where it is; any other is copied into the images
/// folder next to the document ("obrazy" in Polish Windows, else "images"; an
/// existing folder of either name is used).
pub fn place(document: &Path, image: &Path) -> Result<String, String> {
    let folder = std::path::absolute(document.parent().ok_or("no_folder")?).map_err(|e| e.to_string())?;
    let image = std::path::absolute(image).map_err(|e| e.to_string())?;
    if media_type(&image).is_none() || !image.is_file() {
        return Err("not_image".to_owned());
    }
    let vault = folder.ancestors().find(|dir| dir.join(".obsidian").is_dir()).unwrap_or(&folder);
    if let Some(relative) = relative_within(&image, &folder, vault) {
        return Ok(relative);
    }
    let images = ["obrazy", "images"]
        .iter()
        .map(|name| folder.join(name))
        .find(|dir| dir.is_dir())
        .unwrap_or_else(|| folder.join(if crate::runtime_check::ui_is_polish() { "obrazy" } else { "images" }));
    std::fs::create_dir_all(&images).map_err(crate::io_error)?;
    let target = copy_target(&image, &images).ok_or("no_name")?;
    if !target.exists() {
        std::fs::copy(&image, &target).map_err(crate::io_error)?;
    }
    relative_within(&target, &folder, &folder).ok_or_else(|| "no_folder".to_owned())
}

/// See `place`; copying a large photo takes a moment, so it runs off the main thread.
#[tauri::command]
pub async fn place_image(document: String, image: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || place(Path::new(&document), Path::new(&image)))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_images_the_document_may_name_are_found() {
        let root = std::env::temp_dir().join(format!("mde-images-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("docs/pics")).unwrap();
        for file in ["docs/pics/a.png", "docs/b.SVG", "up.jpg", "docs/notes.txt"] {
            std::fs::write(root.join(file), "x").unwrap();
        }
        let doc = root.join("docs/Note.md").to_string_lossy().into_owned();
        let found = |document: &str, reference: &str| resolve(document, reference, false).is_some();

        assert!(found(&doc, "pics/a.png"));
        assert!(found(&doc, "b.SVG"), "extensions in any case");
        assert!(found(&doc, "../up.jpg"), "paths may lead up");
        assert!(!found(&doc, "notes.txt"), "only images");
        assert!(!found(&doc, "missing.png"));
        let full = root.join("up.jpg").to_string_lossy().into_owned();
        assert!(!found(&doc, &full), "no full paths in a saved document");
        assert!(found("", &full), "an unsaved document has only full paths");
        assert!(!found("", "up.jpg"));
        assert!(!found(&doc, "/up.jpg"));
        assert!(!found(&doc, "\\\\server\\share\\a.png"));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn images_are_linked_in_place_or_copied_next_to_the_document() {
        let root = std::env::temp_dir().join(format!("mde-place-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        for dir in ["vault/.obsidian", "vault/Notes", "vault/Files/Deep", "outside"] {
            std::fs::create_dir_all(root.join(dir)).unwrap();
        }
        std::fs::write(root.join("vault/Notes/here.png"), "1").unwrap();
        std::fs::write(root.join("vault/Files/Deep/far.png"), "2").unwrap();
        std::fs::write(root.join("outside/photo.png"), "3").unwrap();
        let other = root.join("outside/other");
        std::fs::create_dir_all(&other).unwrap();
        std::fs::write(other.join("photo.png"), "4").unwrap();
        let doc = root.join("vault/Notes/Note.md");

        assert_eq!(place(&doc, &root.join("vault/Notes/here.png")).unwrap(), "here.png");
        assert_eq!(place(&doc, &root.join("vault/Files/Deep/far.png")).unwrap(), "../Files/Deep/far.png");
        // Outside the vault: copied, once; another file of the same name gets a number.
        let copied = place(&doc, &root.join("outside/photo.png")).unwrap();
        let folder = copied.split('/').next().unwrap().to_owned();
        assert!(folder == "obrazy" || folder == "images", "{copied}");
        assert_eq!(copied, format!("{folder}/photo.png"));
        assert_eq!(place(&doc, &root.join("outside/photo.png")).unwrap(), copied);
        assert_eq!(place(&doc, &other.join("photo.png")).unwrap(), format!("{folder}/photo (2).png"));
        assert_eq!(std::fs::read(root.join("vault/Notes").join(&folder).join("photo (2).png")).unwrap(), b"4");
        assert!(place(&doc, &root.join("outside/missing.png")).is_err());

        // Without a vault only the document's folder (and below) counts.
        std::fs::remove_dir_all(root.join("vault/.obsidian")).unwrap();
        let copied = place(&doc, &root.join("vault/Files/Deep/far.png")).unwrap();
        assert_eq!(copied, format!("{folder}/far.png"));
        let _ = std::fs::remove_dir_all(&root);
    }
}
