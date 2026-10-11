// The whole hawker centre, laid out for the customer mode: stalls, tables, aisles, entrances, tray
// returns. Inside the real building outline from OpenStreetMap when we have one (data/hawker-footprints.json),
// with NEA's count of cooked food stalls. The outline and the count are real; where the stalls and tables
// go inside is our arrangement, in the patterns hawker centres use: stalls in rows facing aisles, islands of
// stalls back to back, seating in between. Pure data, no Three.js, so it can be tested.
//
// Units are metres. The plan is turned so the building's long side runs along x; z runs towards the camera.

import { LEVELS } from "./levels.js";

export const CELL = 0.5; // metres per grid cell
export const STALL_W = 3; // frontage
export const STALL_D = 3; // depth, counter included
const AISLE = 2.5; // in front of a stall row: room to queue and to walk past the queue
const PITCH = 2.7; // table to table
const MARGIN = 10; // open ground around the building
const GAP_EVERY = 6; // a cross aisle after this many stalls in a row
const GAP = 2.5; // stall sizes, aisles and gaps are all whole cells, so rows line up with the grid

// Grid codes.
export const OUT = 0; // open ground outside
export const FLOOR = 1; // inside, walkable
export const STALL = 2;
export const THING = 3; // tables, columns, tray returns
export const WALL = 4;
export const walkable = (c) => c === OUT || c === FLOOR;

// What each stall hangs over its counter, by menu.
export const SIGNS = {
  chickenrice: "CHICKEN RICE",
  friednoodles: "FRIED KWAY TEOW",
  noodlesoup: "WANTON MEE",
  malay: "NASI LEMAK",
  prata: "ROTI PRATA",
  dessert: "DESSERT",
  riceplates: "ROAST MEAT",
  soups: "BAK KUT TEH",
  mamak: "MEE GORENG",
  padang: "NASI PADANG",
  seafood: "BBQ SEAFOOD",
  noodlesoups: "LOR MEE",
  biryani: "BRIYANI",
  snacks: "ROJAK POPIAH",
  drinks: "DRINKS",
};

// Menus a customer can buy from. Each cooking stall sells its kitchen's dishes; drinks stalls pull kopi in
// kopi code and pour soya bean milk.
export const STALL_MENUS = [
  ...LEVELS.map((l) => ({ id: l.id, sign: SIGNS[l.id] ?? l.name.toUpperCase(), dishes: l.dishes.filter((d) => d !== "drink") })),
  { id: "drinks", sign: SIGNS.drinks, dishes: ["drink", "soya"] },
];
export const menuById = (id) => STALL_MENUS.find((m) => m.id === id) ?? STALL_MENUS[0];

function rng(seed) {
  let s = Math.abs(Math.floor(seed)) % 2147483646 || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function hashString(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return Math.abs(h) || 1;
}

// ---------- Geometry ----------

export function polygonArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % poly.length];
    a += x1 * z2 - x2 * z1;
  }
  return Math.abs(a) / 2;
}

export function insidePolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

const rotate = ([x, z], a) => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];

// The turn that lines the building's smallest bounding rectangle up with the axes, long side along x.
export function alignAngle(poly) {
  const h = hull(poly);
  let best = { area: Infinity, a: 0, wide: true };
  for (let i = 0; i < h.length; i++) {
    const [x1, z1] = h[i];
    const [x2, z2] = h[(i + 1) % h.length];
    const a = -Math.atan2(z2 - z1, x2 - x1);
    const r = h.map((p) => rotate(p, a));
    const xs = r.map((p) => p[0]);
    const zs = r.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const d = Math.max(...zs) - Math.min(...zs);
    if (w * d < best.area - 1e-6) best = { area: w * d, a, wide: w >= d };
  }
  return best.wide ? best.a : best.a + Math.PI / 2;
}

function bounds(poly) {
  const xs = poly.map((p) => p[0]);
  const zs = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

const regular = (n, r, turn = 0) => Array.from({ length: n }, (_, i) => [Math.cos(turn + (i / n) * Math.PI * 2) * r, Math.sin(turn + (i / n) * Math.PI * 2) * r]);
const rect = (w, d) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];

// Floor space per cooked food stall, seating included. A game figure, in the range real centres show.
const PER_STALL = { pavilion: 40, market: 42, complex: 40, octagon: 44, openair: 44, artdeco: 40, modern: 44 };

// An outline for a centre with no OpenStreetMap match: a rectangle (or an octagon) sized for its stalls.
export function syntheticOutline(stalls, archetype) {
  const area = Math.max(400, stalls * (PER_STALL[archetype] ?? 24));
  if (archetype === "octagon") return regular(8, Math.sqrt(area / (2 * Math.SQRT2)), Math.PI / 8);
  const d = Math.sqrt(area / 1.7);
  return rect(d * 1.7, d);
}

// ---------- The grid ----------

class Grid {
  constructor(x0, z0, w, h) {
    this.x0 = x0;
    this.z0 = z0;
    this.w = w;
    this.h = h;
    this.c = new Uint8Array(w * h);
  }
  at(i, j) {
    return i < 0 || j < 0 || i >= this.w || j >= this.h ? WALL : this.c[j * this.w + i];
  }
  set(i, j, v) {
    if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.c[j * this.w + i] = v;
  }
  cellOf(x, z) {
    return [Math.floor((x - this.x0) / CELL), Math.floor((z - this.z0) / CELL)];
  }
  centre(i, j) {
    return [this.x0 + (i + 0.5) * CELL, this.z0 + (j + 0.5) * CELL];
  }
  // Every cell of an axis-aligned box (metres) satisfies test.
  every(x0, z0, x1, z1, test) {
    const [i0, j0] = this.cellOf(x0 + 1e-6, z0 + 1e-6);
    const [i1, j1] = this.cellOf(x1 - 1e-6, z1 - 1e-6);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (!test(this.at(i, j))) return false;
    return true;
  }
  fill(x0, z0, x1, z1, v) {
    const [i0, j0] = this.cellOf(x0 + 1e-6, z0 + 1e-6);
    const [i1, j1] = this.cellOf(x1 - 1e-6, z1 - 1e-6);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.set(i, j, v);
  }
  fillCircle(x, z, r, v) {
    this.fill(x - r, z - r, x + r, z + r, v);
  }
  clone() {
    const g = new Grid(this.x0, this.z0, this.w, this.h);
    g.c.set(this.c);
    return g;
  }
}

// ---------- Stall rows ----------

const RESERVED = 5; // an aisle kept clear while laying out; walkable floor in the end
const OUT_RESERVED = 7; // the same outside the building
const OUT_ZONE = 8; // room kept round a table outside
// Open-sided centres seat people outside under umbrellas too (Newton, Chomp Chomp, East Coast Lagoon).
const OUTDOOR = 6;
const SEATS_OUTSIDE = new Set(["pavilion", "openair", "octagon"]);

