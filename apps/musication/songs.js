// Song search, straight to iTunes from the browser (it allows that), so it works on a static site.
// Only songs with a 30 second preview count: the record DNA and the thesis need something to play.

function toSong(r) {
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

export async function searchSongs(q, signal) {
  const res = await fetch(`https://itunes.apple.com/search?${new URLSearchParams({ term: q, country: "SG", entity: "song", limit: "10" })}`, { signal });
  if (!res.ok) throw new Error("search failed");
  return ((await res.json()).results ?? []).map(toSong).filter(Boolean);
}
