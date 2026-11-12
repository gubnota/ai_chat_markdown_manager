# Task log

## 2026-11-04 — v2.0.0 implementation and release
- User authorized full implementation, tests, artifacts, `.DS_Store` ignore and push to configured origin/main.
- Created missing six-file project memory before inspecting implementation context.
- Preserved the original v1.2 script and README.txt without changes.
- Inspected accessible Base44 home/conversations/settings through Browser; captured design inventory.
- Automatic approval review blocked external reference export/delete clicks; those dialogs were not inspected. No destructive live action was performed.
- Gemini redirected to signed-out /app; native deletion stays unknown/disabled with documented activation requirements.
- Implemented React/TypeScript/Tailwind Shadow DOM UI, FAB geometry/shortcuts, settings, selection/filtering/pagination, preview, local export/ZIP, bounded snapshots and operation reports.
- Implemented stable DOM adapters and fixture-tested native Gemini identity/confirmation engine; native archive remains unsupported.
- Added validated/migrated preferences, bounded selection persistence and count-only history; no telemetry/backend/CDN.
- Added strict build, full license provenance, English/Russian guides, installation/privacy/platform/architecture docs, screenshots and release ZIP.
- Verification: lint/typecheck/build, 43 unit tests and 27 production-bundle browser checks; final release checks recorded in VERIFICATION.md.
- Fixed QA findings: mobile toast interception, panel/FAB stacking and asynchronous resize assertion.
- `.DS_Store`, dependencies and temporary test outputs ignored. Distribution and screenshots intentionally tracked.
- Release prepared for coherent initial commits and authorized push to origin/main; remote hash and clean status verified as final delivery steps.

## 2026-11-06 — v2.1.0 batch loading and direct captions
- User approved the plan in advance and authorized implementation, local build and push.
- Added automatic 24-row scroll loading; stable selection and filters retained.
- ChatGPT, Gemini and Claude batch exports/ZIP backups now open native SPA links, verify newly settled messages and restore the starting chat, including cancellation. Missing links/timeout reject without exporting stale content.
- Added automatic YouTube video-page caption discovery, original/translated language choices and direct TXT/VTT downloads. Refresh on video navigation; manual file/paste import stays optional.
- Added JSON3/XML/VTT conversion, automatic fresh video-page request capture, signed-URL preservation, video checks and bounded/cancellable requests.
- Verification: 55 unit tests, lint/types; production-bundle browser and final release results in VERIFICATION.md. Signed-in ChatGPT/Claude navigation was inspected read-only, not claimed as live batch verification.
- Browser-controlled synthetic VTT download was opened and checked for correct Russian/English text and timing.
- Updated bilingual guides, architecture/contracts/ADRs, privacy and release artifacts. `.DS_Store` was already ignored and remains so.
- Preserved preexisting unrelated old-release ZIP changes and the untracked transport log.

## 2026-11-06 — v2.1.1 start-page and post-backup fixes
- User reported `gemini:page:/app` / “Where should we start?” as the only failure in a 35-item batch; approved plan, build and commit in advance.
- Excluded synthetic native start-page identities from all four chat adapters, while retaining generic page export; pruned removed synthetic selection keys.
- Allowed settled empty original-route restoration without weakening message requirements during export.
- Added a transient successful-export review after ZIP preparation, native chat links and manual Gemini deletion guidance. Failed/skipped targets never appear; starting another batch clears the review.
- Automatic native deletion remains disabled; verified current Google help for the manual More → Delete path and managed-account restrictions.
- Verification: 61 unit tests, 57 production-bundle browser checks, lint/typecheck/build and release checksums passed. Corrected the legacy ChatGPT fixture to use a real chat route; details in VERIFICATION.md.
- Preserved preexisting old-release ZIP changes, extracted v2.1.0 directory and untracked transport log. Commit requested; no live chats deleted.

