import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
export const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
export function buildCard(options = {}) {
  return build({ entryPoints: ['src/index.js'], outfile: 'dist/tings-dashboard.js', bundle: true, format: 'esm', target: ['chrome105'], sourcemap: true, define: { __TINGS_DASHBOARD_VERSION__: JSON.stringify(version) }, banner: { js: `/*! Tings Dashboard v${version} | custom:tings-dashboard */` }, ...options });
}
