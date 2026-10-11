// Food and tableware closer to the real thing, for every look: bowls, plates, cups and glasses turned on a
// lathe with a proper rim and foot, rice that shows its grains, noodles as strands, sliced chicken with its
// skin, glossy soup with oil on top, fried eggs, leafy greens, prawns in segments, cutlery, and a little
// steam. Shapes are made once and shared; colours and finishes come from mat(), so Cartoon, Soft and Real
// all work (realism.js gives soup, sauce, rice and the rest their own shine).

import {
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  RepeatWrapping,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mat } from "./models.js";

const cache = new Map();
const once = (key, make) => {
  if (!cache.has(key)) {
    const v = make();
    if (v?.isBufferGeometry) v.userData.shared = true;
    cache.set(key, v);
  }
  return cache.get(key);
};

function rng(seed) {
  let s = seed % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function place(geo, material, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], shadow = true } = {}) {
  const m = new Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...(typeof scale === "number" ? [scale, scale, scale] : scale));
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

const group = (...kids) => {
  const g = new Group();
  g.add(...kids.filter(Boolean));
  return g;
};

const lathe = (pts, seg = 28) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg);

// ---------- Finishes ----------

export const food = (colour, finish = "food", opts = {}) => mat(colour, { surface: finish, ...opts });
const CHINA = "#fffdf7";

// ---------- Tableware ----------

// A hawker bowl: a foot ring, walls that flare, a rolled rim. Unit size: rim radius 1, height 1.
const bowlGeo = () => once("bowl", () => lathe([[0, 0.01], [0.48, 0.01], [0.5, 0], [0.55, 0.02], [0.53, 0.08], [0.66, 0.12], [0.86, 0.32], [0.97, 0.66], [1.0, 0.97], [1.02, 1.0], [0.99, 1.03], [0.95, 0.99], [0.92, 0.67], [0.8, 0.35], [0.58, 0.18], [0, 0.15]]));
const plateGeo = () => once("plate", () => lathe([[0, 0], [0.6, 0], [0.64, 0.02], [0.69, 0.03], [0.93, 0.1], [1.0, 0.13], [0.98, 0.15], [0.92, 0.125], [0.68, 0.055], [0, 0.05]], 32));
const cupGeo = () => once("cup", () => lathe([[0, 0], [0.5, 0], [0.56, 0.05], [0.72, 0.3], [0.93, 0.82], [1.0, 1.0], [0.95, 1.01], [0.89, 0.84], [0.68, 0.33], [0, 0.1]]));
const glassGeo = () => once("glass", () => lathe([[0, 0], [0.82, 0], [0.86, 0.04], [1.0, 1.0], [0.95, 1.0], [0.82, 0.07], [0, 0.07]]));
const discGeo = () => once("disc", () => new CircleGeometry(1, 28).rotateX(-Math.PI / 2));

// rim: an optional band of colour under the lip, like the blue line on melamine bowls.
export function bowl(r = 0.2, h = 0.13, { colour = CHINA, rim = "#2d4f9c" } = {}) {
  return group(
    place(bowlGeo(), food(colour, "ceramic"), { scale: [r, h, r] }),
    rim ? place(once("rimband", () => new TorusGeometry(1, 0.012, 6, 40).rotateX(Math.PI / 2)), food(rim, "ceramic"), { pos: [0, h * 0.9, 0], scale: [r * 0.985, r, r * 0.985], shadow: false }) : null,
  );
}

export function plateWare(r = 0.25, { colour = CHINA, rim = null } = {}) {
  return group(
    place(plateGeo(), food(colour, "ceramic"), { scale: [r, r * 0.9, r] }),
    rim ? place(once("platerim", () => new TorusGeometry(1, 0.01, 6, 48).rotateX(Math.PI / 2)), food(rim, "ceramic"), { pos: [0, r * 0.1, 0], scale: [r * 0.94, r, r * 0.94], shadow: false }) : null,
  );
}

