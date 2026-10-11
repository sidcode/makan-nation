// Plate III: Twelve notes.
// Ed Sheeran's argument that pop runs on a handful of notes and chords, taken apart and made playable.
// Everything is built into #twelve-root, with its own small Web Audio band so it never depends on synth.js.
import { searchSongs } from "./songs.js";

const root = document.getElementById("twelve-root");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}

const link = (label, href) => h("a", { href, target: "_blank", rel: "noopener", text: label });

// ---------- Music basics ----------

const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const BLACK = new Set([1, 3, 6, 8, 10]);
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// Degree labels relative to a major scale, so the minor scales show their flats.
const DEGREE = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];

const SCALES = [
  { id: "major", name: "Major", steps: [0, 2, 4, 5, 7, 9, 11], parent: "major", about: "Do re mi fa sol la ti. Seven of the twelve notes, and the home of most pop." },
  { id: "minor", name: "Natural minor", steps: [0, 2, 3, 5, 7, 8, 10], parent: "minor", about: "The same seven notes as a major scale, started from its sixth note. Instant drama." },
  { id: "majpent", name: "Major pentatonic", steps: [0, 2, 4, 7, 9], parent: "major", about: "Five notes, no clashes. Folk songs from China to Scotland live here." },
  { id: "minpent", name: "Minor pentatonic", steps: [0, 3, 5, 7, 10], parent: "minor", about: "The blues and rock scale. Its first four rising notes were at the heart of the Shape of You case." },
];

// Chord shapes in semitones above the chord root.
const SHAPES = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  maj7: [0, 4, 7, 11],
  dom7: [0, 4, 7, 10],
  min7: [0, 3, 7, 10],
};

// Stack thirds inside a seven-note scale to get its chords.
function diatonicChords(steps) {
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII"];
  return steps.map((s, i) => {
    const third = (steps[(i + 2) % 7] - s + 12) % 12;
    const fifth = (steps[(i + 4) % 7] - s + 12) % 12;
    const q = third === 4 ? "maj" : fifth === 6 ? "dim" : "min";
    const r = q === "maj" ? roman[i] : roman[i].toLowerCase();
    return { root: s, q, roman: q === "dim" ? `${r}°` : r, num: String(i + 1) };
  });
}

// Roman numerals in a major key, as used by the loops below.
const ROMAN = {
  I: [0, "maj"], ii: [2, "min"], iii: [4, "min"], IV: [5, "maj"], V: [7, "maj"], vi: [9, "min"],
  IVmaj7: [5, "maj7"], V7: [7, "dom7"], iii7: [4, "min7"], I7: [0, "dom7"], IV7: [5, "dom7"],
};
const NUMBER = { I: "1", ii: "2", iii: "3", IV: "4", V: "5", vi: "6", IVmaj7: "4", V7: "5", iii7: "3", I7: "1", IV7: "4" };
const PRETTY = { IVmaj7: "IVmaj7", V7: "V7", iii7: "iii7", I7: "I7", IV7: "IV7" };
const chordName = (key, roman) => {
  const [semi, q] = ROMAN[roman];
  const suffix = { maj: "", min: "m", maj7: "maj7", dom7: "7", min7: "m7", dim: "dim" }[q];
  return NOTE_NAMES[(key + semi) % 12] + suffix;
};

// ---------- A small band ----------

const band = {
  ctx: null,
  master: null,
  bus: null,
  noise: null,

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(comp);
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.ctx = ctx;
    return ctx;
  },

  // Each loop gets its own bus, so stopping can cut notes that were already scheduled.
  newBus() {
    this.dropBus();
    this.bus = this.ctx.createGain();
    this.bus.connect(this.master);
    return this.bus;
  },

  dropBus() {
    if (!this.bus) return;
    const old = this.bus;
    old.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    setTimeout(() => old.disconnect(), 400);
    this.bus = null;
  },

  note(midi, t, dur, voice = "keys", vel = 0.4, dest = this.master) {
    const ctx = this.ctx;
    const f = hz(midi);
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(dest);
    let into = out;
    const g = out.gain;
    const stopAt = t + dur + 1.2;
    const osc = (type, mult, level, detune = 0) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mult;
      o.detune.value = detune;
      const og = ctx.createGain();
      og.gain.value = level;
      o.connect(og).connect(into);
      o.start(t);
      o.stop(stopAt);
    };
    if (voice === "pluck" || voice === "bass") {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = voice === "bass" ? 1 : 4;
      lp.frequency.setValueAtTime(voice === "bass" ? 900 : 3600, t);
      lp.frequency.exponentialRampToValueAtTime(voice === "bass" ? 240 : 500, t + 0.35);
      lp.connect(out);
      into = lp;
    }
    if (voice === "keys") {
      osc("triangle", 1, 0.55);
      osc("sine", 1, 0.45);
      osc("sine", 2, 0.12);
      g.setValueAtTime(0.0001, t);
      g.exponentialRampToValueAtTime(vel, t + 0.008);
      g.exponentialRampToValueAtTime(vel * 0.3, t + 0.3);
      g.setTargetAtTime(0.0001, t + Math.max(dur, 0.15), 0.18);
    } else if (voice === "pluck") {
      osc("sawtooth", 1, 0.5);
      osc("sawtooth", 1, 0.3, 7);
      g.setValueAtTime(0.0001, t);
      g.exponentialRampToValueAtTime(vel, t + 0.005);
      g.setTargetAtTime(0.0001, t + 0.02, Math.min(0.35, dur * 0.6 + 0.08));
    } else if (voice === "organ") {
      osc("sine", 1, 0.5);
      osc("sine", 2, 0.25);
      osc("sine", 3, 0.12);
      osc("sine", 4, 0.06);
      g.setValueAtTime(0.0001, t);
      g.linearRampToValueAtTime(vel * 0.8, t + 0.03);
      g.setTargetAtTime(0.0001, t + dur, 0.06);
    } else if (voice === "chip") {
      osc("square", 1, 0.32);
      g.setValueAtTime(vel * 0.7, t);
      g.setTargetAtTime(vel * 0.4, t + 0.04, 0.1);
      g.setTargetAtTime(0.0001, t + dur * 0.9, 0.03);
    } else if (voice === "pad") {
      osc("triangle", 1, 0.5);
      osc("sine", 0.5, 0.25);
      g.setValueAtTime(0.0001, t);
      g.linearRampToValueAtTime(vel, t + 0.06);
      g.setTargetAtTime(vel * 0.6, t + 0.1, 0.4);
      g.setTargetAtTime(0.0001, t + dur, 0.12);
    } else if (voice === "bass") {
      osc("triangle", 1, 0.7);
      osc("sawtooth", 1, 0.25);
      g.setValueAtTime(0.0001, t);
      g.exponentialRampToValueAtTime(vel, t + 0.01);
      g.setTargetAtTime(0.0001, t + Math.min(dur, 0.5), 0.12);
    }
  },

  chord(notes, t, dur, voice, vel, dest) {
    notes.forEach((m, i) => this.note(m, t + i * 0.012, dur, voice, vel, dest));
  },

  kick(t, dest) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.3);
  },

  hiss(t, dest, { hp, level, len }) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + len + 0.02);
  },

  snare(t, dest) {
    this.hiss(t, dest, { hp: 1400, level: 0.32, len: 0.16 });
  },

  hat(t, dest, level = 0.08) {
    this.hiss(t, dest, { hp: 7000, level, len: 0.05 });
  },
};

