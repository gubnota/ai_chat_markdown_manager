// SPDX-License-Identifier: MIT OR Apache-2.0
import type { CaptureMedia, ExportOptions, HistoryCapture } from "../../types";
import { visibleMessageElement } from "../../markdown/messages";
import {
  messageMarkdown,
  messageNodes,
  pause,
  withOutline,
} from "./navigation";

const turnSelector = "[data-message-id], [data-content-search-unit-key]";
const older = /^(?:loading|fetching) (?:older|previous) messages(?:[.…]+)?$/i;

function scrollContainer(node: Element): Element {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    if (
      /(auto|scroll|overlay)/.test(getComputedStyle(parent).overflowY) &&
      parent.scrollHeight > parent.clientHeight + 2
    )
      return parent;
  }
  return document.scrollingElement ?? document.documentElement;
}

function viewport(container: Element) {
  return container === document.scrollingElement
    ? { top: 0, bottom: window.innerHeight }
    : container.getBoundingClientRect();
}

function nearViewport(node: Element, container: Element): boolean {
  const { top, bottom } = viewport(container);
  const rect = node.getBoundingClientRect();
  if (
    !rect.width &&
    !rect.height &&
    getComputedStyle(node).display === "contents"
  )
    return [...node.children].some((child) => nearViewport(child, container));
  const margin = (bottom - top) / 5;
  return rect.bottom >= top - margin && rect.top <= bottom + margin;
}

function loadingHistory(container: Element): boolean {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode;
    const parent = text.parentElement;
    if (
      parent &&
      older.test(text.textContent?.trim() ?? "") &&
      !parent.closest(turnSelector) &&
      visibleMessageElement(parent)
    )
      return true;
  }
  return false;
}

function stableKey(node: Element): string | undefined {
  const message = node.matches(turnSelector)
    ? node
    : node.querySelector(turnSelector);
  const turn = node.closest(
    "[data-turn-id], [data-testid^='conversation-turn-']",
  );
  return (
    message?.getAttribute("data-message-id") ||
    message?.getAttribute("data-content-search-unit-key") ||
    turn?.getAttribute("data-turn-id") ||
    turn?.getAttribute("data-testid") ||
    undefined
  );
}

function mergeWindow(
  order: (string | number)[],
  keys: (string | number)[],
  direction: -1 | 1,
  known: ReadonlySet<string | number>,
) {
  const additions: (string | number)[] = [];
  let previous: string | number | undefined;
  for (const key of keys) {
    if (!known.has(key)) {
      additions.push(key);
      continue;
    }
    if (additions.length)
      order.splice(order.indexOf(key), 0, ...additions.splice(0));
    previous = key;
  }
  if (additions.length)
    order.splice(
      previous ? order.indexOf(previous) + 1 : direction < 0 ? 0 : order.length,
      0,
      ...additions,
    );
}