// A liquid surface: soup, sauce, coffee. Glossy in the Soft and Real looks.
export function surface(colour, r, y, { finish = "soup", opacity = null } = {}) {
  return place(discGeo(), food(colour, finish, opacity ? { transparent: true, opacity } : {}), { pos: [0, y, 0], scale: [r, 1, r], shadow: false });
}

// Drops of oil or chilli on a soup.
export function oil(colour, r, y, n = 7, seed = 3) {
  const rand = rng(seed);
  return group(
    ...Array.from({ length: n }, () => {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * r * 0.8;
      const s = r * (0.06 + rand() * 0.1);
      return place(discGeo(), food(colour, "glossy"), { pos: [Math.cos(a) * d, y + 0.001, Math.sin(a) * d], scale: [s, 1, s * (0.7 + rand() * 0.6)], shadow: false });
    }),
  );
}

export function cup(liquid, { r = 0.075, h = 0.12 } = {}) {
  return group(
    plateWare(0.135, { rim: "#2f6b4f" }),
    place(cupGeo(), food(CHINA, "ceramic"), { pos: [0, 0.02, 0], scale: [r, h, r] }),
    place(once("handle", () => new TorusGeometry(1, 0.22, 8, 16, Math.PI * 1.25).rotateZ(-Math.PI * 0.62)), food(CHINA, "ceramic"), { pos: [r * 1.05, 0.02 + h * 0.55, 0], scale: [0.032, 0.032, 0.032], rot: [Math.PI / 2, 0, 0] }),
    surface(liquid, r * 0.9, 0.02 + h * 0.86, { finish: "glossy" }),
  );
}

export function glass(liquid, { r = 0.075, h = 0.24, ice = 3 } = {}) {
  const rand = rng(7);
  return group(
    place(glassGeo(), food("#e6f4f8", "glass", { transparent: true, opacity: 0.38, outline: false }), { scale: [r, h, r], shadow: false }),
    place(once("glassfill", () => new CylinderGeometry(0.93, 0.8, 1, 20).translate(0, 0.5, 0)), food(liquid, "glossy"), { pos: [0, h * 0.06, 0], scale: [r, h * 0.78, r] }),
    ...Array.from({ length: ice }, (_, i) => place(once("ice", () => new BoxGeometry(1, 1, 1)), food("#f4fbff", "glass", { transparent: true, opacity: 0.7, outline: false }), { pos: [(rand() - 0.5) * r * 0.9, h * 0.8, (rand() - 0.5) * r * 0.9], rot: [rand() * 3, rand() * 3, 0], scale: r * 0.42, shadow: false })),
  );
}

// ---------- Food ----------

