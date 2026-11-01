// Development fixtures never enter the card bundle or production configuration.
export function presentation(mode = 'agenda', count = 2) {
  const items = [
    { when: '15:30', title: 'Walk by the lake', source: 'Personal' },
    { when: '18:00', title: 'Dinner with friends', source: 'Family' },
    { when: 'Tomorrow · 09:00', title: 'Weekly planning', source: 'Work' },
    { when: 'Tomorrow · 17:00', title: 'Collect the parcel', source: 'Personal' },
    { when: 'Tuesday · 10:00', title: 'Coffee with Sam', source: 'Personal' },
  ];
  if (mode === 'unavailable') return { readings: [{ label: 'In this room' }, { label: 'Outside' }], calendar: { state: 'unavailable' }, co2: null, weather: null };
  return {
    readings: [
      { value: '21.4', unit: '°C', label: 'In this room' }, { value: '12', unit: '°C', label: 'Outside' },
      { value: '48', unit: '%', label: 'Humidity' }, { value: '310', unit: 'lx', label: 'Light' },
    ].slice(0, count),
    co2: { value: '1,080', unit: 'ppm', label: 'Elevated', color: '#d9b36f', fraction: .425, marks: [.25, .375, .625, .875] },
    weather: { text: 'Cloudy' },
    calendar: { state: 'ready', mode: mode === 'long' ? 'soon' : mode, sourceLabel: '3 calendars', allDay: mode === 'empty' ? [] : ['School holidays'], items: mode === 'empty' ? [] : items,
      focus: { title: mode === 'long' ? 'Planning the winter weekend with friends and neighbours' : 'Dinner with friends', when: mode === 'ongoing' ? '14:15–15:30' : '15:00 · in 18 minutes', source: 'Family' }, next: { when: 'Starting soon · 15:00', title: 'Call with Alex' } },
  };
}
