// Kitchens are drawn as text. Each row is one strip of tiles, from the back wall (row 0) to the front.
// The serving hatch sits on the back wall and the dining area is behind it.
//
//   .  floor              #  counter            H  serving hatch       P  clean plates
//   D  dirty plates back  S  sink               Z  bin                 X  chopping board
//   W  wok                O  pot                R  rice cooker / steamer
//   G  grill              M  kopi urn           I  ice shaver          E  fire extinguisher
//   T  takeaway boxes (or paper wraps, or tiffins, by era)                 ^  sugarcane press
//   ~  kaya and butter, spread on toast
//   Ingredient crates are lower case, digits, and a few capitals no station uses, see CRATES.

export const CRATES = {
  a: "radish", b: "bread", c: "chicken", d: "dough", e: "egg", f: "chaipoh", g: "duck", h: "charsiew",
  i: "ikanbilis", j: "mutton", k: "kwayteow", l: "santan", m: "mee", n: "noodles", o: "oyster", p: "prawn",
  q: "blacksauce", r: "rice", s: "satayc", t: "sataym", u: "cucumber", v: "rebus", w: "batter", x: "ice",
  y: "curry", z: "redbean", 1: "chendol", 2: "chilli", 3: "ribs", 4: "porkchop", 5: "cabbage", 6: "tofu",
  7: "kway", 8: "fish", 9: "beef", A: "stingray", B: "puff", C: "ondeh", F: "lapis", J: "soya",
  K: "crab", L: "mantou", N: "wings", Q: "mince", U: "lor", V: "fruit", Y: "rojaksauce", "&": "popiah", "%": "banana", "@": "chengtng", "!": "thosai",
  0: "pepper", $: "sugarcane", "*": "clayrice", "+": "lapcheong", "=": "cakebatter",
};

export const STATION_TYPES = {
  "#": "counter", H: "hatch", P: "rack", D: "return", S: "sink", Z: "bin", X: "board",
  W: "wok", O: "pot", R: "cooker", G: "grill", M: "urn", I: "shaver", E: "ext", T: "boxes", "^": "press", "~": "kaya",
};

