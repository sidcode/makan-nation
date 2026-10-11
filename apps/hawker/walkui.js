// The customer mode's screens: pick a centre, an era and how to see it, then walk it with a makan list, a
// guide to the next step, an order sheet at each stall, a map in the corner, and a card at the end.
// Everything goes into the page with textContent.

import { presetFor } from "./centrelook.js";
import { DISHES } from "./dishes.js";
import { ERAS, eraById, money } from "./eras.js";
import { factFor } from "./archive.js";
import { CENTRES, CENTRES_SOURCE } from "./passport.js";
import { famousIn, profileFor } from "./profiles.js";
import { findPath, LAYOUT_HINTS, planCentre } from "./floorplan.js";
import { buy, createWalk, doneOrdering, drainWalkEvents, drinkChoices, finishIn, goToward, nextStep, stallMenu, stallsToVisit, stepWalk, stopGoing, targetPoint, walkSummary } from "./walk.js";
import { CAMS, WalkView } from "./walkview.js";
import { LOOKS, realism } from "./realism.js";
import { PEOPLE, peopleSetting } from "./humans.js";
import { centrePhotos, creditLine, manifest, mediaUrl, photosOf, realStalls, videosFor } from "./media.js";
import { videoButton, videoOpen } from "./videomodal.js";
import { calloutFor } from "./callouts.js";
import { browseCentres, browseControls, keepScroll, SORTS } from "./centrelist.js";
import { ACTION_OF } from "./hawkerwork.js";
import { say } from "./voices.js";
import { loadLoops, loopFigure } from "./loops.js";
import { HallSound } from "./ambience.js";
import { loadStreetView, streetView } from "./streetview.js";
import { aroundSummary, blockName, flatsOver, HDB_SOURCES, hdbAround, hdbOf, hdbReady, hdbTag, inHdb, loadHdb, streetName, towerOver } from "./hdb.js";

// The customer mode's clock: 60 steps a second, drawn smoothly between steps.
const TICK = 1 / 60;
// What changes from era to era, each with the sources behind it.
const NB = (id, date) => [`NewspaperSG: ${date}`, `https://eresources.nlb.gov.sg/newspapers/digitised/article/${id}`];
const ERA_NOTES = {
  "1950s": {
    text: "Pushcarts and low tables on the road in front of the shophouses. Nobody chopes a table yet, and nobody delivers: a hawker with a cart comes down the street to you.",
    sources: [["Roots: Hawker Culture", "https://www.roots.gov.sg/stories-landing/stories/hawker-culture"], ["Roots collection: tok tok mee cart", "https://www.roots.gov.sg/collection-landing/listing/1121135"]],
  },
  "1980s": {
    text: "Ceiling fans and contract cleaners who clear up after you. Free seating was the rule, but some hawkers still kept the tables by their stall for their own customers, until 1992 at People's Park. Nobody chopes with tissue yet.",
    sources: [["Roots: The View from Above", "https://www.roots.gov.sg/stories-landing/stories/hawker-centres-the-view-from-above/story"], NB("newnation19820723-1.2.23.1", "New Nation, 23 July 1982"), NB("straitstimes19920114-1.2.7.1.2", "Straits Times, 14 January 1992")],
  },
  today: {
    text: "Lunch rush. Chope with a packet of tissue, queue with the GrabFood and foodpanda riders, and return your tray: the rule since 1 September 2021.",
    sources: [NB("today20010208-1.2.12.1", "TODAY, 8 February 2001"), ["NEA, June 2024: tray return", "https://www.nea.gov.sg/media/news/advisories/index/cleaner-tables-in-hawker-centres-and-coffeeshops"], ["Eatbook: Deliveroo leaves Singapore", "https://eatbook.sg/deliveroo-closure/"]],
  },
  2065: {
    text: "Our guess: solar roofs, robot cleaners, and riders still waiting at the counters. NEA offered in 2023 to co-fund robots that clean tables and carry trays.",
    sources: [["Mothership, March 2023", "https://mothership.sg/2023/03/cleaning-solutions-hawker-centres/"]],
  },
};
// Two centres with "Don't chope seats" house rules (NEA's reply, September 2017).
const NO_CHOPE = /Tiong Bahru Market|Our Tampines Hub/i;
const NO_CHOPE_SRC = ["Mothership, September 2017", "https://mothership.sg/2017/09/after-6-complaint-letters-to-straits-times-nea-highlights-no-choping-house-rules-at-2-hawker-centres/"];
const TRAY_RULE = ["NEA, May 2021: returning trays and clearing tables becomes mandatory", "https://www.nea.gov.sg/media/news/news/index/mandatory-for-diners-to-return-dirty-trays-crockery-and-clean-table-litter-at-hawker-centres-coffeeshops-and-food-courts"];

// The map's dots: the same colours as centremap.js uses.
const MAP_COLOURS = [["#f2b632", "Famous, looks like itself"], ["#23303a", "HDB block"], ["#c8553d", "Other centres"]];

const CAM_NOTES = { above: "See the whole hall from above", behind: "Over your shoulder", eyes: "Through your own eyes" };
const LOOK_KEYS = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

function displayName(name) {
  const m = /^(.*?)\s*\((.+)\)\s*$/.exec(name ?? "");
  return m ? { main: m[2], sub: m[1] } : { main: name ?? "", sub: "" };
}

// replaceChildren, minus the parts a condition left out (it would print "null").
const fill = (el, ...kids) => el.replaceChildren(...kids.filter((k) => k != null && k !== false));

const yearOf = (c) => Number(String(c?.year ?? "").match(/\d{4}/)?.[0]) || null;
// A profiled centre's own name ("Maxwell Food Centre"), else the NEA name's everyday part.
const nameOf = (c) => profileFor(c)?.displayName?.replace(/\s*\(.*\)$/, "") ?? displayName(c.name).main;
// Every name a centre goes by, for matching photos, videos and menus.
const namesOf = (c) => [c.name, displayName(c.name).main, displayName(c.name).sub, profileFor(c)?.displayName].filter(Boolean);

