import { encode } from "uqr";
import { BASES, check, compile, defaultState, describe } from "../kopi/compiler.js";
import { Sfx } from "./audio.js";
import { RENAMED_STOPS, stopById, shuffledQuiz, STOPS, eraOfYear } from "./campaign.js";
import { chefById, CHEFS, REGULAR_TYPES } from "./chefs.js";
import { communitiesOf, componentLabel, DISHES, HERITAGE, INGREDIENTS, partsOf, variantLabel } from "./dishes.js";
import { COST_SOURCES, HAWKERNOMICS, HELPER_HOURLY, wageFor } from "./economy.js";
import { ERAS, eraById, money, PRICE_SOURCE } from "./eras.js";
import { NAMES, ROLES, rolesFor, walkTo } from "./helpers.js";
import { Controls, haptic, mountTouch } from "./input.js";
import { LEVELS, levelById, parseLevel } from "./levels.js";
import { CHEF_COLORS } from "./models.js";
import { cleanCode, lanGuest, lanHost, p2pGuest, p2pHost } from "./net.js";
import { addMemory, anyMemory, loadMemories, memoriesFor } from "./memories.js";
import { avatar, centreByName, CENTRES, nearestCentres, renderPassport, stopPlace } from "./passport.js";
import { CHEF_PERSONA, DIALECT_LINES, GLOSSARY, LANGS, lineText, LINES, MODIFIERS, PERSONAS, phraseFor, REGULAR_PERSONA, speakableLines, VOICE_TAGS, YOUNG } from "./phrases.js";
import { loadManifest, routeFor, say, sayNow, setVoiceMute, setVoiceVolume, voiceCredits, voiceListeners, voiceReport } from "./voices.js";
import { bank, canRecord, deleteClip, loadBank, MAX_MS, saveClip, startRecording } from "./voicebank.js";
import { KitchenView } from "./render.js";
import { load as loadCentre, runSession as runCentreSession, SAVE_KEY as CENTRE_KEY, SESSIONS as CENTRE_SESSIONS, stallTitle } from "./centre.js";
import { mountCentre } from "./centreui.js";
import { ARCHETYPES, presetFor, TIMES } from "./centrelook.js";
import { centresFamousFor, famousIn, profileByKey, profileFor } from "./profiles.js";
import { factFor, factsAboutDish } from "./archive.js";
import { guidesFor, stationsForOrder, stationsForPart } from "./guide.js";
import { HINT_LEVELS, HINT_NAMES, STATION_NAMES, Tags } from "./hints.js";
import { iconOf, iconSvg, stepsOf } from "./icons.js";
import { cleanInput, createSim, drainEvents, packDrink, snapshot, step, targetOf, unpackDrink } from "./sim.js";
import { soundtrack } from "./soundtrack.js";
import { createWalkMode } from "./walkui.js";
import { loadLoops, loopFigure } from "./loops.js";
import { hdbReady, loadHdb } from "./hdb.js";
import { realism, setRealism } from "./realism.js";
import { peopleSetting, setPeople } from "./humans.js";
import { creditLine, manifest, mediaUrl, preloadPhotos } from "./media.js";
import { videoButton, videoOpen } from "./videomodal.js";
import { appOf } from "./delivery.js";

const $ = (id) => document.getElementById(id);

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "style") el.style.cssText = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kids.filter((k) => k != null && k !== false));
  return el;
}

const store = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

const cleanName = (s) =>
  String(s ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .trim()
    .slice(0, 14) || "Chef";

const TICK = 1 / 60;
const NET_RATE = 1 / 20;
const touchy = matchMedia("(pointer: coarse)").matches || (navigator.maxTouchPoints > 0 && matchMedia("(hover: none)").matches);
const secure = window.isSecureContext === true;
const UNLOCK = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25]; // total stars needed for each stall

// Cartoon, Soft or Real, and Classic or Lifelike people, remembered, and set before anything is built.
setRealism(store.get("makan-look", "toon"));
setPeople(store.get("makan-people", "auto"));
const view = new KitchenView($("stage"));
window.__view = view; // for checking the scene from the console
const tags = new Tags($("tags"), view);
const controls = new Controls();
const sfx = new Sfx();
let session = null;
let lan = null; // what the server says about LAN play, or null on a static site
const settings = {
  level: store.get("makan-level", LEVELS[0].id),
  era: store.get("makan-era", "today"),
  hires: store.get("makan-hires", []),
  chefs: store.get("makan-chefs", ["meiling", "siti", "arun", "harpreet"]),
};
settings.chefs = [0, 1, 2, 3].map((i) => (chefById(settings.chefs?.[i]) ? settings.chefs[i] : CHEFS[i].id));
const passport = () => {
  const p = store.get("makan-passport", {});
  const stamps = p.stamps && typeof p.stamps === "object" ? { ...p.stamps } : {};
  // Stamps from stops that moved to new places carry over.
  for (const [from, to] of Object.entries(RENAMED_STOPS)) {
    if (stamps[from] && !stamps[to]) stamps[to] = stamps[from];
    delete stamps[from];
  }
  return { stamps, passOn: p.passOn ?? null };
};
const savePassport = (p) => store.set("makan-passport", p);
let campaign = null; // { stop } while playing a passport stop
let place = null; // { name, era } shown in the HUD
if (!LEVELS.some((l) => l.id === settings.level)) settings.level = LEVELS[0].id;

// ---------- Panels and layout ----------

const PANELS = ["home", "setup", "join", "results", "book", "paused", "passport", "voices", "centre", "walk", "walkDone"];
let current = "home";
function show(id) {
  current = id;
  $("menu").hidden = !id;
  for (const p of PANELS) $(p).hidden = p !== id;
  $("hud").hidden = Boolean(id) && id !== "paused";
  $("touch").hidden = Boolean(id) || !touchy;
  $("kopi").hidden = true;
  controls.enabled = !id;
  if (id) controls.release();
  soundtrack.duck(Boolean(id));
  layout();
}

// Leave room for the tickets at the top and, on touch screens, for thumbs.
function layout() {
  const w = innerWidth;
  const hh = innerHeight;
  const measured = $("hud").hidden ? 0 : $("tickets").offsetHeight + 12;
  const ticketH = Math.min(hh * 0.42, Math.max(w < 640 ? 84 : 118, measured));
  let insets = { top: ticketH, bottom: 34, left: 0, right: 0 };
  if (touchy && !$("touch").hidden) {
    const two = $("touch").dataset.mode === "two";
    if (w > hh && two) insets = { top: ticketH, bottom: Math.min(230, hh * 0.28), left: Math.min(150, w * 0.13), right: Math.min(150, w * 0.13) };
    else if (w > hh) insets = { top: ticketH - 20, bottom: 0, left: Math.min(170, w * 0.2), right: Math.min(190, w * 0.22) };
    // Portrait: the thumbs take about 200px at the bottom, and the holding line sits just above them.
    else insets = { top: ticketH, bottom: two ? Math.min(260, hh * 0.3) : Math.min(256, hh * 0.4), left: 0, right: 0 };
  }
  view.setInsets(insets);
  const kb = view.kitchenBottom();
  if (kb) document.documentElement.style.setProperty("--kb", `${Math.round(kb)}px`);
}

function myName() {
  const typed = (!$("join").hidden ? $("joinName").value : $("nameInput").value).trim() || $("nameInput").value.trim();
  if (typed) {
    store.set("makan-name", cleanName(typed));
    $("nameInput").value = $("joinName").value = cleanName(typed);
  }
  // No name typed: the chef's own name will do.
  return cleanName(typed || chefById(settings.chefs[0])?.name || $("nameInput").placeholder);
}

// ---------- Stars, and stalls that open with them ----------

function bestStars() {
  return store.get("makan-best", {});
}
function starsFor(levelId) {
  const b = bestStars()[levelId];
  if (typeof b === "number") return b;
  return b ? Math.max(0, ...Object.values(b)) : 0;
}
const totalStars = () => LEVELS.reduce((n, l) => n + starsFor(l.id), 0);
const allOpen = () => store.get("makan-open", false);
const unlocked = (i) => allOpen() || totalStars() >= UNLOCK[i];

// A link to a famous centre (?at=lau-pa-sat) opens on the stall that sells what it is known for,
// the same way cooking there from the Passport map does.
{
  const at = profileByKey(new URLSearchParams(location.search).get("at") ?? "");
  const famous = famousIn(at).map((f) => f.id);
  const best = LEVELS.map((l) => [l.dishes.filter((d) => famous.includes(d)).length, l.id]).sort((a, b) => b[0] - a[0])[0];
  if (at && best?.[0] > 0) settings.level = best[1];
}

// ---------- Setup: when, which stall, who to hire ----------

function partsInMenu(level) {
  return level.dishes.flatMap((d) => Object.values(DISHES[d].variants).flatMap((v) => v.parts));
}

function renderEras() {
  $("eras").replaceChildren(
    ...ERAS.map((e) =>
      h(
        "label",
        { class: `era era--${e.id}` },
        h("input", {
          type: "radio",
          name: "era",
          value: e.id,
          checked: e.id === settings.era,
          onchange: () => {
            settings.era = e.id;
            store.set("makan-era", e.id);
            renderEraCard();
            renderHires();
            renderLevels();
            preview();
            if (setupMode === "host") host.lobby();
          },
        }),
        h("span", { class: "era__years", text: e.years }),
        h("strong", { text: e.name }),
        h("span", { class: "era__line", text: e.setting }),
      ),
    ),
  );
  renderEraCard();
}

function renderEraCard() {
  const e = eraById(settings.era);
  $("eraCard").replaceChildren(
    h("ul", {}, ...e.card.map((t) => h("li", { text: t }))),
    h("p", { class: "eracard__twist" }, h("strong", { text: "In the kitchen: " }), e.twist),
    h("p", { class: "eracard__price", text: `Prices: ${e.priceNote}. Chicken rice costs ${money(DISHES.chickenrice.price * e.price)} here.` }),
    h("p", { class: "eracard__src" }, ...[...e.sources, PRICE_SOURCE].map(([t, href]) => h("a", { href, target: "_blank", rel: "noopener", text: t }))),
  );
}

function renderLevels() {
  $("levels").replaceChildren(
    ...LEVELS.map((l, i) => {
      const open = unlocked(i);
      const stars = starsFor(l.id);
      return h(
        "label",
        { class: `level${open ? "" : " is-locked"}`, style: `--accent:${l.accent}` },
        h("input", {
          type: "radio",
          name: "level",
          value: l.id,
          checked: l.id === settings.level,
          disabled: !open,
          onchange: () => {
            settings.level = l.id;
            store.set("makan-level", l.id);
            settings.hires = settings.hires.filter((r) => rolesFor(parseLevel(l), l, partsInMenu(l)).includes(r));
            renderHires();
            preview();
            if (setupMode === "host") host.lobby();
          },
        }),
        h("span", { text: l.place }),
        h("strong", { text: l.name }),
        h("p", { text: l.blurb }),
        h("ul", { class: "level__menu", "aria-label": "Menu" }, ...l.dishes.map((d) => h("li", {}, h("span", { text: DISHES[d].name }), h("span", { text: money(DISHES[d].price * eraById(settings.era).price) })))),
        open ? h("p", { class: "best", text: "★".repeat(stars) + "☆".repeat(3 - stars) }) : h("p", { class: "lock", text: `Needs ${UNLOCK[i]} stars` }),
      );
    }),
  );
  const locked = LEVELS.some((_, i) => !unlocked(i));
  $("unlockNote").replaceChildren(
    locked ? `Earn stars to open more stalls. You have ${totalStars()}. ` : "",
    locked
      ? h("button", {
          class: "link link--inline",
          type: "button",
          text: "Open every stall (for demos)",
          onclick: () => {
            store.set("makan-open", true);
            renderLevels();
          },
        })
      : "",
  );
}

function renderHires() {
  const level = levelById(settings.level);
  const era = eraById(settings.era);
  const roles = rolesFor(parseLevel(level), level, partsInMenu(level));
  settings.hires = settings.hires.filter((r) => roles.includes(r)).slice(0, 3);
  $("hires").replaceChildren(
    ...roles.map((id) => {
      const r = ROLES[id];
      const on = settings.hires.includes(id);
      return h(
        "button",
        {
          class: `hire${on ? " is-on" : ""}`,
          type: "button",
          "aria-pressed": String(on),
          style: `--c:${r.color}`,
          onclick: () => {
            if (on) settings.hires = settings.hires.filter((x) => x !== id);
            else if (settings.hires.length < 3) settings.hires.push(id);
            else quipMenu("Three helpers is plenty for one stall.");
            store.set("makan-hires", settings.hires);
            renderHires();
            if (setupMode === "host") host.lobby();
          },
        },
        h("i", { "aria-hidden": "true" }),
        h("strong", { text: r.name }),
        h("span", { text: r.job }),
      );
    }),
  );
  const wage = wageFor(era);
  $("hireNote").replaceChildren(
    `Each helper costs ${money(wage)} an hour here. That is the part-time food stall assistant rate under the Food Services Progressive Wage Model from 1 July 2026 ($${HELPER_HOURLY}), scaled to the era. `,
    "The money side is inspired by ",
    h("a", { href: HAWKERNOMICS[1], target: "_blank", rel: "noopener", text: "Hawkernomics" }),
    ", from Hack for Public Good 2025.",
  );
}

function renderLocalPick() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean).length : 0;
  $("locals3").hidden = touchy ? true : pads < 3;
  $("locals4").hidden = touchy ? true : pads < 4;
  const labels = document.querySelectorAll("input[name=locals] + span");
  labels[1].textContent = touchy ? "2 on this tablet" : "2 chefs";
  const n = localCount();
  $("localNote").textContent = touchy
    ? n === 2
      ? "Each of you gets a stick and buttons on your own side of the screen."
      : "Stick on the left, Grab, Chop, Dash and Throw on the right."
    : n === 1
      ? "Move: WASD or arrows. Grab: E. Chop or wash: hold Space. Dash: Shift. Throw: F. Gamepads work too."
      : n === 2
        ? "Chef 1: WASD, E grab, Q chop, left Shift dash, F throw. Chef 2: arrows, / grab, . chop, right Shift dash, comma throw."
        : `Chefs ${n >= 3 ? "3" : ""}${n === 4 ? " and 4" : ""} play on gamepads: stick, A grab, X chop, B throw, RB dash.`;
  renderChefPickers();
}

