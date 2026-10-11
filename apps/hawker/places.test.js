import { expect, test } from "bun:test";
import centresData from "../../data/hawker-centres.json";
import { FACTS, factFor, factsAboutDish, factsFor } from "./archive.js";
import { RENAMED_STOPS, STOPS } from "./campaign.js";
import { CENTRE_LOOKS, presetFor } from "./centrelook.js";
import { DISHES } from "./dishes.js";
import { LEVELS } from "./levels.js";
import { centresFamousFor, dishIdsFor, famousIn, PROFILES, profileByKey, profileFor, sourceTitle } from "./profiles.js";

const DASHES = /[–—]/;

test("every centre profile loads, matches NEA's list, and has a look of its own", () => {
  expect(PROFILES.length).toBeGreaterThanOrEqual(19);
  const keys = PROFILES.map((p) => p.key);
  expect(new Set(keys).size).toBe(keys.length);
  const names = new Set(centresData.centres.map((c) => c.name));
  for (const p of PROFILES) {
    if (p.neaName) expect(names.has(p.neaName), p.neaName).toBe(true);
    expect(profileFor(p.neaName ?? p.displayName)?.key).toBe(p.key);
    expect(CENTRE_LOOKS[p.key], p.key).toBeDefined();
    for (const ph of p.photos) {
      expect(ph.page).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(ph.licence).not.toMatch(/check/i);
    }
  }
  expect(profileByKey("lau-pa-sat")?.neaName).toBe(null);
  const looks = PROFILES.map((p) => presetFor({ profile: p, eraId: "today" }));
  expect(new Set(looks.map((l) => l.archetype)).size).toBeGreaterThanOrEqual(6);
  expect(new Set(looks.map((l) => JSON.stringify([l.archetype, l.colours.roof, l.colours.pillar, l.time]))).size).toBe(looks.length);
  expect(looks.find((l, i) => PROFILES[i].key === "lau-pa-sat").archetype).toBe("octagon");
  expect(looks.find((l, i) => PROFILES[i].key === "newton-food-centre").time).toBe("night");
});

test("dish names in the profiles map onto the game's dishes, two at a time where needed", () => {
  expect(dishIdsFor("Murtabak and roti prata")).toEqual(["murtabak", "prata"]);
  expect(dishIdsFor("Hokkien fried prawn noodles")).toEqual(["hokkienmee"]);
  expect(dishIdsFor("Fried sotong prawn mee (Hokkien mee)")).toEqual(["hokkienmee"]);
  expect(dishIdsFor("Penang assam laksa and prawn mee")).toEqual(["prawnnoodles"]);
  expect(dishIdsFor("Soya sauce chicken rice")).toEqual(["roastmeat"]);
  expect(dishIdsFor("Cantonese porridge (congee)")).toEqual([]);
  expect(dishIdsFor("Chicken wings and oyster omelette")).toEqual(["orhluak", "wings"]);
  // Every profiled centre is famous for at least one dish the game can cook, each with a source.
  for (const p of PROFILES) {
    const f = famousIn(p);
    expect(f.length, p.key).toBeGreaterThan(0);
    for (const x of f) {
      expect(DISHES[x.id]).toBeDefined();
      expect(x.src[1]).toMatch(/^https:\/\//);
    }
  }
  expect(centresFamousFor("satay").map((c) => c.centre)).toContain("Lau Pa Sat (Telok Ayer Market)");
  expect(sourceTitle("https://en.wikipedia.org/wiki/Maxwell_Food_Centre")).toBe("Wikipedia: Maxwell Food Centre");
  expect(sourceTitle("https://guide.michelin.com/en/x")).toBe("Michelin Guide");
});

test("the dishes famous at a centre that the game lacked are now on a stall's menu, with sources", () => {
  for (const id of ["chillicrab", "fishsoup", "biryani", "lormee", "rojak", "bakchormee", "wings", "popiah", "pisang", "chengtng", "thosai", "peppercrab", "claypot", "oystercake", "sugarcane"]) {
    const d = DISHES[id];
    expect(d, id).toBeDefined();
    expect(d.sources.length).toBeGreaterThan(0);
    expect(LEVELS.some((l) => l.dishes.includes(id)), id).toBe(true);
    for (const t of [d.past, d.present, d.future]) expect(DASHES.test(t)).toBe(false);
    expect(centresFamousFor(id).length, id).toBeGreaterThan(0);
  }
  expect(DISHES.roastmeat.variants.soya).toBeDefined();
});

test("archive facts carry sources, fit their era, and turn up for the right centre and dish", () => {
  expect(FACTS.length).toBeGreaterThanOrEqual(60);
  for (const f of FACTS) {
    expect(f.sources.length).toBeGreaterThan(0);
    for (const [, u] of f.sources) expect(u).toMatch(/^https:\/\//);
    expect(DASHES.test(f.text)).toBe(false);
  }
  expect(factsFor({ centre: "lau-pa-sat" })[0].centres).toContain("lau-pa-sat");
  expect(factsAboutDish("satay").length).toBeGreaterThan(0);
  expect(factsAboutDish("chillicrab").length).toBeGreaterThan(0);
  const ctx = { era: "1980s", dishes: ["orhluak"], centre: "newton-food-centre" };
  expect(factFor(ctx, 3)).toBe(factFor(ctx, 3));
  expect(factFor(ctx, 3).centres.includes("newton-food-centre") || factFor(ctx, 3).dishes.includes("orhluak")).toBe(true);
});

test("Passport stops sit at profiled centres that existed in their era, and old stamps carry over", () => {
  const eraStart = { "1950s": 1959, "1980s": 1989, today: 2026, 2065: 2065 };
  let profiled = 0;
  for (const stop of STOPS) {
    if (!stop.profile) continue;
    profiled++;
    const p = profileByKey(stop.profile);
    expect(p, stop.id).toBeDefined();
    expect(stop.centre).toBe(p.neaName);
    const opened = Number(String(p.opened).match(/\d{4}/)?.[0]);
    expect(opened <= eraStart[stop.era], `${stop.id} opened ${opened}`).toBe(true);
    expect(famousIn(p).length + (DISHES[stop.focus] ? 1 : 0)).toBeGreaterThan(0);
  }
  expect(profiled).toBeGreaterThanOrEqual(7);
  for (const to of Object.values(RENAMED_STOPS)) expect(STOPS.some((s) => s.id === to)).toBe(true);
});

test("tips never come from after the round's era", () => {
  for (const f of factsFor({ era: "1950s", dishes: ["chickenrice", "satay"], centre: "maxwell-food-centre" })) expect(f.year == null || f.year <= 1969).toBe(true);
  for (const f of factsFor({ era: "1980s", dishes: ["popiah"], centre: "chinatown-complex-market-and-food-centre" })) expect(f.year == null || f.year <= 1989).toBe(true);
  expect(factsFor({ era: "today", centre: "chinatown-complex-market-and-food-centre" }).some((f) => f.year >= 2000)).toBe(true);
});
