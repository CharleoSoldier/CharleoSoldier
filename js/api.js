// Network calls: openrouteservice (truck routing), Photon (search), Overpass (speed limits + signals).
import { orsBody, overpassQuery } from './core.js';

export const ORS_BASE = 'https://api.heigit.org/openrouteservice';
export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
export const PHOTON_URL = 'https://photon.komoot.io/api/';

export async function routeTruck({ base, key, points, truck, language, signal }) {
  if (!key) throw new Error('Add your free openrouteservice API key in Settings first.');
  let res;
  try {
    res = await fetch(`${base}/v2/directions/driving-hgv/geojson`, {
      method: 'POST',
      headers: { Authorization: key, 'Content-Type': 'application/json', Accept: 'application/geo+json, application/json' },
      body: JSON.stringify(orsBody(points, truck, language)),
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error('Could not reach the routing server (offline or blocked). Saved routes still open offline.');
  }
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (e) {
    if (!(e instanceof SyntaxError)) throw e;
  }
  if (!res.ok) {
    const err = data && data.error;
    const msg = typeof err === 'string' ? err : err && err.message;
    if (res.status === 401 || res.status === 403) throw new Error(`API key rejected: ${msg || res.status}`);
    if (res.status === 429) throw new Error('openrouteservice quota reached. Try again later.');
    throw new Error(msg || `Routing failed (HTTP ${res.status})`);
  }
  if (!data) throw new Error('Routing service returned an unreadable response.');
  return data;
}

export async function searchPlaces(q, near, signal, bbox = null) {
  const u = new URL(PHOTON_URL);
  u.searchParams.set('q', q);
  u.searchParams.set('limit', '6');
  if (bbox) u.searchParams.set('bbox', bbox.map((n) => n.toFixed(2)).join(','));
  if (near) {
    u.searchParams.set('lat', near[1].toFixed(4));
    u.searchParams.set('lon', near[0].toFixed(4));
  }
  const res = await fetch(u, { signal });
  if (!res.ok) throw new Error(`Search failed (HTTP ${res.status})`);
  const data = await res.json();
  return (data.features || []).map((f) => {
    const p = f.properties || {};
    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    const parts = [p.name, street, p.city || p.town || p.village || p.county, p.state, (p.countrycode || '').toUpperCase()];
    const label = [...new Set(parts.filter(Boolean))].join(', ');
    return { label: label || 'Unnamed place', lonlat: f.geometry.coordinates };
  });
}

const wait = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });

// One chunk at a time, with backoff when the public server is busy.
export async function overpassChunk(endpoint, points, signal) {
  const body = 'data=' + encodeURIComponent(overpassQuery(points));
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal,
    });
    if (res.ok) return (await res.json()).elements || [];
    if ((res.status === 429 || res.status === 504) && attempt < 3) {
      await wait(5000 * 2 ** attempt, signal);
      continue;
    }
    throw new Error(`Overpass HTTP ${res.status}`);
  }
}
