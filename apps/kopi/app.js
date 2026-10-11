import { WORDS, LANGS, SOURCES, GLOSSARY_ORDER } from "./lexicon.js";
import {
  BASES, buildLexicon, tokenize, fold, compile, describe, check,
  defaultState, randomOrder, sameDrink, normalize,
} from "./compiler.js";
import { speakOrder, stopVoice, VOICE_CREDIT } from "./voice.js";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

// ---------- the user's own words, kept in this browser ----------

const STORE_KEY = "kopi-compiler:dialect:v1";
const BEST_KEY = "kopi-compiler:rush-best:v1";

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private windows can refuse storage. The page still works for this visit.
  }
}

let dialect = load(STORE_KEY, []);
if (!Array.isArray(dialect)) dialect = [];
let lex = buildLexicon(dialect);

// ---------- drink rendering ----------

const BODY = {
  kopi: { poh: "#7a5238", normal: "#4b2c1c", gao: "#33190e", dilo: "#200f07" },
  teh: { poh: "#bd7038", normal: "#96461d", gao: "#702f12", dilo: "#4f1f0a" },
  cham: { poh: "#94593a", normal: "#6c3a1e", gao: "#4e2512", dilo: "#33160a" },
  milo: { poh: "#8d644b", normal: "#6b4532", gao: "#523323", dilo: "#3d2418" },
  bandung: { normal: "#ef9cb2" },
  mj: { normal: "#efe4cc" },
};
const CONDENSED = "#f3e2bb";
const SUGAR = "#fbf7ee";
const FROTH = "#dcbb8e";
const FILL = { cup: 80, glass: 84, bag: 72 };

const scene = $("scene");
const liquid = $("liquid");
const layerEls = {
  condensed: liquid.querySelector(".l-condensed"),
  sugar: liquid.querySelector(".l-sugar"),
  body: liquid.querySelector(".l-body"),
  evap: liquid.querySelector(".l-evap"),
  froth: liquid.querySelector(".l-froth"),
};
let lastDrinkKey = "";
let stirred = false;

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const out = [16, 8, 0].map((s) => Math.round(ch(pa, s) * (1 - t) + ch(pb, s) * t));
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

function layersFor(s, vessel) {
  if (!s.base) return { condensed: 0, sugar: 0, body: 0, evap: 0, froth: 0, colors: {} };
  const can = BASES[s.base];
  const fill = s.dino && vessel === "glass" ? 94 : FILL[vessel];
  const strength = can.strength ? s.strength : "normal";
  const body = BODY[s.base][strength] || BODY[s.base].normal;
  const condensed = can.milk && s.milk === "condensed" ? [0, 10, 17, 25][s.sugar] : 0;
  const sugar = condensed ? 0 : [0, 4, 7, 10][s.sugar];
  const evapColor = s.milk === "custom" && s.customMilk ? s.customMilk.color : "#e2c7a0";
  const evap = can.milk && (s.milk === "evaporated" || s.milk === "custom") ? 22 : 0;
  const froth = s.tarik ? 9 : 0;
  return {
    condensed, sugar, evap, froth,
    body: fill - condensed - sugar - evap - froth,
    colors: { body, condensed: CONDENSED, sugar: SUGAR, evap: evapColor, froth: FROTH },
  };
}

