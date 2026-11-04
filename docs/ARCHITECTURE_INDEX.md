# Architecture index

| Location | Responsibility / entry point |
| --- | --- |
| `src/main.tsx` | Top-frame mount, duplicate guard, injected styles and React root |
| `src/app/App.tsx` | Screens, lifecycle, shortcuts, FAB, dialogs, operation orchestration |
| `src/components/primitives.tsx` | Reusable buttons, toggles and focus-managed dialog |
| `src/components/Conversations.tsx` | Filtering, stable selection, pagination and row actions |
| `src/components/Settings.tsx` | Local settings controls |
| `src/styles/index.css` | Shadow-scoped Tailwind/theme/responsive/motion styles |
| `src/types/index.ts` | Shared adapter/conversation/export/batch contracts |
| `src/adapters/index.ts` | Platform factory and host/path routing |
| `src/adapters/base/index.ts` | DOM discovery, snapshot cache and current-content export |
| `src/adapters/gemini/index.ts` | Disabled production deletion; guarded native fixture engine |
| `src/markdown/legacy-converter.js` | Minimally changed inherited MIT converter |
| `src/markdown/legacy-converter.d.ts` | Explicit typed boundary for inherited JS |
| `src/markdown/legacy.ts` | Typed conversion wrapper and metadata |
| `src/storage/index.ts` | Defaults, validated migration, local storage and count-only history |
| `src/operations/batch.ts` | Sequential jobs, abort and result reporting |
| `src/operations/export.ts` | Filenames, ZIP, Blob downloads and clipboard |
| `src/utils/position.ts` | FAB/panel geometry and Send-button collision avoidance |
| `src/utils/selection.ts` | Query/filter/sort/selection utilities |
| `vite.config.ts` | Single IIFE, inherited metadata and embedded styles/notices |
| `scripts/release.mjs` | Validate build, package ZIP, hash script and ZIP |
| `index.html` | Local dev harness; not an installed dependency |
| `tsconfig.json`, `eslint.config.js` | Strict type/lint boundaries |
| `package.json`, `package-lock.json` | Commands and reproducible dependencies |
| `playwright.config.ts` | Local fixture server, Chromium and two WebKit projects |
| `tests/setup.ts`, `tests/unit/` | jsdom setup, core and Gemini unit coverage |
| `tests/fixtures/` | Redacted local host and native Gemini UI fixtures |
| `tests/integration/userscript.spec.ts` | Inject production dist and verify actual browser behavior |
| `dist/AI-Chat-Markdown-Manager.user.js` | Standalone installable release |
| `AI-Chat-Markdown-Manager-v2.0.0.zip`, `SHA256SUMS` | Release archive and root-relative integrity hashes |
| `docs/screenshots/` | Verified local-fixture UI screenshots |
| `Save-Page-as-Markdown-Safari.user.js`, `README.txt` | Unchanged v1.2 provenance baseline |

Frontend and platform access are entirely in the injected browser application. There is no backend, network API, database, authentication service or FFI layer. Contracts live in `src/types/index.ts`; storage schema/defaults live in `src/storage/index.ts`. Node-only build logic must not enter the runtime graph.

Read `docs/ARCHITECTURE.md` for lifecycle details, `docs/PLATFORMS.md` for capability evidence, `docs/DESIGN_INVENTORY.md` for reference observations and `docs/VERIFICATION.md` for the boundaries of testing. Installation: `docs/INSTALL-SAFARI.md`, `docs/INSTALL-TAMPERMONKEY.md`. User guides: `README.md`, `README.ru.md`. License terms: `LICENSE*`, `THIRD-PARTY-NOTICES.md`.
