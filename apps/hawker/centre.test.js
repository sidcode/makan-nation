import { expect, test } from "bun:test";
import {
  crowd,
  DAYS,
  goals,
  grade,
  heritage,
  inviteHawker,
  load,
  newCentre,
  normPrice,
  pairApprentice,
  rentPerDay,
  runSession,
  save,
  SESSIONS,
  setPrep,
  setPrice,
  slotsFor,
  SOURCES,
  stallAppeal,
  TICKET_CUSTOMERS,
  trayApplies,
  unitCost,
  VERSION,
} from "./centre.js";
import { DISHES } from "./dishes.js";
import { eraById } from "./eras.js";
import { LEVELS } from "./levels.js";

const CENTRE = { id: "c1", name: "Old Airport Road Food Centre", stalls: 150, yearLabel: "1973" };
const fresh = (era = "today", seed = 42) => newCentre({ centre: CENTRE, era, seed });

// The same simple manager every time: keep the suggested prep, pair an apprentice whenever someone retires.
function playOut(state, { pair = true } = {}) {
  while (!state.over) {
    if (pair) for (let i = 0; i < state.stalls.length; i++) if (state.stalls[i].hawker.retireDay && !state.stalls[i].apprentice) pairApprentice(state, i);
    runSession(state);
  }
  return state;
}

test("a centre gets 6 to 12 stalls from its real size, each with a hawker and a menu", () => {
  expect(slotsFor({ stalls: 21 })).toBe(6);
  expect(slotsFor({ stalls: 103 })).toBe(10);
  expect(slotsFor({ stalls: 226 })).toBe(12);
  expect(slotsFor({})).toBe(8);
  const s = fresh();
  expect(s.stalls.length).toBe(12);
  const names = new Set(s.stalls.map((st) => st.hawker.name));
  expect(names.size).toBe(12);
  for (const st of s.stalls) {
    expect(LEVELS.some((l) => l.id === st.type)).toBe(true);
    expect(st.hawker.age).toBeGreaterThan(20);
    expect(Object.keys(st.menu).length).toBeGreaterThan(0);
    for (const [d, m] of Object.entries(st.menu)) expect(m.price).toBe(normPrice(d, eraById("today")));
  }
});

test("the same seed and the same choices give the same fortnight", () => {
  const a = playOut(fresh("today", 7));
  const b = playOut(fresh("today", 7));
  expect(JSON.stringify(a.history)).toBe(JSON.stringify(b.history));
  expect(a.cash).toBe(b.cash);
  const c = playOut(fresh("today", 8));
  expect(JSON.stringify(c.history)).not.toBe(JSON.stringify(a.history));
});

test("a sensible manager keeps every era's centre going for the fortnight", () => {
  for (const era of ["1950s", "1980s", "today", "2065"]) {
    const s = playOut(fresh(era));
    expect(s.day).toBe(DAYS + 1);
    expect(s.minCash).toBeGreaterThanOrEqual(0);
    expect(goals(s).find((g) => g.id === "days").ok).toBe(true);
    expect(s.history.length).toBe(DAYS);
  }
});

test("dearer food sells less: prices push customers away and towards other stalls", () => {
  const cheap = fresh();
  const dear = fresh();
  for (const d of Object.keys(dear.stalls[0].menu)) setPrice(dear, 0, d, normPrice(d, eraById("today")) * 1.6);
  expect(stallAppeal(dear, 0).appeal).toBeLessThan(stallAppeal(cheap, 0).appeal * 0.4);
  const a = runSession(cheap);
  const b = runSession(dear);
  expect(b.rows[0].demand).toBeLessThan(a.rows[0].demand);
  expect(b.rows[1].demand).toBeGreaterThanOrEqual(a.rows[1].demand);
  // Prices are clamped to a sane range.
  setPrice(dear, 0, Object.keys(dear.stalls[0].menu)[0], 1e6);
  expect(Object.values(dear.stalls[0].menu)[0].price).toBeLessThanOrEqual(normPrice(Object.keys(dear.stalls[0].menu)[0], eraById("today")) * 3);
});

