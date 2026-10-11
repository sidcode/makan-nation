// Finished dishes, plated the way they look at the stall. When everything a dish needs is on the plate,
// the loose pieces give way to the real thing, so a ready plate is easy to spot.

import { Group } from "three";
import { DISHES } from "./dishes.js";
import { bowl as bowlWare, chopsticks, cucumbers as cukes, friedEgg, greens as leaves, halfEgg, nest, oil, plateWare, prawn as shrimp, rice, satayStick, slices, spoonAndFork, steam, surface } from "./foodkit.js";
import { mat, mesh } from "./models.js";

const g = (...kids) => {
  const out = new Group();
  out.add(...kids.filter(Boolean));
  return out;
};

const GREEN = "#4a8a3a";

// The helpers every dish is built from, made closer to the real thing in foodkit.js.
const riceDome = (x = -0.07, z = 0) => rice(x, z);
const cucumbers = (x, z, n = 3) => cukes(x, z, n);
// Sliced meat: chicken, char siew, duck, with its skin or glaze on top.
const fan = (color, edge, x = 0.07, z = 0, n = 4) => slices(color, edge, x, z, n + 1);
// Noodles on a plate, in their sauce.
const noodles = (color, r = 0.13) => g(nest(color, r, 0.075, { thick: color === "#5a3a22" || color === "#d9662e" ? 0.011 : 0.008, flat: color === "#5a3a22", seed: r * 100 }), surface(color, r * 0.85, 0.032, { finish: "glossy" }));
// Noodles in a bowl of soup.
const bowlNoodles = (color, r = 0.15) => nest(color, r, 0.04, { y: 0.1, seed: 7 });
const prawn = (x, z, s = 0.055) => shrimp(x, z, s);
const greens = (x, z) => leaves(x, z, 3, 0.09);
// A bowl with something in it: soup, broth or porridge, glossy, with a little oil on top.
const bowl = (fill, r = 0.2) => g(bowlWare(r, 0.13), surface(fill, r * 0.9, 0.115), oil(shade(fill, 1.18), r * 0.9, 0.115, 6, Math.round(r * 100)));
const curryBowl = (x, z) => {
  const b = g(bowlWare(0.08, 0.07, { rim: null }), surface("#d9822b", 0.07, 0.062), oil("#e8a03a", 0.07, 0.062, 4, 9));
  b.position.set(x, 0, z);
  return b;
};
const egg = (x, z) => friedEgg(x, z);
const skewer = (meat, x, z, a) => satayStick(meat, x, z, a);

