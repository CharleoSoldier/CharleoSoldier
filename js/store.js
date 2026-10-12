// Local-only persistence: settings in localStorage, saved routes in IndexedDB. Nothing leaves the device.
import { DEFAULT_TRUCK } from './core.js';
import { ORS_BASE, OVERPASS_URL } from './api.js';

const SETTINGS_KEY = 'trucknav.settings';
const TRUCK_KEY = 'trucknav.truck';
const VIEW_KEY = 'trucknav.view';

export const DEFAULT_SETTINGS = {
  units: 'imperial',
  orsKey: '',
  orsBase: ORS_BASE,
  overpassUrl: OVERPASS_URL,
  voice: true,
  signalAlert: true,
  speedAlert: true,
  night: false,
  view: 'eye',
  reach: 'mid',
  rows: 4,
  showTurns: true,
  showLimits: true,
  showLights: true,
  countyLines: true,
  regionOnly: true,
};

function readJSON(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    if (e instanceof SyntaxError) return null;
    throw e;
  }
}

export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...(readJSON(SETTINGS_KEY) || {}) });
export const saveSettings = (s) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
export const loadTruck = () => ({ ...DEFAULT_TRUCK, ...(readJSON(TRUCK_KEY) || {}) });
export const saveTruck = (t) => localStorage.setItem(TRUCK_KEY, JSON.stringify(t));
export const loadView = () => readJSON(VIEW_KEY);
export const saveView = (v) => localStorage.setItem(VIEW_KEY, JSON.stringify(v));

let dbPromise = null;
function db() {
  dbPromise ||= new Promise((resolve, reject) => {
    const req = indexedDB.open('trucknav', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('routes', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return db().then(
    (d) =>
      new Promise((resolve, reject) => {
        const t = d.transaction('routes', mode);
        const result = fn(t.objectStore('routes'));
        t.oncomplete = () => resolve(result.result);
        t.onerror = () => reject(t.error);
      })
  );
}

export const putRoute = (r) => tx('readwrite', (s) => s.put(r));
export const deleteRoute = (id) => tx('readwrite', (s) => s.delete(id));
export const getRoute = (id) => tx('readonly', (s) => s.get(id));
export const listRoutes = () =>
  tx('readonly', (s) => s.getAll()).then((rows) => rows.sort((a, b) => b.created.localeCompare(a.created)));
