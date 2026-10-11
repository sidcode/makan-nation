// The kitchen itself: chefs, helpers, stations, orders, money. Pure data with no DOM and no Three.js, so it
// runs on whoever hosts and can be tested on its own. Everyone else only sees snapshots of it.

import { BASES, defaultState, randomOrder, sameDrink } from "../kopi/compiler.js";
import { COMMISSION, GRAB_SHARE, RIDER_SHARE } from "./delivery.js";
import { DISHES, DRINK_COST, INGREDIENTS, partsOf } from "./dishes.js";
import { profitAndLoss } from "./economy.js";
import { eraById } from "./eras.js";
import { chefById } from "./chefs.js";
import { think } from "./helpers.js";
import { pickOrderVoice } from "./phrases.js";
import { approaches, levelById, parseLevel } from "./levels.js";

export const SPEED = 4.4; // tiles a second
const RADIUS = 0.3;
const BURN_AFTER = 14; // seconds a finished dish can sit on the heat before it burns
const SETTLE = 2.2; // a wok waits this long for one more ingredient when a bigger recipe is possible
const SETTLE_WANTED = 7; // and longer when an order wants the bigger dish and none wants the smaller one
const BREW_TIME = 2.2;
const RETURN_DELAY = 6;
const PLATE_ROOM = 4;
export const MAX_CHEFS = 7;
const DASH_SPEED = 11;
const DASH_TIME = 0.17;
const DASH_COOL = 0.8;
const THROW_SPEED = 7;
const FIRE_AFTER = 5; // burnt food left on the heat this long catches fire
const FIRE_SPREAD = 8; // a big fire jumps to the next station after this long
const NO_FIRE = new Set(["sink", "ext", "bin", "return", "rack", "hatch"]);

// What each heat station makes. Inputs are raw ingredient kinds.
export const COOK = {
  pot: [
    { in: ["chicken"], out: { k: "chicken", s: ["poach"] }, time: 8 },
    { in: ["duck"], out: { k: "duck", s: ["braise"] }, time: 9 },
    { in: ["noodles", "prawn"], out: { k: "laksa", s: [] }, time: 9 },
    { in: ["egg"], out: { k: "egg", s: ["boil"] }, time: 6 },
    { in: ["mee"], out: { k: "mee", s: ["boil"] }, time: 5 },
    { in: ["ribs"], out: { k: "ribs", s: ["simmer"] }, time: 9 },
    { in: ["kway"], out: { k: "kway", s: ["boil"] }, time: 5 },
    { in: ["rice"], out: { k: "porridge", s: [] }, time: 8 },
    { in: ["prawn"], out: { k: "prawn", s: ["boil"] }, time: 5 },
    { in: ["noodles"], out: { k: "noodles", s: ["boil"] }, time: 4 },
    { in: ["tofu"], out: { k: "tofu", s: ["boil"] }, time: 5 },
    { in: ["dough", "egg"], out: { k: "banmian", s: [] }, time: 7 },
    { in: ["beef"], out: { k: "rendang", s: [] }, time: 10 },
    { in: ["ondeh"], out: { k: "ondeh", s: ["boil"] }, time: 5 },
    { in: ["fish"], out: { k: "fishsoup", s: [] }, time: 6 },
    { in: ["mince"], out: { k: "mince", s: ["boil"] }, time: 5 },
    { in: ["chengtng"], out: { k: "chengtng", s: ["boil"] }, time: 5 },
    { in: ["chicken", "blacksauce"], out: { k: "chicken", s: ["braise"] }, time: 9 },
    { in: ["rice", "mutton"], out: { k: "biryani", s: [] }, time: 10 },
    { in: ["rice", "chicken"], out: { k: "chickenbiryani", s: [] }, time: 10 },
  ],
  wok: [
    { in: ["kwayteow", "egg"], out: { k: "ckt", s: [] }, time: 7 },
    { in: ["radish", "egg"], out: { k: "carrotwhite", s: [] }, time: 6 },
    { in: ["radish", "egg", "blacksauce"], out: { k: "carrotblack", s: [] }, time: 6 },
    { in: ["mee", "noodles", "prawn"], out: { k: "hokkienmee", s: [] }, time: 8 },
    { in: ["oyster", "egg"], out: { k: "orhluak", s: [] }, time: 6 },
    { in: ["ikanbilis"], out: { k: "ikanbilis", s: ["fry"] }, time: 5 },
    { in: ["chaipoh"], out: { k: "chaipoh", s: ["fry"] }, time: 4 },
    { in: ["porkchop"], out: { k: "porkchop", s: ["fry"] }, time: 6 },
    { in: ["cabbage"], out: { k: "cabbage", s: ["fry"] }, time: 4 },
    { in: ["mee", "egg"], out: { k: "meegoreng", s: [] }, time: 7 },
    { in: ["puff"], out: { k: "puff", s: ["fry"] }, time: 4 },
    { in: ["crab", "chilli"], out: { k: "chillicrab", s: [] }, time: 9 },
    { in: ["mantou"], out: { k: "mantou", s: ["fry"] }, time: 4 },
    { in: ["banana"], out: { k: "banana", s: ["fry"] }, time: 4 },
    { in: ["crab", "pepper"], out: { k: "peppercrab", s: [] }, time: 9 },
    { in: ["cakebatter", "oyster"], out: { k: "oystercake", s: [] }, time: 6 },
  ],
  cooker: [
    { in: ["rice"], out: { k: "rice", s: ["steam"] }, time: 8 },
    { in: ["santan"], out: { k: "santan", s: ["steam"] }, time: 8 },
    { in: ["batter"], out: { k: "chweekueh", s: [] }, time: 7 },
    { in: ["fish"], out: { k: "fish", s: ["steam"] }, time: 6 },
    { in: ["lapis"], out: { k: "lapis", s: ["steam"] }, time: 7 },
  ],
  grill: [
    { in: ["chicken"], out: { k: "chicken", s: ["roast"] }, time: 9 },
    { in: ["satayc"], out: { k: "satayc", s: ["grill"] }, time: 6 },
    { in: ["sataym"], out: { k: "sataym", s: ["grill"] }, time: 7 },
    { in: ["bread"], out: { k: "bread", s: ["toast"] }, time: 4 },
    { in: ["dough"], out: { k: "prata", s: [] }, time: 5 },
    { in: ["dough", "egg"], out: { k: "prataegg", s: [] }, time: 5 },
    { in: ["dough", "egg", "mutton"], out: { k: "murtabak", s: [] }, time: 7 },
    { in: ["duck"], out: { k: "duck", s: ["roast"] }, time: 9 },
    { in: ["stingray", "chilli"], out: { k: "sambalstingray", s: [] }, time: 7 },
    { in: ["wings"], out: { k: "wings", s: ["grill"] }, time: 6 },
    { in: ["thosai"], out: { k: "thosai", s: ["grill"] }, time: 5 },
    // Claypot rice cooks over charcoal and takes its time.
    { in: ["clayrice", "chicken", "lapcheong"], out: { k: "claypot", s: [] }, time: 12 },
  ],
};

