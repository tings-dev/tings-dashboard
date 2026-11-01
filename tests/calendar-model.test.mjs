import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../src/config.js';
import { normalizeEvent, selectCalendar, calendarPresentation, dateKey, FRESH_MS } from '../src/calendar-model.js';
import { translator } from '../src/i18n.js';
const now = Date.parse('2026-11-01T13:00:00Z'), zone = 'Europe/Berlin';
const raw = (title, start, end) => ({ summary: title, start: { dateTime: new Date(start).toISOString() }, end: { dateTime: new Date(end).toISOString() } });
const event = (title = 'Meeting', start = now, end = now + 3600000) => normalizeEvent(raw(title, start, end));
const config = overrides => normalizeConfig({ calendar: { sources: [{ entity: 'calendar.a', label: 'A' }, { entity: 'calendar.b', label: 'B' }], ...overrides } }).calendar;
const records = (a, b = [], time = now) => new Map([['calendar.a', { status: 'ready', updatedAt: time, events: a }], ['calendar.b', { status: 'ready', updatedAt: time, events: b }]]);
const select = (c, r, time = now, dismissed) => selectCalendar(c, r, time, zone, dismissed);
test('REST objects and string timestamps normalize to the same occurrence identity across offsets', () => {
  const a = normalizeEvent(raw('Exact title', now, now + 3600000));
  const b = normalizeEvent({ summary: 'Exact title', start: '2026-11-01T14:00:00+01:00', end: '2026-11-01T15:00:00+01:00' });
  assert.deepEqual(a, b);
  assert.notEqual(normalizeEvent(raw('Exact title ', now, now + 3600000)).key, a.key);
  for (const value of [null, {}, { summary: 'Missing end', start: { dateTime: '2026-11-01T13:00:00Z' } }, raw('Reversed', now + 1, now), { summary: 'Naive', start: '2026-11-01T13:00:00', end: '2026-11-01T14:00:00' }, { summary: 'Mixed', start: { date: '2026-11-01' }, end: { dateTime: '2026-11-02T00:00:00Z' } }]) assert.equal(normalizeEvent(value), null);
});
test('soon/start/end boundaries are exact and independent switches return events to the agenda', () => {
  const e = event('Boundary', now + 1800000, now + 3600000), c = config();
  for (const [time, mode] of [[now - 1, undefined], [now, 'soon'], [e.start - 1, 'soon'], [e.start, 'ongoing'], [e.end - 1, 'ongoing'], [e.end, undefined]]) {
    const result = select(c, records([e], [], time), time); assert.equal(result.focus?.mode, mode);
    assert.equal(result.timed.length, time >= e.end ? 0 : 1);
  }
  assert.equal(select(config({ soon_enabled: false }), records([e])).focus, undefined);
  assert.equal(select(config({ ongoing_enabled: false }), records([event()])).focus, undefined);
  assert.equal(select(config({ soon_minutes: 0 }), records([e])).focus, undefined);
});
test('priority and tie breaks are stable: earliest start, configured source order, then exact title', () => {
  const old = event('Earlier', now - 120000), sameA = event('Zulu', now - 60000), sameB = event('Alpha', now - 60000), soon = event('Soon', now + 60000);
  const r = records([sameA, old, soon], [sameB]);
  assert.equal(select(config(), r).focus.title, 'Earlier');
  assert.equal(select(config({ priority: 'soon' }), r).focus.title, 'Soon');
  assert.equal(select(config({ priority: 'soon' }), r).next.title, 'Earlier');
  assert.equal(select(config(), records([sameA], [sameB])).focus.title, 'Zulu');
  assert.equal(select(config(), records([sameA, sameB])).focus.title, 'Alpha');
  const reversed = config(); reversed.sources.reverse(); assert.equal(select(reversed, records([sameA], [sameB])).focus.title, 'Alpha');
});
test('exact duplicates merge source identities; one fresh source keeps a merged event eligible', () => {
  const e = event(), r = records([e], [e, event('Different title')]);
  r.get('calendar.a').status = 'error';
  const result = select(config(), r);
  assert.equal(result.timed.length, 2); assert.equal(result.timed.find(x => x.key === e.key).sources.length, 2);
  assert.equal(result.timed.find(x => x.key === e.key).fresh, true); assert.equal(result.failed, 1);
  r.get('calendar.b').status = 'error'; const stale = select(config(), r); assert.equal(stale.focus, undefined); assert.ok(stale.timed.every(e => !e.fresh));
  assert.equal(select(config(), r, now + 3600000).timed.length, 0);
});
test('focus loses expired freshness even before a delayed poll finishes', () => {
  const r = records([event()]);
  assert.equal(select(config(), r, now + FRESH_MS - 1).focus.title, 'Meeting');
  const stale = select(config(), r, now + FRESH_MS); assert.equal(stale.focus, undefined); assert.equal(stale.failed, 2); assert.equal(stale.timed.length, 1);
  assert.equal(select(config(), r, now - 1).focus, undefined, 'future refresh timestamp after clock rollback is not fresh');
});
test('empty and unavailable are distinct, while successful sources continue through partial failure', () => {
  const r = records([]); assert.equal(select(config(), r).state, 'ready');
  r.get('calendar.a').status = 'error'; const partial = select(config(), r); assert.equal(partial.state, 'ready'); assert.equal(partial.failed, 1);
  r.get('calendar.b').status = 'error'; assert.equal(select(config(), r).state, 'unavailable');
  r.get('calendar.a').status = 'loading'; assert.equal(select(config(), r).state, 'loading');
});
test('all-day dates retain their dates and exclusive end across midnight and DST', () => {
  const holiday = normalizeEvent({ summary: 'Holiday', start: { date: '2026-10-24' }, end: { date: '2026-10-27' } });
  const time = Date.parse('2026-10-24T22:30:00Z'); // October 25 in Berlin, before the clock change.
  const result = select(config(), records([holiday], [], time), time);
  assert.deepEqual(result.allDay.map(e => e.day), ['2026-10-25', '2026-10-26']); assert.equal(result.focus, undefined);
  assert.equal(select(config(), records([holiday], [], time), Date.parse('2026-10-26T23:00:00Z')).allDay.length, 0);
  assert.equal(dateKey(Date.parse('2026-03-29T22:30:00Z'), zone), '2026-03-30');
  assert.equal(normalizeEvent({ summary: 'Bad date', start: '2026-02-30', end: '2026-03-03' }), null);
});
test('overnight timed events focus normally; cached entries never bypass lookahead or dismissal', () => {
  const time = Date.parse('2026-11-01T23:30:00Z'), overnight = event('Overnight', time - 7200000, time + 7200000);
  const outside = event('Later', time + 86400000, time + 90000000);
  assert.equal(select(config({ lookahead_days: 1 }), records([overnight, outside], [], time), time).timed.length, 1);
  assert.equal(select(config(), records([overnight], [], time), time).focus.title, 'Overnight');
  assert.equal(select(config(), records([overnight], [overnight], time), time, new Set([overnight.key])).timed.length, 0);
  const edited = event('Edited', overnight.start, overnight.end); assert.equal(select(config(), records([edited], [], time), time, new Set([overnight.key])).focus.title, 'Edited');
});
test('presentation limits preserve overflow counts, local time and optional source metadata', () => {
  const c = config({ max_entries: 1, max_all_day: 1, soon_enabled: false, show_names: false, show_colors: false });
  const holiday = normalizeEvent({ summary: 'Holiday', start: '2026-11-01', end: '2026-11-03' });
  const r = records([event('A', now + 1800000), event('B', now + 3600000, now + 7200000), holiday]);
  const p = calendarPresentation(c, r, now, { locale: 'de-DE', timeZone: zone, hour12: false }, translator('de'), new Set(), null);
  assert.equal(p.items.length, 1); assert.equal(p.allDay.length, 1); assert.equal(p.omitted, 2); assert.equal(p.items[0].when, '14:30');
  assert.equal(p.allDay[0].when, 'Heute'); assert.equal(p.items[0].sources[0].showName, false); assert.equal(p.items[0].sources[0].color, '');
});
test('calendar configuration validates scope, domains, bounds, uniqueness and nested drafts', () => {
  const valid = normalizeConfig({ instance_id: 'living-room-1', features: { calendar: { enabled: true } }, calendar: { sources: [{ entity: 'calendar.a', future: 'kept' }] } });
  assert.deepEqual(normalizeConfig(valid), valid); assert.equal(valid.calendar.sources[0].future, 'kept');
  for (const input of [{ calendar: null }, { calendar: { sources: null } }, { calendar: { sources: [null] } }, { calendar: { sources: Array(17).fill({}) } }, { calendar: { max_entries: 1.5 } }, { calendar: { lookahead_days: 0 } }, { calendar: { sources: [{ entity: 'sensor.bad' }] } }, { calendar: { sources: [{ entity: 'calendar.a' }, { entity: 'calendar.a' }] } }, { instance_id: '../bad' }, { ...valid, instance_id: '' }]) assert.throws(() => normalizeConfig(input));
  assert.doesNotThrow(() => normalizeConfig({ ...valid, instance_id: '', calendar: { ...valid.calendar, dismiss: false } }));
});

test('interleaved all-day and timed responses keep timed agenda order chronological', () => {
  const holiday = normalizeEvent({ summary: 'Holiday', start: '2026-11-01', end: '2026-11-03' });
  const result = select(config(), records([event('Late', now + 120000), holiday, event('Early', now + 60000)], [event('Earliest', now)]));
  assert.deepEqual(result.timed.map(e => e.title), ['Earliest', 'Early', 'Late']);
});
