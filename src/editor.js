import { FIELDS, configFields, FEATURES, getPath, setPath, normalizeConfig } from './config.js';
import { translator, configErrorText } from './i18n.js';
const STYLES = `
:host{display:block;color:var(--primary-text-color,#222);font:14px Arial,Helvetica,sans-serif;--field-bg:var(--card-background-color,#fff)}
button{font:inherit;min-height:44px;padding:8px 12px;margin:4px;border:1px solid var(--divider-color,#888);border-radius:4px;background:var(--field-bg);color:inherit;cursor:pointer}.actions{display:flex;flex-wrap:wrap}.list-item{border-top:1px solid var(--divider-color,#aaa);padding-top:12px;margin-top:12px}*{box-sizing:border-box}fieldset{border:1px solid var(--divider-color,#aaa);border-radius:8px;padding:14px;margin:16px 0;min-width:0}legend{padding:0 6px;font-weight:600}
.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:16px}
label{display:flex;flex-direction:column;gap:7px;min-width:0;line-height:1.4}input,select{font:inherit;color:inherit;background:var(--field-bg);border:1px solid var(--divider-color,#888);border-radius:4px;padding:9px;width:100%;min-height:44px;min-width:0}
input[type=checkbox]{width:24px;height:24px;min-height:24px;accent-color:var(--primary-color,#436e57);margin:8px;cursor:pointer}.check{flex-direction:row;align-items:center}
small{font-size:12px;color:var(--secondary-text-color,#555)}.error{color:var(--error-color,#aa2020);font-size:13px;margin:0;line-height:1.5;overflow-wrap:anywhere}.error:empty{display:none}
[aria-invalid=true]{border-color:var(--error-color,#aa2020)}.notice{line-height:1.5;color:var(--secondary-text-color,#555)}
.visibility-row{display:grid;grid-template-columns:minmax(100px,1fr) 90px 100px;gap:8px;align-items:center;border-bottom:1px solid var(--divider-color,#ddd);padding:6px 0;line-height:1.4}.visibility-row label{align-items:center}.heading{font-size:12px;border:0;color:var(--secondary-text-color,#555)}
:focus-visible{outline:2px solid var(--primary-color,#436e57);outline-offset:3px}
`;
export class InfoDashboardEditor extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this.shadowRoot.addEventListener('input', event => this._input(event));
    this.shadowRoot.addEventListener('change', event => { if (event.target.tagName === 'SELECT') this._input(event); });
  }
  setConfig(config) {
    const next = normalizeConfig(config);
    if (JSON.stringify(next) === JSON.stringify(this._config)) return;
    this._config = next; this._draft = structuredClone(next); this._error = null; this._render();
  }
  set hass(value) {
    this._hass = value;
    const language = this._language();
    if (this._languageRendered !== language) this._render();
    else this._suggestions();
  }
  _language() { return this._draft?.language === 'auto' ? this._hass?.locale?.language ?? this._hass?.language ?? 'en' : this._draft?.language ?? 'en'; }
  _render() {
    if (!this._config) return;
    this._languageRendered = this._language(); this._t = translator(this._languageRendered);
    this.shadowRoot.replaceChildren();
    const style = document.createElement('style'); style.textContent = STYLES; this.shadowRoot.append(style);
    const notice = document.createElement('p'); notice.className = 'notice'; notice.textContent = this._t('stage_notice'); this.shadowRoot.append(notice);
    const error = document.createElement('p'); error.id = 'draft-error'; error.className = 'error'; error.setAttribute('role', 'alert'); this.shadowRoot.append(error);
    for (const group of ['content', 'clock', 'readings', 'co2', 'thresholds', 'weather', 'visibility', 'appearance', 'layout', 'colors', 'night_colors']) {
      const section = document.createElement('fieldset'); const legend = document.createElement('legend'); legend.textContent = this._t(group); section.append(legend);
      if (['readings', 'thresholds'].includes(group)) this._list(section, group === 'readings' ? 'readings' : 'co2.thresholds');
      else if (group === 'visibility') this._visibility(section);
      else {
        const grid = document.createElement('div'); grid.className = 'fields';
        for (const field of FIELDS.filter(f => f.group === group)) grid.append(this._field(field));
        section.append(grid);
      }
      this.shadowRoot.append(section);
    }
    this._suggestions(); this._showError();
  }
  _field(field) {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    const title = document.createElement('span'); title.textContent = this._t(field.label ?? (field.kind === 'color' ? field.path.split('.').at(-1) : field.path));
    label.append(title);
    const control = this._control(field); label.append(control);
    if (field.kind === 'boolean') label.className = 'check';
    wrapper.append(label);
    if (field.kind === 'color') { const hint = document.createElement('small'); hint.textContent = this._t('inherit_color'); wrapper.append(hint); }
    const error = document.createElement('p'); error.className = 'error'; error.id = `error-${field.path}`; error.setAttribute('role', 'alert'); wrapper.append(error);control.setAttribute('aria-describedby', error.id);
    return wrapper;
  }
  _control(field) {
    const control = document.createElement(field.kind === 'select' ? 'select' : 'input');
    control.dataset.path = field.path; control.id = `field-${field.path}`;
    if (field.kind === 'select') {
      for (const choice of field.options) { const option = document.createElement('option'); option.value = choice; option.textContent = this._t(choice === 'night' ? 'night_preset' : choice); control.append(option); }
    } else if (field.kind === 'boolean') control.type = 'checkbox';
    else if (field.kind === 'number') { control.type = 'number'; control.min = field.min; control.max = field.max; control.step = 'any'; }
    else control.type = 'text';
    if (field.kind === 'entity') { control.setAttribute('list', `entities-${field.domain}`); control.autocomplete = 'off'; control.spellcheck = false; }
    const value = getPath(this._draft, field.path);
    if (field.kind === 'boolean') control.checked = value;
    else control.value = value ?? '';
    return control;
  }
  _suggestions() {
    for (const domain of ['sensor', 'weather']) {
      let list = this.shadowRoot.getElementById(`entities-${domain}`);
      if (!list) { list = document.createElement('datalist'); list.id = `entities-${domain}`; this.shadowRoot.append(list); }
      list.replaceChildren();
      for (const entity of Object.values(this._hass?.states ?? {}).filter(e => e.entity_id?.startsWith(`${domain}.`)).sort((a, b) => a.entity_id.localeCompare(b.entity_id))) {
        const option = document.createElement('option'); option.value = entity.entity_id; option.label = entity.attributes?.friendly_name ?? ''; list.append(option);
      }
    }
  }
  _list(section, path) {
    const items = getPath(this._draft, path);
    const action = (parent, name, callback, disabled = false) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = this._t(name); button.disabled = disabled;
      button.addEventListener('click', callback); parent.append(button);
    };
    const change = (callback, focusIndex) => {
      callback(); this._accept(); this._render();
      this.shadowRoot.querySelector(`[data-path="${path}.${focusIndex}.entity"], [data-path="${path}.${focusIndex}.value"]`)?.focus();
    };
    items.forEach((_, index) => {
      const row = document.createElement('div'); row.className = 'list-item';
      const title = document.createElement('h4'); title.textContent = `${this._t(path === 'readings' ? 'reading' : 'threshold')} ${index + 1}`; row.append(title);
      const grid = document.createElement('div'); grid.className = 'fields';
      for (const field of configFields(this._draft).filter(f => f.path.startsWith(`${path}.${index}.`))) grid.append(this._field(field));
      row.append(grid); const actions = document.createElement('div'); actions.className = 'actions'; row.append(actions);
      action(actions, 'move_up', () => change(() => { [items[index - 1], items[index]] = [items[index], items[index - 1]]; }, index - 1), index === 0);
      action(actions, 'move_down', () => change(() => { [items[index + 1], items[index]] = [items[index], items[index + 1]]; }, index + 1), index === items.length - 1);
      action(actions, 'remove', () => change(() => items.splice(index, 1), Math.max(0, index - 1)));
      section.append(row);
    });
    action(section, path === 'readings' ? 'add_reading' : 'add_threshold', () => change(() => items.push(path === 'readings'
      ? { entity: '', label: '', precision: 'auto', enabled: true, night: true }
      : { value: Math.min(1000000, (items.at(-1)?.value ?? 600) + 200), color: '#c96964', label: '' }), items.length), path === 'readings' && items.length >= 4);
  }
  _visibility(section) {
    const heading = document.createElement('div'); heading.className = 'visibility-row heading';
    for (const key of ['', 'enabled', 'night']) { const span = document.createElement('span'); span.textContent = key ? this._t(key) : ''; heading.append(span); }
    section.append(heading);
    for (const key of FEATURES) {
      const row = document.createElement('div'); row.className = 'visibility-row'; const name = document.createElement('span'); name.textContent = this._t(key); row.append(name);
      for (const state of ['enabled', 'night']) {
        const field = FIELDS.find(f => f.path === `features.${key}.${state}`); const label = document.createElement('label'); const control = this._control(field);
        control.setAttribute('aria-label', `${this._t(key)}: ${this._t(state)}`); label.append(control); row.append(label);
      }
      section.append(row);
    }
  }
  _input(event) {
    const field = configFields(this._draft).find(f => f.path === event.target.dataset?.path);
    if (!field) return;
    const raw = event.target.value;
    const value = field.kind === 'boolean' ? event.target.checked
      : field.kind === 'number' ? (raw.trim() ? Number(raw) : null)
      : field.kind === 'precision' ? (raw === 'auto' ? raw : raw.trim() ? Number(raw) : null)
      : field.kind === 'height' && raw !== 'viewport' ? (raw.trim() ? Number(raw) : null) : raw;
    setPath(this._draft, field.path, value);
    this._accept();
  }
  _accept() {
    try {
      const candidate = normalizeConfig(this._draft);
      this._error = null;
      if (JSON.stringify(candidate) !== JSON.stringify(this._config)) {
        this._config = candidate;
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: structuredClone(candidate) }, bubbles: true, composed: true }));
      }
    } catch (error) { this._error = error; }
    this._showError();
  }
  _showError() {
    if (!this._t) return;
    this.shadowRoot.getElementById('draft-error').textContent = this._error ? configErrorText(this._error, this._t) : '';
    for (const field of configFields(this._draft)) {
      const input = this.shadowRoot.querySelector(`[data-path="${field.path}"]`);
      const error = this.shadowRoot.getElementById(`error-${field.path}`);
      const active = this._error?.path === field.path;
      input?.setAttribute('aria-invalid', String(active));
      if (error) error.textContent = active ? configErrorText(this._error, this._t) : '';
    }
  }
}