// Plays one thing at a time: a loop card, the song lab, or a preview.
const player = {
  owner: null,
  spec: null,
  timer: 0,
  nextBar: 0,
  bar: 0,
  waits: [],

  start(spec, owner) {
    this.stop();
    preview.stop();
    band.ensure();
    this.spec = spec;
    this.owner = owner;
    this.bus = band.newBus();
    this.bar = 0;
    this.nextBar = band.ctx.currentTime + 0.08;
    this.tick();
    this.timer = setInterval(() => this.tick(), 40);
    owner.onStart?.();
  },

  tick() {
    const ctx = band.ctx;
    while (this.spec && this.nextBar < ctx.currentTime + 0.3) {
      const beat = 60 / this.spec.bpm();
      const at = this.nextBar;
      const index = this.bar;
      this.spec.scheduleBar(index, at, beat, this.bus);
      const owner = this.owner;
      this.waits.push(setTimeout(() => this.owner === owner && owner.onBar?.(index), Math.max(0, (at - ctx.currentTime) * 1000)));
      if (this.waits.length > 64) this.waits.splice(0, 32);
      this.nextBar += beat * (this.spec.beatsPerBar ?? 4);
      this.bar++;
    }
  },

  stop() {
    clearInterval(this.timer);
    this.waits.forEach(clearTimeout);
    this.waits = [];
    this.timer = 0;
    band.dropBus();
    const owner = this.owner;
    this.owner = null;
    this.spec = null;
    owner?.onStop?.();
  },
};

// ---------- Song previews (30 second clips from the iTunes store) ----------

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9぀-ヿ㐀-鿿]+/g, " ")
    .trim();
const NOT_THE_RECORD = /\b(instrumental|karaoke|remix|cover|live|acoustic|piano|orgel|inst|lullaby|tribute|originally|version pop|salsa)\b/;

const preview = {
  audio: new Audio(),
  button: null,
  cache: new Map(),

  async toggle(song, button) {
    if (this.button === button && !this.audio.paused) return this.stop();
    player.stop();
    this.stop();
    this.button = button;
    this.mark(button, "loading");
    try {
      const hit = await this.find(song);
      if (this.button !== button) return;
      if (!hit) return this.mark(button, "missing");
      this.audio.src = hit.preview;
      await this.audio.play();
      this.mark(button, "playing");
    } catch {
      // The song shop rate-limits now and then. That is worth another tap, unlike a song it does not stock.
      if (this.button === button) this.mark(button, "retry");
    }
  },

  async find(song) {
    if (this.cache.has(song.q)) return this.cache.get(song.q);
    const list = await searchSongs(song.q);
    const titles = [].concat(song.mt).map(norm);
    const artists = [].concat(song.ma).map(norm);
    const ok = list.filter(
      (r) =>
        artists.some((a) => norm(r.artist).includes(a)) &&
        titles.some((t) => norm(r.title).includes(t)) &&
        !NOT_THE_RECORD.test(norm(r.title)),
    );
    const hit = ok.find((r) => titles.includes(norm(r.title))) ?? ok[0] ?? null;
    this.cache.set(song.q, hit);
    return hit;
  },

  mark(button, state) {
    button.dataset.state = state;
    const label = { loading: "…", playing: "■", missing: "✕", retry: "↻" }[state] ?? "▶";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(state === "playing"));
    if (state === "missing") button.title = "No preview on the Singapore store";
    else if (state === "retry") button.title = "The song shop is busy. Tap to try again.";
    else button.removeAttribute("title");
  },

  stop() {
    this.audio.pause();
    if (this.button) this.mark(this.button, this.button.dataset.state === "missing" ? "missing" : "idle");
    this.button = null;
  },
};
preview.audio.addEventListener("ended", () => preview.stop());

// ---------- Section helpers ----------

function section(num, title, ...kids) {
  return h(
    "section",
    { class: "tw-sec", "aria-labelledby": `tw-h-${num}` },
    h("h3", { class: "tw-h", id: `tw-h-${num}` }, h("span", { class: "tw-num", text: num }), title),
    ...kids,
  );
}

function chipGroup(label, options, current, onPick) {
  const group = h("div", { class: "tw-chips", role: "radiogroup", "aria-label": label });
  const render = (value) => {
    for (const b of group.children) b.setAttribute("aria-checked", String(b.dataset.value === value));
  };
  for (const [value, text] of options) {
    group.append(
      h("button", {
        type: "button",
        class: "tw-chip",
        role: "radio",
        "data-value": value,
        "aria-checked": String(value === current),
        text,
        onclick: () => {
          render(value);
          onPick(value);
        },
      }),
    );
  }
  return group;
}

// ---------- 1. What he said ----------

