// Hawker centres that are HDB blocks, the flats standing over some of them, and the real HDB blocks around
// each one (data/hawker-hdb.json, made by scripts/fetch-hawker-hdb.ts from HDB's property data, NEA's list of
// centres and OpenStreetMap). Loaded on demand, like the building outlines.

let data = null;
let loaded = null;

export function loadHdb() {
  data ??= import("../../data/hawker-hdb.json")
    .then((m) => (loaded = m.default ?? m))
    .catch(() => (loaded = { centres: {}, over: {}, around: {}, nearby: {} }));
  return data;
}

// Once loaded: the HDB side of one centre, or null for centres that are not HDB blocks.
// { blocks: [{ blk, street, floors, year, units, res, market }], over: [tower...], around: { osm: [blk, floors, year, res, units] } }
export function hdbOf(centre) {
  if (!loaded || !centre) return null;
  const blocks = loaded.centres?.[centre.id]?.blocks ?? [];
  const over = loaded.over?.[centre.id] ?? [];
  if (!blocks.length && !over.length) return null;
  return { blocks, over };
}
export const hdbReady = () => Boolean(loaded);
export const hdbAround = () => loaded?.around ?? {};
export const hdbCounts = () => loaded?.counts ?? null;
export const HDB_SOURCES = [
  ["HDB Property Information (data.gov.sg)", "https://data.gov.sg/datasets/d_17f5382f26140b1fdae0ba2ef6239d2f/view"],
  ["NEA Hawker Centres (data.gov.sg)", "https://data.gov.sg/datasets/d_4a086da0a5553be1d89383cd90d07ecd/view"],
];

