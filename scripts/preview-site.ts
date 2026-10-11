// Serves the built site/ the way GitHub Pages serves a project site: under a subpath, folders answered by their
// index.html (and sent to the address with a slash), missing files by 404.html. No server extras, so this is
// what visitors to the Pages site get.
// Run: bun run build && bun run preview     then open http://127.0.0.1:4000/common-ground/

const SITE = `${import.meta.dir}/../site`;
const BASE = "/common-ground";
const port = Number(process.env.PORT ?? 4000);

Bun.serve({
  hostname: process.env.HOST ?? "127.0.0.1",
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith(`${BASE}/`)) return Response.redirect(`${url.origin}${BASE}/`, 302);
    const path = decodeURIComponent(url.pathname.slice(BASE.length));
    if (path.includes("..")) return new Response("No.", { status: 400 });
    let file = Bun.file(SITE + path);
    if (path.endsWith("/")) file = Bun.file(`${SITE}${path}index.html`);
    else if (!(await file.exists()) && (await Bun.file(`${SITE}${path}/index.html`).exists())) return Response.redirect(`${url.origin}${url.pathname}/${url.search}`, 301);
    if (await file.exists()) {
      // Byte ranges, which Safari needs for video and audio.
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
      if (range && (range[1] || range[2])) {
        const size = file.size;
        const start = range[1] ? Number(range[1]) : size - Number(range[2]);
        const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
        return new Response(file.slice(start, end + 1), { status: 206, headers: { "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "content-type": file.type } });
      }
      return new Response(file);
    }
    return new Response(Bun.file(`${SITE}/404.html`), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  },
});
console.log(`The built site, as Pages would serve it: http://127.0.0.1:${port}${BASE}/`);
