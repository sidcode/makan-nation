// Plate II: Same mode, many names. Seven-note sets that different traditions arrived at,
// the names each one goes by, and the places where those traditions part ways.

import { band, claimStage, onStageClaimed } from "./synth.js";
import { DEGREE_LABELS } from "./systems.js";

const SVG = "http://www.w3.org/2000/svg";
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const HOME = 261.63; // C4

const W = {
  thaat: "https://en.wikipedia.org/wiki/Thaat",
  mela: "https://en.wikipedia.org/wiki/Melakarta",
  maqam: "https://en.wikipedia.org/wiki/Arabic_maqam",
  modes: "https://en.wikipedia.org/wiki/Mode_(music)",
  phrygdom: "https://en.wikipedia.org/wiki/Phrygian_dominant_scale",
  dblharm: "https://en.wikipedia.org/wiki/Double_harmonic_scale",
  kiravani: "https://en.wikipedia.org/wiki/Kiravani",
  rast: "https://en.wikipedia.org/wiki/Rast_(maqam)",
  bayati: "https://en.wikipedia.org/wiki/Bayati_(maqam)",
  tet7: "https://en.wikipedia.org/wiki/7_equal_temperament",
};

// `same` means the traditions agree note for note; `close` means near enough to be called cousins.
// Cents are hundredths of a piano semitone above the home note.
const MODES = [
  {
    id: "ionian",
    aka: "Bilawal · Sankarabharanam · Ajam",
    name: "Ionian",
    cents: [0, 200, 400, 500, 700, 900, 1100],
    voice: "pluck",
    blurb: "The major scale: do re mi fa sol la ti.",
    names: [
      ["Western", "Ionian, the major scale", "same", W.modes],
      ["Carnatic", "Dheerasankarabharanam, melakarta 29", "same", W.thaat],
      ["Hindustani", "Bilawal thaat", "same", W.thaat],
      ["Arabic", "Maqam Ajam", "close", W.maqam],
    ],
  },
  {
    id: "dorian",
    aka: "Kafi · Kharaharapriya",
    name: "Dorian",
    cents: [0, 200, 300, 500, 700, 900, 1000],
    voice: "pluck",
    blurb: "A minor scale with a bright sixth.",
    names: [
      ["Western", "Dorian", "same", W.modes],
      ["Carnatic", "Kharaharapriya, melakarta 22", "same", W.thaat],
      ["Hindustani", "Kafi thaat", "same", W.thaat],
    ],
  },
  {
    id: "phrygian",
    aka: "Bhairavi thaat · Hanumatodi · Kurd",
    name: "Phrygian",
    cents: [0, 100, 300, 500, 700, 800, 1000],
    voice: "oud",
    blurb: "Flat second, third, sixth and seventh. The half step sitting right above home gives it a dark colour.",
    names: [
      ["Western", "Phrygian", "same", W.modes],
      ["Carnatic", "Hanumatodi, melakarta 8", "same", W.thaat],
      ["Hindustani", "Bhairavi thaat", "same", W.thaat],
      ["Arabic", "Maqam Kurd", "close", W.maqam],
    ],
  },
  {
    id: "lydian",
    aka: "Kalyan · Kalyani",
    name: "Lydian",
    cents: [0, 200, 400, 600, 700, 900, 1100],
    voice: "flute",
    blurb: "Major with a raised fourth. Raga Yaman lives in this thaat.",
    names: [
      ["Western", "Lydian", "same", W.modes],
      ["Carnatic", "Mechakalyani (Kalyani), melakarta 65", "same", W.thaat],
      ["Hindustani", "Kalyan thaat", "same", W.thaat],
    ],
  },
  {
    id: "mixolydian",
    aka: "Khamaj · Harikambhoji",
    name: "Mixolydian",
    cents: [0, 200, 400, 500, 700, 900, 1000],
    voice: "pluck",
    blurb: "Major with a flat seventh.",
    names: [
      ["Western", "Mixolydian", "same", W.modes],
      ["Carnatic", "Harikambhoji, melakarta 28", "same", W.thaat],
      ["Hindustani", "Khamaj thaat", "same", W.thaat],
    ],
  },
  {
    id: "aeolian",
    aka: "Asavari · Natabhairavi · Nahawand",
    name: "Aeolian",
    cents: [0, 200, 300, 500, 700, 800, 1000],
    voice: "pluck",
    blurb: "The natural minor scale.",
    names: [
      ["Western", "Aeolian, the natural minor", "same", W.modes],
      ["Carnatic", "Natabhairavi, melakarta 20", "same", W.thaat],
      ["Hindustani", "Asavari thaat", "same", W.thaat],
      ["Arabic", "Maqam Nahawand", "close", W.maqam],
    ],
  },
  {
    id: "harmonic",
    aka: "Keeravani",
    name: "Harmonic minor",
    cents: [0, 200, 300, 500, 700, 800, 1100],
    voice: "veena",
    blurb: "Natural minor with a raised seventh, so the last step home is a half step.",
    names: [
      ["Western", "Harmonic minor", "same", W.kiravani],
      ["Carnatic", "Keeravani, melakarta 21", "same", W.kiravani],
    ],
  },
  {
    id: "phrygdom",
    aka: "Hijaz · Freygish · Vakulabharanam",
    name: "Phrygian dominant",
    cents: [0, 100, 400, 500, 700, 800, 1000],
    voice: "guitar",
    blurb: "A flat second and a natural third. One of the most travelled scales on the page.",
    names: [
      ["Arabic", "Maqam Hijaz", "close", W.phrygdom],
      ["Jewish", "Ahava Rabbah, or Freygish in klezmer", "same", W.phrygdom],
      ["Flamenco", "The Andalusian or Spanish Phrygian scale", "same", W.phrygdom],
      ["Persian", "Dastgāh-e Homayun", "close", W.phrygdom],
      ["Carnatic", "Vakulabharanam, melakarta 14", "same", W.phrygdom],
      ["Hindustani", "Raga Basant Mukhari", "same", W.phrygdom],
      ["Western", "Phrygian dominant", "same", W.phrygdom],
    ],
  },
  {
    id: "dblharm",
    aka: "Bhairav · Mayamalavagowla · Hijaz Kar",
    name: "Double harmonic",
    cents: [0, 100, 400, 500, 700, 800, 1100],
    voice: "flute",
    blurb: "Two big leaps of three semitones, one in each half.",
    names: [
      ["Hindustani", "Bhairav thaat", "same", W.thaat],
      ["Carnatic", "Mayamalavagowla, melakarta 15", "same", W.thaat],
      ["Arabic", "Maqam Hijaz Kar", "close", W.dblharm],
      ["Western", "Double harmonic major, or the Byzantine scale", "same", W.dblharm],
    ],
  },
  {
    id: "poorvi",
    aka: "Kamavardhani",
    name: "Poorvi",
    cents: [0, 100, 400, 600, 700, 800, 1100],
    voice: "flute",
    blurb: "An Indian set that Western music never gave an everyday name.",
    names: [
      ["Hindustani", "Poorvi thaat", "same", W.thaat],
      ["Carnatic", "Kamavardhani, melakarta 51", "same", W.thaat],
      ["Western", "Theory books say double harmonic ♯4", "same", W.thaat],
    ],
  },
  {
    id: "marwa",
    aka: "Gamanashrama",
    name: "Marwa",
    cents: [0, 100, 400, 600, 700, 900, 1100],
    voice: "flute",
    blurb: "Another one with no common Western name.",
    names: [
      ["Hindustani", "Marwa thaat", "same", W.thaat],
      ["Carnatic", "Gamanashrama, melakarta 53", "same", W.thaat],
      ["Western", "Theory books say Lydian ♭2", "same", W.thaat],
    ],
  },
  {
    id: "todi",
    aka: "Shubhapantuvarali",
    name: "Todi",
    cents: [0, 100, 300, 600, 700, 800, 1100],
    voice: "flute",
    blurb: "Flat second, third and sixth, raised fourth and seventh.",
    names: [
      ["Hindustani", "Todi thaat", "same", W.thaat],
      ["Carnatic", "Shubhapantuvarali, melakarta 45", "same", W.thaat],
      ["Western", "Theory books say Phrygian ♯4 ♯7", "same", W.thaat],
    ],
  },
  {
    id: "locrian",
    aka: "No Indian twin",
    name: "Locrian",
    cents: [0, 100, 300, 500, 600, 800, 1000],
    voice: "pluck",
    blurb: "The odd one out: its fifth is flat. Every melakarta keeps Sa and Pa fixed, so Carnatic music has no twin for it, and neither do the ten thaats.",
    names: [
      ["Western", "Locrian", "same", W.modes],
      ["Carnatic", "No melakarta, since Pa is always there", "none", W.mela],
      ["Hindustani", "Not one of the ten thaats", "none", W.thaat],
    ],
  },
  {
    id: "rast",
    aka: "Arabic, off the piano",
    name: "Rast",
    cents: [0, 200, 350, 500, 700, 900, 1050],
    approx: true,
    ghost: "ionian",
    voice: "oud",
    blurb: "Its third and seventh sit between the piano keys. The hollow dots show the major scale it gets rounded to.",
    names: [
      ["Arabic", "Maqam Rast, on C: C D E-half-flat F G A B-half-flat", "same", W.rast],
      ["Western", "Nearest is the major scale, a quarter tone off in two places", "close", W.rast],
    ],
  },
  {
    id: "bayati",
    aka: "Arabic, off the piano",
    name: "Bayati",
    cents: [0, 150, 300, 500, 700, 800, 1000],
    approx: true,
    ghost: "phrygian",
    voice: "oud",
    blurb: "A second that sits between flat and natural. The hollow dots show Phrygian, its nearest piano cousin.",
    names: [
      ["Arabic", "Maqam Bayati, on D: D E-half-flat F G A B♭ C", "same", W.bayati],
      ["Western", "Nearest is Phrygian, with a higher second", "close", W.bayati],
    ],
  },
  {
    id: "thai",
    aka: "Seven near-equal steps",
    name: "Thai seven",
    cents: [0, 171.4, 342.9, 514.3, 685.7, 857.1, 1028.6],
    approx: true,
    ghost: "ionian",
    voice: "bell",
    blurb: "Seven roughly equal steps of about 171 cents. Only the home note lines up with the piano.",
    names: [
      ["Thai", "Fixed-pitch instruments tuned to seven near-equal steps", "same", W.tet7],
      ["Western", "No match. The fourth and fifth land about 14 cents off", "none", W.tet7],
    ],
  },
];