## 2026-11-07 — v2.2.0 native batch actions
- User requested ChatGPT batch delete/archive plus post-backup actions; standing plan/build/commit/push approval applies. Wrote IMPLEMENTATION_PLAN_2.2.0.md before implementation.
- Added shared exact-ID native menu/confirmation engine; ChatGPT archive/delete and Gemini delete enable conditionally on recognized runtime sidebar controls. Missing/ambiguous controls fail closed. Superseded the old production fixture-only gate (ADR-0010).
- Freeze selected/all discovered targets, keep typed DELETE/DELETE ALL, and never invoke account-wide Settings actions. Delete requires a unique title-bearing native confirmation; archive commits at its menu item.
- Verify stable row removal with the original sidebar present. Preserve verified results after post-click cancellation; report unverified commits as failures without retries. Suppress successful IDs until reload.
- Successful ZIP review offers native actions only for successful exports after acknowledgment of checking files; normal mandatory confirmation remains. Required full backup restores the original route before mutation; failure/cancellation prevents native work.
- Updated bilingual guides, privacy/security, contracts, ownership, architecture and release artifacts. ChatGPT archives can be restored through its Archived chats settings; delete is irreversible.
- Verification: 79 unit tests, 81 production-bundle browser checks, lint/typecheck/build and versioned release integrity. No real chats archived/deleted. Read-only Gemini inspection confirmed the native action-menu label; ChatGPT was signed out.
- Preserved preexisting old ZIP changes, SHA256SUMS, extracted v2.1.0 directory and private untracked log. Current release uses SHA256SUMS-v2.2.0. `.DS_Store` remains ignored.

## 2026-11-07 — v2.2.1 Gemini attachment references
- User reported missing uploaded files/images and generated content in Gemini with both image/link options enabled. Standing implementation/build/commit/push authorization applies; plan recorded in IMPLEMENTATION_PLAN_2.2.1.md.
- Added scoped attachment-button/file-card conversion with exposed HTTP(S) URLs, explicit missing-link labels and independent image/link options; ordinary controls and hidden previews remain excluded. No native attachment action or private API retrieval.
- Navigation fingerprints include image identity, allowing newly settled image-only replies while rejecting unchanged stale content.
- Added units and production-bundle current Markdown/batch ZIP download checks. Verification results are recorded in VERIFICATION.md.
- The supplied private Gemini chat redirected to /app in the test browser. No authenticated attachment export is claimed.
- Prepared v2.2.1 distribution, ZIP and versioned checksums; preserved unrelated old artifacts, SHA256SUMS and private untracked log. `.DS_Store` remains ignored.

## 2026-11-07 — v2.2.2 portable Gemini images
- Read-only Safari inspection found generated blob images and an uploaded HTTPS image in nested carousel previews. Native image menus expose no reusable URL. Blob fetch is CSP-blocked; decoded-pixel canvas copying succeeded on all three generated images inspected.
- Preserve individual nested cards and exposed HTTP links. Embed loaded message blob images as bounded PNG data URLs; retain bounded raster data, independent toggles and unavailable notes. No attachment fetch or native action.
- Added real-blob current Markdown/batch ZIP browser regressions with revocation, distinct per-chat pixels, blocked connections and zero native attachment clicks; unit guards cover taint, size, scope and unsafe formats.
- Prepared v2.2.2 with updated bilingual guides, privacy, contracts, ADR and scoped release artifacts. Verified 93 unit tests, 87 production-bundle browser checks, lint/types/build, ZIP script equality and versioned checksums. Standing authorization covers build, commit and push. See VERIFICATION.md for scope.
- Preserved unrelated old artifacts, unversioned checksums and private untracked log. `.DS_Store` remains ignored.

