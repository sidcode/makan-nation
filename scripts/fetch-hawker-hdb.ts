// Builds data/hawker-hdb.json: which of NEA's hawker centres are HDB blocks (with HDB's block number, storeys
// and completion year), and the real block numbers and storeys of the HDB flats around each centre, for
// Makan Nation's customer mode and its picker.
// Run with: bun scripts/fetch-hawker-hdb.ts
//      or: bun scripts/fetch-hawker-hdb.ts --cache <dir>   (keeps raw Overpass answers in <dir>; HAWKER_OSM_CACHE=<dir> works too)
//
// Sources:
//   data/hdb-blocks.json        HDB Property Information (data.gov.sg, Singapore Open Data Licence), from fetch-block.ts
//   data/hawker-centres.json    NEA's hawker centres (data.gov.sg), from fetch-hawker-centres.ts
//   data/hawker-footprints.json OpenStreetMap outlines, from fetch-hawker-footprints.ts
//   OpenStreetMap address tags of those outlines, asked from Overpass in a few batches (ODbL 1.0, © OpenStreetMap contributors)
//
// A centre matches an HDB block when NEA's block number and street are HDB's ("Blk 91/92, Whampoa Drive" is
// 91 and 92 WHAMPOA DR). A building around a centre matches when its OSM addr:housenumber and addr:street are
// an HDB block's. HDB's "year completed" is the year HDB gives in that dataset; for some markets that is the
// year of a rebuild, not the first opening.

import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { normBlk, normStreet, streetMatches, tokens } from "../apps/block/street.js";

const DATA = join(import.meta.dir, "../data");
const OUT = join(DATA, "hawker-hdb.json");
const SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const USER_AGENT = "makan-nation-makeathon/0.1 (hawker centre HDB blocks)";
const BATCH = 400;
const flag = process.argv.indexOf("--cache");
const CACHE = flag >= 0 ? process.argv[flag + 1] : process.env.HAWKER_OSM_CACHE || null;
if (CACHE) mkdirSync(CACHE, { recursive: true });

const nea = (await Bun.file(join(DATA, "hawker-centres.json")).json()).centres;
const hdb = await Bun.file(join(DATA, "hdb-blocks.json")).json();
const prints = (await Bun.file(join(DATA, "hawker-footprints.json")).json()).centres;

// ---------- HDB blocks ----------

type Block = { blk: string; street: string; floors: number; year: number; town: string; units: number; res: boolean; com: boolean; market: boolean; carpark: boolean };
const BLOCKS: Block[] = hdb.blocks.map(([blk, street, floors, year, town, units, f]: any[]) => ({ blk, street, floors, year, town, units, res: f[0] === "Y", com: f[1] === "Y", market: f[2] === "Y", carpark: f[3] === "Y" }));
const byBlk = new Map<string, Block[]>();
for (const b of BLOCKS) byBlk.set(b.blk, [...(byBlk.get(b.blk) ?? []), b]);

// The HDB block at this number and street: exact first, then a street whose words start with the given ones
// ("TEBAN GARDEN RD" finds TEBAN GDNS RD, "BT MERAH LANE" finds BT MERAH LANE 1).
function findBlock(blk: string, street: string): { b: Block; how: "exact" | "loose" } | null {
  const list = byBlk.get(normBlk(blk)) ?? [];
  const st = normStreet(street);
  const exact = list.find((b) => b.street === st);
  if (exact) return { b: exact, how: "exact" };
  const loose = list.filter((b) => streetMatches(b.street, tokens(street)) || streetMatches(st, b.street.split(" ")));
  return loose.length === 1 ? { b: loose[0], how: "loose" } : null;
}

// NEA addresses: "Blk 91/92, Whampoa Drive, Singapore 320091/320092", "Blk 22A/B, Havelock Road", "Blk 2/3, Changi Village Road".
function neaBlocks(address: string): { blocks: string[]; street: string } {
  const head = String(address ?? "").replace(/,?\s*Singapore\s*[\d/]*\s*$/i, "");
  const m = head.match(/^\s*(?:Blk\s*)?(\d+[A-Z]?(?:\s*(?:\/|and|&)\s*\d*[A-Z]?)*)\s*,\s*(.*)$/i);
  if (!m || !/^\s*Blk/i.test(head)) return { blocks: [], street: "" };
  const blocks: string[] = [];
  for (const part of m[1].split(/\s*(?:\/|and|&)\s*/i)) {
    const p = part.toUpperCase();
    if (/^\d/.test(p)) blocks.push(p);
    else if (p && blocks.length) blocks.push(blocks.at(-1)!.replace(/[A-Z]$/, "") + p);
  }
  return { blocks, street: m[2].split(",")[0].trim() };
}

