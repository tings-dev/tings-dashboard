# Dashboard implementation plan

Status: accepted in Q39. Stage 1 was explicitly requested and is implemented locally. Stages 2–5 remain pending and require separate requests. See [stage-1 notes](stage-1.md) for the actual configuration, verification, and limitations.

Implement the [dashboard design](dashboard-design.md) one stage at a time when requested. Each stage should produce a usable, reviewable increment with its configuration controls and matching documentation. Do not postpone all configuration, error handling, or accessibility work until the end.

## Stage 1 — Card foundation, layout, and appearance

Completed locally: standalone custom-card build, locale-aware live clock/date, accepted appearance presets, optional-section/day-night rendering, development fixtures, and shared visual-editor/YAML configuration. Verification: 20 unit tests and browser checks covering 63 theme/layout/viewport combinations, focus stability, tuning extremes, editor drafts, round trips, and lifecycle. Actual Home Assistant hosting and on-device checks remain unverified.

Create the new custom card and configuration foundation in `info-dashboard`. Implement the clock, date, room name, accepted appearance presets, and structured layout with independently optional sections. Supply a development preview with representative synthetic states. Establish editor/YAML round trips and preserve disabled settings.

Implement layout rendering for day/night visibility as explicit state, leaving live night activation to stage 4. Validate supported typography, spacing, column proportions, and CO₂-strip sizing ranges against the intended viewports. Keep discarded A/B/C study code separate from production code.

Acceptance:

- Full, no-calendar, no-CO₂, clock-only, readings-only, calendar-only, and all-hidden configurations have deliberate layouts.
- Synthetic agenda/focus changes do not move or resize enabled clock/CO₂ regions.
- Default dark, light, and night appearances match the accepted studies closely.
- Locale/time format behavior and timezone boundaries have focused checks.
- Initial editor fields match YAML behavior; invalid drafts preserve existing settings.

## Stage 2 — Room readings, CO₂, and weather

Connect explicitly selected entities. Implement zero through four ordered readings, individual labels and visibility, units/precision handling, native entity-details actions, CO₂ height/color rules, and weather condition display. Add the optional forecast summary according to accepted Q37.

Expose the source, bands, range, color, visibility, label, and appearance settings in the visual editor and YAML as the features arrive.

Acceptance:

- Exact threshold equality, arbitrary ordered band counts, clamping, and unavailable readings follow the contract.
- Disconnected readings retain their position without appearing current; unavailable CO₂ is neutral.
- Four readings fit without disturbing calendar mode stability. More than four is a clear configuration error.
- CO₂ strip, number, status, and marks can be hidden independently, including at night.
- Default text contrast remains usable at low, intermediate, and full indicator heights in each theme.
- Native sensor detail actions work with keyboard and touch; verify actual Home Assistant behavior separately from synthetic previews.
- Missing forecast support leaves current weather usable. Outside temperature works independently.

## Stage 3 — Multi-calendar agenda and focus

Retrieve event ranges from the selected calendars. Keep source retrieval/freshness separate from event merging, eligibility, ordering, and display selection so those rules can be exercised deterministically. Implement all-day display, agenda capacity/overflow, starting-soon and in-progress modes, source identities, and partial-failure handling.

Implement local Done/Undo persistence scoped to one dashboard instance in one browser. Confirm the available event data and suitable occurrence identity during integration; do not assume prototype fields are the complete Home Assistant API contract.

Acceptance:

- Start/end/soon boundaries, midnight, relevant timezone changes, overlap priority, and tie-breaking are verified with fixed-time examples.
- Matching occurrences merge without losing their source identities; a fresh source copy remains eligible when another source fails.
- Stale events never take focus or reappear after their end. Empty and unavailable sources are visibly different.
- Done survives reload until end, supports Undo, does not cross dashboard instances, and does not modify calendar data.
- A title/start/end edit makes a dismissed occurrence visible again.
- Long titles, all-day entries, notices, and Undo reduce capacity appropriately; no automatic scrolling or shrinking to fit more entries.
- Requests, timers, and subscriptions are cleaned up when the card is removed; obsolete responses cannot overwrite newer selections.

## Stage 4 — Live night activation

Connect the approved visibility/appearance rendering to either a schedule or an on/off entity. Persist last known entity-controlled mode per dashboard instance. Apply the accepted initial night preset while preserving user overrides and daytime settings.

Acceptance:

- Schedules spanning midnight work in Home Assistant's timezone; check timezone/clock changes explicitly.
- Unavailable entity control retains the last known mode through reload. No prior state defaults to night until a valid state arrives.
- Globally disabled features stay disabled; night-hidden sections reclaim space.
- Events and CO₂ levels never override night visibility.
- Returning to day mode presents current data without replaying old focus state.
- Editing night settings does not erase day settings or entity selections.

## Stage 5 — Configuration audit, packaging, and device acceptance

Audit the complete editor and YAML contract, labels, localization, supported tuning ranges, touch/keyboard access, contrast, and reduced motion. Produce installation/configuration documentation and the chosen distribution artifact. Verify the packaging requirements against current official documentation during implementation.

Acceptance:

- Every supported setting is available in both editor and YAML, with clear defaults and validation.
- Default and valid extreme configurations fit the supported viewports; full event titles remain accessible when visually truncated.
- Reconnection, partial source failure, reload, and dashboard navigation do not leave broken state or duplicate background work.
- Verify actual kiosk CSS viewport, browser behavior, and a representative full/reduced/night layout on both device sizes.
- Check clock and CO₂ readability from approximately 2–3 metres, near-view text, and nighttime appearance on the physical screens.
- Record any remaining device limitations rather than claiming desktop preview checks prove device acceptance.

Migration is a later explicit action: select a room, apply its reviewed entity/calendar choices, and retain the old card/dashboard as a rollback option. This plan does not authorize modifying the existing Home Assistant configuration or deploying to devices.

## Delivery discipline

Use focused rule tests where behavior can regress, layout/browser checks where visual behavior matters, and real-device checks for physical/kiosk claims. Avoid tests that merely mirror markup or implementation details. Record changes, verification, and unresolved limitations with each stage. A material change to the accepted product behavior returns to design review; implementation details within the agreed contract follow accepted Q38.
