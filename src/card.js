import { CalendarSource } from './calendar-source.js';
import { calendarPresentation } from './calendar-model.js';
import { NightControl } from './night.js';
import { Dismissals } from './dismissals.js';
import { environmentPresentation } from './environment.js';
import { ForecastSource } from './forecast.js';
import { normalizeConfig, createInstanceId } from './config.js';
import { makeClockFormatter, resolveClockPreferences } from './clock.js';
import { translator, configErrorText } from './i18n.js';
import { CARD_STYLES } from './styles.js';
import { EMPTY_PRESENTATION, renderView, fitAgenda } from './view.js';
export class InfoDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const style = document.createElement('style'); style.textContent = CARD_STYLES;
    this._root = document.createElement('div');
    this.shadowRoot.append(style, this._root);
    this._presentation = {};
    this._forecast = new ForecastSource(() => this._refreshData());
    this._calendar = new CalendarSource(() => this._refreshData(), () => this.currentTime().getTime());
    this._dismissals = new Dismissals();
    this._nightControl = new NightControl();
    this._onStorage = event => {
      if (event.key === this._dismissals.key || event.key === null) {
        this._dismissals.reload(this.currentTime().getTime()); this._refreshData();
      }
      if (event.key === this._nightControl.key || event.key === null) {
        this._nightControl.reload(); this._applyNight(); this._syncSources(); this._render();
      }
    };
    this._night = false;
    this._resize = new ResizeObserver(() => this._layout());
    this._onVisibility = () => this._startClock();
    this._root.addEventListener('click', event => {
      const action = event.target.closest('button.calendar-action');
      if (action) { this._calendarAction(action); return; }
      const button = event.target.closest('button.reading');
      if (button && !button.disabled && button.dataset.entity) this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: button.dataset.entity }, bubbles: true, composed: true }));
    });
  }
  static getConfigElement() { return document.createElement('info-dashboard-editor'); }
  static getStubConfig() { return { schema_version: 1, instance_id: createInstanceId() }; }
  getCardSize() { return 10; }
  getGridOptions() { return { columns: 'full', rows: 8, min_columns: 12, min_rows: 8 }; }
  setConfig(config) {
    let next;
    try { next = normalizeConfig(config); } catch (error) {
      throw new Error(configErrorText(error, translator(this._preferences?.locale)), { cause: error });
    }
    this._config = next;
    this._applyNight();
    this._dismissals.setScope(next.instance_id, this.currentTime().getTime());
    this.style.height = `var(--info-dashboard-height, ${next.layout.height === 'viewport' ? 'calc(100dvh - var(--header-height, 0px))' : `${next.layout.height}px`})`;
    this.classList.toggle('motion', next.motion);
    this._syncSources(); this._render();
    if (this.isConnected) this._startClock();
  }
  set hass(value) {
    this._hass = value;
    if (!this._config) return;
    const next = resolveClockPreferences(this._config, value);
    const nightChanged = this._applyNight();
    this._syncSources();
    if (nightChanged || JSON.stringify(next) !== JSON.stringify(this._preferences)) this._render();
    else this._refreshData();
  }
  get hass() { return this._hass; }
  // Explicit preview/adapter state when automatic activation is off.
  set night(value) {
    if (typeof value !== 'boolean') throw new TypeError('night must be boolean');
    this._manualNight = value;
    if (this._config?.night.mode !== 'off' || value === this._night) return;
    this._night = value; this._syncSources(); this._render();
  }
  get night() { return this._night; }
  set presentation(value) {
    if (value?.readings?.length > 4) throw new RangeError('At most four displayed readings');
    this._presentation = value ? structuredClone(value) : {};
    this._render();
  }
  connectedCallback() {
    this._resize.observe(this);
    document.addEventListener('visibilitychange', this._onVisibility);
    window.addEventListener('storage', this._onStorage);
    if (!this._config) this.setConfig({});
    this._nightControl.reload(); this._applyNight();
    this._syncSources(); this._render(); this._startClock();
  }
  disconnectedCallback() {
    this._forecast.stop(); this._calendar.stop();
    this._resize.disconnect();
    clearTimeout(this._timer); this._timer = undefined;
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.removeEventListener('storage', this._onStorage);
  }
  currentTime() { return new Date(); }
  _startClock() {
    clearTimeout(this._timer); this._timer = undefined;
    if (!this.isConnected) return;
    this._tick();
    if (!document.hidden || this._config?.night.mode === 'schedule') this._timer = setTimeout(() => this._startClock(), document.hidden ? 30000 : 1000 - Date.now() % 1000);
  }
  _applyNight() {
    if (!this._config) return false;
    const next = this._config.night.mode === 'off' ? this._manualNight ?? false : this._nightControl.resolve(this._config, this._hass, this.currentTime());
    if (next === this._night) return false;
    this._night = next; return true;
  }
  _syncSources() {
    if (!this._config) return;
    this._forecast.update(this._config, this._hass, this._night, this.isConnected);
    this._calendar.update(this._config, this._hass, this._night, this.isConnected, resolveClockPreferences(this._config, this._hass).timeZone);
  }
  _calendarAction(button) {
    const now = this.currentTime().getTime(), data = this._data().calendar;
    if (button.dataset.action === 'done' && data.canDismiss && data.focus?.key === button.dataset.eventKey) {
      this._dismissals.dismiss(data.focus, now); this._refreshData();
      this._root.querySelector('[data-action="undo"]')?.focus({ preventScroll: true });
    } else if (button.dataset.action === 'undo' && data.undo?.key === button.dataset.eventKey) {
      this._dismissals.undo(data.undo.key, now); this._refreshData();
      (this._root.querySelector('[data-action="done"]') ?? this._root.querySelector('.calendar-heading'))?.focus({ preventScroll: true });
    }
  }
  _data() {
    const now = this.currentTime(), dismissed = this._dismissals.active(now.getTime());
    const calendarConfig = { ...this._config.calendar, sources: this._config.calendar.sources.map(source => ({ ...source, label: source.label || this._hass?.states?.[source.entity]?.attributes?.friendly_name || source.entity })) };
    const calendar = calendarPresentation(calendarConfig, this._calendar.records, now.getTime(), this._preferences, this._t, dismissed, this._dismissals.latest(now.getTime()), this._dismissals.failed);
    return { ...EMPTY_PRESENTATION, calendar, ...environmentPresentation(this._config, this._hass, this._night, this._preferences, this._t, this._forecast.items, this.currentTime()), ...this._presentation };
  }
  _refreshData() {
    if (!this._preferences || !this._config) return;
    if (JSON.stringify(this._data()) !== this._dataSignature) this._render();
  }
  _render() {
    if (!this._config) return;
    this._preferences = resolveClockPreferences(this._config, this._hass);
    this._format = makeClockFormatter(this._preferences);
    this._t = translator(this._preferences.locale);
    const data = this._data(); this._dataSignature = JSON.stringify(data);
    const active = this.shadowRoot.activeElement;
    const buttons = new Map([...this._root.querySelectorAll('button.reading, button.calendar-action, h2[data-key]')].map(button => [button.dataset.key, button]));
    renderView(this._root, this._config, data, this._night, this._t);
    // Preserve the native control and keyboard focus when live readings change.
    for (const button of this._root.querySelectorAll('button.reading, button.calendar-action, h2[data-key]')) {
      const old = buttons.get(button.dataset.key);
      if (!old) continue;
      old.innerHTML = button.innerHTML;
      for (const attribute of [...old.attributes]) old.removeAttribute(attribute.name);
      for (const attribute of button.attributes) old.setAttribute(attribute.name, attribute.value);
      button.replaceWith(old);
      if (old === active && !old.disabled) old.focus({ preventScroll: true });
    }
    if (active?.matches('.calendar-action, h2[data-key]') && !this._root.contains(active)) this._root.querySelector('.calendar-heading')?.focus({ preventScroll: true });
    this._root.lang = this._preferences.locale;
    this._tick(); this._layout();
  }
  _tick() {
    if (!this._format) return;
    if (this._applyNight()) { this._syncSources(); this._render(); return; }
    if (this.isConnected) this._calendar.ensureFresh();
    const now = this.currentTime();
    const value = this._format(now);
    for (const [selector, text] of [['.digits', value.digits], ['.period', value.dayPeriod], ['.date', value.date]]) {
      const node = this._root.querySelector(selector);
      if (node && node.textContent !== text) node.textContent = text;
    }
    this._root.querySelector('.clock')?.setAttribute('aria-label', value.accessibleTime);
    this._fitClock();
    this._refreshData();
  }
  _layout() {
    if (!this._config || !this.isConnected) return;
    const width = this.clientWidth;
    if (!width) return;
    const { spacing, text_scale: scale, clock_scale: clockScale } = this._config.layout;
    const clamp = (min, value, max) => Math.max(min, Math.min(value, max));
    const sizes = {
      pad: (width < 1000 ? 28 : clamp(24, width * .042, 54)) * spacing,
      gap: clamp(20, width * .031, 40) * spacing,
      'clock-font': clamp(60, width * .162, 208) * clockScale,
      'solo-clock-font': clamp(90, width * .255, 330) * clockScale,
      'date-font': clamp(18, width * .019, 25) * scale,
      'label-font': clamp(13, width * .013, 17) * scale,
      'source-font': clamp(12, width * .012, 15) * scale,
      'reading-font': clamp(30, width * .035, 46) * scale,
      'readings-width': clamp(220, width * .24, 310),
      'when-font': clamp(16, width * .015, 20) * scale,
      'event-font': clamp(23, width * .0235, 31) * scale,
      'focus-font': clamp(28, width * .035, 46) * scale,
      'calendar-top': clamp(10, width * .028, 36) * spacing,
      'event-padding': (width < 1000 ? 17 : 22) * spacing,
      'focus-top': (width < 1000 ? 14 : 36) * spacing,
    };
    for (const [key, value] of Object.entries(sizes)) this._root.style.setProperty(`--${key}`, `${value}px`);
    this._fitClock(); fitAgenda(this._root, this._t);
  }
  _fitClock() {
    const clock = this._root.querySelector('.clock');
    if (!clock || !this.clientWidth) return;
    clock.style.fontSize = '';
    const base = parseFloat(getComputedStyle(clock).fontSize);
    const block = clock.parentElement;
    const date = block.querySelector('.date');
    const availableHeight = block.clientHeight - 24 - (date ? date.getBoundingClientRect().height + 16 : 0);
    const contentsWidth = [...clock.children].reduce((sum, el) => sum + el.getBoundingClientRect().width, 0) + base * .06;
    const ratio = Math.min(1, block.clientWidth / Math.max(1, contentsWidth), Math.max(1, availableHeight) / (base * 1.08));
    if (ratio < 1) clock.style.fontSize = `${base * ratio}px`;
  }
}
