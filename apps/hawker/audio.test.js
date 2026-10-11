import { describe, expect, test } from "bun:test";
import { Sfx } from "./audio.js";

// HallSound makes Audio elements; a stand-in is enough to test which recording comes next.
globalThis.Audio ??= class {
  pause() {}
  play() {
    return Promise.resolve();
  }
  addEventListener() {}
};
const { HallSound } = await import("./ambience.js");

describe("sounds that do not repeat", () => {
  test("a melodic cue never plays the same note twice in a row", () => {
    const sfx = new Sfx();
    let last = null;
    for (let i = 0; i < 2000; i++) {
      const note = sfx.pick("order", [1319, 1568, 1760, 2093, 2349]);
      expect(note).not.toBe(last);
      last = note;
    }
  });

  test("every option still comes up", () => {
    const sfx = new Sfx();
    const seen = new Set();
    for (let i = 0; i < 500; i++) seen.add(sfx.pick("serve", ["a", "b", "c", "d"]));
    expect(seen.size).toBe(4);
  });

  test("playing before the sound starts, or muted, does nothing and does not throw", () => {
    const sfx = new Sfx();
    for (const t of ["order", "serve", "plate", "chop", "end", "cheer", "lastorders"]) expect(() => sfx.play(t, { pan: 0.5, gain: 0.3 })).not.toThrow();
  });

  test("the hall never plays the same recording twice in a row, and plays them all", () => {
    const files = ["a", "b", "c", "d"].map((x) => ({ url: x, seconds: 20 }));
    const hall = new HallSound(files);
    let last = null;
    const seen = new Set();
    for (let i = 0; i < 400; i++) {
      const f = hall.draw();
      expect(f).not.toBe(last);
      seen.add(f.url);
      last = f;
    }
    expect(seen.size).toBe(4);
  });
});