const TIMELINE = [
  {
    when: "6 April 2022",
    where: "London",
    head: "A judge says Shape of You is his own",
    body: "Sami Chokri had claimed the 'Oh I' hook in Shape of You came from his 2015 song Oh Why. Mr Justice Zacaroli disagreed. He called the use of the first four notes of the rising minor pentatonic scale 'short, simple, commonplace and obvious'.",
    src: [["Bird & Bird on the judgment", "https://mediawrites.twobirds.com/post/102j34e/how-does-the-ed-sheeran-case-shape-uk-copyright-law"]],
  },
  {
    when: "6 April 2022",
    where: "Instagram",
    head: "Twelve notes, sixty thousand songs a day",
    body: "In a video after the ruling, Sheeran said there are 'only so many notes and very few chords used in pop music'. His maths: about 60,000 songs released on Spotify every day, 22 million a year, and only 12 notes to go round.",
    src: [
      ["Pollstar", "https://news.pollstar.com/2022/04/06/ed-sheeran-wins-shape-of-you-copyright-case/"],
      ["Music Business Worldwide", "https://www.musicbusinessworldwide.com/ed-sheeran-wins-copyright-lawsuit-in-the-uk/"],
    ],
  },
  {
    when: "April to May 2023",
    where: "New York",
    head: "A guitar on the witness stand",
    body: "The heirs of Ed Townsend, who co-wrote Let's Get It On with Marvin Gaye, said Thinking Out Loud copied it. Sheeran picked up a guitar and played his song for the jury, and told the court that 'most pop songs can fit over most pop songs'. On 4 May 2023 the jury found he had not copied.",
    src: [
      ["AP report", "https://www.shootonline.com/article/ed-sheeran-on-guitar-gets-musical-with-a-new-york-jury/"],
      ["The Fader", "https://thefader.com/2023/04/26/ed-sheeran-takes-stand-in-lets-get-it-on-trial"],
      ["NBC on the verdict", "https://www.nbcboston.com/news/business/money-report/ed-sheeran-didnt-steal-from-marvin-gayes-lets-get-it-on-jury-rules/3037836/"],
    ],
  },
  {
    when: "1 November 2024",
    where: "New York",
    head: "Four chords are not for sale",
    body: "In a separate case brought by Structured Asset Sales, which owns part of Let's Get It On, the US Court of Appeals for the Second Circuit held that the I-iii-IV-V chord progression and its syncopated harmonic rhythm, alone or together, are common building blocks that copyright does not protect.",
    src: [
      ["National Law Review", "https://natlawreview.com/article/lets-not-get-it-battle-greatest-hits"],
      ["Copyright Lately", "https://copyrightlately.com/ed-sheeran-wins-copyright-appeal-5-things-to-know/"],
    ],
  },
  {
    when: "16 June 2025",
    where: "Washington",
    head: "Case closed",
    body: "The US Supreme Court declined to hear the appeal, so the ruling stands.",
    src: [["Digital Music News", "https://www.digitalmusicnews.com/2025/06/16/ed-sheeran-supreme-court-review/"]],
  },
];

function whatHeSaid() {
  return section(
    "1",
    "What he actually argued",
    h("p", { class: "tw-p", text: "Two songs, two countries, four courts. The argument stayed the same: the raw materials of pop are few, so overlaps are normal." }),
    h(
      "ol",
      { class: "tw-timeline" },
      TIMELINE.map((e) =>
        h(
          "li",
          { class: "tw-event" },
          h("p", { class: "tw-when" }, h("span", { text: e.when }), h("span", { class: "tw-place", text: e.where })),
          h("h4", { text: e.head }),
          h("p", { text: e.body }),
          h("p", { class: "tw-src" }, "Source: ", ...e.src.flatMap(([l, u], i) => [i ? ", " : null, link(l, u)])),
        ),
      ),
    ),
  );
}

// ---------- 2. The building blocks ----------

function buildingBlocks() {
  const state = { key: 0, scale: SCALES[0] };
  const strip = h("div", { class: "tw-strip", role: "group", "aria-label": "The twelve notes. Tap one to hear it." });
  const chords = h("div", { class: "tw-chords", role: "group", "aria-label": "Chords built from the scale" });
  const about = h("p", { class: "tw-about" });
  const keys = [];

  for (let i = 0; i < 12; i++) {
    const key = h("button", {
      type: "button",
      class: `tw-key${BLACK.has(i) ? " is-black" : ""}`,
      onclick: () => {
        band.ensure();
        band.note(60 + ((i - state.key + 12) % 12) + state.key, band.ctx.currentTime + 0.01, 0.5, "keys", 0.45);
        flash([i]);
      },
    });
    keys.push(key);
    strip.append(key);
  }

  function flash(pcs) {
    for (const k of keys) k.classList.remove("is-chord");
    pcs.forEach((pc) => keys[pc].classList.add("is-chord"));
    clearTimeout(flash.t);
    flash.t = setTimeout(() => keys.forEach((k) => k.classList.remove("is-chord")), 900);
  }

  function render() {
    const { key, scale } = state;
    const inScale = new Set(scale.steps.map((s) => (s + key) % 12));
    keys.forEach((k, i) => {
      const rel = (i - key + 12) % 12;
      k.classList.toggle("is-lit", inScale.has(i));
      k.replaceChildren(h("span", { class: "tw-key-name", text: NOTE_NAMES[i] }), h("span", { class: "tw-key-deg", text: inScale.has(i) ? DEGREE[rel] : "" }));
      k.setAttribute("aria-label", `${NOTE_NAMES[i]}${inScale.has(i) ? `, degree ${DEGREE[rel]}` : ""}`);
    });
    const parent = scale.parent === "major" ? SCALES[0].steps : SCALES[1].steps;
    const list = diatonicChords(parent);
    chords.replaceChildren(
      ...list.map((c) =>
        h(
          "button",
          {
            type: "button",
            class: `tw-chord tw-chord--${c.q}`,
            "aria-label": `${c.roman} chord, ${NOTE_NAMES[(key + c.root) % 12]} ${c.q === "maj" ? "major" : c.q === "min" ? "minor" : "diminished"}`,
            onclick: () => {
              band.ensure();
              const notes = SHAPES[c.q].map((s) => 60 + key + c.root + s);
              band.chord(notes, band.ctx.currentTime + 0.01, 0.9, "keys", 0.22);
              band.note(48 + ((key + c.root) % 12), band.ctx.currentTime + 0.01, 0.9, "bass", 0.3);
              flash(notes.map((m) => m % 12));
            },
          },
          h("span", { class: "tw-roman", text: c.roman }),
          h("span", { class: "tw-chord-name", text: NOTE_NAMES[(key + c.root) % 12] + (c.q === "min" ? "m" : c.q === "dim" ? "dim" : "") }),
          h("span", { class: "tw-chord-num", text: c.num }),
        ),
      ),
    );
    about.textContent = `${scale.name} on ${NOTE_NAMES[key]}: ${scale.steps.length} of 12 notes. ${scale.about}`;
  }

  function playScale() {
    band.ensure();
    const t0 = band.ctx.currentTime + 0.02;
    const up = [...state.scale.steps, 12];
    const run = [...up, ...up.slice(0, -1).reverse()];
    run.forEach((s, i) => {
      band.note(60 + state.key + s, t0 + i * 0.16, 0.18, "keys", 0.4);
      setTimeout(() => flash([(state.key + s) % 12]), (i * 0.16 + 0.02) * 1000);
    });
  }

  // The building block from the 2022 case: four rising notes of the minor pentatonic.
  function playRising() {
    band.ensure();
    const t0 = band.ctx.currentTime + 0.02;
    [0, 3, 5, 7].forEach((s, i) => {
      band.note(60 + state.key + s, t0 + i * 0.32, 0.3, "pluck", 0.45);
      setTimeout(() => flash([(state.key + s) % 12]), (i * 0.32 + 0.02) * 1000);
    });
  }

  const keySelect = h(
    "select",
    { class: "tw-select", "aria-label": "Home note", onchange: (e) => ((state.key = Number(e.target.value)), render()) },
    NOTE_NAMES.map((n, i) => h("option", { value: i, text: n })),
  );

  render();
  return section(
    "2",
    "Twelve notes, a few scales, seven chords",
    h("p", { class: "tw-p", text: "Western pop splits the octave into twelve notes. A scale keeps five or seven of them. Stack every other note of a seven-note scale and you get its seven chords, numbered 1 to 7 (Roman numerals in English, plain digits in Chinese numbered notation, 简谱). Tap anything to hear it." }),
    h(
      "div",
      { class: "tw-row" },
      h("label", { class: "tw-label" }, "Home note ", keySelect),
      chipGroup("Scale", SCALES.map((s) => [s.id, s.name]), "major", (id) => {
        state.scale = SCALES.find((s) => s.id === id);
        render();
        playScale();
      }),
    ),
    strip,
    about,
    h("p", { class: "tw-mini", text: "Chords from the seven-note scale (pentatonic songs borrow these too)" }),
    chords,
    h(
      "div",
      { class: "tw-row tw-row--tight" },
      h("button", { type: "button", class: "tw-btn", text: "Play the scale", onclick: playScale }),
      h("button", { type: "button", class: "tw-btn tw-btn--ghost", text: "Play four rising minor pentatonic notes", onclick: playRising }),
    ),
    h("p", { class: "tw-fine", text: "Those four rising notes are the building block from the Shape of You case. Any guitarist learns them in week one." }),
  );
}

