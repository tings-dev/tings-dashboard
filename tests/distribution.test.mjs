import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { buildCard } from '../scripts/build-card.mjs';

test('HACS can install the current production bundle from a source branch without a release', async () => {
  const bundle = await readFile('tings-dashboard.js');
  const manifest = JSON.parse(await readFile('hacs.json', 'utf8'));
  assert.equal(manifest.filename, 'tings-dashboard.js');
  assert.equal(manifest.content_in_root, true, 'HACS must select the root bundle, excluding development dist files');
  assert.notEqual(manifest.hide_default_branch, true, 'branch installation must be available without a release');
  assert.deepEqual((await readdir('.')).filter(name => name.endsWith('.js')), ['tings-dashboard.js'], 'HACS downloads root JavaScript files; do not ship preview code here');
  const built = await buildCard({ outfile: 'tings-dashboard.js', minify: true, sourcemap: false, write: false, metafile: true });
  assert.equal(bundle.toString(), Buffer.from(built.outputFiles[0].contents).toString(), 'Tracked bundle is stale; run npm run package and include tings-dashboard.js');
  assert.ok(Object.values(built.metafile.outputs).every(output => output.imports.length === 0), 'The HACS bundle must be self contained');
});
