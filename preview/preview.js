import { TingsDashboard } from '/dist/tings-dashboard.js';
import { normalizeConfig, FEATURES } from '../src/config.js';
import { calendarSources, mockCalendarEvents, readingSources, mockStates } from './fixtures.js';
import { parse, stringify } from 'yaml';
class PreviewDashboard extends TingsDashboard {
  currentTime() {
    const fixed = new Date(document.getElementById('fixed-time')?.value ?? '');
    if (Number.isFinite(fixed.getTime())) return fixed;
    return document.getElementById('live').checked ? new Date() : new Date(document.getElementById('appearance').value === 'night' ? '2026-11-01T22:18:00Z' : '2026-11-01T13:42:00Z');
  }
}
customElements.define('tings-dashboard-preview', PreviewDashboard);
const $ = id => document.getElementById(id);
const card = $('card'), editor = $('editor');
const forecastListeners = new Set();
const publishForecast = () => { for (const callback of forecastListeners) callback({ forecast: [{ datetime: new Date(card.currentTime().getTime() + 3600000).toISOString(), condition: 'rainy' }] }); };
const hass = { async callApi(method, path) {
  if (method !== 'GET') throw new Error('Preview calendars are read-only');
  const entity = decodeURIComponent(path.split('/')[1].split('?')[0]);
  if ($('scenario').value === 'partial' && entity === 'calendar.work') throw new Error('Demo calendar failure');
  return mockCalendarEvents($('scenario').value, entity);
}, connected: true, states: mockStates(), connection: {
  connected: true,
  async subscribeMessage(callback) {
    forecastListeners.add(callback); queueMicrotask(publishForecast);
    return () => forecastListeners.delete(callback);
  },
}, locale: { language: 'en-GB', time_format: '24', date_format: 'language', time_zone: 'server' }, config: { time_zone: 'Europe/Berlin' } };
card.hass = hass; editor.hass = hass;
let config;
function commit(value, updateEditor = true) {
  const next = normalizeConfig(value); card.setConfig(next); config = next;
  if (updateEditor) editor.setConfig(next);
  $('yaml').value = stringify(next); $('yaml-error').textContent = ''; resize();
}
function preset() {
  const key = $('preset').value;
  const enabled = { full: FEATURES, 'no-calendar': FEATURES.filter(k => k !== 'calendar'), 'no-co2': FEATURES.filter(k => !k.startsWith('co2')), clock: ['clock', 'date'], readings: ['readings'], calendar: ['calendar'], blank: [] }[key];
  const next = normalizeConfig(config ?? { room_name: 'Living room', instance_id: 'preview-main', calendar: { sources: calendarSources }, readings: readingSources.slice(0, 2), co2: { entity: 'sensor.co2' }, weather: { entity: 'weather.home' } });
  for (const feature of FEATURES) next.features[feature].enabled = enabled.includes(feature);
  commit(next); updateData();
}
function resize() {
  const [width, height] = $('viewport').value.split(',').map(Number);
  const available = Math.min(width, document.documentElement.clientWidth - 48);
  const scale = available / width;
  card.style.width = `${width}px`; card.style.setProperty('--tings-dashboard-height', `${height}px`); card.style.transform = `scale(${scale})`;
  $('frame').style.width = `${available}px`; $('frame').style.height = `${height * scale}px`;
}
function updateData() {
  hass.connected = $('source-state').value !== 'offline';
  hass.states = $('source-state').value === 'missing' ? {} : mockStates($('scenario').value === 'unavailable', $('co2-demo').value);
  hass.states['input_boolean.preview_night'] = { entity_id: 'input_boolean.preview_night', state: $('night-state').value, attributes: { friendly_name: 'Preview night control' } };
  card.hass = { ...hass }; editor.hass = hass; publishForecast();
  card._calendar.refreshNow();
  $('status').textContent = `Synthetic ${$('scenario').value}; ${$('appearance').value}; ${$('viewport').value}; live clock: ${$('live').checked}`;
}
editor.addEventListener('config-changed', event => commit(event.detail.config, false));
$('apply').onclick = () => { try { commit(parse($('yaml').value)); } catch (error) { $('yaml-error').textContent = error.message; } };
$('preset').onchange = preset;
$('appearance').onchange = () => { const next = structuredClone(config); if ($('appearance').value !== 'night') next.appearance.day = $('appearance').value; commit(next); card.night = $('appearance').value === 'night'; updateData(); };
$('viewport').onchange = resize;
for (const name of ['scenario', 'live', 'source-state', 'night-state', 'fixed-time']) $(name).onchange = updateData;
$('co2-demo').oninput = updateData;
$('readings').onchange = () => { const next = structuredClone(config); next.readings = readingSources.slice(0, Number($('readings').value)); commit(next); updateData(); };
$('unavailable').onclick = () => { hass.states = {}; card.hass = { ...hass }; editor.hass = hass; card.presentation = null; $('status').textContent = 'No mock entities: readings are unavailable and cached calendar entries are outdated.'; };
card.addEventListener('hass-more-info', event => {
  $('entity-details').textContent = `Home Assistant will open entity details for ${event.detail.entityId}. This preview only demonstrates the event.`;
  $('more-info').showModal();
});
$('close-details').onclick = () => $('more-info').close();
window.addEventListener('resize', resize);
preset();
// A small explicit harness is useful for deterministic integration/layout checks.
window.preview = { card, editor, get config() { return structuredClone(config); }, commit, hass };
