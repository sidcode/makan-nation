// Playlists for Makan Nation, borrowed from the other prototypes so each era sounds like its time:
//   1950s  the radio's shellac 78s
//   1980s  Rediffusion dialect dramas and the local songs Block Birthday lists for 1970 to 1989
//   today  live Singapore FM
//   2065   songs people sealed in the radio's time capsules, opened at last

import { join } from "node:path";
import { localCopy } from "../radio/cache.ts";

const DATA = join(import.meta.dir, "../../data");
const ERAS = ["1950s", "1980s", "today", "2065"];
// News and talk stations do not suit a busy kitchen.
const TALK = new Set(["Capital 958", "CNA 938"]);

type Track = { title: string; artist: string; year: number | null; src: string; live?: boolean; credit: string; source?: string };

async function readJson<T>(name: string, fallback: T): Promise<T> {
  const file = Bun.file(join(DATA, name));
  return (await file.exists()) ? ((await file.json()) as T) : fallback;
}

// Song previews come from the saved snapshot (scripts/fetch-song-previews.ts), so the static site needs no
// search at runtime.
async function previews(): Promise<Record<string, { previewUrl: string } | null>> {
  return (await readJson<any>("song-previews.json", { previews: {} })).previews ?? {};
}

// The Bun server plays its local copies of the slow archive recordings (radio/cache.ts); a static site
// streams them from the Internet Archive.
async function withLocal(r: any, server: boolean) {
  const copy = server && r.cache ? await localCopy(r.cache) : null;
  return copy?.audio ?? r.audio;
}

async function playlist(era: string, server: boolean): Promise<Track[]> {
  const radio = await readJson<any>("radio.json", { past: [], rediffusion: [], now: [] });

  if (era === "1950s") {
    return Promise.all(
      radio.past.map(async (r: any) => ({
        title: r.title,
        artist: r.artist,
        year: r.year,
        src: await withLocal(r, server),
        credit: "78rpm record, Internet Archive",
        source: r.source,
      })),
    );
  }

  if (era === "1980s") {
    const dramas = await Promise.all(
      radio.rediffusion.map(async (r: any) => ({
        title: r.title,
        artist: r.artist,
        year: null,
        src: await withLocal(r, server),
        credit: "Rediffusion Singapore, Internet Archive",
        source: r.source,
      })),
    );
    const years = (await readJson<any>("block-years.json", { years: {} })).years;
    const saved = await previews();
    const seen = new Set<string>();
    const songs: Track[] = [];
    for (let y = 1970; y <= 1989; y++) {
      for (const s of years[y]?.songs ?? []) {
        if (s.kind !== "local" || !s.term || seen.has(s.title)) continue;
        seen.add(s.title);
        const url = saved[s.term]?.previewUrl;
        if (url) songs.push({ title: s.title, artist: s.artist, year: y, src: url, credit: "30 second preview, Apple Music", source: s.src });
      }
    }
    return [...dramas, ...songs];
  }

  if (era === "today") {
    return radio.now
      .filter((s: any) => !TALK.has(s.name))
      .map((s: any) => ({ title: s.name, artist: `${s.freq} FM, ${s.lang}`, year: null, src: s.url, live: true, credit: "Live radio" }));
  }

  // Songs sealed in the radio's time capsules: the examples, and on the server everyone's. On a static site
  // the page adds the ones sealed in this browser.
  const seed = await readJson<any[]>("capsules.seed.json", []);
  const sealed = server ? await readJson<any[]>("capsules.json", []) : [];
  return [...seed, ...sealed].map((c) => ({
    title: c.song.title,
    artist: c.song.artist,
    year: c.openYear,
    src: c.song.preview,
    credit: `Sealed by ${c.name} for ${c.openYear}`,
  }));
}

// Pre-rendered voice clips from tools/voices/generate.py.
const VOICES = join(DATA, "hawker-voices");

async function voiceFile(req: Request & { params: { file: string } }) {
  const name = req.params.file;
  if (!/^([a-f0-9]{16}\.(mp3|wav)|manifest\.json)$/.test(name)) return new Response("Nope.", { status: 400 });
  const file = Bun.file(join(VOICES, name));
  if (!(await file.exists())) return new Response("Not here.", { status: 404 });
  return new Response(file, { headers: { "cache-control": name.endsWith(".json") ? "no-cache" : "public, max-age=86400" } });
}

// Photos, textures, sky maps and recordings for the game, each credited in its folder's manifest
// (apps/hawker/media/*.json). The static build copies the folder to the same path.
const MEDIA = join(import.meta.dir, "media");
const MEDIA_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", hdr: "application/octet-stream", mp3: "audio/mpeg", json: "application/json", mp4: "video/mp4", webm: "video/webm" };

async function mediaFile(req: Request) {
  const rel = decodeURIComponent(new URL(req.url).pathname.replace(/^\/hawker-media\//, ""));
  const ext = rel.split(".").pop() ?? "";
  if (!/^[a-z0-9][a-z0-9_\-\/]*\.[a-z0-9]+$/.test(rel) || rel.includes("..") || !MEDIA_TYPES[ext]) return new Response("Nope.", { status: 400 });
  const file = Bun.file(join(MEDIA, rel));
  if (!(await file.exists())) return new Response("Not here.", { status: 404 });
  const headers: Record<string, string> = { "content-type": MEDIA_TYPES[ext], "cache-control": ext === "json" ? "no-cache" : "public, max-age=86400", "accept-ranges": "bytes" };
  // Videos are fetched in byte ranges (Safari will not play one without them).
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range) {
    const size = file.size;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(size - 1, end);
    if (start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    return new Response(file.slice(start, end + 1), { status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) } });
  }
  return new Response(file, { headers });
}

// Every era's playlist, for data/soundtrack.json on the static site and the Bun server (site.ts).
export async function soundtrack({ server = false } = {}) {
  return JSON.stringify(Object.fromEntries(await Promise.all(ERAS.map(async (era) => [era, await playlist(era, server)]))));
}

export const routes = {
  "/hawker-media/*": mediaFile,
  "/hawker-voices/:file": voiceFile,
};
