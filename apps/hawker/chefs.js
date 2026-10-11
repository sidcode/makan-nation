// The people of Makan Nation: chefs you can play, hired help, and the regulars in the dining area.
// Everyone is fictional. Looks are kept simple and respectful: skin tone, hair, headwear and clothes
// that fit the era, never exaggerated features. No Three.js here, so the sim and menus can use it.

export const SKIN = ["#f3d4b5", "#ecc39c", "#dcaa7e", "#c68e5c", "#a8703f", "#8d5a34", "#6e4426"];

// look: { skin, hair: [style, color], head: [kind, color] | null, beard, glasses,
//         top: [style, color, accent], bottom: [style, color], age }
// hair styles: short, crop, bun, long, ponytail, curly, bald. head kinds: tudung, songkok, turban, cap, sunhat.
// top styles: tshirt, singlet, shirt, samfu, kurung, kebaya, saree, kurta, blouse, uniform, office, tunic.
// bottom styles: trousers, shorts, sarong, skirt.

export const CHEFS = [
  {
    id: "meiling",
    name: "Mei Ling",
    community: "Teochew Chinese",
    bio: "Third generation at her family's char kway teow stall. Listens to the wok more than to her phone.",
    look: { skin: SKIN[0], hair: ["bun", "#1d1410"], top: ["tshirt", "#f2b632"], bottom: ["trousers", "#2b3a55"], age: "adult" },
  },
  {
    id: "siti",
    name: "Siti",
    community: "Malay",
    bio: "Grinds her own rempah before sunrise and hums while she does it.",
    look: { skin: SKIN[3], hair: ["short", "#1d1410"], head: ["tudung", "#2a8f8a"], top: ["kurung", "#7cc4b0", "#2a8f8a"], bottom: ["skirt", "#7cc4b0"], age: "adult" },
  },
  {
    id: "arun",
    name: "Arun",
    community: "Tamil Indian",
    bio: "Flips prata higher than anyone at the centre, then teaches the kids how.",
    look: { skin: SKIN[5], hair: ["crop", "#1d1410"], beard: "#1d1410", top: ["tshirt", "#e0533a"], bottom: ["trousers", "#3a3a3a"], age: "adult" },
  },
  {
    id: "harpreet",
    name: "Harpreet",
    community: "Punjabi Sikh",
    bio: "Weekday engineer, weekend wok hero. Keeps every kitchen timer in his head.",
    look: { skin: SKIN[3], hair: ["short", "#1d1410"], head: ["turban", "#2d4f9c"], beard: "#1d1410", top: ["shirt", "#f4ead6"], bottom: ["trousers", "#2b3a55"], age: "adult" },
  },
  {
    id: "uncleLim",
    name: "Uncle Lim",
    community: "Hokkien Chinese",
    bio: "Forty years behind the counter. Still says the first plate of the day is the hardest.",
    look: { skin: SKIN[1], hair: ["crop", "#c9c4bc"], top: ["singlet", "#fbf8f0"], bottom: ["shorts", "#5b6b78"], age: "elder" },
  },
  {
    id: "rosalind",
    name: "Auntie Rosalind",
    community: "Peranakan",
    bio: "Knows every family's laksa rempah, and keeps all their secrets.",
    look: { skin: SKIN[1], hair: ["bun", "#3a2a22"], top: ["kebaya", "#f6d0d8", "#d9708a"], bottom: ["sarong", "#2f6b4f"], age: "elder" },
  },
  {
    id: "daniel",
    name: "Daniel",
    community: "Eurasian",
    bio: "Learned to cook from his grandmother's handwritten recipe book, stains and all.",
    look: { skin: SKIN[2], hair: ["curly", "#5a3a22"], glasses: true, top: ["shirt", "#8fb8c9"], bottom: ["trousers", "#d8c39b"], age: "adult" },
  },
  {
    id: "kamala",
    name: "Auntie Kamala",
    community: "Tamil Indian",
    bio: "Has fed three generations of her block. Remembers everyone's order, and their exam results.",
    look: { skin: SKIN[4], hair: ["bun", "#6e6a66"], top: ["saree", "#c8553d", "#f2b632"], bottom: ["skirt", "#c8553d"], age: "elder" },
  },
];