function renderDrink(s) {
  const vessel = s.bag ? "bag" : s.ice ? "glass" : "cup";
  const key = [s.base, s.milk, vessel].join("|");
  const changed = key !== lastDrinkKey;
  if (changed) stirred = false;
  if (changed && s.base && !reduced.matches) {
    scene.classList.remove("pour");
    void scene.offsetWidth;
    scene.classList.add("pour");
  }
  lastDrinkKey = key;

  scene.dataset.vessel = vessel;
  scene.classList.toggle("is-empty", !s.base);
  scene.classList.toggle("is-hot", !!s.base && !s.ice);
  scene.classList.toggle("is-iced", !!s.base && s.ice);
  scene.classList.toggle("is-dino", s.dino);

  const L = layersFor(s, vessel);
  if (stirred && L.colors.body) {
    let blend = L.colors.body;
    let acc = L.body;
    for (const k of ["condensed", "evap", "sugar", "froth"]) {
      if (!L[k]) continue;
      acc += L[k];
      blend = mix(blend, L.colors[k], L[k] / acc);
    }
    liquid.style.setProperty("--stir", blend);
  }
  liquid.classList.toggle("stirred", stirred);
  for (const k of Object.keys(layerEls)) {
    layerEls[k].style.height = `${Math.max(0, L[k])}%`;
    if (L.colors[k]) layerEls[k].style.setProperty("--c", L.colors[k]);
  }
  if (L.colors.body) liquid.style.setProperty("--body", L.colors.body);

  const bits = $("bits");
  bits.replaceChildren();
  const addBits = (cls, color, n) => {
    for (let i = 0; i < n; i++) {
      const b = el("i", cls);
      if (color) b.style.setProperty("--c", color);
      b.style.setProperty("--x", `${12 + ((i * 37) % 76)}%`);
      b.style.setProperty("--y", `${8 + ((i * 23) % 30)}%`);
      b.style.setProperty("--r", `${(i * 47) % 90}deg`);
      bits.append(b);
    }
  };
  if (s.base === "mj") addBits("jelly", null, 9);
  if (s.halia) addBits("ginger", null, 4);
  s.toppings.forEach((t, ti) => addBits("pearl", t.color, 6 + ti));

  $("count-badge").textContent = s.count > 1 ? `x${s.count}` : "";
  $("caption").textContent = describe(s);
}

$("stir").addEventListener("click", () => {
  if (!current.state.base) return;
  stirred = !stirred;
  $("stir").textContent = stirred ? "Unstir" : "Stir";
  if (!reduced.matches) {
    scene.classList.remove("stirring");
    void scene.offsetWidth;
    scene.classList.add("stirring");
  }
  renderDrink(current.state);
});

// ---------- ticket and punch card ----------

const PUNCH_ROWS = [
  (s) => ["kopi", "teh", "cham", "milo", "bandung", "mj"].map((b) => s.base === b),
  (s) => ["condensed", "evaporated", "none", "custom"].map((m) => !!s.base && BASES[s.base].milk && s.milk === m),
  (s) => [0, 1, 2, 3].map((v) => !!s.base && s.sugar === v),
  (s) => ["poh", "normal", "gao", "dilo"].map((v) => !!s.base && BASES[s.base].strength && s.strength === v),
  (s) => [s.halia, s.tarik, s.dino, s.toppings.length > 0],
  (s) => [s.ice, s.bag, s.count > 1],
];

function renderTicket(s, ok, hasInput) {
  const order = compile(s);
  let h = 0;
  for (const ch of order) h = (h * 31 + ch.charCodeAt(0)) % 9000;
  $("ticket-no").textContent = s.base ? `No. ${1000 + h}` : "No. ----";
  $("ticket-order").textContent = order || "Nothing yet";
  $("ticket-desc").textContent = s.base ? describe(s) : "Type an order and uncle prints it here.";
  const punch = $("punch");
  punch.replaceChildren();
  for (const row of PUNCH_ROWS) {
    const r = el("div", "punch-row");
    for (const on of row(s)) r.append(el("i", on ? "hole on" : "hole"));
    punch.append(r);
  }
  const stamp = $("stamp");
  const text = !hasInput ? "" : ok ? "UNCLE OK" : "UNCLE CONFUSED";
  if (stamp.textContent !== text) {
    stamp.textContent = text;
    stamp.className = "stamp" + (text ? (ok ? " ok" : " bad") : "");
    if (text && !reduced.matches) {
      void stamp.offsetWidth;
      stamp.classList.add("thunk");
    }
  }
}

// ---------- compile pipeline ----------

const src = $("src");
let current = { tokens: [], result: fold([], lex), state: defaultState() };
let lastChipKeys = [];

