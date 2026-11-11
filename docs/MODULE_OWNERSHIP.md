# Module ownership

| Module | Owns | Allowed dependencies |
| --- | --- | --- |
| `src/types` | Stable interfaces and key function | No application implementation |
| `src/markdown` | Content conversion, scoped attachments, bounded offline resource capture and Markdown metadata | Types, inherited local converter, browser APIs |
| `src/adapters` | Host DOM, identity, discovery, snapshot lifetime, SPA loading/restoration, native capability | Types, Markdown |
| `src/youtube` | Public caption discovery/requests, identity validation, bounded TXT/VTT conversion | Browser APIs only |
| `src/storage` | Preference defaults/migration, local persistence, privacy summaries | Types |
| `src/operations` | Sequential batches, abort, static HTML rendering, file/ZIP/clipboard handling | Types, Markdown metadata, bundled fflate/Marked |
| `src/utils` | Pure geometry and conversation query/selection | Types |
| `src/components` | Reusable controls and screen-level presentation | React, Lucide, types, storage settings types, pure utilities, YouTube service and download helper |
| `src/app` | User intent, adapter orchestration, state, confirmations, geometry effects, transient post-download review | All browser modules above |
| `src/main.tsx` | Mount guard, Shadow DOM and CSS installation | React, app, styles |
| Build/config/scripts | Dependency locking, metadata, licensing, self-contained packaging | Node APIs, dev tools, release inputs |
| Tests | Fixture behavior, regression evidence, screenshots | Runtime modules for units; production dist for browser checks |

Dependency direction is mount → app → components/adapters/operations/storage/utilities/YouTube → shared types. Adapters must not import React, UI state or storage preferences. The app passes export options and explicit stable IDs; adapters independently revalidate native identity. Operations receive jobs and report results; they do not query UI or invent capabilities. Presentation must not click native destructive controls directly.

No backend ownership exists. Chat integration uses native DOM/SPA links only; no private account APIs, authentication bypasses or simulated conversation bodies. The YouTube module may fetch the current public watch page and validated YouTube/video.google.com timedtext URLs. Signed URL parameters remain in memory; no external uploads. Native permission/verification belongs to adapters, explicit intent, confirmation and successful-export review to app, cancellation/results to operations. All three gates are required for native mutations.

Attachment recognition belongs to Markdown conversion, not UI or native mutation adapters. It reads loaded message DOM and may copy decoded blob-image pixels into bounded inline PNGs without clicking controls or inventing URLs. Default link mode does not fetch attachments; explicit embedding follows the capture contract below. Keep inherited conversion isolated and attributed. No Node/build dependencies may leak into runtime. No source map or remote runtime import in dist. Unit tests own redacted fixtures; integration tests own a local fake host and actual downloaded artifacts. Production factories use runtime native-control checks; fixture success must not be described as authenticated live verification. Tests must never mutate real account history.

Update contracts and ADRs for changes spanning boundaries. See `API_CONTRACTS.md`, `DECISIONS.md` and `VERIFICATION.md`.

Offline capture belongs to `src/markdown/media.ts`: it may request only referenced loaded-content URLs, with bounded browser-session fetch and abort. `src/operations/document.ts` owns bundled Markdown parsing, allowlisted static HTML and CSP matching embedded/linked resources; it never retrieves resources. Adapters await capture and revalidate identity before caching. App orchestrates downloads and cleanup; no native action may start after a failed required backup. Tests own provider fixtures and exact exported byte checks, never real-account mutation.

Direct-export dialog and preview-local options/cancellation belong to App; opening the direct dialog captures nothing until Download; UI changes call the shared adapter/media/document pipeline rather than rewrapping stale linked Markdown. Native cleanup and backup gates remain owned by their existing operation/adapter modules.

`src/markdown/messages.ts` owns shared visible message boundaries and role detection. Conversion, attachment scoping and adapter navigation import it; they must not maintain competing provider selectors. It depends only on browser APIs and cannot import adapters or UI.
