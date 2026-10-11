// Films the scenes of the Makan Nation demo video from the running dev server (bun run dev).
// node capture/shoot.mjs <scene ...>      (or "all"); clips land in public/clips/<scene>.mp4
// Each scene sets the game's saved settings first, opens the page, then records a scripted playthrough.

import { mkdir } from "node:fs/promises";
import { launch, record } from "./rec.mjs";

const SITE = process.env.SITE ?? "http://127.0.0.1:3000/";
const OUT = new URL("../public/clips/", import.meta.url).pathname;
const wait = (p, s) => p.waitForTimeout(s * 1000);

// Saved settings for Makan Nation, as its store writes them (JSON in localStorage).
function settings(page, s) {
  return page.addInitScript((s) => {
    const base = { "makan-open": true, "makan-tutorial": true, "makan-hints": "labels", "makan-gfx": "2", "makan-look": "soft", "makan-people": "auto", "makan-hires": [], "makan-name": "sidcode", "makan-music": 70 };
    for (const [k, v] of Object.entries({ ...base, ...s })) localStorage.setItem(k, JSON.stringify(v));
  }, s);
}

// A kitchen round on autoplay: open setup, pick how many chefs, start, film.
// The stall radio plays only in the 1950s, where it is the public domain 78s; in later eras it would be live FM,
// Rediffusion or song previews, which the video cannot use. The hall's ambience, effects and voices stay.
function kitchen({ at = null, era = "today", look = "soft", gfx = "2", level = null, chefs = 1, hires = [], seconds = 14, extra = {}, after = null }) {
  return async (page) => {
    await settings(page, { "makan-era": era, "makan-look": look, "makan-gfx": gfx, "makan-hires": hires, "makan-music": era === "1950s" ? 70 : 0, ...(level ? { "makan-level": level } : {}), ...extra });
    await page.goto(`${SITE}hawker/?autoplay${at ? `&at=${at}` : ""}`);
    await wait(page, 2);
    await page.click("#playHere");
    await wait(page, 0.6);
    if (chefs > 1) await page.click(`label:has(input[name=locals][value="${chefs}"])`);
    await wait(page, 0.4);
    return async (p) => {
      await p.click("#startBtn");
      await wait(p, seconds);
      if (after) await after(p);
    };
  };
}

// Makan at a hawker centre: the picker opens on the centre, then a meal played the way the guide tests do:
// Go to the next step, use what you arrive at, order what is on the list (the right kopi code for the drink),
// stand up after eating. `cams` switches the view when something happens: choped, first in a queue, eaten.
// What a player presses E for, as in the guide tests; everything else is walked to with Go.
const ACT = ["chope", "place", "sit", "clear", "return", "seller"];
async function meal(p, seconds, cams = {}) {
  const t0 = Date.now();
  const seen = new Set();
  let doneAt = null;
  // V steps through the views in order: Above, Behind, Eyes.
  const view = async (cam) => {
    for (let n = 0; n < 3 && (await p.evaluate(() => localStorage.getItem("makan-walk-cam"))) !== JSON.stringify(cam); n++) await p.keyboard.press("KeyV");
  };
  while ((Date.now() - t0) / 1000 < seconds) {
    const s = await p.evaluate(() => {
      const r = window.__walk;
      if (!r?.w) return null;
      return { order: Boolean(r.order), code: r.order?.picking?.code ?? null, sitting: r.w.me.sitting !== null, ate: r.w.me.ate, done: r.w.done, auto: Boolean(r.w.me.auto), prompt: r.w.prompt?.kind ?? null, choped: r.w.me.chope != null, queue: r.w.me.queue != null };
    });
    // Views change on what happens: choped, first in a queue (V does nothing while the order sheet is open), eaten.
    for (const [event, on] of [["choped", s?.choped], ["queue", s?.queue], ["ate", s?.ate]]) {
      if (on && cams[event] && !seen.has(event)) {
        seen.add(event);
        await view(cams[event]);
      }
    }
    if (!s || s.done) {
      if (s?.done) doneAt ??= Date.now();
      if (doneAt && Date.now() - doneAt > 5000) break;
      await wait(p, 0.25);
      continue;
    }
    if (s.order) {
      if (s.code) await p.locator(".worder__kopi button.worder__item", { hasText: s.code }).first().click({ timeout: 1000 }).catch(() => {});
      else {
        const item = p.locator(".worder__item.is-list:not([disabled])").first();
        if (await item.count()) await item.click({ timeout: 1000 }).catch(() => {});
        else await p.keyboard.press("Enter");
      }
      await wait(p, 0.7);
      continue;
    }
    if (s.sitting && s.ate) {
      await p.keyboard.down("KeyS");
      await wait(p, 0.4);
      await p.keyboard.up("KeyS");
    } else if (!s.auto && ACT.includes(s.prompt) && !(s.prompt === "chope" && s.choped)) await p.keyboard.press("KeyE");
    else if (!s.auto) await p.keyboard.press("KeyG");
    await wait(p, 0.3);
  }
}