## 2026-11-11 — v2.3.0 offline exports and bulk cleanup
- User explicitly auto-approved planning, implementation, build and Git push. Recorded scoped plan before editing; preserved unrelated historical ZIP/checksum changes, extracted directory and private transport log.
- Added standalone offline HTML and optional embedded Markdown for current/selection/preview/batch/required-backup flows; settings default to existing Markdown link mode. HTML embeds enabled resources automatically.
- Capture only referenced loaded-content image/audio/video/input-file URLs, bounded to 20 MiB/resource, 64 MiB/chat and 100 resources with cancellation/timeouts. Preserve exact input bytes and readable image pixels; never click attachment controls or use private account APIs.
- Missing/inaccessible included resources reject that chat. Required-backup failures prevent every native action; partial ZIP review includes only successful chats and retains acknowledgment/typed confirmation.
- Added bundled Marked with full license notices, allowlisted static HTML/CSP, format-aware filenames/MIME/manifests and bilingual controls/guides. ChatGPT supports native archive/delete; Gemini uses local ZIP archive plus native delete.
- Verification: 103 unit tests, 117 production-bundle browser checks, lint/strict types/build, versioned checksums and ZIP/dist equality. Offline browser tests open actual file:// HTML with networking disabled, render images and decode PCM audio. Both providers exercise current/batch export and cleanup failure gates.
- Synthetic tests only; no real-account mutation or authenticated installed-exporter verification. Missing loaded history, expired URLs, CSP/CORS, streaming-only and oversized media remain explicit limits. See VERIFICATION.md.
- Prepared v2.3.0 installable userscript/ZIP/checksums for authorized commit and push to origin/main.

## 2026-11-11 — v2.3.1 visible preview exports
- User reported no export/embed controls in Markdown preview and no visible HTML export. Standing auto-approval/build/push authorization applies; recorded IMPLEMENTATION_PLAN_2.3.1.md.
- Added preview-local format/embed/images/links-and-input-files controls, automatic recapture, disabled stale downloads on error, retry and abort-on-close. Added direct home Markdown and offline HTML actions independent of configured default format.
- Kept shared provider/media/HTML pipelines and native cleanup gates; corrected dialog toggle styling and disabled-control focus handling. Updated bilingual installation/use guidance and release artifacts.
- Verification: 103 unit tests, 123 production-bundle browser checks, lint/strict types/build passed; versioned release integrity recorded in VERIFICATION.md. Preserved unrelated historical artifacts, extracted releases and private transport log.

## 2026-11-11 — v2.3.2 choose embedding before download
- User reported no embed choice when selecting direct HTML/Markdown export. Standing auto-approval/build/push applies; recorded IMPLEMENTATION_PLAN_2.3.2.md before editing.
- Added direct Export options with format/embed/images/files, explicit Download, cancellation and retryable failures. No resource capture starts before Download.
- Both formats honor embedding in direct/preview/settings/batch/backup exports. HTML defaults embedding on but permits linked mode with safe HTTP(S) images, matching CSP and internet/expiry guidance. Native cleanup gates remain unchanged.
- Verification: 105 unit tests, 123 production-bundle browser cases, lint/strict types/build; both providers exercise each format and embed choice, exact bytes, cancellation and error recovery. See VERIFICATION.md for fixture/manual boundaries.
- Prepared v2.3.2 userscript, ZIP and versioned hashes for authorized commit/push; preserved unrelated historical artifacts, extracted releases and private transport log. No real account mutated.

## 2026-11-11 — v2.3.3 current provider DOM extraction
- Reproduced live ChatGPT empty-content failure; replaced divergent selectors with shared visible message boundaries. Search-key and role-heading fallback preserve mixed layouts and image-only replies. Active Conversation root takes precedence over unrelated main regions.
- Added Grok/Claude observed test IDs and DeepSeek loaded message boundaries with neutral unknown roles. No new native mutation capabilities.
- Computer verification: updated existing Safari Userscripts installation; current HTML downloads succeeded on ChatGPT, Gemini, Grok, Claude and DeepSeek. ChatGPT output retained five user/five assistant messages and four embedded images; Grok excluded a hidden duplicate and downloaded embedded Markdown too.
- Verification: 112 unit tests, 132 browser cases, lint/strict types/build; all five provider fixtures cover direct/preview format and embedding choices, byte integrity and recoverable errors. Bulk cleanup and backup gates remain fixture-tested.
- Prepared v2.3.3 userscript, ZIP and hashes; preserved unrelated historical artifacts and private transport log. No real chat mutated.

