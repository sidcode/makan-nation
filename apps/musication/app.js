import { TUNES, SYSTEMS, SOLFA, DEGREE_LABELS, RHYME_CENTS, stepIndex, centsFor, sharedNotes } from "./systems.js";
import { band, claimStage, onStageClaimed } from "./synth.js";
import { searchSongs } from "./songs.js";
import { decodePreview, analyse, compare, verdict, paceWords, brightWords, NOTE_NAMES } from "./dna.js";
import "./modes.js";

const SVG = "http://www.w3.org/2000/svg";
const $ = (sel) => document.querySelector(sel);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

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

const say = (msg) => {
  $("#status").textContent = msg;
};

const byId = (id) => SYSTEMS.find((s) => s.id === id);

const state = {
  tune: TUNES[0],
  a: byId("gong"),
  b: byId("mohanam"),
  drone: false,
  slow: false,
};

const synth = band;

/* ---------- Plate I: the wheel ---------- */

const C = 200;
const R = 138;

function polar(cents, r) {
  const ang = (cents / 1200) * 2 * Math.PI - Math.PI / 2;
  return [C + r * Math.cos(ang), C + r * Math.sin(ang)];
}

const wheel = $("#wheel");
const wheelLayers = {};

function buildWheel() {
  wheel.replaceChildren();
  const defs = svg("defs");
  const rough = svg("filter", { id: "rough", x: "-5%", y: "-5%", width: "110%", height: "110%" });
  rough.append(
    svg("feTurbulence", { type: "fractalNoise", baseFrequency: "0.035", numOctaves: "2", seed: "4" }),
    svg("feDisplacementMap", { in: "SourceGraphic", scale: "2.2" }),
  );
  defs.append(rough);
  wheel.append(defs);

  const base = svg("g", { class: "w-base" });
  base.append(
    svg("circle", { cx: C, cy: C, r: 199, class: "w-plate" }),
    svg("circle", { cx: C, cy: C, r: 176, class: "w-ring", filter: "url(#rough)" }),
    svg("circle", { cx: C, cy: C, r: R, class: "w-track" }),
  );
  for (let i = 0; i < 24; i++) {
    const cents = i * 50;
    const major = i % 2 === 0;
    const [x1, y1] = polar(cents, 176);
    const [x2, y2] = polar(cents, major ? 165 : 170);
    base.append(svg("line", { x1, y1, x2, y2, class: major ? "w-tick" : "w-tick w-tick-q" }));
    if (major) {
      const [lx, ly] = polar(cents, 188);
      base.append(svg("text", { x: lx, y: ly, class: "w-deg" }, DEGREE_LABELS[i / 2]));
    }
  }
  wheel.append(base);

  for (const name of ["shapes", "rhymes", "dotsB", "dotsA", "needle", "ripples", "center"]) {
    wheelLayers[name] = svg("g", { class: `w-${name}` });
    wheel.append(wheelLayers[name]);
  }
  const needle = svg("g", { class: "needle" });
  needle.append(
    svg("line", { x1: C, y1: C, x2: C, y2: C - R + 16, class: "needle-line" }),
    svg("circle", { cx: C, cy: C, r: 7, class: "needle-hub" }),
  );
  wheelLayers.needle.append(needle);
  wheelLayers.needleArm = needle;

  wheelLayers.centerBig = svg("text", { x: C, y: C - 30, class: "w-big" });
  wheelLayers.centerSmall = svg("text", { x: C, y: C + 46, class: "w-small" });
  wheelLayers.center.append(wheelLayers.centerBig, wheelLayers.centerSmall);
}

function shapePath(cents, r) {
  const pts = [...cents].sort((x, y) => x - y).map((c) => polar(c, r));
  return "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L") + " Z";
}

