import type { ConversationIdentifier } from "../../types";

type NativeKind = "archive" | "delete";
interface NativeConfig {
  platform: string;
  path: RegExp;
  sidebar: string;
  timeoutMs?: number;
}
const labels = {
  delete: new Set([
    "delete",
    "delete chat",
    "delete conversation",
    "удалить",
    "удалить чат",
    "удалить разговор",
    "löschen",
    "chat löschen",
    "supprimer",
    "supprimer la conversation",
    "eliminar",
    "eliminar conversación",
  ]),
  archive: new Set([
    "archive",
    "archive chat",
    "archive conversation",
    "архивировать",
    "архивировать чат",
    "архивировать беседу",
    "archivieren",
    "chat archivieren",
    "archiver",
    "archiver la conversation",
    "archivar",
    "archivar conversación",
  ]),
};
const moreLabels =
  /^(more|more options|conversation actions|chat actions|open conversation options|open conversation menu|open menu|open menu for conversation actions\.?|ещё|еще|действия с чатом|дополнительные параметры|weitere optionen|plus d[’']options|más opciones)$/i;
const dialogs = '[role="dialog"],[role="alertdialog"],dialog';
function label(element: Element): string {
  return (element.getAttribute("aria-label") || element.textContent || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
function visible(element: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (
      (node as HTMLElement).hidden ||
      node.getAttribute("aria-hidden") === "true" ||
      getComputedStyle(node).display === "none" ||
      getComputedStyle(node).visibility === "hidden"
    )
      return false;
  }
  return true;
}
function visibleNodes(selector: string): Element[] {
  return [...document.querySelectorAll(selector)].filter(visible);
}
export function conversationTitle(link: HTMLAnchorElement): string {
  const copy = link.cloneNode(true) as HTMLAnchorElement;
  copy
    .querySelectorAll('button,[role="button"],[aria-hidden="true"]')
    .forEach((el) => el.remove());
  return (
    link.dataset.conversationTitle ||
    link.getAttribute("aria-label") ||
    copy.textContent ||
    ""
  )
    .trim()
    .replace(/\s+/g, " ");
}
export async function waitFor<T>(
  get: () => T | undefined,
  signal?: AbortSignal,
  timeout = 2500,
): Promise<T> {
  const started = Date.now();
  while (true) {
    signal?.throwIfAborted();
    const value = get();
    if (value !== undefined) return value;
    if (Date.now() - started >= timeout)
      throw new Error(
        "Native controls changed or timed out. Nothing else will be clicked.",
      );
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

// Every mutation uses the host's own row, menu and confirmation. No private API.
export class NativeActions {
  constructor(
    private config: NativeConfig,
    private onSuccess: (id: ConversationIdentifier) => void,
  ) {}
  private identifier(link: HTMLAnchorElement): string | undefined {
    const url = new URL(link.href, location.href);
    return url.origin === location.origin
      ? url.pathname.match(this.config.path)?.[1]
      : undefined;
  }
  private links(): HTMLAnchorElement[] {
    return [
      ...document.querySelectorAll<HTMLAnchorElement>(this.config.sidebar),
    ].filter((link) => this.identifier(link) && visible(link));
  }
  private controls(row: Element): HTMLElement[] {
    return [
      ...row.querySelectorAll<HTMLElement>('button,[role="button"]'),
    ].filter(
      (el) =>
        !el.hasAttribute("disabled") &&
        el.getAttribute("aria-disabled") !== "true" &&
        (moreLabels.test(label(el)) ||
          el.getAttribute("data-mat-icon-name") === "more_vert" ||
          !!el.querySelector('[data-mat-icon-name="more_vert"]') ||
          [...el.querySelectorAll("mat-icon")].some(
            (icon) => icon.textContent?.trim() === "more_vert",
          ) ||
          (el.getAttribute("aria-haspopup") === "menu" &&
            /history-item.*options/.test(
              el.getAttribute("data-testid") || "",
            ))),
    );
  }
  private target(id: ConversationIdentifier) {
    if (id.platform !== this.config.platform || !/^[\w-]+$/.test(id.id))
      throw new Error("Unverified conversation identity.");
    const links = this.links().filter(
      (link) => this.identifier(link) === id.id,
    );
    if (links.length !== 1)
      throw new Error(
        "Conversation must have exactly one verified sidebar entry. Scroll it into view and rescan.",
      );
    const link = links[0];
    let row: Element | null = link;
    while (row && !row.matches('nav,aside,[role="navigation"],body')) {
      const identity = row.getAttribute("data-conversation-id");
      if (identity && identity !== id.id)
        throw new Error("The conversation row identity cannot be verified.");
      const rowLinks = this.links().filter((a) => row!.contains(a));
      if (rowLinks.length !== 1) throw new Error("Ambiguous conversation row.");
      const controls = this.controls(row);
      if (controls.length > 1)
        throw new Error("A unique conversation action button was not found.");
      if (controls.length === 1) return { link, row, control: controls[0] };
      row = row.parentElement;
    }
    throw new Error("A unique conversation action button was not found.");
  }
  available(): boolean {
    return this.links().some((link) => {
      try {
        this.target({
          platform: this.config.platform,
          id: this.identifier(link)!,
        });
        return true;
      } catch {
        return false;
      }
    });
  }
  async perform(
    kind: NativeKind,
    id: ConversationIdentifier,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    const original = this.target(id);
    const title = conversationTitle(original.link);
    if (!title)
      throw new Error(
        "A conversation title is required for native confirmation.",
      );
    if (
      kind === "delete" &&
      this.links().filter((a) => conversationTitle(a) === title).length !== 1
    )
      throw new Error(
        "Duplicate conversation titles make native confirmation ambiguous.",
      );
    if (visibleNodes('[role="menu"]').length || visibleNodes(dialogs).length)
      throw new Error(
        "Close the existing native menu or dialog before starting this operation.",
      );
    const revalidate = () => {
      const target = this.target(id);
      if (
        target.link !== original.link ||
        target.row !== original.row ||
        target.control !== original.control ||
        conversationTitle(target.link) !== title
      )
        throw new Error(
          "Conversation title changed or row identity changed during the operation.",
        );
      return target;
    };
    let committed = false;
    let menu: Element | undefined;
    let dialog: Element | undefined;
    const oldMenus = new Set(visibleNodes('[role="menu"]'));
    const oldDialogs = new Set(visibleNodes(dialogs));
    // A persistent sidebar prevents a route change from masquerading as removal.
    const sidebar =
      original.row.closest('nav,aside,[role="navigation"]') ||
      original.row.parentElement;
    try {
      revalidate();
      signal?.throwIfAborted();
      original.control.click();
      menu = await waitFor(
        () => {
          const candidates = visibleNodes('[role="menu"]').filter(
            (el) => !oldMenus.has(el),
          );
          const controlledId = original.control.getAttribute("aria-controls");
          return candidates.length === 1 &&
            (!controlledId || candidates[0].id === controlledId)
            ? candidates[0]
            : undefined;
        },
        signal,
        this.config.timeoutMs,
      );
      revalidate();
      const actions = [
        ...menu.querySelectorAll<HTMLElement>('[role="menuitem"],button'),
      ].filter(
        (el) =>
          visible(el) &&
          !el.hasAttribute("disabled") &&
          el.getAttribute("aria-disabled") !== "true" &&
          labels[kind].has(label(el)),
      );
      if (actions.length !== 1)
        throw new Error(
          `The native ${kind === "delete" ? "Delete" : "Archive"} action is missing or ambiguous.`,
        );
      signal?.throwIfAborted();
      if (kind === "archive") committed = true;
      actions[0].click();
      if (kind === "delete") {
        dialog = await waitFor(
          () => {
            const candidates = visibleNodes(dialogs).filter(
              (el) => !oldDialogs.has(el),
            );
            return candidates.length === 1 ? candidates[0] : undefined;
          },
          signal,
          this.config.timeoutMs,
        );
        const text = dialog.textContent?.replace(/\s+/g, " ") || "";
        if (
          !['"' + title + '"', "“" + title + "”", "«" + title + "»"].some(
            (quoted) => text.includes(quoted),
          ) &&
          ![
            ...dialog.querySelectorAll("[data-conversation-title],strong,b"),
          ].some((el) => el.textContent?.trim() === title)
        )
          throw new Error(
            "Native confirmation does not identify the selected conversation. No confirmation was clicked.",
          );
        revalidate();
        const confirms = [
          ...dialog.querySelectorAll<HTMLElement>('button,[role="button"]'),
        ].filter(
          (el) =>
            visible(el) &&
            !el.hasAttribute("disabled") &&
            el.getAttribute("aria-disabled") !== "true" &&
            labels.delete.has(label(el)),
        );
        if (confirms.length !== 1)
          throw new Error(
            "The native confirmation control cannot be verified.",
          );
        signal?.throwIfAborted();
        committed = true;
        confirms[0].click();
      }
      let absentSince: number | undefined;
      // Once clicked, finish observing the outcome even if the user cancels remaining jobs.
      await waitFor(
        () => {
          if (
            !sidebar?.isConnected ||
            !visible(sidebar) ||
            this.links().some((link) => this.identifier(link) === id.id) ||
            (dialog?.isConnected && visible(dialog)) ||
            (menu?.isConnected && visible(menu))
          ) {
            absentSince = undefined;
            return;
          }
          absentSince ??= Date.now();
          return Date.now() - absentSince >= 300 ? true : undefined;
        },
        undefined,
        this.config.timeoutMs,
      );
      this.onSuccess(id);
    } catch (error) {
      if (committed)
        throw Object.assign(
          new Error(
            `${error instanceof Error ? error.message : "Native action failed."} The native ${kind} was clicked but its outcome is unverified. Check the website before retrying.`,
          ),
          { actionAttempted: true },
        );
      // Dismiss only our own uncommitted dialog/menu, never a guessed affirmative action.
      if (dialog?.isConnected) {
        const cancel = [
          ...dialog.querySelectorAll<HTMLElement>("button"),
        ].filter((el) =>
          /^(cancel|отмена|abbrechen|annuler|cancelar)$/.test(label(el)),
        );
        if (cancel.length === 1) cancel[0].click();
      }
      if (menu?.isConnected)
        menu.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      throw error;
    }
  }
}
