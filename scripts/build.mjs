import { build } from 'esbuild';
import { buildCard } from './build-card.mjs';
await buildCard();
await build({ entryPoints: ['preview/preview.js'], outfile: 'dist/preview.js', bundle: true, format: 'esm', target: ['chrome105'], sourcemap: true, external: ['/dist/tings-dashboard.js'] });
console.log('Built dist/tings-dashboard.js and development preview.');