function drawWheel() {
  const { a, b } = state;
  const L = wheelLayers;
  L.shapes.replaceChildren(
    svg("path", { d: shapePath(b.slots, R), class: "shape shape-b" }),
    svg("path", { d: shapePath(a.slots, R), class: "shape shape-a" }),
  );

  const rhymes = sharedNotes(a.slots, b.slots);
  L.rhymes.replaceChildren(
    ...rhymes.map((c) => {
      const [x, y] = polar(c, R);
      const g = svg("g", { class: "rhyme", transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
      g.append(svg("circle", { r: 24, class: "rhyme-halo" }), svg("circle", { r: 24, class: "rhyme-ring" }));
      return g;
    }),
  );

  const dots = (sys, cls, radius) =>
    sys.scale.map((c) => {
      const inTune = sys.slots.some((s) => Math.abs(s - c) < 1);
      const [x, y] = polar(c, R);
      return svg("circle", {
        cx: x.toFixed(1),
        cy: y.toFixed(1),
        r: inTune ? radius : radius * 0.62,
        class: `${cls} ${inTune ? "is-tune" : "is-extra"}`,
      });
    });
  L.dotsB.replaceChildren(...dots(b, "dot-b", 15));
  L.dotsA.replaceChildren(...dots(a, "dot-a", 10));

  idleCenter();

  const n = rhymes.length;
  const stamp = $("#stamp");
  stamp.replaceChildren();
  if (a === b) {
    stamp.append(el("strong", {}, "5/5"), el("span", {}, "Same home twice. Of course they rhyme."));
  } else {
    stamp.append(el("strong", {}, `${n}/5`), el("span", {}, n === 5 ? "tune notes rhyme. Same five pitches!" : n === 1 ? "tune note rhymes. Only home matches." : `tune notes rhyme between A and B.`));
  }
  stamp.dataset.level = n >= 5 ? "all" : n >= 3 ? "some" : "few";
  stamp.classList.remove("thump");
  void stamp.offsetWidth;
  stamp.classList.add("thump");

  $("#wheel-cap").textContent = `Pitch wheel. A, ${a.name}: ${a.slots.join(", ")} cents. B, ${b.name}: ${b.slots.join(", ")} cents. ${n} of 5 tune notes rhyme.`;
}

function idleCenter() {
  wheelLayers.centerBig.textContent = state.tune.native;
  wheelLayers.centerBig.classList.toggle("is-latin", state.tune.native === state.tune.name);
  wheelLayers.centerSmall.textContent = "press play";
  wheelLayers.needleArm.style.opacity = "0";
}

function showNote(ev, layer) {
  const L = wheelLayers;
  const turn = ((ev.cents % 1200) + 1200) % 1200;
  L.needleArm.style.opacity = "1";
  // Keep the needle turning the short way round.
  const prev = L.needleArm._deg ?? turn * 0.3;
  let deg = turn * 0.3;
  while (deg - prev > 180) deg -= 360;
  while (prev - deg > 180) deg += 360;
  L.needleArm._deg = deg;
  L.needleArm.style.transform = `rotate(${deg}deg)`;
  L.needleArm.dataset.layer = layer;

  L.centerBig.classList.add("is-latin");
  L.centerBig.textContent = SOLFA[((ev.index % 5) + 5) % 5];
  const sign = ev.cents >= 0 ? "+" : "−";
  L.centerSmall.textContent = `${sign}${Math.abs(Math.round(ev.cents))} cents`;

  if (!reduceMotion.matches) {
    const [x, y] = polar(turn, R);
    const ring = svg("circle", { cx: x, cy: y, r: 12, class: `ripple ripple-${layer}` });
    ring.addEventListener("animationend", () => ring.remove());
    L.ripples.append(ring);
  }
}

/* ---------- Plate I: pickers ---------- */

function buildTunePicker() {
  const box = $("#tunes");
  box.replaceChildren(
    ...TUNES.map((t) => {
      const b = el("button", { type: "button", role: "radio", class: "tune-btn", "data-id": t.id });
      b.append(el("span", { class: "tune-native" }, t.native === t.name ? t.from : t.native), el("span", { class: "tune-name" }, t.name));
      b.addEventListener("click", () => {
        state.tune = t;
        syncTune();
        if (player) restart();
      });
      return b;
    }),
  );
}

function syncTune() {
  for (const b of $("#tunes").children) {
    const on = b.dataset.id === state.tune.id;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  }
  const blurb = $("#tune-blurb");
  blurb.replaceChildren(document.createTextNode(state.tune.blurb + " "), el("a", { href: state.tune.source, target: "_blank", rel: "noopener" }, "Score and story"));
  buildRibbon();
  drawWheel();
}

function miniWheel(sys) {
  const s = svg("svg", { viewBox: "0 0 60 60", class: "mini", "aria-hidden": "true" });
  const c = 30, r = 22;
  const p = (cents) => {
    const ang = (cents / 1200) * 2 * Math.PI - Math.PI / 2;
    return [c + r * Math.cos(ang), c + r * Math.sin(ang)];
  };
  s.append(svg("circle", { cx: c, cy: c, r: 27, class: "mini-ring" }));
  const pts = [...sys.slots].sort((x, y) => x - y).map(p);
  s.append(svg("path", { d: "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L") + " Z", class: "mini-shape" }));
  for (const cents of sys.scale) {
    const [x, y] = p(cents);
    const inTune = sys.slots.includes(cents);
    s.append(svg("circle", { cx: x, cy: y, r: inTune ? 3.2 : 2, class: inTune ? "mini-dot" : "mini-dot is-extra" }));
  }
  return s;
}

function buildCards() {
  const box = $("#cards");
  box.replaceChildren(
    ...SYSTEMS.map((sys) => {
      const b = el("button", { type: "button", role: "radio", class: "card", "data-id": sys.id });
      const text = el("span", { class: "card-text" });
      text.append(el("span", { class: "card-name" }, sys.name), el("span", { class: "card-from" }, `${sys.native} · ${sys.from}`));
      b.append(miniWheel(sys), text, el("span", { class: "card-rhyme" }));
      b.addEventListener("click", () => pickA(sys));
      return b;
    }),
  );

  const chips = $("#against");
  chips.replaceChildren(
    ...SYSTEMS.map((sys) => {
      const b = el("button", { type: "button", role: "radio", class: "chip", "data-id": sys.id }, sys.name);
      b.addEventListener("click", () => pickB(sys));
      return b;
    }),
  );
  rovingRadios(box);
  rovingRadios(chips);
  rovingRadios($("#tunes"));
}

// Arrow keys move through a radiogroup of buttons.
function rovingRadios(group) {
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

function pickA(sys) {
  state.a = sys;
  $("#drone").checked = state.drone = Boolean(sys.drone);
  syncSystems();
  if (player) {
    player.refreshDrone();
    say(`Now playing in ${sys.name}.`);
  }
}

function pickB(sys) {
  state.b = sys;
  syncSystems();
}

function syncSystems() {
  for (const b of $("#cards").children) {
    const on = b.dataset.id === state.a.id;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
    const sys = byId(b.dataset.id);
    const n = sharedNotes(sys.slots, state.b.slots).length;
    const badge = b.querySelector(".card-rhyme");
    badge.textContent = `${n}/5 with B`;
    badge.dataset.level = n >= 5 ? "all" : n >= 3 ? "some" : "few";
  }
  for (const b of $("#against").children) {
    const on = b.dataset.id === state.b.id;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  }
  $("#play .btn-label").textContent = player?.mode === "main" ? "Stop" : `Play in ${state.a.name}`;
  drawDetail($("#detail-a"), state.a, "A");
  drawDetail($("#detail-b"), state.b, "B");
  drawWheel();
  moveRibbon();
}

function drawDetail(box, sys, tag) {
  box.replaceChildren();
  const head = el("header", { class: "detail-head" });
  head.append(el("span", { class: `tag tag-${tag.toLowerCase()}` }, tag), el("h4", {}, sys.name), el("span", { class: "detail-from" }, `${sys.native} · ${sys.from}`));
  box.append(head, el("p", { class: "detail-about" }, sys.about));
  const notes = el("p", { class: "detail-notes" });
  notes.append(el("span", { class: "k" }, "Tune lands on"), el("span", { class: "v" }, sys.slots.map((c) => `${c}`).join(" · ") + " cents"));
  box.append(notes);
  const meta = el("p", { class: "detail-meta" });
  meta.append(el("span", {}, `Voice: ${sys.voiceName}`));
  if (sys.approx) meta.append(el("span", { class: "badge" }, "tuning varies"));
  box.append(meta);
  const links = el("p", { class: "detail-links" });
  sys.links.forEach(([label, href], i) => {
    if (i) links.append(document.createTextNode(" · "));
    links.append(el("a", { href, target: "_blank", rel: "noopener" }, label));
  });
  box.append(links);
}

/* ---------- Plate I: melody ribbon ---------- */

const ribbon = $("#ribbon");
const RH = 190;
let RW = 960;
let ribbonInfo = null;

// Narrow screens get a shorter, taller-looking ribbon so the notes stay readable.
function ribbonWidth() {
  const w = ribbon.parentElement.clientWidth || 960;
  return Math.round(Math.min(960, Math.max(560, w * 1.25)) / 40) * 40;
}

let resizeTimer = 0;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (ribbonWidth() !== RW) buildRibbon();
  }, 150);
});

