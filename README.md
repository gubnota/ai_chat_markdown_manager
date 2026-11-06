# AI Chat Markdown Manager v2.1.1

[Русский](README.ru.md) · [Installable script](dist/AI-Chat-Markdown-Manager.user.js) · [Release ZIP](AI-Chat-Markdown-Manager-v2.1.1.zip)

## 1. Overview

A local userscript for turning AI conversations into Markdown, automatically loading selected chats for ZIP backups, and downloading YouTube captions as TXT/VTT. A floating React interface runs inside a Shadow DOM. No server, account connection, telemetry, or CDN is required.

This release preserves the v1.2.0 converter and all 48 domain/path match rules, adding 3 targeted YouTube rules. Discovery is partial. Native archive is unavailable; Gemini deletion is deliberately disabled pending authenticated live validation.

## 2. Screenshots and UI preview

![Floating tools menu](docs/screenshots/manager.png)
![Conversation manager](docs/screenshots/conversations.png)

[Mobile WebKit preview](docs/screenshots/mobile.png). These images show the actual production bundle on a clearly labelled local fixture, not a connected account. The Base44 reference informed composition; see [observed design and inspection limits](docs/DESIGN_INVENTORY.md).

## 3. Features

- Draggable FAB, separate persistent anchor, Send-button avoidance, minimize and restore.
- Dashboard/tools, conversations, export, archive information, settings and activity screens.
- Search, stable multi-selection, filters, sorting, automatic scroll loading in groups of 24, preview and context actions.
- Markdown downloads, clipboard, highlighted-text export, genuine in-tab snapshots and ZIP manifests.
- YouTube video-page caption detection, language/translation selection and direct TXT/VTT downloads.
- Sequential batches, cancellation, per-item failures, reports and export-only safe retries.
- Light/dark/system themes, English/Russian interface and reduced motion.

## 4. Platforms and capabilities

| Platform | Discovery | Markdown / ZIP input | Native archive | Native delete |
| --- | --- | --- | --- | --- |
| ChatGPT | Sidebar `/c/id` + current page | Automatic native chat loading / in-tab snapshots | Unsupported | Unsupported |
| Gemini | Sidebar `/app/id` + current page | Automatic native chat loading / in-tab snapshots | Unsupported | Unknown; disabled |
| Claude | Sidebar `/chat/id` + current page | Automatic native chat loading / in-tab snapshots | Unsupported | Unsupported |
| DeepSeek | Links `/a/chat/s/id` + current page | Loaded DOM / explicit in-tab snapshots | Unsupported | Unsupported |
| Other inherited matches | Current page only | Generic loaded DOM / in-tab snapshots | Unsupported | Unsupported |

These are implementation capabilities, not claims of authenticated live verification. Chromium/WebKit fixture tests cover the bundle; Gemini was accessible only signed out. Every inherited domain and its verification status is in [PLATFORMS.md](docs/PLATFORMS.md).

## 5. Safari installation

