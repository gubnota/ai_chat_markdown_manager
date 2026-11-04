# Verification — v2.0.0

Date: 2026-11-04. Environment: macOS, Node 26.8.2, npm 11.19.1. Dependency versions are locked in `package-lock.json`.

## Automated release checks

| Check | Result / scope |
| --- | --- |
| `npm run lint` | Pass; source, tests and Vite/Playwright config |
| `npm run typecheck` | Pass; strict TypeScript, typed legacy JS boundary |
| `npm test` | 43 pass in 2 files (26 core + 17 Gemini) |
| `npm run build` | Pass; one self-contained production userscript, ZIP, checksum |
| `npm run test:integration` | 27 pass: 9 cases each in Chromium, desktop WebKit, mobile WebKit |
| Metadata / release integrity | All original 48 @match entries retained; no global wildcard, runtime CDN or source maps; ZIP script matches dist |

The production React bundle is about 329 kB before ZIP compression. Sizes/hashes may vary with rebuilt dependencies; use the checked-in lockfile and current `SHA256SUMS`.

## Unit coverage

Core: legacy code fences/languages, tables and pipes, math annotations, images/links/unsafe URLs, ignored UI, empty content/selection, front matter and partial warnings; sanitized filenames/collisions/ZIP; filters/stable selection/unknown dates; validated/migrated/storage-denied preferences; privacy summaries; FAB collision and geometry; discovered identities across virtualization; same-tab real-content snapshots/format changes; sequential batches, cancellation, stop-on-error and concurrent-run prevention.

Gemini: production disablement, sequential multiple targets, same-origin exact identity, native menu/dialog/removal verification, English/Russian/German/French/Spanish label paths, duplicate IDs/titles, unrelated/wrong confirmation, missing/unknown controls, DOM mutation, timeout, abort and partial failure. Test fixture opt-in is supplied directly to the adapter constructor. Production `createAdapter()` never supplies it.

## Browser coverage

The integration suite injects **dist/AI-Chat-Markdown-Manager.user.js**, not development modules, into a local HTML host. Cases cover:

1. Drag, expand, settings/back, minimize, dismiss, restore and persisted anchor.
2. Right edge, Send-button collision, Escape, viewport resize and clamping.
3. Discovery, search, filters/sort, multi-selection across reload and disabled deletion.
4. Accumulation of 80 virtualized entries, pagination and selection independent of visible rows.
5. Real Markdown download contents, partial warning, ZIP success/failure manifest and activity state.
6. Theme persistence, keyboard focus restoration, duplicate mount prevention and usable native composer.
7. Two genuine exported conversations retained across SPA navigation and included in ZIP.
8. All new requests blocked after injection: manager still works and makes no outgoing request.
9. Settled screenshots of home/conversations in desktop/mobile layouts.

Mobile WebKit runs in device emulation; drag tests use Playwright pointer input. This does not establish real touch hardware behavior. No real account mutation is tested.

## Live inspection evidence and blockers

- Base44: accessible reference inspected in Browser; main/conversations/settings and visible row controls informed implementation. Approval review blocked external export/delete action clicks; associated dialogs were not verified. [Inventory](DESIGN_INVENTORY.md).
- Gemini: `https://gemini.google.com/` redirected to signed-out `/app`. No authenticated sidebar, menu or native confirmation was available. Production deletion stays `unknown`/disabled. [Activation requirements](PLATFORMS.md#gemini-deletion-blocker).
- ChatGPT/Claude/DeepSeek and all generic sites: no authenticated live verification. Selectors are implementation paths with fixture/generic conversion coverage, not account-wide support claims.
- Actual Safari Userscripts/Tampermonkey extension installation, permissions, downloads and host CSP need manual testing. WebKit injection is not Safari extension verification.

## Issues found and fixed during QA

A mobile resize assertion initially read the anchor before its animation-frame clamp; it now waits for the settled position. A notification intercepted mobile ZIP clicks; toast text now passes pointer events through while its dismiss control remains clickable. Panel stacking on narrow screens keeps the FAB from covering list controls. Full browser checks passed after these fixes.

## Manual follow-up before enabling native features

Use an authorized disposable test account, never a user's history. Verify current deployed localized controls, stable IDs, unique title-bearing confirmation, the exact native outcome and cancellation/timeout behavior. Add redacted fixture regressions, repeat the automated suite, record browser/platform/date and only then change production capability. Keep ambiguous cases disabled. Native archive needs a separate implementation and evidence.
