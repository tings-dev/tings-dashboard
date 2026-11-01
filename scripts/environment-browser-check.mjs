import assert from 'node:assert/strict';

export async function checkEnvironment(page, bounds, settle) {
  await page.setViewportSize({ width: 1400, height: 1200 });
  await page.reload(); await page.waitForFunction(() => window.preview);
  await page.selectOption('#viewport', '800,480');
  const card = page.locator('#card'), editor = page.locator('#editor');
  await page.selectOption('#readings', '4');
  assert.equal(await card.locator('button.reading').count(), 4);
  // Native buttons dispatch Home Assistant's action through the shadow boundary.
  await page.evaluate(() => { window.details = []; document.addEventListener('hass-more-info', e => details.push(e.detail.entityId)); });
  await card.locator('.reading').first().focus(); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => details.at(-1)), 'sensor.room_temperature');
  await page.locator('#close-details').click();
  await card.locator('.reading').nth(1).click();
  assert.equal(await page.evaluate(() => details.at(-1)), 'sensor.outside_temperature');
  await page.locator('#close-details').click();
  const stableFocus = await page.evaluate(() => {
    const button = preview.card.shadowRoot.querySelector('.reading'); button.focus();
    const states = { ...preview.hass.states, 'sensor.room_temperature': { ...preview.hass.states['sensor.room_temperature'], state: '22.6' } };
    preview.card.hass = { ...preview.hass, states };
    return { same: button === preview.card.shadowRoot.querySelector('.reading'), focused: button === preview.card.shadowRoot.activeElement, value: button.textContent };
  });
  assert.equal(stableFocus.same, true); assert.equal(stableFocus.focused, true); assert.match(stableFocus.value, /22.6/);
  const positions = await card.locator('.reading').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return [r.x, r.y, r.height]; }));
  await page.selectOption('#source-state', 'offline');
  assert.equal(await card.locator('.reading strong').first().textContent(), '—°C');
  assert.deepEqual(await card.locator('.reading').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return [r.x, r.y, r.height]; })), positions);
  assert.match(await card.locator('.co2-caption').textContent(), /Unavailable/);
  assert.equal(await card.locator('.screen').evaluate(e => e.style.getPropertyValue('--air-fill')), '0%');
  await page.selectOption('#source-state', 'missing'); assert.equal(await card.locator('.reading:disabled').count(), 4);
  await page.selectOption('#source-state', 'online');
  // Default text remains on an opaque surface at all indicator levels.
  for (const theme of ['dark', 'light', 'night']) {
    await page.selectOption('#appearance', theme);
    if (theme === 'night') await page.evaluate(() => { const c = preview.config; for (const f of ['co2_bar', 'co2_value', 'co2_status', 'co2_marks', 'weather']) c.features[f].night = true; preview.commit(c); });
    for (const [raw, height, color] of [['250', '0%', '#8daea0'], ['1000', '37.5%', '#d9b36f'], ['2800', '100%', '#c96964']]) {
      await page.locator('#co2-demo').fill(raw); await settle();
      const actual = await card.locator('.screen').evaluate(e => [e.style.getPropertyValue('--air-fill'), e.style.getPropertyValue('--air-color')]);
      assert.deepEqual(actual, [height, color]);
      const contrast = await card.locator('.air-value').evaluate(element => {
        const style = getComputedStyle(element);
        const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        const a = luminance(style.color), b = luminance(style.backgroundColor);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      });
      assert.ok(contrast >= 4.5, `${theme}/${raw}: CO₂ text contrast ${contrast}`);
      assert.deepEqual(await bounds(), [], `${theme}/${raw}`);
    }
  }
  await page.selectOption('#appearance', 'dark'); await page.locator('#co2-demo').fill('1080');
  await editor.locator('[data-path="weather.forecast"]').check();
  await page.waitForFunction(() => preview.card.shadowRoot.querySelector('.forecast')?.textContent.includes('Rain'));
  for (const viewport of ['800,480', '960,600', '1280,800']) {
    await page.selectOption('#viewport', viewport);
    for (const theme of ['dark', 'light', 'night']) {
      await page.selectOption('#appearance', theme); await settle(); assert.deepEqual(await bounds(), [], `${viewport}/${theme}/four readings + forecast`);
      if (viewport === '800,480') await page.locator('#frame').screenshot({ path: `artifacts/stage2-${theme}-800.png`, animations: 'disabled' });
    }
  }
  await page.selectOption('#appearance', 'dark'); await page.selectOption('#viewport', '800,480');
  const saved = await page.evaluate(() => preview.config);
  for (const extremes of [
    { clock_scale: 1.1, text_scale: 1.1, spacing: 1.1, left_width: 50, rail_width: 10 },
    { clock_scale: .85, text_scale: .9, spacing: .85, left_width: 60, rail_width: 6 },
  ]) {
    await page.evaluate(({ saved, extremes }) => preview.commit({ ...saved, layout: { ...saved.layout, ...extremes } }), { saved, extremes });
    for (const scenario of ['agenda', 'long', 'ongoing']) {
      await page.selectOption('#scenario', scenario); await settle();
      assert.deepEqual(await bounds(), [], `four readings + forecast/extreme/${scenario}`);
    }
  }
  await page.evaluate(saved => preview.commit(saved), saved); await page.selectOption('#scenario', 'agenda');
  // Invalid new controls retain all other drafts until the whole configuration is valid.
  await editor.locator('[data-path="co2.maximum"]').fill('400');
  await editor.locator('[data-path="readings.0.label"]').fill('My room');
  assert.equal(await page.evaluate(() => preview.config.readings[0].label), 'In this room');
  await page.evaluate(() => preview.editor.setConfig(preview.config));
  assert.equal(await editor.locator('[data-path="co2.maximum"]').inputValue(), '400');
  await editor.locator('[data-path="co2.maximum"]').fill('2200');
  assert.equal(await page.evaluate(() => preview.config.readings[0].label), 'My room');
  await editor.locator('[data-path="readings.0.precision"]').fill('2');
  assert.equal(await card.locator('.reading strong').first().textContent(), '21.40°C');
  await editor.locator('[data-path="co2.thresholds.1.value"]').fill('700');
  assert.equal(await editor.locator('[data-path="co2.thresholds.1.value"]').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => preview.config.co2.thresholds[1].value), 1000);
  await editor.locator('[data-path="co2.thresholds.1.value"]').fill('1000');
  assert.equal(await editor.getByRole('button', { name: 'Add reading', exact: true }).isDisabled(), true);
  const second = editor.locator('.list-item').filter({ has: page.locator('[data-path="readings.1.entity"]') });
  await second.getByRole('button', { name: 'Move up', exact: true }).click();
  assert.equal(await page.evaluate(() => preview.config.readings[0].entity), 'sensor.outside_temperature');
  await editor.locator('[data-path="readings.0.enabled"]').uncheck(); assert.equal(await card.locator('.reading').count(), 3);
  await editor.locator('[data-path="readings.1.night"]').uncheck(); await page.selectOption('#appearance', 'night'); assert.equal(await card.locator('.reading').count(), 2);
  await page.selectOption('#appearance', 'dark');
  await editor.getByRole('button', { name: 'Add threshold', exact: true }).click();
  assert.equal(await page.evaluate(() => preview.config.co2.thresholds.length), 5);
  // Unknown per-source keys survive YAML/editor round trips and presentation edits.
  await page.evaluate(() => { const c = preview.config; c.readings[0].future = { preserved: true }; c.co2.thresholds[0].future = 'kept'; preview.commit(c); });
  await editor.locator('[data-path="co2.thresholds.0.label"]').fill('Comfortable');
  assert.ok(await page.evaluate(() => preview.config.readings[0].future.preserved));
  assert.equal(await page.evaluate(() => preview.config.co2.thresholds[0].future), 'kept');
  await page.locator('#apply').click(); assert.equal(await page.locator('#yaml-error').textContent(), '');
  assert.equal(await page.evaluate(() => preview.config.co2.thresholds.length), 5);
  await editor.locator('[data-path="co2.thresholds.0.label"]').fill('<img src=x onerror=alert(1)>');
  await page.locator('#co2-demo').fill('850'); assert.equal(await card.locator('.co2-caption img').count(), 0);
  assert.match(await card.locator('.co2-caption').textContent(), /<img/);
  for (const feature of ['co2_bar', 'co2_value', 'co2_status', 'co2_marks']) {
    await page.evaluate(({ saved, feature }) => { const c = structuredClone(saved); c.features[feature].enabled = false; preview.commit(c); }, { saved, feature });
    const selector = { co2_bar: '.air', co2_value: '.air-value', co2_status: '.co2-caption', co2_marks: '.mark' }[feature];
    assert.equal(await card.locator(selector).count(), 0, `independent switch: ${feature}`);
    assert.deepEqual(await bounds(), [], `hidden ${feature}`);
  }
  await page.evaluate(saved => { preview.commit({ ...saved, readings: [] }); }, saved); assert.equal(await card.locator('.reading').count(), 0);
  assert.deepEqual(await bounds(), [], 'zero readings');
  await page.evaluate(saved => {
    const c = structuredClone(saved); c.co2.thresholds.forEach(b => { b.label = 'Long CO₂ status '.repeat(6); }); c.readings.forEach(r => { r.label = 'A long sensor label '.repeat(5); }); c.language = 'de-DE'; preview.commit(c);
  }, saved);
  await settle(); assert.deepEqual(await bounds(), [], 'long user labels and German weather');
  assert.match(await card.locator('.weather').textContent(), /Bewölkt/);
  await page.setViewportSize({ width: 400, height: 900 }); await settle();
  assert.equal(await editor.evaluate(e => { const r = e.getBoundingClientRect(); return [...e.shadowRoot.querySelectorAll('input,select,fieldset,button')].some(x => x.getBoundingClientRect().right > r.right + 1); }), false, 'German editor controls');
  await page.setViewportSize({ width: 1400, height: 1200 });
  await page.evaluate(saved => preview.commit(saved), saved);
  // Connect a controllable transport to verify card-level teardown and source changes.
  await page.evaluate(() => {
    window.subscriptions = []; window.stops = 0;
    window.testHass = { ...preview.hass, connection: { async subscribeMessage(callback, request) { subscriptions.push({ callback, request }); return () => stops++; } } };
    preview.card.hass = testHass;
  });
  await page.waitForFunction(() => subscriptions.length === 1);
  await page.evaluate(() => subscriptions[0].callback({ forecast: [{ datetime: '2026-11-01T17:00:00Z', condition: 'sunny' }] }));
  assert.match(await card.locator('.forecast').textContent(), /18:00 · Sunny/);
  await page.evaluate(() => { preview.card.remove(); });
  assert.equal(await page.evaluate(() => stops), 1);
  await page.evaluate(() => { subscriptions[0].callback({ forecast: [{ datetime: '2026-11-01T17:00:00Z', condition: 'rainy' }] }); document.getElementById('frame').append(preview.card); });
  await page.waitForFunction(() => subscriptions.length === 2);
  assert.equal(await card.locator('.forecast').count(), 0);
  await page.evaluate(() => { preview.card.hass = { ...testHass, connected: false }; });
  assert.equal(await page.evaluate(() => stops), 2);
  assert.equal(await card.locator('.reading strong').first().textContent(), '—°C');
  await page.evaluate(() => { preview.card.hass = testHass; }); await page.waitForFunction(() => subscriptions.length === 3);
  await page.evaluate(() => { const c = preview.config; c.features.weather.night = false; preview.commit(c); preview.card.night = true; });
  assert.equal(await page.evaluate(() => stops), 3);
  await page.setViewportSize({ width: 400, height: 900 }); await settle();
  assert.equal(await editor.evaluate(e => { const r = e.getBoundingClientRect(); return [...e.shadowRoot.querySelectorAll('input,select,fieldset,button')].some(x => x.getBoundingClientRect().right > r.right + 1); }), false);
  console.log('Stage 2 browser checks passed: live readings/actions, focus, availability, CO₂ contrast/bands, forecast layouts/lifecycle, and list editor/YAML controls.');
}
