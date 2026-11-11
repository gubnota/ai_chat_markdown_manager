# API contracts

Canonical TypeScript definitions: `src/types/index.ts`. There is no server API, database, FFI, authentication/session protocol or private platform API.

## Identity and discovery
- `ConversationIdentifier`: `{platform: string, id: string}`.
- Selection key: `${platform}:${id}`; never array index or title.
- Conversation fields: identity, title, URL, current, optional cached/updatedAt, status `active | archived | unknown`, completeness `partial | complete`.
- Current implementations emit partial completeness and unknown status when native evidence is absent. Never invent timestamps.
- Discovery accumulates same-origin valid native sidebar IDs across DOM virtualization; generic fallback is a current page identity. Native ChatGPT/Gemini/Claude/DeepSeek adapters disable `currentPageFallback`: only native route IDs enter discovery; start pages and stale synthetic `page:` identities are excluded. Removed synthetic selection keys are pruned on scan.
- Capability values: `supported | unsupported | unknown | requires_permission` for discover/export/archive/delete. Only `supported` permits invoking a UI action.

## PlatformAdapter
- `discoverConversations(): Promise<Conversation[]>`.
- `getConversation(identifier, signal?): Promise<Conversation>` validates identity.
- `exportConversation(identifier, ExportOptions, signal?): Promise<string>` returns genuine Markdown or rejects.
- `archiveConversation(identifier, signal?): Promise<void>`; ChatGPT only, when recognized row controls are available.
- `deleteConversation(identifier, signal?): Promise<void>`; ChatGPT/Gemini when recognized row controls are available; unsupported elsewhere.
- Optional `observe(onChange): () => void` returns observer cleanup.
- Optional `beginExportSession(): () => Promise<void>` captures the start route; its async cleanup restores that route independently of a cancelled export signal. Restoration alone may accept a settled empty non-conversation start page; exports still require changed nonempty messages.
- No native destructive operation may infer identity from title alone, retry implicitly or treat an uncertain outcome as success.
- Native capabilities start unknown and enable on discovery of recognized row controls. Each job still requires its own exact ID/row/control and newly opened unique menu. Delete requires a unique title and new title-bearing dialog with an exact localized Delete button. Archive commits at its exact menu item without a native confirmation.
- Success requires stable target-row removal plus closed own menu/dialog while the original sidebar stays visible/connected. Successful IDs are forgotten and suppressed from discovery for this tab; reload after external unarchive. No account-wide native control is invoked.

## Loaded message boundaries
`messageNodes(platform)` returns visible outermost provider message containers in DOM order, excluding hidden/inert/sidebar/toolbar/manager content. ChatGPT recognizes legacy author roles, content-search keys and direct role-heading parents inside Conversation; Grok/Claude use observed message test IDs, Gemini custom elements, DeepSeek `.ds-message`. `messageRole` avoids guessing DeepSeek user roles from hashed classes (neutral Message when unknown). Conversion, navigation and media scope share these boundaries. No loaded-DOM result implies complete history.

## Export and snapshots
`ExportOptions`: `format: "markdown" | "html"` (default Markdown), booleans embedMedia and mediaFiles (default false), images, links, metadata, source, outline, selection, title, timestamps, manifest; string filename template. embedMedia or mediaFiles enables resource capture for both formats. mediaFiles creates a ZIP with separate binary assets and overrides inline embedding for downloads; clipboard uses inline embedding. Selecting HTML defaults it on, with an editable switch. Templates support platform/date/slug/id in the export implementation.

ChatGPT/Gemini/Claude automatically open noncurrent chats through discovered same-origin native SPA links when no matching snapshot exists. Require the target route, changed nonempty role-message text/image identity, no visible loading marker and 900 ms stability within 30 seconds. Missing links, full-page reloads or stale content reject. Explicit preview/export captures a snapshot; memory cap 20 entries / approximately 8 MiB UTF-16. Cached bodies require matching images/links/outline/effective-embedding options. Other adapters still require current content or a matching snapshot. Metadata is wrapped separately; never substitute the active conversation. Partial warning always accompanies partial output. Filenames are sanitized and collisions suffixed.

Attachment conversion is shared by current/preview/batch exports. Message image buttons preserve HTTP(S) image references when images is enabled; recognized file cards preserve exposed HTTP(S) href/data-file-url/data-download-url links when links is enabled. Ordinary buttons, hidden descendants and toolbars remain excluded. Loaded blob message images may be copied through canvas to PNG data URLs (at most 16,777,216 pixels and 12 MiB URL length). Bounded raster data URLs are retained; Loaded data-SVG images use the same bounded PNG canvas path; raw SVG is never embedded. Unsafe, unloaded, oversized or canvas-restricted sources produce an image/filename “direct link unavailable” note. Nested carousel cards are traversed individually. Disabling images removes image references/notes; disabling links retains file names without URLs. URLs can expire or require login. Embedded previews require data-image renderer support and enlarge exports; link mode in either format never fetches media during capture. No export opens native attachment controls.

`embedMarkdownMedia(body, roots, options, signal?)` requests only exposed resources referenced by the converted loaded message body. Images require images; files/audio/video require links. Same-page blob audio/video and HTTP(S) resources use browser-session fetch with a 20-second timeout; Cross-origin images retry anonymously after credentialed fetch network/CORS failure, under the same timeout and limits; input files retain session credentials. Decoded image canvas fallback is bounded. Max 20 MiB/resource, 64 MiB/chat, 100 unique resources. File bytes use `application/octet-stream` data URLs; raster images/audio/video retain validated MIME. Missing URLs, blocked/empty/oversized responses and login HTML reject the chat in offline mode. No partial offline success is cleanup-eligible. CORS/CSP and streaming-only sources may be unsupported.

