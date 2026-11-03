import test from 'node:test';
import assert from 'node:assert/strict';
import { CalendarSource } from '../src/calendar-source.js';
import { normalizeConfig } from '../src/config.js';
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let now = Date.parse('2026-11-01T13:00:00Z'), updates = 0;
  const calls = [], config = normalizeConfig({ instance_id: 'test', features: { calendar: { enabled: true } }, calendar: { sources: [{ entity: 'calendar.a' }, { entity: 'calendar.b' }] } });
  const hass = { connected: true, connection: {}, states: { 'calendar.a': { state: 'off' }, 'calendar.b': { state: 'on' } }, callApi(method, path) { return new Promise((resolve, reject) => calls.push({ method, path, resolve, reject })); } };
  const source = new CalendarSource(() => updates++, () => now); t.after(() => source.stop());
  return { source, config, hass, calls, updates: () => updates, advance: ms => { now += ms; t.mock.timers.tick(ms); } };
}
const event = title => ({ summary: title, start: { dateTime: '2026-11-01T12:00:00Z' }, end: { dateTime: '2026-11-01T15:00:00Z' } });
test('range retrieval buffers date boundaries and does not wait for other sources', async t => {
  const { source, config, hass, calls } = setup(t); source.update(config, hass, true); await flush();
  assert.equal(calls.length, 2); assert.equal(calls[0].method, 'GET');
  const url = new URL(calls[0].path, 'http://ha/'); assert.equal(url.pathname, '/calendars/calendar.a'); assert.equal(url.searchParams.get('start'), '2026-10-31T00:00:00.000Z'); assert.equal(url.searchParams.get('end'), '2026-11-10T00:00:00.000Z');
  calls[0].resolve([event('A')]); await flush(); assert.equal(source.records.get('calendar.a').status, 'ready'); assert.equal(source.records.get('calendar.b').status, 'loading');
  source.update({ ...config, room_name: 'Changed' }, { ...hass }, true); await flush(); assert.equal(calls.length, 2);
});
test('failure retains cached rows as outdated; successful siblings stay fresh; a later refresh recovers', async t => {
  const { source, config, hass, calls, advance } = setup(t); source.update(config, hass, true); await flush();
  calls[0].resolve([event('A')]); calls[1].resolve([]); await flush(); advance(60000); await flush();
  calls[2].reject(new Error('offline')); calls[3].resolve([event('B')]); await flush();
  assert.equal(source.records.get('calendar.a').status, 'error'); assert.equal(source.records.get('calendar.a').events[0].title, 'A'); assert.equal(source.records.get('calendar.b').status, 'ready');
  advance(60000); await flush(); calls[4].resolve([]); calls[5].resolve([]); await flush(); assert.equal(source.records.get('calendar.a').status, 'ready'); assert.deepEqual(source.records.get('calendar.a').events, []);
});
test('timeouts invalidate late responses and retry on the next cycle', async t => {
  const { source, config, hass, calls, advance } = setup(t); source.update(config, hass, true); await flush(); advance(15000);
  assert.equal(source.records.get('calendar.a').status, 'error'); calls[0].resolve([event('Late')]); await flush(); assert.deepEqual(source.records.get('calendar.a').events, []);
  advance(45000); await flush(); assert.equal(calls.length, 4);
});
test('entity changes and removal cancel timers and prevent obsolete requests from publishing', async t => {
  const { source, config, hass, calls, advance, updates } = setup(t); source.update(config, hass, true); await flush();
  source.update({ ...config, calendar: { ...config.calendar, sources: [{ entity: 'calendar.b', enabled: true }] } }, hass, true);
  calls[0].resolve([event('Old A')]); await flush(); assert.equal(source.records.has('calendar.a'), false);
  source.stop(); const stopped = updates(); calls[1].resolve([event('Old B')]); advance(120000); await flush(); assert.equal(updates(), stopped); assert.equal(calls.length, 2); assert.equal(source.timer, undefined);
});
test('disconnect and disabled section suppress retrieval; recovery refetches without duplicate polls', async t => {
  const { source, config, hass, calls, advance } = setup(t); source.update({ ...config, features: { ...config.features, calendar: { enabled: false } } }, hass, true); await flush(); assert.equal(calls.length, 0);
  source.update(config, hass, true); await flush(); calls[0].resolve([]); calls[1].resolve([]); await flush();
  source.update(config, { ...hass, connected: false }, true); advance(60000); await flush(); assert.equal(calls.length, 2);
  source.update(config, hass, true); await flush(); assert.equal(calls.length, 4);
  source.update(config, hass, true); await flush(); assert.equal(calls.length, 4);
});
test('missing entities and malformed responses are failures rather than successfully empty sources', async t => {
  const { source, config, hass, calls } = setup(t); source.update(config, { ...hass, states: { 'calendar.a': { state: 'off' } } }, true); await flush(); assert.equal(calls.length, 1); assert.equal(source.records.get('calendar.b').status, 'error');
  calls[0].resolve([event('Valid'), { invalid: true }]); await flush(); assert.equal(source.records.get('calendar.a').status, 'error'); assert.equal(source.records.get('calendar.a').events.length, 1);
  source.update(config, hass, true); await flush(); assert.equal(calls.length, 2); calls[1].resolve({ events: [] }); await flush(); assert.equal(source.records.get('calendar.b').status, 'error');
});

test('lookahead changes and long clock jumps invalidate pending requests for the old range', async t => {
  const { source, config, hass, calls, advance } = setup(t); source.update(config, hass, true); await flush();
  source.update({ ...config, calendar: { ...config.calendar, lookahead_days: 2 } }, hass, true); await flush();
  assert.equal(calls.length, 4); calls[0].resolve([event('Old range')]); await flush(); assert.deepEqual(source.records.get('calendar.a').events, []);
  const url = new URL(calls[2].path, 'http://ha/'); assert.equal(url.searchParams.get('end'), '2026-11-05T00:00:00.000Z');
  advance(120000); await flush(); source.ensureFresh();
  calls[2].resolve([event('Before suspension')]); await flush(); assert.ok(source.records.get('calendar.a').events.every(e => e.title !== 'Before suspension'));
});

test('timezone changes requery buffered dates and invalidate the prior response', async t => {
  const { source, config, hass, calls } = setup(t); source.update(config, hass, true, 'Pacific/Kiritimati'); await flush();
  assert.equal(new URL(calls[0].path, 'http://ha/').searchParams.get('start'), '2026-11-01T00:00:00.000Z');
  source.update(config, hass, true, 'Pacific/Honolulu'); await flush();
  assert.equal(new URL(calls[2].path, 'http://ha/').searchParams.get('start'), '2026-10-31T00:00:00.000Z');
  calls[0].resolve([event('Old timezone')]); await flush(); assert.equal(source.records.get('calendar.a').events.length, 0);
});
