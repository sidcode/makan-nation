// Low-poly models for food, stations, people and era props, built from simple shapes.
import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshToonMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  TorusKnotGeometry,
} from "three";
import { INGREDIENTS } from "./dishes.js";
import { platedDish } from "./dishes3d.js";
import { bowl as bowlWare, cup, glass, nest, plateWare, rice, surface } from "./foodkit.js";
import { groupOf } from "./icons.js";
import { asLook } from "./realism.js";
import { crateTag, label, marble, menuTexture, peranakan, toonRamp } from "./textures.js";

const ramp = toonRamp();
const mats = new Map();

// surface: what it is made of, for the Soft and Real looks (realism.js): steel, tiles, wood, terrazzo...
export function mat(color, { emissive, glow = 1, transparent, opacity, outline = true, map, surface } = {}) {
  const key = `${color}|${emissive}|${glow}|${opacity}|${outline}|${map?.uuid}|${surface}`;
  if (mats.has(key)) return asLook(mats.get(key));
  const m = new MeshToonMaterial({ color, gradientMap: ramp, map: map ?? null });
  if (surface) m.userData.surface = surface;
  if (emissive) {
    m.emissive = new Color(emissive);
    // Above 1, a glow is bright enough for the bloom on High.
    m.emissiveIntensity = glow;
  }
  if (transparent) {
    m.transparent = true;
    m.opacity = opacity ?? 0.8;
  }
  m.userData.outlineParameters = { thickness: 0.005, color: [0.17, 0.1, 0.07], visible: outline };
  mats.set(key, m);
  return asLook(m);
}

const geo = {
  box: new BoxGeometry(1, 1, 1),
  cyl: new CylinderGeometry(1, 1, 1, 18),
  cyl8: new CylinderGeometry(1, 1, 1, 8),
  cone8: new CylinderGeometry(0.7, 1, 1, 12),
  sphere: new SphereGeometry(1, 14, 10),
  bowl: new SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
  cone: new ConeGeometry(1, 1, 10),
  torus: new TorusGeometry(1, 0.32, 8, 16, Math.PI * 1.3),
  ring: new TorusGeometry(1, 0.08, 6, 20),
  capsule: new CapsuleGeometry(1, 1, 4, 10),
  knot: new TorusKnotGeometry(0.08, 0.025, 48, 6),
  plane: new PlaneGeometry(1, 1),
};

