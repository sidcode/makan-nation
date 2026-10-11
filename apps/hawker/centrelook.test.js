import { expect, test } from "bun:test";
import { ARCHETYPES, archetypeByYear, archetypeFrom, backdropFrom, coloursFrom, featuresFrom, presetFor, signText, timeFrom, TIMES } from "./centrelook.js";

test("descriptions of a building read as the right archetype", () => {
  expect(archetypeFrom({ summary: "A Victorian cast-iron octagon with a clock tower" })).toBe("octagon");
  expect(archetypeFrom({ layout: "Food centre on the second floor of a multi-storey complex" })).toBe("complex");
  expect(archetypeFrom({ layout: "open-air seating by the beach", roof: "none, open-air" })).toBe("openair");
  expect(archetypeFrom({ summary: "Art deco flats all around", roof: "flat" })).toBe("artdeco");
  expect(archetypeFrom({ roof: "long pitched zinc roof", layout: "open-sided pavilion" })).toBe("pavilion");
  expect(archetypeFrom({ layout: "wet market below, food centre beside it" })).toBe("market");
  expect(archetypeFrom({ roof: "large canopy with louvres", layout: "modern, naturally ventilated" })).toBe("modern");
  expect(archetypeFrom({})).toBe(null);
  expect(archetypeFrom(null)).toBe(null);
});

test("colours, time of day, surroundings and features come from plain words", () => {
  expect(coloursFrom("Green pillars and a red roof, cream walls")).toEqual(["#4a8a5a", "#c8553d", "#f3e6c8"]);
  expect(coloursFrom("dark green and light blue")).toEqual(["#2f5a3f", "#9fc4e0"]);
  expect(coloursFrom("")).toEqual([]);
  expect(timeFrom("Best at night, supper crowds")).toBe("night");
  expect(timeFrom("CBD lunch rush")).toBe("lunch");
  expect(timeFrom("breakfast regulars")).toBe("morning");
  expect(timeFrom(undefined)).toBe("day");
  expect(backdropFrom({ surroundings: "CBD office towers and old shophouses" })).toEqual(["cbd", "shophouses"]);
  expect(backdropFrom({ surroundings: "HDB flats and a park" })).toEqual(["hdb", "trees"]);
  expect(backdropFrom({ surroundings: "the sea and a ferry terminal" })).toContain("sea");
  expect(featuresFrom({ features: "satay stalls on the street at night, ceiling fans" })).toEqual(["satay", "fans"]);
});

test("without a profile, the year picks a sensible building, and the 1950s are on the street", () => {
  expect(archetypeByYear(1935, "today")).toBe("market");
  expect(archetypeByYear(1973, "today")).toBe("pavilion");
  expect(archetypeByYear(2017, "today")).toBe("modern");
  expect(archetypeByYear(1973, "1950s")).toBe("street");
  const p = presetFor({ centre: { name: "Old Airport Road Blk 51 (51 Old Airport Road Food Centre and Shopping Mall)", year: 1973 }, eraId: "1950s" });
  expect(p.archetype).toBe("street");
  expect(p.sign).toBe("OLD AIRPORT ROAD BLK 51");
});

test("a profile drives the preset, and Centre Manager sessions set the time of day", () => {
  const profile = { key: "x", displayName: "Example Food Centre", opened: "1972", look: { roof: "long pitched roof, grey", colours: "green pillars, red trim, cream", timeOfDay: "night", surroundings: "HDB flats", features: "satay at night" } };
  const p = presetFor({ profile, eraId: "today" });
  expect(p.archetype).toBe("pavilion");
  expect(p.time).toBe("night");
  expect(p.colours.roof).toBe("#9aa0a6");
  expect(p.colours.pillar).toBe("#4a8a5a");
  expect(p.backdrop).toContain("hdb");
  expect(p.features).toContain("satay");
  expect(p.sign).toBe("EXAMPLE FOOD CENTRE");
  expect(presetFor({ profile, eraId: "today", session: "b" }).time).toBe("morning");
  expect(presetFor({ profile, eraId: "today", session: "l" }).time).toBe("lunch");
  expect(presetFor({ profile, eraId: "today", session: "d" }).time).toBe("night");
  expect(presetFor({ eraId: "today", override: { archetype: "octagon", time: "dusk" } })).toMatchObject({ archetype: "octagon", time: "dusk" });
  for (const a of Object.keys(ARCHETYPES)) expect(presetFor({ eraId: "today", override: { archetype: a } }).archetype).toBe(a);
  expect(TIMES).toContain(presetFor({ eraId: "today" }).time);
  expect(signText("A (B)")).toBe("A");
});
