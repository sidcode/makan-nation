// Draws a block as an SVG birthday cake: floors, void deck, painted number, candles.
const NS = "http://www.w3.org/2000/svg";

export const PALETTES = [
  { name: "mint", base: "#BFE3CF", band: "#E6F4EC", win: "#7DB497", deep: "#4F8E70" },
  { name: "salmon", base: "#F4B3A2", band: "#FCE0D7", win: "#D7836F", deep: "#B85E4B" },
  { name: "butter", base: "#F5DC8E", band: "#FCF1CB", win: "#D2AF55", deep: "#A7842C" },
  { name: "sky", base: "#AFD6EF", band: "#DFF0FA", win: "#6DA3C8", deep: "#3F7BA3" },
  { name: "lilac", base: "#CFC1E8", band: "#EEE8F8", win: "#9B88C4", deep: "#6F5B9E" },
];
const CLOTHES = ["#E0603F", "#2F6F73", "#F2A33A", "#ffffff", "#6DA3C8", "#D7836F"];

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (parent) parent.appendChild(node);
  return node;
}

function text(parent, str, attrs) {
  const t = el("text", attrs, parent);
  t.textContent = str;
  return t;
}

export function paletteFor(key) {
  return PALETTES[hash(key) % PALETTES.length];
}

export function drawScene(svg, b, age) {
  const key = `${b.blk}|${b.street}`;
  const rand = rng(hash(key));
  const pal = paletteFor(key);
  while (svg.lastChild && svg.lastChild.nodeName !== "title") svg.removeChild(svg.lastChild);

  const W = 400;
  const floors = Math.max(1, b.floors || 1);
  const isRes = b.res;
  const tall = isRes || b.com;
  const bodyH = !tall ? 0 : isRes ? Math.min(330, Math.max(70, floors * 17)) : Math.min(180, Math.max(60, floors * 22));
  const fh = bodyH / floors;
  const crownH = isRes ? 34 : 26;
  const voidH = 36;
  const candleSpace = 92;
  const groundY = tall ? candleSpace + crownH + bodyH + voidH : candleSpace + 150;
  const H = groundY + 30;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const bx = 98;
  const bw = 204;
  const top = candleSpace;
  const cpLevels = tall ? 5 : Math.min(8, floors);

  // Two lazy clouds.
  for (const [cx, cy, sc] of [[46, 26, 1], [330, 52, 0.75]]) {
    const c = el("g", { class: "cloud", transform: `translate(${cx} ${cy}) scale(${sc})` }, svg);
    el("path", { d: "M0 12 a10 10 0 0 1 10 -10 a14 14 0 0 1 26 2 a9 9 0 0 1 12 8 z", fill: "#FFFFFF", opacity: 0.85 }, c);
  }

  // Side buildings first so the block sits in front.
  if (b.market) hawker(svg, tall ? 8 : W / 2 - 42, groundY, pal);
  if (b.carpark) carpark(svg, tall ? 312 : W / 2 - 60, groundY, tall ? 80 : 120, cpLevels);
  if (b.pavilion) pavilion(svg, tall ? 18 : W / 2 - 28, groundY, b.market && tall);

  const g = el("g", { class: "block" }, svg);

  if (isRes || b.com) {
    // Crown with the painted block number.
    el("rect", { x: bx - 4, y: top, width: bw + 8, height: crownH, rx: 3, fill: pal.deep }, g);
    // Water tank on the roof.
    el("rect", { x: bx + bw - 46, y: top - 22, width: 34, height: 22, rx: 2, fill: pal.band, stroke: pal.deep, "stroke-width": 2 }, g);
    el("line", { x1: bx + bw - 40, y1: top - 22, x2: bx + bw - 40, y2: top, stroke: pal.deep, "stroke-width": 1.5 }, g);
    const num = text(g, b.blk, {
      x: bx + 12,
      y: top + crownH - 8,
      class: "blk-num",
      fill: "#FFF8EC",
      "font-size": crownH - 6,
    });
    num.setAttribute("textLength", Math.min(bw - 24, (crownH - 6) * 0.62 * b.blk.length));
    num.setAttribute("lengthAdjust", "spacingAndGlyphs");

    // Facade, one band per floor.
    const fy = top + crownH;
    el("rect", { x: bx, y: fy, width: bw, height: bodyH, fill: pal.base }, g);
    const cols = 7;
    const gap = bw / cols;
    for (let f = 0; f < floors; f++) {
      const y = fy + f * fh;
      el("rect", { x: bx, y: y + fh * 0.72, width: bw, height: Math.max(1.5, fh * 0.28), fill: pal.band }, g);
      for (let c = 0; c < cols; c++) {
        const lit = rand() < 0.22;
        el(
          "rect",
          {
            x: bx + c * gap + gap * 0.2,
            y: y + fh * 0.16,
            width: gap * 0.6,
            height: Math.max(2, fh * 0.5),
            rx: 1,
            fill: lit ? "#FFE9A6" : pal.win,
            class: lit ? "win lit" : "win",
          },
          g,
        );
      }
      // Bamboo laundry poles, the national flag of HDB living.
      if (isRes && fh >= 6 && rand() < 0.3) {
        const side = rand() < 0.5 ? -1 : 1;
        const x0 = side < 0 ? bx : bx + bw;
        const len = 22 + rand() * 10;
        const py = y + fh * 0.45;
        el("line", { x1: x0, y1: py, x2: x0 + side * len, y2: py, stroke: "#B08B4F", "stroke-width": 1.4 }, g);
        const n = 1 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
          const cx = x0 + side * (6 + k * 7);
          el(
            "rect",
            {
              x: cx - 2.5,
              y: py,
              width: 5,
              height: Math.min(fh * 0.9, 8),
              fill: CLOTHES[Math.floor(rand() * CLOTHES.length)],
              class: "cloth",
            },
            g,
          );
        }
      }
    }

    // Void deck with pillars, bunting and the estate cat.
    const vy = fy + bodyH;
    el("rect", { x: bx, y: vy, width: bw, height: voidH, fill: "#4A4652", opacity: 0.18 }, g);
    for (let x = bx; x <= bx + bw; x += bw / 5) {
      el("rect", { x: Math.min(x, bx + bw - 8), y: vy, width: 8, height: voidH, fill: "#C9C3B8" }, g);
    }
    if (b.com) {
      for (let i = 0; i < 4; i++) {
        const ax = bx + 12 + i * (bw / 4);
        awning(g, ax, vy + 4, bw / 4 - 22, i);
      }
    }
    bunting(g, bx + 4, vy + 3, bw - 8);
    if (isRes) cat(g, bx + bw * 0.32, groundY);
  } else if (!b.carpark && !b.pavilion && !b.market) {
    // Something else entirely. Draw a humble box.
    el("rect", { x: bx, y: groundY - 80, width: bw, height: 80, rx: 6, fill: pal.base }, g);
    text(g, b.blk, { x: bx + 12, y: groundY - 50, class: "blk-num", fill: pal.deep, "font-size": 28 });
  }

  // Ground.
  el("rect", { x: 0, y: groundY, width: W, height: 30, fill: "#CFE6C4" }, svg);
  el("rect", { x: 0, y: groundY, width: W, height: 4, fill: "#B6D6A8" }, svg);

  // Candles spell the age on the roof.
  const roofY = tall
    ? top
    : b.carpark
      ? groundY - cpLevels * 15 - 24
      : b.market
        ? groundY - 66
        : b.pavilion
          ? groundY - 48
          : groundY - 82;
  candles(svg, String(age), W / 2 - 20, roofY - 2);

  return { height: H };
}

