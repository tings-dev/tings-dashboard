// Preferences follow Home Assistant's locale values; auto timezone respects local/server.
export function resolveClockPreferences(config, hass = {}, system = {}) {
  const systemLanguage = system.language ?? globalThis.navigator?.language ?? 'en';
  const systemZone = system.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locale = config.language === 'auto' ? (hass.locale?.language || hass.language || systemLanguage) : config.language;
  const preference = config.time_format === 'auto' ? (hass.locale?.time_format ?? 'language') : config.time_format;
  const sampleLocale = preference === 'system' ? systemLanguage : locale;
  const hour12 = preference === '12' || (!['12', '24'].includes(preference) && new Intl.DateTimeFormat(sampleLocale, { hour: 'numeric' }).resolvedOptions().hour12);
  const timeZone = config.time_zone === 'auto'
    ? (hass.locale?.time_zone === 'local' ? systemZone : hass.config?.time_zone || systemZone)
    : config.time_zone;
  const datePreference = config.date_format === 'auto' ? (hass.locale?.date_format ?? 'language') : config.date_format;
  return { locale, timeZone, hour12: !!hour12, datePreference, dateLocale: datePreference === 'system' ? systemLanguage : locale };
}
export function makeClockFormatter(preferences) {
  const { locale, timeZone, hour12, datePreference, dateLocale } = preferences;
  const time = new Intl.DateTimeFormat(locale, { timeZone, hour: hour12 ? 'numeric' : '2-digit', minute: '2-digit', hourCycle: hour12 ? 'h12' : 'h23' });
  const numeric = new Intl.DateTimeFormat(dateLocale, { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' });
  const date = new Intl.DateTimeFormat(dateLocale, datePreference === 'short'
    ? { timeZone, dateStyle: 'short' }
    : { timeZone, weekday: 'long', day: 'numeric', month: 'long' });
  return instant => {
    const parts = time.formatToParts(instant);
    const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value ?? '';
    const digits = parts.filter(p => p.type !== 'dayPeriod').map(p => p.value).join('').trim();
    let dateText = date.format(instant);
    if (['DMY', 'MDY', 'YMD'].includes(datePreference)) {
      const p = Object.fromEntries(numeric.formatToParts(instant).map(part => [part.type, part.value]));
      dateText = ({ DMY: [p.day, p.month, p.year], MDY: [p.month, p.day, p.year], YMD: [p.year, p.month, p.day] })[datePreference].join(datePreference === 'YMD' ? '-' : '/');
    }
    return { digits, dayPeriod, date: dateText, accessibleTime: time.format(instant) };
  };
}