export function mesh(g, material, { pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], shadow = true } = {}) {
  const m = new Mesh(geo[g] ?? g, material);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.rotation.set(...rot);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function group(...kids) {
  const g = new Group();
  g.add(...kids.filter(Boolean));
  return g;
}

// ---------- Food ----------

const C = {
  rice: "#fbf8f0",
  bowl: "#fffdf7",
  sack: "#d8c39b",
  chickenRaw: "#f2b8a2",
  chickenCooked: "#f3dfb3",
  chickenRoast: "#c9782a",
  duckRaw: "#ead0b8",
  duckBraise: "#6b3a1a",
  bread: "#f6e6c4",
  crust: "#c98f4a",
  toast: "#e0a85a",
  kaya: "#c6a23a",
  butter: "#fff3b0",
  noodle: "#f6efd9",
  mee: "#f2c94c",
  egg: "#fbf6ea",
  yolk: "#f2b632",
  prawn: "#f07d52",
  prawnRaw: "#c9a09b",
  stick: "#d9b98a",
  cucumber: "#5f9a4c",
  cucumberIn: "#c8e2a8",
  leaf: "#3f7d3a",
  fish: "#c9c4b6",
  fishFried: "#d79b3f",
  dough: "#f0d9a8",
  prata: "#d9a24f",
  curry: "#d9822b",
  burnt: "#2a2220",
};

const raw = (k) => mat(INGREDIENTS[k]?.color ?? "#ccc");

function bowl(fill) {
  return group(bowlWare(0.17, 0.12), surface(fill, 0.15, 0.105));
}

function sack(tag) {
  return group(
    mesh("box", mat(C.sack), { pos: [0, 0.14, 0], scale: [0.26, 0.28, 0.2] }),
    mesh("cyl8", mat(C.sack), { pos: [0, 0.31, 0], scale: [0.06, 0.08, 0.06] }),
    tag && mesh("box", mat(tag), { pos: [0, 0.16, 0.105], scale: [0.12, 0.08, 0.01], shadow: false }),
  );
}

function bird(color, beak) {
  return group(
    mesh("sphere", mat(color), { pos: [0, 0.1, 0], scale: [0.18, 0.11, 0.14] }),
    mesh("sphere", mat(color), { pos: [0.16, 0.14, 0], scale: [0.06, 0.06, 0.05] }),
    beak && mesh("cone", mat(beak), { pos: [0.23, 0.14, 0], scale: [0.025, 0.06, 0.025], rot: [0, 0, -Math.PI / 2] }),
  );
}

function slices(color, edge) {
  return group(
    ...[-0.1, 0, 0.1].map((x, i) =>
      group(
        mesh("box", mat(color), { pos: [x, 0.04, 0], scale: [0.08, 0.06, 0.2], rot: [0, 0.2 * i, 0] }),
        edge && mesh("box", mat(edge), { pos: [x, 0.075, 0], scale: [0.082, 0.012, 0.2], rot: [0, 0.2 * i, 0], shadow: false }),
      ),
    ),
  );
}

function skewers(meat, n = 1) {
  return group(
    ...Array.from({ length: n }, (_, j) =>
      group(
        mesh("cyl8", mat(C.stick), { pos: [0, 0.05, (j - (n - 1) / 2) * 0.09], scale: [0.01, 0.4, 0.01], rot: [0, 0, Math.PI / 2] }),
        ...[-0.1, 0, 0.1].map((x) => mesh("box", mat(meat), { pos: [x, 0.05, (j - (n - 1) / 2) * 0.09], scale: [0.07, 0.06, 0.06] })),
      ),
    ),
  );
}

function cubes(color, n = 6) {
  return group(...Array.from({ length: n }, (_, i) => mesh("box", mat(color), { pos: [Math.cos(i * 2.1) * 0.08, 0.035, Math.sin(i * 2.1) * 0.08], scale: [0.07, 0.06, 0.07], rot: [0, i, 0] })));
}

function noodlePile(color, top) {
  return group(nest(color, 0.17, 0.11, { y: 0, seed: 3 }), top);
}

function bottle(color, cap) {
  return group(
    mesh("cyl", mat(color), { pos: [0, 0.12, 0], scale: [0.06, 0.24, 0.06] }),
    mesh("cyl", mat(color), { pos: [0, 0.27, 0], scale: [0.025, 0.08, 0.025] }),
    mesh("cyl", mat(cap), { pos: [0, 0.32, 0], scale: [0.03, 0.03, 0.03] }),
    mesh("box", mat("#f4ead6"), { pos: [0, 0.12, 0.061], scale: [0.08, 0.08, 0.004], shadow: false }),
  );
}

const FOOD = {
  "rice|": () => sack(),
  "rice|steam": () => {
    const r = rice(0, 0, { r: 0.13, h: 0.06 });
    r.position.y = 0.1;
    return group(bowlWare(0.17, 0.12), r);
  },
  "santan|": () => sack("#3f7d3a"),
  "santan|steam": () =>
    group(
      mesh("cyl8", mat(C.leaf), { pos: [0, 0.01, 0], scale: [0.2, 0.01, 0.2], shadow: false }),
      mesh("sphere", mat(C.rice), { pos: [0, 0.07, 0], scale: [0.12, 0.08, 0.12] }),
    ),
  "chicken|": () => bird(C.chickenRaw),
  "chicken|poach": () => bird(C.chickenCooked),
  "chicken|roast": () => bird(C.chickenRoast),
  "chicken|poach,chop": () => slices(C.chickenCooked, "#fff6dc"),
  "chicken|roast,chop": () => slices(C.chickenCooked, C.chickenRoast),
  "duck|": () => bird(C.duckRaw, "#f2a03a"),
  "duck|braise": () => bird(C.duckBraise, "#f2a03a"),
  "duck|braise,chop": () => slices("#9a5a32", C.duckBraise),
  "bread|": () => group(mesh("box", mat(C.bread), { pos: [0, 0.05, 0], scale: [0.26, 0.08, 0.26] }), mesh("box", mat(C.crust), { pos: [0, 0.095, 0], scale: [0.27, 0.01, 0.27], shadow: false })),
  "bread|toast": () =>
    group(
      mesh("box", mat(C.toast), { pos: [0, 0.03, 0], scale: [0.26, 0.05, 0.26] }),
      mesh("box", mat(C.toast), { pos: [0, 0.08, 0], scale: [0.26, 0.05, 0.26], rot: [0, 0.2, 0] }),
    ),
  // Kaya and a cold slab of butter go between the slices once the toast is off the grill.
  "bread|toast,spread": () =>
    group(
      mesh("box", mat(C.toast), { pos: [0, 0.03, 0], scale: [0.26, 0.05, 0.26] }),
      mesh("box", mat(C.kaya), { pos: [0, 0.065, 0], scale: [0.24, 0.02, 0.24] }),
      mesh("box", mat(C.butter), { pos: [0.03, 0.08, 0], scale: [0.1, 0.02, 0.05], shadow: false }),
      mesh("box", mat(C.toast), { pos: [0, 0.11, 0], scale: [0.26, 0.05, 0.26], rot: [0, 0.2, 0] }),
    ),
  "kwayteow|": () => group(...[-0.07, 0, 0.07].map((x) => mesh("box", mat(C.noodle), { pos: [x, 0.04, 0], scale: [0.05, 0.05, 0.26] }))),
  "egg|": () => mesh("sphere", mat(C.egg), { pos: [0, 0.09, 0], scale: [0.08, 0.1, 0.08] }),
  "egg|boil": () =>
    group(
      mesh("sphere", mat(C.egg), { pos: [0, 0.05, 0], scale: [0.09, 0.06, 0.07] }),
      mesh("cyl", mat(C.yolk), { pos: [0, 0.1, 0], scale: [0.045, 0.01, 0.045], shadow: false }),
    ),
  "noodles|": () => mesh("knot", mat(C.noodle), { pos: [0, 0.1, 0] }),
  "mee|": () => mesh("knot", mat(C.mee), { pos: [0, 0.1, 0], scale: [1.1, 1.1, 1.1] }),
  "mee|boil": () => group(bowl("#f5e9c4"), ...[0, 1].map((i) => mesh("knot", mat(C.mee), { pos: [i * 0.05 - 0.025, 0.13, 0], scale: [0.8, 0.35, 0.8] }))),
  "prawn|": () => mesh("torus", mat(C.prawnRaw), { pos: [0, 0.07, 0], scale: [0.1, 0.1, 0.1], rot: [Math.PI / 2, 0, 0] }),
  "radish|": () => group(mesh("box", raw("radish"), { pos: [0, 0.06, 0], scale: [0.26, 0.1, 0.18] }), mesh("box", mat("#e2d6b8"), { pos: [0, 0.115, 0], scale: [0.26, 0.01, 0.18], shadow: false })),
  "blacksauce|": () => bottle("#2a1a10", "#c8553d"),
  "oyster|": () => group(...[-0.08, 0, 0.08].map((x, i) => mesh("sphere", raw("oyster"), { pos: [x, 0.03, (i % 2) * 0.05], scale: [0.07, 0.03, 0.05], rot: [0, i, 0] }))),
  "charsiew|": () => group(mesh("box", mat("#d9a083"), { pos: [0, 0.05, 0], scale: [0.26, 0.08, 0.12] }), mesh("box", raw("charsiew"), { pos: [0, 0.095, 0], scale: [0.27, 0.02, 0.13], shadow: false })),
  "charsiew|chop": () => slices("#e0a88a", "#b8402e"),
  "batter|": () => bowl("#f8f6ef"),
  "chaipoh|": () => group(...Array.from({ length: 7 }, (_, i) => mesh("box", raw("chaipoh"), { pos: [Math.cos(i * 1.7) * 0.07, 0.02, Math.sin(i * 1.7) * 0.07], scale: [0.04, 0.03, 0.04] }))),
  "chaipoh|fry": () => group(bowl("#7a4a1a"), ...Array.from({ length: 5 }, (_, i) => mesh("box", mat("#6a3a10"), { pos: [Math.cos(i * 1.3) * 0.05, 0.13, Math.sin(i * 1.3) * 0.05], scale: [0.035, 0.03, 0.035], shadow: false }))),
  "chweekueh|": () =>
    group(
      ...[[-0.07, -0.06], [0.07, -0.06], [-0.07, 0.07], [0.07, 0.07]].map(([x, z]) =>
        group(mesh("cone8", mat("#cfd3d6"), { pos: [x, 0.03, z], scale: [0.06, 0.05, 0.06] }), mesh("cyl", mat(C.rice), { pos: [x, 0.06, z], scale: [0.05, 0.01, 0.05], shadow: false })),
      ),
    ),
  "satayc|": () => skewers("#e8a58a"),
  "satayc|grill": () => skewers("#c98a4a", 2),
  "sataym|": () => skewers("#b5574a"),
  "sataym|grill": () => skewers("#6a2f1a", 2),
  "cucumber|": () => mesh("cyl", mat(C.cucumber), { pos: [0, 0.06, 0], scale: [0.05, 0.3, 0.05], rot: [0, 0, Math.PI / 2] }),
  "cucumber|chop": () => group(...[-0.08, 0, 0.08].map((x) => mesh("cyl", mat(C.cucumberIn), { pos: [x, 0.02, 0], scale: [0.05, 0.02, 0.05] }))),
  "ikanbilis|": () => group(...Array.from({ length: 6 }, (_, i) => mesh("box", mat(C.fish), { pos: [Math.cos(i) * 0.08, 0.02, Math.sin(i * 2) * 0.08], scale: [0.08, 0.02, 0.025], rot: [0, i, 0] }))),
  "ikanbilis|fry": () => group(...Array.from({ length: 6 }, (_, i) => mesh("box", mat(C.fishFried), { pos: [Math.cos(i) * 0.08, 0.02, Math.sin(i * 2) * 0.08], scale: [0.08, 0.02, 0.025], rot: [0, i, 0] }))),
  "rebus|": () => bowl("#a8642a"),
  "dough|": () => mesh("sphere", mat(C.dough), { pos: [0, 0.08, 0], scale: [0.11, 0.08, 0.11] }),
  "mutton|": () => group(mesh("sphere", raw("mutton"), { pos: [0, 0.05, 0], scale: [0.12, 0.06, 0.1] }), mesh("cyl", mat("#ffffff"), { pos: [0, 0.01, 0], scale: [0.16, 0.01, 0.16], shadow: false })),
  "prata|": () =>
    group(
      mesh("cyl", mat(C.prata), { pos: [0, 0.02, 0], scale: [0.18, 0.025, 0.18] }),
      ...[0, 2, 4].map((a) => mesh("cyl", mat("#b07a35"), { pos: [Math.cos(a) * 0.08, 0.035, Math.sin(a) * 0.08], scale: [0.03, 0.005, 0.03], shadow: false })),
    ),
  "prataegg|": () =>
    group(
      mesh("cyl", mat("#e6b85a"), { pos: [0, 0.025, 0], scale: [0.18, 0.035, 0.18] }),
      mesh("cyl", mat(C.yolk), { pos: [0.02, 0.045, 0], scale: [0.07, 0.006, 0.06], shadow: false }),
    ),
  "murtabak|": () =>
    group(
      mesh("box", mat("#c98a3a"), { pos: [0, 0.04, 0], scale: [0.26, 0.07, 0.22] }),
      mesh("box", mat("#8a3a2a"), { pos: [0, 0.04, 0.111], scale: [0.2, 0.03, 0.004], shadow: false }),
    ),
  "curry|": () => bowl(C.curry),
  "chilli|": () =>
    group(
      mesh("cyl", mat("#fffdf7"), { pos: [0, 0.02, 0], scale: [0.08, 0.03, 0.08] }),
      mesh("cyl", mat("#c0392b"), { pos: [0, 0.04, 0], scale: [0.065, 0.01, 0.065], shadow: false }),
      mesh("sphere", mat("#e0533a"), { pos: [0.02, 0.05, 0.01], scale: [0.02, 0.012, 0.02], shadow: false }),
    ),
  "ice|": () => mesh("box", mat("#d6f0f8", { transparent: true, opacity: 0.85 }), { pos: [0, 0.1, 0], scale: [0.2, 0.2, 0.2] }),
  "ice|shave": () => group(bowl("#ffffff"), mesh("sphere", mat("#f4fbff"), { pos: [0, 0.16, 0], scale: [0.14, 0.12, 0.14] })),
  "redbean|": () => group(bowl("#5a1a1a"), ...Array.from({ length: 6 }, (_, i) => mesh("sphere", mat("#8a2a2a"), { pos: [Math.cos(i) * 0.07, 0.125, Math.sin(i) * 0.07], scale: [0.02, 0.015, 0.02], shadow: false }))),
  "chendol|": () => group(bowl("#7a4a1a"), ...[0, 1, 2].map((i) => mesh("box", mat("#5fae5a"), { pos: [(i - 1) * 0.05, 0.125, 0], scale: [0.02, 0.012, 0.16], rot: [0, i * 0.4, 0], shadow: false }))),
  "ckt|": () =>
    group(
      mesh("sphere", mat("#5a3a22"), { pos: [0, 0.05, 0], scale: [0.17, 0.07, 0.15] }),
      mesh("box", mat("#c0392b"), { pos: [0.05, 0.1, 0.02], scale: [0.05, 0.02, 0.03], shadow: false }),
      mesh("box", mat("#4a8a3a"), { pos: [-0.05, 0.1, -0.03], scale: [0.07, 0.015, 0.015], shadow: false }),
    ),
  "carrotwhite|": () => group(mesh("cyl", mat("#f6dc8a"), { pos: [0, 0.015, 0], scale: [0.18, 0.02, 0.16] }), cubes("#f3e3b0")),
  "carrotblack|": () => group(cubes("#3a2618", 7), mesh("box", mat("#4a8a3a"), { pos: [0.02, 0.08, 0], scale: [0.08, 0.012, 0.012], shadow: false })),
  "hokkienmee|": () => noodlePile("#e9c46a", mesh("torus", mat(C.prawn), { pos: [0.02, 0.12, 0], scale: [0.06, 0.06, 0.06], rot: [Math.PI / 2, 0, 0] })),
  "orhluak|": () =>
    group(
      mesh("cyl", mat("#e8c46a"), { pos: [0, 0.025, 0], scale: [0.18, 0.035, 0.16] }),
      ...[[0.06, 0.02], [-0.05, 0.05], [0, -0.06]].map(([x, z]) => mesh("sphere", raw("oyster"), { pos: [x, 0.05, z], scale: [0.04, 0.02, 0.03], shadow: false })),
    ),
  "laksa|": () => group(bowl("#e8892e"), mesh("torus", mat(C.prawn), { pos: [0.03, 0.13, 0], scale: [0.06, 0.06, 0.06], rot: [Math.PI / 2, 0, 0] })),
  // ---------- The menu expansion ----------
  "ribs|": () => group(...[-0.08, 0, 0.08].map((x, i) => group(mesh("box", raw("ribs"), { pos: [x, 0.04, 0], scale: [0.06, 0.06, 0.24], rot: [0, i * 0.15, 0] }), mesh("cyl8", mat("#f4ead6"), { pos: [x, 0.05, 0.13], scale: [0.015, 0.06, 0.015], rot: [Math.PI / 2, 0, 0], shadow: false })))),
  "ribs|simmer": () => group(bowl("#6b4a2a"), ...[-0.05, 0.05].map((x) => mesh("box", mat("#8a5a3a"), { pos: [x, 0.13, 0], scale: [0.04, 0.04, 0.14], shadow: false })), mesh("sphere", mat("#f4ead6"), { pos: [0, 0.13, 0.08], scale: [0.025, 0.02, 0.025], shadow: false })),
  "porkchop|": () => mesh("cyl", raw("porkchop"), { pos: [0, 0.03, 0], scale: [0.16, 0.04, 0.12] }),
  "porkchop|fry": () => group(mesh("cyl", mat("#c98a3a"), { pos: [0, 0.03, 0], scale: [0.17, 0.045, 0.13] }), ...[-0.06, 0, 0.06].map((x) => mesh("box", mat("#a8702f"), { pos: [x, 0.056, 0], scale: [0.012, 0.006, 0.2], shadow: false }))),
  "cabbage|": () => group(mesh("sphere", raw("cabbage"), { pos: [0, 0.11, 0], scale: [0.13, 0.11, 0.13] }), mesh("sphere", mat("#c8e8a8"), { pos: [0, 0.14, 0.03], scale: [0.09, 0.08, 0.09], shadow: false })),
  "cabbage|fry": () => group(...Array.from({ length: 6 }, (_, i) => mesh("box", mat(i % 2 ? "#7cb85a" : "#a8d88a"), { pos: [Math.cos(i * 1.1) * 0.07, 0.025 + (i % 3) * 0.01, Math.sin(i * 1.1) * 0.06], scale: [0.09, 0.012, 0.05], rot: [0.2, i, 0.1] }))),
  "tofu|": () => group(...[[-0.06, -0.04], [0.06, -0.04], [0, 0.06]].map(([x, z], i) => group(mesh("box", raw("tofu"), { pos: [x, 0.04, z], scale: [0.09, 0.07, 0.09], rot: [0, i, 0] }), mesh("box", mat("#e8b8a0"), { pos: [x, 0.078, z], scale: [0.05, 0.01, 0.05], rot: [0, i, 0], shadow: false })))),
  "tofu|boil": () => group(bowl("#f3e9cf"), ...[[-0.05, 0], [0.05, 0.02]].map(([x, z]) => mesh("box", mat("#f4e6b8"), { pos: [x, 0.13, z], scale: [0.06, 0.04, 0.06], shadow: false }))),
  "noodles|boil": () => group(bowl("#f3ead6"), mesh("knot", mat("#fbf6ea"), { pos: [0, 0.13, 0], scale: [0.9, 0.3, 0.9], shadow: false })),
  "kway|": () => group(...[0, 1, 2].map((i) => mesh("box", raw("kway"), { pos: [0, 0.015 + i * 0.02, 0], scale: [0.24, 0.012, 0.18], rot: [0, i * 0.3, 0] }))),
  "kway|boil": () => group(bowl("#5a3a22"), ...[0, 1].map((i) => mesh("box", mat("#f6f2e6"), { pos: [i * 0.05 - 0.025, 0.125, 0], scale: [0.1, 0.008, 0.08], rot: [0, i * 0.6, 0], shadow: false }))),
  "porridge|": () => group(bowl("#f6f1e2"), mesh("sphere", mat("#f6f1e2"), { pos: [0, 0.11, 0], scale: [0.15, 0.03, 0.15], shadow: false })),
  "fish|": () => group(mesh("sphere", raw("fish"), { pos: [0, 0.05, 0], scale: [0.18, 0.05, 0.08] }), mesh("cone", raw("fish"), { pos: [0.2, 0.05, 0], scale: [0.06, 0.08, 0.04], rot: [0, 0, -Math.PI / 2] })),
  "fish|steam": () => group(mesh("cyl", mat("#fffdf7"), { pos: [0, 0.015, 0], scale: [0.2, 0.02, 0.14] }), mesh("sphere", mat("#f4ead6"), { pos: [0, 0.05, 0], scale: [0.15, 0.04, 0.07] }), mesh("box", mat("#4a8a3a"), { pos: [0, 0.09, 0], scale: [0.14, 0.008, 0.01], shadow: false }), mesh("cyl", mat("#6a3a1a", { transparent: true, opacity: 0.6, outline: false }), { pos: [0, 0.03, 0], scale: [0.18, 0.004, 0.12], shadow: false })),
  "prawn|boil": () => mesh("torus", mat(C.prawn), { pos: [0, 0.07, 0], scale: [0.1, 0.1, 0.1], rot: [Math.PI / 2, 0, 0] }),
  "beef|": () => cubes(INGREDIENTS.beef.color, 5),
  "rendang|": () => group(bowl("#4a2410"), ...Array.from({ length: 4 }, (_, i) => mesh("box", mat("#5a2a16"), { pos: [Math.cos(i * 1.6) * 0.05, 0.13, Math.sin(i * 1.6) * 0.05], scale: [0.05, 0.04, 0.05], rot: [0, i, 0], shadow: false }))),
  "stingray|": () => group(mesh("sphere", raw("stingray"), { pos: [0, 0.03, 0], scale: [0.2, 0.025, 0.15] }), mesh("cyl8", raw("stingray"), { pos: [0, 0.03, 0.2], scale: [0.012, 0.18, 0.012], rot: [Math.PI / 2, 0, 0] })),
  "sambalstingray|": () => group(mesh("box", mat("#3f7d3a"), { pos: [0, 0.01, 0], scale: [0.36, 0.01, 0.28], rot: [0, 0.3, 0] }), mesh("sphere", mat("#c9b8a0"), { pos: [0, 0.04, 0], scale: [0.17, 0.03, 0.12] }), mesh("sphere", mat("#c0392b"), { pos: [0, 0.07, 0], scale: [0.12, 0.02, 0.08], shadow: false })),
  "puff|": () => group(...[-0.07, 0.07].map((x) => mesh("sphere", raw("puff"), { pos: [x, 0.03, 0], scale: [0.09, 0.04, 0.06], rot: [0, 0.4, 0] }))),
  "puff|fry": () => group(...[-0.07, 0.07].map((x) => group(mesh("sphere", mat("#d9a24f"), { pos: [x, 0.035, 0], scale: [0.09, 0.045, 0.06], rot: [0, 0.4, 0] }), mesh("torus", mat("#b07a35"), { pos: [x, 0.05, 0], scale: [0.06, 0.06, 0.03], rot: [0, 0.4, Math.PI / 2], shadow: false })))),
  "ondeh|": () => group(...Array.from({ length: 5 }, (_, i) => mesh("sphere", raw("ondeh"), { pos: [Math.cos(i * 1.25) * 0.07, 0.04, Math.sin(i * 1.25) * 0.07], scale: [0.04, 0.04, 0.04] }))),
  "ondeh|boil": () => group(...Array.from({ length: 5 }, (_, i) => group(mesh("sphere", mat("#4aa84a"), { pos: [Math.cos(i * 1.25) * 0.07, 0.04, Math.sin(i * 1.25) * 0.07], scale: [0.045, 0.045, 0.045] }), mesh("sphere", mat("#fbf8f0"), { pos: [Math.cos(i * 1.25) * 0.07, 0.07, Math.sin(i * 1.25) * 0.07], scale: [0.03, 0.015, 0.03], shadow: false })))),
  "lapis|": () => bowl("#e0607a"),
  "lapis|steam": () => group(...[0, 1, 2, 3, 4].map((i) => mesh("box", mat(i % 2 ? "#fbf3e6" : "#e0607a"), { pos: [0, 0.015 + i * 0.022, 0], scale: [0.16, 0.022, 0.1] }))),
  "soya|": () => group(mesh("cyl", mat("#e6f4f8", { transparent: true, opacity: 0.5, outline: false }), { pos: [0, 0.13, 0], scale: [0.08, 0.26, 0.08] }), mesh("cyl", raw("soya"), { pos: [0, 0.11, 0], scale: [0.07, 0.2, 0.07] })),
  "banmian|": () => group(bowl("#e8d8a8"), mesh("box", mat("#f2dca0"), { pos: [0, 0.13, 0], scale: [0.16, 0.01, 0.06], rot: [0, 0.3, 0], shadow: false }), mesh("sphere", mat("#f2b632"), { pos: [0.05, 0.13, 0.04], scale: [0.03, 0.015, 0.03], shadow: false }), mesh("box", mat("#4a8a3a"), { pos: [-0.05, 0.13, -0.03], scale: [0.05, 0.008, 0.03], shadow: false })),
  "meegoreng|": () => noodlePile("#d9662e", mesh("box", mat("#7cb85a"), { pos: [0.03, 0.11, 0.02], scale: [0.05, 0.01, 0.03], shadow: false })),
  "duck|roast": () => bird("#a8551a", "#f2a03a"),
  "duck|roast,chop": () => slices("#d9a07a", "#a8551a"),
  // ---------- Famous at particular centres ----------
  "crab|": () => group(mesh("sphere", raw("crab"), { pos: [0, 0.06, 0], scale: [0.16, 0.06, 0.12] }), ...[-1, 1].map((k) => mesh("sphere", raw("crab"), { pos: [0.16 * k, 0.07, 0.1], scale: [0.06, 0.04, 0.05] })), ...[-1, 1].flatMap((k) => [0, 1, 2].map((i) => mesh("box", raw("crab"), { pos: [0.15 * k, 0.03, -0.06 + i * 0.05], scale: [0.1, 0.015, 0.015], rot: [0, 0.3 * k, 0], shadow: false })))),
  "chillicrab|": () => group(bowl("#d9452e"), mesh("sphere", mat("#c0583a"), { pos: [0, 0.14, 0], scale: [0.12, 0.05, 0.09], shadow: false }), mesh("sphere", mat("#e8892e"), { pos: [0.08, 0.14, 0.05], scale: [0.04, 0.03, 0.03], shadow: false })),
  "mantou|": () => group(...[-0.07, 0.07].map((x) => mesh("sphere", raw("mantou"), { pos: [x, 0.05, 0], scale: [0.07, 0.05, 0.06] }))),
  "mantou|fry": () => group(...[-0.07, 0, 0.07].map((x, i) => mesh("sphere", mat("#e0a85a"), { pos: [x, 0.04, (i % 2) * 0.05], scale: [0.06, 0.04, 0.05] }))),
  "wings|": () => group(...[-0.06, 0.06].map((x) => mesh("capsule", raw("wings"), { pos: [x, 0.04, 0], scale: [0.04, 0.06, 0.04], rot: [Math.PI / 2, 0, 0.4] }))),
  "wings|grill": () => group(...[-0.07, 0, 0.07].map((x, i) => mesh("capsule", mat("#a8551a"), { pos: [x, 0.04, (i % 2) * 0.04], scale: [0.04, 0.06, 0.04], rot: [Math.PI / 2, 0, 0.5 - i * 0.4] }))),
  "mince|": () => group(mesh("sphere", raw("mince"), { pos: [0, 0.04, 0], scale: [0.12, 0.05, 0.1] })),
  "mince|boil": () => group(bowl("#f3e9cf"), ...Array.from({ length: 6 }, (_, i) => mesh("sphere", mat("#b8806a"), { pos: [Math.cos(i) * 0.06, 0.125, Math.sin(i) * 0.06], scale: [0.025, 0.015, 0.025], shadow: false }))),
  "lor|": () => bowl("#5a3a22"),
  "fruit|": () => group(mesh("sphere", mat("#f2d27a"), { pos: [-0.06, 0.06, 0], scale: [0.07, 0.07, 0.07] }), mesh("cyl", mat("#5f9a4c"), { pos: [0.06, 0.04, 0.03], scale: [0.04, 0.16, 0.04], rot: [0, 0, Math.PI / 2] }), mesh("box", mat("#e8d8a8"), { pos: [0.02, 0.04, -0.07], scale: [0.08, 0.06, 0.06] })),
  "fruit|chop": () => group(...Array.from({ length: 8 }, (_, i) => mesh("box", mat(["#f2d27a", "#c8e2a8", "#e8d8a8", "#d9a24f"][i % 4]), { pos: [Math.cos(i * 0.8) * 0.08, 0.03, Math.sin(i * 0.8) * 0.07], scale: [0.05, 0.035, 0.05], rot: [0, i, 0] }))),
  "rojaksauce|": () => bowl("#3a2618"),
  "popiah|": () => mesh("capsule", raw("popiah"), { pos: [0, 0.05, 0], scale: [0.05, 0.12, 0.05], rot: [0, 0, Math.PI / 2] }),
  "popiah|chop": () => group(...[-0.09, -0.03, 0.03, 0.09].map((x) => group(mesh("cyl", mat("#f4ead6"), { pos: [x, 0.04, 0], scale: [0.045, 0.05, 0.045], rot: [0, 0, Math.PI / 2] }), mesh("cyl", mat("#7cb85a"), { pos: [x, 0.04, 0], scale: [0.03, 0.052, 0.03], rot: [0, 0, Math.PI / 2], shadow: false })))),
  "banana|": () => group(...[-0.05, 0.05].map((x) => mesh("capsule", raw("banana"), { pos: [x, 0.04, 0], scale: [0.035, 0.08, 0.035], rot: [Math.PI / 2, 0, 0.2] }))),
  "banana|fry": () => group(...[-0.06, 0, 0.06].map((x, i) => mesh("capsule", mat("#c98a3a"), { pos: [x, 0.04, (i % 2) * 0.04], scale: [0.04, 0.08, 0.04], rot: [Math.PI / 2, 0, 0.3 - i * 0.3] }))),
  "chengtng|": () => bowl("#e8d8a8"),
  "chengtng|boil": () => group(bowl("#f0e2bc"), ...Array.from({ length: 6 }, (_, i) => mesh("sphere", mat(["#c97a3a", "#f4f1ea", "#a8442a"][i % 3]), { pos: [Math.cos(i) * 0.06, 0.125, Math.sin(i) * 0.06], scale: [0.02, 0.015, 0.02], shadow: false }))),
  "thosai|": () => bowl("#f4efe2"),
  "thosai|grill": () => group(mesh("cone", mat("#e8c46a"), { pos: [0, 0.05, 0], scale: [0.08, 0.3, 0.08], rot: [0, 0, Math.PI / 2] })),
  "fishsoup|": () => group(bowl("#f3ead6"), ...[[-0.05, 0], [0.04, 0.03]].map(([x, z]) => mesh("box", mat("#ffffff"), { pos: [x, 0.13, z], scale: [0.06, 0.015, 0.035], shadow: false }))),
  "biryani|": () => group(mesh("sphere", mat("#e8a83a"), { pos: [0, 0.05, 0], scale: [0.15, 0.07, 0.13] }), mesh("sphere", mat("#7a3a22"), { pos: [0.05, 0.1, 0], scale: [0.05, 0.035, 0.04], shadow: false })),
  "chickenbiryani|": () => group(mesh("sphere", mat("#f2b632"), { pos: [0, 0.05, 0], scale: [0.15, 0.07, 0.13] }), mesh("sphere", mat("#c97a3a"), { pos: [0.05, 0.1, 0], scale: [0.05, 0.035, 0.04], shadow: false })),
  "chicken|braise": () => bird("#7a4a22"),
  "chicken|braise,chop": () => slices("#d9a07a", "#7a4a22"),
  // ---------- Claypot, black pepper, oyster cake and sugarcane ----------
  "pepper|": () => group(bowl("#2e2622"), ...Array.from({ length: 5 }, (_, i) => mesh("sphere", mat("#14110f"), { pos: [Math.cos(i * 1.3) * 0.07, 0.125, Math.sin(i * 1.3) * 0.07], scale: [0.015, 0.015, 0.015], shadow: false }))),
  "peppercrab|": () => group(bowl("#3a2e26"), mesh("sphere", mat("#a8553a"), { pos: [0, 0.14, 0], scale: [0.12, 0.05, 0.09], shadow: false }), ...[[0.05, 0.03], [-0.04, -0.02], [0.01, 0.05]].map(([x, z]) => mesh("sphere", mat("#14110f"), { pos: [x, 0.19, z], scale: [0.012, 0.012, 0.012], shadow: false }))),
  "sugarcane|": () =>
    group(
      ...[-0.05, 0, 0.05].map((z, i) =>
        group(
          mesh("cyl8", raw("sugarcane"), { pos: [0, 0.03 + (i % 2) * 0.02, z], scale: [0.026, 0.46, 0.026], rot: [0, 0.1 * i, Math.PI / 2] }),
          ...[-0.12, 0.04, 0.18].map((x) => mesh("cyl8", mat("#6a7a2a"), { pos: [x, 0.03 + (i % 2) * 0.02, z], scale: [0.029, 0.012, 0.029], rot: [0, 0.1 * i, Math.PI / 2], shadow: false })),
        ),
      ),
    ),
  "sugarcane|press": () => group(mesh("cyl", mat("#e6f4f8", { transparent: true, opacity: 0.5, outline: false }), { pos: [0, 0.13, 0], scale: [0.08, 0.26, 0.08] }), mesh("cyl", mat("#c8d88a"), { pos: [0, 0.11, 0], scale: [0.07, 0.2, 0.07] }), mesh("cyl", mat("#f4fbe8"), { pos: [0, 0.215, 0], scale: [0.068, 0.01, 0.068], shadow: false })),
  "clayrice|": () => group(mesh("cyl", raw("clayrice"), { pos: [0, 0.08, 0], scale: [0.13, 0.16, 0.13] }), mesh("cyl", mat("#f4efe2"), { pos: [0, 0.165, 0], scale: [0.115, 0.01, 0.115], shadow: false }), mesh("box", mat("#7a3a1a"), { pos: [0.17, 0.12, 0], scale: [0.07, 0.03, 0.04] })),
  "lapcheong|": () => group(...[-0.04, 0.04].map((x, i) => mesh("capsule", raw("lapcheong"), { pos: [x, 0.03, 0], scale: [0.028, 0.06, 0.028], rot: [Math.PI / 2, 0, 0.2 - i * 0.4] }))),
  "claypot|": () =>
    group(
      mesh("cyl", mat("#7a3a1a"), { pos: [0, 0.08, 0], scale: [0.13, 0.16, 0.13] }),
      mesh("cyl", mat("#c98a5a"), { pos: [0, 0.165, 0], scale: [0.115, 0.01, 0.115], shadow: false }),
      ...[[-0.04, 0.03], [0.04, -0.03]].map(([x, z]) => mesh("box", mat("#d9a07a"), { pos: [x, 0.18, z], scale: [0.05, 0.025, 0.04], shadow: false })),
      ...[[0.04, 0.04], [-0.04, -0.04]].map(([x, z]) => mesh("cyl", mat("#a8323a"), { pos: [x, 0.178, z], scale: [0.022, 0.012, 0.022], shadow: false })),
      mesh("box", mat("#5a2a10"), { pos: [0.17, 0.12, 0], scale: [0.07, 0.03, 0.04] }),
    ),
  "cakebatter|": () => bowl("#efe2c0"),
  "oystercake|": () => group(mesh("sphere", mat("#c98a3a"), { pos: [0, 0.05, 0], scale: [0.13, 0.06, 0.13] }), ...[[0.04, 0.03], [-0.05, -0.01], [0.01, -0.06]].map(([x, z]) => mesh("sphere", mat("#a8702f"), { pos: [x, 0.1, z], scale: [0.025, 0.012, 0.02], shadow: false }))),
  // A fire extinguisher, or a wet towel in the 1950s.
  "ext|": () =>
    look?.era.id === "1950s"
      ? group(
          mesh("box", mat("#f4f6f8"), { pos: [0, 0.04, 0], scale: [0.28, 0.07, 0.2] }),
          mesh("box", mat("#5a8ac4"), { pos: [0, 0.08, 0], scale: [0.28, 0.012, 0.04], shadow: false }),
          mesh("sphere", mat("#9fd0ff", { transparent: true, opacity: 0.7, outline: false }), { pos: [0.06, 0.09, 0.05], scale: [0.03, 0.02, 0.03], shadow: false }),
        )
      : group(
          mesh("cyl", mat("#d6402e"), { pos: [0, 0.2, 0], scale: [0.08, 0.4, 0.08] }),
          mesh("sphere", mat("#d6402e"), { pos: [0, 0.4, 0], scale: [0.08, 0.05, 0.08] }),
          mesh("box", mat("#2b2b2b"), { pos: [0, 0.46, 0.02], scale: [0.05, 0.04, 0.1] }),
          mesh("cyl8", mat("#2b2b2b"), { pos: [0.06, 0.3, 0.07], scale: [0.012, 0.26, 0.012], rot: [0.3, 0, 0.3] }),
          mesh("box", mat("#ffffff"), { pos: [0, 0.22, 0.081], scale: [0.08, 0.08, 0.004], shadow: false }),
        ),
};

// Drinks follow the Kopi Compiler's state: base colour, milk, ice, a bag for da bao.
const DRINK_COLORS = { kopi: "#5a321a", teh: "#a0582a", cham: "#7a4426", milo: "#6a3a22", bandung: "#f0a0b4", mj: "#2b2420" };
function drinkColor(dk) {
  const [base, milk] = dk;
  const c = new Color(DRINK_COLORS[base] ?? "#5a321a");
  if (base === "mj") return "#f2ece0";
  if (milk === "condensed") c.lerp(new Color("#f4e2c4"), 0.4);
  if (milk === "evaporated") c.lerp(new Color("#fbf3e6"), 0.5);
  return `#${c.getHexString()}`;
}

export function makeDrink(dk) {
  const [base, , , , ice, , , dino, bag] = dk;
  const liquid = mat(drinkColor(dk));
  const g = new Group();
  if (bag) {
    g.add(
      mesh("sphere", mat("#ffffff", { transparent: true, opacity: 0.55, outline: false }), { pos: [0, 0.14, 0], scale: [0.12, 0.15, 0.12] }),
      mesh("sphere", liquid, { pos: [0, 0.11, 0], scale: [0.1, 0.1, 0.1] }),
      mesh("cyl8", mat("#f07aa0"), { pos: [0, 0.3, 0], scale: [0.012, 0.12, 0.012] }),
      mesh("ring", mat("#f07aa0"), { pos: [0, 0.38, 0], scale: [0.04, 0.04, 0.04], rot: [Math.PI / 2, 0, 0] }),
    );
  } else if (ice) {
    // A tall glass mug with ice, the drink a little darker at the bottom.
    g.add(glass(drinkColor(dk), { r: 0.08, h: 0.26, ice: 4 }));
    if (dino) g.add(mesh("sphere", mat("#6a3a22", { surface: "fried" }), { pos: [0, 0.27, 0], scale: [0.075, 0.06, 0.075] }));
  } else {
    // A kopitiam cup on its saucer.
    g.add(cup(drinkColor(dk), { r: 0.075, h: 0.15 }));
  }
  g.userData.base = base;
  return g;
}

function burnt() {
  return group(
    mesh("sphere", mat(C.burnt), { pos: [0, 0.07, 0], scale: [0.16, 0.09, 0.14] }),
    mesh("sphere", mat("#3a302c"), { pos: [0.06, 0.12, 0.03], scale: [0.06, 0.05, 0.06] }),
  );
}

// A takeaway container, dressed for the era: paper wrap, a box, or a tiffin carrier.
function box(p) {
  const era = look?.era.id;
  const g = new Group();
  if (era === "1950s") {
    g.add(mesh("box", mat("#d9c3a0"), { pos: [0, 0.02, 0], scale: [0.42, 0.03, 0.42], rot: [0, 0.5, 0] }));
  } else if (era === "2065") {
    g.add(
      mesh("cyl", mat("#b9c0c4"), { pos: [0, 0.07, 0], scale: [0.2, 0.14, 0.2] }),
      mesh("cyl", mat("#7cc4e6"), { pos: [0, 0.145, 0], scale: [0.205, 0.015, 0.205], shadow: false }),
      mesh("torus", mat("#5b5f63"), { pos: [0, 0.2, 0], scale: [0.12, 0.12, 0.12], rot: [0, 0, 0] }),
    );
  } else {
    g.add(
      mesh("box", mat("#c9a46a"), { pos: [0, 0.01, 0], scale: [0.4, 0.02, 0.34] }),
      mesh("box", mat("#c9a46a"), { pos: [0, 0.06, -0.17], scale: [0.4, 0.1, 0.01] }),
      mesh("box", mat("#c9a46a"), { pos: [0, 0.06, 0.17], scale: [0.4, 0.1, 0.01] }),
      mesh("box", mat("#c9a46a"), { pos: [-0.2, 0.06, 0], scale: [0.01, 0.1, 0.34] }),
      mesh("box", mat("#c9a46a"), { pos: [0.2, 0.06, 0], scale: [0.01, 0.1, 0.34] }),
    );
  }
  const dish = p.c?.length ? platedDish(p.c) : null;
  if (dish) {
    dish.scale.setScalar(0.8);
    dish.position.y = era === "2065" ? 0.13 : 0.01;
    g.add(dish);
  }
  const loose = dish ? p.c.filter((it) => it.k === "drink") : (p.c ?? []);
  const n = loose.length;
  loose.forEach((it, i) => {
    const m = makeItem(it);
    const a = (i / Math.max(1, n)) * Math.PI * 2;
    m.scale.setScalar(n > 1 ? 0.62 : 0.85);
    if (dish) m.position.set(0.2, 0.03, 0.12);
    else m.position.set(Math.cos(a) * (n > 1 ? 0.08 : 0), era === "2065" ? 0.15 : 0.03, Math.sin(a) * (n > 1 ? 0.07 : 0));
    g.add(m);
  });
  return g;
}

function plate(p) {
  if (p.k === "box") return box(p);
  const g = group(plateWare(0.25, { rim: "#2f6b4f" }));
  if (p.d) {
    for (const [x, z] of [[0.08, 0.04], [-0.06, -0.07], [-0.02, 0.1]]) {
      g.add(mesh("cyl", mat("#8a6a4a"), { pos: [x, 0.032, z], scale: [0.045, 0.004, 0.045], shadow: false }));
    }
  }
  // A complete dish shows as the real thing; anything else sits in a ring.
  const dish = !p.d && p.c?.length ? platedDish(p.c) : null;
  if (dish) g.add(dish);
  const loose = dish ? p.c.filter((it) => it.k === "drink") : (p.c ?? []);
  const n = loose.length;
  loose.forEach((it, i) => {
    const m = makeItem(it);
    const a = (i / Math.max(1, n)) * Math.PI * 2;
    const r = n > 1 ? 0.09 : 0;
    m.scale.setScalar(n > 1 ? 0.7 : 0.9);
    if (dish) m.position.set(0.22, 0.03, 0.14);
    else m.position.set(Math.cos(a) * r, 0.03, Math.sin(a) * r);
    g.add(m);
  });
  return g;
}

export function itemKey(p) {
  return p ? JSON.stringify(p) : "";
}

// Always a group, so callers can scale or pop it without squashing the shapes inside.
export function makeItem(p) {
  if (!p) return null;
  const g = new Group();
  if (p.k === "plate" || p.k === "box") g.add(plate(p));
  else if (p.k === "drink") g.add(makeDrink(p.dk));
  else if (p.b) g.add(burnt());
  else {
    const build = FOOD[`${p.k}|${p.s ?? ""}`] ?? FOOD[`${p.k}|`];
    g.add(build ? build() : mesh("sphere", mat("#ff00ff"), { scale: [0.1, 0.1, 0.1] }));
  }
  return g;
}

// ---------- Kitchen furniture, dressed for the era ----------

const marbleTex = marble();
const tileTex = peranakan();
const steel = mat("#b9c0c4", { surface: "steel" });
const steelDark = mat("#5b5f63", { surface: "steel" });
const wood = mat("#b07a45", { surface: "wood" });
const green = mat("#2f6b4f");

let look = null;

export function setEraLook(era) {
  const l = era.look;
  look = {
    era,
    side: era.id === "today" ? mat("#f4ead6", { map: tileTex, surface: "ceramic" }) : mat(l.counterSide, { surface: era.id === "1950s" ? "wood" : "tiles" }),
    top: era.id === "1950s" ? mat(l.counterTop, { surface: "wood" }) : mat(l.counterTop, { map: marbleTex, surface: era.id === "2065" ? "plastic" : "steel" }),
    trim: mat(era.id === "2065" ? "#7cc4e6" : era.id === "1950s" ? "#6a4424" : "#c8553d"),
  };
}

function counter(top = look.top, side = look.side) {
  return group(
    mesh("box", side, { pos: [0, 0.42, 0], scale: [0.98, 0.84, 0.98] }),
    mesh("box", top, { pos: [0, 0.87, 0], scale: [1.02, 0.06, 1.02] }),
    mesh("box", look.trim, { pos: [0, 0.78, 0], scale: [1.0, 0.04, 1.0], shadow: false }),
  );
}

export const TOP = 0.9; // height of a counter top

export function makeStation(st, level) {
  const g = new Group();
  const parts = {};
  const era = look.era;
  switch (st.type) {
    case "counter":
      g.add(counter());
      break;
    case "crate": {
      const grp = groupOf(st.ing);
      g.add(mesh("box", wood, { pos: [0, 0.4, 0], scale: [0.96, 0.8, 0.96] }));
      for (const y of [0.2, 0.5]) g.add(mesh("box", mat("#8f5f33"), { pos: [0, y, 0.485], scale: [0.98, 0.05, 0.02], shadow: false }));
      // The lid wears the food group's colour.
      g.add(mesh("box", mat(grp?.color ?? "#b07a45"), { pos: [0, 0.82, 0], scale: [0.98, 0.06, 0.98] }));
      const sample = makeItem({ k: st.ing, s: "", b: 0 });
      sample.position.set(0, 0.85, 0.12);
      g.add(sample);
      // A little upright placard, like the price tags along a stall counter, and the same tag on the front.
      const tagMat = mat("#ffffff", { map: crateLabel(st.ing, era), outline: false });
      const tag = new Mesh(geo.plane, tagMat);
      tag.scale.set(0.92, 0.4, 1);
      tag.position.set(0, 1.16, -0.3);
      tag.rotation.x = -0.45;
      const front = new Mesh(geo.plane, tagMat);
      front.scale.set(0.84, 0.37, 1);
      front.position.set(0, 0.6, 0.492);
      g.add(tag, front, mesh("box", mat("#8f5f33"), { pos: [0, 0.98, -0.34], scale: [0.04, 0.2, 0.04] }));
      break;
    }
    case "board":
      g.add(counter(), mesh("box", mat("#d4a36a"), { pos: [0, 0.92, 0], scale: [0.72, 0.05, 0.58] }));
      // A cleaver resting in the corner.
      g.add(mesh("box", mat("#d9dde0"), { pos: [0.3, 0.955, -0.24], scale: [0.16, 0.012, 0.09], rot: [0, 0.5, 0], shadow: false }), mesh("box", mat("#3a2a1a"), { pos: [0.4, 0.96, -0.3], scale: [0.09, 0.025, 0.03], rot: [0, 0.5, 0], shadow: false }));
      break;
    case "shaver": {
      g.add(counter());
      g.add(mesh("cyl", mat("#d9dde0"), { pos: [0, 1.4, -0.1], scale: [0.16, 0.5, 0.16] }));
      g.add(mesh("cyl8", mat("#c8553d"), { pos: [0.24, 1.55, -0.1], scale: [0.03, 0.3, 0.03], rot: [0, 0, Math.PI / 2] }));
      g.add(mesh("sphere", mat("#c8553d"), { pos: [0.4, 1.55, -0.1], scale: [0.05, 0.05, 0.05] }));
      g.add(mesh("cyl", mat("#9aa3a8"), { pos: [0, 1.12, -0.1], scale: [0.04, 0.06, 0.04] }));
      break;
    }
    case "kaya": {
      // A kopitiam's spread corner: a squat jar of kaya with a spoon in it, a block of butter on a saucer,
      // and a butter knife.
      g.add(counter());
      g.add(mesh("cyl", mat("#e8eef0", { transparent: true, opacity: 0.55 }), { pos: [-0.14, 1.04, -0.12], scale: [0.16, 0.28, 0.16] }));
      g.add(mesh("cyl", mat(C.kaya), { pos: [-0.14, 1.0, -0.12], scale: [0.145, 0.2, 0.145], shadow: false }));
      g.add(mesh("cyl", mat("#c8553d"), { pos: [-0.14, 1.19, -0.12], scale: [0.17, 0.03, 0.17], shadow: false }));
      g.add(mesh("cyl8", mat("#d9dde0"), { pos: [-0.08, 1.24, -0.1], scale: [0.012, 0.22, 0.012], rot: [0, 0, -0.35], shadow: false }));
      g.add(mesh("cyl", mat("#fffdf7"), { pos: [0.2, 0.915, 0.08], scale: [0.16, 0.012, 0.16], shadow: false }));
      g.add(mesh("box", mat(C.butter), { pos: [0.2, 0.95, 0.08], scale: [0.14, 0.06, 0.08] }));
      g.add(mesh("box", mat("#d9dde0"), { pos: [0.26, 0.92, -0.22], scale: [0.2, 0.01, 0.03], rot: [0, 0.6, 0], shadow: false }));
      break;
    }
    case "press": {
      // A sugarcane press: a painted body, two steel rollers the cane goes between, and a spout.
      g.add(counter());
      g.add(mesh("box", mat("#3f8f6a"), { pos: [0, 1.22, -0.28], scale: [0.62, 0.6, 0.3] }));
      for (const x of [-0.09, 0.09]) g.add(mesh("cyl", mat("#d9dde0"), { pos: [x, 1.6, -0.28], scale: [0.08, 0.36, 0.08], rot: [Math.PI / 2, 0, 0] }));
      g.add(mesh("cyl8", mat("#9ab04a"), { pos: [0, 1.84, -0.28], scale: [0.025, 0.5, 0.025], rot: [0.25, 0, 0], shadow: false }));
      g.add(mesh("box", mat("#9aa3a8"), { pos: [0.2, 1.02, -0.1], scale: [0.07, 0.04, 0.08], shadow: false }));
      g.add(mesh("cyl8", mat("#c8553d"), { pos: [0.36, 1.3, -0.28], scale: [0.03, 0.24, 0.03], rot: [0, 0, Math.PI / 2] }));
      break;
    }
    case "wok": {
      g.add(counter(steelDark, steelDark));
      g.add(mesh("bowl", mat("#2b2b2b"), { pos: [0, 1.12, 0], scale: [0.38, 0.22, 0.38], rot: [Math.PI, 0, 0] }));
      g.add(mesh("cyl8", mat("#3a2a1a"), { pos: [0.45, 1.05, 0], scale: [0.03, 0.3, 0.03], rot: [0, 0, Math.PI / 2] }));
      // The wok ladle and a bottle of dark soy, always within reach.
      g.add(mesh("cyl8", mat("#9aa3a8"), { pos: [-0.36, 1.08, -0.3], scale: [0.015, 0.36, 0.015], rot: [0.5, 0, 0.3], shadow: false }), mesh("bowl", mat("#9aa3a8"), { pos: [-0.42, 0.94, -0.38], scale: [0.06, 0.04, 0.06], rot: [Math.PI, 0, 0], shadow: false }));
      g.add(mesh("cyl", mat("#2a1a10"), { pos: [0.36, 1.0, -0.36], scale: [0.04, 0.16, 0.04] }), mesh("cyl", mat("#c8553d"), { pos: [0.36, 1.1, -0.36], scale: [0.02, 0.03, 0.02], shadow: false }));
      parts.flame = flame();
      parts.flame.position.y = 0.93;
      g.add(parts.flame);
      break;
    }
    case "pot": {
      g.add(counter(steelDark, steelDark));
      g.add(mesh("cyl", steel, { pos: [0, 1.08, 0], scale: [0.3, 0.32, 0.3] }));
      g.add(mesh("cyl8", mat("#5b5f63"), { pos: [0.22, 1.36, -0.1], scale: [0.015, 0.4, 0.015], rot: [0.2, 0, -0.5], shadow: false }));
      parts.soup = mesh("cyl", mat("#f3e9cf"), { pos: [0, 1.23, 0], scale: [0.27, 0.01, 0.27], shadow: false });
      parts.soup.visible = false;
      g.add(parts.soup);
      parts.flame = flame();
      parts.flame.position.y = 0.92;
      g.add(parts.flame);
      break;
    }
    case "cooker": {
      g.add(counter());
      if (era.id === "1950s") {
        // A bamboo steamer on a charcoal stove.
        g.add(mesh("cyl", mat("#c9a46a"), { pos: [0, 1.06, 0], scale: [0.3, 0.26, 0.3] }), mesh("cyl", mat("#b08a50"), { pos: [0, 1.22, 0], scale: [0.31, 0.06, 0.31] }));
      } else {
        g.add(mesh("cyl", mat("#fbf6ea"), { pos: [0, 1.08, 0], scale: [0.28, 0.32, 0.28] }));
        g.add(mesh("sphere", mat("#e8e2d2"), { pos: [0, 1.24, 0], scale: [0.27, 0.08, 0.27] }));
      }
      parts.light = mesh("sphere", mat("#7a2a2a"), { pos: [0, 1.0, 0.28], scale: [0.03, 0.03, 0.03], shadow: false });
      parts.lightOn = mat("#ff4a3a", { emissive: "#ff4a3a", glow: 3 });
      parts.lightOff = parts.light.material;
      g.add(parts.light);
      break;
    }
    case "grill": {
      g.add(counter(steelDark, steelDark));
      parts.coals = mesh("box", mat("#5a2a1a"), { pos: [0, 0.92, 0], scale: [0.8, 0.05, 0.6], shadow: false });
      parts.coalsOn = mat("#ff7a2a", { emissive: "#c24a10", glow: 2.4 });
      parts.coalsOff = parts.coals.material;
      g.add(parts.coals);
      for (const x of [-0.3, -0.15, 0, 0.15, 0.3]) g.add(mesh("box", mat("#1e1e1e"), { pos: [x, 0.97, 0], scale: [0.03, 0.03, 0.64], shadow: false }));
      break;
    }
    case "urn": {
      g.add(counter());
      g.add(mesh("cyl", mat("#b87333"), { pos: [0, 1.25, -0.12], scale: [0.2, 0.62, 0.2] }));
      g.add(mesh("sphere", mat("#c98a4a"), { pos: [0, 1.57, -0.12], scale: [0.2, 0.08, 0.2] }));
      g.add(mesh("cyl8", mat("#3a2a1a"), { pos: [0, 1.05, 0.08], scale: [0.03, 0.12, 0.03], rot: [Math.PI / 2, 0, 0] }));
      // The sock filter hanging off a long handle.
      g.add(mesh("cyl8", mat("#3a2a1a"), { pos: [-0.28, 1.4, -0.12], scale: [0.015, 0.4, 0.015], rot: [0, 0, 0.4] }), mesh("cone", mat("#d9c8a8"), { pos: [-0.36, 1.18, -0.12], scale: [0.06, 0.16, 0.06], rot: [Math.PI, 0, 0] }));
      // Upturned cups waiting their turn.
      for (const [x, z] of [[0.3, 0.3], [0.38, 0.18]]) g.add(mesh("cone8", mat("#fffdf7"), { pos: [x, 0.95, z], scale: [0.05, 0.07, 0.05], shadow: false }));
      break;
    }
    case "hatch": {
      g.add(counter(look.top, mat(era.id === "1950s" ? "#8a5a30" : "#e9d8b6")));
      const word = era.id === "1950s" ? "MAKAN" : "SERVE";
      const sign = new Mesh(geo.plane, mat("#ffffff", { map: label(word, { bg: era.id === "2065" ? "#2a8f8a" : "#c8553d", sub: "#01-23", font: "700 50px 'Bricolage Grotesque Variable', system-ui, sans-serif" }), outline: false }));
      sign.scale.set(1, 0.5, 1);
      sign.position.set(0, 1.75, 0.3);
      sign.rotation.x = -0.35;
      g.add(sign, mesh("cyl8", steelDark, { pos: [-0.46, 1.3, 0.3], scale: [0.025, 0.85, 0.025] }), mesh("cyl8", steelDark, { pos: [0.46, 1.3, 0.3], scale: [0.025, 0.85, 0.025] }));
      g.add(mesh("box", mat("#f2b632"), { pos: [0, 0.93, 0], scale: [0.9, 0.04, 0.9], shadow: false }));
      if (era.id === "today" || era.id === "2065") g.add(qrSticker(0.36, 0.6, 0.495));
      // A service bell.
      g.add(mesh("bowl", mat("#d9b23a"), { pos: [0.34, 0.95, -0.34], scale: [0.06, 0.05, 0.06], shadow: false }), mesh("cyl8", mat("#2b2b2b"), { pos: [0.34, 0.95, -0.34], scale: [0.07, 0.01, 0.07], shadow: false }));
      break;
    }
    case "rack":
      g.add(counter());
      parts.stack = new Group();
      parts.stack.position.y = TOP;
      g.add(parts.stack);
      break;
    case "return": {
      g.add(counter(look.top, green));
      const sign = new Mesh(geo.plane, mat("#ffffff", { map: label(era.returnLabel, { bg: "#2f6b4f", h: 64, font: "700 30px 'DM Mono', monospace" }), outline: false }));
      sign.scale.set(0.9, 0.22, 1);
      sign.position.set(0, 0.6, 0.495);
      g.add(sign);
      parts.stack = new Group();
      parts.stack.position.y = TOP;
      g.add(parts.stack);
      break;
    }
    case "sink": {
      if (era.id === "1950s") {
        g.add(counter());
        g.add(mesh("cyl", mat("#9aa3a8"), { pos: [0, 1.0, 0], scale: [0.32, 0.22, 0.32] }), mesh("cyl", mat("#8fb8c9", { transparent: true, opacity: 0.85 }), { pos: [0, 1.1, 0], scale: [0.29, 0.02, 0.29], shadow: false }));
      } else {
        g.add(counter(steel, steel));
        g.add(mesh("box", mat("#7fb7c9", { transparent: true, opacity: 0.85 }), { pos: [0, 0.89, 0], scale: [0.7, 0.02, 0.6], shadow: false }));
        g.add(mesh("cyl8", steel, { pos: [0, 1.15, -0.38], scale: [0.03, 0.5, 0.03] }), mesh("cyl8", steel, { pos: [0, 1.38, -0.28], scale: [0.03, 0.22, 0.03], rot: [Math.PI / 2, 0, 0] }));
      }
      if (era.robotSink) {
        const bot = robot();
        bot.position.set(0.34, 0.9, -0.3);
        bot.scale.setScalar(0.6);
        g.add(bot);
        parts.robot = bot;
      }
      parts.stack = new Group();
      parts.stack.position.y = era.id === "1950s" ? 1.0 : 0.88;
      g.add(parts.stack);
      break;
    }
    case "boxes": {
      g.add(counter());
      for (let i = 0; i < 4; i++) {
        const b = box({ k: "box", c: [] });
        b.position.set(0, TOP + i * 0.06, 0);
        g.add(b);
      }
      const sign = new Mesh(geo.plane, mat("#ffffff", { map: label(era.boxLabel, { bg: "#c9a46a", fg: "#2b1b12", h: 64, font: "700 30px 'DM Mono', monospace" }), outline: false }));
      sign.scale.set(0.9, 0.22, 1);
      sign.position.set(0, 0.6, 0.495);
      g.add(sign);
      break;
    }
    case "ext": {
      g.add(counter(look.top, mat("#e8c4b8")));
      const sign = new Mesh(geo.plane, mat("#ffffff", { map: label(era.id === "1950s" ? "WET TOWEL" : "FIRE", { bg: "#d6402e", h: 64, font: "700 34px 'DM Mono', monospace" }), outline: false }));
      sign.scale.set(0.8, 0.22, 1);
      sign.position.set(0, 0.6, 0.495);
      g.add(sign);
      break;
    }
    case "bin":
      g.add(mesh("cyl", mat("#2f7d4a"), { pos: [0, 0.38, 0], scale: [0.32, 0.76, 0.32] }), mesh("cyl", mat("#256b3e"), { pos: [0, 0.79, 0], scale: [0.34, 0.06, 0.34] }));
      break;
  }
  g.position.set(st.x + 0.5, 0, st.z + 0.5);
  g.userData.parts = parts;
  return g;
}

const labelCache = new Map();
function crateLabel(ing, era) {
  const text = ing === "chicken" ? era.chickenLabel : (INGREDIENTS[ing]?.label ?? ing.toUpperCase());
  const key = `${ing}|${text}`;
  if (!labelCache.has(key)) labelCache.set(key, crateTag(text, ing, groupOf(ing)?.color ?? "#b07a45"));
  return labelCache.get(key);
}

function flame() {
  const f = new Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    f.add(mesh("cone", mat("#ff9a2a", { emissive: "#ff6a00", glow: 2.6, outline: false }), { pos: [Math.cos(a) * 0.18, 0.06, Math.sin(a) * 0.18], scale: [0.04, 0.12, 0.04], shadow: false }));
  }
  f.visible = false;
  return f;
}

