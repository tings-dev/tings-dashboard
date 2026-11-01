export const CARD_TYPE = 'custom:info-dashboard';
export const THEMES = {
  dark: { background: '#111917', text: '#f1eee6', muted: '#b7c2b8', accent: '#dfc495', divider: '#ffffff1d', rail: '#ffffff06' },
  light: { background: '#f4f0e7', text: '#273b34', muted: '#56665a', accent: '#79602b', divider: '#30443425', rail: '#253a2b09' },
  night: { background: '#090e0d', text: '#aeb6aa', muted: '#8e9e92', accent: '#c0aa87', divider: '#ffffff14', rail: '#ffffff04' },
};
export const FEATURES = ['room', 'clock', 'date', 'readings', 'weather', 'calendar', 'co2_bar', 'co2_value', 'co2_status', 'co2_marks'];
const field = (path, kind, defaultValue, group, extra = {}) => ({ path, kind, defaultValue, group, ...extra });
// One schema supplies defaults, validation, editor controls, and configuration docs.
export const FIELDS = [
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
  for (const path of ['appearance', 'appearance.colors', 'appearance.night_colors', 'layout', 'features', ...FEATURES.map(f => `features.${f}`)]) {
    const value = getPath(input, path);
    if (value !== undefined && !plain(value)) throw new ConfigError(path, 'object');
  }
  const result = structuredClone(input);
  result.type = CARD_TYPE; result.schema_version = 1;
  for (const definition of FIELDS) {
    const supplied = getPath(input, definition.path);
    const value = supplied === undefined ? definition.defaultValue : supplied;
    validateField(definition, value);
    setPath(result, definition.path, value);
  }
  return result;
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
