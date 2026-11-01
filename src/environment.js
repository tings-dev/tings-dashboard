import { visibleFeatures } from './config.js';

export const connected = hass => !!hass && hass.connected !== false && hass.connection?.connected !== false;
export function numericState(state) {
  if (typeof state !== 'string' || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(state.trim())) return null;
  const value = Number(state);
  return Number.isFinite(value) ? value : null;
}
function numberFormat(hass, preferences, precision) {
  const format = hass?.locale?.number_format;
  const locale = { comma_decimal: 'en-US', decimal_comma: 'de-DE', space_comma: 'fr-FR', quote_decimal: 'de-CH', none: 'en-US' }[format]
    ?? (format === 'system' ? undefined : preferences.locale);
  return new Intl.NumberFormat(locale, { useGrouping: format !== 'none', minimumFractionDigits: precision, maximumFractionDigits: precision });
}
export function formatReading(entity, hass, preferences, precision = 'auto') {
  const raw = numericState(entity?.state);
  if (raw === null) return { value: '—', unit: '' };
  let parts;
  // Use HA's own formatting, including its entity-specific display precision.
  try { parts = hass?.formatEntityStateToParts?.(entity); } catch { /* Older frontend: Intl fallback below. */ }
  const unit = parts?.filter(p => p.type === 'unit').map(p => p.value).join('') || entity.attributes?.unit_of_measurement || '';
  if (precision === 'auto' && parts?.some(p => p.type === 'value')) return { value: parts.filter(p => p.type === 'value').map(p => p.value).join(''), unit };
  const suggested = hass?.entities?.[entity.entity_id]?.display_precision ?? entity.attributes?.suggested_display_precision;
  const digits = Number.isInteger(suggested) ? Math.max(0, Math.min(6, suggested)) : Math.min(6, (entity.state.split('.')[1]?.split(/[eE]/)[0] ?? '').length);
  return { value: numberFormat(hass, preferences, precision === 'auto' ? digits : precision).format(raw), unit };
}
export function co2Presentation(config, hass, preferences, t) {
  const entity = hass?.states?.[config.entity];
  const raw = connected(hass) ? numericState(entity?.state) : null;
  const span = config.maximum - config.minimum;
  const fraction = value => Math.max(0, Math.min(1, (value - config.minimum) / span));
  const marks = config.thresholds.filter(b => b.value >= config.minimum && b.value <= config.maximum).map(b => fraction(b.value));
  // CO₂ thresholds are in ppm. A differently scaled source must not look healthy.
  if (raw === null || entity.attributes?.unit_of_measurement?.trim().toLowerCase() !== 'ppm') return { value: '—', unit: 'ppm', label: t('unavailable'), fraction: 0, marks };
  let band = { color: config.base_color, label: config.base_label };
  for (const threshold of config.thresholds) { if (raw < threshold.value) break; band = threshold; }
  return { value: numberFormat(hass, preferences, 0).format(raw), unit: 'ppm', label: band.label, color: band.color, fraction: fraction(raw), marks };
}
const CONDITIONS = new Set(['clear-night', 'cloudy', 'exceptional', 'fog', 'hail', 'lightning', 'lightning-rainy', 'partlycloudy', 'pouring', 'rainy', 'snowy', 'snowy-rainy', 'sunny', 'windy', 'windy-variant']);
export const knownCondition = condition => CONDITIONS.has(condition);
export function forecastSummary(forecasts, now, preferences, t) {
  const next = (forecasts ?? []).filter(item => typeof item?.datetime === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(item.datetime)).map(item => ({ ...item, date: new Date(item.datetime) }))
    .filter(item => Number.isFinite(item.date.getTime()) && item.date > now && knownCondition(item.condition))
    .sort((a, b) => a.date - b.date)[0];
  if (!next) return '';
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: preferences.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const day = date => Object.fromEntries(dayFormat.formatToParts(date).map(p => [p.type, p.value]));
  const dayNumber = date => { const p = day(date); return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / 86400000; };
  const distance = dayNumber(next.date) - dayNumber(now);
  const when = distance === 0
    ? new Intl.DateTimeFormat(preferences.locale, { timeZone: preferences.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: preferences.hour12 ? 'h12' : 'h23' }).format(next.date)
    : distance === 1 ? t('tomorrow') : new Intl.DateTimeFormat(preferences.locale, { timeZone: preferences.timeZone, month: 'short', day: 'numeric' }).format(next.date);
  return `${when} · ${t(`condition_${next.condition}`)}`;
}
export function environmentPresentation(config, hass, night, preferences, t, forecasts, now) {
  const v = visibleFeatures(config, night);
  const readings = config.readings.flatMap((source, index) => {
    if (!source.enabled || (night && !source.night)) return [];
    const entity = hass?.states?.[source.entity];
    let name;
    try { name = entity && hass?.formatEntityName?.(entity); } catch { /* Friendly name fallback. */ }
    const label = source.label || name || entity?.attributes?.friendly_name || source.entity || `${t('reading')} ${index + 1}`;
    const formatted = connected(hass) && numericState(entity?.state) !== null ? formatReading(entity, hass, preferences, source.precision) : { value: '—', unit: entity?.attributes?.unit_of_measurement || '' };
    return [{ ...formatted, label, entity: source.entity, key: `${index}:${source.entity}`, inspectable: !!entity }];
  });
  const entity = hass?.states?.[config.weather.entity];
  const condition = connected(hass) && knownCondition(entity?.state) ? entity.state : null;
  const weather = { condition, text: condition ? t(`condition_${condition}`) : t('weather_unavailable'), forecast: condition && v.weather && config.weather.forecast ? forecastSummary(forecasts, now, preferences, t) : '' };
  return { readings, weather, co2: co2Presentation(config.co2, hass, preferences, t) };
}
