// Offline support: app shell, map style/fonts, and map tiles from OpenFreeMap.
const SHELL_CACHE = 'shell';
const TILE_CACHE = 'map-tiles'; // tiles seen while browsing, capped
const SAVED_CACHE = 'map-saved'; // tiles the driver saved along a route, never trimmed
const META_CACHE = 'map-meta'; // style, TileJSON, fonts, sprites
const TILE_CAP = 6000;
const MAP_HOST = 'tiles.openfreemap.org';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/core.js', 'js/api.js', 'js/store.js',
  'vendor/maplibre-gl.mjs', 'vendor/maplibre-gl-worker.mjs', 'vendor/maplibre-gl.css',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) e.respondWith(shell(req, e));
  else if (url.hostname === MAP_HOST) e.respondWith(mapAsset(url, e));
});

// Serve the cached app immediately and refresh it in the background,
// so a new version is live on the next launch without manual cache bumps.
async function shell(req, e) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  const update = fetch(req)
    .then(async (res) => {
      if (res.ok) await cache.put(req.url.split('?')[0], res.clone());
      return res;
    });
  if (hit) {
    e.waitUntil(update.catch((err) => { if (!(err instanceof TypeError)) throw err; }));
    return hit;
  }
  return update;
}

async function mapAsset(url, e) {
  const save = url.searchParams.has('save');
  url.searchParams.delete('save');
  const clean = url.href;
  const path = url.pathname;
  const isAsset = path.includes('/fonts/') || path.includes('/sprites/') || path.includes('/sprite');
  const isTile = !isAsset && /\/\d+\/\d+\/\d+\.pbf$/.test(path);

  if (isTile) {
    const hit = await caches.match(clean);
    if (hit) {
      if (save) await (await caches.open(SAVED_CACHE)).put(clean, hit.clone());
      return hit;
    }
    try {
      const res = await fetch(clean);
      if (res.ok) {
        await (await caches.open(save ? SAVED_CACHE : TILE_CACHE)).put(clean, res.clone());
        if (!save) e.waitUntil(trimTiles());
        keyIndex = null;
      }
      return res;
    } catch (err) {
      if (!(err instanceof TypeError)) throw err;
      return (await anyVersion(path)) || new Response('', { status: 404 });
    }
  }

  if (isAsset) {
    const hit = await caches.match(clean);
    if (hit) return hit;
    const res = await fetch(clean);
    if (res.ok) await (await caches.open(META_CACHE)).put(clean, res.clone());
    return res;
  }

  // Style JSON and TileJSON: always prefer fresh, use the cached copy offline.
  try {
    const res = await fetch(clean);
    if (res.ok) {
      const copies = [res.clone(), res.clone()];
      await (await caches.open(META_CACHE)).put(clean, copies[0]);
      if (save) await (await caches.open(SAVED_CACHE)).put(clean, copies[1]);
    }
    return res;
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    return (await caches.match(clean)) || Response.error();
  }
}

// OpenFreeMap publishes a new tile set weekly under a new path. Offline, serve the same
// z/x/y from whichever version was saved, so saved routes keep working after an update.
let keyIndex = null;
async function anyVersion(path) {
  const m = path.match(/\/(\d+\/\d+\/\d+)\.pbf$/);
  if (!m) return null;
  if (!keyIndex) {
    keyIndex = new Map();
    for (const name of [TILE_CACHE, SAVED_CACHE]) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) {
        const k = new URL(req.url).pathname.match(/\/(\d+\/\d+\/\d+)\.pbf$/);
        if (k) keyIndex.set(k[1], req);
      }
    }
  }
  const req = keyIndex.get(m[1]);
  return req ? caches.match(req) : null;
}

let putsSinceTrim = 0;
async function trimTiles() {
  if (++putsSinceTrim < 200) return;
  putsSinceTrim = 0;
  const cache = await caches.open(TILE_CACHE);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - TILE_CAP; i++) await cache.delete(keys[i]);
}
