import { elementMarkdown } from "../../markdown/legacy";
import type { ExportOptions } from "../../types";

const selectors: Record<string, string> = {
  chatgpt:
    '[data-message-author-role="user"], [data-message-author-role="assistant"]',
  gemini: "user-query, model-response",
  claude:
    '[data-testid="user-message"], [data-testid="assistant-message"], .font-claude-response',
};
function visible(node: Element): boolean {
  for (let n: Element | null = node; n; n = n.parentElement) {
    if (
      n.hasAttribute("hidden") ||
      n.getAttribute("aria-hidden") === "true" ||
      getComputedStyle(n).display === "none" ||
      getComputedStyle(n).visibility === "hidden"
    )
      return false;
  }
  return !node.closest("#__safari_md_export_root__, nav, aside");
}
export function messageNodes(platform: string): Element[] {
  const candidates = [
    ...document.querySelectorAll(selectors[platform] || "[data-no-messages]"),
  ].filter(visible);
  return candidates.filter(
    (node) =>
      !candidates.some((other) => other !== node && other.contains(node)),
  );
}
export function messageBody(
  platform: string,
  options: ExportOptions,
): string | undefined {
  const nodes = messageNodes(platform);
  if (!nodes.length) return;
  const body = nodes
    .map((node) => {
      const user = node.matches(
        'user-query, [data-testid="user-message"], [data-message-author-role="user"]',
      );
      return `## ${user ? "User" : "Assistant"}\n\n${elementMarkdown(node, options)}`;
    })
    .join("\n");
  if (!options.outline) return body;
  const headings = body.split("\n").filter((line) => /^#{1,6}\s/.test(line));
  const outline = headings
    .map(
      (line) =>
        `${"  ".repeat(line.match(/^#+/)![0].length - 1)}- ${line.replace(/^#{1,6}\s*/, "")}`,
    )
    .join("\n");
  return outline ? `## Page outline\n\n${outline}\n\n---\n\n${body}` : body;
}
function fingerprint(nodes: Element[]): string {
  return nodes.map((node) => node.textContent ?? "").join("\n");
}
function pause(ms: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}
/** Use the site's router, never reload the page holding the running export. */
export async function navigateConversation(
  platform: string,
  url: string,
  isTarget: () => boolean,
  signal?: AbortSignal,
  timeoutMs = 30_000,
): Promise<void> {
  signal?.throwIfAborted();
  const target = new URL(url, location.href);
  if (target.origin !== location.origin)
    throw new Error("Conversation must belong to this website.");
  const link = [
    ...document.querySelectorAll<HTMLAnchorElement>("a[href]"),
  ].find((node) => {
    const u = new URL(node.href, location.href);
    return (
      !node.closest("#__safari_md_export_root__") &&
      u.origin === target.origin &&
      u.pathname === target.pathname
    );
  });
  if (!link)
    throw new Error(
      "Conversation link is not in the website's loaded history. Scroll its sidebar, rescan, and retry.",
    );
  const before = messageNodes(platform);
  const beforeText = fingerprint(before);
  let blocked = false;
  const guard = (event: MouseEvent) => {
    if (!event.composedPath().includes(link)) return;
    if (!event.defaultPrevented) {
      event.preventDefault();
      blocked = !isTarget();
    }
  };
  window.addEventListener("click", guard);
  try {
    link.click();
  } finally {
    window.removeEventListener("click", guard);
  }
  if (blocked)
    throw new Error(
      "This link would reload the page and interrupt the export. Open it once in this tab, then retry.",
    );
  const deadline = Date.now() + timeoutMs;
  let last = "",
    since = Date.now();
  while (Date.now() < deadline) {
    await pause(100, signal);
    const nodes = messageNodes(platform);
    const text = fingerprint(nodes);
    const changed =
      text !== beforeText || nodes.some((node) => !before.includes(node));
    const loading = [
      ...document.querySelectorAll(
        '[aria-busy="true"], [data-testid="stop-button"], [data-is-streaming="true"]',
      ),
    ].some(
      (node) =>
        !node.closest("#__safari_md_export_root__, nav, aside") &&
        visible(node),
    );
    if (!isTarget() || !changed || !text.trim() || loading) {
      since = Date.now();
      last = text;
      continue;
    }
    if (last !== text) {
      last = text;
      since = Date.now();
    }
    if (Date.now() - since >= 900) return;
  }
  throw new Error(
    "Conversation messages did not finish loading. Retry when the chat is available; no stale content was exported.",
  );
}
