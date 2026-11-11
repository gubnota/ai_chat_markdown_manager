# ADR-0001: Self-contained local userscript

Date: 2026-11-04
Status: Accepted

Context: Upgrade an offline Safari userscript while retaining installability without a development server.
Decision: Bundle React, CSS, icons and fflate into one Vite IIFE; mount once in Shadow DOM, top frame only. No backend, private API or runtime CDN.
Consequences: Host permissions and DOM remain authoritative; extension installation requires separate manual validation.
Related files: src/main.tsx, vite.config.ts, scripts/release.mjs

# ADR-0002: Preserve the inherited converter and license provenance

Date: 2026-11-04
Status: Accepted

Context: The v1.2.0 converter already handles chat turns, code, tables, math and generic DOM.
Decision: Preserve original files unchanged; minimally extract JS behind typed wrappers/declaration. Dual-license new work MIT OR Apache-2.0; keep inherited MIT and vendor notices intact.
Consequences: Legacy JS is not rewritten under strict TypeScript; regression tests protect its behavior. Dual licensing does not override inherited obligations.
Related files: Save-Page-as-Markdown-Safari.user.js, src/markdown/, LICENSE*, THIRD-PARTY-NOTICES.md

# ADR-0003: Gate native mutations on actual verification

Date: 2026-11-04
Status: Deprecated (superseded by ADR-0010)

Context: Live Gemini was signed out; its deployed native deletion flow could not be verified. Fixture success cannot establish account safety.
Decision: Ship production Gemini delete as unknown/disabled, all archives unsupported. Keep the exact-identity native engine fixture-testable with an explicit constructor opt-in never used by the factory.
Consequences: No live deletion claim; future activation requires authorized disposable-account evidence, unique title-bearing native confirmation and fresh regressions. Unsupported calls fail before clicks.
Related files: src/adapters/gemini/index.ts, src/adapters/index.ts, tests/unit/gemini.test.ts, docs/PLATFORMS.md

# ADR-0004: Partial DOM discovery and bounded genuine snapshots

Date: 2026-11-04
Status: Accepted

Context: Sidebar virtualization and unloaded conversation bodies make complete history unavailable without private APIs or navigation automation.
Decision: Accumulate observed stable IDs, mark discovery/content partial, paginate presentation and retain explicit preview/export snapshots in memory only (20/~8 MiB). Require matching formatting options for cached bodies.
Consequences: ZIP can contain multiple genuine same-tab captures; unavailable items fail individually. Reload loses snapshots; never substitute current content for another ID.
Related files: src/adapters/base/index.ts, src/components/Conversations.tsx, src/app/App.tsx, docs/PRIVACY.md

# ADR-0005: Accessible local primitives and independent FAB geometry

Date: 2026-11-04
Status: Accepted

Context: Reference-style UI must coexist with host composers, fit narrow screens and preserve the inherited FAB positioning fix.
Decision: Use React semantic primitives, Lucide, Tailwind and CSS motion; keep persistent FAB anchor separate from measured panel placement. Honor reduced motion, focus and Escape handling.
Consequences: No remote design-system runtime. Local notifications must not intercept underlying action controls; narrow panels may require the header minimize control.
Related files: src/components/primitives.tsx, src/styles/index.css, src/utils/position.ts, tests/integration/userscript.spec.ts

# ADR-0006: Verify and track reviewable release artifacts

Date: 2026-11-04
Status: Accepted

Context: Users need an installable script and ZIP, and future agents need clear evidence rather than compatibility assumptions.
Decision: Track dist, ZIP, root-relative SHA-256 hashes and fixture screenshots. Inject production dist in Chromium and WebKit tests. Retain all 48 inherited match entries; reject remote runtime imports/maps.
Consequences: Rebuild/recheck artifacts with source changes. WebKit results are explicitly distinct from actual Safari Userscripts/Tampermonkey extension validation.
Related files: scripts/release.mjs, playwright.config.ts, docs/VERIFICATION.md, .gitignore

# ADR-0007: Load selected chats through native SPA navigation

Date: 2026-11-06
Status: Accepted

Context: Sidebar discovery exposes IDs without loading message history; manual visits made batch exports impractical.
Decision: ChatGPT/Gemini/Claude exports open each native same-origin SPA link sequentially, wait for changed settled role messages, and restore the starting route in cleanup. Reject full-page reloads, stale bodies and unavailable links. Reveal manager rows automatically in increments of 24 at the bottom.
Consequences: Loading may mark chats read. History can remain partial/virtualized; failures stay per-item. No private API or background tab. Extends ADR-0004 while retaining bounded snapshots.
Related files: src/adapters/base/navigation.ts, src/adapters/base/index.ts, src/app/App.tsx, src/components/Conversations.tsx

# ADR-0008: Direct YouTube captions from the active video

Date: 2026-11-06
Status: Accepted

Context: Users need multilingual TXT/VTT without manually downloading timedtext first.
Decision: Detect public player caption tracks automatically on caption-screen entry and video navigation; offer direct language-specific downloads using signed timedtext URLs, preserving parameters. Parse JSON3/XML locally with bounded requests and an optional import fallback. Add only 3 explicit YouTube match rules to the inherited 48.
Consequences: Captions must be available and accessible in the browser; blocked/empty results fail visibly. Signed URL parameters stay in memory. No private API, credential storage or transcript upload.
Related files: src/youtube/, src/components/YouTubeCaptions.tsx, vite.config.ts, tests/integration/loading-captions.spec.ts

# ADR-0009: Exclude native start pages and review successful backups

Date: 2026-11-06
Status: Accepted