// Stations you hold the use button at. `takes` lists the steps an item must already have.
export const WORK = {
  board: { verb: "chop", time: 1.6, takes: { chicken: [["poach"], ["roast"], ["braise"]], duck: [["braise"], ["roast"]], cucumber: [[]], charsiew: [[]], fruit: [[]], popiah: [[]] } },
  shaver: { verb: "shave", time: 1.8, takes: { ice: [[]] } },
  press: { verb: "press", time: 2, takes: { sugarcane: [[]] } },
};

export const sig = (item) => `${item.k}|${item.s.join(",")}`;
// Plates and takeaway boxes both hold a meal. Only plates come back dirty.
export const isPlate = (it) => it?.k === "plate" || it?.k === "box";
export const isBox = (it) => it?.k === "box";
export const isDrink = (it) => it?.k === "drink";
export const isTool = (it) => it?.k === "ext";

function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// ---------- Drinks, in the Kopi Compiler's own terms ----------

const MILKS = ["condensed", "evaporated", "none"];
const STRENGTHS = ["normal", "gao", "poh", "dilo"];

// [base, milk, sugar, strength, ice, halia, tarik, dino, bag], small enough to send around.
export function packDrink(s) {
  return [s.base, s.milk, s.sugar, s.strength, s.ice ? 1 : 0, s.halia ? 1 : 0, s.tarik ? 1 : 0, s.dino ? 1 : 0, s.bag ? 1 : 0];
}

// Builds a full Kopi Compiler state from a packed drink, or null if anything is off.
export function unpackDrink(a) {
  if (!Array.isArray(a) || a.length !== 9) return null;
  const [base, milk, sugar, strength, ice, halia, tarik, dino, bag] = a;
  const can = BASES[base];
  if (!can || !MILKS.includes(milk) || !STRENGTHS.includes(strength) || !Number.isInteger(sugar) || sugar < 0 || sugar > 3) return null;
  const s = defaultState();
  s.base = base;
  s.milk = can.milk ? milk : "condensed";
  s.strength = can.strength ? strength : "normal";
  s.sugar = sugar;
  s.halia = Boolean(halia) && can.extras.includes("halia");
  s.tarik = Boolean(tarik) && can.extras.includes("tarik");
  s.dino = Boolean(dino) && can.extras.includes("dino");
  s.ice = Boolean(ice) || s.dino;
  s.bag = Boolean(bag);
  return s;
}

export function drinksMatch(a, b) {
  const x = unpackDrink(a);
  const y = unpackDrink(b);
  return Boolean(x && y && sameDrink(x, y));
}

// ---------- Setting up ----------

// menu: a subset of the stall's dishes (the Centre Manager can take dishes off). prices: era money per dish.
// featured: dishes this hawker centre is famous for; they turn up more often when the stall sells them.
export function createSim(levelId, players, { era: eraId = "today", helpers = [], seed = 1965, tutorial = false, calm = false, focus = null, menu = null, prices = null, featured = null } = {}) {
  const level = levelById(levelId);
  const era = eraById(eraId);
  const map = parseLevel(level);
  const stations = map.stations.map((s) => ({
    ...s,
    item: null,
    prog: 0,
    plates: s.type === "rack" ? level.plates : 0,
    dirty: 0,
    sink: 0,
    items: [],
    recipe: null,
    cookT: 0,
    out: null,
    heat: 0,
    settle: 0,
    brew: null,
    brewT: 0,
    fire: 0,
    burnT: 0,
    spreadT: 0,
  }));
  for (const st of stations) if (st.type === "ext") st.item = { id: 0, k: "ext", s: [], b: 0 };
  const spawns = floorTiles(map).sort((a, b) => dist2(a, map) - dist2(b, map));
  const crew = [
    ...players.slice(0, 4).map((p) => ({ name: p.name, chef: chefById(p.chef)?.id ?? null, bot: null })),
    ...helpers.slice(0, 3).map((h) => ({ name: h.name, chef: null, bot: { role: h.role } })),
  ].slice(0, MAX_CHEFS);
  const sim = {
    level,
    era,
    map,
    stations,
    chefs: crew.map((c, i) => ({
      slot: i,
      name: c.name,
      chef: c.chef,
      x: spawns[i % spawns.length].x + 0.5,
      z: spawns[i % spawns.length].z + 0.5,
      vx: 0,
      vz: 0,
      fx: 0,
      fz: -1,
      hold: null,
      lastP: 0,
      lastB: 0,
      lastD: 0,
      lastT: 0,
      dashT: 0,
      dashCd: 0,
      using: false,
      bot: c.bot ? { ...c.bot, p: 0, b: 0, cool: 0, plan: null, path: null, goalKey: "", stuck: 0, skip: {} } : null,
    })),
    helpers: crew.filter((c) => c.bot).length,
    inputs: [],
    orders: [],
    nextOrder: 1,
    spawnT: 2,
    time: level.time,
    takings: 0,
    commission: 0,
    tips: 0,
    spent: 0,
    streak: 0,
    served: 0,
    missed: 0,
    dishesServed: {},
    returns: [],
    over: false,
    pl: null,
    nextId: 1,
    events: [],
    rand: rng(seed),
    lastDish: null,
    bestStreak: 0,
    flying: [],
    obstacle: null,
    puddles: [],
    powerCut: 0,
    rush: 0,
    chaosT: 55,
    chaosN: 0,
    calm: calm || tutorial,
    tutorial,
    focus: level.dishes.includes(focus) ? focus : null,
    featured: Array.isArray(featured) ? featured.filter((d) => level.dishes.includes(d)) : [],
    menu: Array.isArray(menu) && menu.some((d) => level.dishes.includes(d)) ? level.dishes.filter((d) => menu.includes(d)) : level.dishes,
    prices: prices && typeof prices === "object" ? Object.fromEntries(Object.entries(prices).filter(([d, v]) => DISHES[d] && Number.isFinite(v) && v > 0 && v < 1000)) : {},
  };
  if (tutorial) {
    sim.spawnT = 1e9;
    sim.orders.push({ id: sim.nextOrder++, d: "chickenrice", v: "steamed", t: 240, m: 240, dk: null, md: "plain", lg: "en" });
  }
  return sim;
}