export function createWalkMode({ h, $, show, view, controls, sfx, store, touchy, mountTouch, playerLook, onQuit, setLook, setPeople }) {
  const ui = {
    query: "",
    pick: CENTRES.find((c) => c.id === store.get("makan-walk-centre", null)) ?? CENTRES.find((c) => /Maxwell/.test(c.name)) ?? CENTRES[0],
    era: store.get("makan-walk-era", "today"),
    cam: CAMS.some((c) => c.id === store.get("makan-walk-cam", "")) ? store.get("makan-walk-cam", "above") : touchy ? "behind" : "above",
    guide: store.get("makan-walk-guide", true),
    region: "All",
    sort: SORTS.some((x) => x.id === store.get("makan-walk-sort", "")) ? store.get("makan-walk-sort", "famous") : "famous",
    hdbOnly: false,
    view: store.get("makan-walk-view", "list") === "map" ? "map" : "list",
  };
  let foot = null;
  let run = null; // { plan, w, view, acc, ... } while walking
  let wv = null;

  async function footprints() {
    if (foot) return foot;
    try {
      foot = (await import("../../data/hawker-footprints.json")).default ?? { centres: {} };
    } catch {
      foot = { centres: {} };
    }
    return foot;
  }

  const link = ([title, href]) => h("a", { href, target: "_blank", rel: "noopener", text: title });
  const seg = (name, label, options, value, onPick) =>
    h(
      "div",
      { class: "seg", role: "radiogroup", "aria-label": label },
      ...options.map((o) =>
        h(
          "label",
          { title: o.note ?? "" },
          h("input", { type: "radio", name, value: o.id, checked: value === o.id, onchange: () => onPick(o.id) }),
          h("span", { text: o.name }),
        ),
      ),
    );

  // ---------- Picking a centre ----------

  // A photo of the picked centre, its credit, and a walk-through to watch, filled in once they load.
  async function fillPhoto(centre) {
    const box = $("walkPhoto");
    if (!box) return;
    const [photos, videos] = await Promise.all([centrePhotos(namesOf(centre)), videosFor({ centre: nameOf(centre), group: "walk" })]);
    if (ui.pick !== centre || !$("walkPhoto")) return;
    let p = photos[0];
    let caption = null;
    // Centres without a free photo get NEA's own, linked from NEA's site.
    if (!p && centre.photo) p = { url: centre.photo, author: "NEA, via data.gov.sg", licence: "", page: CENTRES_SOURCE[1], caption: nameOf(centre), remote: true };
    if (p) {
      caption = h("figcaption", {}, `${p.caption ?? nameOf(centre)}. `, h("a", { href: p.page, target: "_blank", rel: "noopener", text: `Photo: ${creditLine(p)}` }));
    }
    fill($("walkPhoto"),
      ...(p ? [h("img", { src: p.remote ? p.url : mediaUrl(`photos/${p.file}`), alt: p.caption ?? `${nameOf(centre)}`, loading: "lazy", referrerpolicy: "no-referrer" }), caption] : []),
      ...(videos.length ? [h("div", { class: "wphoto__vids" }, ...videos.slice(0, 2).map((v, i) => videoButton(v, i ? "Another walk round" : `Walk round the real ${nameOf(centre)}`)))] : []),
    );
    $("walkPhoto").hidden = !p && !videos.length;
  }

  async function fillEraPhoto(era) {
    const box = $("walkEraPhoto");
    if (!box) return;
    const [photos, videos] = await Promise.all([era === "1950s" || era === "1980s" ? photosOf(["historical", "street"], era) : Promise.resolve([]), videosFor({ group: "history", era })]);
    if (ui.era !== era || !$("walkEraPhoto")) return;
    const p = photos[0];
    fill($("walkEraPhoto"),
      ...(p ? [h("img", { src: mediaUrl(`photos/${p.file}`), alt: p.caption ?? "", loading: "lazy" }), h("figcaption", {}, `${p.caption}${p.year ? `, ${p.year}` : ""}. `, h("a", { href: p.page, target: "_blank", rel: "noopener", text: `Photo: ${creditLine(p)}` }))] : []),
      ...(videos.length ? [h("div", { class: "wphoto__vids" }, ...videos.slice(0, 2).map((v) => videoButton(v, v.shows ?? v.title)))] : []),
    );
    $("walkEraPhoto").hidden = !p && !videos.length;
  }

  // The picked centre as an HDB block: its block and storeys, the flats over it, and the blocks around it.
  async function fillHdb(centre) {
    const box = $("walkHdb");
    if (!box) return;
    const [fp] = await Promise.all([footprints(), loadHdb()]);
    if (ui.pick !== centre || !$("walkHdb")) return;
    const hd = hdbOf(centre);
    const cutoff = ui.era === "1980s" ? 1989 : null;
    const near = aroundSummary(fp.centres?.[centre.id], cutoff);
    const lines = [];
    if (hd?.blocks.length) {
      const b = hd.blocks[0];
      const many = hd.blocks.length > 1;
      lines.push(
        h(
          "p",
          {},
          h("strong", { text: `${blockName(hd.blocks)} ` }),
          many ? "are HDB blocks, numbered like the flats around them. " : `is an HDB block, numbered like the flats around it: ${b.floors} ${b.floors === 1 ? "storey" : "storeys"}, completed in ${b.year} by HDB's count${b.year > 1990 && yearOf(centre) && yearOf(centre) < b.year ? " (the year of a rebuild)" : ""}. `,
          h("a", { href: `../block/?${new URLSearchParams({ b: b.blk, s: b.street })}`, target: "_blank", rel: "noopener", text: `Blk ${b.blk}'s birthday` }),
        ),
      );
    } else if (flatsOver(hd).length) lines.push(h("p", {}, h("strong", { text: `${nameOf(centre)} ` }), "shares its building with HDB flats."));
    const flats = flatsOver(hd);
    if (flats.length) {
      const f = flats[0];
      const own = hd.blocks.some((b) => b.blk === f.blk && b.street === f.street);
      const who = f.blk ? `Blk ${f.blk}${f.street ? ` ${streetName(f.street)}` : ""}` : "A block of flats";
      const more = flats.length > 1 ? ` ${flats.length - 1} more ${flats.length > 2 ? "blocks stand" : "block stands"} on it too.` : "";
      const line = own ? `The block has ${f.units ? `${f.units} homes` : "flats"} over the food centre.${more}` : `${who}, ${f.storeys} storeys${f.units ? ` and ${f.units} homes` : ""}, stands on the same building as the food centre.${more}`;
      lines.push(h("p", {}, h("strong", { text: "People live upstairs. " }), line));
    }
    const tower = towerOver(hd);
    if (tower) lines.push(h("p", {}, h("strong", { text: "Look up. " }), `A ${tower.levels}-storey tower stands on the same building, mapped in OpenStreetMap.`));
    if (near) {
      const homes = near.homes ? ` with ${near.homes.toLocaleString()} homes` : "";
      const which =
        near.n === 1
          ? `Within about 150 m: Blk ${near.oldest.blk}, ${near.tallest.floors} storeys, completed ${near.oldest.year}${homes}.`
          : `Within about 150 m: ${near.n} HDB blocks${homes}. The oldest is Blk ${near.oldest.blk} (${near.oldest.year}), the tallest Blk ${near.tallest.blk} at ${near.tallest.floors} storeys.`;
      lines.push(
        h(
          "p",
          {},
          `${which} In the game ${near.n === 1 ? "it stands" : "they stand"} at real height with the block number painted on, and blocks of flats stand on their void decks.`,
          cutoff ? " Blocks HDB lists as completed after 1989 are left out in the 1980s." : "",
        ),
      );
    }
    if (!lines.length) {
      box.hidden = true;
      return;
    }
    fill(box, h("p", { class: "walk__hdbhead", text: "In an HDB estate" }), ...lines, h("p", { class: "cnote" }, "From HDB's property data and NEA's list, matched by block and street; the blocks around are matched through OpenStreetMap's addresses. ", ...HDB_SOURCES.flatMap((src, i) => [i ? " · " : "", link(src)])));
    box.hidden = false;
  }

  // The picked centre from the street: the nearest open 360-degree photo, and Google Street View on request.
  // Kept between redraws of the picker, so the view does not jump back while someone types a search.
  async function fillStreet(centre) {
    const box = $("walkStreet");
    if (!box) return;
    if (ui.sv?.id === centre.id) {
      box.replaceChildren(ui.sv.view.el);
      box.hidden = false;
      return;
    }
    const sv = await loadStreetView();
    if (ui.pick !== centre || !$("walkStreet")) return;
    ui.sv?.view.destroy();
    ui.sv = { id: centre.id, view: streetView(h, centre, sv.centres?.[centre.id] ?? []) };
    $("walkStreet").replaceChildren(ui.sv.view.el);
    $("walkStreet").hidden = false;
  }

  // The map of Singapore with the centres on it (centremap.js, loaded on first use).
  async function placeMap(list, pick) {
    const box = $("walkMapBox");
    if (!box) return;
    if (!ui.cmap) {
      const { CentreMap } = await import("./centremap.js");
      ui.cmap ??= new CentreMap({
        onPick: (c) => {
          ui.pick = c;
          renderPicker();
        },
      });
    }
    const here = $("walkMapBox");
    if (!here || ui.view !== "map") return;
    here.replaceChildren(ui.cmap.el);
    ui.cmap.start();
    ui.cmap.show(
      list.map(([c, p]) => ({ c, tag: p ? "famous" : inHdb(c) ? "hdb" : "other", name: nameOf(c) })),
      pick,
    );
  }

  function renderPicker() {
    const root = $("walk");
    const q = ui.query.trim().toLowerCase();
    // Every centre that matches, in the chosen region and order; the list scrolls.
    const all = browseCentres(CENTRES, { query: ui.query, region: ui.region, sort: ui.sort, nameOf });
    // Only the centres that are HDB blocks, or the podium of one, once that data has loaded.
    const list = ui.hdbOnly ? all.filter(([c]) => inHdb(c)) : all;
    const hdbCount = CENTRES.filter((c) => inHdb(c)).length;
    const search = h("input", { type: "search", id: "walkSearch", placeholder: `Search ${CENTRES.length} hawker centres by name, street or area`, value: ui.query, "aria-label": "Search hawker centres", autocomplete: "off" });
    search.addEventListener("input", () => {
      ui.query = search.value.slice(0, 60);
      renderPicker();
      const again = $("walkSearch");
      again?.focus();
      again?.setSelectionRange(again.value.length, again.value.length);
    });
    search.addEventListener("keydown", (e) => e.key === "Enter" && list[0] && ((ui.pick = list[0][0]), renderPicker()));
    const pick = ui.pick;
    const profile = profileFor(pick);
    const built = yearOf(pick) ?? (profile?.opened ? Number(String(profile.opened).match(/\d{4}/)?.[0]) : null);
    const preset = presetFor({ profile, centre: pick, eraId: ui.era });
    const before = preset.archetype === "street";
    fill(root,
      h("p", { class: "kicker", text: "Customer" }),
      h("h2", { class: "panel__title", text: "Makan at a hawker centre" }),
      h("p", { class: "lede lede--small", text: "Walk round a real hawker centre with a makan list. Chope a table, queue at the stalls, order a kopi in kopi code, carry your trays back, eat, and clear up the way people did in that era. Delivery riders queue with you." }),
      h("h3", { class: "step" }, h("span", { text: "1" }), " Which centre?"),
      search,
      ...browseControls(
        h,
        { prefix: "walk", region: ui.region, sort: ui.sort, shown: list.length, centres: CENTRES, query: ui.query },
        (id) => ((ui.region = id), renderPicker()),
        (id) => ((ui.sort = id), store.set("makan-walk-sort", id), renderPicker()),
      ),
      h(
        "div",
        { class: "pickrow pickrow--wrap" },
        seg("walkShow", "Show the centres as", [{ id: "list", name: "List" }, { id: "map", name: "Map" }], ui.view, (id) => {
          ui.view = id;
          store.set("makan-walk-view", id);
          renderPicker();
        }),
      ),
      hdbCount
        ? h(
            "label",
            { class: "hdbonly" },
            h("input", { type: "checkbox", checked: ui.hdbOnly, onchange: (e) => ((ui.hdbOnly = e.target.checked), renderPicker()) }),
            h("span", { text: `Only the ${hdbCount} in HDB blocks or under HDB flats${ui.hdbOnly ? `: ${list.length} showing` : ""}` }),
          )
        : null,
      ui.view === "map"
        ? h(
            "div",
            { class: "cmapwrap" },
            h("div", { class: "cmapbox", id: "walkMapBox" }),
            h("p", { class: "cmapkey" }, ...MAP_COLOURS.map(([colour, text]) => h("span", {}, h("i", { style: `background:${colour}` }), text)), h("span", { class: "cnote", text: pick ? `Picked: ${nameOf(pick)}` : "" })),
          )
        : null,
      h(
        "div",
        { class: `cpick cpick--scroll${ui.view === "map" ? " is-hidden" : ""}`, id: "walkCentres", role: "radiogroup", "aria-label": "Hawker centre" },
        ...list.map(([c, p, a]) =>
          h(
            "button",
            {
              type: "button",
              class: `cpick__item${pick?.id === c.id ? " is-on" : ""}`,
              role: "radio",
              "aria-checked": String(pick?.id === c.id),
              onclick: () => {
                ui.pick = c;
                renderPicker();
              },
            },
            h("strong", { text: nameOf(c) }),
            // NEA's own name underneath when people know the centre by another.
            [displayName(c.name).main, displayName(c.name).sub].find((n) => n && n !== nameOf(c)) ? h("small", { class: "cname__sub", text: [displayName(c.name).main, displayName(c.name).sub].find((n) => n && n !== nameOf(c)) }) : null,
            h("span", { text: `${a.area ? `${a.area} · ` : ""}${c.stalls ?? "?"} cooked food stalls · built ${c.yearLabel || "year unknown"}` }),
            p ? h("span", { class: "cpick__famous", text: `Known for ${famousIn(p).slice(0, 3).map((f) => DISHES[f.id]?.name.toLowerCase()).filter(Boolean).join(", ")}` }) : null,
            hdbTag(c) ? h("span", { class: "cpick__hdb", text: hdbTag(c) }) : null,
          ),
        ),
      ),
      list.length ? null : h("p", { class: "cnote", text: "No centre by that name here. Try a street, an estate, an area like Bedok, or All regions." }),
      h("figure", { class: "wphoto", id: "walkPhoto", hidden: true }),
      h("div", { class: "walk__street", id: "walkStreet", hidden: true }),
      h("div", { class: "walk__hdb", id: "walkHdb", hidden: true }),
      h("p", { class: "cnote" }, "From NEA's list of hawker centres. ", link(CENTRES_SOURCE)),
      h("h3", { class: "step" }, h("span", { text: "2" }), " When?"),
      seg("walkEra", "Era", ERAS.map((e) => ({ id: e.id, name: e.years })), ui.era, (id) => {
        ui.era = id;
        renderPicker();
      }),
      h("p", { class: "cnote" }, `${ERA_NOTES[ui.era].text} `, ...ERA_NOTES[ui.era].sources.flatMap((src, i) => [i ? " · " : "", link(src)])),
      h("figure", { class: "wphoto wphoto--era", id: "walkEraPhoto", hidden: true }),
      before ? h("p", { class: "cnote walk__before", text: `${nameOf(pick)} was built ${built ? `in ${built}` : "later"}. Before that, hawkers sold on the street, so you'll eat at a row of pushcarts in front of shophouses instead.` }) : null,
      h("h3", { class: "step" }, h("span", { text: "3" }), " How do you want to see it?"),
      h("div", { class: "pickrow" }, h("span", { class: "pickrow__label", text: "View" }), seg("walkCam", "View", CAMS.map((c) => ({ ...c, note: CAM_NOTES[c.id] })), ui.cam, (id) => ((ui.cam = id), store.set("makan-walk-cam", id), renderPicker()))),
      h("div", { class: "pickrow" }, h("span", { class: "pickrow__label", text: "Look" }), seg("walkLook", "Look", LOOKS, realism(), (id) => (setLook(id), renderPicker()))),
      h("div", { class: "pickrow" }, h("span", { class: "pickrow__label", text: "People" }), seg("walkPeople", "People", PEOPLE, peopleSetting(), (id) => (setPeople(id), renderPicker()))),
      h("p", { class: "cnote", text: `${CAM_NOTES[ui.cam]}. ${LOOKS.find((l) => l.id === realism())?.note ?? ""}. Change either any time with V and the menu.` }),
      h("p", { class: "cnote" }, "The building's outline is from OpenStreetMap where it has one, and the number of stalls is NEA's. Where the stalls and tables stand inside is our arrangement in the usual hawker centre patterns, not a survey of the real floor. Building outlines © ", link(["OpenStreetMap contributors", "https://www.openstreetmap.org/copyright"]), " (ODbL)."),
      h(
        "div",
        { class: "actions" },
        h("button", { class: "ghost", type: "button", text: "Back", onclick: () => show("home") }),
        h("button", { class: "go", type: "button", id: "walkGo", text: "Go makan", onclick: () => start() }),
      ),
    );
    fillPhoto(pick);
    fillStreet(pick);
    fillHdb(pick);
    if (ui.view === "map") placeMap(list, pick);
    fillEraPhoto(ui.era);
    keepScroll($("walkCentres"), (ui.scroll ??= {}), `${ui.query}|${ui.region}|${ui.sort}`, ui.revealPick);
    ui.revealPick = false;
  }

  // ---------- Walking ----------

  async function start() {
    sfx.start?.();
    // The street view's own 3D view is not needed while walking.
    ui.sv?.view.destroy();
    ui.sv = null;
    store.set("makan-walk-centre", ui.pick.id);
    store.set("makan-walk-era", ui.era);
    $("walkGo") && ($("walkGo").textContent = "Laying out the centre...");
    await new Promise((r) => requestAnimationFrame(() => r()));
    const [fp] = await Promise.all([footprints(), loadHdb()]);
    const centre = ui.pick;
    const hd = hdbOf(centre);
    const profile = profileFor(centre);
    const preset = presetFor({ profile, centre, eraId: ui.era });
    const famous = famousIn(profile).map((f) => f.id);
    // Flats standing on the centre come from hawker-hdb.json and are laid out with the outline.
    const footprint = fp.centres?.[centre.id] ? { ...fp.centres[centre.id], over: hd?.over ?? [] } : null;
    const plan = planCentre({ centre, preset, footprint, eraId: ui.era, famous, hint: LAYOUT_HINTS[profile?.key] ?? null });
    const seed = Math.floor(Math.random() * 1e6) + 1;
    // A full lunch crowd on High; a little thinner on Medium and Low, so phones keep up.
    const crowd = [0.55, 0.8, 1][view.qualityLevel] ?? 1;
    const w = createWalk(plan, { eraId: ui.era, seed, famous, crowd });
    // Real stalls we have sourced menus for: the famous stall wears its real name today.
    const real = ui.era === "today" || ui.era === "2065" ? await realStalls(namesOf(centre)) : [];
    const signs = {};
    const realFor = new Map();
    for (const s of plan.stalls.filter((x) => x.famous)) {
      const r = real.find((st) => st.items?.some((it) => it.dish && famous.includes(it.dish) && s.menu && stallSells(plan, s, it.dish)) && ![...realFor.values()].includes(st));
      if (r) {
        realFor.set(s.id, r);
        if (ui.era === "today") signs[s.id] = r.stall.toUpperCase();
      }
    }
    wv ??= new WalkView(view.renderer, view);
    wv.setCam(ui.cam);
    wv.load(plan, w, { era: eraById(ui.era), preset, look: playerLook(), centreName: centre.name, signs, hdb: { own: hd?.blocks ?? [], around: hdbAround() } });
    await manifest("dishes");
    const now = controls.poll()[0] ?? {};
    run = { plan, w, view: wv, acc: 0, centre, profile, preset, footprint, real: realFor, paused: false, toastT: 0, order: null, mapBase: null, seen: { p: now.p ?? 0, d: now.d ?? 0, t: now.t ?? 0, u: false }, pending: { p: 0, d: 0 }, lookHold: 0, ease: null, routeKey: "", routeT: 0, nextKey: "" };
    window.__walk = run;
    show(null);
    $("hud").hidden = true;
    $("walkHud").hidden = false;
    $("walkDone").hidden = true;
    if (touchy) {
      mountTouch($("touch"), controls, "one", { grab: "Use", use: "Go", useHint: "", dash: "Hurry", toss: "Map" });
      // A tap on Go can be shorter than a frame, so it acts on the press itself.
      $("touch")
        .querySelector(".tbtn--use")
        ?.addEventListener("pointerdown", () => {
          if (!run) return;
          run.touchGo = performance.now();
          go();
        });
      $("touch").hidden = false;
    }
    renderHudStatic();
    syncCam();
    ambience(true);
    toast(plan.kind === "street" ? "Find your food among the pushcarts." : w.rules.chope ? "Busy one. Chope a table first: tissue packet on it." : "Find a table, then your food.");
    // Say plainly where the hall is the game's own guess at the size.
    const note = plan.notes.includes("part")
      ? "OpenStreetMap maps this centre as part of a bigger building, so the hall here is sized for its stalls."
      : plan.notes.includes("scaled")
        ? "The mapped outline has less floor than NEA's stall count needs (some centres spread over two floors), so this hall is drawn bigger."
        : plan.source === "synthetic"
          ? "OpenStreetMap has no outline for this centre yet, so the hall is a plain rectangle."
          : plan.market?.length
            ? "The rows of low counters are the wet market. NEA counts only the cooked food stalls."
            : null;
    if (note) setTimeout(() => run?.w === w && toast(note), 3600);
    // The HDB estate round the centre, said once it is in view.
    const shown = wv.hdbShown;
    const estate = hd?.blocks.length
      ? `${blockName(hd.blocks)}${flatsOver(hd).length ? ", with people living upstairs" : ""}.`
      : flatsOver(hd).length
        ? "The flats on this centre's building are drawn from OpenStreetMap."
        : towerOver(hd)
          ? "The tower on this centre's building is drawn from OpenStreetMap."
          : "";
    const blocksLine = shown?.blocks ? (shown.blocks === 1 ? " The HDB block beside it stands at its real height, with its real number." : ` The ${shown.blocks} HDB blocks round it stand at their real height, with their real numbers.`) : "";
    if (plan.kind !== "street" && (estate || blocksLine)) setTimeout(() => run?.w === w && toast(`${estate}${blocksLine}`.trim()), note ? 9000 : 3600);
    if (!store.get("makan-walk-help", false)) help(true);
    onResize();
  }

  const stallSells = (plan, s, dish) => stallMenu({ plan, era: eraById(ui.era) }, s.id).some((o) => o.dish === dish);

  function stop() {
    $("walkHud").hidden = true;
    $("walkOrder").hidden = true;
    for (const el of $("walkTags").children) el.remove();
    ambience(false);
    if (document.pointerLockElement) document.exitPointerLock?.();
    run = null;
  }

  // The sound of the hall: chatter from field recordings (media/audio.json) that never loops the same
  // way twice, with the odd plate, cleaver or pour somewhere in the room (ambience.js).
  let amb = null;
  async function ambience(on) {
    if (!on) {
      amb?.stop();
      amb = null;
      return;
    }
    const m = await manifest("audio");
    const files = Object.entries(m ?? {})
      .filter(([f]) => /ambience/.test(f))
      .map(([f, meta]) => ({ url: mediaUrl(`audio/${f}`), seconds: meta?.seconds ?? 20 }));
    if (!files.length || !run || amb) return;
    const volume = Math.min(1, (store.get("makan-music", 70) / 100) * 0.55);
    const extra = () => {
      if (!run || run.paused) return;
      const pan = (Math.random() - 0.5) * 1.4;
      const r = Math.random();
      if (r < 0.6) sfx.play?.("plate", { pan, gain: 0.22 });
      else if (r < 0.85) sfx.play?.("chop", { pan, gain: 0.18 });
      else sfx.play?.("pour", { pan, gain: 0.25 });
    };
    amb = new HallSound(files, { volume, extra });
    amb.start();
  }

  function tick(dt) {
    if (!run) return;
    const { w } = run;
    const cam = wv.cam;
    if (!run.paused && !w.done) {
      const input = controls.poll()[0] ?? {};
      // The controls count presses since the start; what matters is how many are new. They wait for the
      // next step of the kitchen clock, so a fast screen never drops one.
      const fresh = (k) => {
        const n = Math.max(0, (input[k] ?? 0) - (run.seen[k] ?? 0));
        run.seen[k] = input[k] ?? 0;
        return n;
      };
      run.pending.p += fresh("p");
      run.pending.d += fresh("d");
      if (fresh("t")) $("walkMap").classList.toggle("is-big");
      // The touch "Go" button (and Space, Q, a pad's X): walk to the next step.
      if (input.u && !run.seen.u && performance.now() - (run.touchGo ?? 0) > 500) go();
      run.seen.u = Boolean(input.u);
      let mx = input.mx ?? 0;
      let mz = input.mz ?? 0;
      let face = null;
      run.lookHold = Math.max(0, run.lookHold - dt);
      if (cam !== "above") {
        // Close views: forward and back along the view, sideways to strafe, turn with the mouse, a finger,
        // the right stick or the left and right arrows.
        const down = controls.down;
        const k = (c) => controls.enabled && down.has(c);
        let fwd;
        let strafe;
        if (LOOK_KEYS.some(k)) {
          fwd = (k("KeyW") || k("ArrowUp") ? 1 : 0) - (k("KeyS") || k("ArrowDown") ? 1 : 0);
          strafe = (k("KeyD") ? 1 : 0) - (k("KeyA") ? 1 : 0);
          const turn = (k("ArrowRight") ? 1 : 0) - (k("ArrowLeft") ? 1 : 0);
          if (turn) {
            wv.turn(-turn * dt * 2.3);
            run.lookHold = 1.2;
          }
        } else {
          fwd = -mz;
          strafe = mx;
        }
        const pad = controls.enabled ? navigator.getGamepads?.()?.[0] : null;
        if (pad) {
          const rx = pad.axes[2] ?? 0;
          const ry = pad.axes[3] ?? 0;
          if (Math.abs(rx) > 0.2 || Math.abs(ry) > 0.2) {
            wv.turn(-rx * dt * 2.6, -ry * dt * 1.8);
            run.lookHold = 1.2;
          }
        }
        const fx = Math.sin(wv.yaw);
        const fz = Math.cos(wv.yaw);
        mx = fx * fwd - fz * strafe;
        mz = fz * fwd + fx * strafe;
        face = [fx, fz];
        // Walking yourself somewhere or sitting down: the view turns to where you are going.
        const me = w.me;
        if (run.lookHold <= 0) {
          if (me.auto && me.autoDir) wv.ease(me.autoDir[0], me.autoDir[1], dt, 3.2, cam === "eyes" ? -0.06 : null);
          else if (run.ease && (run.ease.t -= dt) > 0) wv.ease(run.ease.x - me.x, run.ease.z - me.z, dt, 5, run.ease.pitch ?? null);
          else if (me.queue !== null) {
            const s = run.plan.stalls[me.queue];
            wv.ease(s.x - me.x, s.z - me.z, dt, 2.5, cam === "eyes" ? 0.02 : null);
          }
        }
      }
      run.acc += dt;
      let steps = 0;
      while (run.acc >= TICK && steps < 6) {
        stepWalk(w, TICK, { mx, mz, p: run.pending.p, d: run.pending.d, face, aim: cam === "eyes" });
        run.pending.p = 0;
        run.pending.d = 0;
        run.acc -= TICK;
        steps++;
      }
      if (steps === 6) run.acc = 0;
      for (const e of drainWalkEvents(w)) react(e);
    }
    if (w.ordering !== null && !run.order) openOrder(w.ordering);
    guide(dt);
    // How far between the last step and the next this frame falls, for drawing people smoothly.
    run.view.frame(dt, w, run.paused || w.done ? 1 : Math.min(1, run.acc / TICK));
    renderHud();
    renderTags();
    placeSay(dt);
    drawMap();
    if (run.toastT > 0 && (run.toastT -= dt) <= 0) $("walkToast").classList.remove("is-on");
  }

  // ---------- The guide: what to do next, the dotted path, and Go ----------

  function guide(dt) {
    const { w, plan } = run;
    const step = nextStep(w);
    run.step = step;
    const key = step?.text ?? "";
    if (key !== run.nextKey) {
      run.nextKey = key;
      $("walkNextText").textContent = step ? step.text : "";
      $("walkNext").hidden = !step;
      $("walkGoBtn").hidden = !step?.target;
    }
    $("walkGoBtn").classList.toggle("is-going", Boolean(w.me.auto));
    if (!ui.guide || !step?.target || w.me.sitting !== null) {
      if (run.routeKey) {
        run.routeKey = "";
        wv.setRoute(null);
      }
      return;
    }
    const me = w.me;
    const goalAt = step.target.kind === "exit" ? null : targetPoint(w, step.target);
    // Walking yourself there: the path you are on. Otherwise a fresh path now and then.
    if (me.auto?.path) {
      wv.setRoute([[me.x, me.z], ...me.auto.path.slice(me.auto.k)], goalAt);
      run.routeKey = "auto";
      return;
    }
    const rk = `${step.target.kind}${step.target.id ?? ""}`;
    run.routeT -= dt;
    const moved = run.routeFrom ? Math.hypot(me.x - run.routeFrom[0], me.z - run.routeFrom[1]) : Infinity;
    if (rk !== run.routeKey || (run.routeT <= 0 && moved > 1.2)) {
      run.routeKey = rk;
      run.routeT = 0.8;
      run.routeFrom = [me.x, me.z];
      const to = step.target.kind === "exit" ? plan.spawns.reduce((b, p) => (Math.hypot(p[0] - me.x, p[1] - me.z) < Math.hypot(b[0] - me.x, b[1] - me.z) ? p : b), plan.spawns[0]) : goalAt;
      const path = to ? findPath(plan, [me.x, me.z], to, { maxNodes: 30000 }) : null;
      run.route = path;
      wv.setRoute(path, goalAt);
    } else if (run.route?.length) {
      // Keep the start of the path under your feet between updates.
      run.route[0] = [me.x, me.z];
    }
  }

  function go(target = run?.step?.target) {
    if (!run || !target) return;
    if (run.w.me.auto && target === run.step?.target) {
      stopGoing(run.w);
      return;
    }
    if (!goToward(run.w, target)) toast("Can't find a way there from here. Try walking a little first.");
    run.lookHold = 0;
  }

  function react([type, ...args]) {
    const play = (s) => sfx.play?.(s);
    switch (type) {
      case "chope":
        play("drop");
        if (NO_CHOPE.test(run.centre.name)) return toast("Choped, though this centre's house rules say don't chope seats. NEA has no penalty for it.");
        return toast(`Choped. Your ${run.w.rules.chope} keeps the table while you queue.`);
      case "shoo":
        play("nope");
        return toast(`The hawker at ${run.plan.stalls[args[0]].no} shoos you off: these tables are for that stall's customers. Try a table with no stall's stools.`);
      case "toktok":
        return play("tick");
      case "unchope":
        play("pick");
        return toast("Tissue back in your pocket.");
      case "join":
        play("pick");
        return toast("In the queue. Wait your turn.");
      case "leave-queue":
        return toast("You left the queue.");
      case "your-turn":
        return play("order");
      case "cooking": {
        // The hawker calls your order back in the stall's language, then gets to work: the wok roars, or
        // the kopi is pulled.
        const [id, items = []] = args;
        const hp = wv.hawkerPeople?.[id];
        items
          .map(calloutFor)
          .filter(Boolean)
          .forEach((c, i) => say(c.key, { persona: hp?.persona ?? "uncle", seed: id * 7 + i, line: c.line, urgent: i === 0, onShow: (shown) => showSay(id, c.line, shown) }));
        const acts = items.map((it) => ACTION_OF[it.dish]);
        if (acts.includes("wok")) clip("wok", 0.5);
        else if (acts.includes("pull")) clip("kopi", 0.7);
        return;
      }
      case "pay":
        return play("plate");
      case "tray":
        play("serve");
        return toast("Tray in hand. Take it to your table.");
      case "place":
        play("plate");
        return toast(run.w.list.every((i) => i.placed) ? "Everything is here. Sit down and makan." : "Food on the table. What else is on the list?");
      case "sit": {
        play("drop");
        const t = run.plan.tables[run.w.me.sitting];
        if (t) run.ease = { x: t.x, z: t.z, t: 1.2, pitch: wv.cam === "eyes" ? -0.55 : null };
        return;
      }
      case "ate":
        play("cheer");
        return toast(run.w.rules.trays ? "Shiok. Now stack your tray and take it to tray return." : "Shiok. Leave the plates, the cleaner will clear them, and head out.");
      case "return":
        play("serve");
        return toast("Tray returned. Thank you! Head out when you're ready.");
      case "leave-plates":
        return toast("Plates left for the cleaner. Head out when you're ready.");
      case "buy-tissue":
        play("pick");
        return toast("Three more packets of tissue.");
      case "arrive": {
        const [target, x, z] = args;
        if (target?.kind !== "exit") run.ease = { x, z, t: 0.9 };
        return;
      }
      case "go-stuck":
        return toast("Too crowded that way. Walk round, then try Go again.");
      case "nope":
        play("nope");
        return toast(args[0]);
      case "done":
        return finish();
    }
  }

  // A speech bubble over the hawker who is speaking: the words, how to say them, and what they mean.
  function showSay(stall, line, shown) {
    if (!run) return;
    run.say = { stall, t: 3.4 };
    fill(
      $("walkSay"),
      h("strong", { text: line.say }),
      line.roman ? h("small", { class: "wsay__roman", text: line.roman }) : null,
      h("small", { class: "wsay__mean", text: shown?.via === "text" ? `${line.mean} (no voice on this device)` : line.mean }),
    );
  }

  function placeSay(dt) {
    const el = $("walkSay");
    if (!run?.say || (run.say.t -= dt) <= 0) {
      el.hidden = true;
      if (run) run.say = null;
      return;
    }
    const hp = wv.hawkerPeople?.[run.say.stall];
    const p = hp ? wv.toScreen(hp.x, 2.05, hp.z) : null;
    el.hidden = !p?.on;
    if (p?.on) el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
  }

  // A short sound from the hall's recordings (media/audio.json): the wok, or kopi being poured. Each time
  // from a different point in the recording, a touch faster or slower, for three to six seconds, faded out.
  const clips = {};
  function clip(name, vol = 0.6) {
    try {
      const a = (clips[name] ??= new Audio(mediaUrl(`audio/${name}.mp3`)));
      // Still going from last time: let it run rather than jump back.
      if (!a.paused && a.volume > 0.05) return;
      clearInterval(a._fade);
      a.preservesPitch = false;
      a.playbackRate = 0.92 + Math.random() * 0.16;
      const len = Number.isFinite(a.duration) ? a.duration : 20;
      a.currentTime = Math.random() * Math.max(0, len - 7);
      a.volume = Math.min(1, vol * (0.8 + Math.random() * 0.4) * (store.get("makan-music", 70) / 100) * 1.4);
      a.play().catch(() => {});
      const hold = 3000 + Math.random() * 3000;
      clearTimeout(a._stop);
      a._stop = setTimeout(() => {
        a._fade = setInterval(() => {
          a.volume = Math.max(0, a.volume - 0.04);
          if (a.volume <= 0) {
            clearInterval(a._fade);
            a.pause();
          }
        }, 50);
      }, hold);
    } catch {}
  }

  function toast(text) {
    if (!run) return;
    const el = $("walkToast");
    el.textContent = text;
    el.classList.add("is-on");
    run.toastT = 3.4;
  }

  // ---------- The HUD ----------

  function renderHudStatic() {
    const { centre, w } = run;
    $("walkWhere").textContent = run.plan.kind === "street" ? `Street hawkers, before ${nameOf(centre)} · ${w.era.years}` : `${nameOf(centre)} · ${w.era.name}, ${w.era.years}`;
    run.listKey = "";
    run.promptKey = "";
  }

  function renderHud() {
    const { w } = run;
    const key = w.list.map((i) => `${i.got}${i.placed}`).join() + w.me.money + w.me.tissue;
    if (key !== run.listKey) {
      run.listKey = key;
      fill($("walkList"),
        ...w.list.map((it) =>
          h(
            "li",
            { class: `wlist__item${it.placed ? " is-done" : it.got ? " is-got" : ""}` },
            h("span", { class: "wlist__tick", text: it.placed ? "✓" : it.got ? "•" : "" }),
            h(
              "span",
              { class: "wlist__what" },
              h("strong", { text: it.dish === "drink" ? (it.got ? it.code : "A drink") : it.label }),
              it.dish === "drink" && !it.got ? h("small", { text: it.label }) : null,
              h("small", { class: "wlist__who", text: `for ${it.who.toLowerCase() === "you" ? "you" : it.who}` }),
            ),
            // Take me to the nearest stall that sells it.
            !it.got
              ? h("button", {
                  class: "wlist__go",
                  type: "button",
                  text: "Go",
                  "aria-label": `Walk to a stall that sells ${it.dish === "drink" ? "drinks" : it.label}`,
                  onclick: (e) => {
                    e.stopPropagation();
                    const s = stallsToVisit(run.w).find((x) => x.item === it);
                    if (s) go({ kind: "stall", id: s.id });
                  },
                })
              : null,
          ),
        ),
      );
      $("walkMoney").textContent = money(w.me.money);
      $("walkTissue").textContent = w.rules.chope ? `${w.me.tissue} tissue` : "";
      $("walkTissue").hidden = !w.rules.chope;
    }
    const t = w.prompt;
    const keyHint = touchy ? "Use" : wv.cam === "eyes" ? "Click or E" : "E";
    // Only things you can do get the key in front; the rest is just said.
    const text = t ? (["queue", "eating", "wait", "choped", "taken", "nope", "mine", "free"].includes(t.kind) ? t.text : `${keyHint}: ${t.text}`) : w.me.ate ? "Head out when you're done" : "";
    if (text !== run.promptKey) {
      run.promptKey = text;
      $("walkPrompt").textContent = text;
      $("walkPrompt").hidden = !text;
    }
    const secs = Math.floor(w.t);
    if (secs !== run.secs) {
      run.secs = secs;
      $("walkClock").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    }
  }

  // Floating tags: the stalls that sell what is still on your list (the nearest two for each), your
  // table, and the tray returns once you are carrying one. Close up, only the near ones.
  function renderTags() {
    const { w, plan } = run;
    const want = [];
    const me = w.me;
    const close = wv.cam !== "above";
    const far = (x, z) => close && wv.distance(x, z) > 32;
    for (const it of w.list) {
      if (it.got) continue;
      const near = it.stalls
        .map((id) => plan.stalls[id])
        .sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))
        .slice(0, 2);
      for (const s of near) if (!far(s.front[0], s.front[1])) want.push({ key: `s${s.id}`, x: s.front[0], y: 3.1, z: s.front[1], text: it.dish === "drink" ? "Drinks" : DISHES[it.dish].name, kind: "food" });
    }
    const mine = w.tables.findIndex((tb) => tb.mine);
    if (mine >= 0 && !(close && me.sitting !== null)) want.push({ key: "mine", x: plan.tables[mine].x, y: 1.6, z: plan.tables[mine].z, text: "Your table", kind: "mine" });
    // The table you are waiting by: how close they are to getting up.
    const ws = run.step;
    if (ws?.waiting && ws.target?.kind === "table") {
      const t = plan.tables[ws.target.id];
      const f = finishIn(w, ws.target.id);
      want.push({ key: `w${ws.target.id}`, x: t.x, y: 1.55, z: t.z, text: f <= 0.1 ? "Free! Chope it" : f < 6 ? "Getting up" : "Almost done", kind: "wait" });
    }
    if (wv.cam === "above") want.push({ key: "me", x: wv.meAt[0], y: me.sitting !== null ? 1.9 : 2.5, z: wv.meAt[1], text: "You", kind: "me" });
    if (me.hold?.dirty) {
      plan.trayReturns
        .map((r, k) => [Math.hypot(r.x - me.x, r.z - me.z), r, k])
        .sort((a, b) => a[0] - b[0])
        .slice(0, 2)
        .forEach(([, r, k]) => want.push({ key: `r${k}`, x: r.x, y: 2.0, z: r.z, text: "Tray return", kind: "tray" }));
    }
    if (w.rules.chope === "tissue" && me.tissue === 0) plan.sellers.forEach((s, k) => want.push({ key: `t${k}`, x: s.x, y: 1.8, z: s.z, text: "Tissue", kind: "tray" }));
    const root = $("walkTags");
    const seen = run.tagSeen ?? (run.tagSeen = new Set());
    seen.clear();
    const els = (run.tagEls ??= new Map());
    for (const t of want) {
      seen.add(t.key);
      let el = els.get(t.key);
      if (!el || el.textContent !== t.text) {
        el?.remove();
        el = h("span", { class: `wtag wtag--${t.kind}`, "data-k": t.key, text: t.text });
        root.append(el);
        els.set(t.key, el);
      }
      const p = wv.toScreen(t.x, t.y, t.z);
      el.hidden = !p.on;
      if (p.on) el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
    }
    for (const [k, el] of els) {
      if (seen.has(k)) continue;
      el.remove();
      els.delete(k);
    }
  }

  // A small map of the whole centre in the corner. The building and stalls are drawn once. Open big, a
  // tap on a stall or a table walks you there.
  function mapFrame() {
    const { plan } = run;
    const cv = $("walkMap");
    const small = innerWidth < 640;
    const big = cv.classList.contains("is-big");
    const size = big ? Math.min(small ? innerWidth - 24 : 420, innerHeight - 140) : small ? 104 : 150;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const b = plan.bounds;
    const pad = 6;
    const span = Math.max(b.x1 - b.x0, b.z1 - b.z0) + 4;
    const k = (size * dpr - pad * 2 * dpr) / span;
    return { cv, size, dpr, k, X: (x) => (size * dpr) / 2 + (x - (b.x0 + b.x1) / 2) * k, Z: (z) => (size * dpr) / 2 + (z - (b.z0 + b.z1) / 2) * k, big };
  }

  function drawMap() {
    const { plan, w } = run;
    const { cv, size, dpr, k, X, Z } = mapFrame();
    if (cv.width !== Math.round(size * dpr)) {
      cv.width = cv.height = Math.round(size * dpr);
      cv.style.width = cv.style.height = `${size}px`;
      run.mapBase = null;
    }
    if (!run.mapBase) {
      const base = document.createElement("canvas");
      base.width = cv.width;
      base.height = cv.height;
      const g = base.getContext("2d");
      g.fillStyle = "rgba(255,250,240,0.94)";
      g.fillRect(0, 0, base.width, base.height);
      g.fillStyle = "#e8dcc4";
      g.strokeStyle = "#2b1b12";
      g.lineWidth = 1.5 * dpr;
      g.beginPath();
      plan.outline.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = "#c9c2b2";
      for (const t of plan.tables) g.fillRect(X(t.x) - 0.5 * k, Z(t.z) - 0.5 * k, k, k);
      for (const s of plan.stalls) {
        g.fillStyle = s.menu === "drinks" ? "#2d4f9c" : s.famous ? "#f2b632" : "#8a5a3a";
        g.fillRect(X(s.x) - 1.5 * k, Z(s.z) - 1.5 * k, 3 * k * 0.92, 3 * k * 0.92);
      }
      g.fillStyle = "#2f6b4f";
      for (const r of plan.trayReturns) g.fillRect(X(r.x) - 0.5 * k, Z(r.z) - 0.5 * k, k, k);
      run.mapBase = base;
    }
    const g = cv.getContext("2d");
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(run.mapBase, 0, 0);
    // The guide's path.
    const route = wv.route;
    if (ui.guide && route?.length > 1) {
      g.strokeStyle = "#e8892e";
      g.lineWidth = 2 * dpr;
      g.setLineDash([3 * dpr, 3 * dpr]);
      g.beginPath();
      route.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
      g.stroke();
      g.setLineDash([]);
    }
    // What you still need, your table, and you.
    for (const it of w.list) {
      if (it.got) continue;
      g.fillStyle = "#c8553d";
      for (const id of it.stalls) {
        const s = plan.stalls[id];
        g.beginPath();
        g.arc(X(s.front[0]), Z(s.front[1]), 2.4 * dpr, 0, Math.PI * 2);
        g.fill();
      }
    }
    const mine = w.tables.findIndex((tb) => tb.mine);
    if (mine >= 0) {
      g.fillStyle = "#2f6b4f";
      g.beginPath();
      g.arc(X(plan.tables[mine].x), Z(plan.tables[mine].z), 3.4 * dpr, 0, Math.PI * 2);
      g.fill();
    }
    const me = w.me;
    g.save();
    g.translate(X(me.x), Z(me.z));
    const dir = wv.cam === "above" ? [me.fx, me.fz] : [Math.sin(wv.yaw), Math.cos(wv.yaw)];
    g.rotate(Math.atan2(dir[0], -dir[1]));
    g.fillStyle = "#f2b632";
    g.strokeStyle = "#2b1b12";
    g.lineWidth = 1.2 * dpr;
    g.beginPath();
    g.moveTo(0, -6 * dpr);
    g.lineTo(4.5 * dpr, 4.5 * dpr);
    g.lineTo(-4.5 * dpr, 4.5 * dpr);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  // A tap on the big map: the nearest stall, table or tray return to that spot, or the spot itself.
  function mapClick(e) {
    if (!run) return;
    const cv = $("walkMap");
    if (!cv.classList.contains("is-big")) {
      cv.classList.add("is-big");
      return;
    }
    const { dpr, k, big } = mapFrame();
    if (!big) return;
    const r = cv.getBoundingClientRect();
    const px = (e.clientX - r.left) * dpr;
    const pz = (e.clientY - r.top) * dpr;
    const b = run.plan.bounds;
    const x = (px - cv.width / 2) / k + (b.x0 + b.x1) / 2;
    const z = (pz - cv.height / 2) / k + (b.z0 + b.z1) / 2;
    const near = (pts, max) => pts.map((p, i) => [Math.hypot(p[0] - x, p[1] - z), i]).filter(([d]) => d < max).sort((a, c) => a[0] - c[0])[0]?.[1] ?? null;
    const plan = run.plan;
    const s = near(plan.stalls.map((st) => [st.x, st.z]), 2.6);
    const t = s === null ? near(plan.tables.map((tb) => [tb.x, tb.z]), 1.4) : null;
    const tr = s === null && t === null ? near(plan.trayReturns.map((q) => [q.x, q.z]), 1.6) : null;
    const target = s !== null ? { kind: "stall", id: s } : t !== null ? { kind: "table", id: t } : tr !== null ? { kind: "return", id: tr } : { kind: "point", x, z };
    if (target.kind === "stall" && run.w.me.hold) target.kind = "point", Object.assign(target, { x: plan.stalls[s].front[0], z: plan.stalls[s].front[1] });
    cv.classList.remove("is-big");
    go(target);
  }

  // ---------- Camera ----------

  function syncCam() {
    const cam = wv?.cam ?? ui.cam;
    $("walkCamBtn").textContent = CAMS.find((c) => c.id === cam)?.name ?? "View";
    $("walkCamBtn").setAttribute("aria-label", `View: ${CAMS.find((c) => c.id === cam)?.name}. V to change.`);
    $("walkAim").hidden = cam !== "eyes";
    $("walkHud").dataset.cam = cam;
    $("walkZoomIn").hidden = $("walkZoomOut").hidden = cam === "eyes";
    for (const input of document.querySelectorAll("input[name=walkCam2]")) input.checked = input.value === cam;
  }

  function setCam(id) {
    ui.cam = id;
    store.set("makan-walk-cam", id);
    wv?.setCam(id);
    if (id === "above" && document.pointerLockElement) document.exitPointerLock?.();
    syncCam();
    if (run) toast(`${CAM_NOTES[id]}.${id !== "above" && !touchy ? " Click the scene to look round with the mouse, Esc to let go." : id !== "above" ? " Drag to look round." : ""}`);
  }

  function cycleCam() {
    const i = CAMS.findIndex((c) => c.id === (wv?.cam ?? ui.cam));
    setCam(CAMS[(i + 1) % CAMS.length].id);
  }

  // Looking round: the mouse (locked to the page after a click, or dragged), a finger dragged across the
  // scene, or the right stick.
  const canvas = view.renderer.domElement;
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (!run || run.paused || run.order || wv.cam === "above" || $("walkHud").hidden) return;
    if (e.pointerType === "mouse") {
      if (document.pointerLockElement === canvas) {
        if (e.button === 0) run.pending.p += 1;
        return;
      }
      if (!touchy && e.button === 0) {
        try {
          const req = canvas.requestPointerLock?.();
          req?.catch?.(() => {});
        } catch {}
      }
    }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
  });
  addEventListener("pointermove", (e) => {
    if (!run || !wv || wv.cam === "above") return;
    if (document.pointerLockElement === canvas) {
      wv.turn(-e.movementX * 0.0024, -e.movementY * 0.002);
      run.lookHold = 1.2;
      return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    const s = e.pointerType === "touch" ? 0.0065 : 0.004;
    wv.turn(-dx * s, -dy * s * 0.8);
    run.lookHold = 1.2;
  });
  const endDrag = (e) => {
    if (drag && e.pointerId === drag.id) {
      // A tap on the scene (not a drag) in your own eyes uses what you look at.
      if (e.pointerType === "touch" && drag.moved < 8 && run && wv.cam === "eyes") run.pending.p += 1;
      drag = null;
    }
  };
  addEventListener("pointerup", endDrag);
  addEventListener("pointercancel", endDrag);

  // ---------- Ordering at a stall ----------

  // The thumb sticks sit above the HUD, so they step aside while a sheet or menu is open.
  const touchPad = (on) => touchy && ($("touch").hidden = !on);

  function openOrder(id) {
    run.order = { id, picking: null };
    touchPad(false);
    if (document.pointerLockElement) document.exitPointerLock?.();
    renderOrder();
    $("walkOrder").hidden = false;
    controls.enabled = false;
    controls.release?.();
  }

  function closeOrder() {
    doneOrdering(run.w);
    run.order = null;
    $("walkOrder").hidden = true;
    controls.enabled = true;
    touchPad(true);
  }

  // A sourced note on what the real stall charges, where we know it.
  function realNote(s, menu) {
    const r = run.real?.get(s.id);
    if (!r || run.w.eraId !== "today") return null;
    const items = r.items.filter((it) => it.dish && menu.some((o) => o.dish === it.dish)).slice(0, 2);
    if (!items.length) return null;
    const text = items.map((it) => `${it.name} ${it.prices.map((p) => money(p)).join(" / ")}${it.note ? ` (${it.note})` : ""}`).join("; ");
    return h("p", { class: "worder__real" }, h("strong", { text: `At the real ${r.stall}${r.date ? `, ${r.date}` : ""}: ` }), `${text}. `, r.source ? link(r.source) : null);
  }

  function dishThumb(dish) {
    const d = run.dishPhotos?.dishes?.[dish];
    return d ? h("img", { class: "worder__pic", src: mediaUrl(`dishes/${d.file}`), alt: "", loading: "lazy", width: 44, height: 44 }) : h("span", { class: "worder__pic worder__pic--none", "aria-hidden": "true" });
  }

  async function renderOrder() {
    const { w, plan } = run;
    run.dishPhotos ??= await manifest("dishes");
    run.loops ??= await loadLoops();
    if (!run?.order) return;
    const s = plan.stalls[run.order.id];
    const menu = stallMenu(w, s.id);
    const basket = w.me.basket;
    // Still wanted: on the list, not yet collected, and not already on the tray from this visit.
    const same = (o, x) => x.dish === o.dish && (o.dish === "drink" || x.variant === o.variant);
    const onTray = (o) => basket.filter((b) => same(o, b)).length;
    const onList = (o) => w.list.filter((it) => !it.got && same(o, it)).length > onTray(o);
    let body;
    run.order.keys = [];
    if (run.order.picking) {
      const item = run.order.picking;
      const choices = drinkChoices(item, w.random);
      const pickDrink = (c) => {
        const r = buy(w, { dish: "drink", drink: c.state });
        if (!r.ok) return toast(r.why);
        if (!c.ok) {
          w.stats.wrong++;
          toast("Uncle makes exactly what you said. Hmm, is that what was on the list?");
        }
        run.order.picking = null;
        renderOrder();
      };
      run.order.keys = choices.map((c) => () => pickDrink(c));
      body = h(
        "div",
        { class: "worder__kopi" },
        h("p", {}, h("strong", { text: `${item.who === "You" ? "You want" : `${item.who} wants`}: ` }), item.label),
        h("p", { class: "cnote", text: "Say it in kopi code. The uncle only understands the code." }),
        ...choices.map((c, i) => h("button", { class: "worder__item", type: "button", onclick: () => pickDrink(c) }, h("kbd", { class: "worder__key", text: String(i + 1) }), h("span", { text: c.code }))),
        h("button", { class: "link", type: "button", text: "Back to the menu", onclick: () => ((run.order.picking = null), renderOrder()) }),
      );
    } else {
      const choose = (o) => {
        if (o.dish === "drink") {
          const want = w.list.find((it) => it.dish === "drink" && !it.got);
          if (want) {
            run.order.picking = want;
            return renderOrder();
          }
        }
        const r = buy(w, { dish: o.dish, variant: o.variant, drink: o.dish === "drink" ? w.list.find((it) => it.dish === "drink")?.drink ?? null : null });
        if (!r.ok) return toast(r.why);
        renderOrder();
      };
      run.order.keys = menu.map((o) => () => choose(o));
      body = h(
        "div",
        { class: "worder__menu" },
        ...menu.map((o, i) => {
          const broke = w.me.money + 1e-9 < o.price;
          return h(
            "button",
            { class: `worder__item${onList(o) ? " is-list" : ""}${broke ? " is-broke" : ""}`, type: "button", disabled: broke, onclick: () => choose(o) },
            dishThumb(o.dish),
            h("span", { class: "worder__name" }, h("kbd", { class: "worder__key", text: i < 9 ? String(i + 1) : "" }), o.label),
            onList(o) ? h("small", { class: "worder__badge", text: "on your list" }) : onTray(o) ? h("small", { class: "worder__badge worder__badge--tray", text: "on your tray" }) : broke ? h("small", { class: "worder__badge worder__badge--broke", text: "not enough" }) : null,
            h("span", { class: "worder__price", text: money(o.price) }),
          );
        }),
      );
    }
    const cooking = (await videosFor({ group: "cooking" })).filter((v) => v.dishes?.some((d) => menu.some((o) => o.dish === d)));
    if (!run?.order) return;
    // The stall's work as a loop over the sheet: the first dish on its menu that has one. Kept between
    // redraws of the sheet, so it does not start again at every pick.
    const looped = menu.find((o) => run.loops[o.dish]);
    if (looped && run.order.loopFor !== looped.dish) {
      run.order.loopFor = looped.dish;
      run.order.loopFig = loopFigure(h, run.loops[looped.dish], { size: "strip" });
    }
    fill($("walkOrder"),
      h(
        "div",
        { class: "worder" },
        h("p", { class: "kicker", text: `${s.no} · ${run.view.signs?.[s.id] ?? s.sign}` }),
        h("h2", { class: "panel__title", text: "Your turn. What would you like?" }),
        looped ? run.order.loopFig : null,
        h("p", { class: "cnote", text: `You have ${money(w.me.money)}.${s.famous ? " This is the stall with the famous queue." : ""}${touchy ? "" : " Number keys pick, Enter when done."}` }),
        realNote(s, menu),
        body,
        basket.length ? h("p", { class: "worder__basket", text: `On your tray: ${basket.map((b) => (b.dish === "drink" ? "a drink" : DISHES[b.dish].name)).join(", ")}` }) : null,
        cooking.length ? h("div", { class: "worder__vids" }, h("span", { class: "cnote", text: "Watch a real hawker make it: " }), ...cooking.slice(0, 2).map((v) => videoButton(v, v.shows ?? v.title))) : null,
        h("div", { class: "actions" }, h("button", { class: "go", type: "button", id: "walkOrderDone", text: basket.length ? "That's all, thanks" : "Never mind", onclick: closeOrder })),
      ),
    );
  }

  // ---------- The end ----------

  async function finish() {
    const { w, centre, profile } = run;
    const sum = walkSummary(w);
    const era = w.era;
    if (document.pointerLockElement) document.exitPointerLock?.();
    ambience(false);
    const fact = factFor({ era: era.id, dishes: w.list.map((i) => i.dish), centre: profile?.key ?? null }, Math.floor(w.t));
    const lines = [];
    if (sum.chope) lines.push(sum.choped ? `You choped a table with a packet of ${sum.chope}.` : "You found a table without choping. Lucky.");
    if (sum.trays) lines.push(sum.returned ? "You returned your tray." : "You left your tray behind. Since 1 September 2021, clearing your own tray is the rule at hawker centres.");
    else if (era.id === "1980s") lines.push("You left your plates for the contract cleaners, the way it was done before tray return.");
    if (sum.ownTables) lines.push(sum.shooed ? `A hawker shooed you off their table ${sum.shooed === 1 ? "once" : `${sum.shooed} times`}. Free seating was the rule from at least 1982, but People's Park was still switching over in 1992.` : "Some tables belonged to the stall beside them. Free seating was the rule from at least 1982, but People's Park was still switching over in 1992.");
    if (sum.choped && NO_CHOPE.test(centre.name)) lines.push("This centre asks diners not to chope seats.");
    $("walkHud").hidden = true;
    const [photos, walks, history] = await Promise.all([centrePhotos(namesOf(centre)), videosFor({ centre: nameOf(centre), group: "walk" }), videosFor({ group: "history", era: era.id })]);
    const p = photos[0];
    const vids = [...walks.slice(0, 1).map((v) => videoButton(v, `The real ${nameOf(centre)} today`)), ...history.slice(0, 1).map((v) => videoButton(v, v.shows ?? v.title))];
    fill($("walkDone"),
      h("p", { class: "kicker", text: `${nameOf(centre)} · ${era.name}` }),
      h("h2", { class: "panel__title", text: "Makan done" }),
      p ? h("figure", { class: "wphoto wphoto--done" }, h("img", { src: mediaUrl(`photos/${p.file}`), alt: p.caption ?? nameOf(centre), loading: "lazy" }), h("figcaption", {}, `${p.caption}. `, h("a", { href: p.page, target: "_blank", rel: "noopener", text: `Photo: ${creditLine(p)}` }))) : null,
      h("ul", { class: "wdone__list" }, ...sum.list.map((it) => h("li", { class: it.got ? "is-done" : "" }, h("span", { text: it.got ? "✓ " : "✗ " }), it.code ? `${it.code} (${it.label.replace(/\.$/, "")})` : it.label, h("small", { text: ` for ${it.who.toLowerCase() === "you" ? "you" : it.who}` })))),
      h("p", { text: `${money(sum.spent)} spent, ${money(sum.left)} left. ${Math.floor(sum.seconds / 60)} min ${sum.seconds % 60} s in the centre, ${sum.queued} s of it queueing, at ${sum.stalls} stall${sum.stalls === 1 ? "" : "s"}.` }),
      ...lines.map((t) => h("p", { text: t })),
      h("p", { class: "cnote" }, ...[...(sum.trays ? [TRAY_RULE] : []), ...ERA_NOTES[era.id].sources, ...(sum.choped && NO_CHOPE.test(centre.name) ? [NO_CHOPE_SRC] : [])].flatMap((src, i) => [i ? " · " : "", link(src)])),
      fact ? h("p", { class: "tipcard tipcard--inline" }, h("strong", { text: `${fact.when}. ` }), fact.text, " ", ...fact.sources.slice(0, 1).map(link)) : null,
      vids.length ? h("div", { class: "wphoto__vids" }, ...vids) : null,
      h(
        "div",
        { class: "actions" },
        h("button", { class: "ghost", type: "button", text: "Main menu", onclick: () => quit() }),
        h("button", { class: "ghost", type: "button", text: "Another centre", onclick: () => (stop(), open()) }),
        h("button", { class: "go", type: "button", text: "Again here", onclick: () => start() }),
      ),
    );
    show("walkDone");
  }

  // centreId: open on that centre (Block Birthday links here with ?makan=<NEA id>).
  function open(centreId = null) {
    const c = centreId ? CENTRES.find((x) => x.id === centreId) : null;
    if (c) ui.pick = c;
    ui.revealPick = true;
    // The HDB tags and filter appear once their data is in.
    if (!hdbReady()) loadHdb().then(() => !run && renderPicker());
    renderPicker();
    show("walk");
  }

  function quit() {
    stop();
    onQuit?.();
  }

  function pause(on = !run?.paused) {
    if (!run) return;
    run.paused = on;
    if (on && document.pointerLockElement) document.exitPointerLock?.();
    $("walkPause").hidden = !on;
    controls.enabled = !on;
    touchPad(!on);
    if (on) {
      for (const input of document.querySelectorAll("input[name=walkLook2]")) input.checked = input.value === realism();
      for (const input of document.querySelectorAll("input[name=walkPeople2]")) input.checked = input.value === peopleSetting();
      for (const input of document.querySelectorAll("input[name=walkGuide2]")) input.checked = input.value === (ui.guide ? "on" : "off");
      syncCam();
    }
  }

  // The controls for the view you are in, shown once at the start and from the menu.
  function help(on) {
    const el = $("walkHelp");
    el.hidden = !on;
    if (run) touchPad(!on);
    if (!on) {
      store.set("makan-walk-help", true);
      return;
    }
    const cam = wv?.cam ?? ui.cam;
    const lines = touchy
      ? [["Stick", "walk"], [cam === "above" ? "Use" : "Drag", cam === "above" ? "chope, queue, sit, return" : "look round"], ["Use", "chope, queue, sit, return"], ["Go", "walk to your next step"], ["Map", "the whole centre; tap a stall to go"]]
      : [
          ["WASD", cam === "above" ? "walk" : "walk and step sideways"],
          ...(cam === "above" ? [] : [["Mouse", "click the scene, then look round"], ["← →", "turn"]]),
          ["E", cam === "eyes" ? "or click: use what you look at" : "chope, queue, sit, return"],
          ["G or Space", "walk to your next step"],
          ["V", "Above, Behind or Eyes"],
          ["M", "map; click a stall to go"],
          ["Shift", "hurry"],
        ];
    fill(el,
      h("p", { class: "whelp__title", text: "How to makan" }),
      h("dl", {}, ...lines.flatMap(([k, v]) => [h("dt", {}, h("kbd", { text: k })), h("dd", { text: v })])),
      h("button", { class: "go", type: "button", text: "Got it", onclick: () => help(false) }),
    );
  }

  function onResize() {
    if (wv) wv.rect = null;
    run?.view.fit();
  }

  // Cartoon, Soft or Real, changed from a menu while walking.
  function relook() {
    run?.view.relook();
  }

  // Wiring for the HUD's own buttons.
  $("walkZoomIn").addEventListener("click", () => run?.view.setZoom(run.view.zoom * 0.8));
  $("walkZoomOut").addEventListener("click", () => run?.view.setZoom(run.view.zoom * 1.25));
  $("walkPauseBtn").addEventListener("click", () => pause(true));
  $("walkCamBtn").addEventListener("click", () => cycleCam());
  $("walkGoBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    go();
  });
  $("walkResume").addEventListener("click", () => pause(false));
  $("walkHelpBtn").addEventListener("click", () => {
    pause(false);
    help(true);
  });
  $("walkQuit").addEventListener("click", () => {
    pause(false);
    quit();
  });
  for (const input of document.querySelectorAll("input[name=walkCam2]")) input.addEventListener("change", () => setCam(input.value));
  for (const input of document.querySelectorAll("input[name=walkLook2]")) input.addEventListener("change", () => setLook(input.value));
  for (const input of document.querySelectorAll("input[name=walkPeople2]")) input.addEventListener("change", () => setPeople(input.value));
  for (const input of document.querySelectorAll("input[name=walkGuide2]"))
    input.addEventListener("change", () => {
      ui.guide = input.value === "on";
      store.set("makan-walk-guide", ui.guide);
      if (!ui.guide) wv?.setRoute(null);
      if (run) run.routeKey = "";
    });
  $("walkMap").addEventListener("click", mapClick);
  // Tap the list's title to fold it away to one line, and again to open it.
  $("walkFold").addEventListener("click", () => document.querySelector(".wcard").classList.toggle("is-min"));
  addEventListener(
    "wheel",
    (e) => {
      if (!run || run.paused || $("walkHud").hidden || wv.cam === "eyes" || e.target.closest?.(".worder-wrap")) return;
      run.view.setZoom(run.view.zoom * (e.deltaY > 0 ? 1.1 : 0.9));
    },
    { passive: true },
  );
  addEventListener("keydown", (e) => {
    if (!run || $("walkHud").hidden || videoOpen() || e.target.closest?.("input, textarea, select")) return;
    if (!$("walkHelp").hidden && e.code !== "Tab") {
      help(false);
      if (e.code === "Escape") return;
    }
    if (run.order) {
      if (e.code === "Escape" || e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        if (e.code !== "Escape" && run.order.picking) return;
        return closeOrder();
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 9 && run.order.keys?.[n - 1]) {
        e.preventDefault();
        run.order.keys[n - 1]();
      }
      return;
    }
    if (e.code === "Escape") return pause();
    if (run.paused) return;
    if (e.code === "KeyM" || e.code === "Tab") {
      e.preventDefault();
      $("walkMap").classList.toggle("is-big");
    }
    if (e.code === "KeyV") cycleCam();
    if (e.code === "KeyG") go();
    if (e.code === "Equal" || e.code === "NumpadAdd") run.view.setZoom(run.view.zoom * 0.85);
    if (e.code === "Minus" || e.code === "NumpadSubtract") run.view.setZoom(run.view.zoom * 1.15);
  });

  return {
    open,
    tick,
    onResize,
    relook,
    get active() {
      return Boolean(run) && !$("walkHud").hidden;
    },
    get running() {
      return Boolean(run);
    },
  };
}
