import * as maplibregl from '../vendor/maplibre-gl.mjs';
import * as C from './core.js';
import { routeTruck, searchPlaces, overpassChunk } from './api.js';
import * as S from './store.js';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const ATTRIBUTION =
  'Routing: <a href="https://openrouteservice.org" target="_blank" rel="noopener">openrouteservice</a> by HeiGIT | ' +
  'Search: <a href="https://photon.komoot.io" target="_blank" rel="noopener">Photon</a> | ' +
  'Lights &amp; limits: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> via Overpass';
const ORS_LANGS = new Set('cs da de en eo es eu fi fr gr he hu id it ja lv lt ne nl nb pl pt ro ru tr ua vi zh'.split(' '));
const LANG_ALIASES = { el: 'gr', uk: 'ua', no: 'nb' };
const EMPTY = { type: 'FeatureCollection', features: [] };

const $ = (id) => document.getElementById(id);
const state = {
  settings: S.loadSettings(),
  truck: S.loadTruck(),
  from: null,
  to: null,
  route: null,
  cum: null,
  savedId: null,
  corridorAbort: null,
  searchAbort: null,
  routeAbort: null,
  nav: null,
  watchId: null,
  wakeLock: null,
  audio: null,
};

// ---------- map ----------

const view = S.loadView();
const map = new maplibregl.Map({
  container: 'map',
  style: STYLE_URL,
  center: view ? view.center : [-98.58, 39.83],
  zoom: view ? view.zoom : 3.5,
  maxPitch: 70,
  attributionControl: false,
});
// Top-left keeps the required credits visible above the bottom sheet and nav bar.
map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: ATTRIBUTION }), 'top-left');
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right');
map.on('moveend', () => {
  if (!state.nav) S.saveView({ center: map.getCenter().toArray(), zoom: map.getZoom() });
});

const puckEl = document.createElement('div');
puckEl.className = 'puck';
puckEl.innerHTML =
  '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#fff"/><circle cx="20" cy="20" r="15" fill="#2f7cf6"/>' +
  '<path d="M20 7 L29 29 L20 24 L11 29 Z" fill="#fff"/></svg>';
const puck = new maplibregl.Marker({ element: puckEl, rotationAlignment: 'map', pitchAlignment: 'map' });

