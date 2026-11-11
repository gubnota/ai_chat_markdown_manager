# Platform support — v2.3.3

Support describes implemented DOM paths, not verified access to an entire account. Every discovered conversation is marked **partial**. Websites may change their DOM, permissions or routing independently of this release.

## Capabilities

| Adapter | Discovery | Markdown / HTML / ZIP | Native archive | Native delete |
| --- | --- | --- | --- | --- |
| ChatGPT (`chatgpt.com`, `chat.openai.com`) | Loaded sidebar links with `/c/{id}` | Automatic native SPA loading; matching snapshots in this tab | Conditional native support | Conditional native support |
| Gemini (`gemini.google.com`) | Loaded sidebar links with `/app/{id}` | Automatic native SPA loading; matching snapshots in this tab | Unsupported | Conditional native support |
| Claude (`claude.ai`) | Loaded sidebar links with `/chat/{id}` | Automatic native SPA loading; matching snapshots in this tab | Unsupported | Unsupported |
| DeepSeek (`chat.deepseek.com`) | Loaded links with `/a/chat/s/{id}` | Current loaded DOM; previously captured snapshots in this tab | Unsupported | Unsupported |
| Grok (`grok.com`) | Current page only | Loaded user/assistant message test IDs; optional embedded media | Unsupported | Unsupported |
| Other matched hosts | Current page only | Generic loaded-DOM conversion; ZIP of available content | Unsupported | Unsupported |

Selection, filtering, pagination and export operate on genuine discovered IDs. Scroll or open the native sidebar and rescan to reveal additional entries. Virtualized entries accumulate in memory until reload. Generic pages use a pathname/query identifier; this is a page identifier rather than a verified native conversation ID. No adapter calls a private API or loads a background tab. ChatGPT/Gemini/Claude exports click native SPA links in the current tab and wait for new settled messages. A missing link, full-page reload or timeout fails explicitly. The starting chat is restored after success/cancellation; loading can mark chats read.

Explicit export or preview captures the current Markdown body in a temporary cache (20 snapshots, approximately 8 MiB of UTF-16 text). Same-tab SPA navigation can retain it. A full reload or another tab cannot. Image/link/outline options must match the captured format. ChatGPT/Gemini/Claude automatically load the native chat when a matching snapshot is unavailable. Other adapters require a manual visit/capture. Any unavailable content fails explicitly and appears in the report. ZIP success does not imply complete account history.

Native welcome/start routes (for example Gemini `/app`, ChatGPT `/`, Claude `/new`) are excluded from discovery and ZIP input. Only generic site adapters synthesize current-page identities. Returning to a starting welcome page waits for the old messages to disappear and the page to settle.

