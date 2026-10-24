// UI strings. The language follows the Windows display language: Polish for
// Polish Windows, English for everything else.

const en = {
  menu: "Menu",
  newFile: "New file",
  open: "Open…",
  save: "Save",
  saveAs: "Save as…",
  closeTab: "Close tab",
  find: "Find…",
  findLabel: "Find",
  findPlaceholder: "Find in text",
  findPrevious: "Previous match",
  findNext: "Next match",
  findClose: "Close",
  findMatchCase: "Match case",
  findNoResults: "No results",
  findCount: (current: number, total: number) => `Found: ${current} of ${total}`,
  findTotal: (total: number) => `Found: ${total} ${total === 1 ? "result" : "results"}`,
  exit: "Exit",
  untitled: "Untitled",
  unsavedChanges: "Unsaved changes",
  markdownFiles: "Markdown files",
  textFiles: "Text files",
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
  linkNeedsSave: "Save the file first: a relative link leads from the folder the file is in.",
  linkNotFound: (path: string) => `The linked file does not exist:\n${path}`,
  linkOpenFailed: (target: string) => `Could not open “${target}”.`,
  openLinkTitle: "Open file",
  askOpenLinked: (name: string, path: string) => `Open “${name}” with the default Windows program?\n\n${path}`,
  askOpenProgram: (name: string, path: string) =>
    `“${name}” is a program or a script. Opening it runs it.\n\n${path}\n\nOpen it anyway?`,
  openButton: "Open",
  openAlwaysButton: (extension: string) => `Open and don't ask for .${extension} files`,
  formatting: "Formatting",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  headingMenu: "Paragraph style",
  paragraph: "Paragraph text",
  heading: (level: number) => `Heading ${level}`,
  bulletList: "Bulleted list",
  orderedList: "Numbered list",
  quote: "Quote",
  link: "Link",
  linkText: "link text",
  table: "Table",
  tableSize: (columns: number, rows: number) => `${columns} × ${rows} (columns × rows)`,
  tableColumn: (n: number) => `Column ${n}`,
  more: "More",
  dictation: "Dictation",
  spellStatus: (mode: "pl" | "en" | "off", dictionaryMissing: boolean) => {
    const language = { pl: "Polish", en: "English", off: "off" }[mode];
    return `Spelling: ${language}${dictionaryMissing ? " (no dictionary)" : ""}`;
  },
  spellTitle: (dictionaryMissing: boolean): string =>
    dictionaryMissing
      ? "Windows has no spell checking dictionary for this language. Add the language in Settings › Time & language › Language & region. Click to change the language."
      : "Click to change the spell checking language",
  minimapStatus: (on: boolean) => `Map: ${on ? "on" : "off"}`,
  minimapTitle: (on: boolean): string => (on ? "Click to hide the document map" : "Click to show the document map"),
  syncStatus: (on: boolean) => `Scroll together: ${on ? "on" : "off"}`,
  syncTitle: (on: boolean): string => (on ? "Click to scroll the panels independently" : "Click to scroll both panels together"),
};

type Strings = typeof en;

const pl: Strings = {
  menu: "Menu",
  newFile: "Nowy plik",
  open: "Otwórz…",
  save: "Zapisz",
  saveAs: "Zapisz jako…",
  closeTab: "Zamknij zakładkę",
  find: "Znajdź…",
  findLabel: "Znajdź",
  findPlaceholder: "Szukaj w tekście",
  findPrevious: "Poprzedni wynik",
  findNext: "Następny wynik",
  findClose: "Zamknij",
  findMatchCase: "Uwzględnij wielkość liter",
  findNoResults: "Brak wyników",
  findCount: (current, total) => `Znaleziono: ${current} z ${total}`,
  findTotal: (total) => {
    const units = total % 10;
    const tens = total % 100;
    const word = total === 1 ? "wynik" : units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? "wyniki" : "wyników";
    return `Znaleziono: ${total} ${word}`;
  },
  exit: "Wyjdź",
  untitled: "Bez tytułu",
  unsavedChanges: "Niezapisane zmiany",
  markdownFiles: "Pliki Markdown",
  textFiles: "Pliki tekstowe",
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
  linkNeedsSave: "Najpierw zapisz plik: link względny prowadzi od folderu, w którym jest plik.",
  linkNotFound: (path) => `Plik, do którego prowadzi link, nie istnieje:\n${path}`,
  linkOpenFailed: (target) => `Nie udało się otworzyć „${target}”.`,
  openLinkTitle: "Otwieranie pliku",
  askOpenLinked: (name, path) => `Otworzyć „${name}” w domyślnym programie Windows?\n\n${path}`,
  askOpenProgram: (name, path) =>
    `„${name}” to program lub skrypt. Otwarcie go uruchomi.\n\n${path}\n\nOtworzyć mimo to?`,
  openButton: "Otwórz",
  openAlwaysButton: (extension) => `Otwórz i nie pytaj więcej o pliki .${extension}`,
  formatting: "Formatowanie",
  bold: "Pogrubienie",
  italic: "Kursywa",
  underline: "Podkreślenie",
  headingMenu: "Styl akapitu",
  paragraph: "Tekst akapitowy",
  heading: (level) => `Nagłówek ${level}`,
  bulletList: "Lista punktowana",
  orderedList: "Lista numerowana",
  quote: "Cytat",
  link: "Hiperłącze",
  linkText: "tekst linku",
  table: "Tabela",
  tableSize: (columns, rows) => `${columns} × ${rows} (kolumny × wiersze)`,
  tableColumn: (n) => `Kolumna ${n}`,
  more: "Więcej",
  dictation: "Dyktowanie",
  spellStatus: (mode, dictionaryMissing) => {
    const language = { pl: "polski", en: "angielski", off: "wyłączona" }[mode];
    return `Pisownia: ${language}${dictionaryMissing ? " (brak słownika)" : ""}`;
  },
  spellTitle: (dictionaryMissing) =>
    dictionaryMissing
      ? "Windows nie ma słownika sprawdzania pisowni dla tego języka. Dodaj język w Ustawieniach › Czas i język › Język i region. Kliknij, aby zmienić język."
      : "Kliknij, aby zmienić język sprawdzania pisowni",
  minimapStatus: (on) => `Mapa: ${on ? "wł" : "wył"}`,
  minimapTitle: (on) => (on ? "Kliknij, aby ukryć mapę dokumentu" : "Kliknij, aby pokazać mapę dokumentu"),
  syncStatus: (on) => `Przewijaj razem: ${on ? "wł" : "wył"}`,
  syncTitle: (on) => (on ? "Kliknij, aby przewijać panele niezależnie" : "Kliknij, aby przewijać oba panele razem"),
};

export const lang: "pl" | "en" = (navigator.language || "en").toLowerCase().startsWith("pl") ? "pl" : "en";
export const t: Strings = lang === "pl" ? pl : en;

document.documentElement.lang = lang;
