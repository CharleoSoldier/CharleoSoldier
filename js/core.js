// Pure logic shared by the app and the tests. No DOM access.
// All coordinates are [lon, lat]; distances are meters; durations are seconds.

const EARTH_R = 6371008.8;
const D2R = Math.PI / 180;

export const M_PER_MI = 1609.344;
export const M_PER_FT = 0.3048;
export const KG_PER_LB = 0.45359237;
export const KMH_PER_MPH = 1.609344;

// ---------- geometry ----------

export function haversine(a, b) {
  const dLat = (b[1] - a[1]) * D2R;
  const dLon = (b[0] - a[0]) * D2R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function bearing(a, b) {
  const p1 = a[1] * D2R;
  const p2 = b[1] * D2R;
  const dl = (b[0] - a[0]) * D2R;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / D2R + 360) % 360;
}

export function angleDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Distance from p to segment a-b in a local flat projection (accurate at road scale).
export function projectToSegment(p, a, b) {
  const k = Math.cos(p[1] * D2R);
  const ax = (a[0] - p[0]) * k, ay = a[1] - p[1];
  const bx = (b[0] - p[0]) * k, by = b[1] - p[1];
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : -(ax * dx + ay * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + t * dx, qy = ay + t * dy;
  return {
    t,
    dist: Math.hypot(qx, qy) * D2R * EARTH_R,
    point: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])],
  };
}

export function cumulative(coords) {
  const cum = new Float64Array(coords.length);
  for (let i = 1; i < coords.length; i++) cum[i] = cum[i - 1] + haversine(coords[i - 1], coords[i]);
  return cum;
}

export function pointAt(coords, cum, along) {
  if (along <= 0) return coords[0];
  const last = coords.length - 1;
  if (along >= cum[last]) return coords[last];
  let lo = 0, hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= along) lo = mid; else hi = mid;
  }
  const len = cum[hi] - cum[lo];
  const t = len > 0 ? (along - cum[lo]) / len : 0;
  const a = coords[lo], b = coords[hi];
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

export function sliceLine(coords, cum, from, to) {
  const out = [pointAt(coords, cum, from)];
  for (let i = 0; i < coords.length; i++) if (cum[i] > from && cum[i] < to) out.push(coords[i]);
  out.push(pointAt(coords, cum, to));
  return out;
}

// Snap a position onto the route. Searches a window around `hint` first, then the whole line.
export function snapToRoute(coords, cum, pos, hint = 0, back = 10, ahead = 600) {
  let best = null;
  const scan = (from, to) => {
    const end = Math.min(coords.length - 1, to);
    for (let i = Math.max(0, from); i < end; i++) {
      const pr = projectToSegment(pos, coords[i], coords[i + 1]);
      if (!best || pr.dist < best.dist) best = { ...pr, index: i };
    }
  };
  scan(hint - back, hint + ahead);
  if (!best || best.dist > 60) scan(0, coords.length - 1);
  const seg = cum[best.index + 1] - cum[best.index];
  return {
    index: best.index,
    t: best.t,
    point: best.point,
    dist: best.dist,
    along: cum[best.index] + best.t * seg,
    bearing: bearing(coords[best.index], coords[best.index + 1]),
  };
}

// Douglas-Peucker with a tolerance in meters; returns kept indices in order.
export function simplifyIndices(coords, tol) {
  const n = coords.length;
  if (n <= 2) return [...Array(n).keys()];
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = -1, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = projectToSegment(coords[i], coords[s], coords[e]).dist;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(i);
  return out;
}

