// The static site in one place: what GitHub Pages serves, and what the Bun server serves the same way while
// developing. scripts/build-site.ts writes it to site/; server.ts mounts it.
//
//   /                 the lobby (lobby/index.html)
//   /<app>/           each prototype, from apps/<app>/index.html
//   /data/<name>      the data files below, made from data/
//   /hawker-media/    apps/hawker/media, as it is
//   /hawker-voices/   the generated voice clips and their manifest (data/hawker-voices)
//   /radio-labels/    record label thumbnails (data/radio-labels)
//
// A project site on Pages lives under a subpath (https://<user>.github.io/<repo>/), so pages only use relative
// links: an app reaches the shared folders, the lobby and the other apps through "../".
// What only a server can do stays under /api/ on the Bun server: LAN rooms, shared wishes, capsules, memories
// and lent voices, and quick local copies of slow archive recordings. The pages try it and carry on without it.

import { capsulesJson, stationsJson } from "./apps/radio/data.ts";
import { blockHawkers } from "./apps/block/data.ts";
import { soundtrack } from "./apps/hawker/soundtrack-api.ts";

export const APPS = ["hawker", "radio", "kopi", "block", "musication"] as const;

// Folders copied as they are: published path -> folder in the repo, and which files in it to publish.
export const FOLDERS: Record<string, { from: string; files: RegExp }> = {
  "hawker-media": { from: "apps/hawker/media", files: /\.(jpg|png|webp|hdr|mp3|mp4|webm|json)$/ },
  "hawker-voices": { from: "data/hawker-voices", files: /^([a-f0-9]{16}\.mp3|manifest\.json)$/ },
  "radio-labels": { from: "data/radio-labels", files: /\.jpg$/ },
};

const copy = (name: string) => async () => Bun.file(`${import.meta.dir}/data/${name}`).text();

// Data files: name -> its contents. `server` is true on the Bun server, which adds what only it has (everyone's
// capsules, local copies of archive recordings); the static build leaves those out.
export const DATA: Record<string, (o: { server: boolean }) => Promise<string>> = {
  // Whether the server extras under /api/ are there, so a static site never asks for them.
  "site.json": async ({ server }) => JSON.stringify({ server }),
  "hdb-blocks.json": copy("hdb-blocks.json"),
  "block-years.json": copy("block-years.json"),
  "song-previews.json": copy("song-previews.json"),
  "block-hawkers.json": () => blockHawkers(),
  "radio.json": stationsJson,
  "capsules.json": capsulesJson,
  "soundtrack.json": soundtrack,
};
