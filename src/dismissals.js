// Storage is local to the HA origin and an explicitly configured dashboard ID.
// Only occurrence identity, expiry and dismissal order are persisted.
export class Dismissals {
  constructor(storage = () => globalThis.localStorage) { this.storage = storage; this.entries = []; this.failed = false; }
  setScope(id, now) {
    const key = id ? `info-dashboard:dismissals:v1:${id}` : '';
    if (key === this.key) return;
    this.key = key; this.entries = []; this.failed = false; this.reload(now);
  }
  reload(now) {
    if (!this.key) return;
    try {
      const raw = this.storage().getItem(this.key);
      const parsed = raw ? JSON.parse(raw) : { version: 1, entries: [] };
      if (parsed.version !== 1 || !Array.isArray(parsed.entries)) throw new Error('Invalid dismissal data');
      this.entries = parsed.entries.filter(e => {
        if (typeof e?.key !== 'string' || !Number.isFinite(e.end) || e.end <= now) return false;
        try { const identity = JSON.parse(e.key); return Array.isArray(identity) && identity.length === 4 && identity[0] === 'timed' && typeof identity[1] === 'string' && Number.isFinite(identity[2]) && identity[2] < e.end && identity[3] === e.end; } catch { return false; }
      });
      this.failed = false;
      if (this.entries.length !== parsed.entries.length) this.save();
    } catch { this.failed = true; }
  }
  save() {
    if (!this.key) return;
    try { this.storage().setItem(this.key, JSON.stringify({ version: 1, entries: this.entries })); this.failed = false; }
    catch { this.failed = true; }
  }
  active(now) {
    const entries = this.entries.filter(e => e.end > now);
    if (entries.length !== this.entries.length) { this.entries = entries; this.save(); }
    return new Set(this.entries.map(e => e.key));
  }
  latest(now) { this.active(now); return this.entries.at(-1) ?? null; }
  dismiss(event, now) {
    if (!this.key || event.allDay || event.start > now || event.end <= now) return false;
    // Merge any other tab's latest state before applying an action.
    if (!this.failed) this.reload(now);
    this.entries = this.entries.filter(e => e.key !== event.key && e.end > now);
    this.entries.push({ key: event.key, end: event.end }); this.save(); return true;
  }
  undo(key, now) {
    if (!this.failed) this.reload(now);
    if (!this.active(now).has(key)) return false;
    this.entries = this.entries.filter(e => e.key !== key); this.save(); return true;
  }
}
