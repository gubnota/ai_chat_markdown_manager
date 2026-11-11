import { beforeEach, expect, it } from "vitest";
import { messageNodes, inMessage } from "../../src/markdown/messages";
import { messageBody } from "../../src/adapters/base/navigation";
import { extractMarkdown } from "../../src/markdown/legacy";
import { defaults } from "../../src/storage";

beforeEach(() => {
  document.body.innerHTML = "";
});
const modern = `<div data-talvt-turn-state="complete">
  <div><h4 data-conversation-role="user">You said:</h4><div data-content-search-unit-key="fallback-turn-0:0:user"><p>Real prompt</p></div></div>
  <div data-content-search-unit-key="fallback-turn-0:2:assistant"><h4 data-conversation-role="assistant">ChatGPT said:</h4><p>Real answer</p><button><img alt="Generated scene" src="https://example.com/scene.png"></button><div class="attachment-card" data-file-name="input.csv"><a href="https://example.com/input.csv">input.csv</a></div></div>
</div>`;
it("extracts current ChatGPT role units from the third main without merging a turn", () => {
  document.body.innerHTML = `<main><form>${"Wrong pane ".repeat(80)}</form></main><main><button>Controls</button></main><main><div aria-label="Conversation">${modern}</div><form>Composer draft</form></main>`;
  expect(messageNodes("chatgpt")).toHaveLength(2);
  for (const body of [
    messageBody("chatgpt", defaults.export)!,
    extractMarkdown({ metadata: false, source: false }),
  ]) {
    expect(body).toContain("## User\n\nReal prompt");
    expect(body).toContain("## Assistant\n\nReal answer");
    expect(body).toContain("![Generated scene](https://example.com/scene.png)");
    expect(body).toContain("[input.csv](https://example.com/input.csv)");
    expect(body).not.toMatch(/Wrong pane|Composer draft|You said|ChatGPT said/);
  }
  expect(inMessage(document.querySelector("img")!)).toBe(true);
});
it("deduplicates mixed ChatGPT layouts and excludes hidden/inert/sidebar messages", () => {
  document.body.innerHTML = `<div data-message-author-role="assistant"><div data-content-search-unit-key="0:assistant">One answer</div></div><aside>${modern}</aside><div inert>${modern}</div><div hidden>${modern}</div><div style="visibility:collapse">${modern}</div>`;
  expect(messageNodes("chatgpt")).toHaveLength(1);
  expect(messageBody("chatgpt", defaults.export)).toBe(
    "## Assistant\n\nOne answer\n",
  );
  expect(inMessage(document.querySelector("aside img")!)).toBe(false);
});
it.each(["grok.com", "claude"])(
  "captures both %s message containers including image buttons",
  (platform) => {
    document.body.innerHTML = `<div aria-label="Conversation"><div role="article" data-testid="user-message">Prompt</div><div role="article" data-testid="assistant-message"><p>Answer</p><button><img alt="Result" src="https://example.com/result.png"></button></div></div><form>Draft</form>`;
    const body = messageBody(platform, defaults.export)!;
    expect(body).toContain("## User\n\nPrompt");
    expect(body).toContain("## Assistant\n\nAnswer");
    expect(body).toContain("![Result]");
    expect(body).not.toContain("Draft");
  },
);
it("scopes DeepSeek content to loaded messages without inventing the user role", () => {
  document.body.innerHTML =
    '<div>Sidebar history</div><div class="ds-message">Prompt</div><div class="ds-message"><div class="ds-assistant-message-main-content ds-markdown">Answer</div></div><textarea>Draft</textarea>';
  expect(messageBody("deepseek", defaults.export)).toBe(
    "## Message\n\nPrompt\n\n## Assistant\n\nAnswer\n",
  );
});
it("prefers a visible conversation for generic conversion even without main or substantial text", () => {
  document.body.innerHTML =
    '<div aria-label="Conversation" hidden>Stale</div><div aria-label="Conversation"><p>Active answer</p></div><p>Site chrome</p>';
  expect(extractMarkdown({ metadata: false, source: false })).toBe(
    "Active answer\n",
  );
});

it("includes ChatGPT image-only replies without search keys and deduplicates role wrappers", () => {
  document.body.innerHTML = `<div aria-label="Conversation">${modern}<div><h4 data-conversation-role="assistant">ChatGPT said:</h4><button><img alt="Earlier scene" src="https://example.com/earlier.png"></button></div></div>`;
  expect(messageNodes("chatgpt")).toHaveLength(3);
  const body = messageBody("chatgpt", defaults.export)!;
  expect(body.match(/## User/g)).toHaveLength(1);
  expect(body.match(/## Assistant/g)).toHaveLength(2);
  expect(body).toContain("![Earlier scene](https://example.com/earlier.png)");
  expect(inMessage(document.querySelector('img[alt="Earlier scene"]')!)).toBe(
    true,
  );
});
