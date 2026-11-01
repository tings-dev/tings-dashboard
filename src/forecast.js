import { connected, knownCondition } from './environment.js';
import { visibleFeatures } from './config.js';
const TYPES = { hourly: 2, twice_daily: 4, daily: 1 };
export function forecastType(config, entity) {
  const supported = entity?.attributes?.supported_features ?? 0;
  if (config.forecast_type !== 'auto') return supported & TYPES[config.forecast_type] ? config.forecast_type : null;
  return Object.keys(TYPES).find(type => supported & TYPES[type]) ?? null;
}
// One subscription per visible source. Epochs protect reconfiguration, removal,
// timeout, and reconnection from late callbacks and late subscription handles.
export class ForecastSource {
  constructor(onChange, { timeout = 15000, retry = 60000 } = {}) {
    this.onChange = onChange; this.timeout = timeout; this.retry = retry; this.epoch = 0; this.items = [];
  }
  update(config, hass, night, mounted) {
    const entity = hass?.states?.[config.weather.entity];
    const type = forecastType(config.weather, entity);
    const connection = hass?.connection;
    const active = mounted && connected(hass) && knownCondition(entity?.state) && visibleFeatures(config, night).weather && config.weather.forecast && type && typeof connection?.subscribeMessage === 'function';
    const key = active ? `${config.weather.entity}:${type}` : '';
    if (key === this.key && (!key || connection === this.connection)) return;
    this.stop(); this.key = key; this.connection = connection;
    if (!key) return;
    this.request = { type: 'weather/subscribe_forecast', entity_id: config.weather.entity, forecast_type: type };
    this.start();
  }
  start() {
    const epoch = ++this.epoch;
    const connection = this.connection, request = this.request;
    const fail = () => {
      if (epoch !== this.epoch) return;
      ++this.epoch; clearTimeout(this.deadline); this.release(); this.publish([]);
      this.retryTimer = setTimeout(() => this.start(), this.retry);
    };
    this.deadline = setTimeout(fail, this.timeout);
    Promise.resolve().then(() => epoch === this.epoch ? connection.subscribeMessage(message => {
      if (epoch !== this.epoch) return;
      this.publish(Array.isArray(message?.forecast) ? message.forecast : []);
    }, request) : undefined).then(unsubscribe => {
      if (epoch !== this.epoch) { this.dispose(unsubscribe); return; }
      clearTimeout(this.deadline); this.unsubscribe = unsubscribe;
    }).catch(fail);
  }
  publish(items) { this.items = items; this.onChange(); }
  dispose(unsubscribe) { try { Promise.resolve(unsubscribe?.()).catch(() => {}); } catch { /* Disconnected sockets can reject cleanup. */ } }
  release() { this.dispose(this.unsubscribe); this.unsubscribe = undefined; }
  stop() {
    ++this.epoch; clearTimeout(this.deadline); clearTimeout(this.retryTimer); this.release();
    this.key = ''; this.connection = undefined; this.publish([]);
  }
}
