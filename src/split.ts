// The line between the editor and the preview: dragging it changes the share
// of the width each panel gets, a double-click restores the even split.

/** The editor panel's share of the width when nothing is stored. */
export const DEFAULT_SPLIT = 0.5;

/** Neither panel gets narrower than this while dragging, in CSS pixels. */
const MIN_PANE_WIDTH = 200;

/** A stored split, or the default when it is missing or out of range. */
export function validSplit(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value < 1 ? value : DEFAULT_SPLIT;
}

export class Splitter {
  private ratio = DEFAULT_SPLIT;
  private listeners: (() => void)[] = [];

  constructor(
    private readonly workspace: HTMLElement,
    private readonly left: HTMLElement,
    private readonly right: HTMLElement,
    divider: HTMLElement,
    title: string,
  ) {
    divider.title = title;
    divider.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      divider.setPointerCapture(event.pointerId);
      document.body.classList.add("resizing-panes");
    });
    divider.addEventListener("pointermove", (event) => {
      if (!divider.hasPointerCapture(event.pointerId)) return;
      const box = this.workspace.getBoundingClientRect();
      const usable = box.width - divider.offsetWidth;
      if (usable <= 0) return;
      const min = Math.min(MIN_PANE_WIDTH, usable / 2);
      const x = Math.min(Math.max(event.clientX - box.left, min), usable - min);
      this.update(x / usable);
    });
    const stop = (event: PointerEvent) => {
      if (!divider.hasPointerCapture(event.pointerId)) return;
      divider.releasePointerCapture(event.pointerId);
    };
    divider.addEventListener("pointerup", stop);
    divider.addEventListener("pointercancel", stop);
    divider.addEventListener("lostpointercapture", () => {
      document.body.classList.remove("resizing-panes");
    });
    divider.addEventListener("dblclick", () => this.update(DEFAULT_SPLIT));
  }

  /** The editor panel's share of the width, between 0 and 1. */
  get value(): number {
    return this.ratio;
  }

  /** Applies a split without telling the listeners (restoring the session). */
  set(ratio: number): void {
    this.ratio = ratio;
    this.left.style.flexGrow = String(ratio);
    this.right.style.flexGrow = String(1 - ratio);
  }

  /** Called whenever the user changes the split. */
  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  private update(ratio: number): void {
    if (ratio === this.ratio) return;
    this.set(ratio);
    for (const listener of this.listeners) listener();
  }
}
