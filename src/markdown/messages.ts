// SPDX-License-Identifier: MIT OR Apache-2.0
/** Observed message boundaries shared by conversion, media and navigation. */
const roleContainers =
  '[aria-label="Conversation"] :has(> [data-conversation-role="user"]), [aria-label="Conversation"] :has(> [data-conversation-role="assistant"])';
const chatgpt =
  '[data-message-author-role="user"], [data-message-author-role="assistant"], [data-content-search-unit-key$=":user"], [data-content-search-unit-key$=":assistant"]';
const testIds =
  '[data-testid="user-message"], [data-testid="assistant-message"]';
const selectors: Record<string, string> = {
  chatgpt: `${chatgpt}, ${roleContainers}`,
  gemini: "user-query, model-response",
  claude: `${testIds}, .font-claude-response`,
  "grok.com": testIds,
  deepseek: ".ds-message",
};
const boundaries = `${chatgpt}, ${roleContainers}, user-query, model-response, ${testIds}, .font-claude-response, .ds-message`;

export function visibleMessageElement(node: Element): boolean {
  for (let n: Element | null = node; n; n = n.parentElement) {
    const style = getComputedStyle(n);
    if (
      n.matches(
        '[hidden], [inert], [aria-hidden="true"], [data-md-export-ignore]',
      ) ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse"
    )
      return false;
  }
  return !node.closest(
    "#__safari_md_export_root__, nav, aside, [role=toolbar], [role=menu]",
  );
}

export function messageNodes(platform: string): Element[] {
  const selector = selectors[platform];
  if (!selector) return [];
  const candidates = [...document.querySelectorAll(selector)].filter(
    visibleMessageElement,
  );
  return candidates.filter(
    (node) =>
      !candidates.some((other) => other !== node && other.contains(node)),
  );
}

export function messageRole(node: Element): string {
  if (
    node.querySelector(':scope > [data-conversation-role="user"]') ||
    node.matches(
      'user-query, [data-testid="user-message"], [data-message-author-role="user"], [data-content-search-unit-key$=":user"]',
    )
  )
    return "User";
  if (node.matches(".ds-message"))
    return node.querySelector(".ds-assistant-message-main-content")
      ? "Assistant"
      : "Message";
  return "Assistant";
}

export function inMessage(element: Element): boolean {
  const message = element.closest(boundaries);
  return !!message && visibleMessageElement(element);
}
