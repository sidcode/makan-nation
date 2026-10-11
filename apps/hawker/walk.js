// The customer mode: you, a makan list, and a hawker centre full of people. Chope a table, queue at the
// stalls, carry your trays back, eat, and clear up the way your era did. Diners, delivery riders and
// cleaners go about their own business around you. Pure data with no DOM and no Three.js, like the kitchen.

import { compile, describe, randomOrder, sameDrink } from "../kopi/compiler.js";
import { DISHES } from "./dishes.js";
import { eraById } from "./eras.js";
import { findPath, lineClear, menuById, queueSpot, walkable } from "./floorplan.js";

export const WALK = 3.2; // metres a second: a brisk, hungry walk
const DASH = 5.6;
const NPC = 1.35;
const ME_R = 0.22; // under half a grid cell, so a cell next to a wall still fits you
const REACH = 1.7;

// What each era does differently, from the sources in walkui.js:
// chope: what you leave on a table to keep it. Tissue choping is in print from 2001 (a 1994 article
//   may be earlier); nothing names a choping object before 1992, so the older eras have none.
// ownTables: in the 1980s some hawkers treated nearby tables as their own and shooed other stalls'
//   customers, despite the free seating rule (1982); People's Park was the last to switch, in 1992.
// trays: clearing your own tray, compulsory from 1 September 2021; 93% did by April 2024.
// cleaners: the ministry hired contract cleaners in the 1980s; 2065's robots are a guess, after NEA's
//   2023 offer to co-fund table-cleaning robots.
// riders: GrabFood and foodpanda today (Deliveroo left on 4 March 2026). None at centres before.
// roving: in the street era the hawker came to you, like the tok tok mee man with his cart.
// busy: the share of tables taken at the lunch rush. A hawker centre at lunch is full: most tables have a
// party eating or someone's tissue on them, and a free one goes in seconds.
export const ERA_RULES = {
  "1950s": { chope: null, ownTables: false, trays: false, trayRate: 0, cleaners: false, riders: null, roving: true, tissueStart: 0, busy: 0.6 },
  "1980s": { chope: null, ownTables: true, trays: false, trayRate: 0, cleaners: true, riders: null, roving: false, tissueStart: 0, busy: 0.92 },
  today: { chope: "tissue", ownTables: false, trays: true, trayRate: 0.93, cleaners: true, riders: "apps", roving: false, tissueStart: 2, busy: 0.93 },
  2065: { chope: "tissue", ownTables: false, trays: true, trayRate: 0.95, cleaners: "robot", riders: "apps", roving: false, tissueStart: 2, busy: 0.9 },
};
// How long people take over a meal, compressed for the game (seconds), and how many come together.
const MEAL = [40, 105];
const PARTY_SIZES = [[1, 0.3], [2, 0.36], [3, 0.19], [4, 0.15]];

// What other people chope with today (Straits Times, 10 April 2017: tissue packets, name cards,
// umbrellas, plastic bags).
export const CHOPE_ITEMS = [
  ["tissue", 0.7],
  ["umbrella", 0.12],
  ["name card", 0.1],
  ["plastic bag", 0.08],
];
function chopeItem(random) {
  let r = random();
  for (const [item, p] of CHOPE_ITEMS) if ((r -= p) < 0) return item;
  return "tissue";
}

