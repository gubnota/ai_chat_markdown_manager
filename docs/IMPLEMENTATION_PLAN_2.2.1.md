# Implementation Plan: Gemini attachments (2.2.1)

## Goal
Include uploaded files/images and generated images exposed by Gemini's loaded message DOM in current and batch Markdown exports.

## Existing behavior
Role extraction includes user-query/model-response, but the inherited converter drops every button, including image previews and file cards. Blob/data URLs cannot serve as reusable Markdown references. Navigation fingerprints contain text only.

## Proposed approach
Add a typed attachment converter used at the inherited converter boundary. Recognize message image buttons and file cards, preserve exposed HTTP(S) references, respect image/link settings, and name attachments whose direct links are unavailable. Never click attachment controls or fetch private APIs. Include image identity in settled-message checks.

## File changes
- Create `src/markdown/attachments.ts`: scoped attachment recognition, safe URLs, filenames and explicit unavailable notes.
- Modify `src/markdown/legacy-converter.js`: delegate attachment controls; improve image URL selection/fallback.
- Modify `src/adapters/base/navigation.ts`: include image identity in message fingerprints.
- Create `tests/unit/attachments.test.ts` and `tests/integration/attachments.spec.ts`: controls, unsafe/temporary URLs, toggles, hidden elements, image-only navigation, current download and batch ZIP.
- Modify package/lock root version, Vite banner, App manifest and release script for 2.2.1; generate distribution, ZIP and versioned checksums.
- Update the six compact context documents, verification, changelog and bilingual guides with behavior and boundaries.

## Implementation steps
1. Add scoped conversion helpers and integrate before button exclusion; retain ordinary UI exclusion and never mutate host DOM.
2. Include image source/label in navigation stability checks without accepting stale unchanged content.
3. Exercise production-bundle current/batch downloads and unit edge cases, then build the release.
4. Update compact documentation; commit only task files and push under standing user authorization.

## Verification
Run lint, typecheck, unit tests, production build, Playwright integration checks and versioned SHA-256 verification.

## Risks / edge cases
Authenticated links may expire or require login; filenames without DOM links cannot be turned into durable downloads. The linked live chat redirects to the start page in the test browser, so fixture results are not authenticated attachment verification. Hidden content, toolbars and other conversations must stay excluded.

## Out of scope
Media bundling, private API retrieval, opening native previews, and changes to native archive/delete.

## Approval
User explicitly preapproved plans, implementation, local build, commit and push in this conversation. Proceed under that authorization.
