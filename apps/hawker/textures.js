// Small canvas textures painted at startup, so the game needs no image files.
import { drawIcon } from "./icons.js";
import {
  CanvasTexture,
  DataTexture,
  NearestFilter,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";

function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function canvas(w, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function toTexture(c, repeat = 1) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat !== 1) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(repeat, repeat);
  }
  return t;
}

// Terrazzo, like the floors of old Singapore flats and the radio page.
export function terrazzo(base = "#ead9bb", seed = 1965) {
  const size = 512;
  const [c, g] = canvas(size);
  const rand = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const chips = ["#c8553d", "#f2e5cc", "#2b1b12", "#8a9a6b", "#d9a441", "#fffaf0", "#a3644a"];
  for (let i = 0; i < 520; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1.5 + rand() ** 3 * 10;
    const sides = 4 + Math.floor(rand() * 4);
    g.fillStyle = chips[Math.floor(rand() * chips.length)];
    g.globalAlpha = 0.35 + rand() * 0.5;
    const pts = Array.from({ length: sides }, (_, k) => {
      const a = (k / sides) * Math.PI * 2 + rand() * 0.6;
      const rr = r * (0.6 + rand() * 0.5);
      return [Math.cos(a) * rr, Math.sin(a) * rr];
    });
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        g.beginPath();
        for (const [px, py] of pts) g.lineTo(x + ox + px, y + oy + py);
        g.fill();
      }
    }
  }
  g.globalAlpha = 1;
  return toTexture(c);
}

// White marble table tops with soft grey veins.
export function marble(seed = 7) {
  const [c, g] = canvas(256);
  const rand = rng(seed);
  g.fillStyle = "#f6f2ea";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9; i++) {
    g.strokeStyle = `rgba(120,115,110,${0.12 + rand() * 0.18})`;
    g.lineWidth = 0.6 + rand() * 1.8;
    g.beginPath();
    let x = rand() * 256;
    let y = -10;
    g.moveTo(x, y);
    while (y < 266) {
      x += (rand() - 0.5) * 40;
      y += 12 + rand() * 20;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return toTexture(c);
}

// A Peranakan style tile for the counter fronts.
export function peranakan(seed = 3) {
  const [c, g] = canvas(128);
  g.fillStyle = "#f4ead6";
  g.fillRect(0, 0, 128, 128);
  const petal = (cx, cy, r, color) => {
    g.fillStyle = color;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      const a = (k * Math.PI) / 2;
      g.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.45, r * 0.22, a, 0, Math.PI * 2);
      g.fill();
    }
  };
  for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) {
    g.fillStyle = "#2f7a6b";
    g.beginPath();
    g.arc(x, y, 30, 0, Math.PI * 2);
    g.fill();
  }
  petal(64, 64, 52, "#d9708a");
  g.fillStyle = "#f2b632";
  g.beginPath();
  g.arc(64, 64, 10, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#2f7a6b";
  g.lineWidth = 4;
  g.strokeRect(2, 2, 124, 124);
  return toTexture(c);
}

// A painted label for crates and signboards.
export function label(text, { bg = "#2f6b4f", fg = "#fff4dc", w = 256, h = 96, font = "600 44px 'Bricolage Grotesque Variable', system-ui, sans-serif", sub, subFont } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = fg;
  g.globalAlpha = 0.5;
  g.lineWidth = 4;
  g.strokeRect(6, 6, w - 12, h - 12);
  g.globalAlpha = 1;
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = font;
  if (sub) {
    g.fillText(text, w / 2, h * 0.4);
    g.font = subFont ?? "500 22px 'DM Mono', ui-monospace, monospace";
    g.fillText(sub, w / 2, h * 0.75);
  } else g.fillText(text, w / 2, h / 2 + 2);
  return toTexture(c);
}

// A crate tag: the food group's colour band, the ingredient's icon and its name, so a crate reads the
// same as its icon on the tickets. Colour is never the only clue.
export function crateTag(text, icon, band, { w = 256, h = 112 } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = "#fff4dc";
  g.fillRect(0, 0, w, h);
  g.fillStyle = band;
  g.fillRect(0, 0, w, 18);
  g.fillRect(0, h - 8, w, 8);
  g.strokeStyle = "#2b1b12";
  g.lineWidth = 4;
  g.strokeRect(2, 2, w - 4, h - 4);
  drawIcon(g, icon, 10, 26, 72);
  g.fillStyle = "#2b1b12";
  g.textAlign = "left";
  g.textBaseline = "middle";
  const size = text.length > 12 ? 22 : text.length > 8 ? 28 : 34;
  g.font = `700 ${size}px 'Bricolage Grotesque Variable', system-ui, sans-serif`;
  const words = text.split(" ");
  if (g.measureText(text).width > w - 96 && words.length > 1) {
    const mid = Math.ceil(words.length / 2);
    g.fillText(words.slice(0, mid).join(" "), 88, 50);
    g.fillText(words.slice(mid).join(" "), 88, 50 + size);
  } else g.fillText(text, 88, 62, w - 96);
  return toTexture(c);
}

// A stall's menu board: the stall's name and number, then one line per dish with its price.
export function menuTexture(title, sub, lines, { bg = "#2b1b12", fg = "#fff4dc", accent = "#f2b632" } = {}) {
  const w = 512;
  const h = 96 + lines.length * 46;
  const [c, g] = canvas(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = accent;
  g.lineWidth = 6;
  g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = accent;
  g.textBaseline = "middle";
  g.font = "700 34px 'Bricolage Grotesque Variable', system-ui, sans-serif";
  g.fillText(title, 28, 44, w - 170);
  g.textAlign = "right";
  g.font = "500 24px 'DM Mono', ui-monospace, monospace";
  g.fillText(sub, w - 28, 44);
  lines.forEach(([name, price], i) => {
    const y = 100 + i * 46;
    g.fillStyle = fg;
    g.textAlign = "left";
    g.font = "600 30px 'Bricolage Grotesque Variable', system-ui, sans-serif";
    g.fillText(name, 28, y, w - 190);
    g.textAlign = "right";
    g.font = "500 30px 'DM Mono', ui-monospace, monospace";
    g.fillText(price, w - 28, y);
  });
  const t = toTexture(c);
  t.userData = { aspect: w / h };
  return t;
}

// Three-step shading ramp for the toon materials.
export function toonRamp() {
  const data = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 235, 235, 235, 255, 255, 255, 255, 255]);
  const t = new DataTexture(data, 4, 1, RGBAFormat);
  t.minFilter = t.magFilter = NearestFilter;
  t.needsUpdate = true;
  return t;
}