map.on('load', () => {
  const beforeId = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  map.addSource('route', { type: 'geojson', data: EMPTY });
  map.addSource('signals', { type: 'geojson', data: EMPTY });
  map.addSource('ends', { type: 'geojson', data: EMPTY });
  const w = (a, b) => ['interpolate', ['linear'], ['zoom'], 5, a, 16, b];
  map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#0b3a8a', 'line-width': w(5, 14) } }, beforeId);
  map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#2f7cf6', 'line-width': w(3, 9) } }, beforeId);
  map.addLayer({ id: 'signals', type: 'circle', source: 'signals', minzoom: 10, paint: { 'circle-color': '#e5484d', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 8], 'circle-stroke-color': '#ffd400', 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'ends', type: 'circle', source: 'ends', paint: { 'circle-color': ['get', 'color'], 'circle-radius': 8, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
  if (state.route) renderRoute();
});

// Long-press (touch) or right-click (desktop) to pick a point.
let pressTimer = null;
let pressPoint = null;
let lastMenu = 0;
map.on('touchstart', (e) => {
  if (e.originalEvent.touches.length !== 1 || state.nav) return;
  pressPoint = e.point;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => pointMenu(e.lngLat), 550);
});
map.on('touchmove', (e) => {
  if (pressPoint && e.point.dist(pressPoint) > 12) clearTimeout(pressTimer);
});
map.on('touchend', () => clearTimeout(pressTimer));
map.on('touchcancel', () => clearTimeout(pressTimer));
map.on('contextmenu', (e) => {
  if (!state.nav) pointMenu(e.lngLat);
});

let popup = null;
function pointMenu(lngLat) {
  if (Date.now() - lastMenu < 800) return;
  lastMenu = Date.now();
  popup?.remove();
  const lonlat = [lngLat.lng, lngLat.lat];
  const label = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
  const div = document.createElement('div');
  div.className = 'popup-actions';
  const go = document.createElement('button');
  go.className = 'primary';
  go.textContent = 'Route here';
  go.onclick = () => { popup.remove(); setPlace('to', { label, lonlat }); computeRoute(); };
  const start = document.createElement('button');
  start.textContent = 'Start here';
  start.onclick = () => { popup.remove(); setPlace('from', { label, lonlat }); };
  div.append(go, start);
  popup = new maplibregl.Popup({ closeButton: false }).setLngLat(lngLat).setDOMContent(div).addTo(map);
}

// ---------- status + small helpers ----------

function setStatus(msg, isError = false) {
  const el = $('status');
  el.textContent = msg || '';
  el.classList.toggle('error', isError);
}

function lang() {
  const l = (navigator.language || 'en').slice(0, 2).toLowerCase();
  const code = LANG_ALIASES[l] || l;
  return ORS_LANGS.has(code) ? code : 'en';
}

function units() {
  return state.settings.units;
}

function sheetPadding() {
  const wide = window.innerWidth >= 760;
  const h = $('plan').offsetHeight;
  return wide ? { top: 40, bottom: 40, left: 460, right: 60 } : { top: 70, bottom: h + 30, left: 40, right: 40 };
}

function currentLonLat() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('This device has no location service.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.longitude, p.coords.latitude]),
      (err) => reject(new Error(err.code === 1 ? 'Location permission denied. Allow it, or set a start point.' : 'Could not get your location. Set a start point instead.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}

function truckBadge() {
  const f = C.truckToForm(state.truck, units());
  $('truckBadge').textContent =
    units() === 'imperial'
      ? `${f.heightFt}'${f.heightIn}" · ${Math.round(f.weight / 1000)}k${state.truck.hazmat ? ' · HAZ' : ''}`
      : `${f.height}m · ${f.weight}t${state.truck.hazmat ? ' · HAZ' : ''}`;
}

// ---------- search ----------

let searchTimer = null;
let activeField = 'to';
const coordRe = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

for (const field of ['from', 'to']) {
  const input = $(field);
  input.addEventListener('focus', () => { activeField = field; });
  input.addEventListener('input', () => {
    activeField = field;
    state[field] = null;
    clearTimeout(searchTimer);
    const q = input.value.trim();
    if (q.length < 3) return showResults([]);
    searchTimer = setTimeout(() => runSearch(q), 450);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    clearTimeout(searchTimer);
    const q = input.value.trim();
    if (q) runSearch(q);
  });
}

async function runSearch(q) {
  const m = q.match(coordRe);
  if (m) {
    const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return showResults([{ label: `${lat}, ${lon}`, lonlat: [lon, lat] }]);
  }
  state.searchAbort?.abort();
  const ctrl = new AbortController();
  state.searchAbort = ctrl;
  try {
    const results = await searchPlaces(q, map.getCenter().toArray(), ctrl.signal);
    showResults(results, results.length ? '' : 'No matches. Try a city or full address, or long-press the map.');
  } catch (e) {
    if (e.name === 'AbortError') return;
    showResults([], e instanceof TypeError ? 'Search needs a connection. Long-press the map to pick a point.' : e.message);
  }
}

function showResults(list, message = '') {
  const ul = $('results');
  ul.replaceChildren();
  for (const r of list) {
    const li = document.createElement('li');
    li.textContent = r.label;
    li.onclick = () => { setPlace(activeField, r); showResults([]); };
    ul.append(li);
  }
  if (list.length) {
    const credit = document.createElement('li');
    credit.className = 'hint';
    credit.textContent = 'Search by Photon · data © OpenStreetMap contributors';
    ul.append(credit);
  }
  ul.hidden = !list.length;
  setStatus(message, false);
}

function setPlace(field, place) {
  state[field] = place;
  $(field).value = place ? place.label : '';
  renderEnds();
  if (field === 'to' && place && !state.route) map.easeTo({ center: place.lonlat, zoom: Math.max(map.getZoom(), 12) });
}

// ---------- routing ----------

$('btnRoute').onclick = () => computeRoute();

async function computeRoute() {
  if (!state.to) return setStatus('Pick a destination first (search, or long-press the map).', true);
  if (!C.validTruck(state.truck)) return setStatus('Truck profile has an invalid value.', true);
  state.routeAbort?.abort();
  const ctrl = new AbortController();
  state.routeAbort = ctrl;
  $('btnRoute').disabled = true;
  setStatus(state.from ? 'Finding a truck-safe route…' : 'Getting your location…');
  try {
    const start = state.from ? state.from.lonlat : await currentLonLat();
    setStatus('Finding a truck-safe route…');
    const data = await routeTruck({
      base: state.settings.orsBase,
      key: state.settings.orsKey,
      points: [start, state.to.lonlat],
      truck: state.truck,
      language: lang(),
      signal: ctrl.signal,
    });
    const r = C.routeFromORS(data, state.truck);
    r.name = `${state.from ? state.from.label : 'My location'} → ${state.to.label}`;
    r.start = start;
    r.end = state.to.lonlat;
    state.savedId = null;
    setRoute(r);
    fitRoute();
    setStatus('');
    loadCorridor(r);
  } catch (e) {
    if (e.name !== 'AbortError') setStatus(e.message, true);
  } finally {
    $('btnRoute').disabled = false;
  }
}

function setRoute(r) {
  state.route = r;
  state.cum = C.cumulative(r.coords);
  renderRoute();
  renderSummary();
}

function renderRoute() {
  const r = state.route;
  if (!r || !map.getSource('route')) return;
  map.getSource('route').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: r.coords }, properties: {} });
  renderCorridor();
  renderEnds();
}

function renderEnds() {
  if (!map.getSource('ends')) return;
  const feats = [];
  const start = state.route ? state.route.coords[0] : state.from && state.from.lonlat;
  const end = state.route ? state.route.coords.at(-1) : state.to && state.to.lonlat;
  if (start) feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: start }, properties: { color: '#3dd68c' } });
  if (end) feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: end }, properties: { color: '#e5484d' } });
  map.getSource('ends').setData({ type: 'FeatureCollection', features: feats });
}