const localCount = () => Number(document.querySelector("input[name=locals]:checked")?.value ?? 1);

// One row of chef portraits per player on this device.
function chefRow(label, current, onPick, color) {
  const chef = chefById(current) ?? CHEFS[0];
  return h(
    "div",
    { class: "picker", style: color ? `--c:${color}` : "" },
    h("p", { class: "picker__label" }, label ? h("strong", { text: `${label}: ` }) : null, `${chef.name}, ${chef.community}. `, h("span", { text: chef.bio })),
    h(
      "div",
      { class: "picker__row", role: "radiogroup", "aria-label": label || "Chef" },
      ...CHEFS.map((c) =>
        h(
          "button",
          { type: "button", class: `chef${c.id === current ? " is-on" : ""}`, role: "radio", "aria-checked": String(c.id === current), "aria-label": c.name, title: c.name, onclick: () => onPick(c.id) },
          avatar(c.look, 46),
          h("span", { text: c.name.replace(/^(Auntie|Uncle) /, "") }),
        ),
      ),
    ),
  );
}

function renderChefPickers() {
  const n = localCount();
  $("chefPickers").replaceChildren(
    ...Array.from({ length: n }, (_, i) =>
      chefRow(n > 1 ? `Chef ${i + 1}` : "", settings.chefs[i], (id) => {
        settings.chefs[i] = id;
        store.set("makan-chefs", settings.chefs);
        renderChefPickers();
        if (setupMode === "host") host.lobby();
      }, CHEF_COLORS[i]),
    ),
  );
}

function renderJoinPicker() {
  $("joinPicker").replaceChildren(
    chefRow("", settings.chefs[0], (id) => {
      settings.chefs[0] = id;
      store.set("makan-chefs", settings.chefs);
      renderJoinPicker();
    }),
  );
}

let menuQuipTimer = 0;
function quipMenu(text) {
  $("hireNote").dataset.flash = text;
  clearTimeout(menuQuipTimer);
  menuQuipTimer = setTimeout(() => delete $("hireNote").dataset.flash, 1800);
}

// ---------- Recipe book ----------

function unlockDish(dish) {
  const book = store.get("makan-book", {});
  const first = !book[dish];
  book[dish] = (book[dish] ?? 0) + 1;
  store.set("makan-book", book);
  return first;
}

// A fact from the archives, with its sources as links.
function factNode(f, cls = "archive-note") {
  if (!f) return null;
  return h("p", { class: cls }, h("strong", { text: `${f.when}. ` }), f.text, " ", ...f.sources.slice(0, 2).flatMap(([t, href], i) => [i ? " · " : "", h("a", { href, target: "_blank", rel: "noopener", text: t })]));
}

// A tip from the archives as a round starts, picked for the era, the dishes and the centre.
let tipTimer = 0;
function showTip(ctx) {
  const el = $("tip");
  clearTimeout(tipTimer);
  const f = tutorial.on ? null : factFor(ctx, Math.floor(Math.random() * 1000));
  el.hidden = !f;
  if (!f) return;
  el.replaceChildren(h("strong", { text: "From the archives" }), `${f.when}. ${f.text} `, ...f.sources.slice(0, 1).map(([t, href]) => h("a", { href, target: "_blank", rel: "noopener", text: t })));
  tipTimer = setTimeout(() => (el.hidden = true), 9000);
}
// Tap a tip to put it away early.
$("tip").addEventListener("click", (e) => {
  if (!e.target.closest("a")) $("tip").hidden = true;
});

// Where a dish is famous, from the centre profiles, each with its source.
function famousBlock(dishId) {
  const list = centresFamousFor(dishId);
  if (!list.length) return null;
  return h(
    "div",
    { class: "famous" },
    h("p", {}, h("strong", { text: "Famous at " }), list.map((f) => f.centre).join(", ")),
    ...list.slice(0, 3).map((f) => h("p", {}, `${f.centre}: ${f.note} `, h("a", { href: f.src[1], target: "_blank", rel: "noopener", text: f.src[0] }))),
  );
}

// Photos, prices then and now, and cooking videos for the recipe book, from apps/hawker/media.
let bookMedia = null;
async function loadBookMedia() {
  if (bookMedia) return bookMedia;
  const [dishes, videos, menus, loops] = await Promise.all([manifest("dishes"), manifest("videos"), manifest("menus"), loadLoops()]);
  bookMedia = { dishes: dishes?.dishes ?? {}, videos: videos?.videos ?? [], stalls: menus?.stalls ?? [], eraPrices: menus?.eraPrices ?? [], loops };
  return bookMedia;
}

const cents = (p) => (p < 1 ? `${Math.round(p * 100)} cents` : `$${p.toFixed(2).replace(/\.00$/, "")}`);

function dishMedia(id, locked) {
  const m = bookMedia;
  if (!m) return [];
  const ph = m.dishes[id];
  const photo = ph ? h("figure", { class: `dish__photo${locked ? " is-locked" : ""}` }, h("img", { src: mediaUrl(`dishes/${ph.file}`), alt: locked ? "" : ph.caption ?? "", loading: "lazy", width: 480, height: 480 }), locked ? null : h("figcaption", {}, h("a", { href: ph.page, target: "_blank", rel: "noopener", text: `Photo: ${creditLine(ph)}` }))) : null;
  if (locked) return [photo];
  // What it cost: the oldest and newest sourced prices, and a real stall today.
  const then = m.eraPrices.filter((e) => e.dish === id).sort((a, b) => a.year - b.year);
  const picks = then.length > 2 ? [then[0], then[then.length - 1]] : then;
  const stall = m.stalls.flatMap((st) => st.items.filter((it) => it.dish === id).map((it) => ({ st, it }))).sort((a, b) => String(b.st.date).localeCompare(String(a.st.date)))[0];
  const prices = picks.length || stall
    ? h(
        "div",
        { class: "prices" },
        h("p", { class: "prices__title", text: "What it cost" }),
        ...picks.map((e) => h("p", {}, h("strong", { text: `${cents(e.price)}` }), ` ${e.item.replace(/\.$/, "")}${e.year && !String(e.item).includes(String(e.year)) ? `, ${e.year}` : ""}. `, h("a", { href: e.source[1], target: "_blank", rel: "noopener", text: e.source[0] }))),
        stall ? h("p", {}, h("strong", { text: stall.it.prices.map(cents).join(" / ") }), ` ${stall.it.name} at ${stall.st.stall}, ${stall.st.centre}${stall.st.date ? ` (${stall.st.date.slice(0, 7)})` : ""}. `, h("a", { href: stall.st.source[1], target: "_blank", rel: "noopener", text: stall.st.source[0] })) : null,
      )
    : null;
  const vids = m.videos.filter((v) => v.dishes?.includes(id)).slice(0, 2);
  return [photo, prices, vids.length ? h("div", { class: "dish__vids" }, ...vids.map((v) => videoButton(v, v.shows ?? v.title))) : null];
}

function renderBook() {
  const book = store.get("makan-book", {});
  $("heritage").replaceChildren(
    h("strong", { text: `${HERITAGE.title}. ` }),
    HERITAGE.text,
    h("br"),
    ...HERITAGE.sources.map(([t, href]) => h("a", { href, target: "_blank", rel: "noopener", text: t })),
  );
  renderGlossary();
  // Where the loops come from, once they have loaded and any card shows one.
  const looped = Object.keys(bookMedia?.loops ?? {}).filter((id) => book[id]).length;
  $("bookLoops").hidden = !looped;
  $("bookLoops").textContent = looped
    ? `${looped} of your pages show the work behind the dish, looping. They are free footage, credited on each, filmed at Singapore stalls where free footage exists and elsewhere in Southeast and South Asia where it does not; each says where when its maker does. Tap one to pause it.`
    : "";
  $("bookCards").replaceChildren(
    ...Object.entries(DISHES).map(([id, d]) => {
      if (!book[id]) {
        return h("article", { class: "dish is-locked" }, ...dishMedia(id, true), h("h3", { text: d.name }), d.native !== d.name && h("p", { class: "native", text: d.native }), h("p", { text: "Serve one to open its page." }));
      }
      const variants = Object.values(d.variants);
      return h(
        "article",
        { class: "dish" },
        ...dishMedia(id, false).slice(0, 1),
        h("h3", { text: d.name }),
        h("p", { class: "native", text: d.native !== d.name ? `${d.native} · served ${book[id]}` : `Served ${book[id]}` }),
        h("span", { class: "who", text: d.community }),
        h("dl", {}, h("dt", { text: "Then" }), h("dd", { text: d.past }), h("dt", { text: "Now" }), h("dd", { text: d.present }), h("dt", { text: "Later" }), h("dd", { text: d.future })),
        // The gesture behind the dish, looping, where there is free footage of it.
        loopFigure(h, bookMedia?.loops?.[id]),
        h("div", { class: "how" }, ...variants.map((v) => h("p", {}, v.label ? h("strong", { text: `${v.label}: ` }) : null, v.how))),
        h("p", { class: "src" }, ...d.sources.map(([t, href]) => h("a", { href, target: "_blank", rel: "noopener", text: t }))),
        famousBlock(id),
        ...dishMedia(id, false).slice(1),
        ...factsAboutDish(id).slice(0, 2).map((f) => factNode(f)),
        memoriesFor(id).length
          ? h(
              "div",
              { class: "memories" },
              h("p", { class: "memories__title", text: "From the archive" }),
              ...memoriesFor(id)
                .slice(-3)
                .reverse()
                .map((m) => h("blockquote", {}, `“${m.text}”`, h("cite", { text: m.name ? ` ${m.name}, ${m.at}` : ` ${m.at}` }))),
            )
          : null,
      );
    }),
  );
}

let bookReturn = "home";
function openBook(from) {
  bookReturn = from;
  renderBook();
  show("book");
  if (!bookMedia) loadBookMedia().then(() => current === "book" && renderBook());
}

// ---------- Words for things ----------


function itemName(it) {
  if (!it) return "";
  if (it.k === "plate") return it.d ? "Dirty plate" : it.c.length ? `Plate: ${it.c.map(itemName).join(" + ")}` : "Clean plate";
  if (it.k === "box") {
    const word = (session?.era?.boxLabel ?? "Takeaway box").toLowerCase().replace(/^./, (c) => c.toUpperCase());
    return it.c.length ? `${word}: ${it.c.map(itemName).join(" + ")}` : `Empty ${word.toLowerCase()}`;
  }
  if (it.k === "drink") return compile(unpackDrink(it.dk) ?? defaultState()) || "A drink";
  if (it.k === "ext") return session?.era?.id === "1950s" ? "Wet towel" : "Fire extinguisher";
  if (it.b) return "Burnt food";
  return componentLabel(`${it.k}|${it.s ?? ""}`);
}

function stationLine(st, s) {
  let name = st.type === "crate" ? `${INGREDIENTS[st.ing]?.name ?? st.ing} crate` : STATION_NAMES[st.type] ?? st.type;
  if (st.type === "cooker" && session?.era?.id === "1950s") name = "Steamer";
  const bits = [];
  if (s?.fi) bits.push("ON FIRE");
  if (s?.in) bits.push(s.in.map((k) => INGREDIENTS[k]?.name ?? k).join(" + "));
  if (s?.ck !== undefined) bits.push("cooking");
  if (s?.se !== undefined) bits.push("waiting for one more thing");
  if (s?.out) bits.push(`ready: ${itemName(s.out)}`);
  if (s?.it) bits.push(itemName(s.it));
  if (s?.bw) bits.push("pulling a drink");
  if (st.type === "rack" || st.type === "return" || st.type === "sink") bits.push(`${s?.n ?? 0} plates`);
  return bits.length ? `${name} (${bits.join(", ")})` : name;
}

// ---------- HUD ----------

const ticketEls = new Map();

function ticketFor(id, d, v, dk, era, md = "plain", lg = "en", rd = -1) {
  const app = appOf(rd);
  const dish = DISHES[d];
  const parts = [...partsOf(d, v)];
  if (md === "extrachilli") parts.push("chilli|");
  const phrase = phraseFor(md, lg);
  const who = customerOf(id);
  const canSpeak = routeFor(`order.${md}.${lg}`, who.persona, id) !== "text";
  const vl = variantLabel(d, v);
  const drink = dk ? unpackDrink(dk) : null;
  const code = drink ? compile(drink) : "";
  const no = String(id).padStart(3, "0");
  return h(
    "li",
    { class: `ticket${drink ? " ticket--drink" : ""}${md !== "plain" ? " ticket--mod" : ""}${app ? " ticket--rider" : ""}`, style: app ? `--rider: ${app.colour}` : null },
    h("div", { class: "ticket__no", text: era === "today" ? `QUEUE ${no}` : `ORDER ${no}` }),
    // An app order: the rider waits at the hatch, so there is nobody to hear.
    app ? h("p", { class: "ticket__rider" }, h("strong", { text: app.name }), " rider waiting at the hatch") : null,
    d !== "drink" && !app
      ? h(
          "button",
          {
            type: "button",
            class: "ticket__say",
            "aria-label": canSpeak ? `Hear it in ${LANGS[lg]?.name}` : `${LANGS[lg]?.name}: ${phrase.mean}`,
            onclick: () => sayNow(`order.${md}.${lg}`, { persona: who.persona, seed: id }),
            disabled: !canSpeak,
          },
          h("span", { class: "ticket__lang", text: LANGS[lg]?.name ?? "" }),
          h("span", { class: "ticket__phrase", text: phrase.say }),
          phrase.roman ? h("span", { class: "ticket__roman", text: phrase.roman }) : null,
          // English lines already say what they mean, so only translate the others.
          phrase.mean !== phrase.say ? h("span", { class: "ticket__mean", text: phrase.mean }) : null,
        )
      : null,
    md !== "plain"
      ? h(
          "p",
          { class: "ticket__mod" },
          h("strong", { text: MODIFIERS[md].label }),
          h("span", { class: "ticket__needs", text: md === "takeaway" ? `: use a ${(eraById(era).boxLabel ?? "takeaway box").toLowerCase()}, not a plate` : `: ${MODIFIERS[md].needs}` }),
        )
      : null,
    h("p", { class: "ticket__dish", text: d === "drink" ? "Drink" : dish.name }, vl ? h("span", { class: "ticket__variant", text: vl }) : null),
    parts.length
      ? h(
          "ul",
          { class: "ticket__parts" },
          ...parts.map((p) => {
            const li = h("li", { class: "ticket__part", tabindex: "0", title: "Show me where", "data-part": p }, h("span", { class: "ticket__icon" }), h("span", { text: componentLabel(p) }));
            li.firstChild.append(iconSvg(iconOf(p), { size: 18, steps: stepsOf(p) }));
            return li;
          }),
        )
      : null,
    drink ? h("p", { class: "ticket__code", text: code }) : null,
    drink && lan
      ? h("a", { class: "ticket__ask", href: `../kopi/#${encodeURIComponent(code.toLowerCase())}`, target: "_blank", rel: "noopener", title: "Ask the Kopi Compiler" }, "What does that mean?", h("span", { class: "ticket__more", text: " Ask the Kopi Compiler" }))
      : null,
    h("div", { class: "ticket__bar" }, h("i")),
  );
}