function chipColors(langs) {
  const a = LANGS[langs?.[0]] || LANGS.English;
  const b = LANGS[langs?.[1]] || a;
  return [a, b];
}

function langLine(entry) {
  if (!entry) return "Unknown word";
  const langs = entry.langs.join(" or ");
  if (entry.mine) return "Your dialect";
  if (entry.kind === "count") return langs;
  return entry.gloss ? `${langs}, "${entry.gloss}"` : langs;
}

function renderChips(tokens, result) {
  const list = $("chips");
  list.replaceChildren();
  const keys = tokens.map((t) => t.form + (t.entry?.id || "?"));
  tokens.forEach((t, i) => {
    const li = el("li", "chip");
    const [a, b] = chipColors(t.entry?.langs);
    li.style.setProperty("--c1", a.color);
    li.style.setProperty("--c2", b.color);
    if (!t.entry) li.classList.add("unknown");
    if (t.entry?.mine) li.classList.add("mine");
    if (t.entry?.disputed) li.classList.add("disputed");
    const levels = result.notes[i].map((n) => n.level);
    if (levels.includes("error")) li.classList.add("has-error");
    else if (levels.includes("warn")) li.classList.add("has-warn");
    if (keys[i] !== lastChipKeys[i] && !reduced.matches) {
      li.classList.add("new");
      li.style.animationDelay = `${Math.min(i, 6) * 30}ms`;
    }
    const top = el("span", "chip-top");
    top.append(el("span", "chip-word", t.raw));
    if (t.entry?.script) {
      const han = el("span", "chip-han", t.entry.script);
      han.lang = "zh";
      top.append(han);
    }
    li.append(top, el("span", "chip-lang", langLine(t.entry)));
    li.append(el("span", "chip-meaning", t.entry ? t.entry.meaning : "Uncle never heard this one."));
    if (!t.entry) {
      const teach = el("button", "chip-teach", "Teach uncle");
      teach.type = "button";
      teach.addEventListener("click", () => startTeaching(t.raw));
      li.append(teach);
    }
    list.append(li);
  });
  lastChipKeys = keys;
}

function renderConsole(tokens, result, extra = []) {
  const status = $("status");
  const notes = $("notes");
  notes.replaceChildren();
  const all = [];
  tokens.forEach((t, i) => result.notes[i].forEach((n) => all.push({ ...n, word: t.raw })));
  result.global.forEach((n) => all.push(n));
  extra.forEach((msg) => all.push({ level: "error", msg }));
  const errors = all.filter((n) => n.level === "error").length;
  status.className = "console-status";
  if (!tokens.length && !extra.length) {
    status.textContent = "Uncle is waiting for an order.";
  } else if (errors) {
    status.classList.add("bad");
    status.textContent = errors === 1 ? "Uncle has one complaint." : `Uncle has ${errors} complaints.`;
  } else {
    status.classList.add("ok");
    const n = tokens.length;
    status.textContent = `Compiled. ${n} ${n === 1 ? "word" : "words"}, served.`;
  }
  for (const n of all) {
    const li = el("li", `note note-${n.level}`);
    if (n.word) li.append(el("b", null, n.word));
    li.append(document.createTextNode(n.msg));
    notes.append(li);
  }
  return errors === 0;
}

function runSource(text, { fromBuilder = false } = {}) {
  const tokens = tokenize(text, lex);
  const result = fold(tokens, lex);
  current = { tokens, result, state: result.state };
  renderChips(tokens, result);
  const ok = renderConsole(tokens, result);
  renderDrink(result.state);
  renderTicket(result.state, ok && !!result.state.base, tokens.length > 0);
  if (!fromBuilder) syncBuilder(result.state);
}

src.addEventListener("input", () => runSource(src.value));

// On phones the cup sits below the counter, so bring it into view once the order is in.
const narrow = matchMedia("(max-width: 900px)");
function showCup() {
  if (!narrow.matches) return;
  const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("scene").scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
}
src.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  src.blur();
  showCup();
});