`exportDocument(body, conversation, options)` wraps genuine Markdown, or renders self-contained HTML via bundled Marked and an allowlisted rebuilt DOM. HTML allows no scripts, handlers, frames, forms or remote styles. CSP defaults to none and enables data-only media and inline CSS. Embedded HTML requires data images; linked HTML permits validated HTTP(S) images under a matching image CSP and warns that external resources require internet and may expire. Embedded file links have download filenames; external source links still require internet. `filename` accepts optional format; collisions retain `.md`/`.html`. Current, selection, preview, ZIP and required backups use the same format contract.

Bulk ZIP contains successful `.md` or `.html` entries plus optional `manifest.json`: version, format, embeddedMedia, scope (`discovered DOM only; partial`), createdAt, state, total, completed, failed, skipped and results. Each result has key, status (`success | failed | skipped`), optional error. No successful empty backup when every export fails. Exported JSON reports may include IDs/errors; they are explicit downloads, not persistent history.

After a ZIP download is initiated successfully, the app keeps an in-memory review of that batch’s successful targets only. Failed/skipped entries are excluded, and starting another batch clears the review. Browser download initiation is not proof that the file was saved or complete: review requires acknowledgment of inspecting the ZIP before offering Archive/Delete backed-up chats on supported adapters. Those shortcuts freeze only successful targets and use normal mandatory confirmation. Export itself never triggers mutation.

## Batch lifecycle
- Kinds: export, archive, delete.
- States: idle, scanning, ready, exporting, archiving, deleting, completed, partially_completed, failed, cancelled.
- Input: frozen conversation array, kind, stopOnError, delayMs, optional batchSize.
- Progress: state/kind/current, total/completed/failed/skipped, results, optional startedAt.
- One active runner, sequential jobs, one AbortController; batchSize groups delays rather than concurrency.
- Cancel marks queued work skipped and does not undo completed work. After a native commit click, bounded outcome observation ignores abort: verified completion is success; unverified outcome is failed with structural `actionAttempted: true`, even during cancellation. No retry is implied.
- Export retry is explicit and limited to failed entries. Never automatically retry destructive work.
- Optional pre-mutation backup must export every frozen target successfully and initiate ZIP download before any native click. Restore the start route before mutation; failed backup/restoration or cancellation prevents mutation. No restoration runs after native mutation.
- App requires explicit typed DELETE / DELETE ALL confirmation and final action; capability checks still apply.

## YouTube captions
- Opening the caption screen on a YouTube watch/shorts/live video automatically discovers tracks; `yt-navigate-finish`/popstate refresh them for a new video.
- `discoverCaptionTracks(signal?)`: current video ID/title, original tracks, offered translation languages. Read matching player JSON; use a public same-origin watch-page fallback for stale/missing SPA data.
- `fetchCaptions(info, track, language?, signal?)`: validated current-video cues, trying JSON3 then the original track format. Prefer the latest matching video-page timedtext resource URL (same video, language, kind/name and compatible translation). Preserve signed parameters; set only fmt/tlang.
- HTTPS YouTube/video.google.com timedtext endpoints only; reject redirects, foreign video IDs, blocked/empty content and unavailable translations. No private API or stored credentials.
- Responses/imports capped at 5 MiB; network timeout 20 seconds.
- Cues: `{startMs, durationMs, text}`; JSON3, transcript XML, srv3 XML and VTT accepted. TXT joins cue text; VTT preserves millisecond timing and Unicode.
- Direct TXT/VTT actions fetch and convert without a source-file download. Saved-file/paste conversion is an optional fallback.

## Persistence and geometry
Origin-local prefix `__ai_chat_md_v2__:`. Settings defaults/schema/clamps: `src/storage/index.ts`; legacy booleans read from `__safari_md_export_settings_v1__`, legacy anchor migrated separately. Unknown/invalid values fall back safely. Selection stores at most 10,000 stable keys. History at most 30 summaries without title, URL, IDs or content. Cache is never persisted. Storage denial must not block the current session.

FAB anchor persists independently of flyout size; clamp to viewport and avoid detected Send controls. Panel dimensions must never overwrite anchor coordinates. Alt+Shift+E toggles/restores; Alt+Shift+M exports; Shift-click exports highlighted content; Escape minimizes or closes the active dialog first. See `src/app/App.tsx` for dispatch order.

## Preview export UI
Preview retains a conversation identity and local ExportOptions snapshot. Format/embed/image/link changes clear previous output and recapture through the adapter with an AbortSignal and route restoration. Download stays disabled during capture or after failure; retry recaptures the selected options. Closing aborts capture and prevents late results reopening the dialog. Home Markdown/HTML actions open local Export options (format/embed/images/links); no capture starts until Download and cancellation produces no download. HTML starts with embedding on but permits switching it off. Failures stay visible and retryable. Configured shortcut/batch defaults remain unchanged.

## Offline file packages
`prepareDocument(body, conversation, options, name)` returns `{text, name, files: Map<string,string|Uint8Array>}`. With mediaFiles enabled, decode captured safe data resources into `assets/<document-stem>/` and rewrite actual Markdown resource tokens to encoded relative URLs; preserve code examples. HTML accepts only exact generated asset paths under its restrictive CSP. `renamedDocument` changes the document entry while preserving valid asset links. `makeZip` preserves Uint8Array bytes. Resource limits remain 100, 20 MiB/file, 64 MiB/chat. Loaded data-SVG images may be rasterized to PNG within existing canvas bounds; raw SVG is never embedded. Inaccessible included files still reject that chat before cleanup. Preview preserves an edited name when options change.
