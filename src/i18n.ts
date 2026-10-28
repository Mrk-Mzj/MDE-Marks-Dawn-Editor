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
  about: "About",
  aboutVersion: (version: string) => `Version ${version}`,
  aboutDescription: "A fast, lightweight editor for text and Markdown files on Windows.",
  aboutLicense:
    "This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License, version 3. It comes with absolutely no warranty.",
  aboutProjectPage: "Project page",
  aboutLicenseText: "License text",
  okButton: "OK",
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
  askUtf8Title: "Character encoding",
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
  taskList: "Task list",
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
  languageName: (mode: "pl" | "en"): string => (mode === "pl" ? "Polish" : "English"),
  missingDictionaryTitle: "Spell checking",
  missingDictionary: (language: string) =>
    `Windows has no ${language} spell checking dictionary. Add the language in Settings › Time & language › Language & region, then switch the language here again.`,
  openSettingsButton: "Open language settings",
  nextLanguageButton: "Change spelling language",
  minimapStatus: (on: boolean) => `Map: ${on ? "on" : "off"}`,
  minimapTitle: (on: boolean): string => (on ? "Click to hide the document map" : "Click to show the document map"),
  syncStatus: (on: boolean) => `Scroll together: ${on ? "on" : "off"}`,
  syncTitle: (on: boolean): string => (on ? "Click to scroll the panels independently" : "Click to scroll both panels together"),
  syncUnavailable: "Scrolling together works with two panes",
  panesStatus: (panes: number) => `Panes: ${panes}`,
  panesTitle: (panes: number): string =>
    panes === 1 ? "Click to show the Markdown source and the preview side by side" : "Click to edit in one pane with the text formatted",
  linkCtrlClick: "Ctrl+click to open",
  linkAddress: "Link address",
  linkPlaceholder: "Type an address, e.g. https://…",
  splitterTitle: "Drag to resize the panels, double-click to split them evenly",
  charCount: (total: string, n: number) => `${total} ${n === 1 ? "character" : "characters"}`,
  charCountSelected: (selected: string, total: string) => `${selected} of ${total} characters`,
  groups: "Tab groups",
  groupsSaveNew: "Save new tab group",
  groupsOpenIn: "Open in a new window:",
  groupCurrent: "– open",
  groupName: "Group name",
  groupTabs: (n: number) => `(${n} ${n === 1 ? "tab" : "tabs"})`,
  groupRename: "Rename",
  groupDelete: "Delete",
  groupExists: "A group with this name already exists",
  askDeleteGroup: "Delete?",
  askDeleteOpenGroup: "Delete the group and close its window?",
  deleteGroupText: (name: string, tabs: number) =>
    `The tab group “${name}” (${tabs} ${tabs === 1 ? "tab" : "tabs"}) will be deleted. The files on disk stay as they are.`,
  deleteButton: "Delete",
  deleteAndCloseButton: "Delete and close",
  groupFailed: "The tab group could not be saved.",
};

type Strings = typeof en;

/** Polish noun form for `n`: 1 znak, 2–4 znaki (but 12–14 znaków), 5+ znaków. */
function polishPlural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const units = n % 10;
  const tens = n % 100;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

const pl: Strings = {
  menu: "Menu",
  newFile: "Nowy plik",
  open: "Otwórz…",
  save: "Zapisz",
  saveAs: "Zapisz jako…",
  closeTab: "Zamknij kartę",
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
  about: "O programie",
  aboutVersion: (version) => `Wersja ${version}`,
  aboutDescription: "Szybki i lekki edytor plików tekstowych i Markdown dla Windows.",
  aboutLicense:
    "Ten program jest wolnym oprogramowaniem: możesz go rozpowszechniać i zmieniać na warunkach licencji GNU General Public License w wersji 3. Program jest dostarczany bez jakiejkolwiek gwarancji.",
  aboutProjectPage: "Strona projektu",
  aboutLicenseText: "Tekst licencji",
  okButton: "OK",
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
  askUtf8Title: "Kodowanie znaków",
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
  taskList: "Lista zadań",
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
  languageName: (mode) => (mode === "pl" ? "polski" : "angielski"),
  missingDictionaryTitle: "Sprawdzanie pisowni",
  missingDictionary: (language) =>
    `Windows nie ma słownika sprawdzania pisowni dla języka: ${language}. Dodaj język w Ustawieniach › Czas i język › Język i region, a potem ponownie wybierz język tutaj.`,
  openSettingsButton: "Otwórz ustawienia języka",
  nextLanguageButton: "Zmień język pisowni",
  minimapStatus: (on) => `Mapa: ${on ? "wł" : "wył"}`,
  minimapTitle: (on) => (on ? "Kliknij, aby ukryć mapę dokumentu" : "Kliknij, aby pokazać mapę dokumentu"),
  syncStatus: (on) => `Przewijaj razem: ${on ? "wł" : "wył"}`,
  syncTitle: (on) => (on ? "Kliknij, aby przewijać panele niezależnie" : "Kliknij, aby przewijać oba panele razem"),
  syncUnavailable: "Przewijanie razem działa w trybie dwóch okien",
  panesStatus: (panes) => `Okna: ${panes}`,
  panesTitle: (panes) =>
    panes === 1 ? "Kliknij, aby pokazać składnię Markdown i podgląd w dwóch oknach" : "Kliknij, aby edytować w jednym oknie ze sformatowanym tekstem",
  linkCtrlClick: "Ctrl+klik, aby otworzyć",
  linkAddress: "Adres linku",
  linkPlaceholder: "Wpisz adres, np. https://…",
  splitterTitle: "Przeciągnij, aby zmienić szerokość paneli; kliknij dwukrotnie, aby wyrównać",
  charCount: (total, n) => `${total} ${polishPlural(n, "znak", "znaki", "znaków")}`,
  // After "z" the noun is always genitive: "z 1 znaku", "z 2 znaków".
  charCountSelected: (selected, total) => `${selected} z ${total} ${total === "1" ? "znaku" : "znaków"}`,
  groups: "Grupy kart",
  groupsSaveNew: "Zapisz nową grupę kart",
  groupsOpenIn: "Otwórz w nowym oknie:",
  groupCurrent: "– otwarta",
  groupName: "Nazwa grupy",
  groupTabs: (n) => `(${n} ${polishPlural(n, "karta", "karty", "kart")})`,
  groupRename: "Zmień nazwę",
  groupDelete: "Usuń",
  groupExists: "Grupa o tej nazwie już istnieje",
  askDeleteGroup: "Usunąć?",
  askDeleteOpenGroup: "Usunąć grupę i zamknąć jej okno?",
  deleteGroupText: (name, tabs) =>
    `Grupa kart „${name}” (${tabs} ${polishPlural(tabs, "karta", "karty", "kart")}) zostanie usunięta. Pliki na dysku pozostaną bez zmian.`,
  deleteButton: "Usuń",
  deleteAndCloseButton: "Usuń i zamknij",
  groupFailed: "Nie udało się zapisać grupy kart.",
};

// The backend reports the Windows display language; the browser's own language is only the fallback (plain browser, tests).
const reported = (window as { __MDE_LANG__?: string }).__MDE_LANG__;
export const lang: "pl" | "en" = (reported ?? navigator.language ?? "en").toLowerCase().startsWith("pl") ? "pl" : "en";
export const t: Strings = lang === "pl" ? pl : en;

document.documentElement.lang = lang;
