// Development fixtures never enter the card bundle or production configuration.
export function calendarPresentation(mode = 'agenda') {
  const items = [
    { when: '15:30', title: 'Walk by the lake', source: 'Personal' },
    { when: '18:00', title: 'Dinner with friends', source: 'Family' },
    { when: 'Tomorrow · 09:00', title: 'Weekly planning', source: 'Work' },
    { when: 'Tomorrow · 17:00', title: 'Collect the parcel', source: 'Personal' },
    { when: 'Tuesday · 10:00', title: 'Coffee with Sam', source: 'Personal' },
  ];
  if (mode === 'unavailable') return { state: 'unavailable' };
  return { state: 'ready', mode: mode === 'long' ? 'soon' : mode, sourceLabel: '3 calendars', allDay: mode === 'empty' ? [] : ['School holidays'], items: mode === 'empty' ? [] : items,
    focus: { title: mode === 'long' ? 'Planning the winter weekend with friends and neighbours' : 'Dinner with friends', when: mode === 'ongoing' ? '14:15–15:30' : '15:00 · in 18 minutes', source: 'Family' }, next: { when: 'Starting soon · 15:00', title: 'Call with Alex' } };
}

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
    ['weather.home', { entity_id: 'weather.home', state: unavailable ? 'unavailable' : 'cloudy', attributes: { friendly_name: 'Home', supported_features: 3 } }],
  ]);
}
