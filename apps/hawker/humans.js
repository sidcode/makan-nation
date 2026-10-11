// People with human proportions: about 1.66 metres, a head an eighth of that, hips, knees, elbows, hands,
// shoes, a face, hair or headwear, and clothes from the same looks as the kitchen's regulars (chefs.js).
// Two ways to draw them: a crowd of hundreds as instanced parts (the customer mode), and one person as an
// ordinary group with joints (you, and the kitchen's people in the Soft and Real looks). Both share the
// same shapes and the same poses: walking with knees that bend, standing, sitting on a stool, eating,
// carrying a tray, and working at a counter.

import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mat } from "./models.js";
import { isToon } from "./realism.js";

// ---------- Proportions (metres, a standing adult) ----------

const HIP = 0.88; // hip joints
const THIGH = 0.4;
const SHIN = 0.4;
const SHOULDER = 1.36;
const UPPER = 0.28;
const FORE = 0.24;
export const HEAD_Y = 1.555; // middle of the head
export const EYE_Y = 1.575;

// Two builds on the same skeleton and poses. Lifelike: human proportions. Classic: the game's first,
// chunky people, with a big head, a round body and short limbs, about 1.2 m before scaling.
export const BUILDS = {
  lifelike: { name: "Lifelike", hip: HIP, hipX: 0.085, thigh: THIGH, shin: SHIN, shoulder: SHOULDER, shoulderX: 0.205, upper: UPPER, fore: FORE, headY: HEAD_Y, head: 1, height: 1.67 },
  classic: { name: "Classic", hip: 0.42, hipX: 0.09, thigh: 0.2, shin: 0.2, shoulder: 0.79, shoulderX: 0.22, upper: 0.19, fore: 0.16, headY: 1.03, head: 1.65, height: 1.22 },
};
// The People setting: "auto" matches the Look (Cartoon gets classic people, Soft and Real lifelike ones),
// or either build with any look.
export const PEOPLE = [
  { id: "auto", name: "Match the look" },
  { id: "classic", name: "Classic" },
  { id: "lifelike", name: "Lifelike" },
];
let people = "auto";
export const peopleSetting = () => people;
export const peopleBuild = () => (people === "auto" ? (isToon() ? "classic" : "lifelike") : people);
export function setPeople(id) {
  people = PEOPLE.some((p) => p.id === id) ? id : "auto";
  return people;
}
const AGE = { child: 0.72, teen: 0.92, adult: 1, elder: 0.96 };

// ---------- Shapes, made once ----------

const merge = (...g) => mergeGeometries(g.filter(Boolean));
// Kept light: a crowd of hundreds is drawn every frame. People far from the camera use the "lite" set,
// with a fraction of the triangles.
const DETAIL = {
  full: { limb: 8, cap: 4, sph: [10, 7], head: [14, 10], hair: [12, 6], lathe: 12 },
  lite: { limb: 5, cap: 2, sph: [6, 4], head: [8, 6], hair: [7, 3], lathe: 7 },
};

