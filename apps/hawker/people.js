// Three.js people built from the looks in chefs.js. A handful of simple shapes each, so phones stay smooth.
import { Group } from "three";
import { chefById, CHEFS, HELPER_LOOKS } from "./chefs.js";
import { buildHuman, peopleBuild, poseHuman } from "./humans.js";
import { CHEF_COLORS, mat, mesh } from "./models.js";

// With People set to Lifelike the kitchen's people have human proportions (humans.js), a little smaller
// than life so the stall still reads from above; Classic keeps the game's first, chunky cooks.
const KITCHEN = 0.75;
export const humanStyle = () => peopleBuild() === "lifelike";

function human(look, { apron = null, hat = false, seated = false, cap = null } = {}) {
  const g = buildHuman(look, { apron, hat, cap });
  const body = g.userData.body;
  body.scale.multiplyScalar(KITCHEN);
  const s = g.userData.scale * KITCHEN;
  // Seated: hips on the stool (its top is about 0.43 m), feet on the floor.
  if (seated) {
    body.position.y = 0.47 - 0.88 * s - 0.1;
    poseHuman(g, { seated: true });
  }
  g.userData.headY = (1.7 * s) + (seated ? body.position.y : 0);
  g.userData.look = look;
  return g;
}

const AGE = { child: 0.72, teen: 0.9, adult: 1, elder: 0.97 };

function hairOn(g, look, top) {
  const [style, color = "#1d1410"] = look.hair ?? ["short"];
  if (style === "bald") return;
  const m = mat(color);
  if (style === "bun") {
    g.add(mesh("sphere", m, { pos: [0, top + 0.03, -0.02], scale: [0.175, 0.1, 0.175] }));
    g.add(mesh("sphere", m, { pos: [0, top + 0.06, -0.13], scale: [0.07, 0.07, 0.07] }));
  } else if (style === "long" || style === "ponytail") {
    g.add(mesh("sphere", m, { pos: [0, top + 0.03, -0.02], scale: [0.178, 0.1, 0.178] }));
    if (style === "long") g.add(mesh("box", m, { pos: [0, top - 0.12, -0.11], scale: [0.26, 0.24, 0.06] }));
    else g.add(mesh("capsule", m, { pos: [0, top - 0.06, -0.16], scale: [0.04, 0.07, 0.04], rot: [0.5, 0, 0] }));
  } else if (style === "curly") {
    for (const [x, y, z] of [[0, 0.06, 0], [-0.08, 0.03, -0.03], [0.08, 0.03, -0.03], [0, 0.03, -0.09]]) {
      g.add(mesh("sphere", m, { pos: [x, top + y, z], scale: [0.09, 0.08, 0.09] }));
    }
  } else {
    // short and crop
    g.add(mesh("sphere", m, { pos: [0, top + (style === "crop" ? 0.02 : 0.03), -0.015], scale: [0.172, style === "crop" ? 0.08 : 0.095, 0.172] }));
  }
}

function headwear(g, look, top) {
  const [kind, color = "#333"] = look.head ?? [];
  if (!kind) return false;
  const m = mat(color);
  if (kind === "tudung") {
    // Covers the hair and neck, leaves the face open.
    g.add(mesh("sphere", m, { pos: [0, top - 0.005, -0.025], scale: [0.19, 0.19, 0.18] }));
    g.add(mesh("cone8", m, { pos: [0, top - 0.2, -0.01], scale: [0.2, 0.16, 0.19] }));
    return true;
  }
  if (kind === "songkok") {
    hairOn(g, { hair: ["crop", look.hair?.[1]] }, top);
    g.add(mesh("cyl", m, { pos: [0, top + 0.1, 0], scale: [0.13, 0.08, 0.13] }));
    return true;
  }
  if (kind === "turban") {
    g.add(mesh("sphere", m, { pos: [0, top + 0.05, -0.01], scale: [0.19, 0.13, 0.19] }));
    g.add(mesh("box", m, { pos: [0, top + 0.1, 0.1], scale: [0.08, 0.1, 0.06], rot: [0.5, 0, 0] }));
    return true;
  }
  if (kind === "cap") {
    hairOn(g, look, top);
    g.add(mesh("sphere", m, { pos: [0, top + 0.05, 0], scale: [0.18, 0.08, 0.18] }));
    g.add(mesh("box", m, { pos: [0, top + 0.04, 0.16], scale: [0.18, 0.02, 0.12], shadow: false }));
    return true;
  }
  if (kind === "sunhat") {
    hairOn(g, look, top);
    g.add(mesh("cone8", m, { pos: [0, top + 0.1, 0], scale: [0.26, 0.06, 0.26] }));
    return true;
  }
  return false;
}

