// A small kit for building the hawker centre around the stall: roofs, columns, the centre's own sign,
// what lies beyond (towers, flats, shophouses, the sea, a river) and lamps for the evening. Each
// archetype is a handful of shared shapes, so phones stay smooth.
//
// The camera looks down on the stall from the front. Wide screens see the sides; tall phone screens
// see far behind the dining area. So every archetype puts something telling in both places.

import { CanvasTexture, CylinderGeometry, Group, Mesh, RepeatWrapping, SRGBColorSpace, TorusGeometry } from "three";
import { ceilingFan, hdbBlock, mat, mesh, shophouses, stallRow, tree } from "./models.js";
import { label } from "./textures.js";

// ---------- Painted textures, made once ----------

const texCache = new Map();
function paint(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  texCache.set(key, t);
  return t;
}

// Corrugated sheet: light and dark stripes.
const corrugated = (color) =>
  paint(`corr${color}`, 64, 64, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.16)";
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 3, h);
  });

// Office or flat windows, lit at night.
const windows = (night, tint = "#9fc4d8") =>
  paint(`win${night}${tint}`, 64, 128, (g, w, h) => {
    g.fillStyle = night ? "#1e2433" : tint;
    g.fillRect(0, 0, w, h);
    for (let y = 4; y < h; y += 12) {
      for (let x = 4; x < w; x += 12) {
        g.fillStyle = night ? ((x * 7 + y * 3) % 5 < 2 ? "#ffe2a0" : "#33405a") : "#dfeaf0";
        g.fillRect(x, y, 7, 7);
      }
    }
  });

function repeatOf(tex, x, y) {
  const t = tex.clone();
  t.repeat.set(x, y);
  t.needsUpdate = true;
  return t;
}

// ---------- Pieces ----------

const archGeo = new TorusGeometry(1, 0.045, 6, 24, Math.PI);

// The centre's name, lit from inside after dark like the real signboards.
function sign(text, accent, width, lit = false) {
  const w = Math.min(width, 11);
  const tex = label(text, { bg: accent, fg: "#fff4dc", w: 1024, h: 96, font: "700 56px 'Bricolage Grotesque Variable', system-ui, sans-serif" });
  let face = mat("#ffffff", { map: tex, outline: false });
  if (lit) {
    face = face.clone();
    face.emissive = face.color.clone();
    face.emissiveMap = tex;
    face.emissiveIntensity = 1.3;
  }
  return mesh("plane", face, { scale: [w, w * (96 / 1024), 1], shadow: false });
}

function column(kind, color, h) {
  if (kind === "round") return mesh("cyl", mat(color), { pos: [0, h / 2, 0], scale: [0.14, h, 0.14] });
  if (kind === "iron") {
    return group(
      mesh("cyl8", mat(color), { pos: [0, h / 2, 0], scale: [0.06, h, 0.06] }),
      mesh("cyl8", mat(color), { pos: [0, 0.15, 0], scale: [0.12, 0.3, 0.12] }),
      mesh("sphere", mat(color), { pos: [0, h - 0.1, 0], scale: [0.13, 0.08, 0.13] }),
    );
  }
  if (kind === "slim") return mesh("cyl8", mat(color), { pos: [0, h / 2, 0], scale: [0.07, h, 0.07] });
  return group(mesh("box", mat(color), { pos: [0, h / 2, 0], scale: [0.3, h, 0.3] }), mesh("box", mat("#ffffff", { outline: false }), { pos: [0, 0.6, 0.151], scale: [0.3, 1.2, 0.005], shadow: false }));
}

function group(...kids) {
  const g = new Group();
  g.add(...kids.filter(Boolean));
  return g;
}

function tower(h, w, night, tint) {
  const t = windows(night, tint);
  return group(
    mesh("box", mat("#ffffff", { map: repeatOf(t, Math.max(1, Math.round(w)), Math.max(1, Math.round(h / 2))) }), { pos: [0, h / 2, 0], scale: [w, h, w * 0.8] }),
    mesh("box", mat("#5b5f63"), { pos: [0, h + 0.15, 0], scale: [w * 0.7, 0.3, w * 0.6] }),
  );
}