// ---------- 3. The loops ----------

const LOOPS = [
  {
    id: "axis",
    name: "The four chords",
    chords: ["I", "V", "vi", "IV"],
    aka: "Also called the axis progression.",
    where: "All over Western pop. In 2008 the comedy band The Axis of Awesome sang a medley of hits over it and called it Four Chords.",
    bpm: 96,
    songs: [
      { t: "Forever Young", a: "Alphaville", y: 1984, q: "Forever Young Alphaville", mt: "forever young", ma: "alphaville" },
      { t: "With or Without You", a: "U2", y: 1987, q: "With or Without You U2", mt: "with or without you", ma: "u2" },
      { t: "I'm Yours", a: "Jason Mraz", y: 2008, q: "I'm Yours Jason Mraz", mt: "i m yours", ma: "jason mraz" },
      { t: "Waka Waka (This Time for Africa)", a: "Shakira", y: 2010, q: "Waka Waka Shakira", mt: "waka waka", ma: "shakira" },
      { t: "Someone Like You", a: "Adele", y: 2011, q: "Someone Like You Adele", mt: "someone like you", ma: "adele" },
      { t: "Someone You Loved", a: "Lewis Capaldi", y: 2018, q: "Someone You Loved Lewis Capaldi", mt: "someone you loved", ma: "lewis capaldi" },
    ],
    src: [["Wikipedia: I-V-vi-IV progression", "https://en.wikipedia.org/wiki/I%E2%80%93V%E2%80%93vi%E2%80%93IV_progression"]],
  },
  {
    id: "sad",
    name: "The same four, starting sad",
    chords: ["vi", "IV", "I", "V"],
    aka: "The four chords again, rotated to start on the minor one.",
    where: "Moodier, and Wikipedia lists dozens of hits on it. Yes, Sheeran uses it too.",
    bpm: 100,
    songs: [
      { t: "Zombie", a: "The Cranberries", y: 1994, q: "Zombie Cranberries", mt: "zombie", ma: "cranberries" },
      { t: "Apologize", a: "Timbaland feat. OneRepublic", y: 2007, q: "Apologize Timbaland OneRepublic", mt: "apologize", ma: "timbaland" },
      { t: "Faded", a: "Alan Walker", y: 2015, q: "Faded Alan Walker", mt: "faded", ma: "alan walker" },
      { t: "Despacito", a: "Luis Fonsi feat. Daddy Yankee", y: 2017, q: "Despacito Luis Fonsi Daddy Yankee", mt: "despacito", ma: "luis fonsi" },
      { t: "Shivers", a: "Ed Sheeran", y: 2021, q: "Shivers Ed Sheeran", mt: "shivers", ma: "ed sheeran" },
    ],
    src: [["Wikipedia: I-V-vi-IV progression", "https://en.wikipedia.org/wiki/I%E2%80%93V%E2%80%93vi%E2%80%93IV_progression"]],
  },
  {
    id: "fifties",
    name: "The 50s progression",
    chords: ["I", "vi", "IV", "V"],
    aka: "Also called the doo-wop progression and the Stand by Me changes.",
    where: "Named for 1950s doo-wop, still turning up decades later.",
    bpm: 84,
    songs: [
      { t: "Earth Angel", a: "The Penguins", y: 1954, q: "Earth Angel Penguins", mt: "earth angel", ma: "penguins" },
      { t: "Stand by Me", a: "Ben E. King", y: 1961, q: "Stand by Me Ben E. King", mt: "stand by me", ma: "ben e king" },
      { t: "I Will Always Love You", a: "Dolly Parton", y: 1974, q: "I Will Always Love You Dolly Parton", mt: "i will always love you", ma: "dolly parton" },
      { t: "Every Breath You Take", a: "The Police", y: 1983, q: "Every Breath You Take Police", mt: "every breath you take", ma: "police" },
      { t: "Baby", a: "Justin Bieber", y: 2010, q: "Baby Justin Bieber Ludacris", mt: "baby", ma: "justin bieber" },
    ],
    src: [["Wikipedia: '50s progression", "https://en.wikipedia.org/wiki/%2750s_progression"]],
  },
  {
    id: "court",
    name: "The one that went to court",
    chords: ["I", "iii", "IV", "V"],
    aka: "The progression at the centre of the Thinking Out Loud cases.",
    where: "The plaintiffs pointed to these chords plus a syncopated rhythm. The appeals court found both too common to own.",
    bpm: 80,
    songs: [
      { t: "Let's Get It On", a: "Marvin Gaye", y: 1973, q: "Let's Get It On Marvin Gaye", mt: "let s get it on", ma: "marvin gaye" },
      { t: "Thinking Out Loud", a: "Ed Sheeran", y: 2014, q: "Thinking Out Loud Ed Sheeran", mt: "thinking out loud", ma: "ed sheeran" },
    ],
    src: [["Copyright Lately", "https://copyrightlately.com/ed-sheeran-wins-copyright-appeal-5-things-to-know/"]],
  },
  {
    id: "canon",
    name: "The Canon",
    chords: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
    aka: "From Pachelbel's Canon in D. Chinese guitar books call it 卡农, the Canon, and write it in digits.",
    where: "A Baroque wedding favourite that pop keeps borrowing, from London folk to Indonesian jazz-fusion.",
    bpm: 92,
    beatsPerChord: 2,
    songs: [
      { t: "Streets of London", a: "Ralph McTell", y: 1974, q: "Streets of London Ralph McTell", mt: "streets of london", ma: "ralph mctell" },
      { t: "Gemilang", a: "Krakatau", y: 1986, q: "Gemilang Krakatau", mt: "gemilang", ma: "krakatau" },
      { t: "Go West", a: "Pet Shop Boys", y: 1993, q: "Go West Pet Shop Boys", mt: "go west", ma: "pet shop boys" },
      { t: "Don't Look Back in Anger", a: "Oasis", y: 1996, q: "Don't Look Back in Anger Oasis", mt: "don t look back in anger", ma: "oasis" },
      { t: "Memories", a: "Maroon 5", y: 2019, q: "Memories Maroon 5", mt: "memories", ma: "maroon 5" },
    ],
    src: [["Wikipedia: Pachelbel's Canon", "https://en.wikipedia.org/wiki/Pachelbel%27s_Canon"]],
  },
  {
    id: "blues",
    name: "Twelve-bar blues",
    chords: ["I7", "I7", "I7", "I7", "IV7", "IV7", "I7", "I7", "V7", "IV7", "I7", "I7"],
    aka: "Three chords over twelve bars.",
    where: "The blues, then rock and roll, then everything with a guitar solo.",
    bpm: 124,
    songs: [
      { t: "Hound Dog", a: "Big Mama Thornton", y: 1953, q: "Hound Dog Big Mama Thornton", mt: "hound dog", ma: "big mama thornton" },
      { t: "Johnny B. Goode", a: "Chuck Berry", y: 1958, q: "Johnny B. Goode Chuck Berry", mt: "johnny b goode", ma: "chuck berry" },
      { t: "Red House", a: "The Jimi Hendrix Experience", y: 1967, q: "Red House Jimi Hendrix", mt: "red house", ma: "jimi hendrix" },
      { t: "Ball and Biscuit", a: "The White Stripes", y: 2003, q: "Ball and Biscuit White Stripes", mt: "ball and biscuit", ma: "white stripes" },
    ],
    src: [
      ["Wikipedia: Twelve-bar blues", "https://en.wikipedia.org/wiki/Twelve-bar_blues"],
      ["Wikipedia: Hound Dog", "https://en.wikipedia.org/wiki/Hound_Dog_(song)"],
      ["eMastered", "https://emastered.com/zh/blog/common-chord-progressions"],
    ],
  },
  {
    id: "royal",
    name: "The royal road",
    chords: ["IVmaj7", "V7", "iii7", "vi"],
    aka: "王道進行 (ōdō shinkō) in Japan. In Chinese numbered notation it is 4536.",
    where: "Japan's favourite. As of 2023, 40% of the twenty best-selling singles of all time in Japan contain it. Wikipedia also lists plenty of Cantopop and Indonesian hits.",
    bpm: 88,
    songs: [
      { t: "卒業写真 (Sotsugyō Shashin)", a: "Yumi Arai, now Yumi Matsutoya", y: 1975, q: "卒業写真 荒井由実", mt: ["卒業写真", "sotsugyo shashin"], ma: ["荒井由実", "yumi arai", "松任谷由実", "yumi matsutoya"] },
      { t: "痴心的我", a: "Leslie Cheung 張國榮", y: 1985, q: "痴心的我 張國榮", mt: "痴心的我", ma: ["leslie cheung", "張國榮", "张国荣"] },
      { t: "Never Gonna Give You Up", a: "Rick Astley", y: 1987, q: "Never Gonna Give You Up Rick Astley", mt: "never gonna give you up", ma: "rick astley" },
      { t: "J.A.P. (Jadikan Aku Pacarmu)", a: "Sheila on 7", y: 1999, q: "Jadikan Aku Pacarmu Sheila on 7", mt: "jadikan aku pacarmu", ma: "sheila on 7" },
      { t: "Heavy Rotation", a: "AKB48", y: 2010, q: "ヘビーローテーション AKB48", mt: ["heavy rotation", "ヘビーローテーション"], ma: "akb48" },
      { t: "夜に駆ける (Yoru ni Kakeru)", a: "YOASOBI", y: 2019, q: "夜に駆ける YOASOBI", mt: ["夜に駆ける", "yoru ni kakeru"], ma: "yoasobi" },
    ],
    src: [
      ["Wikipedia: Royal road progression", "https://en.wikipedia.org/wiki/Royal_road_progression"],
      ["Toutiao on 4536", "https://www.toutiao.com/zixun/7547504328240711726/"],
    ],
  },
  {
    id: "wanneng",
    name: "万能和弦, the universal chords",
    chords: ["IV", "V", "iii", "vi", "ii", "V", "I", "I"],
    aka: "4536251, the royal road walked all the way home.",
    where: "Chinese-speaking players write notes as the digits 1 to 7 (numbered notation, 简谱) and name chord loops the same way: 6451, 4536251, the Canon's 15634125. Guitar teachers call the handiest ones 万能和弦, universal chords, because one loop strums along to countless Chinese pop songs.",
    bpm: 90,
    beatsPerChord: 4,
    songs: [],
    noSongs: "We could not find a reliable published list of which Mandopop songs use which loop, so this card has no song list. The other cards are the same loops under English names.",
    src: [
      ["Wikipedia: Numbered musical notation", "https://en.wikipedia.org/wiki/Numbered_musical_notation"],
      ["Toutiao on 4536251 and the Canon", "https://www.toutiao.com/zixun/7547504328240711726/"],
    ],
  },
];

