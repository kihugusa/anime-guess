// Build Anime Guess.
//   dist/artifact.html  single page with inline data (for the Claude preview link)
//   dist/web/           installable web app; anime.json fetched at runtime
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
const r = p => readFileSync(p, 'utf8');
const core = r('src/core.js'), tpl = r('src/app.html');
const dataPath = existsSync('docs/anime.json') && !process.env.FIXTURE ? 'docs/anime.json' : 'tests/fixture.json';
const data = JSON.parse(r(dataPath));
rmSync('dist', { recursive: true, force: true }); mkdirSync('dist/web/icons', { recursive: true });
const safe = s => s.replace(/<\/script/gi, '<\\/script');
writeFileSync('dist/artifact.html', tpl.replace('<!--PWA_LINKS-->', () => '')
  .replace('<!--DATA-->', () => `<script>window.ANIME_DATA=${safe(JSON.stringify(data))}</script>`)
  .replace('<!--CORE-->', () => `<script>${safe(core)}</script>`));
const links = '<link rel="manifest" href="manifest.json">\n<link rel="apple-touch-icon" href="icons/icon-180.png">\n<link rel="icon" href="icons/icon-192.png">';
const sw = `<script>if('serviceWorker' in navigator){try{navigator.serviceWorker.register('sw.js').catch(function(){})}catch(e){}}</script>`;
writeFileSync('dist/web/index.html', tpl.replace('<!--PWA_LINKS-->', () => links).replace('<!--DATA-->', () => '').replace('<!--CORE-->', () => `<script>${safe(core)}</script>\n${sw}`));
writeFileSync('dist/web/anime.json', JSON.stringify(data));
writeFileSync('dist/web/manifest.json', JSON.stringify({ name: 'Anime Guess', short_name: 'Anime Guess', description: 'Guess the daily anime from its studio, year, genres and more.',
  start_url: './', scope: './', display: 'standalone', background_color: '#ffffff', theme_color: '#e8380d',
  icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }, null, 2));
writeFileSync('dist/web/sw.js', `// Offline cache for Anime Guess. Bump VERSION when you ship changes.
const VERSION = 'ag-v1';
const FILES = ['./', './index.html', './anime.json', './manifest.json', './icons/icon-192.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
`);
execSync('python3 scripts/icons.py dist/web/icons', { stdio: 'inherit' });
console.log(`built from ${dataPath}: ${data.rows.length} titles`);
