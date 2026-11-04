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
Status: Accepted

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
