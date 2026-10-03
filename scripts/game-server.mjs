import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export function createGameServer(projectRoot) {
  const root = resolve(projectRoot, 'dist');
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
  return createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    if (request.url === '/__health') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ name: 'snake-game', root: resolve(projectRoot) })); return;
    }
    try {
      const pathname = decodeURIComponent((request.url ?? '/').split('?')[0]);
      const file = resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`);
      if (!file.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
      const content = await readFile(file);
      response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      response.writeHead(error instanceof URIError ? 400 : 404); response.end();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const server = createGameServer(root);
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(17863, '127.0.0.1');
}
