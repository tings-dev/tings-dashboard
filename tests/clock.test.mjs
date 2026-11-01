import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../src/config.js';
import { makeClockFormatter, resolveClockPreferences } from '../src/clock.js';
const hass = { locale: { language: 'en-GB', time_format: '24', date_format: 'language', time_zone: 'server' }, config: { time_zone: 'Europe/Berlin' } };
const format = (config, source = hass, system) => makeClockFormatter(resolveClockPreferences(normalizeConfig(config), source, system));
test('server timezone crosses midnight without displaying 24:00', () => {
  const value = format({ date_format: 'YMD' })(new Date('2026-11-01T23:00:00Z'));
  assert.equal(value.digits, '00:00'); assert.equal(value.date, '2026-11-02');
});
test('DST repeated hour follows timezone rules', () => {
  const f = format({});
  assert.equal(f(new Date('2026-10-25T00:30:00Z')).digits, '02:30');
  assert.equal(f(new Date('2026-10-25T01:30:00Z')).digits, '02:30');
  assert.equal(f(new Date('2026-10-25T02:30:00Z')).digits, '03:30');
});
test('12-hour day period is separated without losing accessible full time', () => {
  const value = format({ language: 'en-US', time_format: '12' })(new Date('2026-11-01T13:42:00Z'));
  assert.equal(value.digits, '2:42'); assert.equal(value.dayPeriod, 'PM'); assert.match(value.accessibleTime, /PM/);
});
test('explicit locale/timezone override HA preferences', () => {
  const value = format({ language: 'de-DE', time_zone: 'America/New_York', date_format: 'long' })(new Date('2026-11-01T01:30:00Z'));
  assert.equal(value.digits, '21:30'); assert.match(value.date, /Samstag.*31.*Oktober/);
});
test('auto follows local/server and system/language format settings', () => {
  const c = normalizeConfig({}); const system = { language: 'en-US', timeZone: 'America/Los_Angeles' };
  const p = resolveClockPreferences(c, { ...hass, locale: { ...hass.locale, time_format: 'system', time_zone: 'local', date_format: 'system' } }, system);
  assert.equal(p.hour12, true); assert.equal(p.timeZone, 'America/Los_Angeles'); assert.equal(p.dateLocale, 'en-US');
  const server = resolveClockPreferences(c, hass, system); assert.equal(server.hour12, false); assert.equal(server.timeZone, 'Europe/Berlin');
});
test('numeric date order overrides preserve the selected calendar date', () => {
  const instant = new Date('2026-11-01T13:42:00Z');
  assert.equal(format({ date_format: 'DMY' })(instant).date, '01/11/2026');
  assert.equal(format({ date_format: 'MDY' })(instant).date, '11/01/2026');
});