// Inside stretches of a band, as [from, to] runs: along x for a horizontal band [z0, z1], along z for a
// vertical band [x0, x1].
function runs(grid, a0, a1, axis, fits = (c) => c === FLOOR) {
  const out = [];
  const [i0, j0] = grid.cellOf(a0 + 1e-6, a0 + 1e-6);
  const [i1, j1] = grid.cellOf(a1 - 1e-6, a1 - 1e-6);
  const n = axis === "x" ? grid.w : grid.h;
  let start = null;
  for (let k = 0; k <= n; k++) {
    let ok = k < n;
    if (axis === "x") for (let j = j0; ok && j <= j1; j++) ok = fits(grid.at(k, j));
    else for (let i = i0; ok && i <= i1; i++) ok = fits(grid.at(i, k));
    if (ok && start === null) start = k;
    if (!ok && start !== null) {
      const base = axis === "x" ? grid.x0 : grid.z0;
      out.push([base + start * CELL, base + k * CELL]);
      start = null;
    }
  }
  return out;
}

// Slots along one row of stalls. `at` is the band's near edge; face is the way the counters look.
// Leaves cross aisles every few stalls so nobody walks the long way round.
function rowSlots(grid, at, face) {
  const axis = face[0] === 0 ? "x" : "z"; // stalls facing along z sit in a row along x
  const out = [];
  for (const [a, b] of runs(grid, at, at + STALL_D, axis)) {
    const len = b - a;
    let count = Math.floor(len / STALL_W);
    if (count < 2) continue;
    let gaps = Math.max(0, Math.ceil(count / GAP_EVERY) - 1);
    count = Math.floor((len - gaps * GAP) / STALL_W);
    gaps = Math.max(0, Math.ceil(count / GAP_EVERY) - 1);
    if (count < 2) continue;
    const used = count * STALL_W + gaps * GAP;
    let u = a + Math.floor((len - used) / 2 / CELL) * CELL;
    for (let k = 0; k < count; k++) {
      const along = u + STALL_W / 2;
      const across = at + STALL_D / 2;
      out.push(axis === "x" ? { x: along, z: across, face } : { x: across, z: along, face });
      u += STALL_W;
      if ((k + 1) % GAP_EVERY === 0 && k < count - 1) u += GAP;
    }
  }
  return out;
}

// The box a stall and the aisle in front of it take up.
function stallBox(s, aisle = 0) {
  const [fx, fz] = s.face;
  const hw = (fx === 0 ? STALL_W : STALL_D) / 2;
  const hd = (fx === 0 ? STALL_D : STALL_W) / 2;
  let [x0, z0, x1, z1] = [s.x - hw, s.z - hd, s.x + hw, s.z + hd];
  if (fz > 0) z1 += aisle;
  if (fz < 0) z0 -= aisle;
  if (fx > 0) x1 += aisle;
  if (fx < 0) x0 -= aisle;
  return [x0, z0, x1, z1];
}

// One way of filling the hall: optional stall rows down both ends, a row along the back wall, islands
// of stalls back to back, an optional row along the front wall. Returns the stall slots and the grid with
// stalls and their aisles marked.
function layoutOption(base, bb, { islands, frontRow, sides, doorsClear }) {
  const grid = base.clone();
  const slots = [];
  const place = (list) => {
    for (const s of list) {
      if (!doorsClear(s)) continue;
      const [x0, z0, x1, z1] = stallBox(s);
      if (!grid.every(x0, z0, x1, z1, (c) => c === FLOOR)) continue;
      // A counter needs open floor in front of it: two metres, for the queue.
      const [fx, fz] = s.face;
      const front = fz > 0 ? [x0, z1, x1, z1 + 2] : fz < 0 ? [x0, z0 - 2, x1, z0] : fx > 0 ? [x1, z0, x1 + 2, z1] : [x0 - 2, z0, x0, z1];
      if (!grid.every(...front, (c) => c === FLOOR || c === RESERVED)) continue;
      grid.fill(x0, z0, x1, z1, STALL);
      const [ax0, az0, ax1, az1] = stallBox(s, AISLE);
      const [sx0, sz0, sx1, sz1] = [x0, z0, x1, z1];
      // The aisle: reserved so no other stall or table lands in it.
      const [i0, j0] = grid.cellOf(ax0 + 1e-6, az0 + 1e-6);
      const [i1, j1] = grid.cellOf(ax1 - 1e-6, az1 - 1e-6);
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const [x, z] = grid.centre(i, j);
          if (x > sx0 && x < sx1 && z > sz0 && z < sz1) continue;
          if (grid.at(i, j) === FLOOR) grid.set(i, j, RESERVED);
        }
      }
      slots.push(s);
    }
    // Cross aisles: the gaps between groups of stalls in this row stay clear of tables.
    const placed = list.filter((s) => slots.includes(s));
    const alongX = placed[0]?.face[0] === 0;
    const key = (s) => (alongX ? s.x : s.z);
    placed.sort((a, b) => key(a) - key(b));
    for (let k = 1; k < placed.length; k++) {
      const a = placed[k - 1];
      const b = placed[k];
      const gap = key(b) - key(a) - STALL_W;
      if (gap < 0.4 || gap > GAP + 0.6) continue;
      const [ax0, az0, ax1, az1] = stallBox(a, AISLE);
      const [bx0, bz0, bx1, bz1] = stallBox(b, AISLE);
      const box = alongX ? [ax1, Math.min(az0, bz0), bx0, Math.max(az1, bz1)] : [Math.min(ax0, bx0), az1, Math.max(ax1, bx1), bz0];
      const [i0, j0] = grid.cellOf(box[0] + 1e-6, box[1] + 1e-6);
      const [i1, j1] = grid.cellOf(box[2] - 1e-6, box[3] - 1e-6);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (grid.at(i, j) === FLOOR) grid.set(i, j, RESERVED);
    }
  };
  const z0 = bb.z0 + CELL;
  const z1 = bb.z1 - CELL;
  const x0 = bb.x0 + CELL;
  const x1 = bb.x1 - CELL;
  const depth = z1 - z0;
  const fixed = STALL_D + AISLE + (frontRow ? STALL_D + AISLE : 0) + islands * (2 * STALL_D + 2 * AISLE);
  const seat = Math.floor((depth - fixed) / (islands + 1) / CELL) * CELL;
  if (seat < 0) return null;
  if (sides) {
    place(rowSlots(grid, x0, [1, 0]));
    place(rowSlots(grid, x1 - STALL_D, [-1, 0]));
  }
  let z = z0;
  place(rowSlots(grid, z, [0, 1]));
  z += STALL_D + AISLE;
  for (let k = 0; k < islands; k++) {
    z += seat + AISLE;
    place(rowSlots(grid, z, [0, -1]));
    place(rowSlots(grid, z + STALL_D, [0, 1]));
    z += 2 * STALL_D + AISLE;
  }
  if (frontRow) place(rowSlots(grid, z1 - STALL_D, [0, -1]));
  return { grid, slots };
}