const VOICES = [
  ["pluck", "Plucked strings", false],
  ["veena", "Veena, with drone", true],
  ["flute", "Bansuri, with drone", true],
  ["oud", "Oud", false],
  ["guitar", "Guitar", false],
  ["bell", "Bells", false],
];

const byId = (id) => MODES.find((m) => m.id === id);

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

function svg(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function link(href, text) {
  return el("a", { href, target: "_blank", rel: "noopener" }, text);
}

const freq = (cents, home = HOME) => home * 2 ** (cents / 1200);

/* ---------- playback ---------- */

// A tiny sequencer: schedules notes on the shared band and lights up the UI as they sound.
let job = null;

function stop() {
  if (!job) return;
  job.timers.forEach(clearTimeout);
  job.onEnd?.();
  job = null;
  band.hush();
  band.stopDrone();
}

onStageClaimed("modes", stop);

function play(events, { drone = false, onEnd } = {}) {
  stop();
  claimStage("modes");
  const ctx = band.ensure();
  const t0 = ctx.currentTime + 0.1;
  const timers = [];
  let end = 0;
  if (drone) band.startDrone(HOME, true);
  for (const ev of events) {
    const when = t0 + ev.at;
    if (ev.hit) band.hit(ev.hit, when, ev.vel ?? 0.8);
    else if (ev.voice) band.note(ev.voice, ev.hz, when, ev.dur, ev.vel ?? 0.8, ev.bend ?? null);
    if (ev.show) timers.push(setTimeout(ev.show, Math.max(0, (when - ctx.currentTime) * 1000)));
    end = Math.max(end, ev.at + (ev.dur ?? 0.2));
  }
  const mine = { timers, onEnd };
  timers.push(setTimeout(() => job === mine && stop(), (end + 0.5) * 1000));
  job = mine;
  return mine;
}

/* ---------- the mode explorer ---------- */

const state = { mode: MODES[0], voice: MODES[0].voice, playing: null };

const root = document.getElementById("modes-root");

const list = el("div", { class: "mode-list", role: "radiogroup", "aria-label": "Mode" });
const main = el("div", { class: "mode-main" });
const strip = svg("svg", { class: "mode-strip", viewBox: "0 0 720 118", role: "img" });
const stripCap = el("p", { class: "sr-only" });
const head = el("div", { class: "mode-head" });
const transport = el("div", { class: "mode-transport" });
const voiceBox = el("div", { class: "mode-voices", role: "radiogroup", "aria-label": "Hear it as" });
const namesBox = el("dl", { class: "mode-names" });
const cousins = el("div", { class: "mode-cousins" });

const scaleBtn = el("button", { type: "button", class: "btn btn-play mode-btn" });
scaleBtn.append(el("span", { class: "btn-icon", "aria-hidden": "true" }), el("span", { class: "btn-label" }, "Scale, up and down"));
const phraseBtn = el("button", { type: "button", class: "btn btn-ghost mode-btn" }, "A short phrase");
transport.append(scaleBtn, phraseBtn);

const voiceRow = el("div", { class: "mode-voice-row" });
voiceRow.append(el("span", { class: "mode-label" }, "Hear it as"), voiceBox);

main.append(strip, stripCap, head, transport, voiceRow, namesBox, cousins);

const grid = el("div", { class: "mode-grid" });
grid.append(list, main);
root.append(grid);

// Strip geometry: one octave, left to right. Phones get a narrower drawing so the labels stay readable.
let X0 = 40;
let X1 = 680;
const xOf = (cents) => X0 + (cents / 1200) * (X1 - X0);
const Y = 70;

function fitStrip() {
  const narrow = (strip.clientWidth || main.clientWidth || 720) < 560;
  const width = narrow ? 380 : 720;
  X0 = narrow ? 16 : 40;
  X1 = width - X0;
  strip.setAttribute("viewBox", `0 0 ${width} 118`);
  return narrow;
}

let fitTimer = 0;
addEventListener("resize", () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(drawStrip, 150);
});