// A lighter or darker version of a colour, for oil on soup.
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, "0")).join("")}`;
}

const BUILD = {
  chickenrice: (v) => g(riceDome(), fan("#f6eedd", v === "roasted" ? "#c98436" : "#f3e2b0"), cucumbers(-0.1, 0.12), greens(0.1, 0.1)),
  duckrice: () => g(riceDome(), fan("#9a5a32", "#6b3a1a"), mesh("cyl", mat("#5a3218", { transparent: true, opacity: 0.8 }), { pos: [0.06, 0.035, 0], scale: [0.12, 0.004, 0.12], shadow: false }), cucumbers(-0.1, 0.12)),
  kayatoast: () =>
    g(
      ...[0, 1].map((i) =>
        g(
          mesh("box", mat("#e0a85a"), { pos: [i * 0.04 - 0.02, 0.04 + i * 0.05, 0], scale: [0.2, 0.025, 0.2], rot: [0, 0.785 + i * 0.3, 0] }),
          mesh("box", mat("#c6a23a"), { pos: [i * 0.04 - 0.02, 0.058 + i * 0.05, 0], scale: [0.18, 0.012, 0.18], rot: [0, 0.785 + i * 0.3, 0], shadow: false }),
        ),
      ),
      mesh("box", mat("#fff3b0"), { pos: [0.02, 0.12, 0], scale: [0.06, 0.02, 0.03], shadow: false }),
    ),
  ckt: () => g(noodles("#5a3a22"), ...[[0.05, 0.04], [-0.06, 0.02], [0, -0.07]].map(([x, z]) => mesh("sphere", mat("#7a5a4a"), { pos: [x, 0.1, z], scale: [0.025, 0.018, 0.025], shadow: false })), mesh("box", mat("#f2c94c"), { pos: [0.03, 0.1, -0.03], scale: [0.04, 0.012, 0.03], shadow: false }), greens(-0.04, 0.06)),
  carrotcake: (v) =>
    g(
      ...Array.from({ length: 9 }, (_, i) => mesh("box", mat(v === "black" ? "#3a2618" : "#f3e3b0"), { pos: [Math.cos(i * 2.2) * 0.09, 0.04 + (i % 3) * 0.015, Math.sin(i * 2.2) * 0.08], scale: [0.055, 0.045, 0.055], rot: [0, i, 0] })),
      v === "white" ? mesh("cyl", mat("#f6dc8a"), { pos: [0, 0.03, 0], scale: [0.15, 0.012, 0.13], shadow: false }) : null,
      greens(0.02, 0.02),
    ),
  hokkienmee: () => g(noodles("#ecd58a"), prawn(0.04, 0.03), prawn(-0.05, -0.02), mesh("sphere", mat("#7cc46a"), { pos: [0.11, 0.05, -0.08], scale: [0.03, 0.025, 0.03] }), mesh("sphere", mat("#c0392b"), { pos: [-0.1, 0.05, 0.09], scale: [0.03, 0.015, 0.03], shadow: false })),
  wantonmee: () => g(noodles("#f2c94c", 0.11), fan("#e0a88a", "#b8402e", 0.06, -0.02, 3), greens(-0.08, 0.08), mesh("sphere", mat("#f6e6c4"), { pos: [-0.09, 0.06, -0.06], scale: [0.04, 0.025, 0.035] })),
  orhluak: () => g(mesh("cyl", mat("#e8c46a"), { pos: [0, 0.035, 0], scale: [0.18, 0.03, 0.16] }), ...[[0.06, 0.02], [-0.05, 0.05], [0, -0.06], [0.08, -0.06]].map(([x, z]) => mesh("sphere", mat("#9aa3a8"), { pos: [x, 0.06, z], scale: [0.035, 0.018, 0.028], shadow: false })), greens(-0.03, -0.02)),
  laksa: () => g(bowl("#e8892e"), bowlNoodles("#f6efd9"), prawn(0.05, 0.03, 0.05), mesh("box", mat("#c98a3a"), { pos: [-0.06, 0.13, 0.03], scale: [0.04, 0.03, 0.04], shadow: false }), greens(-0.02, -0.07)),
  chweekueh: () =>
    g(
      ...[[-0.08, -0.07], [0.08, -0.07], [-0.08, 0.08], [0.08, 0.08]].map(([x, z]) =>
        g(mesh("cone8", mat("#cfd3d6"), { pos: [x, 0.04, z], scale: [0.065, 0.05, 0.065] }), mesh("cyl", mat("#fbfaf4"), { pos: [x, 0.066, z], scale: [0.055, 0.01, 0.055], shadow: false }), mesh("cyl", mat("#7a4a1a"), { pos: [x, 0.074, z], scale: [0.035, 0.008, 0.035], shadow: false })),
      ),
    ),
  satay: (v) => {
    const meat = v === "mutton" ? "#6a2f1a" : "#c98a4a";
    return g(...[-0.5, -0.15, 0.2, 0.55].map((a, i) => skewer(meat, 0.02, -0.06 + i * 0.04, a)), curryBowl(-0.12, 0.1), cucumbers(0.06, 0.12, 2));
  },
  nasilemak: () =>
    g(
      mesh("cyl", mat("#3f7d3a"), { pos: [0, 0.033, 0], scale: [0.23, 0.006, 0.23], shadow: false }),
      riceDome(-0.04, -0.02),
      mesh("sphere", mat("#c0392b"), { pos: [0.08, 0.05, -0.07], scale: [0.05, 0.03, 0.05] }),
      egg(0.09, 0.05),
      ...Array.from({ length: 5 }, (_, i) => mesh("box", mat("#d79b3f"), { pos: [-0.1 + i * 0.025, 0.045, 0.1], scale: [0.04, 0.01, 0.012], rot: [0, i, 0], shadow: false })),
      cucumbers(0.02, 0.13, 2),
    ),
  meerebus: () => g(bowl("#a8642a"), bowlNoodles("#f2c94c"), halfEgg(0.05, 0.03), mesh("sphere", mat("#7cc46a"), { pos: [-0.06, 0.13, -0.04], scale: [0.025, 0.02, 0.025], shadow: false })),
  prata: (v) =>
    g(
      ...[0, 1].map((i) =>
        g(mesh("cyl", mat(v === "egg" ? "#e6b85a" : "#d9a24f"), { pos: [-0.03 + i * 0.05, 0.04 + i * 0.02, -0.02 + i * 0.03], scale: [0.13, 0.02, 0.1], rot: [0, i * 0.6, 0] }), mesh("cyl", mat("#b07a35"), { pos: [-0.03 + i * 0.05, 0.052 + i * 0.02, -0.02 + i * 0.03], scale: [0.05, 0.004, 0.04], shadow: false })),
      ),
      curryBowl(0.12, 0.1),
    ),
  murtabak: () =>
    g(
      ...[0, 1, 2, 3].map((i) => mesh("box", mat("#c98a3a"), { pos: [-0.06 + (i % 2) * 0.1, 0.045, -0.05 + Math.floor(i / 2) * 0.09], scale: [0.09, 0.05, 0.08], rot: [0, 0.1 * i, 0] })),
      curryBowl(0.12, 0.11),
      mesh("cyl", mat("#d6a0c8"), { pos: [-0.12, 0.04, 0.11], scale: [0.03, 0.01, 0.03], shadow: false }),
    ),
  icekachang: () =>
    g(
      bowl("#ffffff", 0.17),
      mesh("cone", mat("#f4fbff"), { pos: [0, 0.24, 0], scale: [0.15, 0.22, 0.15] }),
      mesh("cone", mat("#e0607a", { transparent: true, opacity: 0.85, outline: false }), { pos: [0.02, 0.26, 0.01], scale: [0.1, 0.16, 0.09], shadow: false }),
      mesh("cone", mat("#6ac46a", { transparent: true, opacity: 0.8, outline: false }), { pos: [-0.03, 0.22, 0.03], scale: [0.11, 0.12, 0.08], shadow: false }),
      mesh("sphere", mat("#f2d27a"), { pos: [0, 0.36, 0], scale: [0.035, 0.025, 0.035], shadow: false }),
    ),
  chendol: () =>
    g(
      bowl("#f3ead6", 0.17),
      mesh("sphere", mat("#f4fbff"), { pos: [0, 0.17, 0], scale: [0.13, 0.09, 0.13] }),
      ...[0, 1, 2, 3].map((i) => mesh("box", mat("#5fae5a"), { pos: [Math.cos(i * 1.6) * 0.06, 0.22, Math.sin(i * 1.6) * 0.05], scale: [0.015, 0.01, 0.1], rot: [0, i * 0.8, 0], shadow: false })),
      mesh("cyl", mat("#6a3a1a", { transparent: true, opacity: 0.85 }), { pos: [0, 0.255, 0], scale: [0.07, 0.008, 0.07], shadow: false }),
    ),
  roastmeat: (v) => g(riceDome(), v === "duck" ? fan("#d9a07a", "#a8551a") : fan("#e0a88a", "#b8402e"), cucumbers(-0.1, 0.12), greens(0.1, 0.1)),
  bakkutteh: () => g(bowl("#6b4a2a"), ...[-0.05, 0.03].map((x, i) => mesh("box", mat("#8a5a3a"), { pos: [x, 0.13, 0.01 * i], scale: [0.045, 0.04, 0.15], rot: [0, i * 0.4, 0], shadow: false })), mesh("sphere", mat("#f4ead6"), { pos: [0.07, 0.13, -0.06], scale: [0.025, 0.02, 0.025], shadow: false }), g(mesh("bowl", mat("#fffdf7"), { pos: [0.2, 0.08, 0.12], scale: [0.08, 0.07, 0.08], rot: [Math.PI, 0, 0] }), mesh("sphere", mat("#fbf8f0"), { pos: [0.2, 0.08, 0.12], scale: [0.065, 0.04, 0.065], shadow: false }))),
  curryrice: () => g(riceDome(-0.05), mesh("cyl", mat("#d9822b", { transparent: true, opacity: 0.85 }), { pos: [-0.02, 0.035, 0], scale: [0.17, 0.008, 0.15], shadow: false }), mesh("cyl", mat("#c98a3a"), { pos: [0.08, 0.06, 0.02], scale: [0.09, 0.03, 0.07], rot: [0.2, 0.3, 0] }), mesh("box", mat("#9fd07a"), { pos: [-0.1, 0.06, 0.09], scale: [0.06, 0.01, 0.04], shadow: false })),
  economyrice: (v) =>
    g(
      riceDome(-0.06, -0.03),
      ...Array.from({ length: 4 }, (_, i) => mesh("box", mat(i % 2 ? "#7cb85a" : "#a8d88a"), { pos: [0.08 + (i % 2) * 0.03, 0.04, -0.06 + i * 0.02], scale: [0.07, 0.012, 0.04], rot: [0.2, i, 0], shadow: false })),
      v === "meat" ? fan("#e0a88a", "#b8402e", 0.05, 0.08, 2) : egg(0.06, 0.09),
    ),
  yongtaufoo: (v) =>
    g(
      bowl("#f3e9cf"),
      bowlNoodles(v === "mee" ? "#f2c94c" : "#fbf6ea"),
      ...[[-0.06, 0.03], [0.05, -0.03], [0.02, 0.07]].map(([x, z]) => mesh("box", mat("#f4e6b8"), { pos: [x, 0.15, z], scale: [0.05, 0.035, 0.05], shadow: false })),
      greens(-0.03, -0.06),
    ),
  kwaychap: () => g(bowl("#5a3a22"), ...[0, 1, 2].map((i) => mesh("box", mat("#f6f2e6"), { pos: [i * 0.04 - 0.04, 0.13, 0], scale: [0.08, 0.008, 0.07], rot: [0, i * 0.6, 0], shadow: false })), g(fan("#9a5a32", "#6b3a1a", 0.22, 0.1, 2)), egg(-0.2, 0.12)),
  porridge: (v) =>
    g(
      bowl("#f6f1e2"),
      mesh("sphere", mat("#f6f1e2"), { pos: [0, 0.11, 0], scale: [0.17, 0.03, 0.17], shadow: false }),
      v === "fish"
        ? g(mesh("cyl", mat("#fffdf7"), { pos: [0.22, 0.02, 0.1], scale: [0.12, 0.02, 0.08] }), mesh("sphere", mat("#f4ead6"), { pos: [0.22, 0.05, 0.1], scale: [0.09, 0.03, 0.05] }), mesh("box", mat("#4a8a3a"), { pos: [0.22, 0.08, 0.1], scale: [0.08, 0.006, 0.01], shadow: false }))
        : fan("#9a5a32", "#6b3a1a", 0.22, 0.1, 2),
    ),
  prawnnoodles: () => g(bowl("#c8643a"), bowlNoodles("#f2c94c"), prawn(0.05, 0.03, 0.045), prawn(-0.05, -0.03, 0.045), greens(-0.02, 0.06)),
  banmian: () => g(bowl("#e8d8a8"), ...[0, 1, 2].map((i) => mesh("box", mat("#f2dca0"), { pos: [i * 0.04 - 0.04, 0.13, 0], scale: [0.16, 0.008, 0.035], rot: [0, i * 0.5, 0], shadow: false })), egg(0.06, 0.05), ...Array.from({ length: 4 }, (_, i) => mesh("box", mat("#d79b3f"), { pos: [-0.06 + i * 0.02, 0.14, -0.06], scale: [0.03, 0.006, 0.01], rot: [0, i, 0], shadow: false })), greens(-0.06, 0.05)),
  meegoreng: () => g(noodles("#d9662e"), mesh("box", mat("#f2c94c"), { pos: [0.04, 0.1, -0.03], scale: [0.04, 0.012, 0.03], shadow: false }), mesh("box", mat("#7cb85a"), { pos: [-0.05, 0.1, 0.04], scale: [0.05, 0.01, 0.02], shadow: false }), mesh("sphere", mat("#7cc46a"), { pos: [0.11, 0.05, -0.08], scale: [0.03, 0.025, 0.03] })),
  nasipadang: () =>
    g(
      riceDome(-0.06, -0.02),
      ...Array.from({ length: 4 }, (_, i) => mesh("box", mat("#5a2a16"), { pos: [0.07 + (i % 2) * 0.04, 0.05, -0.05 + Math.floor(i / 2) * 0.04], scale: [0.04, 0.035, 0.04], rot: [0, i, 0] })),
      ...Array.from({ length: 3 }, (_, i) => mesh("box", mat("#7cb85a"), { pos: [-0.02 + i * 0.03, 0.04, 0.11], scale: [0.06, 0.01, 0.03], rot: [0, i, 0], shadow: false })),
      mesh("sphere", mat("#c0392b"), { pos: [0.12, 0.04, 0.08], scale: [0.035, 0.015, 0.035], shadow: false }),
    ),
  sambalstingray: () => g(mesh("box", mat("#3f7d3a"), { pos: [0, 0.035, 0], scale: [0.34, 0.008, 0.26], rot: [0, 0.3, 0], shadow: false }), mesh("sphere", mat("#c9b8a0"), { pos: [0, 0.06, 0], scale: [0.16, 0.03, 0.11] }), mesh("sphere", mat("#c0392b"), { pos: [0, 0.085, 0], scale: [0.12, 0.02, 0.08], shadow: false }), mesh("sphere", mat("#7cc46a"), { pos: [0.15, 0.05, 0.09], scale: [0.03, 0.025, 0.03] })),
  currypuff: () => g(...[[-0.07, 0, 0.4], [0.07, 0.02, -0.3], [0, -0.07, 1.2]].map(([x, z, r]) => g(mesh("sphere", mat("#d9a24f"), { pos: [x, 0.04, z], scale: [0.08, 0.04, 0.055], rot: [0, r, 0] }), mesh("torus", mat("#b07a35"), { pos: [x, 0.055, z], scale: [0.055, 0.055, 0.03], rot: [0, r, Math.PI / 2], shadow: false })))),
  kueh: (v) =>
    v === "lapis"
      ? g(...[0, 1].map((k) => g(...[0, 1, 2, 3, 4].map((i) => mesh("box", mat(i % 2 ? "#fbf3e6" : "#e0607a"), { pos: [-0.06 + k * 0.12, 0.04 + i * 0.018, k * 0.03], scale: [0.1, 0.018, 0.07], rot: [0, k * 0.3, 0] })))))
      : g(...Array.from({ length: 6 }, (_, i) => g(mesh("sphere", mat("#4aa84a"), { pos: [Math.cos(i * 1.05) * 0.08, 0.05, Math.sin(i * 1.05) * 0.07], scale: [0.04, 0.04, 0.04] }), mesh("sphere", mat("#fbf8f0"), { pos: [Math.cos(i * 1.05) * 0.08, 0.075, Math.sin(i * 1.05) * 0.07], scale: [0.03, 0.014, 0.03], shadow: false })))),
  soya: () => g(mesh("cyl", mat("#e6f4f8", { transparent: true, opacity: 0.5, outline: false }), { pos: [0, 0.15, 0], scale: [0.08, 0.26, 0.08] }), mesh("cyl", mat("#f4ecd6"), { pos: [0, 0.13, 0], scale: [0.07, 0.2, 0.07] }), mesh("cyl8", mat("#f07aa0"), { pos: [0.03, 0.3, 0], scale: [0.008, 0.16, 0.008], rot: [0, 0, 0.2], shadow: false })),
  chillicrab: (v) =>
    g(
      mesh("cyl", mat("#d9452e"), { pos: [0, 0.035, 0], scale: [0.18, 0.012, 0.16], shadow: false }),
      mesh("sphere", mat("#c0583a"), { pos: [0, 0.07, 0], scale: [0.11, 0.045, 0.09] }),
      ...[-1, 1].map((k) => mesh("sphere", mat("#c0583a"), { pos: [0.12 * k, 0.07, 0.08], scale: [0.05, 0.035, 0.04] })),
      mesh("box", mat("#f2c94c"), { pos: [0.02, 0.09, -0.06], scale: [0.04, 0.01, 0.03], shadow: false }),
      v === "mantou" ? g(...[0, 1].map((i) => mesh("sphere", mat("#e0a85a"), { pos: [-0.16 + i * 0.06, 0.05, -0.12], scale: [0.04, 0.03, 0.035] }))) : null,
    ),
  fishsoup: (v) => g(bowl("#f3ead6"), ...[[-0.05, 0], [0.05, 0.03], [0, -0.06]].map(([x, z]) => mesh("box", mat("#ffffff"), { pos: [x, 0.13, z], scale: [0.06, 0.015, 0.035], shadow: false })), v === "rice" ? g(mesh("bowl", mat("#fffdf7"), { pos: [0.2, 0.08, 0.12], scale: [0.08, 0.07, 0.08], rot: [Math.PI, 0, 0] }), mesh("sphere", mat("#fbf8f0"), { pos: [0.2, 0.08, 0.12], scale: [0.065, 0.04, 0.065], shadow: false })) : bowlNoodles("#fbf6ea"), greens(-0.06, -0.05)),
  biryani: (v) => g(mesh("sphere", mat(v === "chicken" ? "#f2b632" : "#e8a83a"), { pos: [-0.03, 0.05, 0], scale: [0.14, 0.07, 0.12] }), mesh("sphere", mat(v === "chicken" ? "#c97a3a" : "#7a3a22"), { pos: [0.02, 0.1, 0.01], scale: [0.06, 0.04, 0.05] }), curryBowl(0.13, 0.1), cucumbers(-0.12, 0.12, 2)),
  lormee: () => g(bowl("#5a3a22"), bowlNoodles("#f2c94c"), halfEgg(0.05, 0.03), mesh("box", mat("#f4ead6"), { pos: [-0.05, 0.14, -0.03], scale: [0.05, 0.01, 0.03], shadow: false })),
  rojak: () => g(...Array.from({ length: 9 }, (_, i) => mesh("box", mat(["#f2d27a", "#c8e2a8", "#e8d8a8", "#d9a24f"][i % 4]), { pos: [Math.cos(i * 0.7) * 0.09, 0.04, Math.sin(i * 0.7) * 0.08], scale: [0.05, 0.035, 0.05], rot: [0, i, 0] })), mesh("sphere", mat("#3a2618", { transparent: true, opacity: 0.85 }), { pos: [0, 0.05, 0], scale: [0.12, 0.02, 0.1], shadow: false }), ...Array.from({ length: 6 }, (_, i) => mesh("sphere", mat("#d9a24f"), { pos: [Math.cos(i) * 0.05, 0.07, Math.sin(i) * 0.05], scale: [0.012, 0.01, 0.012], shadow: false }))),
  bakchormee: () => g(noodles("#f2c94c", 0.12), ...Array.from({ length: 6 }, (_, i) => mesh("sphere", mat("#b8806a"), { pos: [Math.cos(i) * 0.05, 0.1, Math.sin(i) * 0.05], scale: [0.025, 0.015, 0.025], shadow: false })), greens(-0.07, 0.06), mesh("sphere", mat("#c0392b"), { pos: [0.08, 0.09, -0.04], scale: [0.025, 0.012, 0.025], shadow: false })),
  wings: () => g(...[-0.08, 0, 0.08].map((x, i) => mesh("capsule", mat("#a8551a"), { pos: [x, 0.05, (i % 2) * 0.05], scale: [0.045, 0.07, 0.045], rot: [Math.PI / 2, 0, 0.5 - i * 0.4] })), mesh("sphere", mat("#7cc46a"), { pos: [0.12, 0.04, -0.08], scale: [0.03, 0.025, 0.03] })),
  popiah: () => g(...[-0.09, -0.03, 0.03, 0.09].map((x) => g(mesh("cyl", mat("#f4ead6"), { pos: [x, 0.05, 0], scale: [0.045, 0.05, 0.045], rot: [0, 0, Math.PI / 2] }), mesh("cyl", mat("#7cb85a"), { pos: [x, 0.05, 0], scale: [0.03, 0.052, 0.03], rot: [0, 0, Math.PI / 2], shadow: false })))),
  pisang: () => g(...[-0.07, 0, 0.07].map((x, i) => mesh("capsule", mat("#c98a3a"), { pos: [x, 0.05, (i % 2) * 0.05], scale: [0.045, 0.09, 0.045], rot: [Math.PI / 2, 0, 0.3 - i * 0.3] }))),
  chengtng: () => g(bowl("#f0e2bc"), ...Array.from({ length: 7 }, (_, i) => mesh("sphere", mat(["#c97a3a", "#f4f1ea", "#a8442a"][i % 3]), { pos: [Math.cos(i) * 0.07, 0.125, Math.sin(i) * 0.07], scale: [0.022, 0.016, 0.022], shadow: false }))),
  thosai: () => g(mesh("cone", mat("#e8c46a"), { pos: [0, 0.06, -0.02], scale: [0.08, 0.36, 0.08], rot: [0, 0, Math.PI / 2] }), curryBowl(0.1, 0.11), curryBowl(-0.1, 0.11)),
  peppercrab: () =>
    g(
      mesh("cyl", mat("#3a2e26"), { pos: [0, 0.035, 0], scale: [0.18, 0.012, 0.16], shadow: false }),
      mesh("sphere", mat("#a8553a"), { pos: [0, 0.07, 0], scale: [0.11, 0.045, 0.09] }),
      ...[-1, 1].map((k) => mesh("sphere", mat("#a8553a"), { pos: [0.12 * k, 0.07, 0.08], scale: [0.05, 0.035, 0.04] })),
      ...[[0.03, -0.02], [-0.04, 0.02], [0.08, 0.05], [-0.09, -0.05]].map(([x, z]) => mesh("sphere", mat("#14110f"), { pos: [x, 0.11, z], scale: [0.012, 0.012, 0.012], shadow: false })),
      mesh("box", mat(GREEN), { pos: [-0.02, 0.1, -0.06], scale: [0.07, 0.01, 0.012], shadow: false }),
    ),
  sugarcane: () => g(mesh("cyl", mat("#e6f4f8", { transparent: true, opacity: 0.5, outline: false }), { pos: [0, 0.15, 0], scale: [0.08, 0.26, 0.08] }), mesh("cyl", mat("#c8d88a"), { pos: [0, 0.13, 0], scale: [0.07, 0.2, 0.07] }), mesh("cyl", mat("#f4fbe8"), { pos: [0, 0.235, 0], scale: [0.068, 0.01, 0.068], shadow: false }), mesh("cyl8", mat("#7ac46a"), { pos: [0.03, 0.3, 0], scale: [0.008, 0.16, 0.008], rot: [0, 0, -0.25], shadow: false })),
  claypot: () =>
    g(
      mesh("cyl", mat("#7a3a1a"), { pos: [0, 0.1, 0], scale: [0.14, 0.16, 0.14] }),
      mesh("cyl", mat("#c98a5a"), { pos: [0, 0.185, 0], scale: [0.125, 0.01, 0.125], shadow: false }),
      ...[[-0.05, 0.03], [0.04, -0.04], [0.01, 0.06]].map(([x, z]) => mesh("box", mat("#d9a07a"), { pos: [x, 0.2, z], scale: [0.05, 0.025, 0.04], rot: [0, x * 10, 0], shadow: false })),
      ...[[0.05, 0.04], [-0.04, -0.05], [0.07, -0.01]].map(([x, z]) => mesh("cyl", mat("#a8323a"), { pos: [x, 0.198, z], scale: [0.022, 0.012, 0.022], shadow: false })),
      greens(-0.02, -0.01),
      mesh("box", mat("#5a2a10"), { pos: [0.18, 0.13, 0], scale: [0.07, 0.03, 0.04] }),
    ),
  oystercake: () =>
    g(
      mesh("sphere", mat("#c98a3a"), { pos: [0, 0.06, 0], scale: [0.13, 0.065, 0.13] }),
      mesh("torus", mat("#b07a35"), { pos: [0, 0.07, 0], scale: [0.11, 0.11, 0.05], rot: [Math.PI / 2, 0, 0], shadow: false }),
      ...[[0.04, 0.03], [-0.05, -0.01], [0.01, -0.06]].map(([x, z]) => mesh("sphere", mat("#a8702f"), { pos: [x, 0.12, z], scale: [0.025, 0.012, 0.02], shadow: false })),
    ),
};

// Which dish (and variant) a set of plated items makes, if any. Items are snapshot items: { k, s: "a,b" }.
const LOOKUP = new Map();
for (const [id, d] of Object.entries(DISHES)) {
  if (!BUILD[id]) continue;
  for (const [v, variant] of Object.entries(d.variants)) LOOKUP.set([...variant.parts].sort().join(" + "), { id, v });
}

export function platedDish(items) {
  const food = items.filter((it) => it.k !== "drink" && !it.b).map((it) => `${it.k}|${Array.isArray(it.s) ? it.s.join(",") : it.s ?? ""}`);
  const chilli = food.includes("chilli|");
  const key = food.filter((f) => f !== "chilli|").sort().join(" + ");
  const hit = LOOKUP.get(key);
  if (!hit) return null;
  const model = BUILD[hit.id](hit.v);
  // Extra chilli comes in its own saucer.
  if (chilli) {
    model.add(
      mesh("cyl", mat("#fffdf7"), { pos: [-0.17, 0.035, -0.12], scale: [0.06, 0.02, 0.06] }),
      mesh("cyl", mat("#c0392b"), { pos: [-0.17, 0.047, -0.12], scale: [0.048, 0.008, 0.048], shadow: false }),
    );
  }
  return model;
}

// One finished dish on its own, for trays and tables in the customer mode.
// Served the way a stall hands it over: on a plate unless it comes in a bowl, a glass or its own pot, with
// chopsticks and a soup spoon for noodles and soup, a spoon and fork for rice, and steam over hot bowls.
const IN_BOWL = new Set(["laksa", "meerebus", "icekachang", "chendol", "bakkutteh", "yongtaufoo", "kwaychap", "porridge", "prawnnoodles", "banmian", "fishsoup", "lormee", "chengtng"]);
const OWN_VESSEL = new Set(["soya", "sugarcane", "claypot"]);
const STEAMING = new Set(["laksa", "meerebus", "bakkutteh", "yongtaufoo", "kwaychap", "porridge", "prawnnoodles", "banmian", "fishsoup", "lormee", "claypot"]);
const CHOPSTICKS = new Set(["laksa", "meerebus", "yongtaufoo", "kwaychap", "prawnnoodles", "banmian", "fishsoup", "lormee", "ckt", "hokkienmee", "wantonmee", "bakchormee", "meegoreng", "duckrice"]);
const SPOON_FORK = new Set(["chickenrice", "roastmeat", "curryrice", "economyrice", "nasipadang", "nasilemak", "biryani", "carrotcake", "orhluak", "sambalstingray", "chillicrab", "peppercrab", "porridge", "bakkutteh", "claypot", "murtabak"]);

export function dishModel(id, variant = null) {
  if (!BUILD[id]) return null;
  const dish = BUILD[id](variant);
  if (OWN_VESSEL.has(id) || IN_BOWL.has(id)) {
    if (STEAMING.has(id)) dish.add(steam(0.24, 0.07));
    if (CHOPSTICKS.has(id)) dish.add(chopsticks(0.25, 0.02));
    else if (SPOON_FORK.has(id)) dish.add(spoonAndFork(0.25, 0.02));
    return dish;
  }
  const out = g(plateWare(0.25, { rim: id === "nasilemak" ? null : "#2f6b4f" }), dish);
  dish.position.y = 0.012;
  if (CHOPSTICKS.has(id)) out.add(chopsticks(0.29, 0.02));
  else if (SPOON_FORK.has(id)) out.add(spoonAndFork(0.29, 0.02));
  return out;
}
