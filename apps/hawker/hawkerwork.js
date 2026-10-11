// What each hawker is doing, for the customer mode: the dish they are making decides the work (tossing a
// wok, chopping chicken, blanching noodles, pulling kopi, flipping prata, fanning satay, shaving ice,
// scooping rice), where in the stall they stand for it, which way they face, and what is in their hands.
// Between orders they wipe the counter; when a dish is ready they turn and hand it over.
//
// The people themselves are drawn by the crowd (humans.js); this file moves them about their stall and
// draws their tools, the flames under the wok, the steam off the pots, and the tea in mid-air.

import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mat } from "./models.js";

// Dish -> the work it takes. Anything not listed is scooped and plated.
export const ACTION_OF = {
  ckt: "wok", carrotcake: "wok", hokkienmee: "wok", orhluak: "wok", meegoreng: "wok", chillicrab: "wok", peppercrab: "wok", oystercake: "wok",
  wantonmee: "blanch", prawnnoodles: "blanch", lormee: "blanch", bakchormee: "blanch", banmian: "blanch", yongtaufoo: "blanch", fishsoup: "blanch", kwaychap: "blanch", meerebus: "blanch", laksa: "blanch",
  chickenrice: "chop", duckrice: "chop", roastmeat: "chop",
  drink: "pull",
  prata: "prata", murtabak: "prata", thosai: "prata", kayatoast: "prata",
  satay: "fan", wings: "fan", claypot: "fan", sambalstingray: "fan",
  icekachang: "shave", sugarcane: "shave",
  rojak: "toss", popiah: "toss",
};

// Where to stand for each kind of work, in the stall's own frame (x across, z towards the customers;
// the back bench is at z about -1.05 and the front counter at about 1.15), and which way to face.
const STATION = {
  wok: [0.4, -0.42, "back"],
  blanch: [-0.7, -0.42, "back"],
  chop: [0.25, 0.45, "front"],
  pull: [-0.35, 0.45, "front"],
  scoop: [0.05, 0.45, "front"],
  prata: [0.15, 0.45, "front"],
  fan: [0.55, 0.45, "front"],
  shave: [0.45, 0.45, "front"],
  toss: [0, 0.45, "front"],
  wipe: [-0.62, -0.1, "front"],
  serve: [0, 0.52, "front"],
  take: [0, 0.52, "front"],
};

// Tools in the right and left hands. "aligned" tools follow the hand; "upright" ones only its position.
const TOOLS = {
  chop: ["cleaver", null],
  wok: ["ladle", null],
  blanch: ["strainer", null],
  pull: ["pot", "cup"],
  scoop: ["ladle", "plate"],
  fan: ["fan", null],
  shave: [null, "bowl"],
  toss: ["spoon", "bowl"],
  wipe: ["cloth", null],
  serve: ["plate", null],
};
const UPRIGHT = new Set(["pot", "cup", "plate", "bowl", "cloth"]);

// The stall equipment each menu has on its counters, by the work its dishes need.
export function equipmentFor(dishes) {
  const acts = new Set(dishes.map((d) => ACTION_OF[d] ?? "scoop"));
  return { board: acts.has("chop"), griddle: acts.has("prata"), grill: acts.has("fan"), shaver: acts.has("shave"), wok: acts.has("wok"), pot: acts.has("blanch"), trays: acts.has("scoop") };
}

