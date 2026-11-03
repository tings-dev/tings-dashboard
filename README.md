# Tings Dashboard

A Home Assistant custom card with a live clock/date, up to four selected sensor readings, configurable CO₂ bands and strip, current weather and optional forecast, a multi-calendar agenda with event focus and persistent local Done/Undo, dark/light appearance, and a visual editor sharing validation with YAML. Stage 5 software audit and release preparation are implemented; physical device acceptance remains pending. See [stage 5 results](docs/stage-5.md).

For a similar living room display using only built-in Home Assistant cards, see the [native dashboard YAML](examples/native-living-room.yaml) and [setup notes](docs/native-dashboard.md).

```sh
npm ci
npm run preview
```

Open <http://127.0.0.1:8765>. This development preview uses the actual card bundle with mock Home Assistant sensor, weather, and calendar responses, an optional live clock, and visual-editor/YAML round trips. Build the standalone card with `npm run build`; the output is `dist/tings-dashboard.js`.

For installation and distribution, see [installation](docs/installation.md). The [complete configuration reference](docs/configuration.md) is generated from the shared editor/YAML schema. `npm run package` updates the tracked root `tings-dashboard.js` for HACS branch installs and creates an identical release copy and SHA-256 checksum. Include the root bundle when committing source changes; `npm run check` catches drift. Release publishing and household migration are separate actions.

See [calendar configuration and Done/Undo](docs/stage-3.md), [sensor, CO₂, and weather configuration](docs/stage-2.md) and [clock/layout configuration](docs/stage-1.md). Run `npm run check`, `npm test`, and `npm run test:browser`; browser checks require a Playwright Chromium installation or `TINGS_DASHBOARD_CHROMIUM` pointing to a compatible binary.

The [accepted design](docs/dashboard-design.md) records decisions Q1–Q39. The [implementation plan](docs/implementation-plan.md) tracks the five delivery stages. The [interview record](docs/design-interview.md) preserves the numbered decisions and original alternatives. No existing Home Assistant configuration or devices have been changed.

Each component has its own **Scale** control under **Feature visibility and scale**, accepting decimal values from `0.1` to `10` (default `1`). For example, this makes readings larger and the calendar smaller:

```yaml
features:
  readings:
    enabled: true
    scale: 1.25
  calendar:
    enabled: true
    scale: 0.85
```

Scales multiply the existing layout settings. The clock still fits its available space; large scales may clip other content. See the [configuration reference](docs/configuration.md) for details.

Each dashboard has one appearance preset and one set of enabled sections. For a reduced evening display, create a second dashboard and let Home Assistant control switching. Use a different `instance_id` for each card. Night activation, per-feature night switches and separate night colors have been removed. Existing `appearance.day` values carry over to `appearance.preset` (`dark` or `light`); a former `night` preset falls back to `dark`. Existing color overrides and entity selections are retained; removed settings are dropped from editor output.

## Design studies

Start with the [interactive option-A refinement](prototypes/dashboard-prototype.html): open the HTML file directly in a browser. Everything is local and uses synthetic data.

Alternatively, from this directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory prototypes
```

Then open <http://localhost:8765/dashboard-prototype.html>. Switch dark/light appearance using the bottom arrows. Choose a room example, event scenario, and viewport above the display; expand the settings to change individual visibility, readings, CO₂, clock size, and strip width.

- [Dark](prototypes/a-dark.png) and [light](prototypes/a-light.png)
- [No calendar](prototypes/a-no-calendar.png) and [no CO₂](prototypes/a-no-co2.png)
- [Small-screen agenda](prototypes/a-small.png), [event focus](prototypes/a-small-focus.png), and [disconnected state](prototypes/a-small-offline.png)

The initial comparison remains available in the [original A/B/C study](prototypes/layout-comparison-prototype.html):

- [A — Quiet split](prototypes/layout-A.png)
- [B — Open horizon](prototypes/layout-B.png)
- [C — Event poster](prototypes/layout-C.png)
- [Accepted design](docs/dashboard-design.md)
- [Staged implementation plan](docs/implementation-plan.md)
- [Glossary](GLOSSARY.md)

These HTML files are the original disposable design studies, separate from the production source in `src/` and development preview in `preview/`. Decisions Q1–Q39 and the design are accepted. Synthetic Done/Undo in the studies resets on reload; the production implementation in `src/` persists Done/Undo per dashboard ID.