function miniStrip(mode) {
  const s = svg("svg", { class: "mode-mini", viewBox: "0 0 120 16", "aria-hidden": "true" });
  s.append(svg("line", { x1: 4, x2: 116, y1: 8, y2: 8, class: "mini-rule" }));
  for (let i = 0; i <= 12; i++) s.append(svg("line", { x1: 4 + i * (112 / 12), x2: 4 + i * (112 / 12), y1: 5, y2: 11, class: "mini-tick" }));
  for (const c of mode.cents) s.append(svg("circle", { cx: 4 + (c / 1200) * 112, cy: 8, r: 3.2, class: "mini-note" }));
  return s;
}

function buildList() {
  list.replaceChildren(
    ...MODES.map((m) => {
      const b = el("button", { type: "button", role: "radio", class: "mode-pick", "data-id": m.id });
      const top = el("span", { class: "mode-pick-name" }, m.name);
      if (m.approx) top.append(el("span", { class: "mode-pick-badge" }, "off the keys"));
      b.append(top, miniStrip(m), el("span", { class: "mode-pick-aka" }, m.aka));
      b.addEventListener("click", () => pick(m));
      return b;
    }),
  );
  roving(list);
}

function roving(group) {
  group.addEventListener("keydown", (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    const items = [...group.querySelectorAll("button")];
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = items[(i + keys[e.key] + items.length) % items.length];
    next.focus();
    next.click();
  });
}

