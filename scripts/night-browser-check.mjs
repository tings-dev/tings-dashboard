import assert from 'node:assert/strict';
export async function checkNight(page, bounds, settle) {
  await page.setViewportSize({ width: 1400, height: 1200 });
  await page.reload(); await page.waitForFunction(() => window.preview);
  await page.evaluate(() => localStorage.removeItem('tings-dashboard:night:v1:night-browser:input_boolean.preview_night'));
  await page.selectOption('#appearance', 'dark');
  await page.selectOption('#preset', 'full');
  await page.selectOption('#source-state', 'online');
  await page.selectOption('#scenario', 'ongoing');
  await page.evaluate(() => { window.nightSaved = preview.config; preview.commit({ ...preview.config, instance_id: 'night-browser', night: { mode: 'entity', entity: 'input_boolean.preview_night' } }); });
  await page.selectOption('#night-state', 'on'); await settle();
  const card = page.locator('#card'), editor = page.locator('#editor');
  assert.equal(await page.evaluate(() => preview.card.night), true);
  assert.equal(await card.locator('.calendar').count(), 0);
  assert.equal(await card.locator('.co2-caption').count(), 0);
  assert.equal(await page.evaluate(() => preview.card._calendar.active), false);
  for (const viewport of ['1280,800', '960,600', '800,480']) {
    await page.selectOption('#viewport', viewport); await settle(); assert.deepEqual(await bounds(), [], `automatic night/${viewport}`);
  }
  await page.selectOption('#night-state', 'unavailable');
  assert.match(await editor.locator('#night-status').textContent(), /unavailable|verfügbar/);
  assert.equal(await page.evaluate(() => preview.card.night), true);
  await page.evaluate(() => {
    const fresh = document.createElement('tings-dashboard'); fresh.hass = preview.card.hass; fresh.setConfig(preview.config);
    window.nightReloaded = fresh.night;
  });
  assert.equal(await page.evaluate(() => nightReloaded), true);
  await page.selectOption('#night-state', 'off');
  await page.waitForFunction(() => preview.card.shadowRoot.querySelector('.focus'));
  assert.equal(await page.evaluate(() => preview.card.night), false);
  assert.equal(await page.evaluate(() => preview.card._calendar.active), true);
  assert.equal(await editor.locator('#night-status').textContent(), '');
  await page.selectOption('#night-state', 'unavailable');
  await page.evaluate(() => {
    const fresh = document.createElement('tings-dashboard'); fresh.hass = preview.card.hass; fresh.setConfig(preview.config); window.nightReloaded = fresh.night;
  });
  assert.equal(await page.evaluate(() => nightReloaded), false, 'day fallback persists too');
  // An ended cached focus cannot return after night. A fresh range is requested.
  await page.selectOption('#night-state', 'on');
  await page.locator('#fixed-time').fill('2026-11-03T12:00:00Z'); await page.locator('#fixed-time').dispatchEvent('change');
  await page.selectOption('#night-state', 'off'); await settle();
  assert.equal(await card.locator('.focus').count(), 0);
  // HA timezone drives the schedule despite an explicit display timezone.
  await page.evaluate(() => { const c = preview.config; c.night = { ...c.night, mode: 'schedule' }; c.time_zone = 'America/New_York'; preview.commit(c); });
  await page.locator('#fixed-time').fill('2026-11-01T21:00:00Z'); await page.locator('#fixed-time').dispatchEvent('change');
  assert.equal(await page.evaluate(() => preview.card.night), true);
  await page.locator('#fixed-time').fill('2026-11-02T06:00:00Z'); await page.locator('#fixed-time').dispatchEvent('change');
  assert.equal(await page.evaluate(() => preview.card.night), false);
  // Clock ticks also activate without a new hass object; backwards jumps undo it.
  await page.evaluate(() => { const instant = new Date('2026-11-01T21:00:00Z'); preview.card.currentTime = () => instant; preview.card._tick(); });
  assert.equal(await page.evaluate(() => preview.card.night), true);
  await page.evaluate(() => { preview.card.currentTime = () => new Date('2026-11-01T20:59:59Z'); preview.card._tick(); });
  assert.equal(await page.evaluate(() => preview.card.night), false);
  // Schedules keep a timer in hidden documents and clean it up on removal.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    preview.card._startClock();
  });
  assert.equal(await page.evaluate(() => preview.card._timer !== undefined), true);
  await page.evaluate(() => preview.card.remove());
  assert.equal(await page.evaluate(() => preview.card._timer), undefined);
  await page.evaluate(() => { document.getElementById('frame').append(preview.card); delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  // Editing night fields preserves independent daytime appearance and sources.
  const before = await page.evaluate(() => preview.config);
  await editor.locator('[data-path="night.end"]').fill(before.night.start);
  assert.equal(await editor.locator('[data-path="night.end"]').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => preview.config.night.end), before.night.end);
  await editor.locator('[data-path="night.end"]').fill(before.night.end);
  await editor.locator('[data-path="appearance.night_colors.background"]').fill('#010203');
  assert.deepEqual(await page.evaluate(() => preview.config.appearance.colors), before.appearance.colors);
  assert.deepEqual(await page.evaluate(() => preview.config.calendar.sources), before.calendar.sources);
  await page.evaluate(() => { delete preview.card.currentTime; preview.commit(nightSaved); });
  await page.locator('#fixed-time').fill(''); await page.locator('#fixed-time').dispatchEvent('change');
  await page.selectOption('#night-state', 'off');
  console.log('Night browser checks passed: automatic layouts, persistence, diagnostics, current focus, timezone/clock transitions and editor preservation.');
}
