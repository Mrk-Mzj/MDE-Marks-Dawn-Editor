// Content zoom: the scale of the text in both panels, in percent.

/** Zoom levels in percent; Ctrl+plus and Ctrl+minus move between neighbours. */
const LEVELS = [50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300];

export const DEFAULT_ZOOM = 100;

/** Wheel distance that changes the zoom; one notch of a mouse wheel is about 100. */
export const WHEEL_STEP = 50;

/** A stored zoom value, or the default when it is missing or out of range. */
export function validZoom(value: unknown): number {
  const min = LEVELS[0];
  const max = LEVELS[LEVELS.length - 1];
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : DEFAULT_ZOOM;
}

/** The level one step above (+1) or below (-1) `zoom`; `zoom` itself at the ends. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  const next = direction > 0 ? LEVELS.find((level) => level > zoom) : LEVELS.filter((level) => level < zoom).pop();
  return next ?? zoom;
}
