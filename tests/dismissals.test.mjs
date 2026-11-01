import test from 'node:test';
import assert from 'node:assert/strict';
import { Dismissals } from '../src/dismissals.js';
import { normalizeEvent } from '../src/calendar-model.js';
const now = Date.parse('2026-11-01T13:00:00Z');
const event = title => normalizeEvent({ summary: title, start: '2026-11-01T12:00:00Z', end: '2026-11-01T14:00:00Z' });
const memory = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), map }; };
test('Done survives reload, scopes by dashboard ID, supports Undo, and expires exactly at end', () => {
  const storage = memory(), a = new Dismissals(() => storage), e = event('Meeting'); a.setScope('room-a', now); assert.equal(a.dismiss(e, now), true);
  const reloaded = new Dismissals(() => storage); reloaded.setScope('room-a', now); assert.ok(reloaded.active(now).has(e.key));
  const other = new Dismissals(() => storage); other.setScope('room-b', now); assert.equal(other.active(now).size, 0);
  reloaded.undo(e.key, now); assert.equal(reloaded.active(now).size, 0); a.reload(now); assert.equal(a.active(now).size, 0);
  a.dismiss(e, now); assert.equal(a.active(e.end - 1).size, 1); assert.equal(a.active(e.end).size, 0); assert.equal(a.latest(e.end), null);
});
test('dismissal identity changes with title/start/end, but not source identities', () => {
  const storage = memory(), a = new Dismissals(() => storage), e = event('Meeting'); a.setScope('room', now); a.dismiss(e, now);
  for (const edited of [event('Edited'), normalizeEvent({ summary: 'Meeting', start: '2026-11-01T12:01:00Z', end: '2026-11-01T14:00:00Z' }), normalizeEvent({ summary: 'Meeting', start: '2026-11-01T12:00:00Z', end: '2026-11-01T14:01:00Z' })]) assert.equal(a.active(now).has(edited.key), false);
  assert.ok(a.active(now).has({ ...e, sources: ['calendar.other'] }.key));
});
test('actions merge other tabs, Undo follows dismissal order, and invalid actions do nothing', () => {
  const storage = memory(), a = new Dismissals(() => storage), b = new Dismissals(() => storage); a.setScope('room', now); b.setScope('room', now);
  a.dismiss(event('A'), now); b.dismiss(event('B'), now); a.reload(now); assert.equal(a.active(now).size, 2); assert.equal(a.latest(now).key, event('B').key);
  a.undo(event('B').key, now); assert.equal(a.latest(now).key, event('A').key);
  assert.equal(a.dismiss(event('Ended'), now + 3600000), false); assert.equal(a.dismiss({ ...event('Future'), start: now + 1 }, now), false);
  const noScope = new Dismissals(() => storage); assert.equal(noScope.dismiss(event('A'), now), false);
});
test('blocked or corrupt storage degrades to local dismissal with an explicit failure flag', () => {
  const blocked = new Dismissals(() => { throw new Error('Storage blocked'); }); blocked.setScope('room', now); assert.equal(blocked.failed, true); blocked.dismiss(event('A'), now); assert.equal(blocked.active(now).size, 1); blocked.undo(event('A').key, now); assert.equal(blocked.active(now).size, 0);
  const storage = memory(), a = new Dismissals(() => storage); storage.setItem('info-dashboard:dismissals:v1:room', '{bad'); a.setScope('room', now); assert.equal(a.failed, true); a.dismiss(event('A'), now); assert.equal(a.failed, false);
  storage.setItem(a.key, JSON.stringify({ version: 1, entries: [{ key: 'not JSON', end: now + 99 }, { key: event('Expired').key, end: now - 1 }, { key: event('Wrong end').key, end: now + 3 }] })); a.reload(now); assert.equal(a.active(now).size, 0);
});

test('reload prunes expired stored identities, and changing scope preserves other dashboards', () => {
  const storage = memory(), a = new Dismissals(() => storage); a.setScope('one', now); a.dismiss(event('One'), now); a.setScope('two', now); a.dismiss(event('Two'), now);
  a.setScope('one', now + 3600000); assert.equal(a.active(now + 3600000).size, 0); assert.deepEqual(JSON.parse(storage.getItem(a.key)).entries, []);
  assert.equal(JSON.parse(storage.getItem('info-dashboard:dismissals:v1:two')).entries.length, 1);
});