export const LEVELS = [
  {
    id: "chickenrice",
    name: "Chicken rice and kopi",
    place: "Stall #01-08",
    blurb: "Steamed or roasted? Plus kaya toast and drinks in kopi code.",
    dishes: ["chickenrice", "kayatoast", "drink"],
    time: 180,
    spawnEvery: 15,
    maxOrders: 4,
    stars: [6, 16, 28],
    plates: 4,
    accent: "#2f6b4f",
    tutorial: true,
    map: [
      "##RR#HH#MM##",
      "r..........P",
      "c..........D",
      "#...#OO#...S",
      "b...#XX#...E",
      "e..........G",
      "#..........G",
      "##Z#2#T###~#",
    ],
  },
  {
    id: "friednoodles",
    name: "Fried noodles",
    place: "Stall #01-15",
    blurb: "Three woks: char kway teow, carrot cake white or black, Hokkien mee, oyster omelette.",
    dishes: ["ckt", "carrotcake", "hokkienmee", "orhluak"],
    time: 180,
    spawnEvery: 14,
    maxOrders: 4,
    stars: [8, 20, 34],
    plates: 4,
    accent: "#b23c20",
    map: [
      "#WW#HH#W#PD#",
      "k..........S",
      "e..........S",
      "a...####...E",
      "q..........#",
      "m..........#",
      "n..........Z",
      "#po#2#T#####",
    ],
  },
  {
    id: "noodlesoup",
    name: "Noodles and kueh",
    place: "Stall #01-21",
    blurb: "Wanton mee, laksa, chwee kueh and braised duck rice.",
    dishes: ["wantonmee", "laksa", "chweekueh", "duckrice"],
    time: 180,
    spawnEvery: 14,
    maxOrders: 4,
    stars: [7, 18, 30],
    plates: 4,
    accent: "#7a4a9a",
    map: [
      "#RR##HH#PD##",
      "m..........O",
      "h..........O",
      "n...#XX#...O",
      "p..........E",
      "w..........W",
      "f..........S",
      "#gr##Z#2#T##",
    ],
  },
  {
    id: "malay",
    name: "Nasi lemak and satay",
    place: "Stall #01-30",
    blurb: "Nasi lemak, satay ayam or kambing, and mee rebus.",
    dishes: ["nasilemak", "satay", "meerebus"],
    time: 180,
    spawnEvery: 14,
    maxOrders: 4,
    stars: [8, 20, 34],
    plates: 4,
    accent: "#2d4f9c",
    map: [
      "#RR##HH#PD##",
      "l..........G",
      "i..........G",
      "e...#XW#...E",
      "s..........O",
      "t..........O",
      "u..........S",
      "#mv##Z#2#T##",
    ],
  },
  {
    id: "prata",
    name: "Prata and teh tarik",
    place: "Stall #01-33",
    blurb: "Prata kosong or telur, murtabak, and drinks in kopi code.",
    dishes: ["prata", "murtabak", "drink"],
    time: 180,
    spawnEvery: 13,
    maxOrders: 4,
    stars: [6, 15, 26],
    plates: 4,
    accent: "#c27a1a",
    map: [
      "#GG##HH#MM##",
      "d..........E",
      "e..........G",
      "#...####...#",
      "j..........P",
      "y..........D",
      "#..........S",
      "##Z###T#####",
    ],
  },
  {
    id: "dessert",
    name: "Desserts and kopi",
    place: "Stall #01-40",
    blurb: "Ice kachang, chendol, kaya toast, soya bean milk and drinks in kopi code.",
    dishes: ["icekachang", "chendol", "kayatoast", "soya", "drink"],
    time: 180,
    spawnEvery: 13,
    maxOrders: 5,
    stars: [6, 15, 26],
    plates: 5,
    accent: "#2a8f8a",
    map: [
      "#MM##HH#PD##",
      "x..........I",
      "z..........I",
      "e...#~O#...#",
      "1..........G",
      "b..........E",
      "J..........S",
      "##Z###T#####",
    ],
  },
  {
    id: "riceplates",
    name: "Rice and roast meat",
    place: "Stall #01-45",
    blurb: "Char siew, roast duck or soya sauce chicken rice, Hainanese curry rice, economy rice and claypot rice over charcoal.",
    dishes: ["roastmeat", "curryrice", "economyrice", "claypot"],
    time: 180,
    spawnEvery: 14,
    maxOrders: 4,
    stars: [8, 20, 34],
    plates: 4,
    accent: "#9a3a2a",
    map: [
      "#RR#HH#P#D##",
      "r..........S",
      "h..........G",
      "g...#XX#...E",
      "4...#OO#...W",
      "5..........W",
      "e..........G",
      "#yq2#Z#Tc*+#",
    ],
  },
  {
    id: "soups",
    name: "Soups and porridge",
    place: "Stall #01-50",
    blurb: "Bak kut teh, kway chap, Teochew porridge and yong tau foo.",
    dishes: ["bakkutteh", "kwaychap", "porridge", "yongtaufoo"],
    time: 180,
    spawnEvery: 14,
    maxOrders: 4,
    stars: [8, 20, 34],
    plates: 4,
    accent: "#5b6b78",
    map: [
      "#RR##HH#PD##",
      "3..........O",
      "r..........O",
      "7...#XX#...O",
      "g...#OO#...E",
      "8..........S",
      "6..........S",
      "#nm#2#Z#T###",
    ],
  },
  {
    id: "mamak",
    name: "Noodles and mamak",
    place: "Stall #01-55",
    blurb: "Prawn noodles, ban mian, mee goreng mamak and curry puffs.",
    dishes: ["prawnnoodles", "banmian", "meegoreng", "currypuff"],
    time: 180,
    spawnEvery: 13,
    maxOrders: 4,
    stars: [7, 18, 30],
    plates: 4,
    accent: "#d9662e",
    map: [
      "#OO##HH#PD##",
      "m..........S",
      "p..........S",
      "d...#WW#...E",
      "e...####...O",
      "B..........#",
      "#..........#",
      "##2#Z#T#####",
    ],
  },
  {
    id: "padang",
    name: "Nasi padang and kueh",
    place: "Stall #01-60",
    blurb: "Nasi padang with rendang, sambal stingray, ondeh-ondeh and kueh lapis.",
    dishes: ["nasipadang", "sambalstingray", "kueh"],
    time: 180,
    spawnEvery: 14,
    maxOrders: 4,
    stars: [8, 20, 34],
    plates: 4,
    accent: "#3f7d3a",
    map: [
      "#RR##HH#PD##",
      "r..........G",
      "9..........G",
      "5...#OO#...E",
      "A...#WW#...S",
      "C..........S",
      "F..........#",
      "###2#Z#T####",
    ],
  },
  {
    id: "seafood",
    name: "BBQ seafood and wings",
    place: "Stall #01-65",
    blurb: "Chilli or black pepper crab, BBQ chicken wings, sambal stingray and sugarcane juice from the press.",
    dishes: ["chillicrab", "peppercrab", "wings", "sambalstingray", "sugarcane"],
    time: 180,
    spawnEvery: 15,
    maxOrders: 4,
    stars: [60, 140, 240],
    plates: 4,
    accent: "#c0583a",
    map: [
      "#WW##HH#PD##",
      "K..........G",
      "L..........G",
      "N...####...E",
      "A...#GG#...S",
      "0..........S",
      "$..........^",
      "##2#Z#T#####",
    ],
  },
  {
    id: "noodlesoups",
    name: "Noodles in soup and gravy",
    place: "Stall #01-70",
    blurb: "Lor mee, bak chor mee and fish soup with bee hoon or rice.",
    dishes: ["lormee", "bakchormee", "fishsoup"],
    time: 180,
    spawnEvery: 14,
    maxOrders: 4,
    stars: [8, 20, 34],
    plates: 4,
    accent: "#8a5a3a",
    map: [
      "#RR##HH#PD##",
      "m..........O",
      "U..........O",
      "e...#OO#...E",
      "Q...####...S",
      "8..........S",
      "n..........#",
      "#r#2#Z#T####",
    ],
  },
  {
    id: "biryani",
    name: "Biryani and thosai",
    place: "Stall #01-75",
    blurb: "Mutton or chicken biryani, thosai with curry, and teh tarik in kopi code.",
    dishes: ["biryani", "thosai", "drink"],
    time: 180,
    spawnEvery: 13,
    maxOrders: 4,
    stars: [8, 20, 34],
    plates: 4,
    accent: "#e8a83a",
    map: [
      "#OO##HH#MM##",
      "r..........G",
      "j..........G",
      "c...####...E",
      "!...####...P",
      "y..........D",
      "#..........S",
      "##Z###T#####",
    ],
  },
  {
    id: "snacks",
    name: "Rojak, popiah and snacks",
    place: "Stall #01-80",
    blurb: "Rojak, popiah, goreng pisang, Fuzhou oyster cake and cheng tng.",
    dishes: ["rojak", "popiah", "pisang", "oystercake", "chengtng"],
    time: 180,
    spawnEvery: 12,
    maxOrders: 5,
    stars: [6, 15, 26],
    plates: 5,
    accent: "#7a5c99",
    map: [
      "#WW##HH#PD##",
      "V..........O",
      "Y..........O",
      "&...#XX#...E",
      "%...####...S",
      "@..........S",
      "o..........=",
      "##Z#2#T#####",
    ],
  },
];

export function levelById(id) {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

// Turns the text map into tiles. Every non-floor tile is solid and is a station of some kind.
export function parseLevel(level) {
  const rows = level.map;
  const h = rows.length;
  const w = rows[0].length;
  const stations = [];
  const grid = [];
  for (let z = 0; z < h; z++) {
    if (rows[z].length !== w) throw new Error(`${level.id}: row ${z} is ${rows[z].length} wide, expected ${w}`);
    const row = [];
    for (let x = 0; x < w; x++) {
      const ch = rows[z][x];
      if (ch === ".") {
        row.push(-1);
        continue;
      }
      const type = CRATES[ch] ? "crate" : STATION_TYPES[ch];
      if (!type) throw new Error(`${level.id}: unknown tile ${ch}`);
      row.push(stations.length);
      stations.push({ i: stations.length, x, z, type, ing: CRATES[ch] ?? null });
    }
    grid.push(row);
  }
  return { w, h, grid, stations };
}

// Floor tiles next to a station, so a chef can reach it.
export function approaches(map, st) {
  const out = [];
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const x = st.x + dx;
    const z = st.z + dz;
    if (map.grid[z]?.[x] === -1) out.push({ x, z, fx: -dx, fz: -dz });
  }
  return out;
}
