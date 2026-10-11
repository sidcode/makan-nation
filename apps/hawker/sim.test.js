import { expect, test } from "bun:test";
import { defaultState } from "../kopi/compiler.js";
import { DISHES, INGREDIENTS, partsOf } from "./dishes.js";
import { profitAndLoss, RENT_HOURLY, wageFor } from "./economy.js";
import { ERAS, eraById } from "./eras.js";
import { NAMES, ROLES, rolesFor } from "./helpers.js";
import { approaches, LEVELS, parseLevel } from "./levels.js";
import { cleanInput, COOK, createSim, drainEvents, packDrink, snapshot, step, targetOf, unpackDrink, WORK } from "./sim.js";

const DT = 1 / 60;

// ---------- A very fast, slightly magic player for tests ----------

function stand(sim, slot, st) {
  const a = approaches(sim.map, st)[0];
  if (!a) throw new Error(`no floor next to ${st.type} at ${st.x},${st.z}`);
  const ch = sim.chefs[slot];
  Object.assign(ch, { x: a.x + 0.5, z: a.z + 0.5, vx: 0, vz: 0, fx: a.fx, fz: a.fz });
  expect(targetOf(sim, ch)).toBe(st);
  return st;
}

const find = (sim, type, pred = () => true) => sim.stations.find((s) => s.type === type && pred(s));
const inp = (sim, slot) => (sim.inputs[slot] ??= { mx: 0, mz: 0, p: 0, u: false });

function press(sim, slot = 0) {
  inp(sim, slot).p += 1;
  step(sim, DT);
}

function hold(sim, slot, seconds) {
  inp(sim, slot).u = true;
  for (let t = 0; t < seconds; t += DT) step(sim, DT);
  inp(sim, slot).u = false;
}

function wait(sim, seconds) {
  for (let t = 0; t < seconds; t += DT) step(sim, DT);
}

let brewSeq = 0;
function brew(sim, slot, dk) {
  inp(sim, slot).b = { n: ++brewSeq, d: dk };
  step(sim, DT);
}

const parse = (s) => {
  const [k, steps] = s.split("|");
  return { k, s: steps ? steps.split(",") : [] };
};

// Makes one component and leaves it at a station. Returns that station.
function make(sim, target, used = new Set()) {
  const t = parse(target);
  const crate = find(sim, "crate", (s) => s.ing === t.k);
  if (crate && t.s.length === 0) {
    stand(sim, 0, crate);
    press(sim);
    const counter = find(sim, "counter", (s) => !s.item && approaches(sim.map, s).length && !used.has(s));
    stand(sim, 0, counter);
    press(sim);
    used.add(counter);
    return counter;
  }
  const last = t.s[t.s.length - 1];
  const workType = Object.keys(WORK).find((w) => WORK[w].verb === last);
  if (workType) {
    const prev = `${t.k}|${t.s.slice(0, -1).join(",")}`;
    const src = make(sim, prev, used);
    stand(sim, 0, src);
    press(sim); // pick up
    const bench = find(sim, workType, (s) => !s.item && !used.has(s));
    stand(sim, 0, bench);
    press(sim);
    hold(sim, 0, WORK[workType].time + 0.1);
    used.add(bench);
    return bench;
  }
  for (const [type, recipes] of Object.entries(COOK)) {
    const recipe = recipes.find((r) => r.out.k === t.k && r.out.s.join() === t.s.join());
    if (!recipe) continue;
    const st = find(sim, type, (s) => !s.out && !s.items.length && !s.recipe && !used.has(s));
    if (!st) continue;
    for (const k of recipe.in) {
      stand(sim, 0, find(sim, "crate", (s) => s.ing === k));
      press(sim);
      stand(sim, 0, st);
      press(sim);
    }
    wait(sim, 2.3 + recipe.time + 0.2);
    expect(st.out?.k).toBe(t.k);
    used.add(st);
    return st;
  }
  throw new Error(`cannot make ${target}`);
}

function serveOrder(sim, order) {
  const used = new Set();
  const parts = partsOf(order.d, order.v);
  const spots = parts.map((p) => make(sim, p, used));
  let urn = null;
  if (order.dk) {
    urn = find(sim, "urn", (s) => !s.item && !s.brew);
    stand(sim, 0, urn);
    brew(sim, 0, order.dk);
    wait(sim, 2.4);
    expect(urn.item?.k).toBe("drink");
  }
  if (parts.length) {
    stand(sim, 0, find(sim, "rack"));
    press(sim);
    for (const spot of spots) {
      stand(sim, 0, spot);
      press(sim);
    }
    if (urn) {
      stand(sim, 0, urn);
      press(sim);
    }
  } else {
    stand(sim, 0, urn);
    press(sim);
  }
  stand(sim, 0, find(sim, "hatch"));
  drainEvents(sim);
  press(sim);
  return drainEvents(sim);
}