export const chefById = (id) => CHEFS.find((c) => c.id === id) ?? null;

// Hired help, matched to the names in helpers.js.
export const HELPER_LOOKS = {
  "Ah Seng": { skin: SKIN[1], hair: ["crop", "#2b2b2b"], top: ["singlet", "#fbf8f0"], bottom: ["shorts", "#3a3a3a"], age: "adult" },
  "Auntie Mei": { skin: SKIN[0], hair: ["bun", "#7a7470"], top: ["samfu", "#9fc4d8"], bottom: ["trousers", "#9fc4d8"], age: "elder" },
  "Uncle Rahim": { skin: SKIN[4], hair: ["crop", "#c9c4bc"], head: ["songkok", "#1d1410"], top: ["shirt", "#e8dcb5"], bottom: ["trousers", "#5b5f63"], age: "elder" },
  "Kak Noor": { skin: SKIN[3], hair: ["short", "#1d1410"], head: ["tudung", "#8a6fb5"], top: ["kurung", "#c4b5f0", "#8a6fb5"], bottom: ["skirt", "#c4b5f0"], age: "adult" },
  "Mr Kumar": { skin: SKIN[5], hair: ["short", "#2b2b2b"], beard: "#2b2b2b", top: ["shirt", "#f4ead6"], bottom: ["trousers", "#5b6b78"], age: "adult" },
  "Ah Boon": { skin: SKIN[0], hair: ["short", "#1d1410"], head: ["cap", "#2f6b4f"], top: ["tshirt", "#4a7fb5"], bottom: ["shorts", "#2b3a55"], age: "teen" },
  "Auntie Lily": { skin: SKIN[2], hair: ["curly", "#6e6a66"], top: ["blouse", "#f2b6c8"], bottom: ["skirt", "#5b6b78"], age: "elder" },
  "Encik Osman": { skin: SKIN[4], hair: ["crop", "#1d1410"], top: ["shirt", "#7cc4e6"], bottom: ["trousers", "#3a3a3a"], age: "adult" },
};

// ---------- The regulars in the dining area, dressed for each era ----------

