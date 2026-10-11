// Food-culture facts from Singapore's archives (data/hawker-archive-facts.json, built from
// docs/research/hawker-archives.md), plus the history notes in each centre's profile. Every fact keeps
// its sources. Used for loading tips, Passport stops and recipe book notes.

import RAW from "../../data/hawker-archive-facts.json";
import { PROFILES, dishIdsFor } from "./profiles.js";

// Short names people use for each profiled centre, to spot them in a fact.
const CENTRE_WORDS = {
  "maxwell-food-centre": /maxwell/i,
  "chinatown-complex-market-and-food-centre": /chinatown complex|soya sauce chicken rice and noodle/i,
  "old-airport-road-food-centre": /old airport/i,
  "tekka-centre": /tekka/i,
  "newton-food-centre": /newton/i,
  "chomp-chomp-food-centre": /chomp chomp/i,
  "tiong-bahru-market": /tiong bahru/i,
  "amoy-street-food-centre": /amoy street/i,
  "hong-lim-market-and-food-centre": /hong lim/i,
  "adam-road-food-centre": /adam road|adam food/i,
  "geylang-serai-market-and-food-centre": /geylang serai/i,
  "east-coast-lagoon-food-village": /east coast lagoon/i,
  "golden-mile-food-centre": /golden mile|army market/i,
  "zion-riverside-food-centre": /zion/i,
  "abc-brickworks-market-and-food-centre": /abc brickworks/i,
  "changi-village-hawker-centre": /changi village/i,
  "albert-centre-market-and-food-centre": /albert centre|queen street/i,
  "whampoa-makan-place": /whampoa/i,
  "lau-pa-sat": /lau pa sat|telok ayer market/i,
};

const ERAS = ["1950s", "1980s", "today", "2065"];
// The latest year a fact may be about for each era, so a 1950s round never tips you about 2016.
const ERA_END = { "1950s": 1969, "1980s": 1989, today: 2026, 2065: 2100 };
// The earliest year a fact names (a range like "1966 to 1978" counts from its start).
const yearOf = (text) => {
  const m = String(text).match(/\b(1[89]\d\d|20\d\d)\b/);
  return m ? Number(m[1]) : null;
};
const clean = (s) => String(s ?? "").replace(/[\u2013\u2014]/g, ", ").trim();
const okSources = (list) => (Array.isArray(list) ? list : []).filter((s) => Array.isArray(s) && /^https:\/\//.test(String(s[1]))).map(([t, u]) => [String(t), String(u)]);

export const FACTS = [
  ...(RAW?.facts ?? []).map((f) => {
    const text = clean(f.text);
    const all = `${f.when} ${text}`;
    return {
      id: String(f.id),
      when: clean(f.when),
      era: ERAS.includes(f.era) ? f.era : null,
      text: /^[a-z]/.test(text) ? text[0].toUpperCase() + text.slice(1) : text,
      sources: okSources(f.sources),
      year: yearOf(all),
      dishes: dishIdsFor(all),
      centres: Object.entries(CENTRE_WORDS).filter(([, re]) => re.test(all)).map(([k]) => k),
    };
  }),
  ...PROFILES.flatMap((p) =>
    p.history.map((h, i) => ({ id: `${p.key}-${i}`, when: p.displayName, era: null, year: yearOf(h.fact), text: clean(h.fact), sources: h.sources, dishes: dishIdsFor(h.fact), centres: [p.key] })),
  ),
].filter((f) => f.text && f.sources.length);

// Facts that fit a moment, best first: this centre, then these dishes, then this era.
export function factsFor({ era = null, dishes = [], centre = null } = {}) {
  const score = (f) => (centre && f.centres.includes(centre) ? 4 : 0) + (f.dishes.some((d) => dishes.includes(d)) ? 2 : 0) + (era && f.era === era ? 1 : 0) + (era === "2065" && f.era === "today" ? 1 : 0);
  return FACTS.filter((f) => !era || !f.year || f.year <= ERA_END[era])
    .map((f) => [score(f), f])
    .filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0])
    .map(([, f]) => f);
}

// One fact, picked by a seed so the same moment gives the same tip, from the best few.
export function factFor(ctx, seed = 0) {
  const list = factsFor(ctx);
  if (!list.length) return null;
  const top = list.filter((f) => f === list[0] || list.indexOf(f) < 6);
  return top[Math.abs(Math.floor(seed)) % top.length];
}

export const factsAboutDish = (dishId) => FACTS.filter((f) => f.dishes.includes(dishId));