function renderCorridor() {
  const r = state.route;
  if (!r || !map.getSource('signals')) return;
  map.getSource('signals').setData({
    type: 'FeatureCollection',
    features: r.signals.map((s) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: {} })),
  });
}

function fitRoute() {
  const r = state.route;
  if (!r) return;
  const b = new maplibregl.LngLatBounds(r.coords[0], r.coords[0]);
  for (const c of r.coords) b.extend(c);
  map.fitBounds(b, { padding: sheetPadding(), pitch: 0, bearing: 0, duration: 800, maxZoom: 15 });
}

function renderSummary() {
  const r = state.route;
  $('summary').hidden = !r;
  if (!r) return;
  $('sumDist').textContent = C.fmtDist(r.distance, units());
  $('sumDur').textContent = C.fmtDuration(r.duration);
  const cov = r.coverage;
  let data;
  if (!cov) data = 'Loading traffic lights and speed limits…';
  else {
    data = `🚦 ${r.signals.length} traffic lights · speed limits on ${Math.round(cov.withLimit * 100)}% of route`;
    if (cov.loaded < 1) data += ` (loading ${Math.round(cov.loaded * 100)}%)`;
  }
  if (r.corridorError) data += ` · light/limit data incomplete: ${r.corridorError}`;
  $('sumData').textContent = data;
}

async function loadCorridor(r) {
  state.corridorAbort?.abort();
  const ctrl = new AbortController();
  state.corridorAbort = ctrl;
  const cum = C.cumulative(r.coords);
  const chunks = C.corridorChunks(r.coords, cum);
  const elements = new Map();
  r.corridorError = null;
  for (let i = 0; i < chunks.length; i++) {
    try {
      C.mergeElements(elements, await overpassChunk(state.settings.overpassUrl, chunks[i], ctrl.signal));
    } catch (e) {
      if (e.name === 'AbortError') return;
      r.corridorError = e instanceof TypeError ? 'offline' : e.message;
      if (r === state.route) renderSummary();
      return;
    }
    const m = C.matchCorridor(r.coords, cum, [...elements.values()]);
    r.speedIntervals = m.speedIntervals;
    r.signals = m.signals;
    r.coverage = { ...m.coverage, loaded: (i + 1) / chunks.length };
    if (r !== state.route) return;
    renderCorridor();
    renderSummary();
  }
  if (state.savedId && r === state.route) await S.putRoute(savedRecord(state.savedId, r));
}

// ---------- truck + settings dialogs ----------