Context: Gemini's `/app` welcome screen became a synthetic chat and timed out in batches; users need a clear post-backup deletion path.
Decision: Native adapters discover only native route identities. Generic sites retain page fallback. Restoration may settle on an empty original start page, while exports require messages. After a ZIP download starts, show only successful targets with native links and manual deletion guidance.
Consequences: No greeting-only chat failures or phantom selection. Download initiation does not prove a complete saved backup. At v2.1.1 native deletion remained disabled; ADR-0010 extends this review with separately confirmed native actions.
Related files: src/adapters/base/, src/adapters/index.ts, src/adapters/gemini/index.ts, src/app/App.tsx, tests/unit/navigation.test.ts, tests/integration/loading-captions.spec.ts

# ADR-0010: Runtime-scoped native batch actions

Date: 2026-11-07
Status: Accepted

Context: User explicitly requested ChatGPT batch archive/delete and post-backup deletion. A permanent fixture-only gate prevented those workflows.
Decision: Enable ChatGPT archive/delete and Gemini delete conditionally on recognized native sidebar controls. Share exact ID/row/menu validation, localized exact labels, title-bearing Delete confirmation and stable verified removal. Archive commits at its menu action, matching the native flow. Freeze discovered IDs; never use account-wide controls. Reviewed successful ZIP targets use the same mandatory confirmation. Required backups restore the original route before mutation.
Consequences: Missing/ambiguous controls fail closed. No authenticated live mutation claim; fixtures cannot establish deployed compatibility. Cancellation preserves verified committed results; unverified commits fail without automatic retry. Successful IDs are suppressed in this tab until reload. Claude and other mutation paths stay unsupported.
Related files: src/adapters/base/native-actions.ts, src/adapters/chatgpt/, src/adapters/gemini/, src/app/App.tsx, src/operations/batch.ts, tests/integration/native-actions.spec.ts

# ADR-0011: Preserve exposed attachment references without native actions

Date: 2026-11-07
Status: Accepted

Context: Gemini message images and files can live inside preview buttons that the inherited converter discards; image-only batches also have no text fingerprint.
Decision: Add typed message-scoped attachment recognition at the converter boundary. Preserve exposed HTTP(S) image/file references, respect existing toggles, name missing direct links, and fingerprint image identity during settled-message navigation. Never click previews/downloads, guess URLs, retrieve private APIs or bundle media.
Consequences: Current and batch exports retain more loaded attachments. Temporary/authenticated links remain limited by the host; blob/data previews are explicitly unavailable as reusable references. Synthetic browser tests do not establish authenticated host compatibility.
Related files: src/markdown/attachments.ts, src/markdown/legacy-converter.js, src/adapters/base/navigation.ts, tests/unit/attachments.test.ts, tests/integration/attachments.spec.ts

# ADR-0012: Embed decoded temporary message images

Date: 2026-11-07
Status: Accepted

Context: Authenticated Gemini DOM inspection found generated images exposed only as blob URLs, while uploaded images use nested carousel cards. Native image menus expose no reusable URL; CSP blocks blob fetch, but copying decoded pixels succeeds.
Decision: Extend ADR-0011's external-reference policy with bounded local PNG canvas copies for loaded blob message images and bounded raster data URLs. Limit canvas conversion to 16,777,216 pixels and URLs to 12 MiB. Preserve HTTP links, independent toggles and unavailable notes; traverse nested cards individually. No attachment fetch, native action or security-setting change.
Consequences: Temporary images survive navigation in current/batch exports. Markdown grows and requires data-image renderer support; tainted, unloaded or oversized images remain unavailable. This supersedes ADR-0011's blanket no-embedded-media/blob-data exclusion. Uploaded-document controls remain fixture-tested.
Related files: src/markdown/attachments.ts, src/markdown/legacy-converter.js, tests/unit/attachments.test.ts, tests/integration/attachments.spec.ts


# ADR-0013: Strict offline documents and download-first cleanup

Date: 2026-11-11
Status: Accepted

Context: Users need plane-readable HTML and Markdown carrying accessible media/input files for ChatGPT/Gemini, then bulk cleanup without accepting a broken offline backup.
Decision: Add HTML and an independent Markdown embed option, leaving default Markdown references compatible. Capture only referenced loaded resources with bounded, cancellable browser-session fetch; keep decoded-image fallback. Reject a chat when an included resource is inaccessible. Bundle Marked, rebuild an allowlisted document and apply data-only media CSP. Use the same format for current/selection/preview/ZIP/required backups. Retain exact-ID native action engine; Gemini has local ZIP plus delete, without invented native archive.
Consequences: Offline exports grow and require capture while online; 20 MiB/file, 64 MiB/chat, 100-resource bounds can reject large chats. CORS/CSP/expired links/streaming and partial history remain limits. Failed chats never enter successful-backup review; required full-backup failure prevents every native action. Explicit media requests extend ADR-0012's no-fetch policy; default link mode keeps it. Browser fixtures are not real-account verification.
Related files: src/markdown/media.ts, src/operations/document.ts, src/adapters/base/index.ts, src/app/App.tsx, tests/unit/offline-export.test.ts, tests/integration/offline-export.spec.ts, tests/integration/native-actions.spec.ts

# ADR-0014: Preview owns visible export options

Date: 2026-11-11
Status: Accepted

Context: v2.3.0 exposed format and embedding outside preview, making offline exports hard to discover.
Decision: Show format, embed, image and link/file controls in preview, with local options and fresh adapter capture per change. Clear old output before capture; block downloads on failure and abort on close. Show explicit Markdown and HTML actions on home.
Consequences: Both providers use the tested export pipeline; preview preferences do not silently alter batch defaults. Existing access/size limits remain.
Related files: src/app/App.tsx, src/components/Conversations.tsx, tests/integration/offline-export.spec.ts.