// A light, friendly accompaniment: bass on the beat, the chord as a soft arpeggio.
function loopSpec(loop, key = 0) {
  const per = loop.beatsPerChord ?? 4;
  const chordsPerBar = 4 / per;
  return {
    bpm: () => loop.bpm,
    beatsPerBar: 4,
    scheduleBar(bar, t, beat, dest) {
      for (let c = 0; c < chordsPerBar; c++) {
        const index = (bar * chordsPerBar + c) % loop.chords.length;
        const [semi, q] = ROMAN[loop.chords[index]];
        const start = t + c * per * beat;
        const tones = SHAPES[q].map((s) => 57 + ((key + semi + s - 57 + 120) % 12) + (s >= 12 ? 12 : 0));
        tones.sort((a, b) => a - b);
        band.chord(tones, start, per * beat * 0.95, "pad", 0.09, dest);
        band.note(36 + ((key + semi) % 12) + 12, start, beat * 0.9, "bass", 0.32, dest);
        if (per >= 2) band.note(36 + ((key + semi + 7) % 12) + 12, start + 2 * beat, beat * 0.9, "bass", 0.24, dest);
        for (let i = 0; i < per * 2; i++) band.note(tones[i % tones.length] + 12, start + i * beat * 0.5, beat * 0.45, "keys", 0.12, dest);
      }
    },
  };
}

