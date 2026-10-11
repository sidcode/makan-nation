// The kopi language: tokenize, fold into a drink, compile back to an order.
import { WORDS, ENGLISH_NUDGE } from "./lexicon.js";

export const BASES = {
  kopi: { name: "Kopi", noun: "coffee", milk: true, strength: true, extras: ["tarik", "halia"] },
  teh: { name: "Teh", noun: "tea", milk: true, strength: true, extras: ["tarik", "halia"] },
  cham: { name: "Yuan Yang", noun: "coffee and tea", milk: true, strength: true, extras: ["tarik", "halia"] },
  milo: { name: "Milo", noun: "Milo", milk: true, strength: true, extras: ["dino"] },
  bandung: { name: "Bandung", noun: "rose syrup milk", milk: false, strength: false, extras: [] },
  mj: { name: "Michael Jackson", noun: "soya bean milk with grass jelly", milk: false, strength: false, extras: [] },
};

const NUMBER_WORDS = ["", "", "Two", "Three", "Four", "Five"];

export function defaultState() {
  return {
    base: null,
    milk: "condensed",
    customMilk: null,
    sugar: 2,
    strength: "normal",
    ice: false,
    bag: false,
    halia: false,
    tarik: false,
    dino: false,
    count: 1,
    toppings: [],
  };
}

export function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‐-―\-_/,.;:!?+&()"'`*#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Built-in words plus whatever the user taught uncle on this device.
export function buildLexicon(custom = []) {
  const byForm = new Map();
  for (const w of WORDS) for (const f of w.forms) byForm.set(normalize(f), w);
  for (const c of custom) {
    const form = normalize(c.word);
    if (!form || byForm.has(form)) continue;
    byForm.set(form, toEntry(c));
  }
  const compact = new Map();
  for (const [form, entry] of byForm) compact.set(form.replace(/ /g, ""), { form, entry });
  return { byForm, compact };
}

function toEntry(c) {
  const kind = c.type === "milk" ? "milk" : c.type === "macro" ? "macro" : "topping";
  return {
    id: "you:" + normalize(c.word),
    kind,
    value: kind === "milk" ? "custom" : null,
    custom: { word: c.word.trim(), color: c.color, expands: c.expands || "" },
    forms: [c.word],
    langs: ["Yours"],
    gloss: c.meaning,
    meaning: kind === "macro" ? `Shortcut for "${c.expands}".` : c.meaning,
    mine: true,
  };
}

// Split a run-together word like "kopiosiewdai" into known pieces.
function splitCompact(word, lex) {
  const n = word.length;
  const best = new Array(n + 1).fill(null);
  best[0] = [];
  for (let i = 0; i < n; i++) {
    if (!best[i]) continue;
    for (let j = i + 1; j <= n; j++) {
      const hit = lex.compact.get(word.slice(i, j));
      if (!hit) continue;
      const next = [...best[i], { raw: word.slice(i, j), ...hit }];
      if (!best[j] || next.length < best[j].length) best[j] = next;
    }
  }
  return best[n];
}

// "kopio" is kopi + o. "coco" is not c + o + c + o.
function plausible(pieces) {
  if (!pieces.some((p) => p.raw.length >= 3)) return false;
  return !pieces.some((p, i) => i > 0 && p.raw.length === 1 && pieces[i - 1].raw.length === 1);
}