function renderHud(snap) {
  if (!snap) return;
  const m = Math.floor(snap.tm / 60);
  const s = Math.floor(snap.tm % 60);
  $("time").textContent = `${m}:${String(s).padStart(2, "0")}`;
  $("time").classList.toggle("is-low", snap.tm < 30);
  $("coins").textContent = money(snap.co + (snap.tp ?? 0));
  const mult = 1 + Math.min(4, snap.sk ?? 0) * 0.25;
  $("streak").hidden = !(snap.sk > 1);
  if ((snap.sk === 3 || snap.sk === 6) && snap.sk !== lastStreak) chefSays("streak");
  lastStreak = snap.sk ?? 0;
  $("streak").textContent = `Streak ${snap.sk} · bonus x${mult}`;

  const live = new Set();
  for (const [id, d, t, max, v, dk, md, lg, rd] of snap.o) {
    if (!DISHES[d]) continue;
    live.add(id);
    let el = ticketEls.get(id);
    if (!el) {
      el = ticketFor(id, d, v, dk, snap.er, MODIFIERS[md] ? md : "plain", LANGS[lg] ? lg : "en", Number.isInteger(rd) ? rd : -1);
      if (appOf(rd)) el.dataset.rider = "1";
      // On small screens tickets are compact; tap one to see everything on it.
      el.addEventListener("click", (e) => {
        if (e.target.closest(".ticket__say, a")) return;
        const part = e.target.closest(".ticket__part");
        // A tapped part pings its crate and stations. On compact tickets, the first tap opens the ticket.
        if (part && (el.classList.contains("is-open") || !compactTickets())) return pingPart(part.dataset.part, true);
        el.classList.toggle("is-open");
        ticketsMoved = true;
      });
      el.addEventListener("pointerover", (e) => {
        const part = e.target.closest(".ticket__part");
        if (part && e.pointerType === "mouse" && hints.level !== "off") pingPart(part.dataset.part);
      });
      el.addEventListener("keydown", (e) => {
        const part = e.target.closest(".ticket__part");
        if (part && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          pingPart(part.dataset.part, true);
        }
      });
      ticketEls.set(id, el);
      el.dataset.lg = LANGS[lg] ? lg : "en";
      $("tickets").append(el);
      ticketsMoved = true;
      if (d !== "drink" && !el.dataset.rider) customerOrders(id, MODIFIERS[md] ? md : "plain", el.dataset.lg);
    }
    const f = Math.max(0, t / max);
    el.dataset.f = String(f);
    if (f < 0.25 && !el.dataset.moaned && !el.dataset.rider) {
      el.dataset.moaned = "1";
      customerSays(id, "slow", el.dataset.lg);
    }
    const bar = el.querySelector(".ticket__bar i");
    bar.style.transform = `scaleX(${f})`;
    bar.style.setProperty("--bar", f > 0.5 ? "#5fbf6a" : f > 0.25 ? "#f2b632" : "#e0533a");
    el.classList.toggle("is-late", f < 0.2);
  }
  for (const [id, el] of ticketEls) {
    if (live.has(id) || el.classList.contains("is-out")) continue;
    el.classList.add("is-out");
    if (!el.dataset.rider) customerLeaves(id, el.dataset.lg ?? "en", Number(el.dataset.f ?? 0));
    setTimeout(() => {
      el.remove();
      ticketEls.delete(id);
      ticketsMoved = true;
    }, 360);
  }
  // Touch layouts put the status lines just under the tickets, so track how tall they are.
  if (ticketsMoved) {
    ticketsMoved = false;
    document.documentElement.style.setProperty("--tickets-h", `${$("tickets").offsetHeight}px`);
    layout();
  }
}
let ticketsMoved = true;
let lastStreak = 0;

// ---------- Voices: customers and chefs ----------

const hashOf = (n) => (((Number(n) || 0) * 2654435761) >>> 0) % 997;

// Each order comes from one of the regulars, with a consistent voice.
function customerOf(id) {
  const type = REGULAR_TYPES[hashOf(id) % REGULAR_TYPES.length];
  return { type, persona: REGULAR_PERSONA[type] ?? "youngwoman" };
}

// The stall's own chef, to know whether customers call out Uncle or Auntie.
function stallChef() {
  const slot = hints.slots[0] ?? 0;
  const row = (window.__makan?.snap?.c ?? []).find((c) => c[0] === slot);
  const id = row?.[10] ?? settings.chefs[0];
  return { id, persona: CHEF_PERSONA[id] ?? "youngwoman" };
}

function customerOrders(id, md, lg) {
  const who = customerOf(id);
  // Not every customer calls out first, or the stall gets noisy.
  if (hashOf(id + 1) % 2 === 0) {
    const female = PERSONAS[stallChef().persona]?.g === "f";
    const greet = LINES.hello[lg] ? "hello" : female ? "auntie" : "uncle";
    if (LINES[greet]?.[lg]) say(`react.${greet}.${lg}`, { persona: who.persona, seed: id });
  }
  say(`order.${md}.${lg}`, { persona: who.persona, seed: id });
}

function customerSays(id, line, lg) {
  const who = customerOf(id);
  if (!LINES[line]?.[lg]) return;
  // People who lend their voice in a dialect are heard now and then in place of the usual line.
  const dialects = DIALECT_LINES.includes(line) ? ["teochew", "hakka", "hainanese"].filter((t) => bank.clips.some((c) => c.key === `react.${line}.${t}`)) : [];
  const alt = dialects.length ? `react.${line}.${dialects[hashOf(id) % dialects.length]}` : null;
  say(`react.${line}.${lg}`, { persona: who.persona, seed: id, alt });
}

const outcomes = [];
function customerLeaves(id, lg, f) {
  const how = outcomes.shift() ?? "served";
  const who = customerOf(id);
  if (how === "gone") return customerSays(id, "gone", lg);
  if (f > 0.8 && lg === "en" && hashOf(id) % 3 === 0) return customerSays(id, "fast", lg);
  if (f > 0.55) return customerSays(id, lg === "en" && YOUNG.has(who.persona) ? "tastyyoung" : "tasty", lg);
  customerSays(id, "thanks", lg);
}

function chefSays(line) {
  const chef = stallChef();
  say(`chef.${line}.en`, { persona: chef.persona, seed: chef.id, urgent: line === "fire" });
}

// Spoken lines show up as a speech bubble by the hatch, so they work with the sound off too.
let sayTimer = 0;
voiceListeners.onSay = (line) => {
  const el = $("say");
  if (!session || !el) return;
  const lang = LANGS[line.lg]?.name ?? VOICE_TAGS[line.lg] ?? "";
  const via = line.via === "recorded" ? " · recorded by a player" : "";
  el.replaceChildren(h("span", { text: line.text }), h("cite", { text: [lang, line.roman, line.mean !== line.text ? line.mean : ""].filter(Boolean).join(" · ") + via }));
  el.classList.toggle("is-chef", line.key.startsWith("chef."));
  const pos = line.key.startsWith("chef.") ? view.chefHead(hints.slots[0] ?? 0) : view.hatchTop();
  if (pos) {
    el.style.left = `${Math.max(8, Math.min(innerWidth - 228, pos[0] - 110))}px`;
    el.style.top = `${Math.max(8, pos[1] - 64)}px`;
  }
  el.hidden = false;
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => (el.hidden = true), 2600);
};

function renderLines(snap, slots, targets) {
  const rows = slots.map((slot) => {
    const c = snap.c.find((r) => r[0] === slot);
    if (!c) return null;
    const t = targets.find((x) => x.slot === slot);
    const holding = c[5] ? itemName(c[5]) : "nothing";
    const facing = t ? stationLine(t, snap.s[t.i]) : "";
    const icon = c[5] ? iconOf(c[5], snap.er) : null;
    const next = hints.level === "guide" ? hints.guides.find((g) => g.slot === slot) : null;
    const key = `${holding}|${facing}|${next?.why ?? ""}|${slot}`;
    if (lineKeys.get(slot) === key) return lineEls.get(slot);
    const el = h(
      "p",
      { class: "lines__me", style: `--c:${CHEF_COLORS[slot % 4]}` },
      h("i"),
      icon ? iconSvg(icon, { size: 16 }) : null,
      `Holding: ${holding}`,
      facing ? ` · Facing: ${facing}` : "",
      next?.why ? h("span", { class: "lines__next", text: `Next: ${next.why}` }) : null,
    );
    lineKeys.set(slot, key);
    lineEls.set(slot, el);
    return el;
  });
  const els = rows.filter(Boolean);
  if (els.some((el, i) => $("holding").children[i] !== el) || $("holding").children.length !== els.length) $("holding").replaceChildren(...els);
}
const lineKeys = new Map();
const lineEls = new Map();

function clearHud() {
  $("tip").hidden = true;
  for (const el of ticketEls.values()) el.remove();
  ticketEls.clear();
  lineKeys.clear();
  outcomes.length = 0;
  lastStreak = 0;
  $("holding").replaceChildren();
  $("banner").classList.remove("is-shown");
}

let quipTimer = 0;
function quip(text) {
  const el = $("quip");
  el.textContent = text;
  el.classList.add("is-shown");
  clearTimeout(quipTimer);
  quipTimer = setTimeout(() => el.classList.remove("is-shown"), 1800);
}

let bannerTimer = 0;
function banner(text, ms = 2600) {
  const el = $("banner");
  el.textContent = text;
  el.classList.remove("is-shown");
  void el.offsetWidth;
  el.classList.add("is-shown");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove("is-shown"), ms);
}

function floater(x, z, text, cls = "") {
  const [sx, sy] = view.toScreen(x, 1.4, z);
  const el = h("span", { class: cls, text, style: `left:${sx - 30}px;top:${sy - 20}px` });
  $("floaters").append(el);
  setTimeout(() => el.remove(), 1000);
}

const NICE = ["Shiok!", "Steady lah!", "Power!", "Uncle approve.", "Fast and good."];
const CHAOS_TEXT = {
  trishaw: "A trishaw is taking a shortcut through the stall!",
  monsoon: "Monsoon! Mind the puddle, very slippery.",
  powercut: "Power cut! The rice cookers have stopped.",
  rush: "Lunch rush! The queue is getting long.",
  shuffle: "The smart counters are rearranging themselves.",
};

// Left to right across the screen, for where a kitchen sound comes from.
function panAt(x, z) {
  if (typeof x !== "number" || typeof z !== "number") return 0;
  try {
    const [sx] = view.toScreen(x, 1, z);
    return Math.max(-1, Math.min(1, (sx / Math.max(1, innerWidth)) * 2 - 1)) * 0.7;
  } catch {
    return 0;
  }
}

function react(evs, mySlots = []) {
  for (const [type, x, z, extra] of evs) {
    const pan = panAt(x, z);
    sfx.play(type, { pan });
    if (type === "serve") {
      outcomes.push("served");
      const [dish, value, tip, mult] = Array.isArray(extra) ? extra : [];
      floater(x, z, `+${money((Number(value) || 0) + (Number(tip) || 0))}`);
      sfx.play("cheer", { pan });
      haptic(30);
      if (mult > 1.6) floater(x + 0.6, z, `x${mult}`, "is-mult");
      if (DISHES[dish] && unlockDish(dish)) quip(`New in the recipe book: ${DISHES[dish].name}`);
      else quip(NICE[Math.floor(Math.random() * NICE.length)]);
    } else if (type === "wrong" && typeof extra === "string" && extra.startsWith("Uncle never")) {
      quip(extra.slice(0, 70));
      const oldest = [...ticketEls.entries()].find(([, el]) => !el.classList.contains("is-out"));
      if (oldest && oldest[1].dataset.lg === "en") customerSays(oldest[0], "wrong", "en");
    } else if (type === "nope" || type === "wrong") {
      if (typeof extra === "string") quip(extra.slice(0, 70));
    } else if (type === "burn") {
      chefSays("burnt");
      quip("Aiyo, burnt! Bin it before it catches fire.");
      haptic(60);
    } else if (type === "fire") {
      chefSays("fire");
      banner(session?.era?.id === "1950s" ? "Fire! Grab the wet towel and hold Chop on it." : "Fire! Grab the extinguisher and hold Chop on it.");
      haptic(80);
    } else if (type === "fizz") quip("Fire out. Phew.");
    else if (type === "expire") {
      quip("Customer walked off. Sian.");
      outcomes.push("gone");
    }
    else if (type === "order" && DISHES[extra]) quip(`One ${DISHES[extra].name}!`);
    else if (type === "lastorders") banner("Last orders!");
    else if (type === "chaos" && CHAOS_TEXT[extra]) banner(CHAOS_TEXT[extra], 3200);
    else if (type === "power") quip("Power is back.");
    else if (type === "urn" && mySlots.includes(extra)) openKopi(mySlots.indexOf(extra));
  }
  view.events(evs);
}

function keysHint(locals) {
  clearTimeout(keysHint.timer);
  if (touchy) {
    $("keysHint").textContent = innerHeight > innerWidth ? "Tip: turn the screen sideways for a bigger kitchen." : "";
    keysHint.timer = setTimeout(() => ($("keysHint").textContent = ""), 5000);
    return;
  }
  $("keysHint").textContent =
    locals >= 2 ? "P1: WASD · E grab · Q chop · Shift dash · F throw   P2: arrows · / grab · . chop · right Shift · comma" : "WASD or arrows · E grab · hold Space chop · Shift dash · F throw";
}

