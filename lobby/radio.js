// The lobby's radio: the Time Capsule Radio's shellac 78s as a backdrop. It is on when people arrive and
// remembers when someone turns it off. It reads the radio's own station list, so on the Bun server the 78s play
// from its local copies and on a static site they stream from the Internet Archive.
//
// The button only ever says On or Off. Browsers hold back sound until the first tap or key press, so the first
// record loads straight away and starts on that first gesture, whatever it lands on.

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
// Load the record before anyone presses anything, so it plays the moment they do.
audio.preload = "auto";

let records = null;
let at = 0;
let on = false;
let failures = 0;
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
  const begin = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - begin) / 900);
    audio.volume = from + (to - from) * t;
    if (t < 1) fadeFrame = requestAnimationFrame(step);
    else then?.();
  };
  fadeFrame = requestAnimationFrame(step);
}

function setOn(value) {
  on = value;
  toggle.setAttribute("aria-pressed", String(value));
  state.textContent = value ? "On" : "Off";
  panel.hidden = !value;
  if (!value) root.classList.remove("is-playing");
}

// If the browser says no to sound before a gesture, wait for the first tap or key press anywhere on the page.
function start() {
  audio.play().catch((e) => {
    if (e.name !== "NotAllowedError" || !on || blocked) return;
    blocked = true;
    for (const g of GESTURES) document.addEventListener(g, unlock, true);
  });
}

function unlock(e) {
  // A tap on the radio button itself is handled by its own click.
  if (e && toggle.contains(e.target)) return;
  stopWaiting();
  if (on) audio.play().catch(() => {});
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
  start();
}

audio.addEventListener("playing", () => {
  if (!on) return;
  failures = 0;
  root.classList.add("is-playing");
  fade(VOLUME);
});
audio.addEventListener("ended", () => on && play(at + 1));
audio.addEventListener("error", () => {
  if (!on || !audio.src) return;
  if (++failures >= records.length) {
    meta.textContent = "The records cannot be reached right now.";
    return;
  }
  play(at + 1);
});

async function turnOn() {
  setOn(true);
  try {
    await load();
  } catch {
    meta.textContent = "The records cannot be reached right now.";
    return;
  }
  if (!on) return;
  // Turned back on mid-fade: the record is still going, so just bring it back up.
  cancelAnimationFrame(fadeFrame);
  if (audio.src && !audio.ended && !audio.paused) {
    root.classList.add("is-playing");
    fade(VOLUME);
  } else if (audio.src && !audio.ended) {
    audio.volume = 0;
    start();
  } else play(at);
}

function turnOff() {
  setOn(false);
  stopWaiting();
  fade(0, () => audio.pause());
}

toggle.addEventListener("click", () => {
  remember(on ? "off" : "on");
  on ? turnOff() : turnOn();
});
next.addEventListener("click", () => {
  root.classList.remove("is-playing");
  play(at + 1);
});

if (wanted()) turnOn();
else setOn(false);
