// "Lend your voice": short clips people record of the customers' lines, in their own language or dialect.
// On the Bun server clips are shared with everyone who plays there. On a static site they stay in this
// browser (IndexedDB). Recording needs a secure page (https or localhost) and asks for the microphone.

export const MAX_MS = 5000;
const MINE_KEY = "makan-myvoices";

export const bank = { clips: [], server: false, ready: false };

function mine() {
  try {
    const m = JSON.parse(localStorage.getItem(MINE_KEY));
    return m && typeof m === "object" ? m : {};
  } catch {
    return {};
  }
}
function saveMine(m) {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(m));
  } catch {}
}

// ---------- IndexedDB, for the static build ----------

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("makan-voices", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("clips", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("clips", mode);
    const out = fn(tx.objectStore("clips"));
    tx.oncomplete = () => resolve(out?.result ?? out);
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Loading ----------

export async function loadBank(useServer) {
  bank.server = useServer;
  for (const c of bank.clips) if (c.url.startsWith("blob:")) URL.revokeObjectURL(c.url);
  bank.clips = [];
  const mineNow = mine();
  try {
    if (useServer) {
      const res = await fetch("../api/hawker/voices", { signal: AbortSignal.timeout(4000) });
      const body = res.ok ? await res.json() : { clips: [] };
      bank.clips = (body.clips ?? [])
        .filter((c) => typeof c.id === "string" && /^[a-f0-9]{16}$/.test(c.id) && typeof c.key === "string")
        .map((c) => ({ id: c.id, key: c.key, tag: c.tag, at: c.at, url: `../api/hawker/voices/${c.id}`, mine: Boolean(mineNow[c.id]) }));
    } else if (typeof indexedDB !== "undefined") {
      const all = await idb("readonly", (s) => s.getAll());
      bank.clips = (all ?? []).map((c) => ({ id: c.id, key: c.key, tag: c.tag, at: c.at, url: URL.createObjectURL(c.blob), mine: true }));
    }
  } catch {
    bank.clips = [];
  }
  bank.ready = true;
  return bank.clips;
}

export function clipsFor(key) {
  return bank.clips.filter((c) => c.key === key);
}

// ---------- Saving and deleting ----------

export async function saveClip(blob, key, tag) {
  if (bank.server) {
    const res = await fetch(`../api/hawker/voices?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "content-type": blob.type || "audio/webm" }, body: blob });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Could not save that clip.");
    const m = mine();
    m[body.id] = body.token;
    saveMine(m);
  } else {
    const id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
    await idb("readwrite", (s) => s.put({ id, key, tag, type: blob.type, blob, at: new Date().toLocaleDateString("en-CA") }));
  }
  return loadBank(bank.server);
}

export async function deleteClip(id) {
  if (bank.server) {
    const token = mine()[id];
    if (!token) throw new Error("Only the person who recorded a clip can delete it.");
    const res = await fetch(`../api/hawker/voices/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "x-voice-token": token } });
    if (!res.ok && res.status !== 404) throw new Error("Could not delete that clip.");
    const m = mine();
    delete m[id];
    saveMine(m);
  } else await idb("readwrite", (s) => s.delete(id));
  return loadBank(bank.server);
}

// ---------- Recording ----------

export function canRecord() {
  if (!window.isSecureContext) return { ok: false, why: "insecure" };
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return { ok: false, why: "unsupported" };
  return { ok: true };
}

function bestType() {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return "";
}

// Records up to five seconds. Returns { stop, done } where done resolves to a Blob.
export async function startRecording(onTick) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const type = bestType();
  const rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 });
  const chunks = [];
  const started = performance.now();
  let timer = 0;
  const done = new Promise((resolve, reject) => {
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      clearInterval(timer);
      for (const t of stream.getTracks()) t.stop();
      resolve(new Blob(chunks, { type: rec.mimeType || type || "audio/webm" }));
    };
    rec.onerror = (e) => reject(e.error ?? new Error("Recording failed."));
  });
  rec.start(250);
  timer = setInterval(() => {
    const ms = performance.now() - started;
    onTick?.(Math.min(1, ms / MAX_MS));
    if (ms >= MAX_MS && rec.state === "recording") rec.stop();
  }, 100);
  return { stop: () => rec.state === "recording" && rec.stop(), done };
}
