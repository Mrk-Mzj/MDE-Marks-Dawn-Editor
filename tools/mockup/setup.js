// Runs in the MDE page: puts the app in the state shown by the mockup.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // A fresh dev server prepares its dependencies first, so wait for the app itself.
  const ready = () =>
    document.querySelector("#tabs .tab") &&
    document.querySelector("#editor")?.shadowRoot &&
    getComputedStyle(document.querySelector(".topbar")).height === "40px";
  for (let i = 0; i < 300 && !ready(); i++) await sleep(100);
  await document.fonts.ready;
  await sleep(500);
  document.querySelector("#panes-status").click();
  document.querySelector("#minimap-status").click();
  for (let i = 0; i < 4; i++) {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", code: "KeyN", ctrlKey: true, bubbles: true, cancelable: true }));
    await sleep(100);
  }
  const tab = document.querySelectorAll("#tabs .tab")[1];
  tab.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
  tab.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 }));
  tab.click();
  await sleep(200);
  const text = `# Plan wydania 0.2

Ten dokumnet zbiera **najważniejsze zmiany** w kolejnej wersji edytora MDE. Szczegóły techniczne opisuje plik [SPEC.md](docs/SPEC.md), a wygląd – *DESIGN.md*.

## Nowe funkcje

- Tryb jednego okna z formatowaniem na żywo
- Minimapa całego dokumentu
  - przewijanie przeciąganiem
  - podgląd widocznego fragmentu
- Wyszukiwanie z licznikiem wyników

## Do zrobienia

- [x] Pasek formatowania z listą zadań
- [x] Zapamiętywanie sesji
- [ ] Własne, ciemne okna dialogowe
- [ ] Testy kodowania Windows-1250

> Plik jest źródłem prawdy: otwarcie i zapis bez edycji daje identyczne bajty.

Skrót \`Ctrl+Shift+S\` otwiera okno <kbd>Zapisz jako</kbd>.

| Skrót | Polecenie |
|---|---|
| Ctrl+N | Nowy plik |
| Ctrl+F | Znajdź |

\`\`\`ts
const zoom = stepZoom(zoom, 1);
\`\`\`

### Notatki

Kolory podglądu są zgodne z trybem jednego okna, a odstępy wynikają wyłącznie z pustych linii w pliku. Dzięki temu oba widoki mają identyczne pozycje bloków i przewijają się razem.
`;
  const content = document.querySelector("#editor").shadowRoot.querySelector(".cm-content");
  content.focus();
  const data = new DataTransfer();
  data.setData("text/plain", text);
  content.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  await sleep(500);
  content.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", code: "Home", ctrlKey: true, bubbles: true, cancelable: true }));
  await sleep(300);
  document.querySelector("#editor").shadowRoot.querySelector(".cm-scroller").scrollTop = 0;
  await sleep(300);
  document.querySelector("#preview").scrollTop = 0;
  await sleep(500);
  const names = ["README", "Plan wydania", "Notatki ze spotkania", "Lista zakupów", "DESIGN"];
  document.querySelectorAll("#tabs .tab").forEach((t, i) => {
    t.querySelector(".tab-title").textContent = names[i];
    t.classList.toggle("tab-dirty", i === 1);
  });
  document.querySelector("#spell-status-text").textContent = "Pisownia: polski";
  await document.fonts.ready;
  await sleep(1000);
  return document.querySelectorAll("#tabs .tab").length;
})();