function tuneEvents(tune, sys, maxBeats = Infinity) {
  const events = [];
  let beat = 0;
  for (const [semis, beats] of tune.notes) {
    if (beat >= maxBeats - 1e-9) break;
    if (semis !== null) {
      const index = stepIndex(semis);
      events.push({ beat, beats, index, cents: centsFor(sys, index) });
    }
    beat += beats;
  }
  return { events, total: Math.min(beat, maxBeats) };
}

function buildRibbon() {
  RW = ribbonWidth();
  const tune = state.tune;
  const { events, total } = tuneEvents(tune, state.a);
  let lo = Infinity, hi = -Infinity;
  for (const sys of SYSTEMS) {
    for (const ev of tuneEvents(tune, sys).events) {
      lo = Math.min(lo, ev.cents);
      hi = Math.max(hi, ev.cents);
    }
  }
  lo -= 120;
  hi += 120;
  const x = (beat) => 14 + (beat / total) * (RW - 28);
  const y = (cents) => RH - 12 - ((cents - lo) / (hi - lo)) * (RH - 24);
  ribbon.setAttribute("viewBox", `0 0 ${RW} ${RH}`);
  ribbon.replaceChildren();

  const rungs = svg("g", { class: "rungs" });
  const layerB = svg("g", { class: "notes notes-b" });
  const layerA = svg("g", { class: "notes notes-a" });
  const head = svg("line", { x1: 0, x2: 0, y1: 4, y2: RH - 4, class: "playhead" });
  ribbon.append(rungs, layerB, layerA, head);

  const rects = (layer) =>
    events.map((ev, i) => {
      const w = Math.max(4, x(ev.beat + ev.beats) - x(ev.beat) - 3);
      const r = svg("rect", { x: x(ev.beat).toFixed(1), y: -5.5, width: w.toFixed(1), height: 11, rx: 5.5 });
      // A small stagger makes the melody ripple left to right when it moves house.
      r.style.transitionDelay = `${i * 5}ms`;
      layer.append(r);
      return r;
    });

  ribbonInfo = { tune, total, x, y, lo, hi, rungs, head, a: rects(layerA), b: rects(layerB) };
  moveRibbon();
}