test("breakfast dishes sell best in the morning", () => {
  const s = fresh();
  const i = s.stalls.findIndex((st) => st.type === "dessert" || st.type === "mamak" || st.type === "chickenrice");
  expect(i).toBeGreaterThanOrEqual(0);
  // Turn the menu down to one breakfast dish and one lunch dish and compare.
  const st = s.stalls[i];
  for (const d of Object.keys(st.menu)) st.menu[d].on = false;
  const b = Object.keys(st.menu).find((d) => DISHES[d].meals === "b");
  st.menu[b].on = true;
  const morning = stallAppeal(s, i, 0).appeal;
  const noon = stallAppeal(s, i, 1).appeal;
  expect(morning).toBeGreaterThan(noon * 2);
  expect(crowd(s, 1).people).toBeGreaterThan(crowd(s, 0).people);
});

test("over-ordering wastes money: unsold prep spoils", () => {
  const lean = fresh();
  const heavy = fresh();
  for (let i = 0; i < heavy.stalls.length; i++) setPrep(heavy, i, 120);
  const a = runSession(lean);
  const b = runSession(heavy);
  expect(b.spoiled).toBeGreaterThan(a.spoiled * 3);
  expect(heavy.cash).toBeLessThan(lean.cash);
});

test("without cleaning, hygiene grades fall; table cleaning holds them", () => {
  const dirty = fresh();
  dirty.cleaning = 0;
  const clean = fresh();
  for (let k = 0; k < 9; k++) {
    runSession(dirty);
    runSession(clean);
  }
  expect(dirty.stalls.every((st) => grade(st.clean) === "D" || grade(st.clean) === "C")).toBe(true);
  expect(clean.stalls.every((st) => ["A", "B"].includes(grade(st.clean)))).toBe(true);
  expect(clean.satisfaction).toBeGreaterThan(dirty.satisfaction);
});

test("a retiring hawker with no successor closes the stall, and the dishes leave", () => {
  const s = fresh();
  const i = 0;
  const st = s.stalls[i];
  const menu = Object.keys(st.menu);
  st.hawker.retireDay = s.day;
  for (const o of s.stalls) if (o !== st) for (const d of menu) if (o.menu[d]) o.menu[d].on = false;
  const before = heritage(s).dishes.length;
  runSession(s);
  runSession(s);
  const r = runSession(s);
  expect(st.closed).toBe(true);
  expect(s.closures[0].stall).toBe(st.no);
  expect(s.closures[0].gone.length).toBeGreaterThan(0);
  expect(r.endOfDay.notes.join(" ")).toContain("nobody takes over");
  expect(heritage(s).dishes.length).toBeLessThan(before);
  expect(goals(s).find((g) => g.id === "succession").ok).toBe(false);
  // The stall can be let again through the incubation programme, with a new menu two days later.
  expect(inviteHawker(s, i)).toBe(true);
  expect(st.closed).toBe(false);
  expect(st.rent).toBe("incubation");
  expect(st.opensDay).toBe(s.day + 2);
  expect(stallAppeal(s, i).appeal).toBe(0);
});

test("an apprentice paired in time takes over, the dishes stay, and rent moves to market", () => {
  const s = fresh("1980s");
  const st = s.stalls[0];
  const dishes = Object.keys(st.menu);
  expect(st.rent).toBe("subsidised");
  st.hawker.retireDay = s.day + 2;
  expect(pairApprentice(s, 0)).toBe(true);
  expect(pairApprentice(s, 0)).toBe(false);
  for (let k = 0; k < 9; k++) runSession(s);
  expect(st.closed).toBe(false);
  expect(st.hawker.learnedFrom).toBeDefined();
  expect(Object.keys(st.menu)).toEqual(dishes);
  expect(st.rent).toBe("market");
  expect(s.successions.length).toBe(1);
  expect(rentPerDay(st, eraById("1980s"))).toBeGreaterThan(rentPerDay({ rent: "subsidised" }, eraById("1980s")));
});

