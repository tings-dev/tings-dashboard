# Room information dashboard

Status: accepted. The user accepted Q1–Q39, the consolidated design, and the staged implementation plan. Stage 1 was subsequently requested and is implemented locally; see [stage-1 notes](stage-1.md). Later stages wait for separate requests.

Build a configurable Home Assistant custom card for landscape Echo Show 5 and Show 8 devices running Lineage. It should communicate time and room CO₂ from approximately 2–3 metres, with temperatures, weather, and calendar details available at a closer glance. A room without a calendar or a CO₂ sensor must feel deliberately designed, not incomplete.

The [interview record](design-interview.md) preserves the decisions and alternatives. The [glossary](../GLOSSARY.md) defines the domain terms. The [implementation plan](implementation-plan.md) splits delivery into reviewable stages.

## 1. Visual composition

Use option A, **Quiet split**: clock and selected readings on the left, calendar on the right, and a full-height CO₂ strip along the right edge. Use typography, whitespace, and a subtle column divider rather than separate bordered cards.

The enabled clock and CO₂ indicator retain their position and size across upcoming, starting-soon, and in-progress event modes. Readings remain visible. Essential information requires no touch; optional sensor taps open Home Assistant details, and an ongoing event offers Done/Undo.

At 800×480, the accepted study has an approximately 130px clock and 23px agenda titles. A typical agenda with an all-day entry fits two timed entries, versus three at 1280×800. These counts illustrate available capacity, not hardcoded limits: long titles, notices, and Undo may reduce the count. Protect readability rather than shrinking everything. Actual device CSS viewports and physical distance readability still require validation.

### Optional content and layout

Every feature is configurable and independently disableable, preserving its settings when disabled. Features include the room name, clock, date, each sensor reading, weather, calendar, CO₂ strip, CO₂ number, CO₂ status label, and threshold marks. The CO₂ strip, number, and status do not depend on one another being visible.

| Configuration | Result |
| --- | --- |
| Calendar disabled | Reclaim its column; center and enlarge the clock above readings |
| CO₂ strip disabled | Reclaim the strip width; independently enabled CO₂ number/status remain available |
| Clock disabled | Give the calendar more space and keep readings grouped |
| Only readings enabled | Center the readings |
| Every feature hidden | Show only the chosen background; configuration guidance belongs in the editor |
| Enabled calendar has no events | Retain its space and show an explicit empty state |
| Enabled sensor temporarily unavailable | Retain its position and label, show “—” |

Layout reflows on configuration or day/night visibility changes. It does not reflow simply because live data becomes empty or unavailable. Disabled calendar focus modes do not disable the calendar feature itself.

### Appearance presets

Each dashboard instance selects its own appearance and overrides. Day and night settings are independent.

| Preset | Background | Primary text | Intended appearance |
| --- | --- | --- | --- |
| Evergreen dark | `#111917` | `#f1eee6` | Quiet dark default |
| Warm-paper light | `#f4f0e7` | `#273b34` | Warm light display |
| Muted night | `#090e0d` | `#aeb6aa` | Subdued nighttime display |

Colors, labels, font sizes, column proportions, strip width, and spacing are configurable within supported bounds. Positioning follows the layout, with no freely draggable elements. Language and formatting follow Home Assistant preferences by default, with explicit language and clock/date format overrides.

Subtle transitions are optional. Respect reduced-motion preferences. Do not pulse alerts, rotate events automatically, or automatically scroll the agenda.

## 2. CO₂

Select the CO₂ source explicitly. It drives the visual indicator independently of any separately selected sensor reading.

### Height

Default range: **400–2000 ppm**. The minimum is the bottom of the screen and the maximum is the top. Growth is continuous and linear:

`height fraction = clamp((reading - minimum) / (maximum - minimum), 0, 1)`

Values outside the range retain their actual numerical value while the height stops at its nearest limit. The range is independent of the threshold list. Minimum must be smaller than maximum.

### Color bands

Threshold count is configurable. Each threshold starts a new color band and may have a label; the band below the first threshold also has its own color and optional label. Equality enters the new band. Use the actual reading, not its rounded display value, to determine the band.

| Reading, ppm | Default label | Default color |
| --- | --- | --- |
| Below 800 | Low | `#8daea0` |
| 800 to below 1000 | Raised | `#c5c691` |
| 1000 to below 1400 | Elevated | `#d9b36f` |
| 1400 to below 1800 | High | `#db8d64` |
| 1800 and above | Very high | `#c96964` |