const shapeSets = {};
function S(lite = false, kind = "lifelike") {
  if (kind === "classic") return classicShapes(lite);
  const key = lite ? "lite" : "full";
  if (shapeSets[key]) return shapeSets[key];
  const d = DETAIL[key];
  const limb = (r0, r1, len) => merge(new CylinderGeometry(r0, r1, len, d.limb, 1, true).translate(0, -len / 2, 0), new SphereGeometry(r0, d.limb, d.cap), new SphereGeometry(r1, d.limb, d.cap).translate(0, -len, 0));
  const lathe = (pts) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), d.lathe);
  const sphere = (r, w = d.sph[0], h = d.sph[1], ...rest) => new SphereGeometry(r, w, h, ...rest);
  const head = (g) => g.scale(0.095, 0.115, 0.105).translate(0, HEAD_Y, 0);
  const cap = (r, up = 0.012) => sphere(1, d.hair[0], d.hair[1], 0, Math.PI * 2, 0, Math.PI * 0.53).scale(r, r * 1.12, r * 1.07).translate(0, HEAD_Y + up, -0.008);
  const shapes = {
    pelvis: sphere(1).scale(0.165, 0.11, 0.12).translate(0, 0.93, 0),
    // Waist, chest, shoulders and the base of the neck, a little flatter front to back.
    torso: lathe([[0.152, 0.9], [0.156, 1.0], [0.172, 1.16], [0.186, 1.3], [0.175, 1.38], [0.12, 1.43], [0.055, 1.46]]).scale(1.06, 1, 0.68),
    hem: lathe([[0.158, 0.96], [0.2, 0.7], [0.215, 0.6]]),
    skirt: lathe([[0.152, 0.96], [0.205, 0.66], [0.235, 0.42]]),
    sarong: lathe([[0.152, 0.96], [0.18, 0.5], [0.19, 0.12]]),
    neck: new CylinderGeometry(0.045, 0.05, 0.12, d.limb).translate(0, 1.46, 0),
    head: merge(
      head(sphere(1, d.head[0], d.head[1])),
      sphere(0.02, 6, 4).scale(0.8, 1.15, 1).translate(0, HEAD_Y - 0.01, 0.103),
      ...[-1, 1].map((k) => sphere(0.026, 6, 4).scale(0.5, 1, 0.8).translate(k * 0.094, HEAD_Y, 0.005)),
    ),
    face: merge(
      ...[-1, 1].map((k) => sphere(0.0125, 8, 6).translate(k * 0.036, EYE_Y, 0.093)),
      ...[-1, 1].map((k) => new BoxGeometry(0.042, 0.008, 0.01).rotateZ(k * -0.08).translate(k * 0.036, EYE_Y + 0.025, 0.097)),
      new BoxGeometry(0.035, 0.006, 0.006).translate(0, HEAD_Y - 0.052, 0.095),
    ),
    glasses: merge(...[-1, 1].map((k) => new CylinderGeometry(0.022, 0.022, 0.004, 12, 1, true).rotateX(Math.PI / 2).translate(k * 0.037, EYE_Y, 0.1)), new BoxGeometry(0.03, 0.004, 0.004).translate(0, EYE_Y, 0.1)),
    beard: sphere(1).scale(0.075, 0.05, 0.05).translate(0, HEAD_Y - 0.075, 0.07),
    hairShort: cap(0.108),
    hairLong: merge(cap(0.11), new BoxGeometry(0.2, 0.26, 0.05).translate(0, HEAD_Y - 0.1, -0.08)),
    hairBun: merge(cap(0.108), sphere(0.045).translate(0, HEAD_Y + 0.08, -0.08)),
    hairTail: merge(cap(0.108), new CylinderGeometry(0.03, 0.018, 0.18, 8).rotateX(0.35).translate(0, HEAD_Y - 0.06, -0.13)),
    hairCurly: merge(...[[0, 0.1, 0], [-0.06, 0.07, 0.02], [0.06, 0.07, 0.02], [0, 0.06, -0.07], [-0.07, 0.03, -0.04], [0.07, 0.03, -0.04]].map(([x, y, z]) => sphere(0.055, 8, 6).translate(x, HEAD_Y + y, z))),
    // A tudung frames the face and falls over the shoulders.
    tudung: merge(
      sphere(1, d.hair[0], d.hair[1] + 2, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(0.122, 0.135, 0.125).translate(0, HEAD_Y + 0.008, -0.005),
      sphere(1, d.hair[0], d.hair[1] + 2, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, Math.PI * 0.4, Math.PI * 0.5).scale(0.122, 0.135, 0.125).translate(0, HEAD_Y + 0.008, -0.005),
      lathe([[0.09, 1.49], [0.17, 1.4], [0.235, 1.26]]),
    ),
    songkok: new CylinderGeometry(0.098, 0.104, 0.09, d.lathe + 4).translate(0, HEAD_Y + 0.105, -0.005),
    turban: sphere(1).scale(0.128, 0.09, 0.133).translate(0, HEAD_Y + 0.065, -0.005),
    cap: merge(sphere(1, d.hair[0], d.hair[1], 0, Math.PI * 2, 0, Math.PI / 2).scale(0.112, 0.085, 0.115).translate(0, HEAD_Y + 0.03, -0.005), new BoxGeometry(0.16, 0.012, 0.11).translate(0, HEAD_Y + 0.035, 0.12)),
    sunhat: merge(new CylinderGeometry(0.09, 0.11, 0.08, d.lathe + 4).translate(0, HEAD_Y + 0.1, 0), new CylinderGeometry(0.23, 0.23, 0.012, d.lathe + 8).translate(0, HEAD_Y + 0.06, 0)),
    toque: merge(new CylinderGeometry(0.1, 0.1, 0.13, 16).translate(0, HEAD_Y + 0.13, 0), sphere(1).scale(0.13, 0.07, 0.13).translate(0, HEAD_Y + 0.21, 0)),
    thigh: limb(0.078, 0.058, THIGH),
    shin: limb(0.056, 0.042, SHIN),
    shoe: sphere(1, 8, 5).scale(0.05, 0.042, 0.125).translate(0, -0.035, 0.045),
    upper: limb(0.047, 0.04, UPPER),
    fore: limb(0.039, 0.032, FORE),
    hand: sphere(1, 7, 5).scale(0.034, 0.05, 0.022).translate(0, -0.045, 0),
    apron: new BoxGeometry(0.31, 0.52, 0.02).translate(0, 0.99, 0.135),
    tray: new BoxGeometry(0.46, 0.025, 0.32).translate(0, 1.05, 0.38),
    bowl: new CylinderGeometry(0.075, 0.055, 0.07, 12).translate(0.05, 1.1, 0.38),
    bag: new BoxGeometry(0.4, 0.4, 0.28).translate(0, 1.18, -0.27),
  };
  // Shared by every person: never disposed with a scene.
  for (const g of Object.values(shapes)) g.userData.shared = true;
  shapeSets[key] = shapes;
  return shapes;
}

