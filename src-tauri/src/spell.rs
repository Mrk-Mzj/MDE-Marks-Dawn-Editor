//! Spell checking with the Windows Spell Checking API (`ISpellChecker`), so no
//! dictionaries are bundled with the app.
//!
//! COM objects live on one dedicated thread; commands send it the words to
//! check and wait for the answer.

use std::collections::HashMap;
use std::sync::mpsc;

use windows::core::{HSTRING, PCWSTR};
use windows::Win32::Globalization::{ISpellChecker, ISpellCheckerFactory, SpellCheckerFactory};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED};

/// Language tags tried for each language the app offers, best match first.
fn language_tags(lang: &str) -> &'static [&'static str] {
    match lang {
        "pl" => &["pl-PL", "pl"],
        "en" => &["en-US", "en-GB", "en"],
        _ => &[],
    }
}

struct Job {
    lang: String,
    words: Vec<String>,
    reply: mpsc::Sender<Result<Option<Vec<String>>, String>>,
}

/// Handle to the spell checking thread.
#[derive(Clone)]
pub struct Worker(mpsc::Sender<Job>);

impl Worker {
    pub fn start() -> Self {
        let (tx, rx) = mpsc::channel::<Job>();
        std::thread::Builder::new()
            .name("spell-check".to_owned())
            .spawn(move || {
                let mut checkers = Checkers::default();
                for job in rx {
                    let _ = job.reply.send(checkers.check(&job.lang, &job.words));
                }
            })
            .expect("could not start the spell checking thread");
        Self(tx)
    }

    /// The words from `words` that are misspelled in `lang` ("pl" or "en"), or
    /// `None` when Windows has no dictionary for that language.
    pub fn check(&self, lang: &str, words: Vec<String>) -> Result<Option<Vec<String>>, String> {
        let (reply, answer) = mpsc::channel();
        self.0
            .send(Job { lang: lang.to_owned(), words, reply })
            .map_err(|_| "the spell checking thread has stopped".to_owned())?;
        answer.recv().map_err(|_| "the spell checking thread has stopped".to_owned())?
    }
}

#[derive(Default)]
struct Checkers {
    factory: Option<ISpellCheckerFactory>,
    /// `None` for a language without a dictionary.
    by_lang: HashMap<String, Option<ISpellChecker>>,
}

impl Checkers {
    fn factory(&mut self) -> Result<&ISpellCheckerFactory, String> {
        if self.factory.is_none() {
            // SAFETY: plain COM calls on the thread that owns every COM object.
            let factory = unsafe {
                // Fails with S_FALSE/RPC_E_CHANGED_MODE when COM is already set up on this thread; both are fine.
                let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
                CoCreateInstance::<_, ISpellCheckerFactory>(&SpellCheckerFactory, None, CLSCTX_INPROC_SERVER)
            }
            .map_err(|e| format!("spell checking is unavailable: {e}"))?;
            self.factory = Some(factory);
        }
        Ok(self.factory.as_ref().unwrap())
    }

    fn checker(&mut self, lang: &str) -> Result<Option<&ISpellChecker>, String> {
        if !self.by_lang.contains_key(lang) {
            let factory = self.factory()?;
            let mut found = None;
            for tag in language_tags(lang) {
                let tag = HSTRING::from(*tag);
                // SAFETY: `tag` outlives the calls.
                let supported = unsafe { factory.IsSupported(&tag) }.map(|b| b.as_bool()).unwrap_or(false);
                if supported {
                    found = unsafe { factory.CreateSpellChecker(&tag) }.ok();
                    break;
                }
            }
            self.by_lang.insert(lang.to_owned(), found);
        }
        Ok(self.by_lang[lang].as_ref())
    }

    fn check(&mut self, lang: &str, words: &[String]) -> Result<Option<Vec<String>>, String> {
        let Some(checker) = self.checker(lang)? else { return Ok(None) };
        let mut misspelled = Vec::new();
        for word in words {
            let text = HSTRING::from(word.as_str());
            // SAFETY: `text` outlives the calls; the enumerator is released on drop.
            let errors = unsafe { checker.Check(PCWSTR(text.as_ptr())) }.map_err(|e| e.to_string())?;
            let mut error = None;
            // S_OK: there is an error in the word; S_FALSE: there is none.
            if unsafe { errors.Next(&mut error) }.0 == 0 && error.is_some() {
                misspelled.push(word.clone());
            }
        }
        Ok(Some(misspelled))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // The dictionaries depend on the languages installed in Windows, so the
    // tests only check what is available.
    #[test]
    fn finds_misspelled_words() {
        let worker = Worker::start();
        let cases = [("en", "house", "hoose"), ("pl", "dom", "domx")];
        for (lang, good, bad) in cases {
            let Some(misspelled) = worker.check(lang, vec![good.to_owned(), bad.to_owned()]).unwrap() else {
                eprintln!("no {lang} dictionary installed, skipped");
                continue;
            };
            assert_eq!(misspelled, vec![bad.to_owned()], "{lang}");
        }
    }

    #[test]
    fn unknown_language_has_no_dictionary() {
        assert_eq!(Worker::start().check("xx", vec!["a".to_owned()]).unwrap(), None);
    }
}
