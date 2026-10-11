// The Hawker Passport screen: a map of Singapore's hawker centres, the apprentice trail, mentors and stamps.
import { localCentrePhoto } from "./media.js";
import { loopFigure } from "./loops.js";
import centresData from "../../data/hawker-centres.json";
import landData from "../../data/hawker-singapore.json";
import { avatarSvg } from "./chefs.js";
import { distanceKm, eraOfYear, isOpen, STAGES, STOPS } from "./campaign.js";
import { DISHES } from "./dishes.js";
import { factFor } from "./archive.js";
import { famousIn, profileByKey, profileFor } from "./profiles.js";
import { eraById } from "./eras.js";
import { blockName, flatsOver, hdbOf, hdbReady, inHdb } from "./hdb.js";

export const CENTRES = centresData.centres;
export const CENTRES_SOURCE = [centresData.source, centresData.sourceUrl];

const SVG = "http://www.w3.org/2000/svg";
const ERA_COLORS = { "1950s": "#8a5a30", "1980s": "#2f6b4f", today: "#c8553d", 2065: "#2a8f8a" };

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

function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
  el.append(...kids);
  return el;
}

// Our own SVG strings, built from hex colours only.
export function avatar(look, size = 56) {
  const doc = new DOMParser().parseFromString(avatarSvg(look, size), "image/svg+xml");
  return document.importNode(doc.documentElement, true);
}

export const centreByName = (name) => CENTRES.find((c) => c.name === name) ?? null;

// A Wikimedia Commons photo from a centre's profile, shown from Commons with its credit and licence.
export function profilePhoto(profile, { small = false } = {}) {
  // A copy kept with the game (works offline), else the profile's photo from Commons.
  const local = profile ? localCentrePhoto([profile.displayName, profile.neaName].filter(Boolean)) : null;
  const ph = local ? { src: local.src, page: local.page, credit: local.author, licence: local.licence } : profile?.photos?.[0];
  if (!ph) return null;
  const img = h("img", { src: ph.src, alt: `${profile.displayName}`, loading: "lazy", decoding: "async", referrerpolicy: "no-referrer", width: small ? 160 : 320, height: small ? 107 : 213 });
  img.addEventListener("error", () => img.closest("figure")?.remove());
  return h("figure", { class: `cphoto${small ? " cphoto--small" : ""}` }, img, h("figcaption", {}, "Photo: ", h("a", { href: ph.page, target: "_blank", rel: "noopener", text: `${ph.credit}${ph.licence ? `, ${ph.licence}` : ""}` })));
}

// NEA's own photo of a centre, linked from NEA's site rather than copied.
export function centrePhoto(c, { small = false } = {}) {
  if (!c?.photo || !/^https:\/\/www\.nea\.gov\.sg\/images\/[\w\-/.]+\.(jpe?g|png)$/i.test(c.photo)) return null;
  const img = h("img", { src: c.photo, alt: `${c.name}, photographed by NEA`, loading: "lazy", decoding: "async", referrerpolicy: "no-referrer", width: small ? 160 : 320, height: small ? 107 : 213 });
  img.addEventListener("error", () => img.closest("figure")?.remove());
  return h("figure", { class: `cphoto${small ? " cphoto--small" : ""}` }, img, h("figcaption", {}, "Photo: NEA, via ", h("a", { href: CENTRES_SOURCE[1], target: "_blank", rel: "noopener", text: "data.gov.sg" })));
}

export function stopPoint(stop) {
  if (stop.spot) return { lat: stop.spot.lat, lng: stop.spot.lng };
  const c = centreByName(stop.centre);
  return c ? { lat: c.lat, lng: c.lng } : { lat: 1.35, lng: 103.82 };
}

export function stopPlace(stop) {
  if (stop.spot) return stop.spot.name;
  return profileByKey(stop.profile)?.displayName ?? centreByName(stop.centre)?.name ?? stop.centre;
}

// lng/lat to map units. Near the equator, degrees of longitude and latitude are about the same size.
const X = (lng) => (lng - 103.6) * 1000;
const Y = (lat) => (1.475 - lat) * 1000;
const W = 500;
const H = 285;
const LAND = landData.areas.map((a) => ({
  name: a.name,
  d: a.rings.map((r) => `M${r.map(([lng, lat]) => `${X(lng).toFixed(1)},${Y(lat).toFixed(1)}`).join("L")}Z`).join(""),
}));