function floorTiles(map) {
  const out = [];
  for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.grid[z][x] < 0) out.push({ x, z });
  return out;
}

function dist2(t, map) {
  return (t.x + 0.5 - map.w / 2) ** 2 + (t.z + 0.5 - map.h / 2) ** 2;
}

const newItem = (sim, k, s = []) => ({ id: sim.nextId++, k, s: [...s], b: 0 });
const newPlate = (sim, dirty = false) => ({ id: sim.nextId++, k: "plate", c: [], d: dirty ? 1 : 0 });
const newBox = (sim) => ({ id: sim.nextId++, k: "box", c: [], d: 0 });
const BOX_COST = 0.1;
const newDrink = (sim, dk) => ({ id: sim.nextId++, k: "drink", s: [], b: 0, dk });

// Raw means straight out of a crate: no steps, not burnt, not a dish in its own right.
export function isRaw(it) {
  return Boolean(it) && !isPlate(it) && !isDrink(it) && it.s.length === 0 && !it.b && INGREDIENTS[it.k]?.cost !== undefined;
}

function emit(sim, type, x, z, extra) {
  sim.events.push(extra === undefined ? [type, x, z] : [type, x, z, extra]);
}

const price = (sim, today) => Math.round(today * sim.era.price * 100) / 100;

// ---------- Movement ----------

function solid(sim, tx, tz) {
  const { map } = sim;
  if (tx < 0 || tz < 0 || tx >= map.w || tz >= map.h) return true;
  return map.grid[tz][tx] >= 0;
}

function blocked(sim, x, z) {
  for (let tz = Math.floor(z - RADIUS); tz <= Math.floor(z + RADIUS); tz++) {
    for (let tx = Math.floor(x - RADIUS); tx <= Math.floor(x + RADIUS); tx++) {
      if (!solid(sim, tx, tz)) continue;
      const cx = Math.max(tx, Math.min(x, tx + 1));
      const cz = Math.max(tz, Math.min(z, tz + 1));
      if ((x - cx) ** 2 + (z - cz) ** 2 < RADIUS * RADIUS - 1e-6) return true;
    }
  }
  return false;
}

function moveChef(sim, ch, input, dt) {
  let mx = clampNum(input?.mx);
  let mz = clampNum(input?.mz);
  const len = Math.hypot(mx, mz);
  if (len > 1) {
    mx /= len;
    mz /= len;
  }
  const speed = SPEED * (ch.bot ? 0.85 : 1);
  const slippery = sim.puddles.some((p) => ch.x > p.x && ch.x < p.x + p.w && ch.z > p.z && ch.z < p.z + p.h);
  const ease = Math.min(1, dt * (slippery ? 1.6 : 16));
  ch.vx += (mx * speed - ch.vx) * ease;
  ch.vz += (mz * speed - ch.vz) * ease;
  if (ch.dashT > 0) {
    ch.dashT -= dt;
    ch.vx = ch.fx * DASH_SPEED;
    ch.vz = ch.fz * DASH_SPEED;
  }
  if (len > 0.15) {
    const n = Math.hypot(mx, mz);
    ch.fx = mx / n;
    ch.fz = mz / n;
  }
  const nx = ch.x + ch.vx * dt;
  if (!blocked(sim, nx, ch.z)) ch.x = nx;
  else ch.vx = 0;
  const nz = ch.z + ch.vz * dt;
  if (!blocked(sim, ch.x, nz)) ch.z = nz;
  else ch.vz = 0;
}

function separate(sim) {
  const cs = sim.chefs;
  const ob = sim.obstacle;
  if (ob) {
    for (const c of cs) {
      const dx = c.x - ob.x;
      const dz = c.z - ob.z;
      const d = Math.hypot(dx, dz);
      const min = 0.55 + RADIUS;
      if (d >= min) continue;
      const ux = d > 1e-6 ? dx / d : 0;
      const uz = d > 1e-6 ? dz / d : 1;
      const nx = ob.x + ux * min;
      const nz = ob.z + uz * min;
      if (!blocked(sim, nx, c.z)) c.x = nx;
      if (!blocked(sim, c.x, nz)) c.z = nz;
    }
  }
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i];
      const b = cs[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      const min = RADIUS * 2;
      if (d >= min || d < 1e-6) continue;
      const push = (min - d) / 2;
      const ux = dx / d;
      const uz = dz / d;
      if (!blocked(sim, a.x - ux * push, a.z - uz * push)) {
        a.x -= ux * push;
        a.z -= uz * push;
      }
      if (!blocked(sim, b.x + ux * push, b.z + uz * push)) {
        b.x += ux * push;
        b.z += uz * push;
      }
    }
  }
}

function stationAt(sim, x, z) {
  const tx = Math.floor(x);
  const tz = Math.floor(z);
  if (tx < 0 || tz < 0 || tx >= sim.map.w || tz >= sim.map.h) return null;
  const i = sim.map.grid[tz][tx];
  return i >= 0 ? sim.stations[i] : null;
}

// The station a chef is facing, with a little forgiveness for diagonal facing.
export function targetOf(sim, ch) {
  const reach = 0.85;
  const direct = stationAt(sim, ch.x + ch.fx * reach, ch.z + ch.fz * reach);
  if (direct) return direct;
  if (Math.abs(ch.fx) >= Math.abs(ch.fz)) return stationAt(sim, ch.x + Math.sign(ch.fx) * reach, ch.z);
  return stationAt(sim, ch.x, ch.z + Math.sign(ch.fz) * reach);
}