function candles(svg, digits, cx, baseY) {
  const g = el("g", { class: "candles" }, svg);
  const size = 62;
  const step = size * 0.62;
  const startX = cx - ((digits.length - 1) * step) / 2;
  const colors = ["#E0603F", "#3F7BA3", "#F2A33A", "#6F5B9E"];
  [...digits].forEach((d, i) => {
    const x = startX + i * step;
    const t = text(g, d, {
      x,
      y: baseY,
      "text-anchor": "middle",
      class: "candle-digit",
      "font-size": size,
      fill: colors[i % colors.length],
    });
    t.setAttribute("stroke", "#FFF8EC");
    t.setAttribute("stroke-width", "4");
    t.setAttribute("paint-order", "stroke");
    const wickTop = baseY - size * 0.74;
    el("line", { x1: x, y1: wickTop, x2: x, y2: wickTop - 7, stroke: "#3B3A44", "stroke-width": 1.6 }, g);
    const flame = el("g", { class: "flame", style: `transform-origin: ${x}px ${wickTop - 7}px; animation-delay: ${-i * 0.37}s` }, g);
    el("path", { d: `M${x} ${wickTop - 25} C ${x + 8} ${wickTop - 14}, ${x + 6} ${wickTop - 6}, ${x} ${wickTop - 6} C ${x - 6} ${wickTop - 6}, ${x - 8} ${wickTop - 14}, ${x} ${wickTop - 25} Z`, fill: "#F2A33A" }, flame);
    el("path", { d: `M${x} ${wickTop - 18} C ${x + 4} ${wickTop - 12}, ${x + 3} ${wickTop - 8}, ${x} ${wickTop - 8} C ${x - 3} ${wickTop - 8}, ${x - 4} ${wickTop - 12}, ${x} ${wickTop - 18} Z`, fill: "#FFE9A6" }, flame);
    const smoke = el("g", { class: "smoke" }, g);
    for (let k = 0; k < 3; k++) {
      el("circle", { cx: x + (k - 1) * 3, cy: wickTop - 12 - k * 8, r: 3 + k, fill: "#B9B4AC", style: `animation-delay:${k * 0.15}s` }, smoke);
    }
  });
}