function clockTower(accent, roof) {
  const g = group(
    mesh("box", mat("#e9dcc4"), { pos: [0, 2.6, 0], scale: [1.2, 5.2, 1.2] }),
    mesh("box", mat(accent), { pos: [0, 5.35, 0], scale: [1.35, 0.3, 1.35] }),
    mesh("cone", mat(roof), { pos: [0, 6.3, 0], scale: [1.0, 1.6, 1.0], rot: [0, Math.PI / 4, 0] }),
    mesh("cyl8", mat("#5b5f63"), { pos: [0, 7.4, 0], scale: [0.03, 0.8, 0.03] }),
  );
  for (const [x, z, r] of [[0, 0.61, 0], [0.61, 0, Math.PI / 2], [-0.61, 0, -Math.PI / 2]]) {
    const face = group(
      mesh("cyl", mat("#fffdf7"), { pos: [0, 0, 0], scale: [0.42, 0.04, 0.42], rot: [Math.PI / 2, 0, 0] }),
      mesh("box", mat("#2b2b2b", { outline: false }), { pos: [0, 0.12, 0.03], scale: [0.04, 0.26, 0.01], shadow: false }),
      mesh("box", mat("#2b2b2b", { outline: false }), { pos: [0.1, 0, 0.03], scale: [0.2, 0.04, 0.01], shadow: false }),
    );
    face.position.set(x, 4.5, z);
    face.rotation.y = r;
    g.add(face);
  }
  return g;
}

function umbrella(color) {
  return group(mesh("cyl8", mat("#d9dde0"), { pos: [0, 1.15, 0], scale: [0.025, 2.3, 0.025] }), mesh("cone8", mat(color), { pos: [0, 2.3, 0], scale: [0.95, 0.35, 0.95] }));
}

function bulbs(from, to, n, color = "#ffe2a0") {
  const g = new Group();
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const b = mesh("sphere", mat(color, { emissive: color, glow: 2.6, outline: false }), { pos: [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k - Math.sin(k * Math.PI) * 0.25, from[2] + (to[2] - from[2]) * k], scale: [0.06, 0.06, 0.06], shadow: false });
    g.add(b);
  }
  return g;
}

function marketRow(count) {
  const g = new Group();
  const produce = ["#5f9a4c", "#e8892e", "#c0392b", "#f2c94c", "#9fd07a", "#c9c4b6"];
  for (let i = 0; i < count; i++) {
    const x = i * 1.6;
    g.add(mesh("box", mat("#d9dde0"), { pos: [x, 0.45, 0], scale: [1.5, 0.9, 0.8] }));
    g.add(mesh("box", mat(i % 2 ? "#bfe4f2" : "#e8dcc4"), { pos: [x, 0.93, 0], scale: [1.4, 0.06, 0.7], shadow: false }));
    for (let k = 0; k < 4; k++) g.add(mesh("sphere", mat(produce[(i + k) % produce.length]), { pos: [x - 0.5 + k * 0.33, 1.02, (k % 2) * 0.15 - 0.07], scale: [0.14, 0.09, 0.12], shadow: false }));
    g.add(mesh("sphere", mat("#fff3c4", { emissive: "#ffd27a", glow: 2, outline: false }), { pos: [x, 2.0, 0], scale: [0.09, 0.09, 0.09], shadow: false }));
    g.add(mesh("cyl8", mat("#2b2b2b"), { pos: [x, 2.4, 0], scale: [0.008, 0.8, 0.008], shadow: false }));
  }
  return g;
}

function sataySmokeGrills(n) {
  const g = new Group();
  const spots = [];
  for (let i = 0; i < n; i++) {
    const z = i * 1.5;
    g.add(mesh("box", mat("#5b5f63"), { pos: [0, 0.45, z], scale: [0.5, 0.9, 1.1] }), mesh("box", mat("#ff7a2a", { emissive: "#c24a10", glow: 2.2 }), { pos: [0, 0.92, z], scale: [0.4, 0.04, 1.0], shadow: false }));
    const s = label("SATAY", { bg: "#c8553d", w: 256, h: 64, font: "700 40px 'Bricolage Grotesque Variable', system-ui, sans-serif" });
    const board = mesh("plane", mat("#ffffff", { map: s, outline: false }), { pos: [0, 1.7, z], scale: [0.9, 0.22, 1], rot: [0, -Math.PI / 2, 0], shadow: false });
    g.add(board, mesh("cyl8", mat("#3a2a1e"), { pos: [0, 1.3, z + 0.45], scale: [0.02, 0.8, 0.02], shadow: false }));
    spots.push([0, 1.05, z]);
  }
  g.userData.smoke = spots;
  return g;
}