const slim = (b: Block) => ({ blk: b.blk, street: b.street, floors: b.floors, year: b.year, units: b.units, res: b.res, com: b.com, market: b.market, carpark: b.carpark });

const centres: Record<string, any> = {};
const usedMarkets = new Set<Block>();
for (const c of nea) {
  const a = neaBlocks(c.address);
  const hits = a.blocks.map((blk) => findBlock(blk, a.street)).filter(Boolean) as { b: Block; how: string }[];
  if (!hits.length) continue;
  hits.forEach((h) => h.b.market && usedMarkets.add(h.b));
  centres[c.id] = { name: c.name, blocks: hits.map((h) => slim(h.b)), match: hits.every((h) => h.how === "exact") ? "exact" : "loose" };
}

// ---------- The buildings around each centre, from OSM ----------

async function overpass(query: string): Promise<any> {
  const file = CACHE ? Bun.file(join(CACHE, `${Bun.hash(query).toString(16)}.json`)) : null;
  if (file && (await file.exists())) return file.json();
  const body = await ask(query);
  if (file) await Bun.write(file, JSON.stringify(body));
  return body;
}

async function ask(query: string): Promise<any> {
  for (const server of SERVERS) {
    for (const wait of [0, 10000, 30000, 60000]) {
      if (wait) await Bun.sleep(wait);
      try {
        const res = await fetch(server, {
          method: "POST",
          headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
          body: "data=" + encodeURIComponent(query),
          signal: AbortSignal.timeout(120000),
        });
        const text = await res.text();
        const body: any = res.ok && text.trimStart().startsWith("{") ? JSON.parse(text) : null;
        if (body && Array.isArray(body.elements) && !/error|timed out/i.test(body.remark ?? "")) return body;
        console.log(`  ${new URL(server).host} said ${res.status}${body ? `: ${body.remark}` : ", not JSON"}`);
      } catch (e: any) {
        console.log(`  ${new URL(server).host} failed: ${e.message}`);
      }
    }
  }
  throw new Error("no Overpass server answered");
}

const ids = new Set<string>();
for (const p of Object.values<any>(prints)) {
  if (p?.osm) ids.add(p.osm);
  for (const a of p?.around ?? []) ids.add(a.osm);
}
const list = [...ids];
const tagsOf = new Map<string, Record<string, string>>();
for (let i = 0; i < list.length; i += BATCH) {
  const part = list.slice(i, i + BATCH);
  const ways = part.filter((x) => x.startsWith("way/")).map((x) => x.slice(4));
  const rels = part.filter((x) => x.startsWith("relation/")).map((x) => x.slice(9));
  const q = `[out:json][timeout:90];(${ways.length ? `way(id:${ways.join(",")});` : ""}${rels.length ? `relation(id:${rels.join(",")});` : ""});out tags;`;
  console.log(`asking Overpass for ${part.length} buildings (${i + part.length} of ${list.length})`);
  const body = await overpass(q);
  for (const e of body.elements) tagsOf.set(`${e.type}/${e.id}`, e.tags ?? {});
  await Bun.sleep(1500);
}

const around: Record<string, any> = {};
const aroundKey = new Map<string, string>();
let tagged = 0;
for (const id of list) {
  const t = tagsOf.get(id);
  if (!t) continue;
  const nums = (t["addr:housenumber"] ?? "").split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  if (nums.length) tagged++;
  const street = t["addr:street"];
  if (!street) continue;
  for (const n of nums) {
    const hit = findBlock(n, street);
    if (hit) {
      // Kept short: block number, storeys, year completed, and whether people live there.
      around[id] = [hit.b.blk, hit.b.floors, hit.b.year, hit.b.res ? 1 : 0, hit.b.units];
      aroundKey.set(id, `${hit.b.blk}|${hit.b.street}`);
      break;
    }
  }
}

