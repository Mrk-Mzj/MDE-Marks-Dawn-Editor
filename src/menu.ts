// Hamburger menu in the top-left corner.

export interface MenuItem {
  label: string;
  shortcut?: string;
  run: () => void;
}

export type MenuEntry = MenuItem | "separator";

export class Menu {
  private readonly panel: HTMLElement;
  private open = false;

  constructor(private readonly button: HTMLButtonElement, entries: MenuEntry[]) {
    this.panel = document.createElement("div");
    this.panel.className = "menu";
    this.panel.dataset.slot = "dropdown-menu";
    this.panel.setAttribute("role", "menu");
    this.panel.hidden = true;

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
      item.setAttribute("role", "menuitem");
      item.tabIndex = -1;
      const label = document.createElement("span");
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
  }

  private items(): HTMLButtonElement[] {
    return [...this.panel.querySelectorAll<HTMLButtonElement>(".menu-item")];
  }

  show(): void {
    this.open = true;
    this.panel.hidden = false;
    this.button.setAttribute("aria-expanded", "true");
    this.items()[0]?.focus();
  }

  hide(restoreFocus = true): void {
    if (!this.open) return;
    this.open = false;
    this.panel.hidden = true;
    this.button.setAttribute("aria-expanded", "false");
    if (restoreFocus) this.button.focus();
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
