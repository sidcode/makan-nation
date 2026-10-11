// One small icon set for food and stations, drawn from the same shapes as SVG (tickets, HUD, labels)
// and on canvas (crate fronts in 3D), so an ingredient looks the same wherever you meet it.
// Shapes sit in a 24 by 24 box. Colours are constants here, never user input.
//
// Food groups colour the crate lids. The colours are the Okabe-Ito palette, chosen to stay apart for
// the common kinds of colour blindness, and they always come with an icon and a name.
// Source: Okabe and Ito, Color Universal Design (2008), https://jfly.uni-koeln.de/color/

export const GROUPS = {
  grain: { name: "Rice, bread and dough", color: "#F0E442" },
  noodle: { name: "Noodles", color: "#E69F00" },
  meat: { name: "Meat, eggs and tofu", color: "#D55E00" },
  sea: { name: "Seafood", color: "#0072B2" },
  veg: { name: "Vegetables", color: "#009E73" },
  sauce: { name: "Sauces and sides", color: "#CC79A7" },
  sweet: { name: "Sweets, ice and drinks", color: "#56B4E9" },
};

const GROUP_OF = {
  rice: "grain", santan: "grain", bread: "grain", dough: "grain", batter: "grain", radish: "grain",
  kwayteow: "noodle", mee: "noodle", noodles: "noodle",
  chicken: "meat", duck: "meat", charsiew: "meat", satayc: "meat", sataym: "meat", mutton: "meat", egg: "meat",
  prawn: "sea", oyster: "sea", ikanbilis: "sea",
  cucumber: "veg", chaipoh: "veg",
  blacksauce: "sauce", curry: "sauce", rebus: "sauce", chilli: "sauce",
  ice: "sweet", redbean: "sweet", chendol: "sweet",
  ribs: "meat", porkchop: "meat", beef: "meat", tofu: "meat", cabbage: "veg", kway: "noodle", fish: "sea", stingray: "sea",
  puff: "grain", ondeh: "sweet", lapis: "sweet", soya: "sweet",
  crab: "sea", mantou: "grain", wings: "meat", mince: "meat", lor: "sauce", fruit: "veg", rojaksauce: "sauce",
  popiah: "grain", banana: "sweet", chengtng: "sweet", thosai: "grain",
  pepper: "sauce", sugarcane: "sweet", clayrice: "grain", lapcheong: "meat", cakebatter: "grain",
};

export function groupOf(kind) {
  return GROUPS[GROUP_OF[kind]] ? { id: GROUP_OF[kind], ...GROUPS[GROUP_OF[kind]] } : null;
}

const INK = "#2b1b12";

// Shapes: ["p", d, fill] path, ["c", cx, cy, r, fill], ["e", cx, cy, rx, ry, fill],
// ["r", x, y, w, h, rx, fill], ["s", d, color, width] a thick stroke with an outline under it,
// ["l", d, color, width] a thin stroke for details.
const bowl = (fill) => [
  ["p", "M3 11h18c0 5.5-4 9-9 9s-9-3.5-9-9z", "#fffdf7"],
  ["e", 12, 11, 9, 2.2, fill],
];
const plate = (inner = "#f4efe2") => [
  ["e", 12, 15, 10.5, 5.2, "#fffdf7"],
  ["e", 12, 14.6, 7, 3, inner],
];
const skewer = (meat) => [
  ["l", "M2.5 20.5L21.5 3.5", "#c9a46a", 1.6],
  ["e", 7.6, 15.9, 3.1, 2.4, meat],
  ["e", 11.8, 12.1, 3.1, 2.4, meat],
  ["e", 16, 8.3, 3.1, 2.4, meat],
];
const bird = (body, beak) => [
  ["l", "M8.5 19v3M12.5 19v3", "#c98f4a", 1.4],
  ["e", 11, 14, 8, 5.5, body],
  ["c", 17.5, 8, 3.1, body],
  ["p", "M20.3 7.3l3.2 1-3.2 1.4z", beak],
];
const steam = (color = "#b9a99a") => ["l", "M9 6.5c-1.2-1.2 1.2-2 0-3.5M13 6.5c-1.2-1.2 1.2-2 0-3.5", color, 1.1];
const fire = (y = 21) => ["p", `M7 ${y}c-1.4-2 .6-3.4.8-5 1.2 1.2 2.4 2.6 1.2 5zM11 ${y}c-1.4-2 .6-3.4.8-5 1.2 1.2 2.4 2.6 1.2 5zM15 ${y}c-1.4-2 .6-3.4.8-5 1.2 1.2 2.4 2.6 1.2 5z`, "#ff9a2a"];
const cubes = (c) => [["r", 6.5, 10.5, 4, 4, 0.7, c], ["r", 11, 12.3, 4, 4, 0.7, c], ["r", 14.6, 9.8, 4, 4, 0.7, c]];
const squiggles = (color, width, rows) => rows.map((y) => ["s", `M4.5 ${y}c2-2 3 2 5 0s3 2 5 0 3 2 5 0`, color, width]);

