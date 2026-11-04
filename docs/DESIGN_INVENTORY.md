# Design inventory and inspection record

Date: 2026-11-04. Reference: https://economic-chat-flow-core.base44.app. Inspected in the user-requested in-app Browser before building the UI. Reference screenshots were captured in browser-tool output; repository screenshots show our actual bundle on a local fixture.

## Observed reference

| Component | Observed structure | Implementation |
| --- | --- | --- |
| Compact FAB | Small white circular file button, violet outline/icon, soft shadow, left-side placement | Independent draggable 44 px anchor; 40–48 px preference |
| Tools panel | Approximately 354 px, frosted white, rounded corners, file icon/header/platform subtitle, minimize | Home screen, isolated shadow styles, header navigation |
| Action row | Gray icon tile, compact bold title, muted subtitle, chevron or shortcut keycap | Reusable ActionRow + Lucide |
| Grouping | Uppercase THIS CHAT / LIBRARY labels, separator lines | Home grouping with matching spacing and hierarchy |
| Footer | Green local-processing badge; Activity and Hide controls | Local badge, activity screen, dismiss |
| Conversation panel | Wider panel, back/header/count, search, platform/status/date/sort controls | 550 px max panel, responsive filters |
| Selection | Checkboxes, select/invert/clear links, count summary, row menu and bulk footer | Stable ID selection, select visible/matching, 24-row pagination |
| Conversation row | Platform tile, title, secondary metadata, status badge, overflow menu | Partial/unknown states remain explicit |
| Settings | Approximately 444 px; grouped cards for appearance, floating controls, Markdown and bulk/privacy | Settings component with validated persistent preferences |
| Theme and motion | Light neutral surfaces, subtle violet and mint accents, short transitions | System font, light/dark variables, CSS motion/reduced motion |

Reference interaction included home navigation, conversation selection/filtering, row menu and settings controls. The reference's demo data was used only to understand design, never imported as real user conversations.

## Inspection limits

Automatic approval review rejected clicks on the reference's **Delete selected** and **Export all conversations** actions because their effects on the external application were not established as safe. The clicks were not executed or bypassed. Consequently, their confirmation, progress and completion dialogs were not visually verified. The implemented typed confirmations, per-item progress, cancellation, backup distinction and final reports follow the user's functional specification; their details are not claimed to have been observed in Base44.

No exact responsive or animation-timing equivalence is claimed. The implementation adapts to narrower screens and uses functional partial-data explanations. Native archive/delete capabilities follow real adapter evidence rather than the reference's available demo buttons.

## Reusable states in this project

- FAB: compact, hover/focus, pointer drag, drag locked, active, hidden, restored, reclamped.
- Navigation: home, conversations, export, archive, settings, activity; back/minimize.
- Conversations: scanning/ready, empty/filter-empty, selected, partial, unknown status/date, current, cached snapshot, unavailable content, paginated, menu open.
- Preview: plain-text Markdown dialog; errors for unloaded content.
- Confirmation: exact identities, irreversible warning, invalid/valid phrase, disabled repeated start; production native capabilities disabled.
- Batch: idle, scanning, ready, exporting, archiving, deleting, completed, partially_completed, failed, cancelled.
- Feedback: current/total/counts/percentage, per-item errors, report download, safe export retry, non-blocking dismissible toast.
- Preferences: light/dark/system, reduced motion, en/ru, storage denied, reset.

## Visual QA

Production bundle screenshots: [home](screenshots/manager.png), [conversations](screenshots/conversations.png), [mobile WebKit](screenshots/mobile.png). Desktop is 1280×720 CSS pixels; iPhone 13 emulation is 390×664 CSS pixels at device scale 3. Screenshots disable animation through reduced-motion emulation for settled capture. They were visually reviewed for panel geometry, text, selection, footer and narrow-screen layering. See [verification](VERIFICATION.md) for the distinction between fixtures and live platforms.
