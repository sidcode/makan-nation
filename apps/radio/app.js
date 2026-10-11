import { RadioSound } from "./audio.js";
import { initSealer } from "./seal.js";
import { loadCapsules } from "./capsules.js";
import { paintTerrazzo } from "./terrazzo.js";

const $ = (sel) => document.querySelector(sel);

// Tiny element helper. Text always goes in through textContent.
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kids.filter((k) => k != null && k !== false));
  return el;
}

const THIS_YEAR = new Date().getFullYear();
const SLOT = 150; // dial pixels between stations
const LEAD = 120; // space before the first and after the last station in a band
const GAP = 320; // empty dial between bands
const LOCK = 70; // how far either side of a station you can still hear it
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const BANDS = [
  { key: "past", name: "Shellac 78s", key_label: "78", blurb: "Records from 1905 to the 1950s, via the Internet Archive." },
  { key: "rediffusion", name: "Rediffusion", key_label: "RDF", blurb: "Dialect dramas from Singapore's cable radio, which ran from 1949 to 2012." },
  { key: "now", name: "On air", key_label: "FM", blurb: "Singapore radio, live right now." },
  { key: "sealed", name: "Sealed", key_label: "2065", blurb: "Songs people have sealed for the future. They stay muffled until they open." },
];

const sound = new RadioSound();
// Whether to play the hiss, crackle and whistle. Remembered per browser, nothing breaks without it.
function loadStaticPref() {
  try {
    return localStorage.getItem("tcr-static") !== "off";
  } catch {
    return true;
  }
}

const state = {
  static: loadStaticPref(),
  stations: [],
  bands: [],
  width: 0,
  pos: 0,
  on: false,
  travel: false,
  tuned: null,
  active: null,
  buffering: false,
};

const dial = $("#dial");
const scale = $("#scale");
const knob = $("#knob");
const card = $("#card");
const ticket = $("#ticket");

// ---------- Layout: every station gets a spot on one long strip ----------

function stationKey(s) {
  return s.kind === "sealed" ? s.id : s.cache ?? s.url;
}

function layout(data, capsules) {
  const groups = {
    past: [...data.past].sort((a, b) => a.year - b.year),
    rediffusion: data.rediffusion,
    now: data.now,
    sealed: capsules
      .map((c) => ({ kind: "sealed", ...c }))
      .sort((a, b) => a.openYear - b.openYear || a.sealedAt.localeCompare(b.sealedAt)),
  };
  const stations = [];
  const bands = [];
  let x = GAP / 2;
  for (const band of BANDS) {
    const list = groups[band.key];
    const start = x;
    x += LEAD;
    for (const s of list) {
      s.x = x;
      s.band = band.key;
      s.key = stationKey(s);
      stations.push(s);
      x += SLOT;
    }
    if (!list.length) x += SLOT;
    const end = x - SLOT + LEAD;
    bands.push({ ...band, start, end, stations: list });
    x = end + GAP;
  }
  state.stations = stations;
  state.bands = bands;
  state.width = x - GAP / 2;
}

function bandAt(x) {
  let best = state.bands[0];
  for (const b of state.bands) if (x >= b.start - GAP / 2) best = b;
  return best;
}

function lerpYear(anchors, x) {
  if (x <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i];
    const [x0, y0] = anchors[i - 1];
    if (x <= x1) return Math.round(y0 + ((y1 - y0) * (x - x0)) / Math.max(1, x1 - x0));
  }
  return anchors.at(-1)[1];
}

function yearLabel(x) {
  const b = bandAt(x);
  if (b.key === "past") {
    const anchors = [[b.start, 1900], ...b.stations.map((s) => [s.x, s.year]), [b.end, 1960]];
    return String(lerpYear(anchors, x));
  }
  if (b.key === "rediffusion") return "1949-2012";
  if (b.key === "now") return String(THIS_YEAR);
  const anchors = [[b.start, THIS_YEAR + 1], ...b.stations.map((s) => [s.x, s.openYear]), [b.end, 2065]];
  return String(lerpYear(anchors, x));
}

function nearest(x) {
  let best = null;
  let d = Infinity;
  for (const s of state.stations) {
    const dd = Math.abs(s.x - x);
    if (dd < d) [best, d] = [s, dd];
  }
  return { station: best, d };
}

