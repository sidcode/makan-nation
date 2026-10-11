// Draws the customer mode: the whole hawker centre around you, its neighbours, the crowd, and whatever you
// are carrying. Shares the kitchen's WebGL renderer and its quality tiers. Three cameras: from above, over
// your shoulder, and through your own eyes. Built for many stalls and people: stalls are merged into a few
// meshes, their signs and menu boards share a texture per menu, tables and people are instanced.

import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Fog,
  Frustum,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  Scene,
  Shape,
  Sphere,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { timeLook } from "./centrekit.js";
import { lookOf, regularsFor } from "./chefs.js";
import { REGULAR_PERSONA } from "./phrases.js";
import { DISHES } from "./dishes.js";
import { dishModel } from "./dishes3d.js";
import { money } from "./eras.js";
import { dishPhoto } from "./media.js";
import { ceilingFan, kerosene, makeDrink, mat, mesh, planter, shophouses, tree } from "./models.js";
import { BUILDS, buildHuman, coloursFor, HumanCrowd, peopleBuild, poseHuman, styleOf } from "./humans.js";
import { makePerson } from "./people.js";
import { equipmentFor, StallWork } from "./hawkerwork.js";
import { centroid, endWalls, pillarSpots, slabOver } from "./hdb.js";
import { isToon, realise, realism, realiseObject, skyFor } from "./realism.js";
import { packDrink } from "./sim.js";
import { label, terrazzo } from "./textures.js";
import { menuById, STALL, STALL_D, STALL_W, WALL } from "./floorplan.js";
import { stallMenu } from "./walk.js";

const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
// How big each build is drawn: lifelike people a touch under the 1.66 m they are built at, classic ones
// grown from their 1.2 m to stand next to real counters.
const SIZE = { lifelike: 0.986, classic: 1.3 };
const PERSON = 1.45; // the kitchen's own people, for you in the classic build
// Who runs each kind of stall (regular types in chefs.js).
const HAWKER_TYPES = { malay: ["makcik", "pakcik"], padang: ["makcik", "pakcik"], prata: ["appa", "amma"], mamak: ["appa", "amma"], biryani: ["appa", "amma"], default: ["uncle", "auntie"] };
const EYE = 1.58; // standing eye height, metres
const EYE_SEATED = 1.16;

export const CAMS = [
  { id: "above", name: "Above" },
  { id: "behind", name: "Behind" },
  { id: "eyes", name: "Eyes" },
];

// Sign colours per menu, for today's lightboxes.
const SIGN_BG = {
  chickenrice: "#d6402e",
  friednoodles: "#1f3b2c",
  noodlesoup: "#b8402e",
  malay: "#2f6b4f",
  prata: "#e8892e",
  dessert: "#2a8f8a",
  riceplates: "#7a2a2a",
  soups: "#5b6b78",
  mamak: "#d9662e",
  padang: "#3f7d3a",
  seafood: "#c0583a",
  noodlesoups: "#8a5a3a",
  biryani: "#c98a1a",
  snacks: "#7a5c99",
  drinks: "#2d4f9c",
};
// Chinese names many stalls put under the English one.
const SIGN_CN = { chickenrice: "海南鸡饭", friednoodles: "炒粿条", noodlesoup: "云吞面", dessert: "甜品", riceplates: "烧腊", soups: "肉骨茶", seafood: "烧烤海鲜", noodlesoups: "卤面", snacks: "罗惹 薄饼", drinks: "饮料" };

// What each era's stalls and tables look like.
const ERA_STYLE = {
  "1950s": { wall: ["#a8784a"], counter: "#8a5a30", top: "#d9c3a0", roof: "#8a5a30", sign: (bg) => ({ bg: "#f4ead6", fg: bg }), table: "#a8784a", stool: "#7a5230", low: true },
  "1980s": { wall: ["#bfe3d0", "#f4ead6", "#9fd0c0"], counter: "#5f9a7a", top: "#e8ece8", roof: "#2f6b4f", sign: (bg) => ({ bg: "#f8f1df", fg: bg }), table: "#eeeae2", stool: "#e8892e" },
  today: { wall: ["#f4f1ea", "#eef2f2", "#f4ead6"], counter: "#c9ced2", top: "#e4e8ea", roof: "#9aa0a6", sign: (bg) => ({ bg, fg: "#fffaf0" }), table: "#f4f1ea", stool: "#d6402e" },
  2065: { wall: ["#e8f1ee", "#d7eef0"], counter: "#cfe3e6", top: "#f4fbff", roof: "#7cc4c0", sign: (bg) => ({ bg: "#13202a", fg: "#7cf0e0" }), table: "#d9c3a0", stool: "#7cc4e6" },
};

const box = (w, h, d, x, y, z) => new BoxGeometry(w, h, d).translate(x, y, z);
const FONT = "'Bricolage Grotesque Variable', system-ui, sans-serif";

// What a choped table has on it.
const CHOPE_LOOK = {
  tissue: { colour: "#ffffff", scale: [1, 1, 1], lift: 0 },
  umbrella: { colour: "#2d4f9c", scale: [4.6, 0.9, 0.7], lift: 0.01 },
  "name card": { colour: "#c8553d", scale: [0.55, 0.3, 0.9], lift: -0.01 },
  "plastic bag": { colour: "#f4ead6", scale: [1.6, 2.4, 1.5], lift: 0.04 },
};

function canvasTex(c) {
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---------- Signs: one lightbox per menu, and a number plate per stall ----------

function drawSign(menuId, eraId, { famous = false, title = null } = {}) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d");
  const style = ERA_STYLE[eraId] ?? ERA_STYLE.today;
  const { bg, fg } = style.sign(SIGN_BG[menuId] ?? "#2f6b4f");
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = fg;
  g.lineWidth = 5;
  g.strokeRect(6, 6, 500, 116);
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const text = title ?? menuById(menuId).sign;
  const cn = title ? null : SIGN_CN[menuId];
  let size = cn ? 50 : 62;
  g.font = `800 ${size}px ${FONT}`;
  while (g.measureText(text).width > 440 && size > 22) {
    size -= 2;
    g.font = `800 ${size}px ${FONT}`;
  }
  g.fillText(text, 256, cn ? 50 : 66);
  if (cn) {
    g.font = `700 34px 'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
    g.fillText(cn, 256, 98);
  }
  if (famous) {
    g.fillStyle = "#f2c94c";
    g.beginPath();
    g.arc(474, 30, 13, 0, Math.PI * 2);
    g.fill();
  }
  return canvasTex(c);
}

function numberAtlas(stalls) {
  const cols = 8;
  const rows = Math.max(1, Math.ceil(stalls.length / cols));
  const cw = 128;
  const ch = 40;
  const c = document.createElement("canvas");
  c.width = cols * cw;
  c.height = rows * ch;
  const g = c.getContext("2d");
  stalls.forEach((s, k) => {
    const x = (k % cols) * cw;
    const y = Math.floor(k / cols) * ch;
    g.fillStyle = "#1d2a24";
    g.fillRect(x, y, cw, ch);
    g.fillStyle = "#fffaf0";
    g.font = `700 24px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(s.no, x + cw / 2, y + ch / 2 + 1);
  });
  return { tex: canvasTex(c), cols, rows };
}

function atlasPlane(atlas, k, w, h) {
  const geo = new PlaneGeometry(w, h);
  const uv = geo.attributes.uv;
  const col = k % atlas.cols;
  const row = Math.floor(k / atlas.cols);
  const u0 = col / atlas.cols;
  const u1 = (col + 1) / atlas.cols;
  const vTop = 1 - row / atlas.rows;
  const vBot = 1 - (row + 1) / atlas.rows;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), vBot + uv.getY(i) * (vTop - vBot));
  return geo;
}

// A stall's menu board: what it sells in the era's prices, with photos of the dishes in the Real look.
function drawBoard(c, lines, eraId, photos = null) {
  const g = c.getContext("2d");
  const W = c.width;
  const H = c.height;
  const dark = eraId === "2065";
  const old = eraId === "1950s" || eraId === "1980s";
  g.fillStyle = dark ? "#13202a" : old ? "#f4ead6" : "#fffdf6";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = dark ? "#7cf0e0" : "#2b1b12";
  g.lineWidth = 6;
  g.strokeRect(3, 3, W - 6, H - 6);
  const n = Math.min(6, lines.length);
  const rowH = (H - 16) / Math.max(3, n);
  const pic = photos ? Math.min(rowH - 8, 84) : 0;
  lines.slice(0, n).forEach((l, i) => {
    const y = 8 + i * rowH;
    if (i % 2 === 1) {
      g.fillStyle = dark ? "#1b2c38" : old ? "#ece0c6" : "#f4efe2";
      g.fillRect(6, y, W - 12, rowH);
    }
    const img = photos?.get(l.dish);
    if (img) {
      g.save();
      g.beginPath();
      g.rect(14, y + (rowH - pic) / 2, pic, pic);
      g.clip();
      g.drawImage(img, 14, y + (rowH - pic) / 2, pic, pic);
      g.restore();
    }
    g.fillStyle = dark ? "#e8fffb" : "#2b1b12";
    g.textBaseline = "middle";
    g.textAlign = "left";
    let size = Math.min(40, rowH * 0.42);
    const x0 = 20 + (pic ? pic + 12 : 0);
    g.font = `700 ${size}px ${FONT}`;
    while (g.measureText(l.label).width > W - x0 - 150 && size > 16) {
      size -= 1;
      g.font = `700 ${size}px ${FONT}`;
    }
    g.fillText(l.label, x0, y + rowH / 2);
    g.textAlign = "right";
    g.font = `800 ${Math.min(40, rowH * 0.42)}px ${FONT}`;
    g.fillStyle = dark ? "#7cf0e0" : "#c8553d";
    g.fillText(l.price, W - 20, y + rowH / 2);
  });
}

// ---------- The view ----------

export class WalkView {
  // kitchen: the KitchenView, for its quality tier and frame tracking.
  constructor(renderer, kitchen = null) {
    this.renderer = renderer;
    this.kitchen = kitchen;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(42, 1, 0.3, 400);
    this.scene.add(this.camera);
    this.zoom = 1;
    this.time = 0;
    this.cam = "above";
    this.yaw = 0;
    this.pitch = -0.08;
    this.v = { a: new Vector3(), b: new Vector3(), c: new Vector3() };
    this.meAt = [0, 0];
    this.reach = 3.4;
    this.frustum = new Frustum();
    this.projView = new Matrix4();
    this.ball = new Sphere(new Vector3(), 1.3);
  }

