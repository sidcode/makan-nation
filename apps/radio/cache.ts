// Keeps local copies of the old recordings so they start instantly.
// The Internet Archive can be very slow from here (we measured 5 to 17 KB/s per connection, less than
// a record needs to play), so the server fills this cache quietly in the background, in two passes:
//   1. the first ~30 seconds of every record and Rediffusion episode, so each one plays straight away on a loop
//   2. the full 78s, which replace the clips as they arrive (Rediffusion episodes too with RADIO_CACHE=all)
// The radio always uses the best copy it has: full, then clip, then the archive itself.

import { createHash } from "node:crypto";
import { mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";

export const CACHE_DIR = join(import.meta.dir, "../../data/cache/radio");
const CLIP_BYTES = 480_000; // about 30 seconds of a 128 kbps mp3

export const cacheName = (url: string) => createHash("sha1").update(url).digest("hex").slice(0, 16) + ".mp3";
export const clipName = (cache: string) => cache.replace(/\.mp3$/, ".clip.mp3");

export async function download(url: string, path: string, { bytes = 0, timeoutMs = 45 * 60 * 1000 } = {}) {
  if (await Bun.file(path).exists()) return true;
  try {
    const headers = bytes ? { range: `bytes=0-${bytes - 1}` } : undefined;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok || !res.body) return false;
    let data: ArrayBuffer;
    if (bytes) {
      // Files inside the archive's zips ignore Range, so read only what we need and hang up.
      const reader = res.body.getReader();
      const parts: Uint8Array[] = [];
      let got = 0;
      while (got < bytes) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        got += value.length;
      }
      await reader.cancel().catch(() => {});
      data = Bun.concatArrayBuffers(parts).slice(0, bytes);
    } else {
      data = await res.arrayBuffer();
    }
    // Write to a side file first so a half finished download is never served.
    await Bun.write(`${path}.part`, data);
    await rename(`${path}.part`, path);
    return true;
  } catch {
    await rm(`${path}.part`, { force: true });
    return false;
  }
}

// The best local copy of a record, if there is one.
export async function localCopy(cache: string) {
  if (await Bun.file(join(CACHE_DIR, cache)).exists()) return { audio: `/media/radio/audio/${cache}`, clip: false };
  if (await Bun.file(join(CACHE_DIR, clipName(cache))).exists()) {
    return { audio: `/media/radio/audio/${clipName(cache)}`, clip: true };
  }
  return null;
}

type Item = { audio: string; cache: string; title: string };

// `clips` get a 30 second clip first, then everything in `full` is fetched whole.
export async function fillCache({ clips, full }: { clips: Item[]; full: Item[] }, { workers = 2, log = console.log } = {}) {
  await mkdir(CACHE_DIR, { recursive: true });
  const has = (name: string) => Bun.file(join(CACHE_DIR, name)).exists();

  const run = async (todo: Item[], label: string, fetchOne: (it: Item) => Promise<boolean>) => {
    if (!todo.length) return;
    log(`Radio cache: ${label} for ${todo.length} records`);
    const queue = [...todo];
    let done = 0;
    const worker = async () => {
      for (let it = queue.shift(); it; it = queue.shift()) {
        const ok = await fetchOne(it);
        done += 1;
        log(`Radio cache: ${ok ? "saved" : "could not fetch"} ${label} of ${it.title} (${done}/${todo.length})`);
      }
    };
    await Promise.all(Array.from({ length: workers }, worker));
  };

  const needClip: Item[] = [];
  for (const it of clips) if (!(await has(it.cache)) && !(await has(clipName(it.cache)))) needClip.push(it);
  await run(needClip, "30 second clip", (it) => download(it.audio, join(CACHE_DIR, clipName(it.cache)), { bytes: CLIP_BYTES }));

  const needFull: Item[] = [];
  for (const it of full) if (!(await has(it.cache))) needFull.push(it);
  await run(needFull, "full record", (it) => download(it.audio, join(CACHE_DIR, it.cache)));
}
