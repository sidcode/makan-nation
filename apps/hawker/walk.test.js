// The customer mode, played by a bot the way a player would: chope, queue, order, carry, eat, clear up.
import { expect, test } from "bun:test";
import CENTRES_RAW from "../../data/hawker-centres.json";
import FOOTPRINTS from "../../data/hawker-footprints.json";
import { presetFor } from "./centrelook.js";
import { findPath, LAYOUT_HINTS, planCentre, queueSpot, walkable } from "./floorplan.js";
import { famousIn, profileFor } from "./profiles.js";
import { buy, createWalk, doneOrdering, drainWalkEvents, goToward, nextStep, stepWalk, targetOfMe, walkSummary } from "./walk.js";

const DT = 1 / 30;
const CENTRES = CENTRES_RAW.centres;

function planFor(name, eraId) {
  const centre = CENTRES.find((c) => c.name.includes(name));
  const profile = profileFor(centre);
  const preset = presetFor({ profile, centre, eraId });
  const footprint = FOOTPRINTS.centres?.[centre.id] ?? null;
  return { centre, plan: planCentre({ centre, preset, eraId, footprint, famous: famousIn(profile).map((f) => f.id), hint: LAYOUT_HINTS[profile?.key] ?? null }), famous: famousIn(profile).map((f) => f.id) };
}

function steps(w, seconds, input = {}) {
  for (let t = 0; t < seconds; t += DT) stepWalk(w, DT, input);
}

// Walks the player to a point along a path, like holding the stick.
function walkTo(w, x, z, near = 0.25) {
  const path = findPath(w.plan, [w.me.x, w.me.z], [x, z]);
  if (!path) throw new Error(`no path to ${x.toFixed(1)}, ${z.toFixed(1)}`);
  for (const [px, pz] of path) {
    for (let k = 0; k < 900; k++) {
      const dx = px - w.me.x;
      const dz = pz - w.me.z;
      const d = Math.hypot(dx, dz);
      if (d < near) break;
      const s = Math.min(1, d / (3.2 * DT));
      stepWalk(w, DT, { mx: (dx / d) * s, mz: (dz / d) * s });
    }
  }
  return Math.hypot(x - w.me.x, z - w.me.z);
}

const press = (w) => stepWalk(w, DT, { p: 1 });
// Turn to face a point, the way a player nudges the stick towards what they want.
function face(w, x, z) {
  const d = Math.hypot(x - w.me.x, z - w.me.z) || 1;
  w.me.fx = (x - w.me.x) / d;
  w.me.fz = (z - w.me.z) / d;
}

function standBy(w, x, z) {
  // A walkable spot next to a table or counter.
  for (const [ox, oz] of [[0, 1.25], [1.25, 0], [0, -1.25], [-1.25, 0], [0.9, 0.9], [-0.9, 0.9]]) {
    const [i, j] = w.plan.grid.cellOf(x + ox, z + oz);
    if (walkable(w.plan.grid.at(i, j)) && findPath(w.plan, [w.me.x, w.me.z], [x + ox, z + oz])) {
      const left = walkTo(w, x + ox, z + oz);
      face(w, x, z);
      if (left < 0.6) return left;
    }
  }
  throw new Error("nowhere to stand");
}

function freeTableFor(w, stallIds = []) {
  let best = null;
  w.plan.tables.forEach((t, k) => {
    const tb = w.tables[k];
    if (tb.chope || tb.mine || tb.seats.some((s) => s !== null)) return;
    if (tb.owner !== null && !stallIds.includes(tb.owner)) return;
    const d = Math.hypot(t.x - w.me.x, t.z - w.me.z);
    if (!best || d < best.d) best = { k, d };
  });
  return best?.k ?? null;
}

