import assert from 'node:assert/strict';

export async function checkCalendars(page, bounds, settle) {
  await page.setViewportSize({ width: 1400, height: 1200 });
  await page.reload(); await page.waitForFunction(() => window.preview);
  await page.evaluate(() => { localStorage.clear(); preview.card._dismissals.reload(preview.card.currentTime().getTime()); });
  const card = page.locator('#card'), editor = page.locator('#editor');
  await page.selectOption('#viewport', '800,480');
  await page.selectOption('#scenario', 'ongoing'); await page.waitForFunction(() => preview.card.shadowRoot.querySelector('[data-action="done"]'));
  assert.equal(await card.locator('.focus h2').textContent(), 'Dinner with friends');
  const geometry = await card.locator('.clock').boundingBox();
  await card.locator('[data-action="done"]').focus(); await page.keyboard.press('Space');
  assert.equal(await card.locator('[data-action="done"]').count(), 0);
  assert.equal(await card.locator('.focus h2').textContent(), 'Call with Alex');
  assert.equal(await card.locator('[data-action="undo"]').evaluate(el => el === el.getRootNode().activeElement), true);
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('info-dashboard:dismissals:v1:preview-main')).entries.length === 1));
  assert.deepEqual(await bounds(), [], 'dismissal with secondary focus and Undo');
  assert.deepEqual(await card.locator('.clock').boundingBox(), geometry, 'Done must not move the clock');
  // Another dashboard ID in the same browser still shows the occurrence.
  await page.evaluate(() => {
    const other = document.createElement('info-dashboard-preview'); other.id = 'other-card'; other.style.width = '800px'; other.style.setProperty('--info-dashboard-height', '480px');
    other.setConfig({ ...preview.config, instance_id: 'preview-other' }); other.hass = preview.hass; document.body.append(other);
  });
  await page.waitForFunction(() => document.getElementById('other-card').shadowRoot.querySelector('[data-action="done"]'));
  assert.equal(await page.locator('#other-card').locator('.focus h2').textContent(), 'Dinner with friends');
  await page.evaluate(() => document.getElementById('other-card').remove());
  await page.reload(); await page.waitForFunction(() => window.preview); await page.selectOption('#scenario', 'ongoing');
  await page.waitForFunction(() => preview.card.shadowRoot.querySelector('.focus h2')?.textContent === 'Call with Alex');
  assert.equal(await card.locator('[data-action="done"]').count(), 0);
  await card.locator('[data-action="undo"]').click();
  assert.equal(await card.locator('.focus h2').textContent(), 'Dinner with friends');
  assert.equal(await card.locator('[data-action="done"]').evaluate(el => el === el.getRootNode().activeElement), true);
  await page.selectOption('#source-state', 'offline');
  assert.equal(await card.locator('.focus').count(), 0); assert.ok(await card.locator('.outdated').count() > 0);
  assert.match(await card.locator('.calendar-notice').textContent(), /unavailable/);
  await page.selectOption('#source-state', 'online'); await page.waitForFunction(() => preview.card.shadowRoot.querySelector('[data-action="done"]'));
  // Deterministic transport: a duplicated ongoing event, a near-future event,
  // all-day entries, and a partially failed source exercise the real adapter.
  await page.evaluate(() => {
    window.calendarCalls = [];
    window.calendarFailB = false;
    window.calendarTitle = 'Shared meeting';
    window.calendarHass = { ...preview.hass, callApi: async (method, path) => {
      calendarCalls.push({ method, path });
      if (path.startsWith('calendars/calendar.b') && calendarFailB) throw new Error('Calendar B unavailable');
      return [
        { summary: calendarTitle, start: { dateTime: '2026-11-01T13:15:00Z' }, end: { dateTime: '2026-11-01T14:30:00Z' } },
        { summary: 'Next meeting', start: { dateTime: '2026-11-01T14:00:00Z' }, end: { dateTime: '2026-11-01T15:00:00Z' } },
        { summary: 'Multi-day holiday', start: { date: '2026-10-31' }, end: { date: '2026-11-04' } },
      ];
    }, states: { ...preview.hass.states, 'calendar.a': { state: 'off' }, 'calendar.b': { state: 'off' } } };
    const c = preview.config; c.instance_id = 'browser-calendar-test'; c.calendar.sources = [{ entity: 'calendar.a', label: 'Personal', color: '#ffbb77' }, { entity: 'calendar.b', label: 'Family', color: '#aabbff' }]; preview.commit(c); preview.card.hass = calendarHass;
  });
  await page.waitForFunction(() => preview.card.shadowRoot.querySelector('.focus h2')?.textContent === 'Shared meeting');
  assert.equal(await card.locator('.focus .source-chip').count(), 2);
  assert.equal(await card.locator('.focus .source-dot').count(), 2);
  await card.locator('[data-action="done"]').click(); assert.equal(await card.locator('.focus h2').textContent(), 'Next meeting');
  await page.evaluate(() => { calendarTitle = 'Edited meeting'; preview.card._calendar.refreshNow(); });
  await page.waitForFunction(() => preview.card.shadowRoot.querySelector('.focus h2')?.textContent === 'Edited meeting');
  assert.equal(await card.locator('[data-action="done"]').count(), 1, 'a title edit is a new occurrence');
  await page.evaluate(() => { calendarFailB = true; preview.card._calendar.refreshNow(); });
  await page.waitForFunction(() => preview.card.shadowRoot.querySelector('.calendar-notice')?.textContent.includes('unavailable'));
  assert.equal(await card.locator('.focus h2').textContent(), 'Edited meeting', 'fresh duplicate keeps focus');
  for (const viewport of ['800,480', '960,600', '1280,800']) {
    await page.selectOption('#viewport', viewport);
    for (const theme of ['dark', 'light', 'night']) {
      // Set presentation state directly: preview appearance toolbar also switches its source fixture.
      await page.evaluate(theme => { const c = preview.config; c.appearance.day = theme; c.features.calendar.night = true; preview.commit(c); preview.card.night = false; }, theme);
      await settle(); assert.deepEqual(await bounds(), [], `${viewport}/${theme}/focus+partial failure+Undo`);
      if (viewport === '800,480') await page.locator('#frame').screenshot({ path: `artifacts/stage3-${theme}-800.png`, animations: 'disabled' });
    }
  }
  await page.selectOption('#viewport', '800,480');
  await page.evaluate(() => { const c = preview.config; c.calendar.priority = 'soon'; preview.commit(c); });
  assert.equal(await card.locator('.focus h2').textContent(), 'Next meeting');
  await page.evaluate(() => { const c = preview.config; c.calendar.soon_enabled = false; c.calendar.ongoing_enabled = false; c.calendar.max_entries = 1; preview.commit(c); });
  assert.equal(await card.locator('.focus').count(), 0); assert.equal(await card.locator('.event').count(), 1);
  assert.match(await card.locator('.more').textContent(), /more/); assert.deepEqual(await bounds(), [], 'agenda maximum and all-day overflow');
  assert.match(await card.locator('.all-day').textContent(), /Today/);
  await editor.locator('[data-path="calendar.max_entries"]').fill('0');
  await editor.locator('[data-path="calendar.sources.0.label"]').fill('Private');
  assert.equal(await page.evaluate(() => preview.config.calendar.sources[0].label), 'Personal');
  await page.evaluate(() => preview.editor.setConfig(preview.config));
  assert.equal(await editor.locator('[data-path="calendar.max_entries"]').inputValue(), '0');
  await editor.locator('[data-path="calendar.max_entries"]').fill('4');
  assert.equal(await page.evaluate(() => preview.config.calendar.sources[0].label), 'Private');
  await editor.locator('[data-path="calendar.sources.1.entity"]').fill('calendar.a'); assert.equal(await editor.locator('[data-path="calendar.sources.1.entity"]').getAttribute('aria-invalid'), 'true');
  await editor.locator('[data-path="calendar.sources.1.entity"]').fill('calendar.b');
  await page.evaluate(() => { const c = preview.config; c.calendar.sources[0].future = { keep: true }; preview.commit(c); });
  const second = editor.locator('.list-item').filter({ has: page.locator('[data-path="calendar.sources.1.entity"]') });
  await second.getByRole('button', { name: 'Move up', exact: true }).click();
  assert.equal(await page.evaluate(() => preview.config.calendar.sources[0].entity), 'calendar.b');
  assert.ok(await page.evaluate(() => preview.config.calendar.sources[1].future.keep));
  await page.locator('#apply').click(); assert.equal(await page.locator('#yaml-error').textContent(), '');
  await editor.locator('[data-path="instance_id"]').fill(''); assert.equal(await editor.locator('[data-path="instance_id"]').getAttribute('aria-invalid'), 'true');
  await editor.getByRole('button', { name: 'Generate new ID', exact: true }).click(); assert.ok(await page.evaluate(() => preview.config.instance_id.length >= 32));
  await editor.getByRole('button', { name: 'Add calendar', exact: true }).click(); assert.equal(await page.evaluate(() => preview.config.calendar.sources.length), 3);
  // Local HTTP environments may not expose randomUUID; ID generation still works.
  assert.ok(await page.evaluate(() => {
    const original = crypto.randomUUID; crypto.randomUUID = undefined;
    try { const ctor = customElements.get('info-dashboard'); const a = ctor.getStubConfig(), b = ctor.getStubConfig(); return a.instance_id.length === 32 && a.instance_id !== b.instance_id; }
    finally { crypto.randomUUID = original; }
  }));
  await page.evaluate(() => {
    calendarTitle = '<img src=x onerror=alert(1)> A very long meeting title that should remain readable in the available space';
    const c = preview.config; c.calendar.priority = 'ongoing'; c.calendar.soon_enabled = true; c.calendar.ongoing_enabled = true; c.language = 'de-DE'; c.layout = { ...c.layout, clock_scale: 1.1, text_scale: 1.1, spacing: 1.1, left_width: 50, rail_width: 10 }; preview.commit(c); preview.card._calendar.refreshNow();
  });
  await page.waitForFunction(() => preview.card.shadowRoot.querySelector('.focus h2')?.textContent.includes('<img'));
  assert.equal(await card.locator('.focus img').count(), 0); await settle(); assert.deepEqual(await bounds(), [], 'long translated focus + failure at tuning extremes');
  await card.locator('[data-action="done"]').click(); await settle(); assert.deepEqual(await bounds(), [], 'translated Undo after long focus');
  await page.evaluate(() => { calendarTitle += ' (updated)'; const c = preview.config; c.layout.left_width = 60; preview.commit(c); preview.card._calendar.refreshNow(); });
  await page.waitForFunction(() => preview.card.shadowRoot.querySelector('.focus h2')?.textContent.includes('(updated)'));
  assert.equal(await card.locator('.calendar-action').count(), 2); await settle();
  assert.deepEqual(await bounds(), [], 'both German actions in the narrowest supported calendar column');
  await page.setViewportSize({ width: 400, height: 900 }); await settle();
  assert.equal(await editor.evaluate(e => { const r = e.getBoundingClientRect(); return [...e.shadowRoot.querySelectorAll('input,select,fieldset,button')].some(x => x.getBoundingClientRect().right > r.right + 1); }), false, 'translated calendar editor');
  assert.ok(await page.evaluate(() => calendarCalls.every(c => c.method === 'GET')), 'Done/Undo never modifies a calendar');
  await page.evaluate(() => preview.card.remove());
  assert.equal(await page.evaluate(() => preview.card._calendar.timer), undefined);
  assert.equal(await page.evaluate(() => [...preview.card._calendar.records.values()].some(r => r.pending || r.deadline)), false);
  console.log('Stage 3 browser checks passed: real calendar adapter, focus/merging/failure, persistent Done/Undo, isolated IDs, editor/YAML, translated layouts, and teardown.');
}
