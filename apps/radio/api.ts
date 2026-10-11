// The radio's server extras: sealing capsules for everyone (data/capsules.json) and the local copies of slow
// archive recordings (cache.ts). Everything else the page needs is a static file (site.ts, data.ts).
import { join } from "node:path";
import { CACHE_DIR, fillCache } from "./cache.ts";

const DATA = join(import.meta.dir, "../../data");
const STATIONS_FILE = join(DATA, "radio.json");
const CAPSULES_FILE = join(DATA, "capsules.json");

const OPEN_YEARS = [2030, 2040, 2050, 2065];
const NOTE_MAX = 200;
const NAME_MAX = 40;

type Song = {
  id: number;
  title: string;
  artist: string;
  album: string;
  year: number | null;
  artwork: string;
  preview: string;
};

type Capsule = {
  id: string;
  song: Song;
  note: string;
  name: string;
  openYear: number;
  sealedAt: string;
  example?: boolean;
};

// iTunes Search is free and keyless; the server only looks up the song a capsule is sealed with.
function toSong(r: any): Song | null {
  if (!r?.trackId || !r?.previewUrl) return null;
  return {
    id: r.trackId,
    title: String(r.trackName ?? ""),
    artist: String(r.artistName ?? ""),
    album: String(r.collectionName ?? ""),
    year: r.releaseDate ? new Date(r.releaseDate).getUTCFullYear() : null,
    artwork: String(r.artworkUrl100 ?? "").replace("100x100bb", "300x300bb"),
    preview: String(r.previewUrl),
  };
}

async function itunes(path: string): Promise<any[]> {
  const res = await fetch(`https://itunes.apple.com/${path}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  const body = await res.json();
  return body.results ?? [];
}

async function lookupSong(id: number): Promise<Song | null> {
  const [r] = await itunes(`lookup?id=${id}&country=SG&entity=song`);
  return toSong(r);
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  const file = Bun.file(path);
  return (await file.exists()) ? ((await file.json()) as T) : fallback;
}

// Writes are queued so two people sealing at once cannot clobber each other.
let writeQueue = Promise.resolve();

function clean(s: unknown, max: number) {
  return String(s ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}

async function sealCapsule(req: Request) {
  const raw = await req.text();
  if (raw.length > 4000) return Response.json({ error: "That capsule is too heavy." }, { status: 413 });
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Could not read that." }, { status: 400 });
  }
  const songId = Number(body.songId);
  const openYear = Number(body.openYear);
  const note = clean(body.note, NOTE_MAX);
  const name = clean(body.name, NAME_MAX) || "Someone";
  if (!Number.isInteger(songId) || songId <= 0) return Response.json({ error: "Pick a song first." }, { status: 400 });
  if (!OPEN_YEARS.includes(openYear)) return Response.json({ error: "Pick a year to open it." }, { status: 400 });
  if (!note) return Response.json({ error: "Leave a note for the future." }, { status: 400 });

  // Song details come from iTunes, never from the client, so stored URLs are always Apple's.
  let song: Song | null = null;
  try {
    song = await lookupSong(songId);
  } catch {
    return Response.json({ error: "The song shop is not answering. Try again?" }, { status: 502 });
  }
  if (!song) return Response.json({ error: "Could not find that song." }, { status: 404 });

  const capsule: Capsule = {
    id: crypto.randomUUID(),
    song,
    note,
    name,
    openYear,
    sealedAt: new Date().toISOString(),
  };
  writeQueue = writeQueue.then(async () => {
    const saved = await readJson<Capsule[]>(CAPSULES_FILE, []);
    saved.push(capsule);
    await Bun.write(CAPSULES_FILE, JSON.stringify(saved, null, 2));
  });
  await writeQueue;
  return Response.json(capsule, { status: 201 });
}

// Range requests let the browser jump into the middle of a record without loading all of it.
function serveFrom(dir: string, pattern: RegExp) {
  return async (req: Request & { params: { file: string } }) => {
    const name = req.params.file;
    if (!pattern.test(name)) return new Response("Nope.", { status: 400 });
    const file = Bun.file(join(dir, name));
    if (!(await file.exists())) return new Response("Not here.", { status: 404 });
    const headers = { "cache-control": "public, max-age=86400", "accept-ranges": "bytes", "content-type": file.type };
    const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
    if (!range || (!range[1] && !range[2])) return new Response(file, { headers });
    const size = file.size;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    return new Response(file.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}` },
    });
  };
}

// Fill the cache in the background once per server process, so old recordings start instantly.
// RADIO_CACHE=off skips it; RADIO_CACHE=all also fetches the full (much larger) Rediffusion episodes.
const mode = process.env.RADIO_CACHE ?? "on";
if (mode !== "off") {
  (globalThis as any).__radioCache ??= readJson<any>(STATIONS_FILE, { past: [], rediffusion: [] }).then((d) =>
    fillCache({ clips: [...d.past, ...d.rediffusion], full: mode === "all" ? [...d.past, ...d.rediffusion] : d.past }),
  );
}

// Server extras: sealing capsules for everyone, and the local copies of slow archive recordings.
export const routes = {
  "/media/radio/audio/:file": serveFrom(CACHE_DIR, /^[a-f0-9]{16}(\.clip)?\.mp3$/),

  "/api/capsules": {
    POST: sealCapsule,
  },
};