// Rice: a mound with a slightly lumpy surface and its grains painted on.
let riceTexture = null;
function riceTex() {
  if (riceTexture || typeof document === "undefined") return riceTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#f4f1e8";
  g.fillRect(0, 0, 128, 128);
  const rand = rng(11);
  for (let i = 0; i < 520; i++) {
    const x = rand() * 128;
    const y = rand() * 128;
    g.save();
    g.translate(x, y);
    g.rotate(rand() * Math.PI);
    g.fillStyle = rand() < 0.5 ? "#ffffff" : "#e6e1d4";
    g.beginPath();
    g.ellipse(0, 0, 3.6, 1.4, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  riceTexture = new CanvasTexture(c);
  riceTexture.colorSpace = SRGBColorSpace;
  riceTexture.wrapS = riceTexture.wrapT = RepeatWrapping;
  riceTexture.repeat.set(3, 2);
  return riceTexture;
}
const riceGeo = () =>
  once("rice", () => {
    const geo = new SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = geo.attributes.position;
    const rand = rng(5);
    const bump = Array.from({ length: 64 }, () => rand());
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const k = 1 + (bump[(Math.floor((Math.atan2(z, x) + Math.PI) * 5) + Math.floor(y * 7) * 11) % 64] - 0.5) * 0.08 * Math.min(1, y * 3);
      p.setXYZ(i, x * k, y * k, z * k);
    }
    geo.computeVertexNormals();
    return geo;
  });

export function rice(x = -0.07, z = 0, { r = 0.12, h = 0.075, colour = "#fbf8f0" } = {}) {
  return place(riceGeo(), food(colour, "rice", { map: riceTex() }), { pos: [x, 0.03, z], scale: [r, h, r * 0.92] });
}

// Noodles: strands looping round a nest. thick: flat rice noodles and mee are thicker than bee hoon.
function nestGeo(thick = 0.008, flat = false, seed = 1) {
  return once(`nest${thick}${flat}${seed}`, () => {
    const rand = rng(seed * 97);
    const tubes = [];
    for (let k = 0; k < 16; k++) {
      const pts = [];
      const turns = 1.2 + rand() * 0.8;
      const a0 = rand() * Math.PI * 2;
      const rr = 0.35 + rand() * 0.6;
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const a = a0 + t * turns * Math.PI * 2;
        const r = rr * (0.75 + 0.25 * Math.sin(t * 9 + k));
        pts.push(new Vector3(Math.cos(a) * r, 0.25 + 0.55 * Math.sin(t * Math.PI) * (1 - r * 0.5) + rand() * 0.12, Math.sin(a) * r));
      }
      const tube = new TubeGeometry(new CatmullRomCurve3(pts), 40, thick * (flat ? 1.6 : 1) * 8, flat ? 3 : 5, false);
      if (flat) tube.scale(1, 0.55, 1);
      tubes.push(tube);
    }
    return mergeGeometries(tubes);
  });
}

// A nest of noodles of radius r and height h, with its top at about y.
export function nest(colour, r = 0.13, h = 0.07, { y = 0.02, thick = 0.008, flat = false, seed = 1, finish = "glossy" } = {}) {
  return place(nestGeo(thick, flat, seed), food(colour, finish), { pos: [0, y, 0], scale: [r, h, r] });
}

// Slices of meat in a fan, each with its skin or char on top.
const sliceGeo = () =>
  once("slice", () => {
    const s = new Shape();
    const w = 0.5;
    const l = 1;
    const c = 0.18;
    s.moveTo(-l / 2 + c, -w / 2);
    s.lineTo(l / 2 - c, -w / 2);
    s.quadraticCurveTo(l / 2, -w / 2, l / 2, -w / 2 + c);
    s.lineTo(l / 2, w / 2 - c);
    s.quadraticCurveTo(l / 2, w / 2, l / 2 - c, w / 2);
    s.lineTo(-l / 2 + c, w / 2);
    s.quadraticCurveTo(-l / 2, w / 2, -l / 2, w / 2 - c);
    s.lineTo(-l / 2, -w / 2 + c);
    s.quadraticCurveTo(-l / 2, -w / 2, -l / 2 + c, -w / 2);
    return new ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2 }).rotateX(-Math.PI / 2);
  });

export function slices(meat, skin, x = 0.07, z = 0, n = 5, { len = 0.14 } = {}) {
  const g = new Group();
  const rand = rng(n * 13 + Math.round(x * 100));
  for (let i = 0; i < n; i++) {
    // Each slice a little out of line with the last, the way a hawker lays them on the rice.
    const zz = z - ((n - 1) / 2) * 0.03 + i * 0.03;
    const xx = x + (rand() - 0.5) * 0.012 + i * 0.004;
    const y = 0.034 + i * 0.005;
    const turn = 0.32 + (rand() - 0.5) * 0.12;
    g.add(place(sliceGeo(), food(meat, "food"), { pos: [xx, y, zz], rot: [0, turn, 0.08], scale: [len, 0.07, len * 0.36] }));
    g.add(place(sliceGeo(), food(skin, "glossy"), { pos: [xx + 0.003, y + 0.019, zz - 0.004], rot: [0, turn, 0.08], scale: [len * 0.97, 0.022, len * 0.3], shadow: false }));
  }
  return g;
}