// Grid of line segments for fast "what is near this point" lookups.
export class SegmentGrid {
  constructor(cell = 0.002) {
    this.cell = cell;
    this.cells = new Map();
  }
  add(item, a, b) {
    const c = this.cell;
    const x0 = Math.floor(Math.min(a[0], b[0]) / c), x1 = Math.floor(Math.max(a[0], b[0]) / c);
    const y0 = Math.floor(Math.min(a[1], b[1]) / c), y1 = Math.floor(Math.max(a[1], b[1]) / c);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const k = x + ':' + y;
        const list = this.cells.get(k);
        if (list) list.push(item); else this.cells.set(k, [item]);
      }
    }
  }
  near(p) {
    const c = this.cell;
    const cx = Math.floor(p[0] / c), cy = Math.floor(p[1] / c);
    const out = [];
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let y = cy - 1; y <= cy + 1; y++) {
        const list = this.cells.get(x + ':' + y);
        if (list) for (const it of list) out.push(it);
      }
    }
    return out;
  }
}

// ---------- OpenStreetMap corridor data (speed limits + traffic signals) ----------

export const DRIVABLE =
  'motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street|road|' +
  'motorway_link|trunk_link|primary_link|secondary_link|tertiary_link';

// Split the route into simplified polylines small enough for one Overpass request each.
export function corridorChunks(coords, cum, chunkMeters = 25000, tol = 3, maxPoints = 300) {
  const idx = simplifyIndices(coords, tol);
  const lastIdx = idx[idx.length - 1];
  const chunks = [];
  let cur = [];
  let start = 0;
  for (const i of idx) {
    cur.push(coords[i]);
    if (i !== lastIdx && (cum[i] - start >= chunkMeters || cur.length >= maxPoints)) {
      chunks.push(cur);
      cur = [coords[i]];
      start = cum[i];
    }
  }
  if (cur.length >= 2) chunks.push(cur);
  return chunks;
}

export function overpassQuery(points, radius = 12) {
  const poly = points.map((p) => `${p[1].toFixed(6)},${p[0].toFixed(6)}`).join(',');
  return (
    `[out:json][timeout:90];` +
    `way[highway~"^(${DRIVABLE})$"](around:${radius},${poly})->.w;` +
    `.w out body geom;` +
    `node(w.w)[highway=traffic_signals];out body;`
  );
}

// OSM maxspeed value -> { kmh, value, unit } or null when unknown/implicit ("none", "DE:urban", "50;30").
export function parseMaxspeed(raw) {
  if (raw == null) return null;
  const m = String(raw).trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(mph|km\/h|kmh|kph)?$/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!(value > 0)) return null;
  const unit = m[2] === 'mph' ? 'mph' : 'km/h';
  return { kmh: unit === 'mph' ? value * KMH_PER_MPH : value, value, unit };
}

// Truck-specific tags win over general ones; direction-specific tags win over plain ones.
export function selectLimit(tags, forward) {
  const dir = forward ? 'forward' : 'backward';
  for (const key of [`maxspeed:hgv:${dir}`, 'maxspeed:hgv', `maxspeed:${dir}`, 'maxspeed']) {
    const p = parseMaxspeed(tags[key]);
    if (p) return { ...p, tag: key, hgv: key.startsWith('maxspeed:hgv') };
  }
  return null;
}

function wayPt(g) {
  return g ? [g.lon, g.lat] : null;
}

const limitKey = (l) => (l ? `${l.value}|${l.unit}|${l.hgv ? 1 : 0}` : 'none');

