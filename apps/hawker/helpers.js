// Hired help. Each helper is a chef with one job and a few simple rules, run by whoever hosts the kitchen,
// so they work the same in solo, local and online games. Every tick a helper looks at the kitchen, picks
// the most useful thing its job allows, walks there and presses the same buttons a player would.

import { approaches } from "./levels.js";
import { canAccept, COOK, drinksMatch, isDrink, isPlate, isRaw, needsWork, orderParts, sig, targetOf, WORK } from "./sim.js";

export const ROLES = {
  washer: { name: "Dishwasher", job: "Brings dirty plates to the sink and washes them.", needs: ["sink", "return"], color: "#8fb8c9" },
  slicer: { name: "Slicer", job: "Slices chicken, duck, char siew and cucumber.", needs: ["board"], color: "#c9a08f", work: "board" },
  iceman: { name: "Ice shaver", job: "Shaves ice blocks for the desserts.", needs: ["shaver"], color: "#a8d8e8", work: "shaver" },
  caneman: { name: "Sugarcane presser", job: "Feeds sugarcane through the press for juice orders.", needs: ["press"], color: "#9ab04a", work: "press" },
  kaya: { name: "Toast auntie", job: "Spreads kaya and butter on the toast as it comes off the grill.", needs: ["kaya"], color: "#c6a23a", work: "kaya" },
  wok: { name: "Wok cook", job: "Loads the wok with whatever the orders need.", needs: ["wok"], color: "#d9a441", station: "wok" },
  pot: { name: "Pot cook", job: "Keeps the pots going: poaching, braising, boiling.", needs: ["pot"], color: "#b5a37a", station: "pot" },
  cooker: { name: "Rice cook", job: "Keeps rice, santan rice and chwee kueh steaming.", needs: ["cooker"], color: "#e8dcb5", station: "cooker" },
  grill: { name: "Grill cook", job: "Keeps the grill loaded: satay, toast, prata, roast chicken.", needs: ["grill"], color: "#c98a5a", station: "grill" },
  kopi: { name: "Kopi uncle", job: "Pulls the drinks in the orders and serves the drink-only ones.", needs: ["urn"], color: "#7a5a3a" },
};

export const NAMES = ["Ah Seng", "Auntie Mei", "Uncle Rahim", "Kak Noor", "Mr Kumar", "Ah Boon", "Auntie Lily", "Encik Osman"];

// Roles that make sense in a kitchen: the stations must exist, and a cook's station must be on the menu.
export function rolesFor(map, level, partsInMenu) {
  const types = new Set(map.stations.map((s) => s.type));
  return Object.entries(ROLES)
    .filter(([id, r]) => r.needs.every((t) => types.has(t)))
    .filter(([id, r]) => !r.station || COOK[r.station].some((rec) => partsInMenu.some((p) => feedsSig(rec.out, p))))
    .map(([id]) => id);
}

// ---------- Reading the kitchen ----------

const splitSig = (s) => {
  const [k, steps] = s.split("|");
  return { k, s: steps ? steps.split(",") : [] };
};

// True if an item (or a recipe output) is on its way to becoming the target component.
export function feedsSig(item, target) {
  const t = splitSig(target);
  if (item.k !== t.k || item.b) return false;
  return item.s.every((step, i) => t.s[i] === step);
}

function* everyItem(sim) {
  for (const st of sim.stations) {
    if (st.item) yield* withPlate(st.item);
    if (st.out) yield st.out;
    for (const it of st.items) yield it;
    if (st.recipe) yield { k: st.recipe.out.k, s: st.recipe.out.s, b: 0 };
  }
  for (const ch of sim.chefs) if (ch.hold) yield* withPlate(ch.hold);
}

function* withPlate(it) {
  if (isPlate(it)) yield* it.c;
  else yield it;
}

