// Downloads the HDB Property Information dataset from data.gov.sg and writes
// a compact snapshot to data/hdb-blocks.json so the Block Birthday demo runs offline.
// Run: bun scripts/fetch-block.ts

const DATASET = "d_17f5382f26140b1fdae0ba2ef6239d2f";
const OUT = new URL("../data/hdb-blocks.json", import.meta.url);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string, tries = 6): Promise<any> {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);
    if (res.status === 429) {
      console.log("  rate limited, waiting 12s");
      await sleep(12_000);
      continue;
    }
    const body = await res.json().catch(() => null);
    if (body?.code === 24 || body?.name === "TOO_MANY_REQUESTS") {
      console.log("  rate limited, waiting 12s");
      await sleep(12_000);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} for ${url}`);
    return body;
  }
  throw new Error(`gave up on ${url}`);
}

// Tiny CSV parser that handles quoted fields with commas.
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

async function viaDownload(): Promise<Record<string, string>[]> {
  const base = `https://api-open.data.gov.sg/v1/public/api/datasets/${DATASET}`;
  let init = await getJson(`${base}/initiate-download`);
  let url: string | undefined = init?.data?.url;
  for (let i = 0; !url && i < 10; i++) {
    await sleep(3_000);
    const poll = await getJson(`${base}/poll-download`);
    url = poll?.data?.url;
  }
  if (!url) throw new Error("no download url");
  const csv = await (await fetch(url)).text();
  return parseCsv(csv);
}

async function viaPaging(): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];
  const limit = 5000;
  for (let offset = 0; ; offset += limit) {
    const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET}&limit=${limit}&offset=${offset}`;
    const body = await getJson(url);
    const recs = body?.result?.records ?? [];
    rows.push(...recs);
    console.log(`  ${rows.length} / ${body?.result?.total}`);
    if (recs.length < limit) break;
    await sleep(2_500);
  }
  return rows;
}

let raw: Record<string, string>[];
try {
  console.log("Trying the full CSV download");
  raw = await viaDownload();
} catch (err) {
  console.log(`CSV download failed (${(err as Error).message}), paging the API instead`);
  raw = await viaPaging();
}

// Compact row: [blk, street, floors, year, town, units, flags]
// flags: residential, commercial, market_hawker, multistorey_carpark, precinct_pavilion as Y/N
const blocks = raw
  .filter((r) => r.blk_no && r.street && /^\d{4}$/.test(r.year_completed))
  .map((r) => [
    r.blk_no.toUpperCase(),
    r.street.toUpperCase(),
    Number(r.max_floor_lvl) || 0,
    Number(r.year_completed),
    r.bldg_contract_town,
    Number(r.total_dwelling_units) || 0,
    [r.residential, r.commercial, r.market_hawker, r.multistorey_carpark, r.precinct_pavilion]
      .map((v) => (v === "Y" ? "Y" : "N"))
      .join(""),
  ]);

const years = blocks.map((b) => b[3] as number);
await Bun.write(
  OUT,
  JSON.stringify({
    source: "HDB Property Information, data.gov.sg (Singapore Open Data Licence)",
    fetched: new Date().toISOString().slice(0, 10),
    fields: ["blk", "street", "floors", "year", "town", "units", "flags:res,com,market,carpark,pavilion"],
    blocks,
  }),
);
console.log(`Wrote ${blocks.length} blocks (${Math.min(...years)} to ${Math.max(...years)}) to data/hdb-blocks.json`);
