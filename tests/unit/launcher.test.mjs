import { afterAll, beforeAll, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGameServer } from '../../scripts/game-server.mjs';
let root, server, url;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'snake-launcher-'));
  await mkdir(join(root, 'dist', 'assets'), { recursive: true });
  await writeFile(join(root, 'dist', 'index.html'), '<h1>Snake</h1>');
  await writeFile(join(root, 'dist', 'assets', 'game.js'), 'console.log("snake")');
  await writeFile(join(root, 'secret.txt'), 'private');
  server = createGameServer(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await rm(root, { recursive: true, force: true });
});
it('启动健康检查标识项目，主页和带查询参数的资源正确返回', async () => {
  expect(await (await fetch(url + '/__health')).json()).toEqual({ name: 'snake-game', root });
  const home = await fetch(url); expect(home.headers.get('content-type')).toContain('text/html'); expect(await home.text()).toContain('Snake');
  const asset = await fetch(url + '/assets/game.js?v=1'); expect(asset.headers.get('content-type')).toContain('text/javascript'); expect(await asset.text()).toContain('console.log');
  expect(await (await fetch(url, { method: 'HEAD' })).text()).toBe('');
});
it('不暴露项目文件，拒绝非法路径和方法，未知资源返回404', async () => {
  expect((await fetch(url + '/missing')).status).toBe(404);
  expect((await fetch(url + '/%2e%2e%2fsecret.txt')).status).toBe(403);
  expect((await fetch(url + '/%ZZ')).status).toBe(400);
  expect((await fetch(url, { method: 'POST' })).status).toBe(405);
});
