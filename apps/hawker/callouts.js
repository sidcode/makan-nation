// What the hawker calls out when you order, in the language that stall works in: Hokkien at most Chinese
// stalls, Cantonese for wanton mee, roast meat and claypot rice, Mandarin for a few newer dishes, Malay at
// Malay and Indian Muslim stalls and for kopi codes, Tamil for thosai. Each is a count word and the dish's
// local name. Clips are made by tools/voices from these lines (keys call.<id>.<lang>); without a clip the
// device's voice or a speech bubble says it.
//
// Hokkien is written in Han characters with Pe̍h-ōe-jī, Cantonese with Jyutping, Mandarin with pinyin.

import { compile, describe } from "../kopi/compiler.js";

const W = (word) => `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;
const L = (lg, say, roman, mean, words) => ({ lg, say, roman, mean, src: words.map(W) });

// dish id -> line, with variants where the hawker says something different.
export const CALLOUTS = {
  chickenrice: {
    ...L("nan", "一盤雞飯", "chi̍t pôaⁿ koe-pn̄g", "One plate of chicken rice.", ["盤", "雞", "飯"]),
    variants: {
      steamed: L("nan", "一盤白雞飯", "chi̍t pôaⁿ pe̍h-koe-pn̄g", "One plate of white (steamed) chicken rice.", ["盤", "白雞", "飯"]),
      roasted: L("nan", "一盤燒雞飯", "chi̍t pôaⁿ sio-koe-pn̄g", "One plate of roast chicken rice.", ["盤", "燒雞", "飯"]),
    },
  },
  duckrice: L("nan", "一盤滷鴨飯", "chi̍t pôaⁿ ló͘-ah-pn̄g", "One plate of braised duck rice.", ["盤", "滷鴨", "飯"]),
  ckt: L("nan", "一盤炒粿條", "chi̍t pôaⁿ chhá-kóe-tiâu", "One plate of char kway teow.", ["盤", "炒粿條"]),
  carrotcake: {
    ...L("nan", "一盤菜頭粿", "chi̍t pôaⁿ chhài-thâu-kóe", "One plate of carrot cake.", ["盤", "菜頭粿"]),
    variants: {
      white: L("nan", "一盤白的菜頭粿", "chi̍t pôaⁿ pe̍h ê chhài-thâu-kóe", "One plate of carrot cake, the white one.", ["盤", "白", "菜頭粿"]),
      black: L("nan", "一盤烏的菜頭粿", "chi̍t pôaⁿ o͘ ê chhài-thâu-kóe", "One plate of carrot cake, the black one.", ["盤", "烏", "菜頭粿"]),
    },
  },
  hokkienmee: L("nan", "一盤福建蝦麵", "chi̍t pôaⁿ Hok-kiàn hê-mī", "One plate of Hokkien prawn mee.", ["盤", "福建", "蝦麵"]),
  orhluak: L("nan", "一盤蠔煎", "chi̍t pôaⁿ ô-chian", "One plate of oyster omelette.", ["盤", "蠔煎"]),
  chweekueh: L("nan", "一份水粿", "chi̍t hūn chúi-kóe", "One serving of chwee kueh.", ["份", "水粿"]),
  bakkutteh: L("nan", "一碗肉骨茶", "chi̍t óaⁿ bah-kut-tê", "One bowl of bak kut teh.", ["碗", "肉骨茶"]),
  economyrice: L("nan", "一盤菜飯", "chi̍t pôaⁿ chhài-pn̄g", "One plate of economy rice.", ["盤", "菜飯"]),
  kwaychap: L("nan", "一碗粿汁", "chi̍t óaⁿ kóe-chap", "One bowl of kway chap.", ["碗", "粿汁"]),
  porridge: L("nan", "一碗糜", "chi̍t óaⁿ bê", "One bowl of porridge.", ["碗", "糜"]),
  prawnnoodles: L("nan", "一碗蝦麵", "chi̍t óaⁿ hê-mī", "One bowl of prawn noodles.", ["碗", "蝦麵"]),
  lormee: L("nan", "一碗滷麵", "chi̍t óaⁿ ló͘-mī", "One bowl of lor mee.", ["碗", "滷麵"]),
  bakchormee: L("nan", "一碗肉脞麵", "chi̍t óaⁿ bah-chhò-mī", "One bowl of bak chor mee.", ["碗", "肉脞麵"]),
  fishsoup: L("nan", "一碗魚湯", "chi̍t óaⁿ hî-thng", "One bowl of fish soup.", ["碗", "魚", "湯"]),
  popiah: L("nan", "一條薄餅", "chi̍t tiâu po̍h-piáⁿ", "One roll of popiah.", ["條", "薄餅"]),
  oystercake: L("nan", "一粒蠔餅", "chi̍t lia̍p ô-piáⁿ", "One oyster cake.", ["粒", "蠔", "餅"]),
  curryrice: L("nan", "一盤咖哩飯", "chi̍t pôaⁿ ka-lí-pn̄g", "One plate of curry rice.", ["盤", "咖哩", "飯"]),
  rojak: L("nan", "一盤囉惹", "chi̍t pôaⁿ lô-jiá", "One plate of rojak.", ["盤", "羅惹"]),
  icekachang: L("nan", "一碗紅豆冰", "chi̍t óaⁿ âng-tāu-peng", "One bowl of ice kachang (red bean ice).", ["碗", "紅豆冰"]),
  chengtng: L("nan", "一碗清湯", "chi̍t óaⁿ chheng-thng", "One bowl of cheng tng.", ["碗", "清湯"]),

  wantonmee: L("yue", "一碟雲吞麵", "jat1 dip2 wan4 tan1 min6", "One plate of wanton mee.", ["碟", "雲吞麵"]),
  roastmeat: {
    ...L("yue", "一碟叉燒飯", "jat1 dip2 caa1 siu1 faan6", "One plate of char siew rice.", ["碟", "叉燒", "飯"]),
    variants: {
      charsiew: L("yue", "一碟叉燒飯", "jat1 dip2 caa1 siu1 faan6", "One plate of char siew rice.", ["碟", "叉燒", "飯"]),
      duck: L("yue", "一碟燒鴨飯", "jat1 dip2 siu1 aap3 faan6", "One plate of roast duck rice.", ["碟", "燒鴨", "飯"]),
      soya: L("yue", "一碟豉油雞飯", "jat1 dip2 si6 jau4 gai1 faan6", "One plate of soya sauce chicken rice.", ["碟", "豉油雞", "飯"]),
    },
  },
  claypot: L("yue", "一個瓦煲飯", "jat1 go3 ngaa5 bou1 faan6", "One claypot rice.", ["一個", "瓦煲", "飯"]),

  banmian: L("zh", "一碗板面", "yì wǎn bǎnmiàn", "One bowl of ban mian.", ["碗", "板麵"]),
  yongtaufoo: L("zh", "一碗酿豆腐", "yì wǎn niàng dòufu", "One bowl of yong tau foo.", ["碗", "釀豆腐"]),
  chillicrab: L("zh", "一份辣椒螃蟹", "yí fèn làjiāo pángxiè", "One chilli crab.", ["份", "辣椒", "螃蟹"]),
  peppercrab: L("zh", "一份黑胡椒螃蟹", "yí fèn hēi hújiāo pángxiè", "One black pepper crab.", ["份", "黑胡椒", "螃蟹"]),
  wings: L("zh", "一份烧鸡翅", "yí fèn shāo jīchì", "One serving of grilled chicken wings.", ["份", "燒", "雞翅"]),
  sugarcane: L("zh", "一杯甘蔗水", "yì bēi gānzhè shuǐ", "One cup of sugarcane juice.", ["杯", "甘蔗水"]),
  soya: L("zh", "一杯豆奶", "yì bēi dòunǎi", "One cup of soya bean milk.", ["杯", "豆奶"]),

  nasilemak: L("ms", "Nasi lemak satu", "", "One nasi lemak.", ["nasi lemak", "satu"]),
  laksa: L("ms", "Laksa satu", "", "One laksa.", ["laksa", "satu"]),
  meerebus: L("ms", "Mee rebus satu", "", "One mee rebus.", ["mee rebus", "satu"]),
  nasipadang: L("ms", "Nasi padang satu", "", "One nasi padang.", ["nasi padang", "satu"]),
  sambalstingray: L("ms", "Ikan pari bakar satu", "", "One grilled stingray (sambal stingray).", ["ikan", "pari", "bakar", "satu"]),
  satay: {
    ...L("ms", "Sate sepuluh cucuk", "", "Ten sticks of satay.", ["sate", "sepuluh", "cucuk"]),
    variants: {
      chicken: L("ms", "Sate ayam sepuluh cucuk", "", "Ten sticks of chicken satay.", ["sate", "ayam", "sepuluh", "cucuk"]),
      mutton: L("ms", "Sate kambing sepuluh cucuk", "", "Ten sticks of mutton satay.", ["sate", "kambing", "sepuluh", "cucuk"]),
    },
  },
  chendol: L("ms", "Cendol satu", "", "One chendol.", ["cendol", "satu"]),
  pisang: L("ms", "Pisang goreng satu", "", "One goreng pisang.", ["pisang", "goreng", "satu"]),
  currypuff: L("ms", "Karipap satu", "", "One curry puff.", ["karipap", "satu"]),
  kueh: {
    ...L("ms", "Kuih satu", "", "One kueh.", ["kuih", "satu"]),
    variants: {
      ondeh: L("ms", "Ondeh-ondeh satu", "", "One ondeh-ondeh.", ["klepon", "satu"]),
      lapis: L("ms", "Kuih lapis satu", "", "One kueh lapis.", ["kuih lapis", "satu"]),
    },
  },
  prata: {
    ...L("ms", "Roti prata kosong satu", "", "One plain roti prata.", ["roti prata", "kosong", "satu"]),
    variants: {
      plain: L("ms", "Roti prata kosong satu", "", "One plain roti prata.", ["roti prata", "kosong", "satu"]),
      egg: L("ms", "Roti telur satu", "", "One egg prata.", ["roti", "telur", "satu"]),
    },
  },
  murtabak: L("ms", "Murtabak satu", "", "One murtabak.", ["murtabak", "satu"]),
  meegoreng: L("ms", "Mee goreng satu", "", "One mee goreng.", ["mee goreng", "satu"]),
  biryani: {
    ...L("ms", "Nasi briyani satu", "", "One nasi briyani.", ["nasi briyani", "satu"]),
    variants: {
      chicken: L("ms", "Nasi briyani ayam satu", "", "One chicken briyani.", ["nasi briyani", "ayam", "satu"]),
      mutton: L("ms", "Nasi briyani kambing satu", "", "One mutton briyani.", ["nasi briyani", "kambing", "satu"]),
    },
  },
  kayatoast: L("ms", "Roti kaya satu", "", "One kaya toast.", ["roti", "kaya", "satu"]),
  thosai: L("ta", "ஒரு தோசை", "oru tōcai", "One thosai.", ["ஒரு", "தோசை"]),
};

// A key's middle part: letters and digits only.
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");

// The callout for an order: { key, line } where line is { lg, say, roman, mean }. Drinks are called in
// kopi code, the way the drinks uncle repeats it, in a Malay voice.
export function calloutFor(item) {
  if (item.dish === "drink" && item.drink) {
    const code = compile(item.drink);
    if (!code) return null;
    return { key: `call.${slug(code)}.ms`, line: { lg: "ms", say: code, roman: "", mean: `${describe(item.drink)}`, src: [W("kopi")] } };
  }
  const c = CALLOUTS[item.dish];
  if (!c) return null;
  const line = (item.variant && c.variants?.[item.variant]) || c;
  const v = line === c ? "" : item.variant;
  return { key: `call.${slug(item.dish + v)}.${line.lg}`, line: { lg: line.lg, say: line.say, roman: line.roman, mean: line.mean, src: line.src } };
}

// Every line the voice generator should make: each dish and variant, and the kopi codes the customer
// mode can ask for (those that come up in at least about one order in a thousand).
export function calloutLines(kopiCodes = []) {
  const out = [];
  for (const [id, c] of Object.entries(CALLOUTS)) {
    out.push({ key: `call.${slug(id)}.${c.lg}`, lg: c.lg, text: c.say, mean: c.mean });
    for (const [v, line] of Object.entries(c.variants ?? {})) out.push({ key: `call.${slug(id + v)}.${line.lg}`, lg: line.lg, text: line.say, mean: line.mean });
  }
  for (const code of kopiCodes) out.push({ key: `call.${slug(code)}.ms`, lg: "ms", text: code, mean: code, personas: ["uncle", "auntie"] });
  return out;
}
