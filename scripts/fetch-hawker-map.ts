// Builds data/hawker-singapore.json, the land shapes for the Hawker Passport map.
// Run with: bun scripts/fetch-hawker-map.ts
// Source: URA's Master Plan 2019 Planning Area Boundary (No Sea), data.gov.sg dataset
// d_4765db0e87b9c86336792efe8a1f7a66. Each area is simplified (Douglas-Peucker) to keep the file small.

import { join } from "node:path";

const DATASET = "d_4765db0e87b9c86336792efe8a1f7a66";
const OUT = join(import.meta.dir, "../data/hawker-singapore.json");
const TOLERANCE = 0.0012; // degrees, about 130 m
const MIN_POINTS = 4;

async function signedUrl(): Promise<string> {
  for (let attempt = 1; attempt <= 8; attempt++) {
    const res = await fetch(`https://api-open.data.gov.sg/v1/public/api/datasets/${DATASET}/poll-download`, { signal: AbortSignal.timeout(30000) });
    const body: any = await res.json().catch(() => null);
    if (res.ok && body?.data?.url) return body.data.url;
    console.log(`  data.gov.sg said ${res.status}, waiting before retry ${attempt}`);
    await Bun.sleep(13000);
  }
  throw new Error("Could not get a download link from data.gov.sg");
}

type Pt = [number, number];

// Closed rings repeat their first point at the end; split them in two so the line test has a real chord.
function simplifyRing(ring: Pt[], tol: number): Pt[] {
  const open = ring.length > 1 && ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1] ? ring.slice(0, -1) : ring;
  if (open.length < 4) return open;
  const mid = Math.floor(open.length / 2);
  return [...simplify(open.slice(0, mid + 1), tol).slice(0, -1), ...simplify([...open.slice(mid), open[0]], tol).slice(0, -1)];
}

function simplify(points: Pt[], tol: number): Pt[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-12;
    let best = -1;
    let far = 0;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > far) [far, best] = [d, i];
    }
    if (far > tol && best > 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function areaName(props: any): string {
  return String(props?.PLN_AREA_N ?? "").trim();
}

const local = process.argv[2]; // optional: a GeoJSON file already downloaded
const geo: any = local ? await Bun.file(local).json() : await (await fetch(await signedUrl(), { signal: AbortSignal.timeout(120000) })).json();
const areas = [];
for (const f of geo.features) {
  const g = f.geometry;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  const rings: Pt[][] = [];
  for (const poly of polys) {
    const outer = simplifyRing(poly[0].map(([x, y]: number[]) => [x, y] as Pt), TOLERANCE);
    if (outer.length >= MIN_POINTS) rings.push(outer.map(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4]));
  }
  if (rings.length) areas.push({ name: areaName(f.properties), rings });
}
await Bun.write(
  OUT,
  JSON.stringify({
    source: "URA Master Plan 2019 Planning Area Boundary (No Sea), data.gov.sg",
    sourceUrl: `https://data.gov.sg/datasets/${DATASET}/view`,
    fetchedAt: new Date().toISOString().slice(0, 10),
    areas,
  }),
);
const pts = areas.reduce((n, a) => n + a.rings.reduce((m, r) => m + r.length, 0), 0);
console.log(`Wrote ${areas.length} planning areas (${pts} points) to data/hawker-singapore.json`);
