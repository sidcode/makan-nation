// Photos, menus, videos, textures, sky maps and recordings gathered for the game, each with its credit in
// a manifest in apps/hawker/media/. The site keeps the folder at hawker-media/ beside the apps (site.ts), on
// the Bun server and on GitHub Pages alike, so the game reaches it with one relative address.

const base = () => (typeof document === "undefined" ? "http://localhost/hawker/" : document.baseURI);
export const mediaUrl = (path) => new URL(`../hawker-media/${path}`, base()).href;

const manifests = new Map();
// photos, dishes, videos, menus, textures, hdri, audio. Resolves to null if it is missing.
export function manifest(name) {
  if (!manifests.has(name)) {
    manifests.set(
      name,
      fetch(mediaUrl(`${name}.json`))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    );
  }
  return manifests.get(name);
}

// A centre's name as the manifests write it ("Maxwell Food Centre"), matched loosely against NEA's.
const squash = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(market|and|food|centre|center|hawker|complex|village|place|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function sameCentre(a, b) {
  const x = squash(a);
  const y = squash(b);
  return Boolean(x && y && (x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `)));
}

// Photos of one centre (interior first), and general ones of a kind.
export async function centrePhotos(names) {
  const m = await manifest("photos");
  const list = m?.photos ?? [];
  const order = { interior: 0, stall: 1, menu: 2, table: 3, queue: 4, exterior: 5 };
  return list.filter((p) => p.centre && names.some((n) => sameCentre(p.centre, n))).sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9));
}

export async function photosOf(kinds, era = null) {
  const m = await manifest("photos");
  return (m?.photos ?? []).filter((p) => kinds.includes(p.kind) && (!era || !p.era || p.era === era));
}

export async function dishPhoto(id) {
  const m = await manifest("dishes");
  const d = m?.dishes?.[id];
  return d ? { ...d, url: mediaUrl(`dishes/${d.file}`) } : null;
}

export async function videosFor({ centre = null, dish = null, era = null, group = null } = {}) {
  const m = await manifest("videos");
  return (m?.videos ?? []).filter(
    (v) => (!group || v.group === group) && (!centre || (v.centre && sameCentre(v.centre, centre))) && (!dish || v.dishes?.includes(dish)) && (!era || !v.era || v.era === era),
  );
}

// Real stalls and their sourced prices at a centre.
export async function realStalls(centreNames) {
  const m = await manifest("menus");
  return (m?.stalls ?? []).filter((s) => centreNames.some((n) => sameCentre(s.centre, n)));
}

export const creditLine = (p) => [p.author, p.licence].filter(Boolean).join(", ");

// The photos manifest, once loaded, for code that has to answer straight away (cards drawn in one go).
let photoList = null;
export const preloadPhotos = () => manifest("photos").then((m) => (photoList = m?.photos ?? []));
export function localCentrePhoto(names) {
  if (!photoList) return null;
  const order = { interior: 0, exterior: 1 };
  const hits = photoList.filter((p) => p.centre && names.some((n) => sameCentre(p.centre, n))).sort((a, b) => (order[a.kind] ?? 2) - (order[b.kind] ?? 2));
  return hits[0] ? { ...hits[0], src: mediaUrl(`photos/${hits[0].file}`) } : null;
}
