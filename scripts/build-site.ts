// Builds the whole of Common Ground as a static site in site/, for GitHub Pages: the lobby, each prototype in
// its own folder, the data files and the shared folders listed in site.ts. Every link is relative, so the site
// works at any address, including a project site's subpath (https://<user>.github.io/<repo>/).
// Run: bun run build        then: bun run preview   (serves site/ under a subpath to try it)

import { mkdir, readdir, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { APPS, DATA, FOLDERS } from "../site.ts";

const ROOT = join(import.meta.dir, "..");
const OUT = join(ROOT, "site");
await rm(OUT, { recursive: true, force: true });

async function page(entry: string, outdir: string) {
  const result = await Bun.build({ entrypoints: [join(ROOT, entry)], outdir, minify: true, splitting: true });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error(`Could not build ${entry}`);
  }
}

await page("lobby/index.html", OUT);
for (const app of APPS) await page(`apps/${app}/index.html`, join(OUT, app));

// Shared folders, only the kinds of file each one publishes.
async function copyFolder(from: string, to: string, files: RegExp): Promise<number> {
  let n = 0;
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const src = join(from, entry.name);
    if (entry.isDirectory()) n += await copyFolder(src, join(to, entry.name), files);
    else if (files.test(entry.name)) {
      await mkdir(to, { recursive: true });
      await Bun.write(join(to, entry.name), Bun.file(src));
      n++;
    }
  }
  return n;
}
for (const [name, { from, files }] of Object.entries(FOLDERS)) {
  const n = await copyFolder(join(ROOT, from), join(OUT, name), files);
  console.log(`${name}/: ${n} files`);
}

await mkdir(join(OUT, "data"), { recursive: true });
for (const [name, make] of Object.entries(DATA)) await Bun.write(join(OUT, "data", name), await make({ server: false }));
console.log(`data/: ${Object.keys(DATA).length} files`);

// Pages runs sites through Jekyll unless told not to; a 404 page sends people back to the lobby.
await Bun.write(join(OUT, ".nojekyll"), "");
await Bun.write(
  join(OUT, "404.html"),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not here</title>
<style>body{font:17px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 16px;background:#fbf3e2;color:#2b1b12}a{color:#9a3a2a}</style>
<h1>Nothing at this stall</h1><p>This page is not here. <a href="#" id="home">Back to Common Ground</a>.</p>
<script>
// A project site lives under /<repo>/; the lobby is the first folder of the address on github.io, else the root.
const first = location.pathname.split("/")[1];
document.getElementById("home").href = location.hostname.endsWith("github.io") && first ? "/" + first + "/" : "/";
</script>`,
);

// What the site weighs, by top-level folder.
async function size(dir: string): Promise<number> {
  let n = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) n += e.isDirectory() ? await size(join(dir, e.name)) : Bun.file(join(dir, e.name)).size;
  return n;
}
const parts = await Promise.all((await readdir(OUT, { withFileTypes: true })).filter((e) => e.isDirectory()).map(async (e) => [e.name, await size(join(OUT, e.name))] as const));
const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;
console.log(parts.sort((a, b) => b[1] - a[1]).map(([n, s]) => `  ${n}: ${mb(s)}`).join("\n"));
console.log(`Built ${relative(ROOT, OUT)}/ (${mb(await size(OUT))})`);
