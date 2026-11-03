import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, stringify } from 'yaml';
import { configFields, normalizeConfig } from '../src/config.js';
import { TRANSLATIONS, translator } from '../src/i18n.js';
test('English and German cover the same interface and error keys and interpolation parameters', () => {
  assert.deepEqual(Object.keys(TRANSLATIONS.de).sort(), Object.keys(TRANSLATIONS.en).sort());
  for (const [key, text] of Object.entries(TRANSLATIONS.en)) {
    assert.deepEqual((TRANSLATIONS.de[key].match(/\{\w+\}/g) ?? []).sort(), (text.match(/\{\w+\}/g) ?? []).sort(), key);
  }
});
test('all supported scalar and list fields have translated labels and options', () => {
  const config = normalizeConfig({ readings: [{}], calendar: { sources: [{}] } });
  for (const field of configFields(config)) for (const locale of ['en', 'de']) {
    const t = translator(locale), key = field.label ?? (field.kind === 'color' ? field.path.split('.').at(-1) : field.path);
    for (const label of field.group === 'visibility' ? field.path.split('.').slice(1) : [key]) assert.ok(label in TRANSLATIONS[locale], `${locale}: ${label}`);
    assert.notEqual(t(field.group), field.group, `${locale}: ${field.group}`);
    for (const choice of field.options ?? []) {
      const label = choice;
      assert.ok(label in TRANSLATIONS[locale], `${locale}: ${label}`);
    }
  }
});
test('full configuration survives YAML with independent disabled settings and extra HA keys', () => {
  const config = normalizeConfig({ instance_id: 'audit', readings: [{ entity: 'sensor.temperature', enabled: false, precision: 6, future: 'keep' }], calendar: { sources: [{ entity: 'calendar.personal', enabled: false, color: '#112233' }] }, features: { readings: { enabled: true } }, appearance: { preset: 'light', colors: { text: '#000000' } }, grid_options: { columns: 'full' } });
  assert.deepEqual(normalizeConfig(parse(stringify(config))), config);
});
