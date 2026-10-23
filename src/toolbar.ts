// Formatting toolbar above the editor. Buttons that do not fit the panel move
// to a "more" menu at the end of the toolbar.

import { Menu, placeBelow } from "./menu";
import type { MenuEntry } from "./menu";

/** Lucide icon paths (outline, 24×24). */
export const icons = {
  bold: "M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8",
  italic: "M19 4h-9M14 20H5M15 4 9 20",
  underline: "M6 4v6a6 6 0 0 0 12 0V4M4 20h16",
  heading: "M6 12h12M6 20V4M18 20V4",
  chevronDown: "m6 9 6 6 6-6",
  bulletList: "M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13",
  orderedList: "M10 12h11M10 18h11M10 6h11M4 10h2M4 6h1v4M6 18H4c0-1 2-2 2-3s-1-1.5-2-1",
  quote: "M17 6H3M21 12H8M21 18H8M3 12v6",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  table: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM3 9h18M3 15h18M12 3v18",
  more: "M11 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0M18 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0M4 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0",
};

function icon(path: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  // The bold icon is drawn heavier than the others, so it reads as bold.
  svg.setAttribute("class", path === icons.bold ? "icon icon-bold" : "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", path);
  svg.append(p);
  return svg;
}

export interface ToolbarButton {
  kind: "button";
  label: string;
  shortcut?: string;
  icon: string;
  run: () => void;
  /** Whether the button shows as pressed (the line with the cursor already has this format). */
  pressed?: () => boolean;
}

export interface ToolbarMenu {
  kind: "menu";
  label: string;
  icon: string;
  entries: () => MenuEntry[];
}

/** A button that opens the table size picker. */
export interface ToolbarPicker {
  kind: "picker";
  label: string;
  icon: string;
  open: (anchor: HTMLElement, align: "start" | "end") => void;
}

export type ToolbarItem = ToolbarButton | ToolbarMenu | ToolbarPicker;

interface Unit {
  el: HTMLElement;
  /** Null for a separator. */
  item: ToolbarItem | null;
  width: number;
  button?: HTMLButtonElement;
}

const GAP = 2;

export class Toolbar {
  private readonly units: Unit[] = [];
  private readonly moreAnchor: HTMLElement;
  private readonly moreButton: HTMLButtonElement;
  private hidden: ToolbarItem[] = [];

  constructor(
    private readonly root: HTMLElement,
    groups: ToolbarItem[][],
    labels: { toolbar: string; more: string },
    private readonly focusEditor: () => void,
  ) {
    root.setAttribute("role", "toolbar");
    root.setAttribute("aria-label", labels.toolbar);
    // Clicking a button must not take the focus (and the selection) away from the editor.
    root.addEventListener("mousedown", (event) => {
      if ((event.target as Element).closest("button")) event.preventDefault();
    });

    for (const [g, group] of groups.entries()) {
      if (g > 0) {
        const sep = document.createElement("div");
        sep.className = "toolbar-separator";
        sep.setAttribute("role", "separator");
        sep.setAttribute("aria-orientation", "vertical");
        this.units.push({ el: sep, item: null, width: 0 });
      }
      for (const item of group) this.units.push(this.createUnit(item));
    }

    this.moreButton = this.createButton(labels.more, icons.more);
    this.moreAnchor = this.anchor(this.moreButton);
    new Menu(this.moreButton, () => this.overflowEntries(), { align: "end", restoreFocus: focusEditor });

    root.append(...this.units.map((u) => u.el), this.moreAnchor);
    for (const unit of this.units) unit.width = unit.el.offsetWidth;
    new ResizeObserver(() => this.fit()).observe(root);
  }

  private createButton(label: string, path: string, shortcut?: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button";
    button.dataset.slot = "button";
    button.setAttribute("aria-label", label);
    button.title = shortcut ? `${label} (${shortcut})` : label;
    button.append(icon(path));
    return button;
  }

  /** Menus are placed below their anchor, which spans the toolbar's height. */
  private anchor(button: HTMLButtonElement): HTMLElement {
    const anchor = document.createElement("div");
    anchor.className = "menu-anchor";
    anchor.append(button);
    return anchor;
  }

  private createUnit(item: ToolbarItem): Unit {
    const button = this.createButton(item.label, item.icon, item.kind === "button" ? item.shortcut : undefined);
    if (item.kind === "button") {
      button.addEventListener("click", () => {
        item.run();
        this.focusEditor();
      });
      return { el: button, item, width: 0, button };
    }
    const anchor = this.anchor(button);
    if (item.kind === "menu") {
      button.classList.add("icon-button-menu");
      button.append(icon(icons.chevronDown));
      new Menu(button, item.entries, { restoreFocus: this.focusEditor });
    } else {
      button.setAttribute("aria-haspopup", "dialog");
      button.addEventListener("click", () => item.open(anchor, "start"));
    }
    return { el: anchor, item, width: 0, button };
  }