function moveRibbon() {
  if (!ribbonInfo || ribbonInfo.tune !== state.tune) return;
  const { tune, y, lo, hi, rungs } = ribbonInfo;
  const place = (rects, sys) => {
    const { events } = tuneEvents(tune, sys);
    events.forEach((ev, i) => {
      rects[i].style.transform = `translateY(${y(ev.cents).toFixed(1)}px)`;
    });
  };
  place(ribbonInfo.a, state.a);
  place(ribbonInfo.b, state.b);

  rungs.replaceChildren();
  for (let oct = -2; oct <= 2; oct++) {
    for (const c of state.a.slots) {
      const cents = c + oct * 1200;
      if (cents < lo || cents > hi) continue;
      const yy = y(cents).toFixed(1);
      rungs.append(svg("line", { x1: 8, x2: RW - 8, y1: yy, y2: yy, class: c === 0 ? "rung rung-home" : "rung" }));
    }
  }
}

function ribbonAt(beat, layer, active) {
  if (!ribbonInfo) return;
  const { head, x } = ribbonInfo;
  head.style.transform = `translateX(${x(beat).toFixed(1)}px)`;
  head.dataset.layer = layer;
  for (const set of [ribbonInfo.a, ribbonInfo.b]) {
    for (const r of set) r.classList.remove("on");
  }
  if (active !== undefined) ribbonInfo[layer]?.[active]?.classList.add("on");
}

/* ---------- Plate I: playback ---------- */

let player = null;

function droneFor(sys) {
  return sys.scale.some((c) => Math.abs(c - 700) <= RHYME_CENTS);
}

// Plays one or more segments back to back. Main mode reads state.a live, so switching
// systems mid-tune moves the very next note into its new home.
function startPlayer(mode) {
  stopPlayer();
  claimStage("tune");
  const ctx = synth.ensure();
  const tune = state.tune;
  const spb = 60 / tune.bpm / (state.slow ? 0.5 : 1);
  const t0 = ctx.currentTime + 0.12;

  const segments =
    mode === "ab"
      ? [
          { layer: "a", sys: () => state.a, beats: phraseBeats(tune) },
          { layer: "b", sys: () => state.b, beats: phraseBeats(tune) },
        ]
      : [{ layer: "a", sys: () => state.a, beats: Infinity }];

  const flat = [];
  let start = t0;
  for (const seg of segments) {
    const { events, total } = tuneEvents(tune, state.a, seg.beats);
    events.forEach((ev, i) => flat.push({ ...ev, i, seg, time: start + ev.beat * spb, segStart: start }));
    seg.start = start;
    seg.total = total;
    start += total * spb + (mode === "ab" ? spb * 1.5 : 0);
  }
  const end = start;

  const p = {
    mode,
    next: 0,
    shown: -1,
    refreshDrone() {
      synth.stopDrone();
      if (state.drone) synth.startDrone(tune.homeHz, droneFor(state.a));
    },
  };
  player = p;
  if (state.drone) synth.startDrone(tune.homeHz, droneFor(state.a));

  p.timer = setInterval(() => {
    const horizon = synth.now + 0.15;
    while (p.next < flat.length && flat[p.next].time < horizon) {
      const ev = flat[p.next];
      const sys = ev.seg.sys();
      const cents = centsFor(sys, ev.index);
      ev.cents = cents;
      ev.voice = sys.voice;
      synth.note(sys.voice, tune.homeHz * 2 ** (cents / 1200), Math.max(ev.time, synth.now), ev.beats * spb * 0.92, ev.beat % 1 === 0 ? 0.85 : 0.7);
      p.next++;
    }
    if (synth.now > end + 0.3) stopPlayer();
  }, 30);

  const frame = () => {
    if (player !== p) return;
    const now = synth.now;
    let k = p.shown;
    while (k + 1 < flat.length && flat[k + 1].time <= now) k++;
    const seg = segments.find((s) => now >= s.start && now < s.start + s.total * spb) ?? segments[segments.length - 1];
    if (k !== p.shown && k >= 0 && flat[k].cents !== undefined) {
      p.shown = k;
      showNote(flat[k], flat[k].seg.layer);
    }
    const beat = Math.max(0, Math.min(seg.total, (now - seg.start) / spb));
    ribbonAt(beat, seg.layer, k >= 0 && flat[k].seg === seg ? flat[k].i : undefined);
    p.raf = requestAnimationFrame(frame);
  };
  p.raf = requestAnimationFrame(frame);

  syncButtons();
  say(mode === "ab" ? `First line in ${state.a.name}, then in ${state.b.name}.` : `Playing ${tune.name} in ${state.a.name}.`);
}