function pipLabel(s) {
  if (s.kind === "past") return s.circa ? `c.${s.year}` : String(s.year);
  if (s.kind === "rediffusion") return s.dialect;
  if (s.kind === "now") return s.freq;
  return String(s.openYear);
}

function renderScale() {
  scale.replaceChildren();
  scale.style.width = `${state.width}px`;
  for (const b of state.bands) {
    scale.append(
      h("div", { class: `band band--${b.key}`, style: `left:${b.start}px;width:${b.end - b.start}px` }, h("span", { text: b.name })),
    );
    if (!b.stations.length && b.key === "sealed") {
      scale.append(h("div", { class: "pip pip--empty", style: `left:${b.start + LEAD}px` }, h("span", { text: "empty" })));
    }
  }
  for (const s of state.stations) {
    scale.append(
      h("div", { class: `pip pip--${s.band}${s.broken ? " pip--broken" : ""}`, style: `left:${s.x}px` }, h("span", { text: pipLabel(s) })),
    );
  }
}

// ---------- Playback ----------

const players = new Map();

function playerFor(s) {
  let el = players.get(s.key);
  if (el) {
    clearTimeout(el._drop);
    if (!el.getAttribute("src")) el.src = el._src;
    return el;
  }
  el = new Audio();
  el.preload = "auto";
  if (s.kind === "sealed") {
    el.crossOrigin = "anonymous";
    el._src = s.song.preview;
    sound.throughWall(el);
  } else {
    el._src = s.kind === "now" ? s.url : s.audio;
  }
  el.loop = s.kind !== "now";
  el.src = el._src;
  el.addEventListener("waiting", () => s === state.active && setBuffering(true));
  el.addEventListener("playing", () => s === state.active && setBuffering(false));
  el.addEventListener("error", () => {
    if (!el.getAttribute("src")) return;
    s.broken = true;
    renderScale();
    if (s === state.tuned) renderStation();
  });
  players.set(s.key, el);
  // Keep a handful of players warm and let the rest go.
  if (players.size > 6) {
    for (const [k, p] of players) {
      if (p !== el && p.paused && players.size > 6) {
        p.removeAttribute("src");
        p.load();
        players.delete(k);
      }
    }
  }
  return el;
}

function startPlayer(s, el) {
  // The 78s act like stations that never stopped broadcasting: you join wherever the record has got to.
  // Only for local copies though. Jumping ahead in a slow archive stream means waiting even longer.
  const join = () => {
    // Clips report the full record's length, so they always start from the top.
    const local = el._src.startsWith("/") && !s.clip;
    if (s.kind === "past" && local && Number.isFinite(el.duration)) el.currentTime = (Date.now() / 1000) % el.duration;
  };
  if (el.readyState >= 1) join();
  else el.addEventListener("loadedmetadata", join, { once: true });
  setBuffering(el.readyState < 3);
  el.play().catch(() => {});
  watchdog(s, el);
}

// Stream servers sometimes hand out a connection that never sends a byte. If nothing has arrived
// after a few seconds, hang up and dial again. The archive is just slow, so it gets longer.
function watchdog(s, el, tries = 0) {
  clearTimeout(el._watch);
  el._watch = setTimeout(() => {
    if (state.active !== s || el.readyState > 0 || tries >= 3) return;
    el.load();
    el.play().catch(() => {});
    watchdog(s, el, tries + 1);
  }, s.kind === "now" ? 5000 : 20000);
}

function stopPlayer(s) {
  const el = players.get(s.key);
  if (!el) return;
  el.pause();
  // Live streams keep downloading while paused, so hang up after a while.
  if (s.kind === "now") {
    el._drop = setTimeout(() => {
      el.removeAttribute("src");
      el.load();
    }, 12000);
  }
}

function setBuffering(on) {
  state.buffering = on;
  $("#readoutBand").classList.toggle("is-blinking", on);
  renderReadout();
}

// ---------- The loop that turns dial position into sound and words ----------

let lastPos = 0;

