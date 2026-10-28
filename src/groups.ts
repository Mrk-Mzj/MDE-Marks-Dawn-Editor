// Tab groups (like the workspaces of Edge): the button at the right end of the
// top bar and its list of the saved groups. Each group opens in a window of its
// own; the backend keeps the list (src-tauri/src/groups.rs).

import { isDialogOpen } from "./dialog";
import { placeBelow } from "./menu";
import type { GroupInfo } from "./platform";

export interface GroupLabels {
  groups: string;
  saveNew: string;
  /** Heading of the list. */
  openIn: string;
  /** After the tab count of this window's group. */
  current: string;
  placeholder: string;
  tabs: (n: number) => string;
  rename: string;
  remove: string;
  exists: string;
  cancel: string;
  save: string;
}

export interface GroupActions {
  list(): Promise<GroupInfo[]>;
  /** Saves this window's tabs as a new group; an error code on failure. */
  create(name: string): Promise<string | null>;
  rename(id: string, name: string): Promise<string | null>;
  open(id: string): void;
  /** Asks and deletes the group. */
  remove(group: GroupInfo): Promise<void>;
  /** The number of tabs of this window, shown live for its own group. */
  tabCount(): number;
  /** The popover closed; the focus goes back to the editor. */
  closed(): void;
}

const PENCIL =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></svg>';
const TRASH =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11v6M14 11v6" /></svg>';

/** The group whose name is being typed: `null` for a new group. */
interface Editing {
  id: string | null;
  draft: string;
}

export class GroupsPopover {
  private readonly panel: HTMLElement;
  private groups: GroupInfo[] = [];
  private editing: Editing | null = null;
  private saving = false;

  constructor(
    private readonly button: HTMLButtonElement,
    private readonly labels: GroupLabels,
    private readonly actions: GroupActions,
  ) {
    button.title = labels.groups;
    button.setAttribute("aria-label", labels.groups);
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => (this.isOpen ? this.hide() : void this.show()));

    this.panel = document.createElement("div");
    this.panel.className = "groups";
    this.panel.dataset.slot = "popover";
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-label", labels.groups);
    this.panel.hidden = true;
    document.body.append(this.panel);