$('btnTruck').onclick = () => {
  const f = C.truckToForm(state.truck, units());
  const im = units() === 'imperial';
  const num = (name, label, value, step) =>
    `<label>${label}<input name="${name}" type="number" inputmode="decimal" min="0" step="${step}" value="${value}" required></label>`;
  $('truckFields').innerHTML = im
    ? `<div class="row2">${num('heightFt', 'Height (ft)', f.heightFt, 1)}${num('heightIn', 'Height (in)', f.heightIn, 1)}</div>` +
      `<div class="row2">${num('width', 'Width (ft)', f.width, 0.1)}${num('length', 'Length (ft)', f.length, 0.5)}</div>` +
      `<div class="row2">${num('weight', 'Gross weight (lb)', f.weight, 500)}${num('axleload', 'Max axle load (lb)', f.axleload, 500)}</div>`
    : `<div class="row2">${num('height', 'Height (m)', f.height, 0.01)}${num('width', 'Width (m)', f.width, 0.01)}</div>` +
      `<div class="row2">${num('length', 'Length (m)', f.length, 0.1)}${num('weight', 'Gross weight (t)', f.weight, 0.1)}</div>` +
      `${num('axleload', 'Max axle load (t)', f.axleload, 0.1)}`;
  const form = $('truckForm');
  form.vehicleType.value = state.truck.vehicleType;
  form.hazmat.checked = state.truck.hazmat;
  form.avoidTolls.checked = state.truck.avoidTolls;
  form.avoidFerries.checked = state.truck.avoidFerries;
  $('dlgTruck').showModal();
};

$('dlgTruck').addEventListener('close', () => {
  if ($('dlgTruck').returnValue !== 'save') return;
  const form = $('truckForm');
  const values = Object.fromEntries(new FormData(form).entries());
  const dims = C.truckFromForm(values, units());
  const t = {
    ...state.truck,
    ...dims,
    vehicleType: form.vehicleType.value,
    hazmat: form.hazmat.checked,
    avoidTolls: form.avoidTolls.checked,
    avoidFerries: form.avoidFerries.checked,
  };
  if (!C.validTruck(t)) return setStatus('Truck profile not saved: every size must be above zero.', true);
  state.truck = t;
  S.saveTruck(t);
  truckBadge();
  if (state.route && state.to) computeRoute();
});

$('btnSettings').onclick = () => {
  const f = $('settingsForm');
  const s = state.settings;
  f.units.value = s.units;
  f.orsKey.value = s.orsKey;
  f.orsBase.value = s.orsBase;
  f.overpassUrl.value = s.overpassUrl;
  for (const k of ['voice', 'signalAlert', 'speedAlert', 'night']) f[k].checked = s[k];
  $('dlgSettings').showModal();
};

$('dlgSettings').addEventListener('close', () => {
  if ($('dlgSettings').returnValue !== 'save') return;
  const f = $('settingsForm');
  state.settings = {
    ...state.settings,
    units: f.units.value,
    orsKey: f.orsKey.value.trim(),
    orsBase: f.orsBase.value.trim().replace(/\/+$/, ''),
    overpassUrl: f.overpassUrl.value.trim(),
    voice: f.voice.checked,
    signalAlert: f.signalAlert.checked,
    speedAlert: f.speedAlert.checked,
    night: f.night.checked,
  };
  S.saveSettings(state.settings);
  applySettings();
  renderSummary();
});

function applySettings() {
  document.body.classList.toggle('night', state.settings.night);
  truckBadge();
}

// ---------- save / open / export ----------

const savedRecord = (id, r) => ({ id, name: r.name, created: r.created, route: r });

$('btnSave').onclick = async () => {
  const r = state.route;
  if (!r) return;
  state.savedId ||= `r${Date.now()}`;
  await S.putRoute(savedRecord(state.savedId, r));
  if (navigator.storage?.persist) await navigator.storage.persist();
  setStatus('Saved on this device. It opens without a connection.');
};