export function plateStack(n, dirty) {
  const g = new Group();
  for (let i = 0; i < Math.min(n, 8); i++) {
    const p = plate({ k: "plate", d: dirty ? 1 : 0, c: [] });
    p.position.set((i % 2) * 0.01, i * 0.035, 0);
    g.add(p);
  }
  return g;
}

// ---------- People ----------

export const CHEF_COLORS = ["#e0533a", "#2f8f6b", "#3b5bdb", "#f2b632"];
const SKIN = ["#f1c9a5", "#c68642", "#8d5524", "#e0ac69"];

// colour: a centre's own table tops (Chomp Chomp's yellow, Hong Lim's turquoise), or null for the era's.
export function makeTable(era, colour = null) {
  const g = new Group();
  if (era?.id === "1950s") {
    // Low folding tables on the five-foot way.
    g.add(mesh("box", mat("#a8784a", { surface: "wood" }), { pos: [0, 0.5, 0], scale: [0.9, 0.05, 0.7] }));
    for (const [x, z] of [[-0.38, -0.28], [0.38, -0.28], [-0.38, 0.28], [0.38, 0.28]]) g.add(mesh("box", mat("#7a5230", { surface: "wood" }), { pos: [x, 0.25, z], scale: [0.05, 0.5, 0.05] }));
    return g;
  }
  const top = colour ? mat(colour, { surface: "plastic" }) : era?.id === "2065" ? mat("#fbfdfc", { surface: "plastic" }) : mat("#ffffff", { map: marbleTex, surface: "marble" });
  g.add(
    mesh("cyl", top, { pos: [0, 0.72, 0], scale: [0.55, 0.05, 0.55] }),
    mesh("cyl8", steelDark, { pos: [0, 0.36, 0], scale: [0.06, 0.72, 0.06] }),
    mesh("cyl", steelDark, { pos: [0, 0.02, 0], scale: [0.3, 0.03, 0.3] }),
  );
  return g;
}

