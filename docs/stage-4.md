# Stage 4: live night activation

Night activation now connects the existing independent night palette and section visibility to a schedule or a selected on/off entity. Activation defaults to off. No Home Assistant services, household configuration changes, or device backlight controls are used.

## Configuration

Entity control is intended for household automations. Set a stable, unique dashboard ID, select **On/off entity** in **Night activation**, and choose an entity whose raw state is `on` or `off`:

```yaml
type: custom:tings-dashboard
instance_id: bedroom-display
night:
  mode: entity
  entity: input_boolean.bedroom_night
```

`on` activates night; `off` activates day. Missing, unknown, unavailable, unexpected states and a disconnected HA connection retain the last known mode. Without a known mode, the card uses night appearance. The editor shows a localized diagnostic when control is unavailable, without adding a notice to the room display.

Alternatively, configure a daily wall-clock schedule:

```yaml
type: custom:tings-dashboard
night:
  mode: schedule
  start: '22:00'
  end: '07:00'
```

| Setting | Default | Contract |
| --- | --- | --- |
| `night.mode` | `off` | `off`, `schedule`, or `entity`. Off leaves the normal day presentation active. |
| `night.entity` | empty | Any explicit entity ID with raw `on`/`off` states; the editor suggests binary-state entities. An empty selection is unavailable control. |
| `night.start` | `22:00` | Strict `HH:mm`, 00:00–23:59, inclusive start. |
| `night.end` | `07:00` | Strict `HH:mm`, exclusive end; must differ from start. |
| `instance_id` | empty | Required in entity mode; stable, unique per independent dashboard card. |

All fields are shared by YAML and the visual editor. Inactive schedule/entity settings are retained and validated, and invalid drafts preserve the last valid card. Switching modes, editing night colors or hiding night sections preserves daytime settings, readings and source selections.

Schedules always use `hass.config.time_zone`, independently of the displayed clock's `time_zone` override and HA's local/server display preference. Missing/invalid HA timezone uses night presentation with an editor diagnostic until valid configuration arrives. Overnight and same-day intervals work. DST repeated minutes have the same wall-clock eligibility both times; skipped boundaries take effect when the clock next enters the interval. Equal endpoints are rejected to avoid an ambiguous all-day schedule.

Ticks use actual current time rather than accumulating elapsed intervals, so forward/backward clock changes re-evaluate directly. Visible cards check each second. Hidden documents with scheduled activation request checks every 30 seconds; browsers can throttle or suspend background pages. Visibility restoration and reconnection re-evaluate immediately. Removing a card clears its timer and source work; reattaching reloads saved entity state and re-evaluates activation.

## Persistence and presentation

Last known entity mode is saved in `localStorage` under `tings-dashboard:night:v1:<instance_id>:<entity_id>`, containing only a version and boolean. It is isolated by HA origin, browser profile, dashboard ID and selected entity. Changing ID or entity selects a different scope and preserves the old one. Reload and same-origin storage events read that scope; a currently valid live entity state takes precedence. No calendar titles, readings or entity payloads are stored here.

Blocked storage retains the last known mode in memory; reload persistence depends on browser storage being available. A new instance with blocked, missing or corrupt storage and no valid entity state uses night. Valid entity updates retry failed writes. Clearing stored state while the control is unavailable resets to the initial night fallback.

The initial night preset retains clock, date and globally enabled selected readings. Room name, weather, calendar and all CO₂ components are hidden. Per-section and per-reading night switches and night palette overrides remain user controlled. Global disable always wins, hidden sections reclaim space, and events/CO₂ levels cannot override visibility. Returning to day refreshes hidden calendar/forecast sources and computes focus against current time; ended cached events cannot replay.

The transport reads the [HA frontend hass object](https://contributors.home-assistant.io/frontend/reference/hass-object/) and exact raw states described by [HA state documentation](https://www.home-assistant.io/docs/configuration/state_object/). It does not translate localized entity labels into control states.

## Preview and verification

Run `npm run preview`. Configure `input_boolean.preview_night` through the editor or YAML, then use **Night entity** to choose Off, On or Unavailable. **Fixed instant** accepts an offset/UTC ISO timestamp and overrides the example/Live clock; clear it to restore those controls. The Appearance selector remains a manual study control only when automatic activation is off.

`npm run check`, `npm test`, and `npm run test:browser` cover schedule endpoints, midnight, HA versus display timezone, timezone changes, repeated/skipped DST minutes, clock jumps, unavailable/disconnected control, persistence and isolation, corrupt/blocked storage, editor diagnostics, automatic layouts at all three preview sizes, current calendar recovery and independent settings. The browser suite uses the production card and synthetic HA responses.

Actual Home Assistant hosting, kiosk/device behavior and physical nighttime readability remain unverified. Stage 5 packaging and device acceptance remain pending. This stage does not deploy the card or migrate an existing dashboard.
