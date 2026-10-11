// The guide: from a snapshot of the kitchen, works out the next useful thing for each of your chefs,
// based on the oldest tickets and what each chef is holding. Pure data, no DOM, so hosts and guests
// run the same code, and the tests can follow it like a player would.

import { INGREDIENTS } from "./dishes.js";
import { route, tileOf } from "./helpers.js";
import { COOK, WORK, cookCheck, drinksMatch, needsWork, wantedParts } from "./sim.js";

const name = (k) => (INGREDIENTS[k]?.name ?? k).toLowerCase();
const split = (sig) => {
  const [k, steps] = sig.split("|");
  return { k, s: steps ? steps.split(",") : [] };
};
const sigOf = (it) => `${it.k}|${it.s.join(",")}`;
const isPlate = (it) => it?.k === "plate" || it?.k === "box";
const isDrink = (it) => it?.k === "drink";
const HEAT_WORDS = { pot: "Cook it in the pot", wok: "Fry it in the wok", cooker: "Steam it in the rice cooker", grill: "Put it on the grill" };
const WORK_WORDS = {
  board: ["Chop it on the board", "Hold Chop to slice it"],
  shaver: ["Take it to the ice shaver", "Hold Chop to shave the ice"],
  press: ["Feed it to the sugarcane press", "Hold Chop to press the cane"],
  kaya: ["Take the toast to the kaya jar", "Hold Chop to spread kaya and butter"],
};

// Snapshot items carry their steps as "a,b". The guide wants arrays, like the kitchen itself.
export function unpack(p) {
  if (!p) return null;
  if (isPlate(p)) return { k: p.k, d: p.d ? 1 : 0, c: (p.c ?? []).map(unpack).filter(Boolean) };
  if (isDrink(p)) return { k: "drink", s: [], b: 0, dk: p.dk };
  return { k: p.k, s: p.s ? String(p.s).split(",") : [], b: p.b ? 1 : 0 };
}

// True if an item is on its way to becoming a component: same kind, steps so far all match.
const feeds = (it, target) => {
  const t = split(target);
  return !it.b && it.k === t.k && it.s.length <= t.s.length && it.s.every((x, i) => t.s[i] === x);
};

// How a component gets made: which crates, which heat, which benches.
export function planFor(sig) {
  const { k, s } = split(sig);
  let heat = null;
  for (const [type, list] of Object.entries(COOK)) {
    for (const recipe of list) {
      if (recipe.out.k === k && recipe.out.s.every((x, i) => s[i] === x) && recipe.out.s.length <= s.length) heat ??= { type, recipe };
    }
  }
  const done = heat ? heat.recipe.out.s.length : 0;
  const work = s.slice(done).map((step) => Object.keys(WORK).find((t) => WORK[t].verb === step)).filter(Boolean);
  return { sig, heat, inputs: heat ? heat.recipe.in : [k], work };
}

// Rarest ingredient first, so a smaller recipe never starts while the last thing is still on its way.
function rarestFirst(type, kinds) {
  const uses = (k) => COOK[type].filter((r) => r.in.includes(k)).length;
  return [...kinds].sort((a, b) => uses(a) - uses(b));
}

function within(small, big) {
  const left = [...big];
  for (const k of small) {
    const i = left.indexOf(k);
    if (i < 0) return false;
    left.splice(i, 1);
  }
  return true;
}

function minus(big, small) {
  const left = [...big];
  for (const k of small) {
    const i = left.indexOf(k);
    if (i >= 0) left.splice(i, 1);
  }
  return left;
}

// ---------- Reading a snapshot ----------

function orderRows(snap) {
  return (snap.o ?? []).map(([id, d, t, m, v, dk, md]) => ({ id, d, v, t, m, dk, md: md ?? "plain" }));
}

// Everything in the kitchen that could count towards an order, with where it is.
function inventory(snap, map) {
  const out = [];
  snap.s.forEach((s, i) => {
    const st = map.stations[i];
    if (!st || !s) return;
    if (s.it) {
      const it = unpack(s.it);
      if (isPlate(it)) out.push({ where: "plate", st: i, it });
      else out.push({ where: WORK[st.type] ? "bench" : "counter", st: i, it });
    }
    if (s.out) out.push({ where: "out", st: i, it: unpack(s.out) });
    if (COOK[st.type] && s.in?.length && !s.out) {
      const exact = cookCheck(st.type, s.in).exact;
      out.push({ where: s.ck !== undefined || (exact && s.se === undefined) ? "cooking" : "loading", st: i, kinds: s.in, exact });
    }
    if (s.bw) out.push({ where: "brew", st: i, it: { k: "drink", s: [], b: 0, dk: s.bw } });
  });
  for (const c of snap.c) if (c[5]) out.push({ where: "hand", slot: c[0], it: unpack(c[5]) });
  return out;
}