function loopCard(loop) {
  const chips = loop.chords.map((r) =>
    h("li", { class: "tw-step" }, h("span", { class: "tw-roman", text: PRETTY[r] ?? r }), h("span", { class: "tw-chord-name", text: chordName(0, r) })),
  );
  const nums = loop.chords.map((r) => NUMBER[r]).join(" ");
  const play = h("button", { type: "button", class: "tw-btn tw-play", "aria-pressed": "false" }, h("span", { class: "tw-icon", "aria-hidden": "true" }), "Play the loop");
  const owner = {
    onStart: () => {
      play.classList.add("is-on");
      play.setAttribute("aria-pressed", "true");
      play.lastChild.textContent = "Stop";
    },
    onStop: () => {
      play.classList.remove("is-on");
      play.setAttribute("aria-pressed", "false");
      play.lastChild.textContent = "Play the loop";
      chips.forEach((c) => c.classList.remove("is-now"));
    },
    onBar: (bar) => {
      const perBar = 4 / (loop.beatsPerChord ?? 4);
      chips.forEach((c) => c.classList.remove("is-now"));
      const first = (bar * perBar) % loop.chords.length;
      chips[first]?.classList.add("is-now");
      if (perBar > 1) {
        const next = (first + 1) % loop.chords.length;
        const beat = 60 / loop.bpm;
        setTimeout(() => {
          if (player.owner !== owner) return;
          chips.forEach((c) => c.classList.remove("is-now"));
          chips[next]?.classList.add("is-now");
        }, (loop.beatsPerChord ?? 4) * beat * 1000);
      }
    },
  };
  play.addEventListener("click", () => (player.owner === owner ? player.stop() : player.start(loopSpec(loop), owner)));

  const songs = loop.songs.length
    ? h(
        "ol",
        { class: "tw-songs" },
        loop.songs.map((s) => {
          const btn = h("button", {
            type: "button",
            class: "tw-prev",
            "aria-label": `Play 30 seconds of ${s.t} by ${s.a}`,
            "aria-pressed": "false",
            text: "▶",
          });
          btn.addEventListener("click", () => preview.toggle(s, btn));
          return h(
            "li",
            {},
            btn,
            h("span", { class: "tw-song" }, h("strong", { text: s.t }), h("span", { text: `${s.a}, ${s.y}` })),
          );
        }),
      )
    : h("p", { class: "tw-nosongs", text: loop.noSongs });

  return h(
    "article",
    { class: `tw-card tw-card--${loop.id}` },
    h("h4", { text: loop.name }),
    h("p", { class: "tw-numerals" }, h("span", { text: loop.chords.map((r) => PRETTY[r] ?? r).join(" - ") }), h("span", { class: "tw-digits", text: nums })),
    h("ol", { class: "tw-steps", "aria-label": "Chords in C" }, chips),
    h("p", { class: "tw-aka", text: loop.aka }),
    h("p", { class: "tw-where", text: loop.where }),
    play,
    songs,
    h("p", { class: "tw-src" }, "Source: ", ...loop.src.flatMap(([l, u], i) => [i ? ", " : null, link(l, u)])),
  );
}

function loops() {
  return section(
    "3",
    "Four chords, many hits",
    h("p", { class: "tw-p", text: "Pop leans on a handful of chord loops. Here are the famous ones, played in C, with songs that use them. Tap ▶ for a 30 second preview. Chinese-style digits sit next to the Roman numerals." }),
    h("div", { class: "tw-cards" }, LOOPS.map(loopCard)),
    h("p", { class: "tw-fine", text: "Songs often use a loop for one section only, or in another key. We only list songs our sources name for each loop. Previews come from the iTunes store and some are missing in Singapore." }),
  );
}

// ---------- 4. The song birthday paradox ----------

