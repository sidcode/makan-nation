// Cuts the short, silent, looping clips in apps/hawker/media/loops/ (one gesture per dish: the pull of a teh,
// the flip of a prata) from openly licensed footage. apps/hawker/media/loops.json lists each loop with its
// source, author, licence and the seconds used; this script reads that list, downloads each source once,
// and writes <dish>.webm (VP9) and <dish>.mp4 (H.264, for Safari), 480 by 360 at 24 fps with no sound, and a
// <dish>.jpg poster.
// Run with: bun scripts/make-dish-loops.ts [--cache <dir>] [dish ...]     (needs ffmpeg on PATH)
//
// Footage we film ourselves (with the hawker's agreement; docs/dish-loops-shot-list.md) has a source.file
// instead of a source.fileUrl: a path from the repo root, usually data/loops-raw/<dish>.mp4, which is not
// committed because phone clips are big. Keep the originals somewhere safe.
//
// Each loop crossfades its last half second into its first, so it plays round without a jump. They are
// stored as small videos rather than GIFs: a GIF of the same three seconds is about twenty times the size
// (satay: 4.9 MB as a GIF, 217 KB as an MP4), and a video can be paused when it scrolls out of view or when
// someone asks for less motion.

import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

const ROOT = join(import.meta.dir, "..");
const MEDIA = join(ROOT, "apps/hawker/media");
const OUT = join(MEDIA, "loops");
const LIST = join(MEDIA, "loops.json");
const USER_AGENT = "makan-nation-makeathon/0.1 (hawker dish loops; one download per file)";
const W = 480;
const H = 360;
const FPS = 24;
const FADE = 0.5;

const flag = process.argv.indexOf("--cache");
const CACHE = flag >= 0 ? process.argv[flag + 1] : process.env.LOOP_CACHE || join(ROOT, "data/cache/loops");
const only = process.argv.slice(2).filter((a, i, all) => a !== "--cache" && all[i - 1] !== "--cache");
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

type Loop = {
  file: string;
  poster: string;
  shows: string;
  segment: [number, number];
  crop?: string; // ffmpeg crop=w:h:x:y in source pixels, before scaling; default is a centred 4:3
  source: { site: string; page?: string; fileUrl?: string; file?: string; author: string; licence: string; licenceUrl?: string; filmedAt?: string; title?: string; consent?: string };
};

const list: { loops: Record<string, Loop> } = await Bun.file(LIST).json();

async function download(url: string): Promise<string> {
  const name = url.split("/").pop()!.split("?")[0].replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);
  const path = join(CACHE, name);
  if (existsSync(path)) return path;
  console.log(`  downloading ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(600000) });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  await Bun.write(path, res);
  return path;
}

async function run(args: string[]) {
  const p = Bun.spawn(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", ...args], { stderr: "pipe" });
  const err = await new Response(p.stderr).text();
  if ((await p.exited) !== 0) throw new Error(err.trim());
}

for (const [dish, loop] of Object.entries(list.loops)) {
  if (only.length && !only.includes(dish)) continue;
  console.log(`${dish}: ${loop.shows}`);
  const src = loop.source.file ? join(ROOT, loop.source.file) : await download(loop.source.fileUrl!);
  if (!existsSync(src)) throw new Error(`${dish}: no file at ${src}`);
  const [start, end] = loop.segment;
  const len = end - start;
  const crop = loop.crop ? `crop=${loop.crop},` : `crop='min(iw,ih*4/3)':'min(ih,iw*3/4)',`;
  const frame = `${crop}scale=${W}:${H}:flags=lanczos,fps=${FPS},format=yuv420p,setsar=1`;
  // main: the clip; tail: the half second after it, faded over the clip's start so the end meets the start.
  const graph = [
    `[0:v]trim=0:${len + FADE},setpts=PTS-STARTPTS,${frame},split[a][b]`,
    `[a]trim=0:${len},setpts=PTS-STARTPTS,split[m1][m2]`,
    `[b]trim=${len}:${len + FADE},setpts=PTS-STARTPTS[tail]`,
    `[m1]trim=0:${FADE},setpts=PTS-STARTPTS[head]`,
    `[m2]trim=${FADE}:${len},setpts=PTS-STARTPTS[rest]`,
    `[tail][head]xfade=transition=fade:duration=${FADE}:offset=0[blend]`,
    `[blend][rest]concat=n=2:v=1:a=0,format=yuv420p[out]`,
  ].join(";");
  const webm = loop.file.replace(/\.mp4$/, ".webm");
  await run(["-ss", String(start), "-i", src, "-filter_complex", graph, "-map", "[out]", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "29", "-profile:v", "main", "-movflags", "+faststart", join(OUT, loop.file)]);
  await run(["-i", join(OUT, loop.file), "-an", "-c:v", "libvpx-vp9", "-crf", "37", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", join(OUT, webm)]);
  await run(["-i", join(OUT, loop.file), "-frames:v", "1", "-q:v", "4", join(OUT, loop.poster)]);
  const kb = (f: string) => Math.round(Bun.file(join(OUT, f)).size / 1024);
  console.log(`  wrote ${webm} (${kb(webm)} KB), ${loop.file} (${kb(loop.file)} KB) and ${loop.poster}`);
}
