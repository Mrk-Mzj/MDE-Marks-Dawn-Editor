// The window has no system title bar: the top bar takes its place. Its empty
// parts move the window (double click maximizes). The minimize, maximize and
// close buttons are native (src-tauri/src/caption.rs), drawn over the space
// reserved here at the right end, so they keep up with the window edge while
// it is resized.

import * as platform from "./platform";

/** Reserves the buttons' space in `topbar` and lets the parts of it that are not controls (`isEmpty`) drag the window. */
export function initTitleBar(topbar: HTMLElement, isEmpty: (target: EventTarget | null) => boolean): void {
  const controls = document.createElement("div");
  controls.className = "window-controls";
  controls.dataset.slot = "window-controls";
  topbar.append(controls);

  topbar.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || !isEmpty(event.target)) return;
    event.preventDefault();
    // Windows takes over the mouse while dragging, so the second click of a
    // double click arrives only as another press.
    if (event.detail === 2) void platform.toggleMaximizeWindow();
    else void platform.startWindowDrag();
  });
}
