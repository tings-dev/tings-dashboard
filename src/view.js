import { palette, visibleFeatures } from './config.js';
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const text = escapeHTML;
export const EMPTY_PRESENTATION = Object.freeze({ readings: [], calendar: { state: 'unavailable', items: [] }, weather: null, co2: null });
// A presentation contains already-formatted display data. Fetching, source selection,
// calendar rules, sensor formatting and CO2 calculation belong to later adapters.
export function renderView(root, config, presentation, night, t) {
  const v = visibleFeatures(config, night);
  const data = { ...EMPTY_PRESENTATION, ...presentation };
  const co2 = data.co2;
  const hasRoom = v.room && !!config.room_name;
  const hasHome = hasRoom || v.clock || v.date || v.readings || v.weather || (!v.co2_bar && (v.co2_value || v.co2_status));
  root.className = ['screen', !v.co2_bar ? 'no-rail' : '', v.calendar ? 'has-calendar' : 'solo', !v.clock ? 'no-clock' : '', !v.clock && !v.date && !v.calendar ? 'readings-only' : '', v.calendar && !hasHome ? 'calendar-only' : ''].join(' ');
  root.lang = config.language === 'auto' ? '' : config.language;
  for (const [key, value] of Object.entries(palette(config, night))) root.style.setProperty(`--${key}`, value);
  root.style.setProperty('--rail-width', `${config.layout.rail_width}%`);
  root.style.setProperty('--left-width', `${config.layout.left_width}%`);
  root.style.setProperty('--caption-space', v.co2_bar && v.co2_status ? '10px' : '0px');
  // Only a literal hex color is permitted in an adapter-supplied CSS value.
  root.style.setProperty('--air-color', /^#[\da-f]{6}$/i.test(co2?.color) ? co2.color : 'var(--muted)');
  root.style.setProperty('--air-fill', `${Math.max(0, Math.min(1, Number(co2?.fraction) || 0)) * 100}%`);
  const caption = `<div class="co2-caption"><i class="dot" aria-hidden="true"></i><span>CO₂${!v.co2_bar && v.co2_value ? ` ${text(co2?.value ?? '—')}${co2?.unit ? ` ${text(co2.unit)}` : ''}` : ''}${v.co2_status ? ` · ${text(co2?.label ?? t('unavailable'))}` : ''}</span></div>`;
  const readings = data.readings?.length ? data.readings : [{ label: `${t('reading')} 1` }, { label: `${t('reading')} 2` }];
  const home = hasHome ? `<section class="home">${hasRoom ? `<div class="room">${text(config.room_name)}</div>` : '<div></div>'}<div class="timeblock">${v.clock ? '<div class="clock" role="timer" aria-live="off"><span class="digits"></span><span class="period"></span></div>' : ''}${v.date ? '<div class="date"></div>' : ''}</div><div class="footer">${v.readings ? `<div class="readings">${readings.map(r => `<div class="reading"><strong title="${text(r.value ?? '—')}">${text(r.value ?? '—')}<small>${text(r.unit ?? '')}</small></strong><span title="${text(r.label)}">${text(r.label)}</span></div>`).join('')}</div>` : ''}${v.weather ? `<div class="weather"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4.5 4.5 0 0 1 0 9Z"/></svg><span>${text(data.weather?.text ?? t('weather_unavailable'))}</span></div>` : ''}${!v.co2_bar && (v.co2_value || v.co2_status) ? caption : ''}</div></section>` : '';
  const rail = v.co2_bar ? `<aside class="air" aria-label="CO₂"><div class="air-fill"></div>${v.co2_marks && co2 ? (co2.marks ?? []).filter(n => typeof n === 'number' && n >= 0 && n <= 1).map(n => `<i class="mark" style="bottom:${n * 100}%"></i>`).join('') : ''}<div class="air-top">CO₂</div>${v.co2_value ? `<div class="air-value">${text(co2?.value ?? '—')}<small>${text(co2?.unit ?? '')}</small></div>` : ''}</aside>` : '';
  root.innerHTML = `<div class="workspace ${!hasHome || !v.calendar ? 'single' : ''}">${home}${v.calendar ? calendarHTML(data.calendar, t) : ''}${v.co2_bar && v.co2_status ? `<div class="rail-caption">${caption}</div>` : ''}</div>${rail}`;
}
function calendarHTML(calendar, t) {
  const c = calendar ?? EMPTY_PRESENTATION.calendar;
  const focus = c.state === 'ready' && ['soon', 'ongoing'].includes(c.mode) && c.focus;
  const heading = `<div class="calendar-heading"><span>${text(t(focus ? 'today' : 'coming_up'))}</span><small>${text(c.sourceLabel ?? '')}</small></div>`;
  let body;
  if (focus) {
    const f = c.focus;
    body = `<article class="focus"><div class="badge">${text(t(c.mode))}</div><h2 tabindex="0" title="${text(f.title)}">${text(f.title)}</h2><div class="timing">${text(f.when)}</div><div class="source">${text(f.source)}</div>${c.next ? `<div class="next-event"><small>${text(c.next.when)}</small>${text(c.next.title)}</div>` : ''}</article>`;
  } else if (c.state !== 'ready') {
    body = `<p class="notice">${text(t('awaiting'))}</p>`;
  } else if (!c.items?.length && !c.allDay?.length) {
    body = `<p class="notice">${text(t('no_events'))}</p>`;
  } else {
    body = `${c.allDay?.length ? `<div class="all-day"><span>${text(t('all_day'))}</span>${c.allDay.map(text).join(' · ')}</div>` : ''}<div class="events">${(c.items ?? []).map(e => `<article class="event"><div class="when">${text(e.when)}</div><h2 tabindex="0" title="${text(e.title)}">${text(e.title)}</h2><div class="source">${text(e.source)}</div></article>`).join('')}</div><div class="more" hidden></div>`;
  }
  return `<section class="calendar" aria-label="${text(t('calendar'))}">${heading}${body}</section>`;
}
export function fitAgenda(root, t) {
  const calendar = root.querySelector('.calendar');
  const events = [...root.querySelectorAll('.event')];
  const more = root.querySelector('.more');
  if (!calendar || !more) return;
  events.forEach(event => { event.hidden = false; });
  more.hidden = true;
  let omitted = 0;
  while (calendar.scrollHeight > calendar.clientHeight + 1 && omitted < events.length) {
    events[events.length - 1 - omitted].hidden = true;
    omitted++;
    more.hidden = false;
    more.textContent = t('more', { count: omitted });
  }
}