// Each type lists an outfit per era. The 2065 outfits are our guess: lighter fabrics, same roots.
const REGULARS = [
  {
    type: "auntie",
    base: { hair: ["bun", "#3a3330"], age: "elder" },
    skin: [0, 1],
    eras: {
      "1950s": { top: ["samfu", "#9fc4d8"], bottom: ["trousers", "#9fc4d8"] },
      "1980s": { top: ["blouse", "#e8a08a"], bottom: ["trousers", "#5b5f63"] },
      today: { top: ["tshirt", "#d9708a"], bottom: ["trousers", "#3a3a3a"] },
      2065: { top: ["tunic", "#f2a6c8"], bottom: ["trousers", "#e8f1ee"] },
    },
  },
  {
    type: "uncle",
    base: { hair: ["crop", "#c9c4bc"], age: "elder" },
    skin: [1, 2],
    eras: {
      "1950s": { top: ["singlet", "#fbf8f0"], bottom: ["shorts", "#8a7a60"] },
      "1980s": { top: ["shirt", "#e8dcb5"], bottom: ["trousers", "#5b5f63"] },
      today: { top: ["shirt", "#8a9a6b"], bottom: ["shorts", "#3a3a3a"] },
      2065: { top: ["shirt", "#b8e0a8"], bottom: ["trousers", "#e6dccb"] },
    },
  },
  {
    type: "makcik",
    base: { hair: ["short", "#1d1410"], age: "adult" },
    skin: [3, 4],
    eras: {
      "1950s": { top: ["kurung", "#e8c46a", "#a8642a"], bottom: ["sarong", "#a8642a"] },
      "1980s": { head: ["tudung", "#f4ead6"], top: ["kurung", "#9fc4b0", "#2f6b4f"], bottom: ["skirt", "#9fc4b0"] },
      today: { head: ["tudung", "#d9708a"], top: ["kurung", "#f2b6c8", "#d9708a"], bottom: ["skirt", "#f2b6c8"] },
      2065: { head: ["tudung", "#7cc4e6"], top: ["kurung", "#d7eef0", "#7cc4e6"], bottom: ["skirt", "#d7eef0"] },
    },
  },
  {
    type: "pakcik",
    base: { hair: ["crop", "#1d1410"], age: "elder" },
    skin: [4, 3],
    eras: {
      "1950s": { head: ["songkok", "#1d1410"], top: ["shirt", "#f4ead6"], bottom: ["sarong", "#5f7a9a"] },
      "1980s": { head: ["songkok", "#1d1410"], top: ["shirt", "#c9e2f0"], bottom: ["trousers", "#5b5f63"] },
      today: { top: ["shirt", "#5b8c85"], bottom: ["trousers", "#3a3a3a"] },
      2065: { head: ["songkok", "#1d1410"], top: ["tunic", "#e8f1ee"], bottom: ["trousers", "#9ab8b0"] },
    },
  },
  {
    type: "amma",
    base: { hair: ["bun", "#1d1410"], age: "adult" },
    skin: [5, 6],
    eras: {
      "1950s": { top: ["saree", "#f2b632", "#c8553d"], bottom: ["skirt", "#f2b632"] },
      "1980s": { top: ["saree", "#2a8f8a", "#f2b632"], bottom: ["skirt", "#2a8f8a"] },
      today: { top: ["saree", "#8a3a6a", "#f2b632"], bottom: ["skirt", "#8a3a6a"] },
      2065: { top: ["saree", "#f2d27a", "#7cc4e6"], bottom: ["skirt", "#f2d27a"] },
    },
  },
  {
    type: "appa",
    base: { hair: ["short", "#2b2b2b"], beard: "#2b2b2b", age: "adult" },
    skin: [5, 4],
    eras: {
      "1950s": { top: ["singlet", "#fbf8f0"], bottom: ["sarong", "#fbf8f0"] },
      "1980s": { top: ["shirt", "#f4ead6"], bottom: ["trousers", "#3a3a3a"] },
      today: { top: ["kurta", "#e8dcb5"], bottom: ["trousers", "#f4ead6"] },
      2065: { top: ["kurta", "#d7eef0"], bottom: ["trousers", "#fbfdfc"] },
    },
  },
  {
    type: "sikh",
    base: { hair: ["short", "#1d1410"], beard: "#3a3330", age: "adult" },
    skin: [3, 2],
    eras: {
      "1950s": { head: ["turban", "#f4ead6"], top: ["shirt", "#e8dcb5"], bottom: ["trousers", "#8a7a60"] },
      "1980s": { head: ["turban", "#2d4f9c"], top: ["shirt", "#f4ead6"], bottom: ["trousers", "#3a3a3a"] },
      today: { head: ["turban", "#c8553d"], top: ["shirt", "#4a7fb5"], bottom: ["trousers", "#2b3a55"] },
      2065: { head: ["turban", "#f2b632"], top: ["tunic", "#fbfdfc"], bottom: ["trousers", "#9ab8b0"] },
    },
  },
  {
    type: "student",
    base: { hair: ["short", "#1d1410"], age: "teen" },
    skin: [0, 3, 5],
    eras: {
      "1950s": { top: ["shirt", "#fbf8f0"], bottom: ["shorts", "#d8c39b"] },
      "1980s": { top: ["uniform", "#fbf8f0", "#2d4f9c"], bottom: ["shorts", "#2d4f9c"] },
      today: { top: ["uniform", "#fbf8f0", "#2f6b4f"], bottom: ["shorts", "#2f6b4f"] },
      2065: { top: ["uniform", "#fbfdfc", "#7cc4e6"], bottom: ["trousers", "#7cc4e6"] },
    },
  },
  {
    type: "officeWorker",
    base: { hair: ["ponytail", "#2b1b12"], age: "adult" },
    skin: [0, 2, 4],
    eras: {
      "1950s": { top: ["blouse", "#f4ead6"], bottom: ["skirt", "#8a7a60"] },
      "1980s": { top: ["office", "#f6d0d8", "#d9708a"], bottom: ["skirt", "#5b5f63"] },
      today: { top: ["office", "#f4f6f8", "#2d4f9c"], bottom: ["trousers", "#2b2b2b"] },
      2065: { top: ["office", "#fbfdfc", "#2a8f8a"], bottom: ["trousers", "#e8f1ee"] },
    },
  },
  {
    type: "eurasianDad",
    base: { hair: ["curly", "#5a3a22"], age: "adult" },
    skin: [2, 1],
    eras: {
      "1950s": { top: ["shirt", "#f4ead6"], bottom: ["trousers", "#d8c39b"] },
      "1980s": { top: ["shirt", "#f2b632"], bottom: ["trousers", "#5b5f63"] },
      today: { glasses: true, top: ["tshirt", "#3b5bdb"], bottom: ["shorts", "#d8c39b"] },
      2065: { glasses: true, top: ["shirt", "#ffd27a"], bottom: ["trousers", "#e6dccb"] },
    },
  },
  {
    type: "kid",
    base: { hair: ["short", "#1d1410"], age: "child" },
    skin: [0, 4, 5],
    eras: {
      "1950s": { top: ["singlet", "#fbf8f0"], bottom: ["shorts", "#5f7a9a"] },
      "1980s": { top: ["tshirt", "#e0533a"], bottom: ["shorts", "#2b3a55"] },
      today: { head: ["cap", "#f2b632"], top: ["tshirt", "#5fae5a"], bottom: ["shorts", "#2b3a55"] },
      2065: { top: ["tshirt", "#7cf0e6"], bottom: ["shorts", "#fbfdfc"] },
    },
  },
  {
    type: "trishawUncle",
    base: { hair: ["crop", "#2b2b2b"], age: "elder" },
    skin: [2, 3],
    eras: {
      "1950s": { head: ["sunhat", "#d8c39b"], top: ["singlet", "#f4efe2"], bottom: ["shorts", "#3a3a3a"] },
      "1980s": { top: ["singlet", "#fbf8f0"], bottom: ["shorts", "#5b6b78"] },
      today: { head: ["cap", "#c8553d"], top: ["shirt", "#f4ead6"], bottom: ["shorts", "#3a3a3a"] },
      2065: { top: ["shirt", "#e8f1ee"], bottom: ["shorts", "#9ab8b0"] },
    },
  },
];

