// What a hawker centre looks like in the game, worked out from a written description of the real place
// (the `look` fields of data/hawker-centre-profiles.json) or, for centres without a profile, from the
// year NEA says it was built. Pure data, no Three.js, so it can be tested.

export const ARCHETYPES = {
  street: { name: "Street hawkers on the five-foot way" },
  pavilion: { name: "Open-sided pavilion with a long pitched roof" },
  market: { name: "Market and food centre, wet market below or beside" },
  complex: { name: "Floor of a multi-storey complex" },
  octagon: { name: "Victorian cast-iron market with a clock tower" },
  openair: { name: "Open-air, by the sea or a river" },
  artdeco: { name: "Art deco curves" },
  modern: { name: "Modern hawker centre under a big canopy" },
};

export const TIMES = ["morning", "lunch", "day", "dusk", "night"];

const COLOUR_WORDS = [
  ["sky blue", "#8fc4e6"],
  ["light blue", "#9fc4e0"],
  ["navy", "#2d3f6c"],
  ["dark green", "#2f5a3f"],
  ["light green", "#a8d08a"],
  ["terracotta", "#c06a48"],
  ["maroon", "#7a2a2a"],
  ["burgundy", "#7a2a3a"],
  ["red", "#c8553d"],
  ["orange", "#e8892e"],
  ["yellow", "#f2c94c"],
  ["gold", "#d9b23a"],
  ["cream", "#f3e6c8"],
  ["beige", "#d9c3a0"],
  ["white", "#f4f1ea"],
  ["silver", "#c0c6cc"],
  ["grey", "#9aa0a6"],
  ["gray", "#9aa0a6"],
  ["concrete", "#b5b0a6"],
  ["black", "#2b2b2b"],
  ["brown", "#8a5a3a"],
  ["timber", "#a8784a"],
  ["green", "#4a8a5a"],
  ["teal", "#2a8f8a"],
  ["turquoise", "#3ab0a8"],
  ["blue", "#3b6fb5"],
  ["purple", "#7a5c99"],
  ["pink", "#e8a0b0"],
];

// Colour words in the order they appear, as hex.
export function coloursFrom(text) {
  const found = [];
  let s = ` ${String(text ?? "").toLowerCase()} `;
  for (const [word, hex] of COLOUR_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, "g");
    let m;
    while ((m = re.exec(s))) found.push([m.index, hex]);
    s = s.replace(re, " ".repeat(word.length));
  }
  return found.sort((a, b) => a[0] - b[0]).map(([, hex]) => hex).filter((h, i, all) => all.indexOf(h) === i);
}

const lookText = (look) => Object.values(look ?? {}).flat().join(" ").toLowerCase();

// Which archetype a description reads most like.
export function archetypeFrom(look) {
  if (!look) return null;
  const all = lookText(look);
  const roof = String(look.roof ?? "").toLowerCase();
  const layout = String(look.layout ?? "").toLowerCase();
  if (/octagon|victorian|cast[- ]iron|clock tower/.test(all)) return "octagon";
  if (/art deco|streamline/.test(all)) return "artdeco";
  if (/multi[- ]stor|storey|second floor|2nd floor|upper floor|level 2|levels/.test(layout) || /complex/.test(layout)) return "complex";
  if (/open[- ]air|alfresco|al fresco|no roof|uncovered/.test(roof + " " + layout) || (/sea|beach|lagoon|river/.test(String(look.surroundings ?? "").toLowerCase()) && /open/.test(roof + layout))) return "openair";
  if (/wet market|market below|market on the|market hall|market beside/.test(all)) return "market";
  if (/canopy|louvre|modern|contemporary|naturally ventilated|high ceiling/.test(roof + " " + layout)) return "modern";
  if (/pitched|pavilion|open[- ]sided|zinc|gable|long roof|hip roof|hipped/.test(all)) return "pavilion";
  return null;
}

export function timeFrom(text) {
  const s = String(text ?? "").toLowerCase();
  if (/night|supper|late|evening/.test(s)) return "night";
  if (/dusk|sunset/.test(s)) return "dusk";
  if (/lunch|noon|midday/.test(s)) return "lunch";
  if (/breakfast|morning|dawn/.test(s)) return "morning";
  return "day";
}

const BACKDROPS = [
  ["cbd", /\bcbd\b|office tower|skyscraper|financial|business district|towers|high-rise office|marina bay|tanjong pagar/],
  ["hdb", /\bhdb\b|flats|housing estate|blocks of flats|residential/],
  ["shophouses", /shophouse/],
  ["sea", /\bsea\b|beach|coast|lagoon|seafront|ferry|jetty/],
  ["river", /river|canal/],
  ["temple", /temple|mosque|church/],
  ["village", /village|kampong/],
  ["trees", /park|garden|trees|greenery|rain tree/],
  ["mrt", /\bmrt\b|train/],
];

export function backdropFrom(look) {
  const s = `${look?.surroundings ?? ""} ${look?.summary ?? ""}`.toLowerCase();
  return BACKDROPS.filter(([, re]) => re.test(s)).map(([k]) => k);
}