/** Capture a live window before scrolling can recycle its turns and blob URLs. */
export async function captureChatGPTHistory(
  options: ExportOptions,
  capture: CaptureMedia,
  checkConversation: () => void,
  signal?: AbortSignal,
  missingImages?: Map<string, string>,
  history?: HistoryCapture,
): Promise<string | undefined> {
  const initial = messageNodes("chatgpt");
  if (!initial.length) return;
  const container = scrollContainer(initial[0]);
  const originalTop = container.scrollTop;
  const originalBottom =
    container.scrollHeight - container.clientHeight - originalTop;
  const fallbackKeys = new WeakMap<Element, number>();
  let nextKey = 0;
  const keyOf = (node: Element) => {
    const stable = stableKey(node);
    if (stable) return stable;
    const existing = fallbackKeys.get(node);
    if (existing !== undefined) return existing;
    fallbackKeys.set(node, ++nextKey);
    return nextKey;
  };
  const initialAnchor = initial.find((node) => nearViewport(node, container));
  const anchor = initialAnchor && keyOf(initialAnchor);
  const anchorOffset = initialAnchor?.getBoundingClientRect().top ?? 0;
  const order: (string | number)[] = [];
  const known = new Set<string | number>();
  const turns = new Map<
    string | number,
    {
      text: string;
      missing: Map<string, string>;
      direction: -1 | 1;
      fingerprint: string;
    }
  >();

  const check = () => {
    signal?.throwIfAborted();
    checkConversation();
    if (!container.isConnected)
      throw new Error(
        "The conversation viewport changed during export. Retry the export.",
      );
  };
  const isScrollable = () => container.scrollHeight > container.clientHeight + 2;
  const activeNodes = () => {
    const scrollable = isScrollable();
    return messageNodes("chatgpt").filter(
      (node) => !scrollable || nearViewport(node, container),
    );
  };
  const captureWindow = async (direction: -1 | 1) => {
    if (options.images) {
      const deadline = Date.now() + 2500;
      while (
        activeNodes().some((node) =>
          [...node.querySelectorAll("img")].some(
            (image) =>
              visibleMessageElement(image) &&
              (!isScrollable() || nearViewport(image, container)) &&
              (!image.complete || !image.currentSrc),
          ),
        ) &&
        Date.now() < deadline
      ) {
        await pause(100, signal);
        check();
      }
    }
    const nodes = activeNodes();
    const keys = [...new Set(nodes.map(keyOf))];
    mergeWindow(order, keys, direction, known);
    for (const key of keys) known.add(key);
    for (const node of nodes) {
      check();
      if (!node.isConnected) continue;
      const key = keyOf(node);
      const previous = turns.get(key);
      const images = options.images
        ? [...node.querySelectorAll("img")].filter(visibleMessageElement)
        : [];
      // Virtual remounts can give the same image a new blob URL. Use its DOM
      // position and name once decoded, but notice newly loaded image elements.
      const fingerprint = JSON.stringify(
        images.map((image) => [
          image.alt,
          image.naturalWidth,
          image.naturalHeight,
          image.currentSrc.startsWith("blob:")
            ? "blob"
            : image.currentSrc.slice(0, 512),
        ]),
      );
      if (
        previous?.fingerprint === fingerprint &&
        (!previous.missing.size || previous.direction === direction)
      )
        continue;
      const missing = new Map<string, string>();
      const text = await capture(
        messageMarkdown(node, options),
        [node],
        options,
        signal,
        missing,
      );
      if (!previous || missing.size <= previous.missing.size) {
        turns.set(key, { text, missing, direction, fingerprint });
        if (!previous) history?.progress(turns.size);
      }
    }
  };

  const waitAtTop = async () => {
    let idleSince = Date.now();
    let clearSince: number | undefined;
    let lastSecond: number | undefined;
    const previousFirst = activeNodes()[0];
    let previousKey = previousFirst && keyOf(previousFirst);
    while (true) {
      await pause(150, signal);
      check();
      if (container.scrollTop > 2) {
        // ChatGPT may preserve its scroll anchor when it prepends messages.
        await captureWindow(-1);
        history?.progress(turns.size);
        return false;
      }
      const first = activeNodes()[0];
      const key = first && keyOf(first);
      if (key !== undefined && key !== previousKey) {
        const oldest = order[0];
        await captureWindow(-1);
        if (order[0] !== oldest) {
          idleSince = Date.now();
          lastSecond = undefined;
        }
        previousKey = key;
      }
      const now = Date.now();
      if (!loadingHistory(container)) {
        clearSince ??= now;
        if (lastSecond !== undefined) {
          history?.progress(turns.size);
          lastSecond = undefined;
        }
        if (now - clearSince >= 950) {
          await captureWindow(-1);
          return container.scrollTop <= 2 && !loadingHistory(container);
        }
        continue;
      }
      if (clearSince !== undefined) idleSince = now;
      clearSince = undefined;
      const elapsed = now - idleSince;
      if (elapsed >= 30_000) {
        const reason = "Some older ChatGPT messages did not finish loading.";
        if (!history?.incomplete)
          throw new Error(`${reason} Retry the export.`);
        history.incomplete(reason);
        history.progress(turns.size);
        return true;
      }
      const seconds = Math.floor(elapsed / 1000);
      if (seconds !== lastSecond) {
        lastSecond = seconds;
        history?.progress(turns.size, seconds);
      }
    }
  };

  try {
    check();
    history?.progress(0);
    await captureWindow(-1);
    if (isScrollable() || loadingHistory(container)) {
      for (const direction of [-1, 1] as const) {
        let steps = 0;
        while (true) {
          check();
          const edge =
            direction < 0 ? 0 : container.scrollHeight - container.clientHeight;
          if (Math.abs(container.scrollTop - edge) <= 2) {
            if (direction < 0) {
              if (await waitAtTop()) break;
            } else {
              await pause(150, signal);
              check();
              await captureWindow(direction);
              if (
                container.scrollHeight -
                  container.clientHeight -
                  container.scrollTop <=
                2
              )
                break;
            }
            continue;
          }
          if (++steps > 12_000)
            throw new Error(
              "ChatGPT history scrolling did not reach the end. Keep the original chat.",
            );
          const before = container.scrollTop;
          container.scrollTo({
            top:
              before +
              direction *
                Math.max(1, Math.floor(container.clientHeight * 0.65)),
            behavior: "instant",
          });
          await pause(240, signal);
          check();
          if (
            Math.abs(container.scrollTop - before) <= 1 &&
            Math.abs(container.scrollTop - edge) > 2
          )
            throw new Error(
              "ChatGPT history could not be scrolled. Retry the export.",
            );
          await captureWindow(direction);
        }
      }
    }
    check();
    for (const turn of turns.values()) {
      for (const [href, reason] of turn.missing) {
        if (!missingImages)
          throw new Error(
            `Offline export: ${reason} No cleanup is safe for this chat.`,
          );
        missingImages.set(href, reason);
      }
    }
    return withOutline(
      order.map((key) => turns.get(key)?.text ?? "").join("\n"),
      options,
    );
  } finally {
    if (container.isConnected) {
      try {
        checkConversation();
        const restored = messageNodes("chatgpt").find(
          (node) => keyOf(node) === anchor,
        );
        container.scrollTo({
          top: restored
            ? container.scrollTop +
              restored.getBoundingClientRect().top -
              anchorOffset
            : Math.max(
                0,
                container.scrollHeight -
                  container.clientHeight -
                  originalBottom,
              ),
          behavior: "instant",
        });
      } catch {
        // The user switched chats. Leave the new viewport alone.
      }
    }
  }
}