  /** Hides the buttons that do not fit, from the end, behind the "more" button. */
  private fit(): void {
    const style = getComputedStyle(this.root);
    const available = this.root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const total = this.units.reduce((sum, u) => sum + u.width, 0) + GAP * (this.units.length - 1);
    let visible = this.units.length;
    if (total > available) {
      let used = this.moreButton.offsetWidth || 32;
      visible = 0;
      while (visible < this.units.length && used + GAP + this.units[visible].width <= available) {
        used += GAP + this.units[visible].width;
        visible++;
      }
      // A separator never ends the visible part.
      while (visible > 0 && this.units[visible - 1].item === null) visible--;
    }
    this.units.forEach((u, i) => (u.el.hidden = i >= visible));
    this.hidden = this.units.slice(visible).flatMap((u) => (u.item ? [u.item] : []));
    this.moreAnchor.hidden = this.hidden.length === 0;
  }

  private overflowEntries(): MenuEntry[] {
    const entries: MenuEntry[] = [];
    for (const item of this.hidden) {
      if (item.kind === "menu") {
        if (entries.length > 0) entries.push("separator");
        entries.push(...item.entries(), "separator");
      } else if (item.kind === "picker") {
        entries.push({ label: `${item.label}…`, run: () => item.open(this.moreAnchor, "end") });
      } else {
        entries.push({ label: item.label, shortcut: item.shortcut, run: () => (item.run(), this.focusEditor()) });
      }
    }
    if (entries[entries.length - 1] === "separator") entries.pop();
    return entries;
  }

  /** Updates the pressed state of the buttons for the line with the cursor. */
  refresh(): void {
    for (const unit of this.units) {
      if (unit.item?.kind === "button" && unit.item.pressed && unit.button) {
        unit.button.setAttribute("aria-pressed", String(unit.item.pressed()));
      }
    }
  }
}

/** Grid for choosing the size of a new table, like the one in Word. */
export class TablePicker {
  private readonly panel: HTMLElement;
  private readonly cells: HTMLElement[] = [];
  private readonly sizeLabel: HTMLElement;
  private columns = 2;
  private rows = 2;
  private open = false;

  constructor(
    private readonly size: { columns: number; rows: number },
    private readonly labels: { title: string; size: (columns: number, rows: number) => string },
    private readonly pick: (columns: number, rows: number) => void,
    private readonly focusEditor: () => void,
  ) {
    this.panel = document.createElement("div");
    this.panel.className = "table-picker";
    this.panel.dataset.slot = "popover";
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-label", labels.title);
    this.panel.tabIndex = -1;
    this.panel.hidden = true;

    const grid = document.createElement("div");
    grid.className = "table-picker-grid";
    grid.style.gridTemplateColumns = `repeat(${size.columns}, 16px)`;
    for (let r = 1; r <= size.rows; r++) {
      for (let c = 1; c <= size.columns; c++) {
        const cell = document.createElement("div");
        cell.className = "table-picker-cell";
        cell.addEventListener("pointerenter", () => this.select(c, r));
        cell.addEventListener("click", () => this.choose());
        this.cells.push(cell);
        grid.append(cell);
      }
    }
    this.sizeLabel = document.createElement("div");
    this.sizeLabel.className = "table-picker-label";
    this.panel.append(grid, this.sizeLabel);
    this.panel.addEventListener("mousedown", (event) => event.preventDefault());
    this.panel.addEventListener("keydown", (event) => this.onKeyDown(event));
    document.body.append(this.panel);

    document.addEventListener("pointerdown", (event) => {
      if (this.open && !this.panel.contains(event.target as Node) && !this.anchorEl?.contains(event.target as Node)) this.hide(false);
    });
    window.addEventListener("blur", () => this.hide(false));
    window.addEventListener("resize", () => this.hide(false));
  }

  private anchorEl: HTMLElement | null = null;

  /** Opens the grid below `anchor`, or closes it when it is already open there. */
  show(anchor: HTMLElement, align: "start" | "end"): void {
    if (this.open && this.anchorEl === anchor) {
      this.hide();
      return;
    }
    this.anchorEl = anchor;
    this.open = true;
    this.select(2, 2);
    this.panel.hidden = false;
    placeBelow(this.panel, anchor, align);
    this.panel.focus();
  }

  hide(restoreFocus = true): void {
    if (!this.open) return;
    this.open = false;
    this.panel.hidden = true;
    if (restoreFocus) this.focusEditor();
  }

  private select(columns: number, rows: number): void {
    this.columns = Math.max(1, Math.min(columns, this.size.columns));
    this.rows = Math.max(1, Math.min(rows, this.size.rows));
    this.cells.forEach((cell, i) => {
      const c = (i % this.size.columns) + 1;
      const r = Math.floor(i / this.size.columns) + 1;
      cell.classList.toggle("table-picker-cell-on", c <= this.columns && r <= this.rows);
    });
    this.sizeLabel.textContent = this.labels.size(this.columns, this.rows);
  }

  private choose(): void {
    const { columns, rows } = this;
    this.hide();
    this.pick(columns, rows);
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowRight":
        this.select(this.columns + 1, this.rows);
        break;
      case "ArrowLeft":
        this.select(this.columns - 1, this.rows);
        break;
      case "ArrowDown":
        this.select(this.columns, this.rows + 1);
        break;
      case "ArrowUp":
        this.select(this.columns, this.rows - 1);
        break;
      case "Enter":
      case " ":
        this.choose();
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
