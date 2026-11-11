# Implementation Plan: choose embedding before export

## Goal
Show a media/input-file embedding choice before direct Markdown or HTML downloads. Honor the choice for HTML as well as Markdown across current, preview and batch exports.

## Existing behavior
Home exports download immediately. Preview and Settings expose embedding, but HTML forces it on in capture, rendering, UI and ZIP manifests. HTML sanitizer rejects external images and its CSP permits only data media.

## Proposed approach
Add a local direct-export options dialog (format, embed, images, links/files), with no capture until Download. Keep keyboard quick export behavior. HTML format selection defaults embedding on but its switch stays editable. Use embedMedia as the effective capture flag for either format. Linked HTML safely retains HTTP(S) image references under a matching image CSP and explicitly states it requires internet; embedded HTML keeps its strict data-only policy and failure behavior. No dependencies or native cleanup changes.

## File changes
- Modify src/app/App.tsx: direct-export dialog, per-call options, modal lifecycle guards, editable preview/batch HTML embedding and accurate manifests.
- Modify src/components/Settings.tsx: HTML default embedding and editable switch.
- Modify src/markdown/media.ts and src/operations/document.ts: honor embedding flag, render safe linked HTML and accurate header/CSP.
- Modify tests/unit/offline-export.test.ts and tests/integration/offline-export.spec.ts: linked/embedded choices, zero capture before confirmation, byte checks, failures and both providers.
- Modify tests/integration/userscript.spec.ts, attachments.spec.ts, native-actions.spec.ts: explicit direct-download confirmation and explicit embedded HTML fixture settings.
- Modify package.json, package-lock.json, vite.config.ts, scripts/release.mjs: v2.3.2 metadata and install guidance.
- Modify README.md, README.ru.md, six compact context files, docs/PRIVACY.md and docs/VERIFICATION.md: aligned behavior and test results.
- Regenerate dist userscript, v2.3.2 ZIP/checksums and affected fixture screenshots.

## Implementation steps
1. Make capture/rendering honor embedding; add focused no-fetch/linked HTML sanitization regressions.
2. Add options dialog and align existing controls; preserve local choices, cancellation, operation locking and error reporting.
3. Extend production-bundle tests for both providers and update direct-download callers.
4. Update documentation/version, run checks, build, inspect screenshots, verify artifacts, commit and push.

## Verification
npm run lint; npm run typecheck; npm test; npm run build; npm run test:integration. Check versioned hashes and ZIP/dist equality. Inspect desktop/mobile options screenshots.

## Risks / edge cases
Linked exports need network/auth for external resources and must say so. Never allow executable markup/unsafe image protocols. Embedded failures still exclude backups from cleanup. Modal cancel must not start capture or leave an operation running.

## Out of scope
Provider discovery/native mutation changes, dependencies, streaming media and inaccessible attachment recovery.

## Authorization
User's standing instruction: “auto approve then build then git push.” Presented the approach before implementation; proceed under that authorization.
