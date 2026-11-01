import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, stringify } from 'yaml';
import { FIELDS, getPath, normalizeConfig, palette, setPath, visibleFeatures } from '../src/config.js';
test('minimal defaults are room-neutral and preserve explicit empty/false values', () => {
  const c = normalizeConfig({ room_name: '', features: { clock: { enabled: false } } });
  assert.equal(c.features.clock.enabled, false); assert.equal(c.features.calendar.enabled, false);
  assert.equal(c.room_name, ''); assert.equal(c.appearance.day, 'dark');
  assert.ok(FIELDS.every(f => getPath(c, f.path) !== undefined));
});
test('normalization is idempotent, does not mutate input, and preserves HA/future keys', () => {
  const input = { view_layout: { position: 'main' }, appearance: { future: { token: 'kept' } }, features: { calendar: { enabled: false, entity: 'calendar.example' } } };
  const before = structuredClone(input), c = normalizeConfig(input);
  assert.deepEqual(input, before); assert.deepEqual(normalizeConfig(c), c);
  assert.equal(c.features.calendar.entity, 'calendar.example'); assert.equal(c.appearance.future.token, 'kept');
  c.view_layout.position = 'edited'; assert.equal(input.view_layout.position, 'main');
});
test('YAML round trip preserves every supported field and extra HA metadata', () => {
  const c = normalizeConfig({ language: 'de-DE', time_zone: 'Europe/Berlin', time_format: '24', layout: { clock_scale: .9 }, appearance: { colors: { background: '#ffffff' } }, grid_options: { columns: 12 } });
  assert.deepEqual(normalizeConfig(parse(stringify(c))), c);
});
test('night visibility intersects enabled flags and does not erase settings', () => {
  const c = normalizeConfig({ features: { calendar: { enabled: false, night: true }, co2_value: { enabled: true, night: false } } });
  assert.equal(visibleFeatures(c, true).calendar, false); assert.equal(visibleFeatures(c, true).co2_value, false);
  assert.equal(visibleFeatures(c, false).co2_value, true); assert.equal(c.features.calendar.night, true);
});
test('day and night color overrides are independent and empty means inherit', () => {
  const c = normalizeConfig({ appearance: { day: 'light', colors: { text: '#112233' }, night_colors: { background: '#000000' } } });
  assert.equal(palette(c, false).text, '#112233'); assert.equal(palette(c, true).background, '#000000'); assert.equal(palette(c, true).text, '#aeb6aa');
});
for (const [path, values] of [
  ['layout.clock_scale', ['', null, NaN, Infinity, .1, 2]], ['layout.height', ['480px', 479, null]],
  ['features.clock.enabled', ['false', 0, null]], ['appearance.colors.text', ['red', 'url(https://example.com)', '#abc', '']],
  ['time_zone', ['Mars/Base']], ['language', ['invalid_locale']], ['schema_version', [2]], ['type', ['custom:other']],
]) test(`invalid ${path} reports the exact field without losing valid input`, () => {
  for (const value of values) { if (path.endsWith('.text') && value === '') continue; const c = {}; setPath(c, path, value); assert.throws(() => normalizeConfig(c), error => error.path === path, String(value)); }
});
test('malformed mapping sections are rejected instead of falling back to defaults', () => {
  for (const value of [null, [], 'dark']) assert.throws(() => normalizeConfig({ appearance: value }), /appearance/);
});
