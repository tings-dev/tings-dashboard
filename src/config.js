export const CARD_TYPE = 'custom:info-dashboard';
export const THEMES = {
  dark: { background: '#111917', text: '#f1eee6', muted: '#b7c2b8', accent: '#dfc495', divider: '#ffffff1d', rail: '#ffffff06' },
  light: { background: '#f4f0e7', text: '#273b34', muted: '#56665a', accent: '#79602b', divider: '#30443425', rail: '#253a2b09' },
  night: { background: '#090e0d', text: '#aeb6aa', muted: '#8e9e92', accent: '#c0aa87', divider: '#ffffff14', rail: '#ffffff04' },
};
export const FEATURES = ['room', 'clock', 'date', 'readings', 'weather', 'calendar', 'co2_bar', 'co2_value', 'co2_status', 'co2_marks'];
const field = (path, kind, defaultValue, group, extra = {}) => ({ path, kind, defaultValue, group, ...extra });
// One schema supplies defaults, validation, editor controls, and configuration docs.
export const DEFAULT_THRESHOLDS = [
  { value: 800, color: '#c5c691', label: 'Raised' },
  { value: 1000, color: '#d9b36f', label: 'Elevated' },
  { value: 1400, color: '#db8d64', label: 'High' },
  { value: 1800, color: '#c96964', label: 'Very high' },
];
export const FIELDS = [
  field('instance_id', 'instance', '', 'calendar_settings'),
  field('calendar.lookahead_days', 'integer', 7, 'calendar_settings', { min: 1, max: 31 }),
  field('calendar.max_entries', 'integer', 6, 'calendar_settings', { min: 1, max: 30 }),
  field('calendar.max_all_day', 'integer', 2, 'calendar_settings', { min: 0, max: 10 }),
  field('calendar.soon_enabled', 'boolean', true, 'calendar_settings'),
  field('calendar.soon_minutes', 'integer', 30, 'calendar_settings', { min: 0, max: 1440 }),
  field('calendar.ongoing_enabled', 'boolean', true, 'calendar_settings'),
  field('calendar.priority', 'select', 'ongoing', 'calendar_settings', { options: ['ongoing', 'soon'] }),
  field('calendar.dismiss', 'boolean', true, 'calendar_settings'),
  field('calendar.show_names', 'boolean', true, 'calendar_settings'),
  field('calendar.show_colors', 'boolean', true, 'calendar_settings'),
  field('co2.entity', 'entity', '', 'co2', { domain: 'sensor' }),
  field('co2.minimum', 'number', 400, 'co2', { min: 0, max: 1000000 }),
  field('co2.maximum', 'number', 2000, 'co2', { min: 0, max: 1000000 }),
  field('co2.base_color', 'band_color', '#8daea0', 'co2'),
  field('co2.base_label', 'text', 'Low', 'co2'),
  field('weather.entity', 'entity', '', 'weather', { domain: 'weather' }),
  field('weather.forecast', 'boolean', false, 'weather'),
  field('weather.forecast_type', 'select', 'auto', 'weather', { options: ['auto', 'hourly', 'daily', 'twice_daily'] }),
  field('room_name', 'text', '', 'content'),
  field('language', 'locale', 'auto', 'clock'),
  field('time_zone', 'zone', 'auto', 'clock'),
  field('time_format', 'select', 'auto', 'clock', { options: ['auto', '12', '24'] }),
  field('date_format', 'select', 'auto', 'clock', { options: ['auto', 'long', 'short', 'DMY', 'MDY', 'YMD'] }),
  field('appearance.day', 'select', 'dark', 'appearance', { options: ['dark', 'light', 'night'] }),
  field('appearance.night', 'select', 'night', 'appearance', { options: ['dark', 'light', 'night'] }),
  field('layout.height', 'height', 'viewport', 'layout'),
  field('layout.clock_scale', 'number', 1, 'layout', { min: 0.85, max: 1.1, step: 0.05 }),
  field('layout.text_scale', 'number', 1, 'layout', { min: 0.9, max: 1.1, step: 0.05 }),
  field('layout.left_width', 'number', 55, 'layout', { min: 50, max: 60, step: 1 }),
  field('layout.rail_width', 'number', 7, 'layout', { min: 6, max: 10, step: 1 }),
  field('layout.spacing', 'number', 1, 'layout', { min: 0.85, max: 1.1, step: 0.05 }),
  field('motion', 'boolean', true, 'appearance'),
  ...FEATURES.flatMap(name => [
    field(`features.${name}.enabled`, 'boolean', ['room', 'clock', 'date'].includes(name), 'visibility'),
    field(`features.${name}.night`, 'boolean', ['clock', 'date', 'readings'].includes(name), 'visibility'),
  ]),
  ...['colors', 'night_colors'].flatMap(group => Object.keys(THEMES.dark).map(name =>
    field(`appearance.${group}.${name}`, 'color', '', group))),
];
export function getPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}
export function setPath(object, path, value) {
  const keys = path.split('.');
  let parent = object;
  for (const key of keys.slice(0, -1)) parent = parent[key] ??= {};
  parent[keys.at(-1)] = value;
}
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
export class ConfigError extends Error {
  constructor(path, code, args = {}) {
    super(`${path}: ${code}${args.min !== undefined ? ` (${args.min}–${args.max})` : ''}`);
    this.path = path; this.code = code; this.args = args;
  }
}
export function validateField(field, value) {
  const bad = (code, args) => { throw new ConfigError(field.path, code, args); };
  switch (field.kind) {
    case 'instance': if (typeof value !== 'string' || (value !== '' && !/^[a-zA-Z0-9_-]{1,100}$/.test(value))) bad('instance'); break;
    case 'optional_color': if (typeof value !== 'string' || (value !== '' && !/^#[\da-f]{6}$/i.test(value))) bad('optional_color'); break;
    case 'integer': if (!Number.isInteger(value) || value < field.min || value > field.max) bad('integer', field); break;
    case 'entity': if (typeof value !== 'string' || (value !== '' && !new RegExp(`^${field.domain}\\.[a-z0-9_]+$`).test(value))) bad('entity', { domain: field.domain }); break;
    case 'precision': if (value !== 'auto' && !(Number.isInteger(value) && value >= 0 && value <= 6)) bad('precision'); break;
    case 'band_color': if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) bad('band_color'); break;
    case 'boolean': if (typeof value !== 'boolean') bad('boolean'); break;
    case 'number': if (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max) bad('range', field); break;
    case 'height': if (value !== 'viewport' && !(Number.isFinite(value) && value >= 480 && value <= 1600)) bad('height'); break;
    case 'select': if (!field.options.includes(value)) bad('choice'); break;
    case 'text': if (typeof value !== 'string' || value.length > 100) bad('text'); break;
    case 'color': if (typeof value !== 'string' || (value !== '' && !/^#(?:[\da-f]{6}|[\da-f]{8})$/i.test(value))) bad('color'); break;
    case 'locale':
      if (value !== 'auto') { try { if (typeof value !== 'string' || !value || !Intl.DateTimeFormat.supportedLocalesOf([value]).length) bad('locale'); } catch { bad('locale'); } } break;
    case 'zone':
      if (value !== 'auto') { try { if (typeof value !== 'string' || !value) bad('zone'); new Intl.DateTimeFormat('en', { timeZone: value }); } catch { bad('zone'); } } break;
  }
}
export function normalizeConfig(input) {
  if (!plain(input)) throw new ConfigError('config', 'object');
  if (input.type !== undefined && input.type !== CARD_TYPE) throw new ConfigError('type', 'type');
  if (input.schema_version !== undefined && input.schema_version !== 1) throw new ConfigError('schema_version', 'version');
  for (const path of ['calendar', 'co2', 'weather', 'appearance', 'appearance.colors', 'appearance.night_colors', 'layout', 'features', ...FEATURES.map(f => `features.${f}`)]) {
    const value = getPath(input, path);
    if (value !== undefined && !plain(value)) throw new ConfigError(path, 'object');
  }
  const result = structuredClone(input);
  result.type = CARD_TYPE; result.schema_version = 1;
  result.readings = input.readings === undefined ? [] : structuredClone(input.readings);
  if (!Array.isArray(result.readings) || result.readings.length > 4) throw new ConfigError('readings', 'readings');
  result.calendar ??= {};
  result.calendar.sources = input.calendar?.sources === undefined ? [] : structuredClone(input.calendar.sources);
  if (!Array.isArray(result.calendar.sources) || result.calendar.sources.length > 16) throw new ConfigError('calendar.sources', 'calendar_sources');
  result.co2 ??= {};
  result.co2.thresholds = input.co2?.thresholds === undefined ? structuredClone(DEFAULT_THRESHOLDS) : structuredClone(input.co2.thresholds);
  if (!Array.isArray(result.co2.thresholds)) throw new ConfigError('co2.thresholds', 'thresholds');
  for (const path of ['readings', 'co2.thresholds', 'calendar.sources']) {
    getPath(result, path).forEach((item, index) => { if (!plain(item)) throw new ConfigError(`${path}.${index}`, 'object'); });
  }
  for (const definition of configFields(result)) {
    const supplied = getPath(result, definition.path);
    const value = supplied === undefined ? definition.defaultValue : supplied;
    validateField(definition, value);
    setPath(result, definition.path, value);
  }
  if (result.co2.maximum <= result.co2.minimum) throw new ConfigError('co2.maximum', 'co2_range');
  result.co2.thresholds.forEach((band, index, bands) => {
    if (index && band.value <= bands[index - 1].value) throw new ConfigError(`co2.thresholds.${index}.value`, 'threshold_order');
  });
  const entities = new Set();
  result.calendar.sources.forEach((source, index) => {
    if (source.entity && entities.has(source.entity)) throw new ConfigError(`calendar.sources.${index}.entity`, 'duplicate_calendar');
    if (source.entity) entities.add(source.entity);
  });
  if (result.features.calendar.enabled && result.calendar.dismiss && result.calendar.sources.some(s => s.enabled && s.entity) && !result.instance_id) throw new ConfigError('instance_id', 'instance_required');
  return result;
}
export function configFields(config) {
  return [...FIELDS,
    ...(config.calendar?.sources ?? []).flatMap((_, i) => [
      field(`calendar.sources.${i}.entity`, 'entity', '', 'calendar_sources', { domain: 'calendar', label: 'calendar_entity' }),
      field(`calendar.sources.${i}.label`, 'text', '', 'calendar_sources', { label: 'calendar_label' }),
      field(`calendar.sources.${i}.color`, 'optional_color', '', 'calendar_sources', { label: 'calendar_color' }),
      field(`calendar.sources.${i}.enabled`, 'boolean', true, 'calendar_sources', { label: 'enabled' }),
    ]),
    ...(config.readings ?? []).flatMap((_, i) => [
      field(`readings.${i}.entity`, 'entity', '', 'readings', { domain: 'sensor', label: 'entity' }),
      field(`readings.${i}.label`, 'text', '', 'readings', { label: 'reading_label' }),
      field(`readings.${i}.precision`, 'precision', 'auto', 'readings', { label: 'precision' }),
      field(`readings.${i}.enabled`, 'boolean', true, 'readings', { label: 'enabled' }),
      field(`readings.${i}.night`, 'boolean', true, 'readings', { label: 'night' }),
    ]),
    ...(config.co2?.thresholds ?? []).flatMap((_, i) => [
      field(`co2.thresholds.${i}.value`, 'number', 800, 'thresholds', { min: 0, max: 1000000, label: 'threshold_value' }),
      field(`co2.thresholds.${i}.color`, 'band_color', '#c5c691', 'thresholds', { label: 'band_color' }),
      field(`co2.thresholds.${i}.label`, 'text', '', 'thresholds', { label: 'band_label' }),
    ]),
  ];
}
export function visibleFeatures(config, night) {
  return Object.fromEntries(FEATURES.map(key => [key, config.features[key].enabled && (!night || config.features[key].night)]));
}
export function palette(config, night) {
  const colors = { ...THEMES[config.appearance[night ? 'night' : 'day']] };
  for (const [key, value] of Object.entries(config.appearance[night ? 'night_colors' : 'colors'])) {
    if (key in colors && value) colors[key] = value;
  }
  return colors;
}

export function createInstanceId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // getRandomValues also works when HA is served over local HTTP.
  return [...globalThis.crypto.getRandomValues(new Uint8Array(16))].map(n => n.toString(16).padStart(2, '0')).join('');
}
