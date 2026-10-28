// In-app modal dialogs (docs/DESIGN.md, section 7): questions and messages in
// the dark style of the app, in place of the light native message boxes.

export interface DialogButton<T> {
  label: string;
  value: T;
}

export interface DialogOptions<T> {
  title?: string;
  text: string;
  /** The main action (filled, focused) first, Cancel last. They are shown the other way round:
   *  Cancel on the left, the main action on the right. */
  buttons: DialogButton<T>[];
  /** The answer when the dialog is dismissed with Esc. */
  cancel: T;
}

/** Whether a modal dialog (this one or About) is open; the app's shortcuts wait meanwhile. */
export function isDialogOpen(): boolean {
  return document.querySelector("dialog[open]") !== null;
}

// One dialog at a time: a question asked while another is open waits for it.
let queue: Promise<unknown> = Promise.resolve();

export function showDialog<T>(options: DialogOptions<T>): Promise<T> {
  const answer = queue.then(() => ask(options));
  queue = answer.catch(() => undefined);
  return answer;
}

function ask<T>({ title, text, buttons, cancel }: DialogOptions<T>): Promise<T> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "dialog";
    dialog.dataset.slot = "alert-dialog";
    dialog.setAttribute("role", "alertdialog");

    const content = document.createElement("div");
    content.className = "dialog-content";

    if (title) {
      const heading = document.createElement("h2");
      heading.id = "dialog-title";
      heading.className = "dialog-title";
      heading.textContent = title;
      content.append(heading);
      dialog.setAttribute("aria-labelledby", heading.id);
    }
    const description = document.createElement("p");
    description.id = "dialog-text";
    description.className = title ? "dialog-text" : "dialog-text dialog-text-only";
    description.textContent = text;
    content.append(description);
    dialog.setAttribute("aria-describedby", description.id);

    const finish = (value: T) => {
      // Closing puts the focus back where it was before the dialog opened.
      dialog.close();
      dialog.remove();
      resolve(value);
    };

    const footer = document.createElement("div");
    footer.className = "dialog-footer";
    // Right to left in the order given, so Tab also moves from Cancel to the main action.
    [...buttons].reverse().forEach(({ label, value }, reversed) => {
      const index = buttons.length - 1 - reversed;
      const button = document.createElement("button");
      button.type = "button";
      button.className = index === 0 ? "button button-primary" : "button button-outline";
      button.dataset.slot = "button";
      button.textContent = label;
      button.autofocus = index === 0;
      button.addEventListener("click", () => finish(value));
      footer.append(button);
    });
    content.append(footer);

    // Esc answers with `cancel`; a click outside does nothing, so a question
    // is never dismissed by accident.
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(cancel);
    });

    dialog.append(content);
    document.body.append(dialog);
    dialog.showModal();
  });
}
