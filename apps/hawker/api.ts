// Makan Nation on the server: LAN rooms (the server only relays; the host's browser runs the kitchen),
// a living archive of players' memories about dishes, a postal code lookup for the Hawker Passport,
// and a small bank of voice clips people lend for the customers' lines.
import type { Server, ServerWebSocket } from "bun";
import { existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import { DISHES } from "./dishes.js";
import { DIALECT_LINES, speakableLines, VOICE_TAGS } from "./phrases.js";

type Sock = ServerWebSocket<{ role: "host" | "join"; room: string; id: string }>;
type Room = { host: Sock; guests: Map<string, Sock>; made: number };

const rooms = new Map<string, Room>();
const CODE_CHARS = "ACDEFHJKMNPRTUVWXY";
const MAX_ROOMS = 64;
const MAX_GUESTS = 7;
const MAX_BYTES = 64 * 1024;

function newCode() {
  for (let tries = 0; tries < 50; tries++) {
    const code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
    if (!rooms.has(code)) return code;
  }
  return null;
}

const say = (ws: Sock, msg: unknown) => ws.send(JSON.stringify(msg));

function lanAddresses() {
  const out: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) if (a.family === "IPv4" && !a.internal) out.push(a.address);
  }
  return out;
}

// ---------- Memories: short notes players leave about a dish ----------

