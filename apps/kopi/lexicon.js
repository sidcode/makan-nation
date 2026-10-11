// Every word the compiler knows, with where it comes from.
// Origins follow the linked sources. Where a source hedges, so do we.

export const SOURCES = {
  kopi: { label: "Wikipedia: Kopi (drink)", url: "https://en.wikipedia.org/wiki/Kopi_(drink)" },
  kopitiam: { label: "Wikipedia: Kopitiam", url: "https://en.wikipedia.org/wiki/Kopitiam" },
  singlish: { label: "Wikipedia: Singlish vocabulary", url: "https://en.wikipedia.org/wiki/Singlish_vocabulary" },
  tarik: { label: "Wikipedia: Teh tarik", url: "https://en.wikipedia.org/wiki/Teh_tarik" },
  yuen: { label: "Wikipedia: Yuenyeung", url: "https://en.wikipedia.org/wiki/Yuenyeung" },
  dino: { label: "Wikipedia: Milo dinosaur", url: "https://en.wikipedia.org/wiki/Milo_dinosaur" },
  mj: {
    label: "Singaporean Mandarin Database: grass jelly",
    url: "https://www.languagecouncils.sg/mandarin/en/learning-resources/singaporean-mandarin-database/terms/grass-jelly",
  },
  seth: { label: "Seth Lui: kopitiam codewords", url: "https://sethlui.com/secret-kopitiam-codewords-singapore/" },
};

export const LANGS = {
  Malay: { color: "#2f7d4f", ink: "#fff" },
  Hokkien: { color: "#c8352b", ink: "#fff" },
  Cantonese: { color: "#2f5d9e", ink: "#fff" },
  Hainanese: { color: "#7a4f9a", ink: "#fff" },
  English: { color: "#d9a520", ink: "#2a1a12" },
  Yours: { color: "#1f8a8a", ink: "#fff" },
};

