import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deploymentConfig } from '../scripts/build-vercel.mjs';
import { api } from '../src/api.js';

test('Vercel requires a real backend instead of silently publishing a broken login', () => {
  assert.throws(() => deploymentConfig(), /BACKEND_URL fehlt/);
  for (const value of ['http://backend.example', 'https://backend.example/api', 'https://user:password@backend.example', 'https://backend.example/?secret=x']) {
    assert.throws(() => deploymentConfig(value), /HTTPS/);
  }
});

test('all protected routes proxy to the backend before static or SPA fallback', () => {
  const config = deploymentConfig('https://backend.example');
  assert.equal(config.version, 3);
  const [proxy, filesystem, spa] = config.routes;
  const pattern = new RegExp(`^${proxy.src}$`);
  for (const route of ['/api/me', '/api/auth/register', '/api/auth/login', '/api/upload', '/media/token/file', '/thumb/token/file', '/hls/token/file/index.m3u8', '/playlist/token/library.m3u']) {
    assert.ok(pattern.test(route), route);
    assert.equal(route.replace(pattern, proxy.dest), 'https://backend.example' + route);
  }
  assert.equal(pattern.test('/s/token'), false);
  assert.equal(filesystem.handle, 'filesystem');
  assert.equal(spa.dest, '/index.html');
});

test('API distinguishes missing static-host API, backend outage, validation and valid sessions', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  for (const status of [200, 404, 405]) {
    globalThis.fetch = async () => new Response('<!doctype html><html>Frontend only</html>', { status, headers: { 'Content-Type': 'text/html' } });
    await assert.rejects(api('/api/auth/register'), /Konto-API nicht eingerichtet/);
  }
  globalThis.fetch = async () => new Response('Bad gateway', { status: 502 });
  await assert.rejects(api('/api/me'), /momentan nicht erreichbar/);
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Passwort zu kurz.' }), { status: 400 });
  await assert.rejects(api('/api/auth/register'), /Passwort zu kurz/);
  globalThis.fetch = async () => new Response('null');
  assert.equal(await api('/api/me'), null);
  globalThis.fetch = async () => new Response(JSON.stringify({ id: 'user-id' }));
  assert.deepEqual(await api('/api/me'), { id: 'user-id' });
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(api('/api/me'), /Keine Verbindung/);
});