  // plan: floorplan.planCentre; w: walk state; preset: centrelook.presetFor; era: eras entry.
  // signs: { [stallId]: title } for stalls whose real name we know.
  // hdb: { own: [HDB blocks the centre is], around: { osm id: [blk, floors, year, res, units] } } or null (hdb.js).
  load(plan, w, { era, preset, look = null, centreName = "", signs = {}, hdb = null }) {
    this.args = [plan, w, { era, preset, look, centreName, signs, hdb }];
    this.hdb = hdb;
    this.hdbShown = null;
    const scene = this.scene;
    scene.clear();
    scene.add(this.camera);
    this.fans = [];
    this.lamps = [];
    this.neighbours = [];
    this.bigSign = null;
    this.roof = null;
    this.ceiling = null;
    this.plan = plan;
    this.w = w;
    this.era = era;
    this.preset = preset;
    this.signs = signs;
    this.centreName = centreName;
    this.look = look;
    const style = ERA_STYLE[era.id] ?? ERA_STYLE.today;
    this.style = style;
    const time = timeLook(preset.time, era.look);
    const lk = time ? { ...era.look, ...time } : era.look;
    this.lk = lk;
    this.night = preset.time === "night" || preset.time === "dusk" || (era.id === "1950s" && plan.kind === "street");
    scene.background = new Color(lk.sky);
    scene.fog = new Fog(lk.sky, 45, 140);
    this.hemi = new HemisphereLight(lk.hemiSky, lk.hemiGround, lk.hemi * 1.05);
    this.hemiBase = lk.hemi * 1.05;
    scene.add(this.hemi);
    const sun = new DirectionalLight(lk.sun, lk.sunPower);
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    this.sun = sun;
    // Under a roof the hall is lit by its own tubes; after dark, they are most of the light.
    this.hallLight = new DirectionalLight(era.id === "1980s" ? "#fff4dc" : era.id === "2065" ? "#eefaff" : "#f8f8ff", this.night ? 0.9 : 0.35);
    this.hallLight.position.set(0, 30, 0);
    scene.add(this.hallLight, this.hallLight.target);

    // The ground, then the floor of the hall in the building's own shape.
    const ground = new Mesh(new PlaneGeometry(600, 600), mat(lk.ground, { outline: false, surface: plan.kind === "street" ? "asphalt" : "concrete" }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    scene.add(ground);
    if (plan.kind === "street") this.buildStreet(plan, era);
    else this.buildHall(plan, era, preset, centreName);
    this.buildTables(plan, era, preset, w);
    this.buildNeighbours(plan, era, preset);

    // People: the crowd, the hawkers at their counters, and you, all with human proportions (humans.js).
    const hawkers = plan.stalls.length;
    // Near people in full detail, far ones in the lite set.
    // Lifelike or classic people (Settings, People), on the same skeleton and poses.
    this.build = peopleBuild();
    this.dims = BUILDS[this.build];
    const CROWD = SIZE[this.build];
    this.size = CROWD;
    this.crowd = new HumanCrowd(hawkers + 900, { kind: this.build });
    this.crowdFar = new HumanCrowd(1700, { lite: true, kind: this.build });
    scene.add(this.crowd.group, this.crowdFar.group);
    this.work = new StallWork(scene, plan, hawkers);
    this.frameNo = 0;
    this.looks = regularsFor(era.id, 40, plan.stalls.length + 3);
    this.stoolTop = ERA_STYLE[era.id]?.low || plan.kind === "street" ? 0.3 : 0.46;
    this.hawkerPeople = plan.stalls.map((s, k) => {
      const yaw = Math.atan2(s.face[0], s.face[1]);
      const back = s.cart ? -0.7 : -0.25;
      // Off to one side of the stall, by the stove, so the menu board shows.
      const side = s.cart ? 0 : -0.62;
      // A hawker from the stall's own community, so the callout's language fits: Chinese aunties and uncles
      // at most stalls, a makcik or pakcik at Malay stalls, Indian Muslim hawkers at prata and briyani.
      const kinds = HAWKER_TYPES[s.menu] ?? HAWKER_TYPES.default;
      const type = kinds[(k * 7 + plan.stalls.length) % kinds.length];
      const lookH = lookOf(type, era.id, k * 13 + 1);
      const apron = ["#f4f1ea", "#2f6b4f", "#c8553d", "#2d4f9c"][k % 4];
      const style = styleOf(lookH, k);
      const kit = equipmentFor(menuById(s.menu).dishes);
      return { stall: k, persona: REGULAR_PERSONA[type] ?? "uncle", x: s.x + s.face[0] * back + side * s.face[1], y: 0, z: s.z + s.face[1] * back - side * s.face[0], yaw, scale: CROWD, style, pose: { phase: k * 1.7 }, tray: false, bag: false, apron, colours: coloursFor(style, { apron }), hands: [new Matrix4(), new Matrix4()], pot: kit.pot && !s.cart, frame: 0 };
    });
    // You: a lifelike person, or the kitchen's own chunky cook in the classic build.
    if (this.build === "classic") {
      this.me = makePerson(look ?? this.looks[0]);
      this.me.scale.setScalar(PERSON);
    } else {
      this.me = buildHuman(look ?? this.looks[0], { seed: 3 });
      this.me.scale.setScalar(CROWD);
    }
    scene.add(this.me);
    this.meTray = new Group();
    this.me.add(this.meTray);
    if (this.build === "classic") this.meTray.position.set(0, 0.62, 0.26);
    else this.meTray.position.set(0, 1.05, 0.38);
    // In your own eyes, the tray is held out in front of the camera.
    this.handTray = new Group();
    this.handTray.position.set(0, -0.5, -0.62);
    this.handTray.rotation.x = 0.35;
    this.camera.add(this.handTray);
    this.meTrayKey = "";
    const ring = new Mesh(new CylinderGeometry(0.42, 0.42, 0.02, 24), new MeshBasicMaterial({ color: "#f2c94c", transparent: true, opacity: 0.55 }));
    ring.position.y = 0.02;
    scene.add(ring);
    this.ring = ring;

    // Things on tables: tissue packets, dirty plates, food being eaten, and your own dishes.
    this.packets = new InstancedMesh(new BoxGeometry(0.17, 0.05, 0.11), mat("#ffffff", { surface: "cloth" }).clone(), Math.max(1, plan.tables.length));
    this.packets.count = 0;
    this.plates = new InstancedMesh(new CylinderGeometry(0.12, 0.09, 0.05, 10), mat("#fbf8f0", { surface: "ceramic" }).clone(), Math.max(1, plan.tables.length * 3));
    this.plates.count = 0;
    this.food = new InstancedMesh(new CylinderGeometry(0.11, 0.08, 0.06, 10), mat("#ffffff", { surface: "food" }).clone(), 2400);
    // Each diner's plate under their food.
    this.dinerPlates = new InstancedMesh(new CylinderGeometry(0.14, 0.11, 0.02, 12), mat("#fbf8f0", { surface: "ceramic" }).clone(), 2400);
    this.dinerPlates.count = 0;
    this.dinerPlates.frustumCulled = false;
    scene.add(this.dinerPlates);
    this.food.count = 0;
    for (const m of [this.packets, this.plates, this.food]) {
      m.frustumCulled = false;
      scene.add(m);
    }
    this.people = [];
    this.agentColours = new Map();
    this.myFood = new Group();
    scene.add(this.myFood);
    this.myFoodKey = "";
    this.tmp = new Object3D();
    this.colour = new Color();
    // The street era's roving hawker pushes a cart with a charcoal stove.
    this.cart = null;
    if (w.agents.some((a) => a.kind === "roving")) {
      const g = new Group();
      g.add(mesh("box", mat("#6a4424", { surface: "wood" }), { pos: [0, 0.75, 0], scale: [1.4, 0.6, 0.8] }));
      g.add(mesh("cyl", mat("#2b2b2b"), { pos: [0, 1.15, 0.1], scale: [0.25, 0.22, 0.25] }));
      g.add(mesh("sphere", mat("#ff7a2a", { emissive: "#ff5a10", glow: 2.4 }), { pos: [0, 1.0, 0.1], scale: [0.12, 0.05, 0.12], shadow: false }));
      for (const [x, z] of [[-0.6, 0.45], [0.6, 0.45], [0, -0.45]]) g.add(mesh("cyl", mat("#3a2a1e"), { pos: [x, 0.3, z], scale: [0.3, 0.06, 0.3], rot: [0, 0, Math.PI / 2] }));
      const lamp = kerosene();
      lamp.position.set(0.55, 1.2, 0.3);
      g.add(lamp);
      this.lamps.push(lamp);
      this.cart = g;
      scene.add(g);
    }
    // The guide's dotted path to your next step, and a ring where it ends.
    this.dots = new InstancedMesh(new CylinderGeometry(0.09, 0.09, 0.02, 10), new MeshBasicMaterial({ color: "#f2b632" }), 90);
    this.dots.count = 0;
    this.dots.frustumCulled = false;
    this.goal = new Mesh(new CylinderGeometry(0.62, 0.62, 0.02, 32, 1, true), new MeshBasicMaterial({ color: "#f2b632", transparent: true, opacity: 0.85, side: DoubleSide }));
    this.goal.scale.y = 18;
    this.goal.visible = false;
    scene.add(this.dots, this.goal);
    this.route = null;

    this.camPos = new Vector3(plan.start[0], 18, plan.start[1] + 14);
    this.yaw = Math.atan2(w.me.fx, w.me.fz);
    this.applyQuality(true);
    this.relook();
    this.fit();
  }

  // Cartoon, Soft or Real: materials, sky light and tone mapping (realism.js).
  relook() {
    if (!this.plan) return;
    // Lifelike and classic people are different meshes: set the centre up again with the other build.
    if (this.build !== peopleBuild() && this.args) return this.load(...this.args);
    // A street of pushcarts is under the open sky; a hall is lit by its own tubes, with the sky beyond.
    // The photographed sky shows behind dusk and night scenes; by day the plain sky reads better than a
    // blurred garden.
    const time = skyFor(this.preset?.time ?? (this.night ? "night" : null), this.era.id);
    const k = realise(this.scene, this.renderer, { time, indoor: this.plan.kind !== "street", sky: time !== "day" });
    this.hemi.intensity = this.hemiBase * k;
    this.boardPhotos();
  }

  // The kitchen's tier: shadows and their size, and how many people cast them.
  applyQuality(force = false) {
    const q = this.kitchen?.quality ?? { shadows: true, shadow: 2048, name: "High" };
    if (!force && this.qName === q.name) return;
    this.qName = q.name;
    this.renderer.shadowMap.enabled = q.shadows;
    this.sun.castShadow = q.shadows;
    if (this.sun.shadow.mapSize.x !== q.shadow) {
      this.sun.shadow.mapSize.set(q.shadow, q.shadow);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.crowd?.shadows(q.name === "High");
  }

  buildHall(plan, era, preset, centreName) {
    const scene = this.scene;
    const style = this.style;
    const shape = new Shape(plan.outline.map(([x, z]) => ({ x, y: -z })));
    const floorTex = terrazzo(preset.colours.floor ?? era.look.floor, 1965);
    floorTex.wrapS = floorTex.wrapT = RepeatWrapping;
    const fgeo = new ShapeGeometry(shape);
    fgeo.rotateX(-Math.PI / 2);
    // Terrazzo every metre and a half, so its chips stay chip-sized up close.
    const uv = fgeo.attributes.uv;
    const pos = fgeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 1.5, pos.getZ(i) / 1.5);
    const floor = new Mesh(fgeo, mat("#ffffff", { map: floorTex, outline: false, surface: preset.archetype === "modern" ? "floortiles" : "terrazzo" }));
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // A centre inside a bigger building: that building's footprint, as a plain slab round the hall.
    if (plan.parent) {
      const pg = new ShapeGeometry(new Shape(plan.parent.map(([x, z]) => ({ x, y: -z }))));
      pg.rotateX(-Math.PI / 2);
      const slab = new Mesh(pg, mat("#d9d2c4", { outline: false, surface: "concrete" }));
      slab.position.y = 0.004;
      slab.receiveShadow = true;
      scene.add(slab);
    }
    // The wet market on the spare floor: rows of low counters with fish, vegetables and fruit.
    if (plan.market?.length) {
      const n = plan.market.length;
      const counters = new InstancedMesh(new BoxGeometry(1.9, 0.8, 1.0).translate(0, 0.4, 0), mat("#c9ced2", { outline: false, surface: "tiles" }), n);
      const goods = new InstancedMesh(new BoxGeometry(1.6, 0.12, 0.75).translate(0, 0.86, 0), mat("#ffffff", { outline: false }).clone(), n);
      const c = new Color();
      plan.market.forEach(({ x, z }, i) => {
        const m = new Matrix4().makeTranslation(x, 0, z);
        counters.setMatrixAt(i, m);
        goods.setMatrixAt(i, m);
        goods.setColorAt(i, c.set(["#9aa3a8", "#5fae5a", "#e8892e", "#c0583a", "#f2c94c", "#7cb85a"][i % 6]));
      });
      counters.castShadow = goods.castShadow = true;
      scene.add(counters, goods);
    }

    // Stalls, merged by colour and material.
    const buckets = new Map();
    const put = (key, geo) => {
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(geo);
    };
    const numbers = numberAtlas(plan.stalls);
    const plates = [];
    const signGeos = new Map(); // sign key -> geometries
    const boardGeos = new Map(); // menu -> geometries
    const M = new Matrix4();
    const R = new Matrix4();
    const lit = era.id !== "1950s";
    plan.stalls.forEach((s, k) => {
      const yaw = Math.atan2(s.face[0], s.face[1]);
      M.makeTranslation(s.x, 0, s.z).multiply(R.makeRotationY(yaw));
      const wall = style.wall[k % style.wall.length];
      const W = STALL_W;
      const D = STALL_D;
      const tiles = era.id === "1950s" ? "wood" : "tiles";
      const parts = [
        [`${wall}|${tiles}`, box(W, 2.5, 0.12, 0, 1.25, -D / 2 + 0.06)],
        [`${wall}|${tiles}`, box(0.1, 2.5, D, -W / 2 + 0.05, 1.25, 0)],
        [`${wall}|${tiles}`, box(0.1, 2.5, D, W / 2 - 0.05, 1.25, 0)],
        [`${style.counter}|${era.id === "1950s" ? "wood" : era.id === "2065" ? "plastic" : "tiles"}`, box(W - 0.1, 0.92, 0.55, 0, 0.46, D / 2 - 0.35)],
        [`${style.top}|steel`, box(W - 0.05, 0.05, 0.62, 0, 0.94, D / 2 - 0.35)],
        [`${style.counter}|steel`, box(W - 0.3, 0.88, 0.5, 0, 0.44, -D / 2 + 0.4)],
        // A canopy over the counter only, so you can see into the stall from above.
        [`${style.roof}|plaster`, box(W + 0.1, 0.08, 0.75, 0, 2.55, D / 2 - 0.3)],
        [`${style.roof}|plaster`, box(W + 0.1, 0.08, 0.12, 0, 2.55, -D / 2 + 0.06)],
        ["#2b1b12|", box(W, 0.66, 0.06, 0, 2.2, D / 2 - 0.02)],
        // On the back bench: a big pot, a stack of bowls, and a wok or a steamer by the menu.
        ["#9aa3a8|steel", new CylinderGeometry(0.22, 0.2, 0.35, 12).translate(-0.7, 1.06, -D / 2 + 0.45)],
        ["#fbf8f0|ceramic", new CylinderGeometry(0.09, 0.07, 0.16, 10).translate(0.95, 1.0, D / 2 - 0.3)],
      ];
      // What the menu needs on the counters: a wok on its burner, a noodle pot, a chopping board, a griddle
      // for prata, a satay grill, an ice shaver, or trays of dishes to scoop from.
      const kit = equipmentFor(menuById(s.menu).dishes);
      if (kit.wok) parts.push(["#2b2b2b|steel", new CylinderGeometry(0.34, 0.18, 0.14, 14).translate(0.4, 1.0, -D / 2 + 0.45)], ["#5b5f63|steel", box(0.6, 0.12, 0.5, 0.4, 0.86, -D / 2 + 0.45)]);
      if (kit.pot) parts.push(["#b9c0c4|steel", new CylinderGeometry(0.24, 0.24, 0.36, 14).translate(-0.7, 1.06, -D / 2 + 0.45)]);
      if (kit.board) parts.push(["#c9a46a|wood", box(0.55, 0.05, 0.32, 0.25, 0.99, D / 2 - 0.42)]);
      if (kit.griddle) parts.push(["#3a3a3a|steel", box(0.75, 0.04, 0.42, 0.15, 0.985, D / 2 - 0.42)]);
      if (kit.grill) parts.push(["#2b2b2b|steel", box(0.95, 0.14, 0.26, 0.55, 1.03, D / 2 - 0.3)], ["#ff7a2a|glow", box(0.85, 0.02, 0.18, 0.55, 1.11, D / 2 - 0.3)]);
      if (kit.shaver) parts.push(["#c8553d|plastic", box(0.24, 0.06, 0.24, 0.45, 0.995, D / 2 - 0.42)], ["#b9c0c4|steel", new CylinderGeometry(0.03, 0.03, 0.4, 8).translate(0.55, 1.2, D / 2 - 0.42)], ["#c8553d|plastic", box(0.26, 0.12, 0.2, 0.45, 1.4, D / 2 - 0.42)]);
      if (kit.trays) for (let i = 0; i < 4; i++) parts.push([`${["#d9822b", "#5fae5a", "#a8442a", "#f2c94c"][(i + k) % 4]}|food`, box(0.24, 0.05, 0.3, -0.5 + i * 0.3, 0.995, D / 2 - 0.38)]);
      if (s.menu === "drinks") {
        parts.push(["#b9c0c4|steel", new CylinderGeometry(0.2, 0.2, 0.55, 14).translate(-0.2, 1.2, -D / 2 + 0.45)]);
        for (let i = 0; i < 5; i++) parts.push(["#f4f1ea|ceramic", new CylinderGeometry(0.045, 0.035, 0.08, 8).translate(-0.6 + i * 0.16, 1.01, D / 2 - 0.3)]);
      }
      // A glass case of roast meat, with something hanging in it.
      if (s.menu === "riceplates" || s.menu === "chickenrice") {
        // On the left of the counter, so the hawker chopping on the right stays in view.
        parts.push(["#a8551a|", box(0.8, 0.32, 0.05, -0.75, 1.52, D / 2 - 0.3)]);
        parts.push(["#d8eef4|glass", box(0.9, 0.58, 0.48, -0.75, 1.26, D / 2 - 0.35)]);
      }
      // The pay-by-QR stand on the counter.
      if (era.id === "today" || era.id === "2065") parts.push(["#f4f1ea|plastic", box(0.16, 0.22, 0.02, W / 2 - 0.35, 1.07, D / 2 - 0.2)], ["#2b2b2b|", box(0.11, 0.11, 0.005, W / 2 - 0.35, 1.1, D / 2 - 0.188)]);
      if (lit) parts.push(["#ffffff|glow", box(W - 0.6, 0.04, 0.06, 0, 2.48, D / 2 - 0.55)]);
      for (const [key, geo] of parts) put(key, geo.applyMatrix4(M));
      // The lightbox sign, the stall's number plate, and the menu board on the back wall.
      const famous = Boolean(s.famous);
      const title = this.signs?.[s.id] ?? null;
      const signKey = `${s.menu}|${famous ? 1 : 0}|${title ?? ""}`;
      const sg = new PlaneGeometry(W - 0.12, 0.58).translate(0, 2.2, D / 2 + 0.015).applyMatrix4(M);
      if (!signGeos.has(signKey)) signGeos.set(signKey, { menu: s.menu, famous, title, geos: [] });
      signGeos.get(signKey).geos.push(sg);
      plates.push(atlasPlane(numbers, k, 0.46, 0.145).translate(-W / 2 + 0.4, 1.82, D / 2 + 0.02).applyMatrix4(M));
      // The menu board hangs on the back wall to one side of the hawker, below the sign's line of sight.
      if (!boardGeos.has(s.menu)) boardGeos.set(s.menu, { stall: s.id, geos: [] });
      boardGeos.get(s.menu).geos.push(new PlaneGeometry(1.45, 0.8).translate(0.58, 1.7, -D / 2 + 0.125).applyMatrix4(M));
    });
    for (const [key, geos] of buckets) {
      const [colour, surface] = key.split("|");
      const glass = surface === "glass";
      const material = surface === "glow" ? mat("#ffffff", { emissive: "#fffaf0", glow: 1.6, outline: false }) : mat(colour, { outline: false, surface: surface || undefined, transparent: glass, opacity: glass ? 0.35 : undefined });
      const m = new Mesh(mergeGeometries(geos), material);
      m.castShadow = !glass && surface !== "glow";
      m.receiveShadow = true;
      scene.add(m);
    }
    for (const { menu, famous, title, geos } of signGeos.values()) scene.add(new Mesh(mergeGeometries(geos), new MeshBasicMaterial({ map: drawSign(menu, era.id, { famous, title }) })));
    if (plates.length) scene.add(new Mesh(mergeGeometries(plates), new MeshBasicMaterial({ map: numbers.tex })));
    // Menu boards, one texture per menu, redrawn with photos once they load.
    this.boards = [];
    for (const [menu, { stall, geos }] of boardGeos) {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 288;
      const lines = stallMenu(this.w, stall).map((o) => ({ dish: o.dish, label: o.dish === "drink" ? "Kopi, teh, Milo" : o.label, price: money(o.price) }));
      drawBoard(c, lines, era.id);
      const tex = canvasTex(c);
      this.boards.push({ menu, c, tex, lines });
      scene.add(new Mesh(mergeGeometries(geos), new MeshBasicMaterial({ map: tex })));
    }

    // The roof: columns, a fascia round the edge with the centre's name, a light, see-through roof from
    // above, and a solid ceiling with tubes and fans when you are inside looking up.
    const colH = preset.archetype === "modern" ? 6 : preset.archetype === "complex" ? 3.4 : 4.6;
    this.colH = colH;
    const roofed = plan.archetype !== "openair";
    const colGeo = new CylinderGeometry(0.2, 0.22, colH, 12).translate(0, colH / 2, 0);
    const perimeter = [];
    if (roofed) {
      const n = plan.outline.length;
      for (let i = 0; i < n; i++) {
        const [x1, z1] = plan.outline[i];
        const [x2, z2] = plan.outline[(i + 1) % n];
        const len = Math.hypot(x2 - x1, z2 - z1);
        const steps = Math.max(1, Math.round(len / 7));
        for (let k = 0; k < steps; k++) perimeter.push([x1 + ((x2 - x1) * k) / steps, z1 + ((z2 - z1) * k) / steps]);
      }
    }
    const cols = [...plan.columns, ...perimeter];
    if (cols.length) {
      const inst = new InstancedMesh(colGeo, mat(preset.colours.pillar, { outline: false, surface: "concrete" }), cols.length);
      cols.forEach(([x, z], i) => inst.setMatrixAt(i, new Matrix4().makeTranslation(x, 0, z)));
      inst.castShadow = true;
      scene.add(inst);
    }
    if (roofed) {
      const fascia = [];
      const n = plan.outline.length;
      for (let i = 0; i < n; i++) {
        const [x1, z1] = plan.outline[i];
        const [x2, z2] = plan.outline[(i + 1) % n];
        const len = Math.hypot(x2 - x1, z2 - z1);
        const g = new BoxGeometry(len + 0.3, 0.32, 0.14);
        g.rotateY(-Math.atan2(z2 - z1, x2 - x1));
        g.translate((x1 + x2) / 2, colH + 0.25, (z1 + z2) / 2);
        fascia.push(g);
      }
      scene.add(new Mesh(mergeGeometries(fascia), mat(preset.colours.accent, { outline: false })));
      const rgeo = new ShapeGeometry(shape);
      rgeo.rotateX(-Math.PI / 2);
      const roof = new Mesh(rgeo, mat(preset.colours.roof, { transparent: true, opacity: 0.16, outline: false }).clone());
      roof.material.depthWrite = false;
      roof.position.y = colH + 0.55;
      scene.add(roof);
      this.roof = roof;
      // The ceiling, seen from below: plain painted concrete, or the underside of a pitched roof.
      const cgeo = new ShapeGeometry(shape);
      cgeo.rotateX(Math.PI / 2);
      const ceiling = new Mesh(cgeo, mat(preset.archetype === "complex" ? "#ece8e0" : "#e6e0d4", { outline: false, surface: "plaster" }));
      ceiling.position.y = colH + 0.4;
      ceiling.visible = false;
      scene.add(ceiling);
      this.ceiling = ceiling;
      // Fluorescent tubes in rows under the ceiling.
      const tubes = [];
      const b = plan.bounds;
      for (let x = b.x0 + 3; x < b.x1 - 2; x += 6) {
        for (let z = b.z0 + 3; z < b.z1 - 2; z += 5) {
          if (!insideOutline(plan, x, z)) continue;
          tubes.push(box(1.25, 0.05, 0.1, x, colH + 0.32, z));
        }
      }
      if (tubes.length && era.id !== "1950s") {
        const t = new Mesh(mergeGeometries(tubes), mat("#ffffff", { emissive: "#fbfbff", glow: 1.8, outline: false }));
        t.visible = false;
        scene.add(t);
        this.tubes = t;
      }
      // 2065: solar panels along the roof edge.
      if (era.id === "2065") {
        const pv = [];
        for (const [x, z] of perimeter.filter((_, i) => i % 2 === 0)) pv.push(box(1.6, 0.05, 1.1, x, colH + 0.65, z));
        if (pv.length) scene.add(new Mesh(mergeGeometries(pv), mat("#2d4f9c", { outline: false, surface: "glass" })));
      }
    }
    // Enclosed halls: walls where the grid has them inside the building.
    if (plan.enclosed) {
      const g = plan.grid;
      const spots = [];
      for (let j = 0; j < g.h; j++) {
        for (let i = 0; i < g.w; i++) {
          if (g.at(i, j) !== WALL) continue;
          const [x, z] = g.centre(i, j);
          if (Math.abs(x) <= plan.bounds.x1 + 0.3 && Math.abs(z) <= plan.bounds.z1 + 0.3 && insideOutline(plan, x, z)) spots.push([x, z]);
        }
      }
      if (spots.length) {
        const wall = new InstancedMesh(new BoxGeometry(0.5, 1.2, 0.5).translate(0, 0.6, 0), mat(preset.colours.pillar, { outline: false, surface: "concrete" }), spots.length);
        spots.forEach(([x, z], i) => wall.setMatrixAt(i, new Matrix4().makeTranslation(x, 0, z)));
        wall.castShadow = true;
        scene.add(wall);
      }
    }
    // A radial hall's clock tower in the middle (Lau Pa Sat's), rising through the roof.
    if (plan.radial) {
      const t = new Group();
      t.add(mesh("box", mat(preset.colours.pillar, { surface: "plaster" }), { pos: [0, 4.5, 0], scale: [2.2, 9, 2.2] }));
      t.add(mesh("box", mat(preset.colours.accent), { pos: [0, 9.3, 0], scale: [2.6, 0.4, 2.6] }));
      for (const [x, z, ry] of [[0, 1.12, 0], [0, -1.12, Math.PI], [1.12, 0, Math.PI / 2], [-1.12, 0, -Math.PI / 2]]) {
        const face = mesh("cyl", mat("#fbf8f0"), { pos: [x, 7.6, z], scale: [0.7, 0.05, 0.7], rot: [Math.PI / 2, 0, 0] });
        face.rotation.set(Math.PI / 2, 0, ry);
        face.rotation.order = "YXZ";
        face.rotation.y = ry;
        t.add(face);
        t.add(mesh("box", mat("#2b1b12"), { pos: [x * 1.04, 7.7, z * 1.04], scale: [0.06, 0.45, 0.06], shadow: false }));
      }
      t.add(mesh("cone8", mat(preset.colours.roof), { pos: [0, 10.4, 0], scale: [1.7, 1.8, 1.7] }));
      this.scene.add(t);
    }
    // The centre's name over the main door.
    if (preset.sign && plan.doors.length) {
      const d = plan.doors[0];
      const tex = label(preset.sign, { bg: preset.colours.accent, fg: "#fff8ea", w: 1024, h: 128, font: `800 68px ${FONT}` });
      const s = new Mesh(new PlaneGeometry(9, 1.1), new MeshBasicMaterial({ map: tex, transparent: true, side: DoubleSide }));
      s.position.set(d.x - d.face[0] * 2.2, colH + 1.1, d.z - d.face[1] * 2.2);
      s.rotation.y = Math.atan2(d.face[0], d.face[1]);
      s.rotation.x = d.face[1] > 0 ? -0.25 : 0;
      s.material.depthWrite = false;
      this.scene.add(s);
      this.bigSign = s;
    }
    // An HDB block's number plate by each door: "BLK 51".
    const own = this.hdb?.own ?? [];
    if (own.length && plan.doors.length) {
      const text = `BLK ${own.map((b) => b.blk).join(" / ")}`;
      const tex = label(text, { bg: "#23303a", fg: "#fff8ea", w: 512, h: 128, font: `800 64px ${FONT}` });
      plan.doors.slice(0, 3).forEach((d, i) => {
        const p = new Mesh(new PlaneGeometry(2.6, 0.65), new MeshBasicMaterial({ map: tex, side: DoubleSide }));
        // Beside the big sign at the main door; over the others.
        const along = i === 0 && preset.sign ? 6 : 0;
        p.position.set(d.x - d.face[0] * 2.2 + d.face[1] * along, colH + 1.1, d.z - d.face[1] * 2.2 - d.face[0] * along);
        p.rotation.y = Math.atan2(d.face[0], d.face[1]);
        this.scene.add(p);
      });
    }
    // Ceiling fans over the seating, turning; planters in 2065.
    if (era.id !== "1950s" || preset.features?.includes("fans")) {
      for (const [x, z] of plan.columns) {
        const f = ceilingFan();
        f.scale.setScalar(1.1);
        f.position.set(x + 1.3, colH - 0.3, z + 1.3);
        this.scene.add(f);
        this.fans.push(f);
      }
    }
    if (era.id === "2065") {
      for (const [x, z] of plan.columns.filter((_, i) => i % 2 === 0)) {
        const p = planter();
        p.scale.setScalar(1.4);
        p.position.set(x + 0.9, 0, z);
        this.scene.add(p);
      }
    }
    // Tray return points, with their sign.
    for (const r of plan.trayReturns) {
      const g = new Group();
      g.add(mesh("box", mat("#5b6b78", { surface: "steel" }), { pos: [0, 0.6, 0], scale: [0.8, 1.2, 0.8] }));
      for (const y of [0.35, 0.65, 0.95]) g.add(mesh("box", mat("#c9a46a", { surface: "plastic" }), { pos: [0, y, 0.05], scale: [0.7, 0.03, 0.7], shadow: false }));
      const t = label("TRAY RETURN", { bg: "#2f6b4f", fg: "#fff8ea", w: 256, h: 64, font: `800 30px ${FONT}` });
      const s = new Mesh(new PlaneGeometry(0.9, 0.24), new MeshBasicMaterial({ map: t, side: DoubleSide }));
      s.position.set(0, 1.45, 0);
      g.add(s);
      g.position.set(r.x, 0, r.z);
      g.rotation.y = Math.atan2(r.use[0] - r.x, r.use[1] - r.z);
      this.scene.add(g);
    }
    // The tissue seller's little table.
    for (const s of plan.sellers) {
      const g = new Group();
      g.add(mesh("box", mat("#c9a46a", { surface: "wood" }), { pos: [0, 0.35, 0.35], scale: [0.6, 0.7, 0.4] }));
      for (let k = 0; k < 6; k++) g.add(mesh("box", mat(["#ffffff", "#f4c4d0", "#c4e0f4"][k % 3]), { pos: [-0.2 + (k % 3) * 0.2, 0.74 + Math.floor(k / 3) * 0.06, 0.35], scale: [0.17, 0.05, 0.11], shadow: false }));
      g.position.set(s.x, 0, s.z);
      this.scene.add(g);
    }
  }

  // Redraws the menu boards with dish photos (Real look only), once the photos have loaded.
  async boardPhotos() {
    if (!this.boards?.length) return;
    const want = realism() === "real";
    if (!want) {
      if (this.boardsHavePhotos) {
        for (const b of this.boards) {
          drawBoard(b.c, b.lines, this.era.id);
          b.tex.needsUpdate = true;
        }
        this.boardsHavePhotos = false;
      }
      return;
    }
    const plan = this.plan;
    const dishes = [...new Set(this.boards.flatMap((b) => b.lines.map((l) => l.dish)))];
    const imgs = new Map();
    await Promise.all(
      dishes.map(async (d) => {
        const p = await dishPhoto(d === "drink" ? "drink" : d);
        if (!p) return;
        const img = new Image();
        img.src = p.url;
        try {
          await img.decode();
          imgs.set(d, img);
        } catch {}
      }),
    );
    if (this.plan !== plan || realism() !== "real" || !imgs.size) return;
    for (const b of this.boards) {
      drawBoard(b.c, b.lines, this.era.id, imgs);
      b.tex.needsUpdate = true;
    }
    this.boardsHavePhotos = true;
  }

  buildStreet(plan, era) {
    const scene = this.scene;
    // The road, the five-foot ways, and shophouses both sides with their arcades.
    const road = new Mesh(new PlaneGeometry(plan.bounds.x1 - plan.bounds.x0 + 40, plan.road), mat("#5b524a", { outline: false, surface: "asphalt" }));
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    scene.add(road);
    for (const side of [-1, 1]) {
      const foot = new Mesh(new PlaneGeometry(plan.bounds.x1 - plan.bounds.x0 + 40, plan.foot), mat("#b9a382", { outline: false, surface: "concrete" }));
      foot.rotation.x = -Math.PI / 2;
      foot.position.set(0, 0.04, side * (plan.road / 2 + plan.foot / 2));
      foot.receiveShadow = true;
      scene.add(foot);
      const row = shophouses(plan.bounds.x1 - plan.bounds.x0 + 30, side < 0 ? ["#e8c46a", "#9fc4b0", "#e8a08a"] : ["#c4b0d8", "#e8a08a", "#f2d27a"]);
      row.scale.setScalar(1.9);
      row.position.set(plan.bounds.x0 - 18, 0, side * (plan.road / 2 + plan.foot + 1.1));
      row.rotation.y = side < 0 ? 0 : Math.PI;
      if (side > 0) row.position.x = plan.bounds.x1 + 18;
      scene.add(row);
    }
    // Pushcarts at the kerb, each with a kerosene lamp and a cloth sign.
    const signGeos = new Map();
    plan.stalls.forEach((s) => {
      const g = new Group();
      g.add(mesh("box", mat("#8a5a30", { surface: "wood" }), { pos: [0, 0.75, 0], scale: [1.8, 0.75, 0.9] }));
      g.add(mesh("box", mat("#d9c3a0", { surface: "wood" }), { pos: [0, 1.14, 0], scale: [1.85, 0.05, 0.95] }));
      g.add(mesh("box", mat("#c8553d", { surface: "fabric" }), { pos: [0, 2.3, 0], scale: [2.0, 0.06, 1.2] }));
      for (const x of [-0.85, 0.85]) g.add(mesh("cyl8", mat("#3a2a1e", { surface: "wood" }), { pos: [x, 1.7, -0.4], scale: [0.03, 1.2, 0.03] }));
      for (const x of [-0.7, 0.7]) g.add(mesh("cyl", mat("#3a2a1e"), { pos: [x, 0.3, 0.48], scale: [0.3, 0.06, 0.3], rot: [Math.PI / 2, 0, 0] }));
      g.add(mesh("cyl", mat("#9aa3a8", { surface: "steel" }), { pos: [-0.4, 1.3, 0], scale: [0.22, 0.25, 0.22] }));
      const lamp = kerosene();
      lamp.position.set(0.75, 1.65, 0.3);
      g.add(lamp);
      this.lamps.push(lamp);
      g.position.set(s.x, 0, s.z);
      g.rotation.y = Math.atan2(s.face[0], s.face[1]);
      scene.add(g);
      const key = `${s.menu}|${s.famous ? 1 : 0}`;
      if (!signGeos.has(key)) signGeos.set(key, { menu: s.menu, famous: Boolean(s.famous), geos: [] });
      const sign = new PlaneGeometry(1.8, 0.45).translate(0, 2.05, 0.62);
      sign.applyMatrix4(g.matrixWorld.compose(g.position, g.quaternion, g.scale));
      signGeos.get(key).geos.push(sign);
    });
    for (const { menu, famous, geos } of signGeos.values()) scene.add(new Mesh(mergeGeometries(geos), new MeshBasicMaterial({ map: drawSign(menu, era.id, { famous }), side: DoubleSide })));
    this.colH = 4;
  }

  buildTables(plan, era, preset, w) {
    const style = this.style;
    const n = plan.tables.length;
    if (!n) return;
    const low = style.low || plan.kind === "street";
    const topGeo = low ? new BoxGeometry(0.9, 0.05, 0.9).translate(0, 0.55, 0) : new CylinderGeometry(0.55, 0.55, 0.05, 24).translate(0, 0.76, 0);
    const legGeo = low ? new BoxGeometry(0.7, 0.52, 0.7).translate(0, 0.27, 0) : new CylinderGeometry(0.07, 0.12, 0.74, 8).translate(0, 0.37, 0);
    const stoolGeo = low ? new BoxGeometry(0.3, 0.3, 0.3).translate(0, 0.15, 0) : new CylinderGeometry(0.19, 0.16, 0.46, 12).translate(0, 0.23, 0);
    const tableCol = preset.colours.table ?? style.table;
    const stoolCol = preset.colours.stool ?? style.stool;
    const topSurface = low ? "wood" : preset.colours.table ? "plastic" : era.id === "2065" ? "plastic" : "marble";
    const tops = new InstancedMesh(topGeo, mat(tableCol, { outline: false, surface: topSurface }), n);
    const legs = new InstancedMesh(legGeo, mat(low ? style.stool : "#9aa3a8", { outline: false, surface: low ? "wood" : "steel" }), n);
    const stools = new InstancedMesh(stoolGeo, mat("#ffffff", { outline: false, surface: low ? "wood" : "plastic" }).clone(), n * 4);
    const c = new Color();
    plan.tables.forEach((t, i) => {
      const m = new Matrix4().makeTranslation(t.x, 0, t.z);
      tops.setMatrixAt(i, m);
      legs.setMatrixAt(i, m);
      // A stall's own tables carry its stools, in its colour (stallholders brought their own furniture).
      const owner = w?.tables[i]?.owner ?? null;
      const col = owner !== null ? SIGN_BG[plan.stalls[owner].menu] ?? stoolCol : stoolCol;
      t.seats.forEach(([x, z], k) => {
        stools.setMatrixAt(i * 4 + k, new Matrix4().makeTranslation(x, 0, z));
        stools.setColorAt(i * 4 + k, c.set(col));
      });
    });
    for (const m of [tops, legs, stools]) {
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    }
    this.tableTop = low ? 0.58 : 0.79;
  }

  // The buildings around, from OpenStreetMap: HDB blocks, shophouses, offices, temples. Kept low enough to
  // see past, and faded when they stand between you and the camera. HDB blocks that match HDB's own data
  // (hawker-hdb.json) stand at their real number of storeys, with the block number painted near the top of
  // each end wall, and blocks of flats stand on an open void deck. Flats built over the centre itself rise
  // above its roof.
  buildNeighbours(plan, era) {
    this.neighbours = [];
    if (plan.kind === "street") {
      for (const [x, z] of [[-30, -16], [34, 18], [-48, 20], [52, -22]]) {
        const t = tree(era, 6);
        t.position.set(x, 0, z);
        this.scene.add(t);
      }
      return;
    }
    const COL = {
      hdb: era.id === "1980s" ? ["#f2d27a", "#bfe3d0", "#e8a08a"] : ["#f4ead6", "#d8e8f0", "#f2d27a", "#e8c4b0"],
      shophouse: ["#e8c46a", "#9fc4b0", "#e8a08a", "#c4b0d8"],
      office: ["#9fb8c8", "#b8c8d4", "#8aa4b8"],
      temple: ["#c8553d"],
      mosque: ["#f3e6c8"],
      church: ["#f4f1ea"],
      school: ["#e8dcc4"],
      carpark: ["#b5b0a6"],
      station: ["#c0c6cc"],
      house: ["#f4ead6"],
      other: ["#d9d2c4", "#c9c2b2"],
    };
    const HEIGHT = { hdb: 30, shophouse: 10, office: 34, temple: 8, mosque: 10, church: 12, school: 14, carpark: 12, station: 10, house: 7, other: 10 };
    const real = this.hdb?.around ?? {};
    // In the 1980s, blocks HDB lists as completed after 1989 were not there yet.
    const cutoff = era.id === "1980s" ? 1989 : null;
    this.hdbShown = { blocks: 0, cutoff, gone: 0 };
    const pillars = [];
    const roofGardens = [];
    plan.around.forEach((b, k) => {
      if (!b.outline || b.outline.length < 3) return;
      const r = real[b.osm] ?? null; // [blk, floors, year, res, units]
      if (r && cutoff && r[2] > cutoff) {
        this.hdbShown.gone++;
        return;
      }
      const kind = r ? "hdb" : COL[b.kind] ? b.kind : "other";
      let h = r ? r[1] * STOREY : b.height ?? (b.levels ? b.levels * 3 : HEIGHT[kind]);
      h = Math.max(4, Math.min(h, r ? 90 : 40));
      // A block of flats stands on its void deck: an open ground floor on pillars.
      const deck = r?.[3] && h > STOREY * 3 ? STOREY : 0;
      const cols = COL[kind];
      const objs = [this.addBlock(b.outline, deck, h, cols[k % cols.length], kind, era)];
      if (deck) pillars.push(...pillarSpots(b.outline));
      if (r) {
        objs.push(...this.paintNumber(b.outline, h, r[0]));
        this.hdbShown.blocks++;
      }
      const [cx, cz] = centroid(b.outline);
      this.neighbours.push({ objs, cx, cz, h });
      // 2065: rooftop gardens.
      if (era.id === "2065" && (kind === "hdb" || kind === "carpark")) roofGardens.push([b.outline, h]);
    });
    // Flats over the centre: towers OpenStreetMap maps on top of it, or the centre's own block when HDB says
    // people live there and OSM has no tower (a slab along the hall's long side, our guess at its shape).
    const towers = [...(plan.over ?? [])];
    const own = this.hdb?.own ?? [];
    const home = own.find((b) => b.res);
    if (!towers.length && home && plan.outline.length >= 3) towers.push({ outline: slabOver(plan.outline), floors: home.floors, blk: home.blk, year: home.year, guess: true });
    const base0 = (this.colH ?? 4.6) + 0.6;
    // Unnumbered parts of the same towers count as flats when any of them is; an office tower looks like one.
    const flatsHere = Boolean(home) || towers.some((t) => t.use === "flats");
    // Each block number once, on the tallest piece that carries it.
    const tallest = new Map();
    for (const t of towers) {
      const no = t.blk ?? t.number;
      if (no && (!tallest.has(no) || (t.floors ?? t.levels) > (tallest.get(no).floors ?? tallest.get(no).levels))) tallest.set(no, t);
    }
    for (const t0 of towers) {
      if (cutoff && t0.year && t0.year > cutoff) continue;
      // A piece standing inside another (a tower's crown on its shaft) is drawn a hair smaller, so their
      // walls never fight over the same place.
      const [ix, iz] = centroid(t0.outline);
      const nested = towers.some((o) => o !== t0 && inPolygon(ix, iz, o.outline));
      const t = nested ? { ...t0, outline: shrink(t0.outline, 0.2) } : t0;
      const storeys = t.floors ?? t.levels;
      const base = t.minLevel ? Math.max(base0, t.minLevel * 3.4) : base0;
      // A building cut off where its parts begin (hawker-hdb.json's `capped`) stops exactly at their base.
      const top = t.capped ? Math.max(base + 1, t.levels * 3.4) : Math.min(95, Math.max(base + STOREY * 3, t.minLevel ? base + (storeys - t.minLevel) * STOREY : storeys * STOREY));
      const kind = t.use === "office" ? "office" : t.use === "flats" || flatsHere ? "hdb" : "other";
      const objs = [this.addBlock(t.outline, base, top, COL[kind][towers.indexOf(t0) % COL[kind].length], kind, era)];
      // Off the hall (on the rest of a bigger building), a tower stands on a plain podium, not on air.
      const [tx, tz] = centroid(t.outline);
      if (!inHall(plan, tx, tz)) objs.push(this.addBlock(t.outline, 0, base, "#d9d2c4", "other", era));
      const no = t.blk ?? t.number ?? null;
      if (no && tallest.get(no) === t0) objs.push(...this.paintNumber(t.outline, top, no));
      this.neighbours.push({ objs, cx: tx, cz: tz, h: top, over: true });
      if (era.id === "2065") roofGardens.push([t.outline, top]);
    }
    if (pillars.length) {
      const inst = new InstancedMesh(new BoxGeometry(0.55, STOREY, 0.55).translate(0, STOREY / 2, 0), mat("#d9d4ca", { outline: false, surface: "concrete" }), pillars.length);
      pillars.forEach(([x, z], i) => inst.setMatrixAt(i, new Matrix4().makeTranslation(x, 0, z)));
      inst.castShadow = true;
      inst.receiveShadow = true;
      this.scene.add(inst);
    }
    for (const [outline, h] of roofGardens) {
      const roof = new Mesh(new ShapeGeometry(new Shape(outline.map(([x, z]) => ({ x, y: -z })))).rotateX(-Math.PI / 2), mat("#5fae5a", { outline: false }));
      roof.position.y = h + 0.05;
      this.scene.add(roof);
    }
    // Rain trees between, where there is room.
    const b = plan.bounds;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.3;
      const x = Math.cos(a) * ((b.x1 - b.x0) / 2 + 6);
      const z = Math.sin(a) * ((b.z1 - b.z0) / 2 + 6);
      const g = plan.grid;
      if (g.at(...g.cellOf(x, z)) !== 0) continue;
      const t = tree(era, 5 + (k % 3));
      t.scale.setScalar(1.5);
      t.position.set(x, 0, z);
      this.scene.add(t);
    }
  }

  // One building as an extruded outline from y0 to y1, its walls in the facade for its kind. Returns the
  // mesh, so it can fade when it stands in the way.
  addBlock(outline, y0, y1, colour, kind, era) {
    const shape = new Shape(outline.map(([x, z]) => ({ x, y: -z })));
    const geo = new ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y0, 0);
    const roofMat = mat(colour, { outline: false, surface: "concrete" }).clone();
    // Walls get a storey of windows every three metres (the extrusion's side UVs run in metres).
    const wallMat = mat(colour, { outline: false, map: facadeTexture(kind, era.id) }).clone();
    for (const mm of [roofMat, wallMat]) mm.transparent = true;
    const m = new Mesh(geo, [roofMat, wallMat]);
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  // The block number, painted big near the top of each end wall, the way HDB marks its blocks.
  paintNumber(outline, h, blk) {
    const plates = [];
    const tex = numberTexture(String(blk));
    for (const w of endWalls(outline)) {
      // Big enough to read from the street, as HDB paints them: digits about two and a half metres tall.
      const width = Math.min(w.len * 0.6, 2.4 + String(blk).length * 2);
      const plate = new Mesh(new PlaneGeometry(width, width * 0.5), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.05 }));
      plate.position.set(w.x + w.nx * 0.08, Math.max(3, h - 0.8 - width * 0.25), w.z + w.nz * 0.08);
      plate.rotation.y = Math.atan2(w.nx, w.nz);
      this.scene.add(plate);
      plates.push(plate);
    }
    return plates;
  }

  fit() {
    const k = this.kitchen;
    const el = this.renderer.domElement;
    const w = el.clientWidth || innerWidth;
    const h = el.clientHeight || innerHeight;
    if (k) {
      const pr = k.ratioFor(w, h);
      if (this.renderer.getPixelRatio() !== pr) this.renderer.setPixelRatio(pr);
      this.renderer.setSize(w, h, false);
    }
    this.camera.aspect = w / h;
    this.camera.fov = this.cam === "above" ? (w < h ? 55 : 42) : w < h ? 78 : 66;
    this.camera.near = this.cam === "above" ? 0.3 : 0.08;
    this.camera.updateProjectionMatrix();
  }

  setCam(id) {
    if (!CAMS.some((c) => c.id === id)) return;
    const was = this.cam;
    this.cam = id;
    if (was === "above" && id !== "above" && this.w) this.yaw = Math.atan2(this.w.me.fx, this.w.me.fz);
    if (id !== "above") this.pitch = id === "eyes" ? -0.06 : -0.18;
    this.fit();
  }

  // Turning the camera (mouse, touch drag, right stick, arrow keys).
  turn(dYaw, dPitch = 0) {
    this.yaw += dYaw;
    this.yaw = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw));
    this.pitch = Math.max(-1.25, Math.min(1.0, this.pitch + dPitch));
  }

  // Turn smoothly towards a direction (when walking yourself somewhere, or sitting down).
  ease(dirX, dirZ, dt, rate = 4, pitch = null) {
    const want = Math.atan2(dirX, dirZ);
    let d = want - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.turn(d * Math.min(1, dt * rate), pitch === null ? 0 : (pitch - this.pitch) * Math.min(1, dt * rate));
  }

  setZoom(z) {
    this.zoom = Math.max(0.45, Math.min(2.6, z));
  }

  // The guide's path to the next step, as dots on the floor. points: [[x, z], ...] or null.
  setRoute(points, goal = null) {
    this.route = points;
    this.goalAt = goal;
    if (!points?.length) {
      this.dots.count = 0;
      this.goal.visible = false;
      return;
    }
    let n = 0;
    let carry = 0;
    for (let i = 0; i < points.length - 1 && n < 90; i++) {
      const [ax, az] = points[i];
      const [bx, bz] = points[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      for (let d = carry; d < len && n < 90; d += 0.7) {
        this.tmp.position.set(ax + ((bx - ax) * d) / len, 0.03, az + ((bz - az) * d) / len);
        this.tmp.rotation.set(0, 0, 0);
        this.tmp.scale.set(1, 1, 1);
        this.tmp.updateMatrix();
        this.dots.setMatrixAt(n++, this.tmp.matrix);
        carry = d + 0.7 - len;
      }
    }
    this.dots.count = n;
    this.dots.instanceMatrix.needsUpdate = true;
    this.goal.visible = Boolean(goal);
    if (goal) this.goal.position.set(goal[0], 0.2, goal[1]);
  }

  // The tray you carry, in your hands (above and behind) or held out in front of your eyes.
  trayFor(hold, into) {
    into.clear();
    if (!hold) return;
    into.add(mesh("box", mat(hold.dirty ? "#9aa3a8" : "#c9a46a", { surface: "plastic" }), { pos: [0, 0, 0], scale: [0.5, 0.025, 0.36] }));
    const items = hold.tray ?? Array.from({ length: hold.dirty }, () => null);
    items.slice(0, 4).forEach((it, i) => {
      const m = it ? (it.dish === "drink" ? makeDrink(packDrink(it.drink)) : dishModel(it.dish, it.variant)) : mesh("cyl", mat("#efe6d2", { surface: "ceramic" }), { scale: [0.11, 0.03, 0.11] });
      if (!m) return;
      m.scale.multiplyScalar(0.5);
      m.position.set(-0.12 + (i % 2) * 0.24, 0.02, -0.08 + Math.floor(i / 2) * 0.16);
      into.add(realiseObject(m));
    });
  }

  // Draws one frame from the walk state. alpha: how far this frame is between the last step and the next,
  // so people move smoothly whatever the screen's refresh rate.
  frame(dt, w, alpha = 1) {
    if (!this.plan) return;
    this.time += dt;
    this.kitchen?.track(dt);
    this.applyQuality();
    const me = w.me;
    const plan = this.plan;
    const eyes = this.cam === "eyes";
    const above = this.cam === "above";
    const lerp = (a, b) => (a === undefined ? b : a + (b - a) * alpha);
    const mx = lerp(me.px, me.x);
    const mz = lerp(me.pz, me.z);
    this.meAt[0] = mx;
    this.meAt[1] = mz;

    // You, with what you carry.
    this.me.visible = !eyes;
    const seated = me.sitting !== null;
    const human = Boolean(this.me.userData.joints);
    this.me.position.set(mx, seated ? (human ? this.stoolTop + 0.06 - 0.88 * this.size * (this.me.userData.scale ?? 1) : -0.32) : 0, mz);
    const yaw = Math.atan2(me.fx, me.fz);
    let d = yaw - this.me.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.me.rotation.y += d * Math.min(1, dt * 14);
    const walkAmt = seated ? 0 : Math.min(1, me.speed / 3.2);
    const body = this.me.userData.body;
    if (human) {
      if (body) body.position.y = reduceMotion ? 0 : Math.abs(Math.sin(this.time * 7.5)) * 0.025 * walkAmt;
      poseHuman(this.me, { walk: reduceMotion ? 0 : walkAmt, phase: 0, seated, eat: seated && me.eating > 0, carry: Boolean(me.hold), t: reduceMotion ? 0 : this.time * (me.speed > 3.5 ? 1.35 : 1) });
    } else if (body && !reduceMotion) {
      // The chunky cook bobs and sways as they walk, as in the kitchen.
      body.position.y = Math.abs(Math.sin(this.time * 11)) * 0.05 * walkAmt;
      body.rotation.z = Math.sin(this.time * 11) * 0.04 * walkAmt;
    }
    this.ring.visible = !eyes;
    this.ring.position.set(mx, 0.02, mz);
    const holdKey = me.hold?.tray ? me.hold.tray.map((t) => t.dish + (t.variant ?? "")).join() : me.hold?.dirty ? `dirty${me.hold.dirty}` : "";
    if (holdKey !== this.meTrayKey || eyes !== this.trayInEyes) {
      this.meTrayKey = holdKey;
      this.trayInEyes = eyes;
      this.trayFor(eyes ? null : me.hold, this.meTray);
      this.trayFor(eyes ? me.hold : null, this.handTray);
    }

    // Everyone else, but only those the camera can see (from last frame's view, with room to spare), so a
    // big centre draws a few dozen people rather than three hundred. Colours are worked out once per person.
    this.projView.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projView);
    const camX = this.camera.position.x;
    const camZ = this.camera.position.z;
    const seen = (x, z) => {
      // Close up, nobody past the fog is worth drawing.
      if (!above && Math.abs(x - camX) + Math.abs(z - camZ) > 95) return false;
      this.ball.center.set(x, 0.9, z);
      return this.frustum.intersectsSphere(this.ball);
    };
    const people = this.people;
    people.length = 0;
    this.frameNo++;
    // Each hawker to their work: the dish being made decides where they stand and what they do.
    for (const hp of this.hawkerPeople) {
      this.work.pose(hp, plan.stalls[hp.stall], StallWork.actFor(w, hp.stall), dt, this.time);
      hp.frame = this.frameNo;
      if (seen(hp.x, hp.z)) people.push(hp);
    }
    for (const a of w.agents) {
      const robot = a.kind === "cleaner" && w.rules.cleaners === "robot";
      let colours = this.agentColours.get(a.id);
      if (!colours) {
        const style = styleOf(this.looks[a.look % this.looks.length], a.look);
        const extra = {};
        // Riders in their app's colour, with its cap and an insulated bag; cleaners in uniform; robots white.
        if (a.kind === "rider") extra.top = extra.sleeve = extra.bagColour = extra.headColour = a.app === 0 ? "#2e9e55" : "#d6337a";
        if (a.kind === "cleaner") extra.top = extra.sleeve = robot ? "#e8f1ee" : "#3b6f8f";
        if (a.kind === "roving") extra.top = extra.sleeve = "#f4efe2";
        if (robot) extra.skin = "#7cc4e6";
        colours = coloursFor(style, extra);
        colours.styleRef = style;
        this.agentColours.set(a.id, colours);
      }
      const ax = lerp(a.px, a.x);
      const az = lerp(a.pz, a.z);
      if (a.kind === "roving" && this.cart) {
        this.cart.position.set(ax + a.fx * 1.1, 0, az + a.fz * 1.1);
        this.cart.rotation.y = Math.atan2(a.fx, a.fz) + Math.PI / 2;
      }
      const moving = a.speed > 0.1 && !reduceMotion;
      const bob = moving ? Math.abs(Math.sin(this.time * 7.5 + a.id * 1.3)) * 0.022 : 0;
      const p = (a.view ??= { colours, phase: a.id * 1.3, pose: { phase: a.id * 1.3 } });
      // Nobody stands inside your eyes: someone brushing past the camera steps out of the picture.
      const inEyes = eyes && Math.abs(ax - this.camPos.x) < 0.6 && Math.abs(az - this.camPos.z) < 0.6;
      // Turning at a corner takes a moment rather than a frame.
      const wantYaw = Math.atan2(a.fx, a.fz);
      const turn = p.yaw === undefined || a.seated ? 0 : Math.atan2(Math.sin(wantYaw - p.yaw), Math.cos(wantYaw - p.yaw));
      const sc = robot ? 0.8 : this.size;
      const seatY = a.seated ? this.stoolTop + 0.06 - this.dims.hip * sc * (colours.styleRef.scale ?? 1) : 0;
      p.pose.walk = moving ? Math.min(1, a.speed / 1.35) * 0.8 : 0;
      p.pose.seated = a.seated;
      p.pose.eat = a.seated;
      p.pose.carry = a.tray && !a.seated;
      Object.assign(p, { x: ax, y: seatY + bob - (inEyes ? 9 : 0), z: az, yaw: p.yaw === undefined || a.seated ? wantYaw : p.yaw + turn * Math.min(1, dt * 12), scale: sc, style: colours.styleRef, robot, tray: a.tray && !a.seated, bag: a.kind === "rider", cap: a.kind === "rider", colours });
      if (seen(ax, az)) people.push(p);
    }
    // Near people in full detail; the rest, further than the eye picks out faces, in the lite set.
    const near = (this.near ??= []);
    const far = (this.far ??= []);
    near.length = 0;
    far.length = 0;
    const cx = this.camera.position.x;
    const cz = this.camera.position.z;
    const reach = above ? 34 * this.zoom : 22;
    for (const p of people) (Math.abs(p.x - cx) + Math.abs(p.z - cz) < reach * 1.3 ? near : far).push(p);
    this.crowd.set(near, reduceMotion ? 0 : this.time);
    this.crowdFar.set(far, reduceMotion ? 0 : this.time);
    this.work.draw(this.hawkerPeople, plan, reduceMotion ? 0 : this.time);

    // Table things.
    this.tmp.rotation.set(0, 0, 0);
    let p = 0;
    let pl = 0;
    let fd = 0;
    const top = this.tableTop ?? 0.79;
    w.tables.forEach((tb, k) => {
      const t = plan.tables[k];
      if (tb.chope) {
        const look = CHOPE_LOOK[tb.chope] ?? CHOPE_LOOK.tissue;
        this.tmp.position.set(t.x + 0.12, top + 0.03 + look.lift, t.z - 0.1);
        this.tmp.rotation.y = k;
        this.tmp.scale.set(...look.scale);
        this.tmp.updateMatrix();
        this.packets.setColorAt(p, this.colour.set(look.colour));
        this.packets.setMatrixAt(p++, this.tmp.matrix);
        this.tmp.scale.set(1, 1, 1);
      }
      for (let i = 0; i < Math.min(3, tb.dirty); i++) {
        this.tmp.position.set(t.x - 0.2 + i * 0.2, top + 0.03, t.z + 0.15);
        this.tmp.rotation.y = 0;
        this.tmp.updateMatrix();
        this.plates.setMatrixAt(pl++, this.tmp.matrix);
      }
    });
    for (const a of w.agents) {
      if (!a.seated || a.table === null || fd >= this.food.instanceMatrix.count) continue;
      const t = plan.tables[a.table];
      // The plate empties as they eat; nearly done, there is a scrape left.
      const left = a.state === "eat" ? Math.max(0.12, Math.min(1, a.timer / (a.meal || 60))) : 0.08;
      this.tmp.position.set(t.x + (a.x - t.x) * 0.45, top + 0.012 + 0.022 * left, t.z + (a.z - t.z) * 0.45);
      this.tmp.scale.set(0.6 + 0.4 * left, left, 0.6 + 0.4 * left);
      this.tmp.updateMatrix();
      this.tmp.scale.set(1, 1, 1);
      this.food.setMatrixAt(fd, this.tmp.matrix);
      this.food.setColorAt(fd, this.colour.set(["#e8892e", "#f2c94c", "#5a3a22", "#a8642a", "#fbf8f0", "#d9822b"][a.look % 6]));
      this.tmp.position.y = top + 0.01;
      this.tmp.updateMatrix();
      this.dinerPlates.setMatrixAt(fd, this.tmp.matrix);
      fd++;
    }
    this.packets.count = p;
    this.plates.count = pl;
    this.food.count = fd;
    this.dinerPlates.count = fd;
    for (const m of [this.packets, this.plates, this.food, this.dinerPlates]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    // Your own dishes on your table.
    const mineK = w.tables.findIndex((tb) => tb.mine && tb.food.length);
    const foodKey = mineK < 0 ? "" : `${mineK}:${w.tables[mineK].food.map((f) => f.dish).join()}`;
    if (foodKey !== this.myFoodKey) {
      this.myFoodKey = foodKey;
      this.myFood.clear();
      if (mineK >= 0) {
        const t = plan.tables[mineK];
        w.tables[mineK].food.forEach((it, i) => {
          const m = it.dish === "drink" ? makeDrink(packDrink(it.drink)) : dishModel(it.dish, it.variant);
          if (!m) return;
          // Round the table, each on its own plate or in its bowl, facing the middle.
          const a = (i / Math.max(1, w.tables[mineK].food.length)) * Math.PI * 2 + 0.4;
          m.scale.multiplyScalar(0.62);
          m.position.set(t.x + Math.cos(a) * 0.3, top, t.z + Math.sin(a) * 0.3);
          m.rotation.y = Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI;
          this.myFood.add(realiseObject(m));
        });
      }
    }

    // Fans turn, lamps flicker, the goal ring breathes.
    if (!reduceMotion) for (const f of this.fans) if (f.userData.blades) f.userData.blades.rotation.y += dt * 5;
    for (const l of this.lamps) if (l.userData.glow) l.userData.glow.material.emissiveIntensity = 2.8 + Math.sin(this.time * 13 + l.position.x) * 0.4;
    if (this.goal.visible) this.goal.material.opacity = 0.45 + Math.sin(this.time * 4) * 0.25;

    // The camera.
    const V = this.v;
    if (above) {
      // From above and behind, a little ahead of where you are going.
      const z = this.zoom;
      V.a.set(mx + me.fx * 0.8, 15 * z + 2, mz + me.fz * 0.8 + 11 * z + 1);
      this.camPos.lerp(V.a, 1 - Math.exp(-dt * 5));
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camPos.x, 0, this.camPos.z - (11 * z + 1) + 0.5);
    } else {
      const fx = Math.sin(this.yaw);
      const fz = Math.cos(this.yaw);
      const cp = Math.cos(this.pitch);
      if (eyes) {
        const seated = me.sitting !== null;
        const bob = !seated && !reduceMotion ? Math.sin(this.time * 9.5) * 0.028 * Math.min(1, me.speed / 3) : 0;
        this.camPos.set(mx + fx * 0.08, (seated ? EYE_SEATED : EYE) + bob, mz + fz * 0.08);
      } else {
        // Over the shoulder: back along the view, stopping short of walls and stalls. The distance pulls in
        // quickly when something is in the way and eases back out, so passing stalls never makes it jump.
        const dist = 3.4 * this.zoom;
        const g = plan.grid;
        let reach = dist;
        for (let s = 0.4; s <= dist; s += 0.25) {
          const x = mx - fx * cp * s;
          const zz = mz - fz * cp * s;
          const c = g.at(...g.cellOf(x, zz));
          if (c === STALL || c === WALL) {
            reach = Math.max(0.6, s - 0.35);
            break;
          }
        }
        this.reach += (reach - this.reach) * Math.min(1, dt * (reach < this.reach ? 14 : 2.5));
        const r = this.reach;
        // Fixed to you, so you never slide about in the frame; only the distance is smoothed.
        this.camPos.set(mx - fx * cp * r + -fz * 0.45, 1.7 + Math.sin(-this.pitch) * r * 0.9 + 0.35, mz - fz * cp * r + fx * 0.45);
      }
      this.camera.position.copy(this.camPos);
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.set(this.pitch, this.yaw + Math.PI, 0);
    }
    const fog = this.scene.fog;
    fog.near = above ? 45 : 28;
    fog.far = above ? 140 : 135;
    // The sun's shadow box moves in whole metres, so shadows do not shimmer as you walk.
    const sx = Math.round(mx);
    const sz = Math.round(mz);
    this.sun.position.set(sx - 18, 40, sz + 22);
    this.sun.target.position.set(sx, 0, sz);
    this.hallLight.target.position.set(sx + 4, 0, sz + 2);
    // From above the roof is a faint pane; inside, a solid ceiling with tubes.
    if (this.roof) {
      this.roof.visible = above;
      this.roof.material.opacity = 0.08;
    }
    if (this.ceiling) this.ceiling.visible = !above;
    if (this.tubes) this.tubes.visible = !above;
    // The centre's big sign fades as you get near it from above, so it never hides the hall.
    if (this.bigSign) {
      const near = Math.hypot(this.bigSign.position.x - mx, this.bigSign.position.z - mz);
      const want3 = above && near < 22 && this.bigSign.position.z > mz - 4 ? 0.12 : 1;
      this.bigSign.material.opacity += (want3 - this.bigSign.material.opacity) * Math.min(1, dt * 5);
    }
    for (const n of this.neighbours) {
      // From above: in front of you (towards the camera), or a tall block close beside you leaning into the
      // picture. Flats over the centre always stand between, so from above they are a ghost of themselves.
      const between = above && (n.over || (n.cz > me.z + 2 && n.cz < me.z + 45 && Math.abs(n.cx - me.x) < 28 && n.h > 6) || (Math.abs(n.cx - me.x) < 26 && Math.abs(n.cz - me.z) < 22 && n.h > 12));
      const want2 = between ? (n.over ? 0.12 : 0.22) : 1;
      // The live materials: the Soft and Real looks swap in their own.
      for (const o of n.objs) {
        if (Array.isArray(o.material)) for (const mm of o.material) fadeTo(mm, want2, dt);
        else fadeTo(o.material, want2, dt);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  // Screen position of a point in the world, for name tags.
  toScreen(x, y, z) {
    const v = this.v.c.set(x, y, z).project(this.camera);
    const el = this.renderer.domElement;
    const r = (this.rect ??= el.getBoundingClientRect());
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, on: v.z < 1 && v.x > -1.1 && v.x < 1.1 && v.y > -1.1 && v.y < 1.1 };
  }

  // How far a point is from the camera, for hiding far tags in the close views.
  distance(x, z) {
    return Math.hypot(x - this.camera.position.x, z - this.camera.position.z);
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose?.();
    });
    this.scene.clear();
    this.plan = null;
  }
}