// HDB's street names in their short form, read out: "OLD AIRPORT RD" -> "Old Airport Road".
const LONG = { RD: "Road", ST: "Street", AVE: "Avenue", DR: "Drive", CRES: "Crescent", CTRL: "Central", NTH: "North", STH: "South", UPP: "Upper", BT: "Bukit", JLN: "Jalan", LOR: "Lorong", TG: "Tanjong", KG: "Kampong", CL: "Close", PL: "Place", PK: "Park", "C'WEALTH": "Commonwealth", MKT: "Market", TER: "Terrace", HTS: "Heights", GDNS: "Gardens", GDN: "Garden", CT: "Court" };
export const streetName = (s) =>
  String(s ?? "")
    .split(" ")
    .map((w) => LONG[w] ?? (/^\d/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");

// "Blk 91 and 92 Whampoa Drive"
export function blockName(blocks) {
  if (!blocks?.length) return "";
  const nums = blocks.map((b) => b.blk);
  const list = nums.length > 1 ? `${nums.slice(0, -1).join(", ")} and ${nums.at(-1)}` : nums[0];
  return `Blk ${list} ${streetName(blocks[0].street)}`;
}

// The homes on the centre's building: its own block when HDB says people live there, and the towers OSM maps
// on it as flats (numbered ones first; unnumbered parts only when there is nothing else to name).
export function flatsOver(h) {
  if (!h) return [];
  const own = h.blocks.filter((b) => b.res).map((b) => ({ blk: b.blk, street: b.street, storeys: b.floors, units: b.units, year: b.year }));
  const flats = h.over.filter((t) => t.use === "flats");
  const named = flats.filter((t) => t.blk ?? t.number);
  const towers = (named.length ? named : flats.slice(0, 1)).map((t) => ({ blk: t.blk ?? t.number ?? null, street: t.street ?? null, storeys: t.floors ?? t.levels, units: t.units ?? null, year: t.year ?? null }));
  const seen = new Set();
  return [...own, ...towers].filter((f) => {
    const k = f.blk ? `${f.blk}|${f.street}` : null;
    if (k && seen.has(k)) return false;
    if (k) seen.add(k);
    return true;
  });
}

// The tallest tower (eight storeys or more) on the centre's building that is not flats: an office tower, or
// one OSM does not say.
export function towerOver(h) {
  const others = (h?.over ?? []).filter((t) => t.use !== "flats" && t.levels >= 8);
  return others.length && !flatsOver(h).length ? others.reduce((a, b) => (b.levels > a.levels ? b : a)) : null;
}

// An HDB block itself, or a centre with HDB flats on its building.
export function inHdb(centre) {
  const h = hdbOf(centre);
  return Boolean(h && (h.blocks.length || flatsOver(h).length));
}

// A short line for the picker's list: "HDB Blk 51", "HDB Blk 270 · flats above", "Tower above".
export function hdbTag(centre) {
  const h = hdbOf(centre);
  if (!h) return null;
  const flats = flatsOver(h).length > 0;
  const tower = !flats && towerOver(h);
  const extra = flats ? "flats above" : tower ? "tower above" : null;
  if (!h.blocks.length) return extra ? extra.charAt(0).toUpperCase() + extra.slice(1) : null;
  return [`HDB Blk ${h.blocks.map((b) => b.blk).join(" and ")}`, extra].filter(Boolean).join(" · ");
}

// What the HDB blocks within about 150 m add up to, for the picker: how many, homes, oldest, tallest.
export function aroundSummary(footprint, eraYear = null) {
  const a = hdbAround();
  const seen = new Set();
  let n = 0;
  let homes = 0;
  let oldest = null;
  let tallest = null;
  for (const b of footprint?.around ?? []) {
    const r = a[b.osm];
    if (!r || seen.has(r[0])) continue;
    const [blk, floors, year, res, units] = r;
    if (eraYear && year > eraYear) continue;
    seen.add(blk);
    n++;
    if (res) homes += units ?? 0;
    if (!oldest || year < oldest.year) oldest = { blk, year };
    if (!tallest || floors > tallest.floors) tallest = { blk, floors };
  }
  return n ? { n, homes, oldest, tallest } : null;
}

// ---------- Block shapes, for drawing (walkview.js) ----------

export function centroid(outline) {
  return [outline.reduce((s, p) => s + p[0], 0) / outline.length, outline.reduce((s, p) => s + p[1], 0) / outline.length];
}

function inPoly(x, z, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

// The long axis of an outline, from the spread of its corners.
function longAxis(outline) {
  const [cx, cz] = centroid(outline);
  let sxx = 0;
  let szz = 0;
  let sxz = 0;
  for (const [x, z] of outline) {
    sxx += (x - cx) ** 2;
    szz += (z - cz) ** 2;
    sxz += (x - cx) * (z - cz);
  }
  const a = 0.5 * Math.atan2(2 * sxz, sxx - szz);
  return { cx, cz, ax: Math.cos(a), az: Math.sin(a) };
}

// Each wall as { x, z (its middle), nx, nz (facing out), len }.
function walls(outline) {
  const out = [];
  for (let i = 0; i < outline.length; i++) {
    const [x1, z1] = outline[i];
    const [x2, z2] = outline[(i + 1) % outline.length];
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 1) continue;
    let nx = (z2 - z1) / len;
    let nz = -(x2 - x1) / len;
    const x = (x1 + x2) / 2;
    const z = (z1 + z2) / 2;
    if (inPoly(x + nx * 0.4, z + nz * 0.4, outline)) [nx, nz] = [-nx, -nz];
    out.push({ x, z, nx, nz, len });
  }
  return out;
}

// The end walls of a slab block, where the number goes: the walls facing along its long axis, the one
// furthest out at each end.
export function endWalls(outline) {
  const { cx, cz, ax, az } = longAxis(outline);
  const best = {};
  for (const w of walls(outline)) {
    const d = w.nx * ax + w.nz * az;
    if (Math.abs(d) < 0.8 || w.len < 4) continue;
    const side = d > 0 ? "a" : "b";
    const reach = Math.abs((w.x - cx) * ax + (w.z - cz) * az);
    if (!best[side] || reach > best[side].reach + 1 || (Math.abs(reach - best[side].reach) <= 1 && w.len > best[side].len)) best[side] = { ...w, reach };
  }
  return Object.values(best);
}

// Pillars round a void deck: at the corners and every few metres along each wall, a little in from the edge.
export function pillarSpots(outline) {
  const [cx, cz] = centroid(outline);
  const spots = [];
  for (let i = 0; i < outline.length; i++) {
    const [x1, z1] = outline[i];
    const [x2, z2] = outline[(i + 1) % outline.length];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.max(1, Math.round(len / 4.5));
    for (let k = 0; k < n; k++) {
      const x = x1 + ((x2 - x1) * k) / n;
      const z = z1 + ((z2 - z1) * k) / n;
      const d = Math.hypot(cx - x, cz - z) || 1;
      spots.push([x + ((cx - x) / d) * 0.7, z + ((cz - z) / d) * 0.7]);
    }
  }
  // The lift core in the middle, when the middle is under the block.
  if (inPoly(cx, cz, outline)) spots.push([cx, cz]);
  return spots;
}

// A slab of flats along the hall's long side, 12 metres deep: for a centre HDB says people live over, when
// OpenStreetMap has no tower drawn for it.
export function slabOver(outline) {
  const { cx, cz, ax, az } = longAxis(outline);
  let lo = Infinity;
  let hi = -Infinity;
  for (const [x, z] of outline) {
    const t = (x - cx) * ax + (z - cz) * az;
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  const half = ((hi - lo) / 2) * 0.85;
  const mid = (hi + lo) / 2;
  const [px, pz] = [-az, ax];
  const at = (t, s) => [cx + ax * (mid + t) + px * s, cz + az * (mid + t) + pz * s];
  return [at(-half, -6), at(half, -6), at(half, 6), at(-half, 6)];
}
