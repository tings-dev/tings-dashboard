import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';
await import('./build.mjs');
const server = await startServer(0);
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.INFO_DASHBOARD_CHROMIUM || undefined });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.preview);
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const card = page.locator('#card');
  async function bounds() {
    return page.evaluate(() => {
      const root = preview.card.shadowRoot; const screen = root.querySelector('.screen').getBoundingClientRect();
      const bad = [...root.querySelectorAll('.clock,.date,.room,.reading,.weather,.co2-caption,.event,.focus,.more,.notice,.all-day')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width && r.height && (r.left < screen.left - 1 || r.right > screen.right + 1 || r.bottom > screen.bottom + 1 || r.top < screen.top - 1);
      }).map(el => el.className + ':' + el.textContent);
      const time = root.querySelector('.timeblock')?.getBoundingClientRect(), footer = root.querySelector('.footer')?.getBoundingClientRect();
      if (time?.height && footer?.height && time.bottom > footer.top + 1) bad.push('time/readings overlap');
      const calendar = root.querySelector('.calendar');
      if (calendar && calendar.scrollHeight > calendar.clientHeight + 1) bad.push('calendar overflow');
      return bad;
    });
  }
  await mkdir('artifacts', { recursive: true });
  let layouts = 0;
  for (const viewport of ['1280,800', '960,600', '800,480']) {
    await page.selectOption('#viewport', viewport);
    for (const preset of ['full', 'no-calendar', 'no-co2', 'clock', 'readings', 'calendar', 'blank']) {
      await page.selectOption('#preset', preset);
      for (const appearance of ['dark', 'light', 'night']) {
        await page.selectOption('#appearance', appearance); await settle();
        assert.deepEqual(await bounds(), [], `${viewport}/${preset}/${appearance}`); layouts++;
        if (viewport === '800,480' && preset === 'full') await page.locator('#frame').screenshot({ path: `artifacts/stage1-${appearance}-800.png`, animations: 'disabled' });
      }
    }
    await page.selectOption('#preset', 'full'); await page.selectOption('#appearance', 'dark'); await settle();
    const stable = await card.locator('.clock').boundingBox();
    for (const scenario of ['agenda', 'soon', 'ongoing', 'long', 'empty', 'unavailable']) {
      await page.selectOption('#scenario', scenario); await settle();
      assert.deepEqual(await bounds(), [], `${viewport}/${scenario}`);
      const current = await card.locator('.clock').boundingBox();
      assert.ok(Math.abs(current.x - stable.x) < 1 && Math.abs(current.y - stable.y) < 1 && Math.abs(current.height - stable.height) < 1, `clock moved: ${viewport}/${scenario}`);
    }
    await page.selectOption('#scenario', 'agenda'); await page.selectOption('#readings', '4'); await settle();
    assert.deepEqual(await bounds(), [], `${viewport}/four readings`);
    // Exercise supported tuning extremes in the most crowded composition.
    const saved = await page.evaluate(() => preview.config);
    for (const extremes of [
      { clock_scale: 1.1, text_scale: 1.1, spacing: 1.1, left_width: 50, rail_width: 10 },
      { clock_scale: .85, text_scale: .9, spacing: .85, left_width: 60, rail_width: 6 },
    ]) {
      await page.evaluate(({ saved, extremes }) => preview.commit({ ...saved, layout: { ...saved.layout, ...extremes } }), { saved, extremes });
      for (const scenario of ['agenda', 'long', 'ongoing']) {
        await page.selectOption('#scenario', scenario);
        await settle(); assert.deepEqual(await bounds(), [], `${viewport}/extreme/${scenario}`);
      }
    }
    await page.evaluate(saved => preview.commit(saved), saved); await page.selectOption('#readings', '2');
  }
  await page.selectOption('#scenario', 'agenda'); await page.selectOption('#preset', 'full');
  await page.locator('#unavailable').click();
  assert.equal(await card.locator('.digits').textContent(), '14:42');
  assert.match(await card.locator('.calendar').textContent(), /unavailable/);
  assert.equal(await card.locator('.event').count(), 0);
  assert.equal(await card.locator('.reading strong').first().textContent(), '—');
  const editor = page.locator('#editor');
  const scale = editor.locator('[data-path="layout.clock_scale"]');
  await page.evaluate(() => { window.emitted = []; preview.editor.addEventListener('config-changed', e => emitted.push(e.detail.config)); });
  await scale.fill(''); assert.equal(await scale.getAttribute('aria-invalid'), 'true');
  await editor.locator('[data-path="room_name"]').fill('Draft room');
  assert.equal(await page.evaluate(() => emitted.length), 0, 'invalid draft must suppress all commits');
  await page.evaluate(() => { preview.editor.setConfig(preview.config); preview.editor.hass = { ...preview.hass }; });
  assert.equal(await scale.inputValue(), '', 'HA echo must not erase invalid draft');
  await scale.fill('1'); assert.equal(await page.evaluate(() => preview.config.room_name), 'Draft room');
  assert.equal(await page.evaluate(() => emitted.length), 1);
  const oldColor = await card.locator('.screen').evaluate(e => getComputedStyle(e).backgroundColor);
  await editor.locator('[data-path="appearance.colors.background"]').fill('url(https://example.com)');
  assert.equal(await card.locator('.screen').evaluate(e => getComputedStyle(e).backgroundColor), oldColor);
  await editor.locator('[data-path="appearance.colors.background"]').fill('#112233');
  await page.waitForFunction(() => getComputedStyle(preview.card.shadowRoot.querySelector('.screen')).backgroundColor === 'rgb(17, 34, 51)');
  assert.equal(await card.locator('.screen').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(17, 34, 51)');
  // Real YAML application and editor emission retain independent night/unknown settings.
  await page.locator('#yaml').fill('type: custom:info-dashboard\nroom_name: "<img src=x onerror=alert(1)>"\ntime_format: "12"\nlanguage: en-US\nfeatures:\n  calendar:\n    enabled: false\n    night: true\n    future_source: calendar.example\nview_layout:\n  position: main\n');
  await page.locator('#apply').click();
  assert.equal(await card.locator('.room img').count(), 0);
  assert.match(await card.locator('.room').textContent(), /<img/);
  assert.equal(await card.locator('.period').textContent(), 'PM');
  await editor.locator('[data-path="features.calendar.enabled"]').check();
  assert.equal(await page.evaluate(() => preview.config.features.calendar.future_source), 'calendar.example');
  assert.equal(await page.evaluate(() => preview.config.view_layout.position), 'main');
  await editor.locator('[data-path="features.calendar.enabled"]').uncheck();
  await page.selectOption('#appearance', 'night');
  assert.equal(await card.locator('.calendar').count(), 0, 'night true cannot enable globally disabled feature');
  await page.locator('#yaml').fill('layout:\n  clock_scale: invalid\n'); await page.locator('#apply').click();
  assert.match(await page.locator('#yaml-error').textContent(), /layout.clock_scale/);
  assert.equal(await card.locator('.period').textContent(), 'PM');
  // HA state updates must not rebuild the clock or disturb control identity.
  const unchanged = await page.evaluate(() => { const node = preview.card.shadowRoot.querySelector('.digits'); preview.card.hass = { ...preview.hass, states: {} }; return node === preview.card.shadowRoot.querySelector('.digits'); });
  assert.ok(unchanged);
  await page.evaluate(() => { const c = preview.config; c.language = 'de-DE'; c.date_format = 'long'; preview.commit(c); });
  assert.match(await card.locator('.date').textContent(), /Sonntag.*November/);
  // Disconnect/reconnect is a meaningful lifecycle check: no retained ticking timer.
  await page.evaluate(() => { preview.card.remove(); });
  assert.equal(await page.evaluate(() => preview.card._timer), undefined);
  await page.evaluate(() => document.getElementById('frame').append(preview.card));
  assert.ok(await page.evaluate(() => preview.card._timer !== undefined));
  await page.setViewportSize({ width: 400, height: 900 }); await settle();
  const editorOverflow = await editor.evaluate(e => { const r = e.getBoundingClientRect(); return [...e.shadowRoot.querySelectorAll('input,select,fieldset')].some(x => x.getBoundingClientRect().right > r.right + 1); });
  assert.equal(editorOverflow, false, 'editor controls fit a narrow viewport');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await card.locator('.screen').evaluate(e => getComputedStyle(e).transitionDuration), '0s');
  assert.equal((await readFile('dist/info-dashboard.js', 'utf8')).includes('Walk by the lake'), false, 'fixtures must not ship in card');
  assert.deepEqual(errors, []);
  console.log(`Browser checks passed: ${layouts} theme/layout combinations, focus stability, tuning extremes, editor/YAML drafts, injection, locale, and lifecycle.`);
} finally {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