// ---------- Flats over the hall ----------
// Some centres are the podium of a block of flats (Albert Centre, Tekka Centre, Hong Lim). The footprint script
// leaves out buildings standing on the centre, so here we ask OSM for buildings and building parts over each
// centre's outline and keep the tall ones: at least four storeys, mostly over the hall.

const toXZ = (lng: number, lat: number, lng0: number, lat0: number): [number, number] => [(lng - lng0) * 111320 * Math.cos((lat0 * Math.PI) / 180), -(lat - lat0) * 110574];
const inside = (x: number, z: number, poly: number[][]) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
};
// How much of a building's floor lies inside the hall's outline, by sampling a grid over it.
function shareInside(b: number[][], hall: number[][]): number {
  const xs = b.map((p) => p[0]);
  const zs = b.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const step = Math.max(0.5, Math.max(x1 - x0, z1 - z0) / 24);
  let n = 0;
  let k = 0;
  for (let x = x0 + step / 2; x < x1; x += step) {
    for (let z = z0 + step / 2; z < z1; z += step) {
      if (!inside(x, z, b)) continue;
      n++;
      if (inside(x, z, hall)) k++;
    }
  }
  return n ? k / n : 0;
}
const centroidOf = (pts: number[][]) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
// How much of a building lies inside any of some other outlines.
function shareInsideAny(b: number[][], others: number[][][]): number {
  const xs = b.map((p) => p[0]);
  const zs = b.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const step = Math.max(0.5, Math.max(x1 - x0, z1 - z0) / 24);
  let n = 0;
  let k = 0;
  for (let x = x0 + step / 2; x < x1; x += step) {
    for (let z = z0 + step / 2; z < z1; z += step) {
      if (!inside(x, z, b)) continue;
      n++;
      if (others.some((o) => inside(x, z, o))) k++;
    }
  }
  return n ? k / n : 0;
}
const levels = (v?: string) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? Math.round(n) : null;
};

const where = nea
  .map((c: any) => {
    const p = prints[c.id];
    if (!p?.outline || !p.offset) return null;
    // The footprint frame is centred on the outline's centroid; `offset` is NEA's point in it.
    const lng0 = c.lng - p.offset[0] / (111320 * Math.cos((c.lat * Math.PI) / 180));
    const lat0 = c.lat + p.offset[1] / 110574;
    const r = Math.max(...p.outline.map(([x, z]: number[]) => Math.hypot(x, z))) + 5;
    return { id: c.id, lng0, lat0, r: Math.ceil(r), hall: p.outline, self: p.osm };
  })
  .filter(Boolean) as { id: string; lng0: number; lat0: number; r: number; hall: number[][]; self: string }[];

const over: Record<string, any[]> = {};
for (let i = 0; i < where.length; i += 6) {
  const part = where.slice(i, i + 6);
  const q = `[out:json][timeout:120];(${part.map((w) => `way["building"](around:${w.r},${w.lat0},${w.lng0});way["building:part"](around:${w.r},${w.lat0},${w.lng0});`).join("")});out tags geom;`;
  console.log(`asking Overpass for buildings over ${part.length} centres (${i + part.length} of ${where.length})`);
  const body = await overpass(q);
  for (const w of part) {
    for (const e of body.elements) {
      const id = `${e.type}/${e.id}`;
      if (id === w.self || !e.geometry?.length) continue;
      const t = e.tags ?? {};
      const lv = levels(t["building:levels"]);
      const hdbHit = t["addr:housenumber"] && t["addr:street"] ? findBlock(t["addr:housenumber"].split(/[;,]/)[0].trim(), t["addr:street"]) : null;
      const storeys = lv ?? hdbHit?.b.floors ?? null;
      if (!storeys || storeys < 4) continue;
      const pts = e.geometry.map((g: any) => toXZ(g.lon, g.lat, w.lng0, w.lat0).map((v) => Math.round(v * 10) / 10));
      if (pts.length > 2 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) pts.pop();
      if (pts.length < 3 || shareInside(pts, w.hall) < 0.4) continue;
      // What it is: flats (HDB says people live there, or OSM tags it residential), offices, or something else.
      const tag = [t.building, t["building:part"]].find((v) => v && v !== "yes") ?? "";
      const use = hdbHit ? (hdbHit.b.res ? "flats" : "other") : ["residential", "apartments", "house", "dormitory"].includes(tag) ? "flats" : tag === "office" || tag === "commercial" || t.office ? "office" : "other";
      const entry: any = { osm: id, use, levels: storeys, minLevel: levels(t["building:min_level"]), outline: pts };
      if (t.name) entry.name = t.name;
      if (!t.building && t["building:part"]) entry.part = true;
      if (hdbHit) Object.assign(entry, { blk: hdbHit.b.blk, street: hdbHit.b.street, floors: hdbHit.b.floors, year: hdbHit.b.year, units: hdbHit.b.units, res: hdbHit.b.res });
      else if (t["addr:housenumber"]) entry.number = t["addr:housenumber"];
      (over[w.id] ??= []).push(entry);
    }
  }
  await Bun.sleep(3000);
}

