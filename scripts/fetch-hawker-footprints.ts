// Builds data/hawker-footprints.json: the OpenStreetMap outline of each NEA hawker centre's building, plus
// the buildings around it, in metres, for Makan Nation's walk-around mode.
// Run with: bun scripts/fetch-hawker-footprints.ts                 (asks Overpass every time)
//      or: bun scripts/fetch-hawker-footprints.ts --cache <dir>   (keeps raw answers in <dir>; HAWKER_OSM_CACHE=<dir> works too)
// Source: OpenStreetMap via the Overpass API (ODbL 1.0, © OpenStreetMap contributors). One query per centre with a
// pause between them; if overpass-api.de is busy we back off and then try overpass.private.coffee.
//
// Frame: metres from the centroid of the centre's own outline, x east, z SOUTH (z = -north), equirectangular at the
// centroid latitude (x = dLon * 111320 * cos(lat), north = dLat * 110574), rounded to 0.1 m. `offset` is the NEA point
// in that frame. Every outline is the outer ring only, no repeated closing point, wound counter-clockwise seen from
// above with north up (positive signed area in x/north). In raw [x, z] numbers that is clockwise, so a three.js Shape
// built from (x, -z) and rotated -90 degrees about X faces up.
//
// Which building is the hawker centre, in this order:
//   tagged:   a building within 150 m tagged amenity=food_court/marketplace or named like a food centre, or holding a food
//             centre point (node) whose name or address matches NEA's. Ranked by name match to NEA's name, then a nudge for
//             holding the NEA point, for carrying NEA's address (postcode, or block number and street), for being the
//             cooked food building rather than the wet market next door, and for being close.
//   contains: the building whose outline holds the NEA point (one with NEA's address first).
//   nearest:  the nearest building within 60 m with over 300 m2 of footprint (one with NEA's address first).
// A tagged building more than 60 m from the NEA point, with only its name to go on, is tried after contains and nearest:
// that is usually the old centre beside a new one being built.
// Each outer ring of a multipolygon counts as its own building, so an `around` entry can repeat a relation id.
// Buildings nested inside the centre, or wrapping it, are left out of `around` so the player never spawns in a wall.

import { join } from "node:path";
import { mkdirSync } from "node:fs";

const IN = join(import.meta.dir, "../data/hawker-centres.json");
const OUT = join(import.meta.dir, "../data/hawker-footprints.json");
const SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const USER_AGENT = "makan-nation-makeathon/0.1 (hawker centre footprints)";
const BACKOFF = [5000, 15000, 30000];
const PAUSE = 1500;
const FETCH_RADIUS = 250; // m around the NEA point, so "around" still covers 150 m when the centroid sits a bit away
const TAG_RADIUS = 150;
const NEAR_RADIUS = 60;
const NEAR_MIN_AREA = 300;
const AROUND_RADIUS = 150;
const AROUND_MAX = 30;

const flag = process.argv.indexOf("--cache");
const CACHE = flag >= 0 ? process.argv[flag + 1] : process.env.HAWKER_OSM_CACHE || null;
if (CACHE) mkdirSync(CACHE, { recursive: true });

type Pt = [number, number];
type Tags = Record<string, string>;
type Building = { osm: string; tags: Tags; ll: Pt[] }; // ll: open outer ring as [lon, lat]

// ---------- Overpass ----------

async function overpass(query: string): Promise<any> {
  for (const server of SERVERS) {
    const host = new URL(server).host;
    for (let attempt = 0; attempt <= BACKOFF.length; attempt++) {
      if (attempt) await Bun.sleep(BACKOFF[attempt - 1]);
      try {
        const res = await fetch(server, {
          method: "POST",
          headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
          body: "data=" + encodeURIComponent(query),
          signal: AbortSignal.timeout(120000),
        });
        const text = await res.text();
        // A busy server can answer 200 with an HTML page, or JSON with a "runtime error" remark and half the data.
        const body: any = res.ok && text.trimStart().startsWith("{") ? JSON.parse(text) : null;
        if (body && Array.isArray(body.elements) && !/error|timed out/i.test(body.remark ?? "")) return body;
        console.log(`  ${host} said ${res.status}${body ? `: ${body.remark}` : ", not JSON"}`);
      } catch (e: any) {
        console.log(`  ${host} failed: ${e.message}`);
      }
    }
  }
  throw new Error("no Overpass server answered");
}

