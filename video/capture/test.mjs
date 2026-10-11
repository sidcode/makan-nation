import { launch, record } from "./rec.mjs";
const { browser, context } = await launch();
const page = await context.newPage();
await page.addInitScript(() => {
  const s = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  s("makan-open", true); s("makan-level", "chickenrice"); s("makan-era", "today"); s("makan-hints", "labels"); s("makan-tutorial", true); s("makan-look", "toon"); s("makan-gfx", "2");
});
await page.goto("http://127.0.0.1:3000/hawker/?autoplay");
await page.waitForTimeout(2000);
await page.click("#playHere");
await page.waitForTimeout(500);
const r = await record(page, "/tmp/claude-1000/-home-sid-hack-makeathon/851cf47d-daf1-4f4a-b479-34f760815cc3/scratchpad/test-kitchen.mp4", async (p) => {
  await p.click("#startBtn");
  await p.waitForTimeout(12000);
});
console.log(r, await page.evaluate(() => ({ served: window.__makan?.sim?.served, gpu: (() => { const gl = document.createElement("canvas").getContext("webgl2"); const e = gl.getExtension("WEBGL_debug_renderer_info"); return gl.getParameter(e.UNMASKED_RENDERER_WEBGL); })() })));
await browser.close();