function rng(seed) {
  let s = Math.abs(Math.floor(seed)) % 2147483646 || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const priceOf = (w, dish) => Math.round((DISHES[dish]?.price ?? 3) * w.era.price * 100) / 100;

// ---------- The makan list ----------

const WHO = ["You", "Ah Ma", "Your friend", "Mum"];

// Two or three dishes from different stalls (a famous one first if the centre has one) and a drink in
// kopi code. Each item says who it is for, and which stalls sell it.
export function makeList(plan, { famous = [], random = Math.random, eraId = "today" } = {}) {
  const items = [];
  const usedMenus = new Set();
  const sellers = (dish) => plan.stalls.filter((s) => menuById(s.menu).dishes.includes(dish)).map((s) => s.id);
  const addDish = (dish, who) => {
    const d = DISHES[dish];
    const variants = Object.keys(d.variants);
    const variant = variants[Math.floor(random() * variants.length)];
    const stalls = sellers(dish);
    if (!stalls.length) return false;
    const vlabel = String(d.variants[variant].label ?? variant).toLowerCase();
    items.push({ dish, variant, label: variants.length > 1 ? `${d.name}, ${vlabel}` : d.name, who, stalls, got: false, placed: false });
    for (const id of stalls) usedMenus.add(plan.stalls[id].menu);
    return true;
  };
  for (const dish of famous) if (items.length < 1 && DISHES[dish] && dish !== "drink" && sellers(dish).length) addDish(dish, WHO[0]);
  const food = plan.stalls.filter((s) => s.menu !== "drinks" && !usedMenus.has(s.menu));
  const wantFood = plan.stalls.length > 60 ? 3 : 2;
  let guard = 0;
  while (items.length < wantFood && guard++ < 50) {
    const pool = plan.stalls.filter((s) => s.menu !== "drinks" && !usedMenus.has(s.menu));
    const s = (pool.length ? pool : food.length ? food : plan.stalls)[Math.floor(random() * (pool.length || food.length || plan.stalls.length))];
    const dishes = menuById(s.menu).dishes.filter((d) => d !== "drink" && !items.some((i) => i.dish === d));
    if (!dishes.length) continue;
    addDish(dishes[Math.floor(random() * dishes.length)], WHO[items.length % WHO.length]);
  }
  // A drink, in kopi code, from a drinks stall (or the urn of a stall that has one).
  const drinkStalls = plan.stalls.filter((s) => menuById(s.menu).dishes.includes("drink")).map((s) => s.id);
  if (drinkStalls.length) {
    const s = randomOrder(random);
    s.bag = false;
    if (eraId === "1950s" && s.base === "milo") s.base = "kopi";
    items.push({ dish: "drink", drink: s, code: compile(s), label: describe(s), who: WHO[items.length % WHO.length], stalls: drinkStalls, got: false, placed: false });
  }
  return items;
}

// Three ways to say a drink in kopi code: the right one and two near misses, in a shuffled order.
export function drinkChoices(item, random = Math.random) {
  const right = item.drink;
  const out = [{ code: compile(right), state: right, ok: true }];
  const tweaks = [
    (s) => ({ ...s, milk: s.milk === "none" ? "evaporated" : "none" }),
    (s) => ({ ...s, sugar: s.sugar === 1 ? 2 : 1 }),
    (s) => ({ ...s, ice: !s.ice }),
    (s) => ({ ...s, base: s.base === "kopi" ? "teh" : "kopi" }),
    (s) => ({ ...s, sugar: s.sugar === 0 ? 2 : 0 }),
  ];
  for (const t of tweaks.sort(() => random() - 0.5)) {
    if (out.length >= 3) break;
    const s = t({ ...right, toppings: [...(right.toppings ?? [])] });
    if (s.sugar === 0 && s.milk === "condensed") continue;
    const code = compile(s);
    if (!code || out.some((o) => o.code === code)) continue;
    out.push({ code, state: s, ok: sameDrink(s, right) });
  }
  return out.sort(() => random() - 0.5);
}

// ---------- Setting up ----------

export function createWalk(plan, { eraId = "today", seed = 1, famous = [], crowd = 1, list = null } = {}) {
  const random = rng(seed);
  const era = eraById(eraId);
  const rules = ERA_RULES[eraId] ?? ERA_RULES.today;
  const items = list ?? makeList(plan, { famous, random, eraId });
  const budget = items.reduce((n, it) => n + priceOf({ era }, it.dish), 0);
  const [sx, sz] = plan.start;
  const w = {
    plan,
    era,
    eraId,
    rules,
    random,
    t: 0,
    me: { x: sx, z: sz, fx: 0, fz: -1, speed: 0, hold: null, tissue: rules.tissueStart, money: Math.ceil(budget * 1.5 * 10) / 10, chope: null, queue: null, auto: null, sitting: null, eating: 0, ate: false, basket: [], waitFood: 0 },
    list: items,
    tables: plan.tables.map((t) => ({ chope: null, by: null, seats: [null, null, null, null], food: [], dirty: 0, mine: false, owner: null, free: true, freeAt: -99 })),
    stalls: plan.stalls.map((s) => ({ queue: [], serving: 0, gap: 0, speed: 1, served: 0, cook: null, serveT: 0 })),
    agents: [],
    byId: new Map(),
    parties: new Map(),
    nextId: 1,
    nextParty: 1,
    events: [],
    prompt: null,
    ordering: null,
    done: false,
    paths: 0,
    stats: { spent: 0, queued: 0, choped: false, returned: false, start: 0, stalls: new Set(), wrong: 0, tissueBought: 0, shooed: 0 },
    target: {
      // Enough people to fill the tables at the era's rush (about 2.2 to a table) and the queues.
      diners: Math.max(12, Math.min(1250, Math.round((plan.tables.length * rules.busy * 2.2 + plan.stalls.length * 1.2) * crowd))),
      riders: rules.riders ? Math.max(1, Math.min(8, Math.round(plan.stalls.length / 12))) : 0,
      cleaners: rules.cleaners ? Math.max(1, Math.min(4, Math.round(plan.tables.length / 40))) : 0,
    },
  };
  // The 1980s: about half the tables near a stall are that stall's own.
  if (rules.ownTables) {
    plan.tables.forEach((t, k) => {
      let best = null;
      for (const s of plan.stalls) {
        const d = dist(t.x, t.z, s.front[0], s.front[1]);
        if (d < 7 && (!best || d < best.d)) best = { id: s.id, d };
      }
      if (best && random() < 0.55) w.tables[k].owner = best.id;
    });
  }
  // Start at the rush: most tables have a party part way through their meal, some are choped by parties
  // still queueing for food, and the queues are long. A few tables are free, but not for long.
  const busy = Math.min(0.97, rules.busy * crowd);
  const order = plan.tables.map((_, k) => [random(), k]).sort((a, b) => a[0] - b[0]).map(([, k]) => k);
  const seatedTables = Math.round(order.length * busy * (rules.chope ? 0.92 : 0.97));
  const chopedTables = rules.chope ? Math.round(order.length * busy * 0.09) : 0;
  let oi = 0;
  for (; oi < seatedTables && oi < order.length; oi++) {
    const k = order[oi];
    const t = plan.tables[k];
    const party = newParty(w, partySize(random));
    party.table = k;
    w.tables[k].by = party.id;
    // Somewhere through their meal: some just started, some nearly done.
    const left = 3 + random() * (MEAL[1] - 3);
    for (let i = 0; i < party.size; i++) {
      const a = addAgent(w, "diner", t.seats[i][0], t.seats[i][1], party);
      Object.assign(a, { state: "eat", table: k, seat: i, seated: true, sat: true, tray: true, timer: Math.max(0, left - random() * 12), meal: MEAL[1] });
      if (a.timer <= 0) a.state = "done";
      a.fx = t.x - a.x;
      a.fz = t.z - a.z;
      w.tables[k].seats[i] = a.id;
    }
    party.coming = 0;
  }
  // Parties queueing with a packet of tissue on their table.
  const queueAt = (a) => {
    const s = plan.stalls[pickStall(w, a)];
    const st = w.stalls[s.id];
    const [x, z] = queueSpot(plan, s, st.queue.length);
    if (!walkable(plan.grid.at(...plan.grid.cellOf(x, z)))) return false;
    a.x = x;
    a.z = z;
    a.state = "queue";
    a.stall = s.id;
    st.queue.push(a.id);
    return true;
  };
  for (let n = 0; n < chopedTables && oi < order.length; oi++, n++) {
    const k = order[oi];
    const party = newParty(w, partySize(random));
    party.table = k;
    w.tables[k].by = party.id;
    w.tables[k].chope = chopeItem(random);
    for (let i = 0; i < party.size; i++) {
      const a = addAgent(w, "diner", 0, 0, party);
      if (!queueAt(a)) remove(w, a);
    }
    if (!party.members.size) releaseTable(w, party);
  }
  // More people already queueing, who will look for a table with their food: a long line at the famous
  // stall, a few at the others.
  for (let k = 0; k < Math.round(plan.stalls.length * 1.6 * crowd); k++) {
    const party = newParty(w, 1);
    const a = addAgent(w, "diner", 0, 0, party);
    if (!queueAt(a)) remove(w, a);
  }
  // The street era: a hawker pushing his cart up and down the road.
  if (rules.roving && plan.kind === "street") {
    const a = addAgent(w, "roving", plan.bounds.x0 + 4, 0);
    a.state = "rove";
  }
  for (const tb of w.tables) tb.free = isFree(tb);
  return w;
}

function addAgent(w, kind, x, z, party = null) {
  const a = { id: w.nextId++, kind, x, z, fx: 0, fz: 1, speed: 0, path: null, pk: 0, state: "arrive", stall: null, table: null, seat: null, timer: 0, meal: 1, tray: false, bag: false, chope: null, seated: false, look: Math.floor(w.random() * 1e6), app: w.random() < 0.5 ? 0 : 1, wait: 0, party: party?.id ?? null, lead: false, look2: 0 };
  if (party) {
    if (!party.members.size) a.lead = true;
    party.members.add(a.id);
  }
  w.agents.push(a);
  w.byId.set(a.id, a);
  return a;
}

// ---------- Parties: friends and families who come, eat and leave together ----------

function partySize(random) {
  let r = random();
  for (const [n, p] of PARTY_SIZES) if ((r -= p) < 0) return n;
  return 2;
}

function newParty(w, size) {
  const party = { id: w.nextParty++, size, members: new Set(), table: null, coming: size, leaving: false };
  w.parties.set(party.id, party);
  return party;
}

// A table nobody is using or keeping: no one seated, no tissue, not yours.
const isFree = (tb) => !tb.mine && tb.by === null && !tb.chope && tb.seats.every((x) => x === null);

function releaseTable(w, party) {
  if (party.table === null) return;
  const tb = w.tables[party.table];
  if (tb.by === party.id) {
    tb.by = null;
    tb.chope = null;
  }
  party.table = null;
}

// Seconds until a table's people get up: 0 if it is free now, Infinity if nobody there is near the end of
// their meal (or more of their party are still coming with food).
export function finishIn(w, k) {
  const tb = w.tables[k];
  if (tb.free) return 0;
  if (tb.mine || tb.chope) return Infinity;
  let left = 0;
  let seated = 0;
  for (const id of tb.seats) {
    if (id === null) continue;
    if (id === "me") return Infinity;
    const a = w.byId.get(id);
    if (!a) continue;
    seated++;
    const party = w.parties.get(a.party);
    if (party && party.coming > 0) return Infinity;
    left = Math.max(left, a.state === "eat" ? a.timer : 0);
  }
  if (!seated && tb.by !== null) return Infinity;
  return left + 1.5;
}

const emit = (w, ...e) => w.events.push(e);
export const drainWalkEvents = (w) => w.events.splice(0);

// ---------- Each tick ----------

// input: { mx, mz, p (presses of the main button), d (dash presses) }
export function stepWalk(w, dt, input = {}) {
  w.t += dt;
  w.paths = 0;
  // About 220 path searches a second at most, whatever the tick rate.
  w.pathCap = Math.max(3, Math.round(220 * dt));
  // Where everyone was before this tick, so the view can draw them smoothly between ticks.
  w.me.px = w.me.x;
  w.me.pz = w.me.z;
  for (const a of w.agents) {
    a.px = a.x;
    a.pz = a.z;
  }
  moveMe(w, dt, input);
  for (const st of w.stalls) st.gap = Math.max(0, st.gap - dt);
  serveStalls(w, dt);
  for (const a of [...w.agents]) thinkAgent(w, a, dt);
  // When each table last came free, so people hovering for it react a moment later.
  for (const tb of w.tables) {
    const f = isFree(tb);
    if (f && !tb.free) tb.freeAt = w.t;
    tb.free = f;
  }
  spawn(w, dt);
  if (input.p) for (let k = 0; k < input.p; k++) interact(w);
  w.prompt = promptFor(w);
}

function blockedAt(plan, x, z, r = ME_R) {
  const g = plan.grid;
  for (const [ox, oz] of [[r, r], [-r, r], [r, -r], [-r, -r], [r, 0], [-r, 0], [0, r], [0, -r]]) {
    if (!walkable(g.at(...g.cellOf(x + ox, z + oz)))) return true;
  }
  return false;
}

function moveMe(w, dt, input) {
  const me = w.me;
  if (me.sitting !== null) {
    if (me.eating > 0) {
      me.eating -= dt;
      if (me.eating <= 0) finishEating(w);
    }
    // Moving stands you up, once you have eaten.
    if (me.eating <= 0 && (Math.abs(input.mx ?? 0) > 0.3 || Math.abs(input.mz ?? 0) > 0.3)) standUp(w);
    return;
  }
  if (w.ordering !== null) return;
  if (me.waitFood > 0) {
    me.waitFood -= dt;
    if (me.waitFood <= 0) collectFood(w);
    return;
  }
  let mx = input.mx ?? 0;
  let mz = input.mz ?? 0;
  const moving = Math.hypot(mx, mz) > 0.15;
  // Seen through your own eyes (or over your shoulder), you face where the camera looks.
  if (input.face) {
    const fl = Math.hypot(input.face[0], input.face[1]);
    if (fl > 1e-3) {
      me.fx = input.face[0] / fl;
      me.fz = input.face[1] / fl;
    }
  }
  me.aim = Boolean(input.aim);
  if (moving) me.auto = null;
  if (moving && me.queue !== null) leaveQueue(w, true);
  if (input.d) me.dash = 0.22;
  me.dash = Math.max(0, (me.dash ?? 0) - dt);
  let speed = me.dash > 0 ? DASH : WALK;
  // Taking yourself somewhere: along the path, until a stick moves.
  if (!moving && me.auto && me.queue === null) {
    const step = autoStep(w, dt);
    if (step) {
      [mx, mz] = step;
      if (me.dash <= 0) speed = WALK * 1.08;
    }
  }
  // Queueing: you walk yourself to your place in the line.
  if (!moving && me.queue !== null) {
    const st = w.stalls[me.queue];
    const k = st.queue.indexOf("me");
    const [qx, qz] = queueSpot(w.plan, w.plan.stalls[me.queue], k);
    const d = dist(me.x, me.z, qx, qz);
    if (d > 0.08) {
      mx = (qx - me.x) / d;
      mz = (qz - me.z) / d;
      speed = Math.min(WALK, d / dt);
    }
    if (k === 0 && d < 0.3) {
      const s = w.plan.stalls[me.queue];
      me.fx = s.face[0] * -1;
      me.fz = s.face[1] * -1;
    }
  }
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= Math.max(1, len);
    mz /= Math.max(1, len);
    if ((moving || me.auto) && !input.face) {
      me.fx = mx;
      me.fz = mz;
    }
  }
  const vx = mx * speed;
  const vz = mz * speed;
  me.speed = Math.hypot(vx, vz);
  const nx = me.x + vx * dt;
  if (!blockedAt(w.plan, nx, me.z)) me.x = nx;
  const nz = me.z + vz * dt;
  if (!blockedAt(w.plan, me.x, nz)) me.z = nz;
  // People are solid too, unless you are joining a queue. You ease round them as you walk; standing
  // still, passers-by brush past rather than shove you about.
  if (me.queue === null && me.speed > 0.1) {
    for (const a of w.agents) {
      if (a.seated) continue;
      const d = dist(me.x, me.z, a.x, a.z);
      if (d < 0.5 && d > 1e-4) {
        const push = (0.5 - d) * Math.min(1, dt * 18);
        const px = me.x + ((me.x - a.x) / d) * push;
        const pz = me.z + ((me.z - a.z) / d) * push;
        if (!blockedAt(w.plan, px, pz)) {
          me.x = px;
          me.z = pz;
        }
      }
    }
  }
  if (me.queue !== null) w.stats.queued += dt;
  // Done: fed, and away past the outdoor tables (with or without clearing up: the card will say).
  if (me.ate && !w.done && !me.hold?.tray && outside(w, me.x, me.z)) finish(w);
  // Walking yourself out and blocked at the edge of the map: clearly out is out; otherwise turn a little.
  const a = me.auto;
  if (a?.out && !w.done) {
    const moved = dist(me.x, me.z, a.lx ?? me.x + 1, a.lz ?? me.z);
    a.lx = me.x;
    a.lz = me.z;
    a.still = moved < WALK * dt * 0.3 ? (a.still ?? 0) + dt : 0;
    if (a.still > 0.5) {
      if (me.ate && !me.hold?.tray && outside(w, me.x, me.z, 3)) finish(w);
      else {
        const t = Math.PI / 4;
        a.out = [a.out[0] * Math.cos(t) - a.out[1] * Math.sin(t), a.out[0] * Math.sin(t) + a.out[1] * Math.cos(t)];
        a.still = 0;
      }
    }
  }
}