// OSM draws a tower either as one building or as building parts (a podium, then the tower from its third
// storey), and sometimes as both. Where a building holds parts that start higher up, the building stops where
// they start; where parts cover a building from its base, the parts replace it, as 3D maps do. Parts take the
// building's block number and HDB facts.
for (const [id, list] of Object.entries(over)) {
  const parts = list.filter((e) => e.part);
  if (!parts.length) continue;
  over[id] = list.filter((b) => {
    if (b.part) return true;
    const mine = parts.filter((p) => inside(...(centroidOf(p.outline) as [number, number]), b.outline));
    if (!mine.length) return true;
    for (const p of mine) {
      for (const k of ["blk", "street", "year", "units", "res", "number"]) if (b[k] != null && p[k] == null) p[k] = b[k];
      if (b.use === "flats") p.use = "flats";
    }
    const lowest = Math.min(...mine.map((p) => p.minLevel ?? 0));
    if (lowest > (b.minLevel ?? 0) + 1) {
      b.levels = lowest;
      b.capped = true;
      delete b.floors;
      return true;
    }
    return shareInsideAny(b.outline, mine.map((p) => p.outline)) < 0.5;
  });
}

// For Block Birthday: the centres each HDB block stands beside (within about 150 m), and the centre a market
// block is, keyed like HDB's data ("51|OLD AIRPORT RD").
const nearby: Record<string, string[]> = {};
for (const [cid, p] of Object.entries<any>(prints)) {
  for (const a of p?.around ?? []) {
    const key = aroundKey.get(a.osm);
    if (key && !(nearby[key] ??= []).includes(cid)) nearby[key].push(cid);
  }
}
for (const [cid, c] of Object.entries<any>(centres)) for (const b of c.blocks) nearby[`${b.blk}|${b.street}`] = [cid, ...(nearby[`${b.blk}|${b.street}`] ?? []).filter((x) => x !== cid)];

// HDB blocks with a market or hawker centre that are not in NEA's list: wet markets, and food centres HDB or others run.
const others = BLOCKS.filter((b) => b.market && !usedMarkets.has(b)).map((b) => ({ ...slim(b), town: b.town }));

const out = {
  source: "HDB Property Information and NEA Hawker Centres (data.gov.sg, Singapore Open Data Licence); OpenStreetMap address tags (ODbL 1.0, © OpenStreetMap contributors)",
  sources: [
    ["HDB Property Information (data.gov.sg)", "https://data.gov.sg/datasets/d_17f5382f26140b1fdae0ba2ef6239d2f/view"],
    ["NEA Hawker Centres (data.gov.sg)", "https://data.gov.sg/datasets/d_4a086da0a5553be1d89383cd90d07ecd/view"],
    ["OpenStreetMap", "https://www.openstreetmap.org/copyright"],
  ],
  fetchedAt: new Date().toISOString().slice(0, 10),
  note: "year is HDB's year completed, which for some markets is the year of a rebuild",
  counts: {
    neaCentres: nea.length,
    hdbCentres: Object.keys(centres).length,
    flatsInBlock: Object.values<any>(centres).filter((c) => c.blocks.some((b: any) => b.res)).length,
    towersOver: Object.keys(over).length,
    flatsOver: Object.values(over).filter((list) => list.some((t: any) => t.use === "flats")).length,
    hdbMarketBlocks: BLOCKS.filter((b) => b.market).length,
    aroundAsked: list.length,
    aroundWithNumber: tagged,
    aroundMatched: Object.keys(around).length,
  },
  aroundFields: ["blk", "floors", "year", "res", "units"],
  centres,
  over,
  around,
  nearby,
  otherMarketBlocks: others,
};
await Bun.write(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(out.counts);