function paradox() {
  const fmt = new Intl.NumberFormat("en-SG");
  const big = (n) => (n >= 1e12 ? `${(n / 1e12).toFixed(1)} trillion` : n >= 1e9 ? `${(n / 1e9).toFixed(1)} billion` : fmt.format(Math.round(n)));
  const state = { notes: 5, length: 4, rhythms: 4, n: 60000 };
  const LOG_MIN = Math.log10(2);
  const LOG_MAX = Math.log10(22e6);
  const toSlider = (n) => Math.round(((Math.log10(n) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 1000);
  const fromSlider = (v) => Math.max(2, Math.round(10 ** (LOG_MIN + (v / 1000) * (LOG_MAX - LOG_MIN))));

  const out = {
    k: h("strong", { class: "tw-big" }),
    n: h("strong", { class: "tw-big" }),
    p: h("strong", { class: "tw-huge" }),
    pairs: h("span"),
    take: h("p", { class: "tw-take" }),
  };
  const nSlider = h("input", { type: "range", min: 0, max: 1000, value: toSlider(state.n), class: "tw-range", "aria-label": "How many songs" });

  function update() {
    const k = (state.notes * state.rhythms) ** state.length;
    const x = (state.n * (state.n - 1)) / (2 * k);
    const p = -Math.expm1(-x);
    out.k.textContent = big(k);
    out.n.textContent = fmt.format(state.n);
    out.p.textContent = p < 0.001 ? "under 0.1%" : p > 0.999 ? "over 99.9%" : `${(p * 100).toFixed(1)}%`;
    out.pairs.textContent = x < 0.01 ? "Almost no pairs of songs share a hook." : `On average about ${big(x)} pair${x >= 1.5 ? "s" : ""} of songs share one.`;
    out.take.textContent =
      p > 0.5
        ? "At this scale clashes are expected. Nobody needs to copy anybody for two songs to share a hook."
        : "Small worlds stay tidy. Turn up the songs and watch the odds climb.";
    nSlider.value = toSlider(state.n);
  }

  const slider = (label, min, max, key, suffix) => {
    const value = h("output", { text: String(state[key]) });
    const input = h("input", {
      type: "range",
      min,
      max,
      value: state[key],
      class: "tw-range",
      "aria-label": label,
      oninput: (e) => {
        state[key] = Number(e.target.value);
        value.textContent = String(state[key]);
        update();
      },
    });
    return h("label", { class: "tw-field" }, h("span", { class: "tw-field-label" }, label, " ", value, suffix ? ` ${suffix}` : ""), input);
  };

  nSlider.addEventListener("input", (e) => {
    state.n = fromSlider(Number(e.target.value));
    update();
  });

  const preset = (text, n) => h("button", { type: "button", class: "tw-chip", text, onclick: () => ((state.n = n), update()) });

  update();
  return section(
    "4",
    "The song birthday paradox",
    h("p", { class: "tw-p", text: "Put 23 people in a room and the odds that two share a birthday are just over 50%. Songs work the same way. Build a hook, pick how many songs exist, and see how likely it is that two land on the same one." }),
    h(
      "div",
      { class: "tw-calc" },
      h(
        "div",
        { class: "tw-calc-in" },
        h(
          "div",
          { class: "tw-field" },
          h("span", { class: "tw-field-label", text: "Notes to pick from" }),
          chipGroup("Notes to pick from", [["5", "5, pentatonic"], ["7", "7, major scale"], ["12", "all 12"]], "5", (v) => {
            state.notes = Number(v);
            update();
          }),
        ),
        slider("Hook length", 3, 8, "length", "notes"),
        slider("Rhythm choices per note", 1, 4, "rhythms"),
        h("p", { class: "tw-calc-line" }, "That makes ", out.k, " possible hooks."),
        h("label", { class: "tw-field" }, h("span", { class: "tw-field-label" }, "Songs in the world: ", out.n), nSlider),
        h("div", { class: "tw-chips" }, preset("A playlist (100)", 100), preset("A day on Spotify (60,000)", 60000), preset("A year on Spotify (22 million)", 22e6)),
      ),
      h(
        "div",
        { class: "tw-calc-out", "aria-live": "polite" },
        h("p", { class: "tw-mini", text: "Chance that at least two songs share a hook" }),
        out.p,
        h("p", {}, out.pairs),
        out.take,
      ),
    ),
    h("p", { class: "tw-fine", text: "A toy model. Real hooks are not equally likely: writers reach for the comfy notes more often, which makes clashes even more likely. The 60,000 a day and 22 million a year are Sheeran's own figures." }),
  );
}

// ---------- 5. So what makes songs different? ----------

const LAB_CHORDS = ["I", "V", "vi", "IV"];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const FEELS = {
  straight: { name: "Straight", notes: [[0, 2], [2, 2], [4, 2], [6, 2]], kick: [0, 4], snare: [2, 6], hats: [0, 1, 2, 3, 4, 5, 6, 7], swing: 0 },
  swing: { name: "Swing", notes: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 2], [6, 1], [7, 1]], kick: [0, 4], snare: [2, 6], hats: [0, 1, 2, 3, 4, 5, 6, 7], swing: 0.33 },
  synco: { name: "Syncopated", notes: [[0, 1.5], [1.5, 1.5], [3, 1], [4.5, 1.5], [6, 2]], kick: [0, 3, 5], snare: [2, 6], hats: [0, 1, 2, 3, 4, 5, 6, 7], swing: 0 },
  half: { name: "Half-time", notes: [[0, 3], [3, 1], [4, 4]], kick: [0], snare: [4], hats: [0, 2, 4, 6], swing: 0 },
};
const SHAPES_OF_TUNE = {
  climb: { name: "Climb", at: (i, n, b) => 0.15 + (i / Math.max(1, n - 1)) * 0.6 + b * 0.05 },
  fall: { name: "Fall", at: (i, n, b) => 0.85 - (i / Math.max(1, n - 1)) * 0.6 - b * 0.04 },
  arch: { name: "Arch", at: (i, n) => 0.15 + Math.sin((Math.PI * i) / Math.max(1, n - 1)) * 0.7 },
  zigzag: { name: "Zigzag", at: (i, n, b) => (i % 2 ? 0.72 : 0.32) + (b % 2) * 0.08 },
  chant: { name: "Chant", at: (i, n) => (i === n - 1 ? 0.55 : 0.45) },
};
const VOICES = { keys: "Piano-ish", pluck: "Pluck", organ: "Organ", chip: "Chiptune" };

