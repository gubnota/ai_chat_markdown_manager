# Project context

## Identity
- Project: AI Chat Markdown Manager.
- Repository: `gubnota/ai_chat_markdown_manager`.
- Release: 2.4.1, 2026-11-12.
- Purpose: manage discovered AI conversations, load selected chats for local export, and download YouTube captions.
- Audience: Safari Userscripts and Tampermonkey users.
- Product: a floating userscript interface injected into matched chat websites.
- No backend, database, hosted application or account credentials.

## Current milestone
- v2.4.0 adds separate-file offline ZIPs, loaded SVG-to-PNG capture, custom format selector, editable names and progress.
- v2.3.3 fixes current ChatGPT extraction (search keys and role-heading containers), including image-only replies; shared visible boundaries cover Grok/Claude/DeepSeek too.
- Save Current Chat, Export selected, Export All and Retry failed exports show format and four media switches before download. Bulk exports default to offline embedding or honor the saved separate-file preference. Retries start with the last confirmed choices.
- v2.3.1 exposed preview format/embed/image/file controls with fresh capture and error-safe downloads.
- v2.3.0 added standalone offline HTML and optional embedded Markdown, shared across current/selection/preview/batch/required-backup exports for ChatGPT/Gemini.
- Offline media failures exclude that chat from successful-backup cleanup; Gemini uses a local ZIP archive then native delete.
- v2.2 adds native ChatGPT batch archive/delete, Gemini delete, and actions on reviewed successful backups.
- v2.1.1 excludes native start pages from batches and adds successful-export review.
- v2.1 added scroll loading, automatic chat loading for ZIP, and direct multilingual YouTube TXT/VTT.
- Original v1.2.0 script and `README.txt` preserved unchanged.
- Reference home, conversations and settings inspected through Browser.
- Reference export/delete dialog clicks blocked by automatic approval review.
- ChatGPT archive/delete and Gemini delete enable when recognized sidebar controls are present.
- Each action independently validates native identity, controls and outcome; missing controls stay unknown.
- No authenticated live mutation is claimed; Claude and other platforms have no native mutations.
- Actual extension installation requires manual verification.
- WebKit automation does not establish Safari extension compatibility.

## Technology
- Strict TypeScript for new application code.
- React 19 with reusable semantic controls.
- Tailwind 4, embedded CSS and Lucide icons.
- Shadow DOM isolates injected styles.
- Vite builds one ES2022 IIFE userscript.
- fflate creates genuine local ZIP downloads; bundled Marked plus allowlist reconstruction renders HTML.
- Vitest/jsdom covers conversion, identity, batch and storage behavior.
- Playwright covers the production bundle in Chromium and WebKit.
- npm lockfile fixes dependency versions.
- Node 22.12+ recommended; verified here on Node 26.8.2.

## Hard constraints
- Keep all original 48 metadata match rules plus 3 targeted YouTube rules.
- Never expand permissions to all websites.
- Bundle code and styles; no runtime CDN or remote imports.
- Do not fabricate history, content, timestamps or successful native actions.
- Discovery is partial and based on observed DOM identities.
- Unsupported and unknown operations remain visibly disabled.
- Native destructive actions must validate exact identity and fail closed.
- No destructive tests against real user accounts.
- Preserve inherited converter behavior and original MIT attribution.
- New code is MIT OR Apache-2.0; inherited/vendor licenses retain their terms.
- Preserve independent FAB anchoring and Send-button avoidance.
- Keep `.DS_Store`, dependencies and temporary test output out of Git.
- Track source and screenshots. Generate the userscript, versioned release ZIPs and checksums locally; ignore them in Git.

## Core workflows
- Open the FAB or restore it with Alt+Shift+E.
- Save current loaded content with Alt+Shift+M or the Save Current Chat action.
- Shift-click the FAB to save highlighted content.
- Discover loaded sidebar links; open/scroll the sidebar and rescan.
- Search/filter/sort and select stable platform/id keys.
- Preview or export current content to capture a temporary snapshot.
- ChatGPT/Gemini/Claude export automatically follows native SPA links and restores the starting chat.
- Export selected or all discovered chats to ZIP with per-item results and inline or separate assets. Loading may mark chats read.
- Review failures; only exports offer failed-item retry.
- After ZIP download, review successful chats, acknowledge checking files, then archive/delete with normal confirmations.
- Required pre-action backup must succeed for every target; restore the starting route before mutation.
- Native start pages are not conversations; generic matched websites retain current-page export.
- Cancel queued work without undoing completed work.
- Open YouTube timedtext on a video: detect languages automatically, then download TXT/VTT directly.
- Saved timedtext import is an optional fallback, never a prerequisite.
- Adjust appearance, FAB, Markdown and batch preferences locally.
- Expand the manager to the browser viewport, restore its compact position, or dismiss it with X or Escape.