function buildVoices() {
  voiceBox.replaceChildren(
    ...VOICES.map(([id, label]) => {
      const b = el("button", { type: "button", role: "radio", class: "chip", "data-id": id }, label);
      b.addEventListener("click", () => {
        state.voice = id;
        syncVoices();
        if (state.playing) (state.playing === "scale" ? playScale : playPhrase)();
      });
      return b;
    }),
  );
  roving(voiceBox);
}

function syncVoices() {
  for (const b of voiceBox.children) {
    const on = b.dataset.id === state.voice;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  }
}

function stepLabel(a, b) {
  const st = (b - a) / 100;
  return Number.isInteger(st) ? String(st) : st.toFixed(st * 10 === Math.round(st * 10) ? 1 : 2);
}

function drawStrip() {
  const m = state.mode;
  const narrow = fitStrip();
  strip.classList.toggle("is-narrow", narrow);
  strip.replaceChildren();
  const g = svg("g");
  // Piano reference: a tick for every semitone, a small one for every quarter tone.
  g.append(svg("line", { x1: X0 - 10, x2: X1 + 10, y1: Y, y2: Y, class: "strip-rule" }));
  for (let c = 0; c <= 1200; c += narrow ? 100 : 50) {
    const semi = c % 100 === 0;
    g.append(svg("line", { x1: xOf(c), x2: xOf(c), y1: Y - (semi ? 9 : 5), y2: Y + (semi ? 9 : 5), class: semi ? "strip-tick" : "strip-tick strip-tick-q" }));
    if (semi) g.append(svg("text", { x: xOf(c), y: Y + 30, class: "strip-deg" }, c === 1200 ? "8" : DEGREE_LABELS[c / 100]));
  }
  strip.append(g);

  if (m.ghost) {
    const ghost = svg("g", { class: "strip-ghost" });
    for (const c of byId(m.ghost).cents) ghost.append(svg("circle", { cx: xOf(c), cy: Y, r: narrow ? 10 : 11 }));
    strip.append(ghost);
  }

  // Step sizes between neighbouring notes, as arcs above the rule.
  const notes = [...m.cents, 1200];
  const arcs = svg("g", { class: "strip-arcs" });
  for (let i = 0; i < notes.length - 1; i++) {
    const a = xOf(notes[i]);
    const b = xOf(notes[i + 1]);
    const mid = (a + b) / 2;
    const h = 14 + (b - a) * 0.22;
    arcs.append(svg("path", { d: `M${a.toFixed(1)} ${Y - 12} Q${mid.toFixed(1)} ${(Y - 12 - h).toFixed(1)} ${b.toFixed(1)} ${Y - 12}` }));
    arcs.append(svg("text", { x: mid, y: Y - 16 - h * 0.55, class: "strip-step" }, stepLabel(notes[i], notes[i + 1])));
  }
  strip.append(arcs);

  const dots = svg("g", { class: "strip-dots" });
  notes.forEach((c, i) => {
    const off = Math.abs(c / 100 - Math.round(c / 100)) > 0.05;
    dots.append(svg("circle", { cx: xOf(c), cy: Y, r: narrow ? 8 : 9, class: `strip-dot${off ? " is-off" : ""}`, "data-i": String(i) }));
  });
  strip.append(dots);
  stripCap.textContent = `${m.name}: notes at ${m.cents.map((c) => Math.round(c)).join(", ")} cents above home.`;
  strip.setAttribute("aria-label", stripCap.textContent);
}