const FEATURES = [
  ["satay", /satay/],
  ["fans", /\bfans?\b/],
  ["lanterns", /lantern/],
  ["neon", /neon|fluorescent|strip light|tube light/],
  ["umbrellas", /umbrella|parasol/],
  ["wetmarket", /wet market/],
  ["greenery", /planter|green wall|greenery|plants/],
  ["clock", /clock/],
  ["mural", /mural|painted wall/],
  ["bbq", /\bbbq\b|barbecue|grill|seafood/],
];

export function featuresFrom(look) {
  const s = lookText(look);
  return FEATURES.filter(([, re]) => re.test(s)).map(([k]) => k);
}

// Without a profile: hawker centres were mostly built from the 1970s, when street hawkers were moved in.
export function archetypeByYear(year, eraId) {
  if (eraId === "1950s" && (!year || year >= 1955)) return "street";
  if (!year) return "pavilion";
  if (year < 1960) return "market";
  if (year < 1990) return "pavilion";
  if (year < 2011) return "market";
  return "modern";
}

const DEFAULT_COLOURS = {
  street: { roof: "#8a5a30", pillar: "#f4ead6", accent: "#c8553d", floor: "#6e655a" },
  pavilion: { roof: "#c06a48", pillar: "#bfe3d0", accent: "#2f6b4f", floor: "#d8cfbd" },
  market: { roof: "#9aa0a6", pillar: "#f3e6c8", accent: "#2d4f9c", floor: "#cfc7b4" },
  complex: { roof: "#b5b0a6", pillar: "#e8dcc4", accent: "#c8553d", floor: "#c9c2b2" },
  octagon: { roof: "#8a8f96", pillar: "#d9c3a0", accent: "#7a2a2a", floor: "#d6c9b0" },
  openair: { roof: "#f4f1ea", pillar: "#f4f1ea", accent: "#2a8f8a", floor: "#cfc2a8" },
  artdeco: { roof: "#f4f1ea", pillar: "#f4f1ea", accent: "#2f6b4f", floor: "#d8d0c0" },
  modern: { roof: "#f4f1ea", pillar: "#e8f1ee", accent: "#2a8f8a", floor: "#dcd6ca" },
};

// Our reading of each profile's `look` (layout, roof, colours, time of day, surroundings), for the
// profiled centres. The words behind each choice are in data/hawker-centre-profiles.json, with photos.
export const CENTRE_LOOKS = {
  "maxwell-food-centre": { archetype: "pavilion", colours: { roof: "#c9a46a", pillar: "#e8892e", accent: "#2f6b4f" }, time: "lunch", backdrop: ["cbd", "shophouses", "trees"] },
  "chinatown-complex-market-and-food-centre": { archetype: "complex", colours: { roof: "#f4f1ea", pillar: "#c8553d", accent: "#d9a42a" }, time: "lunch", backdrop: ["shophouses", "hdb"], features: ["lanterns", "wetmarket"] },
  "old-airport-road-food-centre": { archetype: "complex", colours: { roof: "#c9c4bc", pillar: "#ece8e0", accent: "#c8553d" }, time: "dusk", backdrop: ["hdb", "trees"], features: ["mural"] },
  "tekka-centre": { archetype: "complex", colours: { roof: "#b5b0a6", pillar: "#7a5c99", accent: "#e8a83a" }, time: "morning", backdrop: ["shophouses", "hdb"], features: ["wetmarket"] },
  "newton-food-centre": { archetype: "pavilion", colours: { roof: "#c06a48", pillar: "#6a4a2a", accent: "#6a4a2a" }, time: "night", backdrop: ["trees", "shophouses"], features: ["umbrellas", "satay"] },
  "chomp-chomp-food-centre": { archetype: "pavilion", colours: { roof: "#5a3a22", pillar: "#8a5a3a", accent: "#c8553d", floor: "#c06a48", table: "#f2c94c" }, time: "night", backdrop: ["trees"], features: ["satay"] },
  "tiong-bahru-market": { archetype: "artdeco", colours: { roof: "#3a3a3a", pillar: "#bfe0b0", accent: "#3b6fb5", sign: "#c8553d" }, time: "morning", backdrop: ["trees"] },
  "amoy-street-food-centre": { archetype: "complex", colours: { roof: "#f4f1ea", pillar: "#c0c6cc", accent: "#d9a42a" }, time: "lunch", backdrop: ["cbd", "shophouses"] },
  "hong-lim-market-and-food-centre": { archetype: "complex", colours: { roof: "#b5b0a6", pillar: "#b5b0a6", accent: "#6b7a3a", table: "#3ab0a8" }, time: "lunch", backdrop: ["hdb", "cbd"] },
  "adam-road-food-centre": { archetype: "pavilion", colours: { roof: "#9aa0a6", pillar: "#4a8a5a", accent: "#2f6b4f" }, time: "lunch", backdrop: ["trees"], features: ["umbrellas"] },
  "geylang-serai-market-and-food-centre": { archetype: "pavilion", roofStyle: "tiered", colours: { roof: "#c06a48", pillar: "#7a2a2a", accent: "#a8784a" }, time: "morning", backdrop: ["hdb"] },
  "east-coast-lagoon-food-village": { archetype: "openair", colours: { roof: "#e8907a", pillar: "#a8784a", accent: "#e8907a" }, time: "dusk", backdrop: ["sea"], features: ["satay", "umbrellas"] },
  "golden-mile-food-centre": { archetype: "complex", colours: { roof: "#f4f1ea", pillar: "#b5651d", accent: "#2f6b4f", table: "#3b6fb5", stool: "#3b6fb5" }, time: "night", backdrop: ["cbd"], features: ["neon"] },
  "zion-riverside-food-centre": { archetype: "pavilion", colours: { roof: "#8a5a3a", pillar: "#4a8a5a", accent: "#c8553d" }, time: "day", backdrop: ["river", "cbd", "trees"] },
  "abc-brickworks-market-and-food-centre": { archetype: "market", colours: { roof: "#c0c6cc", pillar: "#f4f1ea", accent: "#c8553d", table: "#e8892e", stool: "#e8892e" }, time: "day", backdrop: ["hdb"] },
  "changi-village-hawker-centre": { archetype: "pavilion", colours: { roof: "#7a2a2a", pillar: "#e8dcc4", accent: "#2f6b4f" }, time: "dusk", backdrop: ["sea", "trees"] },
  "albert-centre-market-and-food-centre": { archetype: "complex", colours: { roof: "#c0c6cc", pillar: "#f4f1ea", accent: "#c8553d", sign: "#c9a23a" }, time: "morning", backdrop: ["shophouses", "hdb"] },
  "whampoa-makan-place": { archetype: "pavilion", colours: { roof: "#c0c6cc", pillar: "#f4f1ea", accent: "#e8892e", table: "#e8a0b0" }, time: "dusk", backdrop: ["hdb"], features: ["fans"] },
  "lau-pa-sat": { archetype: "octagon", colours: { roof: "#c06a48", pillar: "#f4f1ea", accent: "#2f5a3f" }, time: "night", backdrop: ["cbd"], features: ["satay"] },
};

