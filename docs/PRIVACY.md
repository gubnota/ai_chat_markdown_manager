# Privacy and data handling

## What is read

User-triggered preview/export reads rendered message content, code, mathematical annotations, links and image URLs. Discovery reads accessible sidebar titles, stable IDs, source URLs and the current page title. Previously seen sidebar metadata remains in tab memory to survive host virtualization. Generic conversion may include nearby page text. The script does not read authentication cookies/tokens, call private platform APIs, fetch unloaded messages or contact an analytics service.

## Where data lives

| Data | Location / lifetime |
| --- | --- |
| Theme, export/batch/privacy settings | Current origin localStorage, until reset/site-data removal |
| FAB anchor and selected stable IDs | Current origin localStorage, until reset/site-data removal |
| Optional local activity | At most 30 count/state/time summaries; no content, titles, URLs or IDs |
| Discovered titles/URLs and current report | Tab memory; reload clears |
| Explicit export/preview snapshots | Tab memory, at most 20 chats / approximately 8 MiB UTF-16; reload clears |
| Markdown / ZIP / JSON report | Browser download destination; retained until you delete it |
| Copied Markdown | System clipboard, subject to OS/clipboard-manager retention |

Preferences use the `__ai_chat_md_v2__:` prefix. Prior v1 boolean preferences and position are read for migration, without reading conversation history. There is no sync service. Storage-denied environments continue with in-memory defaults; persistence may fail.

Same-origin website scripts can access localStorage, the open Shadow DOM and page content. Shadow DOM isolates CSS; it is not encryption or a security barrier. Clearing settings does not delete browser downloads, clipboard history, legacy keys or a platform account. Reload to discard temporary snapshots and current reports. The host site may log activity independently of this script.

## What exports contain

Markdown contains loaded conversation text, optional title/front matter, platform, optional source URL/date, and a partial-export warning. Image references remain URLs; opening Markdown in another application may request external resources. Disable source/image/link options when appropriate.

A ZIP contains successful `.md` exports plus an optional manifest with creation time and per-item IDs, states and errors. JSON operation reports likewise contain IDs/errors. The application does not silently attach all message text to activity history, but downloaded Markdown intentionally contains messages. Review files and reports before uploading or sharing.

## Network and permissions

The distributable embeds JavaScript, CSS, icons and ZIP support. No runtime CDN, telemetry, server or conversation upload is implemented. A browser fixture test aborts all new requests after injection and confirms the manager still discovers/works without initiating a request. This does not disable the host website's own traffic.

Metadata grants no privileged userscript APIs (`@grant none`), runs at document-idle, excludes frames and keeps the inherited 48 explicit host/path rules. Site permission is still required in the extension/browser. Clipboard/download access depends on browser policy. Following an Open conversation link navigates normally to that website.

## Deletion and archive limits

Native archive is unsupported. Production Gemini deletion remains disabled because live signed-in controls could not be verified. Fixture tests do not delete anything in an account. A ZIP is only a local backup; it cannot archive, restore or undo a platform conversation. Future native support must preserve mandatory confirmation, identity checks, cancellation and no automatic retries on uncertain outcomes.

## Removing local data

Use Settings → Reset preferences, then reload to discard memory. Disable/uninstall the script if desired. Clear site storage to remove manager and inherited keys, understanding this may also sign you out or remove unrelated site preferences. Delete exported files/clipboard history separately. For vulnerability reports, follow [SECURITY.md](../SECURITY.md) without sending private conversations.
