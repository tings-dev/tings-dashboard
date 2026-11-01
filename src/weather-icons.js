// Small, stroke-only icons keep the weather quieter than the readings.
const cloud = 'M5 16a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4.5 4.5 0 0 1 1 9Z';
const rain = 'M7 19l-1 3m6-3-1 3m6-3-1 3';
const sun = 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0';
const wind = 'M3 8h13a3 3 0 1 0-3-3M3 12h17M3 16h11a3 3 0 1 1-3 3';
const snow = 'M7 19v4m-2-2h4m7-2v4m-2-2h4';
const paths = {
  sunny: sun, 'clear-night': 'M18 16A8 8 0 0 1 8 6 8 8 0 1 0 18 16Z', cloudy: cloud,
  partlycloudy: 'M4 4V2m4 3 2-2M2 8H0m2 4 2-2M4 8a3 3 0 1 1 6 0 ' + cloud,
  rainy: cloud + rain, pouring: cloud + rain + 'M4 18l-1 3m17-3-1 3', snowy: cloud + snow,
  'snowy-rainy': cloud + 'M6 19l-1 3M16 19v4m-2-2h4', hail: cloud + 'M6 20h2m4 2h2m3-2h2',
  lightning: cloud + 'M12 15l-3 5h4l-2 4', 'lightning-rainy': cloud + 'M12 15l-3 5h4l-2 4M5 19l-1 3m15-3-1 3',
  fog: cloud + 'M3 19h18M5 22h14', windy: wind, 'windy-variant': wind,
  exceptional: 'M12 3 2 21h20ZM12 9v6m0 2v2',
};
export function weatherIcon(condition) {
  return `<svg viewBox="0 0 24 26" aria-hidden="true"><path d="${paths[condition] ?? 'M7 8a5 5 0 1 1 7 5c-2 1-2 2-2 4m0 3v1'}"/></svg>`;
}