const EXAMPLES = [
  "kopi-o kosong peng", "teh c siew dai", "kopi gao", "teh halia", "yuan yang peng",
  "milo dinosaur", "tak kiu peng da bao", "michael jackson", "kopi di lo ga dai",
];
const exWrap = document.querySelector(".examples");
for (const ex of EXAMPLES) {
  const b = el("button", "example", ex);
  b.type = "button";
  b.addEventListener("click", () => {
    src.value = ex;
    runSource(ex);
    if (narrow.matches) showCup();
    else src.focus();
  });
  exWrap.append(b);
}

// ---------- builder (reverse mode) ----------

const builder = $("builder");
const GROUPS = {
  base: [
    ["kopi", "Coffee", "kopi"], ["teh", "Tea", "teh"], ["cham", "Coffee + tea", "yuan yang"],
    ["milo", "Milo", "tak kiu"], ["bandung", "Rose milk", "bandung"], ["mj", "Soy + jelly", "michael jackson"],
  ],
  milk: [["condensed", "Condensed", "default"], ["evaporated", "Evaporated", "c"], ["none", "None", "o"]],
  sugar: [["0", "None", "kosong"], ["1", "Less", "siew dai"], ["2", "Normal", "default"], ["3", "More", "ga dai"]],
  strength: [["poh", "Weak", "poh"], ["normal", "Normal", "default"], ["gao", "Strong", "gao"], ["dilo", "No water", "di lo"]],
  extras: [
    ["halia", "Ginger", "halia"], ["tarik", "Pulled", "tarik"], ["dino", "Powder heap", "dinosaur"],
    ["ice", "Ice", "peng"], ["bag", "Takeaway", "da bao"],
  ],
};

function option(group, [value, label, word], type) {
  const wrap = el("label", "opt");
  const input = document.createElement("input");
  input.type = type;
  input.name = group;
  input.value = value;
  wrap.append(input, el("span", "opt-label", label));
  if (word) wrap.append(el("span", "opt-word", word));
  return wrap;
}

function buildControls() {
  for (const [group, opts] of Object.entries(GROUPS)) {
    const seg = builder.querySelector(`[data-group="${group}"] .seg`);
    seg.replaceChildren();
    const type = group === "extras" ? "checkbox" : "radio";
    for (const o of opts) seg.append(option(group, o, type));
    if (group === "milk") {
      for (const d of dialect.filter((x) => x.type === "milk")) {
        seg.append(option("milk", ["custom:" + d.word, d.word, "yours"], "radio"));
      }
    }
  }
}

function readBuilder() {
  const s = defaultState();
  const fd = new FormData(builder);
  s.base = fd.get("base") || null;
  const milk = fd.get("milk") || "condensed";
  if (milk.startsWith("custom:")) {
    const word = milk.slice(7);
    const d = dialect.find((x) => x.type === "milk" && x.word === word);
    s.milk = "custom";
    s.customMilk = d ? { word: d.word, color: d.color } : null;
  } else s.milk = milk;
  s.sugar = Number(fd.get("sugar") ?? 2);
  s.strength = fd.get("strength") || "normal";
  const extras = fd.getAll("extras");
  for (const k of ["halia", "tarik", "dino", "ice", "bag"]) s[k] = extras.includes(k);
  if (s.dino) s.ice = true;
  return s;
}

function setChecked(group, value) {
  for (const input of builder.querySelectorAll(`input[name="${group}"]`)) {
    input.checked = input.value === String(value);
  }
}

function applyBuilderRules() {
  const base = builder.querySelector('input[name="base"]:checked')?.value;
  const can = base ? BASES[base] : null;
  const toggle = (sel, disabled) => {
    for (const input of builder.querySelectorAll(sel)) {
      input.disabled = disabled;
      if (disabled && input.type === "checkbox") input.checked = false;
      input.closest(".opt").classList.toggle("off", disabled);
    }
  };
  toggle('input[name="milk"]', !!can && !can.milk);
  toggle('input[name="strength"]', !!can && !can.strength);
  toggle('input[name="extras"][value="halia"], input[name="extras"][value="tarik"]', !!can && !can.extras.includes("halia"));
  toggle('input[name="extras"][value="dino"]', !!can && base !== "milo");
  const dino = builder.querySelector('input[name="extras"][value="dino"]');
  const ice = builder.querySelector('input[name="extras"][value="ice"]');
  if (dino.checked) ice.checked = true;
  ice.disabled = dino.checked;
  ice.closest(".opt").classList.toggle("off", dino.checked);
}

