// Browsing NEA's 129 hawker centres: every one in a scrolling list, by URA region, in the order you like,
// and searchable by name, street or planning area. Shared by the customer mode and the Centre Manager.

import landData from "../../data/hawker-singapore.json";
import { CENTRES } from "./passport.js";
import { profileFor } from "./profiles.js";

// URA's five regions and the planning areas in each (Master Plan 2019), to browse the centres by area.
export const REGIONS = {
  Central: ["BISHAN", "BUKIT MERAH", "BUKIT TIMAH", "DOWNTOWN CORE", "GEYLANG", "KALLANG", "MARINA EAST", "MARINA SOUTH", "MARINE PARADE", "MUSEUM", "NEWTON", "NOVENA", "ORCHARD", "OUTRAM", "QUEENSTOWN", "RIVER VALLEY", "ROCHOR", "SINGAPORE RIVER", "SOUTHERN ISLANDS", "STRAITS VIEW", "TANGLIN", "TOA PAYOH"],
  East: ["BEDOK", "CHANGI", "CHANGI BAY", "PASIR RIS", "PAYA LEBAR", "TAMPINES"],
  North: ["CENTRAL WATER CATCHMENT", "LIM CHU KANG", "MANDAI", "SEMBAWANG", "SIMPANG", "SUNGEI KADUT", "WOODLANDS", "YISHUN"],
  "North-East": ["ANG MO KIO", "HOUGANG", "NORTH-EASTERN ISLANDS", "PUNGGOL", "SELETAR", "SENGKANG", "SERANGOON"],
  West: ["BOON LAY", "BUKIT BATOK", "BUKIT PANJANG", "CHOA CHU KANG", "CLEMENTI", "JURONG EAST", "JURONG WEST", "PIONEER", "TENGAH", "TUAS", "WESTERN ISLANDS", "WESTERN WATER CATCHMENT"],
};
const REGION_OF = Object.fromEntries(Object.entries(REGIONS).flatMap(([r, areas]) => areas.map((a) => [a, r])));
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])\w/g, (m) => m.toUpperCase());

// Which planning area (and so which region) each centre stands in, from its coordinates.
let areas = null;
// Centres the game adds to NEA's list (Lau Pa Sat is run privately), placed by hand.
const EXTRA_AREAS = { "p-lau-pa-sat": { area: "Downtown Core", region: "Central" } };

export function areaOf(c) {
  if (EXTRA_AREAS[c.id]) return EXTRA_AREAS[c.id];
  if (!areas) {
    areas = new Map();
    const inside = (lng, lat, rings) => {
      let hit = false;
      for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xi, yi] = ring[i];
          const [xj, yj] = ring[j];
          if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
        }
      }
      return hit;
    };
    for (const centre of CENTRES) {
      const a = landData.areas.find((x) => inside(centre.lng, centre.lat, x.rings));
      areas.set(centre.id, a ? { area: titleCase(a.name), region: REGION_OF[a.name] ?? "" } : { area: "", region: "" });
    }
  }
  return areas.get(c.id) ?? { area: "", region: "" };
}

export const SORTS = [
  { id: "famous", name: "Famous first" },
  { id: "az", name: "A to Z" },
  { id: "stalls", name: "Most stalls" },
  { id: "oldest", name: "Oldest" },
];


const yearOf = (c) => Number(String(c?.year ?? "").match(/\d{4}/)?.[0]) || null;

// The centres matching a search, in a region, sorted. nameOf gives the name people know a centre by.
export function browseCentres(centres, { query = "", region = "All", sort = "famous", nameOf }) {
  const q = query.trim().toLowerCase();
  return centres
    .map((c) => [c, profileFor(c), areaOf(c)])
    .filter(([c, , a]) => (!q || c.name.toLowerCase().includes(q) || (c.address ?? "").toLowerCase().includes(q) || a.area.toLowerCase().includes(q) || nameOf(c).toLowerCase().includes(q)) && (region === "All" || a.region === region))
    .sort((a, b) => {
      const byName = nameOf(a[0]).localeCompare(nameOf(b[0]));
      if (sort === "az") return byName;
      if (sort === "stalls") return (b[0].stalls ?? 0) - (a[0].stalls ?? 0) || byName;
      if (sort === "oldest") return (yearOf(a[0]) ?? 9999) - (yearOf(b[0]) ?? 9999) || byName;
      return Number(Boolean(b[1])) - Number(Boolean(a[1])) || byName;
    });
}

// A row of radio buttons styled as a segmented control.
export function segment(h, name, label, options, value, onPick) {
  return h(
    "div",
    { class: "seg", role: "radiogroup", "aria-label": label },
    ...options.map((o) => h("label", { title: o.note ?? "" }, h("input", { type: "radio", name, value: o.id, checked: value === o.id, onchange: () => onPick(o.id) }), h("span", { text: o.name }))),
  );
}

// Region and order pickers, and a line saying how many centres are showing.
// centres: the whole list being browsed (NEA's, plus any the game adds).
export function browseControls(h, { prefix, region, sort, shown, centres, query }, onRegion, onSort) {
  const total = centres.length;
  const famous = centres.filter((c) => profileFor(c)).length;
  const extra = centres.filter((c) => !CENTRES.includes(c)).map((c) => c.name);
  const all = extra.length ? `All ${total} centres: NEA's ${CENTRES.length} and ${extra.join(", ")}.` : `All ${total} of NEA's hawker centres.`;
  return [
    h("div", { class: "pickrow pickrow--wrap" }, segment(h, `${prefix}Region`, "Region", ["All", ...Object.keys(REGIONS)].map((r) => ({ id: r, name: r })), region, onRegion), segment(h, `${prefix}Sort`, "Order", SORTS, sort, onSort)),
    h("p", { class: "cnote cpick__count", text: shown === total ? `${all} The ${famous} famous ones look like themselves.` : `${shown} of ${total} centres${region !== "All" ? ` in the ${region}` : ""}${query.trim() ? ` matching "${query.trim()}"` : ""}.` }),
  ];
}

// Keeps a scrolling list where it was when it is drawn again for the same search; shows the picked one
// the first time.
export function keepScroll(box, state, key, reveal = false) {
  if (!box) return;
  box.scrollTop = state.key === key ? state.top ?? 0 : 0;
  state.key = key;
  if (reveal) {
    const on = box.querySelector(".is-on");
    if (on) box.scrollTop = on.offsetTop - box.offsetTop - 8;
  }
  box.addEventListener("scroll", () => (state.top = box.scrollTop), { passive: true });
}