function outside(w, x, z, m = 8.5) {
  const b = w.plan.bounds;
  return x < b.x0 - m || x > b.x1 + m || z < b.z0 - m || z > b.z1 + m;
}

function finish(w) {
  w.done = true;
  emit(w, "done");
}

// ---------- What is in front of you ----------

function nearestTable(w, x, z, max = REACH) {
  let best = null;
  w.plan.tables.forEach((t, k) => {
    const d = dist(x, z, t.x, t.z);
    if (d < max && (!best || d < best.d)) best = { k, d };
  });
  return best?.k ?? null;
}

// The stall whose counter, or the end of whose queue, is nearest.
function nearestStall(w, x, z, max = 2.2) {
  let best = null;
  for (const s of w.plan.stalls) {
    const q = w.stalls[s.id].queue.length;
    const [tx, tz] = queueSpot(w.plan, s, q);
    const d = Math.min(dist(x, z, s.front[0], s.front[1]), q ? dist(x, z, tx, tz) + 0.3 : Infinity);
    if (d < max && (!best || d < best.d)) best = { id: s.id, d };
  }
  return best?.id ?? null;
}

function nearest(list, x, z, max) {
  let best = null;
  list.forEach((p, k) => {
    const d = dist(x, z, p[0], p[1]);
    if (d < max && (!best || d < best.d)) best = { k, d };
  });
  return best?.k ?? null;
}

// The thing the main button would act on, and what it would do, for the prompt and for interact().
export function targetOfMe(w) {
  const me = w.me;
  if (w.done || w.ordering !== null) return null;
  if (me.sitting !== null) {
    if (me.eating > 0) return { kind: "eating", text: "Makan time" };
    return { kind: "stand", text: "Stand up" };
  }
  if (me.waitFood > 0) return { kind: "wait", text: "Your food is coming" };
  if (me.queue !== null) {
    const k = w.stalls[me.queue].queue.indexOf("me");
    return { kind: "queue", text: k > 0 ? `In the queue: ${k} ahead of you` : "Your turn soon" };
  }
  // Everything within reach, scored by distance and by how squarely you face it.
  const cands = [];
  // Through your own eyes it is what you look at; from above, what is near and roughly ahead.
  const add = (kind, id, x, z, max, bonus = 0) => {
    const d = dist(me.x, me.z, x, z);
    if (d > max + (me.aim ? 0.4 : 0)) return;
    const facing = d > 1e-3 ? ((x - me.x) * me.fx + (z - me.z) * me.fz) / (d * (Math.hypot(me.fx, me.fz) || 1)) : 1;
    if (me.aim && facing < 0.55 && d > 0.7) return;
    cands.push({ kind, id, score: d - facing * (me.aim ? 2.2 : 0.7) - bonus });
  };
  if (me.hold?.dirty) w.plan.trayReturns.forEach((r, k) => add("return", k, r.use[0], r.use[1], REACH, 0.5));
  // The tissue auntie, once your own packets have run out.
  if (w.rules.chope === "tissue" && me.tissue === 0) w.plan.sellers.forEach((p, k) => add("seller", k, p.x, p.z, REACH + 0.3));
  w.plan.tables.forEach((t, k) => add("table", k, t.x, t.z, REACH));
  for (const s of w.plan.stalls) {
    add("stall", s.id, s.front[0], s.front[1], 2.2);
    // The end of a queue counts as that stall's spot.
    const q = w.stalls[s.id].queue.length;
    if (q) add("stall", s.id, ...queueSpot(w.plan, s, q), 1.2, 0.6);
  }
  if (!cands.length) return null;
  cands.sort((a, b) => a.score - b.score);
  const best = cands[0];
  if (best.kind === "return") return { kind: "return", id: best.id, text: "Return your tray" };
  if (best.kind === "seller") return { kind: "seller", id: best.id, text: "Buy three packets of tissue" };
  if (best.kind === "table") return tableTarget(w, best.id);
  const si = best.id;
  const s = w.plan.stalls[si];
  if (me.hold?.tray) return { kind: "nope", id: si, text: "Put your tray down first" };
  if (me.hold?.dirty) return { kind: "nope", id: si, text: w.rules.trays ? "Return your tray first" : "Hands full" };
  const n = w.stalls[si].queue.length;
  return { kind: "stall", id: si, text: `Queue at ${s.sign.toLowerCase()}, ${s.no}${n ? ` (${n} in line)` : ""}` };
}

function listDone(w) {
  return w.list.every((it) => it.placed);
}