// The classic build: the lifelike head, hair and hats grown round a bigger head, on a round body with
// short, chunky limbs, like the kitchen's cooks.
const HEAD_PARTS = ["head", "face", "glasses", "beard", "hairShort", "hairLong", "hairBun", "hairTail", "hairCurly", "songkok", "turban", "cap", "sunhat", "toque"];
function classicShapes(lite) {
  const key = lite ? "classic-lite" : "classic";
  if (shapeSets[key]) return shapeSets[key];
  const life = S(lite, "lifelike");
  const b = BUILDS.classic;
  const d = DETAIL[lite ? "lite" : "full"];
  const toHead = (g) => g.clone().translate(0, -HEAD_Y, 0).scale(b.head, b.head, b.head).translate(0, b.headY, 0);
  const limb = (r0, r1, len) => merge(new CylinderGeometry(r0, r1, len, d.limb, 1, true).translate(0, -len / 2, 0), new SphereGeometry(r0, d.limb, d.cap), new SphereGeometry(r1, d.limb, d.cap).translate(0, -len, 0));
  const lathe = (pts) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), d.lathe);
  const sphere = (r, w = d.sph[0], h = d.sph[1], ...rest) => new SphereGeometry(r, w, h, ...rest);
  const shapes = {
    pelvis: sphere(1).scale(0.16, 0.09, 0.13).translate(0, 0.45, 0),
    torso: lathe([[0.15, 0.42], [0.19, 0.48], [0.21, 0.58], [0.205, 0.7], [0.17, 0.79], [0.09, 0.84], [0.05, 0.87]]).scale(1, 1, 0.86),
    hem: lathe([[0.2, 0.5], [0.22, 0.4], [0.225, 0.34]]),
    skirt: lathe([[0.17, 0.47], [0.22, 0.3], [0.24, 0.18]]),
    sarong: lathe([[0.17, 0.47], [0.19, 0.2], [0.19, 0.05]]),
    neck: new CylinderGeometry(0.05, 0.055, 0.09, d.limb).translate(0, 0.86, 0),
    tudung: merge(toHead(sphere(1, d.hair[0], d.hair[1] + 2, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(0.122, 0.135, 0.125).translate(0, HEAD_Y + 0.008, -0.005)), toHead(sphere(1, d.hair[0], d.hair[1] + 2, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, Math.PI * 0.4, Math.PI * 0.5).scale(0.122, 0.135, 0.125).translate(0, HEAD_Y + 0.008, -0.005)), lathe([[0.12, 0.98], [0.21, 0.86], [0.26, 0.72]])),
    thigh: limb(0.066, 0.058, b.thigh),
    shin: limb(0.058, 0.05, b.shin),
    shoe: sphere(1, 8, 5).scale(0.06, 0.045, 0.11).translate(0, -0.03, 0.035),
    upper: limb(0.052, 0.048, b.upper),
    fore: limb(0.048, 0.046, b.fore),
    hand: sphere(0.055, 8, 6).translate(0, -0.04, 0),
    apron: new BoxGeometry(0.3, 0.32, 0.02).translate(0, 0.58, 0.19),
    tray: new BoxGeometry(0.42, 0.025, 0.3).translate(0, 0.63, 0.34),
    bowl: new CylinderGeometry(0.07, 0.05, 0.065, 12).translate(0.05, 0.67, 0.34),
    bag: new BoxGeometry(0.36, 0.36, 0.26).translate(0, 0.66, -0.26),
  };
  for (const name of HEAD_PARTS) shapes[name] = toHead(life[name]);
  for (const g of Object.values(shapes)) g.userData.shared = true;
  shapeSets[key] = shapes;
  return shapes;
}

