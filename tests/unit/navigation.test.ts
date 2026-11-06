import { beforeEach, expect, it } from "vitest";
import {
  messageBody,
  navigateConversation,
} from "../../src/adapters/base/navigation";
import { defaults } from "../../src/storage";
import { DOMAdapter } from "../../src/adapters/base";
import { GeminiAdapter } from "../../src/adapters/gemini";
beforeEach(() => {
  history.replaceState(null, "", "/c/one");
  document.body.innerHTML =
    '<aside><a href="/c/two">Two</a></aside><main><div data-message-author-role="user">Question</div><div data-message-author-role="assistant"><h3>Answer</h3><p>Original text</p></div></main>';
});
it("does not accept unchanged messages merely because the route changed", async () => {
  document.querySelector("a")!.addEventListener("click", (event) => {
    event.preventDefault();
    history.pushState(null, "", "/c/two");
  });
  await expect(
    navigateConversation(
      "chatgpt",
      "/c/two",
      () => location.pathname === "/c/two",
      undefined,
      220,
    ),
  ).rejects.toThrow("no stale content was exported");
});
it("prevents full reload links from destroying the running export", async () => {
  await expect(
    navigateConversation("chatgpt", "/c/two", () => false),
  ).rejects.toThrow("would reload");
  expect(location.pathname).toBe("/c/one");
});
it("preserves outline and excludes hidden or sidebar messages", () => {
  document.querySelector("aside")!.innerHTML +=
    '<div data-message-author-role="assistant">Sidebar text</div>';
  document.querySelector("main")!.innerHTML +=
    '<div hidden><div data-message-author-role="assistant">Hidden text</div></div>';
  const body = messageBody("chatgpt", { ...defaults.export, outline: true })!;
  expect(body).toContain("## Page outline");
  expect(body).toContain("- Answer");
  expect(body).toContain("## User");
  expect(body).not.toContain("Hidden text");
  expect(body).not.toContain("Sidebar text");
});
it.each([
  ["gemini", "/app", /^\/app\/([\w-]+)\/?$/],
  ["chatgpt", "/", /^\/c\/([\w-]+)\/?$/],
  ["claude", "/new", /^\/chat\/([\w-]+)\/?$/],
  ["deepseek", "/", /^\/a\/chat\/s\/([\w-]+)\/?$/],
] as const)(
  "%s excludes welcome pages but keeps native chat identities",
  async (platform, home, path) => {
    history.replaceState(null, "", home);
    document.body.innerHTML =
      "<aside></aside><main><h1>Where should we start?</h1></main>";
    const adapter =
      platform === "gemini"
        ? new GeminiAdapter()
        : new DOMAdapter({
            id: platform,
            name: platform,
            path,
            sidebar: "aside a",
            currentPageFallback: false,
          });
    expect(await adapter.discoverConversations()).toEqual([]);
    await expect(
      adapter.exportConversation(
        { platform, id: `page:${home}` },
        defaults.export,
      ),
    ).rejects.toThrow("identity is unavailable");
    const route =
      platform === "gemini"
        ? "/app/one"
        : platform === "claude"
          ? "/chat/one"
          : platform === "deepseek"
            ? "/a/chat/s/one"
            : "/c/one";
    history.replaceState(null, "", route);
    expect(await adapter.discoverConversations()).toMatchObject([
      { id: "one", current: true },
    ]);
    history.replaceState(null, "", home);
    expect(await adapter.discoverConversations()).toMatchObject([
      { id: "one", current: false },
    ]);
  },
);
it("retains current-page export discovery for generic sites", async () => {
  history.replaceState(null, "", "/article");
  const adapter = new DOMAdapter({
    id: "example",
    name: "Example",
    path: /$a/,
    sidebar: "[data-none]",
  });
  expect(await adapter.discoverConversations()).toMatchObject([
    { id: "page:/article", current: true },
  ]);
});
it("restores the empty start page without requiring conversation messages", async () => {
  document.querySelector("aside")!.innerHTML = '<a href="/">New chat</a>';
  document.querySelector("a")!.addEventListener("click", (event) => {
    event.preventDefault();
    history.pushState(null, "", "/");
    document.querySelector("main")!.innerHTML =
      "<h1>Where should we start?</h1>";
  });
  const adapter = new DOMAdapter({
    id: "chatgpt",
    name: "ChatGPT",
    path: /^\/c\/([\w-]+)$/,
    sidebar: "aside a",
    autoLoad: true,
    currentPageFallback: false,
    loadTimeoutMs: 2000,
  });
  history.replaceState(null, "", "/");
  const restore = adapter.beginExportSession();
  history.replaceState(null, "", "/c/one");
  await expect(restore()).resolves.toBeUndefined();
  expect(location.pathname).toBe("/");
  expect(await adapter.discoverConversations()).toEqual([]);
});
