// Songs and time capsules. Song search goes straight to iTunes from the browser (it allows that), so it works
// on a static site. Sealed capsules are shared through the Bun server when there is one; a static site such as
// GitHub Pages has nowhere to keep other people's, so there they stay in this browser, next to the examples.
// Makan Nation's 2065 stall radio reads the same browser list.

const LOCAL_KEY = "radio:capsules:v1";

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

const found = new Map();
export async function searchSongs(q) {
  const key = q.toLowerCase();
  if (found.has(key)) return found.get(key);
  const res = await fetch(`https://itunes.apple.com/search?${new URLSearchParams({ term: q, country: "SG", entity: "song", limit: "10" })}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("The song shop is not answering.");
  const songs = ((await res.json()).results ?? []).map(toSong).filter(Boolean);
  found.set(key, songs);
  return songs;
}

function sealedHere() {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// The examples (and, on the server, everyone's capsules), then the ones sealed in this browser.
export async function loadCapsules() {
  let shared = [];
  try {
    const res = await fetch(new URL("../data/capsules.json", document.baseURI));
    shared = res.ok ? await res.json() : [];
  } catch {}
  return [...(Array.isArray(shared) ? shared : []), ...sealedHere()];
}

const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

// data/site.json says whether the Bun server's extras are there, so a static site never asks for them.
const onServer = fetch(new URL("../data/site.json", document.baseURI))
  .then((r) => (r.ok ? r.json() : {}))
  .then((x) => Boolean(x.server))
  .catch(() => false);

// Seals a song for a year: on the server if there is one, else in this browser. Resolves to the capsule.
export async function sealCapsule({ song, note, name, openYear }) {
  if (await onServer) {
    const res = await fetch(new URL("../api/capsules", document.baseURI), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ songId: song.id, note, name, openYear }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Could not seal that.");
    return body;
  }
  const capsule = { id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, song, note: clean(note, 200), name: clean(name, 40) || "Someone", openYear, sealedAt: new Date().toISOString(), here: true };
  if (!capsule.note) throw new Error("Leave a note for the future.");
  const list = sealedHere();
  list.push(capsule);
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    throw new Error("This browser will not keep it (private window?).");
  }
  return capsule;
}