// ---------- Voices panel, glossary, lend your voice ----------

function renderGlossary() {
  const credits = voiceCredits();
  $("glossary").replaceChildren(
    h("summary", { text: "Words you will hear at the stall" }),
    h(
      "dl",
      { class: "glossary__list" },
      ...GLOSSARY.flatMap((g) => [
        h("dt", {}, h("strong", { text: g.word }), h("small", { text: ` ${g.lang}` })),
        h("dd", {}, g.mean, " ", h("a", { href: g.src, target: "_blank", rel: "noopener", text: "source" })),
      ]),
    ),
    credits.length ? h("p", { class: "glossary__credit", text: `Generated voices: ${credits.join("; ")}.` }) : null,
  );
}

let voicesReturn = "home";
function openVoices(from) {
  voicesReturn = from;
  renderVoices();
  show("voices");
}

function renderVoices() {
  const level = hints.map ? hints.level : defaultHints();
  for (const input of document.querySelectorAll("input[name=hints], input[name=hints2]")) input.checked = input.value === level;
  showGraphics();
  $("voiceList").replaceChildren(...voiceReport().map(([lang, status]) => h("li", {}, h("strong", { text: `${lang}: ` }), status)));
  const credits = voiceCredits();
  $("voiceCredit").textContent = credits.length ? `Generated clips: ${credits.join("; ")}.` : "";
  renderLend();
}

const lend = { tag: "en", key: "", blob: null, url: "", rec: null, status: "" };

function lendLines(tag) {
  if (LANGS[tag]) return speakableLines().filter((l) => l.lg === tag && !l.key.startsWith("chef."));
  const MEAN = { hello: "Calling the stall owner, the way you would", thanks: "Thank you", tasty: "Tasty!", slow: "So slow!" };
  return DIALECT_LINES.map((line) => ({ key: `react.${line}.${tag}`, lg: tag, text: "", mean: MEAN[line] }));
}

function renderLend() {
  const root = $("lend");
  const can = canRecord();
  const note = h(
    "p",
    { class: "lend__note" },
    "Record one line, up to five seconds, in your language or dialect. Customers then use your voice for that line. Saved: the recording, the line and language you pick, and the date. No name, no location. ",
    lan ? "On this server other players hear it too. " : "On this site it stays in this browser. ",
    "You can delete your clips any time.",
  );
  if (!can.ok) {
    root.replaceChildren(
      note,
      h("p", { class: "lend__off", text: can.why === "insecure" ? "Recording needs a secure page: open the game over https, or on localhost on this computer. Clips other people lent still play here." : "This browser cannot record audio. Clips other people lent still play here." }),
      myClips(),
    );
    return;
  }
  const lines = lendLines(lend.tag);
  if (!lines.some((l) => l.key === lend.key)) lend.key = lines[0]?.key ?? "";
  const line = lines.find((l) => l.key === lend.key);
  const tagSel = h("select", { id: "lendTag", "aria-label": "Language or dialect" }, ...Object.entries(VOICE_TAGS).map(([k, name]) => h("option", { value: k, text: name })));
  tagSel.value = lend.tag;
  tagSel.addEventListener("change", () => {
    lend.tag = tagSel.value;
    lend.key = "";
    clearTake();
    renderLend();
  });
  const lineSel = h("select", { id: "lendLine", "aria-label": "Line" }, ...lines.map((l) => h("option", { value: l.key, text: l.text ? `${l.text} (${l.mean})` : l.mean })));
  lineSel.value = lend.key;
  lineSel.addEventListener("change", () => {
    lend.key = lineSel.value;
    clearTake();
    renderLend();
  });
  const recBtn = h("button", { class: lend.rec ? "go is-rec" : "go", type: "button", id: "lendRec", text: lend.rec ? "Stop" : lend.blob ? "Record again" : "Record" });
  recBtn.addEventListener("click", () => (lend.rec ? lend.rec.stop() : record()));
  root.replaceChildren(
    note,
    h("div", { class: "lend__pick" }, h("label", { class: "name" }, h("span", { text: "Language" }), tagSel), h("label", { class: "name" }, h("span", { text: "Line" }), lineSel)),
    line
      ? h(
          "p",
          { class: "lend__line" },
          h("strong", { text: line.text || `Say "${line.mean}" in ${VOICE_TAGS[lend.tag]}` }),
          line.text ? h("small", { text: ` ${[lineText(line.key)?.roman, line.mean].filter(Boolean).join(" · ")}` }) : null,
        )
      : null,
    h("div", { class: "lend__row" }, recBtn, h("span", { class: "lend__meter" }, h("i", { id: "lendMeter" }))),
    lend.url ? h("div", { class: "lend__row" }, h("audio", { controls: true, src: lend.url }), h("button", { class: "go", type: "button", id: "lendSave", text: "Save it", onclick: saveTake }), h("button", { class: "ghost", type: "button", text: "Discard", onclick: () => (clearTake(), renderLend()) })) : null,
    h("p", { class: "status", id: "lendStatus", role: "status", text: lend.status }),
    myClips(),
  );
}

function clearTake() {
  if (lend.url) URL.revokeObjectURL(lend.url);
  lend.url = "";
  lend.blob = null;
  lend.status = "";
}

async function record() {
  clearTake();
  try {
    const rec = await startRecording((k) => {
      const m = $("lendMeter");
      if (m) m.style.transform = `scaleX(${k})`;
    });
    lend.rec = rec;
    renderLend();
    const blob = await rec.done;
    lend.rec = null;
    lend.blob = blob;
    lend.url = URL.createObjectURL(blob);
    lend.status = blob.size ? "Have a listen. Save it if you like it." : "Nothing was recorded. Try again?";
  } catch (e) {
    lend.rec = null;
    lend.status = e?.name === "NotAllowedError" ? "The microphone was not allowed. You can change that in the browser's site settings." : "Could not record. Is a microphone connected?";
  }
  renderLend();
}

async function saveTake() {
  if (!lend.blob) return;
  lend.status = "Saving...";
  renderLend();
  try {
    await saveClip(lend.blob, lend.key, lend.tag);
    clearTake();
    lend.status = "Saved. Thank you! Customers will use it.";
  } catch (e) {
    lend.status = e.message;
  }
  renderVoices();
}

function myClips() {
  const mine = bank.clips.filter((c) => c.mine);
  if (!mine.length) return h("p", { class: "lend__mine", text: "You have not lent any clips yet." });
  return h(
    "ul",
    { class: "lend__mine" },
    ...mine.map((c) => {
      const [, line, tag] = c.key.split(".");
      const known = speakableLines().find((l) => l.key === c.key);
      return h(
        "li",
        {},
        h("span", { text: `${VOICE_TAGS[tag] ?? tag}: ${known?.text || lendLines(tag).find((l) => l.key === c.key)?.mean || line} · ${c.at ?? ""}` }),
        h("button", { class: "link link--inline", type: "button", text: "Play", onclick: () => new Audio(c.url).play().catch(() => {}) }),
        h("button", {
          class: "link link--inline",
          type: "button",
          text: "Delete",
          onclick: async () => {
            try {
              await deleteClip(c.id);
              lend.status = "Deleted.";
            } catch (e) {
              lend.status = e.message;
            }
            renderVoices();
          },
        }),
      );
    }),
  );
}

$("voicesBtn").addEventListener("click", () => openVoices(current && current !== "voices" ? current : "home"));
$("pauseVoices").addEventListener("click", () => openVoices("paused"));
$("voicesBack").addEventListener("click", () => {
  lend.rec?.stop();
  show(voicesReturn);
});

// Voice volume and mute, separate from the music.
const voicePrefs = store.get("makan-voice", { vol: 80, mute: false });
function applyVoice() {
  setVoiceVolume((Number(voicePrefs.vol) || 0) / 100);
  setVoiceMute(Boolean(voicePrefs.mute));
  for (const id of ["voice", "voice2"]) $(id).value = String(voicePrefs.vol);
  for (const id of ["voiceMute", "voiceMute2"]) $(id).checked = Boolean(voicePrefs.mute);
}
for (const id of ["voice", "voice2"]) {
  $(id).addEventListener("input", (e) => {
    voicePrefs.vol = Number(e.target.value);
    store.set("makan-voice", voicePrefs);
    applyVoice();
  });
}
for (const id of ["voiceMute", "voiceMute2"]) {
  $(id).addEventListener("change", (e) => {
    voicePrefs.mute = e.target.checked;
    store.set("makan-voice", voicePrefs);
    applyVoice();
  });
}
applyVoice();

// ---------- Hints: labels, the guide, pings ----------

const hints = {
  chosen: HINT_LEVELS.includes(store.get("makan-hints", null)) ? store.get("makan-hints", null) : null,
  level: "labels",
  guides: [],
  acc: 0,
  map: null,
  era: null,
  slots: [],
};

// New players and the first passport stops get the full guide, unless they picked something else.
function defaultHints() {
  if (hints.chosen) return hints.chosen;
  const early = campaign && STOPS.indexOf(campaign.stop) < 2;
  const fresh = totalStars() === 0 && !Object.keys(passport().stamps).length;
  return early || fresh ? "guide" : "labels";
}

function setHints(level, { remember = true } = {}) {
  hints.level = HINT_LEVELS.includes(level) ? level : "labels";
  if (remember) {
    hints.chosen = hints.level;
    store.set("makan-hints", hints.level);
  }
  tags.show(Boolean(hints.map) && hints.level !== "off");
  if (hints.level !== "guide") {
    hints.guides = [];
    view.setHints({});
  }
  hints.acc = 1;
  lineKeys.clear();
  const btn = $("hintBtn");
  btn.dataset.level = hints.level;
  btn.querySelector(".hud__hint").textContent = HINT_NAMES[hints.level];
  btn.setAttribute("aria-label", `Hints: ${HINT_NAMES[hints.level]}. Press H to change.`);
  for (const input of document.querySelectorAll("input[name=hints], input[name=hints2]")) input.checked = input.value === hints.level;
}

function cycleHints() {
  setHints(HINT_LEVELS[(HINT_LEVELS.indexOf(hints.level) + 1) % HINT_LEVELS.length]);
  quip(`Hints: ${HINT_NAMES[hints.level]}`);
}

// Called when a kitchen opens, by hosts and guests alike.
function startHints(map, eraId, slots) {
  hints.map = map;
  hints.era = eraById(eraId);
  hints.slots = slots;
  hints.guides = [];
  tags.build(map, hints.era);
  setHints(defaultHints(), { remember: false });
}

// About ten times a second: the next step for each of your chefs, and what the oldest ticket needs.
function updateHints(snap, dt) {
  if (hints.level !== "guide" || !hints.map || !snap) return;
  hints.acc += dt;
  if (hints.acc < 0.1) return;
  hints.acc = 0;
  hints.guides = guidesFor(snap, hints.map, hints.slots, { era: snap.er });
  // The tutorial has its own marker and its own order of steps, so it leads until it ends.
  if (tutorial.on) hints.guides = hints.guides.filter((g) => g.slot !== hints.slots[0]);
  view.setHints({ pulse: stationsForOrder(hints.map, snap.o[0]), guides: hints.guides });
}

let lastPing = { part: "", at: 0 };
function pingPart(part, force = false) {
  if (!hints.map || !part) return;
  const now = performance.now();
  if (!force && lastPing.part === part && now - lastPing.at < 900) return;
  lastPing = { part, at: now };
  const where = stationsForPart(hints.map, part);
  view.ping(where);
  tags.ping(where);
  if (force) sfx.play("pick");
}

const compactTickets = () => matchMedia("(max-height: 480px), (pointer: coarse) and (orientation: portrait) and (max-height: 740px)").matches;

$("hintBtn").addEventListener("click", cycleHints);
for (const input of document.querySelectorAll("input[name=hints], input[name=hints2]")) input.addEventListener("change", () => setHints(input.value));

// Graphics: Auto picks a tier for the device and steps down if frames drag. A chosen tier stays.
const GFX_NAMES = ["Low", "Medium", "High"];
function setGraphics(choice, remember = true) {
  const auto = choice === "auto" || !["0", "1", "2"].includes(String(choice));
  if (remember) store.set("makan-gfx", auto ? "auto" : String(choice));
  view.setQuality(auto ? view.autoLevel : Number(choice), { auto });
  showGraphics();
}
function showGraphics() {
  const chosen = store.get("makan-gfx", "auto");
  for (const input of document.querySelectorAll("input[name=gfx], input[name=gfx2]")) input.checked = input.value === chosen;
  for (const id of ["gfxNow", "gfx2Now"]) $(id).textContent = `now ${GFX_NAMES[view.qualityLevel]}${view.fps ? `, ${view.fps} fps` : ""}`;
}
for (const input of document.querySelectorAll("input[name=gfx], input[name=gfx2]")) input.addEventListener("change", () => setGraphics(input.value));
setGraphics(store.get("makan-gfx", "auto"), false);
view.onQuality = () => showGraphics();
view.onRestore = () => walkMode.relook();

// How real it looks, for every mode: the kitchen redraws its materials and sky now, the customer mode too.
function setLook(id) {
  store.set("makan-look", setRealism(id));
  showLook();
  view.relook();
  walkMode?.relook();
}
function showLook() {
  for (const input of document.querySelectorAll("input[name=look], input[name=look2], input[name=walkLook2]")) input.checked = input.value === realism();
  for (const input of document.querySelectorAll("input[name=people], input[name=people2], input[name=walkPeople2]")) input.checked = input.value === peopleSetting();
}
// Classic or lifelike people, or whichever suits the look: every mode builds its people again.
function setPeopleChoice(id) {
  store.set("makan-people", setPeople(id));
  showLook();
  view.relook();
  walkMode?.relook();
}
for (const input of document.querySelectorAll("input[name=people], input[name=people2]")) input.addEventListener("change", () => setPeopleChoice(input.value));
for (const input of document.querySelectorAll("input[name=look], input[name=look2]")) input.addEventListener("change", () => setLook(input.value));
showLook();
addEventListener("keydown", (e) => {
  if ((e.key === "h" || e.key === "H") && session && !session.done && $("kopi").hidden && !e.target.closest?.("input, textarea, select")) cycleHints();
});