// kind decides what a word does when compiled:
//   base, milk, sugar, strength, ice, bag, extra, count, greeting
export const WORDS = [
  {
    id: "kopi", kind: "base", value: "kopi", forms: ["kopi", "coffee"],
    langs: ["Malay"], script: "咖啡", gloss: "coffee",
    meaning: "Coffee. Comes with condensed milk and sugar unless you say otherwise.",
    note: "Kopi is the Malay word for coffee.", src: "kopitiam",
  },
  {
    id: "teh", kind: "base", value: "teh", forms: ["teh", "tea", "te"],
    langs: ["Hokkien", "Malay"], script: "茶", roman: "tê", gloss: "tea",
    meaning: "Tea. Condensed milk and sugar by default.",
    src: "singlish",
  },
  {
    id: "yuanyang", kind: "base", value: "cham", forms: ["yuan yang", "yuen yeung", "yuenyeung", "yin yong"],
    langs: ["Cantonese"], script: "鴛鴦", gloss: "mandarin ducks",
    meaning: "Coffee and tea in one cup.",
    note: "Mandarin ducks travel in pairs. The drink started in Hong Kong cha chaan teng.", src: "yuen",
  },
  {
    id: "cham", kind: "base", value: "cham", forms: ["cham"],
    langs: ["Hokkien"], roman: "chham", gloss: "mix",
    meaning: "Mix coffee and tea. Kopi cham is the same drink as yuan yang.",
    src: "kopi",
  },
  {
    id: "milo", kind: "base", value: "milo", forms: ["milo"],
    langs: ["English"], gloss: "the brand",
    meaning: "Malted chocolate drink. A brand name that became a menu item.",
    src: "dino",
  },
  {
    id: "takkiu", kind: "base", value: "milo", forms: ["tak kiu", "tat kiu", "takkiu"],
    langs: ["Hokkien"], script: "踢球", gloss: "play football",
    meaning: "Milo, in uncle code.",
    note: "Often traced to the athletes on Milo packaging.", src: "singlish",
  },
  {
    id: "bandung", kind: "base", value: "bandung", forms: ["bandung", "bandong"],
    langs: ["Malay"], gloss: "rose syrup milk",
    meaning: "Rose syrup stirred into milk. Pink and very sweet.",
    src: "singlish",
  },
  {
    id: "mj", kind: "base", value: "mj", forms: ["michael jackson", "mj", "hei bai", "black white", "black and white"],
    langs: ["English"], script: "黑白", gloss: "black white",
    meaning: "Soya bean milk with grass jelly.",
    note: "Named after the song Black or White. Dark jelly, white milk.", src: "mj",
  },
  {
    id: "o", kind: "milk", value: "none", forms: ["o", "oh", "0"],
    langs: ["Hokkien"], script: "烏", roman: "o͘", gloss: "black",
    meaning: "No milk. Sugar stays in.",
    src: "kopi",
  },
  {
    id: "c", kind: "milk", value: "evaporated", forms: ["c", "see", "si"],
    langs: ["English", "Hainanese"], script: "鮮", gloss: "Carnation? fresh?",
    meaning: "Evaporated milk and sugar.",
    note: "Nobody agrees. Maybe the C in Carnation, a common evaporated milk brand. Maybe Hainanese si1, meaning fresh.",
    src: "kopi", disputed: true,
  },
  {
    id: "kosong", kind: "sugar", value: 0, forms: ["kosong", "no sugar"],
    langs: ["Malay"], gloss: "empty",
    meaning: "No sugar. Condensed milk is sweetened, so that goes too.",
    note: "Some stalls hear kopi kosong differently. Say kopi-o kosong to be safe.", src: "seth",
  },
  {
    id: "siewdai", kind: "sugar", value: 1, forms: ["siew dai", "siu dai", "xiu dai", "siew tai", "less sweet", "less sugar"],
    langs: ["Cantonese"], script: "少底", gloss: "less base",
    meaning: "Less sugar.",
    note: "Often traced to Cantonese siu2 dai2.", src: "kopi",
  },
  {
    id: "gadai", kind: "sugar", value: 3, forms: ["ga dai", "gah dai", "ka dai", "kah dai", "more sweet", "extra sweet"],
    langs: ["Cantonese"], script: "加底", gloss: "more base",
    meaning: "More sugar.",
    note: "Often traced to Cantonese gaa1 dai2.", src: "kopi",
  },
  {
    id: "gao", kind: "strength", value: "gao", forms: ["gao", "kau", "gau", "strong"],
    langs: ["Hokkien"], script: "厚", roman: "kāu", gloss: "thick",
    meaning: "Thicker, stronger brew.",
    src: "kopi",
  },
  {
    id: "poh", kind: "strength", value: "poh", forms: ["poh", "po", "weak"],
    langs: ["Hokkien"], script: "薄", roman: "po̍h", gloss: "thin",
    meaning: "Weaker. More water.",
    src: "kopi",
  },
  {
    id: "dilo", kind: "strength", value: "dilo", forms: ["di lo", "di loh", "ti lo", "ti loh", "tiloh", "dilo", "di low"],
    langs: ["Hokkien"], script: "直落", roman: "ti̍t lo̍h", gloss: "straight down",
    meaning: "No water added at all. The strongest pour.",
    src: "kopi",
  },
  {
    id: "peng", kind: "ice", value: true, forms: ["peng", "ping", "ice", "iced"],
    langs: ["Hokkien"], script: "冰", gloss: "ice",
    meaning: "With ice.",
    src: "kopi",
  },
  {
    id: "dabao", kind: "bag", value: true, forms: ["da bao", "dabao", "ta pau", "tapau", "ta pao", "tah pau", "takeaway", "take away", "to go"],
    langs: ["Cantonese"], script: "打包", roman: "daa2 baau1", gloss: "wrap up",
    meaning: "Takeaway. Expect a plastic bag with a string handle.",
    src: "singlish",
  },
  {
    id: "tarik", kind: "extra", value: "tarik", forms: ["tarik"],
    langs: ["Malay"], gloss: "pulled",
    meaning: "Poured back and forth between two jugs from a height until it froths.",
    note: "Started with Indian Muslim drink stalls on the Malay Peninsula.", src: "tarik",
  },
  {
    id: "halia", kind: "extra", value: "halia", forms: ["halia", "ginger"],
    langs: ["Malay"], gloss: "ginger",
    meaning: "With ginger.",
    src: "tarik",
  },
  {
    id: "dinosaur", kind: "extra", value: "dino", forms: ["dinosaur", "dino"],
    langs: ["English"], gloss: "very big",
    meaning: "Iced Milo with a heap of undissolved Milo powder on top.",
    note: "Where it started is disputed. Milo shakes were sold at Malaysian roadside stalls in the mid 1990s.", src: "dino",
  },
  {
    id: "uncle", kind: "greeting", value: null, forms: ["uncle", "auntie", "aunty", "boss", "ah pek"],
    langs: ["English"], gloss: "hello",
    meaning: "Polite. Uncle likes.",
    src: null,
  },
  { id: "n1", kind: "count", value: 1, forms: ["1", "one"], langs: ["English"], meaning: "One cup." },
  { id: "n2", kind: "count", value: 2, forms: ["2", "two"], langs: ["English"], meaning: "Two cups." },
  { id: "n3", kind: "count", value: 3, forms: ["3", "three"], langs: ["English"], meaning: "Three cups." },
  { id: "n4", kind: "count", value: 4, forms: ["4", "four"], langs: ["English"], meaning: "Four cups." },
  { id: "n5", kind: "count", value: 5, forms: ["5", "five"], langs: ["English"], meaning: "Five cups." },
  { id: "satu", kind: "count", value: 1, forms: ["satu"], langs: ["Malay"], meaning: "One cup, in Malay." },
  { id: "dua", kind: "count", value: 2, forms: ["dua"], langs: ["Malay"], meaning: "Two cups, in Malay." },
  { id: "tiga", kind: "count", value: 3, forms: ["tiga"], langs: ["Malay"], meaning: "Three cups, in Malay." },
  { id: "empat", kind: "count", value: 4, forms: ["empat"], langs: ["Malay"], meaning: "Four cups, in Malay." },
  { id: "lima", kind: "count", value: 5, forms: ["lima"], langs: ["Malay"], meaning: "Five cups, in Malay." },
];

// English stand-ins that uncle tolerates but would rather not hear.
export const ENGLISH_NUDGE = {
  coffee: "kopi", tea: "teh", ice: "peng", iced: "peng", strong: "gao", weak: "poh",
  ginger: "halia", takeaway: "da bao", "take away": "da bao", "to go": "da bao",
  "no sugar": "kosong", "less sweet": "siew dai", "less sugar": "siew dai",
  "more sweet": "ga dai", "extra sweet": "ga dai",
};

// Shown in the "Then" panel, in this order.
export const GLOSSARY_ORDER = [
  "kopi", "teh", "o", "c", "kosong", "siewdai", "gadai", "gao", "poh", "dilo",
  "peng", "dabao", "tarik", "halia", "cham", "yuanyang", "takkiu", "milo", "dinosaur", "bandung", "mj",
];