// A fried egg: a ragged white and a glossy yolk.
const eggWhiteGeo = () =>
  once("eggwhite", () => {
    const s = new Shape();
    const rand = rng(3);
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = 0.85 + rand() * 0.3;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.08, bevelSegments: 2 }).rotateX(-Math.PI / 2);
  });

export function friedEgg(x, z, s = 0.055) {
  return group(
    place(eggWhiteGeo(), food("#fbf7ee", "food"), { pos: [x, 0.03, z], scale: [s, s, s] }),
    place(once("yolk", () => new SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), food("#f2a81e", "glossy"), { pos: [x + s * 0.1, 0.03 + s * 0.15, z], scale: [s * 0.4, s * 0.28, s * 0.4], shadow: false }),
  );
}

// A halved boiled egg (mee rebus, lor mee).
export function halfEgg(x, z, y = 0.13) {
  return group(
    place(once("halfegg", () => new SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)), food("#fbf7ee", "food"), { pos: [x, y, z], scale: [0.03, 0.022, 0.04], shadow: false }),
    place(discGeo(), food("#f2b632", "food"), { pos: [x, y + 0.0005, z], scale: [0.017, 1, 0.022], shadow: false }),
  );
}

// Greens: a few leaves with pale stems, like kai lan or chye sim.
const leafGeo = () =>
  once("leaf", () => {
    const s = new Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.35, 0.15, 0.4, 0.8, 0, 1);
    s.bezierCurveTo(-0.4, 0.8, -0.35, 0.15, 0, 0);
    return new ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false }).rotateX(-Math.PI / 2);
  });

export function greens(x, z, n = 3, y = 0.04) {
  const g = new Group();
  for (let i = 0; i < n; i++) {
    const a = -0.6 + i * 0.6;
    g.add(place(leafGeo(), food(i % 2 ? "#3f7d3a" : "#4f8f3a", "leaf"), { pos: [x, y + i * 0.004, z], rot: [-0.12, a, 0], scale: [0.045, 1, 0.065], shadow: false }));
    g.add(place(once("stem", () => new CylinderGeometry(1, 1, 1, 6).rotateX(Math.PI / 2).translate(0, 0, -0.5)), food("#c8e2a8", "leaf"), { pos: [x, y + 0.004, z], rot: [0, a, 0], scale: [0.008, 0.008, 0.06], shadow: false }));
  }
  return g;
}

// Cucumber slices: dark skin round a pale middle.
export function cucumbers(x, z, n = 3) {
  const g = new Group();
  for (let i = 0; i < n; i++) {
    const p = [x + i * 0.042, 0.035 + (i % 2) * 0.004, z + (i % 2) * 0.018];
    g.add(place(once("cuke", () => new CylinderGeometry(1, 1, 1, 16)), food("#3f7d3a", "food"), { pos: p, rot: [0.25, 0, 0], scale: [0.034, 0.012, 0.034] }));
    g.add(place(discGeo(), food("#d8ecb8", "food"), { pos: [p[0], p[1] + 0.0065, p[2] + 0.0016], rot: [0.25, 0, 0], scale: [0.029, 1, 0.029], shadow: false }));
  }
  return g;
}

// A prawn: shell segments along a curl, and its tail.
export function prawn(x, z, s = 0.055, y = 0.1) {
  const g = new Group();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 0.15 + i * 0.22;
    const r = (0.42 - i * 0.04) * s;
    g.add(place(once("seg", () => new SphereGeometry(1, 10, 8)), food(i % 2 ? "#f07d52" : "#f48a5c", "glossy"), { pos: [Math.cos(a) * s * 0.8, 0, Math.sin(a) * s * 0.8], scale: [r, r * 0.85, r * 1.2], shadow: false }));
  }
  g.add(place(once("tail", () => new ConeGeometry(1, 1, 6)), food("#e8603a", "glossy"), { pos: [Math.cos(Math.PI * 1.55) * s * 0.75, 0, Math.sin(Math.PI * 1.55) * s * 0.75], rot: [0, 0, Math.PI / 2], scale: [s * 0.25, s * 0.35, s * 0.12], shadow: false }));
  g.position.set(x, y, z);
  g.rotation.y = x * 9;
  return g;
}