function update() {
  const { station, d } = nearest(state.pos);
  // A fast sweep should sound like a sweep, without dialling up every station it passes.
  const sweeping = Math.abs(state.pos - lastPos) > 24;
  lastPos = state.pos;
  const signal = station && !station.broken ? Math.max(0, 1 - d / LOCK) : 0;
  const vol = signal ** 1.4;

  scale.style.transform = `translateX(${dial.clientWidth / 2 - state.pos}px)`;
  knob.style.transform = `rotate(${state.pos * 0.6}deg)`;
  dial.setAttribute("aria-valuenow", String(Math.round((state.pos / state.width) * 100)));

  if (state.on) {
    const band = bandAt(state.pos).key;
    const sealed = station?.kind === "sealed";
    const noise = state.static ? 1 : 0;
    sound.mix({
      hiss: noise * (0.025 + (1 - signal) * 0.3 + (state.buffering ? 0.08 : 0)),
      crackle: noise * (band === "past" ? 0.06 + 0.22 * signal : band === "rediffusion" ? 0.05 : 0.01),
      whistle: noise * (d > 10 && d < LOCK ? 0.018 * Math.sin((Math.PI * (d - 10)) / (LOCK - 10)) : 0),
      whistleHz: 280 + d * 22,
      future: sealed ? vol : 0,
    });

    const next = signal > 0 && !sweeping ? station : null;
    if (next !== state.active) {
      if (state.active) stopPlayer(state.active);
      state.active = next;
      if (next) startPlayer(next, playerFor(next));
      else setBuffering(false);
    }
    if (next && !sealed) playerFor(next).volume = vol;

    // Warm up the station you are heading towards.
    if (station && !sweeping && !players.has(station.key) && d < LOCK * 3) playerFor(station);
  }

  const tuned = station && d < LOCK * 0.55 ? station : null;
  if (tuned !== state.tuned) {
    state.tuned = tuned;
    renderStation();
  }
  renderReadout();
  renderKeys();
}

let raf = 0;
let settle = 0;
function setPos(x) {
  state.pos = Math.max(0, Math.min(state.width, x));
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(update);
  // Once the dial stops moving, run once more so a big jump still tunes in.
  clearTimeout(settle);
  settle = setTimeout(update, 150);
}

let anim = 0;
function glideTo(x, ms) {
  cancelAnimationFrame(anim);
  const from = state.pos;
  const to = Math.max(0, Math.min(state.width, x));
  if (reduceMotion || !ms) return setPos(to);
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - (1 - k) ** 3;
    state.pos = from + (to - from) * e;
    update();
    if (k < 1) anim = requestAnimationFrame(step);
  };
  anim = requestAnimationFrame(step);
}

function tuneTo(s) {
  if (!s) return;
  glideTo(s.x, Math.min(1100, 260 + Math.abs(s.x - state.pos) * 0.12));
}

function snap() {
  const { station, d } = nearest(state.pos);
  if (station && d < LOCK) glideTo(station.x, 220);
}

function seek(dir) {
  const list = state.stations;
  const s =
    dir > 0
      ? list.find((s) => s.x > state.pos + 5) ?? list[0]
      : [...list].reverse().find((s) => s.x < state.pos - 5) ?? list.at(-1);
  tuneTo(s);
}

// ---------- Rendering words and pictures ----------

function renderReadout() {
  const year = $("#readoutYear");
  const band = $("#readoutBand");
  if (!state.on) {
    year.textContent = "----";
    band.textContent = "OFF";
    return;
  }
  const b = bandAt(state.pos);
  const s = state.tuned;
  year.textContent = s?.kind === "now" ? `${s.freq} FM` : yearLabel(state.pos);
  if (state.buffering && state.active) band.textContent = "WARMING UP";
  else if (s?.broken) band.textContent = "OFF AIR";
  else if (!s) band.textContent = "STATIC";
  else if (b.key === "sealed") band.textContent = state.travel ? "UNSEALED" : `SEALED TIL ${s.openYear}`;
  else band.textContent = { past: "SHELLAC 78", rediffusion: "REDIFFUSION", now: "LIVE" }[b.key];
}

function renderKeys() {
  const current = bandAt(state.pos).key;
  for (const btn of document.querySelectorAll(".key")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.band === current));
  }
}

function isOpen(s) {
  return state.travel || s.openYear <= THIS_YEAR;
}

