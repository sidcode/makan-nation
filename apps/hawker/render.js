// Draws the kitchen from snapshots. It never decides anything, so hosts and guests draw the same way.
import {
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  PointLight,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PCFShadowMap,
  PlaneGeometry,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect.js";
import { eraById } from "./eras.js";
import { ROLES } from "./helpers.js";
import { levelById, parseLevel } from "./levels.js";
import {
  ceilingFan,
  CHEF_COLORS,
  stallRow,
  tree,
  hdbBlock,
  kerosene,
  planter,
  pushcart,
  queueBoard,
  rediffusionBox,
  robot,
  setEraLook,
  shophouses,
  solarCanopy,
  itemKey,
  makeCat,
  makeItem,
  makeStation,
  makeStool,
  makeTable,
  mat,
  menuBoard,
  mesh,
  plateStack,
  puddle,
  TOP,
  trishaw,
} from "./models.js";
import { humanStyle, makeChef, makeCustomer, makePerson } from "./people.js";
import { poseHuman } from "./humans.js";
import { appOf } from "./delivery.js";
import { buildCentre, timeLook } from "./centrekit.js";
import { regularsFor } from "./chefs.js";
import { DISHES } from "./dishes.js";
import { money } from "./eras.js";
import { terrazzo } from "./textures.js";
import { gpuReset, isToon, realise, skyFor } from "./realism.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TABLE_FOOD = ["#e8892e", "#f2c94c", "#5a3a22", "#a8642a", "#fbf8f0", "#d9822b"];

export class KitchenView {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    // three.js re-uploads meshes and textures when the browser hands a lost context back; the sky light
    // maps are drawn on the GPU, so they are redrawn here.
    canvas.addEventListener("webglcontextrestored", () => {
      gpuReset();
      this.relook();
      this.onRestore?.();
    });
    this.frames = [];
    this.fps = 0;
    // Quality: 2 high, 1 medium, 0 low. Phones and small screens start on Medium, very slow devices on
    // Low, and on Auto it steps down if frames drag. A chosen tier stays put.
    const cores = navigator.hardwareConcurrency ?? 8;
    const memory = navigator.deviceMemory ?? 8;
    const small = Math.min(innerWidth, innerHeight) < 520 || cores <= 4;
    this.autoLevel = cores <= 2 || memory <= 2 ? 0 : small ? 1 : 2;
    this.auto = true;
    this.setQuality(this.autoLevel);
    this.insets = { top: 120, bottom: 0, left: 0, right: 0 };
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.effect = new OutlineEffect(this.renderer, { defaultThickness: 0.004, defaultColor: [0.17, 0.1, 0.07] });
    this.scene = new Scene();
    this.scene.background = new Color("#f3e3c3");
    this.camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    this.shake = 0;
    this.particles = [];
    this.chefs = new Map();
    this.local = new Set();
    this.time = 0;
  }

  // level: 0 Low, 1 Medium, 2 High. auto: let the frame rate lower it.
  setQuality(level, { auto = this.auto } = {}) {
    this.auto = auto;
    this.qualityLevel = Math.max(0, Math.min(2, level));
    const dpr = devicePixelRatio || 1;
    this.quality = [
      { name: "Low", ratio: 1, pixels: 1.0e6, shadow: 512, soft: 1, particles: 0.35, shadows: false, outline: false, post: false, rim: false, ao: false },
      { name: "Medium", ratio: Math.min(dpr, 1.5), pixels: 2.4e6, shadow: 1024, soft: 3, particles: 0.65, shadows: true, outline: true, post: false, rim: true, ao: true },
      { name: "High", ratio: Math.min(dpr, 2), pixels: 4.6e6, shadow: 2048, soft: 4, particles: 1, shadows: true, outline: true, post: true, rim: true, ao: true },
    ][this.qualityLevel];
    const q = this.quality;
    this.renderer.setPixelRatio(this.ratioFor());
    this.renderer.shadowMap.enabled = q.shadows;
    if (this.sun) {
      this.sun.castShadow = q.shadows;
      this.sun.shadow.mapSize.set(q.shadow, q.shadow);
      this.sun.shadow.radius = q.soft;
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    if (this.rim) this.rim.visible = q.rim;
    if (this.aoBlobs) this.aoBlobs.visible = q.ao;
    // Bloom and grading load only when High is first used.
    if (q.post && !this.post && !this.postLoading) {
      this.postLoading = import("./post.js")
        .then((m) => {
          this.post = m.makePost(this.renderer, this.scene, this.camera, this.effect, () => !isToon());
          this.post.setEra(this.era?.id);
          this.fit();
        })
        .catch(() => (this.postFailed = true));
    }
    this.frames = [];
    this.fit?.();
  }

  // The tier's pixel ratio, capped so a big screen never draws more than the tier's pixel budget.
  ratioFor(w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight) {
    const q = this.quality;
    return Math.max(0.6, Math.min(q.ratio, Math.sqrt(q.pixels / Math.max(1, w * h))));
  }

  // Frame times, for the fps readout and for stepping Auto down when frames drag. Every mode calls it.
  track(dt) {
    this.frames.push(dt);
    if (this.frames.length > 120) {
      const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
      this.frames = [];
      this.fps = Math.round(1 / avg);
      if (this.auto && avg > 1 / 38 && this.qualityLevel > 0) {
        this.setQuality(this.qualityLevel - 1);
        this.onQuality?.(this.qualityLevel);
      }
    }
  }

  setInsets(insets) {
    this.insets = { top: 0, bottom: 0, left: 0, right: 0, ...insets };
    this.fit();
  }

  // opts: { menu, prices } when a stall in the Centre Manager has its own menu and prices.
  // preset: how the hawker centre around the stall looks (centrelook.presetFor), or null for the era's own.
  load(levelId, eraId = "today", { menu = null, prices = null, no = null, preset = null } = {}) {
    this.loadArgs = [levelId, eraId, { menu, prices, no, preset }];
    this.peopleStyle = humanStyle();
    const level = levelById(levelId);
    const era = eraById(eraId);
    const time = preset ? timeLook(preset.time, era.look) : null;
    const look = time ? { ...era.look, ...time } : era.look;
    this.preset = preset;
    const map = parseLevel(level);
    this.level = level;
    this.era = era;
    this.map = map;
    const scene = this.scene;
    scene.clear();
    this.chefs.clear();
    this.riders = new Map();
    this.particles = [];
    this.fans = [];
    this.customers = [];
    this.tableBowls = [];
    this.lamps = [];
    setEraLook(era);
    scene.background = new Color(look.sky);
    // Haze over the far side of the hall, thicker in the old days.
    const haze = { "1950s": [27, 52], "1980s": [31, 62], today: [34, 72], 2065: [34, 78] }[era.id] ?? [34, 72];
    scene.fog = new Fog(look.sky, haze[0], haze[1]);
    this.post?.setEra(era.id);

    this.hemi = new HemisphereLight(look.hemiSky, look.hemiGround, look.hemi);
    this.hemiPower = this.baseHemi = look.hemi;
    this.dim = 1;
    scene.add(this.hemi);
    const sun = new DirectionalLight(look.sun, look.sunPower);
    sun.position.set(map.w / 2 - 5, 14, map.h / 2 + 7);
    sun.target.position.set(map.w / 2, 0, map.h / 2);
    sun.castShadow = this.quality.shadows;
    sun.shadow.mapSize.set(this.quality.shadow, this.quality.shadow);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
    sun.shadow.bias = -0.0005;
    sun.shadow.radius = 3;
    sun.shadow.radius = this.quality.soft;
    scene.add(sun, sun.target);
    this.sun = sun;
    this.sunPower = look.sunPower;
    // Evenings: the stall's own lights keep the kitchen readable.
    if (look.key) {
      const key = new PointLight(look.key, look.keyPower ?? 30, 22, 1.2);
      key.position.set(map.w / 2, 6, map.h / 2);
      scene.add(key);
    }
    // A rim light from behind picks out shoulders and counter edges.
    const rim = new DirectionalLight({ "1950s": "#ffcf8a", "1980s": "#fff0d0", today: "#fff7e8", 2065: "#c8f4ff" }[era.id] ?? "#fff7e8", era.id === "1950s" ? 0.9 : 0.6);
    rim.position.set(map.w / 2 + 3, 7, -9);
    rim.target.position.set(map.w / 2, 0, map.h / 2);
    rim.visible = this.quality.rim;
    scene.add(rim, rim.target);
    this.rim = rim;

    // Floors: terrazzo in the stall, the dining area behind the hatch, ground beyond.
    const kitchenTex = terrazzo(look.floor, 1965);
    kitchenTex.wrapS = kitchenTex.wrapT = RepeatWrapping;
    kitchenTex.repeat.set(map.w / 3, map.h / 3);
    const floor = new Mesh(new PlaneGeometry(map.w, map.h), mat("#ffffff", { map: kitchenTex, outline: false, surface: era.id === "1950s" ? "concrete" : "floortiles" }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(map.w / 2, 0, map.h / 2);
    floor.receiveShadow = true;
    const hallColour = shade(preset && preset.archetype !== "street" ? preset.colours.floor : look.hall, look.shade ?? 1);
    const street = era.id === "1950s" && !(preset && preset.archetype !== "street");
    const hallMat = street ? mat(hallColour, { outline: false, surface: "asphalt" }) : mat("#ffffff", { map: hallTexture(hallColour, map), outline: false, surface: "terrazzo" });
    const hall = new Mesh(new PlaneGeometry(map.w + 8, 5), hallMat);
    hall.rotation.x = -Math.PI / 2;
    hall.position.set(map.w / 2, -0.01, -2.5);
    hall.receiveShadow = true;
    const ground = new Mesh(new PlaneGeometry(60, 60), mat(look.ground, { outline: false, surface: street ? "asphalt" : "concrete" }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(map.w / 2, -0.02, map.h / 2);
    ground.receiveShadow = true;
    scene.add(floor, hall, ground);

    // Stations.
    this.stationViews = map.stations.map((st) => {
      const g = makeStation(st, level);
      const top = new Group();
      top.position.y = st.type === "wok" ? 1.0 : st.type === "pot" ? 1.12 : st.type === "grill" ? 0.98 : st.type === "cooker" ? 1.3 : TOP;
      g.add(top);
      const bar = progressRing();
      bar.position.y = 1.8;
      bar.visible = false;
      g.add(bar);
      scene.add(g);
      return { st, g, top, bar, key: "", stackKey: "" };
    });

    this.decorate(level, map, era, preset);
    this.contactShadows(map);
    // The menu board, hung over the far end of the counter from the serving hatch.
    const dishes = (menu ?? level.dishes).filter((d) => DISHES[d]);
    const lines = dishes.map((d) => [DISHES[d].name, money(prices?.[d] ?? DISHES[d].price * era.price)]);
    const board = menuBoard(level, era, lines, no);
    const hatchX = map.stations.filter((st) => st.type === "hatch").reduce((a, st, _, all) => a + (st.x + 0.5) / all.length, 0);
    board.position.set(hatchX < map.w / 2 ? map.w - 2.4 : 2.4, 2.85, 0.05);
    board.rotation.x = -0.3;
    scene.add(board);
    this.highlight = new Group();
    scene.add(this.highlight);
    this.buildHints();
    this.flyers = new Group();
    this.puddles = new Group();
    scene.add(this.flyers, this.puddles);
    this.flyKeys = [];
    this.puddleKey = "";
    this.obstacle = trishaw();
    this.obstacle.visible = false;
    scene.add(this.obstacle);
    this.fit();
    this.relook();
  }

  // The work a cook is doing at the station they face, for human cooks' arms.
  stationAct(v) {
    const i = Math.floor(v.x + v.fx * 0.75);
    const j = Math.floor(v.z + v.fz * 0.75);
    const st = this.map?.stations.find((s) => s.x === i && s.z === j);
    return { board: "chop", wok: "wok", pot: "blanch", cooker: "scoop", grill: "fan", urn: "pull", shaver: "shave", press: "shave", sink: "wipe" }[st?.type] ?? "scoop";
  }

  // Cartoon, Soft or Real (realism.js): turns the built scene's materials and sky light over.
  relook() {
    if (!this.map) return;
    // Switching between Cartoon and the other looks changes the people's build too, so the stall is set up again.
    if (this.peopleStyle !== humanStyle() && this.loadArgs) return this.load(...this.loadArgs);
    const time = this.preset?.time ?? null;
    const street = this.era.id === "1950s" && (!this.preset || this.preset.archetype === "street");
    this.hemiPower = (this.baseHemi ?? 1) * realise(this.scene, this.renderer, { time: skyFor(time, this.era.id), indoor: !street });
  }

  // The dining area behind the hatch, dressed for the era, with regulars and a cat.
  decorate(level, map, era, preset = null) {
    const scene = this.scene;
    const regulars = regularsFor(era.id, 16, 11 + level.id.length);
    let r = 0;
    const tables = [];
    for (let i = 0; i < 4; i++) tables.push([1.6 + i * ((map.w - 3.2) / 3), -2.2 - (i % 2) * 1.2]);
    this.tablesAt = tables;
    tables.forEach(([x, z], i) => {
      const street = !preset || preset.archetype === "street";
      const t = makeTable(street ? era : { id: era.id === "1950s" ? "today" : era.id }, preset?.colours.table ?? null);
      t.position.set(x, 0, z);
      scene.add(t);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.6;
        const s = makeStool(street ? era : { id: era.id === "1950s" ? "today" : era.id }, preset?.colours.stool ?? null);
        s.position.set(x + Math.cos(a) * 0.85, 0, z + Math.sin(a) * 0.85);
        scene.add(s);
        if ((i + k) % 3 !== 1) {
          const c = makeCustomer(regulars[r++ % regulars.length]);
          const y = era.id === "1950s" ? -0.06 : 0.1;
          c.position.set(x + Math.cos(a) * 0.85, y, z + Math.sin(a) * 0.85);
          c.lookAt(x, y, z);
          c.userData.bob = Math.random() * 6;
          c.userData.y = y;
          // A bowl in front of them, and a spoon on its way up and down.
          const top = era.id === "1950s" ? 0.53 : 0.75;
          if (c.userData.human) {
            // Their hips already rest at stool height; the old street stools are lower.
            c.position.y = 0;
            c.userData.y = 0;
            if (street && era.id === "1950s") c.userData.body.position.y -= 0.11;
          }
          const bx = x + Math.cos(a) * 0.42;
          const bz = z + Math.sin(a) * 0.42;
          const dish = new Group();
          dish.add(mesh("bowl", mat("#fffdf7"), { pos: [0, 0.07, 0], scale: [0.11, 0.07, 0.11], rot: [Math.PI, 0, 0] }), mesh("cyl", mat(TABLE_FOOD[(i + k) % TABLE_FOOD.length]), { pos: [0, 0.065, 0], scale: [0.095, 0.01, 0.095], shadow: false }));
          dish.position.set(bx, top, bz);
          scene.add(dish);
          this.tableBowls.push(dish);
          if (!c.userData.human) {
            const hand = mesh("sphere", mat(c.userData.skin ?? "#c68642"), { pos: [0.1, 0.62, 0.2], scale: [0.05, 0.05, 0.05], shadow: false });
            hand.add(mesh("cyl8", mat("#d9dde0"), { pos: [0, 0.6, 0.9], scale: [0.25, 2.2, 0.25], rot: [1.2, 0, 0], shadow: false }));
            c.userData.body.add(hand);
            c.userData.hand = hand;
          }
          scene.add(c);
          this.customers.push(c);
        }
      }
      if (i === 1) {
        // A packet of tissue on the table means the seat is taken. Chope!
        scene.add(mesh("box", mat("#ffffff"), { pos: [x + 0.2, era.id === "1950s" ? 0.55 : 0.78, z], scale: [0.16, 0.05, 0.1] }));
      }
    });
    this.cat = makeCat();
    this.cat.position.set(map.w - 1.2, 0, -0.9);
    this.cat.rotation.y = -0.6;
    scene.add(this.cat);

    this.smokeSpots = [];
    if (preset) {
      this.decorateCentre(map, era, preset, tables);
      return;
    }
    if (era.id === "1950s") {
      // Shophouses on either side of the stall, where wide screens have room to show them.
      for (const [x, colors] of [[-7.4, ["#e8c46a", "#9fc4b0"]], [map.w + 4.2, ["#e8a08a", "#c4b0d8"]]]) {
        const row = shophouses(3, colors);
        row.position.set(x, 0, -0.8);
        scene.add(row);
      }
      for (const x of [1, map.w / 2, map.w - 1]) {
        const lamp = kerosene();
        const glow = lamp.children[1];
        glow.material = glow.material.clone();
        glow.material.emissiveIntensity = 3;
        lamp.userData.glow = glow;
        lamp.position.set(x, 1.95, 0.2);
        scene.add(lamp);
        this.lamps.push(lamp);
      }
      const cart = pushcart();
      cart.position.set(-1.6, 0, 2.5);
      cart.rotation.y = 0.5;
      scene.add(cart);
    } else {
      for (const x of [-0.6, map.w + 0.6]) {
        const pillar = mesh("box", mat(era.id === "2065" ? "#e8f1ee" : "#bfe3d0"), { pos: [x, 1.6, -1.5], scale: [0.5, 3.2, 0.5] });
        scene.add(pillar);
      }
    }
    if (era.id === "1980s") {
      for (const [x, c] of [[-4.6, "#e8c46a"], [map.w + 4.6, "#9fc4b0"]]) {
        const b = hdbBlock(c);
        b.scale.setScalar(0.8);
        b.position.set(x, 0, 0.2);
        scene.add(b);
      }
      for (const [x, z] of tables) {
        const fan = ceilingFan();
        fan.position.set(x, 3.2, z);
        scene.add(fan);
        this.fans.push(fan);
      }
      const box = rediffusionBox();
      box.position.set(-0.6, 2.2, -1.2);
      scene.add(box);
    }
    if (era.id === "today") {
      const board = queueBoard(23);
      board.position.set(map.w / 2 + 3.2, 2.6, -0.3);
      scene.add(board);
    }
    // The rest of the hawker centre behind the dining area, and trees on the sides for wide screens.
    if (era.id === "1950s") {
      const row = shophouses(map.w + 14, ["#e8a08a", "#9fc4b0", "#e8c46a", "#c4b0d8"]);
      row.position.set(-7, 0, -8.4);
      scene.add(row);
    } else {
      const row = stallRow(era, Math.ceil((map.w + 10) / 2.3));
      row.position.set(-5, 0, -5.6);
      scene.add(row);
    }
    for (const [x, z, h] of [[-2.6, 1.5, 3.2], [-4.4, 5.2, 3.8], [map.w + 2.6, 2.4, 3.4], [map.w + 4.6, 6.4, 3.0]]) {
      const t = tree(era, h);
      t.position.set(x, 0, z);
      t.rotation.y = x;
      scene.add(t);
    }
    if (era.id === "2065") {
      const canopy = solarCanopy(map.w + 4);
      canopy.position.set(-1.2, 3.6, -2.6);
      scene.add(canopy);
      for (const x of [-1.4, map.w + 1.4]) {
        const p = planter();
        p.position.set(x, 0, 1);
        scene.add(p);
      }
      const r = robot();
      r.position.set(map.w + 1.2, 0, -2.5);
      scene.add(r);
      this.fans.push(r);
    }
  }

  // A named hawker centre: its own building from the kit, with the era's props on top.
  decorateCentre(map, era, preset, tables) {
    const scene = this.scene;
    const kit = buildCentre(preset, { map, era, tables });
    scene.add(kit.group);
    this.fans.push(...kit.fans);
    this.smokeSpots = kit.smoke;
    if (era.id === "1950s" && preset.archetype === "street") {
      for (const x of [1, map.w / 2, map.w - 1]) {
        const lamp = kerosene();
        const glow = lamp.children[1];
        glow.material = glow.material.clone();
        glow.material.emissiveIntensity = 3;
        lamp.userData.glow = glow;
        lamp.position.set(x, 1.95, 0.2);
        scene.add(lamp);
        this.lamps.push(lamp);
      }
      const cart = pushcart();
      cart.position.set(-1.6, 0, 2.5);
      cart.rotation.y = 0.5;
      scene.add(cart);
    }
    if (era.id === "1980s") {
      const box = rediffusionBox();
      box.position.set(-0.6, 2.2, -1.4);
      scene.add(box);
    }
    if (era.id === "today") {
      const board = queueBoard(23);
      board.position.set(map.w / 2 + 3.2, 2.4, -0.3);
      scene.add(board);
    }
    if (era.id === "2065") {
      if (!["modern", "complex", "openair"].includes(preset.archetype)) {
        const canopy = solarCanopy(map.w + 4);
        canopy.position.set(-1.2, 4.2, -2.6);
        scene.add(canopy);
      }
      const r = robot();
      r.position.set(map.w + 1.2, 0, -2.5);
      scene.add(r);
      this.fans.push(r);
    }
  }

  fit() {
    if (!this.map) return;
    const w = this.canvas.clientWidth || innerWidth;
    const h = this.canvas.clientHeight || innerHeight;
    const pr = this.ratioFor(w, h);
    if (this.renderer.getPixelRatio() !== pr) this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.post?.setSize(w, h, pr);
    const { map } = this;
    const center = new Vector3(map.w / 2, 0, map.h / 2 - 0.8);
    const dir = new Vector3(0, 0.95, 1).normalize();
    this.camera.position.copy(center).addScaledVector(dir, 30);
    this.camera.lookAt(center);
    this.camera.updateMatrixWorld();
    // Fit the stall plus a slice of the dining hall into view.
    const pts = [];
    for (const x of [-0.4, map.w + 0.4]) for (const z of [-2.4, map.h + 0.6]) for (const y of [0, 1.6]) pts.push(new Vector3(x, y, z));
    const inv = this.camera.matrixWorldInverse;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      p.applyMatrix4(inv);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    // Leave room for the order tickets and, on touch screens, for thumbs.
    const { top, bottom, left, right } = this.insets;
    const freeY = Math.max(0.3, 1 - (top + bottom) / h);
    const freeX = Math.max(0.3, 1 - (left + right) / w);
    const spanX = (maxX - minX) / freeX;
    const spanY = (maxY - minY) / freeY;
    const aspect = w / h;
    let halfW = spanX / 2;
    let halfH = spanY / 2;
    if (halfW / halfH < aspect) halfW = halfH * aspect;
    else halfH = halfW / aspect;
    const cx = (minX + maxX) / 2 - ((left - right) / w) * halfW;
    const cy = (minY + maxY) / 2 + ((top - bottom) / h) * halfH;
    Object.assign(this.camera, { left: cx - halfW, right: cx + halfW, top: cy + halfH, bottom: cy - halfH });
    this.camera.updateProjectionMatrix();
    this.base = this.camera.position.clone();
    this.camStamp = (this.camStamp ?? 0) + 1;
  }

  // ---------- Applying a snapshot ----------

  apply(snap, { localSlots = [], targets = [] } = {}) {
    if (!this.map || !snap) return;
    this.local = new Set(localSlots);
    this.placeRiders(snap);
    const seen = new Set();
    for (const [slot, x, z, fx, fz, hold, using, speed, role, , who] of snap.c) {
      seen.add(slot);
      let v = this.chefs.get(slot);
      if (!v) {
        const g = role && ROLES[role] ? makeChef(slot, { helper: ROLES[role], helperName: who }) : makeChef(slot, { chef: who });
        g.scale.setScalar(1.22);
        g.position.set(x, 0, z);
        const blob = new Mesh(blobGeo, blobMat);
        blob.scale.setScalar(0.62);
        blob.position.y = 0.012;
        blob.renderOrder = 1;
        g.add(blob);
        this.scene.add(g);
        v = { g, x, z, fx, fz, speed: 0, using: 0, heading: Math.atan2(fx, fz) };
        this.chefs.set(slot, v);
      }
      Object.assign(v, { x, z, fx, fz, speed, using });
      const key = itemKey(hold);
      if (key !== v.g.userData.key) {
        v.g.userData.key = key;
        const h = v.g.userData.hold;
        h.clear();
        const m = makeItem(hold);
        if (m) h.add(m);
        if (m) pop(m);
        v.squash = 1;
      }
      if (snap.c.find((r) => r[0] === slot)?.[9]) v.dashing = 1;
    }
    for (const [slot, v] of this.chefs) {
      if (!seen.has(slot)) {
        this.scene.remove(v.g);
        this.chefs.delete(slot);
      }
    }

    snap.s.forEach((s, i) => {
      const view = this.stationViews[i];
      if (!view) return;
      const { st, top, bar, g } = view;
      const parts = g.userData.parts;
      // What sits on top.
      const shown = s.out ?? s.it ?? (s.in ? { k: "pile", in: s.in } : null);
      const key = shown ? JSON.stringify(shown) : "";
      if (key !== view.key) {
        view.key = key;
        top.clear();
        if (shown?.k === "pile") {
          shown.in.forEach((k, n) => {
            const m = makeItem({ k, s: "", b: 0 });
            m.position.set((n - (shown.in.length - 1) / 2) * 0.16, 0, 0);
            m.scale.setScalar(0.8);
            top.add(m);
          });
        } else if (shown) {
          const m = makeItem(shown);
          top.add(m);
          pop(m);
        }
      }
      // Plate stacks.
      if (parts.stack) {
        const sk = `${s.n ?? 0}`;
        if (sk !== view.stackKey) {
          view.stackKey = sk;
          parts.stack.clear();
          parts.stack.add(plateStack(s.n ?? 0, st.type !== "rack"));
        }
      }
      // Heat and progress.
      const cooking = s.ck !== undefined;
      const hot = cooking || (s.out && !s.out.b);
      if (parts.flame) parts.flame.visible = Boolean(hot);
      if (parts.coals) parts.coals.material = hot ? parts.coalsOn : parts.coalsOff;
      if (parts.light) parts.light.material = cooking ? parts.lightOn : parts.lightOff;
      if (parts.soup) {
        parts.soup.visible = Boolean(s.in || s.out);
        parts.soup.material = mat(s.out?.k === "laksa" ? "#e8892e" : s.out?.b ? "#3a2a22" : "#f3e9cf", { outline: false });
      }
      const p = s.p ?? s.ck ?? s.se ?? (s.w !== undefined ? 1 : undefined);
      bar.visible = p !== undefined && !s.fi;
      if (bar.visible) {
        const fill = bar.userData.fill;
        fill.geometry = ringGeo(s.w !== undefined ? 1 - s.w : p);
        fill.material = s.w !== undefined ? (Math.floor(this.time * 6) % 2 ? warnA : warnB) : cooking ? cookMat : s.se !== undefined ? settleMat : workMat;
        bar.userData.warn.visible = s.w !== undefined && Math.floor(this.time * 6) % 2 === 0;
      }
      view.cooking = cooking;
      view.burnt = Boolean(s.out?.b);
      // Fire.
      view.fireLevel = s.fi ?? 0;
      if (view.fireLevel && !view.fire) {
        view.fire = flames();
        view.fire.position.y = 1.0;
        view.g.add(view.fire);
      }
      if (view.fire) view.fire.visible = view.fireLevel > 0;
    });

    // Show what each local chef is facing.
    const rings = this.highlight.children;
    while (rings.length < targets.length) {
      const ring = new Mesh(highlightGeo, highlightMat(CHEF_COLORS[0]));
      ring.rotation.x = -Math.PI / 2;
      this.highlight.add(ring);
    }
    rings.forEach((ring, n) => {
      const t = targets[n];
      ring.visible = Boolean(t);
      if (!t) return;
      ring.material = highlightMat(CHEF_COLORS[t.slot % 4]);
      ring.position.set(t.x + 0.5, t.type === "bin" ? 0.86 : TOP + 0.02, t.z + 0.5);
    });

    // Ingredients in the air.
    const fl = snap.f ?? [];
    fl.forEach(([x, y, z, it], n) => {
      const key = itemKey(it);
      let g = this.flyers.children[n];
      if (!g || this.flyKeys[n] !== key) {
        if (g) this.flyers.remove(g);
        g = makeItem(it);
        this.flyers.add(g);
        this.flyKeys[n] = key;
      }
      g.position.set(x, y, z);
      g.rotation.y += 0.3;
    });
    while (this.flyers.children.length > fl.length) {
      this.flyers.remove(this.flyers.children[this.flyers.children.length - 1]);
      this.flyKeys.length = this.flyers.children.length;
    }
    // A trishaw cutting through, puddles, the lights in a power cut.
    this.obstacle.visible = Boolean(snap.ob);
    if (snap.ob) this.obstacle.position.set(snap.ob[0], 0, snap.ob[1]);
    const pk = JSON.stringify(snap.pd ?? []);
    if (pk !== this.puddleKey) {
      this.puddleKey = pk;
      this.puddles.clear();
      for (const [x, z, w, h] of snap.pd ?? []) {
        const p = puddle();
        p.scale.set(w * 0.55, 0.01, h * 0.5);
        p.position.set(x + w / 2, 0.02, z + h / 2);
        this.puddles.add(p);
      }
    }
    this.dimTo = snap.pc ? 0.3 : 1;
  }

  // Soft dark blobs at the foot of stations, tables and stools: cheap contact shadows that read as
  // ambient occlusion where counters meet the floor. Medium and High only; chefs always get one.
  // Delivery riders wait just behind the hatch, one for each app order, until it is served or given up.
  placeRiders(snap) {
    const want = new Set();
    const hatches = this.map.stations.filter((s) => s.type === "hatch");
    const hx = hatches.length ? hatches.reduce((a, s) => a + s.x + 0.5, 0) / hatches.length : this.map.w / 2;
    let k = 0;
    for (const row of snap.o ?? []) {
      const app = appOf(row[8]);
      if (!app) continue;
      want.add(row[0]);
      let g = this.riders.get(row[0]);
      if (!g) {
        const skin = ["#f1c9a5", "#c68642", "#8d5524", "#e0ac69"][row[0] % 4];
        g = makePerson({ top: ["tshirt", app.colour], bottom: ["trousers", "#2b2b3a"], hair: ["short", "#1d1410"], head: ["cap", app.colour], skin });
        const back = g.userData.human ? [1.18, -0.28, 0.4] : [0.62, -0.22, 0.38];
        g.userData.body.add(mesh("box", mat(app.colour), { pos: [0, back[0], back[1]], scale: [back[2], 0.36, 0.26] }), mesh("box", mat("#ffffff"), { pos: [0, back[0] + 0.06, back[1] - 0.135], scale: [0.2, 0.08, 0.01], shadow: false }));
        g.scale.setScalar(1.22);
        this.scene.add(g);
        this.riders.set(row[0], g);
        pop(g);
      }
      const side = k % 2 ? 1 : -1;
      g.position.set(hx + side * (1.0 + Math.floor(k / 2) * 0.8), 0, -0.75);
      g.rotation.y = 0;
      k++;
    }
    for (const [id, g] of this.riders) {
      if (want.has(id)) continue;
      this.scene.remove(g);
      this.riders.delete(id);
    }
  }

  contactShadows(map) {
    const spots = map.stations.map((st) => [st.x + 0.5, st.z + 0.5, 1.45]);
    for (const c of this.customers ?? []) spots.push([c.position.x, c.position.z, 0.7]);
    for (const t of this.tablesAt ?? []) spots.push([t[0], t[1], 1.6]);
    const inst = new InstancedMesh(blobGeo, blobMat, spots.length);
    const m = new Matrix4();
    spots.forEach(([x, z, size], i) => {
      m.makeScale(size, 1, size).setPosition(x, 0.006, z);
      inst.setMatrixAt(i, m);
    });
    inst.renderOrder = 1;
    inst.visible = this.quality.ao;
    this.scene.add(inst);
    this.aoBlobs = inst;
  }

  // ---------- Hints: pulses, arrows, dotted paths, pings ----------

  buildHints() {
    this.pulseRings = new Group();
    this.arrows = new Group();
    this.pings = [];
    this.pulse = [];
    this.guides = [];
    this.dots = new InstancedMesh(dotGeo, dotMat, 260);
    this.dots.count = 0;
    this.dots.frustumCulled = false;
    this.dots.renderOrder = 2;
    this.scene.add(this.pulseRings, this.arrows, this.dots);
  }

  // pulse: station indices the oldest ticket needs. guides: [{ slot, st, act, path }] for your chefs.
  setHints({ pulse = [], guides = [] } = {}) {
    this.pulse = pulse;
    this.guides = guides;
  }

  topOf(st) {
    return st.type === "crate" ? 0.9 : st.type === "bin" ? 0.86 : TOP + 0.04;
  }

  // Rings on the stations a ticket part needs. The first one also nudges the camera if it is hidden.
  ping(indices) {
    if (!this.map) return;
    indices.slice(0, 8).forEach((i, n) => {
      const st = this.map.stations[i];
      if (!st) return;
      for (let k = 0; k < (n === 0 ? 2 : 1); k++) {
        const m = new Mesh(pingGeo, pingMat.clone());
        m.position.set(st.x + 0.5, this.topOf(st) + 0.02, st.z + 0.5);
        m.visible = false;
        m.renderOrder = 3;
        this.scene.add(m);
        this.pings.push({ m, t: -n * 0.07 - k * 0.28 });
      }
    });
    const first = this.map.stations[indices[0]];
    if (first) this.nudgeTo(first.x + 0.5, 1, first.z + 0.5);
  }

  // If a point sits under the tickets or the thumbs, slide the camera over for a moment.
  nudgeTo(x, y, z) {
    if (!this.base || reduceMotion) return;
    this.camera.position.copy(this.base);
    this.camera.updateMatrixWorld();
    const [sx, sy] = this.toScreen(x, y, z);
    const r = this.canvas.getBoundingClientRect();
    const { top, bottom, left, right } = this.insets;
    const pad = 36;
    const want = [Math.min(Math.max(sx, r.left + left + pad), r.right - right - pad), Math.min(Math.max(sy, r.top + top + pad), r.bottom - bottom - pad)];
    const dx = sx - want[0];
    const dy = want[1] - sy;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
    const perPx = (this.camera.right - this.camera.left) / Math.max(1, r.width);
    const off = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0).multiplyScalar(dx * perPx);
    off.addScaledVector(new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1), dy * perPx);
    this.nudge = { off, t: 0 };
  }

  drawHints(dt) {
    const t = this.time;
    // Pulses on what the oldest ticket needs.
    const rings = this.pulseRings.children;
    while (rings.length < this.pulse.length) {
      const m = new Mesh(pulseGeo, pulseMat);
      m.renderOrder = 2;
      this.pulseRings.add(m);
    }
    pulseMat.opacity = 0.45 + Math.sin(t * 4) * 0.25;
    rings.forEach((m, n) => {
      const st = this.map.stations[this.pulse[n]];
      m.visible = Boolean(st);
      if (!st) return;
      m.position.set(st.x + 0.5, this.topOf(st) + 0.01, st.z + 0.5);
      m.scale.setScalar(reduceMotion ? 1 : 1 + Math.sin(t * 4) * 0.04);
    });
    // An arrow over each chef's next step, and a dotted path on the floor to it.
    const arrows = this.arrows.children;
    while (arrows.length < this.guides.length) this.arrows.add(makeArrow());
    let dots = 0;
    arrows.forEach((a, n) => {
      const g = this.guides[n];
      const st = g && this.map.stations[g.st];
      a.visible = Boolean(st);
      if (!st) return;
      const color = CHEF_COLORS[g.slot % 4];
      if (a.userData.color !== color) {
        a.userData.color = color;
        a.userData.cone.material = mat(color);
        a.userData.shaft.material = mat(color);
      }
      const bob = reduceMotion ? 0 : Math.abs(Math.sin(t * 4 + n)) * 0.14;
      a.position.set(st.x + 0.5, 1.75 + bob, st.z + 0.5);
      a.scale.setScalar(g.act === "wait" ? 0.7 : 1);
      a.rotation.y += dt * 1.5;
      // The path: from the chef, through the tiles, to the edge of the station.
      const chef = this.chefs.get(g.slot)?.g;
      if (!chef || !g.path?.length) return;
      const pts = [[chef.position.x, chef.position.z]];
      g.path.forEach((p, i) => {
        if (i === 0 && Math.floor(chef.position.x) === p.x && Math.floor(chef.position.z) === p.z) return;
        pts.push([p.x + 0.5, p.z + 0.5]);
      });
      const last = pts[pts.length - 1];
      pts.push([last[0] + (st.x + 0.5 - last[0]) * 0.45, last[1] + (st.z + 0.5 - last[1]) * 0.45]);
      const gap = 0.34;
      let carry = gap - ((t * 0.9) % gap);
      dotColor.set(color);
      for (let i = 1; i < pts.length && dots < 260; i++) {
        const [ax, az] = pts[i - 1];
        const [bx, bz] = pts[i];
        const len = Math.hypot(bx - ax, bz - az);
        let d = carry;
        while (d < len && dots < 260) {
          const k = d / len;
          dotMatrix.makeTranslation(ax + (bx - ax) * k, 0.03, az + (bz - az) * k);
          this.dots.setMatrixAt(dots, dotMatrix);
          this.dots.setColorAt(dots, dotColor);
          dots++;
          d += gap;
        }
        carry = d - len;
      }
    });
    this.dots.count = dots;
    this.dots.instanceMatrix.needsUpdate = true;
    if (this.dots.instanceColor) this.dots.instanceColor.needsUpdate = true;
    // Pings grow and fade.
    for (let i = this.pings.length - 1; i >= 0; i--) {
      const p = this.pings[i];
      p.t += dt;
      if (p.t < 0) continue;
      const k = p.t / 0.9;
      if (k >= 1) {
        this.scene.remove(p.m);
        p.m.material.dispose();
        this.pings.splice(i, 1);
        continue;
      }
      p.m.visible = true;
      p.m.scale.setScalar(0.6 + k * 1.1);
      p.m.material.opacity = 1 - k;
    }
  }

  // Where each chef stands on screen, feet and head, so labels can step aside.
  chefBoxes() {
    const out = [];
    for (const v of this.chefs.values()) {
      const p = v.g.position;
      const [x, y0] = this.toScreen(p.x, 0, p.z);
      const [, y1] = this.toScreen(p.x, 2.0, p.z);
      out.push([x, y1, y0]);
    }
    return out;
  }

  // ---------- Effects ----------

  events(evs) {
    for (const [type, x, z] of evs) {
      if (type === "burn") {
        this.shake = reduceMotion ? 0 : 0.2;
        for (let i = 0; i < 10; i++) this.puff(x, 1.3, z, "smoke");
      } else if (type === "chop" || type === "press") {
        for (let i = 0; i < 2; i++) this.puff(x, 1.0, z, "bit");
      } else if (type === "serve") {
        for (let i = 0; i < 12; i++) this.puff(x, 1.2, z, "coin");
      } else if (type === "done") {
        for (let i = 0; i < 5; i++) this.puff(x, 1.3, z, "spark");
      } else if (type === "cookin") {
        for (let i = 0; i < 4; i++) this.puff(x, 1.2, z, "steam");
      } else if (type === "dash") {
        for (let i = 0; i < 5; i++) this.puff(x, 0.1, z, "dust");
      } else if (type === "splat") {
        for (let i = 0; i < 6; i++) this.puff(x, 0.3, z, "bit");
      } else if (type === "fire") {
        this.shake = reduceMotion ? 0 : 0.2;
        for (let i = 0; i < 8; i++) this.puff(x, 1.3, z, "smoke");
      } else if (type === "fizz" || type === "spray") {
        for (let i = 0; i < (type === "fizz" ? 12 : 3); i++) this.puff(x, 1.2, z, "steam");
      } else if (type === "catch") {
        for (let i = 0; i < 4; i++) this.puff(x, 1.0, z, "spark");
      }
    }
  }

  puff(x, y, z, kind) {
    if (Math.random() > this.quality.particles) return;
    const look = PUFF[kind];
    const m = new Mesh(puffGeo, look.mat.clone());
    m.position.set(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4);
    m.scale.setScalar(look.size);
    m.userData = {
      vx: (Math.random() - 0.5) * look.spread,
      vy: look.rise * (0.7 + Math.random() * 0.6),
      vz: (Math.random() - 0.5) * look.spread,
      life: look.life,
      max: look.life,
      grow: look.grow,
      fall: look.fall,
    };
    this.scene.add(m);
    this.particles.push(m);
  }

  // ---------- Every frame ----------

  frame(dt) {
    if (!this.map) return;
    this.time += dt;
    // Drop quality if the frame rate sags for a couple of seconds.
    this.track(dt);
    this.dim += ((this.dimTo ?? 1) - this.dim) * Math.min(1, dt * 4);
    if (this.hemi) this.hemi.intensity = this.hemiPower * this.dim;
    if (this.sun) this.sun.intensity = this.sunPower * this.dim;
    const smooth = 1 - Math.exp(-dt * 18);
    for (const v of this.chefs.values()) {
      const g = v.g;
      g.position.x += (v.x - g.position.x) * smooth;
      g.position.z += (v.z - g.position.z) * smooth;
      const want = Math.atan2(v.fx, v.fz);
      let d = want - v.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      v.heading += d * Math.min(1, dt * 16);
      g.rotation.y = v.heading;
      const { body, handL, handR } = g.userData;
      const walk = Math.min(1, v.speed / 4);
      body.position.y = Math.abs(Math.sin(this.time * 14)) * 0.06 * walk;
      body.rotation.z = Math.sin(this.time * 14) * 0.05 * walk;
      // Squash and stretch when picking up or putting down, lean forward on a dash.
      if (!reduceMotion) {
        v.squash = Math.max(0, (v.squash ?? 0) - dt * 7);
        const q = Math.sin((1 - v.squash) * Math.PI) * v.squash;
        body.scale.set(1 + q * 0.18, 1 - q * 0.18, 1 + q * 0.18);
        v.dashing = Math.max(0, (v.dashing ?? 0) - dt * 5);
        body.rotation.x = v.dashing * 0.35;
      }
      const work = v.using ? Math.sin(this.time * 30) * 0.08 : 0;
      handL.position.y = 0.62 + work;
      handR.position.y = 0.62 - work;
      // People with real arms and legs walk, carry, and work the station in front of them the way it is
      // worked: a cleaver at the board, the wok tossed, noodles blanched, kopi pulled, the grill fanned.
      if (g.userData.human) {
        const act = v.using && !reduceMotion ? this.stationAct(v) : null;
        poseHuman(g.userData.human, { walk: reduceMotion ? 0 : walk, phase: 0, act, work: v.using && !act && !reduceMotion, carry: Boolean(g.userData.key) && !act, t: this.time * 1.3 });
      }
    }

    for (const view of this.stationViews) {
      if (view.cooking && Math.random() < dt * 4) this.puff(view.st.x + 0.5, 1.35, view.st.z + 0.5, view.st.type === "grill" ? "smoke" : "steam");
      // Wok hei: flames leap out of a busy wok, and the grill spits.
      if (view.cooking && view.st.type === "wok" && Math.random() < dt * 2.2) for (let i = 0; i < 5; i++) this.puff(view.st.x + 0.5, 1.25, view.st.z + 0.5, "flare");
      if (view.cooking && (view.st.type === "wok" || view.st.type === "grill") && Math.random() < dt * 6) this.puff(view.st.x + 0.5, 1.15, view.st.z + 0.5, "sizzle");
      if (view.burnt && Math.random() < dt * 6) this.puff(view.st.x + 0.5, 1.35, view.st.z + 0.5, "smoke");
      view.bar.quaternion.copy(this.camera.quaternion);
      if (view.fire?.visible) {
        const f = view.fireLevel;
        view.fire.children.forEach((c, i) => {
          c.scale.y = (0.25 + Math.abs(Math.sin(this.time * 10 + i * 1.7)) * 0.25) * (0.5 + f);
          c.scale.x = c.scale.z = 0.08 * (0.6 + f);
        });
        if (Math.random() < dt * 10) this.puff(view.st.x + 0.5, 1.5, view.st.z + 0.5, "smoke");
        if (Math.random() < dt * 6) this.puff(view.st.x + 0.5, 1.2, view.st.z + 0.5, "ember");
      }
      if (view.g.userData.parts.flame?.visible) {
        view.g.userData.parts.flame.children.forEach((f, i) => (f.scale.y = 0.1 + Math.abs(Math.sin(this.time * 12 + i)) * 0.06));
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const u = p.userData;
      u.life -= dt;
      if (u.life <= 0) {
        this.scene.remove(p);
        p.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      u.vy -= u.fall * dt;
      p.position.x += u.vx * dt;
      p.position.y += u.vy * dt;
      p.position.z += u.vz * dt;
      p.scale.multiplyScalar(1 + u.grow * dt);
      p.material.opacity = Math.min(1, (u.life / u.max) * 1.4);
    }

    // Regulars eat, chat and look about.
    for (const c of this.customers ?? []) {
      const u = c.userData;
      c.position.y = u.y + Math.abs(Math.sin(this.time * 2 + u.bob)) * 0.02;
      if (reduceMotion) continue;
      const bite = Math.max(0, Math.sin(this.time * 1.6 + u.bob * 3));
      if (u.hand) u.hand.position.set(0.1, 0.62 + bite * 0.28, 0.2 - bite * 0.04);
      if (u.human) poseHuman(c, { seated: true, eat: true, phase: u.bob, t: this.time });
      u.body.rotation.x = bite * 0.08;
      u.body.rotation.y = Math.sin(this.time * 0.45 + u.bob) * 0.35;
    }
    for (const [x, y, z] of this.smokeSpots ?? []) if (Math.random() < dt * 2.5) this.puff(x, y, z, "smoke");
    if (this.tableBowls?.length && Math.random() < dt * 0.8) {
      const b = this.tableBowls[Math.floor(Math.random() * this.tableBowls.length)];
      this.puff(b.position.x, b.position.y + 0.15, b.position.z, "steam");
    }
    for (const f of this.fans ?? []) {
      if (f.userData.blades) f.userData.blades.rotation.y += dt * 6;
      else f.position.y = Math.abs(Math.sin(this.time * 3)) * 0.05;
    }
    for (const l of this.lamps ?? []) {
      l.rotation.z = Math.sin(this.time * 1.3 + l.position.x) * 0.06;
      // Kerosene flames flicker.
      if (l.userData.glow) l.userData.glow.material.emissiveIntensity = 2.8 + Math.sin(this.time * 13 + l.position.x) * 0.45 + Math.sin(this.time * 31) * 0.25;
    }
    if (this.cat) this.cat.userData.tail.rotation.x = Math.sin(this.time * 2.4) * 0.5;

    this.drawHints(dt);

    if (this.base) {
      this.shake *= Math.exp(-dt * 6);
      this.camera.position.copy(this.base);
      if (this.nudge) {
        const n = this.nudge;
        n.t += dt;
        const ease = (k) => k * k * (3 - 2 * k);
        const w = n.t < 0.25 ? ease(n.t / 0.25) : n.t < 1.2 ? 1 : n.t < 1.6 ? 1 - ease((n.t - 1.2) / 0.4) : 0;
        this.camera.position.addScaledVector(n.off, w);
        this.camStamp = (this.camStamp ?? 0) + 1;
        if (n.t >= 1.6) this.nudge = null;
      }
      if (this.shake > 0.01) {
        this.camera.position.x += (Math.random() - 0.5) * this.shake;
        this.camera.position.y += (Math.random() - 0.5) * this.shake;
      }
    }
    if (this.quality.post && this.post) this.post.render();
    else if (this.quality.outline && isToon()) this.effect.render(this.scene, this.camera);
    else this.renderer.render(this.scene, this.camera);
  }

  // A random regular's head on screen, for speech bubbles.
  customerHead(i) {
    const c = this.customers?.[i % Math.max(1, this.customers.length)];
    if (!c) return null;
    return this.toScreen(c.position.x, c.position.y + (c.userData.headY ?? 1) + 0.15, c.position.z);
  }

  // Above the serving hatch, where customers order, and above a chef's head, for speech bubbles.
  hatchTop() {
    const hs = this.map?.stations.filter((st) => st.type === "hatch") ?? [];
    if (!hs.length) return null;
    const x = hs.reduce((a, st) => a + st.x + 0.5, 0) / hs.length;
    return this.toScreen(x, 2.3, hs[0].z + 0.2);
  }

  chefHead(slot) {
    const g = this.chefs.get(slot)?.g;
    return g ? this.toScreen(g.position.x, 2.2, g.position.z) : this.hatchTop();
  }

  // Where the front edge of the kitchen lands on screen, for laying out the HUD around it.
  kitchenBottom() {
    if (!this.map) return null;
    return this.toScreen(this.map.w / 2, 0, this.map.h + 0.05)[1];
  }

  toScreen(x, y, z) {
    const v = new Vector3(x, y, z).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
  }
}

// ---------- Small shared pieces ----------

// A colour, darker by a factor, for evening floors.
function shade(hex, k) {
  if (k === 1) return hex;
  const c = new Color(hex).multiplyScalar(k);
  return `#${c.getHexString()}`;
}

function hallTexture(color, map) {
  const t = terrazzo(color, 77);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set((map.w + 8) / 3, 2);
  return t;
}

const puffGeo = new IcosahedronGeometry(1, 0);
const basic = (color) => {
  const m = new MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false });
  m.userData.outlineParameters = { visible: false };
  return m;
};
const hot = (r, g, b) => {
  const m = basic("#ffffff");
  m.color.setRGB(r, g, b);
  return m;
};
const PUFF = {
  steam: { mat: basic("#ffffff"), size: 0.07, rise: 0.9, spread: 0.3, life: 1.2, grow: 0.9, fall: 0 },
  smoke: { mat: basic("#4a4440"), size: 0.1, rise: 1.0, spread: 0.5, life: 1.6, grow: 1.0, fall: 0 },
  spark: { mat: basic("#ffd27a"), size: 0.05, rise: 2.2, spread: 2.0, life: 0.6, grow: -0.8, fall: 5 },
  coin: { mat: basic("#f2b632"), size: 0.07, rise: 3.2, spread: 2.4, life: 0.9, grow: -0.3, fall: 7 },
  bit: { mat: basic("#f3e9cf"), size: 0.035, rise: 1.6, spread: 1.4, life: 0.5, grow: 0, fall: 6 },
  dust: { mat: basic("#d8c8a8"), size: 0.08, rise: 0.4, spread: 1.2, life: 0.5, grow: 1.4, fall: 0 },
  ember: { mat: basic("#ff9a2a"), size: 0.04, rise: 1.8, spread: 0.8, life: 0.7, grow: -0.6, fall: 0 },
  // Brighter than white, so High's bloom catches them.
  flare: { mat: hot(4, 1.9, 0.4), size: 0.11, rise: 2.4, spread: 0.6, life: 0.45, grow: -1.2, fall: 0 },
  sizzle: { mat: hot(3, 2.4, 1.2), size: 0.025, rise: 1.4, spread: 1.6, life: 0.35, grow: 0, fall: 6 },
};

const workMat = basic("#5fbf6a");
const settleMat = basic("#9fd0ff");
const cookMat = basic("#f2b632");
const warnA = basic("#e0533a");
const warnB = basic("#ffd27a");

// A round progress ring that faces the camera. Ring shapes are cached in 32 steps.
const ringCache = new Map();
function ringGeo(p) {
  const n = Math.max(1, Math.min(32, Math.round(p * 32)));
  if (!ringCache.has(n)) ringCache.set(n, new RingGeometry(0.15, 0.24, 32, 1, Math.PI / 2, -(n / 32) * Math.PI * 2));
  return ringCache.get(n);
}

function progressRing() {
  const g = new Group();
  const bg = new Mesh(new RingGeometry(0.12, 0.27, 32), basic("#2b1b12"));
  const fill = new Mesh(ringGeo(0), workMat);
  fill.position.z = 0.01;
  const warn = new Mesh(new PlaneGeometry(0.08, 0.2), warnA);
  warn.position.set(0, 0.42, 0.01);
  warn.visible = false;
  g.add(bg, fill, warn);
  g.userData.fill = fill;
  g.userData.warn = warn;
  bg.renderOrder = 10;
  fill.renderOrder = 11;
  warn.renderOrder = 11;
  return g;
}

function flames() {
  const g = new Group();
  const m = new MeshBasicMaterial({ color: "#ff7a1a", transparent: true, opacity: 0.9, depthWrite: false });
  const m2 = new MeshBasicMaterial({ color: "#ffd27a", transparent: true, opacity: 0.9, depthWrite: false });
  m.userData.outlineParameters = m2.userData.outlineParameters = { visible: false };
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const f = new Mesh(flameGeo, i % 2 ? m2 : m);
    f.position.set(Math.cos(a) * 0.22, 0.2, Math.sin(a) * 0.22);
    g.add(f);
  }
  return g;
}
const flameGeo = new IcosahedronGeometry(1, 0);

const highlightGeo = new RingGeometry(0.36, 0.46, 4, 1, Math.PI / 4);
const hlCache = new Map();
function highlightMat(color) {
  if (!hlCache.has(color)) {
    const m = new MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false });
    m.userData.outlineParameters = { visible: false };
    hlCache.set(color, m);
  }
  return hlCache.get(color);
}