// A table of regulars for an era, the same every time for the same seed.
export function regularsFor(eraId, count, seed = 7) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const order = REGULARS.map((r, i) => [rand(), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => REGULARS[i]);
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = order[i % order.length];
    const e = r.eras[eraId] ?? r.eras.today;
    const skin = SKIN[r.skin[Math.floor(rand() * r.skin.length)]];
    out.push({ type: r.type, ...r.base, ...e, skin });
  }
  return out;
}

export const REGULAR_TYPES = REGULARS.map((r) => r.type);

// One regular's look for an era, by type. The seed picks among the type's skin tones.
export function lookOf(type, eraId, seed = 0) {
  const r = REGULARS.find((x) => x.type === type) ?? REGULARS[0];
  const e = r.eras[eraId] ?? r.eras.today;
  return { type: r.type, ...r.base, ...e, skin: SKIN[r.skin[Math.abs(seed) % r.skin.length]] };
}

// ---------- A small SVG portrait for menus, built from the same look ----------

function esc(s) {
  return String(s).replace(/[^#0-9a-fA-F]/g, "");
}

export function avatarSvg(look, size = 64) {
  const skin = esc(look.skin);
  const [hairStyle, hairColor = "#1d1410"] = look.hair ?? ["short"];
  const [headKind, headColor = "#333"] = look.head ?? [];
  const [, topColor = "#ccc", accent] = look.top ?? [];
  const parts = [];
  // Shoulders and clothes.
  parts.push(`<path d="M10 64 Q10 44 32 42 Q54 44 54 64 Z" fill="${esc(topColor)}"/>`);
  if (accent) parts.push(`<path d="M24 43 L32 52 L40 43" fill="none" stroke="${esc(accent)}" stroke-width="3"/>`);
  if (look.top?.[0] === "saree") parts.push(`<path d="M18 46 L44 64 L36 64 L14 50 Z" fill="${esc(accent ?? topColor)}"/>`);
  // Hair behind the head.
  const hc = esc(hairColor);
  if (!headKind || headKind === "cap" || headKind === "sunhat") {
    if (hairStyle === "bun") parts.push(`<circle cx="32" cy="13" r="7" fill="${hc}"/>`);
    if (hairStyle === "long" || hairStyle === "ponytail") parts.push(`<rect x="19" y="20" width="26" height="22" rx="8" fill="${hc}"/>`);
  }
  if (headKind === "tudung") parts.push(`<path d="M14 30 Q14 10 32 10 Q50 10 50 30 L52 50 Q32 58 12 50 Z" fill="${esc(headColor)}"/>`);
  // Face.
  parts.push(`<ellipse cx="32" cy="29" rx="12" ry="13" fill="${skin}"/>`);
  if (look.beard) parts.push(`<path d="M21 31 Q32 48 43 31 Q41 41 32 42 Q23 41 21 31 Z" fill="${esc(look.beard)}"/>`);
  // Hair on top.
  if (!headKind || headKind === "songkok") {
    const curls = hairStyle === "curly";
    if (hairStyle !== "bald") parts.push(`<path d="M20 26 Q20 14 32 14 Q44 14 44 26 Q38 20 32 21 Q26 20 20 26 Z" fill="${hc}"${curls ? ` stroke="${hc}" stroke-width="4" stroke-linejoin="round"` : ""}/>`);
  }
  if (headKind === "tudung") parts.push(`<path d="M19 26 Q19 15 32 15 Q45 15 45 26 Q40 19 32 19 Q24 19 19 26 Z" fill="${esc(headColor)}"/>`);
  if (headKind === "songkok") parts.push(`<rect x="21" y="9" width="22" height="9" rx="2" fill="${esc(headColor)}"/>`);
  if (headKind === "turban") parts.push(`<path d="M19 24 Q18 9 32 8 Q46 9 45 24 Q40 18 32 22 Q24 18 19 24 Z" fill="${esc(headColor)}"/><path d="M32 22 L28 11" stroke="#00000030" stroke-width="2"/>`);
  if (headKind === "cap") parts.push(`<path d="M20 20 Q20 11 32 11 Q44 11 44 20 Z" fill="${esc(headColor)}"/><rect x="30" y="18" width="18" height="4" rx="2" fill="${esc(headColor)}"/>`);
  if (headKind === "sunhat") parts.push(`<path d="M10 20 L32 6 L54 20 Z" fill="${esc(headColor)}"/>`);
  // Eyes and a smile.
  parts.push(`<circle cx="27.5" cy="29" r="1.6" fill="#1d1410"/><circle cx="36.5" cy="29" r="1.6" fill="#1d1410"/>`);
  if (look.glasses) parts.push(`<g fill="none" stroke="#1d1410" stroke-width="1.4"><circle cx="27.5" cy="29" r="3.6"/><circle cx="36.5" cy="29" r="3.6"/><path d="M31 29 L33 29"/></g>`);
  if (!look.beard) parts.push(`<path d="M28.5 35 Q32 38 35.5 35" fill="none" stroke="#7a3a2a" stroke-width="1.4" stroke-linecap="round"/>`);
  if (look.age === "elder" && !look.beard) parts.push(`<path d="M24 24 L27 23.5 M37 23.5 L40 24" stroke="#00000030" stroke-width="1"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${parts.join("")}</svg>`;
}
