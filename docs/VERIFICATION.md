# Verification — v2.3.2

Date: 2026-11-11. Environment: macOS, Node 26.8.2, npm 11.19.1. Dependencies are locked in `package-lock.json`.

## Automated release checks

| Check | Result / scope |
| --- | --- |
| `npm run lint` | Pass; source, tests and Vite/Playwright config |
| `npm run typecheck` | Pass; strict TypeScript, typed legacy JS boundary |
| `npm test` | 105 pass in 7 files: core, Gemini, ChatGPT, navigation, timedtext, attachments, offline export |
| `npm run build` | Pass; self-contained userscript, v2.3.2 ZIP and versioned checksums |
| `npm run test:integration` | 123 pass: 41 cases each in Chromium, desktop WebKit and mobile WebKit |
| Metadata / release integrity | Original 48 @match entries plus 3 targeted YouTube entries; no global wildcard, remote runtime imports or source maps; ZIP script equals dist |

The production bundle is approximately 418.1 kB before compression. Verify current artifacts from the repository root with `shasum -a 256 -c SHA256SUMS-v2.3.2`. Historical ZIPs and the preexisting modified `SHA256SUMS` are preserved independently.

## Unit coverage

- Core: inherited conversion (code/tables/math/links/images), unsafe URL exclusion, empty data, metadata, ZIP contents, filename collisions, stable selection, storage validation/migration/denial, count-only history, geometry, virtualized identities, bounded snapshots, formatting changes, sequential batches and concurrency guards.
- Native actions: ChatGPT factory and conditional capabilities, Gemini default enablement/explicit disablement, exact same-origin IDs, unique row controls and titles, localized labels, new/reused menus, title-bearing Delete confirmations, wrong/unrelated dialogs, renamed/replaced rows, persistent-sidebar outcome checks, timeouts and ambiguity rejection. Successful targets stay removed from discovery, including the current native route.
- Cancellation: pre-commit abort stops clicks; post-commit abort retains verified success, while an unverified committed action is failed and remaining jobs are skipped. No automatic mutation retry.
- Navigation/timedtext: welcome-page exclusion, generic fallback, empty-route restoration, stale messages, full-reload prevention, role-aware outlines, JSON3/XML/VTT, Unicode/timing/entities, empty/negative rejection, player JSON extraction, endpoint/video validation and fresh signed-parameter capture.
- Attachments: nested Gemini carousel cards, uploaded/generated image controls, named file cards/buttons, exposed HTTP(S) links, bounded raster data/decoded blob sources, tainted canvas, size limits, unavailable-link notes, independent image/link options, unsafe URLs, hidden controls, unchanged host DOM, and image-only navigation with stale-content rejection.

- Offline resources: exact image/audio/video/input bytes, deduplication, no-fetch link mode in both formats, optional HTML capture, missing URLs, HTTP failure, login pages, size bounds, cancellation, hidden resources and format migration. Static HTML strips active markup, preserves code/tables/metadata and exposes data-only media/file downloads when embedded; linked HTML validates HTTP(S) images under a matching CSP.

## Production-bundle browser coverage

Tests inject `dist/AI-Chat-Markdown-Manager.user.js` into intercepted or local synthetic host pages. All downloads are genuine browser downloads whose contents are checked.