const ICONS = {
  // Ingredients, straight from the crates.
  rice: [["p", "M5.2 11c.8-4 3.8-6.2 6.8-6.2s6 2.2 6.8 6.2z", "#fbf8f0"], ["p", "M3 11h18c0 5.5-4 9-9 9s-9-3.5-9-9z", "#fffdf7"], ["l", "M9 8.5h1M13 7.5h1M15 9.5h1", "#d8ccb0", 1]],
  santan: [["p", "M2 19.5L12 3.5l10 16z", "#3f7d3a"], ["p", "M6 17.5c0-4 3-6.2 6-6.2s6 2.2 6 6.2z", "#fbf8f0"]],
  bread: [["p", "M5 21V11C3 11 3 4 8 4h8c5 0 5 7 3 7v10z", "#d99a52"], ["p", "M7 19v-9c-1.5 0-1.5-4 1.5-4h7c3 0 3 4 1.5 4v9z", "#f6e6c4"]],
  dough: [["c", 12, 13, 7.2, "#f0d9a8"], ["l", "M8 11c2-2 5-2 7 0", "#fffaf0", 1.5]],
  batter: bowl("#f8f6ef"),
  radish: [["r", 3, 8, 18, 10, 2, "#efe6cf"], ["l", "M3.5 12h17", "#d8ccb0", 1]],
  kwayteow: squiggles("#f7f1e1", 3.2, [7, 12, 17]),
  mee: squiggles("#f2c94c", 2.2, [7, 12, 17]),
  noodles: squiggles("#f5eed8", 1.5, [6, 10, 14, 18]),
  chicken: [...bird("#f2c7a5", "#f2a03a"), ["p", "M16 5.3c.5-1.6 2.1-1.6 2.5 0z", "#e0533a"]],
  duck: bird("#8a5a3a", "#f2a03a"),
  charsiew: [["r", 3, 9, 18, 8, 1.5, "#e0a88a"], ["r", 3, 9, 18, 3, 1.5, "#b8402e"]],
  satayc: skewer("#e8a58a"),
  sataym: skewer("#b5574a"),
  mutton: [["p", "M4 17.5c0-5 4-8 8-8s8 3 8 8z", "#a8443a"], ["c", 9, 14.5, 1, "#7a2a22"], ["c", 13.5, 12.5, 1, "#7a2a22"], ["c", 15.5, 16, 1, "#7a2a22"]],
  egg: [["p", "M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z", "#fbf6ea"]],
  prawn: [["s", "M17.5 6.5a7 7 0 1 0 1.5 9", "#f07d52", 4], ["p", "M18.5 15.5l4 .6-2.4 3.4z", "#f07d52"], ["c", 16.6, 6.8, 0.9, INK]],
  oyster: [["p", "M3 13c2-6.5 16-6.5 18 0-2 6.5-16 6.5-18 0z", "#9aa3a8"], ["e", 12, 13, 5, 2.6, "#efe9dc"]],
  ikanbilis: [["p", "M3 8c3-3 8-3 11 0-3 3-8 3-11 0zM14 8l4-3v6z", "#c9c4b6"], ["p", "M6 16c3-3 8-3 11 0-3 3-8 3-11 0zM17 16l4-3v6z", "#c9c4b6"]],
  cucumber: [["r", 2, 9, 16, 7, 3.5, "#5f9a4c"], ["c", 18.2, 12.5, 4, "#c8e2a8"], ["c", 18.2, 12.5, 1.2, "#eef7e4"]],
  chaipoh: [["r", 5, 10, 4, 4, 0.8, "#9a6a2a"], ["r", 11, 7.5, 4, 4, 0.8, "#9a6a2a"], ["r", 15, 13, 4, 4, 0.8, "#9a6a2a"], ["r", 8.5, 15, 4, 4, 0.8, "#9a6a2a"]],
  blacksauce: [["p", "M9 21V11c0-2 1.5-3 1.5-4V4h3v3c0 1 1.5 2 1.5 4v10z", "#2a1a10"], ["r", 10.5, 2, 3, 2.5, 0.5, "#c8553d"], ["r", 9.8, 13, 4.4, 4, 0.5, "#f4ead6"]],
  curry: bowl("#d9822b"),
  rebus: bowl("#a8642a"),
  chilli: [["p", "M6 6.5c4 0 4 6 8 9s6 3 6 5c-6 1-11-1-13-5S4 7.5 6 6.5z", "#d6402e"], ["s", "M6 6.5c0-2 1-3.2 3-3.2", "#3f7d3a", 1.6]],
  ice: [["p", "M12 3l8 4-8 4-8-4z", "#eef9fd"], ["p", "M4 7l8 4v10l-8-4z", "#bfe4f2"], ["p", "M20 7l-8 4v10l8-4z", "#a8d8ea"]],
  redbean: [...bowl("#5a1a1a"), ["c", 9, 10.8, 1.3, "#a83a3a"], ["c", 12.5, 10.4, 1.3, "#a83a3a"], ["c", 15.5, 11, 1.3, "#a83a3a"]],
  chendol: [...bowl("#7a4a1a"), ["l", "M6.5 10.8c2-1.2 3 1.2 5 0s3 1.2 5.5 0", "#7fd07a", 1.6]],
  // Cooked dishes that are their own component.
  ckt: [...plate(), ["s", "M6 14.5c2-2 4 2 6 0s4 2 6 0", "#5a3a22", 2.4], ["c", 15.5, 12.5, 1.3, "#f2c94c"], ["c", 9, 12.6, 1.1, "#c0392b"]],
  laksa: [...bowl("#e8892e"), ["l", "M7 11h5", "#f6efd9", 1.3], ["c", 15.5, 10.8, 1.6, "#f07d52"]],
  hokkienmee: [...plate(), ["s", "M5.5 14.5c2-2 3 2 5 0s3 2 5 0 3 2 3 0", "#e9c46a", 2], ["c", 15.5, 12.2, 1.7, "#f07d52"]],
  carrotwhite: [...plate(), ...cubes("#f3e3b0"), ["l", "M9 17l3-1", "#4a8a3a", 1.2]],
  carrotblack: [...plate(), ...cubes("#3a2618"), ["l", "M9 17l3-1", "#4a8a3a", 1.2]],
  orhluak: [...plate(), ["e", 12, 14.2, 7, 3.4, "#e8c46a"], ["e", 9.6, 13.8, 1.7, 1, "#9aa3a8"], ["e", 14.2, 14.8, 1.7, 1, "#9aa3a8"]],
  chweekueh: [["p", "M2.5 12h8.5l-1.6 6.5H4.1z", "#cfd3d6"], ["e", 6.75, 12, 4.25, 1.5, "#fbfaf4"], ["c", 6.7, 11.7, 0.9, "#6a3a10"], ["p", "M13 12h8.5l-1.6 6.5h-5.3z", "#cfd3d6"], ["e", 17.25, 12, 4.25, 1.5, "#fbfaf4"], ["c", 17.2, 11.7, 0.9, "#6a3a10"]],
  prata: [["e", 12, 13, 9.5, 6, "#d9a24f"], ["l", "M6.5 13c2-3 9-3 11 0", "#a8702f", 1.2], ["l", "M9 15.5c2 1 4 1 6 0", "#a8702f", 1.2]],
  prataegg: [["e", 12, 13, 9.5, 6, "#e6b85a"], ["e", 13, 12.5, 3.5, 2.2, "#f2b632"]],
  murtabak: [["r", 3.5, 8, 17, 10, 2, "#c98a3a"], ["l", "M4 13h16", "#8a3a2a", 1.6], ["l", "M12 8.5v9", "#a8702f", 1]],
  // The menu expansion.
  ribs: [["r", 3, 6, 18, 5, 2, "#c97a6a"], ["r", 3, 13, 18, 5, 2, "#c97a6a"], ["c", 20, 8.5, 1.6, "#f4ead6"], ["c", 20, 15.5, 1.6, "#f4ead6"]],
  porkchop: [["p", "M4 12c0-4 4-6 8-6s8 2 8 6-4 6-8 6-8-2-8-6z", "#e0a88a"], ["p", "M15 8c2 0 3 1.5 3 3s-1 2-2 2", "#fbf3e6"]],
  cabbage: [["c", 12, 13, 8, "#9fd07a"], ["l", "M12 5v16M7 8c3 2 3 8 0 11M17 8c-3 2-3 8 0 11", "#5f9a4c", 1.2]],
  tofu: [["r", 4, 9, 9, 9, 1.5, "#f4e6b8"], ["r", 12, 6, 8, 8, 1.5, "#f4e6b8"], ["c", 8.5, 13.5, 2, "#e8a890"], ["c", 16, 10, 1.8, "#e8a890"]],
  kway: [["r", 3, 7, 18, 4, 1, "#f6f2e6"], ["r", 4, 12, 16, 4, 1, "#f6f2e6"], ["r", 5, 17, 14, 3, 1, "#f6f2e6"]],
  fish: [["p", "M2 12c4-6 12-6 16 0-4 6-12 6-16 0zM18 12l4-4v8z", "#e8d8cc"], ["c", 6.5, 11, 1, "#2b1b12"]],
  beef: [["r", 4, 8, 7, 7, 1.2, "#9a3a2a"], ["r", 12, 10, 8, 7, 1.2, "#9a3a2a"], ["r", 7, 14, 6, 6, 1.2, "#b84a3a"]],
  stingray: [["p", "M12 4c5 3 9 6 10 9-4 0-7 2-10 4-3-2-6-4-10-4 1-3 5-6 10-9z", "#a8a096"], ["l", "M12 17v5", "#5b5f63", 1.4]],
  puff: [["p", "M3 16c0-6 4-10 9-10s9 4 9 10z", "#e6b85a"], ["l", "M5 15c1-1 2 1 3 0s2 1 3 0 2 1 3 0 2 1 3 0 2 1 2 0", "#a8702f", 1.2]],
  ondeh: [["c", 7, 15, 4, "#6ac46a"], ["c", 15, 15, 4, "#6ac46a"], ["c", 11, 8, 4, "#6ac46a"], ["l", "M5.5 13.5h1M14 13.5h1M9.5 6.5h1", "#fbf8f0", 1.4]],
  lapis: [["r", 4, 6, 16, 3, 0.5, "#e0607a"], ["r", 4, 9, 16, 3, 0.5, "#fbf3e6"], ["r", 4, 12, 16, 3, 0.5, "#e0607a"], ["r", 4, 15, 16, 3, 0.5, "#fbf3e6"], ["r", 4, 18, 16, 3, 0.5, "#e0607a"]],
  soya: [["p", "M7 5h10l-1.4 16H8.4z", "#f4ecd6"], ["l", "M13 2l-1 5", "#f07aa0", 1.4]],
  porridge: [...bowl("#f6f1e2"), ["l", "M8 10.5c2 1 6 1 8 0", "#d8ccb0", 1]],
  banmian: [...bowl("#e8d8a8"), ["l", "M6 10.5h12M7 11.5h10", "#c9a050", 1.2], ["c", 15, 10.5, 1.4, "#f2b632"]],
  meegoreng: [...plate(), ["s", "M5.5 14.5c2-2 3 2 5 0s3 2 5 0 3 2 3 0", "#d9662e", 2.2], ["c", 9, 12.3, 1.2, "#7cb85a"]],
  rendang: [...bowl("#4a2410"), ["r", 8, 9.6, 3, 2.4, 0.5, "#6a3a1a"], ["r", 13, 9.6, 3, 2.4, 0.5, "#6a3a1a"]],
  sambalstingray: [["p", "M2 14l10-8 10 8-10 6z", "#3f7d3a"], ["e", 12, 13, 6, 3.4, "#c9b8a0"], ["e", 12, 12.4, 4, 1.8, "#c0392b"]],
  // Famous at particular centres.
  crab: [["e", 12, 14, 7.5, 5, "#c0583a"], ["l", "M5 11L2 6M19 11l3-5M6 17l-3 3M18 17l3 3", "#c0583a", 1.8], ["c", 3, 5.5, 2, "#c0583a"], ["c", 21, 5.5, 2, "#c0583a"], ["c", 10, 12.5, 0.9, INK], ["c", 14, 12.5, 0.9, INK]],
  mantou: [["e", 8, 14, 5, 4, "#f6efe0"], ["e", 16, 13, 5, 4, "#f6efe0"], ["l", "M5 13c2-1 4-1 6 0M13 12c2-1 4-1 6 0", "#d9b98a", 1]],
  wings: [["p", "M4 14c0-4 3-7 7-7 3 0 5 2 5 4l5 1c1 0 1 3 0 3l-5 1c0 2-2 4-5 4-4 0-7-2-7-6z", "#c97a3a"], ["l", "M8 12c1-1 3-1 4 0", "#8a4a1a", 1.2]],
  mince: [["p", "M4 17c0-5 4-8 8-8s8 3 8 8z", "#d98a7a"], ["c", 9, 14, 1.2, "#b8604a"], ["c", 13, 12, 1.2, "#b8604a"], ["c", 15.5, 15, 1.2, "#b8604a"], ["c", 11, 16, 1, "#b8604a"]],
  lor: bowl("#5a3a22"),
  fruit: [["r", 3, 10, 7, 7, 1.2, "#f2d27a"], ["r", 11, 8, 6, 6, 1.2, "#7cb85a"], ["r", 14, 14, 7, 6, 1.2, "#e8d8a8"], ["l", "M5 12h3M13 10h2", "#ffffff", 1]],
  rojaksauce: bowl("#3a2618"),
  popiah: [["r", 3, 9, 18, 6, 3, "#f4ead6"], ["l", "M9 9v6M15 9v6", "#c9b48a", 1.2], ["l", "M3 12h18", "#7cb85a", 0.8]],
  banana: [["p", "M3 9c3 9 13 11 18 4-2 7-15 7-18-4z", "#e6b85a"], ["p", "M5 7c4 7 11 8 15 3", "#f2d27a"]],
  chengtng: [...bowl("#f0e2bc"), ["c", 9, 10.6, 1.2, "#c97a3a"], ["c", 14, 10.8, 1.1, "#f4f1ea"], ["c", 16, 10.2, 1, "#a8442a"]],
  thosai: [["p", "M2 16L12 5l10 11z", "#e8c46a"], ["l", "M6 14l6-6 6 6", "#c98a3a", 1.2]],
  chillicrab: [...plate(), ["e", 12, 13.5, 6, 3, "#d9452e"], ["l", "M7 12L4 9M17 12l3-3", "#c0583a", 1.6]],
  fishsoup: [...bowl("#f3ead6"), ["e", 10, 10.8, 2.2, 1, "#ffffff"], ["e", 14.5, 11, 2, 0.9, "#ffffff"], ["l", "M16 10h2", "#7cb85a", 1.2]],
  biryani: [...plate(), ["p", "M6 14c0-4 3-6 6-6s6 2 6 6z", "#e8a83a"], ["c", 10, 11, 1, "#7a3a22"], ["c", 14, 12, 1, "#7a3a22"]],
  chickenbiryani: [...plate(), ["p", "M6 14c0-4 3-6 6-6s6 2 6 6z", "#f2b632"], ["c", 10, 11, 1, "#c97a3a"], ["c", 14, 12, 1, "#c97a3a"]],
  pepper: [["r", 8, 7, 8, 14, 2.5, "#2e2622"], ["r", 9.5, 3, 5, 4.5, 1, "#c8553d"], ["c", 10.5, 12, 0.9, "#8a7a6a"], ["c", 13.5, 14.5, 0.9, "#8a7a6a"], ["c", 11, 17, 0.9, "#8a7a6a"]],
  sugarcane: [["l", "M6 21L15 3", "#7a9a3a", 3.2], ["l", "M10 22L19 4", "#9ab04a", 3.2], ["l", "M8 13.5l2.5 1.2M12.5 10.5l2.5 1.2M11 5.5l2.5 1.2", "#5a7a2a", 1.2], ["p", "M15 3l2-2 1 3z", "#7cb85a"]],
  clayrice: [["p", "M4 10h16l-1.5 9a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5z", "#a0522d"], ["e", 12, 10, 8, 2.2, "#f4efe2"], ["l", "M2 12h2M20 12h2", "#7a3a1a", 1.8]],
  lapcheong: [["p", "M4 9c4-4 12-4 16 0l-1.4 1.6c-4-3-9-3-13 0z", "#a8323a"], ["p", "M4 15c4-4 12-4 16 0l-1.4 1.6c-4-3-9-3-13 0z", "#a8323a"], ["c", 9, 9.2, 0.8, "#f4d0c8"], ["c", 14, 15.2, 0.8, "#f4d0c8"]],
  cakebatter: [...bowl("#efe2c0"), ["l", "M14 3.5l4 6", "#9aa3a8", 1.6], ["e", 13.5, 3.5, 2.4, 1.2, "#9aa3a8"]],
  peppercrab: [...plate(), ["e", 12, 13.5, 6, 3, "#4a3426"], ["l", "M7 12L4 9M17 12l3-3", "#5a3a2a", 1.6], ["c", 10, 13, 0.7, "#1e1a18"], ["c", 13.5, 14, 0.7, "#1e1a18"]],
  claypot: [["p", "M4 10h16l-1.5 9a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5z", "#7a3a1a"], ["e", 12, 10, 8, 2.2, "#c98a5a"], ["r", 8, 8.4, 3, 1.4, 0.6, "#a8323a"], ["r", 13, 8.6, 3, 1.4, 0.6, "#a8323a"], ["l", "M2 12h2M20 12h2", "#5a2a10", 1.8]],
  oystercake: [["c", 12, 13, 8, "#c98a3a"], ["c", 12, 13, 5.5, "#d9a24f"], ["e", 10.5, 12, 1.8, 1.1, "#9aa3a8"], ["e", 14, 14.5, 1.6, 1, "#c9a09b"], ["c", 13.5, 10.5, 0.8, "#8a5a2a"]],
  // Things you carry.
  plate: plate(),
  dirty: [...plate("#efe6d2"), ["c", 9, 14, 1.4, "#8a6a4a"], ["c", 14.5, 15.5, 1.1, "#8a6a4a"], ["c", 15, 13, 0.9, "#8a6a4a"]],
  box: [["p", "M3 10l3 10h12l3-10z", "#c9a46a"], ["p", "M3 10l2.2-4h13.6l2.2 4z", "#e0c08a"]],
  drink: [steam(), ["p", "M5 9h12v6a6 6 0 0 1-12 0z", "#fffdf7"], ["e", 11, 9, 6, 1.6, "#5a321a"], ["s", "M17 11c3 0 3 4 0 4", "#fffdf7", 1.4]],
  burnt: [["l", "M10 6.5c-1.2-1.2 1.2-2 0-3.5M14 6.5c-1.2-1.2 1.2-2 0-3.5", "#6a6460", 1.2], ["p", "M4 17c0-5 4-8 8-8s8 3 8 8z", "#2a2220"]],
  ext: [["r", 8, 6, 8, 15, 3, "#d6402e"], ["r", 9.5, 3, 5, 3, 0.6, "#2b2b2b"], ["l", "M14 4h4l2 3", "#2b2b2b", 1.4], ["r", 10, 12, 4, 4, 0.6, "#ffffff"]],
  towel: [["r", 4, 8, 16, 10, 2, "#f4f6f8"], ["l", "M4.5 11.5h15", "#5a8ac4", 1.4], ["p", "M9 19c1 1.5 1.3 2 1.3 2.6a1.3 1.3 0 0 1-2.6 0c0-.6.3-1.1 1.3-2.6z", "#5aa9d6"]],
  // Stations.
  wok: [fire(22), ["p", "M3 10h18c0 5-4 8-9 8s-9-3-9-8z", "#2b2b2b"], ["s", "M20.5 11.5h2.5", "#3a2a1a", 1.6]],
  pot: [fire(23.5), ["r", 5, 7, 14, 12, 2, "#b9c0c4"], ["r", 4, 5.5, 16, 2.6, 1, "#9aa3a8"], ["l", "M2.5 10h2.5M19 10h2.5", "#5b5f63", 1.6]],
  cooker: [["r", 5, 8, 14, 12, 4, "#fbf6ea"], ["p", "M6 9.5c0-3 3-5 6-5s6 2 6 5z", "#e8e2d2"], ["c", 12, 16, 1.4, "#e0533a"]],
  steamer: [steam(), ["r", 4, 10, 16, 9, 2, "#c9a46a"], ["r", 3.5, 8, 17, 3, 1, "#b08a50"], ["l", "M4 14.5h16", "#9a7440", 1]],
  grill: [fire(10.5), ["r", 3, 11, 18, 9, 1.5, "#5b5f63"], ["l", "M3.5 13.5h17M3.5 16.5h17", "#1e1e1e", 1.2]],
  board: [["r", 2.5, 10, 15, 10, 2, "#d4a36a"], ["p", "M9.5 2.5l9 9-1.6 1.6L8 4.2z", "#e4e8ea"], ["p", "M17.6 11.2l3.6 3.6-1.6 1.6-3.6-3.6z", "#3a2a1a"]],
  shaver: [["p", "M5 20.5c0-6 3-9 7-9s7 3 7 9z", "#f4fbff"], ["l", "M12 2.5v7M9 4l6 4M9 8l6-4", "#3b8fc4", 1.6]],
  press: [["r", 4, 6, 16, 10, 2, "#3f8f6a"], ["c", 9, 11, 2.6, "#d9dde0"], ["c", 15, 11, 2.6, "#d9dde0"], ["l", "M12 2v7", "#9ab04a", 2.4], ["p", "M9 16h6l-1 5h-4z", "#c8d88a"]],
  urn: [steam(), ["p", "M5 9h12v6a6 6 0 0 1-12 0z", "#fffdf7"], ["e", 11, 9, 6, 1.6, "#5a321a"], ["s", "M17 11c3 0 3 4 0 4", "#fffdf7", 1.4]],
  hatch: [["p", "M4 17a8 8 0 0 1 16 0z", "#f2b632"], ["r", 2, 17, 20, 3, 1.5, "#c8553d"], ["c", 12, 7.6, 1.7, "#f2b632"]],
  rack: [["e", 12, 17.5, 9, 3, "#fffdf7"], ["e", 12, 14, 9, 3, "#fffdf7"], ["e", 12, 10.5, 9, 3, "#fffdf7"]],
  return: [["e", 12, 17.5, 9, 3, "#efe6d2"], ["e", 12, 14, 9, 3, "#efe6d2"], ["c", 9, 14, 1.2, "#8a6a4a"], ["c", 14.5, 14.6, 1, "#8a6a4a"]],
  sink: [["p", "M12 2c3 4 4 6 4 7.5a4 4 0 0 1-8 0C8 8 9 6 12 2z", "#5aa9d6"], ["p", "M3 14h18l-2 7H5z", "#b9c0c4"]],
  bin: [["p", "M6 8h12l-1.2 13H7.2z", "#2f7d4a"], ["r", 4.5, 5, 15, 3, 1, "#256b3e"], ["l", "M10 11v7M14 11v7", "#1e5a33", 1.2]],
  boxes: [["p", "M3 10l3 10h12l3-10z", "#c9a46a"], ["p", "M3 10l2.2-4h13.6l2.2 4z", "#e0c08a"]],
  tiffin: [["r", 6, 6, 12, 4.5, 1.2, "#b9c0c4"], ["r", 6, 11, 12, 4.5, 1.2, "#b9c0c4"], ["r", 6, 16, 12, 4.5, 1.2, "#b9c0c4"], ["l", "M7 6c0-4 10-4 10 0", "#5b5f63", 1.4]],
  wrap: [["p", "M3 9l9-5 9 5-9 11z", "#d9c3a0"], ["l", "M3 9l9 3 9-3", "#a8916a", 1]],
};

