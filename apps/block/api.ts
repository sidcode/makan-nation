// Block Birthday's server extra: the shared notice board of wishes, stored in data/block-wishes.json. Everything
// else the page needs is a static file (site.ts), and postal codes go straight to OneMap from the browser.
// On a static site the board keeps notes in the browser instead.
import { renameSync } from "node:fs";
import { blockKey } from "./street.js";

type Row = [string, string, number, number, string, number, string];

const dataDir = new URL("../../data/", import.meta.url);
const blocks: Row[] = JSON.parse(await Bun.file(new URL("hdb-blocks.json", dataDir)).text()).blocks;
const byKey = new Set(blocks.map((row) => blockKey(row[0], row[1])));

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extra },
  });

// Wishes for each block's 99th, stored in data/block-wishes.json.
type Wish = { name: string; note: string; at: string };
const wishesPath = new URL("block-wishes.json", dataDir).pathname;
const wishesFile = Bun.file(wishesPath);
const wishes: Record<string, Wish[]> = (await wishesFile.exists()) ? await wishesFile.json() : {};
let saving = Promise.resolve();
function saveWishes() {
  saving = saving.then(async () => {
    const tmp = `${wishesPath}.tmp`;
    await Bun.write(tmp, JSON.stringify(wishes, null, 1));
    renameSync(tmp, wishesPath);
  });
  return saving;
}
const lastPost = new Map<string, number>();

const clean = (s: unknown, max: number) =>
  String(s ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export const routes = {
  "/api/block/wishes": {
    GET: (req: Request) => {
      const key = new URL(req.url).searchParams.get("key") ?? "";
      if (!byKey.has(key)) return json({ error: "Unknown block." }, 404);
      const list = wishes[key] ?? [];
      return json({ count: list.length, wishes: list.slice(-6).reverse() });
    },
    POST: async (req: Request, server: any) => {
      if (Number(req.headers.get("content-length") ?? 0) > 2048) return json({ error: "Too long." }, 413);
      const text = await req.text();
      if (text.length > 2048) return json({ error: "Too long." }, 413);
      let body: any;
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: "Bad JSON." }, 400);
      }
      const key = String(body?.key ?? "");
      if (!byKey.has(key)) return json({ error: "Unknown block." }, 404);
      const note = clean(body?.note, 140);
      const name = clean(body?.name, 24) || "A neighbour";
      if (note.length < 2) return json({ error: "Write a little something first." }, 400);

      const ip = server?.requestIP?.(req)?.address ?? "local";
      const now = Date.now();
      if (now - (lastPost.get(ip) ?? 0) < 8000) return json({ error: "Easy. One note every few seconds." }, 429);
      lastPost.set(ip, now);

      if (!wishes[key] && Object.keys(wishes).length >= 5000) {
        return json({ error: "The notice board is full." }, 507);
      }
      const wish: Wish = { name, note, at: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }) };
      const list = (wishes[key] ??= []);
      list.push(wish);
      if (list.length > 30) list.splice(0, list.length - 30);
      await saveWishes();
      return json({ ok: true, count: list.length, wishes: list.slice(-6).reverse() }, 201);
    },
  },
};