// Matches what is in the kitchen to the open orders, oldest first. Each thing counts once.
function allocate(snap, map, promises = []) {
  const orders = orderRows(snap);
  const inv = inventory(snap, map);
  const used = new Set();
  const plans = [];
  for (const o of orders) {
    const wanted = o.d === "drink" ? [] : wantedParts(o);
    const box = o.md === "takeaway";
    // This order's plate: clean, the right container, holding nothing it does not want.
    let plate = null;
    for (const x of inv) {
      if (used.has(x) || !isPlate(x.it) || x.it.d || (x.it.k === "box") !== box || !wanted.length) continue;
      const food = x.it.c.filter((it) => !isDrink(it)).map(sigOf);
      const drinks = x.it.c.filter(isDrink);
      if (!within(food, wanted)) continue;
      if (drinks.length > (o.dk ? 1 : 0) || drinks.some((d) => !drinksMatch(d.dk, o.dk))) continue;
      if (!plate || food.length > plate.food.length) plate = { ...x, food, drinks, ref: x };
    }
    if (plate) used.add(plate.ref);
    const promisedPlate = promises.some((p) => p.order === o.id && p.plate);
    const remaining = minus(wanted, plate?.food ?? []);
    const parts = remaining.map((sig) => {
      const plan = planFor(sig);
      const inputs = plan.heat?.recipe.in ?? [];
      // Most advanced first: ready, then needing a bench, cooking, loading a stove, a raw ingredient.
      const rank = (x) => {
        if (x.it && !isPlate(x.it) && !isDrink(x.it) && feeds(x.it, sig)) return sigOf(x.it) === sig ? 0 : 1;
        if (x.where === "cooking" && plan.heat && x.exact && feeds({ k: x.exact.out.k, s: x.exact.out.s, b: 0 }, sig) && map.stations[x.st].type === plan.heat.type) return 2;
        if (x.where === "loading" && plan.heat && map.stations[x.st].type === plan.heat.type && within(x.kinds, inputs)) return 3;
        if (x.it && !isPlate(x.it) && !isDrink(x.it) && !x.it.b && x.it.s.length === 0 && inputs.includes(x.it.k)) return 4;
        return -1;
      };
      let have = null;
      let best = -1;
      for (const x of inv) {
        if (used.has(x)) continue;
        const r = rank(x);
        if (r >= 0 && (best < 0 || r < best)) {
          best = r;
          have = x;
        }
      }
      if (have) used.add(have);
      // A stove being loaded, or one raw ingredient: other raw ingredients for the same recipe count too.
      const extra = [];
      let missing = [];
      if (plan.heat && (best === 3 || best === 4 || !have)) {
        missing = minus(inputs, have ? (best === 3 ? have.kinds : [have.it.k]) : []);
        for (const x of inv) {
          if (used.has(x) || !x.it || isPlate(x.it) || isDrink(x.it) || x.it.b || x.it.s.length || !missing.includes(x.it.k)) continue;
          used.add(x);
          extra.push(x);
          missing = minus(missing, [x.it.k]);
        }
      } else if (!have) missing = [...plan.inputs];
      // Ingredients another chef was already sent for.
      for (const p of promises) {
        if (!p.taken && p.sig === sig && missing.includes(p.kind)) {
          p.taken = true;
          missing = minus(missing, [p.kind]);
        }
      }
      return { sig, plan, have, rank: best, extra, missing };
    });
    let drink = null;
    if (o.dk) {
      const onPlate = plate?.drinks?.length > 0;
      if (!onPlate) {
        drink = inv.find((x) => !used.has(x) && isDrink(x.it) && drinksMatch(x.it.dk, o.dk)) ?? null;
        if (drink) used.add(drink);
      }
      if (!onPlate && !drink && promises.some((p) => p.order === o.id && p.drink)) drink = { promised: true };
    }
    plans.push({ o, wanted, box, plate, promisedPlate, parts, needsDrink: Boolean(o.dk) && !(plate?.drinks?.length > 0), drink });
  }
  return { plans, inv };
}

// ---------- Choosing a station ----------

const stationsOf = (map, type) => map.stations.filter((s) => s.type === type);

