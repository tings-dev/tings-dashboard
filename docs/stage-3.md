# Stage 3: multi-calendar agenda, focus, and Done/Undo

Stage 3 connects selected Home Assistant calendars to the dashboard. It merges duplicate occurrences, separates all-day entries, selects starting-soon/in-progress focus, handles partial failures, and persists local dismissals with Undo. The preview uses the same production code against mock calendar API responses. Automatic night activation remains stage 4; actual Home Assistant/device acceptance remains stage 5.

## Configure calendars

Select sources explicitly, enable the calendar section, and give each dashboard card its own stable `instance_id` when using Done/Undo. The visual editor includes source suggestions, add/remove/reorder controls, and **Generate new ID**. Cards created through HA's picker receive a generated ID in their stub configuration. YAML examples use illustrative entities and IDs; assign your own.

```yaml
type: custom:tings-dashboard
schema_version: 1
instance_id: living-room-display
calendar:
  sources:
    - entity: calendar.personal
      label: Personal
      color: '#8daea0'
      enabled: true
    - entity: calendar.family
      label: Family
      color: '#d9b36f'
      enabled: true
  lookahead_days: 7
  max_entries: 6
  max_all_day: 2
  soon_enabled: true
  soon_minutes: 30
  ongoing_enabled: true
  priority: ongoing
  dismiss: true
  show_names: true
  show_colors: true
features:
  calendar:
    enabled: true
    night: false
```

| Field | Default | Supported values and behavior |
| --- | --- | --- |
| `instance_id` | empty | 1–100 letters, digits, hyphens or underscores when set. Required if dismissal and calendar display are enabled with selected active sources. |
| `calendar.sources` | `[]` | Zero to sixteen ordered source mappings. Duplicate nonempty entity IDs are rejected, including disabled entries. |
| Source `entity` | empty | Explicit `calendar.*` ID; empty allows an unfinished source row. Missing entities are valid configuration but unavailable data. |
| Source `label` | empty | Literal custom name up to 100 characters; otherwise HA friendly name, then entity ID. |
| Source `color` | empty | Optional opaque six-digit hex color. Empty means no source dot. |
| Source `enabled` | `true` | Disabled sources retain settings but are not queried or included. |
| `calendar.lookahead_days` | `7` | Integer 1–31; rolling timed-event horizon of this many 24-hour periods. |
| `calendar.max_entries` | `6` | Integer 1–30; maximum timed agenda entries before available-height fitting. |
| `calendar.max_all_day` | `2` | Integer 0–10; maximum all-day date entries before fitting. Zero hides the all-day section. |
| `calendar.soon_enabled` | `true` | Enable starting-soon focus. |
| `calendar.soon_minutes` | `30` | Integer 0–1440; zero leaves no starting-soon interval. |
| `calendar.ongoing_enabled` | `true` | Enable in-progress focus. |
| `calendar.priority` | `ongoing` | `ongoing` or `soon`, preferred when both groups have eligible events. |
| `calendar.dismiss` | `true` | Show Done for focused ongoing events and Undo for live dismissals. Can be disabled to use calendars without an instance ID. |
| `calendar.show_names` | `true` | Show source names and name failed sources in the notice. |
| `calendar.show_colors` | `true` | Show configured source-color dots independently of names. |

The section's existing `features.calendar.enabled` / `night` switches still apply. Sources are shared between day/night presentations; hiding the section stops its retrieval. All fields are available in both the editor and YAML. Invalid drafts preserve the last valid display and other pending edits. Unknown properties, including properties inside sources, survive editing and YAML round trips.

## Retrieval and freshness