// ---------- From a look to colours and parts ----------

const SANDAL = "#6a4a2a";
const SHOES = ["#2b2b2b", "#3a3330", SANDAL, "#e8e4dc", "#2d3a4f"];
const LONG_TOPS = new Set(["kurung", "kurta", "kebaya", "tunic", "saree"]);
const LONG_SLEEVES = new Set(["office", "uniform", "kurung", "kurta", "kebaya", "saree", "samfu", "tunic"]);
const HAIR = { short: "hairShort", crop: "hairShort", long: "hairLong", bun: "hairBun", ponytail: "hairTail", curly: "hairCurly" };
const HEADWEAR = { tudung: "tudung", songkok: "songkok", turban: "turban", cap: "cap", sunhat: "sunhat" };

export function styleOf(look = {}, k = 0) {
  const [topStyle, topColour = "#cccccc"] = look.top ?? ["tshirt"];
  const [bottomStyle, bottomColour = "#555555"] = look.bottom ?? ["trousers"];
  const [hairStyle, hairColour = "#1d1410"] = look.hair ?? ["short"];
  const [headKind, headColour = "#333333"] = look.head ?? [];
  const skin = look.skin ?? "#c68642";
  const skirt = bottomStyle === "skirt" ? "skirt" : bottomStyle === "sarong" ? "sarong" : null;
  const headwear = HEADWEAR[headKind] ?? null;
  return {
    skin,
    top: topColour,
    sleeve: topStyle === "singlet" ? skin : topColour,
    fore: LONG_SLEEVES.has(topStyle) ? topColour : skin,
    legs: skirt ? bottomColour : bottomColour,
    shin: bottomStyle === "shorts" || skirt === "skirt" ? skin : bottomColour,
    shoes: look.age === "elder" ? SANDAL : SHOES[Math.abs(k) % SHOES.length],
    hair: hairStyle === "bald" ? null : hairColour,
    hairPart: headwear === "tudung" || headwear === "turban" || hairStyle === "bald" ? null : HAIR[hairStyle] ?? "hairShort",
    headwear,
    headColour,
    skirt,
    longTop: LONG_TOPS.has(topStyle),
    beard: look.beard ?? null,
    glasses: Boolean(look.glasses),
    scale: AGE[look.age] ?? 1,
  };
}

// ---------- Poses ----------

