# Architecture index

| Location | Responsibility / entry point |
| --- | --- |
| `src/main.tsx` | Top-frame mount, duplicate guard, injected styles and React root |
| `src/app/App.tsx` | Screens, lifecycle, shortcuts, FAB, dialogs, operation orchestration, successful-export review |
| `src/components/primitives.tsx` | Reusable buttons, toggles and focus-managed dialog |
| `src/components/Conversations.tsx` | Filtering, stable selection, scroll loading and row actions |
| `src/components/YouTubeCaptions.tsx` | Automatic video-language discovery, direct TXT/VTT downloads, optional import |
| `src/youtube/captions.ts` | Public player/watch discovery, validated signed timedtext requests |
| `src/youtube/timedtext.ts` | JSON3/XML/VTT parsing and TXT/VTT serialization |
| `src/components/Settings.tsx` | Local settings controls |
| `src/styles/index.css` | Shadow-scoped Tailwind/theme/responsive/motion styles |
| `src/types/index.ts` | Shared adapter/conversation/export/batch contracts |
| `src/adapters/index.ts` | Platform factory and host/path routing |
| `src/adapters/base/index.ts` | DOM discovery, snapshots, automatic loading and export sessions |
| `src/adapters/base/navigation.ts` | Native SPA navigation, settled-message checks, role extraction |
| `src/adapters/base/native-actions.ts` | Shared scoped native menu/confirmation/outcome checks |
| `src/adapters/chatgpt/index.ts` | Runtime-gated ChatGPT archive/delete |
| `src/adapters/gemini/index.ts` | Runtime-gated Gemini delete; no archive |
| `src/markdown/messages.ts` | Shared visible provider message boundaries and roles for conversion/media/navigation |
| `src/markdown/attachments.ts` | Nested message attachments, safe file URLs, bounded decoded-image embedding and unavailable labels |
| `src/markdown/media.ts` | Bounded asynchronous capture of referenced media/input bytes; strict offline failure |
| `src/operations/document.ts` | Markdown wrapper and allowlisted HTML, inline/linked image CSP and MIME |
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
| `tests/setup.ts`, `tests/unit/` | jsdom setup, core/ChatGPT/Gemini/navigation/timedtext unit coverage |
| `tests/fixtures/` | Redacted local host and native Gemini UI fixtures |
| `tests/integration/userscript.spec.ts` | Inject production dist and verify actual browser behavior |
| `tests/integration/native-actions.spec.ts` | Native archive/delete, frozen targets, backups, review and cancellation |
| `tests/integration/loading-captions.spec.ts` | Three-platform batch loading, cancellation and automatic multilingual caption downloads |
| `dist/AI-Chat-Markdown-Manager.user.js` | Standalone installable release |
| `AI-Chat-Markdown-Manager-v2.3.3.zip`, `SHA256SUMS-v2.3.3` | Release archive and root-relative integrity hashes |
| `docs/screenshots/` | Verified local-fixture UI screenshots |
| `Save-Page-as-Markdown-Safari.user.js`, `README.txt` | Unchanged v1.2 provenance baseline |

Frontend and platform access are entirely in the injected browser application. There is no backend, private account API, database, authentication service or FFI layer. The YouTube module performs caption/watch requests; explicit embedded exports request exposed media/file URLs; chat loading uses native DOM links. Contracts live in `src/types/index.ts`; storage schema/defaults live in `src/storage/index.ts`. Node-only build logic must not enter the runtime graph.

Read `docs/ARCHITECTURE.md` for lifecycle details, `docs/PLATFORMS.md` for capability evidence, `docs/DESIGN_INVENTORY.md` for reference observations and `docs/VERIFICATION.md` for the boundaries of testing. Installation: `docs/INSTALL-SAFARI.md`, `docs/INSTALL-TAMPERMONKEY.md`. User guides: `README.md`, `README.ru.md`. License terms: `LICENSE*`, `THIRD-PARTY-NOTICES.md`.

Attachment regressions: `tests/unit/attachments.test.ts` and `tests/integration/attachments.spec.ts` (current download, batch ZIP and image-only navigation).

Offline regressions: `tests/unit/offline-export.test.ts`, `tests/integration/offline-export.spec.ts`; provider backup/cleanup gates in `tests/integration/native-actions.spec.ts`.
