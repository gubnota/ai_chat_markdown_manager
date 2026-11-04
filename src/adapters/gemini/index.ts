import { DOMAdapter } from "../base";
import type { ConversationIdentifier } from "../../types";
const deleteLabels = new Set([
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
]);
const moreLabels =
  /^(more|more options|conversation actions|chat actions|open menu|ещё|еще|действия с чатом|дополнительные параметры|weitere optionen|plus d’options|más opciones)$/i;
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
export class GeminiAdapter extends DOMAdapter {
  constructor(
    private verification: { nativeDelete: boolean; timeoutMs?: number } = {
      nativeDelete: false,
    },
  ) {
    super({
      id: "gemini",
      name: "Google Gemini",
      path: /^\/app\/([\w-]+)\/?$/,
      sidebar: 'a[href*="/app/"], [role="navigation"] a[href], nav a[href]',
    });
    this.capabilities.delete = verification.nativeDelete
      ? "supported"
      : "unknown";
  }
  private target(id: ConversationIdentifier): {
    row: Element;
    link: HTMLAnchorElement;
  } {
    if (id.platform !== this.id || !/^[\w-]+$/.test(id.id))
      throw new Error("Unverified conversation identity.");
    const links = [
      ...document.querySelectorAll<HTMLAnchorElement>('a[href*="/app/"]'),
    ].filter((a) => this.identifier(a.href) === id.id);
    if (links.length !== 1)
      throw new Error(
        "Conversation must have exactly one verified sidebar entry. Scroll it into view and rescan.",
      );
    const link = links[0];
    const row = link.closest(
      '[data-conversation-id],.conversation-list-item,[role="listitem"]',
    );
    if (
      !row ||
      (row.getAttribute("data-conversation-id") &&
        row.getAttribute("data-conversation-id") !== id.id)
    )
      throw new Error("The conversation row identity cannot be verified.");
    if (row.querySelectorAll('a[href*="/app/"]').length !== 1)
      throw new Error("Ambiguous conversation row.");
    return { row, link };
  }
  override async deleteConversation(
    id: ConversationIdentifier,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!this.verification.nativeDelete)
      throw new Error(
        "Gemini deletion is disabled: authenticated native controls have not been verified. See docs/PLATFORMS.md.",
      );
    signal?.throwIfAborted();
    const { row, link } = this.target(id);
    const title = (
      link.dataset.conversationTitle ||
      link.textContent ||
      ""
    ).trim();
    if (!title)
      throw new Error(
        "A conversation title is required for native confirmation.",
      );
    const sameTitles = [
      ...document.querySelectorAll<HTMLAnchorElement>('a[href*="/app/"]'),
    ].filter(
      (a) =>
        this.identifier(a.href) &&
        (a.dataset.conversationTitle || a.textContent || "").trim() === title,
    );
    if (sameTitles.length !== 1)
      throw new Error(
        "Duplicate conversation titles make native confirmation ambiguous.",
      );
    const revalidate = () => {
      const target = this.target(id);
      if (
        (
          target.link.dataset.conversationTitle ||
          target.link.textContent ||
          ""
        ).trim() !== title
      )
        throw new Error("Conversation title changed during the operation.");
    };
    const controls = [
      ...row.querySelectorAll<HTMLElement>('button,[role="button"]'),
    ].filter(
      (el) =>
        visible(el) &&
        (moreLabels.test(label(el)) ||
          el.getAttribute("data-mat-icon-name") === "more_vert"),
    );
    if (controls.length !== 1)
      throw new Error("A unique conversation action button was not found.");
    const oldMenus = new Set(document.querySelectorAll('[role="menu"]'));
    const oldDialogs = new Set(
      document.querySelectorAll('[role="dialog"],dialog'),
    );
    revalidate();
    controls[0].click();
    const menu = await waitFor(
      () => {
        const menus = [...document.querySelectorAll('[role="menu"]')].filter(
          (el) => !oldMenus.has(el) && visible(el),
        );
        return menus.length === 1 ? menus[0] : undefined;
      },
      signal,
      this.verification.timeoutMs,
    );
    revalidate();
    const deletes = [
      ...menu.querySelectorAll<HTMLElement>('[role="menuitem"],button'),
    ].filter((el) => visible(el) && deleteLabels.has(label(el)));
    if (deletes.length !== 1)
      throw new Error("The native Delete action is missing or ambiguous.");
    signal?.throwIfAborted();
    deletes[0].click();
    const dialog = await waitFor(
      () => {
        const dialogs = [
          ...document.querySelectorAll('[role="dialog"],dialog'),
        ].filter((el) => !oldDialogs.has(el) && visible(el));
        return dialogs.length === 1 ? dialogs[0] : undefined;
      },
      signal,
      this.verification.timeoutMs,
    );
    // Bind confirmation to an explicit target title, never a generic unrelated dialog.
    const text = dialog.textContent?.replace(/\s+/g, " ") || "";
    if (
      !['"' + title + '"', "“" + title + "”", "«" + title + "»"].some(
        (quoted) => text.includes(quoted),
      ) &&
      ![...dialog.querySelectorAll("[data-conversation-title],strong,b")].some(
        (el) => el.textContent?.trim() === title,
      )
    )
      throw new Error(
        "Native confirmation does not identify the selected conversation. Cancel it manually; no confirmation was clicked.",
      );
    revalidate();
    const confirms = [...dialog.querySelectorAll<HTMLElement>("button")].filter(
      (el) => visible(el) && deleteLabels.has(label(el)),
    );
    if (confirms.length !== 1)
      throw new Error("The native confirmation control cannot be verified.");
    signal?.throwIfAborted();
    confirms[0].click();
    let absentSince: number | undefined;
    await waitFor(
      () => {
        const present = [
          ...document.querySelectorAll<HTMLAnchorElement>('a[href*="/app/"]'),
        ].some((a) => this.identifier(a.href) === id.id);
        if (present || (dialog.isConnected && visible(dialog))) {
          absentSince = undefined;
          return;
        }
        absentSince ??= Date.now();
        return Date.now() - absentSince >= 300 ? true : undefined;
      },
      signal,
      this.verification.timeoutMs,
    );
    this.forget(id);
  }
}