type Memory = { name: string; text: string; at: string };
const MEM_PATH = join(import.meta.dir, "../../data/hawker-memories.json");
const MEM_TEXT = 140;
const MEM_NAME = 24;
const MEM_PER_DISH = 40;
let memories: Record<string, Memory[]> = {};
try {
  const f = Bun.file(MEM_PATH);
  if (await f.exists()) {
    const raw = await f.json();
    for (const id of Object.keys(DISHES)) if (Array.isArray(raw?.[id])) memories[id] = raw[id].slice(-MEM_PER_DISH);
  }
} catch {
  memories = {};
}
let memSaving = Promise.resolve();
function saveMemories() {
  memSaving = memSaving.then(async () => {
    await Bun.write(`${MEM_PATH}.tmp`, JSON.stringify(memories, null, 1));
    renameSync(`${MEM_PATH}.tmp`, MEM_PATH);
  });
  return memSaving;
}
const lastMemory = new Map<string, number>();
const cleanText = (s: unknown, max: number) =>
  String(s ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

// ---------- The voice bank: clips of up to five seconds, one line each ----------
// Kept apart from the pre-generated clips in data/hawker-voices/. The index holds no names and no IP
// addresses: a clip id, its line, the date, and a hash of the token that lets its recorder delete it.

type Clip = { id: string; key: string; tag: string; type: string; bytes: number; at: string; owner: string };
const BANK_DIR = join(import.meta.dir, "../../data/hawker-voice-bank");
const BANK_INDEX = join(BANK_DIR, "index.json");
const CLIP_MAX = 160 * 1024; // five seconds at up to 256 kbit/s
const CLIP_MIN = 600;
const BANK_MAX = 25 * 1024 * 1024;
const BANK_CLIPS = 400;
const TYPES: Record<string, { ext: string; magic: (b: Uint8Array) => boolean }> = {
  "audio/webm": { ext: "webm", magic: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  "audio/ogg": { ext: "ogg", magic: (b) => String.fromCharCode(...b.slice(0, 4)) === "OggS" },
  "audio/mp4": { ext: "m4a", magic: (b) => String.fromCharCode(...b.slice(4, 8)) === "ftyp" },
};
// Lines the game says, plus the reactions in dialects only people can lend.
const VOICE_KEYS = new Set([
  ...speakableLines().map((l) => l.key),
  ...DIALECT_LINES.flatMap((line) => ["teochew", "hakka", "hainanese"].map((tag) => `react.${line}.${tag}`)),
]);
const clipFile = (c: Clip) => join(BANK_DIR, `${c.id}.${TYPES[c.type]?.ext ?? "bin"}`);
let bank: Clip[] = [];
try {
  const f = Bun.file(BANK_INDEX);
  if (await f.exists()) bank = ((await f.json()) as Clip[]).filter((c) => /^[a-f0-9]{16}$/.test(c.id) && VOICE_KEYS.has(c.key) && TYPES[c.type] && existsSync(clipFile(c)));
} catch {
  bank = [];
}
let bankSaving = Promise.resolve();
function saveBank() {
  bankSaving = bankSaving.then(async () => {
    mkdirSync(BANK_DIR, { recursive: true });
    await Bun.write(`${BANK_INDEX}.tmp`, JSON.stringify(bank, null, 1));
    renameSync(`${BANK_INDEX}.tmp`, BANK_INDEX);
  });
  return bankSaving;
}
const sha = (s: string) => new Bun.CryptoHasher("sha256").update(s).digest("hex");
const lastClip = new Map<string, number[]>();

// ---------- Postal code to a point on the map, through OneMap ----------

const postalCache = new Map<string, { lat: number; lng: number; address: string } | null>();
async function lookupPostal(code: string) {
  if (postalCache.has(code)) return postalCache.get(code);
  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${code}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  const body: any = await res.json();
  const hit = (body?.results ?? []).find((r: any) => r.POSTAL === code);
  const out = hit ? { lat: Number(hit.LATITUDE), lng: Number(hit.LONGITUDE), address: String(hit.ADDRESS ?? "").slice(0, 120) } : null;
  if (out && !(Number.isFinite(out.lat) && Number.isFinite(out.lng))) return null;
  if (postalCache.size > 2000) postalCache.clear();
  postalCache.set(code, out);
  return out;
}

export const routes = {
  "/api/hawker/memories": {
    GET: () => Response.json(memories),
    POST: async (req: Request, server: Server) => {
      if (Number(req.headers.get("content-length") ?? 0) > 1024) return Response.json({ error: "Too long." }, { status: 413 });
      const raw = await req.text();
      if (raw.length > 1024) return Response.json({ error: "Too long." }, { status: 413 });
      let body: any;
      try {
        body = JSON.parse(raw);
      } catch {
        return Response.json({ error: "Could not read that." }, { status: 400 });
      }
      const dish = String(body?.dish ?? "");
      if (!DISHES[dish as keyof typeof DISHES]) return Response.json({ error: "Unknown dish." }, { status: 404 });
      const text = cleanText(body?.text, MEM_TEXT);
      const name = cleanText(body?.name, MEM_NAME);
      if (text.length < 3) return Response.json({ error: "Write a little more first." }, { status: 400 });
      const ip = server?.requestIP?.(req)?.address ?? "local";
      const now = Date.now();
      if (now - (lastMemory.get(ip) ?? 0) < 10000) return Response.json({ error: "One memory every few seconds, please." }, { status: 429 });
      lastMemory.set(ip, now);
      const list = (memories[dish] ??= []);
      list.push({ name, text, at: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }) });
      if (list.length > MEM_PER_DISH) list.splice(0, list.length - MEM_PER_DISH);
      await saveMemories();
      return Response.json({ ok: true, memories: list.slice(-6) }, { status: 201 });
    },
  },

  "/api/hawker/voices": {
    GET: () => Response.json({ clips: bank.map(({ id, key, tag, at }) => ({ id, key, tag, at })) }),
    POST: async (req: Request, server: Server) => {
      const key = new URL(req.url).searchParams.get("key") ?? "";
      if (!VOICE_KEYS.has(key)) return Response.json({ error: "Unknown line." }, { status: 400 });
      const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (!TYPES[type]) return Response.json({ error: "Send webm, ogg or mp4 audio." }, { status: 415 });
      if (Number(req.headers.get("content-length") ?? 0) > CLIP_MAX) return Response.json({ error: "That clip is longer than five seconds." }, { status: 413 });
      const ip = server?.requestIP?.(req)?.address ?? "local";
      const now = Date.now();
      const recent = (lastClip.get(ip) ?? []).filter((t) => now - t < 3600_000);
      if (recent.length && now - recent[recent.length - 1] < 8000) return Response.json({ error: "One clip every few seconds, please." }, { status: 429 });
      if (recent.length >= 30) return Response.json({ error: "That is plenty for one hour. Thank you!" }, { status: 429 });
      const body = new Uint8Array(await req.arrayBuffer());
      if (body.length > CLIP_MAX) return Response.json({ error: "That clip is longer than five seconds." }, { status: 413 });
      if (body.length < CLIP_MIN || !TYPES[type].magic(body)) return Response.json({ error: "That does not look like an audio clip." }, { status: 400 });
      const total = bank.reduce((n, c) => n + c.bytes, 0);
      if (bank.length >= BANK_CLIPS || total + body.length > BANK_MAX) return Response.json({ error: "The voice bank is full for now." }, { status: 507 });
      recent.push(now);
      lastClip.set(ip, recent);
      const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
      const clip: Clip = {
        id: Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join(""),
        key,
        tag: key.split(".").pop() as string,
        type,
        bytes: body.length,
        at: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }),
        owner: sha(token),
      };
      mkdirSync(BANK_DIR, { recursive: true });
      await Bun.write(clipFile(clip), body);
      bank.push(clip);
      await saveBank();
      return Response.json({ id: clip.id, token, tag: VOICE_TAGS[clip.tag as keyof typeof VOICE_TAGS] ?? clip.tag }, { status: 201 });
    },
  },

  "/api/hawker/voices/:id": {
    GET: (req: Request & { params: { id: string } }) => {
      const clip = bank.find((c) => c.id === req.params.id);
      if (!clip) return new Response("Not found", { status: 404 });
      return new Response(Bun.file(clipFile(clip)), { headers: { "content-type": clip.type, "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" } });
    },
    DELETE: async (req: Request & { params: { id: string } }) => {
      const i = bank.findIndex((c) => c.id === req.params.id);
      if (i < 0) return Response.json({ error: "Not found." }, { status: 404 });
      const token = req.headers.get("x-voice-token") ?? "";
      if (!/^[a-f0-9]{32}$/.test(token) || sha(token) !== bank[i].owner) return Response.json({ error: "Only the person who recorded it can delete it." }, { status: 403 });
      const [clip] = bank.splice(i, 1);
      try {
        unlinkSync(clipFile(clip));
      } catch {}
      await saveBank();
      return Response.json({ ok: true });
    },
  },

  "/api/hawker/postal/:code": async (req: Request & { params: { code: string } }) => {
    const code = req.params.code;
    if (!/^\d{6}$/.test(code)) return Response.json({ error: "Postal codes have six digits." }, { status: 400 });
    try {
      const hit = await lookupPostal(code);
      if (!hit) return Response.json({ error: "Could not find that postal code." }, { status: 404 });
      return Response.json(hit);
    } catch {
      return Response.json({ error: "OneMap is not answering right now." }, { status: 502 });
    }
  },

  "/api/hawker/lan": (req: Request) => {
    const host = process.env.HOST ?? "127.0.0.1";
    const port = new URL(req.url).port || "80";
    const open = host === "0.0.0.0" || host === "::";
    return Response.json({ open, port, addresses: open ? lanAddresses() : [] });
  },

  "/ws/hawker": (req: Request, server: Server) => {
    const url = new URL(req.url);
    const role = url.searchParams.get("role") === "host" ? "host" : "join";
    const room = (url.searchParams.get("room") ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    const ok = server.upgrade(req, { data: { role, room, id: crypto.randomUUID().slice(0, 8) } });
    return ok ? undefined : new Response("Expected a WebSocket.", { status: 400 });
  },
};

