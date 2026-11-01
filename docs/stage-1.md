# Stage 1: card foundation, layout, and appearance

This document records the stage-1 baseline. Live readings, CO₂, and weather have since been implemented; see [stage 2](stage-2.md) for sensor/weather configuration and [stage 3](stage-3.md) for calendars and persistent Done/Undo.

Stage 1 implements the accepted design's visual foundation. Live readings/weather, calendar retrieval and rules, entity-controlled/scheduled night activation, and persistent Done/Undo remain in stages 2–4. No existing Home Assistant dashboard or device configuration has been changed.

## Build and preview

Use Node.js 22 or later:

```sh
npm ci
npm run preview
```

Open <http://127.0.0.1:8765>. The command builds the card and starts a loopback-only development server. Set `INFO_DASHBOARD_PORT` to select another port. Re-run the command after source changes; there is no hot reload.

The preview loads the same `dist/info-dashboard.js` bundle used by Home Assistant. Its separate development bundle supplies synthetic presentations and a fixed example time. Select **Live clock** for the real time. Examples cover seven content combinations, three appearances, event states, unavailable data, and two/four readings. The visual editor and YAML pane round-trip the actual configuration. Invalid YAML or field drafts keep the displayed card at its last valid configuration.

The appearance selector's **Night state** sets explicit rendering state. It is not a simulation of automatic entity/schedule activation. Use **Remove synthetic data** to see the genuine stage-1 unavailable placeholders for enabled data regions. No synthetic event or sensor values ship inside the card bundle.

## Local artifact

```sh
npm run build
```

This creates `dist/info-dashboard.js`, a self-contained ES module with no runtime package dependencies, and a source map. `dist/preview.js` is development-only. The build targets Chromium 105+ JavaScript; the actual Lineage kiosk browser remains to be verified.

When separately ready to install, the card artifact can be registered as a Home Assistant dashboard JavaScript module, with the card type `custom:info-dashboard`. No resource has been installed by this stage. HACS/release packaging and actual device validation are stage 5 work.

## Stage-1 configuration

The default card shows a clock and date. The room name appears when provided. Data regions default to disabled so an unconfigured card does not invent sensor/calendar selections.

```yaml
type: custom:info-dashboard
schema_version: 1
room_name: Living room
language: auto
time_zone: auto
time_format: auto
date_format: auto
appearance:
  day: light
  night: night
layout:
  height: viewport
  clock_scale: 1
  text_scale: 1
  left_width: 55
  rail_width: 7
  spacing: 1
features:
  clock:
    enabled: true
    night: true
  date:
    enabled: true
    night: true
  room:
    enabled: true
    night: false
```

All supported fields appear in the visual editor. Defaults can be omitted from YAML. A field set to `null` is invalid, rather than an instruction to reset it. Unknown properties are preserved for Home Assistant metadata or future stages, but have no new behavior in this stage. In particular, no source/entity settings are interpreted yet.

### Clock and date

| Field | Default | Values and behavior |
| --- | --- | --- |
| `schema_version` | `1` | Only version 1 |
| `room_name` | empty | Up to 100 characters, rendered as text |
| `language` | `auto` | Home Assistant language, or supported BCP-47 locale such as `de-DE` |
| `time_zone` | `auto` | Follow HA local/server timezone preference; override with an IANA name |
| `time_format` | `auto` | Follow HA `12`, `24`, `language`, or `system` preference; override with quoted `"12"` or `"24"` |
| `date_format` | `auto` | Follow HA preference; override with `long`, `short`, `DMY`, `MDY`, or `YMD` |

`auto` timezone defaults to Home Assistant's configured timezone when there is no explicit local preference; without HA context it uses the browser timezone. `long` shows localized weekday/day/month, `short` uses a localized short date, and the explicit numeric orders include year. A 24-hour clock uses 00:00 at midnight, not 24:00. AM/PM is displayed smaller beside the digits and included in the accessible time label.

Card/editor labels are translated into English and German; other languages currently fall back to English labels while retaining their locale-aware time/date formatting. Time uses `Intl.DateTimeFormat`. The clock refreshes against the current time once per second without recreating the DOM, resynchronizes when the document becomes visible, and removes its timer/listener on disconnect. It never advances time by counting timer ticks.

### Feature visibility

Each feature accepts `{ enabled: boolean, night: boolean }`. Effective night visibility is **enabled AND night**; a night setting cannot enable a globally disabled feature. Disabling a feature preserves its settings.

| Feature | Enabled default | Night default |
| --- | --- | --- |
| `room` | true (blank name has no rendered heading) | false |
| `clock` | true | true |
| `date` | true | true |
| `readings` | false | true |
| `weather` | false | false |
| `calendar` | false | false |
| `co2_bar` | false | false |
| `co2_value` | false | false |
| `co2_status` | false | false |
| `co2_marks` | false | false |