## Platform behavior
- ChatGPT: sidebar discovery, native SPA auto-loading and role-aware conversion.
- Gemini: sidebar discovery, native SPA auto-loading and role-aware conversion.
- Claude: sidebar discovery, native SPA auto-loading and role-aware conversion.
- DeepSeek: loaded-link discovery and generic loaded-content export.
- Remaining matched sites: current-page generic conversion only.
- Authenticated Safari Userscripts current-chat downloads verified on ChatGPT/Gemini/Grok/Claude/DeepSeek; live native mutations and Tampermonkey remain unverified.
- Shared native engine scopes every action to one exact sidebar row and its newly opened menu.
- Delete requires a unique title-bearing native confirmation; archive commits at the menu action.
- Success requires stable row removal and menu/dialog dismissal with the original sidebar present.
- Unknown outcomes fail without automatic retry; cancellation finishes observing an already clicked action.
- See `docs/PLATFORMS.md` before changing a capability.

## Privacy and security
- No telemetry, uploads, remote code or private account APIs.
- Current page DOM is read locally; native chat navigation uses the host router.
- YouTube captions use public watch/player data and signed timedtext URLs, held in memory only.
- Caption requests are limited to validated YouTube endpoints; no credential storage.
- Empty/blocked captions, unavailable native links and load timeouts fail explicitly.
- Settings, FAB anchor and selection IDs persist per origin in localStorage.
- History retains at most 30 operation summaries without content or identities.
- Captured Markdown bodies stay in memory only.
- Snapshot cache: at most 20 entries and approximately 8 MiB UTF-16 text.
- Reload clears snapshots; same-tab SPA navigation may retain them.
- Downloads and clipboard may contain sensitive conversation content.
- Open Shadow DOM and same-origin storage are not security boundaries.
- Host scripts/extensions can access same-origin data.
- Embedding controls resource requests for both formats; default Markdown keeps links, and selecting HTML defaults embedding on with an editable switch.
- Embedded HTML uses data-only media; ZIP HTML permits only its generated local assets. Offline capture fails on missing included resources; linked HTML permits safe HTTP(S) images. Both use inline styles and restrictive CSP.
- Media limits: 20 MiB/file, 64 MiB/chat, 100 resources; 20-second requests. Canvas previews remain bounded.
- See `docs/PRIVACY.md` for reset behavior and storage details.

## Performance and accessibility
- DOM observation is debounced and ignores the injected UI.
- List reveals 24 more items automatically near its bottom; selection retains all matching IDs.
- Chat navigation requires changed nonempty text/image identity settled for 900 ms; timeout 30 seconds.
- Caption responses are bounded to 5 MiB and requests to 20 seconds.
- Batches run sequentially; batch size controls delay grouping, not concurrency.
- FAB coordinates are independent of expanded-panel dimensions.
- Viewport changes clamp position and avoid detected Send controls.
- Keyboard focus, dialogs, labels, reduced motion and responsive layout matter.
- Some status/error strings remain English in the Russian UI.

## Agent workflow
- Read the six compact context documents first.
- Use `docs/ARCHITECTURE_INDEX.md` to locate relevant modules.
- Inspect only files needed for the task; do not scan the whole repository.
- Keep module dependencies aligned with `docs/MODULE_OWNERSHIP.md`.
- Update stable contracts and ADRs when behavior changes.
- Record results and blockers in `docs/TASK_LOG.md`.
- Keep documents concise and implementation-aligned.
- Make coherent commits and preserve user changes.
- Never represent fixture results as live account verification.

## Commands and evidence
- Install: `npm ci`; develop: `npm run dev`.
- Check: `npm run lint`, `npm run typecheck`, `npm test`.
- Release: `npm run build`; browser checks: `npm run test:integration`.
- Install browsers once: `npx playwright install chromium webkit`.
- Checksums: `shasum -a 256 -c SHA256SUMS-v2.3.3` from repository root after a local build.
- Evidence: `docs/VERIFICATION.md` and `docs/screenshots/`.
- Distribution: `npm run build` generates the ignored `dist/AI-Chat-Markdown-Manager.user.js` and root release ZIP.
