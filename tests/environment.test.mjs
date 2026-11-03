import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../src/config.js';
import { numericState, formatReading, co2Presentation, environmentPresentation, forecastSummary } from '../src/environment.js';
import { translator } from '../src/i18n.js';
const t = translator('en');
const preferences = { locale: 'en-GB', timeZone: 'Europe/Berlin', hour12: false };
const state = (value, unit = '°C') => ({ entity_id: 'sensor.test', state: value, attributes: { unit_of_measurement: unit, friendly_name: 'Room' } });
const hass = (value, unit) => ({ connected: true, locale: { language: 'en-GB' }, states: { 'sensor.test': state(value, unit) } });
const co2 = normalizeConfig({ co2: { entity: 'sensor.test' } }).co2;
test('numeric sources reject unknown, empty, nonnumeric and nonfinite states', () => {
  for (const value of [undefined, null, true, 12, '', ' ', 'unknown', 'unavailable', '12 °C', 'NaN', 'Infinity', '0x10', '1e999']) assert.equal(numericState(value), null, String(value));
  for (const value of ['-2.5', '0', '001.2', '+1.25e3']) assert.equal(numericState(value), Number(value));
});
test('HA native value/unit parts are honored; explicit precision uses HA number style', () => {
  const entity = state('1234.56');
  const h = { locale: { number_format: 'decimal_comma' }, formatEntityStateToParts: () => [{ type: 'value', value: '1.234,6' }, { type: 'literal', value: ' ' }, { type: 'unit', value: '°C' }] };
  assert.deepEqual(formatReading(entity, h, preferences), { value: '1.234,6', unit: '°C' });
  assert.deepEqual(formatReading(entity, h, preferences, 2), { value: '1.234,56', unit: '°C' });
  assert.equal(formatReading(entity, { entities: { 'sensor.test': { display_precision: 0 } } }, preferences).value, '1,235');
  assert.equal(formatReading(state('0.00', '%'), {}, preferences).value, '0.00');
  assert.equal(formatReading(entity, { locale: { number_format: 'none' } }, preferences, 1).value, '1234.6');
});
test('ordered readings preserve slots and labels on failure; disabled items filter deliberately', () => {
  const config = normalizeConfig({ readings: [{ entity: 'sensor.test', label: 'Inside' }, { entity: 'sensor.missing', label: 'Outside' }, { entity: 'sensor.hidden', enabled: false }] });
  const present = h => environmentPresentation(config, h, preferences, t, [], new Date()).readings;
  assert.deepEqual(present(hass('21.4')).map(r => [r.label, r.value, r.inspectable]), [['Inside', '21.4', true], ['Outside', '—', false]]);
  assert.deepEqual(present({ ...hass('21.4'), connected: false }).map(r => [r.label, r.value]), [['Inside', '—'], ['Outside', '—']]);
  assert.equal(present(hass('unavailable'))[0].inspectable, true);
  assert.deepEqual(environmentPresentation(normalizeConfig({}), {}, preferences, t, [], new Date()).readings, []);
});
test('CO₂ equality enters each new band using raw values, independently of display rounding', () => {
  for (const [value, label] of [[799.99, 'Low'], [800, 'Raised'], [999.99, 'Raised'], [1000, 'Elevated'], [1399.99, 'Elevated'], [1400, 'High'], [1799.99, 'High'], [1800, 'Very high']]) {
    assert.equal(co2Presentation(co2, hass(String(value), 'ppm'), preferences, t).label, label);
  }
  const rounded = co2Presentation(co2, hass('799.99', 'ppm'), preferences, t);
  assert.equal(rounded.value, '800'); assert.equal(rounded.label, 'Low');
});
test('CO₂ clamps height without clamping value, preserves marks and neutralizes unavailable/wrong-unit sources', () => {
  const low = co2Presentation(co2, hass('250', 'ppm'), preferences, t);
  const high = co2Presentation(co2, hass('2800', 'ppm'), preferences, t);
  assert.equal(low.fraction, 0); assert.equal(low.value, '250'); assert.equal(high.fraction, 1); assert.equal(high.value, '2,800');
  assert.deepEqual(high.marks, [.25, .375, .625, .875]);
  for (const h of [{}, { ...hass('1000', 'ppm'), connected: false }, hass('unavailable', 'ppm'), hass('1000', 'ppb'), hass('1000', '°C')]) {
    const result = co2Presentation(co2, h, preferences, t); assert.equal(result.value, '—'); assert.equal(result.color, undefined); assert.equal(result.fraction, 0); assert.equal(result.label, 'Unavailable'); assert.equal(result.marks.length, 4);
  }
});
test('arbitrary CO₂ bands, empty labels, and no thresholds remain valid', () => {
  const single = normalizeConfig({ co2: { entity: 'sensor.test', base_label: '', thresholds: [] } }).co2;
  assert.equal(co2Presentation(single, hass('3000', 'ppm'), preferences, t).label, '');
  assert.deepEqual(co2Presentation(single, hass('3000', 'ppm'), preferences, t).marks, []);
  const many = normalizeConfig({ co2: { entity: 'sensor.test', thresholds: Array.from({ length: 20 }, (_, i) => ({ value: i * 100, color: '#112233', label: String(i) })) } }).co2;
  assert.equal(co2Presentation(many, hass('1250', 'ppm'), preferences, t).label, '12');
});
test('reading and band validation catches malformed drafts and preserves unknown nested settings', () => {
  for (const bad of [{ readings: [{}, {}, {}, {}, {}] }, { readings: null }, { readings: [null] }, { readings: [{ entity: 'light.wrong' }] }, { readings: [{ precision: 1.5 }] }, { co2: null }, { co2: { maximum: 400 } }, { co2: { thresholds: null } }, { co2: { thresholds: [{ value: 800 }, { value: 800 }] } }, { co2: { base_color: '' } }, { weather: { entity: 'sensor.wrong' } }]) assert.throws(() => normalizeConfig(bad));
  const original = { readings: [{ entity: 'sensor.test', custom: { retained: true } }], co2: { thresholds: [{ value: 42, custom: 'kept' }] } };
  const result = normalizeConfig(original); assert.deepEqual(normalizeConfig(result), result); assert.equal(result.readings[0].custom.retained, true); assert.equal(result.co2.thresholds[0].custom, 'kept'); assert.equal(original.readings[0].precision, undefined);
});
test('forecast selects the earliest strictly future usable period, expires naturally, and localizes day boundaries', () => {
  const now = new Date('2026-11-01T13:42:00Z');
  const items = [{ datetime: now.toISOString(), condition: 'sunny' }, { datetime: 'invalid', condition: 'sunny' }, { datetime: '2026-11-01T14:00:00Z' }, { datetime: '2026-11-02T08:00:00Z', condition: 'cloudy' }, { datetime: '2026-11-01T17:00:00Z', condition: 'rainy' }];
  assert.equal(forecastSummary(items, now, preferences, t), '18:00 · Rain');
  assert.equal(forecastSummary(items, new Date('2026-11-01T17:00:00Z'), preferences, t), 'Tomorrow · Cloudy');
  assert.equal(forecastSummary(items, new Date('2026-11-03'), preferences, t), '');
  assert.equal(forecastSummary([{ datetime: '2026-03-29T22:30:00Z', condition: 'rainy' }], new Date('2026-03-28T23:30:00Z'), preferences, translator('de')), 'Morgen · Regen');
});
test('weather is independent of outside temperature and forecast defaults off', () => {
  const config = normalizeConfig({ readings: [{ entity: 'sensor.test' }], weather: { entity: 'weather.home' }, features: { weather: { enabled: true } } });
  const h = hass('12'); h.states['weather.home'] = { state: 'sunny' };
  const present = (c, value) => environmentPresentation(c, value, preferences, t, [{ datetime: '2026-11-01T17:00:00Z', condition: 'rainy' }], new Date('2026-11-01T13:00:00Z'));
  assert.equal(present(config, h).weather.text, 'Sunny'); assert.equal(present(config, h).weather.forecast, '');
  assert.equal(present(config, hass('12')).readings[0].value, '12'); assert.equal(present(config, hass('12')).weather.text, 'Weather unavailable');
  config.weather.forecast = true; assert.equal(present(config, h).weather.forecast, '18:00 · Rain');
  assert.equal(present(config, { ...h, connected: false }).weather.forecast, '');
});

test('malformed and ambiguous forecast dates are omitted; midnight uses 00:00', () => {
  const now = new Date('2026-11-01T22:00:00Z');
  const invalid = [null, {}, { datetime: '2026-11-02', condition: 'sunny' }, { datetime: '2026-11-02T10:00:00', condition: 'sunny' }, { datetime: '2026-11-02T10:00:00Z', condition: 'invented' }];
  assert.equal(forecastSummary(invalid, now, preferences, t), '');
  assert.equal(forecastSummary([{ datetime: '2026-11-02T00:00:30Z', condition: 'sunny' }], new Date('2026-11-02T00:00:00Z'), { ...preferences, locale: 'en-US', timeZone: 'UTC' }, t), '00:00 · Sunny');
});