function light(i) {
  for (const d of strip.querySelectorAll(".strip-dot")) d.classList.toggle("on", d.dataset.i === String(i));
}

function drawHead() {
  const m = state.mode;
  head.replaceChildren(el("h3", { class: "mode-title" }, m.name), el("p", { class: "mode-blurb" }, m.blurb));
}

function drawNames() {
  const m = state.mode;
  namesBox.replaceChildren();
  for (const [trad, name, kind, href] of m.names) {
    const row = el("div", { class: `mode-name is-${kind}` });
    const dd = el("dd");
    dd.append(el("span", { class: "mode-name-text" }, name), el("span", { class: "mode-name-kind" }, kind === "same" ? "same notes" : kind === "close" ? "close" : "no twin"), link(href, "source"));
    row.append(el("dt", {}, trad), dd);
    namesBox.append(row);
  }
}

// Names a scale degree against the major scale, so 600 cents is ♯4 in Lydian but ♭5 in Locrian.
const MAJOR = [0, 200, 400, 500, 700, 900, 1100];
function degreeName(cents, i) {
  const diff = Math.round((cents - MAJOR[i]) / 100);
  return (diff < 0 ? "♭".repeat(-diff) : "♯".repeat(diff)) + (i + 1);
}

// Modes that differ from this one by a single note, found by comparing degree by degree.
function drawCousins() {
  const m = state.mode;
  cousins.replaceChildren();
  if (m.approx) {
    const near = byId(m.ghost);
    cousins.append(el("span", { class: "mode-label" }, "Nearest on the piano"), cousinChip(near, ""));
    return;
  }
  const found = [];
  for (const other of MODES) {
    if (other === m || other.approx) continue;
    const diff = m.cents.map((c, i) => [c, other.cents[i], i]).filter(([a, b]) => a !== b);
    if (diff.length === 1) {
      const [, b, i] = diff[0];
      found.push([other, `${degreeName(b, i)} for ${degreeName(m.cents[i], i)}`]);
    }
  }
  if (!found.length) return;
  cousins.append(el("span", { class: "mode-label" }, "One note away"), ...found.map(([o, why]) => cousinChip(o, why)));
}

function cousinChip(mode, why) {
  const b = el("button", { type: "button", class: "chip cousin" });
  b.append(document.createTextNode(mode.name));
  if (why) b.append(el("span", { class: "cousin-why" }, why));
  b.addEventListener("click", () => {
    pick(mode);
    list.querySelector(`[data-id="${mode.id}"]`)?.focus();
  });
  return b;
}

function pick(mode) {
  stop();
  state.mode = mode;
  state.voice = mode.voice;
  for (const b of list.children) {
    const on = b.dataset.id === mode.id;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  }
  syncVoices();
  drawStrip();
  drawHead();
  drawNames();
  drawCousins();
}

