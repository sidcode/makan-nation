// Profiles of famous hawker centres: what they look like, what they are known for, and their history,
// each with sources (data/hawker-centre-profiles.json, from archive research). Matched to NEA's list by
// name; Lau Pa Sat is not an NEA centre, so it has its own place.

import RAW from "../../data/hawker-centre-profiles.json";
import { DISHES } from "./dishes.js";

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const SITES = {
  "roots.gov.sg": "Roots.gov.sg (NHB)",
  "guide.michelin.com": "Michelin Guide",
  "timeout.com": "Time Out",
  "nea.gov.sg": "NEA",
  "eresources.nlb.gov.sg": "NLB Infopedia",
  "nlb.gov.sg": "NLB Infopedia",
  "nas.gov.sg": "National Archives of Singapore",
  "hdb.gov.sg": "HDB",
  "sg101.gov.sg": "SG101",
  "data.gov.sg": "data.gov.sg",
  "laupasat.sg": "Lau Pa Sat",
  "lonelyplanet.com": "Lonely Planet",
  "herworld.com": "Her World",
  "womensweekly.com.sg": "Singapore Women's Weekly",
  "thehoneycombers.com": "Honeycombers",
  "dollarsandsense.sg": "Dollars and Sense",
  "makansutra.com": "Makansutra",
  "misstamchiak.com": "Miss Tam Chiak",
  "sethlui.com": "Seth Lui",
  "eatbook.sg": "Eatbook",
  "mothership.sg": "Mothership",
};