// ---------- Cooking rules ----------

function multisetWithin(small, big) {
  const left = [...big];
  for (const k of small) {
    const i = left.indexOf(k);
    if (i < 0) return false;
    left.splice(i, 1);
  }
  return true;
}

export function cookCheck(type, kinds) {
  const recipes = COOK[type] ?? [];
  const exact = recipes.find((r) => r.in.length === kinds.length && multisetWithin(kinds, r.in));
  const bigger = recipes.some((r) => r.in.length > kinds.length && multisetWithin(kinds, r.in));
  return { exact, bigger, possible: recipes.some((r) => multisetWithin(kinds, r.in)) };
}

export function canAccept(st, item) {
  if (!isRaw(item) || st.out || st.recipe) return false;
  const kinds = [...st.items.map((it) => it.k), item.k];
  return cookCheck(st.type, kinds).possible;
}

// True if an open order needs this cooked thing (or something made from it).
function ordered(sim, out) {
  return sim.orders.some((o) =>
    wantedParts(o).some((p) => {
      const [k, steps] = p.split("|");
      const s = steps ? steps.split(",") : [];
      return k === out.k && out.s.every((x, i) => s[i] === x);
    }),
  );
}

function recheckHeat(st, sim = null) {
  const kinds = st.items.map((it) => it.k);
  const { exact, bigger } = cookCheck(st.type, kinds);
  st.settle = 0;
  if (!exact) return;
  if (bigger) {
    const big = (COOK[st.type] ?? []).filter((r) => r.in.length > kinds.length && multisetWithin(kinds, r.in));
    const waitLonger = sim && big.some((r) => ordered(sim, r.out)) && !ordered(sim, exact.out);
    st.settle = waitLonger ? SETTLE_WANTED : SETTLE;
    st.settleMax = st.settle;
  }
  else {
    st.recipe = exact;
    st.cookT = 0;
  }
}

export function needsWork(type, it) {
  const w = WORK[type];
  if (!w || !it || isPlate(it) || isDrink(it) || it.b) return false;
  const allowed = w.takes[it.k];
  return Boolean(allowed?.some((steps) => steps.join() === it.s.join()));
}

function addToPlate(plate, item) {
  if (!plate || plate.d || !item || isPlate(item) || isTool(item) || item.b || plate.c.length >= PLATE_ROOM) return false;
  plate.c.push(item);
  return true;
}

// ---------- Pick up / put down ----------

function interact(sim, ch, st) {
  const h = ch.hold;
  const at = [st.x + 0.5, st.z + 0.5];
  const say = (type, extra) => emit(sim, type, at[0], at[1], extra);
  if (st.fire > 0) {
    if (!isTool(h)) say("nope", sim.era.id === "1950s" ? "Fire! Grab the wet towel, hold use" : "Fire! Grab the extinguisher, hold use");
    return;
  }

  switch (st.type) {
    case "ext":
      if (!h && st.item) {
        ch.hold = st.item;
        st.item = null;
        say("pick");
      } else if (isTool(h) && !st.item) {
        st.item = h;
        ch.hold = null;
        say("drop");
      }
      return;

    case "crate": {
      const cost = price(sim, INGREDIENTS[st.ing].cost);
      if (!h) {
        ch.hold = newItem(sim, st.ing);
        sim.spent += cost;
        say("pick");
      } else if (isRaw(h) && h.k === st.ing) {
        ch.hold = null;
        sim.spent = Math.max(0, sim.spent - cost);
        say("drop");
      } else say("nope", "Crate only takes back its own");
      return;
    }

    case "urn":
      if (!h && !st.item && !st.brew) {
        // The player's own screen opens the kopi builder. Helpers send their order straight in.
        say("urn", ch.slot);
        return;
      }
      if (!h && st.brew) return say("nope", "Still pulling, wait ah");
    // falls through: an urn is also a counter for drinks
    case "counter":
    case "board":
    case "shaver":
    case "press":
      if (!h && st.item) {
        ch.hold = st.item;
        st.item = null;
        st.prog = 0;
        say("pick");
      } else if (isPlate(h) && st.item && !isPlate(st.item)) {
        if (addToPlate(h, st.item)) {
          st.item = null;
          st.prog = 0;
          say("plate");
        } else say("nope", h.d ? "Wash the plate first" : "Plate full already");
      } else if (h && !isPlate(h) && isPlate(st.item)) {
        if (addToPlate(st.item, h)) {
          ch.hold = null;
          say("plate");
        } else say("nope", st.item.d ? "Wash the plate first" : "Plate full already");
      } else if (h && !st.item && !(st.type === "urn" && st.brew)) {
        st.item = h;
        ch.hold = null;
        st.prog = 0;
        say("drop");
      } else if (h) say("nope", "No space here");
      return;

    case "pot":
    case "wok":
    case "cooker":
    case "grill":
      if (!h) {
        if (st.out) {
          ch.hold = st.out;
          st.out = null;
          st.heat = 0;
          st.burnT = 0;
          say("pick");
        } else if (st.items.length && !st.recipe) {
          ch.hold = st.items.pop();
          recheckHeat(st, sim);
          say("pick");
        }
      } else if (isPlate(h)) {
        if (st.out && addToPlate(h, st.out)) {
          st.out = null;
          st.heat = 0;
          say("plate");
        } else if (st.out?.b) say("nope", "Burnt already. Bin it lah");
        else say("nope", st.out ? "Plate full already" : "Nothing cooked yet");
      } else if (canAccept(st, h)) {
        st.items.push(h);
        ch.hold = null;
        recheckHeat(st, sim);
        say("cookin", st.type);
      } else if (st.out) say("nope", "Take the cooked one out first");
      else say("nope", `The ${st.type} cannot take that`);
      return;

    case "hatch":
      if ((isPlate(h) && !h.d && h.c.length) || isDrink(h)) serve(sim, ch, st);
      else if (h && !isPlate(h)) say("nope", "Put it on a plate first lah");
      else if (isPlate(h)) say("nope", h.d ? "Dirty plate? Aiyo" : "Empty plate cannot serve");
      return;

    case "rack":
      if (!h && st.plates > 0) {
        st.plates -= 1;
        ch.hold = newPlate(sim);
        say("pick");
      } else if (h?.k === "plate" && !h.d && !h.c.length) {
        st.plates += 1;
        ch.hold = null;
        say("drop");
      } else if (!h) say("nope", "No clean plates. Go wash!");
      return;

    case "boxes":
      if (!h) {
        ch.hold = newBox(sim);
        sim.spent += price(sim, BOX_COST);
        say("pick");
      } else if (isBox(h) && !h.c.length) {
        ch.hold = null;
        sim.spent = Math.max(0, sim.spent - price(sim, BOX_COST));
        say("drop");
      } else say("nope", "That is for takeaway boxes");
      return;

    case "return":
      if (!h && st.dirty > 0) {
        st.dirty -= 1;
        ch.hold = newPlate(sim, true);
        say("pick");
      } else if (h?.k === "plate" && h.d) {
        st.dirty += 1;
        ch.hold = null;
        say("drop");
      }
      return;

    case "sink":
      if (h?.k === "plate" && h.d) {
        st.sink += 1;
        ch.hold = null;
        say("drop");
      } else if (h?.k === "plate" && !h.d && !h.c.length) say("nope", "That one is clean already");
      return;

    case "bin":
      if (isTool(h)) say("nope", "Cannot throw that away lah");
      else if (h && !isPlate(h)) {
        ch.hold = null;
        say("bin");
      } else if (isPlate(h) && h.c.length) {
        h.c = [];
        say("bin");
      }
      return;
  }
}

