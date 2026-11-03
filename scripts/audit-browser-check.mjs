import assert from 'node:assert/strict';
import { configFields, normalizeConfig } from '../src/config.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export async function checkAudit(page, bounds, settle) {
  await page.setViewportSize({ width: 1400, height: 1200 });
  await page.reload(); await page.waitForFunction(() => window.preview);
  await page.selectOption('#readings', '4');
  const c = await page.evaluate(() => preview.config);
  const fields = configFields(normalizeConfig(c));
  const actual = await page.locator('#editor').evaluate(el => [...el.shadowRoot.querySelectorAll('[data-path]')].map(input => ({ path: input.dataset.path, label: input.getAttribute('aria-label') || input.closest('label')?.textContent, value: input.type === 'checkbox' ? input.checked : input.value })));
  assert.deepEqual(actual.map(x => x.path).sort(), fields.map(f => f.path).sort(), 'every scalar/list setting has an editor control');
  assert.ok(actual.every(x => x.label?.trim()), 'every editor control has a label');
  // Language changes translate the entire editor immediately while preserving drafts.
  const language = page.locator('#editor').locator('[data-path="language"]');
  await language.fill('');
  await language.pressSequentially('de-DE');
  assert.equal(await language.inputValue(), 'de-DE');
  assert.equal(await language.evaluate(el => el === el.getRootNode().activeElement), true, 'typing a locale retains focus through translated rerenders');
  assert.ok(await page.locator('#editor').getByRole('button', { name: 'Messwert hinzufügen', exact: true }).count());
  await page.locator('#editor').locator('[data-path="language"]').fill('en-GB');
  // A real touch target and keyboard activation reveal untruncated event titles.
  await page.selectOption('#scenario', 'long');
  await page.waitForFunction(() => preview.card.shadowRoot.querySelector('.event-title'));
  const title = page.locator('#card').locator('.event-title').first();
  const full = await title.getAttribute('data-full-title');
  await title.focus(); await page.keyboard.press('Enter');
  const dialog = page.locator('#card').locator('dialog');
  assert.equal(await dialog.locator('p').textContent(), full);
  await page.keyboard.press('Escape');
  assert.equal(await title.evaluate(e => e === e.getRootNode().activeElement), true);
  await title.tap();
  assert.equal(await dialog.locator('p').textContent(), full);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await title.focus();
  const stable = await page.evaluate(() => { const el = preview.card.shadowRoot.activeElement; preview.card._render(); return preview.card.shadowRoot.activeElement === el; });
  assert.ok(stable, 'live updates preserve focused title controls');
  // Contrast checks cover every default text role, not only the CO₂ number.
  for (const theme of ['dark', 'light']) {
    await page.selectOption('#appearance', theme); await settle();
    const ratios = await page.locator('#card').locator('.screen').evaluate(el => {
      const css = getComputedStyle(el);
      const luminance = hex => hex.trim().slice(1).match(/../g).slice(0, 3).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const background = luminance(css.getPropertyValue('--background'));
      return ['text', 'muted', 'accent'].map(role => { const value = luminance(css.getPropertyValue(`--${role}`)); return (Math.max(value, background) + .05) / (Math.min(value, background) + .05); });
    });
    assert.ok(ratios.every(r => r >= 4.5), `${theme} text contrast: ${ratios}`);
    assert.deepEqual(await bounds(), [], `audited ${theme} layout`);
  }
  // Exercise the actual minified distribution, independently of preview code.
  const bundle = await readFile('tings-dashboard.js');
  assert.deepEqual(await readFile('release/tings-dashboard.js'), bundle, 'HACS branch and release copies must match');
  assert.equal((await readFile('release/SHA256SUMS', 'utf8')).trim(), `${createHash('sha256').update(bundle).digest('hex')}  tings-dashboard.js`);
  // A fresh page without the development imports loads only the release file.
  assert.equal(bundle.toString().includes('sourceMappingURL'), false);
  assert.equal(bundle.toString().includes('Walk by the lake'), false);
  const releaseContext = await page.context().browser().newContext();
  const releasePage = await releaseContext.newPage();
  try {
    await releasePage.route('**/release-test', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
    await releasePage.goto(new URL('/release-test', page.url()).href);
    await releasePage.evaluate(async () => { await import('/tings-dashboard.js'); });
    const { version } = JSON.parse(await readFile('package.json', 'utf8'));
    assert.deepEqual(await releasePage.evaluate(() => {
      const ctor = customElements.get('tings-dashboard');
      const card = document.createElement('tings-dashboard'); card.setConfig({}); document.body.append(card);
      return { version: ctor.version, clock: !!card.shadowRoot.querySelector('.clock'), editor: !!ctor.getConfigElement(), picker: customCards.filter(c => c.type === 'tings-dashboard').length };
    }), { version, clock: true, editor: true, picker: 1 });
  } finally { await releaseContext.close(); }
  console.log(`Stage 5 browser audit passed: ${fields.length} editor fields, translations, full titles, focus, contrast and standalone release.`);
}
