# Implementation Plan: AI Chat Markdown Manager v2.0

Status: Implemented and verified; see `VERIFICATION.md` for results and remaining live-platform limitations. User authorized implementation and push.

## Goal
Upgrade the supplied v1.2.0 standalone script to a self-contained React userscript with an observed Base44-style interface, genuine local exports, safe platform adapters, release artifacts and bilingual documentation.

## Existing behavior
The repository has no commits or build system. It contains the v1.2.0 script and README.txt. The converter handles ChatGPT turns, generic DOM, code, tables, math, images and selection. A fixed-size Shadow DOM host stores a FAB anchor independently of flyouts and avoids Send controls. Preserve original source as a provenance baseline.

## Proposed approach
Port the converter with minimal semantic changes; strict TypeScript wrapper. Use React in Shadow DOM, Tailwind plus compatible native accessible primitives, Lucide and CSS motion. Vite IIFE build embeds styles and inherited metadata matches. Stable platform/id selection and partial discovery claims. Sequential native operations validate identity and fail closed; no private API calls or simulated account history. Gemini live authentication may block verification; disable destructive capability if live DOM cannot be verified and document the blocker while testing engine against realistic fixtures.

## File changes
- src/types/index.ts: shared adapter, conversation, export and operation contracts.
- src/markdown/legacy-converter.js, .d.ts and legacy.ts: inherited converter and typed wrapper, attribution preserved.
- src/adapters/{base,gemini}/ and src/adapters/index.ts: discovery, current content, guarded native actions and capability declarations.
- src/storage/index.ts: validated local settings, stable selection and history metadata.
- src/operations/{batch,export}.ts: sequential cancellation, reports, filenames, ZIP/downloads.
- src/utils/position.ts: independent FAB geometry and collision avoidance.
- src/{main.tsx,app/App.tsx,styles/index.css}, src/components/: mount, interface and reusable controls.
- package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html, eslint.config.js, playwright.config.ts, scripts/release.mjs: strict build, dev harness, tests, packaging.
- tests/unit/, tests/integration/, tests/fixtures/: conversion, batch, selection, archive/delete safety and FAB/browser verification.
- README.md, README.ru.md, CHANGELOG.md, CONTRIBUTING.md, SECURITY.md, THIRD-PARTY-NOTICES.md, LICENSE*: practical documentation and dual licensing with inherited MIT exceptions.
- docs/: current memory, architecture, design inventory, verification, privacy and installation.
- .gitignore: .DS_Store, dependencies, temporary test output; dist/ and release ZIP retained.

## Implementation steps
1. Inspect reference screens and live Gemini accessibility; record observed design and limitations.
2. Define shared contracts; build adapters and converter; unit-test identity and conversion failures.
3. Add local storage, cancellable batch engine and ZIP exports; verify collisions and incomplete data.
4. Build reference-style UI, real discovery/selection/preview and safe confirmations; preserve shortcut and anchor behavior.
5. Add strict tooling and fixture/browser tests; run lint, typecheck, tests, production build and Chromium/WebKit checks.
6. Complete docs/licenses, screenshots and release ZIP; commit in coherent increments and push main to configured origin.

## Verification
npm run typecheck; npm run lint; npm run test; npm run build; npm run test:integration. Inspect built metadata/offline bundle and ZIP. Browser screenshots at desktop/mobile sizes. No destructive tests on real accounts.

## Risks / edge cases
Lazy DOM discovery is partial. Inactive content may be unavailable. Native UI labels and permissions change. Storage/downloads/clipboard may be blocked. WebKit tests do not establish actual Safari Userscripts extension compatibility. Outcome-uncertain destruction must not retry.

## Out of scope
Backend services, authentication bypasses, remote bundles, fabricated history and unsupported native operations. No deletion of real user conversations during development.

User's brief explicitly authorizes proceeding through implementation without stopping for a plan-only response.