const voiceHasDrone = () => VOICES.find(([id]) => id === state.voice)?.[2] ?? false;

function setPlaying(kind) {
  state.playing = kind;
  scaleBtn.classList.toggle("is-on", kind === "scale");
  scaleBtn.querySelector(".btn-label").textContent = kind === "scale" ? "Stop" : "Scale, up and down";
  phraseBtn.classList.toggle("is-on", kind === "phrase");
  phraseBtn.textContent = kind === "phrase" ? "Stop" : "A short phrase";
  if (!kind) light(-1);
}

function sequence(indices, beat, kind) {
  const notes = [...state.mode.cents, 1200];
  const events = indices.map(([i, beats], n) => {
    const at = indices.slice(0, n).reduce((t, [, b]) => t + b * beat, 0);
    return { at, voice: state.voice, hz: freq(notes[i]), dur: beats * beat * 0.95, vel: 0.8, show: () => light(i) };
  });
  setPlaying(kind);
  play(events, { drone: voiceHasDrone(), onEnd: () => setPlaying(null) });
}

function playScale() {
  const up = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i, 1]);
  const down = [6, 5, 4, 3, 2, 1, 0].map((i) => [i, 1]);
  down[down.length - 1][1] = 2;
  sequence([...up, ...down], 0.32, "scale");
}

function playPhrase() {
  // Up in a zigzag, a little turn at the top, then home.
  const phrase = [[0, 1], [2, 1], [1, 1], [3, 1], [2, 1], [4, 2], [5, 1], [4, 1], [3, 1], [1, 1], [2, 1], [0, 3]];
  sequence(phrase, 0.3, "phrase");
}

scaleBtn.addEventListener("click", () => (state.playing === "scale" ? stop() : playScale()));
phraseBtn.addEventListener("click", () => (state.playing === "phrase" ? stop() : playPhrase()));

/* ---------- where they part ways ---------- */

const parts = el("div", { class: "parts" });
const partsHead = el("div", { class: "parts-head" });
partsHead.append(
  el("h3", { class: "parts-title" }, "Where they part ways"),
  el("p", { class: "parts-lede" }, "Sharing seven notes is only the start. Here is what a scale on paper leaves out."),
);
root.append(partsHead, parts);

let activeDemo = null;

function demoButton(label, run) {
  const b = el("button", { type: "button", class: "demo" });
  b.append(el("span", { class: "demo-icon", "aria-hidden": "true" }), el("span", { class: "demo-label" }, label));
  b.addEventListener("click", () => {
    if (activeDemo === b) return stop();
    const handle = run();
    activeDemo = b;
    b.classList.add("is-on");
    const prev = handle.onEnd;
    handle.onEnd = () => {
      prev?.();
      b.classList.remove("is-on");
      if (activeDemo === b) activeDemo = null;
    };
  });
  return b;
}

function card({ title, text, demos, sources, extra }) {
  const c = el("article", { class: "part" });
  c.append(el("h4", {}, title), el("p", {}, text));
  if (extra) c.append(extra);
  if (demos?.length) {
    const row = el("div", { class: "demo-row" });
    row.append(...demos);
    c.append(row);
  }
  const src = el("p", { class: "part-src" });
  sources.forEach(([label, href], i) => {
    if (i) src.append(document.createTextNode(" · "));
    src.append(link(href, label));
  });
  c.append(src);
  return c;
}

const seq = (voice, cents, beat, opts = {}) =>
  cents.map((c, i) => ({ at: i * beat, voice, hz: freq(c), dur: beat * (opts.legato ?? 0.95), vel: 0.8, bend: opts.bends?.[i] ?? null }));

// 1. Neutral intervals.
const thirds = [
  ["Minor third", 300],
  ["Rast's third", 350],
  ["Major third", 400],
];
parts.append(
  card({
    title: "Notes between the keys",
    text: "Maqam Rast puts its third about halfway between the piano's minor and major third. The exact spot moves with region and era, and players nudge it on the way up and down.",
    demos: thirds.map(([label, c]) => demoButton(label, () => play([...seq("oud", [0, c, 700, c, 0], 0.42)]))),
    sources: [
      ["Arabic maqam", W.maqam],
      ["Neutral third", "https://en.wikipedia.org/wiki/Neutral_third"],
      ["Bayati", W.bayati],
    ],
  }),
);