export const websocket = {
  maxPayloadLength: MAX_BYTES,
  idleTimeout: 120,

  open(ws: Sock) {
    const d = ws.data;
    if (d.role === "host") {
      const code = rooms.size < MAX_ROOMS ? newCode() : null;
      if (!code) {
        say(ws, { e: "err", why: "The server is full. Try again soon." });
        return ws.close();
      }
      d.room = code;
      rooms.set(code, { host: ws, guests: new Map(), made: Date.now() });
      say(ws, { e: "ok", room: code });
      return;
    }
    const room = rooms.get(d.room);
    if (!room) {
      say(ws, { e: "err", why: "No kitchen with that code" });
      return ws.close();
    }
    if (room.guests.size >= MAX_GUESTS) {
      say(ws, { e: "err", why: "That kitchen is full" });
      return ws.close();
    }
    room.guests.set(d.id, ws);
    say(ws, { e: "ok" });
    say(room.host, { e: "join", id: d.id });
  },

  message(ws: Sock, raw: string | Buffer) {
    const room = rooms.get(ws.data.room);
    if (!room) return;
    let m: any;
    try {
      m = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!m || typeof m !== "object" || !("d" in m)) return;
    if (ws.data.role === "host" && room.host === ws) {
      const out = JSON.stringify({ e: "msg", d: m.d });
      if (typeof m.to === "string") room.guests.get(m.to)?.send(out);
      else for (const g of room.guests.values()) g.send(out);
    } else if (room.guests.get(ws.data.id) === ws) {
      say(room.host, { e: "msg", id: ws.data.id, d: m.d });
    }
  },

  close(ws: Sock) {
    const room = rooms.get(ws.data.room);
    if (!room) return;
    if (ws.data.role === "host" && room.host === ws) {
      for (const g of room.guests.values()) g.close(1000, "host left");
      rooms.delete(ws.data.room);
    } else if (room.guests.delete(ws.data.id)) {
      say(room.host, { e: "leave", id: ws.data.id });
    }
  },
};