function syncBuilder(s) {
  if (mode === "rush") return;
  setChecked("base", s.base ?? "");
  setChecked("milk", s.milk === "custom" && s.customMilk ? "custom:" + s.customMilk.word : s.milk);
  setChecked("sugar", s.sugar);
  setChecked("strength", s.strength);
  for (const input of builder.querySelectorAll('input[name="extras"]')) input.checked = !!s[input.value];
  applyBuilderRules();
}

function resetBuilder() {
  builder.reset();
  setChecked("milk", "condensed");
  setChecked("sugar", 2);
  setChecked("strength", "normal");
  applyBuilderRules();
}

builder.addEventListener("change", () => {
  applyBuilderRules();
  const s = readBuilder();
  if (mode === "rush") {
    renderDrink(s);
    rushCheck(s);
    return;
  }
  const problems = check(s);
  if (problems.length) {
    current = { tokens: [], result: fold([], lex), state: s };
    $("chips").replaceChildren();
    lastChipKeys = [];
    renderConsole([], fold([], lex), problems);
    renderDrink(s);
    renderTicket(s, false, true);
    return;
  }
  const order = compile(s);
  src.value = order.toLowerCase();
  runSource(order, { fromBuilder: true });
});
builder.addEventListener("submit", (e) => e.preventDefault());

// ---------- tabs ----------

let mode = "type";
const tabs = [...document.querySelectorAll('[role="tab"]')];
const MODES = { "tab-type": "type", "tab-build": "build", "tab-rush": "rush" };
const buildHome = $("panel-build");

function selectTab(tab, focus = false) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute("aria-controls")).hidden = !on;
  }
  if (focus) tab.focus();
  const next = MODES[tab.id];
  if (mode === "rush" && next !== "rush") stopRush(false);
  mode = next;
  document.body.dataset.mode = mode;
  if (mode === "rush") {
    $("rush-builder-slot").append(builder);
    builder.classList.add("quiz");
    resetBuilder();
    renderDrink(readBuilder());
  } else {
    buildHome.append(builder);
    builder.classList.remove("quiz");
    runSource(src.value);
  }
}

tabs.forEach((t, i) => {
  t.addEventListener("click", () => selectTab(t));
  t.addEventListener("keydown", (e) => {
    const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (dir) {
      e.preventDefault();
      selectTab(tabs[(i + dir + tabs.length) % tabs.length], true);
    }
  });
});

// ---------- speech ----------

// Uncle says it in a local voice (voice.js). Speech is a bonus: when nothing local can say an order on this
// device, the button says so for a moment and the order stays on screen.
// Who reads: the Malay uncle or the Singapore auntie (tools/voices/kopi.py), remembered in this browser.
const WHO_KEY = "kopi-compiler:who:v1";
const whoInputs = [...document.querySelectorAll("input[name=who]")];
const saidWho = load(WHO_KEY, "uncle");
for (const input of whoInputs) {
  input.checked = input.value === saidWho;
  input.addEventListener("change", () => save(WHO_KEY, input.value));
}
const who = () => whoInputs.find((i) => i.checked)?.value ?? "uncle";

// Rush reads each order unless Nobody is picked; Shout it always speaks (the uncle, if Nobody is picked).
async function speak(s, { asked = false } = {}) {
  if (who() === "none" && !asked) return;
  const how = await speakOrder(s, who() === "none" ? "uncle" : who());
  if (how || !s?.base) return;
  $("shout").textContent = "No local voice here";
  clearTimeout(speak.timer);
  speak.timer = setTimeout(() => ($("shout").textContent = "Shout it"), 1600);
}

