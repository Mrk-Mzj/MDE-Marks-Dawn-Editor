// Tab strip in the top bar: one tab per open document.

export interface TabInfo {
  id: string;
  name: string;
  /** Tooltip: the full path, or the name of a file never saved. */
  tooltip: string;
  dirty: boolean;
}

export interface TabEvents {
  select(id: string): void;
  close(id: string): void;
  /** The tab was dragged to position `index`. */
  move(id: string, index: number): void;
  /** The mouse wheel over the strip: +1 for the next tab, -1 for the previous one. */
  step(direction: 1 | -1): void;
}

interface Labels {
  closeTab: string;
  unsavedChanges: string;
}

/** Pointer travel before a press on a tab turns into dragging it. */
const DRAG_THRESHOLD = 4;
/** Wheel distance that switches a tab; one notch of a mouse wheel is about 100. */
const WHEEL_STEP = 50;

export class TabStrip {
  private readonly elements = new Map<string, HTMLElement>();
  private order: string[] = [];
  private activeId = "";
  private wheel = 0;

  constructor(
    private readonly strip: HTMLElement,
    private readonly events: TabEvents,
    private readonly labels: Labels,
  ) {
    strip.setAttribute("role", "tablist");
    strip.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
        if (Math.sign(delta) !== Math.sign(this.wheel)) this.wheel = 0;
        this.wheel += delta;
        // One tab per notch; touchpads add up small movements.
        if (Math.abs(this.wheel) >= WHEEL_STEP) {
          this.events.step(this.wheel > 0 ? 1 : -1);
          this.wheel = 0;
        }
      },
      { passive: false },
    );
    // Keeps the active tab visible when the window gets narrower.
    new ResizeObserver(() => this.revealActive()).observe(strip);
  }

  /** Shows `tabs` in this order with `activeId` selected. */
  update(tabs: readonly TabInfo[], activeId: string): void {
    const ids = new Set(tabs.map((tab) => tab.id));
    for (const [id, element] of this.elements) {
      if (!ids.has(id)) {
        element.remove();
        this.elements.delete(id);
      }
    }
    tabs.forEach((tab, index) => {
      const element = this.elements.get(tab.id) ?? this.create(tab.id);
      const title = element.querySelector<HTMLElement>(".tab-title")!;
      if (title.textContent !== tab.name) title.textContent = tab.name;
      element.title = tab.tooltip;
      element.classList.toggle("tab-dirty", tab.dirty);
      element.setAttribute("aria-selected", String(tab.id === activeId));
      if (this.strip.children[index] !== element) this.strip.insertBefore(element, this.strip.children[index] ?? null);
    });
    this.order = tabs.map((tab) => tab.id);
    const activeChanged = this.activeId !== activeId;
    this.activeId = activeId;
    if (activeChanged) this.revealActive();
  }

  private create(id: string): HTMLElement {
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.dataset.slot = "tab";
    tab.setAttribute("role", "tab");

    const title = document.createElement("span");
    title.className = "tab-title";

    // The dot and the close button share one slot: the close button replaces
    // the dot while the pointer is over the tab.
    const status = document.createElement("span");
    status.className = "tab-status";
    const dot = document.createElement("span");
    dot.className = "tab-dot";
    dot.setAttribute("aria-label", this.labels.unsavedChanges);
    const close = document.createElement("button");
    close.type = "button";
    close.className = "tab-close";
    close.tabIndex = -1;
    close.title = this.labels.closeTab;
    close.setAttribute("aria-label", this.labels.closeTab);
    close.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>';
    status.append(dot, close);
    tab.append(title, status);

    close.addEventListener("pointerdown", (event) => event.stopPropagation());
    close.addEventListener("click", () => this.events.close(id));
    tab.addEventListener("pointerdown", (event) => {
      if (event.button === 1) {
        // No autoscroll cursor; the tab closes on release (auxclick).
        event.preventDefault();
      } else if (event.button === 0) {
        this.events.select(id);
        this.startDrag(tab, id, event);
      }
    });
    tab.addEventListener("auxclick", (event) => {
      if (event.button === 1) this.events.close(id);
    });

    this.elements.set(id, tab);
    return tab;
  }

  /** Reorders tabs while the pointer drags `tab` along the strip. */
  private startDrag(tab: HTMLElement, id: string, down: PointerEvent): void {
    const grab = down.clientX - tab.getBoundingClientRect().left;
    let dragging = false;

    const onMove = (event: PointerEvent) => {
      if (!dragging) {
        if (Math.abs(event.clientX - down.clientX) < DRAG_THRESHOLD) return;
        dragging = true;
        tab.setPointerCapture(event.pointerId);
        tab.classList.add("tab-dragging");
      }
      const index = this.order.indexOf(id);
      const left = event.clientX - grab;
      const before = this.elements.get(this.order[index - 1]);
      const after = this.elements.get(this.order[index + 1]);
      // Swap with a neighbour once the dragged tab covers half of it.
      if (before && left < centerOf(before)) {
        this.events.move(id, index - 1);
      } else if (after && left + tab.offsetWidth > centerOf(after)) {
        this.events.move(id, index + 1);
      }
      // Keep the tab under the pointer, wherever it now sits in the strip.
      tab.style.transform = "";
      tab.style.transform = `translateX(${left - tab.getBoundingClientRect().left}px)`;
    };
    const onUp = () => {
      tab.removeEventListener("pointermove", onMove);
      tab.removeEventListener("pointerup", onUp);
      tab.removeEventListener("pointercancel", onUp);
      if (dragging) {
        tab.classList.remove("tab-dragging");
        tab.style.transform = "";
      }
    };
    tab.addEventListener("pointermove", onMove);
    tab.addEventListener("pointerup", onUp);
    tab.addEventListener("pointercancel", onUp);
  }

  /** Scrolls the strip (when tabs overflow it) so the active tab is fully visible. */
  private revealActive(): void {
    const tab = this.elements.get(this.activeId);
    if (!tab) return;
    const { strip } = this;
    const left = tab.offsetLeft;
    const right = left + tab.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollLeft = left;
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth;
  }
}

function centerOf(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  return rect.left + rect.width / 2;
}
