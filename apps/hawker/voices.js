// Saying lines out loud. For each line it tries, in order: a person's recording from the voice bank,
// a pre-generated clip from the voice manifest, the device's own speech voices, and finally just the
// words on screen. Volume and mute are separate from the music.

import { CHEF_LINES, LANGS, LINES, PERSONAS, VOICE_TAGS, YOUNG, lineText } from "./phrases.js";
import { bank, clipsFor } from "./voicebank.js";

const state = { vol: 0.8, mute: false, manifest: {}, credits: [], queue: [], busy: false, last: 0, lastClip: {} };
export const voiceListeners = { onSay: null };

export function setVoiceVolume(v) {
  state.vol = Math.max(0, Math.min(1, v));
}
export function setVoiceMute(m) {
  state.mute = Boolean(m);
  if (state.mute) {
    state.queue = [];
    try {
      speechSynthesis?.cancel();
    } catch {}
    state.audio?.pause();
  }
}

// ---------- The device's voices ----------

const FEMALE = /female|woman|luna|zira|aria|jenny|sonia|libby|natasha|hazel|susan|catherine|karen|moira|tessa|samantha|victoria|serena|kate|amy|emma|olivia|yasmin|xiaoxiao|xiaoyi|huihui|yaoyao|hiumaan|hiugaai|tracy|pallavi|kani|sinji|meijia|tingting|heera|veena/i;
const MALE = /\bmale\b|\bman\b|wayne|david|mark|guy|ryan|thomas|daniel|george|james|rishi|aaron|fred|oliver|yunxi|yunyang|kangkang|wanlung|osman|valluvar|surya|anbu|kumar|lee/i;
const genderOf = (v) => (FEMALE.test(v.name) ? "f" : MALE.test(v.name) ? "m" : "");

export function deviceVoices() {
  try {
    return typeof speechSynthesis === "undefined" ? [] : speechSynthesis.getVoices();
  } catch {
    return [];
  }
}

// The best locale this device has for a language, and all its voices in that locale.
export function voicePool(lg) {
  const voices = deviceVoices();
  for (const code of LANGS[lg]?.voice ?? []) {
    const c = code.toLowerCase();
    const pool = voices.filter((v) => {
      const l = (v.lang ?? "").toLowerCase().replace("_", "-");
      return l === c || l.startsWith(`${c}-`) || (c.length <= 3 && l.split("-")[0] === c);
    });
    if (pool.length) return { locale: code, voices: pool };
  }
  return { locale: null, voices: [] };
}

