# Stage 2: room readings, CO₂, and weather

This document records stage 2. Calendar integration and persistent Done/Undo have since been implemented; see [stage 3](stage-3.md).

Stage 2 connects the accepted layout to explicitly selected Home Assistant entities. It includes ordered readings, sensor details actions, the configurable CO₂ strip and bands, current weather, and an optional forecast. The visual editor and YAML use the same validation. Calendar integration is stage 3. Existing Home Assistant configuration and devices have not been changed.

## Try it

Run `npm run preview` and open <http://127.0.0.1:8765>. The preview now supplies mock HA entity states to the real adapters. Change CO₂, choose online/disconnected/missing sources, or enable the forecast in the editor. Calendar events remain synthetic layout fixtures. Sensor taps demonstrate the `hass-more-info` event in a preview dialog; actual HA supplies its own entity-details dialog.

**Remove synthetic data** clears mock entities and calendar fixtures; configured readings retain their slots with dashes. The preview's two/four-reading selector applies example source lists; ordinary editor changes preserve selected sources.

Build with `npm run build`. The standalone artifact remains `dist/tings-dashboard.js`, with no runtime package dependencies. Schema version remains `1`; stage-1 configurations still work and have no sources selected by default.

## Example configuration

Replace these illustrative entity IDs with your own. Source selection and section visibility are separate: selecting a source does not enable a hidden feature.

```yaml
type: custom:tings-dashboard
schema_version: 1
room_name: Living room
readings:
  - entity: sensor.room_temperature
    label: In this room
    precision: auto
    enabled: true
  - entity: sensor.outside_temperature
    label: Outside
    precision: 0
    enabled: true
co2:
  entity: sensor.room_co2
  minimum: 400
  maximum: 2000
  base_color: '#8daea0'
  base_label: Low
  thresholds:
    - { value: 800, color: '#c5c691', label: Raised }
    - { value: 1000, color: '#d9b36f', label: Elevated }
    - { value: 1400, color: '#db8d64', label: High }
    - { value: 1800, color: '#c96964', label: Very high }
weather:
  entity: weather.home
  forecast: false
  forecast_type: auto
features:
  readings: { enabled: true }
  weather: { enabled: true }
  co2_bar: { enabled: true }
  co2_value: { enabled: true }
  co2_status: { enabled: true }
  co2_marks: { enabled: true }
```

Clock, appearance, layout, and group visibility options remain as documented in [stage 1](stage-1.md). Source fields accept an empty string for an unconfigured source, or a matching `sensor.*` / `weather.*` entity ID. The editor offers matching entity suggestions and also accepts an ID that is currently missing. It never infers room or outside sources.

## Sensor readings

`readings` defaults to `[]`. It accepts zero to four items, in display order; four items use two rows. The four-item limit includes disabled entries. An empty list or all-hidden items leaves no placeholder readings. The editor supports adding, removing, and moving entries without discarding their settings or unknown properties.

| Per-reading field | Default | Meaning |
| --- | --- | --- |
| `entity` | `""` | Explicit numerical `sensor.*` source |
| `label` | `""` | Custom text, up to 100 characters; empty uses HA's entity name, then the friendly name/ID |
| `precision` | `auto` | Follow HA formatting, or an integer from 0 to 6 decimal places |
| `enabled` | `true` | Show this reading when the readings section is enabled |

Automatic formatting uses HA's native value/unit parts when available. On older frontends the fallback uses the registry's `display_precision`, then `suggested_display_precision`, then source decimals, bounded to six places. Explicit precision uses HA's number-format preference; units remain those supplied by HA. The card does not convert temperatures or other sensor units. The native parts API and name formatter are documented in the [HA hass-object reference](https://contributors.home-assistant.io/frontend/reference/hass-object/).

Missing, nonnumerical, unknown, unavailable, and disconnected readings show `—`. Their configured slots remain, and supplied labels are retained. Existing units remain visible when available. A reading is a native button with at least 48px height; tap, Enter, or Space dispatches HA's bubbling/composed `hass-more-info` event with `entityId`. Existing unavailable entities can still be inspected; missing entities disable the button. Live value updates preserve the button and keyboard focus. Full labels and values remain accessible when visually truncated.

## CO₂ bands and scale

| Field | Default | Meaning |
| --- | --- | --- |
| `co2.entity` | `""` | Explicit sensor reporting **ppm** |
| `co2.minimum` | `400` | Value at the bottom of the strip |
| `co2.maximum` | `2000` | Value at the top; must exceed minimum |
| `co2.base_color` | `#8daea0` | Color below the first threshold |
| `co2.base_label` | `Low` | Status below the first threshold; empty hides the label |
| `co2.thresholds` | Four bands in the example | Ordered list of `{ value, color, label }` mappings |

Range endpoints and threshold values must be finite numbers from 0 through 1,000,000 ppm. Thresholds must be strictly ascending; duplicate or unsorted values are errors. Any number of thresholds is supported, including `[]` for a single baseline band. Each threshold has a required effective numeric value/color after normalization, and an optional label. Omitted properties on a newly supplied threshold default to `800`, `#c5c691`, and an empty label; repeated defaults still fail ordering validation. Colors use opaque six-digit hex values. The visual editor pairs each threshold color and the color below the first threshold with a native color picker and an editable hex field; both update the same YAML value. Invalid hex drafts retain the last valid display. Labels are literal user configuration (including the initial English defaults), up to 100 characters; they are not automatically translated.