// A readable label for a source link: "Wikipedia: Maxwell Food Centre", "Michelin Guide", and so on.
export function sourceTitle(url) {
  const host = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  if (/wikipedia\.org$/.test(host)) {
    const page = decodeURIComponent(url.split("/wiki/")[1] ?? "").replace(/_/g, " ").replace(/#.*$/, "");
    return page ? `Wikipedia: ${page}` : "Wikipedia";
  }
  return SITES[host] ?? host;
}

const cleanSources = (list) =>
  (Array.isArray(list) ? list : [])
    .map((s) => (typeof s === "string" ? [sourceTitle(s), s] : [String(s?.title ?? sourceTitle(String(s?.url ?? ""))), String(s?.url ?? s?.href ?? "")]))
    .filter(([, url]) => /^https:\/\//.test(url))
    .slice(0, 4);

// Dish names as people write them, to the game's dishes. One entry can name two dishes ("murtabak and
// roti prata"); each match is taken out of the text before the next is tried.
const ALIASES = [
  ["roastmeat", /soya sauce chicken|soy sauce chicken|roast meat|roasted meat|char siew rice|char siu|roast duck|siu mei|roast pork/],
  ["chickenrice", /chicken rice(?! and)/],
  ["duckrice", /duck rice|braised duck/],
  ["kayatoast", /kaya toast|\bkaya\b/],
  ["ckt", /char kway teow|char kuey teow|fried kway teow/],
  ["carrotcake", /carrot cake|chai tow kway/],
  ["hokkienmee", /hokkien (fried )?(prawn )?(mee|noodles?)|fried hokkien|sotong prawn mee/],
  ["wantonmee", /wanton mee|wonton mee|wanton noodle|wonton noodle/],
  ["orhluak", /oyster omelette|orh luak|or luak/],
  ["laksa", /(?<!assam )laksa/],
  ["chweekueh", /chwee kueh/],
  ["satay", /satay(?! bee)/],
  ["nasilemak", /nasi lemak/],
  ["meerebus", /mee rebus/],
  ["murtabak", /murtabak/],
  ["prata", /prata|roti canai/],
  ["icekachang", /ice kachang|ais kacang|ice kacang/],
  ["chendol", /chendol|cendol/],
  ["bakkutteh", /bak kut teh/],
  ["curryrice", /hainanese curry rice/],
  ["economyrice", /economy rice|cai png|chap chye png/],
  ["yongtaufoo", /yong tau foo/],
  ["kwaychap", /kway chap|kuay chap/],
  ["porridge", /teochew porridge|teochew muay/],
  ["prawnnoodles", /prawn noodle|prawn mee|hae mee/],
  ["banmian", /ban mian|banmian/],
  ["meegoreng", /mee goreng/],
  ["nasipadang", /nasi padang/],
  ["sambalstingray", /stingray/],
  ["currypuff", /curry puff|karipap/],
  ["kueh", /kueh lapis|ondeh|onde-onde/],
  ["soya", /soya bean milk|soy bean milk|soybean milk/],
  ["chillicrab", /chilli crab|crab stir-fried with bottled chilli/],
  ["peppercrab", /black pepper crab/],
  ["claypot", /claypot rice|clay pot rice/],
  ["oystercake", /oyster cake/],
  ["sugarcane", /sugarcane|sugar cane/],
  ["fishsoup", /fish soup|fish head bee hoon|sliced fish/],
  ["biryani", /biryani|briyani/],
  ["lormee", /lor mee/],
  ["rojak", /rojak/],
  ["bakchormee", /bak chor mee|minced (pork|meat) noodle|rou cuo mian/],
  ["wings", /chicken wings?/],
  ["popiah", /popiah/],
  ["thosai", /thosai|dosa/],
  ["pisang", /goreng pisang|pisang goreng|fried banana|banana fritter/],
  ["chengtng", /cheng tng/],
  ["drink", /^kopi|teh tarik|^coffee/],
];

export function dishIdsFor(name) {
  let n = String(name ?? "").toLowerCase();
  const out = [];
  for (const [id, re] of ALIASES) {
    if (!DISHES[id] || !re.test(n)) continue;
    out.push(id);
    n = n.replace(re, " ");
  }
  return out;
}

export const dishIdFor = (name) => dishIdsFor(name)[0] ?? null;

// A Wikimedia Commons file page, as a small image link that Commons serves itself.
function commonsPhoto(ph) {
  const m = /^https:\/\/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)$/.exec(String(ph?.url ?? ""));
  if (!m || /check/i.test(String(ph.licence ?? ""))) return null;
  const file = m[1].replace(/^File:/, "");
  return { page: ph.url, src: `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=480`, credit: String(ph.credit ?? "Wikimedia Commons"), licence: String(ph.licence ?? "") };
}

export const PROFILES = (RAW?.centres ?? RAW?.profiles ?? (Array.isArray(RAW) ? RAW : []))
  .filter((p) => p && (p.displayName || p.neaName))
  .map((p, i) => ({
    key: String(p.key ?? p.id ?? norm(p.displayName ?? p.neaName).replace(/ /g, "-") ?? `c${i}`),
    neaName: p.neaName ?? null,
    displayName: String(p.displayName ?? p.neaName),
    opened: p.opened ?? null,
    look: p.look ?? {},
    knownFor: (p.knownFor ?? []).map((k) => ({ dish: String(k.dish ?? ""), ids: dishIdsFor(k.dish), id: dishIdFor(k.dish), note: String(k.note ?? ""), sources: cleanSources(k.sources) })),
    history: (p.history ?? []).map((h) => ({ fact: String(h.fact ?? ""), sources: cleanSources(h.sources) })).filter((h) => h.fact && h.sources.length),
    photos: (p.photos ?? []).map(commonsPhoto).filter(Boolean),
    confidence: p.confidence ?? null,
    lat: Number(p.lat) || null,
    lng: Number(p.lng) || null,
  }));

const byNea = new Map(PROFILES.filter((p) => p.neaName).map((p) => [norm(p.neaName), p]));

// The profile for an NEA centre record ({ name }) or a place name, if there is one.
export function profileFor(centreOrName) {
  if (!centreOrName) return null;
  const name = typeof centreOrName === "string" ? centreOrName : centreOrName.name;
  const n = norm(name);
  if (byNea.has(n)) return byNea.get(n);
  return PROFILES.find((p) => norm(p.displayName) === n || (n.length > 5 && (n.includes(norm(p.displayName)) || norm(p.displayName).includes(n)))) ?? null;
}

export const profileByKey = (key) => PROFILES.find((p) => p.key === key) ?? null;

// The game's dishes a centre is known for, with the note and source from the profile.
export function famousIn(profile) {
  const out = [];
  for (const k of profile?.knownFor ?? []) {
    if (!k.sources.length) continue;
    for (const id of k.ids) {
      if (out.some((o) => o.id === id)) continue;
      out.push({ id, note: k.note || `${profile.displayName} is known for its ${k.dish.toLowerCase()}.`, src: k.sources[0], dish: k.dish });
    }
  }
  return out;
}

// Every centre famous for a dish, for its recipe book card.
export function centresFamousFor(dishId) {
  return PROFILES.flatMap((p) => famousIn(p).filter((f) => f.id === dishId).map((f) => ({ centre: p.displayName, note: f.note, src: f.src })));
}
