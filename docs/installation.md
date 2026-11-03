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

Browser checks need a Playwright Chromium installation (`npx playwright install chromium`) or `TINGS_DASHBOARD_CHROMIUM` pointing to a compatible executable. The package command updates the tracked root `tings-dashboard.js` and creates an identical `release/tings-dashboard.js` plus `release/SHA256SUMS`. Include the root bundle whenever committing source or version changes; `npm run check` rejects a missing or stale bundle. It is a minified, self-contained ES module with the card, editor, styles and translations, with no runtime imports, source map, development fixtures or preview bundle. The package version appears in its banner and `customElements.get('tings-dashboard').version`. Development `dist/`, release copies and screenshots are ignored by Git. The root production bundle is intentionally versioned for HACS branch installation.

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

After changing YAML resources, reload them using `lovelace.reload_resources`, then reload the browser. Update the URL's version query when replacing a bundle. Register only one copy of the card; JavaScript custom element definitions cannot be replaced in a running page. Restoring the old bundle/resource and reloading the browser is the resource rollback. Restore the old dashboard as needed. A dashboard's `instance_id` should remain unchanged for its local Done/Undo state.

Home Assistant's [resource registration documentation](https://contributors.home-assistant.io/frontend/custom-ui/resources/) describes the `www` → `/local/` mapping and module registration. Files served from `www` are public to anyone who can reach HA; keep credentials and household configuration out of that directory.

## HACS installation and releases

The repository includes `hacs.json` with `filename: tings-dashboard.js` and `content_in_root: true`. HACS finds the tracked production `tings-dashboard.js` at the repository root, including on `develop` before any release exists. The filename matches the GitHub repository name (`tings-dashboard`). Root content selection excludes development `dist/preview.js`; do not add other root JavaScript files.

Once these files are committed and pushed to GitHub, add `https://github.com/tings-dev/tings-dashboard` as a HACS custom repository of type **Dashboard**, download it, and verify the JavaScript module resource `/hacsfiles/tings-dashboard/tings-dashboard.js`. HACS can use the default branch when there is no release. Avoid registering both the manual and HACS copy. Actual installation inside HA remains unverified locally.

A release is optional. When separately authorized, run the checks and package command, commit the updated root bundle with its source, and tag that commit with the matching package version. With root content enabled, HACS reads the bundle from the selected branch or tagged tree. You can also attach `release/tings-dashboard.js` and `release/SHA256SUMS` for manual downloads. No tag or release has been created or published here.

### Repository structure error

`Repository structure for develop is not compliant` means HACS could not locate a suitable card file. Initially this repository only generated an ignored local release artifact, with no published release or tracked root/dist bundle. `hide_default_branch` cannot supply that missing artifact. The corrected root layout works without publishing a release first.

Run `npm run package` and include **both the root `tings-dashboard.js` and the configuration/source changes** in the commit you push. Retry adding the custom repository after the corrected commit is on GitHub; an unpushed local build is invisible to HACS. A regression check compares the repository bundle against a fresh production build to catch missing/stale artifacts.

The layout follows the [HACS general requirements](https://www.hacs.xyz/docs/publish/start/) and [dashboard plugin requirements](https://www.hacs.xyz/docs/publish/plugin/). The missing-file error was reproduced and the root-bundle layout verified with the current upstream [plugin validation methods](https://github.com/hacs/integration/blob/main/custom_components/hacs/repositories/plugin.py) on 2026-11-01. This is not a claim of acceptance into the default HACS catalog.

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
  readings: { enabled: true }
  co2_bar: { enabled: true }
  co2_value: { enabled: true }
  co2_status: { enabled: true }
```

Replace the example IDs with your own. The ID must be unique per independent card, stable through edits and reloads. Room/clock/date are enabled by default; data sections require explicit enabling. Use the [complete configuration reference](configuration.md) and the linked stage documents for calendars, forecast, appearance and visibility.

For a full-screen kiosk, put the card in a dashboard panel view, or supply a fixed `layout.height` suited to the actual content area. Sections views add outer spacing around the card. The default `viewport` height subtracts `--kiosk-header-height` when supplied by the kiosk, otherwise HA's `--header-height` if present. Kiosk Satellite sets the kiosk header height to zero when it hides the header, allowing the card to fill the screen without a bottom gap. The card does not configure your kiosk header, navigation bars or display scaling. Measure the actual card area on each device before accepting a layout.