// 2. Gamakas: the same phrase, plain and then ornamented.
const gamakaPhrase = [0, 200, 400, 500, 700, 500, 400, 200, 0];
const kampita = [[0, 0], [0.09, 100], [0.18, 0], [0.27, 100], [0.36, 0], [0.45, 100], [0.54, 0]];
const slideUp = [[0, -200], [0.16, 0]];
const slideDown = [[0, 100], [0.2, 0]];
const bends = [null, slideUp, kampita, null, slideUp, slideDown, kampita, null, slideDown];
parts.append(
  card({
    title: "A raga moves",
    text: "Gamakas are the slides and shakes that give each raga its character. Here is one short phrase on a veena, plain and then with a few added.",
    demos: [
      demoButton("Plain", () => play(seq("veena", gamakaPhrase, 0.55), { drone: true })),
      demoButton("With gamakas", () => play(seq("veena", gamakaPhrase, 0.55, { bends }), { drone: true })),
    ],
    sources: [
      ["Gamaka", "https://en.wikipedia.org/wiki/Gamaka_(music)"],
      ["Raga", "https://en.wikipedia.org/wiki/Raga"],
    ],
  }),
);

// 3. False friends: Bhairavi north and south.
const north = [0, 100, 300, 500, 700, 800, 1000, 1200, 1000, 800, 700, 500, 300, 100, 0];
const south = [0, 200, 300, 500, 700, 900, 1000, 1200, 1000, 800, 700, 500, 300, 200, 0];
parts.append(
  card({
    title: "Same name, different scale",
    text: "Bhairavi in the north flattens re, ga, dha and ni, the same set as Phrygian. Bhairavi in the south climbs with a natural sixth and comes down with a flat one. One name, two ragas.",
    demos: [
      demoButton("Northern Bhairavi", () => play(seq("flute", north, 0.3), { drone: true })),
      demoButton("Southern Bhairavi", () => play(seq("veena", south, 0.3), { drone: true })),
    ],
    sources: [
      ["Thaat", W.thaat],
      ["Bhairavi (Carnatic)", "https://en.wikipedia.org/wiki/Bhairavi_(Carnatic)"],
    ],
  }),
);

// 4. Drone or chords.
const climb = [0, 200, 400, 500, 700, 900, 1100, 1200];
function overChords() {
  const beat = 0.42;
  const tune = seq("flute", climb, beat);
  // I for two notes, IV for two, V for two, back to I.
  const chords = [[0, [0, 400, 700]], [2, [500, 900, 1200]], [4, [700, 1100, 1400]], [6, [0, 400, 700]]];
  const low = chords.flatMap(([at, notes]) => notes.map((c) => ({ at: at * beat, voice: "pluck", hz: freq(c - 1200), dur: beat * 2, vel: 0.5 })));
  return play([...tune, ...low]);
}
parts.append(
  card({
    title: "Drone or chords",
    text: "Indian classical music sits on a tanpura drone that stays put for the whole piece. Western tonal music moves chords under the tune. Same eight notes, both ways.",
    demos: [demoButton("Over a drone", () => play(seq("flute", climb, 0.42), { drone: true })), demoButton("Over chords", overChords)],
    sources: [
      ["Tanpura", "https://en.wikipedia.org/wiki/Tanpura"],
      ["Chord progression", "https://en.wikipedia.org/wiki/Chord_progression"],
    ],
  }),
);

// 5. Tunings off the piano.
const thai = [...byId("thai").cents, 1200];
const piano = [...byId("ionian").cents, 1200];
parts.append(
  card({
    title: "Tunings the piano can't reach",
    text: "Thai fixed-pitch instruments split the octave into seven roughly equal steps of about 171 cents. A Thai xylophone measured in 1974 came within 5 cents of that. Javanese gamelan sets are each tuned their own way, so no two sound quite alike.",
    demos: [demoButton("Thai seven", () => play(seq("bell", thai, 0.34))), demoButton("Piano seven", () => play(seq("bell", piano, 0.34)))],
    sources: [
      ["7 equal temperament", W.tet7],
      ["Gamelan", "https://en.wikipedia.org/wiki/Gamelan"],
    ],
  }),
);