function songLab() {
  const state = { shape: "arch", feel: "straight", voice: "keys", bpm: 104, seed: 1 };
  let melody = [];

  const rnd = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  // Write a melody over the four chords from the chosen shape and feel.
  function compose() {
    const r = rnd(state.seed * 7919 + 13);
    const pool = [];
    for (let m = 62; m <= 86; m++) if (MAJOR.includes(m % 12)) pool.push(m);
    melody = LAB_CHORDS.map((roman, b) => {
      const [semi, q] = ROMAN[roman];
      const tones = new Set(SHAPES[q].map((s) => (semi + s) % 12));
      const pattern = FEELS[state.feel].notes;
      let last = null;
      return pattern.map(([start, len], i) => {
        const height = Math.min(1, Math.max(0, SHAPES_OF_TUNE[state.shape].at(i, pattern.length, b) + (r() - 0.5) * 0.12));
        const target = 64 + height * 18;
        const strong = start === 0 || start === 4;
        const options = pool.filter((m) => !strong || tones.has(m % 12));
        let best = options[0];
        for (const m of options) if (Math.abs(m - target) < Math.abs(best - target)) best = m;
        if (state.shape !== "chant" && best === last && options.length > 1) {
          const alt = options.filter((m) => m !== last).sort((a, b2) => Math.abs(a - target) - Math.abs(b2 - target));
          best = alt[0];
        }
        last = best;
        return { start, len, midi: best };
      });
    });
    drawRoll();
  }

  const svgNS = "http://www.w3.org/2000/svg";
  const roll = document.createElementNS(svgNS, "svg");
  roll.setAttribute("viewBox", "0 0 320 120");
  roll.setAttribute("class", "tw-roll");
  roll.setAttribute("role", "img");
  roll.setAttribute("aria-label", "The melody over four bars");

  function drawRoll() {
    roll.replaceChildren();
    const y = (m) => 112 - ((m - 60) / 28) * 100;
    LAB_CHORDS.forEach((roman, b) => {
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "tw-roll-bar");
      g.dataset.bar = String(b);
      const bg = document.createElementNS(svgNS, "rect");
      Object.entries({ x: b * 80 + 1, y: 1, width: 78, height: 118, rx: 6 }).forEach(([k, v]) => bg.setAttribute(k, v));
      bg.setAttribute("class", "tw-roll-bg");
      const label = document.createElementNS(svgNS, "text");
      Object.entries({ x: b * 80 + 7, y: 14 }).forEach(([k, v]) => label.setAttribute(k, v));
      label.textContent = `${roman} ${chordName(0, roman)}`;
      g.append(bg, label);
      for (const n of melody[b]) {
        const rect = document.createElementNS(svgNS, "rect");
        Object.entries({ x: b * 80 + 4 + n.start * 9, y: y(n.midi) - 3, width: Math.max(4, n.len * 9 - 2), height: 6, rx: 3 }).forEach(([k, v]) => rect.setAttribute(k, v));
        rect.setAttribute("class", "tw-roll-note");
        g.append(rect);
      }
      roll.append(g);
    });
  }

  const spec = {
    bpm: () => state.bpm,
    beatsPerBar: 4,
    scheduleBar(bar, t, beat, dest) {
      const b = bar % 4;
      const feel = FEELS[state.feel];
      const eighth = beat / 2;
      const when = (slot) => t + slot * eighth + (Math.floor(slot) % 2 === 1 && slot % 1 === 0 ? feel.swing * eighth : 0);
      const [semi, q] = ROMAN[LAB_CHORDS[b]];
      const tones = SHAPES[q].map((s) => 55 + ((semi + s + 5) % 12));
      band.chord(tones, t, beat * 4 * 0.95, "pad", 0.07, dest);
      band.note(36 + semi + 12 * (semi < 5 ? 1 : 0), t, beat * 1.8, "bass", 0.32, dest);
      if (state.feel !== "half") band.note(36 + semi + 12 * (semi < 5 ? 1 : 0), when(4), beat * 1.8, "bass", 0.26, dest);
      feel.kick.forEach((s) => band.kick(when(s), dest));
      feel.snare.forEach((s) => band.snare(when(s), dest));
      feel.hats.forEach((s) => band.hat(when(s), dest, s % 2 ? 0.05 : 0.08));
      for (const n of melody[b]) band.note(n.midi, when(n.start), n.len * eighth * 0.92, state.voice, state.voice === "chip" ? 0.22 : 0.32, dest);
    },
  };

  const play = h("button", { type: "button", class: "tw-btn tw-play", "aria-pressed": "false" }, h("span", { class: "tw-icon", "aria-hidden": "true" }), "Play");
  const owner = {
    onStart: () => {
      play.classList.add("is-on");
      play.setAttribute("aria-pressed", "true");
      play.lastChild.textContent = "Stop";
    },
    onStop: () => {
      play.classList.remove("is-on");
      play.setAttribute("aria-pressed", "false");
      play.lastChild.textContent = "Play";
      roll.querySelectorAll(".tw-roll-bar").forEach((g) => g.classList.remove("is-now"));
    },
    onBar: (bar) => roll.querySelectorAll(".tw-roll-bar").forEach((g) => g.classList.toggle("is-now", Number(g.dataset.bar) === bar % 4)),
  };
  play.addEventListener("click", () => (player.owner === owner ? player.stop() : player.start(spec, owner)));

  const bpmOut = h("output", { text: String(state.bpm) });
  const groups = {};
  const pick = (key) => (value) => {
    state[key] = value;
    compose();
  };
  groups.shape = chipGroup("Melody shape", Object.entries(SHAPES_OF_TUNE).map(([k, v]) => [k, v.name]), state.shape, pick("shape"));
  groups.feel = chipGroup("Rhythm feel", Object.entries(FEELS).map(([k, v]) => [k, v.name]), state.feel, pick("feel"));
  groups.voice = chipGroup("Instrument", Object.entries(VOICES), state.voice, (v) => (state.voice = v));
  const tempo = h("input", {
    type: "range",
    min: 60,
    max: 160,
    value: state.bpm,
    class: "tw-range",
    "aria-label": "Tempo",
    oninput: (e) => {
      state.bpm = Number(e.target.value);
      bpmOut.textContent = String(state.bpm);
    },
  });

  // A whole new song: same four chords, everything else rolled again.
  function shuffle() {
    const pickOne = (obj) => {
      const keys = Object.keys(obj);
      return keys[Math.floor(Math.random() * keys.length)];
    };
    state.shape = pickOne(SHAPES_OF_TUNE);
    state.feel = pickOne(FEELS);
    state.voice = pickOne(VOICES);
    state.bpm = 70 + Math.floor(Math.random() * 80);
    state.seed = 1 + Math.floor(Math.random() * 10000);
    for (const [key, group] of Object.entries(groups)) {
      for (const b of group.children) b.setAttribute("aria-checked", String(b.dataset.value === state[key]));
    }
    tempo.value = state.bpm;
    bpmOut.textContent = String(state.bpm);
    compose();
  }

  compose();
  return section(
    "5",
    "So what makes songs different?",
    h("p", { class: "tw-p", text: "Keep the four chords. Change the tune's shape, the rhythm, the speed and the sound. Every combination below is a different song over the same loop. None of these melodies is copied from anything; they are generated on the spot." }),
    h(
      "div",
      { class: "tw-lab" },
      h(
        "div",
        { class: "tw-lab-controls" },
        h("div", { class: "tw-field" }, h("span", { class: "tw-field-label", text: "Melody shape" }), groups.shape),
        h("div", { class: "tw-field" }, h("span", { class: "tw-field-label", text: "Rhythm feel" }), groups.feel),
        h("div", { class: "tw-field" }, h("span", { class: "tw-field-label", text: "Instrument" }), groups.voice),
        h("label", { class: "tw-field" }, h("span", { class: "tw-field-label" }, "Tempo ", bpmOut, " bpm"), tempo),
      ),
      h(
        "div",
        { class: "tw-lab-stage" },
        roll,
        h("div", { class: "tw-row tw-row--tight" }, play, h("button", { type: "button", class: "tw-btn tw-btn--ghost", text: "Roll a new song", onclick: shuffle })),
      ),
    ),
  );
}

// ---------- 6. The upshot ----------

function upshot() {
  return section(
    "6",
    "The upshot",
    h(
      "div",
      { class: "tw-upshot" },
      h("p", { text: "Common building blocks are free for everyone: the twelve notes, the scales, the famous four-chord loops, the minor pentatonic scale. What copyright can protect is the specific expression: a particular melody, lyric and arrangement put together in a particular way." }),
      h("p", { text: "The courts asked whether one songwriter took something that was actually the other's to own. In the three cases above, the answer was no." }),
      h("p", { class: "tw-fine", text: "A field guide, not legal advice." }),
    ),
  );
}

// ---------- Mount ----------

if (root) {
  root.classList.add("tw");
  root.append(whatHeSaid(), buildingBlocks(), loops(), paradox(), songLab(), upshot());
}