export function makeStool(era, colour = null) {
  if (era?.id === "1950s" && !colour) return group(mesh("box", mat("#b58a5a"), { pos: [0, 0.3, 0], scale: [0.26, 0.04, 0.26] }), mesh("box", mat("#7a5230"), { pos: [0, 0.15, 0], scale: [0.2, 0.3, 0.2] }));
  const c = colour ? [colour, colour] : era?.id === "2065" ? ["#7cc4e6", "#5aa8cc"] : ["#d6402e", "#c0392b"];
  return group(mesh("cyl", mat(c[0], { surface: "plastic" }), { pos: [0, 0.4, 0], scale: [0.18, 0.05, 0.18] }), mesh("cyl8", mat(c[1], { surface: "plastic" }), { pos: [0, 0.2, 0], scale: [0.14, 0.38, 0.14] }));
}

export function makeCat() {
  const g = new Group();
  const fur = mat("#e8923a");
  g.add(
    mesh("sphere", fur, { pos: [0, 0.14, 0], scale: [0.22, 0.12, 0.13] }),
    mesh("sphere", fur, { pos: [0.22, 0.2, 0], scale: [0.1, 0.09, 0.09] }),
    mesh("cone", fur, { pos: [0.26, 0.3, 0.05], scale: [0.03, 0.06, 0.03] }),
    mesh("cone", fur, { pos: [0.26, 0.3, -0.05], scale: [0.03, 0.06, 0.03] }),
    mesh("sphere", mat("#ffffff"), { pos: [0.02, 0.2, 0.08], scale: [0.1, 0.06, 0.05], shadow: false }),
  );
  const tail = mesh("cyl8", fur, { pos: [-0.28, 0.18, 0], scale: [0.025, 0.24, 0.025], rot: [0, 0, 0.9] });
  g.add(tail);
  g.userData.tail = tail;
  return g;
}