function map({ stamps, selected, me, near, onPick, onCentre }) {
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "pmap", role: "img", "aria-label": "Map of Singapore with hawker centres and your trail. Tap a centre to see it." });
  // Land drawn three times: a dark outline, a fill on top that hides inner seams, then faint area borders.
  const coast = s("g", { stroke: "#2b1b12", "stroke-width": 2.2, "stroke-linejoin": "round", fill: "#2b1b12" });
  const fill = s("g", { fill: "#f6ead2" });
  const seams = s("g", { fill: "none", stroke: "#e2cfa9", "stroke-width": 0.5 });
  for (const a of LAND) {
    coast.append(s("path", { d: a.d }));
    fill.append(s("path", { d: a.d }));
    const seam = s("path", { d: a.d });
    seam.append(s("title", {}, a.name));
    seams.append(seam);
  }
  svg.append(s("rect", { x: 0, y: 0, width: W, height: H, fill: "#cfe3e8" }), coast, fill, seams);
  // Every NEA centre, coloured by the era its original building belongs to, with an ink ring when it is
  // an HDB block or has HDB flats on its building (once the HDB data has loaded).
  for (const c of CENTRES) {
    const era = eraOfYear(c.year, c.status);
    const hdb = inHdb(c);
    const dot = s("circle", { cx: X(c.lng).toFixed(1), cy: Y(c.lat).toFixed(1), r: hdb ? 2.6 : 2.2, fill: ERA_COLORS[era], "fill-opacity": 0.55, stroke: hdb ? "#2b1b12" : null, "stroke-width": hdb ? 0.8 : null, "stroke-opacity": 0.85 });
    dot.append(s("title", {}, `${c.name} (${c.status === "Under Construction" ? `due ${c.yearLabel}` : c.yearLabel})${hdb ? ", HDB" : ""}`));
    svg.append(dot);
  }
  // Tap near a centre to pick it: the nearest one within a fingertip, so the small dots work on phones.
  const mark = s("circle", { r: 4.6, fill: "none", stroke: "#2d4f9c", "stroke-width": 1.6, visibility: "hidden" });
  svg.append(mark);
  svg.addEventListener("click", (e) => {
    if (!onCentre || e.target.closest?.(".pin")) return;
    const m = svg.getScreenCTM();
    if (!m) return;
    const at = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const reach = 14 / m.a;
    let best = null;
    for (const c of CENTRES) {
      const d = Math.hypot(X(c.lng) - at.x, Y(c.lat) - at.y);
      if (d < reach && (!best || d < best.d)) best = { c, d };
    }
    if (!best) return;
    mark.setAttribute("cx", X(best.c.lng).toFixed(1));
    mark.setAttribute("cy", Y(best.c.lat).toFixed(1));
    mark.setAttribute("visibility", "visible");
    onCentre(best.c);
  });
  if (near) svg.append(s("circle", { cx: X(near.lng), cy: Y(near.lat), r: 7, fill: "none", stroke: "#2d4f9c", "stroke-width": 2.5 }));
  if (me) {
    svg.append(s("circle", { cx: X(me.lng), cy: Y(me.lat), r: 4.5, fill: "#2d4f9c", stroke: "#fff", "stroke-width": 1.5 }));
  }
  // The trail, joined up in order.
  const pts = STOPS.map(stopPoint);
  svg.append(s("polyline", { points: pts.map((p) => `${X(p.lng).toFixed(1)},${Y(p.lat).toFixed(1)}`).join(" "), fill: "none", stroke: "#2b1b12", "stroke-width": 1.2, "stroke-dasharray": "3 3", opacity: 0.6 }));
  STOPS.forEach((stop, i) => {
    const p = pts[i];
    const open = isOpen(stop.id, stamps);
    const done = Boolean(stamps[stop.id]);
    const g = s("g", { class: `pin${done ? " is-done" : ""}${open ? " is-open" : ""}${selected === stop.id ? " is-sel" : ""}`, tabindex: open ? 0 : -1, role: "button", "aria-label": `Stop ${i + 1}: ${stopPlace(stop)}` });
    g.append(
      s("circle", { cx: X(p.lng), cy: Y(p.lat), r: 6.5, fill: done ? ERA_COLORS[stop.era] : open ? "#fffaf0" : "#d8c9a8", stroke: "#2b1b12", "stroke-width": 1.5 }),
      s("text", { x: X(p.lng), y: Y(p.lat) + 3, "text-anchor": "middle", "font-size": 8, "font-weight": 700, fill: done ? "#fffaf0" : "#2b1b12" }, String(i + 1)),
    );
    // A stop at a real centre also fills the line under the map, with its links.
    const pickStop = () => {
      const c = stop.centre ? centreByName(stop.centre) : null;
      if (c && onCentre) {
        mark.setAttribute("visibility", "hidden");
        onCentre(c);
      }
      onPick(stop.id);
    };
    g.addEventListener("click", pickStop);
    g.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pickStop()));
    svg.append(g);
  });
  return svg;
}

