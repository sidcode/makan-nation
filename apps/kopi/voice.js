// Who reads the orders. Kopi codes are pre-generated clips in a local voice, the same ones Makan Nation's drinks
// uncle calls out (made by tools/voices, in hawker-voices/ beside the apps: site.ts). An order with no clip falls
// back to a device voice, but only a local one: Singapore or Malaysian English, Malay or Indonesian. A US or
// UK voice reads "kopi-o kosong" like a spelling test, so it never gets the job.
import { compile } from "./compiler.js";

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
const SRC = /^\/hawker-voices\/[A-Za-z0-9._-]+\.(mp3|ogg|wav|m4a|webm)$/;
// The two voices picked by ear on 11 October 2026 (tools/voices/kopi.py): one steady speaker each, for every
// order. Clips of the game's callouts (a different voice for each order) fill in for the same person.
const VOICE = { uncle: "kopi-malay-uncle", auntie: "kopi-sg-auntie" };
const preference = (who) => [(c) => c.voice === VOICE[who], (c) => !c.voice && c.persona === who, (c) => c.voice?.startsWith("kopi-"), () => true];

let manifest = null;
// The clips sit in hawker-voices/ beside the apps, on the Bun server and on GitHub Pages alike.
const voiceUrl = (src) => new URL(`../hawker-voices/${String(src).split("/").pop()}`, document.baseURI).href;
const ready = fetch(voiceUrl("manifest.json"), { signal: AbortSignal.timeout(4000) })
  .then((r) => (r.ok ? r.json() : null))
  .then((m) => (manifest = m?.clips ?? {}))
  .catch(() => (manifest = {}));

const clips = (key) => (manifest?.[key] ?? []).filter((c) => SRC.test(c.src));
const sameVoice = (a, b) => (a.voice || b.voice ? a.voice === b.voice : a.persona === b.persona);

// The clips for an order, in the order they are said, in one voice: the cups ("Two"), then the order itself
// ("Kopi-O Siew Dai Da Bao"). Null when there is none (words taught on this device never have one).
export function clipsFor(s, who = "uncle") {
  if (!manifest || !s?.base || s.milk === "custom" || s.toppings?.length) return null;
  const all = clips(`call.${slug(compile({ ...s, count: 1 }))}.ms`);
  for (const ok of preference(who)) {
    for (const main of all.filter(ok)) {
      if (s.count <= 1) return [main];
      const cups = clips(`call.cups${s.count}.ms`).find((c) => sameVoice(c, main));
      if (cups) return [cups, main];
    }
  }
  return null;
}

const LOCAL = [/^en[-_](SG|MY)\b/i, /^ms\b/i, /^id\b/i];
function localVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = speechSynthesis.getVoices();
  for (const re of LOCAL) {
    const v = voices.find((x) => re.test(x.lang));
    if (v) return v;
  }
  return null;
}

let playing = null;
export function stopVoice() {
  if (playing) {
    playing.cancelled = true;
    playing.audio?.pause();
    playing = null;
  }
  try {
    speechSynthesis.cancel();
  } catch {}
}

async function playAll(parts) {
  const run = { cancelled: false, audio: null };
  playing = run;
  for (const part of parts) {
    if (run.cancelled) return;
    const audio = new Audio(voiceUrl(part.src));
    run.audio = audio;
    await new Promise((done) => {
      audio.addEventListener("ended", done, { once: true });
      audio.addEventListener("error", done, { once: true });
      audio.play().catch(done);
    });
    // A breath between "Two" and the order.
    if (part !== parts.at(-1)) await new Promise((r) => setTimeout(r, 120));
  }
  if (playing === run) playing = null;
}

// Says the order. Resolves to how: "clip", "device", or null when nothing local can say it here.
export async function speakOrder(s, who = "uncle") {
  stopVoice();
  if (!s?.base) return null;
  await Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]);
  const parts = clipsFor(s, who);
  if (parts) {
    playAll(parts);
    return "clip";
  }
  const voice = localVoice();
  if (!voice) return null;
  try {
    const u = new SpeechSynthesisUtterance(compile(s).replace(/-/g, " "));
    u.voice = voice;
    u.lang = voice.lang;
    speechSynthesis.speak(u);
    return "device";
  } catch {
    return null;
  }
}

// Who is speaking, for the credits.
export const VOICE_CREDIT = "Uncle's and auntie's voices: generated with OmniVoice by k2-fsa (CC BY-NC 4.0); the auntie is a synthetic Singapore voice made with A*STAR's MERaLiON-OmniVoice-Hokkien-TTS. Nobody's real voice is copied. Makan Nation's drinks stall uses the same clips.";