// Tables packed into the floor that is left, row by row: each takes a 2.1 m square (table and four
// stools) and keeps PITCH from the next. Walkers squeeze between the stools.
const ZONE = 6;
function packTables(grid, bb, outdoor = false) {
  const tables = [];
  const half = 1.05;
  const keep = PITCH - half;
  const reach = outdoor ? OUTDOOR : 0;
  const fits = (c) => c === FLOOR || (outdoor && c === OUT);
  for (let z = bb.z0 - reach; z + 2 * half <= bb.z1 + reach; z += CELL) {
    for (const [a0, b0] of runs(grid, z, z + 2 * half, "x", fits)) {
      const a = Math.max(a0, bb.x0 - reach);
      const b = Math.min(b0, bb.x1 + reach);
      if (b - a < 2 * half) continue;
      const n = Math.floor((b - a - 2 * half) / PITCH) + 1;
      if (n < 1) continue;
      const used = (n - 1) * PITCH + 2 * half;
      let x = a + (b - a - used) / 2 + half;
      const tz = z + half;
      for (let k = 0; k < n; k++, x += PITCH) {
        // Half a metre clear of walls and stalls all round, so people can walk past the stools.
        const m = half + 0.5;
        if (!grid.every(x - m, tz - m, x + m, tz + m, (c) => c === FLOOR || c === ZONE || c === RESERVED || c === OUT || c === OUT_ZONE || c === OUT_RESERVED)) continue;
        const outside = grid.at(...grid.cellOf(x, tz)) === OUT;
        tables.push({ id: tables.length, x, z: tz, outside, seats: [[x, tz - 0.85], [x + 0.85, tz], [x, tz + 0.85], [x - 0.85, tz]] });
        const [i0, j0] = grid.cellOf(x - keep + 1e-6, tz - keep + 1e-6);
        const [i1, j1] = grid.cellOf(x + keep - 1e-6, tz + keep - 1e-6);
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            if (grid.at(i, j) === FLOOR) grid.set(i, j, ZONE);
            else if (grid.at(i, j) === OUT) grid.set(i, j, OUT_ZONE);
          }
        }
      }
    }
  }
  for (let k = 0; k < grid.c.length; k++) {
    if (grid.c[k] === ZONE) grid.c[k] = FLOOR;
    else if (grid.c[k] === OUT_ZONE) grid.c[k] = OUT;
  }
  return tables;
}

// Too many stalls for the building's count: the ones furthest from the middle become seating.
function trimSlots(grid, slots, target, bb) {
  if (slots.length <= target) return slots;
  const order = slots.map((s, k) => [Math.hypot(s.x / (bb.x1 - bb.x0), s.z / (bb.z1 - bb.z0)) + k * 1e-6, k]).sort((a, b) => b[0] - a[0]);
  const drop = new Set(order.slice(0, slots.length - target).map(([, k]) => k));
  for (const k of drop) {
    const [x0, z0, x1, z1] = stallBox(slots[k], AISLE);
    const [i0, j0] = grid.cellOf(x0 + 1e-6, z0 + 1e-6);
    const [i1, j1] = grid.cellOf(x1 - 1e-6, z1 - 1e-6);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (grid.at(i, j) === STALL || grid.at(i, j) === RESERVED) grid.set(i, j, FLOOR);
  }
  const kept = slots.filter((_, k) => !drop.has(k));
  // Aisles of the stalls that stay are still aisles.
  for (const s of kept) {
    const [ax0, az0, ax1, az1] = stallBox(s, AISLE);
    const [sx0, sz0, sx1, sz1] = stallBox(s);
    const [i0, j0] = grid.cellOf(ax0 + 1e-6, az0 + 1e-6);
    const [i1, j1] = grid.cellOf(ax1 - 1e-6, az1 - 1e-6);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const [x, z] = grid.centre(i, j);
        if (x > sx0 && x < sx1 && z > sz0 && z < sz1) grid.set(i, j, STALL);
        else if (grid.at(i, j) === FLOOR) grid.set(i, j, RESERVED);
      }
    }
  }
  return kept;
}

// What the sources say about particular centres' layouts.
// Lau Pa Sat: eight radial passageways lead to eight entrances (Roots: former Telok Ayer Market).
// Newton (rebuilt 2005): stalls in a horseshoe round a courtyard (Roots: Newton Circus Food Centre).
// Adam Road (1974): U-shaped, stalls round open seating (Roots: Adam Road Food Centre).
export const LAYOUT_HINTS = {
  "lau-pa-sat": { radial: true },
  "newton-food-centre": { horseshoe: true },
  "adam-road-food-centre": { horseshoe: true },
};

// Marks a lane (a straight passage of half-width hw) as kept clear: no stalls, no tables.
function reserveLane(grid, ax, az, bx, bz, hw = 1.4) {
  const x0 = Math.min(ax, bx) - hw;
  const x1 = Math.max(ax, bx) + hw;
  const z0 = Math.min(az, bz) - hw;
  const z1 = Math.max(az, bz) + hw;
  const [i0, j0] = grid.cellOf(x0, z0);
  const [i1, j1] = grid.cellOf(x1, z1);
  const len2 = (bx - ax) ** 2 + (bz - az) ** 2 || 1;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const c = grid.at(i, j);
      if (c !== FLOOR && c !== OUT) continue;
      const [x, z] = grid.centre(i, j);
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / len2));
      if (Math.hypot(x - (ax + t * (bx - ax)), z - (az + t * (bz - az))) <= hw) grid.set(i, j, c === FLOOR ? RESERVED : OUT_RESERVED);
    }
  }
}

// ---------- The plan ----------

