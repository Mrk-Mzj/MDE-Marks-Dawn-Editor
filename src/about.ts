// The About dialog (hamburger menu › About): the program's name, version,
// copyright and the GPL notice, with links to the project page and the license.

import appIcon from "../src-tauri/icons/icon.svg";
import { t } from "./i18n";
import { appVersion, openUrl } from "./platform";

const NAME = 'MDE: Mark\'s "Dawn" Editor';
const COPYRIGHT = "Copyright © 2026 Marek Mazij";
const PROJECT_URL = "https://github.com/Mrk-Mzj/MDE-Marks-Dawn-Editor";
const LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.html";

function paragraph(className: string, text: string): HTMLParagraphElement {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = text;
  return p;
}

/** A link that opens in the default browser; the page itself never navigates. */
function link(label: string, url: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = url;
  a.title = url;
  a.textContent = label;
  a.addEventListener("click", (event) => {
    event.preventDefault();
    void openUrl(url);
  });
  // A middle click would otherwise try to open a new window.
  a.addEventListener("auxclick", (event) => event.preventDefault());
  return a;
}

export class AboutDialog {
  private readonly dialog: HTMLDialogElement;
  private readonly version: HTMLParagraphElement;

  /** `onClose` gets the focus back where it belongs (the editor). */
  constructor(private readonly onClose: () => void) {
    this.dialog = document.createElement("dialog");
    this.dialog.className = "dialog dialog-about";
    this.dialog.dataset.slot = "dialog";
    this.dialog.setAttribute("aria-labelledby", "about-name");

    const content = document.createElement("div");
    content.className = "dialog-content about";

    const icon = document.createElement("img");
    icon.className = "about-icon";
    icon.src = appIcon;
    icon.alt = "";
    icon.draggable = false;

    const name = document.createElement("h2");
    name.id = "about-name";
    name.className = "about-name";
    name.textContent = NAME;

    this.version = paragraph("about-version", "");

    const links = document.createElement("p");
    links.className = "about-links";
    links.append(link(t.aboutProjectPage, PROJECT_URL), link(t.aboutLicenseText, LICENSE_URL));

    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "button button-primary";
    ok.dataset.slot = "button";
    ok.textContent = t.okButton;
    ok.autofocus = true;
    ok.addEventListener("click", () => this.close());

    const footer = document.createElement("div");
    footer.className = "dialog-footer";
    footer.append(ok);

    content.append(
      icon,
      name,
      this.version,
      paragraph("about-description", t.aboutDescription),
      paragraph("about-copyright", COPYRIGHT),
      paragraph("about-license", t.aboutLicense),
      links,
      footer,
    );
    this.dialog.append(content);
    document.body.append(this.dialog);

    // A click on the dimmed window around the dialog closes it, like Esc. The
    // closing is done here rather than in the "close" event, which comes a
    // task later, after the browser has put the focus back on the menu button.
    this.dialog.addEventListener("click", (event) => {
      if (event.target === this.dialog) this.close();
    });
    this.dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close();
    });

    void appVersion().then((version) => {
      this.version.textContent = t.aboutVersion(version);
    });
  }

  get isOpen(): boolean {
    return this.dialog.open;
  }

  show(): void {
    if (!this.dialog.open) this.dialog.showModal();
  }

  private close(): void {
    this.dialog.close();
    this.onClose();
  }
}