## 2026-11-11 — Remove generated release artifacts from history

- Rewrote all 13 existing commits to remove versioned release ZIPs and checksum files; cleaned the local checkpoint tree too. Saved a pre-rewrite bundle outside the repository.
- Added recursive basename ignore patterns; retained local build generation and the tracked installable userscript. Updated README and project policy to remove repository ZIP links.
- Validation: inspected every rewritten commit tree and the checkpoint tree; root/nested ignore coverage passed and unrelated local changes were preserved. Runtime code is unchanged.

## Remaining verification boundaries
- Safari installed current-chat exports verified on five providers; live bulk/preview matrices and uploaded-document examples remain fixture-backed.
- No real-account mutation tests. Native support remains conditional on recognized current website controls.
- Tampermonkey, other browsers/extensions, all inherited hosts and physical touch devices remain manual follow-up.
- Automatic SPA loading covers ChatGPT/Gemini/Claude, but missing/virtualized native links and partial loaded history can still cause per-item failures. Other adapters require loaded content/snapshots.
- YouTube downloads are fixture-tested; live caption availability, restrictions and browser permissions vary.

## 2026-11-11 — v2.4.0 offline asset packages
- Fixed a loaded data-SVG diagram falsely reported as unavailable in the supplied ChatGPT conversation; rasterize loaded pixels within existing PNG bounds.
- Added HTML/Markdown separate-file ZIPs with blob images and accessible input/reference files, relative links, editable names, styled keyboard selector and progress.
- New five-provider ZIP fixtures cover current export, ChatGPT/Gemini batch and preview, exact bytes and offline HTML. Existing cleanup failure gates remain intact.
- User requested purging the generated userscript from history too; ignore local output and document source builds. The new source-only distribution decision supersedes the tracked-script part of ADR-0017.
- Verification: 120 unit tests, 165 browser cases, lint/types/build and release integrity passed. Anonymous-only image CDN retry is covered in Chromium and desktop/mobile WebKit; authenticated files never retry anonymously. Final Safari export of the supplied chat still fails on an inaccessible external image; complete offline capture is not claimed. A Web Inspector diagnostic was accidentally submitted to that chat; no cleanup was performed.
- Purged the exact dist userscript path from all reachable Git history (including local checkpoint refs), preserved the local build and unrelated working changes, and pushed rewritten main with an explicit remote lease.

## 2026-11-12 — Bulk export options and expanded manager

- Save Current Chat, Export selected and Export All share format and media options. Bulk exports embed supported resources by default and can also put media and input files into separate ZIP entries. Each document has its own asset directory even when long filenames collide.
- Reused the keyboard-accessible dropdown for conversation filters and added full-window expansion, restore, X and Escape.
- Verification passed for 121 unit tests and 165 browser cases across Chromium and desktop and mobile WebKit, plus lint, typecheck and build. Browser fixtures verify embedded image, audio and input-file bytes and separate ZIP asset paths for each chat.
- Follow-up work covers interactive maps, raw SVGs and other HTML widgets.

## 2026-11-12 — v2.4.1 bulk export controls

- Put the HTML/Markdown selector and four file switches first in the Export selected, Export All and Retry failed exports dialogs. Retry opens with the last confirmed choices. Enabling embedding or separate files clears the other switch.
- Use the package version for the manager heading, userscript metadata, export manifest and release ZIP. The Safari upgrade guide shows how to confirm the loaded version.
- Browser fixtures check mobile viewport visibility, both format choices, switching between separate and embedded files, retry defaults and per-chat offline asset bytes. Live Safari verification stopped at a Computer Use restriction on the active page.
- Verification passed for 121 unit tests and 165 browser cases across Chromium and desktop and mobile WebKit, plus lint, type checking, build and release checksums.