function cardFor(s) {
  if (!state.on) {
    return h("div", { class: "card__off" }, h("p", { text: "Press the red button." }), h("p", { class: "small", text: "Sound on, please." }));
  }
  if (!s) {
    return h(
      "div",
      { class: "card__static" },
      h("div", { class: "squiggle", "aria-hidden": "true" }),
      h("p", { text: "Between stations." }),
      h("p", { class: "small", text: "Keep turning." }),
    );
  }
  if (s.kind === "past") {
    return h(
      "div",
      { class: "card__disc" },
      h("div", { class: `disc${state.active === s ? " is-spinning" : ""}` }, h("img", { src: s.label, alt: "", loading: "lazy" })),
      h("p", { class: "small", text: "78 rpm, spinning at the real speed" }),
    );
  }
  if (s.kind === "rediffusion") {
    return h(
      "div",
      { class: "card__box" },
      h("div", { class: "rbox", "aria-hidden": "true" }, h("div", { class: "rbox__grille" }), h("div", { class: "rbox__knob" })),
      h("p", { class: "chip", text: s.dialect }),
    );
  }
  if (s.kind === "now") {
    return h(
      "div",
      { class: "card__live" },
      h("p", { class: "onair" }, h("span", { class: "onair__dot", "aria-hidden": "true" }), "ON AIR"),
      h("p", { class: "freq", text: s.freq }),
      h("p", { class: "chip", text: s.lang }),
    );
  }
  const open = isOpen(s);
  return h(
    "div",
    { class: `card__tin${open ? " is-open" : ""}` },
    h(
      "div",
      { class: "tin", "aria-hidden": "true" },
      h("div", { class: "tin__lid" }, h("span", { text: open ? "" : `OPEN IN ${s.openYear}` })),
      h("div", { class: "tin__body" }, open ? h("img", { src: s.song.artwork, alt: "" }) : null),
    ),
  );
}