// centre: NEA record ({ id, name, stalls, year }); preset: centrelook.presetFor(...); footprint: an entry of
// hawker-footprints.json or null; eraId: "1950s" | "1980s" | "today" | "2065".
export function planCentre({ centre = {}, preset = { archetype: "pavilion", features: [] }, footprint = null, eraId = "today", famous = [], seed = null, hint = null } = {}) {
  const archetype = preset.archetype ?? "pavilion";
  const target = Math.max(8, Math.min(260, Number(centre.stalls) || 40));
  const random = rng(seed ?? hashString(`${centre.id ?? centre.name}${eraId}`));
  if (archetype === "street") return planStreet({ centre, eraId, famous, random, target });

  let outline = footprint?.outline?.length >= 3 ? footprint.outline.map(([x, z]) => [x, z]) : null;
  const notes = [];
  let source = "osm";
  if (!outline) {
    outline = syntheticOutline(target, archetype);
    source = "synthetic";
  }
  // Too little floor for NEA's count (stalls on more than one floor, or a hall mapped without its covered
  // sides): grow it to about 38 square metres a stall, and say so.
  const area = polygonArea(outline);
  let scale = 1;
  if (area / target < 30) {
    scale = Math.sqrt((target * 38) / area);
    notes.push("scaled");
  }
  const angle = source === "osm" ? alignAngle(outline) : 0;
  outline = outline.map((p) => rotate(p, angle)).map(([x, z]) => [x * scale, z * scale]);
  let around = (footprint?.around ?? []).map((b) => ({ ...b, outline: b.outline.map((p) => rotate(p, angle)).map(([x, z]) => [x * scale, z * scale]) }));
  // Flats standing on the centre (hawker-hdb.json's `over`): drawn above the roof, never walked into.
  const over = (footprint?.over ?? []).map((b) => ({ ...b, outline: b.outline.map((p) => rotate(p, angle)).map(([x, z]) => [x * scale, z * scale]) }));
  // A centre on one floor of a much bigger building (a mall, a community hub): OpenStreetMap only has
  // the whole building, so lay out a hall sized for the stalls round NEA's point, and keep the building's
  // outline to draw round it.
  let parent = null;
  if (source === "osm" && area / target > 110) {
    const want = target * 60;
    const w = Math.sqrt(want * 1.6);
    const d = want / w;
    let [px, pz] = footprint?.offset ? rotate(footprint.offset, angle).map((v) => v * scale) : [0, 0];
    if (!insidePolygon(px, pz, outline)) [px, pz] = [0, 0];
    if (insidePolygon(px, pz, outline)) {
      const cut = clipToRect(outline, px - w / 2, pz - d / 2, px + w / 2, pz + d / 2);
      if (cut.length >= 3 && polygonArea(cut) > want * 0.45) {
        parent = outline;
        outline = cut;
        notes.push("part");
        // The rest of the building is drawn, not walked: its neighbours stay where they are.
        around = around.filter((a) => !a.outline.some(([x, z]) => insidePolygon(x, z, parent)));
      }
    }
  }
  const b0 = bounds(outline);
  const cx = (b0.x0 + b0.x1) / 2;
  const cz = (b0.z0 + b0.z1) / 2;
  outline = outline.map(([x, z]) => [x - cx, z - cz]);
  for (const a of [...around, ...over]) a.outline = a.outline.map(([x, z]) => [x - cx, z - cz]);
  if (parent) parent = parent.map(([x, z]) => [x - cx, z - cz]);
  const bb = bounds(outline);

  const W = Math.ceil((bb.x1 - bb.x0 + 2 * MARGIN) / CELL);
  const H = Math.ceil((bb.z1 - bb.z0 + 2 * MARGIN) / CELL);
  const base = new Grid(bb.x0 - MARGIN, bb.z0 - MARGIN, W, H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const [x, z] = base.centre(i, j);
      if (insidePolygon(x, z, outline)) base.set(i, j, FLOOR);
    }
  }
  // Neighbouring buildings are solid where they reach into the open ground.
  for (const a of around) {
    const ab = bounds(a.outline);
    const [i0, j0] = base.cellOf(ab.x0, ab.z0);
    const [i1, j1] = base.cellOf(ab.x1, ab.z1);
    for (let j = Math.max(0, j0); j <= Math.min(H - 1, j1); j++) {
      for (let i = Math.max(0, i0); i <= Math.min(W - 1, i1); i++) {
        if (base.at(i, j) !== OUT) continue;
        const [x, z] = base.centre(i, j);
        if (insidePolygon(x, z, a.outline)) base.set(i, j, WALL);
      }
    }
  }
  // Edge cells start as walls; open halls get them back as floor once the stalls are in.
  const enclosed = ["complex", "market", "artdeco"].includes(archetype);
  const edge = [];
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      if (base.at(i, j) !== FLOOR) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => base.at(i + di, j + dj) !== FLOOR)) edge.push([i, j]);
    }
  }
  for (const [i, j] of edge) base.set(i, j, WALL);

  // Ways in, kept clear of stalls and tables: a doorway in the middle of each side, or for a radial
  // hall, a passage from each of its eight sides right to the middle.
  hint = hint ?? (archetype === "octagon" ? { radial: true } : null);
  const doorAt = [];
  if (hint?.radial) {
    const edges = outline.map((p, i) => [p, outline[(i + 1) % outline.length]]).sort((a, b) => Math.hypot(b[1][0] - b[0][0], b[1][1] - b[0][1]) - Math.hypot(a[1][0] - a[0][0], a[1][1] - a[0][1])).slice(0, 8);
    for (const [[x1, z1], [x2, z2]] of edges) {
      const mx = (x1 + x2) / 2;
      const mz = (z1 + z2) / 2;
      const d = Math.hypot(mx, mz) || 1;
      reserveLane(base, mx + (mx / d) * 6, mz + (mz / d) * 6, 0, 0, 1.3);
      doorAt.push([mx, mz, mx / d, mz / d]);
    }
    // The clock tower in the middle.
    base.fill(-1.6, -1.6, 1.6, 1.6, THING);
  } else {
    // From the middle of the hall, straight out each way to where the building ends. If a neighbouring
    // block stands right outside, slide along the wall until there is open ground.
    const inside = base.c.reduce((acc, c, k) => (c === FLOOR ? (acc.push(k), acc) : acc), []);
    const mid = inside.length ? inside.reduce(([sx, sz], k) => [sx + base.centre(k % base.w, Math.floor(k / base.w))[0], sz + base.centre(k % base.w, Math.floor(k / base.w))[1]], [0, 0]).map((v) => v / inside.length) : [0, 0];
    const open = (x, z) => base.at(...base.cellOf(x, z)) === OUT;
    for (const [dx, dz] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
      let door = null;
      for (const slide of [0, 3, -3, 6, -6, 9, -9, 13, -13, 18, -18]) {
        let x = mid[0] + (dz ? slide : 0);
        let z = mid[1] + (dx ? slide : 0);
        if (!insidePolygon(x, z, outline)) continue;
        while (insidePolygon(x + dx * 0.25, z + dz * 0.25, outline)) {
          x += dx * 0.25;
          z += dz * 0.25;
        }
        if (open(x + dx * 1.5, z + dz * 1.5) && open(x + dx * 3, z + dz * 3)) {
          door = [x, z];
          break;
        }
      }
      if (!door) continue;
      const [ex, ez] = door;
      reserveLane(base, ex + dx * 6, ez + dz * 6, ex - dx * 7, ez - dz * 7, 1.45);
      doorAt.push([ex, ez, dx, dz]);
    }
  }
  const doorsClear = () => true;

  // Try the ways of filling the hall and keep the one whose stall count is nearest NEA's, preferring
  // simpler halls when it is close.
  let best = null;
  for (let islands = 0; islands <= 12; islands++) {
    for (const frontRow of hint?.horseshoe ? [false] : [true, false]) {
      for (const sides of hint?.horseshoe ? [true] : [false, true]) {
        const opt = layoutOption(base, bb, { islands, frontRow, sides, doorsClear });
        if (!opt) continue;
        opt.slots = trimSlots(opt.grid, opt.slots, target, bb);
        const n = opt.slots.length;
        // Seats matter too: centres seat about 11 to 14 people a stall (Roots: Old Airport Road and
        // Tiong Bahru; JTC: Punggol Coast), about three tables of four.
        // Aisles cost space, so the game aims a little lower than real centres: two tables a stall.
        const tablesFit = packTables(opt.grid.clone(), bb, SEATS_OUTSIDE.has(archetype)).length;
        const short = Math.max(0, n * 2 - tablesFit);
        const score = (target - n) * 2 + short * 0.35 + (sides ? 1 : 0) + (frontRow ? 0 : 0.5) + islands * 0.2;
        if (!best || score < best.score) best = { ...opt, score, islands };
      }
    }
  }
  if (!best) best = { ...layoutOption(base, bb, { islands: 0, frontRow: false, sides: false, doorsClear: () => true }), islands: 0 };
  if (!best.grid) best = { grid: base.clone(), slots: [], islands: 0 };
  const grid = best.grid;
  const slots = best.slots;

  const stalls = slots
    .sort((a, b) => a.z - b.z || a.x - b.x)
    .map((s, k) => {
      const [fx, fz] = s.face;
      const half = (fx === 0 ? STALL_D : STALL_W) / 2;
      const halfX = (fx === 0 ? STALL_W : STALL_D) / 2;
      const front = [s.x + fx * (halfX + 0.6), s.z + fz * (half + 0.6)];
      const side = random() < 0.5 ? -1 : 1;
      return { id: k, x: s.x, z: s.z, face: s.face, w: STALL_W, d: STALL_D, front, tangent: [-fz * side, fx * side] };
    });

  // Tables in the floor that is left, and columns for the roof among them.
  const roofed = archetype !== "openair";
  const packed = packTables(grid, bb, SEATS_OUTSIDE.has(archetype));
  // About 13 seats a stall, as at real centres (Roots and JTC give 11 to 14). The tables nearest the
  // stalls stay, indoors first. Where the building is also a market, the spare floor is the wet market
  // (NEA's count is only the cooked food stalls); elsewhere it stays open.
  const cap = Math.round(target * 3.4);
  const nearStall = (t) => stalls.reduce((m, st) => Math.min(m, Math.hypot(st.front[0] - t.x, st.front[1] - t.z)), Infinity) + (t.outside ? 12 : 0);
  const ranked = packed.map((t) => [nearStall(t), t]).sort((a, b) => a[0] - b[0]).map(([, t]) => t);
  const tables = ranked.slice(0, cap).sort((a, b) => a.z - b.z || a.x - b.x);
  tables.forEach((t, k) => (t.id = k));
  const market = /market/i.test(centre.name ?? "") ? ranked.slice(cap).filter((t) => !t.outside).map((t) => ({ x: t.x, z: t.z })) : [];
  for (const t of tables) grid.fillCircle(t.x, t.z, 0.5, THING);
  for (const m of market) grid.fill(m.x - 0.95, m.z - 0.5, m.x + 0.95, m.z + 0.5, THING);
  const columns = [];
  if (roofed) {
    for (const t of tables) {
      const x = t.x + PITCH / 2;
      const z = t.z + PITCH / 2;
      if (columns.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 8)) continue;
      if (grid.every(x - 0.3, z - 0.3, x + 0.3, z + 0.3, (c) => c === FLOOR)) {
        grid.fillCircle(x, z, 0.2, THING);
        columns.push([x, z]);
      }
    }
  }

  // Tray return points (today and 2065: clearing your own tray became compulsory in 2021), about one for
  // every 30 tables: open floor near the seating, spread out, and away from the stall queues.
  const trayReturns = [];
  if (eraId === "today" || eraId === "2065") {
    const want = Math.max(1, Math.round(tables.length / 30));
    const free = (x0, z0, x1, z1) => grid.every(x0, z0, x1, z1, (c) => c === FLOOR || c === RESERVED);
    const cands = [];
    for (let z = bb.z0 + 2; z < bb.z1 - 2; z += 1) {
      for (let x = bb.x0 + 2; x < bb.x1 - 2; x += 1) {
        if (!free(x - 0.5, z - 0.5, x + 0.5, z + 0.5)) continue;
        if (stalls.some((st) => Math.hypot(st.front[0] - x, st.front[1] - z) < 4)) continue;
        const near = tables.reduce((m, t) => Math.min(m, Math.hypot(t.x - x, t.z - z)), Infinity);
        if (near > 5) continue;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const use = [x + dx * 1.0, z + dz * 1.0];
          if (free(use[0] - 0.45, use[1] - 0.45, use[0] + 0.45, use[1] + 0.45)) {
            cands.push({ x, z, use, near });
            break;
          }
        }
      }
    }
    // Spread them out: each next one as far as it can be from the ones already placed.
    while (trayReturns.length < want && cands.length) {
      let best = null;
      for (const c of cands) {
        const d = trayReturns.length ? Math.min(...trayReturns.map((r) => Math.hypot(r.x - c.x, r.z - c.z))) : -c.near;
        if (!best || d > best.d) best = { c, d };
      }
      const { x, z, use } = best.c;
      if (!free(x - 0.5, z - 0.5, x + 0.5, z + 0.5)) {
        cands.splice(cands.indexOf(best.c), 1);
        continue;
      }
      grid.fill(x - 0.4, z - 0.4, x + 0.4, z + 0.4, THING);
      trayReturns.push({ x, z, use });
      cands.splice(cands.indexOf(best.c), 1);
    }
  }

  // Reserved aisles are floor again. Open halls are open all round, except behind the stalls.
  for (let k = 0; k < grid.c.length; k++) {
    if (grid.c[k] === RESERVED) grid.c[k] = FLOOR;
    else if (grid.c[k] === OUT_RESERVED) grid.c[k] = OUT;
  }
  if (!enclosed) {
    for (const [i, j] of edge) {
      if (grid.at(i, j) !== WALL) continue;
      const touchesStall = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => grid.at(i + di, j + dj) === STALL);
      if (!touchesStall) grid.set(i, j, FLOOR);
    }
  }
  // Doors: from the middle of each side, cut through the wall.
  const doors = [];
  for (const [ex, ez, dx, dz] of doorAt) {
    let cut = 0;
    // Along the wall (tx, tz) and through it (dx, dz).
    const tx = -dz;
    const tz = dx;
    for (let k = -1.4; k <= 1.4; k += CELL / 2) {
      for (let d = -1.5; d <= 1.5; d += CELL / 2) {
        const x = ex + tx * k + dx * d;
        const z = ez + tz * k + dz * d;
        const [i, j] = grid.cellOf(x, z);
        if (grid.at(i, j) === WALL && !insideAny(x, z, around)) {
          grid.set(i, j, FLOOR);
          cut++;
        }
      }
    }
    const [i, j] = grid.cellOf(ex + dx * 2.5, ez + dz * 2.5);
    if (walkable(grid.at(i, j)) || cut) doors.push({ x: ex + dx * 2.5, z: ez + dz * 2.5, face: [dx, dz] });
  }

  // Every part of the hall must be reachable: where a wall seals a pocket off (odd shapes do that),
  // cut another door through to the outside.
  const border = [];
  for (let i = 0; i < grid.w; i++) border.push([i, 0], [i, grid.h - 1]);
  for (let j = 0; j < grid.h; j++) border.push([0, j], [grid.w - 1, j]);
  for (let pass = 0; pass < 16; pass++) {
    const seen = reach(grid, border);
    const sealed = (i, j) => grid.at(i, j) === FLOOR && !seen[j * grid.w + i];
    let cut = null;
    for (const [i, j] of edge) {
      if (grid.at(i, j) !== WALL) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const inward = nb.find(([di, dj]) => sealed(i + di, j + dj));
      const outward = nb.find(([di, dj]) => walkable(grid.at(i + di, j + dj)) && seen[(j + dj) * grid.w + i + di]);
      if (inward && outward) {
        cut = [i, j, outward];
        break;
      }
    }
    if (!cut) break;
    const [ci, cj, [oi, oj]] = cut;
    for (let k = -2; k <= 2; k++) {
      const ii = ci + (oj !== 0 ? k : 0);
      const jj = cj + (oi !== 0 ? k : 0);
      if (grid.at(ii, jj) === WALL) grid.set(ii, jj, FLOOR);
    }
    const [x, z] = grid.centre(ci + oi * 4, cj + oj * 4);
    doors.push({ x, z, face: [oi, oj] });
  }

  // Anything nobody can walk up to (a tray return or a table boxed in by stalls) goes.
  {
    const seen = reach(grid, border);
    const ok = ([x, z]) => {
      const [i, j] = grid.cellOf(x, z);
      return Boolean(seen[j * grid.w + i]);
    };
    for (const r of [...trayReturns]) {
      if (ok(r.use)) continue;
      grid.fill(r.x - 0.4, r.z - 0.4, r.x + 0.4, r.z + 0.4, FLOOR);
      trayReturns.splice(trayReturns.indexOf(r), 1);
    }
    for (const t of [...tables]) {
      if (t.seats.some(ok)) continue;
      grid.fillCircle(t.x, t.z, 0.5, FLOOR);
      tables.splice(tables.indexOf(t), 1);
    }
    tables.forEach((t, k) => (t.id = k));
  }

  // Where people arrive from: the doors, and for open halls, the middle of each long side too.
  // Only points joined to the open ground round the map count.
  const world = reach(grid, border);
  const joined = (x, z) => {
    const [i, j] = grid.cellOf(x, z);
    return walkable(grid.at(i, j)) && Boolean(world[j * grid.w + i]);
  };
  const spawns = doors.map((d) => [d.x, d.z]).filter(([x, z]) => joined(x, z));
  if (!spawns.length) {
    // No door point outside: the nearest open ground to the hall.
    let best = null;
    for (let j = 0; j < grid.h; j++) {
      for (let i = 0; i < grid.w; i++) {
        if (grid.at(i, j) !== OUT || !world[j * grid.w + i]) continue;
        const [x, z] = grid.centre(i, j);
        const d = Math.hypot(x, z);
        if (!best || d < best.d) best = { x, z, d };
      }
    }
    spawns.push(best ? [best.x, best.z] : [0, bb.z1 + 3]);
  }

  // A tissue seller by the main door (today), on a stool, packets on a little table.
  const sellers = [];
  if (eraId === "today" && doors.length) {
    const d = doors[0];
    const x = d.x + (d.face[1] ? 2 : 0);
    const z = d.z + (d.face[0] ? 2 : 0);
    if (walkable(grid.at(...grid.cellOf(x, z)))) sellers.push({ x, z });
  }

  settleQueues({ grid, stalls });
  assignMenus(stalls, { famous, random, archetype, centre });
  const upstairs = archetype === "complex";
  stalls.forEach((s, k) => (s.no = `#${upstairs ? "02" : "01"}-${String(k + 1).padStart(2, "0")}`));

  return {
    kind: "hall",
    archetype,
    eraId,
    source,
    notes,
    angle,
    scale,
    outline,
    around,
    over,
    bounds: bb,
    grid,
    stalls,
    tables,
    columns,
    trayReturns,
    doors,
    spawns,
    sellers,
    start: spawns[0],
    islands: best.islands,
    enclosed,
    radial: Boolean(hint?.radial),
    parent,
    market,
    target,
  };
}

