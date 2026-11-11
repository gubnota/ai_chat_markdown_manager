# Privacy and data handling

## What is read

User-triggered preview/export reads rendered message content, code, mathematical annotations, links and image URLs. Discovery reads accessible sidebar titles, stable IDs, source URLs and the current page title. Previously seen sidebar metadata remains in tab memory to survive host virtualization. Generic conversion may include nearby page text. Batch export can open selected ChatGPT/Gemini/Claude chats through native same-origin SPA links and read the resulting messages. This may mark chats read. No private platform API, authentication cookie access or analytics service is used.

Opening YouTube captions reads matching public player caption data and, if needed, the current public watch page. Direct downloads read timedtext responses. Existing video-page caption request URLs may supply fresh signed parameters via browser resource timing. These URLs and parameters stay in memory, are validated for the current video and are never persisted or uploaded.

## Where data lives

| Data | Location / lifetime |
| --- | --- |
| Theme, export/batch/privacy settings | Current origin localStorage, until reset/site-data removal |
| FAB anchor and selected stable IDs | Current origin localStorage, until reset/site-data removal |
| Optional local activity | At most 30 count/state/time summaries; no content, titles, URLs or IDs |
| Discovered titles/URLs and current report | Tab memory; reload clears |
| Explicit export/preview snapshots | Tab memory, at most 20 chats / approximately 8 MiB UTF-16; reload clears |
| Markdown / ZIP / JSON report | Browser download destination; retained until you delete it |
| Caption tracks, signed URLs and parsed/imported cues | Tab memory only; discarded with the panel/tab |
| TXT / VTT caption files | Browser download destination; retained until you delete them |
| Copied Markdown | System clipboard, subject to OS/clipboard-manager retention |

Preferences use the `__ai_chat_md_v2__:` prefix. Prior v1 boolean preferences and position are read for migration, without reading conversation history. There is no sync service. Storage-denied environments continue with in-memory defaults; persistence may fail.

Same-origin website scripts can access localStorage, the open Shadow DOM and page content. Shadow DOM isolates CSS; it is not encryption or a security barrier. Clearing settings does not delete browser downloads, clipboard history, legacy keys or a platform account. Reload to discard temporary snapshots and current reports. The host site may log activity independently of this script.

## What exports contain

Markdown contains loaded conversation text, optional title/front matter, platform, optional source URL/date, and a partial-export warning. HTTP image references remain external URLs; opening Markdown in another application may request those resources. Loaded blob previews can instead be copied locally into inline PNG data URLs; these include image pixels in the downloaded Markdown/ZIP. Disable source/image/link options when appropriate.

Message attachment cards may contribute filenames and exposed HTTP(S) file/image URLs, including signed parameters. Default Markdown does not fetch media. Explicit embedding and HTML request exposed image/audio/video/input-file URLs with browser-managed session credentials, without reading cookies or using private APIs. Native attachment controls are never clicked. Loaded message blob images can be copied from decoded pixels through canvas (16 megapixels and 12 MiB URL limit); bounded raster data URLs are retained. Blob images use canvas rather than fetch; exposed same-origin blob audio/video may be fetched in embedding mode. No clipboard action is used for capture. In default link mode unsupported images/missing file URLs produce unavailable notes. In embedded/HTML mode missing included resources reject the chat; it is excluded from cleanup. Requests time out at 20 seconds and are limited to 20 MiB/resource, 64 MiB/chat and 100 resources. HTML embeds static styles and validated data media under restrictive CSP, strips active markup, and offers binary-file download links. Exposed links may expire or require the original account; review them before sharing.

A ZIP contains successful `.md` or `.html` exports plus an optional manifest with creation time and per-item IDs, states and errors. JSON operation reports likewise contain IDs/errors. The application does not silently attach all message text to activity history, but downloaded documents intentionally contain messages. Review files and reports before uploading or sharing.

## Network and permissions

The distributable embeds JavaScript, CSS, icons and ZIP support. No runtime CDN, telemetry, server or conversation upload is implemented. A browser fixture test aborts all new requests after injection and confirms the manager still discovers/works without initiating a request. This idle-manager check excludes explicit embedded-media/caption actions, native chat navigation and native archive/delete, which can make host-site requests. It does not disable the host website's own traffic.

YouTube languages are discovered automatically when the user opens the captions panel and refreshed on video navigation. Downloads fetch only validated HTTPS YouTube/video.google.com timedtext endpoints; watch-page fallback is same-origin. Signed parameters are preserved. Requests have a 20-second timeout and 5 MiB response limit. No caption file needs to be manually downloaded first; saved-file import is optional.

Metadata grants no privileged userscript APIs (`@grant none`), runs at document-idle, excludes frames and keeps the inherited 48 explicit host/path rules plus 3 targeted YouTube rules (youtube.com, www.youtube.com, m.youtube.com). Site permission is still required in the extension/browser. Clipboard/download access depends on browser policy. Following an Open conversation link navigates normally to that website.

## Deletion and archive limits

ChatGPT archive/delete and Gemini delete act through the website after mandatory review and confirmation. Delete is irreversible; ChatGPT archives can be restored through its Archived chats settings. A ZIP is a local export and cannot itself restore or undo a platform conversation. Optional required backups must finish before mutation; successful-export shortcuts require acknowledgment that files were checked. Native actions may trigger host-site requests. Successful IDs are suppressed in memory until reload. Fixture tests mutate only synthetic pages, never a real account; deployed compatibility remains unverified. Unknown outcomes fail without automatic retry.

## Removing local data

Use Settings → Reset preferences, then reload to discard memory. Disable/uninstall the script if desired. Clear site storage to remove manager and inherited keys, understanding this may also sign you out or remove unrelated site preferences. Delete exported files/clipboard history separately. For vulnerability reports, follow [SECURITY.md](../SECURITY.md) without sending private conversations.