function ticketFor(s) {
  if (!state.on) {
    return [
      h("p", { class: "ticket__kicker", text: "How it works" }),
      h("h2", { class: "ticket__title", text: "One dial, 160 years." }),
      h("p", { class: "ticket__note", text: "Drag the dial, spin the knob or use the arrow keys. Old records sit on the left, live radio in the middle, and songs sealed for the future on the right." }),
    ];
  }
  if (!s) {
    const b = bandAt(state.pos);
    const extra = b.key === "sealed" ? ` ${b.stations.length} songs sealed so far.` : "";
    return [
      h("p", { class: "ticket__kicker", text: b.name }),
      h("h2", { class: "ticket__title ticket__title--quiet", text: "Static." }),
      h("p", { class: "ticket__note", text: b.blurb + extra }),
    ];
  }
  const source = (href, text = "Hear it at the source") =>
    h("a", { class: "ticket__link", href, target: "_blank", rel: "noopener" }, text);
  if (s.broken) {
    return [
      h("p", { class: "ticket__kicker", text: "Off air" }),
      h("h2", { class: "ticket__title", text: s.title ?? s.name ?? "This one" }),
      h("p", { class: "ticket__note", text: "This station is not answering right now. Try the next one." }),
    ];
  }
  if (s.kind === "past") {
    return [
      h("p", { class: "ticket__kicker", text: `${s.circa ? "Around " : ""}${s.year} · ${s.place}` }),
      h("h2", { class: "ticket__title", text: s.title }),
      h("p", { class: "ticket__who", text: s.artist }),
      h("p", { class: "ticket__note", text: s.note }),
      s.clip ? h("p", { class: "ticket__hint", text: "Playing the first half minute on a loop while the full record downloads." }) : null,
      source(s.source),
    ];
  }
  if (s.kind === "rediffusion") {
    return [
      h("p", { class: "ticket__kicker", text: `Rediffusion Singapore · ${s.dialect}` }),
      h("h2", { class: "ticket__title", text: s.title }),
      h("p", { class: "ticket__note", text: `Episode 1 of a ${s.dialect} radio drama. Rediffusion boxes hung in coffee shops and homes for decades, and dialect storytellers were household names.` }),
      s.clip ? h("p", { class: "ticket__hint", text: "Playing the opening on a loop. The full episode lives at the archive." }) : null,
      source(s.source),
    ];
  }
  if (s.kind === "now") {
    return [
      h("p", { class: "ticket__kicker", text: `Live · ${s.freq} FM · ${s.lang}` }),
      h("h2", { class: "ticket__title", text: s.name }),
      h("p", { class: "ticket__note", text: s.note }),
    ];
  }
  const when = new Date(s.sealedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
  const by = `${s.name}, ${when}`;
  if (!isOpen(s)) {
    return [
      h("p", { class: "ticket__kicker", text: `Sealed until ${s.openYear}` }),
      h("h2", { class: "ticket__title", text: "A song in a tin." }),
      h("blockquote", { class: "ticket__quote", text: s.note }),
      h("p", { class: "ticket__who", text: by }),
      h("p", { class: "ticket__hint", text: "You can only hear it through the lid. Flip “Pretend it's 2065” to peek." }),
    ];
  }
  return [
    h("p", { class: "ticket__kicker", text: `Opened in ${s.openYear}` }),
    h("h2", { class: "ticket__title", text: s.song.title }),
    h("p", { class: "ticket__who", text: s.song.artist }),
    h("blockquote", { class: "ticket__quote", text: s.note }),
    h("p", { class: "ticket__who", text: `Sealed by ${by}` }),
  ];
}

function renderStation() {
  card.replaceChildren(cardFor(state.tuned));
  ticket.replaceChildren(...ticketFor(state.tuned).filter(Boolean));
  ticket.dataset.band = state.tuned?.band ?? "none";
}

function renderGuide() {
  const cols = state.bands.map((b) =>
    h(
      "div",
      { class: `guide__col guide__col--${b.key}` },
      h("h3", { text: b.name }),
      h("p", { class: "guide__blurb", text: b.blurb }),
      h(
        "ol",
        {},
        ...b.stations.map((s) =>
          h(
            "li",
            {},
            h(
              "button",
              { type: "button", onclick: () => (powerOn(), tuneTo(s)) },
              h("span", { class: "guide__pip", text: pipLabel(s) }),
              h("span", { text: s.kind === "sealed" ? (isOpen(s) ? `${s.song.title}, ${s.song.artist}` : `“${s.note}”`) : s.title ?? s.name }),
            ),
          ),
        ),
      ),
    ),
  );
  $("#guide").replaceChildren(...cols);
}

function renderBandKeys() {
  $("#keys").replaceChildren(
    ...BANDS.map((b) =>
      h("button", {
        class: `key key--${b.key}`,
        type: "button",
        "data-band": b.key,
        "aria-label": b.name,
        "aria-pressed": "false",
        text: b.key_label,
        onclick: () => {
          powerOn();
          sound.clunk();
          const band = state.bands.find((x) => x.key === b.key);
          tuneTo(band.stations[0] ?? { x: band.start + LEAD });
        },
      }),
    ),
  );
}

// ---------- Power and time travel ----------

// The server saves the old recordings in the background. Once a local copy exists, use it, unless
// that record is already playing from the archive.
async function useLocalCopies() {
  let fresh;
  try {
    fresh = await stationsFile();
  } catch {
    return;
  }
  const local = new Map([...fresh.past, ...fresh.rediffusion].filter((r) => r.audio.startsWith("/")).map((r) => [r.cache, r]));
  for (const st of state.stations) {
    const copy = st.cache && local.get(st.cache);
    if (!copy || st.audio === copy.audio) continue;
    const el = players.get(st.key);
    if (el && st === state.active && !el.paused && el.readyState >= 2) continue;
    const path = copy.audio;
    st.audio = path;
    st.clip = Boolean(copy.clip);
    if (el) {
      el._src = path;
      el.src = path;
      if (st === state.active) startPlayer(st, el);
    }
  }
}

setInterval(() => state.on && useLocalCopies(), 60000);

async function powerOn() {
  if (state.on) return;
  useLocalCopies();
  state.on = true;
  document.body.classList.add("is-on");
  $("#power").setAttribute("aria-pressed", "true");
  $("#power .power__label").textContent = "Off";
  await sound.start();
  sound.openWall(state.travel);
  renderStation();
  update();
}

function powerOff() {
  state.on = false;
  document.body.classList.remove("is-on");
  $("#power").setAttribute("aria-pressed", "false");
  $("#power .power__label").textContent = "On";
  if (state.active) stopPlayer(state.active);
  state.active = null;
  setBuffering(false);
  sound.suspend();
  renderStation();
  renderReadout();
}

$("#power").addEventListener("click", () => (state.on ? powerOff() : powerOn()));

const staticSwitch = $("#static");
staticSwitch.checked = state.static;
staticSwitch.addEventListener("change", () => {
  state.static = staticSwitch.checked;
  try {
    localStorage.setItem("tcr-static", state.static ? "on" : "off");
  } catch {}
  update();
  toast(state.static ? "Static is back. Very authentic." : "Static off. Clean signal only.");
});

$("#travel").addEventListener("change", (e) => {
  state.travel = e.target.checked;
  document.body.classList.toggle("is-2065", state.travel);
  sound.openWall(state.travel);
  renderStation();
  renderReadout();
  renderGuide();
  toast(state.travel ? "It's 2065. Every tin is open." : `Back to ${THIS_YEAR}. Lids on.`);
});

// ---------- Input: drag, fling, wheel, keys, knob ----------

{
  let dragging = false;
  let lastX = 0;
  let lastT = 0;
  let v = 0;
  dial.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastT = performance.now();
    v = 0;
    cancelAnimationFrame(anim);
    dial.setPointerCapture(e.pointerId);
    dial.classList.add("is-grabbed");
  });
  dial.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    v = dx / Math.max(1, now - lastT);
    lastX = e.clientX;
    lastT = now;
    setPos(state.pos - dx);
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    dial.classList.remove("is-grabbed");
    if (reduceMotion || Math.abs(v) < 0.2) return snap();
    // Let the strip coast like a real flywheel tuner, then settle on a station.
    let vel = -v * 16;
    const step = () => {
      vel *= 0.9;
      setPos(state.pos + vel);
      if (Math.abs(vel) > 0.6 && state.pos > 0 && state.pos < state.width) anim = requestAnimationFrame(step);
      else snap();
    };
    anim = requestAnimationFrame(step);
  };
  dial.addEventListener("pointerup", release);
  dial.addEventListener("pointercancel", release);
}

