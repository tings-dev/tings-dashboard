# Room dashboard design interview

Status: completed decision history. The nighttime visibility decisions (Q14–Q15, Q25, Q33) and night preset in Q32 below were superseded on 2026-11-03: use separately configured dashboards with Home Assistant controlling switching; built-in night mode and its settings have been removed. Q1–Q39 and the design are accepted. The consolidated contract is in [dashboard-design.md](dashboard-design.md).

## Confirmed brief

- Echo Show devices running Lineage, using Home Assistant information.
- Beautiful, intuitive, uncluttered room-specific display.
- Time readable from approximately 2–3 metres.
- Room CO₂ reading with a distance-visible indicator and a configurable number of color thresholds.
- Room temperature, outside temperature, optionally weather.
- Upcoming events from one or multiple calendars, with starting-soon and in-progress modes.
- All features configurable and individually disableable; exact controls and interactions between hidden features remain open.
- Explore options first, document decisions, implement in stages later.

## Accepted decisions — round 1

- **Layout:** A — Quiet split is the baseline.
- **Optional features:** all features must be configurable and possible to disable per dashboard instance. In particular, some rooms will have no relevant calendar and others no CO₂ sensor. Round 2 settles the basic layout behavior when sections are disabled.
- **Attention hierarchy:** while enabled, the clock and CO₂ indicator retain their size and position when event modes change. Temperature readings remain visible during event focus.
- **Product boundary:** a Home Assistant custom card configured within Home Assistant.
- **Interaction:** essential information is available without touch. Optional taps provide sensor details and event dismissal; round 3 records the accepted dismissal behavior.
- **Device scope:** support Show 5 and Show 8, allowing fewer agenda entries on the smaller display rather than shrinking everything.

These decisions authorize design refinement and documentation, not production implementation.

## Accepted decisions — round 2

- **Disabled versus unavailable:** deliberately disabled sections release their space. Without calendars, center and enlarge the clock above the readings; without CO₂, remove its strip and reclaim the width. Temporarily unavailable sensors and an enabled but empty calendar retain their layout space.
- **Individual visibility:** independently hide the clock, date, room name, each reading, weather, and calendar. The CO₂ strip, numerical reading, and status label have separate switches. Disabling a feature preserves its configuration.
- **Configuration:** visual editor and YAML expose the same options. Include content, colors, labels, text sizes, column proportions, CO₂-strip width, and spacing, with sensible defaults and limits. Positioning follows the structured layout rather than arbitrary dragging.
- **CO₂ height:** configure a minimum and maximum independently of color thresholds. Height grows continuously and linearly between them; readings outside the range clamp the height but retain their actual numerical value.
- **CO₂ colors:** an ordered threshold list introduces successive colors and optional labels; the lowest band has its own color. Equality enters the new band. Threshold count is configurable.
- **Calendars:** merge selected calendars into a chronological agenda. Starting-soon and in-progress modes are independently switchable. Calendar source names/colors are optional. The starting-soon window is configurable with a provisional default of 30 minutes.
- **Readings and weather:** allow an ordered selection of sensors beyond temperature with custom labels. Weather is a separate optional compact icon/summary; outside temperature does not depend on enabling weather.
- **Appearance:** support both light and dark dashboards per instance. The quiet dark prototype is the default starting appearance, with configurable colors, typography, and clock/date formats. Language and formatting default to Home Assistant preferences with explicit overrides.
- **Nighttime visibility:** design night mode separately. Each section must have a setting to hide it at night, independently of its normal visibility; a calendar is one explicit use case. Round 3 records the accepted activation and presentation behavior.
- **Orientation:** landscape on both Show 5 and Show 8. Adapt spacing and agenda capacity while protecting clock readability; portrait is outside the initial layout scope.

## Accepted decisions — round 3, Q14–Q23

- **Q14 — Night activation:** allow either a schedule using Home Assistant's timezone, including intervals spanning midnight, or a selected Home Assistant on/off entity. Night mode stays off until configured. The user explicitly favors entity control so household automations can decide when night mode applies.
- **Q15 — Night presentation:** separate nighttime appearance settings initially use a muted dark theme and preserve daytime settings. Sections hidden at night release their space. Events and elevated CO₂ do not override nighttime visibility choices. Returning to daytime displays current information.
- **Q16 — Competing events:** ongoing events normally take priority over starting-soon events, with a configurable option to reverse this priority. Keep one main event stable and use a compact line for another ongoing or soon-starting event; do not automatically cycle between them. Round 4 settles tie-breaking.
- **Q17 — All-day events:** show all-day events in a compact separate agenda area without entering focus modes. Multi-day all-day events appear on each relevant day. Events with actual start/end times follow timed-event rules even across midnight.
- **Q18 — Duplicates:** merge occurrences whose title, start, and end match exactly across selected calendars, retaining their source identities. Different titles remain separate even when times match.
- **Q19 — Dismissal:** Done dismisses an in-progress occurrence only on this dashboard in this browser. Dismissal survives reload until the occurrence ends, supports undo, and never changes source calendars or other room displays. Round 4 settles edited-event handling.
- **Q20 — Agenda density:** configurable lookahead and maximum entry count, initially seven days. Display only what fits comfortably; cap titles at two lines and show a small overflow count such as “+3 more.” Do not automatically scroll or shrink text to fit more events.

