import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, stringify } from 'yaml';
import { FIELDS, getPath, normalizeConfig, palette, setPath, visibleFeatures } from '../src/config.js';
test('minimal defaults are room-neutral and preserve explicit empty/false values', () => {
  const c = normalizeConfig({ room_name: '', features: { clock: { enabled: false } } });
  assert.equal(c.features.clock.enabled, false); assert.equal(c.features.calendar.enabled, false);
  assert.equal(c.room_name, ''); assert.equal(c.appearance.preset, 'dark');
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
test('visibility follows enabled flags and preserves selections', () => {
  const c = normalizeConfig({ features: { calendar: { enabled: false, entity: 'calendar.example' }, co2_value: { enabled: true } } });
  assert.equal(visibleFeatures(c).calendar, false); assert.equal(visibleFeatures(c).co2_value, true);
  assert.equal(c.features.calendar.entity, 'calendar.example');
});
test('color overrides apply to the selected preset and empty means inherit', () => {
  const c = normalizeConfig({ appearance: { preset: 'light', colors: { text: '#112233', background: '' } } });
  assert.equal(palette(c).text, '#112233'); assert.equal(palette(c).background, '#f4f0e7');
});
test('old settings carry over day appearance and discard all removed night fields', () => {
  const input = { night: { mode: 'entity', entity: 'input_boolean.missing' }, appearance: { day: 'light', night: 'dark', colors: { text: '#112233' }, night_colors: { text: '#ffffff' } }, features: { calendar: { enabled: false, night: true }, co2_value: { enabled: true, night: false } }, readings: [{ entity: 'sensor.room', night: false, future: 'keep' }] };
  const before = structuredClone(input), c = normalizeConfig(input);
  assert.equal(c.appearance.preset, 'light'); assert.equal(palette(c).text, '#112233');
  assert.equal(visibleFeatures(c).calendar, false); assert.equal(visibleFeatures(c).co2_value, true);
  assert.equal(c.readings[0].enabled, true); assert.equal(c.readings[0].future, 'keep');
  assert.deepEqual(input, before); assert.deepEqual(normalizeConfig(parse(stringify(c))), c);
  assert.equal(JSON.stringify(c).includes('night'), false); assert.equal('day' in c.appearance, false);
  assert.ok(FIELDS.every(f => !f.path.includes('night')));
  assert.equal(normalizeConfig({ appearance: { day: 'night' } }).appearance.preset, 'dark');
  assert.equal(normalizeConfig({ appearance: { day: 'light', preset: 'dark' } }).appearance.preset, 'dark');
});
for (const [path, values] of [
  ['layout.clock_scale', ['', null, NaN, Infinity, .1, 2]], ['layout.height', ['480px', 479, null]],
  ['appearance.preset', ['night', 'unknown', null]],
  ['features.clock.enabled', ['false', 0, null]], ['appearance.colors.text', ['red', 'url(https://example.com)', '#abc', '']],
  ['time_zone', ['Mars/Base']], ['language', ['invalid_locale']], ['schema_version', [2]], ['type', ['custom:other']],
]) test(`invalid ${path} reports the exact field without losing valid input`, () => {
  for (const value of values) { if (path.endsWith('.text') && value === '') continue; const c = {}; setPath(c, path, value); assert.throws(() => normalizeConfig(c), error => error.path === path, String(value)); }
});
test('malformed mapping sections are rejected instead of falling back to defaults', () => {
  for (const value of [null, [], 'dark']) assert.throws(() => normalizeConfig({ appearance: value }), /appearance/);
});
