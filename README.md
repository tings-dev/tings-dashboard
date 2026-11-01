# Info Dashboard

Stage 1 is implemented: a Home Assistant custom-card foundation with a live clock/date, optional-section layouts, dark/light/night appearance, and a visual editor sharing validation with YAML. Live source integrations and automatic night activation are later stages.

```sh
npm ci
npm run preview
```

Open <http://127.0.0.1:8765>. This development preview uses the actual card bundle with synthetic sensor/calendar presentations, an optional live clock, and visual-editor/YAML round trips. Build the standalone card with `npm run build`; the output is `dist/info-dashboard.js`.

See [stage-1 configuration, architecture, and verification](docs/stage-1.md). Run `npm run check`, `npm test`, and `npm run test:browser`; browser checks require a Playwright Chromium installation or `INFO_DASHBOARD_CHROMIUM` pointing to a compatible binary.

The [accepted design](docs/dashboard-design.md) records decisions Q1–Q39. The [implementation plan](docs/implementation-plan.md) tracks the five delivery stages. The [interview record](docs/design-interview.md) preserves the numbered decisions and original alternatives. No existing Home Assistant configuration or devices have been changed.

## Design studies

Start with the [interactive option-A refinement](prototypes/dashboard-prototype.html): open the HTML file directly in a browser. Everything is local and uses synthetic data.

Alternatively, from this directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory prototypes
```

Then open <http://localhost:8765/dashboard-prototype.html>. Switch dark/light/night appearance using the bottom arrows. Choose a room example, event scenario, and viewport above the display; expand the settings to change individual day/night visibility, readings, CO₂, clock size, and strip width.

- [Dark](prototypes/a-dark.png), [light](prototypes/a-light.png), and [night](prototypes/a-night.png)
- [No calendar](prototypes/a-no-calendar.png) and [no CO₂](prototypes/a-no-co2.png)
- [Small-screen agenda](prototypes/a-small.png), [event focus](prototypes/a-small-focus.png), and [disconnected state](prototypes/a-small-offline.png)

The initial comparison remains available in the [original A/B/C study](prototypes/layout-comparison-prototype.html):

- [A — Quiet split](prototypes/layout-A.png)
- [B — Open horizon](prototypes/layout-B.png)
- [C — Event poster](prototypes/layout-C.png)
- [Accepted design](docs/dashboard-design.md)
- [Staged implementation plan](docs/implementation-plan.md)
- [Glossary](GLOSSARY.md)

These HTML files are the original disposable design studies, separate from the stage-1 source in `src/` and development preview in `preview/`. Decisions Q1–Q39 and the design are accepted. Synthetic Done/Undo in the studies resets on reload; production persistence and source integrations remain later-stage work.