function playThrough(name, eraId, seed = 3) {
  const { plan, famous } = planFor(name, eraId);
  // A quiet hour: this bot walks straight to free tables. The crowded rush is the guide bot's test.
  const w = createWalk(plan, { eraId, seed, famous, crowd: 0.3 });
  steps(w, 1);
  let table = null;
  // Chope first where the era does.
  if (w.rules.chope) {
    // Somebody may chope it first while you walk over; then try the next one.
    for (let tries = 0; tries < 6; tries++) {
      table = freeTableFor(w);
      expect(table).not.toBeNull();
      standBy(w, plan.tables[table].x, plan.tables[table].z);
      if (targetOfMe(w)?.kind === "chope" && targetOfMe(w).id === table) break;
    }
    const t = targetOfMe(w);
    expect(t?.kind, JSON.stringify(t)).toBe("chope");
    press(w);
    expect(w.tables[table].chope).toBe("tissue");
    expect(w.me.chope).toBe(table);
  }
  for (const item of w.list) {
    const stallId = item.stalls.sort((a, b) => Math.hypot(plan.stalls[a].x - w.me.x, plan.stalls[a].z - w.me.z) - Math.hypot(plan.stalls[b].x - w.me.x, plan.stalls[b].z - w.me.z))[0];
    const s = plan.stalls[stallId];
    const qn = w.stalls[stallId].queue.length;
    const left = walkTo(w, ...(qn ? queueSpot(plan, s, qn) : s.front));
    expect(left, `${name} ${eraId}: could not reach ${s.no}`).toBeLessThan(0.6);
    face(w, s.x, s.z);
    expect(targetOfMe(w)?.kind, `${name} ${eraId} at stall ${JSON.stringify(targetOfMe(w))}`).toBe("stall");
    press(w);
    expect(w.me.queue).toBe(stallId);
    for (let t = 0; t < 400 && w.ordering === null; t += DT) stepWalk(w, DT, {});
    expect(w.ordering, `${name} ${eraId}: queue at ${s.no} never reached the front`).toBe(stallId);
    const r = buy(w, item.dish === "drink" ? { dish: "drink", drink: item.drink } : { dish: item.dish, variant: item.variant });
    expect(r.ok, r.why).toBe(true);
    doneOrdering(w);
    for (let t = 0; t < 10 && !w.me.hold; t += DT) stepWalk(w, DT, {});
    expect(w.me.hold?.tray?.length).toBe(1);
    expect(item.got).toBe(true);
    // Carry it to the table (find one now if the era has no choping).
    // In the 1980s a table by a stall is that stall's: with food from several stalls, take one nobody owns.
    if (table === null) {
      for (let tries = 0; tries < 6; tries++) {
        table = freeTableFor(w, []);
        expect(table).not.toBeNull();
        standBy(w, plan.tables[table].x, plan.tables[table].z);
        if (targetOfMe(w)?.kind === "place" && targetOfMe(w).id === table) break;
      }
    } else standBy(w, plan.tables[table].x, plan.tables[table].z);
    const t = targetOfMe(w);
    expect(t?.kind, JSON.stringify(t)).toBe("place");
    press(w);
    expect(w.me.hold).toBeNull();
    expect(item.placed).toBe(true);
  }
  // Eat.
  expect(targetOfMe(w)?.kind).toBe("sit");
  press(w);
  steps(w, 8);
  expect(w.me.ate).toBe(true);
  steps(w, 0.2, { mx: 0, mz: 1 });
  expect(w.me.sitting).toBeNull();
  standBy(w, plan.tables[table].x, plan.tables[table].z);
  expect(targetOfMe(w)?.kind, JSON.stringify(targetOfMe(w))).toBe("clear");
  press(w);
  if (w.rules.trays) {
    expect(w.me.hold?.dirty).toBeGreaterThan(0);
    const r = plan.trayReturns.map((x) => [Math.hypot(x.use[0] - w.me.x, x.use[1] - w.me.z), x]).sort((a, b) => a[0] - b[0])[0][1];
    walkTo(w, ...r.use);
    face(w, r.x, r.z);
    expect(targetOfMe(w)?.kind).toBe("return");
    press(w);
    expect(w.stats.returned).toBe(true);
  }
  // And out.
  const [ox, oz] = plan.spawns[0];
  walkTo(w, ox, oz);
  const b = plan.bounds;
  const away = oz > b.z1 ? [ox, b.z1 + 9.3] : oz < b.z0 ? [ox, b.z0 - 9.3] : ox < b.x0 ? [b.x0 - 9.3, oz] : [b.x1 + 9.3, oz];
  walkTo(w, ...away);
  steps(w, 0.2);
  expect(w.done, `${name} ${eraId}: not done at ${w.me.x.toFixed(1)},${w.me.z.toFixed(1)}`).toBe(true);
  drainWalkEvents(w);
  return { w, sum: walkSummary(w) };
}

