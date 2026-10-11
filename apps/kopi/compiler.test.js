import { expect, test } from "bun:test";
import { buildLexicon, tokenize, fold, compile, describe, randomOrder, sameDrink, check } from "./compiler.js";

const lex = buildLexicon();
const run = (src, l = lex) => {
  const tokens = tokenize(src, l);
  const r = fold(tokens, l);
  return { ...r, tokens, order: compile(r.state) };
};

test("classic orders compile to canonical form", () => {
  expect(run("kopi-o kosong peng").order).toBe("Kopi-O Kosong Peng");
  expect(run("TEH C siu dai").order).toBe("Teh-C Siew Dai");
  expect(run("kopi gao peng").order).toBe("Kopi Gao Peng");
  expect(run("teh halia").order).toBe("Teh Halia");
  expect(run("yuan yang").order).toBe("Yuan Yang");
  expect(run("kopi cham").order).toBe("Yuan Yang");
  expect(run("milo dinosaur").order).toBe("Milo Dinosaur");
  expect(run("tak kiu peng da bao").order).toBe("Milo Peng Da Bao");
  expect(run("michael jackson").order).toBe("Michael Jackson");
  expect(run("kopi di lo siew dai").order).toBe("Kopi Di Lo Siew Dai");
});

test("run-together words get split", () => {
  expect(run("kopiosiewdai").order).toBe("Kopi-O Siew Dai");
  expect(run("tehcpeng").order).toBe("Teh-C Peng");
  expect(run("coco").tokens.map((t) => t.entry)).toEqual([null]);
});

test("kosong drops condensed milk", () => {
  const r = run("kopi kosong");
  expect(r.state.milk).toBe("none");
  expect(r.order).toBe("Kopi-O Kosong");
});

test("uncle complains about clashes", () => {
  expect(run("kopi o c").errors).toBe(1);
  expect(run("kopi kosong ga dai").errors).toBe(1);
  expect(run("kopi gao poh").errors).toBe(1);
  expect(run("teh dinosaur").errors).toBe(1);
  expect(run("bandung c").errors).toBe(1);
  expect(run("peng").errors).toBe(1);
  expect(run("kopi xyz").errors).toBe(1);
  expect(run("kopi teh").errors).toBe(0);
  expect(run("kopi teh").state.base).toBe("cham");
});

test("counts and zeros", () => {
  expect(run("dua kopi-0").order).toBe("Two Kopi-O");
});

test("custom words parse", () => {
  const l = buildLexicon([
    { word: "oat", type: "milk", meaning: "oat milk", color: "#e9dcc3" },
    { word: "wfh", type: "macro", meaning: "", expands: "kopi-o kosong gao" },
  ]);
  expect(run("kopi oat siew dai", l).order).toBe("Kopi Oat Siew Dai");
  expect(run("wfh peng", l).order).toBe("Kopi-O Gao Kosong Peng");
});

test("random orders are always valid and round trip", () => {
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 500; i++) {
    const s = randomOrder(rng);
    expect(check(s)).toEqual([]);
    const back = run(compile(s));
    expect(back.errors).toBe(0);
    expect(sameDrink(back.state, s)).toBe(true);
    expect(describe(s).length).toBeGreaterThan(5);
  }
});