function bunting(g, x, y, w) {
  const colors = ["#E0603F", "#F2A33A", "#3F7BA3", "#7DB497", "#CFC1E8"];
  el("path", { d: `M${x} ${y} Q ${x + w / 2} ${y + 10} ${x + w} ${y}`, stroke: "#6B5E50", "stroke-width": 1, fill: "none" }, g);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const px = x + w * t;
    const py = y + 10 * 4 * t * (1 - t) * 0.5 + 0.5;
    el("path", { d: `M${px - 5} ${py} L${px + 5} ${py} L${px} ${py + 9} Z`, fill: colors[i % colors.length], class: "flag", style: `animation-delay:${-i * 0.2}s; transform-origin:${px}px ${py}px` }, g);
  }
}

function cat(g, x, groundY) {
  const c = el("g", { class: "cat", transform: `translate(${x} ${groundY})` }, g);
  el("path", { d: "M14 -2 C 24 -4, 26 -14, 20 -16", stroke: "#3B3A44", "stroke-width": 3, fill: "none", "stroke-linecap": "round", class: "tail" }, c);
  el("ellipse", { cx: 8, cy: -8, rx: 9, ry: 8, fill: "#3B3A44" }, c);
  el("circle", { cx: 2, cy: -19, r: 6.5, fill: "#3B3A44" }, c);
  el("path", { d: "M-3 -22 L-2 -29 L2 -24 Z M3 -24 L7 -29 L7.5 -21 Z", fill: "#3B3A44" }, c);
  const eyes = el("g", { class: "eyes" }, c);
  el("ellipse", { cx: -0.5, cy: -19.5, rx: 1.3, ry: 1.6, fill: "#F2D25C" }, eyes);
  el("ellipse", { cx: 4.5, cy: -19.5, rx: 1.3, ry: 1.6, fill: "#F2D25C" }, eyes);
}

function awning(g, x, y, w, i) {
  const colors = ["#E0603F", "#3F7BA3", "#7DB497", "#F2A33A"];
  const stripes = 5;
  for (let s = 0; s < stripes; s++) {
    el("rect", { x: x + (s * w) / stripes, y, width: w / stripes, height: 8, fill: s % 2 ? "#FFF8EC" : colors[i % colors.length] }, g);
  }
}

function hawker(svg, x, groundY, pal) {
  const g = el("g", { class: "hawker" }, svg);
  const w = 84;
  const h = 46;
  el("rect", { x, y: groundY - h, width: w, height: h, fill: "#EFE6D6" }, g);
  el("path", { d: `M${x - 4} ${groundY - h} L${x + w / 4} ${groundY - h - 16} L${x + w / 2} ${groundY - h} L${x + (3 * w) / 4} ${groundY - h - 16} L${x + w + 4} ${groundY - h} Z`, fill: "#E0603F" }, g);
  el("rect", { x: x + 8, y: groundY - h + 8, width: w - 16, height: 12, rx: 2, fill: "#2F6F73" }, g);
  text(g, "MKT & FOOD", { x: x + w / 2, y: groundY - h + 17.5, "text-anchor": "middle", class: "sign", fill: "#FFF8EC", "font-size": 8 });
  for (let i = 0; i < 3; i++) {
    el("path", { d: `M${x + 22 + i * 18} ${groundY - 12} q 3 -4 0 -7 q -3 -4 0 -7`, stroke: "#FFFFFF", "stroke-width": 2, fill: "none", class: "steam", style: `animation-delay:${i * 0.4}s` }, g);
    el("path", { d: `M${x + 15 + i * 18} ${groundY - 10} h 14 a 7 7 0 0 1 -14 0 z`, fill: pal.deep }, g);
  }
}

function carpark(svg, x, groundY, w, levels) {
  const g = el("g", { class: "carpark" }, svg);
  const lh = 15;
  for (let i = 0; i < levels; i++) {
    const y = groundY - (i + 1) * lh;
    el("rect", { x, y, width: w, height: lh, fill: i % 2 ? "#DAD5CB" : "#CFC9BE" }, g);
    el("rect", { x, y: y + 2, width: w, height: 3, fill: "#A9A397" }, g);
  }
  el("rect", { x: x + w - 18, y: groundY - levels * lh - 20, width: 16, height: 16, rx: 3, fill: "#3F7BA3" }, g);
  text(g, "P", { x: x + w - 10, y: groundY - levels * lh - 7.5, "text-anchor": "middle", fill: "#FFF8EC", class: "sign", "font-size": 12 });
}

function pavilion(svg, x, groundY, shift) {
  const g = el("g", { class: "pavilion" }, svg);
  const px = shift ? x + 300 : x;
  el("path", { d: `M${px - 6} ${groundY - 30} L${px + 28} ${groundY - 44} L${px + 62} ${groundY - 30} Z`, fill: "#B85E4B" }, g);
  el("rect", { x: px, y: groundY - 30, width: 4, height: 30, fill: "#8C7F70" }, g);
  el("rect", { x: px + 52, y: groundY - 30, width: 4, height: 30, fill: "#8C7F70" }, g);
  el("rect", { x: px + 14, y: groundY - 12, width: 28, height: 4, fill: "#8C7F70" }, g);
}
