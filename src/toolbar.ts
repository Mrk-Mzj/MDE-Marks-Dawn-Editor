// Formatting toolbar above the editor. Buttons that do not fit the panel move
// to a "more" menu at the end of the toolbar.

import { Menu, placeBelow } from "./menu";
import type { MenuEntry } from "./menu";

/**
 * Toolbar icons (24×24): a Lucide outline path, or SVG markup for the icons
 * drawn for MDE (filled letters and shapes, see docs/DESIGN.md).
 */
export const icons = {
  bold:
    '<path class="icon-fill" d="M6,21L6,3.03L12.54,3.03C14.55,3.03 16.09,3.4 17.16,4.13C18.24,4.87 18.78,5.9 18.78,7.24C18.78,8.21 18.45,9.06 17.8,9.78C17.14,10.51 16.3,11.02 15.29,11.3L15.29,11.35C16.56,11.51 17.58,11.98 18.35,12.77C19.11,13.55 19.5,14.51 19.5,15.64C19.5,17.28 18.91,18.59 17.73,19.55C16.55,20.52 14.94,21 12.9,21L6,21ZM10.05,6.01L10.05,10.27L11.83,10.27C12.66,10.27 13.32,10.07 13.8,9.67C14.28,9.26 14.52,8.7 14.52,7.99C14.52,6.67 13.53,6.01 11.56,6.01L10.05,6.01ZM10.05,13.28L10.05,18.02L12.24,18.02C13.18,18.02 13.91,17.8 14.44,17.37C14.97,16.93 15.23,16.34 15.23,15.59C15.23,14.87 14.98,14.3 14.45,13.9C13.93,13.49 13.2,13.28 12.27,13.28L10.05,13.28Z"/>',
  italic:
    '<path class="icon-fill" d="M13.48,21L6.36,21L6.76,19.25L9.12,19.25L12.47,4.78L10.12,4.78L10.52,3.03L17.64,3.03L17.24,4.78L14.89,4.78L11.53,19.25L13.88,19.25L13.48,21Z"/>',
  underline:
    '<path class="icon-fill" d="M18.77,9.92C18.77,15.31 16.35,18 11.48,18C6.83,18 4.5,15.41 4.5,10.23L4.5,3L6.75,3L6.75,10.08C6.75,14.02 8.41,15.98 11.73,15.98C14.93,15.98 16.53,14.08 16.53,10.28L16.53,3L18.77,3L18.77,9.92Z"/>' +
    '<path stroke-width="1.68" d="M6 20.25h12"/>',
  heading:
    '<path class="icon-fill" d="M18.75,21L16.65,21L16.65,12.8L7.35,12.8L7.35,21L5.25,21L5.25,3.03L7.35,3.03L7.35,10.91L16.65,10.91L16.65,3.03L18.75,3.03L18.75,21Z"/>',
  chevronDown: "m6 9 6 6 6-6",
  // Lines keep the stroke widths of the design.
  bulletList:
    '<path stroke-width="1.56" d="M9 5.25h13.5M9 12.75h13.5M9 20.25h13.5"/>' +
    '<circle class="icon-fill" cx="3.75" cy="5.25" r="2.25"/><circle class="icon-fill" cx="3.75" cy="20.25" r="2.25"/>',
  orderedList:
    '<path stroke-width="1.68" d="M10.5 5.25h12M10.5 12.75h12M10.5 20.25h12"/>' +
    '<path class="icon-fill" d="M5.51,3.03L5.51,10.5L3.91,10.5L3.91,4.84C3.82,4.92 3.72,5 3.6,5.07C3.48,5.14 3.35,5.2 3.21,5.25C3.08,5.31 2.93,5.36 2.79,5.4C2.64,5.44 2.5,5.46 2.36,5.48L2.36,4.13C2.77,4 3.17,3.85 3.54,3.66C3.91,3.47 4.24,3.26 4.54,3.03L5.51,3.03Z"/>' +
    '<path class="icon-fill" d="M3.52,19.66L6.62,19.66L6.62,21L1.76,21L1.76,20.45C1.76,20.08 1.82,19.74 1.95,19.44C2.08,19.15 2.23,18.88 2.42,18.64C2.61,18.41 2.82,18.2 3.05,18.02C3.27,17.83 3.49,17.67 3.69,17.52C3.91,17.37 4.09,17.23 4.25,17.09C4.42,16.95 4.55,16.81 4.66,16.67C4.77,16.53 4.86,16.39 4.91,16.25C4.96,16.11 4.99,15.96 4.99,15.8C4.99,15.49 4.9,15.25 4.73,15.09C4.55,14.94 4.28,14.85 3.92,14.85C3.29,14.85 2.69,15.1 2.11,15.6L2.11,14.19C2.75,13.78 3.46,13.57 4.26,13.57C4.63,13.57 4.97,13.62 5.26,13.72C5.55,13.81 5.8,13.95 6.01,14.13C6.21,14.31 6.36,14.53 6.47,14.79C6.58,15.04 6.63,15.33 6.63,15.64C6.63,15.98 6.58,16.28 6.48,16.54C6.37,16.8 6.24,17.04 6.06,17.25C5.89,17.47 5.69,17.67 5.47,17.84C5.25,18.02 5.01,18.19 4.77,18.36C4.61,18.48 4.45,18.59 4.3,18.7C4.15,18.82 4.02,18.93 3.9,19.04C3.79,19.15 3.69,19.26 3.63,19.36C3.56,19.47 3.52,19.57 3.52,19.66Z"/>',
  taskList:
    '<path stroke-width="1.815" d="M13.5 5.25h9M13.5 12.75h9M13.5 20.25h9"/>' +
    '<path stroke-width="1.8" d="M1.5 6 3 10.5 9 3M1.5 16.5 3 21l6-7.5"/>',
  quote:
    '<path class="icon-fill" d="M17.08,3.03L21.62,3.03L21.62,10.89C21.62,13.7 21.02,15.95 19.8,17.63C18.59,19.31 16.78,20.44 14.36,21L14.36,19.31C14.36,18.75 14.47,18.33 14.69,18.05C14.92,17.77 15.38,17.35 16.06,16.79C16.44,16.6 16.85,16.23 17.31,15.67C17.91,14.82 18.25,13.79 18.33,12.58C18.33,12.3 18.29,12.02 18.21,11.73C18.14,11.45 17.76,11.31 17.08,11.31L14.47,11.31L14.47,6.12C14.47,4.06 15.34,3.03 17.08,3.03ZM5.84,3.03L10.27,3.03L10.27,10.89C10.27,13.7 9.66,15.95 8.45,17.63C7.24,19.31 5.42,20.44 3,21L3,19.31C3,18.47 3.61,17.63 4.82,16.79C5.27,16.51 5.69,16.13 6.07,15.67C6.6,14.92 6.9,13.89 6.97,12.58C7.2,11.73 6.82,11.31 5.84,11.31L3.11,11.31L3.11,6.12C3.11,4.06 4.02,3.03 5.84,3.03Z"/>',
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  table:
    '<path class="icon-fill" fill-rule="evenodd" d="M20.4,1.5C21.559,1.5 22.5,2.441 22.5,3.6L22.5,20.4C22.5,21.559 21.559,22.5 20.4,22.5L3.6,22.5C2.441,22.5 1.5,21.559 1.5,20.4L1.5,3.6C1.5,2.441 2.441,1.5 3.6,1.5L20.4,1.5ZM3.3,16.087L3.3,20.4C3.3,20.566 3.434,20.7 3.6,20.7L7.35,20.7L7.35,16.087L3.3,16.087ZM9.15,16.087L9.15,20.7L20.4,20.7C20.566,20.7 20.7,20.566 20.7,20.4L20.7,16.087L9.15,16.087ZM7.35,7.819L7.35,3.3L3.6,3.3C3.434,3.3 3.3,3.434 3.3,3.6L3.3,7.819L7.35,7.819ZM20.7,7.819L20.7,3.6C20.7,3.434 20.566,3.3 20.4,3.3L9.15,3.3L9.15,7.819L20.7,7.819ZM9.15,9.619L9.15,14.287L20.7,14.287L20.7,9.619L9.15,9.619ZM3.3,9.619L3.3,14.287L7.35,14.287L7.35,9.619L3.3,9.619Z"/>',
  mic: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3",
  more: "M11 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0M18 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0M4 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0",
};