// Little marks for how a component was cooked, shown beside the ingredient on tickets.
const STEP_ICONS = {
  steam: [["l", "M8 9c-2-2 2-3 0-6M12 9c-2-2 2-3 0-6M16 9c-2-2 2-3 0-6", "#8a8a8a", 1.8], ["r", 4, 11, 16, 9, 3, "#e8e2d2"]],
  poach: [["p", "M12 3c4 5.5 6 8.5 6 11a6 6 0 0 1-12 0c0-2.5 2-5.5 6-11z", "#5aa9d6"]],
  boil: [["p", "M12 3c4 5.5 6 8.5 6 11a6 6 0 0 1-12 0c0-2.5 2-5.5 6-11z", "#5aa9d6"]],
  braise: [["p", "M12 3c4 5.5 6 8.5 6 11a6 6 0 0 1-12 0c0-2.5 2-5.5 6-11z", "#6b3a1a"]],
  roast: [["p", "M12 2c5 5 7 9 5 14a5 5 0 0 1-10 0c-1-3 1-5 2-7 1 2 2 3 3 3 0-4-1-7 0-10z", "#ff7a1a"]],
  grill: [["p", "M12 2c5 5 7 9 5 14a5 5 0 0 1-10 0c-1-3 1-5 2-7 1 2 2 3 3 3 0-4-1-7 0-10z", "#ff7a1a"]],
  toast: [["p", "M12 2c5 5 7 9 5 14a5 5 0 0 1-10 0c-1-3 1-5 2-7 1 2 2 3 3 3 0-4-1-7 0-10z", "#ff7a1a"]],
  fry: [["p", "M12 2c5 5 7 9 5 14a5 5 0 0 1-10 0c-1-3 1-5 2-7 1 2 2 3 3 3 0-4-1-7 0-10z", "#ff7a1a"]],
  chop: [["p", "M4 4l13 13-2.5 2.5L3 7z", "#e4e8ea"], ["p", "M16 16l4.5 4.5-2.4 2.4-4.5-4.5z", "#3a2a1a"]],
  simmer: [["p", "M12 3c4 5.5 6 8.5 6 11a6 6 0 0 1-12 0c0-2.5 2-5.5 6-11z", "#6b3a1a"]],
  shave: [["l", "M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9", "#3b8fc4", 2.4]],
  press: [["c", 8, 12, 5, "#9aa3a8"], ["c", 16, 12, 5, "#9aa3a8"], ["c", 8, 12, 1.4, "#5b5f63"], ["c", 16, 12, 1.4, "#5b5f63"]],
};

