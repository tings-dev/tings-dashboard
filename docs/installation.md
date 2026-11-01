# Installation and distribution

This is a Home Assistant dashboard custom card. It uses your existing authenticated frontend connection and explicitly selected entities; no separate backend integration or credentials are needed. Device acceptance is still pending in [the acceptance record](device-acceptance.md).

## Build locally

Use Node.js 22 or newer:

```sh
npm ci
npm run check
npm test
npm run test:browser
npm run package
```

Browser checks need a Playwright Chromium installation (`npx playwright install chromium`) or `TINGS_DASHBOARD_CHROMIUM` pointing to a compatible executable. The release command creates `release/tings-dashboard.js` and `release/SHA256SUMS`. It is a minified, self-contained ES module with the card, editor, styles and translations, with no runtime imports, source map, development fixtures or preview bundle. The package version appears in its banner and `customElements.get('tings-dashboard').version`. Generated `dist/`, `release/` and screenshots are ignored by Git.

`npm run build` instead produces development bundles and source maps in `dist/`; `npm run preview` serves synthetic examples on localhost. Do not distribute `preview.js`.

The JavaScript build targets Chromium 105 syntax. Rendering uses [dynamic viewport CSS units supported from Chrome 108](https://developer.chrome.com/blog/new-in-chrome-108), so use Chromium/WebView 108 or newer as the baseline for installation. This is an implementation baseline, not a claim of physical kiosk validation. Current supported test sizes are 1280×800, 960×600 and 800×480 landscape CSS pixels.

## Manual installation

These are preparation instructions; no Home Assistant files or resources have been changed by this repository work.

1. Keep the previous card bundle/resource and dashboard configuration for rollback. Add the new card to a separate test dashboard before replacing a room display.
2. Copy only `release/tings-dashboard.js` into `<HA config>/www/tings-dashboard.js`. If creating `www` for the first time, restart HA so the folder is served.
3. Register `/local/tings-dashboard.js?v=0.1.0` under **Settings → Dashboards → Resources**, type **JavaScript module**. If your installation manages resources in YAML, use the YAML below instead.
4. Reload the browser, open the card picker, and select **Tings Dashboard**, or add `type: custom:tings-dashboard` in the dashboard editor. Start with the clock-only default, then choose your own sources and enable their sections.

```yaml
lovelace:
  resource_mode: yaml
  resources:
    - url: /local/tings-dashboard.js?v=0.1.0
      type: module
```

After changing YAML resources, reload them using `lovelace.reload_resources`, then reload the browser. Update the URL's version query when replacing a bundle. Register only one copy of the card; JavaScript custom element definitions cannot be replaced in a running page. Restoring the old bundle/resource and reloading the browser is the resource rollback. Restore the old dashboard as needed. A dashboard's `instance_id` should remain unchanged for its local Done/Undo and night state.

Home Assistant's [resource registration documentation](https://contributors.home-assistant.io/frontend/custom-ui/resources/) describes the `www` → `/local/` mapping and module registration. Files served from `www` are public to anyone who can reach HA; keep credentials and household configuration out of that directory.

## HACS release preparation

The repository includes `hacs.json` with `filename: tings-dashboard.js` and `hide_default_branch: true`. The filename matches the GitHub repository name (`tings-dashboard`). This is a **release-only** distribution: source branches do not contain a built bundle, and `dist/preview.js` must never be picked up as a plugin asset.

When a release is separately authorized, verify the checks above, ensure the package version matches the chosen release tag, and attach **only `release/tings-dashboard.js` and `release/SHA256SUMS`** to that GitHub release. HACS needs a public GitHub repository, a description/topics/README and a published release with its JavaScript asset. Publishing a tag alone is insufficient. Do not commit development `dist/` files into the release tree. No tag or release has been created or published here.

After a release exists and the repository is public, users can add `https://github.com/tings-dev/tings-dashboard` as a HACS custom repository of type **Dashboard**, download the release, and verify its JavaScript module resource. The expected resource URL is `/hacsfiles/tings-dashboard/tings-dashboard.js`. Avoid registering both the manual and HACS copy. Actual HACS download and resource registration remain unverified until that release exists.

The manifest and release layout follow the current [HACS general requirements](https://www.hacs.xyz/docs/publish/start/) and [dashboard plugin requirements](https://www.hacs.xyz/docs/publish/plugin/), checked on 2026-11-01. This preparation does not claim acceptance into the default HACS catalog.

## Start a configuration

```yaml
type: custom:tings-dashboard
instance_id: living-room-display
room_name: Living room
readings:
  - entity: sensor.example_temperature
co2:
  entity: sensor.example_co2
features:
  readings: { enabled: true, night: true }
  co2_bar: { enabled: true, night: false }
  co2_value: { enabled: true, night: false }
  co2_status: { enabled: true, night: false }
```

Replace the example IDs with your own. The ID must be unique per independent card, stable through edits and reloads. Room/clock/date are enabled by default; data sections require explicit enabling. Use the [complete configuration reference](configuration.md) and the linked stage documents for calendars, forecast, night activation, appearance and visibility.

For a full-screen kiosk, put the card in a dashboard panel view, or supply a fixed `layout.height` suited to the actual content area. The default `viewport` height subtracts HA's `--header-height` if present; it does not configure your kiosk header, navigation bars or display scaling. Measure the actual card area on each device before accepting a layout.