// pose: { walk 0..1, phase, seated, eat, carry, work, act, t }. Returns joint angles (radians): legs and
// elbows bend about x; each arm also turns about y (reaching across) and opens out about z.
// act is what a hawker is doing: chop, wok, blanch, pull, scoop, prata, fan, shave, toss, wipe, serve.
const J = { thighL: 0, thighR: 0, kneeL: 0, kneeR: 0, upperL: 0, upperR: 0, elbowL: 0, elbowR: 0, yawL: 0, yawR: 0, abdL: 0.07, abdR: 0.07 };
const ACTS = {
  // A cleaver coming down on the board, the other hand steadying the bird.
  chop: (t, J) => {
    const c = Math.sin(t * 11);
    J.upperR = -1.05 + c * 0.32;
    J.elbowR = -0.75 - Math.max(0, c) * 0.55;
    J.yawR = -0.1;
    J.upperL = -0.85;
    J.elbowL = -0.85;
    J.yawL = 0.35;
  },
  // Left hand shakes the wok, right hand works the ladle round it.
  wok: (t, J) => {
    J.upperL = -0.85 + Math.sin(t * 9) * 0.16;
    J.elbowL = -0.75 + Math.sin(t * 9 + 0.6) * 0.12;
    J.yawL = 0.15;
    J.upperR = -1.0 + Math.sin(t * 6.5) * 0.2;
    J.elbowR = -0.85 + Math.cos(t * 6.5) * 0.3;
    J.yawR = Math.sin(t * 6.5) * 0.28;
  },
  // A strainer of noodles dipped and shaken in the boiling pot.
  blanch: (t, J) => {
    const dip = Math.sin(t * 4.2);
    J.upperR = -0.75 + dip * 0.22;
    J.elbowR = -0.7 + Math.abs(Math.sin(t * 16)) * 0.08 * (dip > 0 ? 1 : 0);
    J.yawR = 0.1;
    J.upperL = -0.5;
    J.elbowL = -1.15;
    J.yawL = 0.25;
  },
  // Pulling: the pot held high, the cup low, the tea poured in a long stream between them.
  pull: (t, J) => {
    J.upperR = -2.55 + Math.sin(t * 2.2) * 0.12;
    J.elbowR = -0.25;
    J.yawR = -0.15;
    J.abdR = 0.25;
    J.upperL = -0.6;
    J.elbowL = -0.95;
    J.yawL = 0.3;
  },
  // A ladle from tray to plate and back.
  scoop: (t, J) => {
    const k = Math.sin(t * 2.8);
    J.upperR = -0.85 + k * 0.3;
    J.elbowR = -0.65 - Math.max(0, -k) * 0.45;
    J.yawR = Math.sin(t * 1.4) * 0.45;
    J.upperL = -0.45;
    J.elbowL = -1.25;
    J.yawL = 0.3;
  },
  // Spinning prata dough out on the griddle with both hands.
  prata: (t, J) => {
    J.upperL = -0.95 + Math.sin(t * 7) * 0.32;
    J.upperR = -0.95 + Math.sin(t * 7 + Math.PI) * 0.32;
    J.elbowL = J.elbowR = -0.55;
    J.yawL = 0.25 + Math.cos(t * 7) * 0.25;
    J.yawR = -0.25 - Math.cos(t * 7) * 0.25;
  },
  // Fanning the charcoal under the satay.
  fan: (t, J) => {
    J.upperR = -0.65;
    J.elbowR = -1.25;
    J.yawR = Math.sin(t * 11) * 0.55;
    J.upperL = -0.75;
    J.elbowL = -0.8;
    J.yawL = 0.2;
  },
  // Turning the ice shaver's handle, a bowl underneath.
  shave: (t, J) => {
    J.upperR = -0.95 + Math.sin(t * 6) * 0.22;
    J.elbowR = -0.85 + Math.cos(t * 6) * 0.25;
    J.yawR = -0.15;
    J.upperL = -0.5;
    J.elbowL = -1.35;
    J.yawL = 0.35;
  },
  // Tossing rojak in its bowl, or rolling popiah.
  toss: (t, J) => {
    J.upperL = -0.6;
    J.elbowL = -1.3;
    J.yawL = 0.35;
    J.upperR = -0.75 + Math.sin(t * 8) * 0.14;
    J.elbowR = -1.1 + Math.cos(t * 8) * 0.28;
    J.yawR = Math.sin(t * 8) * 0.22;
  },
  // Between orders: wiping down the counter.
  wipe: (t, J) => {
    J.upperR = -0.55;
    J.elbowR = -0.85;
    J.yawR = Math.sin(t * 2.2) * 0.5;
    J.upperL = -0.2;
    J.elbowL = -0.4;
  },
  // Handing the plate over the counter.
  serve: (t, J) => {
    J.upperL = J.upperR = -0.55;
    J.elbowL = J.elbowR = -1.15;
    J.yawL = 0.12;
    J.yawR = -0.12;
  },
};

