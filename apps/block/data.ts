// Block Birthday's data files for the static site (see site.ts). The blocks, the years and the song previews
// are copied from data/ as they are; this one is worked out from the hawker data.

const DATA = new URL("../../data/", import.meta.url);
const read = async (name: string) => JSON.parse(await Bun.file(new URL(name, DATA)).text());

// Which hawker centres each block is or stands within about 150 m of (data/hawker-hdb.json), and their names.
export async function blockHawkers() {
  const hdbFile = Bun.file(new URL("hawker-hdb.json", DATA));
  const hdb = (await hdbFile.exists()) ? await hdbFile.json() : { centres: {}, nearby: {} };
  const names = Object.fromEntries((await read("hawker-centres.json")).centres.map((c: any) => [c.id, c.name]));
  return JSON.stringify({
    // "51|OLD AIRPORT RD": ids of the centres it is (first, when it is one) or stands within about 150 m of.
    nearby: hdb.nearby ?? {},
    at: Object.fromEntries(Object.entries<any>(hdb.centres ?? {}).flatMap(([id, c]) => c.blocks.map((b: any) => [`${b.blk}|${b.street}`, id]))),
    names,
  });
}