// How many more of a component the open orders need than the kitchen already has on the way.
function deficit(sim, target) {
  const need = sim.orders.reduce((n, o) => n + orderParts(o).filter((p) => p === target).length, 0);
  if (!need) return 0;
  let have = 0;
  for (const it of everyItem(sim)) if (!isDrink(it) && feedsSig(it, target)) have++;
  return need - have;
}

function drinkDeficit(sim, dk) {
  const need = sim.orders.filter((o) => o.dk && drinksMatch(o.dk, dk)).length;
  let have = 0;
  for (const it of everyItem(sim)) if (isDrink(it) && drinksMatch(it.dk, dk)) have++;
  for (const st of sim.stations) if (st.brew && drinksMatch(st.brew, dk)) have++;
  return need - have;
}

const of = (sim, type) => sim.stations.filter((s) => s.type === type);
const crateFor = (sim, k) => sim.stations.find((s) => s.type === "crate" && s.ing === k);
const near = (sim, ch, list) => list.sort((a, b) => (a.x - ch.x) ** 2 + (a.z - ch.z) ** 2 - ((b.x - ch.x) ** 2 + (b.z - ch.z) ** 2))[0];

function freeCounter(sim, ch, nearTo = ch) {
  const free = of(sim, "counter").filter((s) => !s.item && approaches(sim.map, s).length);
  return near(sim, nearTo, free);
}

// ---------- Jobs: each returns a goal { st, act: "press" | "hold" | "brew", dk } or null ----------

function putDown(sim, ch) {
  const c = freeCounter(sim, ch);
  if (c) return { st: c, act: "press" };
  const bin = of(sim, "bin")[0];
  return bin ? { st: bin, act: "press" } : null;
}

function washer(sim, ch) {
  const h = ch.hold;
  const sink = of(sim, "sink")[0];
  if (isPlate(h) && h.d) return sink ? { st: sink, act: "press" } : null;
  if (h) return putDown(sim, ch);
  const busy = of(sim, "sink").find((s) => s.sink > 0);
  if (busy) return { st: busy, act: "hold" };
  const ret = of(sim, "return").find((s) => s.dirty > 0);
  if (ret) return { st: ret, act: "press" };
  return null;
}

function worker(sim, ch, type) {
  const h = ch.hold;
  const verb = WORK[type].verb;
  const benches = of(sim, type);
  if (h) {
    if (needsWork(type, h)) {
      const free = near(sim, ch, benches.filter((s) => !s.item));
      return free ? { st: free, act: "press" } : null;
    }
    return putDown(sim, ch);
  }
  const working = near(sim, ch, benches.filter((s) => needsWork(type, s.item)));
  if (working) return { st: working, act: "hold" };
  // Something cooked and waiting to be sliced, on the heat or on a counter.
  const waiting = sim.stations.filter((s) => {
    const it = s.out ?? (s.type === "counter" ? s.item : null);
    return it && needsWork(type, it) && deficit(sim, `${it.k}|${[...it.s, verb].join(",")}`) >= 0;
  });
  const pick = near(sim, ch, waiting);
  if (pick && benches.some((s) => !s.item)) return { st: pick, act: "press" };
  // Raw things that only need this job, straight from the crate.
  for (const [k, allowed] of Object.entries(WORK[type].takes)) {
    if (!allowed.some((steps) => steps.length === 0)) continue;
    const crate = crateFor(sim, k);
    if (crate && deficit(sim, `${k}|${verb}`) > 0 && benches.some((s) => !s.item)) return { st: crate, act: "press" };
  }
  return null;
}

