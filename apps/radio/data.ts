// The radio's data files for the static site (site.ts). Nothing here starts the download cache; that only
// runs on the Bun server (api.ts).
import { join } from "node:path";
import { localCopy } from "./cache.ts";

const DATA = join(import.meta.dir, "../../data");
const readJson = async (name: string, fallback: any) => {
  const file = Bun.file(join(DATA, name));
  return (await file.exists()) ? file.json() : fallback;
};

// The stations, with label thumbnails from radio-labels/ beside the apps. On the server, old recordings play
// from its local copies once they are saved, because the Internet Archive is slow from some places.
export async function stationsJson({ server = false } = {}) {
  const data = await readJson("radio.json", { past: [], rediffusion: [], now: [] });
  for (const r of [...data.past, ...data.rediffusion]) {
    if (r.label) r.label = String(r.label).replace(/^\/media\/radio\/labels\//, "../radio-labels/");
    const copy = server && r.cache ? await localCopy(r.cache) : null;
    if (copy) Object.assign(r, copy);
  }
  return JSON.stringify(data);
}

// The capsules: the examples, and on the server everyone's. A static site adds the ones sealed in this browser
// (capsules.js).
export async function capsulesJson({ server = false } = {}) {
  const seed = (await readJson("capsules.seed.json", [])).map((c: any) => ({ ...c, example: true }));
  return JSON.stringify(server ? [...seed, ...(await readJson("capsules.json", []))] : seed);
}