// 6. Rhythm cycles.
const CYCLES = [
  {
    id: "teentaal",
    name: "Teentaal",
    from: "North India",
    bpm: 150,
    groups: [4, 4, 4, 4],
    // X is sam, the heavy first beat; 0 is khali, the empty section marked with a wave.
    marks: ["X", "", "", "", "2", "", "", "", "0", "", "", "", "3", "", "", ""],
    hits: ["clap", "tick", "tick", "tick", "clap", "tick", "tick", "tick", "wave", "tick", "tick", "tick", "clap", "tick", "tick", "tick"],
  },
  {
    id: "adi",
    name: "Adi tala",
    from: "South India",
    bpm: 110,
    groups: [4, 2, 2],
    marks: ["clap", "1", "2", "3", "clap", "wave", "clap", "wave"],
    hits: ["clap", "tick", "tick", "tick", "clap", "wave", "clap", "wave"],
  },
  {
    id: "lancaran",
    name: "Lancaran",
    from: "Java",
    bpm: 132,
    groups: [4, 4, 4, 4],
    // T ketuk, W a rest where the kempul is left out, N kenong, P kempul, G gong with kenong.
    marks: ["T", "W", "T", "N", "T", "P", "T", "N", "T", "P", "T", "N", "T", "P", "T", "G"],
    hits: ["ketuk", null, "ketuk", "kenong", "ketuk", "kempul", "ketuk", "kenong", "ketuk", "kempul", "ketuk", "kenong", "ketuk", "kempul", "ketuk", ["gong", "kenong"]],
  },
  {
    id: "four",
    name: "Four beats a bar",
    from: "Pop, twice round",
    bpm: 120,
    groups: [4, 4],
    marks: ["1", "2", "3", "4", "1", "2", "3", "4"],
    hits: ["clap", "tick", "tick", "tick", "clap", "tick", "tick", "tick"],
  },
];

let cycle = CYCLES[0];
const cycleBox = el("div", { class: "cycle" });
const cyclePicker = el("div", { class: "chips cycle-picker", role: "radiogroup", "aria-label": "Rhythm cycle" });
const beats = el("div", { class: "cycle-beats", "aria-hidden": "true" });
const cycleNote = el("p", { class: "cycle-note" });
cycleBox.append(cyclePicker, beats, cycleNote);

function drawCycle() {
  beats.replaceChildren();
  let i = 0;
  for (const size of cycle.groups) {
    const g = el("span", { class: "cycle-group" });
    for (let k = 0; k < size; k++, i++) {
      const hit = cycle.hits[i];
      const big = hit === "clap" || (Array.isArray(hit) && hit.includes("gong"));
      g.append(el("span", { class: `beat${big ? " is-big" : ""}${hit ? "" : " is-rest"}`, "data-i": String(i) }, cycle.marks[i]));
    }
    beats.append(g);
  }
  cycleNote.textContent = `${cycle.name}, ${cycle.from}: ${cycle.groups.reduce((a, b) => a + b, 0)} beats as ${cycle.groups.join(" + ")}.`;
  for (const b of cyclePicker.children) {
    const on = b.dataset.id === cycle.id;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  }
}

cyclePicker.append(
  ...CYCLES.map((c) => {
    const b = el("button", { type: "button", role: "radio", class: "chip", "data-id": c.id }, c.name);
    b.addEventListener("click", () => {
      cycle = c;
      const wasOn = activeDemo === cycleBtn;
      stop();
      drawCycle();
      if (wasOn) cycleBtn.click();
    });
    return b;
  }),
);
roving(cyclePicker);

function lightBeat(i) {
  for (const b of beats.querySelectorAll(".beat")) b.classList.toggle("on", b.dataset.i === String(i));
}

const cycleBtn = demoButton("Play two rounds", () => {
  const beat = 60 / cycle.bpm;
  const events = [];
  const n = cycle.hits.length;
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < n; i++) {
      const at = (round * n + i) * beat;
      const hits = [cycle.hits[i]].flat().filter(Boolean);
      events.push({ at, dur: beat, show: () => lightBeat(i) });
      for (const h of hits) events.push({ at, hit: h, vel: 0.85, dur: beat });
    }
  }
  const handle = play(events);
  const prev = handle.onEnd;
  handle.onEnd = () => {
    prev?.();
    lightBeat(-1);
  };
  return handle;
});

parts.append(
  card({
    title: "Counting in cycles",
    text: "Music also counts differently. Teentaal runs 16 beats with an empty stretch called khali. Adi tala runs 8, grouped 4 + 2 + 2. A Javanese lancaran waits 16 beats for its big gong.",
    extra: cycleBox,
    demos: [cycleBtn],
    sources: [
      ["Tala", "https://en.wikipedia.org/wiki/Tala_(music)"],
      ["Colotomy", "https://en.wikipedia.org/wiki/Colotomy"],
    ],
  }),
);

/* ---------- boot ---------- */

buildList();
buildVoices();
pick(MODES[0]);
drawCycle();