function cook(sim, ch, type) {
  const bot = ch.bot;
  const h = ch.hold;
  const plan = bot.plan;
  if (plan && (plan.st.recipe || plan.st.out || !plan.st.items.every((it) => plan.recipe.in.includes(it.k)))) bot.plan = null;

  if (h) {
    if (bot.plan && canAccept(bot.plan.st, h) && bot.plan.recipe.in.includes(h.k)) return { st: bot.plan.st, act: "press" };
    const any = of(sim, type).find((s) => canAccept(s, h));
    if (any && isRaw(h)) return { st: any, act: "press" };
    return putDown(sim, ch);
  }

  if (!bot.plan) {
    // The oldest order first: find a component this station can start that nobody is making yet.
    outer: for (const o of sim.orders) {
      for (const target of orderParts(o)) {
        if (deficit(sim, target) <= 0) continue;
        for (const recipe of COOK[type]) {
          if (!feedsSig(recipe.out, target)) continue;
          const st = of(sim, type).find((s) => !s.out && !s.recipe && s.settle <= 0 && s.items.every((it) => recipe.in.includes(it.k)) && !bot.skip[s.i]);
          if (st && recipe.in.every((k) => crateFor(sim, k))) {
            bot.plan = { st, recipe };
            break outer;
          }
        }
      }
    }
  }
  if (bot.plan) {
    const have = bot.plan.st.items.map((it) => it.k);
    // Rarest ingredient first (black sauce before radish before egg), so a smaller recipe never
    // starts cooking while the helper is still fetching the last thing.
    const uses = (k) => COOK[type].filter((r) => r.in.includes(k)).length;
    const missing = [...bot.plan.recipe.in].sort((a, b) => uses(a) - uses(b));
    for (const k of have) {
      const i = missing.indexOf(k);
      if (i >= 0) missing.splice(i, 1);
    }
    if (!missing.length) {
      bot.plan = null;
      return null;
    }
    return { st: crateFor(sim, missing[0]), act: "press" };
  }
  // Rescue food that has sat on the heat for a while, before it burns.
  if (type !== "cooker") {
    const hot = of(sim, type).find((s) => s.out && !s.out.b && s.heat > 5);
    if (hot && freeCounter(sim, ch)) return { st: hot, act: "press" };
  }
  return null;
}

function kopi(sim, ch) {
  const h = ch.hold;
  const urns = of(sim, "urn");
  if (isDrink(h)) {
    const order = sim.orders.find((o) => o.dk && drinksMatch(o.dk, h.dk));
    if (!order) return { st: of(sim, "bin")[0], act: "press" };
    if (order.d === "drink") return { st: of(sim, "hatch")[0], act: "press" };
    const c = freeCounter(sim, ch, of(sim, "hatch")[0]);
    return c ? { st: c, act: "press" } : null;
  }
  if (h) return putDown(sim, ch);
  const ready = urns.find((u) => isDrink(u.item));
  if (ready) return { st: ready, act: "press" };
  for (const o of sim.orders) {
    if (!o.dk || drinkDeficit(sim, o.dk) <= 0) continue;
    const idle = near(sim, ch, urns.filter((u) => !u.item && !u.brew));
    if (idle) return { st: idle, act: "brew", dk: o.dk };
  }
  return null;
}

function decide(sim, ch) {
  const role = ch.bot.role;
  const r = ROLES[role];
  if (role === "washer") return washer(sim, ch);
  if (role === "kopi") return kopi(sim, ch);
  if (r?.work) return worker(sim, ch, r.work);
  if (r?.station) return cook(sim, ch, r.station);
  return null;
}

// ---------- Walking ----------

export function tileOf(sim, ch) {
  const x = Math.floor(ch.x);
  const z = Math.floor(ch.z);
  if (sim.map.grid[z]?.[x] === -1) return { x, z };
  // Pushed against a counter: use the nearest floor tile.
  let best = null;
  for (let tz = 0; tz < sim.map.h; tz++) {
    for (let tx = 0; tx < sim.map.w; tx++) {
      if (sim.map.grid[tz][tx] !== -1) continue;
      const d = (tx + 0.5 - ch.x) ** 2 + (tz + 0.5 - ch.z) ** 2;
      if (!best || d < best.d) best = { x: tx, z: tz, d };
    }
  }
  return best;
}

