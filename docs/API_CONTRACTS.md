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
- `exportConversation(identifier, ExportOptions, signal?, missingMedia?, capture?, history?): Promise<string>` returns genuine Markdown or rejects. A supplied capture callback can localize assets before a turn leaves the DOM. Ordinary separate-file exports may supply a map for unavailable images and linked files and a `history.incomplete(reason)` handler for stalled ChatGPT history. Without that handler, a history stall rejects. Bodies with localized paths or missing media are never cached.
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

Recognized map widgets contribute bounded PNG snapshots from readable canvases, tiles or previews with `images` enabled, and an exposed HTTP(S) map URL with `links` enabled. Blocked or unreadable previews get an in-document note and count as missing images in offline exports. The existing media pipeline packages captured map images inline or as separate ZIP files.

`embedMarkdownMedia(body, roots, options, signal?, missingMedia?, sink?)` captures referenced resources. Images controls images, and links controls files, audio and video. Capture prioritizes same-origin blob image URLs, preserves validated bytes and can fall back to decoded pixels or other sources from the same image element. Each resource has one 20-second timeout and a 20 MiB limit. Image fetch retries omit credentials across origins. Input files retain session credentials. The optional sink receives binary bytes. Inline data URLs are limited to 64 MiB of resource bytes and 100 unique resources per chat. Ordinary HTML source pages stay as links. Inaccessible enabled resources normally reject the chat. Ordinary separate-file ZIPs keep readable assets, preserve failed source links, and report missing images and linked files. Required backups stay strict.

`exportDocument(body, conversation, options)` wraps genuine Markdown, or renders self-contained HTML via bundled Marked and an allowlisted rebuilt DOM. HTML rejects content scripts, handlers, frames, forms and remote styles. CSP defaults to none and allows inline CSS, a single bundled reader script via a fresh nonce, and media appropriate to the mode. Embedded HTML requires data images; linked HTML permits validated HTTP(S) images under a matching image CSP and warns that external resources require internet and may expire. Embedded file links have download filenames; external source links still require internet. `filename` accepts optional format; collisions retain `.md`/`.html`. Current, selection, preview, ZIP and required backups use the same format contract.

HTML indexes rendered illustrations and file links in separate lists below the contents and shows a filename caption under each image. Separate-file HTML also lists saved assets without a retained message under Additional exported files. Code blocks have a bundled Copy control and static syntax highlighting for supported languages. Copy uses the displayed code text.

Bulk ZIP contains successful `.md` or `.html` entries plus optional `manifest.json`: version, format, embeddedMedia, mediaFiles, scope (`discovered DOM only; partial`), createdAt, state, total, completed, failed, skipped and results. Each result has key, status (`success | failed | skipped`), optional error. No successful empty backup when every export fails. Exported JSON reports may include IDs/errors; they are explicit downloads, not persistent history.

After a ZIP download is initiated successfully, the app keeps an in-memory review of that batch’s successful targets only. Failed/skipped entries are excluded, and starting another batch clears the review. Browser download initiation is not proof that the file was saved or complete: review requires acknowledgment of inspecting the ZIP before offering Archive/Delete backed-up chats on supported adapters. Those shortcuts freeze only successful targets and use normal mandatory confirmation. Export itself never triggers mutation.

## Batch lifecycle
- Kinds: export, archive, delete.
- States: idle, scanning, ready, exporting, archiving, deleting, completed, partially_completed, failed, cancelled.
- Input: frozen conversation array, kind, stopOnError, delayMs, optional batchSize.
- Progress: state/kind/current, total/completed/failed/skipped, results, optional startedAt.
- One active runner, sequential jobs, one AbortController; batchSize groups delays rather than concurrency.
- Cancel marks queued work skipped and does not undo completed work. After a native commit click, bounded outcome observation ignores abort: verified completion is success; unverified outcome is failed with structural `actionAttempted: true`, even during cancellation. No retry is implied.
- Export retry is explicit, uses the previous run’s export options, and is limited to failed entries. Never automatically retry destructive work.
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

FAB anchor persists independently of flyout size; clamp to viewport and avoid detected Send controls. Panel dimensions must never overwrite anchor coordinates. Alt+Shift+E toggles the manager. Alt+Shift+M exports and Shift-click exports highlighted content. Expand fills the viewport and Restore returns to the anchored layout. X and Escape dismiss the manager and return focus to the FAB. Escape first closes an open dropdown or dialog. See `src/app/App.tsx` for dispatch order.

## Export and preview UI
Preview retains a conversation identity and local ExportOptions snapshot. Format/embed/image/link changes clear previous output and recapture through the adapter with an AbortSignal and route restoration. Download stays disabled during capture or after failure; retry recaptures the selected options. Closing aborts capture and prevents late results reopening the dialog. Save Current Chat opens Export options with format, filename, inline embedding, separate files, images and links. HTML starts with embedding on. Export selected, Export All and Retry failed exports freeze their targets and open the same format and media options without a single-document filename. Bulk defaults to embedding and honors a saved separate-file preference. The dialog clears the other media switch when embedding or separate files are enabled. The manifest records the effective mode. Capture starts on Download. Dialog changes are local to the run and retry options start with the last confirmed settings.

## Offline file packages
While separate-file export runs, Save Current Chat, preview and bulk Activity show files and bytes written for the current chat. ChatGPT also reports distinct captured messages and elapsed time while waiting for older history. The batch percentage measures processed chats. ZIP finalization has its own status.

`separateMedia(name, add)` returns a capture callback and an asset path/MIME map. It writes binary entries under `assets/<document-stem>/` and rewrites actual resource tokens to encoded relative links, preserving code examples. ChatGPT traverses overlapping scroll windows and captures resources while each turn is mounted. It continues when older turns arrive even if the loading indicator persists, and retries blocked scroll steps with smaller steps. After 30 seconds without progress while waiting for older history, or when scrolling remains blocked, an ordinary ZIP keeps captured history and media and marks the document incomplete. Incomplete bulk results remain retryable and ineligible for cleanup. Required backups still reject incomplete capture. Traversal restores the starting viewport.

`prepareDocument(body, conversation, options, name, missingMedia?, assets?, historyWarning?)` returns `{text, name}`. HTML accepts only the generated asset paths under its restrictive CSP. Incomplete history and missing media get warnings. Preview preserves an edited name and captures separate assets on Download.

Rendered Markdown and HTML show the decoded basename of each saved ZIP asset beside its reference. Repeated references reuse the same filename. HTML download attributes match ZIP filenames; links to an unsaved file retain any known name. Inline photos without a source filename receive a generated name. Code samples stay literal. HTML includes a sticky, collapsible contents panel, reading progress, local text search with context snippets and match links, and an image dialog using the original image URL. The document and contents remain readable without scripts. Search and image controls require the bundled script and no network services.

At viewport widths up to 820px, a floating button opens the HTML toolbar, search and contents in a dialog. Closing the menu preserves reading position. Selecting a contents or search link closes the dialog and follows the link. Without the reader script, the contents stay in the document flow on narrow screens.

`SeparateArchive` writes stored ZIP entries to a temporary origin-private file, up to classic ZIP bounds and browser storage quota. Where writable storage is unavailable, ordinary exports prompt to save numbered parts once the in-memory ZIP approaches 32 MiB. Extract all parts into the same directory. The manifest, when enabled, goes in the last part. Required backups need one ZIP. Multi-part exports skip cleanup review.