// The clothed body. Returns the height of the shoulders.
function body(g, look, { seated }) {
  const [topStyle, topColor = "#ccc", accent] = look.top ?? ["tshirt"];
  const [bottomStyle, bottomColor = "#555"] = look.bottom ?? ["trousers"];
  const top = mat(topColor);
  const bottom = mat(bottomColor);
  // Legs or a long skirt below the waist.
  if (!seated) {
    if (bottomStyle === "skirt" || bottomStyle === "sarong") g.add(mesh("cone8", bottom, { pos: [0, 0.2, 0], scale: [0.17, 0.4, 0.15] }));
    else {
      const len = bottomStyle === "shorts" ? 0.16 : 0.3;
      for (const x of [-0.07, 0.07]) {
        g.add(mesh("cyl8", bottom, { pos: [x, 0.36 - len / 2, 0], scale: [0.06, len, 0.06] }));
        if (bottomStyle === "shorts") g.add(mesh("cyl8", mat(look.skin), { pos: [x, 0.12, 0], scale: [0.045, 0.2, 0.045] }));
      }
    }
  } else {
    g.add(mesh("box", bottom, { pos: [0, 0.34, 0.08], scale: [0.26, 0.1, 0.26] }));
  }
  // Torso.
  const long = topStyle === "kurung" || topStyle === "kurta" || topStyle === "kebaya" || topStyle === "tunic";
  g.add(mesh("capsule", top, { pos: [0, 0.55, 0], scale: [0.2, long ? 0.24 : 0.2, 0.17] }));
  if (topStyle === "singlet") {
    for (const x of [-0.19, 0.19]) g.add(mesh("sphere", mat(look.skin), { pos: [x, 0.66, 0], scale: [0.06, 0.07, 0.06] }));
  }
  if (topStyle === "saree") g.add(mesh("box", mat(accent ?? topColor), { pos: [0.02, 0.6, 0.02], scale: [0.08, 0.42, 0.36], rot: [0, 0, 0.6] }));
  if (topStyle === "uniform" || topStyle === "office") g.add(mesh("box", mat(accent ?? "#2d4f9c"), { pos: [0, 0.6, 0.165], scale: [0.035, 0.18, 0.01], shadow: false }));
  if (topStyle === "kebaya" || topStyle === "kurung") g.add(mesh("box", mat(accent ?? topColor), { pos: [0, 0.68, 0.16], scale: [0.12, 0.05, 0.01], shadow: false }));
  if (topStyle === "samfu") for (const y of [0.52, 0.6, 0.68]) g.add(mesh("sphere", mat("#f4ead6"), { pos: [0.05, y, 0.17], scale: [0.012, 0.012, 0.01], shadow: false }));
  return 0.78;
}