function nearest(list, from) {
  let best = null;
  let bd = Infinity;
  for (const st of list) {
    const d = (st.x + 0.5 - from.x) ** 2 + (st.z + 0.5 - from.z) ** 2;
    if (d < bd) {
      bd = d;
      best = st;
    }
  }
  return best;
}

function freeCounter(snap, map, from) {
  return nearest(
    stationsOf(map, "counter").filter((st) => !snap.s[st.i]?.it && !snap.s[st.i]?.fi),
    from,
  );
}

function canTake(snap, st, kind) {
  const s = snap.s[st.i] ?? {};
  if (s.out || s.ck !== undefined || s.fi) return false;
  return cookCheck(st.type, [...(s.in ?? []), kind]).possible;
}

const step = (st, act, why, extra = {}) => (st ? { st: st.i, act, why, ...extra } : null);

// ---------- The next step for one chef ----------

export function guideFor(snap, map, slot, { era = "today", promises = [] } = {}) {
  const row = snap.c.find((c) => c[0] === slot);
  if (!row || snap.over) return null;
  const me = { x: row[1], z: row[2] };
  const h = unpack(row[5]);
  const fire = map.stations.find((st) => snap.s[st.i]?.fi > 0);
  const extName = era === "1950s" ? "wet towel" : "extinguisher";

  // Fires first.
  if (h?.k === "ext") {
    if (fire) return step(fire, "hold", `Hold Chop on the fire`);
    return step(nearest(stationsOf(map, "ext"), me), "press", `Put the ${extName} back`);
  }
  if (fire) {
    if (h) return step(freeCounter(snap, map, me), "press", `Put that down: fire!`);
    const stand = stationsOf(map, "ext").find((st) => snap.s[st.i]?.it?.k === "ext");
    if (stand) return step(stand, "press", `Fire! Grab the ${extName}`);
  }
  if (h?.b) return step(nearest(stationsOf(map, "bin"), me), "press", "Burnt. Bin it");
  if (h?.k === "plate" && h.d) return step(nearest(stationsOf(map, "sink"), me), "press", "Take it to the sink");

  const { plans, inv } = allocate(snap, map, promises);
  const mine = (x) => x?.where === "hand" && x.slot === slot;

  if (isPlate(h)) return withPlate(snap, map, me, h, plans, mine, era);
  if (isDrink(h)) {
    const plan = plans.find((p) => mine(p.drink));
    if (!plan) return step(nearest(stationsOf(map, "bin"), me), "press", "No one ordered that. Bin it");
    if (plan.o.d === "drink") return step(nearest(stationsOf(map, "hatch"), me), "press", "Serve it at the hatch");
    if (plan.plate && plan.plate.st !== undefined) return step(map.stations[plan.plate.st], "press", "Put it on the plate");
    return step(freeCounter(snap, map, nearest(stationsOf(map, "hatch"), me) ?? me), "press", "Put it down near the hatch");
  }
  if (h) return withFood(snap, map, me, h, plans, mine);
  return emptyHanded(snap, map, me, plans, inv, era, promises);
}

function withPlate(snap, map, me, h, plans, mine, era) {
  const plan = plans.find((p) => mine(p.plate));
  const word = h.k === "box" ? (era === "1950s" ? "wrap" : "box") : "plate";
  if (!plan) {
    if (h.c.length) return step(nearest(stationsOf(map, "bin"), me), "press", `No order wants this. Bin it, keep the ${word}`);
    // The wrong container for every order: put it back.
    return step(nearest(stationsOf(map, h.k === "box" ? "boxes" : "rack"), me), "press", `Put the ${word} back`);
  }
  const complete = !plan.parts.length && !(plan.needsDrink && plan.plate.drinks.length === 0);
  if (complete) return step(nearest(stationsOf(map, "hatch"), me), "press", "Serve it at the hatch");
  // Collect what is ready.
  for (const part of plan.parts) {
    if (part.rank === 0 && part.have.st !== undefined) return step(map.stations[part.have.st], "press", `Add the ${name(split(part.sig).k)}`);
  }
  if (plan.needsDrink && plan.drink?.it && plan.drink.where !== "brew" && plan.drink.st !== undefined) {
    return step(map.stations[plan.drink.st], "press", "Add the drink");
  }
  return step(freeCounter(snap, map, nearest(stationsOf(map, "hatch"), me) ?? me), "press", `Put the ${word} down for now`);
}

