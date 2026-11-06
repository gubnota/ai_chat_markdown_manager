# Implementation Plan: native batch archive and deletion

Status: approved through the user's standing advance approval for this work, 2026-11-07.

## Goal
Enable selected/all-discovered Gemini deletion and ChatGPT archive/deletion, including a shortcut for successfully backed-up chats. Require explicit app confirmation, stable native identity and verified native UI outcomes. Do not operate on real chats during development.

## Existing behavior
The conversation list already has selected/all batch buttons and a typed DELETE / DELETE ALL dialog. The runner is sequential and supports cancellation, optional pre-mutation backups and per-item results. All production mutation capabilities are currently disabled. Gemini has a fixture-only deletion engine. ZIP review currently provides manual links only. Export restoration runs even for mutations, which would attempt to return to a deleted chat.

## Proposed approach
Share exact native row/menu/dialog checks between Gemini and a dedicated ChatGPT adapter. Expose capabilities when native row action controls are available; validate every item again before each click. ChatGPT archive follows its native immediate menu action; deletion requires a new title-bearing native confirmation. Unknown controls/locales or unavailable virtualized rows fail individually. Never invoke account-wide settings actions or private APIs. Revise ADR-0003's blanket gate for these explicitly requested, runtime-checked operations; document fixture verification separately from live verification.

## File changes
- Create `src/adapters/base/native-actions.ts`: native identity/title binding, menu lookup, localized exact actions, confirmation, cancellation and bounded outcome verification.
- Create `src/adapters/chatgpt/index.ts`: ChatGPT discovery/export plus native archive/delete and conditional capabilities.
- Modify `src/adapters/gemini/index.ts`: reuse shared checks and enable runtime-checked deletion; retain explicit disable option and unsupported archive.
- Modify `src/adapters/index.ts`: select ChatGPT adapter, including the existing local test host.
- Modify `src/operations/batch.ts`: record a committed-but-unverified native outcome as failed even if cancellation arrives; never retry it.
- Modify `src/app/App.tsx`: guarded confirmation, successful-backup archive/delete shortcuts, removal of successful mutation selections, accurate platform help, restoration before mutation (only after optional backup), and cancellation across backup/mutation phases.
- Modify `src/adapters/base/index.ts`: prevent just-removed current IDs from being synthesized again in the same adapter session; exclude native button labels from discovered titles.
- Modify `tests/unit/gemini.test.ts`, `tests/unit/core.test.ts`; create `tests/unit/chatgpt.test.ts`, `tests/integration/native-actions.spec.ts`: exact identity/menu/dialog guards, locales, sequential batches, cancellation before/after commit, failed backup, selection cleanup, explicit all confirmation and post-ZIP scope. Existing fixture-only unsupported-control checks remain valid.
- Modify `package.json`, `package-lock.json`, `vite.config.ts`, `scripts/release.mjs`; rebuild dist and create v2.2.0 ZIP with versioned checksums. Preserve the locally modified v2.1.1 ZIP and `SHA256SUMS` by using a new checksum file.
- Update `README.md`, `README.ru.md`, `CHANGELOG.md`, all six compact context files, `docs/PLATFORMS.md`, `docs/VERIFICATION.md`, `docs/PRIVACY.md`, and both installation guides with controls, recovery limitations and test evidence.

## Implementation steps
1. Add shared native actions and ChatGPT adapter; migrate Gemini checks, retaining real identity validation and unsupported behavior elsewhere. Add focused unit regressions.
2. Integrate app confirmation, mutation lifecycle and successful-backup actions. Keep frozen target IDs, sequential execution, stop-on-error and no destructive retries. Test production UI flows using disposable local fixtures only.
3. Update release/docs, run checks, build and inspect downloaded artifacts. Commit task changes and push using standing authorization; preserve unrelated old releases, extracted files and transport log.

## Verification
Run `npm test`, `npm run lint`, `npm run build` (includes strict typecheck), `npm run test:integration`, checksum/ZIP equality and `git diff --check`. Verify native controls and result files on local production-bundle browser fixtures. Current in-app ChatGPT is signed out: do not claim authenticated account mutation validation.

## Risks / edge cases
Native DOM/localization can change; ambiguous targets or generic deletion dialogs must fail before final confirmation. Sidebar disappearance verifies the observed native UI outcome, not server retention. Cancellation after a committed native action waits for bounded verification and never implies rollback. Automatic pre-backup download initiation cannot prove a saved complete file; explicit post-ZIP review remains available. Archived chats may be restored through ChatGPT settings; deleted chats cannot be restored there.

## Out of scope
Deleting real chats while testing, private APIs, account-wide settings controls, batch unarchive, Gemini native archive, or enabling Claude/DeepSeek mutations.