These are editable visualization defaults, not health classifications. Update the band on each valid reading without additional delay or hysteresis.

Default strip width is **7% of the screen**. Show subtle unlabeled threshold marks, a small numerical reading near the bottom, and a status beside the strip by default. Each can be hidden. When the strip is hidden, independently enabled number/status need an appropriate place among the remaining content.

Unavailable or disconnected CO₂ is neutral and explicitly unavailable; it is never represented as a low/normal reading. Retain the strip's allocated space. When available, the combination of height, optional text, and number conveys more than color alone. Verify text contrast at every band and fill height during implementation.

## 3. Sensor readings and weather

Support **zero to four** explicitly selected numerical readings in a configurable order, with individual visibility, nighttime visibility, and optional custom labels. Four readings use two rows. More than four is a configuration error, never silently truncated.

Readings can include room temperature, outside temperature, humidity, or other numerical sensors. Do not infer a room or outside source. Units and precision follow Home Assistant by default; allow a per-reading precision override. A missing/unusable reading shows “—” while preserving its label and position. Do not show disconnected readings as current.

Tapping a reading opens that entity's Home Assistant details. The prototype's dialog is only a demonstration. Availability of native details/history must be verified during implementation.

Weather uses an explicitly selected Home Assistant weather entity. Show its current condition icon and short description, plus an independently optional short forecast summary when available. No separate weather account or forecast charts are part of the first version. Outside temperature remains independently selectable without enabling weather.

The forecast summary defaults to off. When enabled, show the next available future forecast period's time/date and condition, such as “18:00 · Rain” or “Tomorrow · Cloudy.” If suitable forecast data is unavailable, omit the summary and retain the current-condition display. Do not infer narrative predictions from insufficient data.

## 4. Calendars

### Agenda and sources

Merge one or more selected calendars into a chronological agenda. The lookahead defaults to **seven days** and is configurable. Provide a configurable maximum entry count, while displaying only the entries that fit comfortably. Titles occupy at most two lines; indicate omitted entries with a count such as “+3 more.” No automatic scrolling or text shrinking to increase capacity.

Calendar source names and colors are optional. Merge occurrences with exactly matching titles, starts, and ends across selected calendars, retaining their source identities. Different titles remain separate even if their times match. Timed timestamps require consistent interpretation before comparison; all-day dates retain their date semantics.

All-day entries have a compact separate area and never enter focus modes. Multi-day all-day entries appear on every relevant day. Timed events spanning midnight follow the usual timed-event rules.

### Focus modes and selection

Starting-soon and in-progress modes are independently enableable. The starting-soon window defaults to **30 minutes** and is configurable.

- Starting soon: `start - window <= now < start`.
- In progress: `start <= now < end`.
- Ongoing-first is the default priority; soon-first is configurable.
- Within the selected priority group, sort by earliest start, then configured calendar order, then title.
- Keep one main event, with a compact line for another ongoing/starting-soon event. Do not cycle on a timer.
- Recompute when time boundaries, source data, dismissal, or configuration change. Stability means no gratuitous rotation or layout movement, not pinning an event after it becomes ineligible.

### Done and Undo

Done dismisses the focused in-progress occurrence only on this dashboard in this browser. It survives reload until the occurrence ends, supports Undo, and affects a merged occurrence across its duplicate sources. Other room displays and source calendars are unaffected.

A change to the occurrence's title, start, or end makes it visible again. Unchanged occurrences remain dismissed until their end. Scope persistent state to a stable dashboard instance so unrelated cards do not share dismissals.

### Unavailable sources

Distinguish an empty calendar from a failed calendar. Successfully refreshed sources continue normally if another fails. A failed source may retain old agenda entries marked outdated; those entries cannot take focus. If the focused occurrence loses all fresh source copies, select a fresh eligible event or return to the agenda.

Cached copies must not make ended events eligible again or bypass the configured lookahead. If a merged occurrence still has a fresh copy from another source, that fresh copy remains eligible. Label connection problems without replacing the whole dashboard with an error screen.

## 5. Night mode

Night mode stays off until configured. Select either a schedule in Home Assistant's timezone, including intervals crossing midnight, or a Home Assistant on/off entity. Entity control is the preferred household setup, allowing automations to decide when night mode applies.

Every feature has nighttime visibility independent of its daytime settings. A globally disabled feature remains disabled at night. Night-hidden content releases its space. Events or elevated CO₂ do not override these choices. Returning to daytime uses current data.