## 2026-11-12 — v2.4.2 ChatGPT images in bulk ZIPs

- Retry image fetches with same-origin credentials for authenticated redirect URLs. Use the bounded browser image loader if fetch fails and the displayed pixels cannot be read.
- Separate-file bulk ZIPs keep a document and its readable assets when an image is unavailable. The document and report flag the missing image, and retry remains available. Cleanup review and required backups still require a complete capture.
- Passed 122 unit tests, 171 browser cases across Chromium and desktop and mobile WebKit, lint, type checking, the production build and release checksums. The reported ChatGPT conversation was not retested live.

## 2026-11-12 — v2.4.3 ChatGPT blob image recovery

- Offline exports prefer same-origin image blobs over stale HTTP hints, preserve available original bytes, and fall back to decoded pixels or alternate sources from the same image element.
- An Export All regression checks live and revoked blobs, both asset files, relative HTML links and successful manifest entries in Chromium and desktop and mobile WebKit.
- Passed 122 unit tests, 174 browser cases, lint, strict type checking, production build, checksums and ZIP-to-bundle comparison.
- Installed v2.4.3 in Safari Userscripts and retried the reported chat with HTML, separate media, images and input files enabled. Both ZIPs contained two identical PNG assets with relative HTML links. The earlier attempt contained no image assets. Both v2.4.3 ZIPs still had two unavailable image markers and reported the chat as failed with Safari's `Load failed` error. Opening all five previews in ChatGPT's viewer before the second retry did not change the result. The original chat was retained.

## 2026-11-12 — v2.4.4 large ChatGPT ZIP exports

- Separate-file downloads write binary assets directly to a file-backed ZIP. ChatGPT capture traverses older and newer message windows and restores the starting viewport. Inline exports retain their 64 MiB/chat and 100-resource caps.
- Without writable browser storage, ordinary exports can save numbered ZIP parts. Required backups still require one ZIP before native actions.
- Chromium and desktop and mobile WebKit fixtures verify a single ZIP with 113 exact image files, over 70 MiB of image data, chronological HTML and restored scroll position. The fallback fixtures verify relative paths across individually saved ZIP parts.
- Passed 122 unit tests and 180 browser cases, lint, strict type checking, the production build and release checksums.
- The reported authenticated Safari chat was not retested with this release.

## 2026-11-12 — v2.4.5 export progress

- Live Safari v2.4.4 started capture but displayed a fixed progress indication until the older-history wait timed out. Safari received no ZIP.
- Show captured ChatGPT messages, files and bytes written for the current chat, elapsed seconds while waiting for older history, and ZIP finalization in the export dialogs and bulk Activity.
- Passed 122 unit tests, 180 browser cases across Chromium and desktop and mobile WebKit, lint, strict type checking, build and release integrity checks. The 113-image fixture verifies live counts, the wait timer and successful resumption after older messages load.
- The authenticated Safari chat still needs a v2.4.5 retry. The 30-second older-history timeout remains in effect.

## 2026-11-12 — v2.4.6 ChatGPT history recovery

- Resume scanning when ChatGPT prepends older messages and preserves the scroll anchor, even while the loading banner stays visible.
- If older history stalls, ordinary separate-file exports continue through newer turns and download the available messages and media. The document and export report flag incomplete history. Failed bulk entries stay retryable and out of cleanup review. Required backups reject stalled history.
- Passed 122 unit tests and 189 browser cases across Chromium and desktop and mobile WebKit, plus lint, strict type checking, the production build and release integrity checks. Fixtures verify a single ZIP with all 113 images after an older page arrives without clearing the banner, and current/bulk recovery with exact image bytes when loading stalls.
- In the reported Safari conversation, v2.4.6 got past the older-history wait and captured at least 56 messages and 15 files. A Depositphotos page was mistaken for a downloadable file and stopped the ZIP.

