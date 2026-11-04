# Module ownership

| Module | Owns | Allowed dependencies |
| --- | --- | --- |
| `src/types` | Stable interfaces and key function | No application implementation |
| `src/markdown` | Content conversion and Markdown metadata | Types, inherited local converter |
| `src/adapters` | Host DOM, identity, discovery, snapshot lifetime, native capability | Types, Markdown |
| `src/storage` | Preference defaults/migration, local persistence, privacy summaries | Types |
| `src/operations` | Sequential batches, abort, file/ZIP/clipboard handling | Types, bundled fflate |
| `src/utils` | Pure geometry and conversation query/selection | Types |
| `src/components` | Reusable controls and screen-level presentation | React, Lucide, types, storage settings types, pure utilities |
| `src/app` | User intent, adapter orchestration, state, confirmations, geometry effects | All browser modules above |
| `src/main.tsx` | Mount guard, Shadow DOM and CSS installation | React, app, styles |
| Build/config/scripts | Dependency locking, metadata, licensing, self-contained packaging | Node APIs, dev tools, release inputs |
| Tests | Fixture behavior, regression evidence, screenshots | Runtime modules for units; production dist for browser checks |

Dependency direction is mount → app → components/adapters/operations/storage/utilities → shared types. Adapters must not import React, UI state or storage preferences. The app passes export options and explicit stable IDs; adapters independently revalidate native identity. Operations receive jobs and report results; they do not query UI or invent capabilities. Presentation must not click native destructive controls directly.

No backend ownership exists. Host DOM is the only platform integration boundary; no private account APIs, authentication bypasses, cross-origin fetches or simulated conversation bodies. Native permission/verification belongs to adapters, explicit intent and confirmation to app, cancellation/results to operations. All three gates are required for any future mutation.

Keep inherited conversion isolated and attributed. No Node/build dependencies may leak into runtime. No source map or remote runtime import in dist. Unit tests own redacted fixtures; integration tests own a local fake host and actual downloaded artifacts. Production factories must never enable fixture-only destructive verification. Tests must never mutate real account history.

Update contracts and ADRs for changes spanning boundaries. See `API_CONTRACTS.md`, `DECISIONS.md` and `VERIFICATION.md`.
