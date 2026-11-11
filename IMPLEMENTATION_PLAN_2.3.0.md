# Implementation Plan: Offline exports and bulk cleanup (2.3.0)

## Goal
Deliver self-contained HTML and optional embedded Markdown exports for ChatGPT/Gemini, including accessible input files; verify download-first bulk cleanup. User approved implementation/build/commit/push in advance on 2026-11-11.

## Existing behavior
DOM adapters export role-aware Markdown; temporary images embed via canvas, remote images/files remain links. App wraps documents and batches ZIPs. Native engine supports ChatGPT archive/delete and Gemini delete with identity and outcome checks.

## Proposed approach
Add format and embedMedia settings. Capture bounded resources from visible message DOM references in the converted body before navigation, without changing host content or invoking attachment controls. HTML always embeds included resources. Offline failures reject a chat rather than treating an incomplete backup as cleanup-ready. Use a bundled Markdown parser and sanitize static HTML with a restrictive offline CSP. Keep Markdown link mode compatible. Native Gemini archive remains unsupported; local ZIP archive plus delete is available.

## File changes
- src/types/index.ts, src/storage/index.ts: export format/embedding contracts and validated defaults.
- src/markdown/media.ts (new), attachments.ts, legacy-converter.js: asynchronous resource capture, safe inline attachment URLs and media handling.
- src/adapters/base/index.ts: capture referenced media and option-aware snapshots; verify identity after async capture.
- src/operations/document.ts (new), export.ts: sanitized standalone HTML rendering and format-aware filenames/documents.
- src/app/App.tsx, src/components/Settings.tsx: format/embedding UI and consistent current/preview/batch/backup output.
- tests/unit/offline-export.test.ts, tests/integration/offline-export.spec.ts (new), native-actions.spec.ts: offline bytes, rendering, failures, cache, provider and cleanup regressions.
- package.json, package-lock.json, vite.config.ts, scripts/release.mjs: bundled parser dependency and 2.3.0 release.
- README.md, README.ru.md, docs/{PROJECT_CONTEXT,ARCHITECTURE_INDEX,MODULE_OWNERSHIP,API_CONTRACTS,DECISIONS,TASK_LOG,PRIVACY,PLATFORMS,VERIFICATION}.md: current behavior, limits, evidence.
- dist userscript, versioned release ZIP/checksums: installable artifacts.

## Implementation steps
1. Add validated export settings, bounded media capture and adapter integration; test safe URLs, scoped resources, failures, cancellation, cache and binary fidelity.
2. Add sanitized standalone HTML and format-aware downloads; test hostile content and offline images/media/file links.
3. Wire format/embedding into current, preview, selection, ZIP and required backup flows; exercise both providers using production bundle.
4. Verify native cleanup regressions without touching real accounts; label provider limitations.
5. Update docs and version; run lint/typecheck/unit/build/integration/checksums; commit only task changes and push origin/main, preserving preexisting unrelated artifacts and private transport log.

## Verification
npm run lint; npm run typecheck; npm test; npm run build; npm run test:integration; shasum -a 256 -c SHA256SUMS-v2.3.0; verify ZIP script equality and pushed hash.

## Risks / edge cases
CORS/CSP, expired links, private controls with no exposed bytes, streaming media, oversized assets, download permissions, partial/virtualized conversations. Fail offline exports explicitly for missing included resources. Do not claim fixture tests establish live account behavior or full history completeness.

## Out of scope
Private provider APIs, fetching hidden account history, real-account deletion tests, inventing native Gemini archive.