export function jointsFor(pose, t = pose.t ?? 0) {
  const p = (pose.phase ?? 0) + t * 7.5;
  const s = pose.walk ?? 0;
  J.yawL = J.yawR = 0;
  J.abdL = J.abdR = 0.07;
  if (pose.seated) {
    J.thighL = J.thighR = -1.45;
    J.kneeL = J.kneeR = 1.4;
    if (pose.eat) {
      J.upperR = -0.75 + Math.sin(t * 2.6 + (pose.phase ?? 0)) * 0.22;
      J.elbowR = -1.55;
      J.upperL = -0.55;
      J.elbowL = -0.9;
    } else {
      J.upperL = J.upperR = -0.35;
      J.elbowL = J.elbowR = -0.8;
    }
    return J;
  }
  J.thighL = -Math.sin(p) * 0.45 * s;
  J.thighR = Math.sin(p) * 0.45 * s;
  J.kneeL = 0.04 + Math.max(0, Math.cos(p)) * 0.75 * s;
  J.kneeR = 0.04 + Math.max(0, -Math.cos(p)) * 0.75 * s;
  if (pose.act && ACTS[pose.act]) {
    ACTS[pose.act](t + (pose.phase ?? 0), J);
  } else if (pose.carry) {
    J.upperL = J.upperR = -0.3;
    J.elbowL = J.elbowR = -1.3;
  } else if (pose.work) {
    J.upperL = -0.45 + Math.sin(t * 5.5 + (pose.phase ?? 0)) * 0.2;
    J.upperR = -0.5 + Math.cos(t * 4.3 + (pose.phase ?? 0)) * 0.25;
    J.elbowL = -1.1 + Math.sin(t * 6.1 + (pose.phase ?? 0)) * 0.2;
    J.elbowR = -1.25;
  } else {
    J.upperL = Math.sin(p) * 0.38 * s;
    J.upperR = -Math.sin(p) * 0.38 * s;
    J.elbowL = J.elbowR = -0.12 - 0.25 * s;
  }
  return J;
}

// ---------- A crowd, instanced ----------

const PART_COLOUR = {
  pelvis: "legs", torso: "top", hem: "top", skirt: "legs", sarong: "legs", neck: "skin", head: "skin", face: "dark", glasses: "dark", beard: "hair",
  hairShort: "hair", hairLong: "hair", hairBun: "hair", hairTail: "hair", hairCurly: "hair",
  tudung: "headColour", songkok: "headColour", turban: "headColour", cap: "headColour", sunhat: "headColour",
  thigh: "legs", shin: "shin", shoe: "shoes", upper: "sleeve", fore: "fore", hand: "skin",
  apron: "apron", tray: "trayColour", bowl: "bowlColour", bag: "bagColour",
};
const PAIRED = new Set(["thigh", "shin", "shoe", "upper", "fore", "hand"]);
const SHADOWS = new Set(["torso", "thigh", "shin", "pelvis", "head"]);

// Too small to see far off, so the lite crowd leaves them out.
const FINE = new Set(["face", "glasses", "beard", "hand", "shoe"]);

export class HumanCrowd {
  // lite: the low-detail set, for people far from the camera.
  constructor(max, { lite = false, kind = "lifelike" } = {}) {
    this.max = max;
    this.lite = lite;
    this.kind = kind;
    this.dims = BUILDS[kind] ?? BUILDS.lifelike;
    this.group = new Group();
    const base = mat("#ffffff", { surface: "cloth" }).clone();
    base.side = DoubleSide;
    this.meshes = {};
    for (const name of Object.keys(PART_COLOUR)) {
      if (lite && FINE.has(name)) continue;
      const n = PAIRED.has(name) ? max * 2 : max;
      const m = new InstancedMesh(S(lite, kind)[name], base, n);
      m.castShadow = SHADOWS.has(name);
      m.count = 0;
      m.frustumCulled = false;
      this.meshes[name] = m;
      this.group.add(m);
    }
    this.entries = Object.entries(this.meshes);
    this.hidden = new Matrix4().makeScale(0, 0, 0);
    this.m = new Matrix4();
    this.a = new Matrix4();
    this.b = new Matrix4();
    this.c = new Matrix4();
    this.r = new Matrix4();
    this.t = new Matrix4();
    this.q = new Quaternion();
    this.up = new Vector3(0, 1, 0);
    this.p = new Vector3();
    this.s = new Vector3();
    this.colour = new Color();
    this.painted = new Array(max).fill(null);
  }

  shadows(on) {
    for (const [name, m] of this.entries) m.castShadow = on && SHADOWS.has(name);
  }

