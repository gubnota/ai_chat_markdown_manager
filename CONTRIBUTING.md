# Contributing

Read `docs/PROJECT_CONTEXT.md`, `ARCHITECTURE_INDEX.md`, `MODULE_OWNERSHIP.md`, `API_CONTRACTS.md`, `DECISIONS.md` and `TASK_LOG.md` first. Use those maps to inspect only relevant files. Keep documentation short and aligned with implementation; do not paste source into memory documents.

## Develop

Use Node 22.12+ and npm. Run `npm ci`, then `npm run dev`. Local examples are explicitly fixtures without an account. Source is strict TypeScript/React with an intentionally preserved JavaScript converter behind a typed declaration. Use named, focused functions and reusable semantic controls; format new code with Prettier. Avoid gratuitous formatting of the inherited converter/source.

Before a pull request, run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run test:integration`. Install browser binaries first with `npx playwright install chromium webkit`. Tests need permission to bind a localhost port. Build before integration: tests exercise the production bundle.

## Platform adapters

Declare capabilities honestly. Current DOM export does not prove access to inactive conversations or complete account history. Use stable same-origin IDs, accumulate virtualized sidebar metadata, preserve unknown dates/status and fail on unavailable content. Do not fetch private endpoints, copy session tokens, add a universal @match or introduce background message collection.

Native actions require exact identity checks at every relevant control, explicit mandatory review, title-bearing native Delete confirmation and verified outcome. Unknown outcomes must not retry automatically. No fixed positional selector may be the sole identity. Add realistic redacted fixtures for localization, duplicates, mutations, timeout, cancellation and partial failures. Never execute destructive automated tests against real accounts.

Keep native capabilities conditional on recognized runtime controls and independently validate each action. Record authenticated manual evidence only when actually obtained, using authorized disposable accounts. Archive commits at the native menu item; user review remains mandatory. A ZIP must never be labelled as a completed platform archive.

## Pull requests and releases

Describe the concrete behavior change, affected adapter/capability and verification scope. Include before/after screenshots for UI changes and distinguish local fixtures from live accounts. Use small coherent commits. Update the compact memory files and changelog when contracts or capabilities change. Run the release integrity checks and regenerate the bundle/ZIP/checksum together for a release.

Do not commit credentials, chat transcripts, authentication traces, node_modules, test traces or `.DS_Store`. Preserve upstream attribution. Contributions to original project code use MIT OR Apache-2.0; third-party additions must retain compatible notices and be listed in THIRD-PARTY-NOTICES.md.