// Sutherland-Hodgman: a polygon cut down to what lies inside an axis-aligned rectangle.
function clipToRect(poly, x0, z0, x1, z1) {
  const edges = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= z0, (a, b) => [a[0] + ((b[0] - a[0]) * (z0 - a[1])) / (b[1] - a[1]), z0]],
    [(p) => p[1] <= z1, (a, b) => [a[0] + ((b[0] - a[0]) * (z1 - a[1])) / (b[1] - a[1]), z1]],
  ];
  let out = poly;
  for (const [inside, cross] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[(i + input.length - 1) % input.length];
      const b = input[i];
      if (inside(b)) {
        if (!inside(a)) out.push(cross(a, b));
        out.push(b);
      } else if (inside(a)) out.push(cross(a, b));
    }
    if (!out.length) break;
  }
  return out;
}

// Cells reachable on foot from the starting cells, as a flag per cell.
function reach(grid, starts) {
  const seen = new Uint8Array(grid.w * grid.h);
  const queue = [];
  for (const [i, j] of starts) {
    if (!walkable(grid.at(i, j))) continue;
    seen[j * grid.w + i] = 1;
    queue.push(j * grid.w + i);
  }
  while (queue.length) {
    const k = queue.pop();
    const i = k % grid.w;
    const j = (k - i) / grid.w;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= grid.w || nj >= grid.h) continue;
      const nk = nj * grid.w + ni;
      if (seen[nk] || !walkable(grid.at(ni, nj))) continue;
      seen[nk] = 1;
      queue.push(nk);
    }
  }
  return seen;
}