function tableTarget(w, k) {
  const me = w.me;
  const t = w.tables[k];
  const mine = t.mine;
  const occupied = t.seats.some((s) => s !== null);
  if (mine) {
    if (me.hold?.tray) return { kind: "place", id: k, text: "Put your food down" };
    if (!me.ate && listDone(w)) return { kind: "sit", id: k, text: "Sit down and makan" };
    if (me.ate && !me.hold && t.food.length) return { kind: "clear", id: k, text: w.rules.trays ? "Stack your tray to return it" : "Leave it for the cleaner, you're done" };
    if (t.chope) return { kind: "unchope", id: k, text: `Take your ${w.rules.chope} back` };
    return { kind: "mine", id: k, text: "Your table" };
  }
  if (t.chope) return { kind: "choped", id: k, text: `Choped: someone's ${t.chope} is on it` };
  // People nearly done: stay close, and be quick when they get up.
  const nearly = occupied && finishIn(w, k) <= 18;
  const wantTable = (w.rules.chope && !me.ate && !listDone(w) && !me.hold) || me.hold?.tray;
  if (nearly && wantTable && (t.seats.every((s) => s !== null) || !me.hold?.tray)) return { kind: "wait", id: k, text: me.hold?.tray ? "Nearly done eating. Wait for their seats" : "Nearly done eating. Wait, then chope it" };
  if (occupied && t.seats.every((s) => s !== null)) return { kind: "taken", id: k, text: "Every seat is taken" };
  if (occupied && !me.hold?.tray) return { kind: "taken", id: k, text: "Strangers eating here. Bring your food and share" };
  if (!occupied && t.by !== null && t.by !== "me") return { kind: "taken", id: k, text: "Someone is about to sit here" };
  const owned = t.owner !== null ? `, ${w.plan.stalls[t.owner].no}'s table` : "";
  if (me.hold?.tray) return { kind: "place", id: k, text: occupied ? `Share this table${owned}` : `Put your food down here${owned}` };
  if (!w.rules.chope) return { kind: "free", id: k, text: t.owner !== null ? `A free table, kept by ${w.plan.stalls[t.owner].no} for its customers` : "A free table" };
  // Choping is for before you eat, and you need only one table: after that, a table is just a table.
  if (me.ate || listDone(w) || w.tables.some((x) => x.mine)) return { kind: "free", id: k, text: "A free table" };
  if (me.tissue > 0) return { kind: "chope", id: k, text: w.t - t.freeAt < 4 ? `Quick, chope it! (${me.tissue} tissue left)` : `Chope it with a packet of tissue (${me.tissue} left)` };
  return { kind: "free", id: k, text: "No tissue left to chope with" };
}

function promptFor(w) {
  return targetOfMe(w);
}

function interact(w) {
  const me = w.me;
  const t = targetOfMe(w);
  if (!t) return;
  switch (t.kind) {
    case "stall":
      return joinQueue(w, t.id);
    case "chope": {
      if (me.chope !== null) unchope(w, me.chope, true);
      const tb = w.tables[t.id];
      tb.chope = w.rules.chope;
      tb.by = "me";
      tb.mine = true;
      me.chope = t.id;
      me.tissue--;
      w.stats.choped = true;
      return emit(w, "chope", w.plan.tables[t.id].x, w.plan.tables[t.id].z);
    }
    case "unchope":
      return unchope(w, t.id, false);
    case "place":
      return placeFood(w, t.id);
    case "sit":
      return sitDown(w, t.id);
    case "stand":
      return standUp(w);
    case "clear": {
      const tb = w.tables[t.id];
      if (!w.rules.trays) {
        tb.dirty += tb.food.length;
        tb.food = [];
        tb.mine = false;
        me.hold = null;
        return emit(w, "leave-plates");
      }
      me.hold = { dirty: tb.food.length };
      tb.food = [];
      tb.mine = false;
      return emit(w, "pick");
    }
    case "return":
      me.hold = null;
      w.stats.returned = true;
      return emit(w, "return", w.plan.trayReturns[t.id].x, w.plan.trayReturns[t.id].z);
    case "seller":
      if (me.money < 1) return emit(w, "nope", "Not enough money for tissue");
      me.money = Math.round((me.money - 1) * 100) / 100;
      me.tissue += 3;
      w.stats.tissueBought++;
      return emit(w, "buy-tissue");
    case "choped":
    case "taken":
    case "nope":
      return emit(w, "nope", t.text);
  }
}

function unchope(w, k, moving) {
  const tb = w.tables[k];
  if (tb.by !== "me") return;
  tb.chope = null;
  tb.by = null;
  if (!tb.food.length) tb.mine = false;
  w.me.chope = null;
  w.me.tissue++;
  if (!moving) emit(w, "unchope");
}

// ---------- Going places, and what to do next ----------

// A walkable spot beside a table or a seller, on the side nearest you.
function standingSpot(plan, x, z, me) {
  for (const r of [1.05, 1.3, 1.6]) {
    let best = null;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      if (blockedAt(plan, px, pz)) continue;
      const d = dist(px, pz, me.x, me.z);
      if (!best || d < best.d) best = { p: [px, pz], d };
    }
    if (best) return best.p;
  }
  return [x, z];
}

function nearestSpawn(w) {
  let best = null;
  for (const p of w.plan.spawns) {
    const d = dist(w.me.x, w.me.z, p[0], p[1]);
    if (!best || d < best.d) best = { p, d };
  }
  return best?.p ?? w.plan.start;
}

function spotFor(w, target) {
  const plan = w.plan;
  switch (target.kind) {
    case "stall":
      return queueSpot(plan, plan.stalls[target.id], w.stalls[target.id].queue.length);
    case "table":
      return standingSpot(plan, plan.tables[target.id].x, plan.tables[target.id].z, w.me);
    case "return":
      return plan.trayReturns[target.id].use;
    case "seller":
      return standingSpot(plan, plan.sellers[target.id].x, plan.sellers[target.id].z, w.me);
    case "exit":
      return nearestSpawn(w);
    default:
      return [target.x, target.z];
  }
}

// Where a target is, to turn and look at it.
export function targetPoint(w, target) {
  const plan = w.plan;
  if (!target) return null;
  if (target.kind === "stall") return plan.stalls[target.id].front;
  if (target.kind === "table") return [plan.tables[target.id].x, plan.tables[target.id].z];
  if (target.kind === "return") return [plan.trayReturns[target.id].x, plan.trayReturns[target.id].z];
  if (target.kind === "seller") return [plan.sellers[target.id].x, plan.sellers[target.id].z];
  if (target.kind === "exit") return nearestSpawn(w);
  return [target.x, target.z];
}

// Walk yourself to a stall's queue, a table, the tray return or the way out. Any stick movement stops it.
// At a stall you join the end of the queue when you get there.
export function goToward(w, target) {
  const me = w.me;
  if (!target || w.done || me.sitting !== null || w.ordering !== null || me.waitFood > 0) return false;
  if (me.queue !== null) {
    if (target.kind === "stall" && target.id === me.queue) return true;
    leaveQueue(w, true);
  }
  const spot = spotFor(w, target);
  const path = findPath(w.plan, [me.x, me.z], spot, { maxNodes: 60000 });
  if (!path) return false;
  if (path.length > 1 && blockedAt(w.plan, ...path[path.length - 1])) path.pop();
  me.auto = { target, path, k: 1, spot, best: Infinity, stuck: 0, replans: 0 };
  emit(w, "go", target);
  return true;
}

export function stopGoing(w) {
  w.me.auto = null;
}

// One tick of walking yourself somewhere: the direction to push, or null once there.
function autoStep(w, dt) {
  const me = w.me;
  const a = me.auto;
  if (a.out) {
    // Out through the door and away until the centre is behind you.
    me.autoDir = a.out;
    return a.out;
  }
  // The queue you are heading for grows and shrinks; aim at its end.
  if (a.target.kind === "stall" && a.k >= a.path.length - 1) {
    const end = queueSpot(w.plan, w.plan.stalls[a.target.id], w.stalls[a.target.id].queue.length);
    if (!blockedAt(w.plan, end[0], end[1])) a.path[a.path.length - 1] = end;
  }
  while (a.k < a.path.length) {
    const [tx, tz] = a.path[a.k];
    const d = dist(me.x, me.z, tx, tz);
    const last = a.k === a.path.length - 1;
    if (d < (last ? 0.2 : 0.35)) {
      a.k++;
      a.best = Infinity;
      a.stuck = 0;
      continue;
    }
    // Bumping into people: if you stop getting closer, find another way, and give up after a few.
    if (d < a.best - 0.05) {
      a.best = d;
      a.stuck = 0;
    } else if ((a.stuck += dt) > 1.4) {
      if (a.replans++ >= 3) {
        me.auto = null;
        emit(w, "go-stuck");
        return null;
      }
      const path = findPath(w.plan, [me.x, me.z], a.spot, { maxNodes: 60000 });
      if (!path) {
        me.auto = null;
        return null;
      }
      a.path = path;
      a.k = 1;
      a.best = Infinity;
      a.stuck = 0;
      continue;
    }
    const s = last ? Math.min(1, d / (WALK * dt * 1.08)) : 1;
    me.autoDir = [(tx - me.x) / d, (tz - me.z) / d];
    return [me.autoDir[0] * s, me.autoDir[1] * s];
  }
  arrive(w, a);
  return me.auto?.out ?? null;
}

