# Implementation Plan: portable Gemini image previews (2.2.2)

## Evidence and goal
Authenticated Safari inspection found generated images nested in `single-image > .replace-fife-images-at-export > button > img`, with only temporary blob sources. The native three-dot menu offers Copy image and Download image, not a reusable URL. Gemini CSP blocks blob fetch; copying the already decoded image through canvas succeeds for all three images inspected.

The later uploaded-image example exposes an HTTPS image inside nested file-preview containers and a carousel. Traverse nested cards individually so neighboring file labels/links survive.

## Implementation
1. Preserve exposed HTTP image/file links. For loaded blob message images, copy decoded pixels into bounded inline PNG references without requests or clipboard access. Accept bounded raster data references, reject SVG and unsafe URLs, and retain explicit unavailable notes on failure.
2. Add unit guards and production-bundle single/batch download regressions using real blob images, Gemini's observed HTML shape and blocked network requests. Check independent settings and per-conversation content.
3. Update compact context, bilingual guides, privacy, release metadata and artifacts for v2.2.2. Run lint, types, unit/integration tests, build and checksums, then commit and push only task files.

## Boundaries
Canvas can be unavailable or tainted; unloaded/oversized images remain explicitly unavailable. Embedded images enlarge Markdown and require a renderer accepting raster data URLs. No private API, native attachment action, security-setting change, or invented file URL. Live evidence covers generated images and an uploaded image; uploaded-document controls remain fixture-tested and need a separate live example.

## Approval
Standing user authorization covers the plan, implementation, local build, commit and push.