The initial night preset keeps **clock, date, and selected readings** and hides room name, weather, calendar, and CO₂ strip/number/status. Each can be changed. Night appearance starts with the muted-night theme and preserves daytime appearance settings.

If the controlling entity becomes unavailable, retain the last known mode, including after a reload. With no prior state, use night presentation until a valid state arrives. Surface the control problem in the editor. Device backlight control is separate from the card's appearance and is not part of this implementation.

## 6. Configuration and implementation boundaries

Develop a new custom card in this repository with its own configuration. Keep the existing `echo-show-card` available for comparison and rollback. Migrating individual dashboards is a later explicit action; do not automatically rewrite existing configuration.

The visual editor and YAML must expose the same supported options. Keep household entity selections out of reusable defaults. Preserve disabled settings and separate normal visibility from nighttime visibility. Group controls by the content they affect, with clearly identified appearance and night settings.

Validation must reject invalid input with actionable field messages: examples include a reversed indicator range, repeated/unsorted thresholds, non-finite numeric values, unusable colors, and more than four readings. Do not silently ignore requested readings or reinterpret invalid configuration as valid. Invalid drafts must not erase existing settings.

### Delegated engineering details — accepted Q38

Choose exact configuration key names, module boundaries, safe numerical tuning limits, refresh/retry timing, and storage details during each implementation stage. Preserve the accepted visible behavior. Document the chosen defaults and validate editor/YAML parity, data freshness, instance isolation, and layout fit. A choice that would alter the accepted behavior returns to design review.

The study's 6–12% strip-width and 85–110% clock-size controls are exploratory ranges, not a promise that every combination fits every viewport. Determine supported ranges through layout checks. Clock/day-night transitions must preserve the intended hierarchy; no tuning combination may silently hide essential configured content.

Accessibility work belongs in the relevant stage: clear labels, keyboard-operable controls, visible focus, usable touch targets, textual status equivalents, two-line overflow with access to full titles, and contrast checks for default palettes. Reduced-motion behavior is already an accepted requirement. Do not claim the prototype itself establishes production accessibility compliance.

## 7. Design artifacts and evidence

Open the [refined option-A study](../prototypes/dashboard-prototype.html) directly in a browser; it uses synthetic data and no Home Assistant connection. The [original comparison](../prototypes/layout-comparison-prototype.html) preserves the rejected layouts and the starting design question.

| Example | Snapshot |
| --- | --- |
| Dark / light / night | [Dark](../prototypes/a-dark.png), [light](../prototypes/a-light.png), [night](../prototypes/a-night.png) |
| Reduced content | [No calendar](../prototypes/a-no-calendar.png), [no CO₂](../prototypes/a-no-co2.png) |
| 800×480 | [Agenda](../prototypes/a-small.png), [focus](../prototypes/a-small-focus.png), [four readings](../prototypes/a-small-four-readings.png), [disconnected](../prototypes/a-small-offline.png) |

Local Chromium smoke checks covered 39 combinations of viewport, event scenario, and room preset, with no JavaScript errors or measured content overflow. Clock geometry stayed fixed across event scenarios. Done/Undo, a synthetic reading dialog, CO₂ clamping, and night visibility were exercised. A follow-up check confirmed unavailable readings retain their geometry and four readings leave space for the clock. These are prototype checks, not production tests.

Synthetic test sizes are 1280×800, 960×600, and 800×480. They do not establish actual kiosk CSS viewports, device brightness, or readability at 2–3 metres. Prototype state is in memory; persistence, automatic scheduling, real forecast data, and actual calendar retrieval are not implemented. Production code should be built around the approved contract rather than treating the disposable study as a finished card.

## 8. Final acceptance — Q37–Q39

All three final review items are accepted, completing the design interview. Earlier decisions Q1–Q36 remain settled.

- **Q37 — Forecast summary:** defaults to off. When enabled, show the next available future forecast period's time/date plus condition, for example “18:00 · Rain” or “Tomorrow · Cloudy.” Omit the summary if the entity provides no suitable forecast; keep the current-condition display. Do not invent narrative predictions such as “rain after 18:00” from insufficient data.
- **Q38 — Engineering discretion:** delegate the implementation details listed in section 6 within the accepted behavior, documenting and verifying choices per stage. Return material product changes to design review.
- **Q39 — Shared understanding and sequence:** the user explicitly confirmed that “the design is accepted,” including this consolidated specification and the staged [implementation plan](implementation-plan.md). Design acceptance alone did not authorize implementation; the later stage-1 request supplied that authorization.