    this.panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.editing) {
        event.preventDefault();
        this.hide();
      }
    });
    document.addEventListener("pointerdown", (event) => {
      // The question of the trash button is answered over the list, which stays open.
      if (!this.isOpen || isDialogOpen()) return;
      const target = event.target as Node;
      if (!this.panel.contains(target) && !button.contains(target)) this.hide(false);
    });
    window.addEventListener("blur", () => this.hide(false));
    window.addEventListener("resize", () => this.hide(false));
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  async show(): Promise<void> {
    this.editing = null;
    this.groups = await this.actions.list();
    this.panel.hidden = false;
    this.button.setAttribute("aria-expanded", "true");
    this.render();
    placeBelow(this.panel, this.button.parentElement ?? this.button, "end");
    this.panel.querySelector<HTMLElement>(".groups-new")?.focus();
  }

  hide(restoreFocus = true): void {
    if (!this.isOpen) return;
    this.panel.hidden = true;
    this.editing = null;
    this.button.setAttribute("aria-expanded", "false");
    if (restoreFocus) this.actions.closed();
  }

  /** Reloads the list (another window renamed, added or deleted a group). */
  async refresh(): Promise<void> {
    if (!this.isOpen) return;
    this.groups = await this.actions.list();
    if (this.editing?.id && !this.groups.some((g) => g.id === this.editing?.id)) this.editing = null;
    this.render();
  }

  private render(): void {
    const focusedInput = document.activeElement instanceof HTMLInputElement && this.panel.contains(document.activeElement);
    const newItem = document.createElement("button");
    newItem.type = "button";
    newItem.className = "menu-item groups-new";
    newItem.textContent = this.labels.saveNew;
    newItem.addEventListener("click", () => this.startEditing(null, ""));
    this.panel.replaceChildren(newItem);

    if (this.groups.length === 0 && this.editing?.id !== null) return;
    const separator = document.createElement("div");
    separator.className = "menu-separator";
    separator.setAttribute("role", "separator");
    const heading = document.createElement("div");
    heading.className = "groups-heading";
    heading.textContent = this.labels.openIn;
    const list = document.createElement("div");
    list.className = "groups-list";
    list.setAttribute("role", "list");
    if (this.editing?.id === null) list.append(this.editRow());
    for (const group of this.groups) {
      list.append(this.editing?.id === group.id ? this.editRow() : this.itemRow(group));
    }
    this.panel.append(separator, heading, list);
    if (focusedInput || this.editing) this.panel.querySelector<HTMLInputElement>(".groups-input")?.focus();
  }

  private itemRow(group: GroupInfo): HTMLElement {
    const row = document.createElement("div");
    row.className = "groups-item";
    row.setAttribute("role", "listitem");
    row.tabIndex = 0;
    row.title = group.name;
    if (group.current) row.setAttribute("aria-current", "true");

    const name = document.createElement("span");
    name.className = "groups-name";
    name.textContent = group.name;
    const count = document.createElement("span");
    count.className = "groups-count";
    const tabs = this.labels.tabs(group.current ? this.actions.tabCount() : group.tabs);
    count.textContent = group.current ? `${tabs} ${this.labels.current}` : tabs;
    row.append(name, count, this.iconButton(PENCIL, this.labels.rename, () => this.startEditing(group.id, group.name)),
      this.iconButton(TRASH, this.labels.remove, () => void this.actions.remove(group)));

    const open = () => {
      if (group.current) {
        this.hide();
        return;
      }
      this.hide(false);
      this.actions.open(group.id);
    };
    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target === row) {
        event.preventDefault();
        open();
      }
    });
    return row;
  }

  private iconButton(icon: string, label: string, run: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button groups-action";
    button.dataset.slot = "button";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = icon;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      run();
    });
    return button;
  }

  private startEditing(id: string | null, name: string): void {
    this.editing = { id, draft: name };
    this.render();
    this.panel.querySelector<HTMLInputElement>(".groups-input")?.select();
  }

  private stopEditing(): void {
    this.editing = null;
    this.render();
    this.panel.querySelector<HTMLElement>(".groups-new")?.focus();
  }

  /** Why the name cannot be saved: `empty`, `exists`, or `null` when it can. */
  private problem(draft: string, id: string | null): "empty" | "exists" | null {
    const name = draft.trim().toLocaleLowerCase();
    if (!name) return "empty";
    return this.groups.some((g) => g.id !== id && g.name.toLocaleLowerCase() === name) ? "exists" : null;
  }

  private editRow(): HTMLElement {
    const editing = this.editing!;
    const row = document.createElement("div");
    row.className = "groups-edit";
    row.setAttribute("role", "listitem");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "link-input groups-input";
    input.dataset.slot = "input";
    input.maxLength = 100;
    input.spellcheck = false;
    input.placeholder = this.labels.placeholder;
    input.setAttribute("aria-label", this.labels.placeholder);
    input.value = editing.draft;

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "button button-outline";
    cancel.dataset.slot = "button";
    cancel.textContent = this.labels.cancel;
    cancel.addEventListener("click", () => this.stopEditing());

    const save = document.createElement("button");
    save.type = "button";
    save.className = "button button-primary";
    save.dataset.slot = "button";
    save.textContent = this.labels.save;

    const validate = () => {
      const problem = this.problem(input.value, editing.id);
      save.disabled = problem !== null;
      save.title = problem === "exists" ? this.labels.exists : "";
    };
    const submit = async () => {
      if (this.saving || this.problem(input.value, editing.id)) return;
      this.saving = true;
      try {
        const name = input.value.trim();
        const error = editing.id === null ? await this.actions.create(name) : await this.actions.rename(editing.id, name);
        if (error) {
          validate();
          return;
        }
        this.editing = null;
        this.groups = await this.actions.list();
        this.render();
        this.panel.querySelector<HTMLElement>(".groups-new")?.focus();
      } finally {
        this.saving = false;
      }
    };
    input.addEventListener("input", () => {
      editing.draft = input.value;
      validate();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void submit();
      } else if (event.key === "Escape") {
        // Only the typing stops; the list stays open.
        event.preventDefault();
        event.stopPropagation();
        this.stopEditing();
      }
    });
    save.addEventListener("click", () => void submit());
    validate();

    row.append(input, cancel, save);
    return row;
  }
}