$('btnSaved').onclick = async () => {
  const list = $('savedList');
  list.replaceChildren();
  const rows = await S.listRoutes();
  if (!rows.length) list.innerHTML = '<li><span>No saved routes yet.</span></li>';
  for (const row of rows) {
    const li = document.createElement('li');
    const info = document.createElement('span');
    info.textContent = row.name;
    const meta = document.createElement('small');
    meta.textContent = `${C.fmtDist(row.route.distance, units())} · ${new Date(row.created).toLocaleDateString()}`;
    info.append(meta);
    const open = document.createElement('button');
    open.textContent = 'Open';
    open.onclick = () => {
      $('dlgSaved').close();
      state.savedId = row.id;
      state.to = { label: row.name.split(' → ').at(-1), lonlat: row.route.end || row.route.coords.at(-1) };
      $('to').value = state.to.label;
      setRoute(row.route);
      fitRoute();
      if (row.route.coverage && row.route.coverage.loaded < 1 && navigator.onLine) loadCorridor(row.route);
    };
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.onclick = async () => {
      await S.deleteRoute(row.id);
      if (state.savedId === row.id) state.savedId = null;
      li.remove();
    };
    li.append(info, open, del);
    list.append(li);
  }
  $('dlgSaved').showModal();
};

function fileName(name, ext) {
  const base = name.replace(/[^\p{L}\p{N}\- ]+/gu, ' ').trim().replace(/\s+/g, '_').slice(0, 60);
  return `${base || 'truck_route'}.${ext}`;
}

