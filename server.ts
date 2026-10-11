import lobby from "./lobby/index.html";
import radio from "./apps/radio/index.html";
import kopi from "./apps/kopi/index.html";
import block from "./apps/block/index.html";
import musication from "./apps/musication/index.html";
import hawker from "./apps/hawker/index.html";
import { routes as radioApi } from "./apps/radio/api.ts";
import { routes as blockApi } from "./apps/block/api.ts";
import { routes as hawkerApi, websocket as hawkerSocket } from "./apps/hawker/api.ts";
import { routes as soundtrackApi } from "./apps/hawker/soundtrack-api.ts";
import { DATA, FOLDERS } from "./site.ts";

const favicon = Bun.file(`${import.meta.dir}/shared/favicon.svg`);

// The same layout as the static site on GitHub Pages (site.ts): each app in its own folder, the data files and
// shared folders beside them. Old addresses without the slash are sent to the folder, keeping their query.
const pages = { hawker, radio, kopi, block, musication };
const appRoutes = Object.fromEntries(
  Object.entries(pages).flatMap(([name, page]) => [
    [`/${name}/`, page],
    [`/${name}`, (req: Request) => new Response(null, { status: 302, headers: { location: `/${name}/${new URL(req.url).search}` } })],
  ]),
);

async function dataFile(req: Request & { params: { name: string } }) {
  const make = DATA[req.params.name];
  if (!make) return new Response("Not here.", { status: 404 });
  return new Response(await make({ server: true }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache" } });
}

// Shared folders other than the game's media and voices, which soundtrack-api.ts serves with byte ranges.
const folderRoutes = Object.fromEntries(
  Object.entries(FOLDERS)
    .filter(([name]) => !name.startsWith("hawker-"))
    .map(([name, { from, files }]) => [
      `/${name}/:file`,
      async (req: Request & { params: { file: string } }) => {
        const file = Bun.file(`${import.meta.dir}/${from}/${req.params.file}`);
        return files.test(req.params.file) && !req.params.file.includes("..") && (await file.exists()) ? new Response(file) : new Response("Not here.", { status: 404 });
      },
    ]),
);

const app = {
  hostname: process.env.HOST ?? "127.0.0.1",
  development: process.env.NODE_ENV !== "production",
  routes: {
    "/": lobby,
    ...appRoutes,
    "/data/:name": dataFile,
    ...folderRoutes,
    "/favicon.ico": () => new Response(favicon, { headers: { "content-type": "image/svg+xml" } }),
    ...radioApi,
    ...blockApi,
    ...hawkerApi,
    ...soundtrackApi,
  },
  websocket: hawkerSocket,
  fetch() {
    return new Response("Nothing here.", { status: 404 });
  },
};

const server = Bun.serve({ ...app, port: Number(process.env.PORT ?? 3000) });
console.log(`Common Ground is open at ${server.url}`);

// Phones need https for the microphone, peer to peer play and keeping the screen awake.
// Put a certificate and key in .certs/ (for example from `tailscale cert`) or point TLS_CERT and
// TLS_KEY at them, and the same app is also served over https on HTTPS_PORT (3443 by default).
const certFile = process.env.TLS_CERT ?? `${import.meta.dir}/.certs/server.crt`;
const keyFile = process.env.TLS_KEY ?? `${import.meta.dir}/.certs/server.key`;
if ((await Bun.file(certFile).exists()) && (await Bun.file(keyFile).exists())) {
  try {
    const secure = Bun.serve({
      ...app,
      port: Number(process.env.HTTPS_PORT ?? 3443),
      tls: { cert: Bun.file(certFile), key: Bun.file(keyFile) },
    });
    console.log(`Also on https at port ${secure.port}`);
  } catch (err) {
    console.warn(`Could not start https: ${(err as Error).message}`);
  }
}