test("a customer chopes, queues, orders, eats and returns the tray today", () => {
  const { sum } = playThrough("Maxwell", "today");
  expect(sum.list.every((i) => i.got)).toBe(true);
  expect(sum.choped).toBe(true);
  expect(sum.returned).toBe(true);
  expect(sum.spent).toBeGreaterThan(0);
});

test("the same works in every era, with that era's rules", () => {
  for (const [name, era] of [["Chomp Chomp", "1980s"], ["Old Airport Road", "2065"], ["Smith Street Blk 335", "1950s"], ["Newton", "today"]]) {
    const { w, sum } = playThrough(name, era);
    expect(sum.list.every((i) => i.got), `${name} ${era}`).toBe(true);
    if (era === "1980s") expect(w.rules.chope).toBeNull();
    if (era === "1950s") expect(w.plan.kind).toBe("street");
  }
});

test("someone else's chope keeps the table, and a stall's own table refuses other stalls' food", () => {
  const { plan, famous } = planFor("Maxwell", "today");
  const w = createWalk(plan, { eraId: "today", seed: 9, famous });
  const k = w.tables.findIndex((tb) => tb.chope && tb.by !== "me");
  expect(k).toBeGreaterThanOrEqual(0);
  w.tables[k].ghost = 1e9; // its owner is a long way off
  standBy(w, plan.tables[k].x, plan.tables[k].z);
  const t = targetOfMe(w);
  if (t.id === k) expect(t.kind).toBe("choped");

  const old = planFor("Chomp Chomp", "1980s");
  const w2 = createWalk(old.plan, { eraId: "1980s", seed: 5, famous: old.famous });
  const owned = w2.tables.findIndex((tb) => tb.owner !== null && tb.seats.every((s) => s === null));
  expect(owned).toBeGreaterThanOrEqual(0);
  const other = old.plan.stalls.find((s) => s.id !== w2.tables[owned].owner);
  w2.me.hold = { tray: [{ dish: "drink", from: other.id }] };
  standBy(w2, old.plan.tables[owned].x, old.plan.tables[owned].z);
  const before = w2.stats.shooed;
  const tt = targetOfMe(w2);
  if (tt?.kind === "place" && tt.id === owned) {
    press(w2);
    expect(w2.stats.shooed).toBe(before + 1);
    expect(w2.me.hold).not.toBeNull();
  }
});

test("the crowd keeps moving: people queue, eat, clear trays and leave, riders collect", () => {
  const { plan, famous } = planFor("Old Airport Road", "today");
  const w = createWalk(plan, { eraId: "today", seed: 11, famous });
  steps(w, 90);
  const served = w.stalls.reduce((n, s) => n + s.served, 0);
  expect(served).toBeGreaterThan(10);
  expect(w.agents.some((a) => a.kind === "rider")).toBe(true);
  expect(w.agents.filter((a) => a.seated).length).toBeGreaterThan(5);
  // Nobody walks through a stall or a table.
  for (const a of w.agents) {
    // Seated, queueing, or just up from a seat and not yet walking.
    if (a.seated || a.state === "queue" || !a.path || a.pk <= 1) continue;
    const c = plan.grid.at(...plan.grid.cellOf(a.x, a.z));
    expect(walkable(c), `${a.kind} ${a.state} at ${a.x.toFixed(1)},${a.z.toFixed(1)}`).toBe(true);
  }
});

test("every centre lays out in its real outline with NEA's stall count (or close), every stall reachable", () => {
  expect(Object.keys(FOOTPRINTS.centres).length).toBeGreaterThan(120);
  for (const eraId of ["today", "1980s"]) {
    for (const centre of eraId === "today" ? CENTRES : CENTRES.filter((_, i) => i % 5 === 0)) {
      const profile = profileFor(centre);
      const preset = presetFor({ profile, centre, eraId });
      const footprint = FOOTPRINTS.centres[centre.id] ?? null;
      const plan = planCentre({ centre, preset, eraId, footprint, famous: famousIn(profile).map((f) => f.id), hint: LAYOUT_HINTS[profile?.key] ?? null });
      if (plan.kind === "hall" && plan.target >= 20) expect(plan.stalls.length, centre.name).toBeGreaterThanOrEqual(Math.floor(plan.target * 0.7));
      if (plan.kind === "hall") expect(plan.tables.length, centre.name).toBeGreaterThan(plan.stalls.length * 0.8);
      expect(plan.tables.length, centre.name).toBeLessThanOrEqual(Math.round(plan.target * 3.4));
      if (footprint && plan.kind === "hall") expect(plan.source).toBe("osm");
      for (const s of plan.stalls) expect(findPath(plan, plan.start, s.front), `${centre.name} ${s.no}`).not.toBeNull();
      for (const s of plan.stalls.slice(0, 3)) expect(walkable(plan.grid.at(...plan.grid.cellOf(...queueSpot(plan, s, 1)))), `${centre.name} queue`).toBe(true);
    }
  }
}, 60000);