// Breadth first search over floor tiles to the nearest tile beside the station.
export function route(sim, from, st) {
  const goals = new Map(approaches(sim.map, st).map((a) => [`${a.x},${a.z}`, a]));
  if (!goals.size || !from) return null;
  const prev = new Map([[`${from.x},${from.z}`, null]]);
  const q = [from];
  while (q.length) {
    const cur = q.shift();
    const key = `${cur.x},${cur.z}`;
    if (goals.has(key)) {
      const path = [];
      for (let k = key; k; k = prev.get(k)) {
        const [x, z] = k.split(",").map(Number);
        path.unshift({ x, z });
      }
      return { path, face: goals.get(key) };
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const nz = cur.z + dz;
      const nk = `${nx},${nz}`;
      if (sim.map.grid[nz]?.[nx] !== -1 || prev.has(nk)) continue;
      prev.set(nk, key);
      q.push({ x: nx, z: nz });
    }
  }
  return null;
}

// One tick of a helper: returns the input a player would have sent.
export function think(sim, ch, dt) {
  const bot = ch.bot;
  bot.cool = Math.max(0, bot.cool - dt);
  for (const k of Object.keys(bot.skip)) if ((bot.skip[k] -= dt) <= 0) delete bot.skip[k];
  if (bot.cool > 0) return idle(bot);
  let goal = decide(sim, ch);
  if (goal?.st?.fire > 0) goal = null; // fires are a job for the players
  return walkTo(sim, ch, goal, dt, bot);
}

function idle(bot) {
  return { mx: 0, mz: 0, p: bot.p, u: false, b: bot.b ? { n: bot.b, d: bot.lastDk } : undefined };
}

// Walks a chef to a goal { st, act, dk } and acts there. `bot` keeps the walking state between ticks,
// so the same legs serve hired help and the guide-following test player.
export function walkTo(sim, ch, goal, dt, bot) {
  const input = idle(bot);
  if (bot.cool > 0) return input;
  if (!goal?.st) {
    bot.path = null;
    return input;
  }
  const key = `${goal.st.i}:${goal.act}`;
  if (key !== bot.goalKey || !bot.path || bot.replan <= 0) {
    bot.goalKey = key;
    bot.path = route(sim, tileOf(sim, ch), goal.st);
    bot.replan = 0.5;
    bot.stuck = 0;
  }
  bot.replan -= dt;
  if (!bot.path) {
    bot.skip[goal.st.i] = 3;
    return input;
  }
  const { path, face } = bot.path;
  const last = path[path.length - 1];
  const here = { x: Math.floor(ch.x), z: Math.floor(ch.z) };
  // Drop waypoints already reached.
  while (path.length > 1 && path[0].x === here.x && path[0].z === here.z) path.shift();
  const nextTile = path[0];
  const atEnd = path.length === 1 && Math.abs(last.x + 0.5 - ch.x) < 0.22 && Math.abs(last.z + 0.5 - ch.z) < 0.22;
  if (!atEnd) {
    const tx = nextTile.x + 0.5 - ch.x;
    const tz = nextTile.z + 0.5 - ch.z;
    const d = Math.hypot(tx, tz) || 1;
    input.mx = tx / d;
    input.mz = tz / d;
    bot.stuck += dt;
    if (bot.stuck > 5) {
      bot.skip[goal.st.i] = 2;
      bot.path = null;
    }
    return input;
  }
  // Arrived: face the station and act.
  ch.fx = face.fx;
  ch.fz = face.fz;
  bot.stuck = 0;
  if (targetOf(sim, ch) !== goal.st) return input;
  if (goal.act === "press") {
    bot.p += 1;
    input.p = bot.p;
    bot.cool = 0.25;
  } else if (goal.act === "hold") {
    input.u = true;
  } else if (goal.act === "brew") {
    bot.b += 1;
    bot.lastDk = goal.dk;
    input.b = { n: bot.b, d: goal.dk };
    bot.cool = 0.4;
  }
  return input;
}