async function exportRoute(kind) {
  const r = state.route;
  if (!r) return;
  const gpx = kind === 'gpx';
  const text = gpx ? C.toGPX(r, r.name) : C.toGeoJSON(r, r.name);
  const file = new File([text], fileName(r.name, gpx ? 'gpx' : 'geojson'), { type: gpx ? 'application/gpx+xml' : 'application/geo+json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: r.name });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (e.name !== 'NotAllowedError' && e.name !== 'DataError') throw e;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
$('btnGpx').onclick = () => exportRoute('gpx');
$('btnGeojson').onclick = () => exportRoute('geojson');

// Download map tiles along the route into the offline cache (service worker stores them).
$('btnTiles').onclick = async () => {
  const r = state.route;
  if (!r) return;
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    return setStatus('Offline storage starts after the app is installed or reloaded once.', true);
  }
  let template = null;
  const metaUrls = [STYLE_URL];
  for (const [id, src] of Object.entries(map.getStyle().sources)) {
    if (src.type !== 'vector') continue;
    const tiles = map.getSource(id).tiles;
    if (tiles && tiles.length) {
      template = tiles[0];
      if (src.url) metaUrls.push(src.url);
      break;
    }
  }
  if (!template) return setStatus('Map style not loaded yet. Try again in a moment.', true);
  const tiles = C.tilesAlongRoute(r.coords, [6, 8, 10, 12, 14]);
  if (tiles.length > 3000 && !confirm(`${tiles.length} map tiles (roughly ${Math.round(tiles.length * 0.05)} MB). Download?`)) return;
  if (navigator.storage?.persist) await navigator.storage.persist();
  const total = tiles.length + metaUrls.length;
  const urls = [
    ...metaUrls.map((u) => `${u}${u.includes('?') ? '&' : '?'}save=1`),
    ...tiles.map(([z, x, y]) => template.replace('{z}', z).replace('{x}', x).replace('{y}', y) + '?save=1'),
  ];
  let done = 0, failed = 0;
  const worker = async () => {
    while (urls.length) {
      const u = urls.shift();
      try {
        const res = await fetch(u);
        if (!res.ok) failed++;
      } catch (e) {
        if (!(e instanceof TypeError)) throw e;
        failed++;
      }
      done++;
      if (done % 25 === 0 || !urls.length) setStatus(`Saving offline map: ${done}/${total}`);
    }
  };
  $('btnTiles').disabled = true;
  await Promise.all([worker(), worker(), worker(), worker()]);
  $('btnTiles').disabled = false;
  setStatus(failed ? `Offline map saved with ${failed} missing tiles (check connection).` : 'Offline map saved along this route.', failed > 0);
};

// ---------- navigation ----------

$('btnGo').onclick = () => startNav();
$('btnEnd').onclick = () => endNav();
$('btnRecenter').onclick = () => { if (state.nav) { state.nav.follow = true; follow(); } };
$('btnOverview').onclick = () => {
  if (!state.nav) return;
  state.nav.follow = false;
  const b = new maplibregl.LngLatBounds(state.route.coords[0], state.route.coords[0]);
  for (const c of state.route.coords) b.extend(c);
  map.fitBounds(b, { padding: { top: 140, bottom: 140, left: 40, right: 40 }, pitch: 0, bearing: 0, duration: 800 });
};
map.on('dragstart', () => { if (state.nav) state.nav.follow = false; });

function startNav() {
  if (!state.route) return;
  if (!('geolocation' in navigator)) return setStatus('This device has no location service.', true);
  state.audio ||= new AudioContext();
  state.nav = {
    hint: 0, follow: true, offCount: 0, lastReroute: 0, rerouting: false, announced: new Set(),
    signalAlerted: new Set(), overSince: 0, lastOverAlert: 0, last: null, arrived: false, center: null, bearing: 0, speed: 0,
  };
  document.body.classList.add('navigating');
  // Collapse credits to the (i) button so they don't cover the road while driving.
  document.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  $('plan').hidden = true;
  $('nav').hidden = false;
  $('spdUnit').textContent = units() === 'imperial' ? 'mph' : 'km/h';
  $('manDist').textContent = '';
  $('manText').textContent = 'Waiting for GPS…';
  $('manIcon').textContent = '…';
  $('limitSign').hidden = true;
  requestWakeLock();
  state.watchId = navigator.geolocation.watchPosition(onFix, onGeoError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
  speak(state.route.steps[0] ? state.route.steps[0].instruction : 'Starting route');
}

function endNav() {
  if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;
  state.nav = null;
  state.wakeLock?.release();
  state.wakeLock = null;
  speechSynthesis.cancel();
  puck.remove();
  document.body.classList.remove('navigating');
  $('nav').hidden = true;
  $('plan').hidden = false;
  $('offRoute').hidden = true;
  map.easeTo({ padding: { top: 0, bottom: 0, left: 0, right: 0 }, pitch: 0, bearing: 0, duration: 0 });
  fitRoute();
}

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    state.wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) {
    if (e.name !== 'NotAllowedError') throw e;
  }
}
document.addEventListener('visibilitychange', () => {
  if (state.nav && document.visibilityState === 'visible') requestWakeLock();
});

function onGeoError(err) {
  if (!state.nav) return;
  $('manText').textContent = err.code === 1 ? 'Location permission denied' : 'Waiting for GPS…';
}

function zoomForSpeed(v) {
  if (v < 8) return 17;
  if (v < 20) return 16;
  if (v < 28) return 15.5;
  return 15;
}

function follow() {
  const n = state.nav;
  if (!n || !n.center) return;
  const h = window.innerHeight;
  map.easeTo({
    center: n.center, bearing: n.bearing, pitch: 60, zoom: zoomForSpeed(n.speed), duration: 900, easing: (t) => t,
    padding: { top: Math.round(h * 0.45), bottom: 90, left: 0, right: 0 },
  });
}

function onFix(pos) {
  const n = state.nav;
  const r = state.route;
  if (!n || !r) return;
  const p = [pos.coords.longitude, pos.coords.latitude];
  let speed = pos.coords.speed;
  if (!(speed >= 0) && n.last) {
    const dt = (pos.timestamp - n.last.t) / 1000;
    speed = dt > 0 ? C.haversine(n.last.p, p) / dt : 0;
  }
  speed = speed >= 0 ? speed : 0;
  n.last = { p, t: pos.timestamp };
  n.speed = speed;

  const snap = C.snapToRoute(r.coords, state.cum, p, n.hint);
  const limitM = Math.max(40, Math.min(100, pos.coords.accuracy * 1.5));
  const onRoute = snap.dist <= limitM;
  n.offCount = onRoute ? 0 : n.offCount + 1;
  if (onRoute) n.hint = snap.index;
  $('offRoute').hidden = n.offCount < 3;
  if (n.offCount >= 3) reroute(p);

  n.center = onRoute ? snap.point : p;
  const heading = pos.coords.heading;
  n.bearing = onRoute ? snap.bearing : Number.isFinite(heading) && speed > 2 ? heading : n.bearing;
  puck.setLngLat(n.center).setRotation(n.bearing);
  if (!n.puckShown) {
    puck.addTo(map);
    n.puckShown = true;
  }
  if (n.follow) follow();

  const u = units();
  const prog = C.navProgress(r.steps, state.cum, snap.along);
  const next = prog.next;
  if (prog.remainingDist < 30 && !n.arrived) {
    n.arrived = true;
    speak('You have arrived');
  }
  if (n.arrived) {
    $('manIcon').textContent = '◎';
    $('manDist').textContent = 'Arrived';
    $('manText').textContent = state.to ? state.to.label : '';
  } else {
    const target = next || prog.step;
    $('manIcon').textContent = C.MANEUVER_ICON[target.type] || '↑';
    $('manDist').textContent = C.fmtDist(prog.distToNext, u);
    $('manText').textContent = target.instruction;
    announce(prog, speed);
  }

  $('spdVal').textContent = C.speedValue(speed, u);
  const eta = new Date(Date.now() + prog.remainingDur * 1000);
  $('eta').textContent = eta.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  $('remain').textContent = `${C.fmtDist(prog.remainingDist, u)} · ${C.fmtDuration(prog.remainingDur)}`;

  const limit = C.limitAt(r.speedIntervals, snap.along);
  const sign = $('limitSign');
  sign.hidden = !limit;
  if (limit) {
    sign.className = `sign ${limit.unit === 'mph' ? 'us' : 'eu'}${limit.hgv ? ' truck' : ''}`;
    $('limitVal').textContent = limit.value;
  }
  const over = !!limit && speed * 3.6 > limit.kmh + 5;
  $('speedNow').classList.toggle('over', over);
  const now = Date.now();
  if (over) {
    n.overSince ||= now;
    if (state.settings.speedAlert && now - n.overSince > 4000 && now - n.lastOverAlert > 30000) {
      n.lastOverAlert = now;
      beep([880, 880], 0.12);
    }
  } else n.overSince = 0;

  const sig = C.nextSignal(r.signals, snap.along);
  const light = $('nextLight');
  if (!r.coverage) light.textContent = 'Traffic lights: loading…';
  else if (!sig) light.textContent = 'No more lights';
  else {
    const d = sig.along - snap.along;
    light.textContent = `🚦 Light in ${C.fmtDist(Math.max(0, d), u)}`;
    const close = d <= Math.max(150, speed * 10);
    light.classList.toggle('close', close);
    if (close && state.settings.signalAlert && !n.signalAlerted.has(sig.id)) {
      n.signalAlerted.add(sig.id);
      beep([660, 990], 0.1);
      if (state.settings.voice) speak('Traffic light ahead');
    }
  }
}

function announce(prog, speed) {
  const n = state.nav;
  if (!state.settings.voice || !prog.next) return;
  const id = prog.stepIndex + 1;
  const d = prog.distToNext;
  const t = d / Math.max(speed, 8);
  if (t <= 12 || d < 60) {
    if (!n.announced.has(`${id}:now`)) {
      n.announced.add(`${id}:now`);
      n.announced.add(`${id}:far`);
      speak(prog.next.instruction);
    }
  } else if (t <= 60 && d > 250 && !n.announced.has(`${id}:far`)) {
    n.announced.add(`${id}:far`);
    speak(`In ${C.spokenDist(d, units())}, ${prog.next.instruction}`);
  }
}

async function reroute(p) {
  const n = state.nav;
  if (!n || n.rerouting || Date.now() - n.lastReroute < 15000 || !navigator.onLine) return;
  n.rerouting = true;
  n.lastReroute = Date.now();
  try {
    const data = await routeTruck({
      base: state.settings.orsBase,
      key: state.settings.orsKey,
      points: [p, state.route.end],
      truck: state.truck,
      language: lang(),
    });
    if (state.nav !== n) return;
    const r = C.routeFromORS(data, state.truck);
    r.name = state.route.name;
    r.start = p;
    r.end = state.route.end;
    state.savedId = null;
    setRoute(r);
    Object.assign(n, { hint: 0, offCount: 0, announced: new Set() });
    $('offRoute').hidden = true;
    speak('Route updated');
    loadCorridor(r);
  } catch (e) {
    $('offRoute').textContent = `Off route — ${e.message}`;
  } finally {
    n.rerouting = false;
  }
}

function speak(text) {
  if (!state.settings.voice || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = navigator.language || 'en-US';
  speechSynthesis.speak(u);
}

function beep(freqs, dur) {
  const ctx = state.audio;
  if (!ctx) return;
  ctx.resume();
  freqs.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    g.gain.value = 0.25;
    o.connect(g).connect(ctx.destination);
    const t0 = ctx.currentTime + i * (dur + 0.05);
    o.start(t0);
    o.stop(t0 + dur);
  });
}

// ---------- startup ----------

applySettings();
if (!state.settings.orsKey) setStatus('First step: add your free openrouteservice key in ⚙ Settings.');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
window.trucknav = { state, map };