// What an order wants, and whether a plate (or a lone drink) gives it exactly that.
export function orderParts(order) {
  return partsOf(order.d, order.v);
}

// Everything that has to be in the container, modifiers included.
export function wantedParts(order) {
  const parts = [...orderParts(order)];
  if (order.md === "extrachilli") parts.push("chilli|");
  return parts;
}

export function fulfils(order, offered, container = "plate") {
  const food = offered.filter((it) => !isDrink(it)).map(sig).sort().join(" + ");
  const drinks = offered.filter(isDrink);
  if (food !== wantedParts(order).sort().join(" + ")) return false;
  if (food && container !== (order.md === "takeaway" ? "box" : "plate")) return false;
  if (!order.dk) return drinks.length === 0;
  return drinks.length === 1 && drinksMatch(order.dk, drinks[0].dk);
}

function serve(sim, ch, st) {
  const offered = isPlate(ch.hold) ? ch.hold.c : [ch.hold];
  const container = isBox(ch.hold) ? "box" : "plate";
  const idx = sim.orders.findIndex((o) => fulfils(o, offered, container));
  if (idx < 0) {
    const nearly = sim.orders.find((o) => fulfils(o, offered, container === "box" ? "plate" : "box"));
    const why = nearly
      ? nearly.md === "takeaway"
        ? "Takeaway leh. Put it in a box"
        : "Eating here. Use a plate"
      : offered.some(isDrink)
        ? "Wrong kopi leh. Check the code"
        : sim.orders.some((o) => o.md === "extrachilli" || o.md === "nochilli")
          ? "Check the chilli: some want more, some want none"
          : "Uncle never order this leh";
    emit(sim, "wrong", st.x + 0.5, st.z + 0.5, why);
    return;
  }
  const order = sim.orders[idx];
  const dish = DISHES[order.d];
  const value = sim.prices[order.d] ?? price(sim, dish.price);
  // Speed bonus: quick service, in ticket order, keeps a streak going.
  sim.streak = idx === 0 ? sim.streak + 1 : 0;
  sim.bestStreak = Math.max(sim.bestStreak, sim.streak);
  const mult = 1 + Math.min(4, sim.streak) * 0.25;
  const rider = Number.isInteger(order.rd);
  const tip = Math.round(value * 0.3 * (order.t / order.m) * mult * 100) / 100;
  // App orders pay the platform its cut.
  if (rider) sim.commission = Math.round((sim.commission + value * COMMISSION) * 100) / 100;
  sim.takings += value;
  sim.tips += tip;
  sim.served += 1;
  sim.dishesServed[order.d] = (sim.dishesServed[order.d] ?? 0) + 1;
  sim.orders.splice(idx, 1);
  if (ch.hold?.k === "plate") sim.returns.push(RETURN_DELAY);
  ch.hold = null;
  emit(sim, "serve", st.x + 0.5, st.z + 0.5, [order.d, value, tip, mult]);
  if (sim.tutorial && sim.served === 1) sim.spawnT = 3;
}

// ---------- Holding the use button ----------

function work(sim, st, dt, speed = 1, ch = null) {
  const at = [st.x + 0.5, st.z + 0.5];
  if (ch && isTool(ch.hold)) {
    if (st.fire <= 0) return false;
    const before = Math.floor(st.fire / 0.15);
    st.fire -= dt * 0.9;
    if (Math.floor(st.fire / 0.15) !== before) emit(sim, "spray", ...at);
    if (st.fire <= 0) putOut(sim, st);
    return true;
  }
  if (st.fire > 0) return false;
  const w = WORK[st.type];
  if (w) {
    const it = st.item;
    if (!needsWork(st.type, it)) return false;
    const tick = st.type === "board" ? 0.25 : 0.3;
    const before = Math.floor(st.prog / tick);
    st.prog += dt * speed;
    if (Math.floor(st.prog / tick) !== before) emit(sim, w.verb, ...at);
    if (st.prog >= w.time) {
      it.s.push(w.verb);
      st.prog = 0;
      emit(sim, "done", ...at);
    }
    return true;
  }
  if (st.type === "sink" && st.sink > 0) {
    const before = Math.floor(st.prog / 0.3);
    st.prog += dt * speed;
    if (Math.floor(st.prog / 0.3) !== before) emit(sim, "scrub", ...at);
    if (st.prog >= sim.era.washTime) {
      st.prog = 0;
      st.sink -= 1;
      const rack = sim.stations.find((s) => s.type === "rack");
      if (rack) rack.plates += 1;
      emit(sim, "done", ...at);
    }
    return true;
  }
  return false;
}

