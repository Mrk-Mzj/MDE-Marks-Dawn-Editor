// The task-list box, shared by the preview (src/preview.ts) and the one-pane
// mode (src/live.ts). The owner's design is drawn at 14 × 14px (0.875em at
// 16px text), 4.1667 units to a pixel: a 2px frame with outer corners of
// 1.4px and square inner ones, and a 2px tick for a done task. The frame is
// a CSS border of the same geometry (.task-check, .cm-live-check): the
// browser puts borders on whole device pixels, while an SVG on the text
// baseline would blur. The tick is the SVG, laid over the whole box; its
// colour comes from CSS (.task-tick), as the CSP allows no inline styles.

const tick =
  '<svg class="task-tick" viewBox="0 0 58.333 58.333" aria-hidden="true"><path fill="none" stroke-width="8.33" stroke-linecap="round" stroke-linejoin="round" d="M16.667,25l8.333,16.667l25,-37.5"/></svg>';

/** The box's markup; `className` styles the frame, its size and place. */
export function taskBoxHtml(className: string, checked: boolean): string {
  return `<span class="${className}">${checked ? tick : ""}</span>`;
}
