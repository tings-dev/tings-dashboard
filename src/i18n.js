const en = {
  content: 'Content', clock: 'Clock and date', appearance: 'Appearance', layout: 'Layout', visibility: 'Feature visibility', colors: 'Day color overrides', night_colors: 'Night color overrides',
  room: 'Room name', date: 'Date', readings: 'Sensor readings', weather: 'Weather', calendar: 'Calendar', co2_bar: 'CO₂ strip', co2_value: 'CO₂ number', co2_status: 'CO₂ status', co2_marks: 'Threshold marks',
  enabled: 'Enabled', night: 'Show at night', coming_up: 'Coming up', today: 'Today', soon: 'Starting soon', ongoing: 'In progress', all_day: 'All day', no_events: 'No upcoming events', unavailable: 'Unavailable', awaiting: 'Calendar unavailable', weather_unavailable: 'Weather unavailable', reading: 'Reading', more: '+{count} more',
  empty_notice: 'All content is hidden in this presentation.', stage_notice: 'Stage 1 provides the clock and layout. Live readings, weather, calendars, and night activation follow in later stages.',
  room_name: 'Room name', language: 'Language (auto or locale)', time_zone: 'Timezone (auto or IANA name)', time_format: 'Time format', date_format: 'Date format',
  'appearance.day': 'Day preset', 'appearance.night': 'Night preset', 'layout.height': 'Height (viewport or pixels)', 'layout.clock_scale': 'Clock scale', 'layout.text_scale': 'Text scale', 'layout.left_width': 'Clock column (%)', 'layout.rail_width': 'CO₂ strip (%)', 'layout.spacing': 'Spacing scale', motion: 'Enable subtle transitions',
  background: 'Background', text: 'Primary text', muted: 'Secondary text', accent: 'Accent', divider: 'Dividers', rail: 'Empty CO₂ strip',
  auto: 'Follow Home Assistant', dark: 'Evergreen dark', light: 'Warm-paper light', night_preset: 'Muted night', long: 'Long', short: 'Short', '12': '12-hour', '24': '24-hour', DMY: 'Day / month / year', MDY: 'Month / day / year', YMD: 'Year-month-day',
  inherit_color: 'Empty uses preset; #RRGGBB or #RRGGBBAA', invalid: '{path}: {reason}',
  error_boolean: 'Use true or false.', error_range: 'Use a number from {min} to {max}.', error_height: 'Use viewport or a number from 480 to 1600.', error_choice: 'Choose a supported option.', error_text: 'Use text of at most 100 characters.', error_color: 'Use an empty value or a six/eight-digit hex color.', error_locale: 'Use auto or a supported language tag.', error_zone: 'Use auto or a valid IANA timezone.', error_object: 'Use a mapping.', error_type: 'Use custom:info-dashboard.', error_version: 'Only schema version 1 is supported.',
};
const de = {
  content: 'Inhalt', clock: 'Uhr und Datum', appearance: 'Darstellung', layout: 'Anordnung', visibility: 'Sichtbarkeit', colors: 'Farben am Tag', night_colors: 'Farben bei Nacht',
  room: 'Raumname', date: 'Datum', readings: 'Messwerte', weather: 'Wetter', calendar: 'Kalender', co2_bar: 'CO₂-Anzeige', co2_value: 'CO₂-Messwert', co2_status: 'CO₂-Status', co2_marks: 'Schwellenmarkierungen',
  enabled: 'Aktiv', night: 'Nachts anzeigen', coming_up: 'Demnächst', today: 'Heute', soon: 'Beginnt bald', ongoing: 'Läuft gerade', all_day: 'Ganztägig', no_events: 'Keine anstehenden Termine', unavailable: 'Nicht verfügbar', awaiting: 'Kalender nicht verfügbar', weather_unavailable: 'Wetter nicht verfügbar', reading: 'Messwert', more: '+{count} weitere',
  empty_notice: 'In dieser Darstellung sind alle Inhalte ausgeblendet.', stage_notice: 'Stufe 1 enthält Uhr und Layout. Live-Messwerte, Wetter, Kalender und Nachtaktivierung folgen in späteren Stufen.',
  room_name: 'Raumname', language: 'Sprache (auto oder Sprachcode)', time_zone: 'Zeitzone (auto oder IANA-Name)', time_format: 'Zeitformat', date_format: 'Datumsformat',
  'appearance.day': 'Tagdesign', 'appearance.night': 'Nachtdesign', 'layout.height': 'Höhe (viewport oder Pixel)', 'layout.clock_scale': 'Uhrgröße', 'layout.text_scale': 'Textgröße', 'layout.left_width': 'Uhrspalte (%)', 'layout.rail_width': 'CO₂-Anzeige (%)', 'layout.spacing': 'Abstandsfaktor', motion: 'Sanfte Übergänge aktivieren',
  background: 'Hintergrund', text: 'Haupttext', muted: 'Nebentext', accent: 'Akzent', divider: 'Trennlinien', rail: 'Leere CO₂-Anzeige', auto: 'Home Assistant folgen', dark: 'Dunkelgrün', light: 'Warmes Papier', night_preset: 'Gedämpfte Nacht', long: 'Lang', short: 'Kurz', '12': '12 Stunden', '24': '24 Stunden', DMY: 'Tag / Monat / Jahr', MDY: 'Monat / Tag / Jahr', YMD: 'Jahr-Monat-Tag',
  inherit_color: 'Leer übernimmt das Design; #RRGGBB oder #RRGGBBAA', invalid: '{path}: {reason}', error_boolean: 'true oder false verwenden.', error_range: 'Eine Zahl von {min} bis {max} verwenden.', error_height: 'viewport oder eine Zahl von 480 bis 1600 verwenden.', error_choice: 'Eine unterstützte Option wählen.', error_text: 'Text mit höchstens 100 Zeichen verwenden.', error_color: 'Leer lassen oder eine sechs-/achtstellige Hex-Farbe verwenden.', error_locale: 'auto oder einen unterstützten Sprachcode verwenden.', error_zone: 'auto oder eine gültige IANA-Zeitzone verwenden.', error_object: 'Eine Zuordnung verwenden.', error_type: 'custom:info-dashboard verwenden.', error_version: 'Nur Schemaversion 1 wird unterstützt.',
};
export function translator(locale = 'en') {
  const dictionary = locale.toLowerCase().startsWith('de') ? de : en;
  return (key, values = {}) => (dictionary[key] ?? en[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
}
export function configErrorText(error, t) {
  return error.code ? t('invalid', { path: error.path, reason: t(`error_${error.code}`, error.args) }) : error.message;
}