export const ICON_IDS = Object.keys(ICONS);

// The icon for a component signature like "chicken|poach,chop", a packed item, or a station type.
export function iconOf(thing, era = null) {
  if (!thing) return null;
  if (typeof thing === "string") {
    const kind = thing.split("|")[0];
    return ICONS[kind] ? kind : null;
  }
  if (thing.k === "plate") return thing.d ? "dirty" : "plate";
  if (thing.k === "box") return era === "1950s" ? "wrap" : era === "2065" ? "tiffin" : "box";
  if (thing.k === "drink") return "drink";
  if (thing.k === "ext") return era === "1950s" ? "towel" : "ext";
  if (thing.b) return "burnt";
  return ICONS[thing.k] ? thing.k : null;
}

export function stationIcon(type, era = null) {
  if (type === "cooker" && era === "1950s") return "steamer";
  if (type === "ext") return era === "1950s" ? "towel" : "ext";
  if (type === "boxes") return era === "1950s" ? "wrap" : era === "2065" ? "tiffin" : "boxes";
  return ICONS[type] ? type : null;
}

export function stepsOf(sig) {
  const steps = sig.split("|")[1];
  return steps ? steps.split(",").filter((s) => STEP_ICONS[s]) : [];
}

// ---------- SVG, for the page ----------