- **Q21 — Missing/disconnected data:** unavailable sensors show “—” in their existing positions; unavailable CO₂ uses a neutral treatment. Distinguish calendar errors from empty calendars, mark retained calendar results as outdated, and do not present sensor values as current after their connection is lost. Round 4 settles partial calendar failure behavior.
- **Q22 — Sensor formatting:** use Home Assistant units and precision by default, with optional per-reading precision overrides and an explicitly selected outside-temperature source.
- **Q23 — Motion:** subtle transitions only; no pulsing alerts or automatically rotating content. Respect reduced-motion preferences and provide an option to disable transitions entirely.

## Design question

Which composition leaves the clock and CO₂ legible across the room while making event details and temperatures useful up close?

The accepted CO₂ treatment is a vertical indicator at the right edge: minimum at the bottom, maximum at the top, with continuous linear height and discrete configurable color bands. The default range and thresholds are accepted in round 4; colors and labels are accepted in round 5. Prototype readings and events are synthetic; threshold defaults are visualization settings, not health classifications.

## Layout studies

Open [the refined option-A prototype](../prototypes/dashboard-prototype.html) in a browser. It has no dependencies or Home Assistant connection. Switch appearances with the bottom controls or left/right arrows; choose room examples, event scenarios, and viewport sizes. Expand the settings for feature visibility, CO₂ value, strip width, clock size, and two/four reading examples. `?variant=dark` and `light` select appearances; `preset=no-calendar` and `preset=no-co2` demonstrate reduced content.

The [original A/B/C comparison](../prototypes/layout-comparison-prototype.html) is preserved as the source of the initial layout decision:

| Study | Composition | What it explores | Main trade-off |
| --- | --- | --- | --- |
| A — Quiet split | Large clock and readings left; agenda right; narrow CO₂ column | Stable places for all information, including during event focus | Agenda titles have limited width |
| B — Open horizon | Clock dominates the upper area; upcoming events form a bottom strip | A less dashboard-like, open composition | Only a few events fit; the horizontal reading order needs evaluation |
| C — Event poster | Clock and temperature stack left; large event title right; broad CO₂ column | Readable event focus and a more expressive air indicator | Event title and clock compete for attention; fewer upcoming items |

The refined study keeps enabled clock/readings in place across event modes. It demonstrates light and dark appearances, disabled sections reclaiming space, unavailable readings, partial calendar failure, a two-line title limit, and smaller-screen agenda capacity. The number and status label can be hidden independently of the CO₂ strip. Sensor taps and Done/Undo have local demonstrations; their real Home Assistant behavior and persistence are not implemented.

### Accepted visual decisions — round 5, Q32–Q36

- **Q32 — Palettes:** retain the study's evergreen dark (`#111917` background, `#f1eee6` primary text), warm-paper light (`#f4f0e7`, `#273b34`), and muted night (`#090e0d`, `#aeb6aa`) presets, with configurable overrides.
- **Q33 — Initial night visibility:** keep clock, date, and selected readings; hide room name, weather, calendars, and the CO₂ strip/number/status. Each section remains independently configurable. This is the accepted starting preset; all sections retain user-controlled nighttime visibility.
- **Q34 — CO₂ presentation:** default strip width 7% of the screen; subtle unlabeled threshold marks; optional number at the bottom and optional status beside the strip. Default band colors: `#8daea0`, `#c5c691`, `#d9b36f`, `#db8d64`, `#c96964`; Default labels: Low, Raised, Elevated, High, Very high.
- **Q35 — Small-screen hierarchy:** retain the demonstrated typography and spacing strategy: approximately 130px clock and 23px agenda titles at 800×480, with two normal agenda rows versus three at 1280×800 when the all-day entry is present. Notices and Undo consume space and may reduce this count. Counts are examples of fitting content, not fixed production limits. Titles stop at two lines; no automatic scrolling or rotation.
- **Q36 — Readings density:** support up to four displayed readings initially, using two rows for four readings. The study exposes two/four examples; production would support zero through four, with the count and ordering explicitly configured. The cap is validated in the editor rather than silently hiding excess readings.

Study controls demonstrate a 6–12% CO₂-strip width and 85–110% clock-size range. These are exploration ranges, not yet the final supported configuration limits. The default appearances were accepted in Q32–Q36; the exploratory tuning ranges were not independently approved.

## Existing implementation: reference, not requirements

Sources: `../echo-show-card/README.md`, `../echo-show-card/GLOSSARY.md`, `../echo-show-card/docs/dashboard-layout-design.md`, and the household Home Assistant dashboard. These are inspected as local files; no live services or devices are accessed.