function walk({ centre, era = "today", cam = "above", look = "real", people = "auto", seconds = 20, cams = {}, zoom = 0, before = null }) {
  return async (page) => {
    await settings(page, { "makan-walk-centre": centre, "makan-walk-era": era, "makan-walk-cam": cam, "makan-look": look, "makan-people": people, "makan-music": 0, "makan-walk-guide": true });
    await page.goto(`${SITE}hawker/?makan=${centre}`);
    await wait(page, 3);
    return async (p) => {
      await p.click("#walkGo");
      await wait(p, 2.5);
      await p.keyboard.press("KeyG");
      for (let i = 0; i < Math.abs(zoom); i++) await p.keyboard.press(zoom > 0 ? "Equal" : "Minus");
      if (before) await before(p);
      await meal(p, seconds, cams);
    };
  };
}

const STATIC = process.env.STATIC ?? "http://127.0.0.1:4000/common-ground/";
const SIX = { maxwell: "2026-10-01", tiongbahru: "2026-10-02", hoihow: "2026-10-03", newton: "2026-10-04", chinatown: "2026-10-05", tekka: "2026-10-06" };
const BOOK = Object.fromEntries(["chickenrice", "chweekueh", "satay", "orhluak", "popiah", "biryani", "ckt", "laksa", "kopi"].map((d) => [d, 3]));

// Slow scroll, in steps: of a given box, else of the game's screens (they scroll inside #menu), else the page.
async function scrollBy(p, total, steps = 12, sel = null) {
  for (let i = 0; i < steps; i++) {
    await p.evaluate(
      ([dy, sel]) => {
        const menu = document.getElementById("menu");
        const box = sel ? document.querySelector(sel) : menu && !menu.hidden && menu.scrollHeight > menu.clientHeight ? menu : document.scrollingElement;
        box?.scrollBy({ top: dy, behavior: "smooth" });
      },
      [total / steps, sel],
    );
    await wait(p, 0.25);
  }
}

// Uncle's Rush: read the order on the ticket and set the controls the way a player would.
async function buildFromTicket(p) {
  const order = ((await p.textContent("#rush-order")) ?? "").trim();
  const has = (w) => new RegExp(`\\b${w}\\b`, "i").test(order);
  const base = /Michael Jackson/.test(order) ? "mj" : /Yuan Yang/.test(order) ? "cham" : /Milo/.test(order) ? "milo" : /Bandung/.test(order) ? "bandung" : /Teh/.test(order) ? "teh" : "kopi";
  const pick = (name, value) => p.click(`label.opt:has(input[name="${name}"][value="${value}"])`, { timeout: 800 }).catch(() => {});
  await pick("base", base);
  await pick("milk", /-O\b/.test(order) ? "none" : /-C\b/.test(order) ? "evaporated" : "condensed");
  await pick("sugar", has("Kosong") ? "0" : has("Siew Dai") ? "1" : has("Ga Dai") ? "3" : "2");
  await pick("strength", has("Gao") ? "gao" : has("Poh") ? "poh" : has("Di Lo") ? "dilo" : "normal");
  for (const [w, v] of [["Halia", "halia"], ["Tarik", "tarik"], ["Dinosaur", "dino"], ["Peng", "ice"], ["Da Bao", "bag"]]) if (has(w)) await pick("extras", v);
  await wait(p, 0.3);
  await p.click("#rush-done").catch(() => {});
}

