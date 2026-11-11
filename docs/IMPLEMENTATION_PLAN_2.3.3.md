# v2.3.3 — current provider DOM extraction

Standing user authorization: auto approve, build, commit and push.

1. Centralize visible message boundaries and role detection. Support both ChatGPT author-role and current content-search-unit markup, retain Gemini/Claude, recognize Grok test IDs and DeepSeek loaded messages.
2. Use the same boundaries for extraction, navigation identity and attachment/media scope. Exclude hidden/inert/sidebar/composer content; prefer the active conversation over unrelated main regions. Keep native mutation gates and provider capabilities unchanged.
3. Regress current ChatGPT markup with three main regions, mixed layouts, media-only messages and synthetic provider fixtures. Exercise HTML/Markdown embed choices, preview and ZIP exports; retain cleanup failure tests.
4. Inspect authenticated sites using Computer without mutations. Verify the installed updated build where available; record exact live versus fixture coverage and limitations.
5. Update compact docs, build v2.3.3, run lint/types/unit/browser checks, verify release integrity, commit only task files and push.

Status: Implemented and verified; authorized scoped commit/push follows. Live coverage and remaining boundaries are recorded in VERIFICATION.md.