async function osmAround(c: any): Promise<{ data: any; fresh: boolean }> {
  const file = CACHE ? Bun.file(join(CACHE, `${c.id}.json`)) : null;
  if (file && (await file.exists())) return { data: await file.json(), fresh: false };
  // Three short queries rather than one long one: a busy server lets quick queries through and times out slow ones.
  const at = `${c.lat},${c.lng}`;
  const parts = [
    `way(around:${FETCH_RADIUS},${at})[building];out tags geom;`,
    `relation(around:${FETCH_RADIUS},${at})[building];out body geom;`, // body, so the members come with it
    `node(around:${TAG_RADIUS},${at})[amenity~"^(food_court|marketplace)$"];out tags geom;`,
  ];
  const data = { elements: [] as any[] };
  for (const [k, q] of parts.entries()) {
    if (k) await Bun.sleep(PAUSE);
    data.elements.push(...(await overpass(`[out:json][timeout:25];${q}`)).elements);
  }
  if (file) await Bun.write(file, JSON.stringify(data));
  return { data, fresh: true };
}

// ---------- geometry ----------

const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];
const openRing = (r: Pt[]) => (r.length > 1 && same(r[0], r.at(-1)!) ? r.slice(0, -1) : r);

// Joins multipolygon member ways end to end into closed rings.
function stitch(parts: Pt[][]): Pt[][] {
  const left = parts.filter((p) => p.length >= 2);
  const rings: Pt[][] = [];
  while (left.length) {
    let ring = left.shift()!;
    for (let grew = true; grew && !same(ring[0], ring.at(-1)!); ) {
      grew = false;
      for (let i = 0; i < left.length; i++) {
        const p = left[i];
        if (same(ring.at(-1)!, p[0])) ring = ring.concat(p.slice(1));
        else if (same(ring.at(-1)!, p.at(-1)!)) ring = ring.concat(p.slice().reverse().slice(1));
        else continue;
        left.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (ring.length >= 4 && same(ring[0], ring.at(-1)!)) rings.push(openRing(ring));
  }
  return rings;
}

function signedArea(r: Pt[]): number {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

function centroid(r: Pt[]): Pt {
  const a = signedArea(r);
  if (Math.abs(a) < 1e-9) return [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    const k = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * k;
    cy += (y1 + y2) * k;
  }
  return [cx / (6 * a), cy / (6 * a)];
}

function inside(p: Pt, r: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

// 0 inside the outline, otherwise the distance to its nearest edge.
function distTo(p: Pt, r: Pt[]): number {
  if (inside(p, r)) return 0;
  let d = Infinity;
  for (let i = 0; i < r.length; i++) d = Math.min(d, segDist(p, r[i], r[(i + 1) % r.length]));
  return d;
}

// Equirectangular metres around (lat0, lon0): [x east, north].
function projector(lat0: number, lon0: number) {
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return {
    to: ([lon, lat]: Pt): Pt => [(lon - lon0) * kx, (lat - lat0) * 110574],
    from: ([x, n]: Pt): Pt => [lon0 + x / kx, lat0 + n / 110574],
  };
}

function douglasPeucker(points: Pt[], tol: number): Pt[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let best = -1;
    let far = 0;
    for (let i = a + 1; i < b; i++) {
      const d = segDist(points[i], points[a], points[b]);
      if (d > far) [far, best] = [d, i];
    }
    if (far > tol && best > 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// Closed ring: anchor on the westmost point and the point furthest from it (both real corners), simplify each half.
function simplifyRing(r: Pt[], tol: number): Pt[] {
  if (r.length <= 4) return r;
  const w = r.reduce((best, p, i) => (p[0] < r[best][0] ? i : best), 0);
  const ring = [...r.slice(w), ...r.slice(0, w)];
  const far = ring.reduce((best, p, i) => (Math.hypot(p[0] - ring[0][0], p[1] - ring[0][1]) > Math.hypot(ring[best][0] - ring[0][0], ring[best][1] - ring[0][1]) ? i : best), 0);
  return [...douglasPeucker(ring.slice(0, far + 1), tol).slice(0, -1), ...douglasPeucker([...ring.slice(far), ring[0]], tol).slice(0, -1)];
}

const r1 = (v: number) => Math.round(v * 10) / 10 || 0;

// Simplify, cap the point count, round, wind counter-clockwise in x/north, then flip north to z (south).
function shape(r: Pt[], tol: number, cap: number): [number, number][] {
  let s = simplifyRing(r, tol);
  for (let t = tol * 1.5; s.length > cap; t *= 1.5) s = simplifyRing(r, t);
  let out = s.map(([x, n]) => [r1(x), r1(n)] as Pt).filter((p, i, a) => !same(p, a[(i + 1) % a.length]) || a.length === 1);
  if (signedArea(out) < 0) out = out.reverse();
  return out.map(([x, n]) => [x, r1(-n)]);
}

// ---------- tags ----------

const num = (v?: string) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const levelsOf = (t: Tags) => {
  const n = num(t["building:levels"]);
  return n == null ? null : Math.round(n);
};
const heightOf = (t: Tags) => {
  const n = num(t.height); // some outlines carry height=0, which means nobody measured it
  return n == null || n <= 0 ? null : Math.round(n * 10) / 10;
};
const namesOf = (t: Tags) => ["name", "name:en", "official_name", "alt_name", "old_name", "short_name"].map((k) => t[k]).filter(Boolean) as string[];

const FOODISH = /hawker|food\s*cent(re|er)|food\s*village|market|makan|complex/i;
const NOT_FOODISH = /supermarket|hypermarket|mini\s*mart|minimart/i;
const STRONG_FOOD = /hawker|food\s*cent(re|er)|food\s*village|market|makan/i;
const nameHits = (t: Tags, re: RegExp) => namesOf(t).some((n) => re.test(n) && !NOT_FOODISH.test(n));
const amenityFood = (t: Tags) => t.amenity === "food_court" || t.amenity === "marketplace";
const foodish = (t: Tags) => amenityFood(t) || nameHits(t, FOODISH);
// "People's Park Complex" or "Golden Mile Complex": only "complex" says food, which is weak on its own.
const weakTag = (t: Tags) => !amenityFood(t) && !nameHits(t, STRONG_FOOD);
// Where people sit and eat, as opposed to the wet market next door.
const eats = (t: Tags) => t.amenity === "food_court" || namesOf(t).some((n) => /food|hawker|cooked|makan|eating/i.test(n));

const STOP = new Set(["and", "the", "of", "blk", "block", "at", "s", "singapore", "sg"]);
const GENERIC = new Set(["market", "food", "centre", "hawker", "cooked", "village", "court", "place", "complex", "fresh", "wet", "pasar", "mall", "new", "road", "street", "st", "ave", "avenue", "lane", "drive", "crescent", "central", "square"]);
const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/center/g, "centre")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w && !STOP.has(w));
const weight = (w: string) => (GENERIC.has(w) ? 0.25 : 1);

// NEA names look like "Smith Street Blk 335 (Chinatown Complex Market)": try the whole thing and each part.
function neaVariants(name: string): string[][] {
  const parts = [name, name.replace(/\(.*?\)/g, " "), ...[...name.matchAll(/\((.*?)\)/g)].flatMap((m) => m[1].split("/"))];
  return parts.map(tokens).filter((t) => t.length);
}

// Weighted Dice overlap between an OSM name and the best NEA variant; `strong` means a shared word that is not generic.
function nameMatch(osmNames: string[], nea: string[][]): { score: number; strong: boolean } {
  let best = { score: 0, strong: false };
  for (const n of osmNames) {
    const a = [...new Set(tokens(n))];
    for (const v of nea) {
      const b = new Set(v);
      const shared = a.filter((w) => b.has(w));
      const wa = a.reduce((s, w) => s + weight(w), 0);
      const wb = [...b].reduce((s, w) => s + weight(w), 0);
      const score = (2 * shared.reduce((s, w) => s + weight(w), 0)) / (wa + wb || 1);
      const strong = shared.some((w) => !GENERIC.has(w));
      if (Number(strong) > Number(best.strong) || (strong === best.strong && score > best.score)) best = { score, strong };
    }
  }
  return best;
}

// NEA addresses look like "Blk 91/92, Whampoa Drive, Singapore 320091/320092" or "2 Bukit Panjang Ring Road, Singapore 679947".
type NeaAddress = { blocks: string[]; street: string; postcodes: string[] };
const streetKey = (s: string) =>
  tokens(s.replace(/\bavenue\b/gi, "ave").replace(/\bstreet\b/gi, "st").replace(/\broad\b/gi, "rd"))
    .map((w) => (w.length > 3 ? w.replace(/s$/, "") : w))
    .sort()
    .join(" ");

function neaAddress(address: string): NeaAddress {
  const postcodes = (address.match(/\b\d{6}(?:\/\d{6})*\b/)?.[0] ?? "").split("/").filter(Boolean);
  const head = address.replace(/,?\s*Singapore\s*[\d/]*\s*$/i, "");
  const m = head.match(/^\s*(?:Blk\s*)?(\d+[A-Z]?(?:\s*(?:\/|and)\s*\d*[A-Z]?)*)\s*,?\s*(.*)$/i);
  if (!m) return { blocks: [], street: "", postcodes };
  const blocks: string[] = [];
  for (const part of m[1].split(/\s*(?:\/|and)\s*/i)) {
    const p = part.toUpperCase();
    if (/^\d/.test(p)) blocks.push(p);
    else if (p && blocks.length) blocks.push(blocks.at(-1)!.replace(/[A-Z]$/, "") + p); // "22A/B" means 22A and 22B
  }
  return { blocks, street: m[2].split(",")[0].trim(), postcodes };
}

// The building's own address tags (or a "Blk 32" style name close to the point) agree with NEA's address.
function addressMatch(t: Tags, a: NeaAddress, dist: number): boolean {
  const list = (v?: string) => (v ?? "").toUpperCase().split(/[;,]/).map((s) => s.replace(/\s+/g, "")).filter(Boolean);
  if (list(t["addr:postcode"]).some((p) => a.postcodes.includes(p))) return true;
  const sameStreet = !!t["addr:street"] && !!a.street && streetKey(t["addr:street"]) === streetKey(a.street);
  if (sameStreet && list(t["addr:housenumber"]).some((n) => a.blocks.includes(n))) return true;
  const blk = namesOf(t).join(" ").match(/^(?:blk|block)\s*(\d+[A-Z]?)\b/i)?.[1] ?? (/^\d{1,4}[A-Z]?$/.test(t.ref ?? "") ? t.ref : null);
  return !!blk && a.blocks.includes(blk.toUpperCase()) && dist <= 30;
}

function kindOf(t: Tags, area: number): string {
  const b = t.building ?? "";
  const name = namesOf(t).join(" ");
  const levels = levelsOf(t);
  const height = heightOf(t) ?? (levels != null ? levels * 3.5 : null);
  const railName = /\b(MRT|LRT)\b|\bstation\b/i.test(name) && !/service station|petrol|booster|fire station|police|pumping|power/i.test(name);
  if (t.railway === "station" || t.public_transport === "station" || b === "train_station" || railName) return "station";
  if (t.religion === "muslim" || b === "mosque" || /masjid|mosque/i.test(name)) return "mosque";
  if (t.religion === "christian" || ["church", "chapel", "cathedral"].includes(b) || /church|chapel|cathedral/i.test(name)) return "church";
  if (b === "temple" || b === "shrine" || (t.amenity === "place_of_worship" && t.religion !== "christian") || /temple|kuil|gurdwara|\bbio\b|\bkeng\b|\btong\b/i.test(name)) return "temple";
  if (["school", "university", "college", "kindergarten"].includes(b) || ["school", "university", "college", "kindergarten"].includes(t.amenity) || /school|college|kindergarten|polytechnic|institute/i.test(name)) return "school";
  if (b === "parking" || t.parking === "multi-storey" || t.amenity === "parking" || /car\s*park|\bMSCP\b/i.test(name)) return "carpark";
  if (["house", "detached", "semidetached_house", "terrace", "bungalow"].includes(b)) return "house";
  if (b === "residential" || b === "apartments" || /^(blk|block)\s*\d|\bHDB\b/i.test(name) || /^\d{1,4}[A-Z]?$/.test(t.ref ?? "")) return "hdb";
  // HDB postcodes end in the block number: Blk 91 Whampoa Drive is 320091.
  const blk = (t["addr:housenumber"] ?? "").match(/^(\d{1,3})[A-Z]?$/)?.[1];
  if (b === "yes" && blk && (t["addr:postcode"] ?? "").endsWith(blk.padStart(3, "0")) && !foodish(t)) return "hdb";
  if (t.historic || b === "shophouse") return "shophouse";
  if (b === "office" || t.office) return "office";
  if (["retail", "commercial"].includes(b)) {
    if (height != null && height >= 15) return "office";
    if (area < 600) return "shophouse";
  }
  return "other";
}

// ---------- per centre ----------

function buildingsFrom(data: any): { buildings: Building[]; pois: { tags: Tags; ll: Pt }[] } {
  const buildings: Building[] = [];
  const pois: { tags: Tags; ll: Pt }[] = [];
  const wayIds = new Set<number>();
  const seen = new Set<string>(); // a relation ring that repeats a building way would draw twice
  const ringKey = (r: Pt[]) => r.map((p) => p.join(",")).sort().join(" ");
  for (const e of data.elements) {
    if (e.type === "way" && e.geometry?.length >= 4 && e.geometry.every(Boolean)) {
      const ring = e.geometry.map((g: any) => [g.lon, g.lat] as Pt);
      if (!same(ring[0], ring.at(-1)!)) continue;
      buildings.push({ osm: `way/${e.id}`, tags: e.tags ?? {}, ll: openRing(ring) });
      wayIds.add(e.id);
      seen.add(ringKey(openRing(ring)));
    }
  }
  for (const e of data.elements) {
    if (e.type === "relation") {
      const outers = (e.members ?? []).filter((m: any) => m.type === "way" && (m.role === "outer" || m.role === "") && m.geometry?.every(Boolean));
      // A type=building relation that only wraps a way we already have adds nothing.
      if (outers.length === 1 && wayIds.has(outers[0].ref) && e.tags?.type !== "multipolygon") continue;
      // Each outer ring stands alone (Changi Village is two blocks in one relation), sharing the relation's id and tags.
      for (const ll of stitch(outers.map((m: any) => m.geometry.map((g: any) => [g.lon, g.lat] as Pt)))) {
        if (!seen.has(ringKey(ll))) buildings.push({ osm: `relation/${e.id}`, tags: e.tags ?? {}, ll });
      }
    }
    if (e.type === "node" && e.tags) pois.push({ tags: e.tags, ll: [e.lon, e.lat] });
  }
  return { buildings, pois };
}

type Pick = { b: Building; match: "tagged" | "contains" | "nearest"; named: boolean; addr: boolean; via?: string; far?: boolean };

function pickCentre(c: any, buildings: Building[], pois: { tags: Tags; ll: Pt }[]) {
  const p = projector(c.lat, c.lng);
  const nea = neaVariants(c.name);
  const where = neaAddress(c.address ?? "");
  const cands = buildings.map((b) => {
    const m = b.ll.map(p.to);
    const dist = distTo([0, 0], m);
    return { b, m, area: Math.abs(signedArea(m)), dist, name: nameMatch(namesOf(b.tags), nea), addr: addressMatch(b.tags, where, dist) };
  });
  const near = cands.filter((x) => x.dist <= TAG_RADIUS);

  // Food centre points (nodes) lend their name, and their address if it agrees with NEA's, to the building they sit in.
  const lent = new Map<string, { score: number; strong: boolean; addr: boolean; poi: string }>();
  for (const poi of pois) {
    const nm = nameMatch(namesOf(poi.tags), nea);
    const addr = addressMatch(poi.tags, where, Infinity);
    if (!nm.strong && !addr) continue;
    const at = p.to(poi.ll);
    const host = near.filter((x) => inside(at, x.m)).sort((a, b) => a.area - b.area)[0];
    const had = host && lent.get(host.b.osm);
    if (host && (!had || had.score < nm.score)) lent.set(host.b.osm, { ...nm, addr: addr || !!had?.addr, poi: namesOf(poi.tags)[0] ?? "" });
  }

  // Name match first, then: holds the NEA point, agrees with NEA's address, is where people eat (when NEA counts cooked
  // food stalls), and is close. Weak tags ("complex" alone, or a nameless market far off) have to earn their place.
  const tagged = near
    .filter((x) => foodish(x.b.tags) || lent.has(x.b.osm))
    .map((x) => {
      const l = lent.get(x.b.osm);
      const nm = l && l.strong && (!x.name.strong || l.score > x.name.score) ? l : x.name;
      const addr = x.addr || !!l?.addr;
      const holds = x.dist === 0;
      const known = nm.strong || addr;
      const eatery = c.stalls > 0 && (eats(x.b.tags) || (!!l && /food|hawker|cooked|makan/i.test(l.poi)));
      const score = (nm.strong ? nm.score : 0) + (holds ? 0.3 : 0) + (addr ? 0.5 : 0) + (known && eatery ? 0.4 : 0) - x.dist / 300;
      return { ...x, nm, addr, holds, score, via: l && nm === l ? l.poi : undefined };
    })
    .filter((x) => (lent.has(x.b.osm) || !weakTag(x.b.tags) || x.holds || x.addr) && (x.nm.strong || x.holds || x.addr || x.dist <= NEAR_RADIUS))
    .sort((a, b) => b.score - a.score);
  const holders = cands.filter((x) => x.dist === 0 && x.area > 50).sort((a, b) => Number(b.addr) - Number(a.addr) || a.area - b.area);
  const t = tagged[0];
  const taggedPick = t && ({ b: t.b, match: "tagged", named: t.nm.strong, addr: t.addr, via: t.via, far: t.dist > NEAR_RADIUS && !t.addr } as Pick);
  // A nameless, far, unaddressed food tag loses to the building that holds the point and carries NEA's address.
  // A name match over 60 m off is usually the old centre next to a new one being built, so it waits until last.
  if (t && !taggedPick.far && (t.nm.strong || t.holds || t.addr || !holders[0]?.addr)) return { pick: taggedPick, proj: p };

  if (holders[0]) return { pick: { b: holders[0].b, match: "contains", named: false, addr: holders[0].addr } as Pick, proj: p };

  const nearest = cands
    .filter((x) => x.dist <= NEAR_RADIUS && (x.area > NEAR_MIN_AREA || (x.addr && x.area > 50)))
    .sort((a, b) => Number(b.addr) - Number(a.addr) || a.dist - b.dist)[0];
  if (nearest) return { pick: { b: nearest.b, match: "nearest", named: false, addr: nearest.addr } as Pick, proj: p };
  return { pick: taggedPick ?? null, proj: p };
}

// Roughly 15 to 40 m2 of floor per cooked food stall, seating included. Most centres also hold a wet market that NEA's
// stall count leaves out, so the plausible band is wide. Markets-only centres have no stalls to judge by.
function sizeVerdict(area: number, stalls: number | null): "fine" | "off" | "wild" {
  if (!stalls) return "fine";
  const per = area / stalls;
  if (per < 8 || per > 250) return "wild";
  if (per < 15 || per > 100) return "off";
  return "fine";
}

function confidence(pick: Pick, area: number, stalls: number | null, holdsPoint: boolean): "high" | "medium" | "low" {
  const size = sizeVerdict(area, stalls);
  if (pick.far) return "medium";
  if (pick.match === "tagged" && (pick.named || pick.addr)) return "high";
  if (pick.addr) return pick.match === "nearest" ? (size === "wild" ? "low" : "medium") : size === "wild" ? "medium" : "high";
  if (pick.match === "nearest" || size === "wild") return "low";
  if (pick.match === "tagged") return holdsPoint && size === "fine" ? "high" : "medium";
  return size === "fine" ? "high" : "medium";
}

// ---------- main ----------

const { centres } = await Bun.file(IN).json();
const out: Record<string, any> = {};
const missing: { id: string; name: string; why: string }[] = [];
const notes: string[] = [];

for (const [i, c] of centres.entries()) {
  let data;
  try {
    const got = await osmAround(c);
    data = got.data;
    if (got.fresh && i < centres.length - 1) await Bun.sleep(PAUSE);
  } catch (e: any) {
    missing.push({ id: c.id, name: c.name, why: `Overpass did not answer (${e.message})` });
    console.log(`${c.id} ${c.name}: no answer from Overpass`);
    continue;
  }
  const { buildings, pois } = buildingsFrom(data);
  const { pick, proj } = pickCentre(c, buildings, pois);
  if (!pick) {
    const why = buildings.length ? `no food centre building within ${TAG_RADIUS} m, NEA point not inside a building, nothing over ${NEAR_MIN_AREA} m2 within ${NEAR_RADIUS} m` : `no buildings mapped within ${FETCH_RADIUS} m`;
    missing.push({ id: c.id, name: c.name, why });
    console.log(`${c.id} ${c.name}: missing (${why})`);
    continue;
  }

  // Final frame: centred on the outline's centroid.
  const [clon, clat] = proj.from(centroid(pick.b.ll.map(proj.to)));
  const f = projector(clat, clon);
  const ring = pick.b.ll.map(f.to);
  const area = Math.abs(signedArea(ring));
  const neaAt = f.to([c.lng, c.lat]);
  const holdsPoint = inside(neaAt, ring);

  const around = buildings
    .filter((b) => b !== pick.b)
    .map((b) => ({ b, m: b.ll.map(f.to) }))
    .map((x) => ({ ...x, d: distTo([0, 0], x.m), a: Math.abs(signedArea(x.m)) }))
    // Skip shapes nested in the centre (roofs, parts) and shells that wrap it, or you would spawn inside a wall.
    .filter((x) => x.d <= AROUND_RADIUS && x.a >= 8 && !inside(centroid(x.m), ring) && !inside([0, 0], x.m))
    .sort((a, b) => a.d - b.d)
    .slice(0, AROUND_MAX)
    .map((x) => ({ osm: x.b.osm, kind: kindOf(x.b.tags, x.a), levels: levelsOf(x.b.tags), height: heightOf(x.b.tags), outline: shape(x.m, 1, 16) }))
    .filter((x) => x.outline.length >= 3);

  // A centre still being built may not be in OpenStreetMap yet, so whatever stands on its point is at best a guess.
  const sure = confidence(pick, area, c.stalls, holdsPoint);
  const conf = /under construction/i.test(c.status) && sure === "high" ? "medium" : sure;
  const name = namesOf(pick.b.tags)[0] ?? pick.via ?? null;
  out[c.id] = {
    osm: pick.b.osm,
    name,
    match: pick.match,
    confidence: conf,
    levels: levelsOf(pick.b.tags),
    area: Math.round(area),
    offset: [r1(neaAt[0]), r1(-neaAt[1])],
    outline: shape(ring, 0.5, 64),
    around,
  };
  const per = c.stalls ? Math.round(area / c.stalls) : null;
  console.log(`${c.id} ${c.name}: ${pick.match}/${conf} ${pick.b.osm} "${name ?? ""}"${pick.via ? ` (via point "${pick.via}")` : ""} ${Math.round(area)} m2, ${c.stalls} stalls${per != null ? `, ${per} m2/stall` : ""}, NEA point ${Math.round(Math.hypot(...neaAt))} m from centroid${holdsPoint ? " (inside)" : ""}`);
}

const shared = new Map<string, string[]>();
for (const [id, v] of Object.entries(out)) shared.set(v.osm, [...(shared.get(v.osm) ?? []), id]);
for (const [osm, ids] of shared) if (ids.length > 1) notes.push(`${osm} is the pick for ${ids.length} centres: ${ids.join(", ")}`);

const json = JSON.stringify({
  source: "OpenStreetMap via the Overpass API",
  licence: "ODbL 1.0",
  attribution: "Building outlines © OpenStreetMap contributors",
  licenceUrl: "https://www.openstreetmap.org/copyright",
  fetchedAt: new Date().toISOString().slice(0, 10),
  centres: out,
  missing,
});
await Bun.write(OUT, json);

// ---------- summary ----------

const byName = new Map(centres.map((c: any) => [c.id, c]));
const entries = Object.entries(out).map(([id, v]) => ({ id, v, c: byName.get(id) as any }));
const tally = (key: string) => entries.reduce((m, e) => ({ ...m, [e.v[key]]: (m[e.v[key]] ?? 0) + 1 }), {} as Record<string, number>);
console.log(`\nWrote ${entries.length} centres (${(json.length / 1024).toFixed(0)} KB) to data/hawker-footprints.json`);
console.log("By match:", tally("match"));
console.log("By confidence:", tally("confidence"));
console.log(`Missing (${missing.length}):`);
for (const m of missing) console.log(`  ${m.id} ${m.name}: ${m.why}`);
const row = (e: (typeof entries)[number]) => {
  const per = e.c.stalls ? e.v.area / e.c.stalls : null;
  const verdict = sizeVerdict(e.v.area, e.c.stalls);
  return `  ${String(e.v.area).padStart(6)} m2  ${String(e.c.stalls).padStart(3)} stalls  ${per != null ? `${per.toFixed(0).padStart(4)} m2/stall` : "    n/a     "}  ${verdict === "fine" ? "    " : verdict === "off" ? "odd " : "WILD"}  ${e.v.match}/${e.v.confidence}  ${e.c.name}`;
};
const bySize = [...entries].sort((a, b) => b.v.area - a.v.area);
console.log("10 largest:");
bySize.slice(0, 10).forEach((e) => console.log(row(e)));
console.log("10 smallest:");
bySize.slice(-10).reverse().forEach((e) => console.log(row(e)));
for (const level of ["medium", "low"]) {
  console.log(`${level[0].toUpperCase() + level.slice(1)} confidence:`);
  entries.filter((e) => e.v.confidence === level).forEach((e) => console.log(row(e)));
}
for (const n of notes) console.log(n);

// Read the file back: it must parse, and every outline needs at least 3 points.
const back = await Bun.file(OUT).json();
const thin = Object.entries(back.centres).flatMap(([id, v]: [string, any]) => [v.outline, ...v.around.map((a: any) => a.outline)].filter((o) => o.length < 3).map(() => id));
console.log(thin.length ? `Outlines with under 3 points in: ${[...new Set(thin)].join(", ")}` : "Checked: file parses, every outline has 3 or more points");
if (json.length > 2.5 * 1024 * 1024) console.log("Over 2.5 MB: cut AROUND_MAX or the point caps");
