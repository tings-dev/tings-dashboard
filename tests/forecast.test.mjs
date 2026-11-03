import test from 'node:test';
import assert from 'node:assert/strict';
import { ForecastSource, forecastType } from '../src/forecast.js';
import { normalizeConfig } from '../src/config.js';
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(options) {
  const calls = [];
  const config = normalizeConfig({ weather: { entity: 'weather.home', forecast: true }, features: { weather: { enabled: true } } });
  const hass = { connected: true, states: { 'weather.home': { state: 'cloudy', attributes: { supported_features: 7 } } }, connection: { subscribeMessage(callback, request) { return new Promise((resolve, reject) => calls.push({ callback, request, resolve, reject })); } } };
  let changes = 0; const source = new ForecastSource(() => changes++, options);
  return { config, hass, source, calls, changes: () => changes };
}
test('forecast type selection follows source capabilities and explicit selection', () => {
  assert.equal(forecastType({ forecast_type: 'auto' }, { attributes: { supported_features: 7 } }), 'hourly');
  assert.equal(forecastType({ forecast_type: 'auto' }, { attributes: { supported_features: 5 } }), 'twice_daily');
  assert.equal(forecastType({ forecast_type: 'daily' }, { attributes: { supported_features: 2 } }), null);
  assert.equal(forecastType({ forecast_type: 'auto' }, {}), null);
});
test('presentation edits retain one subscription; disabling unsubscribes and late callbacks cannot restore data', async t => {
  const { config, hass, source, calls } = setup(); t.after(() => source.stop());
  source.update(config, hass, true); await flush();
  assert.deepEqual(calls[0].request, { type: 'weather/subscribe_forecast', entity_id: 'weather.home', forecast_type: 'hourly' });
  let stopped = 0; calls[0].resolve(() => stopped++); await flush();
  calls[0].callback({ forecast: [{ condition: 'rainy' }] }); assert.equal(source.items.length, 1);
  source.update({ ...config, room_name: 'Changed' }, { ...hass }, true); await flush(); assert.equal(calls.length, 1);
  source.update({ ...config, features: { ...config.features, weather: { enabled: false } } }, hass, true); assert.equal(stopped, 1); assert.deepEqual(source.items, []);
  calls[0].callback({ forecast: [{ condition: 'sunny' }] }); assert.deepEqual(source.items, []);
});
test('pending subscriptions are disposed after removal and reconnect does not accept old data', async t => {
  const { config, hass, source, calls } = setup(); t.after(() => source.stop());
  source.update(config, hass, true); await flush(); source.stop();
  let stopped = 0; calls[0].resolve(() => { stopped++; return Promise.reject(new Error('socket closed')); }); await flush(); assert.equal(stopped, 1);
  source.update(config, hass, true); await flush(); assert.equal(calls.length, 2);
  calls[0].callback({ forecast: ['old'] }); assert.deepEqual(source.items, []);
  calls[1].callback({ forecast: ['new'] }); assert.deepEqual(source.items, ['new']);
  source.update(config, { ...hass, connected: false }, true); assert.deepEqual(source.items, []);
  source.update(config, hass, true); await flush(); assert.equal(calls.length, 3);
  calls[1].resolve(() => stopped++); await flush(); assert.equal(stopped, 2);
  calls[2].resolve(() => stopped++); await flush(); source.stop(); assert.equal(stopped, 3);
});
test('unsupported, disabled, missing, and detached weather never subscribe', async t => {
  const { config, hass, source, calls } = setup(); t.after(() => source.stop());
  source.update(config, hass, false);
  source.update({ ...config, weather: { ...config.weather, forecast: false } }, hass, true);
  source.update(config, { ...hass, states: {} }, true);
  source.update(config, { ...hass, states: { 'weather.home': { state: 'cloudy', attributes: { supported_features: 0 } } } }, true);
  await flush(); assert.equal(calls.length, 0);
});
test('failed and timed-out subscriptions retry and obsolete handles are cleaned up', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { config, hass, source, calls } = setup({ timeout: 20, retry: 10 }); t.after(() => source.stop());
  source.update(config, hass, true); await flush(); calls[0].reject(new Error('unsupported')); await flush();
  t.mock.timers.tick(10); await flush(); assert.equal(calls.length, 2);
  t.mock.timers.tick(20); await flush(); assert.deepEqual(source.items, []);
  t.mock.timers.tick(10); await flush(); assert.equal(calls.length, 3);
  let disposed = 0; calls[1].resolve(() => disposed++); await flush(); assert.equal(disposed, 1);
  source.stop(); t.mock.timers.tick(100); await flush(); assert.equal(calls.length, 3);
});
test('changing forecast entity or type disposes old callbacks; immediate removal cancels a queued request', async t => {
  const { config, hass, source, calls } = setup(); t.after(() => source.stop());
  source.update(config, hass, true); source.stop(); await flush(); assert.equal(calls.length, 0);
  source.update(config, hass, true); await flush(); calls[0].resolve(() => {}); await flush();
  const next = normalizeConfig({ ...config, weather: { ...config.weather, entity: 'weather.other', forecast_type: 'daily' } });
  const nextHass = { ...hass, states: { ...hass.states, 'weather.other': hass.states['weather.home'] } };
  source.update(next, nextHass, true); await flush();
  assert.equal(calls[1].request.entity_id, 'weather.other'); assert.equal(calls[1].request.forecast_type, 'daily');
  calls[0].callback({ forecast: ['old'] }); assert.deepEqual(source.items, []);
  calls[1].callback({ forecast: ['new'] }); assert.deepEqual(source.items, ['new']);
  calls[1].resolve(() => {}); await flush();
});