- FAB drag/resize/Send avoidance, independent persistent anchor, minimize/hide/restore, settings/themes, keyboard focus, duplicate mount prevention and usable host composer.
- Discovery/search/filter/sort, stable selection across reload, accumulation of 80 virtualized IDs and automatic bottom-scroll loading.
- Markdown and ZIP success/failure manifests, snapshots across SPA navigation and idle manager with all new requests blocked.
- ChatGPT/Gemini/Claude batch export of previously unopened chats: delayed new messages, genuine per-chat files, original-route restoration and cancellation without stale output.
- Gemini `/app` exclusion, phantom selection pruning and settled empty-home restoration.
- Gemini attachment Markdown download and two-chat ZIP: nested uploaded images/files, generated images, unavailable links, image-only chat loading and correct per-chat references without toolbar text. Real blob-image fixtures verify embedded pixels survive route changes and blob revocation, with connect-src blocked and zero native attachment clicks.
- YouTube automatic languages, original TXT and translated VTT with fresh signed parameters, empty/stale-video rejection, optional JSON3 import, navigation refresh and JSON3-to-XML fallback.
- ChatGPT selected archive and all-discovered deletion with typed confirmation; a newly added unreviewed chat remains untouched. No account-wide action is invoked.
- Gemini selected batch delete with native title confirmations.
- Required backup completion/restoration before archive; failed or cancelled backup starts no native mutation and never reopens a removed chat afterward.
- Successful ZIP review excludes failed exports and requires file-check acknowledgment plus normal typed Delete confirmation.
- Wrong native confirmation fails without clicking Delete.
- ChatGPT/Gemini HTML and embedded Markdown current/two-chat ZIP downloads preserve exact media/input bytes and correct identities; original routes restore. Actual exported HTML files opened via file:// with browser networking disabled render images, decode PCM audio and expose input downloads without HTTP requests.
- ChatGPT/Gemini direct Export options dialogs cover both formats with embedding on/off, zero capture before Download or after Cancel, exact inline bytes versus external references, and recoverable capture failures. Preview HTML embedding is editable. Desktop/mobile dialog screenshots are inspected.
- ChatGPT/Gemini preview starts from default linked Markdown, exposes format/embed/image/file toggles, regenerates captured bytes, downloads real `.md`/`.html` files, clears stale output after inaccessible-file failure and supports retry. Home HTML export is visible from default Markdown settings.
- Both providers complete required HTML backup before native cleanup; inaccessible input files prevent all native actions in required-backup mode. Partial embedded Markdown ZIP review excludes failed chats before acknowledged/typed deletion.

Desktop/mobile screenshots in `docs/screenshots/` show local fixtures. Mobile WebKit uses device emulation and pointer input; it does not establish physical touch behavior. No real account was mutated.

## Live evidence and remaining boundaries

- Read-only inspection on 2026-11-07: ChatGPT was signed out; Safari Gemini showed the conversation action-menu label. Archive/delete confirmations and outcomes were not tested on authenticated real chats. Conditional production support is based on runtime checks, not a claim of live compatibility.
- Read-only authenticated Safari inspection of the supplied Gemini chats found three generated blob images and one HTTPS uploaded image in nested carousel previews. Native image menus offered Copy image/Download image, without a reusable image URL. Gemini CSP blocked blob fetch; canvas copies of all three decoded generated images succeeded. No private content or signed URLs were stored in fixtures/docs. Full exporter installation/downloads and uploaded-document controls remain fixture-tested; files without an exposed URL retain an explicit note in default Markdown or fail exports with embedding enabled.
- Earlier read-only ChatGPT/Claude navigation inspection informed adapters. Batch exports remain verified on redacted fixtures. DeepSeek/generic hosts have no authenticated live verification.
- The earlier Base44 inspection informed layout; approval review blocked external reference export/delete clicks. Those reference dialogs were not verified. See `DESIGN_INVENTORY.md`.
- YouTube live restrictions, expired signatures and browser permissions vary. Fixture success does not establish universal video access.
- Offline capture is limited to loaded, enabled resources with exposed URLs or readable image pixels. CORS/CSP, expired links, inaccessible original files, streaming-only media and limits (20 MiB/file, 64 MiB/chat, 100 resources) can reject a chat. Markdown viewers must support data URLs; fixtures do not establish full loaded-history completeness.
- Actual Safari Userscripts/Tampermonkey installation, host CSP, permissions and downloads still require manual verification; WebKit injection is a distinct test.

For additional live validation use explicitly authorized disposable accounts. Verify localized controls, exact IDs and title-bearing Delete confirmation, native outcomes and cancellation/timeouts. Keep ambiguous controls unavailable and report only redacted reproductions.
