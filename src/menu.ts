// Drop-down menus: the hamburger menu in the top-left corner and the menus of
// the formatting toolbar.

export interface MenuItem {
  label: string;
  shortcut?: string;
  /** A check mark slot is shown when set; the mark itself when true. */
  checked?: boolean;
  run: () => void;
}

export type MenuEntry = MenuItem | "separator";

export interface MenuOptions {
  /** Which edge of the anchor the menu lines up with. */
  align?: "start" | "end";
  /** Where the focus goes when the menu closes with Escape; the menu button by default. */
  restoreFocus?: () => void;
}

const CHECK_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>';

/**
 * Places a pop-up `panel` 4px below `anchor`, lined up with its left or right
 * edge and kept inside the window. Fixed positioning keeps it from being
 * clipped by the panels.
 */
export function placeBelow(panel: HTMLElement, anchor: HTMLElement, align: "start" | "end"): void {
  const rect = anchor.getBoundingClientRect();
  const width = panel.offsetWidth;
  const left = align === "start" ? rect.left : rect.right - width;
  panel.style.left = `${Math.max(4, Math.min(left, window.innerWidth - width - 4))}px`;
  panel.style.top = `${rect.bottom + 4}px`;
}

export class Menu {
  private readonly panel: HTMLElement;
  private open = false;

  /** `entries` may be a function, called each time the menu opens. */
  constructor(
    private readonly button: HTMLButtonElement,
    private readonly entries: MenuEntry[] | (() => MenuEntry[]),
    private readonly options: MenuOptions = {},
  ) {
    this.panel = document.createElement("div");
    this.panel.className = "menu";
    this.panel.dataset.slot = "dropdown-menu";
    this.panel.setAttribute("role", "menu");
    this.panel.hidden = true;
    if (Array.isArray(entries)) this.render(entries);

    button.after(this.panel);
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => (this.open ? this.hide() : this.show()));

    this.panel.addEventListener("keydown", (event) => this.onKeyDown(event));
    document.addEventListener("pointerdown", (event) => {
      if (this.open && !this.panel.contains(event.target as Node) && !button.contains(event.target as Node)) {
        this.hide(false);
      }
    });
    window.addEventListener("blur", () => this.hide(false));
    window.addEventListener("resize", () => this.hide(false));
  }

  private render(entries: MenuEntry[]): void {
    this.panel.replaceChildren();
    for (const entry of entries) {
      if (entry === "separator") {
        const sep = document.createElement("div");
        sep.className = "menu-separator";
        sep.setAttribute("role", "separator");
        this.panel.append(sep);
        continue;
      }
      const item = document.createElement("button");
      item.type = "button";
      item.className = "menu-item";
      item.dataset.slot = "dropdown-menu-item";
      item.setAttribute("role", entry.checked === undefined ? "menuitem" : "menuitemradio");
      item.tabIndex = -1;
      if (entry.checked !== undefined) {
        item.setAttribute("aria-checked", String(entry.checked));
        const check = document.createElement("span");
        check.className = "menu-check";
        if (entry.checked) check.innerHTML = CHECK_ICON;
        item.append(check);
      }
      const label = document.createElement("span");
      label.className = "menu-label";
      label.textContent = entry.label;
      item.append(label);
      if (entry.shortcut) {
        const kbd = document.createElement("span");
        kbd.className = "menu-shortcut";
        kbd.textContent = entry.shortcut;
        item.append(kbd);
      }
      item.addEventListener("click", () => {
        this.hide();
        entry.run();
      });
      this.panel.append(item);
    }
  }

  private items(): HTMLButtonElement[] {
    return [...this.panel.querySelectorAll<HTMLButtonElement>(".menu-item")];
  }

  show(): void {
    if (typeof this.entries === "function") this.render(this.entries());
    this.open = true;
    this.panel.hidden = false;
    placeBelow(this.panel, this.button.parentElement ?? this.button, this.options.align ?? "start");
    this.button.setAttribute("aria-expanded", "true");
    const items = this.items();
    (items.find((item) => item.getAttribute("aria-checked") === "true") ?? items[0])?.focus();
  }

  hide(restoreFocus = true): void {
    if (!this.open) return;
    this.open = false;
    this.panel.hidden = true;
    this.button.setAttribute("aria-expanded", "false");
    if (restoreFocus) (this.options.restoreFocus ?? (() => this.button.focus()))();
  }

  private onKeyDown(event: KeyboardEvent): void {
    const items = this.items();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();
    switch (event.key) {
      case "ArrowDown":
        focusAt(index + 1);
        break;
      case "ArrowUp":
        focusAt(index - 1);
        break;
      case "Home":
        focusAt(0);
        break;
      case "End":
        focusAt(items.length - 1);
        break;
      case "Escape":
      case "Tab":
        this.hide();
        break;
      default:
        return;
    }
    event.preventDefault();
  }
}
