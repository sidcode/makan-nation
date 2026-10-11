// Turns the food-culture facts in docs/research/hawker-archives.md (section 2) into
// data/hawker-archive-facts.json for Makan Nation's loading tips, Passport stops and recipe book notes.
// Each fact keeps its own sources. Run: bun scripts/hawker-archive-facts.ts
import { join } from "node:path";

const SRC = join(import.meta.dir, "../docs/research/hawker-archives.md");
const OUT = join(import.meta.dir, "../data/hawker-archive-facts.json");

const md = await Bun.file(SRC).text();
const part = md.split(/^## 2\./m)[1]?.split(/^## 3\./m)[0] ?? "";

// Which game era a heading belongs to.
const ERA_OF = [
  [/before the centres/i, "1950s"],
  [/licensing and resettlement/i, "1980s"],
  [/upgrades|recognition/i, "today"],
  [/dish notes/i, null],
];

const facts = [];
let era = null;
for (const line of part.split("\n")) {
  const h = /^###\s+(.*)$/.exec(line);
  if (h) {
    era = ERA_OF.find(([re]) => re.test(h[1]))?.[1] ?? null;
    continue;
  }
  const m = /^(?:\d+\.|-)\s+\*\*(.+?):\*\*\s+(.*)$/.exec(line.trim());
  if (!m) continue;
  const [, when, rest] = m;
  // The sources are the links in the last bracket group: "... sentence. ([Title](url); [Title](url))".
  const cut = rest.lastIndexOf(" ([");
  const text = (cut > 0 ? rest.slice(0, cut) : rest).trim();
  const tail = cut > 0 ? rest.slice(cut) : rest;
  const sources = [...tail.matchAll(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g)].map(([, t, u]) => [t, u]);
  if (!sources.length || !text) continue;
  facts.push({ id: `f${facts.length + 1}`, when: when.trim(), era, text, sources: sources.slice(0, 3) });
}

await Bun.write(OUT, `${JSON.stringify({ source: "docs/research/hawker-archives.md", generated: new Date().toISOString().slice(0, 10), facts }, null, 1)}\n`);
console.log(`Wrote ${facts.length} facts to data/hawker-archive-facts.json`);