The fill fraction is `clamp((raw - minimum) / (maximum - minimum), 0, 1)`. The integer display retains the actual value outside this range; only height is clamped. Equality enters the new band. Band selection uses the unrounded measurement, without hysteresis: `799.99` can display as `800` while still using the lower band. Marks appear only for thresholds inside the visible range; out-of-range thresholds still determine color/status.

Only sources reporting `ppm` are classified. A missing unit, different unit, unusable value, or disconnected source produces a neutral empty strip, `—`, and an unavailable status, retaining the allocated space and marks. Nothing silently converts a different concentration scale.

The strip, number, status, and marks retain their independent feature switches. Number/status remain available when the strip is disabled. Marks need the strip as their visual surface. The strip label and number have transparent backgrounds. The top CO₂ label fills the strip width with 6px horizontal padding and resizes with the card or strip. Numbers omit the visible ppm suffix, including when the strip is disabled; source validation and the strip’s accessible description retain the unit. Text uses the configured primary text color, so its contrast depends on the underlying strip and band colors. Long status labels occupy one line with accessible full text and a title tooltip.

## Weather and forecast

| Field | Default | Meaning |
| --- | --- | --- |
| `weather.entity` | `""` | Explicit `weather.*` source |
| `weather.forecast` | `false` | Enable one short future-period summary |
| `weather.forecast_type` | `auto` | `auto`, `hourly`, `twice_daily`, or `daily` |

Current weather uses the entity condition, a condition-specific icon, and an English/German description. Unknown/missing/disconnected conditions are explicitly unavailable. Outside temperature remains a separate reading and does not depend on weather being enabled.

When forecast is enabled, `auto` selects an advertised capability in this order: hourly, twice daily, daily. An explicit unsupported type omits the summary. The adapter subscribes through `hass.connection.subscribeMessage` to `weather/subscribe_forecast`, following the [HA frontend weather client](https://github.com/home-assistant/frontend/blob/dev/src/data/weather.ts). Forecasts are separate from entity state; the official [weather entity contract](https://contributors.home-assistant.io/core/entities/weather/#forecasts) supplies RFC 3339 timestamps and optional conditions.

The card selects the earliest strictly future period with a valid timestamp and recognized condition. Today's periods display time; tomorrow uses “Tomorrow”; later periods show a localized date. Timezone and 12/24-hour preferences match the clock, including DST/calendar-day boundaries. Missing conditions, ambiguous timestamps without offsets, expired periods, and unavailable forecasts are omitted. There is no narrative prediction or weather-temperature substitution. The summary uses one line with full text accessible when truncated.

A visible card maintains at most one active forecast subscription. Subscription setup times out after 15 seconds and failed/timed-out setup retries after 60 seconds while still eligible. Disabling the forecast/weather section, disconnecting HA, changing entity/type/connection, or removing the card invalidates old callbacks and releases the subscription. A late subscription handle is immediately released. Reconnection subscribes anew; presentation-only edits retain the current subscription. Clock ticks re-evaluate future periods without network polling. No forecast data persists through reload.

## Editor and module boundaries

All new source, precision, band, range, label, forecast, and visibility controls are exposed in the visual editor and YAML. Invalid drafts keep the last valid displayed configuration, including when HA echoes it back. Editing another field while a draft is invalid preserves that edit until the complete draft becomes valid. Unknown properties survive round trips, including properties inside reading and threshold items. User text is escaped before rendering.

Entity suggestions retain their existing options across routine HA state updates so those updates do not dismiss the native selection popup. Added, removed, or renamed entities refresh the choices. Browser regression checks verify suggestion stability while an entity field is focused; mouse interaction with the native popup still requires verification in HA.

- `src/environment.js` resolves state availability, reading formatting, CO₂ bands, current weather, and future-period selection without DOM or transport calls.
- `src/forecast.js` owns the subscription lifecycle and stale-callback protection.
- `src/weather-icons.js` supplies fixed local SVG paths; no remote icon service is used.
- `src/config.js` supplies scalar and dynamic list fields to both validation and editor controls.
- `src/card.js` connects HA updates, forecast changes, clock ticks, and native details events to the view. The preview-only presentation override still supplies calendar fixtures.

## Verification and remaining acceptance

Run `npm run check`, `npm test`, and `npm run test:browser`. Browser checks require a compatible Chromium, selectable through `TINGS_DASHBOARD_CHROMIUM`. Generated images are under ignored `artifacts/stage2-{dark,light}-800.png`.

Verification covers numerical-state rejection; native/fallback number formatting; zero/four reading and invalid configuration boundaries; exact CO₂ thresholds, arbitrary band counts, clamping and neutral failures; forecast selection/DST/expiry; failed, pending and obsolete subscriptions; actual editor/YAML interactions; reading reordering and per-item visibility; native details events and live-update focus; transparent CO₂ text and fitted strip labels at low/intermediate/full heights in both themes; and the existing 42 layout/theme/viewport combinations. Additional browser cases cover four readings plus forecast at 800×480, 960×600 and 1280×800, small-screen tuning extremes, long labels, German labels, and narrow editor controls.

Actual HA hosting and its native details dialog, real weather integration behavior, Lineage kiosk rendering, and readability from 2–3 metres remain unverified. Desktop/mock checks establish the local implementation, not physical-device acceptance. Deployment and migration require a later explicit request.
