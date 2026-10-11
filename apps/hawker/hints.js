// The Hints setting (Off, Labels, Guide) and the name tags that float over crates and stations.
// Tags are page elements laid over the canvas, so the text stays crisp on phones. They step aside
// (fade right down) whenever a chef walks behind one.

import { INGREDIENTS } from "./dishes.js";
import { groupOf, iconSvg, stationIcon } from "./icons.js";

export const HINT_LEVELS = ["off", "labels", "guide"];
export const HINT_NAMES = { off: "Off", labels: "Labels", guide: "Guide" };

export const STATION_NAMES = {
  counter: "Counter", board: "Chopping board", shaver: "Ice shaver", wok: "Wok", pot: "Pot", cooker: "Rice cooker",
  grill: "Grill", urn: "Kopi urn", hatch: "SERVE hatch", rack: "Clean plates", return: "Dirty plates", sink: "Sink",
  bin: "Bin", ext: "Extinguisher stand", boxes: "Takeaway boxes", press: "Sugarcane press",
  kaya: "Kaya and butter",
};

const SHORT = { board: "Board", hatch: "SERVE", ext: "Extinguisher" };
const title = (s) => s.toLowerCase().replace(/^./, (c) => c.toUpperCase());

// A short name for a tag: the crate's own label, or the station's name in this era.
export function tagText(st, era) {
  if (st.type === "crate") {
    if (st.ing === "chicken" && era?.chickenLabel) return title(era.chickenLabel);
    return title(INGREDIENTS[st.ing]?.label ?? st.ing);
  }
  if (st.type === "cooker" && era?.id === "1950s") return "Steamer";
  if (st.type === "ext" && era?.id === "1950s") return "Wet towel";
  if (st.type === "boxes") return title(era?.boxLabel ?? "Takeaway");
  return SHORT[st.type] ?? STATION_NAMES[st.type] ?? st.type;
}

// Neighbouring stations of the same kind share one tag: two woks side by side read as "Wok".
export function tagGroups(map) {
  const seen = new Set();
  const groups = [];
  for (const st of map.stations) {
    if (seen.has(st.i) || st.type === "counter") continue;
    const members = [st];
    seen.add(st.i);
    if (st.type !== "crate") {
      for (let n = 0; n < members.length; n++) {
        const m = members[n];
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const i = map.grid[m.z + dz]?.[m.x + dx];
          const other = i >= 0 ? map.stations[i] : null;
          if (other && other.type === st.type && !seen.has(other.i)) {
            seen.add(other.i);
            members.push(other);
          }
        }
      }
    }
    const x = members.reduce((a, s) => a + s.x + 0.5, 0) / members.length;
    const z = members.reduce((a, s) => a + s.z + 0.5, 0) / members.length;
    groups.push({ type: st.type, ing: st.ing, members: members.map((s) => s.i), x, z });
  }
  return groups;
}

const HEIGHT = { crate: 1.42, urn: 1.75, shaver: 1.75, press: 1.75, hatch: 2.05, cooker: 1.5, bin: 1.0 };

export class Tags {
  constructor(root, view) {
    this.root = root;
    this.view = view;
    this.tags = [];
    this.stamp = -1;
    this.on = false;
  }

  build(map, era) {
    this.tags = tagGroups(map).map((g) => {
      const st = map.stations[g.members[0]];
      const grp = g.type === "crate" ? groupOf(g.ing) : null;
      const el = document.createElement("span");
      el.className = `tag${grp ? " tag--crate" : ""}${g.type === "hatch" ? " tag--serve" : ""}`;
      if (grp) el.style.setProperty("--g", grp.color);
      const icon = g.type === "crate" ? g.ing : stationIcon(g.type, era?.id);
      if (icon) el.append(iconSvg(icon, { size: 16 }));
      const b = document.createElement("b");
      b.textContent = tagText(st, era);
      el.append(b);
      if (grp) el.title = `${b.textContent} · ${grp.name}`;
      return { ...g, el, y: HEIGHT[g.type] ?? 1.35, w: 0, h: 0, sx: 0, sy: 0 };
    });
    this.root.replaceChildren(...this.tags.map((t) => t.el));
    this.stamp = -1;
  }

  show(on) {
    this.on = on;
    this.root.hidden = !on;
    this.stamp = -1;
  }

  clear() {
    this.tags = [];
    this.root.replaceChildren();
  }

  // Makes the tags of these stations jump, for pings from a ticket.
  ping(indices) {
    for (const t of this.tags) {
      if (!t.members.some((i) => indices.includes(i))) continue;
      t.el.classList.remove("is-ping");
      void t.el.offsetWidth;
      t.el.classList.add("is-ping");
      clearTimeout(t.pingTimer);
      t.pingTimer = setTimeout(() => t.el.classList.remove("is-ping"), 1400);
    }
  }

  // Projects tags when the camera moves, nudging overlapping ones apart, and fades any a chef is behind.
  update() {
    if (!this.on || !this.tags.length) return;
    const view = this.view;
    if (view.camStamp !== this.stamp) {
      this.stamp = view.camStamp;
      const r = this.root.getBoundingClientRect();
      for (const t of this.tags) {
        if (!t.w) {
          t.w = t.el.offsetWidth;
          t.h = t.el.offsetHeight;
        }
        const [x, y] = view.toScreen(t.x, t.y, t.z);
        // Kept inside the screen: a tag at the edge slides inwards over the floor.
        t.sx = Math.min(Math.max(2, x - r.left - t.w / 2), r.width - t.w - 2);
        t.sy = Math.max(2, y - r.top - t.h);
      }
      // Front rows first; later tags shuffle up or down out of the way.
      const placed = [];
      const hits = (t, y) => placed.some((p) => t.sx < p.sx + p.w + 2 && t.sx + t.w + 2 > p.sx && y < p.sy + p.h + 1 && y + t.h + 1 > p.sy);
      for (const t of [...this.tags].sort((a, b) => b.z - a.z || a.x - b.x)) {
        const tries = [0, -1, 1, -2, 2].map((k) => t.sy + k * (t.h + 2));
        t.sy = tries.find((y) => !hits(t, y)) ?? t.sy;
        placed.push(t);
        t.el.style.setProperty("--at", `translate(${Math.round(t.sx)}px, ${Math.round(t.sy)}px)`);
      }
    }
    // Fade tags a chef is standing behind.
    const r = this.root.getBoundingClientRect();
    const chefs = view.chefBoxes().map(([x, y0, y1]) => [x - r.left, y0 - r.top, y1 - r.top]);
    const pad = 10;
    for (const t of this.tags) {
      const over = chefs.some(([x, y0, y1]) => x + pad > t.sx && x - pad < t.sx + t.w && y1 > t.sy && y0 < t.sy + t.h);
      if (over !== t.dim) {
        t.dim = over;
        t.el.classList.toggle("is-dim", over);
      }
    }
  }
}