// ---------- Orders ----------

function spawnOrder(sim) {
  const dishes = sim.menu ?? sim.level.dishes;
  let d = dishes[Math.floor(sim.rand() * dishes.length)];
  if (d === sim.lastDish && dishes.length > 1 && sim.rand() < 0.6) d = dishes[(dishes.indexOf(d) + 1) % dishes.length];
  if (sim.focus && dishes.includes(sim.focus) && sim.rand() < 0.4) d = sim.focus;
  else {
    const famous = sim.featured.filter((f) => dishes.includes(f));
    if (famous.length && sim.rand() < 0.45) d = famous[Math.floor(sim.rand() * famous.length)];
  }
  sim.lastDish = d;
  const dish = DISHES[d];
  const variants = Object.keys(dish.variants);
  const v = variants[Math.floor(sim.rand() * variants.length)];
  const m = dish.patience;
  const dk = dish.drink ? packDrink(randomOrder(sim.rand)) : null;
  const voice = d === "drink" ? { md: "plain", lg: "en" } : pickOrderVoice(sim.rand, sim.era.id, { chilli: Boolean(dish.chilli) });
  // Now and then a delivery rider comes for an app order: packed to go, and a little less patient.
  if (d !== "drink" && !sim.tutorial && sim.rand() < (RIDER_SHARE[sim.era.id] ?? 0)) {
    const rd = sim.rand() < GRAB_SHARE ? 0 : 1;
    const rm = Math.round(m * 0.85);
    sim.orders.push({ id: sim.nextOrder++, d, v, t: rm, m: rm, dk, md: "takeaway", lg: "en", rd });
    emit(sim, "order", 0, 0, d);
    return;
  }
  sim.orders.push({ id: sim.nextOrder++, d, v, t: m, m, dk, md: voice.md, lg: voice.lg });
  emit(sim, "order", 0, 0, d);
}

// ---------- One tick ----------

export function step(sim, dt) {
  if (sim.over) return;
  sim.time = Math.max(0, sim.time - dt);
  if (sim.time <= 30 && sim.time + dt > 30) emit(sim, "lastorders", 0, 0);

  sim.chefs.forEach((ch, i) => {
    if (ch.bot) sim.inputs[i] = think(sim, ch, dt);
    const input = sim.inputs[i];
    moveChef(sim, ch, input, dt);
    const st = targetOf(sim, ch);
    const p = Number.isInteger(input?.p) ? input.p : ch.lastP;
    if (p !== ch.lastP) {
      // Several presses can arrive in one network packet. Each counts once, up to a few.
      const presses = Math.min(3, Math.max(0, p - ch.lastP));
      ch.lastP = p;
      for (let k = 0; k < presses && st; k++) interact(sim, ch, st);
    }
    const b = input?.b;
    if (b && Number.isInteger(b.n) && b.n !== ch.lastB) {
      ch.lastB = b.n;
      const dk = unpackDrink(b.d) ? b.d : null;
      if (st?.type === "urn" && dk && !st.item && !st.brew && !ch.hold) {
        st.brew = dk;
        st.brewT = 0;
        sim.spent += price(sim, DRINK_COST);
        emit(sim, "pour", st.x + 0.5, st.z + 0.5);
      }
    }
    ch.using = Boolean(input?.u) && st ? work(sim, st, dt, 1, ch) : false;
    // Dash and throw.
    const d = Number.isInteger(input?.d) ? input.d : ch.lastD;
    if (d !== ch.lastD) {
      ch.lastD = d;
      if (ch.dashCd <= 0) {
        ch.dashT = DASH_TIME;
        ch.dashCd = DASH_COOL;
        emit(sim, "dash", ch.x, ch.z);
      }
    }
    ch.dashCd = Math.max(0, ch.dashCd - dt);
    const t = Number.isInteger(input?.t) ? input.t : ch.lastT;
    if (t !== ch.lastT) {
      ch.lastT = t;
      if (isRaw(ch.hold)) {
        sim.flying.push({ it: ch.hold, x: ch.x + ch.fx * 0.4, z: ch.z + ch.fz * 0.4, y: 1.0, vx: ch.fx * THROW_SPEED, vz: ch.fz * THROW_SPEED, vy: 2.0, from: ch.slot, age: 0 });
        ch.hold = null;
        emit(sim, "throw", ch.x, ch.z);
      } else if (ch.hold) emit(sim, "nope", ch.x, ch.z, "Only raw ingredients can fly");
    }
  });
  separate(sim);
  flyAll(sim, dt);
  chaos(sim, dt);

  for (const st of sim.stations) {
    if (st.fire > 0) {
      burnOn(sim, st, dt);
      continue;
    }
    if (st.out?.b && COOK[st.type]) {
      st.burnT += dt;
      if (st.burnT >= FIRE_AFTER) ignite(sim, st);
    }
    if (st.settle > 0) {
      st.settle -= dt;
      if (st.settle <= 0) {
        const { exact } = cookCheck(
          st.type,
          st.items.map((it) => it.k),
        );
        st.settle = 0;
        if (exact) {
          st.recipe = exact;
          st.cookT = 0;
        }
      }
    }
    if (st.recipe && !(st.type === "cooker" && sim.powerCut > 0)) {
      st.cookT += dt;
      if (st.cookT >= st.recipe.time) {
        st.out = newItem(sim, st.recipe.out.k, st.recipe.out.s);
        st.items = [];
        st.recipe = null;
        st.heat = 0;
        emit(sim, "done", st.x + 0.5, st.z + 0.5);
      }
    } else if (!st.recipe && st.out && !st.out.b && COOK[st.type] && st.type !== "cooker") {
      // Rice cookers and steamers keep warm. Everything else burns.
      st.heat += dt;
      if (st.heat >= BURN_AFTER) {
        st.out.b = 1;
        emit(sim, "burn", st.x + 0.5, st.z + 0.5);
      }
    }
    if (st.brew) {
      st.brewT += dt;
      if (st.brewT >= BREW_TIME) {
        st.item = newDrink(sim, st.brew);
        st.brew = null;
        emit(sim, "done", st.x + 0.5, st.z + 0.5);
      }
    }
    if (st.type === "sink" && sim.era.robotSink && st.sink > 0) work(sim, st, dt, 0.45);
  }

  for (let i = sim.returns.length - 1; i >= 0; i--) {
    sim.returns[i] -= dt;
    if (sim.returns[i] <= 0) {
      sim.returns.splice(i, 1);
      const ret = sim.stations.find((s) => s.type === "return");
      if (ret) ret.dirty += 1;
      emit(sim, "dirty", ret ? ret.x + 0.5 : 0, ret ? ret.z + 0.5 : 0);
    }
  }

  for (let i = sim.orders.length - 1; i >= 0; i--) {
    const o = sim.orders[i];
    o.t -= dt;
    if (o.t <= 0) {
      sim.orders.splice(i, 1);
      sim.missed += 1;
      sim.streak = 0;
      emit(sim, "expire", 0, 0, o.d);
    }
  }
  sim.spawnT -= dt;
  const max = sim.level.maxOrders + (sim.rush > 0 ? 1 : 0);
  const every = sim.level.spawnEvery * (sim.rush > 0 ? 0.45 : 1);
  if (sim.time > 0 && sim.orders.length < max && (sim.spawnT <= 0 || (sim.orders.length === 0 && sim.spawnT < every - 4))) {
    spawnOrder(sim);
    sim.spawnT = every * (0.8 + sim.rand() * 0.4);
  }

  if (sim.time <= 0) {
    sim.over = true;
    sim.pl = profitAndLoss({ takings: sim.takings, tips: sim.tips, spent: sim.spent, helpers: sim.helpers, era: sim.era, commission: sim.commission });
    emit(sim, "end", 0, 0);
  }
}

