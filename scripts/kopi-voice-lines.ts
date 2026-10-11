// Writes every order the Kopi Compiler can make (one cup, built-in words only) to data/kopi-voice-lines.json,
// for tools/voices/kopi.py. Keys match the drinks callouts in Makan Nation (call.<letters>.ms), so both use
// the same clips. Words a user teaches uncle on their own device can never be pre-recorded; voice.js falls
// back to a local device voice for those.
// Run: bun scripts/kopi-voice-lines.ts
import { BASES, check, compile, defaultState } from "../apps/kopi/compiler.js";

const out = `${import.meta.dir}/../data/kopi-voice-lines.json`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

const codes = new Set<string>();
for (const [base, can] of Object.entries(BASES) as [string, any][]) {
  for (const milk of can.milk ? ["condensed", "none", "evaporated"] : ["condensed"])
    for (const sugar of [0, 1, 2, 3])
      for (const strength of can.strength ? ["normal", "gao", "poh", "dilo"] : ["normal"])
        for (const extra of [null, ...can.extras])
          for (const ice of [false, true])
            for (const bag of [false, true]) {
              const s = { ...defaultState(), base, milk, sugar, strength, ice, bag, halia: extra === "halia", tarik: extra === "tarik", dino: extra === "dino" };
              if (!check(s).length) codes.add(compile(s));
            }
}
const lines = [...codes].map((text) => ({ key: `call.${slug(text)}.ms`, text }));
// Cups, said before the order ("Two", then "Kopi-O"), for orders typed with a number.
for (const n of ["Two", "Three", "Four", "Five"]) lines.push({ key: `call.cups${["Two", "Three", "Four", "Five"].indexOf(n) + 2}.ms`, text: n });
await Bun.write(out, `${JSON.stringify(lines, null, 1)}\n`);
console.log(`Wrote ${lines.length} lines to data/kopi-voice-lines.json`);