Install [Userscripts](https://github.com/quoid/userscripts), enable it in Safari extension settings, and allow the intended chat website. Open the scripts directory configured in the Userscripts app and copy `dist/AI-Chat-Markdown-Manager.user.js` there. Enable the script, disable the old version and reload the site. See [complete Safari steps and troubleshooting](docs/INSTALL-SAFARI.md).

## 6. Tampermonkey installation

Install [Tampermonkey](https://www.tampermonkey.net/), open its dashboard and create a new script. Replace the template with the complete distributable, save, enable it and reload a matching website. Disable duplicate versions. [Installation and upgrade guide](docs/INSTALL-TAMPERMONKEY.md).

## 7. Quick start

1. Open a conversation and let its messages load.
2. Click the floating file icon. Drag it to a convenient position.
3. Choose **Save current chat as Markdown** or **Copy Markdown**.
4. Open **Manage conversations**. Scroll the website's own history to discover more entries.
5. Select chats and choose an export action. Read Activity for individual failures.

## 8. Markdown export

The inherited converter handles headings, lists, tables, fenced code with language tags, mathematical annotations, links and image references. Export Settings controls front matter, title, source URL, available timestamps, outline, images, links and filenames. Code fencing is always preserved.

Use **Export selected content** after highlighting webpage text, or Shift-click Save. Empty selections and empty content produce errors. Exports always warn when completeness is partial. Unknown timestamps are omitted, and filenames use `undated`; no dates or account history are invented.

Image URLs are referenced, not downloaded. A Markdown viewer may later request those URLs.

## 9. Selecting conversations

Checkboxes use platform + stable conversation ID. Search, sorting and filters never substitute row positions for identity. **Select visible** targets the displayed page; **Select all matching** includes all discovered matches. Invert affects matching entries; Clear removes the whole selection.

Selection persists on this website. Unknown dates/statuses remain unknown and do not match dated or active/archived filters. Scrolling near the list bottom automatically reveals 24 more rows; no Load more click is needed. Discovery accumulates sidebar IDs as the host virtualizes them; it cannot discover inaccessible account history.

## 10. Bulk export

Select chats and use **Export selected**, **ZIP all discovered**, or the Archive screen's ZIP backup. On **ChatGPT, Gemini and Claude**, the manager opens each selected chat through its native sidebar link, waits for newly loaded messages and exports automatically. You do not need to open every chat first. The starting conversation is restored after completion or cancellation. Loading chats may mark them read.

Native SPA links must remain available. A missing/virtualized link, full-page reload or load timeout produces an individual failure; stale messages are never substituted. Scroll the platform sidebar and rescan if necessary. Other platforms still require current content or a matching temporary snapshot. Discovery and loaded history remain partial.

The ZIP contains successful `.md` files and an optional `manifest.json` with per-item results. A fully failed batch produces a report, not an empty successful backup. Preview/export caches up to 20 chats / approximately 8 MiB in memory; reload clears it. Image/link/outline options must match cached content; the three automatic adapters reload when necessary.

Cancel stops queued work; completed results remain valid. **Retry failed exports** retries failed items only. Filenames are sanitized and collisions receive numeric suffixes.

## YouTube captions

1. Install v2.1, allow YouTube in your userscript extension and reload the video page.
2. Open the floating menu → **YouTube timedtext**. Available caption languages are detected automatically from the current video; switching videos refreshes them.
3. Choose an original track or an offered translation, then **Download TXT** or **Download VTT**. The script fetches and converts captions directly. No timedtext file needs to be downloaded or imported first.

TXT contains plain caption text; VTT retains timestamps. Captions must be available and accessible on that video. Empty/blocked responses produce a visible error, not an empty download. **Import saved timedtext (optional)** accepts JSON3, XML or VTT as a fallback. Signed caption URL parameters are used in memory only; no API key or transcript upload is needed.

![YouTube caption languages and direct downloads](docs/screenshots/youtube-captions.png)

## 11. Native archiving

Native archive controls are disabled on every adapter in v2.1. A ZIP backup does not change a conversation's platform state. The Archive screen explains this distinction and provides a local ZIP action. Native archive support requires its own verified adapter implementation.

## 12. Selected deletion and Gemini

After downloading a ZIP, expand **Review backed-up chats** in Activity. It lists only chats exported successfully in that batch. Open the ZIP and inspect those files first; message history can still be partial. To delete a Gemini chat, find it in Gemini’s sidebar and choose **More → Delete**. Work/school accounts may restrict deletion. See [Google’s instructions](https://support.google.com/gemini/answer/13666746). Automatic deletion remains unavailable.

Native welcome/start pages, including Gemini’s `/app` (“Where should we start?”), are excluded from conversation batches. Reload the site after upgrading to remove the old synthetic entry.

Production Gemini deletion has capability `unknown`, so Delete/Delete all are visibly disabled. The available live Gemini page redirected to a signed-out `/app` screen with no history, action menus or confirmation dialogs. Reliable account mutation could not be established.

A guarded engine is implemented and tested against realistic sidebar/dialog fixtures: same-origin stable IDs, unique identity/title, native menu, exact localized Delete action, title-bearing confirmation and verified removal. It is not enabled by a user setting. See the [technical blocker and activation requirements](docs/PLATFORMS.md#gemini-deletion-blocker).

## 13. Safety and confirmation

For a future verified native adapter, the interface shows exact titles and IDs, count and irreversibility warning; selected deletion requires `DELETE`, and all-discovered deletion requires `DELETE ALL`, followed by a final start button. Required confirmations cannot be disabled. No production native batch can currently be started.

The engine allows one batch, prevents repeated submission, checks identity again at native controls, and never automatically retries deletion. Optional backup must succeed for every selected item before any native mutation. Cancellation does not reverse completed actions. An uncertain native outcome is a failure requiring manual inspection.

## 14. Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Toggle / restore overlay | Alt+Shift+E |
| Save current Markdown | Alt+Shift+M |
| Export highlighted text | Shift-click Save |
| Minimize panel / close dialog | Escape |

Shortcuts can be disabled in Settings. If the overlay is hidden while shortcuts are disabled, reload the page. Browser or OS shortcuts may take precedence.

## 15. Settings

Appearance: theme, scale, opacity, language, reduced motion. FAB: size, drag lock, auto-minimize and shortcuts; drag to set its stored position or reset preferences. Markdown: metadata, source, title, timestamps when available, images, links, outline, highlighted-text mode, manifest and filename template.

Filename tokens: `{platform}`, `{date}`, `{slug}`, `{id}`. Bulk settings include batch size (sequential items per delay), delay, stop-on-error, archive/delete backup and local activity history. Mandatory confirmations stay enabled. Reset clears manager preferences, selection, anchor and count-only history on this origin.

## 16. Local development

Use Node.js 22.12+ and npm (verified here with Node 26.8.2 / npm 11.19.1).

```sh
npm ci
npm run dev
```

Open the printed localhost URL. The demonstration is explicitly a local fixture with no account connected. Development code is never required by the distributable. Do not test native deletion on a personal account.

## 17. Build

```sh
npm run build
```

Strict type checking precedes a production IIFE build. Output: `dist/AI-Chat-Markdown-Manager.user.js`, root release ZIP and `SHA256SUMS`. Code, styles, React, Lucide and fflate are bundled locally. There are no runtime imports, remote dependencies or source maps. [Architecture](docs/ARCHITECTURE.md).

## 18. Tests

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium webkit
npm run build
npm run test:integration
```

61 unit tests cover conversion, storage, identity, batching, Gemini safety, navigation and timedtext. 57 browser checks cover the production bundle in Chromium, desktop WebKit and mobile WebKit, including three-platform batch loading/restoration, cancellation, automatic caption languages, TXT/VTT downloads, XML fallback and video changes. The idle manager makes no outgoing requests; explicit caption actions and native navigation use the host site. [Exact verification scope](docs/VERIFICATION.md). WebKit automation is distinct from testing Safari's Userscripts extension.

## 19. Troubleshooting

| Symptom | What to do |
| --- | --- |
| No floating icon | Check extension/site permission, script enabled, URL matches; reload, then Alt+Shift+E |
| Two overlays / repeated downloads | Disable inherited or duplicate scripts in every script manager |
| Chat missing from list | Open/scroll the platform sidebar; Rescan; discovery is partial |
| Unloaded-content error | Reveal its native sidebar link and rescan/retry; other platforms require a manual visit |
| Formatting-changed error | Re-export that chat with current image/link/outline settings |
| Clipboard blocked | Use Save; browser permission or security context may prevent copying |
| Preferences lost | Private mode/storage restrictions may block per-origin localStorage |
| Delete/archive disabled | This is the declared capability; no hidden unlock is provided |

Download confirmation, destination and retention are controlled by your browser. If the platform changes its DOM, use the platform manually and report a redacted reproduction.

## 20. Security and privacy

The script reads rendered conversation content, sidebar titles, IDs and URLs; it does not access private APIs or authentication cookies. YouTube signed caption URLs are read from public player data and used temporarily for caption requests, never persisted. Preferences, anchor and selection IDs are stored in the current site's localStorage. History stores counts/state/time only. Explicit Markdown snapshots remain in tab memory; downloads contain conversation text and optional source URLs.

No conversation uploads or telemetry are implemented. Same-origin website scripts can read localStorage and the open Shadow DOM; this UI is style isolation, not a security boundary. Review exported reports before sharing because they contain IDs/errors. [Privacy details](docs/PRIVACY.md) · [Security reporting](SECURITY.md).

## 21. Known limitations

- Loaded DOM and discovered entries can be incomplete, stale or virtualized; statuses/dates are unknown unless verified.
- Generic fallback can include surrounding webpage text and cannot infer every platform's speaker roles.
- Automatic chat loading requires native SPA links and does not guarantee complete account history. Snapshots stay within tab/memory limits.
- YouTube captions/translations depend on video availability, signed URLs, site restrictions and browser permissions.
- Native archive and production deletion are unavailable. No undo/restore is promised.
- Signed-in live platform behavior, actual Safari extension injection and real touch hardware remain unverified.
- Modern CSS/ES2022 and an enabled userscript extension are required; host CSP, downloads and permissions may differ.
- Some technical errors and accessible control labels remain English in the Russian interface.

## 22. Contributing

Read the six compact project-memory documents before editing. Keep changes focused, preserve the converter and add realistic redacted fixtures for adapters. Native capabilities need identity safeguards and authenticated manual evidence before activation. Follow [CONTRIBUTING.md](CONTRIBUTING.md).

## 23. Dual licensing

New original project code is **MIT OR Apache-2.0**, at your choice: [LICENSE](LICENSE), [MIT](LICENSE-MIT), [Apache 2.0](LICENSE-APACHE). `SPDX-License-Identifier: MIT OR Apache-2.0`.

The inherited converter remains MIT, copyright Adem Kouki. React, Lucide, Tailwind and fflate keep their respective licenses. The dual-license choice does not relicense third-party code. Complete attribution is in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) and the release bundle. Original v1.2.0 source and README.txt remain as provenance.