export function makeSign(text, accent) {
  const sign = new Mesh(geo.plane, mat("#ffffff", { map: label(text, { bg: accent, w: 512, h: 120, font: "700 64px 'Fraunces Variable', Georgia, serif" }), outline: false }));
  sign.scale.set(3.4, 0.8, 1);
  return sign;
}

// ---------- Era props ----------

function qrSticker(x, y, z) {
  const g = new Group();
  g.add(mesh("box", mat("#ffffff"), { pos: [x, y, z], scale: [0.16, 0.16, 0.005], shadow: false }));
  for (const [dx, dy] of [[-0.04, 0.04], [0.04, 0.04], [-0.04, -0.04], [0.02, -0.02], [0, 0.01]]) {
    g.add(mesh("box", mat("#2b1b12", { outline: false }), { pos: [x + dx, y + dy, z + 0.004], scale: [0.04, 0.04, 0.004], shadow: false }));
  }
  return g;
}

export function robot() {
  const g = new Group();
  g.add(
    mesh("capsule", mat("#e8f1ee"), { pos: [0, 0.35, 0], scale: [0.2, 0.15, 0.2] }),
    mesh("sphere", mat("#e8f1ee"), { pos: [0, 0.7, 0], scale: [0.18, 0.15, 0.18] }),
    mesh("box", mat("#2a3a44"), { pos: [0, 0.72, 0.15], scale: [0.2, 0.08, 0.04], shadow: false }),
    mesh("sphere", mat("#7cf0e6", { emissive: "#3ad0c6", glow: 3, outline: false }), { pos: [-0.05, 0.72, 0.17], scale: [0.025, 0.025, 0.02], shadow: false }),
    mesh("sphere", mat("#7cf0e6", { emissive: "#3ad0c6", glow: 3, outline: false }), { pos: [0.05, 0.72, 0.17], scale: [0.025, 0.025, 0.02], shadow: false }),
    mesh("cyl8", mat("#9aa3a8"), { pos: [0, 0.92, 0], scale: [0.01, 0.12, 0.01] }),
    mesh("sphere", mat("#f2b632", { emissive: "#c28a12" }), { pos: [0, 1.0, 0], scale: [0.03, 0.03, 0.03] }),
  );
  return g;
}

