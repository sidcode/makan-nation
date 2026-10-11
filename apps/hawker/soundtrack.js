// The stall radio. Each era plays music borrowed from the other prototypes (see soundtrack-api.ts):
// 78s for the 1950s, Rediffusion and National Day songs for the 1980s, live FM today, sealed songs in 2065.
// Two audio elements take turns so tracks crossfade. Anything that will not load is skipped.
// On a static build with no server the radio simply stays quiet, and the hall's chatter plays alone.

import { HallSound } from "./ambience.js";
import { manifest, mediaUrl } from "./media.js";

const FADE_MS = 1500;
const STALL_MS = 9000; // give up on a track that has not started by then
const BASE = 0.32; // sits under the sound effects

const listeners = new Set();
const lists = new Map();
const decks = [new Audio(), new Audio()];
for (const d of decks) d.preload = "auto";

let era = null;
let queue = [];
let current = -1;
let volume = 1;
let ducked = false;
let token = 0;
let waitingForGesture = false;

const level = () => BASE * volume * (ducked ? 0.3 : 1);

// Under the radio, the hall itself: chatter from food court recordings that never loops the same way
// (ambience.js), quieter than the music.
let bed = null;
const bedLevel = () => Math.min(1, volume * 0.32 * (ducked ? 0.5 : 1));
async function startBed() {
  if (bed) return;
  const m = await manifest("audio");
  const files = Object.entries(m ?? {})
    .filter(([f]) => /ambience/.test(f))
    .map(([f, meta]) => ({ url: mediaUrl(`audio/${f}`), seconds: meta?.seconds ?? 20 }));
  if (!files.length || bed || !era) return;
  bed = new HallSound(files, { volume: bedLevel() });
  bed.start();
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The 1980s list is mostly Rediffusion dramas, which are talk. Put a song between them where we can.
function order(list) {
  const songs = shuffle(list.filter((t) => t.year));
  const talk = shuffle(list.filter((t) => !t.year));
  if (!songs.length || !talk.length) return shuffle(list);
  const out = [];
  while (songs.length || talk.length) {
    if (songs.length) out.push(songs.shift());
    if (talk.length) out.push(talk.shift());
  }
  return out;
}

// Every era's playlist is one data file beside the apps (site.ts), on the Bun server and on GitHub Pages.
let all = null;
function loadAll() {
  all ??= fetch(new URL("../data/soundtrack.json", document.baseURI))
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return all;
}

// Songs sealed in the radio on this browser (a static site keeps them here; see apps/radio/capsules.js).
function sealedHere() {
  try {
    const list = JSON.parse(localStorage.getItem("radio:capsules:v1") ?? "[]");
    return list.filter((c) => c?.song?.preview).map((c) => ({ title: c.song.title, artist: c.song.artist, year: c.openYear, src: c.song.preview, credit: `Sealed by ${c.name} for ${c.openYear}` }));
  } catch {
    return [];
  }
}

async function load(id) {
  if (lists.has(id)) return lists.get(id);
  const data = await loadAll();
  const list = Array.isArray(data[id]) ? data[id] : [];
  lists.set(id, id === "2065" ? [...list, ...sealedHere()] : list);
  return lists.get(id);
}

function fade(el, to, ms = FADE_MS) {
  clearInterval(el._fade);
  const from = el.volume;
  const t0 = performance.now();
  // setInterval keeps fading even when the tab is in the background and animation frames stop.
  el._fade = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k >= 1) {
      clearInterval(el._fade);
      if (to === 0) el.pause();
    }
  }, 50);
}

// Browsers only allow sound after a tap or key press, so if play() is refused, try again on the next one.
function retryOnGesture() {
  if (waitingForGesture) return;
  waitingForGesture = true;
  const again = () => {
    waitingForGesture = false;
    removeEventListener("pointerdown", again);
    removeEventListener("keydown", again);
    if (era) next(token);
  };
  addEventListener("pointerdown", again, { once: true });
  addEventListener("keydown", again, { once: true });
}

// Each time round the list it is shuffled again, and never starts with the track that just played.
let reorder = shuffle;
function freshPass() {
  const last = queue[current];
  let again = reorder(queue);
  if (again.length > 1 && again[0] === last) again = [...again.slice(1), again[0]];
  queue = again;
  current = -1;
}

async function next(my) {
  if (my !== token || !queue.length) return;
  for (let tries = 0; tries < queue.length; tries++) {
    if (current + 1 >= queue.length) freshPass();
    current += 1;
    const track = queue[current];
    const deck = decks.find((d) => d.paused) ?? decks[0];
    const other = decks.find((d) => d !== deck);
    deck.src = track.src;
    deck.loop = false;
    deck.volume = 0;
    deck.onended = () => next(my);
    const started = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), STALL_MS);
      deck.onplaying = () => {
        clearTimeout(timer);
        resolve(true);
      };
      deck.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
      deck.play().catch((err) => {
        clearTimeout(timer);
        if (err?.name === "NotAllowedError") retryOnGesture();
        resolve(false);
      });
    });
    if (my !== token) return deck.pause();
    if (!started) {
      deck.pause();
      if (waitingForGesture) return;
      continue;
    }
    // If a live stream drops or a file breaks halfway, move on to the next one.
    deck.onerror = () => my === token && next(my);
    fade(deck, level());
    if (!other.paused) fade(other, 0);
    for (const fn of listeners) fn({ title: track.title, artist: track.artist, year: track.year, credit: track.credit, live: Boolean(track.live) });
    return;
  }
}

export const soundtrack = {
  async play(id) {
    if (id === era && decks.some((d) => !d.paused)) return;
    const my = ++token;
    era = id;
    const list = await load(id);
    if (my !== token) return;
    // Live radio never ends, so pick one station and stay on it.
    startBed();
    reorder = id === "1980s" ? order : shuffle;
    queue = reorder(list);
    current = -1;
    next(my);
  },

  stop() {
    token++;
    era = null;
    for (const d of decks) fade(d, 0, 600);
    bed?.stop();
    bed = null;
  },

  duck(on) {
    ducked = Boolean(on);
    for (const d of decks) if (!d.paused) fade(d, level(), 400);
    bed?.setVolume(bedLevel());
  },

  setVolume(v) {
    volume = Math.max(0, Math.min(1, Number(v) || 0));
    for (const d of decks) if (!d.paused) fade(d, level(), 200);
    bed?.setVolume(bedLevel());
  },

  onTrack(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