  // people: [{ x, y, z, yaw, scale, style (styleOf), pose, tray, bag, apron, robot, colours (extra) }]
  set(people, time) {
    const n = Math.min(people.length, this.max);
    for (const [name, m] of this.entries) m.count = PAIRED.has(name) ? n * 2 : n;
    const M = this.meshes;
    const hide = (name, i) => M[name]?.setMatrixAt(i, this.hidden);
    for (let i = 0; i < n; i++) {
      const p = people[i];
      const st = p.style;
      this.q.setFromAxisAngle(this.up, p.yaw);
      this.s.setScalar(p.scale * (st.scale ?? 1));
      this.p.set(p.x, p.y, p.z);
      this.m.compose(this.p, this.q, this.s);
      const j = jointsFor(p.pose, time);
      const robot = p.robot;
      const show = (name, on, idx = i, matrix = this.m) => M[name]?.setMatrixAt(idx, on ? matrix : this.hidden);
      show("pelvis", !robot && !st.skirt);
      show("torso", true);
      show("hem", !robot && st.longTop);
      show("skirt", !robot && st.skirt === "skirt");
      show("sarong", !robot && st.skirt === "sarong");
      show("neck", !robot);
      show("head", true);
      show("face", !robot);
      show("glasses", !robot && st.glasses);
      show("beard", !robot && Boolean(st.beard));
      for (const h of ["hairShort", "hairLong", "hairBun", "hairTail", "hairCurly"]) show(h, !robot && st.hairPart === h && Boolean(st.hair));
      for (const h of ["tudung", "songkok", "turban", "cap", "sunhat"]) show(h, !robot && (p.cap ? h === "cap" : st.headwear === h));
      show("apron", !robot && Boolean(p.apron));
      show("tray", p.tray && !p.pose.seated);
      show("bowl", p.tray && !p.pose.seated);
      show("bag", p.bag);
      // Legs: hip, knee and a foot kept flat.
      for (const [k, side] of [[0, -1], [1, 1]]) {
        const idx = i * 2 + k;
        if (robot) {
          for (const name of ["thigh", "shin", "shoe", "upper", "fore", "hand"]) hide(name, idx);
          continue;
        }
        const th = k ? j.thighR : j.thighL;
        const kn = k ? j.kneeR : j.kneeL;
        const D = this.dims;
        this.a.multiplyMatrices(this.m, this.t.makeTranslation(side * D.hipX, D.hip, 0)).multiply(this.r.makeRotationX(th));
        M.thigh.setMatrixAt(idx, st.skirt && !p.pose.seated ? this.hidden : this.a);
        this.b.multiplyMatrices(this.a, this.t.makeTranslation(0, -D.thigh, 0)).multiply(this.r.makeRotationX(kn));
        M.shin.setMatrixAt(idx, this.b);
        if (M.shoe) {
          this.c.multiplyMatrices(this.b, this.t.makeTranslation(0, -D.shin, 0)).multiply(this.r.makeRotationX(-th - kn));
          M.shoe.setMatrixAt(idx, this.c);
        }
        // Arms: a turn about y, opening out about z, then the shoulder and elbow bending; the hand last.
        const up = k ? j.upperR : j.upperL;
        const el = k ? j.elbowR : j.elbowL;
        const yaw = k ? j.yawR : j.yawL;
        const abd = k ? j.abdR : j.abdL;
        this.a.multiplyMatrices(this.m, this.t.makeTranslation(side * D.shoulderX, D.shoulder, 0));
        if (yaw) this.a.multiply(this.r.makeRotationY(yaw));
        this.a.multiply(this.r.makeRotationZ(side * abd)).multiply(this.t.makeRotationX(up));
        M.upper.setMatrixAt(idx, this.a);
        this.b.multiplyMatrices(this.a, this.t.makeTranslation(0, -D.upper, 0)).multiply(this.r.makeRotationX(el));
        M.fore.setMatrixAt(idx, this.b);
        this.c.multiplyMatrices(this.b, this.t.makeTranslation(0, -D.fore, 0));
        M.hand?.setMatrixAt(idx, this.c);
        // Where the hands are, for the tools a hawker holds.
        if (p.hands) {
          p.hands[k].copy(this.c);
          p.handsAt = p.frame;
        }
      }
      // Colours change only when a slot gets a different person.
      if (this.painted[i] !== p.colours) {
        this.painted[i] = p.colours;
        const cols = p.colours;
        for (const [name, mesh] of this.entries) {
          const c = cols[PART_COLOUR[name]];
          if (!c) continue;
          this.colour.set(c);
          if (PAIRED.has(name)) {
            mesh.setColorAt(i * 2, this.colour);
            mesh.setColorAt(i * 2 + 1, this.colour);
          } else mesh.setColorAt(i, this.colour);
        }
        this.dirtyColours = true;
      }
    }
    for (const [, m] of this.entries) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor && this.dirtyColours) m.instanceColor.needsUpdate = true;
    }
    this.dirtyColours = false;
  }
}

