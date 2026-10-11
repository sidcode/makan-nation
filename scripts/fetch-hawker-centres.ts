// Builds data/hawker-centres.json for Makan Nation's Hawker Passport map.
// Run with: bun scripts/fetch-hawker-centres.ts            (downloads)
//      or: bun scripts/fetch-hawker-centres.ts file.json  (a GeoJSON you already downloaded)
// Photos stay on NEA's site: we keep the link (as https), never a copy.
// Source: NEA's Hawker Centres dataset on data.gov.sg (d_4a086da0a5553be1d89383cd90d07ecd), GeoJSON.
// The download endpoint rate-limits, so we wait and retry.

import { join } from "node:path";

const DATASET = "d_4a086da0a5553be1d89383cd90d07ecd";
const OUT = join(import.meta.dir, "../data/hawker-centres.json");

async function signedUrl(): Promise<string> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(`https://api-open.data.gov.sg/v1/public/api/datasets/${DATASET}/poll-download`, {
      signal: AbortSignal.timeout(30000),
    });
    const body: any = await res.json().catch(() => null);
    if (res.ok && body?.data?.url) return body.data.url;
    console.log(`  data.gov.sg said ${res.status}, waiting before retry ${attempt}`);
    await Bun.sleep(12000);
  }
  throw new Error("Could not get a download link from data.gov.sg");
}

// "1971", "1973-02-17", "Pre-War", null -> a year we can sort by, plus the label as NEA wrote it.
function parseYear(raw: unknown): { year: number | null; label: string } {
  const s = String(raw ?? "").trim();
  const m = s.match(/^(\d{4})/);
  if (m) return { year: Number(m[1]), label: m[1] };
  if (/pre-?war/i.test(s)) return { year: null, label: "Pre-war" };
  return { year: null, label: "Unknown" };
}

const titleCase = (s: string) => s.replace(/\b([a-z])/g, (c) => c.toUpperCase());

const local = process.argv[2];
const geo: any = local ? await Bun.file(local).json() : await (await fetch(await signedUrl(), { signal: AbortSignal.timeout(60000) })).json();

// NEA's photo links are http; the same files are served over https, so pages on https can show them.
function photo(raw: unknown) {
  const s = String(raw ?? "").trim();
  if (!/^https?:\/\/www\.nea\.gov\.sg\/images\/[\w\-/.]+\.(jpg|jpeg|png)$/i.test(s)) return null;
  return s.replace(/^http:/, "https:");
}
const centres = geo.features
  .map((f: any) => {
    const p = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    const { year, label } = parseYear(p.EST_ORIGINAL_COMPLETION_DATE);
    return {
      id: String(p.OBJECTID),
      name: String(p.NAME).trim(),
      address: titleCase(String(p.ADDRESS_MYENV ?? "").trim()),
      lat: Math.round(lat * 1e5) / 1e5,
      lng: Math.round(lng * 1e5) / 1e5,
      year,
      yearLabel: label,
      stalls: Number.isFinite(p.NUMBER_OF_COOKED_FOOD_STALLS) ? p.NUMBER_OF_COOKED_FOOD_STALLS : null,
      status: String(p.STATUS ?? ""),
      description: String(p.DESCRIPTION ?? "").trim() || null,
      upgraded: parseYear(p.HUP_COMPLETION_DATE?.split?.("/").pop()).year,
      photo: photo(p.PHOTOURL),
    };
  })
  .sort((a: any, b: any) => (a.year ?? 0) - (b.year ?? 0) || a.name.localeCompare(b.name));

await Bun.write(
  OUT,
  JSON.stringify(
    {
      source: "NEA Hawker Centres, data.gov.sg dataset d_4a086da0a5553be1d89383cd90d07ecd",
      sourceUrl: `https://data.gov.sg/datasets/${DATASET}/view`,
      fetchedAt: new Date().toISOString().slice(0, 10),
      centres,
    },
    null,
    0,
  ),
);
console.log(`Wrote ${centres.length} hawker centres to data/hawker-centres.json`);