// Match Overpass elements onto the route geometry.
// Returns speed-limit intervals along the route, traffic signals on the route, and coverage stats.
export function matchCorridor(coords, cum, elements, { maxDist = 4, maxAngle = 25, signalDist = 8, mergeSignals = 35 } = {}) {
  const ways = elements.filter((e) => e.type === 'way' && Array.isArray(e.geometry) && e.geometry.length > 1);
  const wayGrid = new SegmentGrid();
  ways.forEach((w, wi) => {
    for (let i = 0; i < w.geometry.length - 1; i++) {
      const a = wayPt(w.geometry[i]), b = wayPt(w.geometry[i + 1]);
      if (a && b) wayGrid.add({ wi, i }, a, b);
    }
  });

  const segMatch = new Array(Math.max(0, coords.length - 1)).fill(null);
  const matched = new Map();
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i], b = coords[i + 1];
    if (cum[i + 1] - cum[i] < 0.5) continue;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const rb = bearing(a, b);
    let best = null;
    for (const c of wayGrid.near(mid)) {
      const g = ways[c.wi].geometry;
      const p = wayPt(g[c.i]), q = wayPt(g[c.i + 1]);
      if (!p || !q) continue;
      const pr = projectToSegment(mid, p, q);
      if (pr.dist > maxDist || (best && pr.dist >= best.dist)) continue;
      const d = angleDiff(rb, bearing(p, q));
      if (d <= maxAngle) best = { dist: pr.dist, wi: c.wi, forward: true };
      else if (d >= 180 - maxAngle) best = { dist: pr.dist, wi: c.wi, forward: false };
    }
    if (best) {
      const w = ways[best.wi];
      matched.set(w.id, w);
      segMatch[i] = { limit: selectLimit(w.tags || {}, best.forward) };
    }
  }

  // Speed intervals: merge equal neighbors and absorb tiny unmatched gaps.
  const raw = [];
  for (let i = 0; i < segMatch.length; i++) {
    const from = cum[i], to = cum[i + 1];
    if (to - from <= 0) continue;
    const limit = segMatch[i] ? segMatch[i].limit : null;
    const prev = raw[raw.length - 1];
    if (prev && limitKey(prev.limit) === limitKey(limit)) prev.to = to;
    else raw.push({ from, to, limit });
  }
  const intervals = [];
  for (let i = 0; i < raw.length; i++) {
    const cur = raw[i];
    const prev = intervals[intervals.length - 1];
    const next = raw[i + 1];
    if (!cur.limit && prev && next && cur.to - cur.from < 20 && limitKey(prev.limit) === limitKey(next.limit)) {
      prev.to = next.to;
      i++;
      continue;
    }
    if (prev && limitKey(prev.limit) === limitKey(cur.limit)) prev.to = cur.to;
    else intervals.push({ ...cur });
  }

  let matchedLen = 0, limitLen = 0;
  for (let i = 0; i < segMatch.length; i++) {
    const len = cum[i + 1] - cum[i];
    if (segMatch[i]) {
      matchedLen += len;
      if (segMatch[i].limit) limitLen += len;
    }
  }

  // Traffic signals: must be a node of a way the route actually uses, close to the route,
  // and (if tagged with a direction) apply to our direction of travel.
  const routeGrid = new SegmentGrid();
  for (let i = 0; i < coords.length - 1; i++) routeGrid.add(i, coords[i], coords[i + 1]);
  const nodeWays = new Map();
  for (const w of matched.values()) {
    (w.nodes || []).forEach((nid, k) => {
      const list = nodeWays.get(nid);
      if (list) list.push({ w, k }); else nodeWays.set(nid, [{ w, k }]);
    });
  }
  const found = [];
  for (const n of elements) {
    if (n.type !== 'node' || !n.tags || n.tags.highway !== 'traffic_signals') continue;
    const owners = nodeWays.get(n.id);
    if (!owners) continue;
    const pt = [n.lon, n.lat];
    let best = null;
    for (const i of routeGrid.near(pt)) {
      const pr = projectToSegment(pt, coords[i], coords[i + 1]);
      if (pr.dist <= signalDist && (!best || pr.dist < best.dist)) best = { ...pr, i };
    }
    if (!best) continue;
    const rb = bearing(coords[best.i], coords[best.i + 1]);
    const dirTag = n.tags['traffic_signals:direction'] || n.tags.direction;
    if (dirTag === 'forward' || dirTag === 'backward') {
      let own = null;
      for (const o of owners) {
        const g = o.w.geometry;
        const a = wayPt(g[Math.max(0, o.k - 1)]), b = wayPt(g[Math.min(g.length - 1, Math.max(1, o.k))]);
        if (!a || !b) continue;
        const d = angleDiff(rb, bearing(a, b));
        const score = Math.min(d, 180 - d);
        if (!own || score < own.score) own = { score, forward: d < 90 };
      }
      if (own && (dirTag === 'forward') !== own.forward) continue;
    }
    found.push({ id: n.id, lon: n.lon, lat: n.lat, along: cum[best.i] + best.t * (cum[best.i + 1] - cum[best.i]) });
  }
  found.sort((a, b) => a.along - b.along);
  const signals = [];
  for (const s of found) {
    const prev = signals[signals.length - 1];
    if (prev && s.along - prev.along < mergeSignals) continue;
    signals.push(s);
  }

  const total = cum[cum.length - 1] || 1;
  return {
    speedIntervals: intervals,
    signals,
    coverage: { matched: matchedLen / total, withLimit: limitLen / total },
  };
}

