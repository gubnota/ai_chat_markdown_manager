Save Page as Markdown (Safari) v1.2.0

CHANGELOG
- Replaced the global URL wildcard with an explicit allowlist of 48 @match patterns across major AI chat services.
- Includes ChatGPT, Gemini, Grok, DeepSeek, Claude, Microsoft Copilot, Mistral Vibe,
  Perplexity, Meta AI, Poe, Qwen, Kimi, Z.ai / ChatGLM, Doubao, Yuanbao, MiniMax,
  Duck.ai, Pi, Character.AI, HuggingChat, OpenRouter, Arena, T3 Chat, You.com,
  Phind, Venice AI and Blackbox AI.
- Preserves v1.1.1's independent FAB positioning and Send-button collision protection.

INSTALLATION IN SAFARI
1. Unzip this file.
2. Disable/remove old versions in Userscripts for Safari or Tampermonkey.
3. Install `Save-Page-as-Markdown-Safari.user.js` and allow these sites.
4. Reload the AI chat tab.

CONTROLS
- MD bubble: open; drag: move; Minimize: collapse; Dismiss: hide.
- Option + Shift + E: show/hide. Option + Shift + M: save Markdown.
- Shift + click Save: export selected text only.

SCOPE
- Metadata URL rules determine where the widget is installed, not how a site's conversation is parsed.
  ChatGPT has a dedicated conversation extractor. Other services use generic DOM-to-Markdown
  and may not capture virtualized/previously unloaded messages or consistent roles.
- To enable all web pages as in v1.1.1, add the following separate metadata line:
    // @match        *://*/*
- Local JavaScript only, no network calls, CDNs, or external libraries.
