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
- `archiveConversation(identifier, signal?): Promise<void>`; unsupported in production.
- `deleteConversation(identifier, signal?): Promise<void>`; unknown/disabled for Gemini, unsupported elsewhere.
- Optional `observe(onChange): () => void` returns observer cleanup.
- Optional `beginExportSession(): () => Promise<void>` captures the start route; its async cleanup restores that route independently of a cancelled export signal. Restoration alone may accept a settled empty non-conversation start page; exports still require changed nonempty messages.
- No native destructive operation may infer identity from title alone, retry implicitly or treat an uncertain outcome as success.
- Gemini requires exact stable identity, unique native controls and a new exact-title confirmation; production verification gate remains false.

## Export and snapshots
`ExportOptions`: booleans images, links, metadata, source, outline, selection, title, timestamps, manifest; string filename template. Templates support platform/date/slug/id in the export implementation.

ChatGPT/Gemini/Claude automatically open noncurrent chats through discovered same-origin native SPA links when no matching snapshot exists. Require the target route, changed nonempty role-message DOM, no visible loading marker and 900 ms stability within 30 seconds. Missing links, full-page reloads or stale content reject. Explicit preview/export captures a snapshot; memory cap 20 entries / approximately 8 MiB UTF-16. Cached bodies require matching images/links/outline options. Other adapters still require current content or a matching snapshot. Metadata is wrapped separately; never substitute the active conversation. Partial warning always accompanies partial output. Filenames are sanitized and collisions suffixed.

Bulk ZIP contains successful `.md` entries plus optional `manifest.json`: version, scope (`discovered DOM only; partial`), createdAt, state, total, completed, failed, skipped and results. Each result has key, status (`success | failed | skipped`), optional error. No successful empty backup when every export fails. Exported JSON reports may include IDs/errors; they are explicit downloads, not persistent history.

After a ZIP download is initiated successfully, the app keeps an in-memory review of that batch’s successful targets only. Failed/skipped entries are excluded, and starting another batch clears the review. Browser download initiation is not proof that the file was saved or complete: review asks users to inspect the ZIP before manual deletion. No automatic delete-after-export operation is enabled.

## Batch lifecycle
- Kinds: export, archive, delete.
- States: idle, scanning, ready, exporting, archiving, deleting, completed, partially_completed, failed, cancelled.
- Input: frozen conversation array, kind, stopOnError, delayMs, optional batchSize.
- Progress: state/kind/current, total/completed/failed/skipped, results, optional startedAt.
- One active runner, sequential jobs, one AbortController; batchSize groups delays rather than concurrency.
- Cancel marks queued work skipped and does not undo completed work. A job that cannot establish success fails.
- Export retry is explicit and limited to failed entries. Never automatically retry destructive work.
- Optional pre-mutation backup must export every frozen target successfully before any native click.
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