// ---------- The kopi builder ----------

const KOPI_ROWS = [
  { key: "base", label: "Drink", opts: Object.keys(BASES).map((k) => [k, BASES[k].name]) },
  { key: "milk", label: "Milk", opts: [["condensed", "Condensed"], ["evaporated", "Evaporated (C)"], ["none", "None (O)"]], when: (s) => BASES[s.base]?.milk },
  { key: "sugar", label: "Sugar", opts: [[0, "Kosong"], [1, "Siew dai"], [2, "Normal"], [3, "Ga dai"]] },
  { key: "strength", label: "Strength", opts: [["poh", "Poh"], ["normal", "Normal"], ["gao", "Gao"], ["dilo", "Di lo"]], when: (s) => BASES[s.base]?.strength },
  { key: "ice", label: "Hot or iced", opts: [[false, "Hot"], [true, "Peng"]], when: (s) => !s.dino },
];
const EXTRAS = [["halia", "Halia"], ["tarik", "Tarik"], ["dino", "Dinosaur"], ["bag", "Da bao"]];

const kopi = { state: null, player: 0 };
let brewSeq = 1;

function openKopi(localIndex) {
  if (!session || !$("kopi").hidden) return;
  kopi.player = localIndex;
  kopi.state = Object.assign(defaultState(), { base: "kopi" });
  controls.enabled = false;
  controls.release();
  $("kopi").hidden = false;
  $("kopiHelp").hidden = !lan;
  renderKopi();
  $("kopiRows").querySelector("button")?.focus();
}

function closeKopi() {
  $("kopi").hidden = true;
  controls.enabled = true;
}

function renderKopi() {
  const s = kopi.state;
  const can = BASES[s.base];
  const rows = KOPI_ROWS.filter((r) => !r.when || r.when(s)).map((r) =>
    h(
      "div",
      { class: "kopi__row", role: "group", "aria-label": r.label },
      h("span", { class: "kopi__label", text: r.label }),
      h(
        "div",
        { class: "kopi__opts" },
        ...r.opts.map(([value, text]) =>
          h("button", {
            type: "button",
            class: `chipbtn${s[r.key] === value ? " is-on" : ""}`,
            "aria-pressed": String(s[r.key] === value),
            text,
            onclick: () => {
              s[r.key] = value;
              if (r.key === "base") {
                const c = BASES[value];
                if (!c.milk) s.milk = "condensed";
                if (!c.strength) s.strength = "normal";
                for (const [k] of EXTRAS) if (k !== "bag" && !c.extras.includes(k)) s[k] = false;
              }
              renderKopi();
            },
          }),
        ),
      ),
    ),
  );
  const extras = EXTRAS.filter(([k]) => k === "bag" || can.extras.includes(k));
  rows.push(
    h(
      "div",
      { class: "kopi__row", role: "group", "aria-label": "Extras" },
      h("span", { class: "kopi__label", text: "Extras" }),
      h(
        "div",
        { class: "kopi__opts" },
        ...extras.map(([k, text]) =>
          h("button", {
            type: "button",
            class: `chipbtn${s[k] ? " is-on" : ""}`,
            "aria-pressed": String(Boolean(s[k])),
            text,
            onclick: () => {
              s[k] = !s[k];
              if (k === "dino" && s.dino) s.ice = true;
              renderKopi();
            },
          }),
        ),
      ),
    ),
  );
  const focused = document.activeElement?.textContent;
  $("kopiRows").replaceChildren(...rows);
  if (focused) [...$("kopiRows").querySelectorAll("button")].find((b) => b.textContent === focused)?.focus();
  $("kopiCode").textContent = compile(s);
  $("kopiDesc").textContent = describe(s);
  $("kopiWarn").textContent = check(s).join(" ");
}

$("kopiPull").addEventListener("click", () => {
  const problems = check(kopi.state);
  if (problems.length) {
    $("kopiWarn").textContent = problems.join(" ");
    sfx.play("nope");
    return;
  }
  const pl = controls.players[kopi.player];
  if (pl) pl.b = { n: ++brewSeq, d: packDrink(kopi.state) };
  closeKopi();
  sfx.play("pour");
});
$("kopiCancel").addEventListener("click", closeKopi);
$("kopi").addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeKopi();
  if (e.key === "Enter" && e.target.id !== "kopiCancel" && !e.target.classList.contains("chipbtn")) $("kopiPull").click();
});

// ---------- Tutorial, the first time at the chicken rice stall ----------

const tutorial = {
  on: false,
  step: 0,
  start: null,
  steps: [
    { say: (k) => `Welcome to the stall! Walk around with ${k.move}.`, done: (sim, ch) => Math.hypot(ch.x - tutorial.start.x, ch.z - tutorial.start.z) > 1.2 },
    { say: (k) => `Face the CHICKEN crate and press ${k.grab} to pick one up.`, at: (sim) => crate(sim, "chicken"), done: (sim, ch) => ch.hold?.k === "chicken" },
    { say: (k) => `Put it in a pot (${k.grab}) to poach it.`, at: (sim) => sim.stations.find((s) => s.type === "pot"), done: (sim) => sim.stations.some((s) => s.type === "pot" && (s.recipe || s.out || s.items.length)) },
    { say: (k) => `While it poaches: rice from the RICE crate into a rice cooker.`, at: (sim) => (sim.chefs[0].hold?.k === "rice" ? sim.stations.find((s) => s.type === "cooker") : crate(sim, "rice")), done: (sim) => sim.stations.some((s) => s.type === "cooker" && (s.recipe || s.out)) },
    { say: (k) => `When the pot's ring fills, take the chicken out with ${k.grab}.`, at: (sim) => sim.stations.find((s) => s.type === "pot" && (s.recipe || s.out)), done: (sim, ch) => ch.hold?.k === "chicken" && ch.hold.s[0] === "poach" },
    { say: (k) => `Put it on the chopping board and hold ${k.use} to slice it.`, at: (sim) => sim.stations.find((s) => s.type === "board"), done: (sim) => sim.stations.some((s) => s.item?.k === "chicken" && s.item.s.includes("chop")) },
    { say: (k) => `Take a clean plate from the plate rack with ${k.grab}.`, at: (sim) => sim.stations.find((s) => s.type === "rack"), done: (sim, ch) => ch.hold?.k === "plate" },
    { say: (k) => `Carry the plate to the rice cooker and the board to scoop up both.`, at: (sim, ch) => (ch.hold?.c?.some((i) => i.k === "rice") ? sim.stations.find((s) => s.item?.k === "chicken") : sim.stations.find((s) => s.type === "cooker" && s.out)), done: (sim, ch) => ch.hold?.k === "plate" && ch.hold.c.length >= 2 },
    { say: () => "Hand it in at the yellow SERVE hatch.", at: (sim) => sim.stations.find((s) => s.type === "hatch"), done: (sim) => sim.served > 0 },
    { say: () => "Shiok! More orders are coming. Dash and throw help when it gets busy. Good luck!", done: () => false, last: true },
  ],
};
const crate = (sim, k) => sim.stations.find((s) => s.type === "crate" && s.ing === k);

function keyWords() {
  if (controls.lastSource === "pad") return { move: "the left stick", grab: "A", use: "X" };
  if (touchy) return { move: "the stick", grab: "Grab", use: "Chop" };
  return { move: "WASD or the arrow keys", grab: "E", use: "Space" };
}

function runTutorial(sim) {
  if (!tutorial.on) return;
  const ch = sim.chefs[0];
  const st = tutorial.steps[tutorial.step];
  if (!st) return endTutorial();
  const el = $("tutorial");
  el.hidden = false;
  el.textContent = st.say(keyWords());
  const target = st.at?.(sim, ch);
  if (target) {
    const [x, y] = view.toScreen(target.x + 0.5, 1.6, target.z + 0.5);
    el.dataset.pin = "1";
    el.style.setProperty("--px", `${Math.round(x)}px`);
    el.style.setProperty("--py", `${Math.round(y)}px`);
  } else delete el.dataset.pin;
  if (st.last) {
    if (!tutorial.lastAt) tutorial.lastAt = performance.now();
    if (performance.now() - tutorial.lastAt > 5000) endTutorial();
  } else if (st.done(sim, ch)) {
    tutorial.step += 1;
    sfx.play("done");
  }
}

function endTutorial() {
  tutorial.on = false;
  $("tutorial").hidden = true;
  store.set("makan-tutorial", true);
}

// ---------- Results ----------

function finish(snap, { canAgain = true } = {}) {
  const stars = snap.st ?? 0;
  const best = bestStars();
  const prev = best[snap.lv];
  const byEra = typeof prev === "number" ? { today: prev } : (prev ?? {});
  if (stars > (byEra[snap.er] ?? 0)) byEra[snap.er] = stars;
  best[snap.lv] = byEra;
  store.set("makan-best", best);
  const era = eraById(snap.er);
  const level = levelById(snap.lv);
  $("resultsKicker").textContent = `${level.name} · ${era.name}, ${era.years}`;
  $("resultsTitle").textContent = ["Can do better lah", "Not bad!", "Steady!", "Shiok ah!"][stars];
  $("stars").replaceChildren(...[0, 1, 2].map((i) => h("span", { class: i < stars ? "" : "off", text: "★" })));
  $("stars").setAttribute("aria-label", `${stars} of 3 stars`);
  $("rServed").textContent = String(snap.sv);
  $("rMissed").textContent = String(snap.ms);
  $("rStreak").textContent = String(snap.bs ?? 0);
  const pl = snap.pl ?? { lines: [], profit: 0 };
  $("pl").replaceChildren(
    ...pl.lines.map((l) => h("tr", { class: l.value < 0 ? "is-cost" : "" }, h("th", { text: l.label }), h("td", { text: money(l.value) }))),
    h("tr", { class: "is-total" }, h("th", { text: pl.profit >= 0 ? "Profit for the hour" : "Loss for the hour" }), h("td", { text: money(pl.profit) })),
  );
  const targets = level.stars.map((t) => money(t * era.price)).join(" · ");
  $("plNote").replaceChildren(
    `Star targets for this stall: ${targets} profit. One round stands for one hour of trading. Rent, charges and wages use 2025 and 2026 figures (median stall rent $1,450, S&CC $200 and table cleaning $520 a month, spread over 26 days of 12 hours; part-time stall assistant $11.64 an hour), scaled to the era with SingStat food prices. Ingredient and utility costs are our guesses. A game simplification, inspired by Hawkernomics. `,
    ...[...COST_SOURCES, PRICE_SOURCE].map(([t, href]) => h("a", { href, target: "_blank", rel: "noopener", text: t })),
  );
  // Best profit per stall and era, remembered in this browser.
  const bests = store.get("makan-profit", {});
  const key = `${snap.lv}|${snap.er}`;
  const newBest = bests[key] === undefined || pl.profit > bests[key];
  if (newBest) {
    bests[key] = Math.round(pl.profit * 100) / 100;
    store.set("makan-profit", bests);
  }
  const bestLine = newBest ? "New best for this stall and era! " : `Your best here: ${money(bests[key])}. `;
  const kinds = Object.keys(snap.ds ?? {}).filter((d) => DISHES[d]);
  const before = LEVELS.filter((_, i) => unlockedBefore[i]).length;
  const after = LEVELS.filter((_, i) => unlocked(i)).length;
  $("unlocked").textContent =
    bestLine + (kinds.length ? `Cooked today: ${kinds.map((d) => DISHES[d].name).join(", ")}. ` : "Nothing served. The queue is still waiting. ") + (after > before ? "A new stall just opened!" : "");
  $("againBtn").hidden = !canAgain;
  renderRojak(snap.ds ?? {});
  renderMemoryForm(kinds.length ? kinds : level.dishes.filter((d) => d !== "drink"));
  renderQuiz(campaign?.stop ?? null);
  $("resultsPassport").hidden = !campaign;
  finishCentreCook(snap);
  sfx.play("end");
  clearHud();
  releaseWake();
  show("results");
  if (campaign) $("quiz").scrollIntoView({ block: "start" });
}
let unlockedBefore = [];

// ---------- Rojak meter: whose dishes did you cook? ----------

const ROJAK_COLORS = ["#c8553d", "#2f6b4f", "#2d4f9c", "#f2b632", "#8a3a6a", "#2a8f8a", "#b5651d", "#5b8c85", "#d9708a", "#7a5c99"];

function renderRojak(served) {
  const counts = {};
  for (const [dish, n] of Object.entries(served)) {
    const tags = communitiesOf(dish);
    for (const t of tags) counts[t] = (counts[t] ?? 0) + n / tags.length;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) {
    $("rojak").replaceChildren(h("p", { class: "rojak__empty", text: "Serve something and see whose recipes you cooked." }));
    return;
  }
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  $("rojak").replaceChildren(
    h("div", { class: "rojak__bar", role: "img", "aria-label": rows.map(([t, n]) => `${t} ${Math.round((n / total) * 100)}%`).join(", ") }, ...rows.map(([t, n], i) => h("i", { style: `--w:${(n / total) * 100}%;--c:${ROJAK_COLORS[i % ROJAK_COLORS.length]}`, title: t }))),
    h("ul", { class: "rojak__keys" }, ...rows.map(([t, n], i) => h("li", { style: `--c:${ROJAK_COLORS[i % ROJAK_COLORS.length]}` }, h("b"), `${t} ${Math.round((n / total) * 100)}%`))),
    h("p", { class: "rojak__note", text: rows.length > 2 ? "A proper rojak of a round." : "Try a stall with dishes from more communities next time." }),
  );
}

// ---------- The living archive ----------

function renderMemoryForm(dishes) {
  $("memoryDish").replaceChildren(...dishes.map((d) => h("option", { value: d, text: DISHES[d].name })));
  $("memoryText").value = "";
  $("memoryCount").textContent = "0 / 140";
  $("memoryStatus").textContent = memoriesFor(dishes[0]).length ? `${memoriesFor(dishes[0]).length} memories of ${DISHES[dishes[0]].name} in the archive so far.` : "";
  $("memoryName").value = store.get("makan-name", "");
}
$("memoryText").addEventListener("input", (e) => ($("memoryCount").textContent = `${e.target.value.length} / 140`));
$("memoryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await addMemory($("memoryDish").value, $("memoryText").value, $("memoryName").value);
    $("memoryText").value = "";
    $("memoryCount").textContent = "0 / 140";
    $("memoryStatus").textContent = lan ? "Thank you. It is in the archive, and other cooks will see it." : "Thank you. Saved in this browser.";
    sfx.play("plate");
  } catch (err) {
    $("memoryStatus").textContent = err.message;
  }
});

