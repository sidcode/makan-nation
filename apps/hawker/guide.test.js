import { expect, test } from "bun:test";
import { INGREDIENTS } from "./dishes.js";
import { guideFor, guidesFor, planFor, stationsForOrder, stationsForPart, unpack } from "./guide.js";
import { walkTo } from "./helpers.js";
import { GROUPS, groupOf, iconOf, stationIcon } from "./icons.js";
import { LEVELS } from "./levels.js";
import { createSim, drainEvents, snapshot, step } from "./sim.js";

const DT = 1 / 60;

// A player who only ever follows the guide: walks the path, presses or holds where it says.
function followGuide(levelId, chefs, era = "today", seconds = 400) {
  const sim = createSim(levelId, Array.from({ length: chefs }, (_, i) => ({ name: `P${i}` })), { era, seed: 7 });
  const legs = sim.chefs.map(() => ({ p: 0, b: 0, cool: 0, path: null, goalKey: "", stuck: 0, skip: {}, replan: 0 }));
  let guides = [];
  for (let n = 0; !sim.over && n < seconds * 60; n++) {
    if (n % 6 === 0) guides = guidesFor(snapshot(sim), sim.map, sim.chefs.map((c) => c.slot), { era });
    for (const ch of sim.chefs) {
      const g = guides.find((x) => x.slot === ch.slot);
      const goal = g && g.act !== "wait" ? { st: sim.stations[g.st], act: g.act, dk: g.dk } : null;
      sim.inputs[ch.slot] = walkTo(sim, ch, goal, DT, legs[ch.slot]);
      legs[ch.slot].cool = Math.max(0, legs[ch.slot].cool - DT);
    }
    step(sim, DT);
    drainEvents(sim);
  }
  return sim;
}

test("following the guide alone serves orders at every stall, solo and in pairs", () => {
  for (const level of LEVELS) {
    const solo = followGuide(level.id, 1);
    expect(solo.over).toBe(true);
    expect(solo.served).toBeGreaterThanOrEqual(5);
    const pair = followGuide(level.id, 2, "1950s");
    expect(pair.served).toBeGreaterThanOrEqual(8);
    expect(pair.missed).toBeLessThanOrEqual(2);
  }
});

test("plans name the crates, the heat and the bench for each component", () => {
  expect(planFor("chicken|poach,chop")).toMatchObject({ inputs: ["chicken"], heat: { type: "pot" }, work: ["board"] });
  expect(planFor("chicken|roast,chop")).toMatchObject({ inputs: ["chicken"], heat: { type: "grill" }, work: ["board"] });
  expect(planFor("ckt|")).toMatchObject({ inputs: ["kwayteow", "egg"], heat: { type: "wok" }, work: [] });
  expect(planFor("ice|shave")).toMatchObject({ inputs: ["ice"], heat: null, work: ["shaver"] });
  expect(planFor("curry|")).toMatchObject({ inputs: ["curry"], heat: null, work: [] });
  const sim = createSim("chickenrice", [{ name: "A" }]);
  const pinged = stationsForPart(sim.map, "chicken|poach,chop").map((i) => sim.map.stations[i]);
  expect(pinged[0]).toMatchObject({ type: "crate", ing: "chicken" });
  expect(pinged.some((s) => s.type === "pot")).toBe(true);
  expect(pinged.some((s) => s.type === "board")).toBe(true);
});

test("the guide sends raw chicken to the pot for steamed and to the grill for roasted", () => {
  for (const [v, heat] of [["steamed", "pot"], ["roasted", "grill"]]) {
    const sim = createSim("chickenrice", [{ name: "A" }], { calm: true });
    sim.orders = [{ id: 1, d: "chickenrice", v, t: 90, m: 90, dk: null, md: "plain", lg: "en" }];
    sim.chefs[0].hold = { id: 99, k: "chicken", s: [], b: 0 };
    const g = guideFor(snapshot(sim), sim.map, 0);
    expect(sim.map.stations[g.st].type).toBe(heat);
    const pulse = stationsForOrder(sim.map, snapshot(sim).o[0]).map((i) => sim.map.stations[i]);
    expect(pulse.some((s) => s.ing === "rice")).toBe(true);
    expect(pulse.some((s) => s.type === heat)).toBe(true);
  }
});

test("a finished plate goes to the hatch, a dirty one to the sink, burnt food to the bin", () => {
  const sim = createSim("chickenrice", [{ name: "A" }], { calm: true });
  sim.orders = [{ id: 1, d: "kayatoast", v: "plain", t: 90, m: 90, dk: null, md: "plain", lg: "en" }];
  const ch = sim.chefs[0];
  const typeOf = () => sim.map.stations[guideFor(snapshot(sim), sim.map, 0).st].type;
  ch.hold = { id: 5, k: "plate", d: 0, c: [{ id: 6, k: "bread", s: ["toast", "spread"], b: 0 }] };
  expect(typeOf()).toBe("hatch");
  ch.hold = { id: 5, k: "plate", d: 1, c: [] };
  expect(typeOf()).toBe("sink");
  ch.hold = { id: 7, k: "bread", s: [], b: 1 };
  expect(typeOf()).toBe("bin");
  ch.hold = null;
  expect(typeOf()).toBe("crate");
});

test("two chefs are not both sent for the same thing", () => {
  const sim = createSim("friednoodles", [{ name: "A" }, { name: "B" }], { calm: true });
  sim.orders = [{ id: 1, d: "ckt", v: "plain", t: 90, m: 90, dk: null, md: "plain", lg: "en" }];
  const [a, b] = guidesFor(snapshot(sim), sim.map, [0, 1]);
  const ia = sim.map.stations[a.st];
  const ib = sim.map.stations[b.st];
  expect(ia.type).toBe("crate");
  expect(ib.type === "crate" ? ib.ing !== ia.ing : true).toBe(true);
  expect(a.path.length).toBeGreaterThan(0);
});

test("snapshot items unpack to the kitchen's own shape", () => {
  expect(unpack({ k: "chicken", s: "poach,chop", b: 0 })).toEqual({ k: "chicken", s: ["poach", "chop"], b: 0 });
  expect(unpack({ k: "plate", d: 0, c: [{ k: "rice", s: "steam", b: 0 }] }).c[0].s).toEqual(["steam"]);
  expect(unpack(null)).toBe(null);
});

test("every crate ingredient has an icon and a food group, and groups stay few", () => {
  for (const [k, ing] of Object.entries(INGREDIENTS)) {
    expect(iconOf(`${k}|`)).toBe(k);
    if (ing.cost !== undefined) expect(groupOf(k)).not.toBe(null);
  }
  expect(Object.keys(GROUPS).length).toBeLessThanOrEqual(8);
  for (const type of ["wok", "pot", "cooker", "grill", "board", "shaver", "urn", "hatch", "rack", "return", "sink", "bin", "ext", "boxes"]) {
    expect(stationIcon(type)).not.toBe(null);
  }
  expect(stationIcon("cooker", "1950s")).toBe("steamer");
  expect(iconOf({ k: "box", c: [] }, "2065")).toBe("tiffin");
});