function insideAny(x, z, around) {
  return around.some((a) => insidePolygon(x, z, a.outline));
}

// Which menu each stall sells. Famous dishes first (one stall each, with the long queue), then drinks
// stalls (about one in eight), then the other menus in turn so every kind turns up.
function assignMenus(stalls, { famous, random, archetype }) {
  const order = stalls.map((s, k) => [random(), k]).sort((a, b) => a[0] - b[0]).map(([, k]) => k);
  let next = 0;
  const take = () => stalls[order[next++]];
  const famousDone = new Set();
  for (const dish of famous) {
    if (next >= stalls.length) break;
    const menu = STALL_MENUS.find((m) => m.dishes.includes(dish));
    if (!menu || famousDone.has(dish)) continue;
    const s = take();
    s.menu = menu.id;
    s.famous = dish;
    famousDone.add(dish);
  }
  const drinks = Math.max(1, Math.round(stalls.length / 8));
  for (let k = 0; k < drinks && next < stalls.length; k++) take().menu = "drinks";
  const cooks = STALL_MENUS.filter((m) => m.id !== "drinks");
  // BBQ seafood belongs at the night centres; elsewhere it turns up less.
  const weights = cooks.map((m) => (m.id === "seafood" && archetype !== "openair" ? 0.4 : 1));
  const pool = [];
  cooks.forEach((m, i) => {
    for (let k = 0; k < Math.round(weights[i] * 5); k++) pool.push(m.id);
  });
  let r = Math.floor(random() * pool.length);
  const used = new Set();
  while (next < stalls.length) {
    // Every menu once before any repeats.
    const fresh = cooks.find((m) => !used.has(m.id));
    const id = fresh ? fresh.id : pool[r++ % pool.length];
    used.add(id);
    take().menu = id;
  }
  for (const s of stalls) s.sign = menuById(s.menu).sign;
}