The stage-1 editor exposes group visibility for readings. Selecting, ordering, and individually hiding the actual zero-to-four sensor readings arrives with the source adapter in stage 2. The layout renderer already supports up to four supplied display readings.

Enabled data regions without an adapter show explicit unavailable placeholders. The blank layout renders only the background. The calendar's empty state is separate from unavailable data. Its synthetic agenda is fitted to the available height, with omitted-entry count rather than automatic scrolling. Production event selection/freshness are not implemented here.

### Appearance and layout

`appearance.day` and `appearance.night` independently select `dark`, `light`, or `night`. Defaults are `dark`/`night`. The optional `appearance.colors` and `appearance.night_colors` mappings override `background`, `text`, `muted`, `accent`, `divider`, and `rail`. Values are six/eight-digit hex colors; an empty string inherits the preset. Overrides for one presentation do not change the other. Custom colors remain the user's responsibility for contrast; default presets are the starting point for the stage-5 audit.

| Field | Default | Supported range |
| --- | --- | --- |
| `layout.height` | `viewport` | `viewport` or 480–1600 pixels |
| `layout.clock_scale` | 1 | 0.85–1.1 |
| `layout.text_scale` | 1 | 0.9–1.1 |
| `layout.left_width` | 55 | 50–60 percent |
| `layout.rail_width` | 7 | 6–10 percent |
| `layout.spacing` | 1 | 0.85–1.1 |
| `motion` | true | Boolean; reduced-motion preference always takes precedence |

`viewport` uses the browser viewport height minus Home Assistant's `--header-height` when present. A host can explicitly supply `--info-dashboard-height` to fit another container; the preview uses this without changing saved YAML. Actual kiosk header/usable-area behavior needs device verification.

Scales are requested sizes within the available layout. Clock type is additionally fitted to its column and vertical space so 12-hour suffixes, long dates, and crowded reading layouts cannot overlap. The selected column proportion applies while clock and calendar are both present. Reduced-content layouts deliberately reflow according to the design. The clock and sensor positions remain stable across calendar mode changes.

The numeric ranges were checked in their small/large combinations at 1280×800, 960×600, and 800×480, including four readings and long focus titles. They do not promise distance readability on a physical display or arbitrary unsupported viewport dimensions.

## Module boundaries

- `src/config.js`: schema, defaults, validation, visibility, and palettes. The editor and card use the same validator.
- `src/clock.js`: resolves HA/local/explicit preferences and creates time/date formatters; no DOM or timers.
- `src/card.js`: custom-element lifecycle, current clock, sizing, and explicit rendering state.
- `src/view.js` / `src/styles.js`: safe text rendering and optional-section layout. An adapter-facing `presentation` property accepts already-formatted display data; it does not fetch sources or derive event priority/CO₂ thresholds.
- `src/editor.js`: grouped accessible native controls, complete `config-changed` events, and preserved invalid drafts.
- `src/i18n.js`: English/German labels and errors.
- `preview/`: synthetic fixtures and preview-only fixed-time subclass. Kept out of the production bundle.

`card.night` is explicit adapter state. Stage 4 will supply it from a selected entity or schedule. `currentTime()` is an overridable seam for deterministic previews/tests; the production element always returns the current system time.

## Verification

```sh
npm run check
npm test
npm run test:browser
```

The browser command builds first and starts/stops its own local server. Install a compatible Playwright Chromium with `npx playwright install chromium --only-shell`, or set `INFO_DASHBOARD_CHROMIUM` to an existing executable. It does not require the sibling `echo-show-card` repository. Generated screenshots go to ignored `artifacts/`.

Checks cover clock timezone/DST/date boundaries; configuration defaults, validation and YAML round trips; 63 content/theme/viewport combinations; calendar mode geometry; two/four readings; layout tuning extremes; invalid editor and YAML drafts; unknown-property preservation; text injection; locale updates; timer cleanup/reconnect; narrow editor layout; and reduced motion. Real HA card-editor hosting, native device rendering, and physical distance readability remain unverified.

## Integration references

The element follows the [Home Assistant custom-card API](https://contributors.home-assistant.io/frontend/custom-ui/card/) and its [custom editor/config-changed contract](https://contributors.home-assistant.io/frontend/custom-ui/card-editor/). Preference handling was checked against HA's [locale definitions](https://github.com/home-assistant/frontend/blob/dev/src/data/translation.ts) and [time formatter](https://github.com/home-assistant/frontend/blob/dev/src/common/datetime/format_time.ts). The build uses [esbuild's browser bundling](https://esbuild.github.io/getting-started/).
