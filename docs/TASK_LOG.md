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

## Remaining verification boundaries
- Limited read-only authenticated Gemini image inspection; no live installed-exporter verification or uploaded-document example. No authenticated ChatGPT/Claude/DeepSeek export verification.
- No real-account mutation tests. Native support remains conditional on recognized current website controls.
- Actual Safari Userscripts/Tampermonkey extension installation, download permissions/CSP and physical touch-device testing remain manual follow-up.
- Automatic SPA loading covers ChatGPT/Gemini/Claude, but missing/virtualized native links and partial loaded history can still cause per-item failures. Other adapters require loaded content/snapshots.
- YouTube downloads are fixture-tested; live caption availability, restrictions and browser permissions vary.