/** An icon from `icons`: a path, or SVG markup (starting with `<`) for icons with several shapes. */
function icon(path: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  if (path.startsWith("<")) {
    svg.innerHTML = path;
  } else {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", path);
    svg.append(p);
  }
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

/** A button that opens a popover below it (the table size picker, the link address). */
export interface ToolbarPicker {
  kind: "picker";
  label: string;
  shortcut?: string;
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
    const button = this.createButton(item.label, item.icon, item.kind === "menu" ? undefined : item.shortcut);
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
        entries.push({ label: `${item.label}…`, shortcut: item.shortcut, run: () => item.open(this.moreAnchor, "end") });
      } else {
        entries.push({ label: item.label, shortcut: item.shortcut, run: () => (item.run(), this.focusEditor()) });
      }
    }
    if (entries[entries.length - 1] === "separator") entries.pop();
    return entries;
  }

  /** Where a popover of `item` opens: below its button, or below "more" when the button is hidden there. */
  anchorOf(item: ToolbarItem): { anchor: HTMLElement; align: "start" | "end" } {
    const unit = this.units.find((u) => u.item === item);
    return unit && !unit.el.hidden ? { anchor: unit.el, align: "start" } : { anchor: this.moreAnchor, align: "end" };
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

/** The address of a link, typed in a field below the link button (the one-pane mode). */
export class LinkPicker {
  private readonly panel: HTMLElement;
  private readonly input: HTMLInputElement;
  private anchorEl: HTMLElement | null = null;
  private onApply: ((url: string) => void) | null = null;

  constructor(
    labels: { title: string; placeholder: string },
    private readonly focusEditor: () => void,
  ) {
    this.panel = document.createElement("div");
    this.panel.className = "link-picker";
    this.panel.dataset.slot = "popover";
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-label", labels.title);
    this.panel.hidden = true;
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.className = "link-input";
    this.input.dataset.slot = "input";
    this.input.placeholder = labels.placeholder;
    this.input.spellcheck = false;
    this.input.setAttribute("aria-label", labels.title);
    this.panel.append(this.input);
    document.body.append(this.panel);

    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const apply = this.onApply;
        const url = this.input.value.trim();
        this.hide();
        apply?.(url);
      } else if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        this.hide();
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (this.isOpen && !this.panel.contains(event.target as Node) && !this.anchorEl?.contains(event.target as Node)) {
        this.hide(false);
      }
    });
    window.addEventListener("blur", () => this.hide(false));
    window.addEventListener("resize", () => this.hide(false));
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  /** Opens the field below `anchor` with `url` in it; Enter passes the typed address to `apply`. */
  show(anchor: HTMLElement, align: "start" | "end", url: string, apply: (url: string) => void): void {
    if (this.isOpen && this.anchorEl === anchor) {
      this.hide();
      return;
    }
    this.anchorEl = anchor;
    this.onApply = apply;
    this.input.value = url;
    this.panel.hidden = false;
    placeBelow(this.panel, anchor, align);
    this.input.focus();
    this.input.select();
  }

  hide(restoreFocus = true): void {
    if (!this.isOpen) return;
    this.panel.hidden = true;
    this.onApply = null;
    if (restoreFocus) this.focusEditor();
  }
}