export function mergeElements(target, incoming) {
  for (const e of incoming) target.set(`${e.type}/${e.id}`, e);
  return target;
}

export function limitAt(intervals, along) {
  let lo = 0, hi = intervals.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const it = intervals[mid];
    if (along < it.from) hi = mid - 1;
    else if (along >= it.to) lo = mid + 1;
    else return it.limit;
  }
  return null;
}

export function nextSignal(signals, along) {
  for (const s of signals) if (s.along >= along - 3) return s;
  return null;
}

// ---------- routing (openrouteservice driving-hgv) ----------

export const VEHICLE_TYPES = ['hgv', 'goods', 'delivery', 'bus', 'agricultural', 'forestry'];

// 13'6" tall, 8'6" wide, 72 ft long, 80,000 lb gross, 20,000 lb per axle.
export const DEFAULT_TRUCK = {
  vehicleType: 'hgv',
  heightM: 4.1148,
  widthM: 2.5908,
  lengthM: 21.9456,
  weightT: 36.2874,
  axleloadT: 9.0718,
  hazmat: false,
  avoidTolls: false,
  avoidFerries: true,
};

const r2 = (n) => Math.round(n * 100) / 100;

export function orsBody(points, truck, language = 'en') {
  const avoid = [];
  if (truck.avoidTolls) avoid.push('tollways');
  if (truck.avoidFerries) avoid.push('ferries');
  const options = {
    vehicle_type: truck.vehicleType,
    profile_params: {
      restrictions: {
        height: r2(truck.heightM),
        width: r2(truck.widthM),
        length: r2(truck.lengthM),
        weight: r2(truck.weightT),
        axleload: r2(truck.axleloadT),
        hazmat: !!truck.hazmat,
      },
    },
  };
  if (avoid.length) options.avoid_features = avoid;
  return { coordinates: points, instructions: true, language, units: 'm', options };
}

export function stepsFromFeature(feature) {
  const steps = [];
  for (const seg of feature.properties.segments || []) {
    for (const s of seg.steps || []) {
      steps.push({
        type: s.type,
        instruction: s.instruction,
        name: s.name && s.name !== '-' ? s.name : '',
        distance: s.distance,
        duration: s.duration,
        from: s.way_points[0],
        to: s.way_points[1],
        exit: s.exit_number ?? null,
      });
    }
  }
  return steps;
}

// Build the in-app route object from an openrouteservice GeoJSON response.
export function routeFromORS(geojson, truck) {
  const f = geojson.features && geojson.features[0];
  if (!f) throw new Error('No route found for this truck profile');
  const coords = f.geometry.coordinates.map((c) => [c[0], c[1]]);
  return {
    coords,
    steps: stepsFromFeature(f),
    distance: f.properties.summary.distance,
    duration: f.properties.summary.duration,
    truck: { ...truck },
    attribution: (geojson.metadata && geojson.metadata.attribution) || 'openrouteservice | OpenStreetMap contributors',
    speedIntervals: [],
    signals: [],
    coverage: null,
    created: new Date().toISOString(),
  };
}

export function navProgress(steps, cum, along) {
  let k = 0;
  for (let i = 0; i < steps.length; i++) {
    if (cum[steps[i].from] <= along + 0.01) k = i;
    else break;
  }
  const cur = steps[k];
  const next = steps[k + 1] || null;
  const total = cum[cum.length - 1];
  const start = cum[cur.from], end = cum[cur.to];
  const len = end - start;
  const frac = len > 0 ? Math.min(1, Math.max(0, (along - start) / len)) : 1;
  let remainingDur = cur.duration * (1 - frac);
  for (let i = k + 1; i < steps.length; i++) remainingDur += steps[i].duration;
  return {
    stepIndex: k,
    step: cur,
    next,
    distToNext: Math.max(0, (next ? cum[next.from] : total) - along),
    remainingDist: Math.max(0, total - along),
    remainingDur,
  };
}

