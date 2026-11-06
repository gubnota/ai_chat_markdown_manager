# Implementation Plan: start-page discovery and post-backup review

Status: approved in advance by the user, 2026-11-06.

## Goal
Exclude Gemini's `/app` welcome page from chat batches and explain how to remove successfully exported chats using native controls.

## Existing behavior
DOMAdapter always synthesizes a current-page conversation. Native SPA restoration always waits for messages, including when returning to an empty start page. Native deletion remains unverified/disabled.

## Proposed approach / file changes
1. Modify `src/adapters/base/index.ts`, `src/adapters/index.ts`, `src/adapters/gemini/index.ts`: disable synthetic page entries for the four native chat adapters; retain generic page export and reject stale synthetic IDs.
2. Modify `src/adapters/base/navigation.ts`: permit a settled empty destination only for restoring an original non-conversation route. Export still requires real changed messages.
3. Modify `src/app/App.tsx`: after preparing a ZIP, show a review list containing only that batch's successful chats, with native deletion guidance and links. Clear it before another batch. No automatic mutation.
4. Modify `tests/unit/navigation.test.ts`, `tests/integration/loading-captions.spec.ts`: cover native start pages, generic fallback, empty-route restoration, successful export review and failed-item exclusion. Serve the existing ChatGPT fixture at a real conversation route in `tests/integration/userscript.spec.ts` so its current-chat checks exercise a native ID.
5. Modify `package.json`, `package-lock.json`, `vite.config.ts`, `scripts/release.mjs`: release 2.1.1; update dist, ZIP and checksums.
6. Update the six compact context documents, `README.md`, `README.ru.md`, `CHANGELOG.md`, `docs/PLATFORMS.md`, `docs/VERIFICATION.md`, and installation guides with behavior and verification.

## Verification
Run unit tests, lint, typecheck/build, production-bundle browser tests, ZIP/checksum checks, then commit only task files.

## Risks / edge cases
Returning to a start page must not export its greeting or stale messages. A prepared download does not prove a saved/complete backup: users must inspect the ZIP before deleting. Partial discovery remains partial.

## Out of scope
Enabling unverified native deletion, live destructive tests, private APIs, changes to unrelated local files.
