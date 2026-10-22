// UI strings. The language follows the Windows display language: Polish for
// Polish Windows, English for everything else.

const en = {
  menu: "Menu",
  newFile: "New file",
  open: "Open…",
  save: "Save",
  saveAs: "Save as…",
  closeTab: "Close tab",
  exit: "Exit",
  untitled: "Untitled",
  unsavedChanges: "Unsaved changes",
  markdownFiles: "Markdown files",
  allFiles: "All files",
  askSaveTitle: "Unsaved changes",
  askSave: (name: string) => `Do you want to save changes to “${name}”?`,
  saveButton: "Save",
  discardButton: "Don't save",
  cancelButton: "Cancel",
  errorTitle: "MDE",
  openFailed: (name: string) => `Could not open “${name}”.`,
  saveFailed: (name: string) => `Could not save “${name}”.`,
  invalidUtf16: "The file is marked as UTF-16 but contains invalid data.",
  notFound: "The file does not exist.",
  changedOnDisk: (name: string) => `“${name}” was changed by another program. Your changes are not saved yet.`,
  reload: "Refresh",
  keepMine: "Close and keep my changes",
  windows1250Notice:
    "This file is not UTF-8, so it was opened as Windows-1250. Check that accented letters look right; the file will be saved in Windows-1250.",
  askUtf8: (name: string, chars: string) =>
    `“${name}” uses the Windows-1250 encoding, which cannot store these characters: ${chars}

Save the file in UTF-8 instead?`,
  saveUtf8Button: "Save in UTF-8",
  closeNotice: "Close",
  emptyPreview: "The preview of the document will appear here.",
  spellStatus: (mode: "pl" | "en" | "off", dictionaryMissing: boolean) => {
    const language = { pl: "Polish", en: "English", off: "off" }[mode];
    return `Spelling: ${language}${dictionaryMissing ? " (no dictionary)" : ""}`;
  },
  spellTitle: (dictionaryMissing: boolean): string =>
    dictionaryMissing
      ? "Windows has no spell checking dictionary for this language. Add the language in Settings › Time & language › Language & region. Click to change the language."
      : "Click to change the spell checking language",
};

type Strings = typeof en;

const pl: Strings = {
  menu: "Menu",
  newFile: "Nowy plik",
  open: "Otwórz…",
  save: "Zapisz",
  saveAs: "Zapisz jako…",
  closeTab: "Zamknij zakładkę",
  exit: "Wyjdź",
  untitled: "Bez tytułu",
  unsavedChanges: "Niezapisane zmiany",
  markdownFiles: "Pliki Markdown",
  allFiles: "Wszystkie pliki",
  askSaveTitle: "Niezapisane zmiany",
  askSave: (name) => `Czy zapisać zmiany w pliku „${name}”?`,
  saveButton: "Zapisz",
  discardButton: "Nie zapisuj",
  cancelButton: "Anuluj",
  errorTitle: "MDE",
  openFailed: (name) => `Nie udało się otworzyć pliku „${name}”.`,
  saveFailed: (name) => `Nie udało się zapisać pliku „${name}”.`,
  invalidUtf16: "Plik jest oznaczony jako UTF-16, ale zawiera nieprawidłowe dane.",
  notFound: "Plik nie istnieje.",
  changedOnDisk: (name) => `Plik „${name}” został zmieniony przez inny program. Twoje zmiany nie są jeszcze zapisane.`,
  reload: "Odśwież",
  keepMine: "Zamknij i zachowaj moje zmiany",
  windows1250Notice:
    "Plik nie jest zapisany w UTF-8, więc otwarto go jako Windows-1250. Sprawdź, czy polskie znaki wyglądają poprawnie; plik zostanie zapisany w Windows-1250.",
  askUtf8: (name, chars) =>
    `Plik „${name}” używa kodowania Windows-1250, w którym nie da się zapisać znaków: ${chars}

Zapisać plik w UTF-8?`,
  saveUtf8Button: "Zapisz w UTF-8",
  closeNotice: "Zamknij",
  emptyPreview: "Tu pojawi się podgląd dokumentu.",
  spellStatus: (mode, dictionaryMissing) => {
    const language = { pl: "polski", en: "angielski", off: "wyłączona" }[mode];
    return `Pisownia: ${language}${dictionaryMissing ? " (brak słownika)" : ""}`;
  },
  spellTitle: (dictionaryMissing) =>
    dictionaryMissing
      ? "Windows nie ma słownika sprawdzania pisowni dla tego języka. Dodaj język w Ustawieniach › Czas i język › Język i region. Kliknij, aby zmienić język."
      : "Kliknij, aby zmienić język sprawdzania pisowni",
};

export const lang: "pl" | "en" = (navigator.language || "en").toLowerCase().startsWith("pl") ? "pl" : "en";
export const t: Strings = lang === "pl" ? pl : en;

document.documentElement.lang = lang;