function arrive(w, a) {
  const me = w.me;
  const p = targetPoint(w, a.target);
  if (p && a.target.kind !== "exit") {
    const d = dist(me.x, me.z, p[0], p[1]);
    if (d > 1e-3) {
      me.fx = (p[0] - me.x) / d;
      me.fz = (p[1] - me.z) / d;
    }
  }
  me.auto = null;
  if (a.target.kind === "stall" && !me.hold) {
    joinQueue(w, a.target.id);
  } else if (a.target.kind === "exit") {
    // Keep going, straight away from the middle of the centre.
    const b = w.plan.bounds;
    const cx = (b.x0 + b.x1) / 2;
    const cz = (b.z0 + b.z1) / 2;
    const dx = me.x - cx;
    const dz = me.z - cz;
    const d = Math.hypot(dx, dz) || 1;
    me.auto = { target: a.target, out: [dx / d, dz / d] };
  }
  emit(w, "arrive", a.target, p?.[0] ?? me.x, p?.[1] ?? me.z);
}

// The stall to queue at for an item on the list: near, with a short queue.
function bestStall(w, item) {
  let best = null;
  for (const id of item.stalls) {
    const s = w.plan.stalls[id];
    const score = dist(w.me.x, w.me.z, s.front[0], s.front[1]) + w.stalls[id].queue.length * 2.5;
    if (!best || score < best.score) best = { id, score };
  }
  return best?.id ?? item.stalls[0];
}

// A table you can use: empty for choping; for food, one with a free seat that nobody has choped and
// whose stall (if it has one) made everything on your tray.
function tableFor(w, { empty = false, tray = null, maxD = Infinity } = {}) {
  let best = null;
  w.plan.tables.forEach((t, k) => {
    const tb = w.tables[k];
    if (tb.mine) return;
    if (empty ? !tb.free || tb.owner !== null : tb.chope || !tb.seats.includes(null)) return;
    // A party's table with more of them still coming is theirs.
    if (!empty && typeof tb.by === "number" && (w.parties.get(tb.by)?.coming ?? 0) > 0) return;
    if (tb.owner !== null && !(tray ?? []).every((it) => it.from === tb.owner)) return;
    const others = tb.seats.filter((s) => s !== null).length;
    const near = dist(w.me.x, w.me.z, t.x, t.z);
    if (near > maxD) return;
    // A stall's own table is fine for its food, but the rest of the list comes from other stalls.
    const d = near + others * 4 + (tb.dirty ? 3 : 0) + (tb.owner !== null ? 15 : 0);
    if (!best || d < best.d) best = { k, d };
  });
  return best?.k ?? null;
}

// The table to wait by when none is free: people nearly done, close by, with few others already hovering.
// Sticks with the one you chose while it is still worth waiting for.
function waitTable(w, { tray = null } = {}) {
  const me = w.me;
  const kept = w.guideWait;
  if (kept != null && w.tables[kept] && !w.tables[kept].mine && finishIn(w, kept) <= 45) return kept;
  let best = null;
  w.plan.tables.forEach((t, k) => {
    const tb = w.tables[k];
    if (tb.mine) return;
    if (tb.owner !== null && !(tray ?? []).every((it) => it.from === tb.owner)) return;
    const f = finishIn(w, k);
    if (!Number.isFinite(f) || f > 45) return;
    const score = f + dist(me.x, me.z, t.x, t.z) / WALK + (tb.hovers ?? 0) * 8;
    if (!best || score < best.score) best = { k, score };
  });
  w.guideWait = best?.k ?? null;
  return w.guideWait;
}

const dishName = (it) => (it.dish === "drink" ? "your drink" : (DISHES[it.dish]?.name ?? it.label).toLowerCase());

// What to do next, in a few words, and where: for the guide line, the path on the floor and "Go".
export function nextStep(w) {
  const me = w.me;
  if (w.done) return null;
  if (w.ordering !== null) return { text: "Order from the sheet", target: null };
  if (me.sitting !== null) return { text: me.eating > 0 ? "Makan time" : "Done eating. Move to stand up", target: null };
  if (me.waitFood > 0) return { text: "Your food is coming", target: null };
  if (me.queue !== null) {
    const k = w.stalls[me.queue].queue.indexOf("me");
    return { text: k > 0 ? `Wait your turn: ${k} ahead of you` : "You're next", target: null };
  }
  const mine = w.tables.findIndex((t) => t.mine);
  if (me.hold?.dirty) {
    const rs = w.plan.trayReturns;
    if (!rs.length) return { text: "Walk out of the centre", target: { kind: "exit" } };
    let k = 0;
    rs.forEach((r, i) => dist(me.x, me.z, ...r.use) < dist(me.x, me.z, ...rs[k].use) && (k = i));
    return { text: "Take your tray to the tray return", target: { kind: "return", id: k } };
  }
  if (me.ate) {
    if (mine >= 0 && w.tables[mine].food.length) return { text: w.rules.trays ? "Stack your tray to return it" : "Leave your plates for the cleaner", target: { kind: "table", id: mine } };
    return { text: "Walk out of the centre", target: { kind: "exit" } };
  }
  if (me.hold?.tray) {
    const owner = mine >= 0 ? w.tables[mine].owner : null;
    if (mine >= 0 && (owner === null || me.hold.tray.every((it) => it.from === owner))) return { text: "Take your tray to your table", target: { kind: "table", id: mine } };
    const k = tableFor(w, { tray: me.hold.tray, maxD: 40 });
    if (k !== null) return { text: "Find a table and put your food down", target: { kind: "table", id: k } };
    const wk = waitTable(w, { tray: me.hold.tray });
    return wk === null ? { text: "Look for a seat to share", target: null } : { text: "No seat free. Wait by a table where they're nearly done", target: { kind: "table", id: wk }, waiting: true };
  }
  const todo = w.list.find((it) => !it.got);
  if (todo && w.rules.chope && mine < 0) {
    if (me.tissue > 0) {
      // Stay with the free table you are heading for while it lasts; once waiting, only a free table right
      // beside you is worth leaving your spot for.
      const kept = w.guideFree != null && w.tables[w.guideFree]?.free ? w.guideFree : null;
      const k = kept ?? tableFor(w, { empty: true, maxD: w.guideWait != null ? 8 : 35 });
      w.guideFree = k;
      if (k !== null) {
        const t = w.plan.tables[k];
        const fresh = w.t - w.tables[k].freeAt < 4 && dist(me.x, me.z, t.x, t.z) < 4;
        w.guideWait = null;
        return { text: fresh ? "Quick, chope it!" : "Chope a table with tissue first", target: { kind: "table", id: k } };
      }
      // Every table taken: wait by one where people are nearly done, and chope it the moment they go.
      const wk = waitTable(w);
      if (wk !== null) return { text: "No free table. Wait by one where they're nearly done", target: { kind: "table", id: wk }, waiting: true };
    } else if (w.plan.sellers.length) {
      return { text: "Buy tissue to chope a table", target: { kind: "seller", id: 0 } };
    }
  }
  if (todo) {
    // Keep heading for the stall you set off for, so the guide does not change its mind on the way.
    const going = me.auto?.target.kind === "stall" && todo.stalls.includes(me.auto.target.id) ? me.auto.target.id : null;
    const id = going ?? bestStall(w, todo);
    return { text: `Queue for ${dishName(todo)} at ${w.plan.stalls[id].no}`, target: { kind: "stall", id }, item: todo };
  }
  if (mine >= 0) return { text: "Sit down and makan", target: { kind: "table", id: mine } };
  return null;
}

// Every stall that sells something still on your list, nearest first, for the "go to" menu.
export function stallsToVisit(w) {
  const out = [];
  for (const it of w.list) {
    if (it.got) continue;
    for (const id of it.stalls) {
      const s = w.plan.stalls[id];
      out.push({ id, item: it, d: dist(w.me.x, w.me.z, s.front[0], s.front[1]), queue: w.stalls[id].queue.length });
    }
  }
  return out.sort((a, b) => a.d + a.queue * 2.5 - (b.d + b.queue * 2.5));
}

