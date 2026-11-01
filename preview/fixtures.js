// Mock HA responses used only by the development preview.
export const readingSources = [
  { entity: 'sensor.room_temperature', label: 'In this room' },
  { entity: 'sensor.outside_temperature', label: 'Outside' },
  { entity: 'sensor.humidity', label: 'Humidity' },
  { entity: 'sensor.light', label: 'Light' },
];
export function mockStates(unavailable = false, co2 = '1080') {
  const sensor = (id, state, unit, precision) => [id, { entity_id: id, state: unavailable ? 'unavailable' : state, attributes: { friendly_name: id.split('.')[1].replaceAll('_', ' '), unit_of_measurement: unit, suggested_display_precision: precision } }];
  return Object.fromEntries([
    sensor('sensor.room_temperature', '21.4', '°C', 1), sensor('sensor.outside_temperature', '12', '°C', 0),
    sensor('sensor.humidity', '48', '%', 0), sensor('sensor.light', '310', 'lx', 0), sensor('sensor.co2', co2, 'ppm', 0),
    ...['personal', 'family', 'work'].map(name => [`calendar.${name}`, { entity_id: `calendar.${name}`, state: unavailable ? 'unavailable' : 'off', attributes: { friendly_name: name[0].toUpperCase() + name.slice(1) } }]),
    ['weather.home', { entity_id: 'weather.home', state: unavailable ? 'unavailable' : 'cloudy', attributes: { friendly_name: 'Home', supported_features: 3 } }],
  ]);
}

export const calendarSources = [
  { entity: 'calendar.personal', label: 'Personal', color: '#8daea0' },
  { entity: 'calendar.family', label: 'Family', color: '#d9b36f' },
  { entity: 'calendar.work', label: 'Work', color: '#9faed3' },
];
export function mockCalendarEvents(mode, entity) {
  if (mode === 'empty') return [];
  const event = (summary, start, end) => ({ summary, start: { dateTime: start }, end: { dateTime: end } });
  const result = {
    'calendar.personal': [event('Walk by the lake', '2026-11-01T14:30:00Z', '2026-11-01T15:30:00Z'), event('Collect the parcel', '2026-11-02T16:00:00Z', '2026-11-02T17:00:00Z')],
    'calendar.family': [{ summary: 'School holidays', start: { date: '2026-11-01' }, end: { date: '2026-11-02' } }, event('Dinner with friends', '2026-11-01T17:00:00Z', '2026-11-01T19:00:00Z')],
    'calendar.work': [event('Weekly planning', '2026-11-02T08:00:00Z', '2026-11-02T09:00:00Z'), event('Coffee with Sam', '2026-11-03T09:00:00Z', '2026-11-03T10:00:00Z')],
  };
  if (['soon', 'long', 'ongoing'].includes(mode)) {
    result['calendar.family'][1] = event(mode === 'long' ? 'Planning the winter weekend with friends and neighbours' : 'Dinner with friends', mode === 'ongoing' ? '2026-11-01T13:15:00Z' : '2026-11-01T14:00:00Z', '2026-11-01T14:30:00Z');
    result['calendar.personal'].unshift(event('Call with Alex', '2026-11-01T14:05:00Z', '2026-11-01T14:30:00Z'));
  }
  if (mode === 'duplicates') result['calendar.personal'].push(structuredClone(result['calendar.family'][1]));
  return result[entity] ?? [];
}
