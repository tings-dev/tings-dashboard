import { InfoDashboard } from './card.js';
import { InfoDashboardEditor } from './editor.js';
if (!customElements.get('info-dashboard')) customElements.define('info-dashboard', InfoDashboard);
if (!customElements.get('info-dashboard-editor')) customElements.define('info-dashboard-editor', InfoDashboardEditor);
window.customCards ??= [];
if (!window.customCards.some(card => card.type === 'info-dashboard')) window.customCards.push({ type: 'info-dashboard', name: 'Info Dashboard', description: 'Room clock and configurable information layout', preview: true });
export { InfoDashboard, InfoDashboardEditor };