The adapter uses authenticated `hass.callApi('GET', 'calendars/<entity>?start=…&end=…')`. This is the calendar range endpoint documented by the [HA REST API](https://contributors.home-assistant.io/core/internals/rest-api/#other-integrations) and used by the [HA frontend calendar client](https://github.com/home-assistant/frontend/blob/dev/src/data/calendar.ts). Calendar entity attributes are not treated as an event list. No calendar service/write action is called.

Each selected available source is fetched independently, initially and every 60 seconds. Requests time out after 15 seconds. A source remains fresh for less than 120 seconds after its last successful response; an explicit failure or HA disconnection makes it outdated immediately. A successful source continues normally while another is slow or fails. Empty successful responses are different from unavailable sources.

Queries include date buffers: start is UTC midnight of the dashboard's current calendar date minus one day; end is UTC midnight of the horizon date plus two days. This includes date-only events when the dashboard and integration use different timezones. Display selection still enforces the exact rolling lookahead and excludes ended timed events. An ongoing timed event can begin before the query start because calendar ranges include overlapping events.

HA responses can use `start`/`end` strings or `{ dateTime: … }` / `{ date: … }` objects. Timed values require explicit UTC/offset timestamps, valid dates/times, and an end after the start. All-day dates keep their calendar-date semantics and exclusive end date. Ambiguous, missing or invalid event fields are not guessed. If a response contains malformed rows, valid rows remain available as outdated agenda data and that source is marked failed; the malformed rows cannot become current focus.

Labels, colors and ordering changes reuse existing results. Source, lookahead, timezone and connection changes invalidate relevant pending responses. A late response cannot overwrite a newer query, reintroduce a removed source, or restore focus after disconnection. Removing the card clears refresh/deadline timers. HA's `callApi` promise does not expose cancellation here, so an already-sent HTTP request may finish, but its result is ignored. Reconnection or showing a hidden section starts fresh retrieval.

## Agenda and focus rules

Occurrence identity is the exact title plus canonical start/end values and timed/all-day kind. Offset-equivalent timed timestamps merge; all-day dates are never converted into timed instants. Duplicate occurrences keep every source identity. Titles differing even in case or whitespace remain separate. Source event IDs are not used for merging because copies across calendars can have different IDs.

Timed agenda entries are chronological. Multi-day all-day occurrences produce a compact entry for every relevant date in the lookahead, beginning with today when already underway. All-day entries never take focus. Titles use at most two lines, source names may truncate, and full text remains accessible. No automatic scrolling or font shrinking is used to show more entries.

Focus selection follows these boundaries:

- Starting soon: `start - soon_minutes <= now < start`.
- In progress: `start <= now < end`.
- Consider only enabled focus modes and occurrences with at least one fresh source copy.
- Select the preferred group, then earliest start, configured calendar order, and title. Title ties use deterministic Unicode string order.
- Show one main occurrence and a compact line for the next eligible occurrence. No timed rotation.

Clock ticks re-evaluate boundaries and minute countdowns using actual current time. Source updates, settings, Done/Undo and storage changes also re-evaluate selection. Disabled focus modes leave their events in the agenda. Overnight timed events use the same rules, with date labels where needed. Calendar times use the clock's timezone, language and 12/24-hour preference.

Failed sources can retain cached rows marked **Outdated**. These rows cannot focus unless another selected source has a fresh identical occurrence. Old rows remain subject to end time, lookahead and dismissal filtering. Failure notices identify the failed sources when names are enabled; otherwise they show a count.

Available-height fitting reserves space for notices, controls and overflow counts. It removes trailing timed agenda rows, then trailing all-day rows as necessary. Focus retains its main event, compact secondary line and controls; all-day rows can give way to them, with an explicit all-day overflow count. In crowded focus states only gaps tighten, not text size. The left-hand clock/readings and CO₂ strip do not move when the calendar changes mode.

## Local Done and Undo

Done is available only for the currently focused in-progress occurrence. The handler checks current eligibility again, so a late tap cannot dismiss an event that has already ended or changed. A dismissal applies to the merged occurrence across all its duplicate sources and removes it from this dashboard's agenda/focus until its end. A title, start or end edit yields a new identity and is visible again.

Dismissals persist in `localStorage` under `tings-dashboard:dismissals:v1:<instance_id>`, scoped to the current HA origin and browser profile. The stored entries contain occurrence identity (including title/start/end), end time and dismissal order. Calendar payloads are not persisted. Expired entries are pruned during ticking, actions and reload. Undo restores the most recently dismissed, still-live occurrence; repeated Undo can restore earlier dismissals. It remains available through reload until the relevant occurrence expires.

Keep a card's ID unchanged across reloads and presentation edits. **Use a different ID for every independent card**, including cloned room dashboards. Changing the ID starts a different dismissal scope; it does not delete the old scope. Separate browsers/devices have separate storage even when their configuration IDs match. Storage events update another tab showing the same ID, and actions first incorporate that tab's latest stored entries.

Disabling the Done/Undo controls preserves existing dismissals until their expiry; it does not silently restore dismissed events. If browser storage is blocked or corrupt, the card keeps working with in-memory dismissal/Undo and an explicit storage notice. Persistence cannot be promised when the browser rejects storage writes. Successful later writes clear that notice. Nothing modifies source calendars.

## Preview, modules, and verification

Run `npm run preview`. Choose **Starting soon**, **In progress**, **One calendar failed**, **Duplicate event**, **No events**, or **Unavailable**, and use the source-disconnection control. The preview uses fixed example dates unless Live clock is selected. Its stable `preview-main` ID deliberately exercises persistence; Undo restores demo dismissals. Mock responses and example entity IDs remain outside the production bundle.

- `src/calendar-source.js`: per-source range retrieval, refresh/deadline lifecycle and response invalidation.
- `src/calendar-model.js`: normalization, identity, merging, freshness, eligibility, ordering, date expansion and localized presentation; no transport or DOM.
- `src/dismissals.js`: scoped local persistence, pruning, cross-tab action reconciliation and Undo.
- `src/card.js`: adapter lifecycle, clock-driven selection, storage events and guarded actions.
- `src/view.js` / `src/styles.js`: source identities, notices, controls and height fitting.

Run `npm run check`, `npm test`, and `npm run test:browser`. Browser checks require a compatible Chromium through Playwright or `TINGS_DASHBOARD_CHROMIUM`. The suite includes the earlier layout/sensor/weather checks plus exact calendar boundaries; duplicate/partial-failure behavior; date/offset/DST interpretation; lookahead and freshness limits; stale response rejection; persistence, expiry and isolation; editor/YAML validation; keyboard Done/Undo; long translated titles; and combined focus/failure/Undo layouts at the three supported preview sizes. Screenshots are generated under ignored `artifacts/stage3-{dark,light,night}-800.png`.

Actual HA calendar integration behavior, card editor hosting, Lineage rendering, and physical readability remain unverified. This stage does not deploy or change the household dashboard. Stage 4 adds automatic night activation; stage 5 performs packaging and device acceptance.
