# Changelog

Notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates for inherited versions were not supplied.

## [2.2.2] - 2026-11-07

- Preserve individual image/file cards inside Gemini's nested upload carousel.
- Embed loaded temporary message images as bounded inline PNG data URLs without fetching blobs or clicking native controls. Retain raster data images and explicit notes for unavailable previews.
- Verify current Markdown and batch ZIP exports with real blob images, route changes, revoked sources and blocked network requests. Add canvas/size guards; 93 unit tests and 87 browser checks.
- Record read-only Safari image DOM/canvas evidence and inline-image viewer/size limits. Uploaded-document controls remain fixture-tested.

## [2.2.1] - 2026-11-07

- Preserve Gemini uploaded/generated images inside message preview buttons and file-card links exposed in the DOM.
- Keep filenames and explicit unavailable-link notes for inaccessible attachments; respect image/link settings, hidden content and toolbar exclusion.
- Accept newly settled image-only conversations during automatic batch loading, while continuing to reject stale content.
- Add attachment current-download/ZIP regression coverage and document expiring/authenticated URL limits.
## [2.2.0] - 2026-11-07

- Add native ChatGPT batch archive/delete and Gemini batch delete using runtime-scoped row/menu checks, title-bearing Delete confirmation and verified removal.
- Freeze selected/all discovered targets, keep mandatory typed deletion review and never invoke account-wide controls.
- Add archive/delete shortcuts for reviewed successful ZIP exports only, with acknowledgment of checking the files.
- Restore the starting chat after required backups before native actions; failed/cancelled backups prevent mutation.
- Preserve verified results when cancellation follows a native commit; report uncertain outcomes without automatic retries and suppress completed IDs until reload.
- Expand fixture coverage to 79 unit tests and 81 browser checks. No real account mutations performed. Package v2.2.0 with its own checksum file.

## [2.1.1] - 2026-11-06

- Exclude Gemini `/app` and other native welcome pages from chat batches; remove stale synthetic selections.
- Restore empty original start pages after export without waiting for conversation messages.
- Add successful-export review with native links and manual deletion guidance; failed/skipped items stay excluded. Native automatic deletion remains disabled.
- Expand regressions to 61 unit tests and 57 production-bundle browser checks; package the updated userscript and guides.

## [2.1.0] - 2026-11-06

- Automatically reveal 24 more conversation rows when scrolling to the bottom.
- Automatically open selected ChatGPT/Gemini/Claude chats for Markdown/ZIP export; wait for new settled messages and restore the starting chat after success/cancellation.
- Detect YouTube caption languages automatically on the video page, refresh after video navigation, and fetch/convert directly to TXT or timestamped VTT. No manual source-file download required.
- Offer original/translated tracks, JSON3/XML fallback and optional saved-file/paste import; preserve signed URL parameters and reject stale/empty results.
- Keep original 48 match rules and add 3 targeted YouTube rules; keep native archive/delete gates and `.DS_Store` ignore.
- Expand verification to 55 unit tests and 51 production-bundle browser checks; update bilingual guides, privacy/contracts and release artifacts.

## [2.0.0] - 2026-11-04

### Added

- React/TypeScript Shadow DOM interface informed by the inspected Base44 reference: tools, conversations, export, archive information, settings, activity, preview and guarded confirmations.
- Genuine sidebar discovery with stable IDs, persistent selection, filters/sorting and pagination.
- Markdown snapshots in tab memory, ZIP backups/manifests, safe filenames, sequential cancellable operations and per-item reports.
- Capability-gated adapters and guarded Gemini native deletion engine with realistic fixture coverage.
- Light/dark/system themes, scale/opacity, English/Russian interface and local preferences.
- Vite single-file production build, release ZIP/checksum, Vitest and Chromium/WebKit integration tests.
- Bilingual practical documentation, complete dual-license files and inherited/dependency notices.

### Changed

- New original code is licensed MIT OR Apache-2.0; inherited MIT code and dependency licenses remain intact.
- Legacy conversion is wrapped by a typed boundary; all 48 allowlisted @match rules and original shortcuts remain.
- FAB anchor remains independent of panel dimensions; mobile layering and notification interactions are verified.

### Limitations

- Native archive is unsupported. Production Gemini deletion is disabled pending authenticated live verification; the signed-out environment is documented.
- Exports contain loaded DOM or explicit temporary snapshots; discovery is partial and cannot represent full account history.
- WebKit fixture verification does not establish Safari extension installation or signed-in platform behavior.

## [1.2.0] - Undated inherited baseline

### Changed

- Replaced the global wildcard with 48 explicit @match rules across AI chat sites, as recorded in the supplied README.txt.
- Preserved v1.1.1 independent FAB positioning, Send-button avoidance and keyboard/selection controls described by that supplied file.

The original userscript and README.txt are retained unchanged. No additional historical releases or dates are inferred.
