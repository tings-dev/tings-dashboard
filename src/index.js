import { TingsDashboard } from './card.js';
import { TingsDashboardEditor } from './editor.js';
export const VERSION = typeof __TINGS_DASHBOARD_VERSION__ === 'undefined' ? 'development' : __TINGS_DASHBOARD_VERSION__;
TingsDashboard.version = VERSION;
if (!customElements.get('tings-dashboard')) customElements.define('tings-dashboard', TingsDashboard);
if (!customElements.get('tings-dashboard-editor')) customElements.define('tings-dashboard-editor', TingsDashboardEditor);
window.customCards ??= [];
if (!window.customCards.some(card => card.type === 'tings-dashboard')) window.customCards.push({ type: 'tings-dashboard', name: 'Tings Dashboard', description: 'Room clock and configurable information layout', preview: true });
export { TingsDashboard, TingsDashboardEditor };