let bubbleTimer = 0;
let bubbleNext = 18;
function memoryBubbles(dt, dishes) {
  bubbleNext -= dt;
  if (bubbleNext > 0) return;
  bubbleNext = 20 + Math.random() * 12;
  const m = anyMemory(dishes);
  if (!m) return;
  const pos = view.customerHead(Math.floor(Math.random() * 12));
  if (!pos) return;
  const el = $("bubble");
  el.replaceChildren(h("span", { text: m.text }), h("cite", { text: `${m.name || "A regular"}, about ${DISHES[m.dish].name}` }));
  el.style.left = `${Math.max(12, Math.min(innerWidth - 252, pos[0] - 120))}px`;
  el.style.top = `${Math.max(90, pos[1] - 70)}px`;
  el.hidden = false;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => (el.hidden = true), 6500);
}

// ---------- The passport quiz after a stop ----------

function renderQuiz(stop) {
  const el = $("quiz");
  el.hidden = !stop;
  if (!stop) return;
  const p = passport();
  if (p.stamps[stop.id]) {
    el.replaceChildren(h("p", { class: "quiz__done", text: `You already have the ${stopPlace(stop)} stamp.` }));
    return;
  }
  const quiz = shuffledQuiz(stop);
  el.replaceChildren(
    h("div", { class: "quiz__mentor" }, avatar(stop.mentor.look, 52), h("p", {}, h("strong", { text: `${stop.mentor.name}: ` }), "One question before I stamp your passport.")),
    h("p", { class: "quiz__q", text: quiz.q }),
    h(
      "div",
      { class: "quiz__opts" },
      ...quiz.options.map((o, i) =>
        h("button", {
          type: "button",
          class: "chipbtn quiz__opt",
          text: o,
          onclick: () => answer(stop, quiz, i),
        }),
      ),
    ),
    h("p", { class: "quiz__src" }, "Source: ", h("a", { href: quiz.src[1], target: "_blank", rel: "noopener", text: quiz.src[0] })),
  );
}

function answer(stop, quiz, i) {
  const el = $("quiz");
  if (i !== quiz.answer) {
    sfx.play("nope");
    el.querySelector(".quiz__q").textContent = `${quiz.q} Not quite. The answer is in the source below. Try again.`;
    return;
  }
  sfx.play("serve");
  haptic(40);
  const p = passport();
  p.stamps[stop.id] = new Date().toLocaleDateString("en-CA");
  savePassport(p);
  const idx = STOPS.indexOf(stop);
  const next = STOPS[idx + 1];
  el.replaceChildren(
    ...[
      h("p", { class: "stamp stamp--big", text: `STAMPED · ${stopPlace(stop)}` }),
      stop.handoff ? h("p", { class: "quiz__handoff" }, h("strong", { text: `${stop.mentor.name}: ` }), `“${stop.handoff}”`) : null,
      stop.finale ? passOnForm() : next ? h("p", { class: "quiz__next", text: `Next stop: ${stopPlace(next)}.` }) : null,
    ].filter(Boolean),
  );
  $("passportSub").textContent = passportSubline();
}

// The finale: choose what your apprentice learns from you.
function passOnForm() {
  const book = store.get("makan-book", {});
  const known = Object.keys(DISHES).filter((d) => book[d] && d !== "drink");
  const chosen = new Set();
  const status = h("p", { class: "status" });
  const name = h("input", { maxlength: 14, placeholder: "Nisha", autocomplete: "off", "aria-label": "Your apprentice's name" });
  return h(
    "form",
    {
      class: "passon",
      onsubmit: (e) => {
        e.preventDefault();
        if (!chosen.size) return (status.textContent = "Pick at least one recipe.");
        const p = passport();
        p.passOn = { dishes: [...chosen], apprentice: cleanName(name.value || "Nisha"), at: new Date().toLocaleDateString("en-CA") };
        savePassport(p);
        status.textContent = `Done. ${p.passOn.apprentice} will carry on ${[...chosen].map((d) => DISHES[d].name).join(", ")}.`;
        sfx.play("end");
      },
    },
    h("p", { class: "passon__lede", text: "Your apprentice is ready. Choose up to three recipes from your recipe book to pass on." }),
    h(
      "div",
      { class: "kopi__opts" },
      ...known.map((d) =>
        h("button", {
          type: "button",
          class: "chipbtn",
          "aria-pressed": "false",
          text: DISHES[d].name,
          onclick: (e) => {
            if (chosen.has(d)) chosen.delete(d);
            else if (chosen.size < 3) chosen.add(d);
            e.target.classList.toggle("is-on", chosen.has(d));
            e.target.setAttribute("aria-pressed", String(chosen.has(d)));
          },
        }),
      ),
    ),
    h("label", { class: "name" }, h("span", { text: "Apprentice's name" }), name),
    status,
    h("button", { class: "go", type: "submit", text: "Pass on the ladle" }),
  );
}

function passportSubline() {
  const p = passport();
  const n = STOPS.filter((s) => p.stamps[s.id]).length;
  return n ? `${n} of ${STOPS.length} stamps` : "The apprentice trail, 1950s to 2065";
}

// ---------- Where are we cooking? ----------

function showPlace(era) {
  const e = eraById(era);
  const name = place?.name ?? (campaign ? stopPlace(campaign.stop) : null);
  $("where").hidden = false;
  $("where").textContent = name ? `${name} · ${e.name}, ${e.years}` : `${e.name}, ${e.years}`;
}

// ---------- Sessions ----------

// Each job has a regular face, so the same helper turns up for the same job.
const HELPER_FOR = { washer: "Ah Seng", slicer: "Mr Kumar", iceman: "Ah Boon", caneman: "Ah Boon", kaya: "Auntie Lily", wok: "Auntie Mei", pot: "Kak Noor", cooker: "Encik Osman", grill: "Uncle Rahim", kopi: "Auntie Lily" };
function helperCrew(roles) {
  const used = new Set();
  return roles.map((role) => {
    let name = HELPER_FOR[role] ?? NAMES[0];
    if (used.has(name)) name = NAMES.find((n) => !used.has(n)) ?? name;
    used.add(name);
    return { role, name };
  });
}

// Where this round is cooked: a hawker centre (with its profile, if it has one), a street spot, or nowhere
// in particular. Sent to guests as ids, so they rebuild the same look from their own copy of the data.
function playPlace() {
  if (centreCook && centreState) {
    const rec = CENTRES.find((c) => c.id === centreState.centre.id) ?? centreState.centre;
    return { centreId: rec.id ?? null, name: rec.name, year: rec.year ?? null, profileKey: (profileFor(rec) ?? profileByKey(centreState.centre.profile))?.key ?? null, session: CENTRE_SESSIONS[centreState.session].id };
  }
  if (campaign?.stop) {
    const st = campaign.stop;
    const rec = st.centre ? centreByName(st.centre) : null;
    const profile = st.profile ? profileByKey(st.profile) : profileFor(rec ?? st.spot?.name);
    return { centreId: rec?.id ?? null, name: rec?.name ?? st.spot?.name ?? stopPlace(st), year: rec?.year ?? null, profileKey: profile?.key ?? null, session: null };
  }
  if (place) {
    const rec = centreByName(place.name);
    return { centreId: rec?.id ?? null, name: place.name, year: rec?.year ?? null, profileKey: profileFor(rec ?? place.name)?.key ?? null, session: null };
  }
  // Links straight to a profiled centre (?at=lau-pa-sat) and previews of the kit (?look=octagon&time=night).
  const q = new URLSearchParams(location.search);
  const at = profileByKey(q.get("at") ?? "");
  if (at) {
    const rec = at.neaName ? centreByName(at.neaName) : null;
    return { centreId: rec?.id ?? null, name: rec?.name ?? at.displayName, year: rec?.year ?? null, profileKey: at.key, session: null };
  }
  if (ARCHETYPES[q.get("look")]) return { name: null, override: { archetype: q.get("look"), ...(TIMES.includes(q.get("time")) ? { time: q.get("time") } : {}) } };
  return null;
}

// Checks a place sent by a host before using it.
function cleanPlace(raw) {
  if (!raw || typeof raw !== "object") return null;
  const rec = typeof raw.centreId === "string" ? CENTRES.find((c) => c.id === raw.centreId) : null;
  const profile = typeof raw.profileKey === "string" ? profileByKey(raw.profileKey) : null;
  const override = raw.override && ARCHETYPES[raw.override.archetype] ? { archetype: raw.override.archetype, ...(TIMES.includes(raw.override.time) ? { time: raw.override.time } : {}) } : null;
  return {
    centreId: rec?.id ?? null,
    name: rec?.name ?? profile?.displayName ?? (typeof raw.name === "string" ? cleanText(raw.name, 60) : null),
    year: rec?.year ?? null,
    profileKey: profile?.key ?? null,
    session: ["b", "l", "d"].includes(raw.session) ? raw.session : null,
    override,
  };
}
const cleanText = (s, n) => String(s).replace(/[\u0000-\u001f<>]/g, "").slice(0, n);

function lookOfPlace(where, eraId) {
  if (!where) return null;
  const profile = where.profileKey ? profileByKey(where.profileKey) : null;
  return presetFor({ profile, centre: where.name ? { name: where.name, year: where.year } : null, eraId, session: where.session, override: where.override });
}

// Runs the kitchen on this device, for local players, hired helpers and any guests.
function hostGame({ level, era, crew, helpers, transport, tut = false, focus = null }) {
  const stallMenu = centreCookMenu();
  const where = playPlace();
  const preset = lookOfPlace(where, era);
  const famous = where?.profileKey ? famousIn(profileByKey(where.profileKey)).map((f) => f.id) : [];
  const sim = createSim(level, crew.map((c) => ({ name: c.name, chef: c.chef })), { era, helpers: helperCrew(helpers), tutorial: tut, focus, seed: Math.floor(Math.random() * 1e6) + 1, featured: famous, ...stallMenu });
  const menu = levelById(level).dishes.filter((d) => d !== "drink");
  bubbleNext = 14;
  showPlace(era);
  const remote = new Map(); // peer -> latest inputs
  let acc = 0;
  let netAcc = 0;
  let netEvents = [];
  const localSlots = crew.filter((c) => c.owner === "me").map((c) => c.slot);
  unlockedBefore = LEVELS.map((_, i) => unlocked(i));
  view.load(level, era, { ...stallMenu, preset });
  clearHud();
  startHints(sim.map, era, localSlots);
  showTip({ era, dishes: sim.menu, centre: where?.profileKey ?? null });
  keysHint(localSlots.length);
  tutorial.on = tut;
  tutorial.step = 0;
  tutorial.lastAt = 0;
  tutorial.start = { x: sim.chefs[0].x, z: sim.chefs[0].z };
  $("tutorial").hidden = !tut;
  show(null);
  holdWake();

  autoBots.clear();
  const s = {
    kind: "host",
    sim,
    era: eraById(era),
    transport,
    paused: false,
    tick(dt) {
      if (!s.paused && !sim.over) {
        const mine = controls.poll();
        for (const c of crew) {
          sim.inputs[c.slot] = c.owner === "me" ? mine[c.local] : cleanInput(remote.get(c.owner)?.[c.local]);
        }
        acc += dt;
        let steps = 0;
        while (acc >= TICK && steps < 15) {
          if (AUTOPLAY) autoplay(sim, localSlots, era);
          step(sim, TICK);
          acc -= TICK;
          steps++;
        }
        if (steps === 15) acc = 0;
      }
      const evs = drainEvents(sim);
      netEvents.push(...evs);
      const snap = snapshot(sim);
      react(evs, localSlots);
      const targets = localSlots.map((slot) => ({ ...(targetOf(sim, sim.chefs[slot]) ?? {}), slot })).filter((t) => t.type);
      updateHints(snap, dt);
      view.apply(snap, { localSlots, targets });
      renderHud(snap);
      renderLines(snap, localSlots, targets);
      runTutorial(sim);
      if (!s.paused && !sim.over) memoryBubbles(dt, menu);
      netAcc += dt;
      if (transport && netAcc >= NET_RATE) {
        netAcc = 0;
        transport.broadcast({ t: "snap", s: snap, ev: netEvents.slice(-40) });
        netEvents = [];
      }
      if (sim.over && !s.done) {
        s.done = true;
        transport?.broadcast({ t: "snap", s: snap, ev: [] });
        setTimeout(() => finish(snap), 900);
      }
      window.__makan = { sim, snap };
    },
    input(peer, msg) {
      if (msg?.t === "in" && Array.isArray(msg.i)) remote.set(peer, msg.i.slice(0, 2));
    },
  };
  return s;
}

// Draws someone else's kitchen and sends them our buttons.
function guestGame({ level, era, mySlots, transport, menu = null, prices = null, no = null, where = null }) {
  const map = parseLevel(levelById(level));
  const shadowSim = { map, stations: map.stations };
  let latest = null;
  unlockedBefore = LEVELS.map((_, i) => unlocked(i));
  showPlace(era);
  view.load(level, era, { menu, prices, no, preset: lookOfPlace(where, era) });
  clearHud();
  startHints(map, era, mySlots);
  showTip({ era, dishes: levelById(level).dishes, centre: where?.profileKey ?? null });
  keysHint(1);
  show(null);
  holdWake();
  const sendTimer = setInterval(() => transport.send({ t: "in", i: controls.poll() }), 33);
  const s = {
    kind: "guest",
    era: eraById(era),
    mySlots,
    transport,
    tick(dt) {
      if (!latest) return;
      updateHints(latest, dt);
      const targets = [];
      for (const slot of mySlots) {
        const c = latest.c.find((row) => row[0] === slot);
        if (!c) continue;
        const t = targetOf(shadowSim, { x: c[1], z: c[2], fx: c[3], fz: c[4] });
        if (t) targets.push({ ...t, slot });
      }
      view.apply(latest, { localSlots: mySlots, targets });
      renderHud(latest);
      renderLines(latest, mySlots, targets);
    },
    snap(msg) {
      if (!msg?.s || !Array.isArray(msg.s.c) || !Array.isArray(msg.s.s) || !Array.isArray(msg.s.o)) return;
      latest = msg.s;
      if (Array.isArray(msg.ev)) react(msg.ev.filter((e) => Array.isArray(e) && typeof e[0] === "string").slice(0, 40), mySlots);
      window.__makan = { snap: latest };
      if (latest.over && !s.done) {
        s.done = true;
        setTimeout(() => finish(latest, { canAgain: false }), 900);
      }
    },
    stop() {
      clearInterval(sendTimer);
    },
  };
  return s;
}

