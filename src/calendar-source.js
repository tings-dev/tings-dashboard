import { connected } from './environment.js';
import { visibleFeatures } from './config.js';
import { DAY_MS, dateKey, normalizeEvent } from './calendar-model.js';
const usable = state => !!state && !['unknown', 'unavailable'].includes(state.state);
// Independent records keep a slow/failed calendar from delaying successful ones.
export class CalendarSource {
  constructor(onChange, now = () => Date.now(), { refresh = 60000, timeout = 15000 } = {}) {
    this.onChange = onChange; this.now = now; this.refresh = refresh; this.timeout = timeout;
    this.records = new Map(); this.active = false;
  }
  update(config, hass, mounted, timeZone = 'UTC') {
    const entities = config.calendar.sources.filter(s => s.enabled && s.entity).map(s => s.entity);
    const active = mounted && visibleFeatures(config).calendar && connected(hass) && typeof hass?.callApi === 'function' && entities.length > 0;
    const changed = this.timeZone !== timeZone || this.lookahead !== config.calendar.lookahead_days || this.connection !== hass?.connection;
    this.timeZone = timeZone; this.hass = hass; this.lookahead = config.calendar.lookahead_days; this.connection = hass?.connection;
    for (const [id, record] of this.records) if (!entities.includes(id)) { this.cancel(record); this.records.delete(id); }
    for (const id of entities) if (!this.records.has(id)) this.records.set(id, { events: [], status: 'loading', updatedAt: 0, token: 0 });
    if (!active) { this.stop(); return; }
    const resumed = !this.active; this.active = true;
    for (const [id, record] of this.records) {
      const available = usable(hass.states?.[id]);
      const recovered = available && !record.available;
      record.available = available;
      if (!available) { this.cancel(record); record.status = 'error'; }
      else if (resumed || changed || recovered || record.status === 'loading' && !record.pending) { this.cancel(record); this.fetch(id, record); }
    }
    if (!this.timer) this.schedule();
    this.onChange();
  }
  schedule() {
    clearTimeout(this.timer);
    if (this.active) this.timer = setTimeout(() => { this.timer = undefined; this.refreshNow(); }, this.refresh);
  }
  ensureFresh() {
    if (!this.active) return;
    const now = this.now();
    if (this.lastCycle === undefined || now < this.lastCycle || now - this.lastCycle >= this.refresh) {
      for (const record of this.records.values()) if (record.pending) this.cancel(record);
      this.refreshNow();
    }
  }
  refreshNow() {
    if (!this.active) return;
    this.lastCycle = this.now();
    for (const [id, record] of this.records) if (record.available && !record.pending) this.fetch(id, record);
    this.schedule();
  }
  fetch(id, record) {
    const token = ++record.token, hass = this.hass, now = this.now();
    this.lastCycle = now; record.pending = true;
    if (!record.updatedAt && !record.events.length) record.status = 'loading';
    // Buffer calendar dates on both edges; date-only events must not be lost
    // when the dashboard timezone differs from the integration's timezone.
    // The model still enforces the exact rolling lookahead and excludes ended rows.
    const start = Date.parse(`${dateKey(now, this.timeZone)}T00:00:00Z`) - DAY_MS;
    const end = Date.parse(`${dateKey(now + this.lookahead * DAY_MS, this.timeZone)}T00:00:00Z`) + 2 * DAY_MS;
    const params = new URLSearchParams({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    const finish = (events, failed) => {
      if (!this.active || token !== record.token) return;
      clearTimeout(record.deadline); record.deadline = undefined; record.pending = false; ++record.token;
      if (failed) record.status = 'error';
      else { record.events = events; record.status = 'ready'; record.updatedAt = this.now(); }
      this.onChange();
    };
    record.deadline = setTimeout(() => finish([], true), this.timeout);
    Promise.resolve().then(() => this.active && token === record.token ? hass.callApi('GET', `calendars/${encodeURIComponent(id)}?${params}`) : undefined)
      .then(raw => {
        if (!this.active || token !== record.token) return;
        if (!Array.isArray(raw)) { finish([], true); return; }
        const events = raw.map(normalizeEvent);
        // Keep valid rows, but label an incomplete/invalid response outdated.
        const invalid = events.some(e => !e);
        if (invalid) { record.events = events.filter(Boolean); finish([], true); }
        else finish(events, false);
      }).catch(() => finish([], true));
  }
  cancel(record) { ++record.token; clearTimeout(record.deadline); record.deadline = undefined; record.pending = false; }
  stop() {
    this.active = false; clearTimeout(this.timer); this.timer = undefined;
    for (const record of this.records.values()) { this.cancel(record); record.status = 'error'; }
    this.onChange();
  }
}
