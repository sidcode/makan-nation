// Writes every line Makan Nation's customers and chefs can say to data/hawker-voice-lines.json, for the
// offline voice generator. Keys are stable: order.<modifier>.<lang>, react.<line>.<lang>, chef.<line>.<lang>.
// Each entry is { key, lg, text, mean }. Personas: auntie, uncle, youngwoman, youngman, student.
// Run: bun scripts/hawker-voice-lines.ts
import { speakableLines } from "../apps/hawker/phrases.js";
import { calloutLines } from "../apps/hawker/callouts.js";
import { drinkChoices } from "../apps/hawker/walk.js";
import { randomOrder } from "../apps/kopi/compiler.js";

const out = `${import.meta.dir}/../data/hawker-voice-lines.json`;

// The kopi codes a drinks uncle will hear in the customer mode, right and nearly right, most common first,
// until they cover 97 out of 100 orders. Seeded, so the list is the same every run.
function commonKopiCodes() {
  let s = 12345;
  const rng = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const counts = new Map<string, number>();
  for (let i = 0; i < 200000; i++) {
    const st = randomOrder(rng);
    st.bag = false;
    for (const c of drinkChoices({ drink: st }, rng)) counts.set(c.code, (counts.get(c.code) ?? 0) + (c.ok ? 1 : 0.5));
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((n, [, c]) => n + c, 0);
  const keep: string[] = [];
  let acc = 0;
  for (const [code, c] of sorted) {
    keep.push(code);
    if ((acc += c) / total > 0.97) break;
  }
  return keep;
}

// Hawkers' callouts: every dish in four voices; each kopi code in one (an uncle or an auntie, in turn).
const calls = calloutLines(commonKopiCodes()).map((l, i) => (l.personas ? { ...l, personas: [i % 2 ? "auntie" : "uncle"] } : l));
const lines = [...speakableLines(), ...calls];
await Bun.write(out, `${JSON.stringify(lines, null, 1)}\n`);
console.log(`Wrote ${lines.length} lines to data/hawker-voice-lines.json`);