// ---------- Local play ----------

function localCrew() {
  const n = localCount();
  controls.setPlayers(n);
  const name = myName();
  return Array.from({ length: n }, (_, i) => ({ slot: i, name: i ? `${name} ${i + 1}` : name, owner: "me", local: i, chef: settings.chefs[i] }));
}

function mountControls(n) {
  if (!touchy) return;
  mountTouch($("touch"), controls, n === 2 ? "two" : "one");
}

// ---------- Hosting ----------

const host = {
  transport: null,
  guests: new Map(), // peer -> { name, locals }
  crew() {
    const crew = localCrew();
    for (const [peer, g] of this.guests) {
      for (let i = 0; i < g.locals && crew.length < 4; i++) {
        // Guests keep their chef unless someone here already picked them; then they get the next free one.
        const taken = new Set(crew.map((c) => c.chef));
        const chef = taken.has(g.chef) ? (CHEFS.find((c) => !taken.has(c.id))?.id ?? g.chef) : g.chef;
        crew.push({ slot: crew.length, name: i ? `${g.name} 2` : g.name, owner: peer, local: i, chef });
      }
    }
    return crew;
  },
  async open(mode) {
    this.close();
    $("roomCode").textContent = "····";
    $("roomNote").textContent = "Setting up the kitchen...";
    try {
      this.transport = mode === "lan" ? await lanHost() : await p2pHost();
    } catch (e) {
      $("roomNote").textContent = e.message;
      return;
    }
    const t = this.transport;
    t.onJoin = () => {};
    t.onLeave = (peer) => {
      this.guests.delete(peer);
      this.lobby();
    };
    t.onMessage = (peer, msg) => {
      if (msg?.t === "hello") {
        if (this.crew().length + 1 > 4) return t.send(peer, { t: "full" });
        this.guests.set(peer, { name: cleanName(msg.name), locals: 1, chef: chefById(msg.chef)?.id ?? CHEFS[1].id });
        sfx.play("order");
        this.lobby();
        if (session?.kind === "host" && !session.done) t.send(peer, { t: "wait" });
      } else if (session?.kind === "host") session.input(peer, msg);
    };
    t.onClose = (why) => {
      if (session?.kind !== "host") $("roomNote").textContent = why;
    };
    this.showRoom(mode, t.code);
    this.lobby();
  },
  showRoom(mode, code) {
    $("roomCode").textContent = code;
    let link;
    let note;
    // If friends can already reach this page (a LAN address, Tailscale, a tunnel), the link is this page.
    // Only on localhost do we swap in the server's wifi address.
    const onLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
    if (mode === "lan") {
      if (!onLocalhost) {
        link = `${location.origin}${location.pathname}?join=${code}&via=lan`;
        note = "Anyone who can open this page can join: scan the code or share the link.";
      } else if (lan?.open && lan.addresses.length) {
        link = `http://${lan.addresses[0]}:${lan.port}${location.pathname}?join=${code}&via=lan`;
        note = "Phones on the same wifi: scan the code, or open the link.";
      } else {
        link = `${location.origin}${location.pathname}?join=${code}&via=lan`;
        note = "Only this computer can reach the server right now. Restart it with HOST=0.0.0.0 bun run dev so phones on your wifi can join.";
      }
    } else {
      link = `${location.origin}${location.pathname}?join=${code}&via=p2p`;
      note = "Works across the internet, peer to peer. Some strict office or school networks block it; same wifi is the safer bet.";
    }
    $("roomLink").textContent = link;
    $("roomLink").href = link;
    $("roomNote").textContent = note;
    drawQr($("qr"), link);
  },
  lobby() {
    const crew = this.crew();
    const helpers = helperCrew(settings.hires);
    $("crew").replaceChildren(
      ...crew.map((c) => h("li", { style: `--c:${CHEF_COLORS[c.slot % 4]}` }, h("i"), c.owner === "me" && c.local === 0 ? `${c.name} (you)` : c.name)),
      ...helpers.map((hp) => h("li", { class: "is-helper", style: `--c:${ROLES[hp.role].color}` }, h("i"), `${hp.name}, ${ROLES[hp.role].name.toLowerCase()}`)),
    );
    for (const peer of this.guests.keys()) {
      this.transport?.send(peer, {
        t: "lobby",
        crew: [...crew.map((c) => ({ name: c.name })), ...helpers.map((hp) => ({ name: hp.name }))],
        level: settings.level,
        era: settings.era,
        you: crew.filter((c) => c.owner === peer).map((c) => c.slot),
      });
    }
  },
  start() {
    const crew = this.crew();
    for (const peer of this.guests.keys()) {
      this.transport.send(peer, { t: "start", level: settings.level, era: settings.era, you: crew.filter((c) => c.owner === peer).map((c) => c.slot), ...centreCookMenu(), where: playPlace() });
    }
    mountControls(crew.filter((c) => c.owner === "me").length);
    session = hostGame({ level: settings.level, era: settings.era, crew, helpers: settings.hires, transport: this.transport });
  },
  close() {
    this.transport?.close();
    this.transport = null;
    this.guests.clear();
  },
};

function drawQr(canvas, text) {
  const { data, size } = encode(text, { border: 2 });
  const g = canvas.getContext("2d");
  const px = Math.floor(canvas.width / size);
  const off = Math.floor((canvas.width - px * size) / 2);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "#2b1b12";
  data.forEach((row, y) => row.forEach((on, x) => on && g.fillRect(off + x * px, off + y * px, px, px)));
}

// ---------- Joining ----------

let guestT = null;
async function join(code, mode) {
  code = cleanCode(code);
  if (code.length !== 4) {
    $("joinStatus").textContent = "Codes have four letters.";
    return;
  }
  sfx.start();
  $("joinGo").disabled = true;
  $("joinStatus").textContent = mode === "lan" ? "Knocking on the kitchen door..." : "Looking for the kitchen online. This can take a few seconds...";
  try {
    guestT = mode === "lan" ? await lanGuest(code) : await p2pGuest(code);
  } catch (e) {
    $("joinStatus").textContent = e.message;
    $("joinGo").disabled = false;
    return;
  }
  controls.setPlayers(1);
  let mySlots = [];
  guestT.onMessage = (msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.t === "lobby") {
      mySlots = Array.isArray(msg.you) ? msg.you.filter(Number.isInteger) : [];
      const names = Array.isArray(msg.crew) ? msg.crew.slice(0, 8).map((c) => cleanName(c?.name)) : [];
      const era = eraById(msg.era);
      $("joinStatus").textContent = `In the kitchen with ${names.join(", ")}. ${levelById(msg.level).name}, ${era.name} (${era.years}). Waiting for the host to open the stall.`;
    } else if (msg.t === "start") {
      mySlots = Array.isArray(msg.you) ? msg.you.filter(Number.isInteger) : mySlots;
      session?.stop?.();
      const era = eraById(msg.era).id;
      mountControls(1);
      soundtrack.play(era);
      const lv = levelById(msg.level);
      // A Centre Manager host sends the stall's menu and prices; keep only what makes sense.
      const menu = Array.isArray(msg.menu) ? msg.menu.filter((d) => lv.dishes.includes(d)) : null;
      const prices = msg.prices && typeof msg.prices === "object" ? Object.fromEntries(Object.entries(msg.prices).filter(([d, v]) => lv.dishes.includes(d) && Number.isFinite(v) && v > 0 && v < 1000)) : null;
      const no = typeof msg.no === "string" && /^#\d{2}-\d{2}$/.test(msg.no) ? msg.no : null;
      session = guestGame({ level: lv.id, era, mySlots, transport: guestT, menu: menu?.length ? menu : null, prices, no, where: cleanPlace(msg.where) });
    } else if (msg.t === "snap") {
      if (session?.kind === "guest") session.snap(msg);
    } else if (msg.t === "full") {
      $("joinStatus").textContent = "That kitchen is full. Four chefs max.";
    } else if (msg.t === "wait") {
      $("joinStatus").textContent = "They are mid-round. You will be in the next one.";
    }
  };
  guestT.onClose = (why) => {
    session?.stop?.();
    session = null;
    show("join");
    $("joinStatus").textContent = why;
    $("joinGo").disabled = false;
  };
  guestT.send({ t: "hello", name: myName(), locals: 1, chef: settings.chefs[0] });
  $("joinStatus").textContent = "Joined. Waiting for the host to open the stall.";
}

// ---------- Device: full screen, keeping the screen awake ----------

const canFull = Boolean(document.documentElement.requestFullscreen);
$("fullBtn").hidden = !canFull || !touchy;
$("fullBtn").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch {}
});

let wake = null;
async function holdWake() {
  try {
    if ("wakeLock" in navigator && !wake) wake = await navigator.wakeLock.request("screen");
    wake?.addEventListener?.("release", () => (wake = null));
  } catch {
    wake = null;
  }
}
function releaseWake() {
  try {
    wake?.release();
  } catch {}
  wake = null;
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && session && !session.done) holdWake();
  if (document.visibilityState === "hidden" && session?.kind === "host" && !session.transport && !session.done) pauseGame();
});

// ---------- Wiring ----------

let setupMode = "local";

function preview() {
  view.load(settings.level, settings.era);
  idle = snapshot(createSim(settings.level, [], { era: settings.era, calm: true }));
}
let idle = null;

function openSetup(mode) {
  setupMode = mode;
  lockSetup();
  $("setupTitle").textContent = mode === "host" ? "Host a kitchen" : "Set up the stall";
  $("room").hidden = mode !== "host";
  renderEras();
  renderLevels();
  renderHires();
  renderLocalPick();
  show("setup");
}

$("playHere").addEventListener("click", () => {
  sfx.start();
  centreCook = null;
  openSetup("local");
});

$("hostBtn").addEventListener("click", () => {
  sfx.start();
  centreCook = null;
  openSetup("host");
  const mode = lan ? document.querySelector("input[name=mode]:checked").value : "p2p";
  host.open(mode);
});

for (const r of document.querySelectorAll("input[name=mode]")) r.addEventListener("change", () => host.open(r.value));
for (const r of document.querySelectorAll("input[name=locals]"))
  r.addEventListener("change", () => {
    renderLocalPick();
    if (setupMode === "host") host.lobby();
  });
addEventListener("gamepadconnected", () => !$("setup").hidden && renderLocalPick());

$("joinBtn").addEventListener("click", () => {
  sfx.start();
  renderJoinPicker();
  show("join");
  $("codeInput").focus();
});

$("setupBack").addEventListener("click", () => {
  host.close();
  if (centreCook) {
    centreCook = null;
    lockSetup();
    return openCentre();
  }
  show("home");
});
$("joinBack").addEventListener("click", () => {
  guestT?.close();
  show("home");
});
$("joinGo").addEventListener("click", () => join($("codeInput").value, document.querySelector("input[name=joinmode]:checked").value));
$("codeInput").addEventListener("keydown", (e) => e.key === "Enter" && $("joinGo").click());
$("codeInput").addEventListener("input", (e) => (e.target.value = cleanCode(e.target.value)));

function startLocal() {
  const crew = localCrew();
  mountControls(crew.length);
  const level = campaign ? campaign.stop.level : settings.level;
  const era = campaign ? campaign.stop.era : settings.era;
  const tut = level === "chickenrice" && !store.get("makan-tutorial", false) && crew.length === 1 && !centreCook;
  session = hostGame({ level, era, crew, helpers: settings.hires, transport: null, tut, focus: campaign?.stop.focus ?? null });
}

// ---------- Centre Manager ----------

let centreState = loadCentre(store.get(CENTRE_KEY, null));
let centreCook = null; // { stall, day, session } while cooking one session of a stall

const centreUi = mountCentre($("centreRoot"), {
  h,
  getState: () => centreState,
  setState: (s) => {
    centreState = s;
    store.set(CENTRE_KEY, s);
    centreSubline();
  },
  onBack: () => show("home"),
  onCook: (i, friends) => cookInCentre(i, friends),
  canHost: () => true,
});

function centreSubline() {
  $("centreSub").textContent = centreState
    ? `${centreState.centre.name}: ${centreState.over ? "the fortnight is over" : `day ${centreState.day}, ${CENTRE_SESSIONS[centreState.session].name.toLowerCase()} next`}.`
    : "Run a real hawker centre for two weeks: menus, prices, hygiene, and successors for retiring hawkers.";
}

function openCentre() {
  centreUi.render();
  show("centre");
}

// The stall's own menu and prices, for the round and for guests.
function centreCookMenu() {
  if (!centreCook || !centreState) return {};
  const s = centreState.stalls[centreCook.stall];
  if (!s) return {};
  const menu = Object.keys(s.menu).filter((d) => s.menu[d].on);
  return { menu, prices: Object.fromEntries(menu.map((d) => [d, s.menu[d].price])), no: s.no };
}

// Cooking a session at one stall uses the normal set-up screen, with the stall and era fixed.
function cookInCentre(i, friends) {
  const s = centreState?.stalls[i];
  if (!s) return;
  sfx.start();
  campaign = null;
  centreCook = { stall: i, day: centreState.day, session: centreState.session };
  settings.level = s.type;
  settings.era = centreState.era;
  const level = levelById(s.type);
  settings.hires = rolesFor(parseLevel(level), level, partsInMenu(level)).slice(0, s.helpers);
  if (!friends) host.close();
  openSetup(friends ? "host" : "local");
  // Friends who joined for one session stay in the room for the next one.
  if (friends && !host.transport) host.open(lan ? document.querySelector("input[name=mode]:checked").value : "p2p");
  else if (friends) host.lobby();
}

