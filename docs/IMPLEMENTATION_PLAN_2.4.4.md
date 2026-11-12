# Large separate-file ZIP exports

## Goal

Save the loaded ChatGPT conversation, including older turns and their images, through the existing separate-file ZIP option in current, selected and bulk exports.

## Existing behavior

Media becomes Base64 Markdown, then the packager decodes it into an in-memory ZIP. Separate-file exports inherit the embedded mode's 64 MiB and 100-resource bounds. A single ChatGPT DOM snapshot can miss unmounted turns.

## Proposed approach

- Walk the ChatGPT conversation viewport in overlapping steps and capture live turn resources before they unmount. Restore the starting position and check conversation identity throughout.
- Send binary resources directly to the ZIP writer and retain only their relative paths and MIME types for Markdown and HTML.
- Use an origin-private temporary file for the archive. When a writable file is unavailable, deliver bounded, independently extractable ZIP parts with shared paths and extraction instructions.
- Preserve embedded limits, cancellation, incomplete-export diagnostics and backup-before-mutation requirements.

## Files and steps

Update the ChatGPT DOM adapter and shared media capture, then wire the packager into current, selected, bulk, preview and backup downloads. Update the compact project docs and bump the release version.

## Verification

Exercise lazy images, multiple scroll windows, archive integrity above 64 MiB and 100 entries, fallback parts and native backup safeguards. Run lint, typecheck, unit and browser tests, then build and commit.

## Risks and scope

ChatGPT can change its DOM or withhold some image sources. The exporter must surface capture failures and retain the original chat in those cases. Active widgets and SVG fidelity are outside this release.
