# Architecture index

| Location | Responsibility / entry point |
| --- | --- |
| `src/main.tsx` | Top-frame mount, duplicate guard, injected styles and React root |
| `src/app/App.tsx` | Screens, lifecycle, shortcuts, FAB, dialogs, operation orchestration, successful-export review |
| `src/components/FormatSelect.tsx` | Styled keyboard dropdown for file format and conversation filters, plus export progress |
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
| `src/adapters/base/chatgpt-history.ts` | Overlapping scroll capture of ChatGPT turns and lazy media, with viewport restoration |
| `src/adapters/base/native-actions.ts` | Shared scoped native menu/confirmation/outcome checks |
| `src/adapters/chatgpt/index.ts` | Runtime-gated ChatGPT archive/delete |
| `src/adapters/gemini/index.ts` | Runtime-gated Gemini delete; no archive |
| `src/markdown/messages.ts` | Shared visible provider message boundaries and roles for conversion/media/navigation |
| `src/markdown/attachments.ts` | Nested message attachments, safe file URLs, bounded decoded-image embedding and unavailable labels |
| `src/markdown/maps.ts` | Bounded PNG capture of readable map widgets and original map links |
| `src/markdown/media.ts` | Bounded asynchronous capture of referenced media/input bytes; strict offline failure |
| `src/operations/package.ts` | Token-aware asset localization, relative paths and final document rendering |
| `src/operations/resources.ts` | Markdown resource token rewriting, asset names and visible filename captions |
| `src/operations/archive.ts` | File-backed streaming ZIPs and bounded fallback parts |
| `src/operations/document.ts` | Markdown wrapper and allowlisted HTML, inline/linked image CSP and MIME |
| `src/operations/archive-navigation.ts` | Offline HTML reader layout, message cards and table of contents |
| `src/operations/archive-code.ts` | Static syntax highlighting and code block toolbar |
| `src/operations/archive-media.ts` | Media indexes, filename captions and saved ZIP assets without inline references |
| `src/operations/archive-reader.{css,js}` | Bundled HTML styles, local search snippets, clipboard, image viewer and reading progress |
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
| `dist/AI-Chat-Markdown-Manager.user.js` | Locally generated, ignored installable release |
| `AI-Chat-Markdown-Manager-v*.zip`, `SHA256SUMS-v*` | Locally generated release archives and root-relative integrity hashes; ignored by Git |
| `docs/screenshots/` | Verified local-fixture UI screenshots |
| `Save-Page-as-Markdown-Safari.user.js`, `README.txt` | Unchanged v1.2 provenance baseline |

Frontend and platform access are entirely in the injected browser application. There is no backend, private account API, database, authentication service or FFI layer. The YouTube module performs caption/watch requests; explicit embedded exports request exposed media/file URLs; chat loading uses native DOM links. Contracts live in `src/types/index.ts`; storage schema/defaults live in `src/storage/index.ts`. Node-only build logic must not enter the runtime graph.

Read `docs/ARCHITECTURE.md` for lifecycle details, `docs/PLATFORMS.md` for capability evidence, `docs/DESIGN_INVENTORY.md` for reference observations and `docs/VERIFICATION.md` for the boundaries of testing. Installation: `docs/INSTALL-SAFARI.md`, `docs/INSTALL-TAMPERMONKEY.md`. User guides: `README.md`, `README.ru.md`. License terms: `LICENSE*`, `THIRD-PARTY-NOTICES.md`.

Attachment regressions: `tests/unit/attachments.test.ts` and `tests/integration/attachments.spec.ts` (current download, batch ZIP and image-only navigation).

Offline regressions: `tests/unit/offline-export.test.ts`, `tests/integration/offline-export.spec.ts`; provider backup/cleanup gates in `tests/integration/native-actions.spec.ts`.

Separate-file ZIP regressions: `tests/unit/package.test.ts` and `tests/integration/asset-bundle.spec.ts` cover five providers, both formats, offline file://, virtual ChatGPT history above 64 MiB and numbered fallback parts.