function phraseBeats(tune) {
  return tune.phrase ?? 8;
}

function stopPlayer() {
  if (!player) return;
  clearInterval(player.timer);
  cancelAnimationFrame(player.raf);
  player = null;
  synth.hush();
  synth.stopDrone();
  ribbonAt(0, "a");
  idleCenter();
  syncButtons();
}

function restart() {
  const mode = player?.mode ?? "main";
  startPlayer(mode);
}

function syncButtons() {
  const play = $("#play");
  const on = player?.mode === "main";
  play.setAttribute("aria-pressed", String(on));
  play.classList.toggle("is-on", on);
  play.querySelector(".btn-label").textContent = on ? "Stop" : `Play in ${state.a.name}`;
  const ab = $("#ab");
  ab.classList.toggle("is-on", player?.mode === "ab");
  ab.textContent = player?.mode === "ab" ? "Stop" : "First line in A, then B";
}

$("#play").addEventListener("click", () => (player?.mode === "main" ? stopPlayer() : startPlayer("main")));
$("#ab").addEventListener("click", () => (player?.mode === "ab" ? stopPlayer() : startPlayer("ab")));
$("#drone").addEventListener("change", (e) => {
  state.drone = e.target.checked;
  player?.refreshDrone();
});
$("#slow").addEventListener("change", (e) => {
  state.slow = e.target.checked;
  if (player) restart();
});

/* ---------- Plate II: Record DNA ---------- */

const PAIRS = [
  { label: "Bengawan Solo, twice", a: ["Gesang Bengawan Solo", "gesang"], b: ["Bengawan Solo Singapore Symphony", "singapore symphony"] },
  { label: "Rasa Sayang, twice", a: ["Dick Lee Rasa Sayang", "dick lee"], b: ["Lisa Ono Rasa Sayang", "lisa ono"] },
  { label: "Mandopop, 30 years apart", a: ["Teresa Teng 月亮代表我的心", "teresa teng"], b: ["Jay Chou 青花瓷", "jay chou"] },
  { label: "Malay pop, two eras", a: ["Siti Nurhaliza Cindai", "siti nurhaliza"], b: ["Yuna Terukir Di Bintang", "yuna"] },
  { label: "Japan 1961, Singapore 2004", a: ["Kyu Sakamoto Sukiyaki", "kyu sakamoto"], b: ["JJ Lin 江南", "jj lin"] },
  { label: "Tamil film songs, two generations", a: ["Ilaiyaraaja Illamai Etho Ehto", "ilaiyaraaja"], b: ["Why This Kolaveri Di", "anirudh"] },
  { label: "Blues and min'yō", a: ["B.B. King The Thrill Is Gone", "b.b. king"], b: ["Yonekawa Toshiko Soran Bushi", "yonekawa toshiko"] },
  { label: "Ethio-jazz and Okinawa", a: ["Mulatu Astatke Tezeta", "mulatu"], b: ["Rimi Natsukawa Shima Uta", "rimi natsukawa"] },
  { label: "Raga and jazz", a: ["Ravi Shankar Raga Jog", "ravi shankar"], b: ["John Coltrane India", "coltrane", "india"] },
  { label: "Cairo and Seville", a: ["Umm Kulthum Anta Oumri", "umm kulthum", "anta oumri"], b: ["Paco de Lucia Entre Dos Aguas", "paco de luc"] },
  { label: "Bali and New York", a: ["Gamelan Belaluan Sinom", "belaluan"], b: ["Steve Reich Music for 18 Musicians Pulses", "steve reich"] },
];

