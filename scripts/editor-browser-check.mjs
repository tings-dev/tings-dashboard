import assert from 'node:assert/strict';

export async function checkEditor(page) {
  await page.reload(); await page.waitForFunction(() => window.preview);
  const sensor = page.locator('#editor [data-path="readings.0.entity"]');
  await sensor.fill('sensor.');
  const stable = await page.evaluate(() => {
    const editor = preview.editor, root = editor.shadowRoot;
    const input = root.activeElement;
    const lists = [...root.querySelectorAll('datalist')];
    const observer = new MutationObserver(() => {});
    for (const list of lists) observer.observe(list, { childList: true, subtree: true, attributes: true });
    const states = { ...preview.hass.states };
    for (let i = 0; i < 10; i++) {
      states['sensor.room_temperature'] = { ...states['sensor.room_temperature'], state: String(20 + i) };
      editor.hass = { ...preview.hass, states: { ...states } };
    }
    // New unrelated entities and state-map ordering do not change the choices.
    editor.hass = { ...preview.hass, states: { 'light.unrelated': { entity_id: 'light.unrelated', state: 'idle' }, ...Object.fromEntries(Object.entries(states).reverse()) } };
    const mutations = observer.takeRecords().length; observer.disconnect();
    return { mutations, sameInput: input === root.querySelector('[data-path="readings.0.entity"]'), focused: root.activeElement === input, value: input.value };
  });
  assert.equal(stable.mutations, 0, 'live HA updates must not rebuild unchanged entity choices and interrupt selection');
  assert.deepEqual(stable, { mutations: 0, sameInput: true, focused: true, value: 'sensor.' });

  // Real changes still refresh entity IDs, labels and domain-specific choices.
  await page.evaluate(() => {
    const states = structuredClone(preview.hass.states);
    delete states['sensor.light'];
    states['sensor.room_temperature'].attributes.friendly_name = 'Renamed room sensor';
    states['sensor.added'] = { entity_id: 'sensor.added', state: '42', attributes: { friendly_name: 'Added sensor' } };
    preview.editor.hass = { ...preview.hass, states };
  });
  const choices = id => page.locator(`#editor #entities-${id} option`).evaluateAll(options => options.map(option => [option.value, option.label]));
  const sensors = await choices('sensor');
  assert.ok(sensors.some(([id, label]) => id === 'sensor.added' && label === 'Added sensor'));
  assert.ok(sensors.some(([id, label]) => id === 'sensor.room_temperature' && label === 'Renamed room sensor'));
  assert.ok(!sensors.some(([id]) => id === 'sensor.light'));
  assert.ok(sensors.every(([id]) => id.startsWith('sensor.')));
  assert.ok((await choices('weather')).every(([id]) => id.startsWith('weather.')));
  assert.ok((await choices('calendar')).every(([id]) => id.startsWith('calendar.')));
  assert.equal(await page.locator('#editor #entities-any').count(), 0);
  assert.equal(await page.locator('#editor [data-path*="night"]').count(), 0);
  assert.deepEqual(await page.locator('#editor [data-path="appearance.preset"] option').evaluateAll(options => options.map(option => option.value)), ['dark', 'light']);
  await sensor.fill('sensor.added');
  assert.equal(await page.evaluate(() => preview.config.readings[0].entity), 'sensor.added');
  await page.evaluate(() => {
    preview.editor.setConfig({ ...preview.config, room_name: 'Rebuilt editor' });
    preview.editor.hass = preview.hass;
  });
  assert.equal(await page.locator('#editor #entities-sensor option').count(), 5, 'full editor renders repopulate suggestions');
  const editor = page.locator('#editor');
  const color = editor.locator('[data-path="co2.thresholds.1.color"]');
  const picker = editor.locator('[data-color-path="co2.thresholds.1.color"]');
  assert.equal(await editor.locator('input[type=color]').count(), 5, 'four thresholds and the base band offer pickers');
  assert.match(await picker.getAttribute('aria-label'), /Choose color/);
  assert.equal(await picker.inputValue(), await color.inputValue());
  // Native dialogs are OS-owned; dispatch their input/change events on the real control.
  const choose = (control, value, event = 'input') => control.evaluate((input, { value, event }) => {
    input.value = value; input.dispatchEvent(new Event(event, { bubbles: true }));
  }, { value, event });
  await choose(picker, '#123456');
  assert.equal(await color.inputValue(), '#123456');
  assert.equal(await page.evaluate(() => preview.config.co2.thresholds[1].color), '#123456');
  assert.equal(await page.locator('#card .screen').evaluate(el => el.style.getPropertyValue('--air-color')), '#123456');
  assert.ok((await page.locator('#yaml').inputValue()).includes('#123456'));
  await color.fill('#ABCDEF'); assert.equal(await picker.inputValue(), '#abcdef');
  await color.fill('#nope');
  assert.equal(await color.getAttribute('aria-invalid'), 'true');
  assert.equal(await picker.inputValue(), '#abcdef');
  assert.equal(await page.evaluate(() => preview.config.co2.thresholds[1].color), '#ABCDEF');
  await choose(picker, '#654321', 'change');
  assert.equal(await color.getAttribute('aria-invalid'), 'false');
  assert.equal(await color.inputValue(), '#654321');
  // A picker must not commit an unrelated invalid draft or lose the pending choice.
  await editor.locator('[data-path="co2.maximum"]').fill('400');
  await choose(picker, '#fedcba');
  assert.equal(await color.inputValue(), '#fedcba');
  assert.equal(await page.evaluate(() => preview.config.co2.thresholds[1].color), '#654321');
  await editor.locator('[data-path="co2.maximum"]').fill('2200');
  assert.equal(await page.evaluate(() => preview.config.co2.thresholds[1].color), '#fedcba');
  await choose(editor.locator('[data-color-path="co2.base_color"]'), '#112233');
  assert.equal(await page.evaluate(() => preview.config.co2.base_color), '#112233');
  await page.locator('#apply').click();
  assert.equal(await page.locator('#yaml-error').textContent(), '');
  assert.equal(await picker.inputValue(), '#fedcba');
  await editor.locator('[data-path="language"]').fill('de-DE');
  assert.match(await picker.getAttribute('aria-label'), /Farbe auswählen/);
  console.log('Editor browser checks passed: stable entity choices, filtering, color pickers, hex/YAML synchronization, translations and invalid drafts.');
}
