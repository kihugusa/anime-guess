// Retired: Character Guess now shares the Anime Guess service worker at ../sw.js.
// This version clears its old cache and unregisters itself for anyone who installed it earlier.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('cg-')).map(k => caches.delete(k)))).then(() => self.registration.unregister())));