// ---------- Before the centre: a street of hawkers ----------

// The 1950s, before a centre was built: pushcarts along the road in front of two rows of shophouses, with
// the five-foot ways under them, and low tables out on the road in the evening.
function planStreet({ centre, eraId, famous, random, target }) {
  const n = Math.max(8, Math.min(22, Math.round(target / 3)));
  const length = Math.ceil(n / 2) * 4.6 + 12;
  const road = 11; // between the five-foot ways
  const foot = 2.2;
  const outline = rect(length, road + 2 * foot);
  const bb = bounds(outline);
  const W = Math.ceil((length + 2 * MARGIN) / CELL);
  const H = Math.ceil((road + 2 * foot + 2 * 9) / CELL);
  const grid = new Grid(bb.x0 - MARGIN, -(road / 2 + foot + 9), W, H);
  // Shophouses on both sides (solid), five-foot ways and road (open).
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const [, z] = grid.centre(i, j);
      grid.set(i, j, Math.abs(z) > road / 2 + foot ? WALL : OUT);
    }
  }
  const stalls = [];
  const half = Math.ceil(n / 2);
  for (let k = 0; k < n; k++) {
    const north = k < half;
    const idx = north ? k : k - half;
    const count = north ? half : n - half;
    const x = -((count - 1) * 4.6) / 2 + idx * 4.6;
    const z = north ? -road / 2 + 0.9 : road / 2 - 0.9;
    // Pushcarts stand at the kerb and face the road.
    stalls.push({ id: k, x, z, face: [0, north ? 1 : -1], w: 1.8, d: 1.2, cart: true, front: [x, z + (north ? 1.4 : -1.4)], tangent: [1, 0] });
    grid.fill(x - 0.9, z - 0.6, x + 0.9, z + 0.6, STALL);
  }
  // Low tables down the middle of the road.
  const tables = [];
  for (let x = bb.x0 + 4; x < bb.x1 - 4; x += 3.2) {
    for (const z of [-1.3, 1.3]) {
      if (random() < 0.15) continue;
      tables.push({ id: tables.length, x, z, low: true, seats: [[x, z - 0.75], [x + 0.75, z], [x, z + 0.75], [x - 0.75, z]] });
      grid.fillCircle(x, z, 0.4, THING);
    }
  }
  assignMenus(stalls, { famous, random, archetype: "street", centre });
  stalls.forEach((s, k) => (s.no = `cart ${k + 1}`));
  const spawns = [[bb.x0 - 4, 0], [bb.x1 + 4, 0], [bb.x0 - 4, road / 2], [bb.x1 + 4, -road / 2]];
  return {
    kind: "street",
    archetype: "street",
    eraId,
    source: "street",
    notes: [],
    angle: 0,
    scale: 1,
    outline,
    road,
    foot,
    around: [],
    over: [],
    bounds: bb,
    grid,
    stalls,
    tables,
    columns: [],
    trayReturns: [],
    doors: [{ x: bb.x0 - 2, z: 0 }, { x: bb.x1 + 2, z: 0 }],
    spawns,
    sellers: [],
    start: [bb.x0 - 3, 0.5],
    islands: 0,
    target,
  };
}

// ---------- Getting about ----------

// A* on the grid from one point to another (metres). Returns a list of points, or null. A blocked target
// (a seat, a counter) ends at the walkable cell nearest it, then the point itself. Built for crowds: open
// floor is a straight line, and the search uses typed arrays kept on the plan rather than maps.
// greedy: lean on the estimate (a little over 1), which finds a good path much faster: fine for the
// crowd, whose routes need not be the very shortest.
export function findPath(plan, from, to, { maxNodes = 40000, roomy = true, greedy = 1 } = {}) {
  // Nothing in the way: walk straight there.
  if (lineClear(plan, from[0], from[1], to[0], to[1])) return [[from[0], from[1]], [to[0], to[1]]];
  // Roomy: a cell counts only if its neighbours are walkable too, so a person fits through. If that
  // finds no way, a tight squeeze will do.
  if (roomy) {
    const p = search(plan, from, to, maxNodes, true, greedy);
    if (p) return p;
  }
  return search(plan, from, to, maxNodes, false, greedy);
}

// Distance on a grid where diagonal steps cost the square root of two.
const octile = (dx, dy) => {
  const a = Math.abs(dx);
  const b = Math.abs(dy);
  return a > b ? a + 0.41421356 * b : b + 0.41421356 * a;
};

// Walkable and roomy cells, and the search's working arrays, made once per plan.
function astar(plan) {
  const g = plan.grid;
  const n = g.w * g.h;
  if (plan._astar?.n === n) return plan._astar;
  const walk = new Uint8Array(n);
  const wide = new Uint8Array(n);
  for (let k = 0; k < n; k++) walk[k] = walkable(g.c[k]) ? 1 : 0;
  for (let j = 1; j < g.h - 1; j++) {
    for (let i = 1; i < g.w - 1; i++) {
      const k = j * g.w + i;
      wide[k] = walk[k] && walk[k - 1] && walk[k + 1] && walk[k - g.w] && walk[k + g.w] ? 1 : 0;
    }
  }
  plan._astar = { n, walk, wide, cost: new Float32Array(n), came: new Int32Array(n), seen: new Uint32Array(n), shut: new Uint32Array(n), gen: 0, heap: new Heap() };
  return plan._astar;
}

const STEPS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