// A player who only follows the guide: "Go" to the next step, then the main button when there.
function followGuide(name, eraId, seed = 4, crowd = 0.7) {
  const { plan, famous } = planFor(name, eraId);
  const w = createWalk(plan, { eraId, seed, famous, crowd });
  const log = [];
  for (let tick = 0; tick < 30 * 60 * 8 && !w.done; tick++) {
    if (w.ordering !== null) {
      // At the counter: buy whatever on the list this stall sells, then done.
      for (const it of w.list) {
        if (it.got || !it.stalls.includes(w.ordering) || w.me.basket.some((b) => b.dish === it.dish)) continue;
        buy(w, it.dish === "drink" ? { dish: "drink", drink: it.drink } : { dish: it.dish, variant: it.variant });
      }
      doneOrdering(w);
      continue;
    }
    const step = nextStep(w);
    if (step && log.at(-1) !== step.text) log.push(step.text);
    const t = targetOfMe(w);
    const there = t && step?.target && t.id === step.target.id && ["chope", "place", "sit", "clear", "return", "seller"].includes(t.kind);
    if (there) {
      stepWalk(w, DT, { p: 1 });
      continue;
    }
    if (step?.target && !w.me.auto && w.me.queue === null && w.me.sitting === null) {
      expect(goToward(w, step.target), `${name} ${eraId}: no way to ${step.text}`).toBe(true);
    }
    // Sitting after eating: move to stand up.
    const stand = w.me.sitting !== null && w.me.ate;
    stepWalk(w, DT, stand ? { mx: 0, mz: 1 } : {});
  }
  expect(w.done, `${name} ${eraId} stuck after: ${log.slice(-4).join(" / ")}`).toBe(true);
  return { w, log };
}

test("the guide alone gets you through a meal, in every era", () => {
  for (const [name, era] of [["Maxwell", "today"], ["Chomp Chomp", "1980s"], ["Smith Street Blk 335", "1950s"], ["Old Airport Road", "2065"], ["Chinatown Complex", "today"], ["Newton", "today"], ["Our Tampines Hub", "today"]]) {
    const { w, log } = followGuide(name, era);
    expect(w.list.every((i) => i.got && i.placed), `${name} ${era}`).toBe(true);
    if (w.rules.trays) expect(w.stats.returned, `${name} ${era}: ${log.join(" / ")}`).toBe(true);
    if (w.rules.chope) expect(log.some((l) => /Chope/.test(l))).toBe(true);
  }
}, 60000);

test("at the lunch rush the tables are full: you wait by a party finishing and chope it when they go", () => {
  for (const [name, era, seed] of [["Maxwell", "today", 5], ["Chomp Chomp", "1980s", 6], ["Old Airport Road", "2065", 7]]) {
    const { plan, famous } = planFor(name, era);
    const w = createWalk(plan, { eraId: era, seed, famous, crowd: 1 });
    steps(w, 5);
    const free = w.tables.filter((tb) => tb.free).length;
    expect(free / w.tables.length, `${name} ${era}: free tables`).toBeLessThan(w.rules.chope ? 0.12 : 0.16);
    // Parties sit together and get up together.
    const seated = w.agents.filter((a) => a.seated);
    expect(seated.length).toBeGreaterThan(plan.tables.length * 1.2);
    const { w: done, log } = followGuide(name, era, seed, 1);
    expect(done.done, `${name} ${era}: ${log.slice(-5).join(" / ")}`).toBe(true);
    if (done.rules.chope) expect(log.some((l) => /Wait by one|Quick, chope|Chope a table/.test(l)), log.join(" / ")).toBe(true);
  }
}, 120000);
