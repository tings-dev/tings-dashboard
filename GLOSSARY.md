# Room information dashboard

A display of time, room conditions, outdoor conditions, and calendar events.
These terms describe the new design; the existing Echo Show card has its own glossary.

## Language

**Room dashboard**:
A room-specific display of enabled information, usable at a glance without touch. Its selected information can differ from room to room.

**Feature**:
An independently configurable and disableable part of the room dashboard, such as its clock, calendar, a sensor reading, or CO₂ indicator.

**CO₂ indicator**:
A vertical visual representation of the room's CO₂ reading. Its height communicates the reading within a configured range, while its color identifies the current CO₂ band.

**CO₂ threshold**:
A configured reading at which a new CO₂ band begins, including the threshold value itself.

**CO₂ band**:
A range of CO₂ readings sharing a configured color and optional label. The lowest band lies below the first threshold; successive thresholds begin successive bands.

**Indicator range**:
The minimum and maximum CO₂ readings represented by an empty and full-height indicator. Readings beyond this range retain their numerical value while the indicator height stays at its nearest limit.

**Agenda**:
A chronological collection of upcoming events from the calendars selected for a room dashboard.

**All-day event**:
A calendar event associated with one or more dates rather than specific times. It appears separately from timed events and does not enter a focus mode.

**Dismissed occurrence**:
An in-progress event occurrence hidden by the user on one room dashboard in one browser until its end, unless undone or its title/start/end changes. The source calendar event and other room displays are unaffected.

**Merged occurrence**:
One displayed event representing occurrences with exactly matching titles, starts, and ends across selected calendars. Its calendar sources remain identifiable, and dismissal applies to the combined occurrence.

**Starting soon**:
The optional display mode for a forthcoming event within a configured period before its start.

**In progress**:
The display mode for an event that has started and has not yet ended.

**Disabled feature**:
A feature deliberately hidden by configuration, releasing its layout space while retaining its settings.

**Unavailable reading**:
A selected reading that cannot currently provide a usable value. Its position is retained with “—” rather than treating the feature as disabled or showing a disconnected reading as current.

**Outdated calendar data**:
Previously retrieved event information whose source can no longer be refreshed successfully. It is explicitly marked as outdated and is distinct from a successfully retrieved empty calendar.