## 2026-11-12 — v2.4.7 unavailable linked files in ZIP exports

- Leave ordinary `.html` pages as links. Use the URL path for implicit file detection and still recognize files marked as downloads or attachments.
- Ordinary separate-file ZIPs retain available media and preserve links to unavailable files with a warning. Bulk entries stay retryable and excluded from cleanup; required backups still reject incomplete captures.
- Passed 122 unit tests and 195 browser cases across Chromium and desktop and mobile WebKit, plus lint, strict type checking, the production build and release integrity checks. Fixtures verify current and bulk ZIPs retain exact image bytes when a linked attachment fails.
- The reported Safari chat got past the link failure and captured at least 456 messages, 139 files and 286.7 MiB. A blocked scroll step stopped the scan without a ZIP.

## 2026-11-12 — v2.4.8 recovery from blocked ChatGPT scroll steps

- Retry blocked scroll steps with smaller movements. If the scan still cannot continue, an ordinary ZIP keeps the captured turns and files, reports the gap and remains ineligible for cleanup. Required backups still reject partial capture.
- Browser fixtures cover one interrupted step in the large 113-image export and a persistent interruption that produces a marked partial ZIP with the exact saved image bytes.
- Passed 122 unit tests and 12 focused browser cases across Chromium and desktop and mobile WebKit, plus lint, strict type checking, the production build and release checksums.
- The reported chat produced a 506.3 MiB ZIP in Safari with no history warning. The archive passed integrity checks and all local references resolved, including 241 distinct image files. The HTML still flagged 54 unavailable image placements and the export warned about unavailable linked attachments. A separate local recovery package includes 71 additional images from an earlier download; their positions in the chat are unverified.

## 2026-11-12 — v2.4.9 searchable attachments and archive navigation

- Current and bulk HTML and Markdown exports show the saved filename beside each image and attachment. Separate media ZIP captions and HTML download names match the archive entries.
- HTML archives provide a collapsible sticky contents panel with links to chat turns and headings, and show reading progress where browsers support scroll-driven CSS. Navigation runs offline under the existing script-free policy.
- Passed 122 unit tests and 90 focused browser cases across Chromium and desktop and mobile WebKit, plus lint, strict type checking, the production build and release checksums.

## 2026-11-12 — v2.4.10 offline HTML reader

- HTML exports use a wider sticky contents sidebar, message cards and a progress bar. Search shows highlighted context, a full list on demand and links back to matching text. Images open in a dialog with a close button and Escape support.
- One CSP nonce authorizes the bundled reader. The transcript and contents work without scripting, and the reader uses no network services.
- Passed 122 unit tests and 90 export browser cases across Chromium and desktop and mobile WebKit, plus lint, strict type checking, the production build and release checksums.
- Restyled the recovered chat ZIP. All 317 non-HTML entries and 323 local image references were preserved; the 54 existing unavailable image markers remain.

## 2026-11-13 — v2.4.11 code, media indexes and map previews

- HTML archives list illustrations and attachments separately below the contents. Image captions show saved filenames. Code blocks have offline syntax highlighting and a Copy button.
- Current and bulk exports save readable map widgets as PNG snapshots. They retain an original map link when available and enabled. Separate-file ZIPs retain available content and report unreadable snapshots as incomplete.
- Passed 122 unit tests and 93 export browser cases across Chromium and desktop and mobile WebKit, plus lint, strict type checking, the production build and release integrity checks.
- Updated the existing styled HTML in Downloads and verified the navigation and image dialog offline. Installed the v2.4.11 userscript in Safari. Map capture was verified on browser fixtures.
