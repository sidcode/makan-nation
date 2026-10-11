import { describe, expect, test } from "bun:test";
import HDB from "../../data/hawker-hdb.json";
import NEA from "../../data/hawker-centres.json";
import FOOT from "../../data/hawker-footprints.json";
import BLOCKS from "../../data/hdb-blocks.json";
import { aroundSummary, blockName, endWalls, flatsOver, hdbOf, loadHdb, pillarSpots, slabOver, streetName } from "./hdb.js";
import { planCentre } from "./floorplan.js";

const ids = new Set(NEA.centres.map((c) => c.id));
const keys = new Set(BLOCKS.blocks.map((b) => `${b[0]}|${b[1]}`));
const byName = (re) => NEA.centres.find((c) => re.test(c.name));

describe("HDB blocks and hawker centres", () => {
  test("every centre and tower points at real NEA centres and HDB blocks", () => {
    for (const [id, c] of Object.entries(HDB.centres)) {
      expect(ids.has(id)).toBe(true);
      for (const b of c.blocks) expect(keys.has(`${b.blk}|${b.street}`)).toBe(true);
    }
    for (const [id, towers] of Object.entries(HDB.over)) {
      expect(ids.has(id)).toBe(true);
      for (const t of towers) {
        expect(t.outline.length).toBeGreaterThanOrEqual(3);
        // A podium cut off where its tower parts begin can be lower.
        expect(t.levels).toBeGreaterThanOrEqual(t.capped ? 1 : 4);
      }
    }
    for (const [key, list] of Object.entries(HDB.nearby)) {
      expect(keys.has(key)).toBe(true);
      for (const id of list) expect(ids.has(id)).toBe(true);
    }
    // Most of NEA's centres are HDB blocks; the counts are the data's own.
    expect(Object.keys(HDB.centres).length).toBeGreaterThan(70);
    expect(Object.keys(HDB.around).length).toBeGreaterThan(500);
  });

  test("the well-known ones match", async () => {
    await loadHdb();
    const old = hdbOf(byName(/Old Airport Road Blk 51/));
    expect(old.blocks[0].blk).toBe("51");
    expect(blockName(old.blocks)).toBe("Blk 51 Old Airport Road");
    // NEA writes "Blk 91/92" and "Blk 22A/B".
    expect(hdbOf(byName(/Whampoa Drive Blk 91\/92/)).blocks.map((b) => b.blk)).toEqual(["91", "92"]);
    expect(hdbOf(byName(/Havelock Road Blk 22A\/B/)).blocks.map((b) => b.blk)).toEqual(["22A", "22B"]);
    // People live in People's Park's own block.
    expect(flatsOver(hdbOf(byName(/People's Park/))).length).toBeGreaterThan(0);
    // Newton is not an HDB block.
    expect(hdbOf(byName(/Newton Food Centre/))).toBeNull();
  });

  test("the blocks round a centre add up, and later ones leave the 1980s", async () => {
    await loadHdb();
    const c = byName(/Old Airport Road Blk 51/);
    const now = aroundSummary(FOOT.centres[c.id]);
    expect(now.n).toBeGreaterThan(3);
    expect(now.tallest.floors).toBeGreaterThan(5);
    const then = aroundSummary(FOOT.centres[c.id], 1989);
    expect(then?.n ?? 0).toBeLessThanOrEqual(now.n);
  });

  test("street names read out in full", () => {
    expect(streetName("BT MERAH LANE 1")).toBe("Bukit Merah Lane 1");
    expect(streetName("ANG MO KIO AVE 10")).toBe("Ang Mo Kio Avenue 10");
  });
});

describe("block shapes", () => {
  // A 60 by 12 metre slab, along x.
  const slab = [[-30, -6], [30, -6], [30, 6], [-30, 6]];

  test("the number goes on the two end walls, facing out", () => {
    const ends = endWalls(slab);
    expect(ends.length).toBe(2);
    for (const w of ends) {
      expect(Math.abs(w.nx)).toBeCloseTo(1, 5);
      expect(Math.sign(w.nx)).toBe(Math.sign(w.x));
      expect(w.len).toBeCloseTo(12, 5);
    }
  });

  test("void deck pillars stand under the block", () => {
    const spots = pillarSpots(slab);
    expect(spots.length).toBeGreaterThan(20);
    for (const [x, z] of spots) {
      expect(Math.abs(x)).toBeLessThan(30);
      expect(Math.abs(z)).toBeLessThan(6);
    }
  });

  test("a guessed slab of flats sits along the hall's long side", () => {
    const hall = [[-40, -15], [40, -15], [40, 15], [-40, 15]];
    const s = slabOver(hall);
    const xs = s.map((p) => p[0]);
    const zs = s.map((p) => p[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(60);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(12, 5);
  });

  test("towers over a centre are laid out with its outline", async () => {
    await loadHdb();
    for (const [id, towers] of Object.entries(HDB.over)) {
      const centre = NEA.centres.find((c) => c.id === id);
      const plan = planCentre({ centre, footprint: { ...FOOT.centres[id], over: towers }, eraId: "today" });
      expect(plan.over.length).toBe(towers.length);
      // In the plan's frame, every tower overlaps the hall or, for a hall on part of a bigger building, that building.
      const xs = (plan.parent ?? plan.outline).map((p) => p[0]);
      const zs = (plan.parent ?? plan.outline).map((p) => p[1]);
      const [x0, x1, z0, z1] = [Math.min(...xs) - 5, Math.max(...xs) + 5, Math.min(...zs) - 5, Math.max(...zs) + 5];
      for (const t of plan.over) expect(t.outline.some(([x, z]) => x > x0 && x < x1 && z > z0 && z < z1)).toBe(true);
    }
    // Albert Centre: Blk 271's flats stand on the food centre from its third storey.
    const albert = hdbOf(byName(/Albert Centre/));
    expect(flatsOver(albert)[0].blk).toBe("271");
  });
});