const sides = { a: { song: null, print: null, job: 0 }, b: { song: null, print: null, job: 0 } };
const printCache = new Map();
const listenAudio = new Audio();
listenAudio.preload = "none";
let listening = null;

function buildSpecimen(side) {
  const box = $(`#spec-${side}`);
  const up = side.toUpperCase();
  box.replaceChildren();

  const search = el("div", { class: "search" });
  const label = el("label", { class: "spec-label", for: `q-${side}` });
  label.append(el("span", { class: `tag tag-${side}` }, up), document.createTextNode(` Record ${up}`));
  const input = el("input", { id: `q-${side}`, type: "search", placeholder: "Search a song or artist", autocomplete: "off", spellcheck: "false", "aria-controls": `res-${side}` });
  const results = el("ul", { id: `res-${side}`, class: "results", hidden: true });
  const hint = el("p", { class: "spec-hint" }, side === "a" ? "Try P. Ramlee, xinyao or Teresa Teng." : "Try Kit Chan, JJ Lin or Siti Nurhaliza.");
  search.append(label, input, results, hint);

  const sleeve = el("div", { class: "sleeve", hidden: true });
  const art = el("img", { class: "sleeve-art", alt: "", width: "84", height: "84" });
  const words = el("div", { class: "sleeve-words" });
  words.append(el("p", { class: "sleeve-title" }), el("p", { class: "sleeve-artist" }), el("p", { class: "sleeve-year" }));
  const listen = el("button", { type: "button", class: "listen", "aria-pressed": "false" }, "Listen");
  sleeve.append(art, words, listen);

  const progress = el("p", { class: "progress", hidden: true });
  const print = el("div", { class: "print", hidden: true });
  box.append(search, sleeve, progress, print);

  const parts = { input, results, sleeve, art, words, listen, progress, print, hint };
  sides[side].ui = parts;

  let timer = 0, ctrl = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) {
      results.hidden = true;
      return;
    }
    timer = setTimeout(async () => {
      ctrl?.abort();
      ctrl = new AbortController();
      try {
        const songs = await searchSongs(q, ctrl.signal);
        showResults(side, songs);
      } catch (e) {
        if (e.name === "AbortError") return;
        results.replaceChildren(el("li", { class: "results-note" }, "The song shop is not answering. Plate I still works offline."));
        results.hidden = false;
      }
    }, 220);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") results.hidden = true;
    if (e.key === "ArrowDown" && !results.hidden) {
      e.preventDefault();
      results.querySelector("button")?.focus();
    }
  });
  results.addEventListener("keydown", (e) => {
    const items = [...results.querySelectorAll("button")];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[Math.min(items.length - 1, i + 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      (i <= 0 ? input : items[i - 1]).focus();
    } else if (e.key === "Escape") {
      results.hidden = true;
      input.focus();
    }
  });
  listen.addEventListener("click", () => toggleListen(side));
}

function showResults(side, songs) {
  const { results } = sides[side].ui;
  results.replaceChildren();
  if (!songs.length) {
    results.append(el("li", { class: "results-note" }, "Nothing on that shelf. Try another spelling."));
  }
  for (const song of songs.slice(0, 6)) {
    const li = el("li");
    const b = el("button", { type: "button", class: "result" });
    const img = el("img", { src: song.artwork, alt: "", width: "40", height: "40", loading: "lazy" });
    const t = el("span", { class: "result-text" });
    t.append(el("span", { class: "result-title" }, song.title), el("span", { class: "result-artist" }, [song.artist, song.year].filter(Boolean).join(" · ")));
    b.append(img, t);
    b.addEventListener("click", () => {
      results.hidden = true;
      sides[side].ui.input.value = "";
      chooseSong(side, song);
    });
    li.append(b);
    results.append(li);
  }
  results.hidden = false;
}