// A person from a look. chef: { apron, hat } for cooks; seated for the dining area.
export function makePerson(look, { apron = null, hat = false, seated = false } = {}) {
  if (humanStyle()) return human(look, { apron, hat, seated, cap: look.head?.[0] === "cap" ? look.head[1] : null });
  const g = new Group();
  const b = new Group();
  const shoulder = body(b, look, { seated });
  const skin = mat(look.skin);
  if (apron) b.add(mesh("box", mat(apron), { pos: [0, 0.48, 0.17], scale: [0.28, 0.34, 0.05] }));
  // Head.
  const headY = shoulder + 0.17;
  b.add(mesh("sphere", skin, { pos: [0, headY, 0], scale: [0.16, 0.165, 0.16] }));
  const top = headY + 0.06;
  const covered = headwear(b, look, top);
  if (!covered) {
    if (hat) {
      b.add(mesh("cyl", mat("#ffffff"), { pos: [0, top + 0.12, 0], scale: [0.13, 0.12, 0.13] }));
      b.add(mesh("sphere", mat("#ffffff"), { pos: [0, top + 0.21, 0], scale: [0.17, 0.08, 0.17] }));
      hairOn(b, { ...look, hair: [look.hair?.[0] === "bun" ? "short" : look.hair?.[0], look.hair?.[1]] }, top - 0.02);
    } else hairOn(b, look, top);
  }
  if (look.beard) b.add(mesh("sphere", mat(look.beard), { pos: [0, headY - 0.07, 0.06], scale: [0.11, 0.08, 0.09] }));
  // Face: eyes, and glasses for some.
  const eye = mat("#1d1410");
  for (const x of [-0.055, 0.055]) b.add(mesh("sphere", eye, { pos: [x, headY + 0.02, 0.145], scale: [0.02, 0.028, 0.018], shadow: false }));
  if (look.glasses) b.add(mesh("box", mat("#2b2b2b"), { pos: [0, headY + 0.02, 0.158], scale: [0.18, 0.012, 0.01], shadow: false }));
  const scale = AGE[look.age] ?? 1;
  b.scale.setScalar(scale);
  g.add(b);
  g.userData.body = b;
  g.userData.headY = (headY + 0.25) * scale;
  g.userData.skin = look.skin;
  g.userData.look = look;
  return g;
}

// A cook in the kitchen: a chosen chef for players, a named helper for hired help.
// Players wear their colour on the apron and the floor ring; helpers wear their job's colour.
export function makeChef(slot, { chef = null, helper = null, helperName = null } = {}) {
  const look = helper ? HELPER_LOOKS[helperName] ?? HELPER_LOOKS["Ah Seng"] : (chefById(chef) ?? CHEFS[slot % CHEFS.length]).look;
  const color = helper ? helper.color : CHEF_COLORS[slot % 4];
  const person = makePerson(look, { apron: color, hat: !helper });
  const g = new Group();
  if (person.userData.human) {
    // Hands at the end of real arms: the held item sits in front, at the hands, and the arms move.
    const b = person.userData.body;
    const hold = new Group();
    hold.position.set(0, 1.0, 0.42);
    hold.scale.setScalar(1 / b.scale.x);
    b.add(hold);
    const ring = mesh("cyl", mat(color, { outline: false }), { pos: [0, 0.01, 0], scale: [0.34, 0.01, 0.34], shadow: false });
    ring.material = ring.material.clone();
    ring.material.transparent = true;
    ring.material.opacity = helper ? 0.3 : 0.55;
    g.add(ring, person);
    g.userData = { body: person, hold, handL: new Group(), handR: new Group(), key: "", human: person };
    return g;
  }
  const b = person.userData.body;
  const skin = mat(look.skin);
  const s = b.scale.x;
  const handL = mesh("sphere", skin, { pos: [-0.2, 0.62, 0.22], scale: [0.06, 0.06, 0.06] });
  const handR = mesh("sphere", skin, { pos: [0.2, 0.62, 0.22], scale: [0.06, 0.06, 0.06] });
  b.add(handL, handR);
  const hold = new Group();
  hold.position.set(0, 0.62, 0.36);
  hold.scale.setScalar(1 / s);
  b.add(hold);
  const ring = mesh("cyl", mat(color, { outline: false }), { pos: [0, 0.01, 0], scale: [0.34, 0.01, 0.34], shadow: false });
  ring.material = ring.material.clone();
  ring.material.transparent = true;
  ring.material.opacity = helper ? 0.3 : 0.55;
  g.add(ring, person);
  g.userData = { body: person, hold, handL, handR, key: "" };
  return g;
}

export function makeCustomer(look) {
  return makePerson(look, { seated: true });
}
