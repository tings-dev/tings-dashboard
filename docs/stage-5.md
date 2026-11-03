# Stage 5: configuration audit, packaging and acceptance

Software audit and release preparation are implemented locally. **Physical device acceptance remains open** for both Echo Show sizes; see the [device acceptance record](device-acceptance.md). No Home Assistant configuration, devices, GitHub tags or releases have been changed.

## What changed

- Added a complete [configuration reference](configuration.md), generated from the same schema used by YAML validation and the visual editor. `npm run check` detects documentation drift. Fixed `type`/`schema_version` metadata and the three variable-length lists are explained separately from editable scalar settings.
- Audited English/German interface/error keys, interpolation placeholders, field labels, select options and editor coverage. Custom names and CO₂ status labels remain literal user configuration; the default CO₂ labels are English, as documented since stage 2.
- Fixed immediate language refresh in the editor. Changing the language now updates labels without waiting for another HA update and retains the draft's values.
- Added native full-title buttons for timed agenda, all-day and secondary focus entries. Tap, Enter or Space opens a local dialog with the complete escaped title, Close and Escape support, and restored keyboard focus. Titles retain their existing visual line limits; buttons have at least 44px height. The dialog closes on card removal. It changes no calendar data.
- Added a shared production build and `npm run package`, updating the tracked root `tings-dashboard.js` and generating identical `release/tings-dashboard.js` plus `release/SHA256SUMS`. The minified ES module includes a version banner, card/editor registration and styles/translations, with no runtime imports or source map. Fixtures and preview code remain development-only.
- Added HACS metadata with explicit root content and filename and [installation/release instructions](installation.md), checked against current official HA/HACS documentation. Publishing a release and installing it are separate actions, not part of this local preparation.

The title controls preserve stable identities across live updates. Date-expanded all-day rows use distinct identities so repeated occurrences on different dates cannot overwrite one another's labels. Available-height fitting can show fewer rows after adding touch targets; the overflow count remains explicit and text is not shrunk to fit more events.

## Verification

Run:

```sh
npm run check
npm test
npm run test:browser
npm run package
```

Local verification after night-mode removal passed: 66 unit tests, syntax and configuration-reference checks, and the complete browser suite, including 88 configured editor fields.

Browser checks require Playwright Chromium or `TINGS_DASHBOARD_CHROMIUM` pointing to a compatible executable. The suite builds and loads the minified release in an isolated browser realm, verifies its checksum/version/registrations and renders the default clock. It also verifies every configured scalar/list field is represented in the editor, immediate language switching, full-title keyboard/touch access, focus restoration, default text-role contrast of at least 4.5:1, and the 42 theme/layout combinations plus tuning extremes, forecast/calendars, failure/recovery, persistence and lifecycle checks.

Default text contrast is checked for primary, secondary and accent text against each preset background; CO₂ value contrast is already checked across low/intermediate/full fill levels. Custom palette/band colors can reduce contrast and require visual review. Reduced-motion precedence remains covered by the browser suite. The layout checks cover synthetic 1280×800, 960×600 and 800×480 sizes, including four readings, forecast, long titles, notices and Done/Undo.

The JavaScript build target remains Chrome 105 syntax. Dynamic viewport CSS units require Chromium/WebView 108+ for the installation baseline; see [Chrome's viewport-unit support](https://developer.chrome.com/blog/new-in-chrome-108). Actual Lineage browser versions, kiosk CSS dimensions, native HA dialogs/editor, HACS download and physical readability are not established by these local checks.

## Remaining acceptance

Complete the two-device record with actual CSS viewport measurements, installed browser/HA versions, full/reduced layouts, touch behavior, reload/navigation/wake recovery and near/distance/low-light readability. Those observations require the physical screens and a separately reviewed installation or room migration. Until recorded, stage 5 is **software-ready with device acceptance pending**, not fully accepted.

## HACS branch-install correction

The initial release-only layout was rejected while adding the custom repository: GitHub had no release assets and no tracked card bundle, so HACS reported `Repository structure for develop is not compliant`. The `hide_default_branch` option did not make the repository installable. This gap was missed by the initial release smoke check, which loaded only a locally generated artifact.

The corrected distribution tracks the production `tings-dashboard.js` at the root, selects it with `content_in_root: true`, and leaves branch installation available. `npm run package` updates that bundle and the release copies together; `npm run check` rejects missing/stale repository artifacts. The upstream HACS validation methods reproduced the original error and then resolved `root/tings-dashboard.js` after the fix. Browser checks now load that exact root artifact and verify parity with the release copy. No remote files were changed during the correction; it must be committed and pushed before retrying HACS.
