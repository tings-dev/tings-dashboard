import { connected } from './environment.js';

const formatters = new Map();
// Wall-clock intervals: inclusive start, exclusive end; repeated DST minutes
// have the same meaning, and skipped minutes take effect at the next tick.
export function scheduledNight(now, timeZone, start, end) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    formatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(now).map(p => [p.type, p.value]));
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const from = minutes(start), to = minutes(end);
  return from < to ? minute >= from && minute < to : minute >= from || minute < to;
}
export function nightControlState(config, hass) {
  if (config.night.mode !== 'entity' || !connected(hass)) return null;
  const state = hass?.states?.[config.night.entity]?.state;
  return state === 'on' ? true : state === 'off' ? false : null;
}
export function nightControlProblem(config, hass) {
  if (config.night.mode === 'entity' && nightControlState(config, hass) === null) return 'night_entity_unavailable';
  if (config.night.mode === 'schedule') {
    try {
      if (!hass?.config?.time_zone) return 'night_timezone_unavailable';
      new Intl.DateTimeFormat('en', { timeZone: hass.config.time_zone });
    } catch { return 'night_timezone_unavailable'; }
  }
  return '';
}
export class NightControl {
  constructor(storage = () => globalThis.localStorage) { this.storage = storage; this.known = null; this.failed = false; }
  setScope(id, entity) {
    const key = id && entity ? `info-dashboard:night:v1:${id}:${entity}` : '';
    if (key === this.key) return;
    this.key = key; this.known = null; this.failed = false; this.reload();
  }
  reload() {
    if (!this.key) return;
    try {
      const raw = this.storage().getItem(this.key);
      if (raw === null) { this.known = null; this.failed = false; return; }
      const value = JSON.parse(raw);
      if (value.version !== 1 || typeof value.night !== 'boolean') throw new Error('Invalid night state');
      this.known = value.night; this.failed = false;
    } catch { this.failed = true; }
  }
  resolve(config, hass, now) {
    if (config.night.mode === 'off') return false;
    if (config.night.mode === 'schedule') {
      if (!hass?.config?.time_zone) return true;
      try { return scheduledNight(now, hass.config.time_zone, config.night.start, config.night.end); }
      catch { return true; }
    }
    this.setScope(config.instance_id, config.night.entity);
    const state = nightControlState(config, hass);
    if (state !== null) {
      if (state !== this.known || this.failed) {
        this.known = state;
        try {
          if (this.key) this.storage().setItem(this.key, JSON.stringify({ version: 1, night: state }));
          this.failed = false;
        } catch { this.failed = true; }
      }
      return state;
    }
    return this.known ?? true;
  }
}