$("shout").addEventListener("click", () => speak(mode === "rush" ? rush.target : current.state, { asked: true }));

$("copy").addEventListener("click", async () => {
  const text = compile(current.state);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    $("copy").textContent = "Copied";
  } catch {
    $("copy").textContent = "Copy failed";
  }
  setTimeout(() => ($("copy").textContent = "Copy order"), 1200);
});

// ---------- Uncle's Rush ----------

const RUSH_SECONDS = 60;
const rush = { on: false, target: null, score: 0, ends: 0, timer: 0 };

function showBest() {
  const best = load(BEST_KEY, 0);
  $("rush-best").textContent = best ? `Your best: ${best} served.` : "";
}

function nextOrder() {
  let t;
  do t = randomOrder(); while (rush.target && compile(t) === compile(rush.target));
  rush.target = t;
  const text = compile(t);
  $("rush-order").textContent = text;
  speak(t);
  resetBuilder();
  renderDrink(readBuilder());
}

function startRush() {
  rush.on = true;
  rush.score = 0;
  rush.target = null;
  rush.ends = performance.now() + RUSH_SECONDS * 1000;
  $("rush-score").textContent = "0";
  $("rush-idle").hidden = true;
  $("rush-done").hidden = true;
  $("rush-live").hidden = false;
  nextOrder();
  clearInterval(rush.timer);
  rush.timer = setInterval(tick, 200);
  tick();
  builder.querySelector('input[name="base"]')?.focus();
}

function tick() {
  const left = Math.max(0, Math.ceil((rush.ends - performance.now()) / 1000));
  $("rush-time").textContent = String(left);
  $("rush-time").classList.toggle("hurry", left <= 10);
  if (left <= 0) stopRush(true);
}

const QUIPS = [
  [0, "Shop closed. Uncle served himself."],
  [1, "Steady. Uncle still keeps his job."],
  [4, "Not bad. You can cover uncle's lunch break."],
  [8, "Wah. Uncle thinking of retiring."],
  [12, "Uncle retired. The shop is yours."],
];

function stopRush(finished) {
  if (!rush.on) return;
  rush.on = false;
  stopVoice();
  clearInterval(rush.timer);
  rush.target = null;
  $("rush-live").hidden = true;
  if (!finished) {
    $("rush-idle").hidden = false;
    return;
  }
  const best = Math.max(load(BEST_KEY, 0), rush.score);
  save(BEST_KEY, best);
  $("rush-done").hidden = false;
  $("rush-final").textContent = `You served ${rush.score} ${rush.score === 1 ? "drink" : "drinks"}.`;
  $("rush-quip").textContent = QUIPS.filter(([n]) => rush.score >= n).pop()[1];
  showBest();
  $("rush-again").focus();
}

function rushCheck(s) {
  if (!rush.on || !rush.target) return;
  if (!sameDrink(s, rush.target)) return;
  rush.score += 1;
  $("rush-score").textContent = String(rush.score);
  const order = $("rush-order");
  order.classList.remove("served");
  void order.offsetWidth;
  order.classList.add("served");
  setTimeout(() => rush.on && nextOrder(), reduced.matches ? 0 : 380);
}

$("rush-start").addEventListener("click", startRush);
$("rush-again").addEventListener("click", startRush);
$("rush-skip").addEventListener("click", () => rush.on && nextOrder());

// ---------- Then: the menu board ----------

const TRY = {
  kopi: "kopi", teh: "teh", o: "kopi-o", c: "teh-c", kosong: "kopi-o kosong", siewdai: "teh siew dai",
  gadai: "kopi ga dai", gao: "kopi gao", poh: "teh poh", dilo: "kopi di lo", peng: "teh peng",
  dabao: "kopi da bao", tarik: "teh tarik", halia: "teh halia", cham: "kopi cham", yuanyang: "yuan yang",
  takkiu: "tak kiu", milo: "milo peng", dinosaur: "milo dinosaur", bandung: "bandung peng", mj: "michael jackson",
};