test("when you cook a session, your tickets stand in for that stall's customers", () => {
  const s = fresh();
  const r = runSession(s, { stall: 2, served: 5, missed: 1, takings: 30, spent: 6, stars: 2 });
  expect(r.rows[2].sold).toBe(5 * TICKET_CUSTOMERS);
  expect(r.rows[2].demand).toBe(6 * TICKET_CUSTOMERS);
  expect(r.rows[2].revenue).toBe(30 * TICKET_CUSTOMERS);
  expect(r.rows[2].cooked.stars).toBe(2);
});

test("trays only matter today and in 2065, and seats limit the crowd", () => {
  expect(trayApplies(eraById("today"))).toBe(true);
  expect(trayApplies(eraById("2065"))).toBe(true);
  expect(trayApplies(eraById("1950s"))).toBe(false);
  const s = fresh();
  const r = runSession(s);
  expect(r.tray).toBeCloseTo(0.91, 2);
  expect(r.seats).toBeGreaterThan(0);
  const old = runSession(fresh("1980s"));
  expect(old.tray).toBe(null);
});

test("heritage counts communities and dishes still served", () => {
  const s = fresh();
  const h = heritage(s);
  expect(h.communities.length).toBeGreaterThanOrEqual(5);
  expect(h.communities).not.toContain("Shared by all");
  expect(h.dishes).not.toContain("drink");
  for (const st of s.stalls) st.closed = true;
  expect(heritage(s).dishes.length).toBe(0);
  expect(goals(s).find((g) => g.id === "communities").ok).toBe(false);
});

test("costs come from the recipes and scale with the era", () => {
  const today = eraById("today");
  const old = eraById("1950s");
  expect(unitCost("chickenrice", today)).toBeGreaterThan(unitCost("kayatoast", today));
  expect(unitCost("chickenrice", old)).toBeLessThan(unitCost("chickenrice", today));
  for (const d of Object.keys(DISHES)) expect(unitCost(d, today)).toBeLessThan(normPrice(d, today));
});

test("saves round-trip, and an unknown version or junk is refused", () => {
  const s = fresh();
  runSession(s);
  const back = load(save(s));
  expect(back).not.toBe(null);
  expect(back.cash).toBe(s.cash);
  runSession(back);
  expect(load(JSON.stringify({ ...s, v: VERSION + 1 }))).toBe(null);
  expect(load("{not json")).toBe(null);
  expect(load(JSON.stringify({ ...s, stalls: [{ type: "nope", menu: {} }] }))).toBe(null);
});

test("events are either sourced or clearly a game event", () => {
  const s = fresh("today", 3);
  playOut(s);
  expect(s.events.length).toBeGreaterThan(2);
  for (const e of s.events) {
    expect(Boolean(e.src) || e.fictional === true).toBe(true);
    if (e.src) expect(e.src[1]).toMatch(/^https:\/\//);
  }
  for (const list of Object.values(SOURCES)) for (const [label, href] of list) expect(label.length > 5 && href.startsWith("https://")).toBe(true);
  expect(SESSIONS.map((x) => x.id).join("")).toBe("bld");
});

test("a centre's famous dishes pull customers, and their stalls are part of it", () => {
  const famous = [{ id: "chickenrice", note: "A famous stall here", src: ["Somewhere", "https://example.org/"] }, { id: "notadish" }];
  const s = newCentre({ centre: { id: "m", name: "Maxwell Food Centre", stalls: 36 }, era: "today", seed: 5, famous });
  expect(s.famous.map((f) => f.id)).toEqual(["chickenrice"]);
  expect(s.stalls[0].type).toBe("chickenrice");
  const plain = newCentre({ centre: { id: "m", name: "Maxwell Food Centre", stalls: 36 }, era: "today", seed: 5 });
  const i = plain.stalls.findIndex((st) => st.type === "chickenrice");
  const j = s.stalls.findIndex((st) => st.type === "chickenrice");
  if (i >= 0) {
    plain.stalls[i].hawker.skill = s.stalls[j].hawker.skill;
    plain.stalls[i].clean = s.stalls[j].clean;
    expect(stallAppeal(s, j).appeal).toBeGreaterThan(stallAppeal(plain, i).appeal);
  }
  expect(stallAppeal(s, j).why.join(" ")).toContain("known for Chicken rice");
});