export function shophouses(width, colors) {
  const g = new Group();
  const n = Math.ceil(width / 2.4) + 2;
  for (let i = 0; i < n; i++) {
    const x = -2.4 + i * 2.4;
    const c = colors[i % colors.length];
    g.add(mesh("box", mat(c), { pos: [x, 2.4, 0], scale: [2.36, 4.8, 1.2] }));
    // Upstairs windows with shutters, and the five-foot way arcade below.
    for (const wx of [-0.6, 0.6]) {
      g.add(mesh("box", mat("#2b1b12"), { pos: [x + wx, 3.5, 0.61], scale: [0.5, 0.9, 0.02], shadow: false }));
      g.add(mesh("box", mat("#5f9a7a"), { pos: [x + wx - 0.32, 3.5, 0.63], scale: [0.14, 0.9, 0.02], shadow: false }), mesh("box", mat("#5f9a7a"), { pos: [x + wx + 0.32, 3.5, 0.63], scale: [0.14, 0.9, 0.02], shadow: false }));
    }
    g.add(mesh("box", mat("#f4ead6"), { pos: [x, 4.9, 0.1], scale: [2.4, 0.25, 1.4] }));
    g.add(mesh("box", mat("#3a2a1e"), { pos: [x, 1.0, 0.61], scale: [1.6, 2.0, 0.02], shadow: false }));
    g.add(mesh("box", mat("#f4ead6"), { pos: [x - 1.15, 1.2, 1.2], scale: [0.18, 2.4, 0.18] }));
    g.add(mesh("box", mat("#f4ead6"), { pos: [x, 2.45, 1.2], scale: [2.4, 0.12, 1.4] }));
  }
  return g;
}

