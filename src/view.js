import { weatherIcon } from './weather-icons.js';
import { FEATURES, palette, visibleFeatures } from './config.js';
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const text = escapeHTML;
export const EMPTY_PRESENTATION = Object.freeze({ readings: [], calendar: { state: 'unavailable', items: [] }, weather: null, co2: null });
// Adapters format source data; the view only lays out escaped presentation values.
export function renderView(root, config, presentation, t) {
  const v = visibleFeatures(config);
  const data = { ...EMPTY_PRESENTATION, ...presentation };
  const co2 = data.co2;
  v.readings = v.readings && !!data.readings?.length;
  const hasRoom = v.room && !!config.room_name;
  const hasHome = hasRoom || v.clock || v.date || v.readings || v.weather || (!v.co2_bar && (v.co2_value || v.co2_status));
  root.className = ['screen', !v.co2_bar ? 'no-rail' : '', v.calendar ? 'has-calendar' : 'solo', !v.clock ? 'no-clock' : '', !v.clock && !v.date && !v.calendar ? 'readings-only' : '', v.calendar && !hasHome ? 'calendar-only' : ''].join(' ');
  root.lang = config.language === 'auto' ? '' : config.language;
  for (const [key, value] of Object.entries(palette(config))) root.style.setProperty(`--${key}`, value);
  for (const key of FEATURES) root.style.setProperty(`--${key.replaceAll('_', '-')}-scale`, config.features[key].scale);
  root.style.setProperty('--co2-caption-scale', config.features[v.co2_status ? 'co2_status' : 'co2_value'].scale);
  root.style.setProperty('--rail-width', `${Math.min(100, config.layout.rail_width * config.features.co2_bar.scale)}%`);
  root.style.setProperty('--left-width', `${config.layout.left_width}%`);
  root.style.setProperty('--caption-space', v.co2_bar && v.co2_status ? `${10 * config.features.co2_status.scale}px` : '0px');
  // Only a literal hex color is permitted in an adapter-supplied CSS value.
  root.style.setProperty('--air-color', /^#[\da-f]{6}$/i.test(co2?.color) ? co2.color : 'var(--muted)');
  root.style.setProperty('--air-fill', `${Math.max(0, Math.min(1, Number(co2?.fraction) || 0)) * 100}%`);
  const caption = `<div class="co2-caption"><i class="dot" aria-hidden="true"></i><div class="co2-copy" title="${text(co2?.label ?? t('unavailable'))}"><span class="co2-caption-label">CO₂</span>${!v.co2_bar && v.co2_value ? `<span class="co2-caption-value"> ${text(co2?.value ?? '—')}</span>` : ''}${v.co2_status && co2?.label !== '' ? `<span class="co2-caption-status"> · ${text(co2?.label ?? t('unavailable'))}</span>` : ''}</div></div>`;
  const readings = data.readings ?? [];
  const home = hasHome ? `<section class="home">${hasRoom ? `<div class="room">${text(config.room_name)}</div>` : '<div></div>'}<div class="timeblock">${v.clock ? '<div class="clock" role="timer" aria-live="off"><span class="digits"></span><span class="period"></span></div>' : ''}${v.date ? '<div class="date"></div>' : ''}</div><div class="footer">${v.readings ? `<div class="readings">${readings.map(r => `<button type="button" class="reading" data-key="${text(r.key)}" data-entity="${text(r.entity)}" ${r.inspectable ? '' : 'disabled'} title="${text(r.label)}" aria-label="${text(r.label)}: ${text(r.value === '—' ? t('unavailable') : `${r.value ?? '—'} ${r.unit ?? ''}`)}"><strong title="${text(r.value ?? '—')}">${text(r.value ?? '—')}<small>${text(r.unit ?? '')}</small></strong><span title="${text(r.label)}">${text(r.label)}</span></button>`).join('')}</div>` : ''}${v.weather ? `<div class="weather">${weatherIcon(data.weather?.condition)}<div class="weather-copy"><span>${text(data.weather?.text ?? t('weather_unavailable'))}</span>${data.weather?.forecast ? `<span class="forecast" title="${text(data.weather.forecast)}">${text(data.weather.forecast)}</span>` : ''}</div></div>` : ''}${!v.co2_bar && (v.co2_value || v.co2_status) ? caption : ''}</div></section>` : '';
  const rail = v.co2_bar ? `<aside class="air" aria-label="CO₂: ${text(co2?.value ?? '—')} ${text(co2?.unit ?? '')} ${text(co2?.label ?? t('unavailable'))}"><div class="air-fill"></div>${v.co2_marks && co2 ? (co2.marks ?? []).filter(n => typeof n === 'number' && n >= 0 && n <= 1).map(n => `<i class="mark" style="bottom:${n * 100}%"></i>`).join('') : ''}<div class="air-top">CO₂</div>${v.co2_value ? `<div class="air-value">${text(co2?.value ?? '—')}</div>` : ''}</aside>` : '';
  root.innerHTML = `<div class="workspace ${!hasHome || !v.calendar ? 'single' : ''}">${home}${v.calendar ? calendarHTML(data.calendar, t) : ''}${v.co2_bar && v.co2_status ? `<div class="rail-caption">${caption}</div>` : ''}</div>${rail}`;
}
function sourceHTML(event, t) {
  const chips = (event.sources ?? []).filter(s => s.showName || s.color).map(s => `<span class="source-chip" title="${text(s.label)}${!s.fresh ? ` · ${text(t('outdated'))}` : ''}">${/^#[\da-f]{6}$/i.test(s.color) ? `<i class="source-dot" style="background:${s.color}" aria-hidden="true"></i>` : ''}${s.showName ? `<span>${text(s.label)}</span>` : `<span class="sr-only">${text(s.label)}</span>`}</span>`).join('');
  const outdated = event.outdated ? `<span class="outdated">${text(t('outdated'))}</span>` : '';
  return chips || outdated ? `<div class="source">${chips}${outdated}</div>` : '';
}
function titleButton(event, label = event.title) {
  return `<button type="button" class="event-title" data-key="${text(`title:${event.key}:${label}`)}" data-full-title="${text(event.title)}" title="${text(event.title)}">${text(label)}</button>`;
}
function eventTitle(event) { return `<h2>${titleButton(event)}</h2>`; }
function calendarHTML(calendar, t) {
  const c = calendar ?? EMPTY_PRESENTATION.calendar;
  const focus = c.state === 'ready' && ['soon', 'ongoing'].includes(c.mode) && c.focus;
  const heading = `<div class="calendar-heading" tabindex="-1"><span>${text(t(focus && c.mode === 'ongoing' ? 'today' : 'coming_up'))}</span><small>${text(c.sourceLabel ?? '')}</small></div>`;
  const allDay = c.allDay?.length ? `<div class="all-day"><span class="all-day-heading">${text(t('all_day'))}</span>${c.allDay.map(e => `<article class="all-day-entry"><div class="all-day-title">${titleButton(e, `${e.when} · ${e.title}`)}</div>${sourceHTML(e, t)}</article>`).join('')}</div>` : '';
  let body;
  if (focus) {
    const f = c.focus;
    body = `${allDay}<article class="focus"><div class="badge">${text(t(c.mode))}</div>${eventTitle(f)}<div class="timing" title="${text(f.when)}">${text(f.when)}</div>${sourceHTML(f, t)}${c.next ? `<div class="next-event"><small title="${text(c.next.when)}">${text(c.next.when)}</small>${titleButton(c.next)}</div>` : ''}</article>`;
  } else if (!c.items?.length && !c.allDay?.length) {
    body = `<p class="notice">${text(t(c.state === 'ready' ? 'no_events' : c.state === 'loading' ? 'calendar_loading' : 'awaiting'))}</p>`;
  } else {
    body = `${allDay}<div class="events">${(c.items ?? []).map(e => `<article class="event"><div class="when">${text(e.when)}</div>${eventTitle(e)}${sourceHTML(e, t)}</article>`).join('')}</div>`;
  }
  const actions = c.canDismiss || c.undo ? `<div class="calendar-actions">${c.canDismiss ? `<button type="button" class="calendar-action" data-action="done" data-event-key="${text(c.focus.key)}" data-key="${text(`done:${c.focus.key}`)}">${text(t('done'))}</button>` : ''}${c.undo ? `<button type="button" class="calendar-action" data-action="undo" data-event-key="${text(c.undo.key)}" data-key="${text(`undo:${c.undo.key}`)}" aria-label="${text(t('undo'))}: ${text(t('dismissed_event'))}">${text(t('undo'))}</button>` : ''}</div>` : '';
  return `<section class="calendar ${focus ? 'has-focus' : ''}" aria-label="${text(t('calendar'))}">${heading}${c.notice ? `<div class="calendar-notice" role="status" title="${text(c.notice)}">${text(c.notice)}</div>` : ''}${body}<div class="more" data-kind="${focus ? 'all-day' : 'agenda'}" data-omitted="${focus ? c.omittedAllDay ?? 0 : c.omitted ?? 0}" hidden></div>${actions}</section>`;
}
export function fitAgenda(root, t) {
  const calendar = root.querySelector('.calendar'), more = root.querySelector('.more');
  if (!calendar || !more) return;
  const events = [...root.querySelectorAll('.event')], allDay = [...root.querySelectorAll('.all-day-entry')], group = root.querySelector('.all-day');
  calendar.classList.remove('compact');
  [...events, ...allDay].forEach(event => { event.hidden = false; });
  if (group) group.hidden = false;
  let omitted = Number(more.dataset.omitted) || 0;
  const count = () => { more.hidden = !omitted; more.textContent = omitted ? t(more.dataset.kind === 'all-day' ? 'all_day_more' : 'more', { count: omitted }) : ''; };
  count();
  // Reserve notices/actions and the count before choosing how many rows fit.
  for (const event of [...events.reverse(), ...allDay.reverse()]) {
    if (calendar.scrollHeight <= calendar.clientHeight + 1) break;
    event.hidden = true; omitted++; count();
    if (group && allDay.every(e => e.hidden)) group.hidden = true;
  }
  // Tighten gaps only; titles and other text never shrink to fit extra entries.
  if (calendar.scrollHeight > calendar.clientHeight + 1) calendar.classList.add('compact');
}