// The colours a crowd slot needs, from a style.
export function coloursFor(st, extra = {}) {
  return { ...st, dark: "#1d1410", trayColour: "#c9a46a", bowlColour: "#fbf8f0", bagColour: "#2e9e55", apron: null, ...extra };
}

// ---------- One person, with joints ----------

// opts: { apron: colour, hat: a chef's toque, cap: colour (a rider's cap) }
export function buildHuman(look, { apron = null, hat = false, cap = null, seed = 0 } = {}) {
  const st = styleOf(look, seed);
  const sh = S();
  const g = new Group();
  const body = new Group();
  g.add(body);
  const part = (name, colour, parent = body, surface = "cloth") => {
    if (!colour) return null;
    const m = new Mesh(sh[name], mat(colour, { surface, outline: false }));
    m.castShadow = SHADOWS.has(name);
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  if (!st.skirt) part("pelvis", st.legs);
  part("torso", st.top);
  if (st.longTop) part("hem", st.top);
  if (st.skirt === "skirt") part("skirt", st.legs);
  if (st.skirt === "sarong") part("sarong", st.legs);
  part("neck", st.skin, body, "skin");
  part("head", st.skin, body, "skin");
  part("face", "#1d1410");
  if (st.glasses) part("glasses", "#1d1410");
  if (st.beard) part("beard", st.beard);
  if (hat) part("toque", "#ffffff");
  else if (cap) part("cap", cap);
  else if (st.headwear) part(st.headwear, st.headColour);
  if (!hat && st.hairPart && st.hair && st.headwear !== "tudung" && st.headwear !== "turban") part(st.hairPart, st.hair);
  if (apron) part("apron", apron);
  const joints = {};
  for (const [k, side] of [["L", -1], ["R", 1]]) {
    const hip = new Group();
    hip.position.set(side * 0.085, HIP, 0);
    body.add(hip);
    if (!st.skirt) part("thigh", st.legs, hip);
    const knee = new Group();
    knee.position.y = -THIGH;
    hip.add(knee);
    part("shin", st.shin, knee, st.shin === st.skin ? "skin" : "cloth");
    const ankle = new Group();
    ankle.position.y = -SHIN;
    knee.add(ankle);
    part("shoe", st.shoes, ankle, "plastic");
    const shoulder = new Group();
    shoulder.position.set(side * 0.205, SHOULDER, 0);
    body.add(shoulder);
    // Turn, open out, then bend: the same order as the crowd's arms.
    const arm = new Group();
    arm.rotation.order = "YZX";
    arm.rotation.z = side * 0.07;
    arm.userData.side = side;
    shoulder.add(arm);
    part("upper", st.sleeve, arm);
    const elbow = new Group();
    elbow.position.y = -UPPER;
    arm.add(elbow);
    part("fore", st.fore, elbow, st.fore === st.skin ? "skin" : "cloth");
    const wrist = new Group();
    wrist.position.y = -FORE;
    elbow.add(wrist);
    part("hand", st.skin, wrist, "skin");
    Object.assign(joints, { [`hip${k}`]: hip, [`knee${k}`]: knee, [`ankle${k}`]: ankle, [`arm${k}`]: arm, [`elbow${k}`]: elbow, [`wrist${k}`]: wrist });
  }
  body.scale.setScalar(st.scale);
  g.userData = { body, joints, human: true, scale: st.scale, headY: (HEAD_Y + 0.15) * st.scale, skin: st.skin, look };
  return g;
}

// Moves a built person's joints into a pose: { walk, phase, seated, eat, carry, work, t }.
export function poseHuman(g, pose) {
  const j = jointsFor(pose);
  const J2 = g.userData.joints;
  if (!J2) return;
  J2.hipL.rotation.x = j.thighL;
  J2.hipR.rotation.x = j.thighR;
  J2.kneeL.rotation.x = j.kneeL;
  J2.kneeR.rotation.x = j.kneeR;
  J2.ankleL.rotation.x = -j.thighL - j.kneeL;
  J2.ankleR.rotation.x = -j.thighR - j.kneeR;
  J2.armL.rotation.set(j.upperL, j.yawL, -j.abdL);
  J2.armR.rotation.set(j.upperR, j.yawR, j.abdR);
  J2.elbowL.rotation.x = j.elbowL;
  J2.elbowR.rotation.x = j.elbowR;
}

// How far down a seated person sits, so their hips rest on a stool of this height.
export const seatDrop = (stool = 0.46) => stool + 0.06 - HIP;