export const SCENES = {
  // ---- The kitchen ----
  // Two chefs on one keyboard at a lunch rush, today.
  "k-coop": kitchen({ at: "old-airport-road-food-centre", chefs: 2, seconds: 26, look: "soft" }),
  // One chef and three hired helpers in the 1980s.
  "k-helpers": kitchen({ at: "chinatown-complex-market-and-food-centre", era: "1980s", look: "toon", hires: ["washer", "slicer", "kopi"], seconds: 22 }),
  "k-1950s": kitchen({ at: "maxwell-food-centre", era: "1950s", look: "soft", seconds: 14 }),
  "k-2065": kitchen({ at: "east-coast-lagoon-food-village", era: "2065", look: "real", seconds: 14 }),
  "k-laupasat": kitchen({ at: "lau-pa-sat", era: "today", look: "real", seconds: 12 }),
  "k-newton": kitchen({ at: "newton-food-centre", era: "today", look: "soft", seconds: 10 }),
  "k-tiongbahru": kitchen({ at: "tiong-bahru-market", era: "today", look: "toon", seconds: 10 }),
  "k-tekka": kitchen({ at: "tekka-centre", era: "1980s", look: "soft", seconds: 10 }),
  // The same stall in each look, and a low graphics setting, for wipes between them.
  "k-look-toon": kitchen({ at: "geylang-serai-market-and-food-centre", look: "toon", seconds: 10 }),
  "k-look-soft": kitchen({ at: "geylang-serai-market-and-food-centre", look: "soft", seconds: 10 }),
  "k-look-real": kitchen({ at: "geylang-serai-market-and-food-centre", look: "real", seconds: 10 }),
  "k-gfx-low": kitchen({ at: "geylang-serai-market-and-food-centre", look: "real", gfx: "0", seconds: 8 }),
  // The end of a round: the clock is wound down, then the results with the profit and loss.
  "k-results": kitchen({
    at: "amoy-street-food-centre",
    chefs: 2,
    seconds: 40,
    after: async (p) => {
      await p.evaluate(() => (window.__makan.sim.time = 2));
      await wait(p, 5);
      await p.mouse.wheel(0, 500);
      await wait(p, 2.5);
      await p.mouse.wheel(0, 700);
      await wait(p, 3);
    },
  }),

  // ---- Makan at a hawker centre ----
  // A whole lunch at Maxwell: from above until a table is choped, over the shoulder to the stalls, through your
  // own eyes from the first queue to the last bite, then over the shoulder to return the tray.
  "w-maxwell": walk({ centre: "119469", cam: "above", seconds: 140, cams: { choped: "behind", queue: "eyes", ate: "behind" } }),
  // The picker: all 129 centres, the map, and the street view of the one picked.
  "w-picker": async (page) => {
    await settings(page, { "makan-walk-centre": "119478", "makan-walk-view": "list", "makan-music": 0 });
    await page.goto(`${SITE}hawker/?makan=119478`);
    await wait(page, 3);
    return async (p) => {
      await wait(p, 1.5);
      await scrollBy(p, 500, 8);
      await wait(p, 0.8);
      await p.click(".cpick label:has-text('Map'), label:has-text('Map')").catch(() => {});
      await wait(p, 4);
      const box = await p.locator(".leaflet-container").boundingBox().catch(() => null);
      if (box) {
        await p.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.6, { steps: 20 });
        await wait(p, 1);
      }
      await scrollBy(p, 700, 10);
      await wait(p, 4);
      await scrollBy(p, 600, 8);
      await wait(p, 2);
    };
  },
  "w-chinatown-1980s": walk({ centre: "119379", era: "1980s", cam: "behind", look: "soft", seconds: 22 }),
  "w-street-1950s": walk({ centre: "119379", era: "1950s", cam: "eyes", look: "soft", seconds: 20 }),
  "w-oar-2065": walk({ centre: "119372", era: "2065", cam: "above", look: "real", seconds: 18 }),
  "w-chomp-1980s": walk({ centre: "119489", era: "1980s", cam: "behind", look: "real", seconds: 16 }),
  "w-newton-eyes": walk({ centre: "119483", era: "today", cam: "eyes", look: "real", seconds: 16 }),
  "w-albert-hdb": walk({ centre: "119374", era: "today", cam: "above", look: "real", seconds: 12, zoom: -6 }),
  "w-tekka-classic": walk({ centre: "119408", era: "today", cam: "behind", look: "toon", people: "classic", seconds: 14 }),

  // ---- The lobby ----
  lobby: async (page) => {
    await page.goto(SITE);
    await wait(page, 2);
    return async (p) => {
      await wait(p, 2);
      await scrollBy(p, 1600, 16);
      await wait(p, 1);
      await scrollBy(p, -1600, 8);
      await wait(p, 1);
    };
  },

  // ---- Hawker Passport, Centre Manager, recipe book ----
  // Six stamps in: the map, the centre picker, the stops with their mentors.
  "p-map": async (page) => {
    await settings(page, { "makan-passport": { stamps: SIX }, "makan-book": BOOK, "makan-music": 0 });
    await page.goto(`${SITE}hawker/?autoplay`);
    await wait(page, 2);
    return async (p) => {
      await p.click("#passportBtn");
      await wait(p, 3);
      for (const name of ["Smith Street Blk 335", "Old Airport Road Blk 51", "Newton Food Centre"]) {
        const pt = await p.evaluate((name) => {
          const dot = [...document.querySelectorAll(".pmap circle")].find((c) => c.querySelector("title")?.textContent.startsWith(name));
          const r = dot.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }, name);
        await p.mouse.move(pt.x, pt.y, { steps: 12 });
        await p.mouse.click(pt.x, pt.y);
        await wait(p, 1.6);
      }
      await scrollBy(p, 2600, 26);
      await wait(p, 1.5);
    };
  },
  // Stop 7: cook at Old Airport Road with Auntie Grace, then her question and the stamp.
  "p-stop": async (page) => {
    await settings(page, { "makan-passport": { stamps: SIX }, "makan-book": BOOK, "makan-music": 0, "makan-look": "soft" });
    await page.goto(`${SITE}hawker/?autoplay`);
    await wait(page, 2);
    await page.click("#passportBtn");
    await wait(page, 2);
    return async (p) => {
      await p.locator("#stop-oldairport").scrollIntoViewIfNeeded();
      await wait(p, 2.5);
      await p.click("#stop-oldairport button.go");
      await wait(p, 14);
      await p.evaluate(() => (window.__makan.sim.time = 1));
      await wait(p, 4);
      await p.locator("#quiz").scrollIntoViewIfNeeded().catch(() => {});
      await wait(p, 2.5);
      await p.click(".quiz__opt:has-text('The old Kallang Airport')").catch(() => {});
      await wait(p, 3.5);
    };
  },
  // Advanced: run Old Airport Road for a few sessions.
  "c-manager": async (page) => {
    await settings(page, { "makan-music": 0 });
    await page.goto(`${SITE}hawker/`);
    await wait(page, 2);
    return async (p) => {
      await p.click("#centreBtn");
      await wait(p, 2.5);
      await p.click("button:has-text('Open the centre')");
      await wait(p, 2.5);
      await scrollBy(p, 900, 9);
      for (let i = 0; i < 3; i++) {
        await p.click("button:has-text('run')", { timeout: 2000 }).catch(() => {});
        await wait(p, 2.2);
      }
      await scrollBy(p, 1400, 12);
      await wait(p, 1.5);
    };
  },
  // The recipe book: a dish's past, present and future, its loop, its prices.
  book: async (page) => {
    await settings(page, { "makan-book": BOOK, "makan-music": 0 });
    await page.goto(`${SITE}hawker/`);
    await wait(page, 2);
    return async (p) => {
      await p.click("#bookBtn");
      await wait(p, 2.5);
      await scrollBy(p, 2400, 30);
      await wait(p, 1);
    };
  },

  // ---- Kopi Compiler ----
  "kopi-type": async (page) => {
    await page.goto(`${SITE}kopi/`);
    await wait(page, 2);
    return async (p) => {
      for (const order of ["kopi-o kosong peng", "teh halia siew dai da bao", "milo dinosaur"]) {
        await p.fill("#src", "");
        await p.click("#src");
        await p.keyboard.type(order, { delay: 100 });
        await wait(p, 1.2);
        await p.click("#shout");
        await wait(p, 3);
      }
    };
  },
  "kopi-build": async (page) => {
    await page.goto(`${SITE}kopi/`);
    await wait(page, 2);
    return async (p) => {
      await p.click("#tab-build");
      await wait(p, 1.2);
      for (const [n, v] of [["base", "teh"], ["milk", "evaporated"], ["sugar", "1"], ["strength", "gao"], ["extras", "ice"], ["extras", "bag"]]) {
        await p.click(`label.opt:has(input[name="${n}"][value="${v}"])`);
        await wait(p, 0.7);
      }
      await p.click("#shout");
      await wait(p, 3);
    };
  },
  "kopi-rush": async (page) => {
    await page.goto(`${SITE}kopi/`);
    await wait(page, 2);
    await page.click("#tab-rush");
    await wait(page, 1);
    return async (p) => {
      await wait(p, 1.2);
      await p.click("#rush-start");
      for (let i = 0; i < 5; i++) {
        await wait(p, 2.2);
        await buildFromTicket(p);
      }
      await wait(p, 1.5);
    };
  },
  "kopi-auntie": async (page) => {
    await page.addInitScript(() => localStorage.setItem("kopi-compiler:who:v1", JSON.stringify("auntie")));
    await page.goto(`${SITE}kopi/`);
    await wait(page, 2);
    await page.click("#tab-rush");
    await wait(page, 1);
    return async (p) => {
      await wait(p, 1.5);
      await p.click("#rush-start");
      for (let i = 0; i < 3; i++) {
        await wait(p, 2.4);
        await buildFromTicket(p);
      }
      await wait(p, 1.5);
    };
  },
  "kopi-teach": async (page) => {
    await page.goto(`${SITE}kopi/`);
    await wait(page, 2);
    return async (p) => {
      await p.locator("#teach").scrollIntoViewIfNeeded();
      await wait(p, 1);
      await p.click("#teach-word");
      await p.keyboard.type("oat", { delay: 120 });
      await p.click("#teach-meaning");
      await p.keyboard.type("Oat milk instead of condensed", { delay: 45 });
      await wait(p, 0.6);
      await p.click("#teach button[type=submit]");
      await wait(p, 1.5);
      await p.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      await wait(p, 1);
      await p.fill("#src", "");
      await p.click("#src");
      await p.keyboard.type("kopi oat siew dai", { delay: 110 });
      await wait(p, 3);
    };
  },

  // ---- Block Birthday, on the static build so the wish stays in the browser ----
  block: async (page) => {
    await page.goto(`${STATIC}block/`);
    await wait(page, 2.5);
    return async (p) => {
      await p.click("#q");
      await p.keyboard.type("310127", { delay: 120 });
      await wait(p, 0.6);
      await p.keyboard.press("Enter");
      await wait(p, 4);
      await scrollBy(p, 700, 10);
      await wait(p, 1);
      await p.click("#blow").catch(() => {});
      await wait(p, 3);
      await scrollBy(p, 1300, 16);
      await wait(p, 1);
      await p.click("#wishNote").catch(() => {});
      await p.keyboard.type("Happy 99th, Blk 127. Still the best char kway teow downstairs.", { delay: 30 });
      await p.click("form.wish button[type=submit]").catch(() => {});
      await wait(p, 2);
      await scrollBy(p, 600, 8);
      await wait(p, 2);
    };
  },

  // ---- Time Capsule Radio: the dial from the 78s to the sealed songs (live bands are muted in the edit) ----
  "r-dial": async (page) => {
    await page.goto(`${SITE}radio/`);
    await wait(page, 3);
    return async (p) => {
      await wait(p, 1);
      await p.click("#power");
      await wait(p, 1);
      await p.focus("#dial");
      await p.keyboard.press("Home");
      await wait(p, 5);
      for (let i = 0; i < 3; i++) {
        await p.keyboard.press("PageDown");
        await wait(p, 3.2);
      }
      for (let i = 0; i < 40; i++) {
        await p.keyboard.press("ArrowRight", { delay: 10 });
        await wait(p, 0.06);
      }
      await wait(p, 3);
      await p.keyboard.press("End");
      await wait(p, 3);
      await p.click("label:has(#travel)").catch(() => p.click("#travel"));
      await wait(p, 4);
    };
  },
  "r-seal": async (page) => {
    await page.goto(`${STATIC}radio/`);
    await wait(page, 3);
    return async (p) => {
      await p.click("#sealOpen");
      await wait(p, 1);
      await p.click("#sealSearch");
      await p.keyboard.type("Kit Chan Home", { delay: 90 });
      await wait(p, 2.5);
      await p.click("#sealResults button, #sealResults li").catch(() => {});
      await wait(p, 1);
      await p.click("#sealNote");
      await p.keyboard.type("For whoever opens this in 2065: we sang this at every National Day.", { delay: 28 });
      await p.click("#sealYears label:last-child").catch(() => {});
      await wait(p, 0.6);
      await p.click("#sealName").catch(() => {});
      await p.keyboard.type("sidcode", { delay: 60 });
      await p.click("#sealGo");
      await wait(p, 4);
    };
  },

  // ---- Musication: one tune in many tunings ----
  musication: async (page) => {
    await page.goto(`${SITE}musication/`);
    await wait(page, 2.5);
    return async (p) => {
      await wait(p, 1.5);
      await scrollBy(p, 900, 12);
      await wait(p, 2);
    };
  },
};

const names = process.argv.slice(2);
const todo = names.includes("all") ? Object.keys(SCENES) : names;
if (!todo.length) {
  console.log(`Scenes: ${Object.keys(SCENES).join(", ")}`);
  process.exit(0);
}
await mkdir(OUT, { recursive: true });
const { browser, context } = await launch();
for (const name of todo) {
  const scene = SCENES[name];
  if (!scene) {
    console.log(`${name}: no such scene`);
    continue;
  }
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`  [${name}] page error: ${String(e).slice(0, 160)}`));
  try {
    const script = await scene(page);
    const r = await record(page, `${OUT}${name}.mp4`, script);
    console.log(`${name}: ${r.seconds.toFixed(1)} s, ${r.fps.toFixed(1)} fps`);
  } catch (e) {
    console.log(`${name}: FAILED ${String(e).slice(0, 300)}`);
  }
  await page.close();
}
await browser.close();