// ---------- Fire ----------

function ignite(sim, st) {
  if (NO_FIRE.has(st.type) || st.fire > 0) return;
  st.fire = 0.35;
  st.spreadT = 0;
  emit(sim, "fire", st.x + 0.5, st.z + 0.5);
}

function putOut(sim, st) {
  st.fire = 0;
  st.burnT = 0;
  st.spreadT = 0;
  if (st.out?.b) {
    st.out = null;
    st.heat = 0;
  }
  if (st.item?.b) st.item = null;
  emit(sim, "fizz", st.x + 0.5, st.z + 0.5);
}

function burnOn(sim, st, dt) {
  st.fire = Math.min(1, st.fire + dt * 0.06);
  if (st.item && st.fire > 0.8 && !isPlate(st.item) && !isTool(st.item)) st.item.b = 1;
  if (st.fire < 0.6) return;
  st.spreadT += dt;
  if (st.spreadT < FIRE_SPREAD) return;
  st.spreadT = 0;
  const next = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dz]) => sim.map.grid[st.z + dz]?.[st.x + dx])
    .filter((i) => i >= 0)
    .map((i) => sim.stations[i])
    .filter((n) => n.fire <= 0 && !NO_FIRE.has(n.type) && approaches(sim.map, n).length);
  if (next.length) ignite(sim, next[Math.floor(sim.rand() * next.length)]);
}

// ---------- Thrown ingredients ----------

function flyAll(sim, dt) {
  for (let i = sim.flying.length - 1; i >= 0; i--) {
    const f = sim.flying[i];
    f.age += dt;
    f.x += f.vx * dt;
    f.z += f.vz * dt;
    f.vy -= 9 * dt;
    f.y += f.vy * dt;
    const done = () => sim.flying.splice(i, 1);
    // A teammate with empty hands catches it.
    const catcher = sim.chefs.find((c) => c.slot !== f.from && !c.hold && Math.hypot(c.x - f.x, c.z - f.z) < 0.5);
    if (catcher && f.age > 0.05) {
      catcher.hold = f.it;
      emit(sim, "catch", f.x, f.z);
      done();
      continue;
    }
    const st = stationAt(sim, f.x, f.z);
    if (st && f.y < 1.7) {
      if (st.fire <= 0 && COOK[st.type] && canAccept(st, f.it)) {
        st.items.push(f.it);
        recheckHeat(st, sim);
        emit(sim, "cookin", st.x + 0.5, st.z + 0.5, st.type);
      } else if (st.fire <= 0 && ["counter", "board", "shaver", "press"].includes(st.type) && !st.item) {
        st.item = f.it;
        st.prog = 0;
        emit(sim, "drop", st.x + 0.5, st.z + 0.5);
      } else if (st.fire <= 0 && isPlate(st.item) && addToPlate(st.item, f.it)) {
        emit(sim, "plate", st.x + 0.5, st.z + 0.5);
      } else emit(sim, "splat", f.x, f.z);
      done();
      continue;
    }
    if (f.y <= 0.15 || f.age > 2) {
      emit(sim, "splat", f.x, f.z);
      done();
    }
  }
}

// ---------- Kitchen chaos, a different kind per era ----------

const CHAOS = { "1950s": ["trishaw", "monsoon"], "1980s": ["powercut", "monsoon"], today: ["rush", "monsoon"], 2065: ["shuffle"] };

function floorRows(sim) {
  const rows = [];
  for (let z = 0; z < sim.map.h; z++) {
    let run = 0;
    for (let x = 1; x < sim.map.w - 1; x++) run += sim.map.grid[z][x] === -1 ? 1 : 0;
    if (run === sim.map.w - 2) rows.push(z);
  }
  return rows;
}

function startChaos(sim) {
  const list = CHAOS[sim.era.id] ?? [];
  if (!list.length) return;
  const kind = list[sim.chaosN++ % list.length];
  if (kind === "trishaw") {
    const rows = floorRows(sim);
    if (!rows.length) return;
    const z = rows[Math.floor(sim.rand() * rows.length)];
    sim.obstacle = { x: -0.6, z: z + 0.5, vx: 2.2 };
  } else if (kind === "monsoon") {
    const spots = [];
    for (let z = 1; z < sim.map.h - 2; z++) for (let x = 1; x < sim.map.w - 2; x++) {
      if ([[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx, dz]) => sim.map.grid[z + dz][x + dx] === -1)) spots.push({ x, z });
    }
    if (!spots.length) return;
    const p = spots[Math.floor(sim.rand() * spots.length)];
    sim.puddles.push({ x: p.x, z: p.z, w: 2, h: 2, t: 25 });
  } else if (kind === "powercut") {
    sim.powerCut = 10;
  } else if (kind === "rush") {
    sim.rush = 22;
    sim.spawnT = Math.min(sim.spawnT, 1);
  } else if (kind === "shuffle") {
    const counters = sim.stations.filter((s) => s.type === "counter" && approaches(sim.map, s).length && s.fire <= 0);
    const full = counters.filter((s) => s.item && !isTool(s.item));
    const empty = counters.filter((s) => !s.item);
    for (let n = 0; n < 3 && full.length && empty.length; n++) {
      const from = full.splice(Math.floor(sim.rand() * full.length), 1)[0];
      const to = empty.splice(Math.floor(sim.rand() * empty.length), 1)[0];
      to.item = from.item;
      from.item = null;
      empty.push(from);
    }
  }
  emit(sim, "chaos", 0, 0, kind);
}