// Satay: chunks threaded on a stick, charred at the edges.
export function satayStick(meat, x, z, a) {
  const g = new Group();
  g.add(place(once("stick", () => new CylinderGeometry(0.5, 0.5, 1, 6)), food("#d9b98a", "wood"), { pos: [0, 0, 0], rot: [0, 0, Math.PI / 2], scale: [0.012, 0.36, 0.012], shadow: false }));
  for (const d of [-0.085, -0.03, 0.025, 0.08]) g.add(place(once("chunk", () => new SphereGeometry(1, 10, 8)), food(meat, "glossy"), { pos: [d, 0.004, 0], rot: [d * 20, 0, 0], scale: [0.03, 0.022, 0.024] }));
  g.position.set(x, 0.05, z);
  g.rotation.y = a;
  return g;
}

// ---------- Cutlery and steam ----------

export function spoonAndFork(x = 0.24, z = 0.02) {
  const steel = food("#c9ced2", "steel");
  return group(
    place(once("spoonbowl", () => new SphereGeometry(1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), steel, { pos: [x, 0.012, z - 0.07], scale: [0.026, 0.008, 0.036], shadow: false }),
    place(once("handlebar", () => new BoxGeometry(1, 1, 1)), steel, { pos: [x, 0.012, z + 0.04], scale: [0.012, 0.004, 0.15], shadow: false }),
    place(once("handlebar", () => new BoxGeometry(1, 1, 1)), steel, { pos: [x + 0.05, 0.012, z + 0.02], scale: [0.012, 0.004, 0.17], shadow: false }),
    ...[-1, 0, 1].map((k) => place(once("handlebar", () => new BoxGeometry(1, 1, 1)), steel, { pos: [x + 0.05 + k * 0.007, 0.012, z - 0.085], scale: [0.003, 0.004, 0.045], shadow: false })),
  );
}

export function chopsticks(x = 0.24, z = 0, colour = "#c9a46a") {
  return group(
    ...[0, 1].map((k) => place(once("chop", () => new CylinderGeometry(0.0028, 0.0048, 0.24, 6).rotateX(Math.PI / 2)), food(colour, "wood"), { pos: [x + k * 0.016, 0.012, z], rot: [0, 0.04 * (k ? 1 : -1), 0], shadow: false })),
    // A porcelain soup spoon beside them.
    place(once("porcelain", () => new SphereGeometry(1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), food(CHINA, "ceramic"), { pos: [x + 0.06, 0.016, z - 0.05], scale: [0.03, 0.014, 0.045], shadow: false }),
    place(once("handlebar", () => new BoxGeometry(1, 1, 1)), food(CHINA, "ceramic"), { pos: [x + 0.06, 0.03, z + 0.03], rot: [0.4, 0, 0], scale: [0.014, 0.008, 0.08], shadow: false }),
  );
}

// Wisps of steam over something hot. Faint, and never in the way.
export function steam(y = 0.2, r = 0.08) {
  const m = food("#ffffff", "glass", { transparent: true, opacity: 0.16, outline: false });
  const g = group(...[0, 1, 2].map((i) => place(once("wisp", () => new SphereGeometry(1, 8, 6)), m, { pos: [(i - 1) * r * 0.5, y + i * 0.04, (i % 2) * r * 0.3], scale: [r * 0.35, r * 1.6, r * 0.35], shadow: false })));
  for (const c of g.children) c.material.depthWrite = false;
  return g;
}
