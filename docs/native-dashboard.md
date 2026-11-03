# Living room dashboard with built-in cards

[Download/copy the complete YAML](../examples/native-living-room.yaml). It approximates the Tings Dashboard split: room/date and a large clock on the left, CO₂ and inside/outside temperatures beneath, and a calendar agenda on the right. All cards ship with Home Assistant; no custom frontend resources, HACS packages, helpers, or automations are required. Use a current Home Assistant version that includes the built-in Clock card.

## Install

1. Create a new, empty dashboard under **Settings → Dashboards**, then open it.
2. Enter edit mode and open **Raw configuration editor** from the three-dot menu. If prompted, take control of this new dashboard first.
3. Paste the complete YAML and replace these example IDs with your entities. Find IDs under **Developer tools → States**.

   | Example ID | Replace with |
   | --- | --- |
   | `sensor.living_room_co2` | Living room CO₂ sensor, measured in ppm |
   | `sensor.living_room_temperature` | Living room temperature sensor |
   | `sensor.outside_temperature` | Outside temperature sensor |
   | `calendar.household` | Calendar entity |

4. Save. To use multiple calendars, add their IDs to the Calendar card's `entities` list.

This is a complete **dashboard** configuration, not a single-card configuration. To extend an existing dashboard, append just the view under `views` to its existing view list instead of replacing its contents. YAML-managed dashboards can use the file as their dashboard YAML.

The clock explicitly uses `Europe/Berlin` and 24-hour time. The date template uses Home Assistant's configured timezone; keep that set to `Europe/Berlin` as well, or adjust the clock timezone to match your installation. Temperatures use their entities' units. The CO₂ source must already report ppm; setting a unit label would not convert its values.

## Differences from Tings Dashboard

- The CO₂ display is a native needle gauge spanning 400–2000 ppm with the same five color bands. The full-height vertical strip and separate status caption are not reproduced. The colors are visualization defaults, not health classifications.
- The Calendar card's `listWeek` view shows the next seven days. It supplies its own navigation and event presentation, without Tings Dashboard's starting-soon/in-progress focus or local Done/Undo.
- Cards use the active Home Assistant theme, spacing, and typography. Select dark mode in your Home Assistant profile for a dark display; the custom evergreen palette is not bundled.
- The panel's horizontal stack keeps both columns side by side. It targets landscape displays and does not collapse into a phone layout. Native card heights and calendar content may require scrolling on a small display; reduce `clock_size` to `medium` if needed. This example does not hide Home Assistant's header/sidebar.

The file has been parsed locally and its options checked against the official documentation. Live entity availability, Home Assistant rendering, and physical Echo Show fit have not been verified.

## Official references

- [Panel view](https://www.home-assistant.io/dashboards/panel/) and [Horizontal stack](https://www.home-assistant.io/dashboards/horizontal-stack/): full-width view and adjacent columns.
- [Clock](https://www.home-assistant.io/dashboards/clock/) and [Markdown](https://www.home-assistant.io/dashboards/markdown/): native clock settings and templated date.
- [Gauge](https://www.home-assistant.io/dashboards/gauge/) and [Sensor](https://www.home-assistant.io/dashboards/sensor/): segmented needle gauge and numerical readings.
- [Calendar](https://www.home-assistant.io/dashboards/calendar/): calendar entities and `listWeek` agenda.
