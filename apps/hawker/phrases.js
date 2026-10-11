// What customers say at the counter, in the languages you hear at a hawker centre.
// Every phrase is built only from words checked on Wiktionary (links below), and each one changes
// the order: takeaway means a box instead of a plate, extra chilli means a saucer of chilli on the side.
// Where we could not verify a phrase in a language, that language simply does not say it.

// Voice locales, best first. Browsers can only speak with the voices a device has: Edge offers
// Singapore English online, Android's Google voices cover Malay, Tamil (India), Cantonese and Mandarin,
// and nothing speaks Hokkien. Singlish is only ever spoken with a local accent: a player's recording, a
// generated clip in a synthetic Singapore voice, or a device's Singapore or Malaysian English voice. A US
// or British voice reading "Aiyo, so slow leh" would be wrong, so without one of those the words show on
// screen instead. No accent is mapped to a community.
export const LANGS = {
  en: { name: "Singlish", voice: ["en-SG", "en-MY"] },
  ms: { name: "Malay", voice: ["ms-SG", "ms-MY", "ms"] },
  zh: { name: "Mandarin", voice: ["zh-SG", "zh-CN", "cmn-Hans-CN", "cmn", "zh-TW"] },
  yue: { name: "Cantonese", voice: ["zh-HK", "yue-HK", "yue"] },
  nan: { name: "Hokkien", voice: ["nan-TW", "nan"] },
  ta: { name: "Tamil", voice: ["ta-SG", "ta-MY", "ta-IN", "ta"] },
};