const geo = {
  cleaver: () => mergeGeometries([new BoxGeometry(0.025, 0.11, 0.025).translate(0, -0.06, 0), new BoxGeometry(0.008, 0.09, 0.17).translate(0, -0.12, 0.06)]),
  ladle: () => mergeGeometries([new CylinderGeometry(0.008, 0.008, 0.42, 6).translate(0, -0.2, 0), new SphereGeometry(0.05, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, -0.42, 0)]),
  spoon: () => mergeGeometries([new CylinderGeometry(0.007, 0.007, 0.26, 6).translate(0, -0.13, 0), new SphereGeometry(0.035, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, -0.27, 0)]),
  strainer: () => mergeGeometries([new CylinderGeometry(0.009, 0.009, 0.45, 6).translate(0, -0.22, 0), new ConeGeometry(0.075, 0.12, 12, 1, true).rotateX(Math.PI).translate(0, -0.48, 0)]),
  pot: () => mergeGeometries([new CylinderGeometry(0.065, 0.075, 0.2, 14).translate(0, -0.13, 0), new CylinderGeometry(0.008, 0.016, 0.11, 6).rotateZ(-0.9).translate(0.09, -0.08, 0), new BoxGeometry(0.02, 0.07, 0.02).translate(-0.075, -0.1, 0)]),
  cup: () => new CylinderGeometry(0.045, 0.035, 0.09, 12).translate(0, -0.03, 0),
  plate: () => new CylinderGeometry(0.13, 0.1, 0.02, 18).translate(0, -0.02, 0.06),
  bowl: () => new CylinderGeometry(0.09, 0.06, 0.07, 14).translate(0, -0.03, 0.03),
  fan: () => mergeGeometries([new CylinderGeometry(0.006, 0.006, 0.1, 6).translate(0, -0.05, 0), new CylinderGeometry(0.11, 0.11, 0.006, 16).rotateZ(Math.PI / 2).translate(0, -0.18, 0)]),
  cloth: () => new BoxGeometry(0.14, 0.02, 0.1).translate(0, -0.04, 0.02),
};
const COLOUR = { cleaver: "#b9c0c4", ladle: "#b9c0c4", spoon: "#b9c0c4", strainer: "#c9b07a", pot: "#d9dde0", cup: "#fffdf7", plate: "#fffdf7", bowl: "#fffdf7", fan: "#c9a46a", cloth: "#e8eef2" };
const SURFACE = { cleaver: "steel", ladle: "steel", spoon: "steel", strainer: "wood", pot: "steel", cup: "ceramic", plate: "ceramic", bowl: "ceramic", fan: "wood", cloth: "cloth" };