// A centre's everyday name: a profiled centre's own name, else the part of NEA's name in brackets.
function nameOf(c) {
  const own = profileFor(c)?.displayName?.replace(/\s*\(.*\)$/, "");
  if (own) return own;
  const m = /^(.*?)\s*\((.+)\)\s*$/.exec(c.name);
  return m ? m[2] : c.name;
}

function builtLine(c) {
  if (c.status === "Under Construction") return `Being built, due around ${c.yearLabel}`;
  if (c.status === "Interim Centre") return `Interim centre, opened ${c.yearLabel}`;
  if (c.yearLabel === "Pre-war") return "Built before the war";
  if (!c.year) return "NEA gives no year";
  return `Built ${c.yearLabel}`;
}

// The line under the map for a picked centre: what NEA says, its HDB block, and where to go from here.
function centrePick(c, { onMakan }) {
  const hd = hdbOf(c);
  const blocks = hd?.blocks ?? [];
  const homes = blocks.length ? null : flatsOver(hd).length ? "HDB flats on its building" : null;
  const b = blocks[0];
  return [
    h(
      "p",
      { class: "pmap__what" },
      h("strong", { text: nameOf(c) }),
      ` · ${builtLine(c)}${c.stalls ? `, ${c.stalls} cooked food stalls` : ""}`,
      // HDB's year for a market block is often the year it was rebuilt, as the customer mode's picker says.
      blocks.length ? ` · ${blockName(blocks)}, an HDB block${b.year ? ` completed in ${b.year} by HDB's count${b.year > 1990 && c.year && c.year < b.year ? " (the year of a rebuild)" : ""}` : ""}` : homes ? ` · ${homes}` : "",
      ".",
    ),
    h(
      "p",
      { class: "pmap__acts" },
      onMakan ? h("button", { class: "ghost", type: "button", text: "Makan here", onclick: () => onMakan(c.id) }) : null,
      b ? h("a", { href: `../block/?${new URLSearchParams({ b: b.blk, s: b.street })}`, target: "_blank", rel: "noopener", text: `Blk ${b.blk}'s birthday` }) : null,
    ),
  ];
}

// What the stop's centre is known for today, with its source.
function famousLine(stop) {
  const f = famousIn(profileByKey(stop.profile)).filter((x) => DISHES[x.id]);
  if (!f.length) return null;
  return h("p", { class: "stop__famous" }, h("strong", { text: "Known for: " }), f.map((x) => DISHES[x.id].name).join(", "), ". ", h("a", { href: f[0].src[1], target: "_blank", rel: "noopener", text: f[0].src[0] }));
}

// A fact from the archives for the stop's era, dish or centre.
function archiveLine(stop) {
  const f = factFor({ era: stop.era, dishes: [stop.focus], centre: stop.profile ?? null }, stop.id.length);
  if (!f) return null;
  return h("p", { class: "archive-note" }, h("strong", { text: `From the archives, ${f.when}: ` }), f.text, " ", ...f.sources.slice(0, 1).map(([t, href]) => h("a", { href, target: "_blank", rel: "noopener", text: t })));
}