const solo = (level, opts) => createSim(level, [{ name: "Ah Boy" }], opts);

// ---------- Levels ----------

test("every kitchen parses, every station can be reached, and the floor is one piece", () => {
  for (const level of LEVELS) {
    const map = parseLevel(level);
    for (const st of map.stations) {
      if (st.type !== "counter") expect(approaches(map, st).length).toBeGreaterThan(0);
    }
    const floor = [];
    for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.grid[z][x] === -1) floor.push(`${x},${z}`);
    const seen = new Set([floor[0]]);
    const q = [floor[0]];
    while (q.length) {
      const [x, z] = q.shift().split(",").map(Number);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${x + dx},${z + dz}`;
        if (map.grid[z + dz]?.[x + dx] === -1 && !seen.has(k)) seen.add(k), q.push(k);
      }
    }
    expect(seen.size).toBe(floor.length);
    for (const t of ["hatch", "rack", "return", "sink", "bin"]) expect(map.stations.some((s) => s.type === t)).toBe(true);
    for (const d of level.dishes) expect(DISHES[d]).toBeDefined();
  }
});

test("every dish and every variant can be cooked and served in its own kitchen", () => {
  let count = 0;
  for (const level of LEVELS) {
    for (const d of level.dishes) {
      for (const v of Object.keys(DISHES[d].variants)) {
        const sim = solo(level.id);
        sim.spawnT = 1e9;
        const dk = DISHES[d].drink ? packDrink(Object.assign(defaultState(), { base: "teh", milk: "evaporated", sugar: 1 })) : null;
        const order = { id: 1, d, v, t: 999, m: 999, dk };
        sim.orders.push(order);
        const ev = serveOrder(sim, order);
        expect(ev.find((e) => e[0] === "serve"), `${level.id} ${d} ${v}`).toBeDefined();
        expect(sim.served).toBe(1);
        count++;
      }
    }
  }
  expect(count).toBeGreaterThanOrEqual(20);
});

test("variants are different dishes: steamed chicken rice is not roasted", () => {
  const sim = solo("chickenrice");
  sim.spawnT = 1e9;
  const steamed = { id: 1, d: "chickenrice", v: "steamed", t: 999, m: 999, dk: null };
  const roasted = { id: 2, d: "chickenrice", v: "roasted", t: 999, m: 999, dk: null };
  sim.orders.push(roasted);
  const ev = serveOrder(sim, steamed);
  expect(ev.some((e) => e[0] === "wrong")).toBe(true);
  expect(sim.served).toBe(0);
});

test("black carrot cake waits for the black sauce, white one cooks after a moment", () => {
  const sim = solo("friednoodles");
  sim.spawnT = 1e9; // no orders: they change how long a wok waits
  const wok = find(sim, "wok");
  for (const k of ["radish", "egg"]) {
    stand(sim, 0, find(sim, "crate", (s) => s.ing === k));
    press(sim);
    stand(sim, 0, wok);
    press(sim);
  }
  expect(wok.recipe).toBe(null);
  expect(wok.settle).toBeGreaterThan(0);
  stand(sim, 0, find(sim, "crate", (s) => s.ing === "blacksauce"));
  press(sim);
  stand(sim, 0, wok);
  press(sim);
  expect(wok.recipe.out.k).toBe("carrotblack");

  const wok2 = sim.stations.filter((s) => s.type === "wok")[1];
  for (const k of ["radish", "egg"]) {
    stand(sim, 0, find(sim, "crate", (s) => s.ing === k));
    press(sim);
    stand(sim, 0, wok2);
    press(sim);
  }
  wait(sim, 2.3);
  expect(wok2.recipe.out.k).toBe("carrotwhite");
});

test("a pot waits longer for the rest of a dish someone ordered", () => {
  const sim = solo("noodlesoup", { calm: true });
  sim.spawnT = 1e9;
  sim.orders.push({ id: 900, d: "laksa", v: "plain", t: 999, m: 999, dk: null, md: "plain", lg: "en" });
  const pot = find(sim, "pot");
  stand(sim, 0, find(sim, "crate", (s) => s.ing === "noodles"));
  press(sim);
  stand(sim, 0, pot);
  press(sim);
  expect(pot.settle).toBeGreaterThan(5);
  wait(sim, 4);
  expect(pot.recipe).toBe(null);
  stand(sim, 0, find(sim, "crate", (s) => s.ing === "prawn"));
  press(sim);
  stand(sim, 0, pot);
  press(sim);
  expect(pot.recipe?.out.k).toBe("laksa");
});

test("woks burn food, rice cookers keep warm", () => {
  const sim = solo("friednoodles");
  sim.spawnT = 1e9;
  const wok = make(sim, "ckt|");
  wait(sim, 14.2);
  expect(wok.out.b).toBe(1);
  const sim2 = solo("chickenrice");
  const cooker = make(sim2, "rice|steam");
  wait(sim2, 40);
  expect(cooker.out.b).toBe(0);
});

// ---------- Kopi ----------

test("drink orders match by the Kopi Compiler's rules", () => {
  const sim = solo("chickenrice");
  sim.spawnT = 1e9;
  const want = Object.assign(defaultState(), { base: "kopi", milk: "none", sugar: 0, ice: true });
  const order = { id: 1, d: "drink", v: "plain", t: 999, m: 999, dk: packDrink(want) };
  sim.orders.push(order);
  const urn = find(sim, "urn");
  stand(sim, 0, urn);
  // Wrong drink first: kopi-o, normal sugar, iced.
  brew(sim, 0, packDrink(Object.assign(defaultState(), { base: "kopi", milk: "none", sugar: 2, ice: true })));
  wait(sim, 2.4);
  press(sim);
  stand(sim, 0, find(sim, "hatch"));
  drainEvents(sim);
  press(sim);
  expect(drainEvents(sim).some((e) => e[0] === "wrong")).toBe(true);
  stand(sim, 0, find(sim, "bin"));
  press(sim);
  // Right one: kopi-o kosong peng.
  const ev = serveOrder(sim, order);
  expect(ev.some((e) => e[0] === "serve")).toBe(true);
});

test("pressing an idle urn asks the player's screen to open the kopi builder", () => {
  const sim = solo("chickenrice");
  stand(sim, 0, find(sim, "urn"));
  drainEvents(sim);
  press(sim);
  const ev = drainEvents(sim).find((e) => e[0] === "urn");
  expect(ev?.[3]).toBe(0);
});

test("packed drinks are checked before use", () => {
  expect(unpackDrink(["kopi", "none", 0, "normal", 1, 0, 0, 0, 0]).base).toBe("kopi");
  expect(unpackDrink(["beer", "none", 0, "normal", 1, 0, 0, 0, 0])).toBe(null);
  expect(unpackDrink(["kopi", "none", 7, "normal", 1, 0, 0, 0, 0])).toBe(null);
  expect(cleanInput({ mx: 9, mz: "x", p: 1.5, u: "yes" })).toEqual({ mx: 1, mz: 0, p: 0, u: false });
  expect(cleanInput({ b: { n: 3, d: ["kopi", "none", 0, "normal", 1, 0, 0, 0, 0] } }).b.n).toBe(3);
  expect(cleanInput({ b: { n: 3, d: "<script>" } }).b).toBeUndefined();
  expect(cleanInput(null)).toEqual({ mx: 0, mz: 0, p: 0, u: false });
});

// ---------- Helpers ----------

const crew = (roles) => roles.map((role, i) => ({ role, name: NAMES[i] }));

test("a dishwasher brings dirty plates over and washes them", () => {
  const sim = createSim("chickenrice", [], { helpers: crew(["washer"]) });
  sim.spawnT = 1e9;
  find(sim, "return").dirty = 2;
  const rack = find(sim, "rack");
  const before = rack.plates;
  wait(sim, 20);
  expect(rack.plates).toBe(before + 2);
});

test("cooks start what the oldest order needs, a slicer slices it", () => {
  const sim = createSim("chickenrice", [], { helpers: crew(["pot", "cooker", "slicer"]) });
  sim.spawnT = 1e9;
  sim.orders.push({ id: 1, d: "chickenrice", v: "steamed", t: 999, m: 999, dk: null });
  wait(sim, 30);
  const sliced = sim.stations.find((s) => s.type === "board" && s.item?.k === "chicken");
  expect(sliced?.item.s).toEqual(["poach", "chop"]);
  expect(sim.stations.some((s) => s.type === "cooker" && s.out?.k === "rice")).toBe(true);
  // Nobody makes more than the order needs.
  const chickens = sim.stations.filter((s) => s.out?.k === "chicken" || s.item?.k === "chicken" || s.items.some((i) => i.k === "chicken"));
  expect(chickens.length).toBe(1);
});

test("a wok cook makes black carrot cake without it turning white", () => {
  const sim = createSim("friednoodles", [], { helpers: crew(["wok"]) });
  sim.spawnT = 1e9;
  sim.orders.push({ id: 1, d: "carrotcake", v: "black", t: 999, m: 999, dk: null });
  wait(sim, 25);
  const made = sim.stations.filter((s) => s.out || s.item).map((s) => (s.out ?? s.item).k);
  expect(made).toContain("carrotblack");
  expect(made).not.toContain("carrotwhite");
});

test("a grill cook makes murtabak in one go", () => {
  const sim = createSim("prata", [], { helpers: crew(["grill"]) });
  sim.spawnT = 1e9;
  sim.orders.push({ id: 1, d: "murtabak", v: "plain", t: 999, m: 999, dk: null });
  wait(sim, 30);
  const made = sim.stations.filter((s) => s.out || s.item).map((s) => (s.out ?? s.item).k);
  expect(made).toContain("murtabak");
  expect(made).not.toContain("prata");
  expect(made).not.toContain("prataegg");
});

test("a grill cook roasts for roasted chicken rice orders", () => {
  const sim = createSim("chickenrice", [], { helpers: crew(["grill"]) });
  sim.spawnT = 1e9;
  sim.orders.push({ id: 1, d: "chickenrice", v: "roasted", t: 999, m: 999, dk: null });
  wait(sim, 15);
  expect(sim.stations.some((s) => s.type === "grill" && (s.out?.s[0] === "roast" || s.recipe?.out.s[0] === "roast"))).toBe(true);
});

test("a kopi uncle pulls drink orders and serves them himself", () => {
  const sim = createSim("prata", [], { helpers: crew(["kopi"]) });
  sim.spawnT = 1e9;
  const dk = packDrink(Object.assign(defaultState(), { base: "teh", tarik: true, sugar: 2 }));
  sim.orders.push({ id: 1, d: "drink", v: "plain", t: 999, m: 999, dk });
  wait(sim, 20);
  expect(sim.served).toBe(1);
});

test("an ice shaver shaves ice for desserts", () => {
  const sim = createSim("dessert", [], { helpers: crew(["iceman"]) });
  sim.spawnT = 1e9;
  sim.orders.push({ id: 1, d: "chendol", v: "plain", t: 999, m: 999, dk: null });
  wait(sim, 15);
  expect(sim.stations.some((s) => s.type === "shaver" && s.item?.s.join() === "shave")).toBe(true);
});

test("helpers only offered where their stations exist", () => {
  const level = LEVELS.find((l) => l.id === "friednoodles");
  const map = parseLevel(level);
  const parts = level.dishes.flatMap((d) => Object.values(DISHES[d].variants).flatMap((v) => v.parts));
  const roles = rolesFor(map, level, parts);
  expect(roles).toContain("wok");
  expect(roles).toContain("washer");
  expect(roles).not.toContain("kopi");
  expect(roles).not.toContain("grill");
  for (const r of Object.keys(ROLES)) expect(ROLES[r].name).toBeTruthy();
});

test("helpers in a full round never crash and the round ends", () => {
  for (const level of LEVELS) {
    const map = parseLevel(level);
    const parts = level.dishes.flatMap((d) => Object.values(DISHES[d].variants).flatMap((v) => v.parts));
    const roles = rolesFor(map, level, parts).slice(0, 3);
    const sim = createSim(level.id, [{ name: "P1" }], { helpers: crew(roles), era: "1950s" });
    wait(sim, 185);
    expect(sim.over).toBe(true);
    expect(JSON.stringify(snapshot(sim)).length).toBeLessThan(12000);
  }
});

// ---------- Money ----------

test("profit and loss adds up, and costs scale with the era", () => {
  const today = eraById("today");
  const pl = profitAndLoss({ takings: 50, tips: 5, spent: 15, helpers: 1, era: today });
  const sum = pl.lines.reduce((n, l) => n + l.value, 0);
  expect(pl.profit).toBeCloseTo(sum);
  expect(pl.lines.find((l) => l.key === "rent").value).toBeCloseTo(-RENT_HOURLY);
  expect(wageFor(eraById("1950s"))).toBeLessThan(wageFor(today));
  for (const e of ERAS) expect(e.card.length).toBeGreaterThan(0), expect(e.sources.length).toBeGreaterThan(0);
});

test("taking from a crate costs money, putting it back refunds it", () => {
  const sim = solo("chickenrice");
  const crate = find(sim, "crate", (s) => s.ing === "chicken");
  stand(sim, 0, crate);
  press(sim);
  expect(sim.spent).toBeCloseTo(INGREDIENTS.chicken.cost);
  press(sim);
  expect(sim.spent).toBeCloseTo(0);
});

test("orders arrive, expire, the round ends with a profit and loss and stars", () => {
  const sim = solo("malay", { era: "1980s" });
  wait(sim, 3);
  expect(sim.orders.length).toBeGreaterThan(0);
  wait(sim, 200);
  expect(sim.over).toBe(true);
  expect(sim.missed).toBeGreaterThan(0);
  expect(sim.pl.profit).toBeLessThan(0);
  const snap = snapshot(sim);
  expect(snap.st).toBe(0);
  expect(snap.pl.lines.length).toBe(6);
});

test("chefs cannot walk through counters", () => {
  const sim = solo("chickenrice");
  sim.inputs[0] = { mx: 0, mz: -1, p: 0, u: false };
  wait(sim, 5);
  expect(sim.chefs[0].z).toBeGreaterThan(1 + 0.29);
});

// ---------- Overcooked style extras ----------

test("dash covers more ground than walking", () => {
  const walk = solo("chickenrice", { calm: true });
  const dash = solo("chickenrice", { calm: true });
  for (const sim of [walk, dash]) {
    Object.assign(sim.chefs[0], { x: 1.5, z: 5.5, fx: 1, fz: 0 });
    sim.inputs[0] = { mx: 1, mz: 0, p: 0, u: false, d: 0 };
  }
  dash.inputs[0].d = 1;
  wait(walk, 0.4);
  wait(dash, 0.4);
  expect(dash.chefs[0].x).toBeGreaterThan(walk.chefs[0].x + 0.6);
});

test("thrown ingredients land on counters, go into pots, or get caught", () => {
  const sim = createSim("chickenrice", [{ name: "A" }, { name: "B" }], { calm: true });
  sim.spawnT = 1e9;
  stand(sim, 0, find(sim, "crate", (s) => s.ing === "chicken"));
  press(sim, 0);
  // Teammate stands three tiles away, in line.
  const a = sim.chefs[0];
  Object.assign(a, { x: 2.5, z: 2.5, fx: 1, fz: 0 });
  Object.assign(sim.chefs[1], { x: 5.5, z: 2.5 });
  inp(sim, 0).t = 1;
  wait(sim, 0.8);
  expect(sim.chefs[1].hold?.k).toBe("chicken");
  // Throw at the pot from across the floor: pots sit on the island, row 3.
  const pot = find(sim, "pot");
  Object.assign(sim.chefs[1], { x: pot.x + 0.5, z: 1.5, fx: 0, fz: 1 });
  Object.assign(a, { x: 9.5, z: 6.5 });
  inp(sim, 1).t = 1;
  wait(sim, 0.6);
  expect(pot.items.map((i) => i.k)).toEqual(["chicken"]);
  // Cooked things cannot be thrown.
  sim.chefs[1].hold = { id: 99, k: "rice", s: ["steam"], b: 0 };
  drainEvents(sim);
  inp(sim, 1).t = 2;
  step(sim, DT);
  expect(sim.chefs[1].hold?.k).toBe("rice");
});

test("burnt food catches fire, fire spreads, the extinguisher puts it out", () => {
  const sim = solo("friednoodles", { calm: true });
  sim.spawnT = 1e9;
  const wok = make(sim, "ckt|");
  wait(sim, 14.2 + 5.2);
  expect(wok.fire).toBeGreaterThan(0);
  // Nobody can use a burning station.
  stand(sim, 0, wok);
  drainEvents(sim);
  press(sim);
  expect(drainEvents(sim).some((e) => e[0] === "nope")).toBe(true);
  wait(sim, 25);
  const burning = sim.stations.filter((s) => s.fire > 0);
  expect(burning.length).toBeGreaterThan(1);
  stand(sim, 0, find(sim, "ext"));
  press(sim);
  expect(sim.chefs[0].hold?.k).toBe("ext");
  for (const st of burning) {
    stand(sim, 0, st);
    hold(sim, 0, 1.4);
    expect(st.fire).toBe(0);
  }
  expect(wok.out).toBe(null);
  stand(sim, 0, find(sim, "ext"));
  press(sim);
  expect(find(sim, "ext").item?.k).toBe("ext");
});

test("each era has its own kitchen chaos, and it passes", () => {
  const seen = {};
  for (const era of ERAS) {
    const sim = solo("chickenrice", { era: era.id });
    const kinds = [];
    for (let t = 0; t < 180; t += DT) {
      step(sim, DT);
      for (const e of drainEvents(sim)) if (e[0] === "chaos") kinds.push(e[3]);
    }
    seen[era.id] = kinds;
    expect(kinds.length).toBeGreaterThan(0);
    expect(sim.obstacle).toBe(null);
    expect(sim.powerCut <= 0).toBe(true);
  }
  expect(seen["1950s"]).toContain("trishaw");
  expect(seen["1980s"]).toContain("powercut");
  expect(seen.today).toContain("rush");
  expect(seen["2065"]).toContain("shuffle");
});

test("power cuts pause the rice cooker", () => {
  const sim = solo("chickenrice", { era: "1980s", calm: true });
  const cooker = find(sim, "cooker");
  stand(sim, 0, find(sim, "crate", (s) => s.ing === "rice"));
  press(sim);
  stand(sim, 0, cooker);
  press(sim);
  sim.powerCut = 5;
  wait(sim, 4);
  expect(cooker.cookT).toBeCloseTo(0, 1);
  wait(sim, 10);
  expect(cooker.out?.k).toBe("rice");
});

test("the tutorial starts with one patient chicken rice and no chaos", () => {
  const sim = solo("chickenrice", { tutorial: true });
  expect(sim.orders.length).toBe(1);
  expect(sim.orders[0].d).toBe("chickenrice");
  wait(sim, 100);
  expect(sim.orders.length).toBe(1);
  expect(sim.missed).toBe(0);
  const ev = serveOrder(sim, sim.orders[0]);
  expect(ev.some((e) => e[0] === "serve")).toBe(true);
  wait(sim, 5);
  expect(sim.orders.length).toBeGreaterThan(0);
});

test("dash and throw counters are cleaned like everything else", () => {
  expect(cleanInput({ d: 4, t: 2 })).toMatchObject({ d: 4, t: 2 });
  expect(cleanInput({ d: -1, t: "x" }).d).toBeUndefined();
});

// ---------- Makan Nation: takeaway, chilli, voices, chefs, the passport ----------

import centresData from "../../data/hawker-centres.json";
import landData from "../../data/hawker-singapore.json";
import { isOpen as stopOpen, shuffledQuiz, STAGES, STOPS } from "./campaign.js";
import { avatarSvg, CHEFS, HELPER_LOOKS, regularsFor } from "./chefs.js";
import { communitiesOf } from "./dishes.js";
import { LANGS, MODIFIERS, PHRASES, phraseFor, pickOrderVoice } from "./phrases.js";

function orderWith(sim, d, v, md) {
  const order = { id: 500 + sim.orders.length, d, v, t: 999, m: 999, dk: null, md, lg: "en" };
  sim.orders.push(order);
  return order;
}

test("takeaway orders need a box, and plates are refused for them", () => {
  const sim = solo("friednoodles", { calm: true });
  sim.spawnT = 1e9;
  const order = orderWith(sim, "ckt", "plain", "takeaway");
  const wok = make(sim, "ckt|");
  // A plate first: refused.
  stand(sim, 0, find(sim, "rack"));
  press(sim);
  stand(sim, 0, wok);
  press(sim);
  stand(sim, 0, find(sim, "hatch"));
  drainEvents(sim);
  press(sim);
  const wrong = drainEvents(sim).find((e) => e[0] === "wrong");
  expect(wrong?.[3]).toContain("box");
  // Tip it into the bin, take a box, cook again.
  stand(sim, 0, find(sim, "bin"));
  press(sim);
  stand(sim, 0, find(sim, "rack"));
  press(sim);
  const wok2 = make(sim, "ckt|");
  stand(sim, 0, find(sim, "boxes"));
  press(sim);
  expect(sim.chefs[0].hold?.k).toBe("box");
  stand(sim, 0, wok2);
  press(sim);
  stand(sim, 0, find(sim, "hatch"));
  drainEvents(sim);
  press(sim);
  expect(sim.served).toBe(1);
  expect(sim.orders.includes(order)).toBe(false);
  // Boxes do not come back as dirty plates.
  wait(sim, 7);
  expect(find(sim, "return").dirty).toBe(0);
});

test("extra chilli needs a saucer of chilli, no chilli refuses one", () => {
  const sim = solo("chickenrice", { calm: true });
  sim.spawnT = 1e9;
  const more = orderWith(sim, "chickenrice", "steamed", "extrachilli");
  const spots = ["rice|steam", "chicken|poach,chop"].map((p) => make(sim, p));
  stand(sim, 0, find(sim, "rack"));
  press(sim);
  for (const spot of spots) {
    stand(sim, 0, spot);
    press(sim);
  }
  stand(sim, 0, find(sim, "crate", (s) => s.ing === "chilli"));
  // Holding a plate, a crate gives nothing; drop the plate first, then plate the chilli.
  const counter = find(sim, "counter", (s) => !s.item && approaches(sim.map, s).length);
  stand(sim, 0, counter);
  press(sim);
  stand(sim, 0, find(sim, "crate", (s) => s.ing === "chilli"));
  press(sim);
  expect(sim.chefs[0].hold?.k).toBe("chilli");
  stand(sim, 0, counter);
  press(sim);
  expect(counter.item.c.map((i) => i.k).sort()).toEqual(["chicken", "chilli", "rice"]);
  press(sim);
  stand(sim, 0, find(sim, "hatch"));
  press(sim);
  expect(sim.served).toBe(1);
  expect(sim.orders.includes(more)).toBe(false);
});

test("every dish with chilli orders can be served with each modifier", () => {
  for (const md of ["takeaway", "nochilli", "extrachilli"]) {
    const sim = solo("malay", { calm: true });
    sim.spawnT = 1e9;
    const order = orderWith(sim, "nasilemak", "plain", md);
    const spots = partsOf("nasilemak", "plain").map((p) => make(sim, p, new Set()));
    if (md === "extrachilli") {
      stand(sim, 0, find(sim, "crate", (s) => s.ing === "chilli"));
      press(sim);
      const c = find(sim, "counter", (s) => !s.item && approaches(sim.map, s).length);
      stand(sim, 0, c);
      press(sim);
      spots.push(c);
    }
    stand(sim, 0, find(sim, md === "takeaway" ? "boxes" : "rack"));
    press(sim);
    for (const spot of spots) {
      stand(sim, 0, spot);
      press(sim);
    }
    stand(sim, 0, find(sim, "hatch"));
    press(sim);
    expect(sim.served, md).toBe(1);
    expect(sim.orders.includes(order)).toBe(false);
  }
});

test("orders come with a modifier and a language that can actually say it", () => {
  const sim = solo("noodlesoup", { era: "1950s" });
  for (let i = 0; i < 400; i++) wait(sim, 1);
  let r = 1;
  const rand = () => ((r = (r * 16807) % 2147483647) - 1) / 2147483646;
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const { md, lg } = pickOrderVoice(rand, ["1950s", "1980s", "today", "2065"][i % 4], { chilli: i % 2 === 0 });
    expect(PHRASES[md][lg]).toBeDefined();
    if (md !== "plain") expect(MODIFIERS[md]).toBeDefined();
    seen.add(`${md}:${lg}`);
  }
  expect(seen.size).toBeGreaterThan(10);
  // Every non-English phrase has at least one source and a meaning.
  for (const [md, langs] of Object.entries(PHRASES)) {
    for (const [lg, p] of Object.entries(langs)) {
      expect(LANGS[lg]).toBeDefined();
      expect(p.mean.length).toBeGreaterThan(2);
      if (lg !== "en" || md === "takeaway") expect(p.src.length, `${md} ${lg}`).toBeGreaterThan(0);
    }
  }
  expect(phraseFor("takeaway", "ta").say).toBe(PHRASES.takeaway.en.say);
});

test("chosen chefs travel with the snapshot, unknown ones are dropped", () => {
  const sim = createSim("chickenrice", [{ name: "A", chef: "siti" }, { name: "B", chef: "<script>" }], { helpers: crew(["washer"]) });
  const rows = snapshot(sim).c;
  expect(rows[0][10]).toBe("siti");
  expect(rows[1][10]).toBe(null);
  expect(rows[2][10]).toBe(NAMES[0]);
  for (const n of NAMES) expect(HELPER_LOOKS[n]).toBeDefined();
});

test("the roster and the regulars are diverse, and every look draws", () => {
  expect(CHEFS.length).toBeGreaterThanOrEqual(8);
  const communities = new Set(CHEFS.map((c) => c.community.split(" ")[0]));
  for (const c of ["Malay", "Tamil", "Punjabi", "Peranakan", "Eurasian", "Teochew", "Hokkien"]) expect(communities.has(c)).toBe(true);
  for (const c of CHEFS) {
    expect(c.bio.length).toBeGreaterThan(20);
    expect(avatarSvg(c.look)).toContain("<svg");
  }
  for (const era of ["1950s", "1980s", "today", "2065"]) {
    const people = regularsFor(era, 16);
    expect(new Set(people.map((p) => p.type)).size).toBeGreaterThanOrEqual(10);
    expect(people.some((p) => p.head?.[0] === "turban")).toBe(true);
  }
  expect(regularsFor("today", 16).some((p) => p.head?.[0] === "tudung")).toBe(true);
  expect(regularsFor("1980s", 16).some((p) => p.top[0] === "uniform")).toBe(true);
});

test("the passport trail is complete and points at real places", () => {
  const names = new Set(centresData.centres.map((c) => c.name));
  expect(centresData.centres.length).toBeGreaterThan(100);
  expect(landData.areas.length).toBe(55);
  expect(STOPS.length).toBeGreaterThanOrEqual(9);
  for (const st of STAGES) expect(STOPS.some((s) => s.era === st.era)).toBe(true);
  for (const stop of STOPS) {
    const level = LEVELS.find((l) => l.id === stop.level);
    expect(level, stop.id).toBeDefined();
    expect(level.dishes).toContain(stop.focus);
    expect(ERAS.some((e) => e.id === stop.era)).toBe(true);
    if (stop.centre) expect(names.has(stop.centre), stop.centre).toBe(true);
    else expect(stop.era).toBe("1950s");
    expect(stop.intro.length).toBe(2);
    expect(stop.quiz.options[stop.quiz.answer]).toBeDefined();
    expect(stop.sources.length).toBeGreaterThan(0);
    const q = shuffledQuiz(stop, Math.random);
    expect(q.options[q.answer]).toBe(stop.quiz.options[stop.quiz.answer]);
  }
  expect(STOPS.at(-1).finale).toBe(true);
  expect(stopOpen(STOPS[0].id, {})).toBe(true);
  expect(stopOpen(STOPS[1].id, {})).toBe(false);
  expect(stopOpen(STOPS[1].id, { [STOPS[0].id]: "2026-10-06" })).toBe(true);
});

test("the rojak meter splits shared dishes between communities", () => {
  expect(communitiesOf("satay")).toEqual(["Malay", "Javanese"]);
  expect(communitiesOf("orhluak")).toEqual(["Hokkien", "Teochew"]);
  expect(communitiesOf("icekachang")).toEqual(["Shared by all"]);
  for (const d of Object.keys(DISHES)) expect(communitiesOf(d).length).toBeGreaterThan(0);
});

test("a campaign focus dish shows up more often", () => {
  const sim = createSim("prata", [{ name: "A" }], { focus: "murtabak", calm: true });
  const counts = {};
  for (let i = 0; i < 600; i++) {
    sim.orders.length = 0;
    sim.spawnT = 0;
    step(sim, DT);
    for (const o of sim.orders) counts[o.d] = (counts[o.d] ?? 0) + 1;
  }
  expect(counts.murtabak).toBeGreaterThan(counts.prata);
});

test("dishes a centre is famous for turn up more often", () => {
  const count = (featured) => {
    const sim = createSim("friednoodles", [{ name: "A" }], { calm: true, featured, seed: 11 });
    const n = {};
    for (let i = 0; i < 800; i++) {
      sim.orders.length = 0;
      sim.spawnT = 0;
      step(sim, DT);
      for (const o of sim.orders) n[o.d] = (n[o.d] ?? 0) + 1;
    }
    return n;
  };
  const plain = count(null);
  const famous = count(["orhluak", "notadish"]);
  expect(famous.orhluak).toBeGreaterThan(plain.orhluak * 1.6);
});

test("delivery riders come for app orders today, take them boxed, and the app takes its cut", () => {
  // Today: some orders come by app; never in the 1980s.
  const count = (era) => {
    const sim = solo("friednoodles", { era, calm: true });
    let riders = 0;
    for (let i = 0; i < 300; i++) {
      sim.orders.length = 0;
      sim.spawnT = 0;
      wait(sim, 0.05);
      riders += sim.orders.filter((o) => Number.isInteger(o.rd)).length;
    }
    return riders;
  };
  expect(count("today")).toBeGreaterThan(20);
  expect(count("1980s")).toBe(0);
  expect(count("1950s")).toBe(0);
  // A rider order is takeaway, shows on the ticket row, and pays commission when served in a box.
  const sim = solo("friednoodles", { era: "today", calm: true });
  sim.spawnT = 1e9;
  const order = { ...orderWith(sim, "ckt", "plain", "takeaway"), rd: 1 };
  sim.orders[sim.orders.length - 1] = order;
  expect(snapshot(sim).o.find((r) => r[0] === order.id)[8]).toBe(1);
  const wok = make(sim, "ckt|");
  stand(sim, 0, find(sim, "boxes"));
  press(sim);
  stand(sim, 0, wok);
  press(sim);
  stand(sim, 0, find(sim, "hatch"));
  press(sim);
  expect(sim.served).toBe(1);
  expect(sim.commission).toBeGreaterThan(0);
  sim.time = 0.01;
  wait(sim, 1);
  expect(sim.pl.lines.find((l) => l.key === "delivery")?.value).toBeLessThan(0);
});
