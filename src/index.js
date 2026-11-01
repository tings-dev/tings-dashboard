import { InfoDashboard } from './card.js';
import { InfoDashboardEditor } from './editor.js';
export const VERSION = typeof __INFO_DASHBOARD_VERSION__ === 'undefined' ? 'development' : __INFO_DASHBOARD_VERSION__;
InfoDashboard.version = VERSION;
if (!customElements.get('info-dashboard')) customElements.define('info-dashboard', InfoDashboard);
if (!customElements.get('info-dashboard-editor')) customElements.define('info-dashboard-editor', InfoDashboardEditor);
window.customCards ??= [];
if (!window.customCards.some(card => card.type === 'info-dashboard')) window.customCards.push({ type: 'info-dashboard', name: 'Info Dashboard', description: 'Room clock and configurable information layout', preview: true });
export { InfoDashboard, InfoDashboardEditor };
