import { describe, expect, test } from "bun:test";
import { CHEFS, REGULAR_TYPES } from "./chefs.js";
import { NAMES } from "./helpers.js";
import { loadManifest, routeFor } from "./voices.js";
import { CHEF_LINES, CHEF_PERSONA, DIALECT_LINES, GLOSSARY, LANGS, LINES, PERSONAS, PHRASES, REGULAR_PERSONA, lineText, speakableLines, VOICE_TAGS, YOUNG } from "./phrases.js";

const DASHES = /[\u2013\u2014]/;

test("every spoken line has a stable key, text, a meaning and a source", () => {
  const lines = speakableLines();
  const keys = lines.map((l) => l.key);
  expect(new Set(keys).size).toBe(keys.length);
  for (const l of lines) {
    expect(l.key).toMatch(/^(order|react|chef)\.[a-z]+\.(en|ms|zh|yue|nan|ta)$/);
    expect(l.key.endsWith(`.${l.lg}`)).toBe(true);
    expect(l.text.length).toBeGreaterThan(0);
    expect(DASHES.test(l.text) || DASHES.test(l.mean)).toBe(false);
    const line = lineText(l.key);
    expect(line.say).toBe(l.text);
    // Order phrases in English were checked by ear; everything else links to where it was checked.
    if (!l.key.startsWith("order.") || l.lg !== "en" || l.key === "order.nochilli.en" || l.key === "order.extrachilli.en") expect(line.src?.length ?? 0).toBeGreaterThan(0);
  }
  // Generated clips already exist for these, so the keys must not move.
  for (const k of ["order.plain.ms", "order.takeaway.zh", "order.nochilli.nan", "order.nochilli.ta", "order.extrachilli.ms"]) expect(keys).toContain(k);
  for (const k of ["react.thanks.ta", "react.slow.en", "react.thanks.nan", "chef.fire.en"]) expect(keys).toContain(k);
});

test("Hokkien lines are written in characters for the Hokkien voice model, with romanisation", () => {
  const nan = speakableLines().filter((l) => l.lg === "nan");
  expect(nan.length).toBeGreaterThanOrEqual(4);
  for (const l of nan) {
    expect(/[一-鿿]/.test(l.text)).toBe(true);
    expect(lineText(l.key).roman.length).toBeGreaterThan(0);
  }
});

test("Singlish particles appear where their meaning fits", () => {
  const en = Object.fromEntries(Object.entries(LINES).filter(([, v]) => v.en).map(([k, v]) => [k, v.en.say]));
  expect(en.slow).toMatch(/\bleh\b/);
  expect(en.gone).toMatch(/\blor\b/);
  expect(en.fast).toMatch(/\bmeh\?$/);
  expect(PHRASES.nochilli.en.say).toMatch(/\bhor\b/);
  // sia is mostly used by younger speakers, so only the young line carries it.
  expect(en.tastyyoung).toMatch(/\bsia\b/);
  expect(LINES.tastyyoung.en.young).toBe(true);
  for (const [k, say] of Object.entries(en)) if (k !== "tastyyoung") expect(say).not.toMatch(/\bsia\b/);
  expect(CHEF_LINES.streak.en.say).toMatch(/\blah\b/);
});

test("everyone gets a voice persona, and nobody's accent comes from their community", () => {
  for (const t of REGULAR_TYPES) expect(PERSONAS[REGULAR_PERSONA[t]]).toBeDefined();
  for (const c of CHEFS) expect(PERSONAS[CHEF_PERSONA[c.id]]).toBeDefined();
  for (const n of NAMES) expect(PERSONAS[CHEF_PERSONA[n]]).toBeDefined();
  expect([...YOUNG].every((p) => PERSONAS[p])).toBe(true);
  // One English voice list for everyone, Singapore first, and no Indian English stand-in.
  expect(LANGS.en.voice[0]).toBe("en-SG");
  expect(LANGS.en.voice).not.toContain("en-IN");
  expect(LANGS.ta.voice.slice(0, 2)).toEqual(["ta-SG", "ta-MY"]);
  expect(LANGS.yue.voice[0]).toBe("zh-HK");
});

test("the glossary covers every particle the customers use, with sources", () => {
  const words = GLOSSARY.map((g) => g.word);
  for (const w of ["lah", "leh", "lor", "meh", "hor", "sia", "shiok", "dabao"]) expect(words).toContain(w);
  for (const g of GLOSSARY) {
    expect(g.src).toMatch(/^https:\/\/en\.wiktionary\.org\/wiki\//);
    expect(DASHES.test(g.mean)).toBe(false);
  }
  for (const line of DIALECT_LINES) expect(LINES[line]).toBeDefined();
  for (const tag of ["teochew", "hakka", "hainanese", "nan", "en"]) expect(VOICE_TAGS[tag]).toBeDefined();
});

describe("local voices for every line", () => {
  test("Singlish plays only in a local voice; the other languages play generated takes", async () => {
    const manifest = await Bun.file(new URL("../../data/hawker-voices/manifest.json", import.meta.url)).json();
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify(manifest));
    try {
      await loadManifest();
    } finally {
      globalThis.fetch = realFetch;
    }
    // The aunties and young women have accent-checked Singlish takes.
    for (const key of ["order.plain.en", "react.thanks.en", "react.slow.en", "chef.burnt.en", "order.extrachilli.en"]) {
      expect(routeFor(key, "auntie")).toBe("generated");
      expect(routeFor(key, "youngwoman")).toBe("generated");
    }
    // No man's voice passed the accent check, and there is no device voice here: the words show instead.
    for (const key of ["order.plain.en", "chef.fire.en"]) {
      expect(routeFor(key, "uncle")).toBe("text");
      expect(routeFor(key, "youngman")).toBe("text");
    }
    // Every customer line in the other five languages has a voice for every persona.
    for (const lg of ["ms", "zh", "yue", "ta", "nan"]) {
      for (const persona of ["auntie", "uncle", "youngwoman", "youngman"]) expect(routeFor(`react.thanks.${lg}`, persona)).toBe("generated");
    }
  });
});