// ---------- Queues and ordering ----------

function joinQueue(w, id) {
  w.me.auto = null;
  const st = w.stalls[id];
  st.queue.push("me");
  w.me.queue = id;
  w.stats.stalls.add(id);
  emit(w, "join", id);
}

function leaveQueue(w, quietly = false) {
  const st = w.stalls[w.me.queue];
  st.queue = st.queue.filter((q) => q !== "me");
  w.me.queue = null;
  if (!quietly) emit(w, "leave-queue");
}

// What a stall at the front of its queue can sell you, with prices in the era's money.
export function stallMenu(w, id) {
  const s = w.plan.stalls[id];
  const menu = menuById(s.menu);
  const out = [];
  for (const dish of menu.dishes) {
    const d = DISHES[dish];
    if (!d) continue;
    if (dish === "drink") {
      out.push({ dish, variant: null, label: "Kopi or teh, in kopi code", price: priceOf(w, dish) });
      continue;
    }
    for (const [v, variant] of Object.entries(d.variants)) {
      const many = Object.keys(d.variants).length > 1;
      out.push({ dish, variant: v, label: many ? `${d.name}, ${(variant.label ?? v).toLowerCase()}` : d.name, price: priceOf(w, dish) });
    }
  }
  return out;
}

// Buy one thing at the stall you are ordering from. For drinks, `drink` is the kopi code state chosen.
export function buy(w, { dish, variant = null, drink = null }) {
  const me = w.me;
  if (w.ordering === null) return { ok: false, why: "Not at a stall" };
  const price = priceOf(w, dish);
  if (me.money + 1e-9 < price) return { ok: false, why: "Not enough money" };
  me.money = Math.round((me.money - price) * 100) / 100;
  w.stats.spent = Math.round((w.stats.spent + price) * 100) / 100;
  me.basket.push({ dish, variant, drink, from: w.ordering });
  emit(w, "pay", price);
  return { ok: true };
}

// Done ordering: the hawker cooks and hands over a tray. Nothing bought: you just step aside.
export function doneOrdering(w) {
  const id = w.ordering;
  if (id === null) return;
  w.ordering = null;
  const st = w.stalls[id];
  if (!w.me.basket.length) {
    st.queue = st.queue.filter((q) => q !== "me");
    w.me.queue = null;
    st.gap = 0.5;
    return;
  }
  // Long enough to watch the hawker make it: a few seconds a dish.
  w.me.waitFood = Math.min(9, 2.5 + w.me.basket.length * 1.8);
  st.cook = { me: true, items: w.me.basket.map((b) => ({ dish: b.dish, variant: b.variant, drink: b.drink })), dish: w.me.basket[0].dish, variant: w.me.basket[0].variant, t: 0, dur: w.me.waitFood };
  emit(w, "cooking", id, st.cook.items);
}

function collectFood(w) {
  const me = w.me;
  const id = me.queue;
  if (id !== null) {
    const st = w.stalls[id];
    st.queue = st.queue.filter((q) => q !== "me");
    st.gap = 0.6;
    st.served++;
    st.cook = null;
    st.serveT = 0.8;
  }
  me.queue = null;
  me.hold = { tray: me.basket.splice(0) };
  // Tick off what the list wanted.
  for (const it of me.hold.tray) {
    const want = w.list.find((l) => !l.got && l.dish === it.dish && (it.dish === "drink" ? sameDrink(l.drink, it.drink) : l.variant === it.variant));
    if (want) {
      want.got = true;
      it.forList = true;
    }
  }
  emit(w, "tray", id);
}

function placeFood(w, k) {
  const me = w.me;
  const tb = w.tables[k];
  if (tb.owner !== null && !me.hold.tray.every((it) => it.from === tb.owner)) {
    w.stats.shooed++;
    return emit(w, "shoo", tb.owner);
  }
  if (!tb.mine) {
    // Food on an empty table makes it yours.
    if (me.chope !== null && me.chope !== k) unchope(w, me.chope, true);
    tb.mine = true;
  }
  for (const it of me.hold.tray) {
    tb.food.push(it);
    if (it.forList) {
      const l = w.list.find((x) => x.got && !x.placed && x.dish === it.dish);
      if (l) l.placed = true;
    }
  }
  me.hold = null;
  emit(w, "place", w.plan.tables[k].x, w.plan.tables[k].z);
}

function sitDown(w, k) {
  const me = w.me;
  const tb = w.tables[k];
  const t = w.plan.tables[k];
  const seat = tb.seats.findIndex((s) => s === null);
  if (seat < 0) return emit(w, "nope", "No seat free yet. Wait for someone to finish");
  tb.seats[seat] = "me";
  me.sitting = k;
  me.seat = seat;
  [me.x, me.z] = t.seats[seat];
  me.fx = t.x - me.x;
  me.fz = t.z - me.z;
  me.eating = 7;
  if (tb.chope && tb.by === "me") {
    // The tissue comes back off the table when you sit.
    tb.chope = null;
    tb.by = null;
    me.chope = null;
    me.tissue++;
  }
  emit(w, "sit");
}

function finishEating(w) {
  w.me.ate = true;
  emit(w, "ate");
}

function standUp(w) {
  const me = w.me;
  const tb = w.tables[me.sitting];
  tb.seats[me.seat] = null;
  const t = w.plan.tables[me.sitting];
  // Step back from the table.
  const dx = me.x - t.x;
  const dz = me.z - t.z;
  const d = Math.hypot(dx, dz) || 1;
  const nx = t.x + (dx / d) * 1.3;
  const nz = t.z + (dz / d) * 1.3;
  if (!blockedAt(w.plan, nx, nz)) [me.x, me.z] = [nx, nz];
  me.sitting = null;
  me.seat = null;
}

// ---------- Stalls serving their queues ----------

// What a stall is cooking right now, for the hawker's hands: { dish, variant, t, dur, me }.
function pickDish(w, s) {
  const menu = menuById(s.menu).dishes;
  const dish = menu[Math.floor(w.random() * menu.length)];
  const d = DISHES[dish];
  const vs = d ? Object.keys(d.variants) : [];
  return { dish, variant: vs.length ? vs[Math.floor(w.random() * vs.length)] : null };
}

function serveStalls(w, dt) {
  for (const s of w.plan.stalls) {
    const st = w.stalls[s.id];
    st.serveT = Math.max(0, st.serveT - dt);
    if (st.cook) st.cook.t += dt * (st.cook.me ? 1 : st.speed);
    const front = st.queue[0];
    if (st.cook?.me) continue;
    if (front === undefined || st.gap > 0) {
      if (st.cook && !st.cook.me && front === undefined) st.cook = null;
      continue;
    }
    if (front === "me") {
      const me = w.me;
      const [qx, qz] = queueSpot(w.plan, s, 0);
      if (w.ordering === null && me.waitFood <= 0 && dist(me.x, me.z, qx, qz) < 0.5) {
        w.ordering = s.id;
        st.cook = null;
        emit(w, "your-turn", s.id);
      }
      continue;
    }
    const a = w.byId.get(front);
    if (!a) {
      st.queue.shift();
      continue;
    }
    const [qx, qz] = queueSpot(w.plan, s, 0);
    if (dist(a.x, a.z, qx, qz) > 0.6) continue;
    const need = a.kind === "rider" ? 5 : 3.5 + (a.look % 5) * 0.4;
    // The hawker cooks this customer's dish while they wait.
    if (!st.cook || st.cook.who !== a.id) st.cook = { who: a.id, ...pickDish(w, s), t: 0, dur: need };
    st.serving += dt * st.speed;
    if (st.serving >= need) {
      st.serving = 0;
      st.gap = 0.5;
      st.served++;
      st.serveT = 0.6;
      st.cook = null;
      st.queue.shift();
      if (a.kind === "rider") a.bag = true;
      else a.tray = true;
      a.state = a.kind === "rider" ? "leave" : "totable";
      a.path = null;
    }
  }
}

// ---------- Everyone else ----------