function search(plan, from, to, maxNodes, wide, greedy = 1) {
  const g = plan.grid;
  const A = astar(plan);
  const W = g.w;
  const H = g.h;
  const walk = A.walk;
  const room = wide ? A.wide : walk;
  const inside = (i, j) => i >= 0 && j >= 0 && i < W && j < H;
  const si = Math.floor((from[0] - g.x0) / CELL);
  const sj = Math.floor((from[1] - g.z0) / CELL);
  let ti = Math.floor((to[0] - g.x0) / CELL);
  let tj = Math.floor((to[1] - g.z0) / CELL);
  if (!inside(si, sj)) return null;
  if (!inside(ti, tj) || !walk[tj * W + ti]) {
    // The nearest walkable cell to the target.
    let best = null;
    for (let r = 1; r < 6 && !best; r++) {
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          const i = ti + di;
          const j = tj + dj;
          if (inside(i, j) && walk[j * W + i] && (!best || Math.hypot(di, dj) < best[2])) best = [i, j, Math.hypot(di, dj)];
        }
      }
    }
    if (!best) return null;
    [ti, tj] = best;
  }
  const start = sj * W + si;
  const goal = tj * W + ti;
  if (++A.gen > 4e9) {
    A.seen.fill(0);
    A.shut.fill(0);
    A.gen = 1;
  }
  const gen = A.gen;
  const open = A.heap;
  open.clear();
  A.cost[start] = 0;
  A.seen[start] = gen;
  A.came[start] = -1;
  open.push(start, octile(si - ti, sj - tj) * greedy);
  let expanded = 0;
  let found = start === goal;
  while (open.size && !found) {
    const cur = open.pop();
    if (A.shut[cur] === gen) continue;
    A.shut[cur] = gen;
    if (cur === goal) {
      found = true;
      break;
    }
    if (++expanded > maxNodes) return null;
    const ci = cur % W;
    const cj = (cur - ci) / W;
    const base = A.cost[cur];
    for (let d = 0; d < 8; d++) {
      const [di, dj, step] = STEPS[d];
      const ni = ci + di;
      const nj = cj + dj;
      if (!inside(ni, nj)) continue;
      const nk = nj * W + ni;
      // The first steps out of a tight spot (and the last ones into one) are allowed.
      const nearEnds = Math.abs(ni - si) + Math.abs(nj - sj) <= 2 || Math.abs(ni - ti) + Math.abs(nj - tj) <= 2;
      if (!(nearEnds ? walk[nk] : room[nk])) continue;
      if (di && dj && (!walk[cj * W + ni] || !walk[nj * W + ci])) continue;
      const c = base + step;
      if (A.seen[nk] === gen && c >= A.cost[nk]) continue;
      A.seen[nk] = gen;
      A.cost[nk] = c;
      A.came[nk] = cur;
      open.push(nk, c + octile(ni - ti, nj - tj) * greedy);
    }
  }
  if (!found) return null;
  // Back from the goal, keeping only the cells where the direction turns.
  const turns = [];
  let prevD = null;
  for (let k = goal; k !== -1; k = A.came[k]) {
    const nxt = A.came[k];
    const d = nxt === -1 ? null : k - nxt;
    if (d !== prevD || nxt === -1) turns.push(k);
    prevD = d;
    if (k === start) break;
  }
  if (turns[turns.length - 1] !== start) turns.push(start);
  turns.reverse();
  const pts = turns.map((k) => g.centre(k % W, Math.floor(k / W)));
  // Pull the string tight: skip turns that a straight line can cut.
  const out = [pts[0]];
  for (let k = 1; k < pts.length - 1; k++) {
    const [ax, az] = out[out.length - 1];
    const [bx, bz] = pts[k + 1];
    if (!lineClear(plan, ax, az, bx, bz)) out.push(pts[k]);
  }
  if (pts.length > 1) out.push(pts[pts.length - 1]);
  out.push([to[0], to[1]]);
  return out;
}

// True if a walker can go straight from a to b.
export function lineClear(plan, ax, az, bx, bz) {
  const g = plan.grid;
  const walk = astar(plan).walk;
  const W = g.w;
  const H = g.h;
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL * 0.5)));
  for (let k = 0; k <= n; k++) {
    const x = ax + ((bx - ax) * k) / n - g.x0;
    const z = az + ((bz - az) * k) / n - g.z0;
    for (let c = 0; c < 4; c++) {
      const i = Math.floor((x + (c & 1 ? 0.24 : -0.24)) / CELL);
      const j = Math.floor((z + (c & 2 ? 0.24 : -0.24)) / CELL);
      if (i < 0 || j < 0 || i >= W || j >= H || !walk[j * W + i]) return false;
    }
  }
  return true;
}

class Heap {
  constructor() {
    this.k = [];
    this.p = [];
  }
  clear() {
    this.k.length = 0;
    this.p.length = 0;
  }
  get size() {
    return this.k.length;
  }
  push(key, pri) {
    const k = this.k;
    const p = this.p;
    k.push(key);
    p.push(pri);
    let i = k.length - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (p[up] <= p[i]) break;
      const tk = k[up];
      k[up] = k[i];
      k[i] = tk;
      const tp = p[up];
      p[up] = p[i];
      p[i] = tp;
      i = up;
    }
  }
  pop() {
    const k = this.k;
    const p = this.p;
    const top = k[0];
    const lastK = k.pop();
    const lastP = p.pop();
    if (k.length) {
      k[0] = lastK;
      p[0] = lastP;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && p[l] < p[m]) m = l;
        if (r < k.length && p[r] < p[m]) m = r;
        if (m === i) break;
        const tk = k[m];
        k[m] = k[i];
        k[i] = tk;
        const tp = p[m];
        p[m] = p[i];
        p[i] = tp;
        i = m;
      }
    }
    return top;
  }
}

// Where the k-th person in a stall's queue stands: at the counter, then along the aisle.
export function queueSpot(plan, stall, k) {
  const [px, pz] = stall.front;
  if (k === 0) return [px, pz];
  const [tx, tz] = stall.tangent;
  const [fx, fz] = stall.face;
  if (stall.cart) return [px + tx * k * 0.8, pz + tz * k * 0.8];
  // Straight out from the counter, where the aisle has no room to either side.
  if (stall.queueOut) return [px + fx * k * 0.75, pz + fz * k * 0.75];
  return [px + tx * k * 0.75 + fx * 0.5, pz + tz * k * 0.75 + fz * 0.5];
}

// Each queue turns the way that has room: along the aisle one way or the other, or straight out.
function settleQueues(plan) {
  const g = plan.grid;
  const room = (s) => {
    let n = 0;
    for (let k = 1; k <= 6; k++) {
      const [x, z] = queueSpot(plan, s, k);
      if (!walkable(g.at(...g.cellOf(x, z)))) break;
      n++;
    }
    return n;
  };
  for (const s of plan.stalls) {
    if (s.cart) continue;
    const options = [
      { tangent: s.tangent, queueOut: false },
      { tangent: [-s.tangent[0], -s.tangent[1]], queueOut: false },
      { tangent: s.tangent, queueOut: true },
    ];
    let best = null;
    for (const o of options) {
      Object.assign(s, o);
      const n = room(s) - (o.queueOut ? 0.5 : 0);
      if (!best || n > best.n) best = { o, n };
    }
    Object.assign(s, best.o);
  }
}
