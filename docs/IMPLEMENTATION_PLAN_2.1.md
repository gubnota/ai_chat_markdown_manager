# v2.1 implementation plan

Date: 2026-11-06. Status: Implemented and verified; plan and push approved in advance by the user.

1. Automatically reveal another 24 matching rows near the list bottom; preserve selection and filters.
2. Sequentially open discovered ChatGPT, Gemini and Claude conversations through their native SPA links. Wait for changed, settled message content and verify route identity before extraction. Never silently download another conversation or allow a full-page reload to destroy a batch. Restore the starting conversation after success, cancellation or errors. Retain explicit failures for unavailable links/content and partial-history warnings.
3. Automatically discover caption tracks when the panel opens and refresh on YouTube video navigation. Add discovery from the current video's player data and public timedtext URLs, language/translation selection, JSON3/XML conversion to TXT/VTT, and pasted/file-import fallback. Automatically reuse fresh matching video-page caption request parameters when available. Preserve signed URL parameters, validate endpoints/video identity and reject empty/error responses. No private API, remote code, telemetry or credential storage.
4. Add focused converter tests and production-bundle browser tests covering pagination, all three chat platforms, delayed content, batch cancellation/restoration, languages, signed URLs and caption downloads.
5. Update compact memory, guides and release artifacts; run lint, types, unit/browser tests and local build. Keep `.DS_Store` ignored. Commit the scoped work and push.

Constraints: native archive/delete capability gates remain in force; ZIP backup uses the improved exporter. Loading a conversation can mark it read. Platform-loaded/virtualized history can still be partial. YouTube access depends on captions and browser/site permissions; unsupported responses produce an actionable error and import fallback.
