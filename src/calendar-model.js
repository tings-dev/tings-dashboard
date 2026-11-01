export const DAY_MS = 86400000;
export const FRESH_MS = 120000;
const dateValue = value => typeof value === 'string' ? value : value?.dateTime ?? value?.date;
export function dateKey(instant, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function addDays(day, count) { return new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10); }
const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const instant = value => typeof value === 'string' && validDay(value.slice(0, 10)) && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? Date.parse(value) : NaN;
export function normalizeEvent(raw) {
  const startValue = dateValue(raw?.start), endValue = dateValue(raw?.end);
  if (typeof raw?.summary !== 'string') return null;
  const allDay = validDay(startValue) && validDay(endValue);
  const start = allDay ? startValue : instant(startValue), end = allDay ? endValue : instant(endValue);
  if ((!allDay && (!Number.isFinite(start) || !Number.isFinite(end))) || end <= start) return null;
  const title = raw.summary;
  return { key: JSON.stringify([allDay ? 'day' : 'timed', title, start, end]), title, start, end, allDay };
}
const sourceFresh = (record, now) => record?.status === 'ready' && now >= record.updatedAt && now - record.updatedAt < FRESH_MS;
export function selectCalendar(config, records, now, timeZone, dismissed = new Set()) {
  const sources = config.sources.filter(s => s.enabled && s.entity);
  const horizon = now + config.lookahead_days * DAY_MS, today = dateKey(now, timeZone), lastDay = dateKey(horizon - 1, timeZone);
  const merged = new Map();
  let failed = 0, loading = 0;
  const failedSources = [];
  sources.forEach((source, order) => {
    const record = records.get(source.entity), fresh = sourceFresh(record, now);
    if (!fresh) { if (record?.status === 'loading') loading++; else { failed++; failedSources.push(source.label || source.entity); } }
    for (const event of record?.events ?? []) {
      if (dismissed.has(event.key)) continue;
      if (event.allDay ? event.end <= today || event.start > lastDay : event.end <= now || event.start >= horizon) continue;
      let occurrence = merged.get(event.key);
      if (!occurrence) { occurrence = { ...event, fresh: false, order, sources: [] }; merged.set(event.key, occurrence); }
      occurrence.fresh ||= fresh;
      occurrence.sources.push({ ...source, fresh });
    }
  });
  const compare = (a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0) || a.order - b.order || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0);
  const events = [...merged.values()], timed = events.filter(e => !e.allDay).sort(compare);
  const eligible = timed.filter(e => e.fresh).flatMap(event => {
    if (config.ongoing_enabled && event.start <= now && now < event.end) return [{ ...event, mode: 'ongoing' }];
    if (config.soon_enabled && event.start - config.soon_minutes * 60000 <= now && now < event.start) return [{ ...event, mode: 'soon' }];
    return [];
  }).sort((a, b) => (a.mode === config.priority ? 0 : 1) - (b.mode === config.priority ? 0 : 1) || compare(a, b));
  const allDay = [];
  for (const event of events.filter(e => e.allDay)) {
    for (let day = event.start < today ? today : event.start; day < event.end && day <= lastDay; day = addDays(day, 1)) allDay.push({ ...event, day, displayKey: `${event.key}:${day}` });
  }
  allDay.sort((a, b) => a.day.localeCompare(b.day) || compare(a, b));
  return { state: sources.length && (sources.length > failed + loading || events.length) ? 'ready' : loading ? 'loading' : 'unavailable', failed, failedSources, loading, sourceCount: sources.length, focus: eligible[0], next: eligible[1], timed, allDay };
}
export function calendarPresentation(config, records, now, preferences, t, dismissed, undo, storageFailed = false) {
  const model = selectCalendar(config, records, now, preferences.timeZone, dismissed);
  const today = dateKey(now, preferences.timeZone);
  const time = value => new Intl.DateTimeFormat(preferences.locale, { timeZone: preferences.timeZone, hour: preferences.hour12 ? 'numeric' : '2-digit', minute: '2-digit', hourCycle: preferences.hour12 ? 'h12' : 'h23' }).format(new Date(value));
  const dayLabel = day => day === today ? t('today') : day === addDays(today, 1) ? t('tomorrow') : new Intl.DateTimeFormat(preferences.locale, { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${day}T12:00:00Z`));
  const when = value => `${dateKey(value, preferences.timeZone) === today ? '' : `${dayLabel(dateKey(value, preferences.timeZone))} · `}${time(value)}`;
  const display = event => ({ ...event, title: event.title || t('untitled_event'), sources: event.sources.map(s => ({ ...s, label: s.label || s.entity, color: config.show_colors ? s.color : '', showName: config.show_names })), outdated: !event.fresh,
    when: event.allDay ? dayLabel(event.day) : when(event.start) });
  const focus = model.focus && { ...display(model.focus), when: model.focus.mode === 'ongoing'
    ? `${when(model.focus.start)}–${when(model.focus.end)}`
    : `${when(model.focus.start)} · ${t('in_minutes', { count: Math.ceil((model.focus.start - now) / 60000) })}` };
  const items = model.timed.slice(0, config.max_entries).map(display), allDay = config.max_all_day ? model.allDay.slice(0, config.max_all_day).map(display) : [];
  return { state: model.state, mode: model.focus?.mode ?? 'agenda', focus, next: model.next && { ...display(model.next), when: `${t(model.next.mode)} · ${when(model.next.start)}` },
    items, allDay, omittedAllDay: config.max_all_day ? model.allDay.length - allDay.length : 0, omitted: model.timed.length - items.length + (config.max_all_day ? model.allDay.length - allDay.length : 0),
    sourceLabel: t(model.sourceCount === 1 ? 'calendar_count_one' : 'calendar_count', { count: model.sourceCount }),
    notice: [model.failed ? `${t(model.failed === 1 ? 'calendar_failed_one' : 'calendar_failed', { count: model.failed })}${config.show_names ? `: ${model.failedSources.join(', ')}` : ''}` : model.loading ? t('calendar_loading') : '', config.dismiss && storageFailed ? t('dismissal_storage_failed') : ''].filter(Boolean).join(' · '),
    canDismiss: config.dismiss && focus?.mode === 'ongoing', undo: config.dismiss ? undo : null };
}
