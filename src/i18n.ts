// UI strings. The language follows the Windows display language: Polish for
// Polish Windows, English for everything else.

const en = {
  menu: "Menu",
  newFile: "New file",
  open: "Open…",
  save: "Save",
  saveAs: "Save as…",
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
  notUtf8:
    "The file is not valid UTF-8 (it may use an older encoding such as Windows-1250). This version of MDE can only open UTF-8 files.",
  utf16Unsupported: "UTF-16 files are not supported yet.",
  emptyPreview: "The preview of the document will appear here.",
};

type Strings = typeof en;

const pl: Strings = {
  menu: "Menu",
  newFile: "Nowy plik",
  open: "Otwórz…",
  save: "Zapisz",
  saveAs: "Zapisz jako…",
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
  notUtf8:
    "Plik nie jest zapisany w UTF-8 (może używać starszego kodowania, np. Windows-1250). Ta wersja MDE otwiera tylko pliki UTF-8.",
  utf16Unsupported: "Pliki UTF-16 nie są jeszcze obsługiwane.",
  emptyPreview: "Tu pojawi się podgląd dokumentu.",
};

export const lang = (navigator.language || "en").toLowerCase().startsWith("pl") ? "pl" : "en";
export const t: Strings = lang === "pl" ? pl : en;

document.documentElement.lang = lang;
