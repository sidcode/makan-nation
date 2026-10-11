// Builds data/hawker-streetview.json: for each of NEA's hawker centres, the nearest street-level photos on
// KartaView (360-degree panoramas first), for the customer mode's street view. KartaView's imagery is
// CC BY-SA 4.0; the game shows it from KartaView's servers with the photographer and date, never copied.
// Run with: bun scripts/fetch-hawker-streetview.ts
// Source: KartaView's public API (api.openstreetcam.org/1.0/list/nearby-photos), one polite request per centre.

import { join } from "node:path";

const DATA = join(import.meta.dir, "../data");
const OUT = join(DATA, "hawker-streetview.json");
const API = "https://api.openstreetcam.org/1.0/list/nearby-photos/";
const RADII = [150, 300]; // metres from NEA's point; the wider ring only when the first has nothing
const PANO_WITHIN = 100; // a 360-degree panorama this close beats a flat photo that is closer
const KEEP = 3;

const nea = (await Bun.file(join(DATA, "hawker-centres.json")).json()).centres;

const metres = (a: number, b: number, c: number, d: number) => {
  const x = (d - b) * 111320 * Math.cos(((a + c) / 2) * (Math.PI / 180));
  const y = (c - a) * 110574;
  return Math.hypot(x, y);
};

async function nearby(lat: number, lng: number, radius: number): Promise<any[]> {
  for (const wait of [0, 4000, 12000]) {
    if (wait) await Bun.sleep(wait);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "makan-nation-makeathon/0.1 (hawker centre street view)" },
        body: new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radius) }),
        signal: AbortSignal.timeout(30000),
      });
      const body: any = await res.json();
      if (Array.isArray(body?.currentPageItems)) return body.currentPageItems;
    } catch (e: any) {
      console.log(`  retry: ${e.message}`);
    }
  }
  return [];
}

const url = (path?: string) => (path ? `https://${path.replace(/^\/+/, "").replace(/^(storage\d+)\//, "$1.openstreetcam.org/")}` : null);

const centres: Record<string, any> = {};
let found = 0;
for (const c of nea) {
  if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
  let photos: any[] = [];
  for (const r of RADII) {
    photos = await nearby(c.lat, c.lng, r);
    await Bun.sleep(700);
    if (photos.length) break;
  }
  // 360-degree panoramas within PANO_WITHIN first, then the nearest, then the newest; one per sequence so
  // the picks differ.
  const seen = new Set();
  const near = (x: any) => x.pano && x.d <= PANO_WITHIN;
  const ranked = photos
    .map((p) => ({ p, d: metres(c.lat, c.lng, Number(p.lat), Number(p.lng)), pano: p.projection === "SPHERE" || p.field_of_view === "360" }))
    .sort((a, b) => Number(near(b)) - Number(near(a)) || a.d - b.d || String(b.p.shot_date).localeCompare(String(a.p.shot_date)))
    .filter(({ p }) => (seen.has(p.sequence_id) ? false : (seen.add(p.sequence_id), true)))
    .slice(0, KEEP)
    .map(({ p, d, pano }) => ({
      id: p.id,
      sequence: p.sequence_id,
      index: p.sequence_index,
      lat: Number(p.lat),
      lng: Number(p.lng),
      metres: Math.round(d),
      heading: p.heading != null ? Number(p.heading) : null,
      pano,
      shot: String(p.shot_date ?? p.date_added ?? "").slice(0, 10),
      by: p.username ?? "",
      image: url(p.lth_name),
      full: url(p.name),
      page: `https://kartaview.org/details/${p.sequence_id}/${p.sequence_index}/track-info`,
    }));
  if (ranked.length) {
    centres[c.id] = ranked;
    found++;
  }
  console.log(`${c.name.slice(0, 60)}: ${ranked.length ? `${ranked[0].pano ? "360" : "photo"} ${ranked[0].metres} m, ${ranked[0].shot}` : "none"}`);
}

await Bun.write(
  OUT,
  JSON.stringify(
    {
      source: "KartaView (api.openstreetcam.org), imagery CC BY-SA 4.0, by its photographers",
      licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      fetchedAt: new Date().toISOString().slice(0, 10),
      counts: { centres: nea.length, withPhotos: found },
      centres,
    },
    null,
    1,
  ) + "\n",
);
console.log(`${found} of ${nea.length} centres have street-level photos`);