export function hdbBlock(color) {
  const g = new Group();
  g.add(mesh("box", mat(color), { pos: [0, 4, 0], scale: [5, 8, 1.4] }));
  for (let y = 1; y < 8; y++) {
    g.add(mesh("box", mat("#ffffff"), { pos: [0, y, 0.71], scale: [4.8, 0.08, 0.02], shadow: false }));
    for (let x = -2; x <= 2; x++) g.add(mesh("box", mat("#5b6b78"), { pos: [x, y + 0.45, 0.71], scale: [0.5, 0.4, 0.02], shadow: false }));
  }
  g.add(mesh("box", mat("#2b1b12"), { pos: [-2.1, 7.2, 0.72], scale: [0.5, 0.5, 0.02], shadow: false }));
  return g;
}

export function ceilingFan() {
  const g = new Group();
  g.add(mesh("cyl8", steelDark, { pos: [0, 0.3, 0], scale: [0.02, 0.6, 0.02] }), mesh("cyl", mat("#f4ead6"), { pos: [0, 0, 0], scale: [0.12, 0.08, 0.12] }));
  const blades = new Group();
  for (let i = 0; i < 3; i++) blades.add(mesh("box", mat("#f4ead6"), { pos: [Math.cos((i * 2 * Math.PI) / 3) * 0.4, 0, Math.sin((i * 2 * Math.PI) / 3) * 0.4], scale: [0.7, 0.02, 0.14], rot: [0, -(i * 2 * Math.PI) / 3, 0] }));
  g.add(blades);
  g.userData.blades = blades;
  return g;
}