function renderLegend() {
  const legend = $("legend");
  for (const [name, c] of Object.entries(LANGS)) {
    if (name === "Yours") continue;
    const li = el("li", "legend-item", name);
    li.style.setProperty("--c1", c.color);
    legend.append(li);
  }
}

function renderMenu() {
  const menu = $("menu");
  const byId = new Map(WORDS.map((w) => [w.id, w]));
  for (const id of GLOSSARY_ORDER) {
    const w = byId.get(id);
    if (!w) continue;
    const li = el("li", "menu-row");
    const word = el("button", "menu-word", w.forms[0]);
    word.type = "button";
    word.title = `Try "${TRY[id]}"`;
    word.addEventListener("click", () => {
      src.value = TRY[id];
      if (mode !== "type") selectTab(tabs[0]);
      runSource(src.value);
      document.querySelector(".shop").scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" });
      src.focus({ preventScroll: true });
    });
    const head = el("div", "menu-head");
    head.append(word);
    if (w.script) {
      const han = el("span", "menu-han", w.script);
      han.lang = "zh";
      head.append(han);
    }
    if (w.roman) head.append(el("span", "menu-roman", w.roman));
    const body = el("div", "menu-body");
    body.append(el("p", "menu-meaning", w.meaning));
    if (w.note) body.append(el("p", "menu-note", w.note));
    const meta = el("div", "menu-meta");
    for (const lang of w.langs) {
      const tag = el("span", "menu-lang", lang);
      tag.style.setProperty("--c1", LANGS[lang].color);
      meta.append(tag);
    }
    if (w.gloss) meta.append(el("span", "menu-gloss", `"${w.gloss}"`));
    if (w.src && SOURCES[w.src]) {
      const a = el("a", "menu-src", "Source");
      a.href = SOURCES[w.src].url;
      a.target = "_blank";
      a.rel = "noopener";
      a.title = SOURCES[w.src].label;
      meta.append(a);
    }
    li.append(head, body, meta);
    menu.append(li);
  }
}

function renderSources() {
  const ul = $("sources");
  for (const s of Object.values(SOURCES)) {
    const li = el("li");
    const a = el("a", null, s.label);
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener";
    li.append(a);
    ul.append(li);
  }
  ul.append(el("li", null, VOICE_CREDIT));
}

// ---------- Next: teach uncle ----------

const SWATCHES = [
  ["#e8d8b5", "Oat"], ["#8fbf6a", "Pandan"], ["#8a4b1f", "Gula melaka"], ["#8e66c2", "Ube"],
  ["#2b1a12", "Boba"], ["#e9cf5f", "Durian"], ["#e27d8f", "Strawberry"],
];
const teach = $("teach");

function renderSwatches() {
  const wrap = $("swatches");
  SWATCHES.forEach(([color, name], i) => {
    const label = el("label", "swatch");
    label.title = name;
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "color";
    input.value = color;
    input.checked = input.defaultChecked = i === 0;
    input.setAttribute("aria-label", name);
    label.style.setProperty("--c", color);
    label.append(input, el("span"));
    wrap.append(label);
  });
}

function teachType() {
  return new FormData(teach).get("type");
}

teach.addEventListener("change", (e) => {
  if (e.target.name !== "type") return;
  const macro = teachType() === "macro";
  $("teach-meaning-wrap").hidden = macro;
  $("teach-macro-wrap").hidden = !macro;
  $("teach-meaning").placeholder = teachType() === "milk" ? "Oat milk instead of condensed" : "Chewy pearls at the bottom";
});

function startTeaching(word) {
  $("teach-word").value = word.slice(0, 16);
  $("teach-error").textContent = "";
  document.querySelector(".next").scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" });
  $("teach-meaning").focus({ preventScroll: true });
}

