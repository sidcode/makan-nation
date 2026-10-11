// Paints a terrazzo floor, like the ones in old Singapore flats, as a repeating background tile.

function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function paintTerrazzo(target) {
  const size = 420;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const c = document.createElement("canvas");
  c.width = c.height = size * dpr;
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  const rand = rng(1965);
  const chips = ["#c8553d", "#f2e5cc", "#2b1b12", "#8a9a6b", "#d9a441", "#fffaf0", "#a3644a"];

  g.fillStyle = "#ead9bb";
  g.fillRect(0, 0, size, size);

  for (let i = 0; i < 260; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1.2 + rand() ** 3 * 9;
    const sides = 4 + Math.floor(rand() * 4);
    g.fillStyle = chips[Math.floor(rand() * chips.length)];
    g.globalAlpha = 0.35 + rand() * 0.45;
    const points = Array.from({ length: sides }, (_, k) => {
      const a = (k / sides) * Math.PI * 2 + rand() * 0.6;
      const rr = r * (0.6 + rand() * 0.5);
      return [Math.cos(a) * rr, Math.sin(a) * rr];
    });
    // Draw each chip nine times so the tile wraps without seams.
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        g.beginPath();
        for (const [px, py] of points) g.lineTo(x + ox + px, y + oy + py);
        g.fill();
      }
    }
  }
  target.style.setProperty("--terrazzo", `url(${c.toDataURL("image/png")})`);
  target.style.setProperty("--terrazzo-size", `${size}px`);
}