const NS = "http://www.w3.org/2000/svg";

function svgShape(doc, shape) {
  const [kind, ...a] = shape;
  let el;
  if (kind === "p" || kind === "s" || kind === "l") {
    el = doc.createElementNS(NS, "path");
    el.setAttribute("d", a[0]);
  } else if (kind === "c") {
    el = doc.createElementNS(NS, "circle");
    el.setAttribute("cx", a[0]);
    el.setAttribute("cy", a[1]);
    el.setAttribute("r", a[2]);
  } else if (kind === "e") {
    el = doc.createElementNS(NS, "ellipse");
    el.setAttribute("cx", a[0]);
    el.setAttribute("cy", a[1]);
    el.setAttribute("rx", a[2]);
    el.setAttribute("ry", a[3]);
  } else if (kind === "r") {
    el = doc.createElementNS(NS, "rect");
    for (const [k, v] of [["x", a[0]], ["y", a[1]], ["width", a[2]], ["height", a[3]], ["rx", a[4]]]) el.setAttribute(k, v);
  }
  if (kind === "s" || kind === "l") {
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", a[1]);
    el.setAttribute("stroke-width", a[2]);
    el.setAttribute("stroke-linecap", "round");
    el.setAttribute("stroke-linejoin", "round");
  } else {
    el.setAttribute("fill", a[a.length - 1]);
    el.setAttribute("stroke", INK);
    el.setAttribute("stroke-width", "1.2");
    el.setAttribute("stroke-linejoin", "round");
  }
  return el;
}

