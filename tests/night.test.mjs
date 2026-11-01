import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, setPath, visibleFeatures } from '../src/config.js';
import { NightControl, scheduledNight, nightControlProblem } from '../src/night.js';
const hass = state => ({ connected: true, config: { time_zone: 'Europe/Berlin' }, states: { 'input_boolean.night': { state } } });
const config = normalizeConfig({ instance_id: 'room-a', night: { mode: 'entity', entity: 'input_boolean.night' } });
function store() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; }
test('schedule boundaries work across midnight, daytime intervals and HA timezone changes', () => {
  for (const [instant, expected] of [['2026-11-01T20:59:59Z', false], ['2026-11-01T21:00:00Z', true], ['2026-11-02T05:59:59Z', true], ['2026-11-02T06:00:00Z', false]]) {
    assert.equal(scheduledNight(new Date(instant), 'Europe/Berlin', '22:00', '07:00'), expected);
  }
  assert.equal(scheduledNight(new Date('2026-11-01T00:00:00Z'), 'UTC', '22:00', '07:00'), true);
  assert.equal(scheduledNight(new Date('2026-11-01T09:00:00Z'), 'UTC', '09:00', '17:00'), true);
  assert.equal(scheduledNight(new Date('2026-11-01T17:00:00Z'), 'UTC', '09:00', '17:00'), false);
  const c = normalizeConfig({ time_zone: 'America/New_York', night: { mode: 'schedule' } }), control = new NightControl();
  const now = new Date('2026-11-01T21:30:00Z');
  assert.equal(control.resolve(c, hass(), now), true);
  assert.equal(control.resolve(c, { config: { time_zone: 'UTC' } }, now), false);
  assert.equal(control.resolve(c, {}, now), true);
  assert.equal(nightControlProblem(c, {}), 'night_timezone_unavailable');
});
test('DST repeated and skipped wall-clock minutes and backwards clock changes re-evaluate directly', () => {
  for (const instant of ['2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z']) assert.equal(scheduledNight(new Date(instant), 'Europe/Berlin', '02:15', '02:45'), true);
  assert.equal(scheduledNight(new Date('2026-03-29T00:59:59Z'), 'Europe/Berlin', '02:30', '07:00'), false);
  assert.equal(scheduledNight(new Date('2026-03-29T01:00:00Z'), 'Europe/Berlin', '02:30', '07:00'), true);
  for (const [instant, expected] of [['2026-11-01T21:01Z', true], ['2026-11-01T20:59Z', false], ['2026-11-02T06:00Z', false]]) assert.equal(scheduledNight(new Date(instant), 'Europe/Berlin', '22:00', '07:00'), expected);
});
test('entity fallback survives reload and is isolated by instance and selected entity', () => {
  const storage = store(), control = new NightControl(() => storage);
  assert.equal(control.resolve(config, hass('unknown')), true);
  assert.equal(control.resolve(config, hass('off')), false);
  assert.equal(control.resolve(config, hass('unavailable')), false);
  assert.equal(new NightControl(() => storage).resolve(config, hass('unavailable')), false);
  assert.equal(control.resolve({ ...config, instance_id: 'room-b' }, hass('unavailable')), true);
  assert.equal(control.resolve({ ...config, night: { ...config.night, entity: 'switch.other' } }, hass('off')), true);
  assert.equal(control.resolve(config, hass('on')), true);
  assert.equal(new NightControl(() => storage).resolve(config, { ...hass('off'), connected: false }), true);
  assert.equal(nightControlProblem(config, hass('off')), '');
  assert.equal(nightControlProblem(config, hass('ON')), 'night_entity_unavailable');
});
test('blocked/corrupt storage keeps in-memory state; cross-tab reload reads the new state', () => {
  const storage = store(), a = new NightControl(() => storage), b = new NightControl(() => storage);
  a.resolve(config, hass('off')); b.resolve(config, hass('on')); a.reload();
  assert.equal(a.resolve(config, hass('unavailable')), true);
  storage.setItem(a.key, '{bad');
  const fresh = new NightControl(() => storage);
  assert.equal(fresh.resolve(config, hass('unavailable')), true); assert.equal(fresh.failed, true);
  const blocked = new NightControl(() => { throw Error('blocked'); });
  assert.equal(blocked.resolve(config, hass('off')), false);
  assert.equal(blocked.resolve(config, hass('unavailable')), false);
  assert.equal(blocked.failed, true);
  assert.equal(new NightControl(() => { throw Error('blocked'); }).resolve(config, hass('unavailable')), true);
});
test('night configuration validates drafts, preserves defaults, overrides and selections', () => {
  assert.equal(normalizeConfig({}).night.mode, 'off');
  for (const [path, value] of [['night', null], ['night.mode', 'auto'], ['night.start', '24:00'], ['night.end', '7:00'], ['night.entity', 'bad entity']]) {
    const input = {}; setPath(input, path, value); assert.throws(() => normalizeConfig(input), e => e.path === path);
  }
  assert.throws(() => normalizeConfig({ night: { start: '07:00' } }), /night.end/);
  assert.throws(() => normalizeConfig({ night: { mode: 'entity' } }), /instance_id/);
  const c = normalizeConfig({ ...config, appearance: { colors: { background: '#112233' }, night_colors: { background: '#000000' } }, features: { calendar: { enabled: false, night: true } } });
  assert.equal(visibleFeatures(c, true).calendar, false);
  assert.deepEqual(normalizeConfig(c), c);
  assert.equal(c.night.entity, 'input_boolean.night');
});