teach.addEventListener("submit", (e) => {
  e.preventDefault();
  const err = $("teach-error");
  const raw = $("teach-word").value.trim().replace(/\s+/g, " ");
  const form = normalize(raw);
  const type = teachType();
  err.textContent = "";
  err.classList.remove("ok");
  if (!form || !/^[a-z0-9 ]{1,16}$/.test(form)) {
    err.textContent = "Use letters, numbers and spaces, up to 16 characters.";
    return;
  }
  if (WORDS.some((w) => w.forms.some((f) => normalize(f) === form))) {
    err.textContent = "Uncle already knows that one. Try another word.";
    return;
  }
  if (dialect.some((d) => normalize(d.word) === form)) {
    err.textContent = "You taught uncle that already. Remove it first to change it.";
    return;
  }
  const entry = { word: form, type, made: new Date().toLocaleDateString("en-CA") };
  if (type === "macro") {
    const expands = $("teach-expands").value.trim();
    const tokens = tokenize(expands, lex);
    const result = fold(tokens, lex);
    if (!expands) { err.textContent = "Type the order this shortcut stands for."; return; }
    if (tokens.some((t) => t.entry?.kind === "macro")) { err.textContent = "Shortcuts cannot use other shortcuts."; return; }
    if (result.errors || !result.state.base) { err.textContent = "That order does not compile yet. Fix it in the box above first."; return; }
    entry.expands = expands;
    entry.meaning = compile(result.state);
  } else {
    const meaning = $("teach-meaning").value.trim();
    if (!meaning) { err.textContent = "Tell uncle what it means."; return; }
    entry.meaning = meaning;
    entry.color = new FormData(teach).get("color") || SWATCHES[0][0];
  }
  dialect.push(entry);
  save(STORE_KEY, dialect);
  refreshDialect();
  teach.reset();
  $("teach-meaning-wrap").hidden = false;
  $("teach-macro-wrap").hidden = true;
  const sample = trySample(entry);
  src.value = sample;
  runSource(sample);
  err.textContent = `Uncle learned "${form}". Try "${sample}" in the order box.`;
  err.classList.add("ok");
});

function trySample(d) {
  if (d.type === "milk") return `kopi ${d.word} siew dai`;
  if (d.type === "topping") return `teh ${d.word} peng`;
  return d.word;
}

function refreshDialect() {
  lex = buildLexicon(dialect);
  const list = $("dialect-list");
  list.replaceChildren();
  $("dialect-empty").hidden = dialect.length > 0;
  const KIND = { milk: "milk", topping: "topping", macro: "shortcut" };
  dialect.forEach((d, i) => {
    const li = el("li", "dialect-item");
    if (d.color) li.style.setProperty("--c", d.color);
    const top = el("div", "dialect-top");
    top.append(el("b", "dialect-word", d.word), el("span", "dialect-kind", KIND[d.type] || d.type));
    const meaning = el("p", "dialect-meaning", d.type === "macro" ? `= ${d.expands}` : d.meaning);
    const actions = el("div", "dialect-actions");
    const tryBtn = el("button", "btn btn-small", "Try it");
    tryBtn.type = "button";
    tryBtn.addEventListener("click", () => {
      src.value = trySample(d);
      if (mode !== "type") selectTab(tabs[0]);
      runSource(src.value);
      document.querySelector(".shop").scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" });
    });
    const rm = el("button", "btn btn-small btn-quiet", "Remove");
    rm.type = "button";
    rm.setAttribute("aria-label", `Remove ${d.word}`);
    rm.addEventListener("click", () => {
      dialect.splice(i, 1);
      save(STORE_KEY, dialect);
      refreshDialect();
      runSource(src.value);
    });
    actions.append(tryBtn, rm);
    li.append(top, meaning, actions);
    list.append(li);
  });
  buildControls();
  if (mode === "rush") resetBuilder();
  else syncBuilder(current.state);
}

// ---------- start ----------

renderLegend();
renderMenu();
renderSources();
renderSwatches();
refreshDialect();
showBest();
document.body.dataset.mode = mode;

let initial = "kopi-o kosong peng";
try {
  const fromHash = decodeURIComponent(location.hash.slice(1));
  if (fromHash) initial = fromHash.slice(0, 120);
} catch {
  // Bad hash. Use the default order.
}
src.value = initial;
runSource(initial);