// Water above the ground plane and below every floor, with a strip of sand at its edge.
function seaPlane(time, wd, dp) {
  const deep = time === "night" ? "#1a2a44" : time === "dusk" ? "#4a6a8a" : "#3a8ab5";
  return group(
    mesh("box", mat(deep, { outline: false }), { pos: [0, -0.014, 0], scale: [wd, 0.002, dp], shadow: false }),
    ...Array.from({ length: 12 }, (_, i) => mesh("box", mat("#ffffff", { transparent: true, opacity: 0.4, outline: false }), { pos: [((i * 7.3) % (wd * 0.8)) - wd * 0.4, -0.011, ((i * 4.1) % (dp * 0.8)) - dp * 0.4], scale: [1.4, 0.002, 0.06], shadow: false })),
  );
}

function ship(color) {
  return group(mesh("box", mat(color), { pos: [0, 0.3, 0], scale: [2.4, 0.5, 0.6] }), mesh("box", mat("#f4f1ea"), { pos: [0.3, 0.8, 0], scale: [0.9, 0.5, 0.5] }), mesh("cyl8", mat("#c8553d"), { pos: [0.5, 1.2, 0], scale: [0.12, 0.4, 0.12] }));
}

function bumboat() {
  return group(mesh("box", mat("#8a5a30"), { pos: [0, 0.15, 0], scale: [1.6, 0.25, 0.5] }), mesh("box", mat("#c8553d"), { pos: [0, 0.45, 0], scale: [0.9, 0.08, 0.55] }));
}

function templeRoof() {
  return group(mesh("box", mat("#c8553d"), { pos: [0, 1.4, 0], scale: [3, 2.8, 1.8] }), mesh("cone8", mat("#e8b04a"), { pos: [0, 3.2, 0], scale: [2.4, 0.9, 1.6] }), mesh("box", mat("#2f6b4f"), { pos: [0, 3.7, 0], scale: [2.2, 0.12, 0.2] }));
}

function kampongHouse(roof) {
  return group(mesh("box", mat("#a8784a"), { pos: [0, 1, 0], scale: [2, 1.4, 1.6] }), mesh("cone8", mat(roof), { pos: [0, 2.1, 0], scale: [1.7, 0.8, 1.4], rot: [0, Math.PI / 4, 0] }), ...[-0.7, 0.7].map((x) => mesh("cyl8", mat("#6a4a2a"), { pos: [x, 0.2, 0.6], scale: [0.05, 0.4, 0.05] })));
}

function mrtTrack(len) {
  return group(mesh("box", mat("#c9c4bc"), { pos: [0, 4.2, 0], scale: [len, 0.5, 1.2] }), ...Array.from({ length: Math.ceil(len / 6) }, (_, i) => mesh("box", mat("#b5b0a6"), { pos: [-len / 2 + i * 6 + 3, 2, 0], scale: [0.6, 4, 0.6] })));
}

// ---------- The centre ----------

