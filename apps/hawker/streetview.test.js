import { expect, test } from "bun:test";
import SV from "../../data/hawker-streetview.json";
import NEA from "../../data/hawker-centres.json";

const ids = new Set(NEA.centres.map((c) => c.id));
const byId = Object.fromEntries(NEA.centres.map((c) => [c.id, c]));

test("street-level photos belong to real centres, are near them, and credit KartaView", () => {
  expect(Object.keys(SV.centres).length).toBeGreaterThan(100);
  for (const [id, photos] of Object.entries(SV.centres)) {
    expect(ids.has(id)).toBe(true);
    expect(photos.length).toBeGreaterThan(0);
    expect(photos.length).toBeLessThanOrEqual(3);
    const c = byId[id];
    for (const p of photos) {
      expect(p.image).toMatch(/^https:\/\/storage\d+\.openstreetcam\.org\/files\/photo\//);
      expect(p.page).toMatch(/^https:\/\/kartaview\.org\/details\/\d+\/\d+\/track-info$/);
      expect(p.metres).toBeLessThanOrEqual(300);
      // The stored distance agrees with the coordinates.
      const d = Math.hypot((p.lng - c.lng) * 111320 * Math.cos((c.lat * Math.PI) / 180), (p.lat - c.lat) * 110574);
      expect(Math.abs(d - p.metres)).toBeLessThan(3);
      expect(p.shot).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    // One photo per sequence, so "Another" shows somewhere else.
    expect(new Set(photos.map((p) => p.sequence)).size).toBe(photos.length);
  }
  expect(SV.licenceUrl).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
});