function stopCard(stop, i, { stamps, onCook, loops = {} }) {
  const open = isOpen(stop.id, stamps);
  const done = stamps[stop.id];
  const era = eraById(stop.era);
  const c = stop.centre ? centreByName(stop.centre) : null;
  const facts = stop.spot
    ? stop.spot.note
    : c
      ? `${c.name}. ${c.status === "Under Construction" ? `Under construction, due around ${c.yearLabel}` : `Original building completed ${c.yearLabel}`}${c.stalls ? `, ${c.stalls} cooked food stalls` : ""} (NEA).`
      : "";
  return h(
    "article",
    { class: `stop${done ? " is-done" : ""}${open ? "" : " is-locked"}`, style: `--era:${ERA_COLORS[stop.era]}`, id: `stop-${stop.id}` },
    h("p", { class: "stop__kicker", text: `Stop ${i + 1} · ${era.name}, ${era.years}` }),
    h("h3", { class: "stop__place", text: stopPlace(stop) }),
    h(
      "div",
      { class: "mentor" },
      avatar(stop.mentor.look, 60),
      h(
        "div",
        {},
        h("p", { class: "mentor__name" }, h("strong", { text: stop.mentor.name }), `, ${stop.mentor.who}`),
        ...stop.intro.map((line) => h("p", { class: "mentor__line", text: `“${line}”` })),
      ),
    ),
    (c ? centrePhoto(c) : null) ?? profilePhoto(profileByKey(stop.profile)),
    h("p", { class: "stop__facts", text: facts }),
    famousLine(stop),
    archiveLine(stop),
    h("p", { class: "stop__dish", text: `Cooking: ${DISHES[stop.focus]?.name ?? ""} and friends` }),
    // The next stop to cook shows its mentor's dish being made, where there is free footage of it.
    open && !done ? loopFigure(h, loops[stop.focus]) : null,
    h("p", { class: "stop__src" }, ...stop.sources.map(([t, href]) => h("a", { href, target: "_blank", rel: "noopener", text: t }))),
    done
      ? h("p", { class: "stamp", text: `STAMPED ${String(done).slice(0, 10)}` })
      : open
        ? h("button", { class: "go", type: "button", text: "Cook here", onclick: () => onCook(stop) })
        : h("p", { class: "stop__lock", text: "Earn the stamp before this to open it." }),
  );
}

export function renderPassport(root, opts) {
  const { stamps, passOn, selected = null, me = null, near = null } = opts;
  const pick = h("div", { class: "pmap__pick", "aria-live": "polite" }, h("p", { class: "pmap__hint", text: "Tap a centre on the map to see it." }));
  const count = STOPS.filter((s) => stamps[s.id]).length;
  const next = STOPS.find((s) => !stamps[s.id]);
  const parts = [
    h(
      "header",
      { class: "pass__head" },
      h("p", { class: "kicker", text: `Hawker Passport · ${count} of ${STOPS.length} stamps` }),
      h("h2", { class: "panel__title", text: next ? `Next: ${stopPlace(next)}` : "Every stamp collected" }),
      h("p", { class: "pass__story", text: "You start as an apprentice at a 1950s street stall. In every era a mentor teaches you one dish, then hands you the ladle. In 2065 you choose what to pass on." }),
      passOn?.dishes?.length
        ? h("p", { class: "pass__on" }, h("strong", { text: "Passed on: " }), `${passOn.dishes.map((d) => DISHES[d]?.name ?? d).join(", ")}${passOn.apprentice ? `, to ${passOn.apprentice}` : ""}.`)
        : null,
    ),
    map({
      stamps,
      selected,
      me,
      near,
      onPick: (id) => document.getElementById(`stop-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
      onCentre: (c) => pick.replaceChildren(...centrePick(c, opts).filter(Boolean)),
    }),
    h(
      "p",
      { class: "pmap__legend" },
      ...[["1980s", "Built before 1990"], ["today", "Built 1990 to 2026"], ["2065", "Still being built"]].map(([era, t]) => h("span", { style: `--c:${ERA_COLORS[era]}`, text: t })),
      hdbReady() ? h("span", { class: "pmap__ring", text: `HDB block, or HDB flats above (${CENTRES.filter(inHdb).length})` }) : null,
      h("a", { href: CENTRES_SOURCE[1], target: "_blank", rel: "noopener", text: `${CENTRES.length} NEA hawker centres, data.gov.sg` }),
      h("a", { href: landData.sourceUrl, target: "_blank", rel: "noopener", text: "Map: URA Master Plan 2019 boundaries" }),
    ),
    pick,
    opts.finder ?? null,
    ...STAGES.map((st) =>
      h(
        "section",
        { class: "stage" },
        h("h3", { class: "stage__title", style: `--era:${ERA_COLORS[st.era]}` }, h("span", { text: eraById(st.era).years }), st.name),
        h("p", { class: "stage__line", text: st.line }),
        ...STOPS.map((stop, i) => [stop, i]).filter(([stop]) => stop.era === st.era).map(([stop, i]) => stopCard(stop, i, opts)),
      ),
    ),
  ];
  root.replaceChildren(...parts.filter(Boolean));
}

// The nearest NEA centres to a point, closest first.
export function nearestCentres(point, n = 3) {
  return CENTRES.map((c) => ({ c, km: distanceKm(point, c) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}