export function rediffusionBox() {
  return group(
    mesh("box", mat("#8a5a30"), { pos: [0, 0, 0], scale: [0.6, 0.45, 0.25] }),
    mesh("box", mat("#c9a15a"), { pos: [-0.08, 0, 0.13], scale: [0.36, 0.3, 0.01], shadow: false }),
    mesh("cyl", mat("#f4ead6"), { pos: [0.21, -0.08, 0.13], scale: [0.04, 0.02, 0.04], rot: [Math.PI / 2, 0, 0] }),
  );
}

export function kerosene() {
  const g = new Group();
  g.add(
    mesh("cyl8", mat("#3a2a1e"), { pos: [0, 0.5, 0], scale: [0.01, 0.6, 0.01] }),
    mesh("sphere", mat("#ffd27a", { emissive: "#ffb14a", glow: 3, outline: false }), { pos: [0, 0.12, 0], scale: [0.09, 0.11, 0.09] }),
    mesh("cyl", mat("#b87333"), { pos: [0, 0, 0], scale: [0.07, 0.06, 0.07] }),
    mesh("cyl", mat("#b87333"), { pos: [0, 0.24, 0], scale: [0.05, 0.03, 0.05] }),
  );
  return g;
}

export function pushcart() {
  const g = new Group();
  g.add(mesh("box", mat("#8a5a30"), { pos: [0, 0.7, 0], scale: [1.2, 0.5, 0.6] }), mesh("box", mat("#c8553d"), { pos: [0, 1.6, 0], scale: [1.3, 0.06, 0.7] }));
  for (const x of [-0.55, 0.55]) g.add(mesh("cyl8", mat("#3a2a1e"), { pos: [x, 1.2, -0.25], scale: [0.03, 0.8, 0.03] }));
  for (const x of [-0.4, 0.4]) g.add(mesh("cyl", mat("#2b1b12"), { pos: [x, 0.25, 0.32], scale: [0.25, 0.05, 0.25], rot: [Math.PI / 2, 0, 0] }));
  return g;
}

export function solarCanopy(width) {
  const g = new Group();
  const panel = mat("#2d4f9c", { transparent: true, opacity: 0.55, outline: false });
  for (let i = 0; i < Math.ceil(width / 1.6); i++) g.add(mesh("box", panel, { pos: [i * 1.6, 0, 0], scale: [1.5, 0.04, 2.2], rot: [0.18, 0, 0], shadow: false }));
  return g;
}

export function planter() {
  return group(
    mesh("cyl", mat("#e8f1ee"), { pos: [0, 0.25, 0], scale: [0.3, 0.5, 0.3] }),
    mesh("sphere", mat("#5fae5a"), { pos: [0, 0.65, 0], scale: [0.35, 0.3, 0.35] }),
    mesh("sphere", mat("#7cc46a"), { pos: [0.15, 0.85, 0.05], scale: [0.2, 0.2, 0.2] }),
  );
}

export function queueBoard(n) {
  const tex = label(`NOW SERVING ${String(n).padStart(3, "0")}`, { bg: "#1a120c", fg: "#ff7a5c", w: 512, h: 96, font: "400 64px 'VT323', monospace" });
  const glowing = mat("#ffffff", { map: tex, outline: false }).clone();
  glowing.emissive = new Color("#ffffff");
  glowing.emissiveMap = tex;
  glowing.emissiveIntensity = 1.6;
  const sign = new Mesh(geo.plane, glowing);
  sign.scale.set(1.8, 0.34, 1);
  return sign;
}

// A trishaw taking a shortcut through the stall (1950s chaos).
export function trishaw() {
  const g = new Group();
  g.add(
    mesh("box", mat("#2f6b4f"), { pos: [0.25, 0.55, 0], scale: [0.6, 0.35, 0.7] }),
    mesh("box", mat("#d9c3a0"), { pos: [0.25, 0.85, 0], scale: [0.55, 0.06, 0.65] }),
    mesh("box", mat("#c8553d"), { pos: [0.3, 1.25, 0], scale: [0.6, 0.05, 0.75] }),
    mesh("cyl8", mat("#3a2a1e"), { pos: [-0.35, 0.7, 0], scale: [0.03, 0.6, 0.03] }),
    mesh("capsule", mat("#f4efe2"), { pos: [-0.35, 1.1, 0], scale: [0.14, 0.12, 0.13] }),
    mesh("sphere", mat("#c68642"), { pos: [-0.35, 1.38, 0], scale: [0.11, 0.11, 0.11] }),
    mesh("cone8", mat("#d8c39b"), { pos: [-0.35, 1.5, 0], scale: [0.18, 0.05, 0.18] }),
  );
  for (const [x, z] of [[-0.45, 0], [0.25, -0.38], [0.25, 0.38]]) g.add(mesh("cyl", mat("#2b1b12"), { pos: [x, 0.22, z], scale: [0.22, 0.04, 0.22], rot: [Math.PI / 2, 0, 0] }));
  return g;
}

export function puddle() {
  return mesh("cyl", mat("#7fb7d9", { transparent: true, opacity: 0.55, outline: false }), { scale: [1, 0.01, 1], shadow: false });
}

// ---------- Backdrops: the rest of the hawker centre behind the dining area ----------

const STALL_NAMES = {
  "1980s": ["KOPI", "CHICKEN RICE", "MEE POK", "NASI LEMAK", "ROTI PRATA", "FRIED HOKKIEN MEE", "SATAY", "CHENDOL"],
  today: ["DRINKS", "WANTON MEE", "NASI PADANG", "THOSAI", "YONG TAU FOO", "FISHBALL NOODLE", "ECONOMIC RICE", "DESSERT"],
  2065: ["KOPI", "LAKSA", "PRATA", "CHICKEN RICE", "SATAY", "MEE REBUS", "ICE KACHANG", "ROJAK"],
};

// A row of other stalls, each with its own signboard, like the far side of a hawker centre.
export function stallRow(era, count) {
  const g = new Group();
  const names = STALL_NAMES[era.id] ?? STALL_NAMES.today;
  const walls = era.id === "2065" ? ["#e8f1ee", "#d7eef0"] : era.id === "1980s" ? ["#bfe3d0", "#f4ead6"] : ["#f4ead6", "#e9d8b6"];
  const boards = era.id === "2065" ? ["#2a8f8a", "#3b5bdb", "#2f6b4f"] : era.id === "1980s" ? ["#2f6b4f", "#c8553d", "#2d4f9c"] : ["#c8553d", "#2f6b4f", "#b23c20", "#7a4a9a", "#2d4f9c"];
  for (let i = 0; i < count; i++) {
    const x = i * 2.3;
    g.add(mesh("box", mat(walls[i % walls.length]), { pos: [x, 1.3, -0.4], scale: [2.24, 2.6, 0.2] }));
    g.add(mesh("box", mat(era.id === "1980s" ? "#e9d8b6" : "#f6f2ea", { map: era.id === "1980s" ? null : marbleTex }), { pos: [x, 0.5, 0.1], scale: [2.1, 1.0, 0.8] }));
    const name = names[i % names.length];
    const sign = new Mesh(geo.plane, mat("#ffffff", { map: label(name, { bg: boards[i % boards.length], w: 384, h: 96, font: `700 ${name.length > 12 ? 34 : 44}px 'Bricolage Grotesque Variable', system-ui, sans-serif`, sub: `#01-${String(30 + i).padStart(2, "0")}` }), outline: false }));
    sign.scale.set(2.0, 0.5, 1);
    sign.position.set(x, 2.35, -0.28);
    g.add(sign);
    g.add(mesh("box", mat("#5b5f63"), { pos: [x, 2.66, -0.3], scale: [2.24, 0.06, 0.3], shadow: false }));
  }
  return g;
}

// A tree for the sides: a rain tree in most eras, a coconut palm in the 1950s.
export function tree(era, h = 3) {
  if (era.id === "1950s") {
    const g = group(mesh("cyl8", mat("#8a6a4a"), { pos: [0, h / 2, 0], scale: [0.09, h, 0.09], rot: [0, 0, 0.08] }));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(mesh("box", mat("#3f7d3a"), { pos: [Math.cos(a) * 0.5 + 0.1, h - 0.05, Math.sin(a) * 0.5], scale: [1.0, 0.04, 0.22], rot: [0, -a, -0.35] }));
    }
    return g;
  }
  const leaf = era.id === "2065" ? "#7cc46a" : "#5f9a4c";
  return group(
    mesh("cyl8", mat("#7a5a3a"), { pos: [0, h * 0.35, 0], scale: [0.14, h * 0.7, 0.14] }),
    mesh("sphere", mat(leaf), { pos: [0, h * 0.8, 0], scale: [1.3, 0.55, 1.1] }),
    mesh("sphere", mat("#4a8a3a"), { pos: [0.5, h * 0.85, 0.2], scale: [0.7, 0.4, 0.7] }),
  );
}

// The menu board that hangs over the stall: dish names and prices in the era's money.
export function menuBoard(level, era, lines, no = null) {
  const tex = menuTexture(level.name, no ?? level.place.replace("Stall ", ""), lines, era.id === "1950s" ? { bg: "#3a2a1e", accent: "#e8c46a" } : era.id === "2065" ? { bg: "#16303a", accent: "#7cf0e6" } : {});
  const board = new Mesh(geo.plane, mat("#ffffff", { map: tex, outline: false }));
  const w = 3;
  board.scale.set(w, w / tex.userData.aspect, 1);
  const g = new Group();
  g.add(board);
  for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) g.add(mesh("cyl8", steelDark, { pos: [x, w / tex.userData.aspect / 2 + 0.25, -0.02], scale: [0.012, 0.5, 0.012], shadow: false }));
  return g;
}