async function chooseSong(side, song) {
  const s = sides[side];
  const ui = s.ui;
  const job = ++s.job;
  s.song = song;
  s.print = null;
  if (listening === side) stopListening();

  ui.sleeve.hidden = false;
  ui.hint.hidden = true;
  ui.art.src = song.artwork;
  const [title, artist, year] = ui.words.children;
  title.textContent = song.title;
  artist.textContent = song.artist;
  year.textContent = song.year ? `Listed ${song.year}${song.album ? ` · ${song.album}` : ""}` : song.album;
  ui.print.hidden = true;
  ui.progress.hidden = false;
  ui.progress.textContent = "Fetching the clip";
  ui.progress.style.setProperty("--p", "0");
  drawMatch();

  try {
    let print = printCache.get(song.id);
    if (!print) {
      const mono = await decodePreview(song.preview);
      if (job !== s.job) return;
      print = await analyse(mono, (f) => {
        if (job !== s.job) return;
        ui.progress.textContent = `Listening closely ${Math.round(f * 100)}%`;
        ui.progress.style.setProperty("--p", String(f));
      });
      printCache.set(song.id, print);
    }
    if (job !== s.job) return;
    s.print = print;
    ui.progress.hidden = true;
    drawPrint(side);
    drawMatch();
    say(`Record ${side.toUpperCase()} read: ${song.title}.`);
  } catch (e) {
    if (job !== s.job) return;
    ui.progress.textContent = "Could not read that clip. Try another version of the song.";
  }
}

function toggleListen(side) {
  if (listening === side) return stopListening();
  stopListening();
  claimStage("dna");
  const song = sides[side].song;
  if (!song) return;
  listenAudio.src = song.preview;
  listenAudio.play().catch(() => {});
  listening = side;
  const btn = sides[side].ui.listen;
  btn.textContent = "Pause";
  btn.setAttribute("aria-pressed", "true");
}

function stopListening() {
  if (!listening) return;
  listenAudio.pause();
  const btn = sides[listening].ui.listen;
  btn.textContent = "Listen";
  btn.setAttribute("aria-pressed", "false");
  listening = null;
}
listenAudio.addEventListener("ended", stopListening);
onStageClaimed("tune", () => stopPlayer());
onStageClaimed("dna", () => stopListening());

function chromaWheel(layers, size = 180, labels = true) {
  const s = svg("svg", { viewBox: "0 0 200 200", class: "chroma", width: size, height: size, "aria-hidden": "true" });
  const c = 100, r0 = 16, r1 = 74;
  s.append(svg("circle", { cx: c, cy: c, r: r1 + 2, class: "chroma-ring" }), svg("circle", { cx: c, cy: c, r: r0, class: "chroma-hub" }));
  for (const { values, cls } of layers) {
    const g = svg("g", { class: cls });
    values.forEach((v, i) => {
      const mid = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const half = (Math.PI / 12) * 0.86;
      const rr = r0 + (r1 - r0) * Math.max(0.04, v);
      const p1 = [c + r0 * Math.cos(mid - half), c + r0 * Math.sin(mid - half)];
      const p2 = [c + rr * Math.cos(mid - half), c + rr * Math.sin(mid - half)];
      const p3 = [c + rr * Math.cos(mid + half), c + rr * Math.sin(mid + half)];
      const p4 = [c + r0 * Math.cos(mid + half), c + r0 * Math.sin(mid + half)];
      const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
      g.append(svg("path", { d: `M${f(p1)} L${f(p2)} A${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 1 ${f(p3)} L${f(p4)} A${r0} ${r0} 0 0 0 ${f(p1)} Z` }));
    });
    s.append(g);
  }
  if (labels) {
    NOTE_NAMES.forEach((n, i) => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      s.append(svg("text", { x: c + 90 * Math.cos(a), y: c + 90 * Math.sin(a), class: "chroma-label" }, n));
    });
  }
  return s;
}

function sparkline(values, cls) {
  const w = 240, h = 48;
  const s = svg("svg", { viewBox: `0 0 ${w} ${h}`, class: `spark ${cls}`, preserveAspectRatio: "none", "aria-hidden": "true" });
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - v * (h - 8)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  s.append(svg("path", { d: `${line} L${w} ${h} L0 ${h} Z`, class: "spark-fill" }), svg("path", { d: line, class: "spark-line" }));
  return s;
}

function stat(label, value, unit) {
  const d = el("div", { class: "stat" });
  d.append(el("span", { class: "k" }, label));
  const v = el("span", { class: "v" });
  v.append(el("strong", {}, value));
  if (unit) v.append(el("span", { class: "u" }, unit));
  d.append(v);
  return d;
}

