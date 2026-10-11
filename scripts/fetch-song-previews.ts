// Saves the 30 second iTunes previews for the songs curated in data/block-years.json to
// data/song-previews.json, so Block Birthday and Makan Nation's 1980s stall radio can play them on a static
// site with no search at runtime. Only the curated search terms are looked up, and a hit must match the
// curated title and artist. iTunes allows about 20 searches a minute, so this waits between them.
// Previews are Apple's; the files stay on Apple's servers and play from there.
// Run: bun scripts/fetch-song-previews.ts   (about five minutes; rerun if previews stop playing)

const DATA = `${import.meta.dir}/../data`;
const OUT = `${DATA}/song-previews.json`;
const years: Record<string, { songs: { title: string; term?: string; match?: string; artistMatch?: string }[] }> = (await Bun.file(`${DATA}/block-years.json`).json()).years;

type Preview = { trackName: string; artistName: string; previewUrl: string; artwork: string; trackViewUrl: string };
const old: { previews: Record<string, Preview | null> } = (await Bun.file(OUT).exists()) ? await Bun.file(OUT).json() : { previews: {} };
const previews: Record<string, Preview | null> = {};

const terms = new Map<string, { match: string; artistMatch: string }>();
for (const y of Object.values(years)) for (const s of y.songs ?? []) if (s.term) terms.set(s.term, { match: s.match ?? s.title, artistMatch: s.artistMatch ?? "" });

let n = 0;
for (const [term, { match, artistMatch }] of terms) {
  n++;
  const url = `https://itunes.apple.com/search?${new URLSearchParams({ term, country: "SG", entity: "song", limit: "15" })}`;
  let hit: Preview | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.status === 403 || res.status === 429) {
        await Bun.sleep(30000);
        continue;
      }
      const body: any = await res.json();
      const r = (body.results ?? []).find(
        (x: any) => x.previewUrl && String(x.trackName).toLowerCase().includes(match.toLowerCase()) && String(x.artistName).toLowerCase().includes(artistMatch.toLowerCase()),
      );
      if (r) hit = { trackName: r.trackName, artistName: r.artistName, previewUrl: r.previewUrl, artwork: String(r.artworkUrl100 ?? "").replace("100x100bb", "300x300bb"), trackViewUrl: r.trackViewUrl };
      break;
    } catch {
      await Bun.sleep(5000);
    }
  }
  // Keep an earlier hit if iTunes did not answer this time.
  previews[term] = hit ?? old.previews[term] ?? null;
  console.log(`${n}/${terms.size} ${previews[term] ? "found" : "none "} ${term}`);
  await Bun.sleep(3200);
}
await Bun.write(OUT, `${JSON.stringify({ fetchedAt: new Date().toISOString().slice(0, 10), source: "iTunes Search API (country SG); previews play from Apple's servers", previews }, null, 1)}\n`);
console.log(`Wrote ${Object.values(previews).filter(Boolean).length} of ${terms.size} previews to data/song-previews.json`);