function withFood(snap, map, me, h, plans, mine) {
  for (const plan of plans) {
    for (const part of plan.parts) {
      if (!mine(part.have) && !part.extra.some(mine)) continue;
      const done = sigOf(h) === part.sig;
      if (done) {
        if (plan.plate?.st !== undefined) return step(map.stations[plan.plate.st], "press", "Put it on the plate");
        if (plan.plate) return step(freeCounter(snap, map, me), "press", "Put it down for the plate");
        const home = nearest(stationsOf(map, plan.box ? "boxes" : "rack"), me) ?? me;
        return step(freeCounter(snap, map, home), "press", `Put it down, then grab a ${plan.box ? "box" : "plate"}`);
      }
      const { plan: how } = part;
      // Raw and headed for the heat.
      if (h.s.length === 0 && how.heat && how.heat.recipe.in.includes(h.k)) {
        const fits = (st) => !snap.s[st.i]?.in?.length || within([...snap.s[st.i].in, h.k], how.heat.recipe.in);
        const stoves = stationsOf(map, how.heat.type).filter((st) => canTake(snap, st, h.k) && fits(st));
        const loading = stoves.filter((st) => snap.s[st.i]?.in?.length);
        const st = nearest(loading.length ? loading : stoves, me);
        if (st) return step(st, "press", HEAT_WORDS[how.heat.type]);
        return step(freeCounter(snap, map, me), "press", `The ${how.heat.type} is busy. Put it down`);
      }
      // Cooked, now for a bench.
      const benchType = how.work[h.s.length - (how.heat ? how.heat.recipe.out.s.length : 0)] ?? how.work[0];
      if (benchType) {
        const bench = nearest(stationsOf(map, benchType).filter((st) => !snap.s[st.i]?.it), me);
        if (bench) return step(bench, "press", WORK_WORDS[benchType][0]);
        return step(freeCounter(snap, map, me), "press", "The board is busy. Put it down");
      }
    }
  }
  // Nobody needs it right now.
  if (h.s.length === 0 && INGREDIENTS[h.k]?.cost !== undefined) {
    const crate = map.stations.find((st) => st.type === "crate" && st.ing === h.k);
    if (crate) return step(crate, "press", "Not needed now. Back in its crate");
  }
  return step(nearest(stationsOf(map, "bin"), me), "press", "Not needed now. Bin it");
}

function emptyHanded(snap, map, me, plans, inv, era, promises) {
  // Things held by someone else, or that another of your chefs was just sent for.
  const othersHold = (x) => x?.where === "hand" || (x?.st !== undefined && promises.some((p) => p.st === x.st));
  for (const plan of plans) {
    const word = plan.box ? (era === "1950s" ? "paper wrap" : era === "2065" ? "tiffin" : "takeaway box") : "plate";
    // A finished plate on a counter: take it out.
    const complete = plan.plate && !plan.parts.length && !(plan.needsDrink && !plan.plate.drinks.length);
    if (complete && plan.plate.st !== undefined && !othersHold(plan.plate)) return step(map.stations[plan.plate.st], "press", "Pick up the finished plate");
    if (complete) continue;
    for (const part of plan.parts) {
      const { have, plan: how } = part;
      const k = split(part.sig).k;
      if (have && part.rank === 0) {
        if (othersHold(have)) continue;
        if (!plan.plate && !plan.promisedPlate) return grabContainer(snap, map, me, plan, word);
        if (have.where === "out") return step(map.stations[have.st], "press", `Take the ${name(k)} off the heat`);
        if (plan.plate?.st !== undefined) return step(map.stations[have.st], "press", `Pick up the ${name(k)}`);
        continue;
      }
      if (have && part.rank === 1) {
        if (othersHold(have)) continue;
        const st = map.stations[have.st];
        if (have.where === "bench" && needsWork(st.type, have.it)) return step(st, "hold", WORK_WORDS[st.type][1]);
        if (have.where === "out") return step(st, "press", `Take the ${name(k)} off the heat`);
        return step(st, "press", `Pick up the ${name(have.it.k)}`);
      }
      if (have && part.rank === 2) continue; // cooking
      // Raw ingredients lying about go first, then whatever is still missing.
      for (const x of [have, ...part.extra]) {
        if (x?.it && x.st !== undefined && !othersHold(x)) return step(map.stations[x.st], "press", `Pick up the ${name(x.it.k)}`);
      }
      const ordered = how.heat ? rarestFirst(how.heat.type, part.missing) : part.missing;
      for (const kind of ordered) {
        const crate = map.stations.find((st) => st.type === "crate" && st.ing === kind);
        if (crate) return step(crate, "press", `Grab ${name(kind)} from its crate`, { promise: { sig: part.sig, kind } });
      }
    }
    if (plan.needsDrink && !plan.drink) {
      const urn = nearest(stationsOf(map, "urn").filter((st) => !snap.s[st.i]?.it && !snap.s[st.i]?.bw && !othersHold({ st: st.i })), me);
      if (urn) return step(urn, "brew", "Pull the drink at the urn", { dk: plan.o.dk, promise: { order: plan.o.id, drink: true } });
    }
    if (plan.drink?.where === "brew") continue;
    if (plan.needsDrink && plan.drink?.it && plan.o.d === "drink" && plan.drink.st !== undefined && !othersHold(plan.drink)) {
      return step(map.stations[plan.drink.st], "press", "Pick up the drink");
    }
    // Everything is on its way: get a plate ready while it cooks.
    if (plan.parts.length && !plan.plate && !plan.promisedPlate) return grabContainer(snap, map, me, plan, word);
  }
  // Nothing urgent: keep the plates coming.
  const rack = stationsOf(map, "rack")[0];
  if (rack && (snap.s[rack.i]?.n ?? 0) === 0) {
    const sink = stationsOf(map, "sink").find((st) => snap.s[st.i]?.n > 0);
    if (sink) return step(sink, "hold", "Hold Chop to wash plates");
    const ret = stationsOf(map, "return").find((st) => snap.s[st.i]?.n > 0);
    if (ret) return step(ret, "press", "Bring the dirty plates to the sink");
  }
  const cooking = inv.find((x) => x.where === "cooking");
  if (cooking) return step(map.stations[cooking.st], "wait", `Wait for the ${map.stations[cooking.st].type}`);
  return null;
}

