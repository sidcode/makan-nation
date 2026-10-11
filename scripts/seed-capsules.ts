// Writes data/capsules.seed.json, a few example capsules so the future end of the dial is not empty.
// Run with: bun scripts/seed-capsules.ts

import { join } from "node:path";

const SEEDS = [
  { songId: 930759487, openYear: 2030, note: "Singapore rock with long hair and big feelings. Turn it up." },
  { songId: 973582550, openYear: 2040, note: "Proof that this island can be silly and proud in the same song." },
  { songId: 1071753628, openYear: 2050, note: "Every KTV night ended with this one. Please keep the KTV rooms open." },
  { songId: 1136286496, openYear: 2065, note: "For SG100. If a stadium still goes quiet for this, we did fine." },
];

const capsules = [];
for (const s of SEEDS) {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${s.songId}&country=SG&entity=song`);
  const r = (await res.json()).results[0];
  capsules.push({
    id: `example-${s.songId}`,
    song: {
      id: r.trackId,
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      year: r.releaseDate ? new Date(r.releaseDate).getUTCFullYear() : null,
      artwork: String(r.artworkUrl100).replace("100x100bb", "300x300bb"),
      preview: r.previewUrl,
    },
    note: s.note,
    name: "Example capsule",
    openYear: s.openYear,
    sealedAt: "2026-10-05T00:00:00.000Z",
  });
  console.log(`  ${s.openYear} ${r.artistName} - ${r.trackName}`);
}
await Bun.write(join(import.meta.dir, "../data/capsules.seed.json"), JSON.stringify(capsules, null, 2));