After ZIP download initiation, Activity offers **Review backed-up chats** containing only successful targets. Check the actual ZIP files before removing anything. Acknowledge checking the files to enable supported archive/delete shortcuts; each still requires normal confirmation. Failed/skipped exports are excluded. Work/school accounts may restrict Gemini deletion. [Official Google instructions](https://support.google.com/gemini/answer/13666746).

## Live export evidence (2026-11-11)

Authenticated Safari Userscripts current-chat HTML downloads succeeded on ChatGPT, Gemini, Grok, Claude and DeepSeek. ChatGPT included five user/five assistant messages and four embedded images; Grok embedded its visible image once and also exported embedded Markdown. Gemini included its generated image. Preview/direct HTML/Markdown embedding on/off across all five providers is covered by production-bundle fixtures. Other inherited hosts are generic and are not claimed live verified. No real native cleanup was executed.

## Native mutation checks

ChatGPT archive/delete and Gemini delete become available when a recognized native sidebar action control is present. Missing controls leave capability unknown and disabled. Every target is checked again at execution: one same-origin ID, one row action control, one newly opened menu and exact localized action. Delete also requires a unique title-bearing native confirmation. Archive uses the native menu action without an additional website confirmation. Removal must remain stable while the original sidebar stays visible and the menu/dialog closes.

**All** means a frozen list of discovered IDs, never the account-wide Settings controls. Batches run sequentially with mandatory review, typed `DELETE` / `DELETE ALL`, optional complete pre-action backup and per-item reports. No automatic mutation retries. Cancel stops remaining jobs, while an already clicked action finishes bounded outcome observation. Unverified results fail and require checking the website before another attempt.

On 2026-11-07 the available ChatGPT page was signed out. Safari read-only Gemini inspection confirmed a native conversation action-menu label; no native mutation was executed. Fixture coverage establishes the implemented checks, not authenticated live compatibility. Localized or redesigned website controls can remain unavailable until adapters are updated. Use disposable accounts for additional manual verification.

ChatGPT archives can be restored in **Settings → Data controls → Archived chats → Manage**. Deleted chats cannot be recovered. See [OpenAI's archive/delete instructions](https://help.openai.com/en/articles/8809935-deleting-and-archiving-chats-in-chatgpt). Gemini archive, Claude and other platform mutations remain unsupported.

## Original match rules retained

All 48 inherited metadata entries are preserved exactly, plus 3 targeted rules for youtube.com, www.youtube.com and m.youtube.com. Host/path permission does not imply a specialized adapter, authenticated verification or native operation support. `*://` permits the original HTTP/HTTPS schemes; no global host wildcard is added.

| Metadata match | Adapter |
| --- | --- |
| `*://chatgpt.com/*` | ChatGPT |
| `*://chat.openai.com/*` | ChatGPT |
| `*://gemini.google.com/*` | Gemini |
| `*://aistudio.google.com/*` | Generic current page |
| `*://notebooklm.google.com/*` | Generic current page |
| `*://grok.com/*` | Current page with Grok message boundaries |
| `*://chat.deepseek.com/*` | DeepSeek |
| `*://claude.ai/*` | Claude |
| `*://copilot.microsoft.com/*` | Generic current page |
| `*://copilot.cloud.microsoft/*` | Generic current page |
| `*://chat.mistral.ai/*` | Generic current page |
| `*://www.perplexity.ai/*` | Generic current page |
| `*://perplexity.ai/*` | Generic current page |
| `*://www.meta.ai/*` | Generic current page |
| `*://meta.ai/*` | Generic current page |
| `*://poe.com/*` | Generic current page |
| `*://chat.qwen.ai/*` | Generic current page |
| `*://www.kimi.com/*` | Generic current page |
| `*://kimi.com/*` | Generic current page |
| `*://kimi.moonshot.cn/*` | Generic current page |
| `*://chat.z.ai/*` | Generic current page |
| `*://chatglm.cn/*` | Generic current page |
| `*://www.doubao.com/chat*` | Generic current page |
| `*://doubao.com/chat*` | Generic current page |
| `*://yuanbao.tencent.com/*` | Generic current page |
| `*://chat.minimax.io/*` | Generic current page |
| `*://duck.ai/*` | Generic current page |
| `*://pi.ai/*` | Generic current page |
| `*://character.ai/*` | Generic current page |
| `*://www.character.ai/*` | Generic current page |
| `*://huggingface.co/chat*` | Generic current page |
| `*://openrouter.ai/chat*` | Generic current page |
| `*://arena.ai/*` | Generic current page |
| `*://lmarena.ai/*` | Generic current page |
| `*://t3.chat/*` | Generic current page |
| `*://you.com/*` | Generic current page |
| `*://www.you.com/*` | Generic current page |
| `*://phind.com/*` | Generic current page |
| `*://www.phind.com/*` | Generic current page |
| `*://venice.ai/*` | Generic current page |
| `*://www.blackbox.ai/*` | Generic current page |
| `*://blackbox.ai/*` | Generic current page |
| `*://x.com/i/grok*` | Generic current page |
| `*://m365.cloud.microsoft/chat*` | Generic current page |
| `*://www.bing.com/chat*` | Generic current page |
| `*://chat.huggingface.co/*` | Generic current page |
| `*://legacy.lmarena.ai/*` | Generic current page |
| `*://hf.co/chat*` | Generic current page |

## Verification scope

- Core conversion and adapter behavior: 79 unit tests; see [verification](VERIFICATION.md).
- Built userscript: 81 local-fixture browser checks across Chromium, WebKit and mobile WebKit.
- Authenticated ChatGPT, Gemini, Claude, DeepSeek and other sites: not live verified.
- Actual Safari Userscripts and Tampermonkey extension installation: manual follow-up required; WebKit injection is a different test.
- Reference export/delete dialogs: external clicks were blocked by automatic approval review, so those dialogs were not inspected. This does not block local fixture tests or exports.

Report a redacted failing DOM example and platform/version/date when a selector stops working. Never include conversation content, cookies or tokens in a public issue. See [privacy](PRIVACY.md), [security](../SECURITY.md) and [architecture](ARCHITECTURE.md).

## YouTube captions

On a watch/shorts/live page, opening **YouTube timedtext** automatically detects original tracks and offered translations. Switching videos refreshes the list. **Download TXT/VTT** fetches and converts directly; a manually downloaded source file is not required. Public player/watch data supplies tracks; existing video-page timedtext requests can supply fresher signed parameters.

Only validated HTTPS YouTube/video.google.com timedtext endpoints for the current video are used, with no stored credentials or private API. JSON3 and original XML/VTT responses are accepted. Captions must be available and accessible; restricted, empty, expired or blocked responses fail visibly. Enabling captions in the native player and refreshing languages may help. Saved JSON3/XML/VTT import is optional. Production-bundle fixture tests cover original/translated languages, signature preservation, live-page request capture, video changes and XML fallback, not universal live-video access.

## Offline exports (v2.3.0)
ChatGPT and Gemini share standalone HTML and optional embedded Markdown for current, selection, preview, batch ZIP and required pre-cleanup backups. Capture happens online from loaded DOM URLs, with bounded browser-session fetch and decoded-image fallback. Unsupported/missing included media rejects the chat rather than marking it safely backed up. Source links and unrendered history are not made offline. HTML contains no external runtime assets; Markdown needs a data-URL-compatible viewer. Provider fixtures verify exact bytes and offline HTML rendering; live deployed compatibility remains unverified.

ChatGPT supports runtime-gated archive/delete. Gemini exposes delete rather than native archive; use its downloaded ZIP as a local archive, inspect it, then delete successful backups through the review. [Google chat-management help](https://support.google.com/gemini/answer/13666746?hl=en), checked 2026-11-11. Do not add a fabricated Gemini archive control.