function grabContainer(snap, map, me, plan, word) {
  if (plan.box) return step(nearest(stationsOf(map, "boxes"), me), "press", `Grab a ${word}`, { promise: { order: plan.o.id, plate: true } });
  const rack = stationsOf(map, "rack").find((st) => (snap.s[st.i]?.n ?? 0) > 0);
  if (rack) return step(rack, "press", "Grab a clean plate", { promise: { order: plan.o.id, plate: true } });
  const sink = stationsOf(map, "sink").find((st) => snap.s[st.i]?.n > 0);
  if (sink) return step(sink, "hold", "No clean plates. Hold Chop to wash");
  const ret = stationsOf(map, "return").find((st) => snap.s[st.i]?.n > 0);
  if (ret) return step(ret, "press", "No clean plates. Bring dirty ones to the sink");
  return null;
}

// Guides for several chefs at once. Each one promises what it is fetching, so two chefs are not sent
// for the same chicken.
export function guidesFor(snap, map, slots, opts = {}) {
  const promises = [];
  const out = [];
  for (const slot of slots) {
    const g = guideFor(snap, map, slot, { ...opts, promises: promises.map((p) => ({ ...p })) });
    if (!g) continue;
    // Crates can serve two chefs at once. Everything else is spoken for.
    promises.push({ ...(g.promise ?? {}), st: map.stations[g.st].type === "crate" ? undefined : g.st });
    const row = snap.c.find((c) => c[0] === slot);
    const from = tileOf({ map }, { x: row[1], z: row[2] });
    const r = route({ map }, from, map.stations[g.st]);
    out.push({ slot, ...g, path: r?.path ?? [] });
  }
  return out;
}

// Stations the oldest ticket needs, to pulse: crates, heat, benches, the urn, and boxes for takeaway.
export function stationsForOrder(map, order) {
  if (!order) return [];
  const [, d, , , v, dk, md] = order;
  const set = new Set();
  if (d !== "drink") for (const sig of wantedParts({ d, v, md })) for (const i of stationsForPart(map, sig)) set.add(i);
  if (dk) for (const st of stationsOf(map, "urn")) set.add(st.i);
  if (md === "takeaway") for (const st of stationsOf(map, "boxes")) set.add(st.i);
  return [...set];
}

// Stations one ticket part needs, the first crate first, for pinging from a ticket.
export function stationsForPart(map, sig) {
  const plan = planFor(sig);
  const out = [];
  for (const kind of plan.inputs) {
    const crate = map.stations.find((st) => st.type === "crate" && st.ing === kind);
    if (crate) out.push(crate.i);
  }
  if (plan.heat) for (const st of stationsOf(map, plan.heat.type)) out.push(st.i);
  for (const type of plan.work) for (const st of stationsOf(map, type)) out.push(st.i);
  return out;
}