function spawn(w, dt) {
  w.spawnT = (w.spawnT ?? 0) - dt;
  if (w.spawnT > 0) return;
  w.spawnT = 0.3;
  // Only people still coming or eating count: those on their way out make room for the next party.
  let diners = 0;
  let riders = 0;
  let cleaners = 0;
  for (const a of w.agents) {
    if (a.kind === "diner") {
      if (a.state !== "leave" && a.state !== "totray") diners++;
    } else if (a.kind === "rider") riders++;
    else if (a.kind === "cleaner") cleaners++;
  }
  const [x, z] = w.plan.spawns[Math.floor(w.random() * w.plan.spawns.length)];
  if (diners < w.target.diners && w.agents.length < 1600) {
    // A party comes in through a door together.
    const party = newParty(w, partySize(w.random));
    for (let i = 0; i < party.size; i++) addAgent(w, "diner", x + (w.random() - 0.5) * 1.2, z + (w.random() - 0.5) * 1.2, party);
    return;
  }
  if (riders < w.target.riders) return void addAgent(w, "rider", x, z);
  if (cleaners < w.target.cleaners) addAgent(w, "cleaner", x, z);
}

function pickStall(w, a) {
  const stalls = w.plan.stalls;
  // Famous stalls draw the crowds; riders go anywhere.
  let total = 0;
  const weights = stalls.map((s) => {
    const q = w.stalls[s.id].queue.length;
    // The famous stall's queue is the long one everyone joins anyway.
    const wgt = ((s.famous ? 30 : 1) / (1 + q * (s.famous ? 0.02 : 0.1))) * (a.kind === "rider" && s.menu === "drinks" ? 0.2 : 1);
    total += wgt;
    return wgt;
  });
  let r = w.random() * total;
  for (let k = 0; k < stalls.length; k++) if ((r -= weights[k]) < 0) return k;
  return 0;
}

// The nearest free table for a party within reach, or null. In the 1980s a stall's own tables are only
// for its customers.
function freeTableNear(w, a, maxD = 30, stall = null) {
  let best = null;
  w.plan.tables.forEach((t, k) => {
    const tb = w.tables[k];
    if (!tb.free) return;
    if (tb.owner !== null && tb.owner !== stall) return;
    const d = dist(a.x, a.z, t.x, t.z) + w.random() * 3;
    if (d < maxD && (!best || d < best.d)) best = { k, d };
  });
  return best?.k ?? null;
}

// A seat a solo diner can share: at a table whose party is all seated, with a seat to spare.
function shareSeat(w, a) {
  let best = null;
  w.plan.tables.forEach((t, k) => {
    const tb = w.tables[k];
    if (tb.mine || tb.chope || tb.free) return;
    if (tb.owner !== null && tb.owner !== a.stall) return;
    const seat = tb.seats.indexOf(null);
    if (seat < 0) return;
    const party = w.parties.get(tb.by);
    if (party && party.coming > 0) return;
    const d = dist(a.x, a.z, t.x, t.z);
    if (d < 25 && (!best || d < best.d)) best = { k, seat, d };
  });
  return best;
}

// Where to stand and wait for a table: the one finishing soonest nearby.
function hoverTable(w, a) {
  let best = null;
  w.plan.tables.forEach((t, k) => {
    const d = dist(a.x, a.z, t.x, t.z);
    if (d > 40) return;
    const tb = w.tables[k];
    if (tb.owner !== null && tb.owner !== a.stall) return;
    const f = finishIn(w, k);
    if (!Number.isFinite(f)) return;
    const score = f + d / NPC + (tb.hovers ?? 0) * 25;
    if (!best || score < best.score) best = { k, score };
  });
  return best?.k ?? null;
}

function goTo(w, a, x, z) {
  // A few path searches a tick at most, so a big centre never stalls a frame; the rest wait a tick.
  if (w.paths >= (w.pathCap ?? 4)) return false;
  w.paths++;
  const p = findPath(w.plan, [a.x, a.z], [x, z], { maxNodes: 20000, roomy: false, greedy: 1.3 });
  a.path = p;
  a.pk = 0;
  return Boolean(p);
}

// Walks along the path. True on arrival.
function follow(a, dt, speed = NPC) {
  if (!a.path) return false;
  let left = speed * dt;
  while (left > 0 && a.pk < a.path.length) {
    const [tx, tz] = a.path[a.pk];
    const d = dist(a.x, a.z, tx, tz);
    if (d < 1e-3) {
      a.pk++;
      continue;
    }
    const step = Math.min(d, left);
    a.fx = (tx - a.x) / d;
    a.fz = (tz - a.z) / d;
    a.x += a.fx * step;
    a.z += a.fz * step;
    left -= step;
    if (step >= d) a.pk++;
  }
  a.speed = speed;
  return a.pk >= a.path.length;
}

function stepTo(a, x, z, dt, speed = NPC) {
  const d = dist(a.x, a.z, x, z);
  if (d < 0.05) {
    a.speed = 0;
    return true;
  }
  const s = Math.min(d, speed * dt);
  a.fx = (x - a.x) / d;
  a.fz = (z - a.z) / d;
  a.x += a.fx * s;
  a.z += a.fz * s;
  a.speed = speed;
  return false;
}

function remove(w, a) {
  const i = w.agents.indexOf(a);
  if (i >= 0) w.agents.splice(i, 1);
  w.byId.delete(a.id);
  if (a.stall !== null && a.state === "queue") {
    const st = w.stalls[a.stall];
    st.queue = st.queue.filter((q) => q !== a.id);
  } else for (const st of w.stalls) if (st.queue.includes(a.id)) st.queue = st.queue.filter((q) => q !== a.id);
  if (a.table !== null && w.tables[a.table]) {
    const tb = w.tables[a.table];
    tb.seats = tb.seats.map((x) => (x === a.id ? null : x));
  }
  if (a.hover !== undefined && a.hover !== null && w.tables[a.hover]) w.tables[a.hover].hovers = Math.max(0, (w.tables[a.hover].hovers ?? 1) - 1);
  notComing(w, a);
  const party = w.parties.get(a.party);
  if (party) {
    party.members.delete(a.id);
    if (!party.members.size) {
      releaseTable(w, party);
      w.parties.delete(party.id);
    }
  }
}

// Sit down at a seat of a table (the party's own, or one shared).
function takeSeat(w, a, k, seat) {
  const tb = w.tables[k];
  tb.seats[seat] = a.id;
  a.table = k;
  a.seat = seat;
}

// A party member who will not be sitting down after all (gone home, or taken it away).
function notComing(w, a) {
  const party = w.parties.get(a.party);
  if (!party || a.sat || a.gaveUp) return;
  a.gaveUp = true;
  party.coming = Math.max(0, party.coming - 1);
}

function stopHovering(w, a) {
  if (a.hover !== undefined && a.hover !== null && w.tables[a.hover]) w.tables[a.hover].hovers = Math.max(0, (w.tables[a.hover].hovers ?? 1) - 1);
  a.hover = null;
}

// Everyone in the party has eaten (and nobody is still coming): they get up together.
function partyDone(w, party) {
  if (party.coming > 0 || party.leaving) return false;
  for (const id of party.members) {
    const m = w.byId.get(id);
    if (m && m.state !== "done") return false;
  }
  return true;
}

function leaveTable(w, a) {
  const tb = w.tables[a.table];
  a.seated = false;
  if (tb) tb.seats[a.seat] = null;
  // Clear the tray if the era expects it; some people still forget.
  if (w.rules.trays && w.plan.trayReturns.length && w.random() < w.rules.trayRate) a.state = "totray";
  else {
    if (tb) tb.dirty++;
    a.tray = false;
    a.state = "leave";
  }
  a.path = null;
}