// preset: from centrelook.presetFor. Returns the group, glowing lamps to flicker, smoke spots and fans.
export function buildCentre(preset, { map, era, tables }) {
  const g = new Group();
  const out = { group: g, lamps: [], smoke: [], fans: [] };
  const w = map.w;
  const c = preset.colours;
  const night = preset.time === "night";
  const evening = night || preset.time === "dusk";
  const a = preset.archetype;
  const add = (obj, x, y, z, ry = 0) => {
    obj.position.set(x, y, z);
    obj.rotation.y = ry;
    g.add(obj);
    return obj;
  };

  // Columns in front of the dining area and at the back, between the tables.
  const colKind = { pavilion: "round", market: "square", complex: "square", octagon: "iron", artdeco: "round", modern: "slim" }[a];
  const colH = a === "complex" ? 3.2 : a === "modern" ? 4.2 : 3.4;
  if (colKind) {
    const xs = [-0.7, w * 0.25, w * 0.5, w * 0.75, w + 0.7];
    for (const x of xs) add(column(colKind, c.pillar, colH), x, 0, -1.05);
    for (const x of [-0.7, w / 2, w + 0.7]) add(column(colKind, c.pillar, colH), x, 0, -4.7);
  }

  // The fascia beam with the centre's name: the first thing you read on most hawker centres.
  if (colKind) add(mesh("box", mat(c.accent), { scale: [w + 3.2, 0.22, 0.24] }), w / 2, colH + 0.1, -1.05);
  if (preset.sign && colKind) add(sign(preset.sign, c.sign ?? c.accent, Math.min(7, w * 0.6), evening), w / 2, colH + 0.62, -1.0);

  if (a === "pavilion" || a === "market") {
    // A long pitched roof, cut away at the front so the dining area stays in view: rafters, the ridge,
    // and the far slope in corrugated sheet.
    const ridgeY = colH + 1.4;
    for (const x of [-0.7, w * 0.25, w * 0.5, w * 0.75, w + 0.7]) {
      add(mesh("box", mat(c.accent), { scale: [0.16, 0.16, 2.9], rot: [-0.48, 0, 0] }), x, colH + 0.7, -2.3);
    }
    add(mesh("box", mat(c.accent), { scale: [w + 3.4, 0.18, 0.18] }), w / 2, ridgeY, -3.45);
    for (const k of [0.33, 0.66]) add(mesh("box", mat(c.accent), { scale: [w + 3.4, 0.08, 0.08], shadow: false }), w / 2, colH + 0.2 + k * 1.3, -1.05 - k * 2.4);
    // The near slope, see-through, so the roof reads as a roof without hiding the tables.
    add(mesh("box", mat(c.roof, { transparent: true, opacity: 0.22, outline: false }), { scale: [w + 3.6, 0.04, 2.75], rot: [-0.48, 0, 0], shadow: false }), w / 2, colH + 0.75, -2.3);
    const slope = mesh("box", mat("#ffffff", { map: repeatOf(corrugated(c.roof), (w + 4) / 2, 2) }), { scale: [w + 3.6, 0.08, 3.2], rot: [0.44, 0, 0] });
    add(slope, w / 2, ridgeY - 0.65, -4.85);
    if (a === "market") add(marketRow(Math.ceil((w + 8) / 1.6)), -4, 0, -6.2);
    // A tiered roof like a kampung house: a second, steeper roof above the first, with a gable end.
    if (preset.roofStyle === "tiered") {
      const upper = mesh("box", mat("#ffffff", { map: repeatOf(corrugated(c.roof), (w + 2) / 2, 2) }), { scale: [w + 1, 0.08, 2.2], rot: [0.75, 0, 0] });
      add(upper, w / 2, ridgeY + 0.9, -4.4);
      for (const x of [-0.6, w + 0.6]) add(mesh("cone", mat(c.accent), { scale: [1.3, 1.2, 0.08], rot: [0, 0, 0] }), x, ridgeY + 0.5, -3.45);
    }
    if (preset.features.includes("umbrellas")) tables.forEach(([x, z], i) => add(umbrella(["#f4ead6", c.accent, "#f4ead6", c.roof][i % 4]), x, 0, z));
    if (preset.features.includes("fans") || era.id === "1980s") {
      for (const [x, z] of tables) {
        const fan = ceilingFan();
        fan.position.set(x, colH - 0.2, z);
        g.add(fan);
        out.fans.push(fan);
      }
    }
  }

  if (a === "complex") {
    // The floor above: its slab edge, a parapet, more stalls upstairs, strip lights below.
    add(mesh("box", mat(c.roof), { scale: [w + 6, 0.35, 6.2] }), w / 2, colH + 0.17, -4.2);
    add(mesh("box", mat(c.pillar), { scale: [w + 6, 0.5, 0.12] }), w / 2, colH + 0.6, -1.15);
    for (let i = 0; i < 4; i++) {
      const tube = add(mesh("box", mat("#ffffff", { emissive: "#f4fbff", glow: 1.8, outline: false }), { scale: [1.2, 0.05, 0.08], shadow: false }), 1 + i * (w / 3.2), colH - 0.05, -1.5);
      out.lamps.push(tube);
    }
    const up = stallRow(era, Math.ceil((w + 10) / 2.3));
    up.position.set(-5, colH + 0.35, -6.4);
    g.add(up);
    if (preset.features.includes("wetmarket")) add(marketRow(Math.ceil((w + 8) / 1.6)), -4, 0, -6.2);
  }

  if (a === "octagon") {
    // Cast iron arches between the columns, the far half of the octagonal roof, the clock tower.
    for (let i = 0; i < 4; i++) {
      const x0 = [-0.7, w * 0.25, w * 0.5, w * 0.75, w + 0.7][i];
      const x1 = [-0.7, w * 0.25, w * 0.5, w * 0.75, w + 0.7][i + 1];
      const arch = new Mesh(archGeo, mat(c.pillar));
      arch.scale.set((x1 - x0) / 2, 0.7, 1);
      add(arch, (x0 + x1) / 2, colH - 0.75, -1.05);
      // Lacy ironwork in the spandrels.
      for (const k of [0.15, 0.85]) add(mesh("sphere", mat(c.pillar), { scale: [0.09, 0.09, 0.03], shadow: false }), x0 + (x1 - x0) * k, colH - 0.2, -1.05);
    }
    const roof = new Mesh(new CylinderGeometry(0.2, 9, 2.6, 8, 1, false), mat(c.roof));
    add(roof, w / 2, colH + 2.4, -9.5, Math.PI / 8);
    add(clockTower(c.accent, c.roof), w / 2, colH + 1.2, -9.5);
    add(clockTower(c.accent, c.roof), -2.3, 0, -1.6);
  }

  if (a === "artdeco") {
    // A long curved white facade with horizontal bands, like the 1930s flats around Tiong Bahru.
    const curve = new Mesh(new CylinderGeometry(9, 9, 3.6, 24, 1, true, Math.PI * 0.82, Math.PI * 0.36), mat(c.pillar));
    add(curve, w / 2, 1.8, 2.6);
    for (const y of [0.9, 2.0, 3.1]) add(new Mesh(new CylinderGeometry(9.05, 9.05, 0.12, 24, 1, true, Math.PI * 0.82, Math.PI * 0.36), mat(c.accent)), w / 2, y, 2.6);
    for (const x of [-3.2, w + 3.2]) {
      const flat = group(mesh("cyl", mat("#f4f1ea"), { pos: [0, 2.2, 0], scale: [1.4, 4.4, 1.4] }), ...[1.1, 2.3, 3.5].map((y) => mesh("cyl", mat("#2f6b4f"), { pos: [0, y, 0], scale: [1.42, 0.1, 1.42], shadow: false })));
      add(flat, x, 0, -2);
    }
  }

  if (a === "modern") {
    // A big canopy with louvres and wide fans, plants along the edge.
    add(mesh("box", mat(c.roof), { scale: [w + 7, 0.14, 7] }), w / 2, colH + 0.3, -4.4);
    for (let i = 0; i < 9; i++) add(mesh("box", mat("#c9c4bc"), { scale: [w + 7, 0.05, 0.12], shadow: false }), w / 2, colH + 0.42, -1.2 - i * 0.75);
    for (const [x, z] of tables.slice(0, 2)) {
      const fan = ceilingFan();
      fan.scale.setScalar(1.8);
      fan.position.set(x + 1.4, colH - 0.3, z);
      g.add(fan);
      out.fans.push(fan);
    }
    for (const x of [-1.4, w + 1.4]) add(group(mesh("box", mat("#d9dde0"), { pos: [0, 0.3, 0], scale: [0.8, 0.6, 2.4] }), mesh("sphere", mat("#5fae5a"), { pos: [0, 0.75, 0], scale: [0.5, 0.35, 1.2] })), x, 0, 1.2);
  }

  if (a === "openair") {
    // No roof: umbrellas over the tables, and lights strung between poles in the evening.
    tables.forEach(([x, z], i) => add(umbrella([c.accent, "#f2c94c", "#f4f1ea", "#c8553d"][i % 4]), x, 0, z));
    for (const x of [-0.8, w + 0.8]) add(mesh("cyl8", mat("#9aa0a6"), { scale: [0.05, 3, 0.05] }), x, 1.5, -1.1);
    const string = bulbs([-0.8, 2.9, -1.1], [w + 0.8, 2.9, -1.1], 18);
    g.add(string);
    if (evening) out.lamps.push(...string.children);
    // The centre's name on an arch by the entrance.
    if (preset.sign) {
      add(mesh("box", mat(c.accent), { scale: [0.2, 3.2, 0.2] }), -1.6, 1.6, -0.6);
      add(sign(preset.sign, c.sign ?? c.accent, 6, evening), 1.4, 3.3, -0.6);
    }
  }

  if (a === "street") {
    for (const [x, colors] of [[-7.4, ["#e8c46a", "#9fc4b0"]], [w + 4.2, ["#e8a08a", "#c4b0d8"]]]) {
      const row = shophouses(3, colors);
      row.position.set(x, 0, -0.8);
      g.add(row);
    }
    const back = shophouses(w + 14, ["#e8a08a", "#9fc4b0", "#e8c46a", "#c4b0d8"]);
    back.position.set(-7, 0, -8.4);
    g.add(back);
    if (preset.sign) {
      add(mesh("cyl8", mat("#6a4424"), { scale: [0.05, 3, 0.05] }), -1.2, 1.5, -0.4);
      add(sign(preset.sign, "#6a4424", 4), 0.9, 2.9, -0.4);
    }
  }

  // The rest of the hall behind, for centres with stalls all round.
  if (["pavilion", "octagon", "artdeco", "modern"].includes(a)) {
    const row = stallRow(era, Math.ceil((w + 10) / 2.3));
    row.position.set(-5, 0, a === "artdeco" ? -5.2 : -5.6);
    g.add(row);
  }
  if ((a === "complex" && !preset.features.includes("wetmarket")) || a === "openair") {
    const row = stallRow(era, Math.ceil((w + 10) / 2.3));
    row.position.set(-5, 0, -5.6);
    row.scale.y = a === "openair" ? 0.85 : 1;
    g.add(row);
  }

  // Satay: a row of grills along one side, smoking away.
  if (preset.features.includes("satay")) {
    const grills = sataySmokeGrills(4);
    grills.position.set(w + 2.2, 0, 0.6);
    g.add(grills);
    for (const [x, y, z] of grills.userData.smoke) out.smoke.push([w + 2.2 + x, y, 0.6 + z]);
    out.lamps.push(...grills.children.filter((m) => m.material?.emissive && m.material.emissiveIntensity > 1));
  }
  if (preset.features.includes("lanterns")) {
    const s = bulbs([-0.7, 3.0, -1.6], [w + 0.7, 3.0, -1.6], 10, "#e0533a");
    s.children.forEach((b) => b.scale.set(0.16, 0.2, 0.16));
    g.add(s);
    out.lamps.push(...s.children);
  }
  if (evening && a !== "openair" && a !== "street") {
    const s = bulbs([-0.7, colH - 0.25, -2.6], [w + 0.7, colH - 0.25, -2.6], 12);
    g.add(s);
    out.lamps.push(...s.children);
  }

  // Beyond the centre. Sides are for wide screens, the far back for tall ones.
  const back = preset.backdrop;
  if (back.includes("cbd")) {
    for (const [x, z, h, wd] of [[-2.4, -5.2, 11, 2], [-5, -3, 9, 2.4], [w + 2.4, -5.6, 12, 2], [w + 5.2, -3.4, 10, 2.6]]) add(tower(h, wd, night), x, 0, z);
    for (let i = 0; i < 6; i++) add(tower(10 + ((i * 37) % 7), 2.6, night, "#8fb4c8"), -4 + i * 3.6, 0, -12 - (i % 2) * 2);
  }
  if (back.includes("hdb")) {
    for (const [x, z, col] of [[-4.6, 0.2, "#e8c46a"], [w + 4.6, -0.5, "#9fc4b0"]]) {
      const b = hdbBlock(col);
      b.scale.setScalar(0.8);
      add(b, x, 0, z);
    }
    for (let i = 0; i < 3; i++) {
      const b = hdbBlock(["#f2d27a", "#bfe3d0", "#e8a08a"][i]);
      add(b, -2 + i * 7, 0, -12);
    }
  }
  if (back.includes("shophouses") && a !== "street") {
    for (const [x, colors] of [[-7.4, ["#e8c46a", "#9fc4b0"]], [w + 4.2, ["#e8a08a", "#c4b0d8"]]]) {
      const row = shophouses(3, colors);
      row.position.set(x, 0, -1.2);
      g.add(row);
    }
  }
  if (back.includes("sea")) {
    add(seaPlane(preset.time, 80, 30), w / 2, 0, -22);
    add(seaPlane(preset.time, 40, 60), w + 23, 0, 0);
    add(mesh("box", mat("#e8d8b0", { outline: false }), { scale: [1.6, 0.002, 60], shadow: false }), w + 2.2, -0.013, 0);
    add(ship("#3b5bdb"), w + 6, 0, -3);
    add(ship("#5b5f63"), -2, 0, -16);
  }
  if (back.includes("river")) {
    add(mesh("box", mat(night ? "#1a2a44" : "#4a8ab5", { outline: false }), { scale: [6, 0.02, 40], shadow: false }), w + 4.5, -0.03, 0);
    add(mesh("box", mat(night ? "#1a2a44" : "#4a8ab5", { outline: false }), { scale: [60, 0.02, 5], shadow: false }), w / 2, -0.03, -9.5);
    add(bumboat(), w + 4.2, 0, -1.5);
    add(bumboat(), 2, 0, -9.2);
  }
  if (back.includes("temple")) add(templeRoof(), -4.2, 0, -3);
  if (back.includes("village")) for (const [x, z] of [[-3.4, -1], [w + 3.4, -2], [w + 3.6, 3]]) add(kampongHouse("#9aa0a6"), x, 0, z);
  if (back.includes("mrt")) add(mrtTrack(w + 30), w / 2, 0, -10);
  if (back.includes("trees") || (!back.includes("cbd") && !back.includes("sea"))) {
    for (const [x, z, h] of [[-2.6, 1.5, 3.2], [-4.4, 5.2, 3.8], [w + 2.6, 2.4, 3.4], [w + 4.6, 6.4, 3.0]]) {
      if (preset.features.includes("satay") && x > w) continue;
      const t = tree(era, h);
      t.position.set(x, 0, z);
      t.rotation.y = x;
      g.add(t);
    }
  }
  return out;
}

// Light and sky for the time of day. Returns overrides for the scene, or null to keep the era's.
export function timeLook(time, eraLook) {
  if (time === "night") return { sky: "#1b2238", ground: "#2a2a30", shade: 0.55, hemiSky: "#8a98d0", hemiGround: "#2a2420", hemi: 0.62, sun: "#b8c8ff", sunPower: 0.4, key: "#ffe2b0", keyPower: 7 };
  if (time === "dusk") return { sky: "#e8a07a", ground: "#7a6050", shade: 0.8, hemiSky: "#ffd2a8", hemiGround: "#4a3a30", hemi: 1.0, sun: "#ff9a5a", sunPower: 1.4, key: "#ffe2b0", keyPower: 3 };
  if (time === "morning") return { sky: "#f6e2c0", hemiSky: "#fff2d8", hemiGround: eraLook.hemiGround, hemi: eraLook.hemi * 1.02, sun: "#ffd9a0", sunPower: eraLook.sunPower * 0.95 };
  if (time === "lunch") return { sky: eraLook.sky, hemiSky: eraLook.hemiSky, hemiGround: eraLook.hemiGround, hemi: eraLook.hemi * 1.05, sun: "#fffaf0", sunPower: eraLook.sunPower * 1.1 };
  return null;
}
