import { DOMAdapter } from "./base";
import { GeminiAdapter } from "./gemini";
import type { PlatformAdapter } from "../types";
export function createAdapter(): PlatformAdapter {
  const host = location.hostname;
  if (host === "gemini.google.com") return new GeminiAdapter();
  if (/^(chatgpt.com|chat.openai.com|127.0.0.1|localhost)$/.test(host))
    return new DOMAdapter({
      id: "chatgpt",
      currentPageFallback: false,
      autoLoad: true,
      name:
        host === "127.0.0.1" || host === "localhost"
          ? "ChatGPT · local fixture"
          : "ChatGPT",
      path: /^\/c\/([\w-]+)\/?$/,
      sidebar:
        'nav a[href*="/c/"],aside a[href*="/c/"],[role="navigation"] a[href*="/c/"]',
    });
  if (host === "claude.ai")
    return new DOMAdapter({
      id: "claude",
      currentPageFallback: false,
      autoLoad: true,
      name: "Claude",
      path: /^\/chat\/([\w-]+)\/?$/,
      sidebar: 'a[href*="/chat/"]',
    });
  if (host === "chat.deepseek.com")
    return new DOMAdapter({
      id: "deepseek",
      currentPageFallback: false,
      name: "DeepSeek",
      path: /^\/a\/chat\/s\/([\w-]+)\/?$/,
      sidebar: 'a[href*="/a/chat/s/"]',
    });
  return new DOMAdapter({
    id: host,
    name: host,
    path: /$a/,
    sidebar: "[data-no-matching-conversations]",
  });
}