// A wall of windows: white, so the building's own colour shows through, with darker windows and a
// floor line, one storey (three metres) a tile. Shophouses get shutters, offices glass bands.
const facades = new Map();
// Inside the hall's own outline (the strict test; insideOutline below also counts its edge).
const inHall = (plan, x, z) => inPolygon(x, z, plan.outline);

// An outline pulled in towards its middle by about d metres.
function shrink(outline, d) {
  const [cx, cz] = centroid(outline);
  const r = Math.max(...outline.map(([x, z]) => Math.hypot(x - cx, z - cz))) || 1;
  const k = Math.max(0.5, 1 - d / r);
  return outline.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
}

function inPolygon(x, z, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

function fadeTo(mm, want, dt) {
  if (Math.abs(mm.opacity - want) < 0.005) return;
  mm.opacity += (want - mm.opacity) * Math.min(1, dt * 6);
  mm.depthWrite = mm.opacity > 0.9;
}

// ---------- HDB blocks ----------

const STOREY = 2.8; // an HDB storey, floor to floor, near enough

const numbers = new Map();
function numberTexture(text) {
  if (numbers.has(text)) return numbers.get(text);
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#2b2d3a";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const size = text.length > 3 ? 84 : 104;
  g.font = `800 ${size}px 'Bricolage Grotesque Variable', system-ui, sans-serif`;
  g.fillText(text, 128, 70);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  numbers.set(text, t);
  return t;
}

// An HDB facade, two storeys and sixteen metres of it: a corridor parapet, a band of windows, and here and
// there washing on bamboo poles. Canvas y counts up the wall here: the extrusion's side UVs count down from
// 1 at the base, and the offset lines a storey up with the bottom of the wall.
function hdbFacade(eraId) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 256, 128);
  let seed = eraId.length * 97 + 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const CLOTHES = ["#e0607a", "#2d4f9c", "#f2c94c", "#5fae5a", "#ffffff", "#c8553d", "#7a5aa8", "#f4a259"];
  for (const y0 of [0, 64]) {
    // Bottom to top within a storey (canvas y grows upwards here): slab edge, parapet, windows, wall.
    g.fillStyle = "rgba(0,0,0,0.22)";
    g.fillRect(0, y0, 256, 3);
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.fillRect(0, y0 + 3, 256, 19);
    g.fillStyle = "rgba(0,0,0,0.08)";
    g.fillRect(0, y0 + 21, 256, 2);
    for (let x = 4; x < 256; x += 32) {
      g.fillStyle = "rgba(38,44,58,0.55)";
      g.fillRect(x, y0 + 26, 24, 26);
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(x + 11, y0 + 26, 2, 26);
      // Washing on a pole out of some windows.
      if (rnd() < 0.4) {
        g.fillStyle = "#8a6a3a";
        g.fillRect(x - 4, y0 + 40, 32, 2);
        for (let k = 0; k < 4; k++) {
          if (rnd() < 0.25) continue;
          g.fillStyle = CLOTHES[Math.floor(rnd() * CLOTHES.length)];
          const w = 4 + Math.floor(rnd() * 4);
          g.fillRect(x - 2 + k * 8, y0 + 40 - 12, w, 12);
        }
      }
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(1 / 16, 1 / (STOREY * 2));
  t.offset.set(0, -1 / (STOREY * 2));
  return t;
}

function facadeTexture(kind, eraId) {
  const key = `${kind}${eraId}`;
  if (facades.has(key)) return facades.get(key);
  if (kind === "hdb") {
    const t = hdbFacade(eraId);
    facades.set(key, t);
    return t;
  }
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "rgba(0,0,0,0.18)";
  g.fillRect(0, 58, 64, 6);
  if (kind === "office") {
    g.fillStyle = "rgba(40,70,100,0.45)";
    g.fillRect(0, 10, 64, 38);
  } else if (kind === "shophouse") {
    g.fillStyle = "rgba(60,90,70,0.55)";
    for (const x of [10, 38]) g.fillRect(x, 14, 16, 30);
  } else if (kind !== "carpark") {
    g.fillStyle = "rgba(40,40,50,0.4)";
    for (const x of [6, 26, 46]) g.fillRect(x, 16, 12, 22);
  } else {
    g.fillStyle = "rgba(0,0,0,0.3)";
    g.fillRect(0, 20, 64, 22);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(1 / 4, 1 / 3);
  facades.set(key, t);
  return t;
}

function insideOutline(plan, x, z) {
  let inside = false;
  const poly = plan.outline;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  // Wall cells sit on the edge; count anything within half a metre of the outline as inside.
  if (inside) return true;
  for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
    let ins = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i];
      const [xj, zj] = poly[j];
      if (zi > z + dz !== zj > z + dz && x + dx < ((xj - xi) * (z + dz - zi)) / (zj - zi) + xi) ins = !ins;
    }
    if (ins) return true;
  }
  return false;
}