// openrouteservice instruction type -> arrow glyph
export const MANEUVER_ICON = {
  0: '←', 1: '→', 2: '↙', 3: '↘', 4: '↖', 5: '↗', 6: '↑',
  7: '⟳', 8: '↗', 9: '↶', 10: '◎', 11: '↑', 12: '↖', 13: '↗',
};

// ---------- units and formatting ----------

export function fmtDist(m, units) {
  if (units === 'imperial') {
    const mi = m / M_PER_MI;
    if (mi >= 10) return `${Math.round(mi)} mi`;
    if (mi >= 0.1) return `${mi.toFixed(1)} mi`;
    return `${Math.max(0, Math.round(m / M_PER_FT / 50) * 50)} ft`;
  }
  if (m >= 10000) return `${Math.round(m / 1000)} km`;
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.max(0, Math.round(m / 10) * 10)} m`;
}

export function spokenDist(m, units) {
  if (units === 'imperial') {
    const mi = m / M_PER_MI;
    if (mi >= 0.95) return `${mi >= 10 ? Math.round(mi) : mi.toFixed(1)} miles`;
    if (mi >= 0.2) return `${(Math.round(mi * 4) / 4).toString()} miles`;
    return `${Math.max(50, Math.round(m / M_PER_FT / 100) * 100)} feet`;
  }
  if (m >= 950) return `${(m / 1000).toFixed(1)} kilometers`;
  return `${Math.max(50, Math.round(m / 50) * 50)} meters`;
}

export function fmtDuration(s) {
  const total = Math.max(0, Math.round(s / 60));
  const h = Math.floor(total / 60), m = total % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function speedValue(mps, units) {
  return Math.round(units === 'imperial' ? (mps * 3.6) / KMH_PER_MPH : mps * 3.6);
}

// Truck dimensions are stored metric; these convert for the form.
export function truckToForm(t, units) {
  if (units === 'imperial') {
    const totalIn = Math.round(t.heightM / 0.0254);
    return {
      heightFt: Math.floor(totalIn / 12),
      heightIn: totalIn % 12,
      width: r2(t.widthM / M_PER_FT),
      length: r2(t.lengthM / M_PER_FT),
      weight: Math.round((t.weightT * 1000) / KG_PER_LB),
      axleload: Math.round((t.axleloadT * 1000) / KG_PER_LB),
    };
  }
  return { height: r2(t.heightM), width: r2(t.widthM), length: r2(t.lengthM), weight: r2(t.weightT), axleload: r2(t.axleloadT) };
}

export function truckFromForm(f, units) {
  if (units === 'imperial') {
    return {
      heightM: (Number(f.heightFt) * 12 + Number(f.heightIn)) * 0.0254,
      widthM: Number(f.width) * M_PER_FT,
      lengthM: Number(f.length) * M_PER_FT,
      weightT: (Number(f.weight) * KG_PER_LB) / 1000,
      axleloadT: (Number(f.axleload) * KG_PER_LB) / 1000,
    };
  }
  return {
    heightM: Number(f.height),
    widthM: Number(f.width),
    lengthM: Number(f.length),
    weightT: Number(f.weight),
    axleloadT: Number(f.axleload),
  };
}

export function validTruck(t) {
  return ['heightM', 'widthM', 'lengthM', 'weightT', 'axleloadT'].every((k) => Number.isFinite(t[k]) && t[k] > 0);
}

// ---------- export ----------

const xml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const ll = (p) => `lat="${p[1].toFixed(6)}" lon="${p[0].toFixed(6)}"`;

export function toGPX(route, name) {
  const t = route.truck;
  const out = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push(
    '<gpx version="1.1" creator="TruckNav" xmlns="http://www.topografix.com/GPX/1/1" ' +
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
      'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" ' +
      'xmlns:tn="urn:trucknav:gpx:1">'
  );
  out.push(`<metadata><name>${xml(name)}</name><desc>${xml(route.attribution)}</desc><time>${route.created}</time>`);
  out.push(
    `<extensions><tn:truck vehicleType="${xml(t.vehicleType)}" heightM="${r2(t.heightM)}" widthM="${r2(t.widthM)}" ` +
      `lengthM="${r2(t.lengthM)}" weightT="${r2(t.weightT)}" axleloadT="${r2(t.axleloadT)}" hazmat="${!!t.hazmat}" ` +
      `avoidTolls="${!!t.avoidTolls}" avoidFerries="${!!t.avoidFerries}"/></extensions></metadata>`
  );
  for (const s of route.signals) {
    out.push(`<wpt ${ll([s.lon, s.lat])}><name>Traffic signal</name><type>traffic_signals</type></wpt>`);
  }
  out.push(`<rte><name>${xml(name)}</name>`);
  for (const s of route.steps) {
    out.push(`<rtept ${ll(route.coords[s.from])}><name>${xml(s.instruction)}</name><type>${s.type}</type></rtept>`);
  }
  out.push('</rte>');
  out.push(`<trk><name>${xml(name)}</name><extensions><tn:speedLimits>`);
  for (const it of route.speedIntervals) {
    if (!it.limit) continue;
    out.push(
      `<tn:limit fromM="${Math.round(it.from)}" toM="${Math.round(it.to)}" value="${it.limit.value}" ` +
        `unit="${xml(it.limit.unit)}" tag="${xml(it.limit.tag)}"/>`
    );
  }
  out.push('</tn:speedLimits></extensions><trkseg>');
  for (const c of route.coords) out.push(`<trkpt ${ll(c)}/>`);
  out.push('</trkseg></trk></gpx>');
  return out.join('\n');
}

export function toGeoJSON(route, name) {
  const cum = cumulative(route.coords);
  const features = [
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: route.coords },
      properties: {
        kind: 'route',
        name,
        distance_m: Math.round(route.distance),
        duration_s: Math.round(route.duration),
        truck: route.truck,
        steps: route.steps.map((s) => ({ type: s.type, instruction: s.instruction, distance_m: s.distance, at: route.coords[s.from] })),
        attribution: route.attribution,
        created: route.created,
      },
    },
  ];
  for (const it of route.speedIntervals) {
    if (!it.limit) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: sliceLine(route.coords, cum, it.from, it.to) },
      properties: { kind: 'speed_limit', value: it.limit.value, unit: it.limit.unit, kmh: Math.round(it.limit.kmh), osm_tag: it.limit.tag },
    });
  }
  for (const s of route.signals) {
    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { kind: 'traffic_signal', osm_node: s.id } });
  }
  return JSON.stringify({ type: 'FeatureCollection', features });
}

// ---------- offline map tiles ----------

export function lonLatToTile(lon, lat, z) {
  const n = 2 ** z;
  const latR = Math.max(-85.0511, Math.min(85.0511, lat)) * D2R;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n);
  return [Math.min(n - 1, Math.max(0, x)), Math.min(n - 1, Math.max(0, y))];
}

export function tilesAlongRoute(coords, zooms) {
  const keys = new Set();
  const out = [];
  for (const z of zooms) {
    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i], b = coords[i + 1];
      const tileM = (40075016.686 * Math.cos(a[1] * D2R)) / 2 ** z;
      const steps = Math.max(1, Math.ceil(haversine(a, b) / (tileM / 3)));
      for (let s = 0; s <= steps; s++) {
        const p = [a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps];
        const [x, y] = lonLatToTile(p[0], p[1], z);
        const k = `${z}/${x}/${y}`;
        if (!keys.has(k)) {
          keys.add(k);
          out.push([z, x, y]);
        }
      }
    }
  }
  return out;
}
