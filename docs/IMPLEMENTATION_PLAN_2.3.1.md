# Implementation Plan: visible preview export controls

## Goal
Expose Markdown/HTML and image/media embedding directly in conversation preview, with a discoverable HTML action on the home menu for both providers.

## Existing behavior
v2.3.0 supports offline HTML and embedded Markdown, but preview only downloads the format selected elsewhere. Home shows only that selected format. The shared adapter capture path already supports both providers.

## Proposed approach
Add local preview controls for file format, embedding, images and links/files. Regenerate through the existing adapter whenever an option changes; clear previous output immediately, disable controls/download while capturing, and show errors with retry. Abort capture when closing preview. Keep preview choices local. Add explicit Markdown and HTML home actions using per-call format overrides; retain configured keyboard/selection behavior.

## File changes
- `src/app/App.tsx`: preview state/options, cancellable regeneration, direct home export actions and per-call format options.
- `src/components/Conversations.tsx`, `src/components/primitives.tsx`, `src/styles/index.css`: format-neutral preview entry, focus handling for disabled controls, usable dialog toggles/select.
- `tests/integration/offline-export.spec.ts`: exercise controls/download bytes from preview on ChatGPT/Gemini, including failed regeneration and direct HTML from default Markdown settings.
- `package.json`, `package-lock.json`, `vite.config.ts`, `scripts/release.mjs`: bump to 2.3.1 and update installation guidance.
- `README.md`, `README.ru.md`, compact project context documents and `docs/VERIFICATION.md`: document visible controls and verification.
- `dist/AI-Chat-Markdown-Manager.user.js`, versioned ZIP/checksums: regenerate installable artifacts.

## Implementation steps
1. Add per-call export options and explicit home HTML/Markdown actions without changing persisted defaults.
2. Add preview controls, fresh capture, invalidation, abort-on-close and retry; use existing media bounds, offline sanitizer and route restoration.
3. Add provider browser regressions using production bundle and real downloaded bytes; preserve cleanup gates.
4. Build/test/lint, verify release integrity, update docs and commit/push only scoped changes.

## Verification
`npm test`, `npm run lint`, `npm run build`, `npm run test:integration`; ZIP/dist equality and versioned SHA-256 checks. Browser coverage includes Chromium and desktop/mobile WebKit. No live account mutations.

## Risks / edge cases
Option changes may require revisiting a conversation; existing export sessions must restore the initial route. Failed or cancelled regeneration must never download stale output. Existing resource-access and partial-history limits remain.

## Out of scope
New provider APIs, changes to native cleanup, historical release artifacts or unrelated extracted/private files.

Approval: standing user instruction “auto approve then build then git push”; follow-up corrects missing UI in the same authorized work.