const hash = (s) => [...String(s)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

// Pitch and rate by age, so an auntie, an uncle and a student sound different even with one voice.
const AGE = { elder: [0.86, 0.9], adult: [1, 1], teen: [1.16, 1.06] };

export function voiceFor(lg, persona = "youngwoman", seed = 0) {
  const { voices } = voicePool(lg);
  if (!voices.length) return null;
  const p = PERSONAS[persona] ?? PERSONAS.youngwoman;
  const want = p.g || (hash(seed) % 2 ? "f" : "m");
  const same = voices.filter((v) => genderOf(v) === want);
  const list = same.length ? same : voices;
  const voice = list[hash(`${persona}${seed}`) % list.length];
  let [pitch, rate] = AGE[p.age] ?? AGE.adult;
  const g = genderOf(voice);
  if (g && g !== want) pitch += want === "f" ? 0.2 : -0.2;
  pitch += ((hash(seed) % 9) - 4) * 0.01;
  return { voice, pitch: Math.max(0.5, Math.min(2, pitch)), rate };
}

// ---------- Pre-generated clips ----------

const SRC = /^\/hawker-voices\/[A-Za-z0-9._-]+\.(mp3|ogg|wav|m4a|webm)$/;
// The clips sit in hawker-voices/ beside the apps (site.ts), on the Bun server and on GitHub Pages alike, so
// one relative address works for both.
const voiceUrl = (src) => {
  const name = String(src).split("/").pop();
  return typeof document === "undefined" ? `/hawker-voices/${name}` : new URL(`../hawker-voices/${name}`, document.baseURI).href;
};

export async function loadManifest() {
  try {
    const res = await fetch(voiceUrl("manifest.json"), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return;
    const body = await res.json();
    const clips = {};
    const credits = new Set();
    for (const [key, list] of Object.entries(body?.clips ?? {})) {
      if (!/^(order|react|chef|call)\.[a-z0-9]+\.[a-z]+$/.test(key) || !Array.isArray(list)) continue;
      const ok = list
        .filter((c) => typeof c?.src === "string" && SRC.test(c.src) && !c.src.includes(".."))
        .map((c) => ({ src: c.src, persona: PERSONAS[c.persona] ? c.persona : "", credit: String(c.credit ?? "").slice(0, 160) }));
      if (ok.length) clips[key] = ok;
      for (const c of ok) if (c.credit) credits.add(c.credit);
    }
    state.manifest = clips;
    state.credits = [...credits];
  } catch {
    state.manifest = {};
  }
}

export const voiceCredits = () => state.credits;
export const generatedCount = (lg) => Object.entries(state.manifest).filter(([k]) => k.endsWith(`.${lg}`)).reduce((n, [, l]) => n + l.length, 0);

// One of a line's takes in the right voice, never the take this line used last time.
function freshest(key, list, src = (c) => c.src) {
  if (list.length < 2) return list[0] ?? null;
  const fresh = list.filter((c) => src(c) !== state.lastClip[key]);
  return fresh[Math.floor(Math.random() * fresh.length)];
}

// The persona's own takes; failing that, another voice of the same sex (an uncle borrows the young man's);
// a student, who has no voice of their own, borrows anyone's. Never an auntie's line in an uncle's mouth.
function generatedClip(key, persona, seed, choose = false) {
  const list = state.manifest[key];
  if (!list?.length) return null;
  const g = PERSONAS[persona]?.g ?? "";
  const own = list.filter((c) => c.persona === persona);
  const kin = list.filter((c) => !g || PERSONAS[c.persona]?.g === g);
  const from = own.length ? own : kin;
  if (!from.length) return null;
  return choose ? freshest(key, from) : from[hash(seed) % from.length];
}

// ---------- Saying things ----------

// What would play for a line: "recorded", "generated", "device" or "text".
export function routeFor(key, persona = "youngwoman", seed = 0) {
  if (clipsFor(key).length) return "recorded";
  if (generatedClip(key, persona, seed)) return "generated";
  if (voiceFor(key.split(".").pop(), persona, seed)) return "device";
  return "text";
}

// Queue a line. Customers wait their turn; nobody talks over anybody. Lines that would wait too long are
// dropped, so the stall never turns into a radio drama.
// line: the words themselves, for lines that are not in phrases.js (a hawker's callout). onShow: who to
// tell what is being said, instead of the kitchen's speech bubbles.
export function say(key, { persona = "youngwoman", seed = 0, urgent = false, alt = null, line: given = null, onShow = null } = {}) {
  const line = given ?? lineText(key);
  if (!line) return false;
  if (state.queue.length >= 3) {
    if (!urgent) return false;
    state.queue.shift();
  }
  state.queue.push({ key, persona, seed, line, alt, onShow });
  pump();
  return true;
}

// Plays one line now, for the speak button on a ticket. Returns how it will be heard.
export function sayNow(key, opts = {}) {
  state.queue = [];
  stopAll();
  state.busy = false;
  say(key, { ...opts, urgent: true });
  return routeFor(key, opts.persona, opts.seed);
}

function stopAll() {
  try {
    speechSynthesis?.cancel();
  } catch {}
  if (state.audio) {
    state.audio.onended = state.audio.onerror = null;
    state.audio.pause();
  }
}

function pump() {
  if (state.busy || !state.queue.length) return;
  const next = state.queue.shift();
  state.busy = true;
  const finish = () => {
    clearTimeout(state.guard);
    state.busy = false;
    setTimeout(pump, 260);
  };
  state.guard = setTimeout(finish, 6500);
  play(next, finish);
}

function playUrl(url, done, rate = 1) {
  const a = state.audio ?? (state.audio = new Audio());
  a.onended = a.onerror = null;
  a.src = url;
  // A little higher or lower, quicker or slower, each time: nobody says a thing the same way twice.
  a.preservesPitch = false;
  a.playbackRate = rate * (0.95 + Math.random() * 0.1);
  a.volume = state.vol * (0.88 + Math.random() * 0.12);
  a.onended = done;
  a.onerror = done;
  a.play().catch(done);
}

function play({ key, persona, seed, line, alt, onShow }, done) {
  const tell = onShow ?? voiceListeners.onSay;
  const lg = key.split(".").pop();
  // A dialect recording can stand in for a reaction now and then, with its own caption.
  const dialect = alt && clipsFor(alt).length && hash(seed) % 4 === 0 ? alt : null;
  const recorded = clipsFor(dialect ?? key);
  const shown = { key, lg, text: line.say, roman: line.roman ?? "", mean: line.mean, persona, via: "text" };
  if (dialect) Object.assign(shown, { lg: dialect.split(".").pop(), text: `(${line.mean})`, roman: "" });
  if (state.mute || state.vol === 0) {
    tell?.(shown);
    return setTimeout(done, 1400);
  }
  if (recorded.length) {
    shown.via = "recorded";
    tell?.(shown);
    const pick = freshest(key, recorded, (c) => c.url);
    state.lastClip[key] = pick.url;
    return playUrl(pick.url, done);
  }
  const gen = generatedClip(key, persona, seed, true);
  if (gen) {
    shown.via = "generated";
    shown.credit = gen.credit;
    tell?.(shown);
    state.lastClip[key] = gen.src;
    // A take borrowed from another voice of the same sex (an uncle's line in the young man's voice) is
    // played a little lower and slower for an older speaker, or higher for a younger one.
    const want = AGE[PERSONAS[persona]?.age]?.[0] ?? 1;
    const has = AGE[PERSONAS[gen.persona]?.age]?.[0] ?? 1;
    const rate = gen.persona && gen.persona !== persona ? Math.max(0.88, Math.min(1.12, want / has)) : 1;
    return playUrl(voiceUrl(gen.src), done, rate);
  }
  const v = voiceFor(lg, persona, seed);
  tell?.({ ...shown, via: v ? "device" : "text" });
  if (!v) return setTimeout(done, 1400);
  const u = new SpeechSynthesisUtterance(line.say);
  u.voice = v.voice;
  u.lang = v.voice.lang;
  u.pitch = Math.max(0.5, Math.min(2, v.pitch + (Math.random() - 0.5) * 0.12));
  u.rate = v.rate * (0.95 + Math.random() * 0.1);
  u.volume = state.vol;
  u.onend = u.onerror = done;
  try {
    speechSynthesis.speak(u);
  } catch {
    done();
  }
}

// ---------- What this device can do, in words ----------

export function voiceReport() {
  const rows = [];
  const voices = deviceVoices();
  const sg = voices.filter((v) => /^en[-_]SG/i.test(v.lang ?? ""));
  const sgGen = generatedCount("en");
  const sgRec = bank.clips.filter((c) => c.key.endsWith(".en")).length;
  rows.push([
    "Singlish",
    [
      sgGen ? `${sgGen} generated clips in synthetic Singapore voices` : null,
      sgRec ? `${sgRec} recorded by players` : null,
      (() => {
        const p = voicePool("en");
        if (sg.length) return `device voice (${sg.map((v) => v.name.replace(/^Microsoft |\s*Online.*$/g, "")).slice(0, 2).join(", ")})`;
        if (p.locale) return `device voice from ${p.locale}`;
        return "no Singapore or Malaysian voice on this device, so a line without a local clip shows as words";
      })(),
    ]
      .filter(Boolean)
      .join(", "),
  ]);
  for (const lg of ["ms", "zh", "yue", "ta", "nan"]) {
    const p = voicePool(lg);
    const gen = generatedCount(lg);
    const rec = bank.clips.filter((c) => c.key.endsWith(`.${lg}`)).length;
    const bits = [p.locale ? (p.locale.toLowerCase() === LANGS[lg].voice[0].toLowerCase() ? `device voice (${p.locale})` : `device voice from ${p.locale}`) : "no device voice"];
    if (gen) bits.push(`${gen} generated clips`);
    if (rec) bits.push(`${rec} recorded by players`);
    if (!p.locale && !gen && !rec) bits.push("words on screen only");
    rows.push([LANGS[lg].name, bits.join(", ")]);
  }
  for (const tag of ["teochew", "hakka", "hainanese"]) {
    const n = bank.clips.filter((c) => c.key.endsWith(`.${tag}`)).length;
    if (n) rows.push([VOICE_TAGS[tag], `${n} recorded`]);
  }
  return rows;
}

export { CHEF_LINES, LINES, YOUNG };
