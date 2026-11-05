import { beforeEach, expect, it } from "vitest";
import {
  messageBody,
  navigateConversation,
} from "../../src/adapters/base/navigation";
import { defaults } from "../../src/storage";
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