function chaos(sim, dt) {
  if (sim.obstacle) {
    sim.obstacle.x += sim.obstacle.vx * dt;
    if (sim.obstacle.x > sim.map.w + 0.6) sim.obstacle = null;
  }
  for (let i = sim.puddles.length - 1; i >= 0; i--) if ((sim.puddles[i].t -= dt) <= 0) sim.puddles.splice(i, 1);
  if (sim.powerCut > 0 && (sim.powerCut -= dt) <= 0) emit(sim, "power", 0, 0);
  if (sim.rush > 0) sim.rush -= dt;
  if (sim.calm) return;
  sim.chaosT -= dt;
  if (sim.chaosT <= 0 && sim.time > 20) {
    startChaos(sim);
    sim.chaosT = 40 + sim.rand() * 15;
  }
}

export function starsFor(sim) {
  if (!sim.pl) return 0;
  return sim.level.stars.filter((s) => sim.pl.profit >= s * sim.era.price).length;
}

// ---------- Snapshots: what everyone else gets to see ----------

const r2 = (n) => Math.round(n * 100) / 100;

export function packItem(it) {
  if (!it) return null;
  if (isPlate(it)) return { k: it.k, d: it.d, c: it.c.map(packItem) };
  if (isDrink(it)) return { k: "drink", dk: it.dk };
  return { k: it.k, s: it.s.join(","), b: it.b };
}

function packStation(st, sim) {
  const o = {};
  if (st.fire > 0) o.fi = r2(st.fire);
  if (st.item) o.it = packItem(st.item);
  const w = WORK[st.type];
  if (st.prog > 0) o.p = r2(st.prog / (w ? w.time : sim.era.washTime));
  if (st.type === "rack") o.n = st.plates;
  if (st.type === "return") o.n = st.dirty;
  if (st.type === "sink") o.n = st.sink;
  if (st.brew) {
    o.p = r2(st.brewT / BREW_TIME);
    o.bw = st.brew;
  }
  if (COOK[st.type]) {
    if (st.items.length) o.in = st.items.map((it) => it.k);
    if (st.recipe) o.ck = r2(st.cookT / st.recipe.time);
    if (st.settle > 0) o.se = r2(1 - st.settle / (st.settleMax || SETTLE));
    if (st.out) {
      o.out = packItem(st.out);
      if (!st.out.b && st.type !== "cooker" && st.heat > BURN_AFTER * 0.5) o.w = r2((st.heat - BURN_AFTER * 0.5) / (BURN_AFTER * 0.5));
    }
  }
  return o;
}

export function snapshot(sim) {
  return {
    lv: sim.level.id,
    er: sim.era.id,
    tm: r2(sim.time),
    co: r2(sim.takings),
    tp: r2(sim.tips),
    sp: r2(sim.spent),
    sk: sim.streak,
    bs: sim.bestStreak,
    f: sim.flying.map((f) => [r2(f.x), r2(f.y), r2(f.z), packItem(f.it)]),
    ob: sim.obstacle ? [r2(sim.obstacle.x), r2(sim.obstacle.z)] : null,
    pd: sim.puddles.map((p) => [p.x, p.z, p.w, p.h]),
    pc: sim.powerCut > 0 ? 1 : 0,
    ru: sim.rush > 0 ? 1 : 0,
    tu: sim.tutorial ? 1 : 0,
    sv: sim.served,
    ms: sim.missed,
    over: sim.over,
    st: sim.over ? starsFor(sim) : 0,
    pl: sim.pl,
    ds: sim.dishesServed,
    o: sim.orders.map((o) => [o.id, o.d, r2(o.t), o.m, o.v, o.dk, o.md ?? "plain", o.lg ?? "en", Number.isInteger(o.rd) ? o.rd : -1]),
    c: sim.chefs.map((ch) => [ch.slot, r2(ch.x), r2(ch.z), r2(ch.fx), r2(ch.fz), packItem(ch.hold), ch.using ? 1 : 0, r2(Math.hypot(ch.vx, ch.vz)), ch.bot?.role ?? 0, ch.dashT > 0 ? 1 : 0, ch.bot ? ch.name : ch.chef]),
    s: sim.stations.map((st) => packStation(st, sim)),
  };
}

export function drainEvents(sim) {
  const ev = sim.events;
  sim.events = [];
  return ev;
}

function clampNum(n) {
  return Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0;
}

// Inputs from the network are checked here before the kitchen ever sees them.
export function cleanInput(raw) {
  if (!raw || typeof raw !== "object") return { mx: 0, mz: 0, p: 0, u: false };
  const out = {
    mx: clampNum(Number(raw.mx)),
    mz: clampNum(Number(raw.mz)),
    p: Number.isInteger(raw.p) && raw.p >= 0 && raw.p < 1e9 ? raw.p : 0,
    u: raw.u === true || raw.u === 1,
  };
  for (const k of ["d", "t"]) if (Number.isInteger(raw[k]) && raw[k] >= 0 && raw[k] < 1e9) out[k] = raw[k];
  if (raw.b && typeof raw.b === "object" && Number.isInteger(raw.b.n) && raw.b.n > 0 && raw.b.n < 1e9 && unpackDrink(raw.b.d)) {
    out.b = { n: raw.b.n, d: raw.b.d.slice(0, 9) };
  }
  return out;
}

export { approaches };