// The full preset for a scene. profile: an entry of hawker-centre-profiles.json, or null.
// centre: the NEA record ({ name, year }) or a Passport place ({ name }). session: Centre Manager meal.
export function presetFor({ profile = null, centre = null, eraId = "today", session = null, override: extra = null } = {}) {
  const look = profile?.look ?? null;
  const known = profile ? CENTRE_LOOKS[profile.key] : null;
  const override = known || extra ? { ...(known ?? {}), ...(extra ?? {}), colours: { ...(known?.colours ?? {}), ...(extra?.colours ?? {}) } } : null;
  const year = profile?.opened ? Number(String(profile.opened).match(/\d{4}/)?.[0]) || null : centre?.year ?? null;
  let archetype = override?.archetype ?? archetypeFrom(look) ?? archetypeByYear(year, eraId);
  // Before a centre was built, its hawkers were out on the street.
  if (eraId === "1950s" && year && year > 1960 && archetype !== "octagon") archetype = "street";
  const base = DEFAULT_COLOURS[archetype] ?? DEFAULT_COLOURS.pavilion;
  const roofColours = coloursFrom(look?.roof);
  const colours = coloursFrom(look?.colours ?? "");
  const materials = coloursFrom(look?.materials ?? "");
  const palette = {
    roof: roofColours[0] ?? colours[1] ?? base.roof,
    pillar: colours[0] ?? materials[0] ?? base.pillar,
    accent: colours[2] ?? colours[1] ?? base.accent,
    floor: base.floor,
    table: null,
    stool: null,
    sign: null,
    ...(override?.colours ?? {}),
  };
  let time = override?.time ?? timeFrom(look?.timeOfDay);
  if (session === "b") time = "morning";
  else if (session === "l") time = "lunch";
  else if (session === "d") time = time === "night" ? "night" : "dusk";
  if (eraId === "1950s" && !session && time === "day") time = "dusk"; // the 1950s scenes have always been evenings
  const backdrop = override?.backdrop ?? (look ? backdropFrom(look) : []);
  const features = [...new Set([...(look ? featuresFrom(look) : []), ...(override?.features ?? [])])];
  const name = profile?.displayName ?? centre?.name ?? null;
  return {
    key: profile?.key ?? null,
    name,
    sign: signText(name),
    archetype,
    roofStyle: override?.roofStyle ?? null,
    time,
    colours: palette,
    backdrop: backdrop.length ? backdrop : archetype === "street" ? ["shophouses"] : ["hdb", "trees"],
    features,
  };
}

// "Maxwell Food Centre (Kim Hua Market)" -> "MAXWELL FOOD CENTRE". Signs keep the main name, and long
// ones drop "market and food centre" or cut at a word.
export function signText(name) {
  if (!name) return "";
  let t = String(name).replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  if (t.length > 26) t = t.replace(/ MARKET AND FOOD CENTRE$| AND FOOD CENTRE$| FOOD CENTRE$/, "");
  while (t.length > 30 && t.includes(" ")) t = t.slice(0, t.lastIndexOf(" "));
  return t.slice(0, 30);
}