function thinkAgent(w, a, dt) {
  a.speed = 0;
  const plan = w.plan;
  const party = w.parties.get(a.party);
  switch (a.state) {
    case "arrive": {
      if (a.kind === "cleaner") {
        a.state = "patrol";
        return;
      }
      // The party's leader chopes a table on the way in, where the era does, if there is one free.
      if (a.kind === "diner" && a.lead && party && party.table === null && w.rules.chope && w.random() < (party.size > 1 ? 0.85 : 0.35)) {
        const k = freeTableNear(w, a, 28);
        if (k !== null) {
          const t = plan.tables[k];
          const tb = w.tables[k];
          tb.by = party.id;
          tb.chope = chopeItem(w.random);
          tb.free = false;
          party.table = k;
          if (goTo(w, a, t.x + 0.9, t.z)) {
            a.state = "tochope";
            return;
          }
        }
      }
      a.stall = pickStall(w, a);
      a.state = "tostall";
      a.path = null;
      return;
    }
    case "tochope":
      if (follow(a, dt)) {
        a.state = "tostall";
        a.stall = pickStall(w, a);
        a.path = null;
      }
      return;
    case "tostall": {
      const s = plan.stalls[a.stall];
      const st = w.stalls[a.stall];
      if (!a.path) {
        const [x, z] = queueSpot(plan, s, st.queue.length);
        if (!goTo(w, a, x, z)) {
          if (w.paths < (w.pathCap ?? 4)) a.state = "leave";
          return;
        }
      }
      if (follow(a, dt)) {
        st.queue.push(a.id);
        a.state = "queue";
        a.path = null;
      }
      return;
    }
    case "queue": {
      const s = plan.stalls[a.stall];
      const k = w.stalls[a.stall].queue.indexOf(a.id);
      if (k < 0) {
        a.state = "leave";
        return;
      }
      const [x, z] = queueSpot(plan, s, k);
      if (stepTo(a, x, z, dt, NPC * 0.8)) {
        a.fx = -s.face[0];
        a.fz = -s.face[1];
      }
      return;
    }
    case "totable": {
      if (!a.path) {
        if ((a.look2 -= dt) > 0) return;
        a.look2 = 0.6 + w.random() * 0.6;
        let k = party?.table ?? null;
        let seat = k === null ? -1 : w.tables[k].seats.indexOf(null);
        if (k === null) {
          // No table yet: a free one for the party, a spare seat for someone alone, or wait for one.
          k = freeTableNear(w, a, 40, a.stall);
          if (k !== null) {
            w.tables[k].by = party?.id ?? null;
            w.tables[k].free = false;
            if (party) party.table = k;
            seat = 0;
          } else if (!party || party.size === 1) {
            const sh = shareSeat(w, a);
            if (sh) [k, seat] = [sh.k, sh.seat];
          }
        }
        if (k === null || seat < 0) {
          const h = hoverTable(w, a);
          if (h === null) {
            a.wait += 0.4;
            // Nowhere to sit for a long while: they take it away.
            if (a.wait > 70) a.state = "leave";
            return;
          }
          a.hover = h;
          w.tables[h].hovers = (w.tables[h].hovers ?? 0) + 1;
          a.react = 0.5 + w.random() * 1.6;
          const t = plan.tables[h];
          const ang = w.random() * Math.PI * 2;
          if (!goTo(w, a, t.x + Math.cos(ang) * 1.5, t.z + Math.sin(ang) * 1.5)) {
            stopHovering(w, a);
            return;
          }
          a.state = "hover";
          return;
        }
        takeSeat(w, a, k, seat);
        if (!goTo(w, a, ...plan.tables[k].seats[seat])) {
          w.tables[k].seats[seat] = null;
          a.table = null;
          return;
        }
      }
      if (follow(a, dt)) {
        const tb = w.tables[a.table];
        if (party && tb.by === party.id) tb.chope = null;
        if (party && !a.sat) party.coming = Math.max(0, party.coming - 1);
        a.sat = true;
        a.seated = true;
        a.state = "eat";
        a.meal = MEAL[0] + w.random() * (MEAL[1] - MEAL[0]);
        a.timer = a.meal;
        a.path = null;
        const t = plan.tables[a.table];
        a.fx = t.x - a.x;
        a.fz = t.z - a.z;
      }
      return;
    }
    case "hover": {
      // Standing by with a tray, watching a table where people are finishing.
      follow(a, dt, NPC * 0.9);
      a.wait += dt;
      if ((a.look2 -= dt) > 0) return;
      a.look2 = 0.25;
      const t = plan.tables[a.hover];
      if (t) {
        a.fx = t.x - a.x;
        a.fz = t.z - a.z;
      }
      // Any table close by that has just come free: take it after a moment's notice.
      let take = null;
      plan.tables.forEach((tt, k) => {
        const tb = w.tables[k];
        if (take !== null || !tb.free || w.t - tb.freeAt < a.react) return;
        if (tb.owner !== null && tb.owner !== a.stall) return;
        if (dist(a.x, a.z, tt.x, tt.z) < 4.5) take = k;
      });
      if (take !== null) {
        stopHovering(w, a);
        const tb = w.tables[take];
        tb.by = party?.id ?? null;
        tb.free = false;
        if (party) party.table = take;
        a.state = "totable";
        a.path = null;
        a.look2 = 0;
        return;
      }
      // The table we were watching went to someone else, or is not finishing after all: look again.
      if (a.hover !== null && (!Number.isFinite(finishIn(w, a.hover)) || a.wait > 30)) {
        stopHovering(w, a);
        a.state = "totable";
        a.path = null;
        if (a.wait > 70) a.state = "leave";
      }
      return;
    }
    case "eat":
      a.timer -= dt;
      if (a.timer <= 0) {
        a.timer = 0;
        a.state = "done";
      }
      return;
    case "done": {
      // Finished: chatting until the rest of the party is done, then everyone gets up.
      if (!party) {
        leaveTable(w, a);
        return;
      }
      if (!partyDone(w, party)) return;
      party.leaving = true;
      for (const id of party.members) {
        const m = w.byId.get(id);
        if (m?.seated) leaveTable(w, m);
      }
      releaseTable(w, party);
      return;
    }
    case "totray": {
      if (!a.path) {
        let r = plan.trayReturns[0];
        for (const q of plan.trayReturns) if (dist(a.x, a.z, ...q.use) < dist(a.x, a.z, ...r.use)) r = q;
        if (!goTo(w, a, ...r.use)) return;
      }
      if (follow(a, dt)) {
        a.tray = false;
        a.state = "leave";
        a.path = null;
      }
      return;
    }
    case "patrol": {
      // Cleaners: to the messiest table, clear it, carry the plates off.
      if (!a.path) {
        let best = null;
        w.tables.forEach((tb, k) => {
          if (tb.dirty > 0 && tb.seats.every((x) => x === null || x === "me")) {
            const d = dist(a.x, a.z, plan.tables[k].x, plan.tables[k].z) - tb.dirty * 3;
            if (!best || d < best.d) best = { k, d };
          }
        });
        if (!best) {
          a.timer -= dt;
          if (a.timer <= 0) {
            a.timer = 4;
            const t = plan.tables[Math.floor(w.random() * plan.tables.length)];
            if (t) goTo(w, a, t.x + 1.35, t.z + 1.35);
          }
          return;
        }
        a.table = best.k;
        const t = plan.tables[best.k];
        if (!goTo(w, a, t.x + 1.3, t.z)) a.table = null;
        return;
      }
      if (follow(a, dt, NPC * 0.9)) {
        if (a.table !== null && w.tables[a.table].dirty > 0) {
          w.tables[a.table].dirty = 0;
          a.tray = true;
          a.timer = 2;
          a.state = "clearing";
        }
        a.path = null;
        a.table = null;
      }
      return;
    }
    case "rove": {
      if (!a.path) {
        a.timer -= dt;
        if (a.timer > 0) return;
        const b = plan.bounds;
        const x = b.x0 + 3 + w.random() * (b.x1 - b.x0 - 6);
        if (!goTo(w, a, x, (w.random() - 0.5) * 2)) return;
      }
      if (follow(a, dt, NPC * 0.55)) {
        a.path = null;
        a.timer = 4 + w.random() * 5;
        emit(w, "toktok", a.x, a.z);
      }
      return;
    }
    case "clearing":
      a.timer -= dt;
      if (a.timer <= 0) {
        a.tray = false;
        a.state = "patrol";
      }
      return;
    case "leave": {
      stopHovering(w, a);
      notComing(w, a);
      if (!a.path) {
        // Out by the nearest door.
        let best = plan.spawns[0];
        for (const p of plan.spawns) if (dist(a.x, a.z, p[0], p[1]) < dist(a.x, a.z, best[0], best[1])) best = p;
        if (!goTo(w, a, best[0], best[1])) {
          if (w.paths < (w.pathCap ?? 4)) remove(w, a);
          return;
        }
      }
      if (follow(a, dt) || outside(w, a.x, a.z, 2)) remove(w, a);
      return;
    }
  }
}

// ---------- The end ----------

// What the results card says.
export function walkSummary(w) {
  const me = w.me;
  return {
    list: w.list.map((it) => ({ label: it.label, who: it.who, got: it.got, code: it.code ?? null })),
    spent: w.stats.spent,
    left: me.money,
    minutes: Math.max(1, Math.round(w.t / 60)),
    seconds: Math.round(w.t),
    queued: Math.round(w.stats.queued),
    choped: w.stats.choped,
    returned: w.stats.returned,
    trays: w.rules.trays,
    chope: w.rules.chope,
    stalls: w.stats.stalls.size,
    tissueBought: w.stats.tissueBought,
    shooed: w.stats.shooed,
    ownTables: w.rules.ownTables,
  };
}

// For tests and the guide: a straight line between two points has no tables or stalls in the way.
export const clearLine = (w, a, b) => lineClear(w.plan, a[0], a[1], b[0], b[1]);
