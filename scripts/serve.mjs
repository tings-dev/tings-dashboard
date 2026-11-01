import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.map': 'application/json' };
export async function startServer(port = 8765) {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const relative = pathname === '/' ? 'preview/index.html' : pathname.slice(1);
      // Serve only the demo/artifact trees; never dotfiles or parent paths.
      if (!/^(preview|dist|prototypes|release)\//.test(relative) || relative.split('/').some(part => part.startsWith('.'))) throw new Error('Not found');
      const path = resolve(root, relative);
      if (!path.startsWith(root + (root.endsWith(sep) ? '' : sep)) || !(await stat(path)).isFile()) throw new Error('Not found');
      res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(await readFile(path));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await import('./build.mjs');
  const server = await startServer(Number(process.env.INFO_DASHBOARD_PORT || 8765));
  console.log(`Development preview: http://127.0.0.1:${server.address().port}`);
}