// A soft round shadow, painted once.
function blobTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(0,0,0,0.42)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.2)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c);
  return t;
}
const blobGeo = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const blobMat = new MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, color: "#2b1b12" });
blobMat.userData.outlineParameters = { visible: false };

// Hint shapes: a square ring for pulses, a round one for pings, floor dots and a bobbing arrow.
const hintBasic = (color, opacity) => {
  const m = new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  m.userData.outlineParameters = { visible: false };
  return m;
};
const pulseGeo = new RingGeometry(0.62, 0.74, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2);
const pulseMat = hintBasic("#ffd27a", 0.6);
const pingGeo = new RingGeometry(0.4, 0.6, 40).rotateX(-Math.PI / 2);
const pingMat = hintBasic("#fff3c4", 1);
const dotGeo = new CircleGeometry(0.075, 12).rotateX(-Math.PI / 2);
const dotMat = hintBasic("#ffffff", 0.75);
const dotMatrix = new Matrix4();
const dotColor = new Color();
const arrowCone = new ConeGeometry(0.2, 0.34, 14).rotateX(Math.PI);
const arrowShaft = new CylinderGeometry(0.075, 0.075, 0.26, 10);

function makeArrow() {
  const g = new Group();
  const cone = new Mesh(arrowCone, mat(CHEF_COLORS[0]));
  const shaft = new Mesh(arrowShaft, mat(CHEF_COLORS[0]));
  shaft.position.y = 0.27;
  g.add(cone, shaft);
  g.userData = { cone, shaft, color: CHEF_COLORS[0] };
  return g;
}

function pop(obj) {
  if (reduceMotion) return;
  obj.scale.multiplyScalar(0.4);
  const target = obj.scale.x / 0.4;
  let t = 0;
  const grow = () => {
    t += 1 / 60;
    const k = Math.min(1, t / 0.18);
    const e = 1 + 0.25 * Math.sin(k * Math.PI);
    obj.scale.setScalar(target * (0.4 + 0.6 * k) * e);
    if (k < 1) requestAnimationFrame(grow);
  };
  requestAnimationFrame(grow);
}
