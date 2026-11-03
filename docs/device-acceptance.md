# Device acceptance record

Status as of 2026-11-01: **pending on both physical devices**. Local synthetic browser checks do not establish kiosk behavior or readability at a distance. No household dashboard, Home Assistant resource, kiosk or device was changed during implementation. A room migration remains a separate action with its existing dashboard retained for rollback.

| Evidence | Echo Show 5 / Lineage | Echo Show 8 / Lineage |
| --- | --- | --- |
| Model, Lineage and browser/WebView version | Pending | Pending |
| Landscape CSS viewport and actual card area | Pending | Pending |
| HA version and native editor hosting | Pending | Pending |
| Full layout with real selected entities/calendars | Pending | Pending |
| Reduced layout without calendar / without CO₂ | Pending | Pending |
| Separate dashboards and HA-controlled switching, if configured | Pending | Pending |
| Clock and CO₂ readability from 2–3 metres | Pending | Pending |
| Near-view readings, weather and agenda readability | Pending | Pending |
| Full title by touch, Done/Undo and native sensor details | Pending | Pending |
| Reload, dashboard navigation and kiosk wake/resume | Pending | Pending |
| Real unavailable source, recovery and fresh calendar focus | Pending | Pending |
| Low-light readability at actual room brightness | Pending | Pending |

## Collect the evidence

Before deployment, review the exact device/room, chosen entity/calendar IDs, kiosk URL and retained rollback dashboard. Record those decisions in the household configuration repository; reusable defaults here intentionally contain no household selections.

Once the reviewed card is loaded on a separate test dashboard, use the browser console to collect geometry without logging household source data:

```js
({
  browser: navigator.userAgent,
  viewport: [innerWidth, innerHeight],
  scale: devicePixelRatio,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
})
```

Select the card in browser developer tools and measure `$0.getBoundingClientRect()` for the host; within its shadow root, measure `.screen`. Record dimensions in CSS pixels and whether HA/kiosk headers or system bars reduce the usable area. Record browser/WebView and HA versions alongside the tested bundle version. Synthetic 800×480, 960×600 and 1280×800 sizes are references; device resolution alone does not establish its CSS viewport.

On each device, check full and reduced layouts using the intended real sources, both short and long titles, all-day entries, an ongoing focus and a failure notice. Try the supported high/low tuning combinations only after the default fits. Verify there is no hidden essential content, automatic scrolling or text overlap. Tap a truncated event title and read its full text in the dialog; verify Close and Back/Escape where available, and tap readings to confirm HA's actual entity-details behavior.

At the installed location, read the clock and CO₂ from roughly 2–3 metres. Check the smaller text at the intended close distance. Test the chosen colors in a dark room at normal device brightness; the card does not control the physical backlight. Record adjustments and remaining issues rather than accepting desktop screenshots as equivalent evidence.

Exercise Home Assistant dashboard switching if configured, calendar source recovery, dashboard navigation away/back, kiosk sleep/wake and a browser reload. Confirm Done/Undo stays local to the chosen dashboard/browser and returning to a dashboard shows current events. Keep sensitive calendar titles out of public screenshots or this reusable repository.

Enter dates, measured values, outcomes and remaining defects in the table when performed. Until both columns have actual evidence, stage 5 device acceptance remains open even when local software checks pass.
