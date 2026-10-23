// The window has no system title bar: the top bar takes its place. Its empty
// parts move the window (double click maximizes), and the minimize, maximize
// and close buttons sit at its right end.

import { t } from "./i18n";
import * as platform from "./platform";

const icons = {
  minimize: '<path d="M5 12h14" />',
  maximize: '<rect x="5.5" y="5.5" width="13" height="13" rx="1.5" />',
  restore: '<rect x="5" y="8.5" width="10.5" height="10.5" rx="1.5" /><path d="M8.5 5.5h8.5a2 2 0 0 1 2 2V16" />',
  close: '<path d="M18 6 6 18M6 6l12 12" />',
};

/**
 * Adds the window buttons to `topbar` and lets the parts of it that are not
 * controls (`isEmpty`) drag the window.
 */
export function initTitleBar(topbar: HTMLElement, isEmpty: (target: EventTarget | null) => boolean, close: () => void): void {
  const controls = document.createElement("div");
  controls.className = "window-controls";
  const button = (name: string, label: string, onClick: () => void) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = `window-button window-${name}`;
    element.dataset.slot = "window-button";
    element.tabIndex = -1;
    element.addEventListener("click", onClick);
    controls.append(element);
    setButton(element, label, icons[name as keyof typeof icons]);
    return element;
  };
  button("minimize", t.minimizeWindow, () => void platform.minimizeWindow());
  const maximize = button("maximize", t.maximizeWindow, () => void platform.toggleMaximizeWindow());
  button("close", t.closeWindow, close);
  // Clicking a window button leaves the keyboard focus in the editor.
  controls.addEventListener("mousedown", (event) => event.preventDefault());
  topbar.append(controls);

  void platform.onMaximizedChanged((maximized) => {
    setButton(maximize, maximized ? t.restoreWindow : t.maximizeWindow, maximized ? icons.restore : icons.maximize);
  });

  topbar.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || !isEmpty(event.target)) return;
    event.preventDefault();
    // Windows takes over the mouse while dragging, so the second click of a
    // double click arrives only as another press.
    if (event.detail === 2) void platform.toggleMaximizeWindow();
    else void platform.startWindowDrag();
  });
}

function setButton(element: HTMLButtonElement, label: string, icon: string): void {
  element.title = label;
  element.setAttribute("aria-label", label);
  element.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>`;
}