function appendShapes(doc, parent, shapes) {
  for (const shape of shapes) {
    // A thick stroke gets a darker stroke under it, like the toon outlines in 3D.
    if (shape[0] === "s") parent.append(svgShape(doc, ["l", shape[1], INK, shape[3] + 2]));
    parent.append(svgShape(doc, shape));
  }
}

// An <svg> element for an icon, with up to two small step marks in the corner.
export function iconSvg(id, { size = 20, steps = [], doc = document } = {}) {
  const svg = doc.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "icon");
  appendShapes(doc, svg, ICONS[id] ?? ICONS.plate);
  steps.slice(-2).forEach((step, i) => {
    const g = doc.createElementNS(NS, "g");
    g.setAttribute("transform", `translate(${14 - i * 9} 14) scale(0.42)`);
    const bg = doc.createElementNS(NS, "circle");
    for (const [k, v] of [["cx", 12], ["cy", 12], ["r", 12], ["fill", "#fffaf0"], ["stroke", INK], ["stroke-width", 2]]) bg.setAttribute(k, v);
    g.append(bg);
    appendShapes(doc, g, STEP_ICONS[step] ?? []);
    svg.append(g);
  });
  return svg;
}

// ---------- Canvas, for textures ----------

export function drawIcon(g, id, x, y, size) {
  const shapes = ICONS[id];
  if (!shapes) return;
  g.save();
  g.translate(x, y);
  g.scale(size / 24, size / 24);
  g.lineJoin = "round";
  g.lineCap = "round";
  const stroke = (path, color, width) => {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.stroke(path);
  };
  for (const [kind, ...a] of shapes) {
    let path;
    if (kind === "p" || kind === "s" || kind === "l") path = new Path2D(a[0]);
    else {
      path = new Path2D();
      if (kind === "c") path.arc(a[0], a[1], a[2], 0, Math.PI * 2);
      else if (kind === "e") path.ellipse(a[0], a[1], a[2], a[3], 0, 0, Math.PI * 2);
      else if (kind === "r") path.roundRect(a[0], a[1], a[2], a[3], a[4]);
    }
    if (kind === "s") {
      stroke(path, INK, a[2] + 2);
      stroke(path, a[1], a[2]);
    } else if (kind === "l") stroke(path, a[1], a[2]);
    else {
      g.fillStyle = a[a.length - 1];
      g.fill(path);
      stroke(path, INK, 1.2);
    }
  }
  g.restore();
}