let wheelTimer = 0;
dial.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    cancelAnimationFrame(anim);
    setPos(state.pos + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY));
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(snap, 160);
  },
  { passive: false },
);

dial.addEventListener("keydown", (e) => {
  const step = e.shiftKey ? 60 : 12;
  const actions = {
    ArrowLeft: () => setPos(state.pos - step),
    ArrowRight: () => setPos(state.pos + step),
    PageUp: () => seek(-1),
    PageDown: () => seek(1),
    Home: () => tuneTo(state.stations[0]),
    End: () => tuneTo(state.stations.at(-1)),
  };
  if (!actions[e.key]) return;
  e.preventDefault();
  powerOn();
  cancelAnimationFrame(anim);
  actions[e.key]();
});

{
  let turning = false;
  let lastAngle = 0;
  const angle = (e) => {
    const r = knob.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  knob.addEventListener("pointerdown", (e) => {
    turning = true;
    lastAngle = angle(e);
    cancelAnimationFrame(anim);
    knob.setPointerCapture(e.pointerId);
    powerOn();
  });
  knob.addEventListener("pointermove", (e) => {
    if (!turning) return;
    let d = angle(e) - lastAngle;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    lastAngle += d;
    setPos(state.pos + d / 0.6);
  });
  const stop = () => {
    if (turning) snap();
    turning = false;
  };
  knob.addEventListener("pointerup", stop);
  knob.addEventListener("pointercancel", stop);
}

$("#prev").addEventListener("click", () => (powerOn(), seek(-1)));
$("#next").addEventListener("click", () => (powerOn(), seek(1)));
addEventListener("resize", () => update());

// ---------- Toast ----------

let toastTimer = 0;
function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("is-shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-shown"), 2600);
}

// ---------- Boot ----------

// The stations are a data file beside the apps (site.ts). On the Bun server it also points old recordings at
// the server's local copies once they are saved.
const stationsFile = () => fetch(new URL("../data/radio.json", document.baseURI)).then((r) => r.json());

let stationData = { past: [], rediffusion: [], now: [] };

async function rebuild(focusId) {
  layout(stationData, await loadCapsules());
  renderScale();
  renderGuide();
  if (focusId) {
    const s = state.stations.find((s) => s.key === focusId);
    if (s) {
      await powerOn();
      tuneTo(s);
    }
  }
  update();
}

paintTerrazzo(document.body);
renderBandKeys();

stationData = await stationsFile();
await rebuild();
// Start in the middle of the dial, on live radio.
const live = state.bands.find((b) => b.key === "now");
state.pos = live.stations[Math.floor(live.stations.length / 2)]?.x ?? live.start;
renderStation();
update();

initSealer({
  onOpenChange: (open) => {
    sound.duck(open);
    for (const el of players.values()) el.muted = open && !el._src?.includes("itunes");
  },
  onSealed: async (capsule) => {
    toast(`Sealed. See you in ${capsule.openYear}.`);
    await rebuild(capsule.id);
  },
});