export function tokenize(src, lex) {
  const words = normalize(src).split(" ").filter(Boolean);
  const out = [];
  let i = 0;
  while (i < words.length) {
    let matched = false;
    for (let len = Math.min(3, words.length - i); len >= 1; len--) {
      const phrase = words.slice(i, i + len).join(" ");
      const entry = lex.byForm.get(phrase);
      if (entry) {
        out.push({ raw: phrase, form: phrase, entry });
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const pieces = splitCompact(words[i], lex);
    if (pieces && pieces.length > 1 && plausible(pieces)) {
      for (const p of pieces) out.push({ raw: p.raw, form: p.form, entry: p.entry, joined: true });
    } else {
      out.push({ raw: words[i], form: words[i], entry: null });
    }
    i += 1;
  }
  return out;
}

const SUGAR_CLASH = {
  "0,1": "Kosong already zero. Less than zero cannot.",
  "0,3": "Zero sugar but extra sugar? Uncle's head pain.",
  "1,3": "Less or more? Choose one lah.",
};

// Walk the tokens and build the drink. Problems get pinned to the chip that caused them.
export function fold(tokens, lex) {
  const s = defaultState();
  const notes = tokens.map(() => []);
  const global = [];
  const say = (i, level, msg) => notes[i].push({ level, msg });

  // Shortcuts expand in place. One level deep, so nobody builds an infinite kopi.
  const flat = [];
  tokens.forEach((t, i) => {
    if (t.entry?.kind === "macro") {
      const inner = tokenize(t.entry.custom.expands, lex).filter((x) => x.entry?.kind !== "macro");
      if (!inner.length) say(i, "error", "This shortcut is empty.");
      for (const x of inner) flat.push({ ...x, owner: i });
    } else {
      flat.push({ ...t, owner: i });
    }
  });

  for (const t of flat) {
    if (!t.entry) say(t.owner, "error", `Uncle don't know "${t.raw}". Teach uncle?`);
    else if (t.form === "0") say(t.owner, "note", "That's a zero. Uncle assumes you mean O.");
    else if (ENGLISH_NUDGE[t.form]) say(t.owner, "note", `Uncle understands. Next time say "${ENGLISH_NUDGE[t.form]}".`);
    else if (t.entry.kind === "greeting") say(t.owner, "note", "Polite. Uncle likes.");
  }

  for (const t of flat) {
    if (t.entry?.kind !== "base") continue;
    const v = t.entry.value;
    if (!s.base) { s.base = v; continue; }
    if (s.base === v) { say(t.owner, "warn", "Once enough. Uncle heard you."); continue; }
    const pair = [s.base, v];
    if (pair.every((x) => x === "kopi" || x === "teh" || x === "cham")) {
      if (!pair.includes("cham")) say(t.owner, "warn", "Kopi and teh together? That one called yuan yang. Uncle got you.");
      s.base = "cham";
      continue;
    }
    say(t.owner, "error", "One drink at a time. Uncle only got two hands.");
  }

  const can = s.base ? BASES[s.base] : null;
  let milkBy = null, sugarBy = null, strengthBy = null, countBy = null;

  for (const t of flat) {
    const e = t.entry;
    if (!e) continue;
    const i = t.owner;
    switch (e.kind) {
      case "milk": {
        if (can && !can.milk) {
          say(i, "error", s.base === "mj" ? "Michael Jackson already black and white. No need milk." : "Bandung already got milk inside lah.");
          break;
        }
        const label = e.value === "custom" ? e.custom.word : e.value;
        if (milkBy && milkBy !== label) { say(i, "error", "Two kinds of milk? Pick one lah."); break; }
        if (milkBy) { say(i, "warn", "Same milk twice. Uncle only pour once."); break; }
        milkBy = label;
        s.milk = e.value;
        s.customMilk = e.value === "custom" ? { word: e.custom.word, color: e.custom.color } : null;
        break;
      }
      case "sugar": {
        if (sugarBy !== null && sugarBy !== e.value) {
          const key = [sugarBy, e.value].sort().join(",");
          say(i, "error", SUGAR_CLASH[key] || "Make up your mind on the sugar.");
          break;
        }
        if (sugarBy !== null) { say(i, "warn", "Uncle heard you the first time."); break; }
        sugarBy = e.value;
        s.sugar = e.value;
        break;
      }
      case "strength": {
        if (can && !can.strength) { say(i, "error", `${can.name} cannot gao or poh one.`); break; }
        if (strengthBy && strengthBy !== e.value) {
          const pair = [strengthBy, e.value];
          say(i, "error", pair.includes("gao") && pair.includes("poh")
            ? "Thick and thin at the same time? Physics also cannot."
            : "Strong or weak? Choose one.");
          break;
        }
        if (strengthBy) { say(i, "warn", "Once enough."); break; }
        strengthBy = e.value;
        s.strength = e.value;
        break;
      }
      case "ice":
        if (s.ice && !s.dino) say(i, "warn", "One peng enough. Ice don't need ice.");
        s.ice = true;
        break;
      case "bag":
        if (s.bag) say(i, "warn", "One bag can already.");
        s.bag = true;
        break;
      case "extra": {
        if (e.value === "dino") {
          if (s.base !== "milo") { say(i, "error", "Dinosaur only lives in Milo."); break; }
          s.dino = true;
          s.ice = true;
          break;
        }
        if (can && !can.extras.includes(e.value)) {
          say(i, "error", e.value === "tarik" ? `Uncle never pull ${can.name} before. Next time maybe.` : `Ginger in ${can.name}? Uncle never try before.`);
          break;
        }
        if (s[e.value]) { say(i, "warn", "Once enough."); break; }
        s[e.value] = true;
        break;
      }
      case "topping": {
        if (!s.toppings.some((x) => x.word === e.custom.word)) s.toppings.push({ word: e.custom.word, color: e.custom.color });
        break;
      }
      case "count": {
        if (countBy !== null && countBy !== e.value) { say(i, "error", "How many? Say once can already."); break; }
        countBy = e.value;
        s.count = e.value;
        break;
      }
    }
  }

  // Condensed milk is the sugar. Kosong takes it away.
  if (s.sugar === 0 && s.milk === "condensed" && !milkBy && can?.milk) s.milk = "none";

  if (!s.base && tokens.length) {
    global.push({ level: "error", msg: s.ice ? "Peng what? Ice cube ah? Tell uncle the drink first." : "No drink in this order. Start with kopi, teh or milo." });
  }

  const all = [...notes.flat(), ...global];
  return {
    state: s,
    notes,
    global,
    errors: all.filter((n) => n.level === "error").length,
    warnings: all.filter((n) => n.level === "warn").length,
  };
}

// Builder controls can produce combos the grammar would reject. Catch them here.
export function check(s) {
  const out = [];
  if (!s.base) out.push("Pick a drink first.");
  if (s.base && BASES[s.base].milk && s.milk === "condensed" && s.sugar === 0) {
    out.push("Condensed milk got sugar inside. Kosong with condensed milk cannot.");
  }
  return out;
}

export function compile(s) {
  if (!s.base) return "";
  const can = BASES[s.base];
  let head = can.name;
  if (can.milk) {
    if (s.milk === "none") head += "-O";
    else if (s.milk === "evaporated") head += "-C";
  }
  const parts = [head];
  if (can.milk && s.milk === "custom" && s.customMilk) parts.push(title(s.customMilk.word));
  if (s.halia) parts.push("Halia");
  if (s.tarik) parts.push("Tarik");
  if (can.strength) {
    if (s.strength === "gao") parts.push("Gao");
    if (s.strength === "poh") parts.push("Poh");
    if (s.strength === "dilo") parts.push("Di Lo");
  }
  if (s.sugar === 0) parts.push("Kosong");
  if (s.sugar === 1) parts.push("Siew Dai");
  if (s.sugar === 3) parts.push("Ga Dai");
  for (const t of s.toppings) parts.push(title(t.word));
  if (s.dino) parts.push("Dinosaur");
  else if (s.ice) parts.push("Peng");
  if (s.bag) parts.push("Da Bao");
  const order = parts.join(" ");
  return s.count > 1 ? `${NUMBER_WORDS[s.count] || s.count} ${order}` : order;
}

export function describe(s) {
  if (!s.base) return "An empty cup. Uncle is waiting.";
  const can = BASES[s.base];
  const bits = [];
  const strength = { gao: "Strong", poh: "Weak", dilo: "Undiluted" }[can.strength ? s.strength : "normal"];
  let lead = strength ? `${strength} ${can.noun}` : cap(can.noun);
  if (can.milk) {
    if (s.milk === "condensed") lead += " with condensed milk";
    if (s.milk === "evaporated") lead += " with evaporated milk";
    if (s.milk === "none") lead += ", no milk";
    if (s.milk === "custom" && s.customMilk) lead += ` with ${s.customMilk.word} milk`;
  }
  bits.push(lead);
  if (s.sugar === 0) bits.push("no sugar");
  if (s.sugar === 1) bits.push("less sweet");
  if (s.sugar === 3) bits.push("extra sweet");
  if (s.halia) bits.push("ginger in");
  if (s.tarik) bits.push("pulled till frothy");
  for (const t of s.toppings) bits.push(`${t.word} on top`);
  if (s.dino) bits.push("a mountain of Milo powder on top");
  if (s.ice) bits.push("iced");
  else bits.push("hot");
  if (s.bag) bits.push("in a bag to go");
  const text = bits.join(", ") + ".";
  return s.count > 1 ? `${s.count} cups. ${text}` : text;
}

export function sameDrink(a, b) {
  if (!a.base || a.base !== b.base) return false;
  const can = BASES[a.base];
  if (can.milk && a.milk !== b.milk) return false;
  if (can.strength && a.strength !== b.strength) return false;
  const keys = ["sugar", "bag", "halia", "tarik", "dino"];
  if (keys.some((k) => a[k] !== b[k])) return false;
  return a.dino || a.ice === b.ice;
}

function pick(rng, weights) {
  const entries = Object.entries(weights);
  let r = rng() * entries.reduce((n, [, w]) => n + w, 0);
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries[0][0];
}

export function randomOrder(rng = Math.random) {
  const s = defaultState();
  s.base = pick(rng, { kopi: 5, teh: 5, cham: 1, milo: 2, bandung: 1, mj: 1 });
  const can = BASES[s.base];
  // Yuan yang stays plain in the game. O and C forms of it are not well attested.
  if (can.milk && s.base !== "cham") s.milk = pick(rng, { condensed: 3, none: 3, evaporated: 2 });
  s.sugar = Number(pick(rng, { 2: 4, 1: 3, 0: 2, 3: 1 }));
  if (s.sugar === 0 && s.milk === "condensed") s.sugar = 1;
  if (can.strength) s.strength = pick(rng, { normal: 6, gao: 2, poh: 1, dilo: 1 });
  s.ice = rng() < 0.45;
  s.bag = rng() < 0.2;
  if (s.base === "teh" && rng() < 0.2) s.halia = true;
  else if ((s.base === "teh" || s.base === "kopi") && rng() < 0.1) s.tarik = true;
  if (s.base === "milo" && rng() < 0.35) { s.dino = true; s.ice = true; }
  return s;
}

function cap(t) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function title(t) {
  return t.split(" ").map(cap).join(" ");
}
