# Architecture

## Runtime and UI

`src/main.tsx` creates one zero-size, fixed-position host with an open Shadow DOM, embeds CSS and mounts React. A root-ID guard prevents duplicate mounting; frames are excluded. React uses production mode in the release. The package contains no backend, Base44 runtime, remote import or Node runtime API.

`src/app/App.tsx` coordinates screens, persistent preferences, stable selection, preview, mandatory native confirmations and operations. `src/components/` supplies reusable accessible actions, dialogs, toggles, conversation controls and settings. Native semantic controls, dialog focus trapping/restoration and visible focus states provide the primitive layer compatible with the requested UI approach. Lucide icons are bundled; short CSS transitions/keyframes replace a larger motion dependency and obey reduced-motion preferences.

Tailwind v4 is compiled during the Vite build; component CSS is injected into the shadow root. Styles do not require a stylesheet request. The open shadow root isolates styles, not access from same-origin scripts.

## FAB geometry

`src/utils/position.ts` owns viewport clamping and padded Send-control rectangles. The stored FAB `{x,y}` is independent of the flyout's measured dimensions. `ResizeObserver` updates panel placement without modifying that anchor. Window/visual-viewport/host-layout changes may reclamp the FAB for visibility and Send avoidance. Pointer capture and `touch-action:none` support dragging. A narrow-screen panel may cover the FAB; its header minimize control remains available. Toast text passes pointer events through to avoid blocking mobile actions.

## Adapters and contracts

`src/types/index.ts` defines the five-method adapter boundary and explicit capability states. `src/adapters/index.ts` selects Gemini or a configured DOM adapter for ChatGPT, Claude, DeepSeek, otherwise generic current-page conversion. Shared DOM adapters discover same-origin ID-bearing sidebar links, retain IDs across host virtualization and observe DOM changes with a 250 ms debounce. No background API, authentication integration, cross-origin iframe traversal or account-wide crawler exists.

All discovered entries are marked partial; unknown archive state and dates are retained as unknown. Selection uses `platform:id`, never row index. The manager paginates by 24 instead of rendering an unbounded list. Generic adapters return the current page only.

Explicit preview/export converts the loaded current DOM. A bounded memory cache retains Markdown snapshots (20 entries, approximately 8 MiB UTF-16), allowing later ZIP export after same-tab SPA navigation. Image/link/outline option signatures prevent mixing stale formatting. Reloading clears it. Unloaded conversations without valid snapshots fail.

## Conversion and export

The minimally ported `legacy-converter.js` retains its original metadata and MIT notice. It remains JavaScript to avoid a large rewrite; `legacy.ts` and `legacy-converter.d.ts` provide the typed boundary. ChatGPT uses its inherited turn extraction; other services use inherited generic DOM conversion. Wrapper metadata quotes YAML strings, emits partial-content warnings, and never manufactures conversation dates.

`src/operations/export.ts` sanitizes filenames, deduplicates case-insensitively, builds ZIPs with local fflate, creates Blob downloads and handles clipboard fallback. No image embedding or external resource fetch occurs. Generated object URLs are revoked after a delay. Manifest/report IDs and source links are sensitive user data.

## Batching and native mutations

`BatchRunner` owns one AbortController and one sequential batch. Batch size defines how many sequential items precede a delay; it does not enable concurrency. Every queued item receives success/failure/skipped status. Cancel halts subsequent work, without rollback. Export retry is offered for failed items only; no automatic destructive retry exists.

App-level native gates require `supported`, exact frozen targets, count/title/ID review, a typed deletion phrase and final start. Optional backup generation must finish for the whole target set first. Gemini's engine additionally verifies unique stable row identity, a new native menu, exact localized Delete, a new title-bearing native dialog and disappearance after confirmation. Ambiguous or changing controls fail closed. Native archive is unsupported everywhere; Gemini deletion is `unknown` in the production factory.

## Persistence and failure handling

`src/storage/index.ts` catches denied/corrupt storage, validates settings and migrates inherited preferences. Keys use `__ai_chat_md_v2__:` in the current origin's localStorage. Preferences, anchor, stable selection IDs and optional count-only history persist. Message text is not written to localStorage. There is no database, session token or network client.

Errors remain visible per item in Activity and optional JSON reports. Unsupported controls are disabled. Missing/inactive DOM content creates explicit failures; data is never substituted. Browser download completion, remote platform changes and actual Safari extension permission flows remain outside automated guarantees.

## Build and tests

Vite emits one ES2022 IIFE. A post-minification plugin restores userscript metadata and complete third-party notices. The original 48 allowlisted match patterns are validated, retained and compared during release verification. `scripts/release.mjs` rejects remote requirements, extra dist files and source maps, then packages the script, instructions and licenses.

Vitest uses jsdom fixtures for conversion, storage, batching, geometry and guarded native engine behavior. Playwright injects the built artifact into a local host fixture in Chromium, desktop WebKit and mobile WebKit; it checks actual download contents and operation results. No live account is mutated. See [VERIFICATION.md](VERIFICATION.md).