const W = (word) => `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;

// modifier -> language -> { say, roman, mean, src }
export const PHRASES = {
  plain: {
    en: { say: "One, please.", roman: "", mean: "One, please.", src: [] },
    ms: { say: "Satu.", roman: "", mean: "One.", src: [W("satu")] },
    yue: { say: "唔該", roman: "m4 goi1", mean: "Please.", src: [W("唔該")] },
  },
  takeaway: {
    en: { say: "Dabao.", roman: "", mean: "Takeaway (Singlish, from Mandarin 打包).", src: [W("dabao")] },
    ms: { say: "Bungkus.", roman: "", mean: "Wrap it up, to take away.", src: [W("bungkus")] },
    zh: { say: "打包", roman: "dǎbāo", mean: "Pack it to take away.", src: [W("打包")] },
    yue: { say: "打包", roman: "daa2 baau1", mean: "Pack it to take away.", src: [W("打包")] },
  },
  nochilli: {
    en: { say: "No chilli, hor.", roman: "", mean: "No chilli, remember.", src: [W("hor")] },
    ms: { say: "Jangan pedas.", roman: "", mean: "Don't make it spicy.", src: [W("jangan"), W("pedas")] },
    zh: { say: "不要辣", roman: "bùyào là", mean: "Not spicy, please.", src: [W("不要"), W("辣")] },
    yue: { say: "走辣", roman: "zau2 laat6", mean: "Leave out the chilli.", src: [W("走"), W("辣")] },
    nan: { say: "毋愛薟", roman: "m̄-ài hiam", mean: "Don't want it spicy.", src: [W("毋愛"), W("薟")] },
    ta: { say: "காரம் வேண்டாம்", roman: "kāram vēṇṭām", mean: "No spice, please.", src: [W("காரம்"), W("வேண்டாம்")] },
  },
  extrachilli: {
    en: { say: "More chilli lah.", roman: "", mean: "More chilli, please.", src: [W("lah")] },
    ms: { say: "Tambah sambal.", roman: "", mean: "Add sambal.", src: [W("tambah"), "https://en.wikipedia.org/wiki/Sambal"] },
    zh: { say: "加辣", roman: "jiā là", mean: "Add chilli.", src: [W("加"), W("辣")] },
  },
};

export const MODIFIERS = {
  takeaway: { label: "Takeaway", needs: "a takeaway box instead of a plate" },
  nochilli: { label: "No chilli", needs: "no chilli on the side" },
  extrachilli: { label: "Extra chilli", needs: "a saucer of chilli on the side" },
};

// Who you are likely to hear, by era. A game guess: more dialect in the old days, more English now.
const LANG_WEIGHTS = {
  "1950s": { nan: 4, yue: 3, ms: 3, ta: 2, en: 1, zh: 1 },
  "1980s": { en: 3, zh: 3, ms: 3, nan: 2, yue: 2, ta: 2 },
  today: { en: 5, zh: 3, ms: 3, ta: 2, yue: 1, nan: 1 },
  2065: { en: 5, zh: 3, ms: 3, ta: 2, yue: 1, nan: 1 },
};

// Picks a modifier and a language that can say it. Chilli modifiers only for dishes served with chilli.
export function pickOrderVoice(rand, eraId, { chilli = false, takeaway = true } = {}) {
  const roll = rand();
  let md = "plain";
  if (takeaway && roll < 0.2) md = "takeaway";
  else if (chilli && roll < 0.3) md = "nochilli";
  else if (chilli && roll < 0.4) md = "extrachilli";
  const weights = LANG_WEIGHTS[eraId] ?? LANG_WEIGHTS.today;
  const can = Object.entries(weights).filter(([lg]) => PHRASES[md][lg]);
  let r = rand() * can.reduce((n, [, w]) => n + w, 0);
  for (const [lg, w] of can) if ((r -= w) < 0) return { md, lg };
  return { md, lg: can[0][0] };
}

export function phraseFor(md, lg) {
  return PHRASES[md]?.[lg] ?? PHRASES[md]?.en ?? PHRASES.plain.en;
}

// ---------- What customers and chefs say out loud ----------
// Short lines, each checked word by word (links in src). Particles follow their Wiktionary senses:
// lah for emphasis or impatience, leh for a mild complaint, lor for resignation, meh for doubt,
// hor to say "remember, ah", sia for an exclamation (mostly young speakers, so only they use it).

const P = "https://en.wikipedia.org/wiki/Singlish_vocabulary";

// line -> language -> { say, roman, mean, src, young }
export const LINES = {
  uncle: {
    en: { say: "Uncle!", mean: "Calling an older man, like a hawker.", src: [W("uncle")] },
    ms: { say: "Pak cik!", mean: "Uncle! (calling an older man)", src: [W("pak cik")] },
  },
  auntie: {
    en: { say: "Auntie!", mean: "Calling an older woman, like a hawker.", src: [W("auntie")] },
    ms: { say: "Mak cik!", mean: "Auntie!", src: [W("mak cik")] },
  },
  hello: {
    zh: { say: "老板！", roman: "lǎobǎn", mean: "Boss! (polite way to call a stall owner)", src: [W("老闆")] },
    yue: { say: "老闆！", roman: "lou5 baan2", mean: "Boss!", src: [W("老闆")] },
    nan: { say: "頭家！", roman: "thâu-ke", mean: "Boss! (how customers call a shop owner)", src: [W("頭家")] },
    ta: { say: "வணக்கம்!", roman: "vaṇakkam", mean: "Hello!", src: [W("வணக்கம்")] },
  },
  thanks: {
    en: { say: "Thank you ah.", mean: "Thank you.", src: [P] },
    ms: { say: "Terima kasih.", mean: "Thank you.", src: [W("terima kasih")] },
    zh: { say: "谢谢。", roman: "xièxie", mean: "Thank you.", src: [W("謝謝")] },
    yue: { say: "唔該。", roman: "m4 goi1", mean: "Thanks (for the service).", src: [W("唔該")] },
    nan: { say: "多謝。", roman: "to-siā", mean: "Thank you.", src: [W("多謝")] },
    ta: { say: "நன்றி.", roman: "naṉṟi", mean: "Thank you.", src: [W("நன்றி")] },
  },
  tasty: {
    en: { say: "Wah, shiok!", mean: "Wow, so good!", src: [W("wah"), W("shiok")] },
    ms: { say: "Sedapnya!", mean: "So delicious!", src: [W("sedap"), W("-nya")] },
    zh: { say: "好吃！", roman: "hǎochī", mean: "Tasty!", src: [W("好吃")] },
    yue: { say: "好食！", roman: "hou2 sik6", mean: "Tasty!", src: [W("好食")] },
    nan: { say: "好食！", roman: "hó-chia̍h", mean: "Tasty!", src: [W("好食")] },
    ta: { say: "நல்ல சுவை!", roman: "nalla cuvai", mean: "Good taste!", src: [W("நல்ல"), W("சுவை")] },
  },
  tastyyoung: {
    en: { say: "Shiok sia!", mean: "So good! (sia: an exclamation, mostly young speakers)", src: [W("shiok"), W("sia")], young: true },
  },
  fast: {
    en: { say: "Ready already meh?", mean: "Ready already? Really?", src: [W("meh")] },
  },
  slow: {
    en: { say: "Aiyo, so slow leh.", mean: "Oh dear, this is slow.", src: [W("aiyo"), W("leh")] },
    ms: { say: "Lambatnya!", mean: "So slow!", src: [W("lambat"), W("-nya")] },
    zh: { say: "怎么这么慢？", roman: "zěnme zhème màn", mean: "Why so slow?", src: [W("怎麼"), W("這麼"), W("慢")] },
    yue: { say: "好慢呀！", roman: "hou2 maan6 aa3", mean: "So slow!", src: [W("好"), W("慢")] },
    nan: { say: "真慢！", roman: "chin bān", mean: "Really slow!", src: [W("真"), W("慢")] },
    ta: { say: "சீக்கிரம்!", roman: "cīkkiram", mean: "Quickly, please!", src: [W("சீக்கிரம்")] },
  },
  gone: {
    en: { say: "Never mind lor, next time.", mean: "Never mind, maybe next time.", src: [W("lor")] },
  },
  wrong: {
    en: { say: "This one I never order leh.", mean: "I didn't order this.", src: [W("leh")] },
  },
};

// Chefs say a few things too, in Singlish.
export const CHEF_LINES = {
  burnt: { en: { say: "Aiyo, burnt!", mean: "Oh no, it burnt!", src: [W("aiyo")] } },
  fire: { en: { say: "Alamak, fire!", mean: "Oh dear, a fire!", src: [W("alamak")] } },
  streak: { en: { say: "Steady lah!", mean: "Nice one!", src: [W("steady"), W("lah")] } },
};

// Who sounds like whom. Five voice personas, shared with the offline voice generator.
export const PERSONAS = {
  auntie: { g: "f", age: "elder" },
  uncle: { g: "m", age: "elder" },
  youngwoman: { g: "f", age: "adult" },
  youngman: { g: "m", age: "adult" },
  student: { g: "", age: "teen" },
};

export const REGULAR_PERSONA = {
  auntie: "auntie", uncle: "uncle", makcik: "auntie", pakcik: "uncle", amma: "auntie", appa: "youngman", sikh: "youngman",
  student: "student", officeWorker: "youngwoman", eurasianDad: "youngman", kid: "student", trishawUncle: "uncle",
};

export const CHEF_PERSONA = {
  meiling: "youngwoman", siti: "youngwoman", arun: "youngman", harpreet: "youngman", uncleLim: "uncle", rosalind: "auntie", daniel: "youngman", kamala: "auntie",
  "Ah Seng": "youngman", "Auntie Mei": "auntie", "Uncle Rahim": "uncle", "Kak Noor": "youngwoman", "Mr Kumar": "youngman", "Ah Boon": "student", "Auntie Lily": "auntie", "Encik Osman": "youngman",
};

export const YOUNG = new Set(["youngwoman", "youngman", "student"]);

// Dialects people can lend their voice in. The game's customers speak the first six; the rest are
// heard when someone records them.
export const VOICE_TAGS = {
  en: "Singlish", ms: "Malay", zh: "Mandarin", yue: "Cantonese", nan: "Hokkien", ta: "Tamil",
  teochew: "Teochew", hakka: "Hakka", hainanese: "Hainanese",
};

// Every line a customer or chef can say, with stable keys for recorded and generated clips:
// order.<modifier>.<lang>, react.<line>.<lang>, chef.<line>.<lang>.
export function speakableLines() {
  const out = [];
  for (const [md, langs] of Object.entries(PHRASES)) for (const [lg, p] of Object.entries(langs)) out.push({ key: `order.${md}.${lg}`, lg, text: p.say, mean: p.mean });
  for (const [line, langs] of Object.entries(LINES)) for (const [lg, p] of Object.entries(langs)) out.push({ key: `react.${line}.${lg}`, lg, text: p.say, mean: p.mean });
  for (const [line, langs] of Object.entries(CHEF_LINES)) for (const [lg, p] of Object.entries(langs)) out.push({ key: `chef.${line}.${lg}`, lg, text: p.say, mean: p.mean });
  return out;
}

// What a dialect speaker can record: the same reactions, said their own way. The text is the meaning.
export const DIALECT_LINES = ["hello", "thanks", "tasty", "slow"];

export function lineText(key) {
  const [kind, line, lg] = key.split(".");
  const table = kind === "order" ? PHRASES : kind === "chef" ? CHEF_LINES : LINES;
  return table[line]?.[lg] ?? null;
}

// The words you will hear, for the recipe book.
export const GLOSSARY = [
  { word: "lah", lang: "Singlish", mean: "Ends a sentence with emphasis, reassurance or impatience: Hurry up lah!", src: W("lah") },
  { word: "leh", lang: "Singlish", mean: "Softens or stresses a remark, often a mild complaint: So slow leh.", src: W("leh") },
  { word: "lor", lang: "Singlish", mean: "Resignation, or an obvious answer: Never mind lor.", src: W("lor") },
  { word: "meh", lang: "Singlish", mean: "Turns a sentence into a doubtful question: Ready already meh?", src: W("meh") },
  { word: "hor", lang: "Singlish", mean: "Asks you to keep something in mind: No chilli, hor.", src: W("hor") },
  { word: "sia", lang: "Singlish", mean: "An exclamation of surprise or shock, used mostly by younger speakers: Shiok sia!", src: W("sia") },
  { word: "shiok", lang: "Singlish, from Malay syok", mean: "Delightful, especially good food.", src: W("shiok") },
  { word: "wah", lang: "Singlish", mean: "Wow! Surprise or delight.", src: W("wah") },
  { word: "aiyo", lang: "Singlish, from Tamil or Chinese", mean: "Oh dear! Distress or regret.", src: W("aiyo") },
  { word: "alamak", lang: "Singlish and Malay", mean: "Oh no! Alarm about a problem.", src: W("alamak") },
  { word: "steady", lang: "Singlish", mean: "Nice! Well done, cool under pressure.", src: W("steady") },
  { word: "dabao", lang: "Singlish, from Mandarin 打包", mean: "Takeaway.", src: W("dabao") },
  { word: "uncle, auntie", lang: "Singapore English", mean: "Polite ways to call an older man or woman, like a hawker.", src: W("uncle") },
  { word: "terima kasih", lang: "Malay", mean: "Thank you.", src: W("terima kasih") },
  { word: "sedapnya", lang: "Malay", mean: "So delicious! (sedap with -nya for emphasis)", src: W("sedap") },
  { word: "谢谢 xièxie", lang: "Mandarin", mean: "Thank you.", src: W("謝謝") },
  { word: "老板 lǎobǎn", lang: "Mandarin", mean: "Boss: a polite way to call the stall owner.", src: W("老闆") },
  { word: "唔該 m4 goi1", lang: "Cantonese", mean: "Please, or thanks for a service.", src: W("唔該") },
  { word: "多謝 to-siā", lang: "Hokkien", mean: "Thank you.", src: W("多謝") },
  { word: "頭家 thâu-ke", lang: "Hokkien", mean: "Boss: how customers call a shop owner.", src: W("頭家") },
  { word: "好食 hó-chia̍h", lang: "Hokkien (hou2 sik6 in Cantonese)", mean: "Tasty.", src: W("好食") },
  { word: "நன்றி naṉṟi", lang: "Tamil", mean: "Thank you.", src: W("நன்றி") },
  { word: "வணக்கம் vaṇakkam", lang: "Tamil", mean: "Hello.", src: W("வணக்கம்") },
];