- The earlier glossary fixes CO₂ to normal/warning/critical and a circle. The new glossary deliberately removes those shape/count constraints to match this brief.
- The existing card places selected sensor values beneath the clock and supports Home Assistant entity details on tap.
- Existing local layout checks cover 1280×800, 960×600, and 800×480. These are useful test sizes, not proof of the current device's CSS viewport or physical readability.
- Existing layout choices and household wiring should be considered during the interview; they do not automatically carry over.
- Home Assistant inventory includes both Show 5 and Show 8 devices on Lineage/Kiosk Satellite. Device scope is consequently a real design choice, not just a responsive-layout detail.
- Current code supports one calendar, a seven-day/five-event agenda, soon focus within one hour, and ongoing-event priority. Multiple calendars require a new selection and conflict policy.
- Current code permits sensor taps and local Done dismissal; the older household note's passive-only wording is no longer an accurate description of implemented interactions.

## Accepted decisions — round 4, Q24–Q31

- **Q24 — CO₂ starting preset:** reuse the study's 400–2000 ppm display range and thresholds at 800, 1000, 1400, and 1800 as editable visual starting values, without treating them as health guidance. Update the color band on each valid reading without added delays or hysteresis.
- **Q25 — Night control unavailable:** retain the last known day/night mode if the configured control entity becomes unavailable, including across reloads. If there is no known state yet, use night presentation until a valid state arrives. Show the control problem in the editor rather than making the bedroom display brighter.
- **Q26 — Focus ties and boundaries:** within the selected ongoing/soon priority, choose earliest start, then configured calendar order, then title. In-progress includes the start instant and excludes the end instant; starting-soon includes the configured window boundary. Changes to priority group, completion or dismissal may change focus; no timed rotation.
- **Q27 — Partial calendar failure:** continue using successful sources normally. Failed sources may retain visibly outdated agenda entries, but those entries do not newly enter focus. If an already focused occurrence loses all fresh source copies, return to the fresh selection or agenda and mark any retained entry as outdated.
- **Q28 — Edited dismissed occurrences:** an occurrence whose title or start/end changes becomes visible again. Unchanged occurrences stay dismissed until their end; dismissal applies to a merged occurrence across its duplicate sources on this dashboard/browser.
- **Q29 — Weather scope:** select a Home Assistant weather entity; show its current condition icon and text, with an optional single short forecast summary when available. No separate weather account or forecast charts in the first version. Outdoor temperature remains independently selected.
- **Q30 — Remaining layout combinations:** hiding the clock gives the agenda more space while readings stay grouped. If only readings remain, center them. If every element is hidden, show only the chosen background; configuration guidance remains available in the editor.
- **Q31 — New-card boundary:** develop the new custom card in tings-dashboard with a fresh configuration schema, keeping the existing echo-show-card available for comparison and rollback. Migration is a later explicit step, not an automatic conversion of existing dashboards.

## Decision tree

Rounds 1–6 are settled. The user explicitly accepted the design in Q39. See the consolidated design and implementation plan for the accepted contract and delivery stages. Physical viewport/placement and distance readability require device validation.

## Accepted final review — round 6, Q37–Q39

- **Q37 — Forecast summary:** default off; when enabled, show the next available future forecast period's time/date and condition. Omit an unavailable summary while keeping current weather visible.
- **Q38 — Engineering discretion:** exact configuration names, safe sizing limits, refresh intervals, and storage mechanics may be settled during implementation within the accepted behavior. Document and verify choices per stage; return material product changes to design review.
- **Q39 — Final design acceptance:** the user confirmed, “yes, the design is accepted,” including the consolidated specification and staged implementation plan. Implementation waits for a separate explicit request.

## Provisional implementation sequence

Not an approved plan; refine after the interview.

1. Layout, typography, clock, and representative synthetic states.
2. Room/outdoor readings and configurable CO₂ visualization.
3. Multi-calendar agenda and focus modes.
4. Configuration interface, empty/error states, accessibility, and device validation.

## Validation boundaries

Initial local Chromium exploration rendered all three layouts in upcoming, starting-soon, in-progress, long-title, and empty modes at the three study sizes, with no JavaScript errors. Default screenshots are saved alongside the prototype. Layout arrows update the URL, the CO₂ fill reaches zero at the example minimum, and the threshold selector changes the example palette. The prototype scales its composition and text for smaller viewports; this is not yet an accepted responsive strategy.

The refined option-A study instead lays out at the selected viewport dimensions and scales only its browser preview frame. Local Chromium checks covered 39 combinations of viewport, event scenario, and room preset with no JavaScript errors or measured content overflow. Clock geometry stayed fixed across the event scenarios. Smaller error/dismissal states reduce agenda capacity to reserve space for notices. Done/Undo, the synthetic reading dialog, CO₂ clamping, and feature visibility controls were exercised. Screenshots of light, dark, reduced-content, and 800×480 states are saved beside the HTML. These are prototype smoke checks, not production tests or evidence of on-device readability.

Desktop screenshots can reveal crowding and clipping; they cannot establish legibility at 2–3 metres or kiosk behavior on Lineage. Evaluate chosen options on the real device before accepting typography. Do not shrink all text to accommodate longer calendars: agree a deliberate content limit and overflow rule.

No separate ADR yet: continuing as a Home Assistant custom card follows the existing integration approach; the accepted decisions and remaining trade-offs are recorded here.