function drawPrint(side) {
  const { print, ui } = sides[side];
  const box = ui.print;
  box.replaceChildren();

  box.append(stat("Tempo, est.", String(print.bpm), `BPM · ${paceWords(print.bpm)}`));

  const bright = stat("Brightness", brightWords(print.brightness), `${Math.round(print.brightness)} Hz centre of mass`);
  const meter = el("div", { class: "meter", "aria-hidden": "true" });
  const pos = Math.max(0, Math.min(1, Math.log(print.brightness / 600) / Math.log(4500 / 600)));
  const pin = el("i", { class: `meter-pin pin-${side}` });
  pin.style.left = `${(pos * 100).toFixed(1)}%`;
  meter.append(pin);
  bright.append(meter);
  box.append(bright);

  const loud = el("div", { class: "stat stat-wide" });
  loud.append(el("span", { class: "k" }, "Loudness over 30 seconds"), sparkline(print.loudness, `spark-${side}`));
  box.append(loud);

  const notes = el("div", { class: "stat stat-wide stat-notes" });
  const key = `${NOTE_NAMES[print.key.tonic]} ${print.key.mode}`;
  notes.append(el("span", { class: "k" }, "Notes it leans on"), chromaWheel([{ values: print.chroma, cls: `petals petals-${side}` }], 150), el("span", { class: "keyline" }, `Feels like ${key}, roughly`));
  box.append(notes);
  box.hidden = false;
}

function drawMatch() {
  const box = $("#match");
  box.replaceChildren();
  const A = sides.a.print, B = sides.b.print;
  if (!A || !B) {
    const blank = el("div", { class: "match-blank" });
    const venn = svg("svg", { viewBox: "0 0 120 80", class: "venn", "aria-hidden": "true" });
    venn.append(svg("circle", { cx: 46, cy: 40, r: 30, class: "venn-a" }), svg("circle", { cx: 74, cy: 40, r: 30, class: "venn-b" }));
    blank.append(venn, el("p", {}, sides.a.song || sides.b.song ? "One more record and the verdict lands here." : "Pick two records, or try a pair above. The verdict lands here."));
    box.append(blank);
    return;
  }
  const cmp = compare(A, B);
  box.append(el("p", { class: "match-kicker" }, "Both fingerprints, laid on top"));
  box.append(
    chromaWheel(
      [
        { values: B.chroma, cls: "petals petals-b" },
        { values: A.chroma, cls: "petals petals-a" },
      ],
      220,
    ),
  );
  box.append(el("p", { class: "verdict" }, verdict(cmp)));

  const list = el("dl", { class: "facts" });
  const add = (k, v) => {
    list.append(el("dt", {}, k), el("dd", {}, v));
  };
  add("Note overlap", `${Math.round(cmp.overlap * 100)}%`);
  if (cmp.shift !== 0) {
    const n = Math.abs(cmp.shift);
    add("Scale shape", `${Math.round(cmp.shape * 100)}% if B moves ${cmp.shift > 0 ? "up" : "down"} ${n} semitone${n === 1 ? "" : "s"}`);
  } else {
    add("Scale shape", `${Math.round(cmp.shape * 100)}%, already lined up`);
  }
  const doubled = Math.abs(cmp.pace - 2) < 0.12;
  add("Pace", doubled ? `${A.bpm} vs ${B.bpm} BPM. One counts double time, so the pulse may match.` : cmp.pace < 1.06 ? `${A.bpm} vs ${B.bpm} BPM. Same stride.` : `${A.bpm} vs ${B.bpm} BPM`);
  add("Brighter", cmp.brighter === "a" ? "A" : "B");
  box.append(list);
}

function buildPairs() {
  const box = $("#pairs");
  box.append(el("span", { class: "pairs-label" }, "Try a pair"));
  for (const pair of PAIRS) {
    const b = el("button", { type: "button", class: "pair" }, pair.label);
    b.addEventListener("click", () => loadPair(pair, b));
    box.append(b);
  }
}

async function loadPair(pair, btn) {
  btn.classList.add("is-busy");
  try {
    await Promise.all(
      [["a", pair.a], ["b", pair.b]].map(async ([side, [q, artist, title = ""]]) => {
        const songs = await searchSongs(q);
        const song = songs.find((s) => s.artist.toLowerCase().includes(artist) && s.title.toLowerCase().includes(title)) ?? songs[0];
        if (song) chooseSong(side, song);
      }),
    );
  } catch {
    say("The song shop is not answering right now.");
    $("#match").replaceChildren(el("p", { class: "match-blank" }, "The song shop is not answering. Plate I still works offline."));
  } finally {
    btn.classList.remove("is-busy");
  }
}

document.addEventListener("click", (e) => {
  for (const side of ["a", "b"]) {
    const ui = sides[side].ui;
    if (ui && !ui.input.parentElement.contains(e.target)) ui.results.hidden = true;
  }
});

/* ---------- boot ---------- */

buildWheel();
buildTunePicker();
buildCards();
syncTune();
syncSystems();
syncButtons();
buildSpecimen("a");
buildSpecimen("b");
buildPairs();
drawMatch();