export class StallWork {
  constructor(scene, plan, max) {
    this.plan = plan;
    this.group = new Group();
    scene.add(this.group);
    this.tools = {};
    for (const [name, make] of Object.entries(geo)) {
      const m = new InstancedMesh(make(), mat(COLOUR[name], { surface: SURFACE[name], outline: false }), max);
      m.count = 0;
      m.frustumCulled = false;
      m.castShadow = false;
      this.tools[name] = m;
      this.group.add(m);
    }
    // The tea mid-pour, flames round a busy wok, and steam off the pots.
    this.stream = new InstancedMesh(new CylinderGeometry(0.008, 0.012, 1, 6).translate(0, 0.5, 0), new MeshBasicMaterial({ color: "#b07a45", transparent: true, opacity: 0.85 }), max);
    this.flame = new InstancedMesh(new ConeGeometry(0.16, 0.34, 8).translate(0, 0.17, 0), mat("#ff8a2a", { emissive: "#ff6a10", glow: 2.6, outline: false, transparent: true, opacity: 0.85 }), max * 3);
    this.steam = new InstancedMesh(new SphereGeometry(1, 8, 6), new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.12, depthWrite: false }), max * 3);
    for (const m of [this.stream, this.flame, this.steam]) {
      m.count = 0;
      m.frustumCulled = false;
      this.group.add(m);
    }
    this.M = new Matrix4();
    this.R = new Matrix4();
    this.q = new Quaternion();
    this.v = new Vector3();
    this.v2 = new Vector3();
    this.s = new Vector3(1, 1, 1);
    this.up = new Vector3(0, 1, 0);
  }

  // The work for a stall this moment: { act, dish } from its cooking state.
  static actFor(w, k) {
    const st = w.stalls[k];
    if (st.serveT > 0) return "serve";
    if (st.cook) {
      let dish = st.cook.dish;
      if (st.cook.me && st.cook.items?.length) {
        const n = st.cook.items.length;
        dish = st.cook.items[Math.min(n - 1, Math.floor((st.cook.t / Math.max(0.1, st.cook.dur)) * n))].dish;
        // The last moment of your order: turning round with it.
        if (st.cook.t > st.cook.dur - 0.7) return "serve";
      }
      return ACTION_OF[dish] ?? "scoop";
    }
    if (w.ordering === k) return "take";
    return "wipe";
  }

  // Moves a hawker towards where their work is and sets their pose. hp: the crowd entry for this hawker.
  pose(hp, s, act, dt, time) {
    const [lx, lz, way] = s.cart ? [0, -0.7, "front"] : STATION[act] ?? STATION.wipe;
    hp.lx ??= STATION.wipe[0];
    hp.lz ??= STATION.wipe[1];
    const dx = lx - hp.lx;
    const dz = lz - hp.lz;
    const d = Math.hypot(dx, dz);
    const step = Math.min(d, dt * 1.8);
    if (d > 1e-3) {
      hp.lx += (dx / d) * step;
      hp.lz += (dz / d) * step;
    }
    const moving = d > 0.06;
    const [fx, fz] = s.face;
    hp.x = s.x + hp.lx * fz + hp.lz * fx;
    hp.z = s.z - hp.lx * fx + hp.lz * fz;
    // Face the work (or the way you are walking), turning over a moment.
    const front = Math.atan2(fx, fz);
    const want = moving ? Math.atan2(dx * fz + dz * fx, -dx * fx + dz * fz) : way === "back" ? front + Math.PI : front;
    hp.yaw ??= front;
    const turn = Math.atan2(Math.sin(want - hp.yaw), Math.cos(want - hp.yaw));
    hp.yaw += turn * Math.min(1, dt * 8);
    hp.pose.act = moving ? null : act === "take" ? null : act;
    hp.pose.walk = moving ? 0.7 : 0;
    hp.act = act;
    hp.tools = moving ? null : TOOLS[act] ?? null;
  }

  // Tools in hands, after the crowd has worked out where the hands are this frame.
  draw(hawkers, plan, time) {
    const counts = {};
    for (const name of Object.keys(this.tools)) counts[name] = 0;
    let streams = 0;
    let flames = 0;
    let steams = 0;
    const put = (name, hand, upright) => {
      const m = this.tools[name];
      if (upright) {
        this.v.setFromMatrixPosition(hand);
        this.M.makeTranslation(this.v.x, this.v.y, this.v.z);
        m.setMatrixAt(counts[name]++, this.M);
      } else m.setMatrixAt(counts[name]++, hand);
    };
    for (const hp of hawkers) {
      // Flames and steam belong to the stall, so they show even when the hawker is out of view.
      const s = plan.stalls[hp.stall];
      const [fx, fz] = s.face;
      const at = (lx, y, lz, out) => out.set(s.x + lx * fz + lz * fx, y, s.z - lx * fx + lz * fz);
      if (hp.act === "wok" && hp.pose.act === "wok") {
        for (let i = 0; i < 3; i++) {
          at(0.4 + (i - 1) * 0.12, 0.95, -1.05, this.v);
          const k = 0.6 + Math.abs(Math.sin(time * (13 + i * 3) + hp.stall)) * 0.9;
          this.M.compose(this.v, this.q.identity(), this.s.set(0.7, k, 0.7));
          this.flame.setMatrixAt(flames++, this.M);
        }
      }
      if (hp.pot) {
        for (let i = 0; i < 2; i++) {
          const t = (time * 0.5 + i * 0.5 + hp.stall * 0.37) % 1;
          at(-0.7 + Math.sin(time + i) * 0.04, 1.25 + t * 0.7, -1.05, this.v);
          this.M.compose(this.v, this.q.identity(), this.s.set(0.08 + t * 0.1, 0.12 + t * 0.15, 0.08 + t * 0.1));
          this.steam.setMatrixAt(steams++, this.M);
        }
      }
      if (!hp.tools || hp.handsAt !== hp.frame) continue;
      const [r, l] = hp.tools;
      if (r) put(r, hp.hands[1], UPRIGHT.has(r));
      if (l) put(l, hp.hands[0], UPRIGHT.has(l));
      // Pulling: the stream from the pot's spout down into the cup.
      if (hp.pose.act === "pull") {
        this.v.setFromMatrixPosition(hp.hands[1]);
        this.v.y -= 0.12;
        this.v2.setFromMatrixPosition(hp.hands[0]);
        this.v2.y += 0.02;
        const len = this.v.distanceTo(this.v2);
        this.q.setFromUnitVectors(this.up, this.v.clone().sub(this.v2).normalize());
        this.M.compose(this.v2, this.q, this.s.set(1, len, 1));
        this.stream.setMatrixAt(streams++, this.M);
      }
    }
    for (const [name, m] of Object.entries(this.tools)) {
      m.count = counts[name];
      m.instanceMatrix.needsUpdate = true;
    }
    this.stream.count = streams;
    this.flame.count = flames;
    this.steam.count = steams;
    for (const m of [this.stream, this.flame, this.steam]) m.instanceMatrix.needsUpdate = true;
  }
}
