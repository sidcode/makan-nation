// The living archive: short memories players leave about a dish.
// On the Bun server they are shared with everyone who plays there. On a static site (GitHub Pages)
// they stay in this browser.

import { DISHES } from "./dishes.js";

const KEY = "makan-memories";
let cache = {};
let server = false;

function local() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

function clean(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((m) => m && typeof m.text === "string")
    .slice(-40)
    .map((m) => ({ name: String(m.name ?? "").slice(0, 24), text: String(m.text).slice(0, 140), at: String(m.at ?? "").slice(0, 10) }));
}

export async function loadMemories(useServer) {
  server = useServer;
  let raw = {};
  if (server) {
    try {
      const res = await fetch("../api/hawker/memories", { signal: AbortSignal.timeout(4000) });
      raw = res.ok ? await res.json() : {};
    } catch {
      raw = {};
    }
  } else raw = local();
  cache = {};
  for (const id of Object.keys(DISHES)) {
    const list = clean(raw?.[id]);
    if (list.length) cache[id] = list;
  }
  return cache;
}

export const memoriesFor = (dish) => cache[dish] ?? [];

export function anyMemory(dishes, rand = Math.random) {
  const pool = dishes.flatMap((d) => memoriesFor(d).map((m) => ({ ...m, dish: d })));
  return pool.length ? pool[Math.floor(rand() * pool.length)] : null;
}

export async function addMemory(dish, text, name) {
  text = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
  name = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 24);
  if (!DISHES[dish]) throw new Error("Pick a dish first.");
  if (text.length < 3) throw new Error("Write a little more first.");
  if (server) {
    const res = await fetch("../api/hawker/memories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dish, text, name }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Could not save that.");
  } else {
    const all = local();
    (all[dish] ??= []).push({ name, text, at: new Date().toLocaleDateString("en-CA") });
    all[dish] = all[dish].slice(-40);
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      throw new Error("This browser would not save it.");
    }
  }
  (cache[dish] ??= []).push({ name, text, at: new Date().toLocaleDateString("en-CA") });
}
