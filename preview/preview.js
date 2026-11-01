import { InfoDashboard } from '/dist/info-dashboard.js';
import { normalizeConfig, FEATURES } from '../src/config.js';
import { presentation } from './fixtures.js';
import { parse, stringify } from 'yaml';
class PreviewDashboard extends InfoDashboard {
  currentTime() { return document.getElementById('live').checked ? new Date() : new Date(this.night ? '2026-11-01T22:18:00Z' : '2026-11-01T13:42:00Z'); }
}
customElements.define('info-dashboard-preview', PreviewDashboard);
const $ = id => document.getElementById(id);
const card = $('card'), editor = $('editor');
const hass = { locale: { language: 'en-GB', time_format: '24', date_format: 'language', time_zone: 'server' }, config: { time_zone: 'Europe/Berlin' } };
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
  const next = normalizeConfig(config ?? { room_name: 'Living room' });
  for (const feature of FEATURES) next.features[feature].enabled = enabled.includes(feature);
  commit(next); updateData();
}
function resize() {
  const [width, height] = $('viewport').value.split(',').map(Number);
  const available = Math.min(width, document.documentElement.clientWidth - 48);
  const scale = available / width;
  card.style.width = `${width}px`; card.style.setProperty('--info-dashboard-height', `${height}px`); card.style.transform = `scale(${scale})`;
  $('frame').style.width = `${available}px`; $('frame').style.height = `${height * scale}px`;
}
function updateData() {
  card.presentation = presentation($('scenario').value, Number($('readings').value));
  $('status').textContent = `Synthetic ${$('scenario').value}; ${$('appearance').value}; ${$('viewport').value}; live clock: ${$('live').checked}`;
}
editor.addEventListener('config-changed', event => commit(event.detail.config, false));
$('apply').onclick = () => { try { commit(parse($('yaml').value)); } catch (error) { $('yaml-error').textContent = error.message; } };
$('preset').onchange = preset;
$('appearance').onchange = () => { const next = structuredClone(config); if ($('appearance').value !== 'night') next.appearance.day = $('appearance').value; commit(next); card.night = $('appearance').value === 'night'; updateData(); };
$('viewport').onchange = resize;
for (const name of ['scenario', 'readings', 'live']) $(name).onchange = updateData;
$('unavailable').onclick = () => { card.presentation = null; $('status').textContent = 'No synthetic data: this is how enabled stage-1 placeholders appear in Home Assistant.'; };
window.addEventListener('resize', resize);
preset();
// A small explicit harness is useful for deterministic integration/layout checks.
window.preview = { card, editor, get config() { return structuredClone(config); }, commit, hass };
