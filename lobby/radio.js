// The lobby's radio: the Time Capsule Radio's shellac 78s as a backdrop. It is on for a first visit and remembers
// when someone turns it off. Browsers hold back sound until the first tap or key press, so until then it waits.
// It reads the radio's own station list, so on the Bun server the 78s play from its local copies and on a
// static site they stream from the Internet Archive, which can take a while to start.

const root = document.querySelector(".radio");
const toggle = root.querySelector(".radio__toggle");
const state = root.querySelector(".radio__state");
const disc = root.querySelector(".radio__disc img");
const panel = root.querySelector(".radio__now");
const title = root.querySelector(".radio__title");
const meta = root.querySelector(".radio__meta");
const next = root.querySelector(".radio__next");

const VOLUME = 0.7;
const audio = new Audio();
audio.preload = "none";

let records = null;
let at = 0;
let on = false;
let failures = 0;
let slowTimer = 0;
let fadeFrame = 0;
let blocked = false;

// Only "off" is remembered; anything else, including storage that cannot be read, means on.
const KEY = "lobby-radio";
const GESTURES = ["pointerup", "keydown", "touchend"];
function wanted() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}
function remember(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
}

// Rasa Sayang first, since every Singaporean knows it, then the rest in a new order each visit.
async function load() {
  if (records) return;
  const data = await fetch("./data/radio.json").then((r) => r.json());
  const past = data.past.filter((r) => r.audio);
  const first = past.filter((r) => /rasa sayang/i.test(r.title));
  const rest = past.filter((r) => !first.includes(r));
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  records = [...first, ...rest];
}

function fade(to, then) {
  cancelAnimationFrame(fadeFrame);
  const from = audio.volume;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 900);
    audio.volume = from + (to - from) * t;
    if (t < 1) fadeFrame = requestAnimationFrame(step);
    else then?.();
  };
  fadeFrame = requestAnimationFrame(step);
}

function show(text) {
  state.textContent = text;
}

// The browser said no to sound before a gesture: start on the first tap or key press anywhere on the page.
function start() {
  audio.play().catch((e) => {
    if (e.name !== "NotAllowedError" || !on) return;
    blocked = true;
    clearTimeout(slowTimer);
    show("Tap to play");
    meta.textContent = "Your browser waits for a tap or a key before it plays sound.";
    for (const g of GESTURES) document.addEventListener(g, unlock, true);
  });
}

function unlock(e) {
  // A tap on the radio button itself is handled by its own click.
  if (e && toggle.contains(e.target)) return;
  stopWaiting();
  if (!on) return;
  const r = records[at];
  meta.textContent = [r.year, r.artist, r.place].filter(Boolean).join(" · ");
  show("Tuning in");
  audio.play().catch(() => {});
}

function stopWaiting() {
  blocked = false;
  for (const g of GESTURES) document.removeEventListener(g, unlock, true);
}

function play(i) {
  at = (i + records.length) % records.length;
  const r = records[at];
  audio.src = r.audio;
  audio.volume = 0;
  title.textContent = r.title;
  title.href = r.source || "radio/";
  meta.textContent = [r.year, r.artist, r.place].filter(Boolean).join(" · ");
  disc.src = (r.label || "").replace(/^\.\.\//, "./");
  disc.hidden = !r.label;
  show("Tuning in");
  clearTimeout(slowTimer);
  slowTimer = setTimeout(() => {
    if (on && !blocked && audio.paused) meta.textContent = "The Internet Archive is slow today. Still tuning in…";
  }, 12000);
  start();
}

audio.addEventListener("playing", () => {
  if (!on) return;
  failures = 0;
  clearTimeout(slowTimer);
  const r = records[at];
  meta.textContent = [r.year, r.artist, r.place].filter(Boolean).join(" · ");
  root.classList.add("is-playing");
  show("On");
  fade(VOLUME);
});
audio.addEventListener("waiting", () => on && show("Tuning in"));
audio.addEventListener("ended", () => on && play(at + 1));
audio.addEventListener("error", () => {
  if (!on || !audio.src) return;
  if (++failures >= records.length) {
    show("No signal");
    meta.textContent = "The records cannot be reached right now.";
    return;
  }
  play(at + 1);
});

async function turnOn() {
  on = true;
  toggle.setAttribute("aria-pressed", "true");
  panel.hidden = false;
  show("Tuning in");
  try {
    await load();
  } catch {
    show("No signal");
    meta.textContent = "The station list did not load.";
    return;
  }
  if (!on) return;
  // Turned back on mid-fade: the record is still going, so just bring it back up.
  cancelAnimationFrame(fadeFrame);
  if (audio.src && !audio.ended && !audio.paused) {
    root.classList.add("is-playing");
    show("On");
    fade(VOLUME);
  } else if (audio.src && !audio.ended) {
    audio.volume = 0;
    start();
  } else play(at);
}

function turnOff() {
  on = false;
  stopWaiting();
  clearTimeout(slowTimer);
  toggle.setAttribute("aria-pressed", "false");
  root.classList.remove("is-playing");
  panel.hidden = true;
  show("Off");
  fade(0, () => audio.pause());
}

toggle.addEventListener("click", () => {
  if (blocked) return unlock();
  remember(on ? "off" : "on");
  on ? turnOff() : turnOn();
});
next.addEventListener("click", () => {
  root.classList.remove("is-playing");
  play(at + 1);
});

if (wanted()) turnOn();
