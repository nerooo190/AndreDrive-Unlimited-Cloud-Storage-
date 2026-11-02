import { execFileSync } from 'node:child_process';
import { mkdirSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function deploymentConfig(value) {
  if (!value) throw new Error('BACKEND_URL fehlt. Stelle zuerst den vollständigen AndreDrive-Server mit dauerhaftem Speicher bereit und trage seine HTTPS-URL in den Vercel Environment Variables ein. Siehe DEPLOYMENT.md.');
  let backend;
  try { backend = new URL(value); } catch { throw new Error('BACKEND_URL muss eine gültige HTTPS-URL sein.'); }
  if (backend.protocol !== 'https:' || backend.username || backend.password || backend.search || backend.hash || backend.pathname !== '/') {
    throw new Error('BACKEND_URL muss ein HTTPS-Ursprung ohne Pfad, Zugangsdaten oder Query sein, z. B. https://andredrive.onrender.com.');
  }
  return {
    version: 3,
    routes: [
      // Keep every API/media request away from the SPA fallback, including errors.
      { src: '/((?:api|media|thumb|hls|playlist)(?:/.*)?)', dest: `${backend.origin}/$1` },
      { handle: 'filesystem' },
      { src: '/.*', dest: '/index.html' },
    ],
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = deploymentConfig(process.env.BACKEND_URL);
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
  const output = '.vercel/output';
  rmSync(output, { recursive: true, force: true });
  mkdirSync(`${output}/static`, { recursive: true });
  cpSync('dist', `${output}/static`, { recursive: true });
  writeFileSync(`${output}/config.json`, JSON.stringify(config, null, 2));
  console.log(`Vercel frontend prepared; API and streaming proxy target: ${new URL(process.env.BACKEND_URL).origin}`);
}
