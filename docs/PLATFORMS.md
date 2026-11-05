# Platform support — v2.1.0

Support describes implemented DOM paths, not verified access to an entire account. Every discovered conversation is marked **partial**. Websites may change their DOM, permissions or routing independently of this release.

## Capabilities

| Adapter | Discovery | Markdown / ZIP | Native archive | Native delete |
| --- | --- | --- | --- | --- |
| ChatGPT (`chatgpt.com`, `chat.openai.com`) | Loaded sidebar links with `/c/{id}` | Automatic native SPA loading; matching snapshots in this tab | Unsupported | Unsupported |
| Gemini (`gemini.google.com`) | Loaded sidebar links with `/app/{id}` | Automatic native SPA loading; matching snapshots in this tab | Unsupported | Unknown; disabled |
| Claude (`claude.ai`) | Loaded sidebar links with `/chat/{id}` | Automatic native SPA loading; matching snapshots in this tab | Unsupported | Unsupported |
| DeepSeek (`chat.deepseek.com`) | Loaded links with `/a/chat/s/{id}` | Current loaded DOM; previously captured snapshots in this tab | Unsupported | Unsupported |
| Other matched hosts | Current page only | Generic loaded-DOM conversion; ZIP of available content | Unsupported | Unsupported |

Selection, filtering, pagination and export operate on genuine discovered IDs. Scroll or open the native sidebar and rescan to reveal additional entries. Virtualized entries accumulate in memory until reload. Generic pages use a pathname/query identifier; this is a page identifier rather than a verified native conversation ID. No adapter calls a private API or loads a background tab. ChatGPT/Gemini/Claude exports click native SPA links in the current tab and wait for new settled messages. A missing link, full-page reload or timeout fails explicitly. The starting chat is restored after success/cancellation; loading can mark chats read.

Explicit export or preview captures the current Markdown body in a temporary cache (20 snapshots, approximately 8 MiB of UTF-16 text). Same-tab SPA navigation can retain it. A full reload or another tab cannot. Image/link/outline options must match the captured format. ChatGPT/Gemini/Claude automatically load the native chat when a matching snapshot is unavailable. Other adapters require a manual visit/capture. Any unavailable content fails explicitly and appears in the report. ZIP success does not imply complete account history.

## Gemini deletion blocker

On **2026-11-04**, Browser inspection of `https://gemini.google.com/` redirected to signed-out `/app`. No authenticated conversation sidebar, native menu or title-bearing confirmation was available. Reliable deletion against the deployed account UI could therefore not be established. Production `createAdapter()` constructs `GeminiAdapter` with verification disabled; the capability is `unknown`, controls are disabled and direct deletion rejects before clicking anything. There is no user preference to override this gate.

A native deletion engine exists and is covered by realistic fixtures. Its test-only constructor opt-in exercises exact same-origin IDs, unique entries, revalidation after menus open, localized native labels, a new confirmation with the exact target title, a unique final button and verified row/dialog removal. Duplicate IDs/titles, changing identities, missing controls, unrelated dialogs, timeout and cancellation fail closed. Fixture success is not evidence that today's authenticated Gemini UI has those controls.

Before enabling production deletion, an authorized disposable account must demonstrate the exact current DOM and outcome, including localization and ambiguous cases. Record browser/date/permissions, add redacted fixture regressions and rerun all checks. If native confirmation cannot identify one exact conversation, keep the capability disabled. Test selected single and multiple targets; never test against a user's real history. No account-wide deletion endpoint is implemented.

The application already supplies frozen selection summaries, explicit `DELETE` / `DELETE ALL` confirmation, final irreversible-action labels, optional successful backup of every target before mutation, sequential execution, cancellation and per-item results. These safeguards do not enable an unverified adapter. Native archive has no production implementation on any platform and needs its own native-control evidence.

## Original match rules retained

All 48 inherited metadata entries are preserved exactly, plus 3 targeted rules for youtube.com, www.youtube.com and m.youtube.com. Host/path permission does not imply a specialized adapter, authenticated verification or native operation support. `*://` permits the original HTTP/HTTPS schemes; no global host wildcard is added.

| Metadata match | Adapter |
| --- | --- |
| `*://chatgpt.com/*` | ChatGPT |
| `*://chat.openai.com/*` | ChatGPT |
| `*://gemini.google.com/*` | Gemini |
| `*://aistudio.google.com/*` | Generic current page |
| `*://notebooklm.google.com/*` | Generic current page |
| `*://grok.com/*` | Generic current page |
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

- Core conversion and adapter behavior: 55 unit tests; see [verification](VERIFICATION.md).
- Built userscript: 51 local-fixture browser checks across Chromium, WebKit and mobile WebKit.
- Authenticated ChatGPT, Gemini, Claude, DeepSeek and other sites: not live verified.
- Actual Safari Userscripts and Tampermonkey extension installation: manual follow-up required; WebKit injection is a different test.
- Reference export/delete dialogs: external clicks were blocked by automatic approval review, so those dialogs were not inspected. This does not block local fixture tests or exports.

Report a redacted failing DOM example and platform/version/date when a selector stops working. Never include conversation content, cookies or tokens in a public issue. See [privacy](PRIVACY.md), [security](../SECURITY.md) and [architecture](ARCHITECTURE.md).

## YouTube captions

On a watch/shorts/live page, opening **YouTube timedtext** automatically detects original tracks and offered translations. Switching videos refreshes the list. **Download TXT/VTT** fetches and converts directly; a manually downloaded source file is not required. Public player/watch data supplies tracks; existing video-page timedtext requests can supply fresher signed parameters.

Only validated HTTPS YouTube/video.google.com timedtext endpoints for the current video are used, with no stored credentials or private API. JSON3 and original XML/VTT responses are accepted. Captions must be available and accessible; restricted, empty, expired or blocked responses fail visibly. Enabling captions in the native player and refreshing languages may help. Saved JSON3/XML/VTT import is optional. Production-bundle fixture tests cover original/translated languages, signature preservation, live-page request capture, video changes and XML fallback, not universal live-video access.
