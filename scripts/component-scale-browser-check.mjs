import assert from 'node:assert/strict';

export async function checkComponentScales(page, settle) {
  await page.setViewportSize({ width: 1400, height: 1200 });
  await page.reload(); await page.waitForFunction(() => window.preview);
  const saved = await page.evaluate(() => preview.config);
  const card = page.locator('#card'), editor = page.locator('#editor');
  const metrics = {
    room: ['.room', 'fontSize'], clock: ['.clock', 'fontSize'], date: ['.date', 'fontSize'],
    readings: ['.reading strong', 'fontSize'], weather: ['.weather', 'fontSize'],
    calendar: ['.calendar-heading', 'fontSize'], co2_bar: ['.air', 'width'],
    co2_value: ['.air-value', 'fontSize'], co2_status: ['.co2-caption-status', 'fontSize'],
    co2_marks: ['.mark', 'width'],
  };
  const measure = async () => Object.fromEntries(await Promise.all(Object.entries(metrics).map(async ([key, [selector, property]]) =>
    [key, await card.locator(selector).first().evaluate((el, property) => parseFloat(getComputedStyle(el)[property]), property)])));
  // Compare actual computed sizes; fitting may cap the clock at the larger size.
  // The CO₂ value fits the strip, so changing strip width also changes its font size.
  for (const feature of Object.keys(metrics)) {
    await page.evaluate(({ saved, feature }) => {
      const c = structuredClone(saved); c.features[feature].scale = 0.25; preview.commit(c);
    }, { saved, feature });
    await settle(); const before = await measure();
    await editor.locator(`[data-path="features.${feature}.scale"]`).fill('0.5');
    await settle(); const after = await measure();
    assert.ok(Math.abs(after[feature] / before[feature] - 2) < 0.02, `${feature} scales its rendered size`);
    for (const other of Object.keys(metrics).filter(key => key !== feature && key !== 'clock')) {
      if (feature === 'co2_bar' && other === 'co2_value') continue;
      assert.ok(Math.abs(after[other] - before[other]) < 0.1, `${feature} must not change ${other}`);
    }
  }
  const input = editor.locator('[data-path="features.weather.scale"]');
  assert.equal(await input.getAttribute('step'), 'any');
  assert.equal(await input.getAttribute('min'), '0.1');
  assert.equal(await input.getAttribute('max'), '10');
  await input.fill('1.2345');
  assert.equal(await page.evaluate(() => preview.config.features.weather.scale), 1.2345);
  await page.locator('#apply').click();
  assert.equal(await input.inputValue(), '1.2345', 'YAML/editor round trip retains arbitrary decimals');
  await input.fill('10.01');
  assert.equal(await input.getAttribute('aria-invalid'), 'true');
  assert.match(await editor.locator('[id="error-features.weather.scale"]').textContent(), /0.1.*10/);
  assert.equal(await page.evaluate(() => preview.config.features.weather.scale), 1.2345);
  await input.fill('0.1');
  assert.equal(await input.getAttribute('aria-invalid'), 'false');
  await input.fill('10');
  assert.equal(await page.evaluate(() => preview.config.features.weather.scale), 10);
  await editor.locator('[data-path="features.weather.enabled"]').uncheck();
  await editor.locator('[data-path="features.weather.enabled"]').check();
  assert.equal(await input.inputValue(), '10', 'visibility toggles retain the scale');
  // CO₂ text also scales independently without the strip.
  await page.evaluate(saved => {
    const c = structuredClone(saved); c.features.co2_bar.enabled = false;
    c.features.co2_value.scale = 1.5; c.features.co2_status.scale = 0.5; preview.commit(c);
  }, saved);
  const font = selector => card.locator(selector).evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  assert.ok(Math.abs(await font('.co2-caption-value') / await font('.co2-caption-status') - 3) < 0.01);
  // Every supported extreme remains finite, and large clocks still fit horizontally.
  for (const scale of [0.1, 10]) {
    await page.evaluate(({ saved, scale }) => {
      const c = structuredClone(saved); Object.values(c.features).forEach(f => { f.scale = scale; });
      c.features.co2_bar.enabled = false; preview.commit(c);
    }, { saved, scale });
    await settle();
    assert.ok(Object.values(await measureWithoutRail()).every(Number.isFinite));
    const clock = await card.locator('.clock').evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth }));
    assert.ok(clock.content <= clock.width + 1, `clock fits at scale ${scale}`);
  }
  async function measureWithoutRail() {
    return Object.fromEntries(await Promise.all(Object.entries(metrics).filter(([key]) => !['co2_bar', 'co2_value', 'co2_marks'].includes(key)).map(async ([key, [selector, property]]) =>
      [key, await card.locator(selector).first().evaluate((el, property) => parseFloat(getComputedStyle(el)[property]), property)])));
  }
  await page.evaluate(saved => preview.commit(saved), saved);
  await editor.locator('[data-path="language"]').fill('de-DE');
  assert.equal(await editor.locator('[data-path="features.weather.scale"]').getAttribute('aria-label'), 'Wetter: Größenfaktor');
  await page.setViewportSize({ width: 400, height: 900 }); await settle();
  assert.equal(await editor.evaluate(el => {
    const right = el.getBoundingClientRect().right;
    return [...el.shadowRoot.querySelectorAll('input,fieldset')].some(control => control.getBoundingClientRect().right > right + 1);
  }), false, 'scale controls fit the narrow German editor');
  console.log('Component scales passed: independent rendered sizes, decimals, limits, invalid drafts, visibility, CO₂ caption, clock fitting and German editor.');
}