function lockSetup() {
  const on = Boolean(centreCook && centreState);
  $("setup").classList.toggle("is-centre", on);
  $("centreBanner").hidden = !on;
  if (on) {
    const s = centreState.stalls[centreCook.stall];
    $("centreBanner").textContent = `${centreState.centre.name}, day ${centreState.day}: you cook ${CENTRE_SESSIONS[centreState.session].name.toLowerCase()} at ${s.no}, ${stallTitle(s)}, with ${s.hawker.name}. The other stalls run on their own.`;
  }
}

// After the round: the stall's session uses what you cooked, the rest of the centre is simulated.
function finishCentreCook(snap) {
  $("resultsCentre").hidden = true;
  if (!centreCook || !centreState) return;
  if (centreCook.day !== centreState.day || centreCook.session !== centreState.session || snap.lv !== centreState.stalls[centreCook.stall]?.type) {
    centreCook = null;
    return;
  }
  const sum = runCentreSession(centreState, { stall: centreCook.stall, served: snap.sv, missed: snap.ms, takings: snap.co, spent: snap.sp, stars: snap.st ?? 0 });
  store.set(CENTRE_KEY, centreState);
  centreSubline();
  centreCook = null;
  $("againBtn").hidden = true;
  $("resultsCentre").hidden = false;
  $("resultsCentre").onclick = () => {
    lockSetup();
    centreUi.showSummary(sum);
    show("centre");
  };
}

// ---------- Customer mode: makan at a hawker centre ----------

const walkMode = createWalkMode({
  h,
  $,
  show,
  view,
  controls,
  sfx,
  store,
  touchy,
  mountTouch,
  playerLook: () => (chefById(settings.chefs[0]) ?? CHEFS[0]).look,
  setLook,
  setPeople: setPeopleChoice,
  onQuit: () => {
    mountTouch($("touch"), controls, "one");
    show("home");
  },
});

$("walkBtn").addEventListener("click", () => {
  sfx.start();
  walkMode.open();
});

$("centreBtn").addEventListener("click", () => {
  sfx.start();
  openCentre();
});
centreSubline();

// ---------- The Hawker Passport ----------

let finderState = { me: null, near: null, list: [] };

function finder() {
  if (!lan) return null;
  const input = h("input", { inputmode: "numeric", maxlength: 6, placeholder: "560123", "aria-label": "Postal code", autocomplete: "postal-code" });
  const status = h("p", { class: "status" });
  const list = h(
    "ul",
    { class: "near" },
    ...finderState.list.map(({ c, km }) =>
      h(
        "li",
        {},
        h("strong", { text: c.name }),
        ` · ${km.toFixed(1)} km · ${c.status === "Under Construction" ? `due ${c.yearLabel}` : `built ${c.yearLabel}`}`,
        famousIn(profileFor(c)).length ? h("span", { class: "cpick__famous", text: ` · known for ${famousIn(profileFor(c)).slice(0, 3).map((f) => DISHES[f.id].name).join(", ")}` }) : null,
        h("button", { class: "link link--inline", type: "button", text: "Cook a round there", onclick: () => cookAtCentre(c) }),
      ),
    ),
  );
  return h(
    "form",
    {
      class: "finder",
      onsubmit: async (e) => {
        e.preventDefault();
        const code = input.value.replace(/\D/g, "");
        if (code.length !== 6) return (status.textContent = "Postal codes have six digits.");
        status.textContent = "Looking it up...";
        try {
          // Straight to OneMap from the browser (it allows that), so this works on a static site too.
          const url = `https://www.onemap.gov.sg/api/common/elastic/search?${new URLSearchParams({ searchVal: code, returnGeom: "Y", getAddrDetails: "Y", pageNum: "1" })}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
          if (!res?.ok) throw new Error("OneMap is not answering right now.");
          const hit = ((await res.json()).results ?? []).find((r) => r.POSTAL === code);
          const body = hit ? { lat: Number(hit.LATITUDE), lng: Number(hit.LONGITUDE) } : {};
          if (!Number.isFinite(body.lat) || !Number.isFinite(body.lng)) throw new Error("Could not find that postal code.");
          const near = nearestCentres(body, 3);
          finderState = { me: { lat: body.lat, lng: body.lng }, near: near[0]?.c ?? null, list: near };
          openPassport();
        } catch (err) {
          status.textContent = err.message;
        }
      },
    },
    h("p", { class: "finder__title" }, h("strong", { text: "Find your nearest hawker centre. " }), "Type a postal code; we ask OneMap where it is."),
    h("div", { class: "finder__row" }, input, h("button", { class: "ghost", type: "submit", text: "Find" })),
    status,
    finderState.list.length ? list : null,
  );
}

// The stall whose menu best matches what a centre is famous for; otherwise one picked from its id.
function stallForCentre(c) {
  const famous = famousIn(profileFor(c)).map((f) => f.id);
  const best = LEVELS.map((l) => [l.dishes.filter((d) => famous.includes(d)).length, l.id]).sort((a, b) => b[0] - a[0])[0];
  return best[0] > 0 ? best[1] : LEVELS[Number(String(c.id).replace(/\D/g, "")) % LEVELS.length].id;
}

function cookAtCentre(c) {
  campaign = null;
  const era = eraOfYear(c.year, c.status);
  place = { name: c.name };
  settings.era = era;
  settings.level = stallForCentre(c);
  sfx.start();
  soundtrack.play(era);
  setupMode = "local";
  startLocal();
}

let passLoops = {};
function openPassport() {
  const p = passport();
  renderPassport($("passportRoot"), {
    stamps: p.stamps,
    passOn: p.passOn,
    me: finderState.me,
    near: finderState.near,
    finder: finder(),
    loops: passLoops,
    onCook: (stop) => cookStop(stop),
    onMakan: (id) => walkMode.open(id),
  });
  // The HDB data (which centres are HDB blocks) loads on demand; draw again when it first arrives.
  if (!hdbReady()) loadHdb().then(() => current === "passport" && openPassport());
  // The loops load once; draw again when they first arrive.
  loadLoops().then((l) => {
    if (l === passLoops || !Object.keys(l).length) return;
    passLoops = l;
    if (current === "passport") openPassport();
  });
  const next = STOPS.find((st) => !p.stamps[st.id]);
  $("passportNext").hidden = !next;
  $("passportNext").textContent = next ? `Cook stop ${STOPS.indexOf(next) + 1}: ${stopPlace(next)}` : "";
  show("passport");
}

// ?autoplay in the address: the chefs on this device cook by themselves, following the guide the way the
// guide tests do. An attract mode for a screen at the booth, and how the demo video was filmed.
const AUTOPLAY = new URLSearchParams(location.search).has("autoplay");
const autoBots = new Map();
let autoGuides = [];
let autoTicks = 0;
function autoplay(sim, slots, era) {
  if (autoTicks++ % 6 === 0) autoGuides = guidesFor(snapshot(sim), sim.map, slots, { era });
  for (const slot of slots) {
    if (!autoBots.has(slot)) autoBots.set(slot, { p: 0, b: 0, cool: 0, path: null, goalKey: "", stuck: 0, skip: {}, replan: 0 });
    const bot = autoBots.get(slot);
    const g = autoGuides.find((x) => x.slot === slot);
    const goal = g && g.act !== "wait" ? { st: sim.stations[g.st], act: g.act, dk: g.dk } : null;
    sim.inputs[slot] = walkTo(sim, sim.chefs[slot], goal, TICK, bot);
    bot.cool = Math.max(0, bot.cool - TICK);
  }
}

function cookStop(stop) {
  campaign = { stop };
  place = null;
  sfx.start();
  soundtrack.play(stop.era);
  setupMode = "local";
  startLocal();
}

$("startBtn").addEventListener("click", () => {
  sfx.start();
  campaign = null;
  place = null;
  soundtrack.play(settings.era);
  if (setupMode === "host") {
    if (!host.transport) return;
    host.start();
  } else startLocal();
});

$("againBtn").addEventListener("click", () => {
  if (setupMode === "host" && host.transport) {
    openSetup("host");
    session = null;
    host.lobby();
  } else {
    soundtrack.play(campaign ? campaign.stop.era : settings.era);
    startLocal();
  }
});

$("passportBtn").addEventListener("click", () => {
  sfx.start();
  openPassport();
});
$("passportBack").addEventListener("click", () => show("home"));
$("passportNext").addEventListener("click", () => {
  const next = STOPS.find((st) => !passport().stamps[st.id]);
  if (next) cookStop(next);
});
$("resultsPassport").addEventListener("click", () => openPassport());

$("bookBtn").addEventListener("click", () => openBook(current && current !== "book" ? current : "home"));
$("resultsBook").addEventListener("click", () => openBook("results"));
$("bookBack").addEventListener("click", () => show(bookReturn));

function pauseGame() {
  if (!session || session.done) return;
  const local = session.kind === "host" && !session.transport;
  if (local) session.paused = true;
  $("pausedTitle").textContent = local ? "Paused" : "Menu";
  $("pausedNote").textContent = local ? "The kitchen waits for you." : "The kitchen keeps cooking while you are here, so be quick.";
  // Phones hide the era and radio lines during a round, so they are repeated here.
  const now = ["where", "radio"].filter((id) => !$(id).hidden && $(id).textContent).map((id) => $(id).textContent);
  if (now.length) $("pausedNote").append(h("br"), now.join(" · "));
  const where = playPlace();
  $("pausedFact").replaceChildren(...[factNode(factFor({ era: session.era?.id, dishes: levelById(session.sim?.level?.id ?? settings.level).dishes, centre: where?.profileKey ?? null }, Math.floor(Math.random() * 1000)))].filter(Boolean));
  showGraphics();
  show("paused");
}
function resumeGame() {
  if (!session) return show("home");
  session.paused = false;
  show(null);
}
$("pauseBtn").addEventListener("click", pauseGame);
$("resumeBtn").addEventListener("click", resumeGame);
$("leaveBtn").addEventListener("click", () => {
  session?.stop?.();
  session = null;
  host.close();
  guestT?.close();
  soundtrack.stop();
  campaign = null;
  place = null;
  releaseWake();
  tutorial.on = false;
  $("tutorial").hidden = true;
  hints.map = null;
  tags.clear();
  tags.show(false);
  view.setHints({});
  preview();
  show("home");
});
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && session && !session.done && $("kopi").hidden) {
    if ($("paused").hidden) pauseGame();
    else resumeGame();
  }
});

// Music volume, shared by both sliders.
const vol = store.get("makan-music", 70);
for (const id of ["music", "music2"]) {
  $(id).value = String(vol);
  $(id).addEventListener("input", (e) => {
    const v = Number(e.target.value);
    store.set("makan-music", v);
    soundtrack.setVolume(v / 100);
    for (const other of ["music", "music2"]) $(other).value = String(v);
  });
}
soundtrack.setVolume(vol / 100);
soundtrack.onTrack((t) => {
  const el = $("radio");
  if (!t?.title) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = `On the radio: ${t.title}${t.artist ? `, ${t.artist}` : ""}${t.live ? " · LIVE" : t.year ? ` (${t.year})` : ""}`;
});

addEventListener("resize", () => {
  layout();
  walkMode.onResize();
});

// ---------- Start up ----------

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  // The customer mode draws its own scene with the same renderer. Watching a video pauses it.
  if (walkMode.active) {
    if (!videoOpen()) walkMode.tick(dt);
    requestAnimationFrame(loop);
    return;
  }
  if (session) session.tick(dt);
  else if (idle) view.apply(idle);
  // Menus with a video open leave the GPU to the video; a round in play keeps drawing.
  if (session || !videoOpen()) view.frame(dt);
  if (session) tags.update();
  requestAnimationFrame(loop);
}

async function boot() {
  preloadPhotos();
  $("nameInput").value = $("joinName").value = store.get("makan-name", "");
  try {
    await Promise.race([document.fonts.load("700 64px 'Fraunces Variable'"), new Promise((r) => setTimeout(r, 1500))]);
  } catch {}
  // On the Bun server we can offer LAN play, shared memories and lent voices. On a static site (GitHub Pages)
  // we cannot; data/site.json says which, so a static site never asks for the server's routes.
  try {
    const site = await fetch("../data/site.json", { signal: AbortSignal.timeout(2500) }).then((r) => (r.ok ? r.json() : {}));
    const res = site.server ? await fetch("../api/hawker/lan", { signal: AbortSignal.timeout(2500) }) : null;
    lan = res?.ok ? await res.json() : null;
  } catch {
    lan = null;
  }
  if (!lan) {
    $("modeLanWrap").hidden = true;
    $("joinLanWrap").hidden = true;
    document.querySelector("input[name=mode][value=p2p]").checked = true;
    document.querySelector("input[name=joinmode][value=p2p]").checked = true;
  }
  // Online play needs a secure page (https or localhost) for the browser's crypto.
  if (!secure && lan) {
    for (const id of ["modeP2pWrap", "joinP2pWrap"]) {
      const wrap = $(id);
      wrap.querySelector("input").disabled = true;
      wrap.title = "Online play needs https. Same wifi works here.";
      wrap.classList.add("is-off");
    }
  }
  preview();
  requestAnimationFrame(loop);
  $("passportSub").textContent = passportSubline();
  loadMemories(Boolean(lan));
  // Pre-generated clips sit beside the page on the server and the static site alike; lent voices come
  // from the server, and a static site keeps lent clips locally.
  loadManifest();
  loadBank(Boolean(lan));
  // Some browsers load speech voices late.
  try {
    speechSynthesis?.addEventListener?.("voiceschanged", () => current === "voices" && renderVoices());
  } catch {}

  const params = new URLSearchParams(location.search);
  const code = cleanCode(params.get("join"));
  if (code) {
    renderJoinPicker();
    show("join");
    $("codeInput").value = code;
    const via = params.get("via") === "lan" && lan ? "lan" : "p2p";
    document.querySelector(`input[name=joinmode][value=${via}]`).checked = true;
    $("joinStatus").textContent = "Pop in your name and tap Join.";
  } else if (CENTRES.some((c) => c.id === params.get("makan"))) {
    // Block Birthday links a block to its hawker centre: ?makan=<NEA id> opens the customer mode there.
    walkMode.open(params.get("makan"));
  } else show("home");
}

boot();
