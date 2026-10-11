import { launch } from "./rec.mjs";
const { browser, context } = await launch();
const page = await context.newPage();
await page.addInitScript(() => {
  for (const [k, v] of Object.entries({ "makan-walk-centre": "119469", "makan-walk-era": "today", "makan-walk-cam": "above", "makan-look": "soft", "makan-music": 0, "makan-open": true })) localStorage.setItem(k, JSON.stringify(v));
});
await page.goto("http://127.0.0.1:3000/hawker/?makan=119469");
await page.waitForTimeout(3000);
await page.click("#walkGo");
await page.waitForTimeout(2500);
// What a player presses E for, as in the guide tests; everything else is walked to with Go.
const ACT = ["chope", "place", "sit", "clear", "return", "seller"];
const t0 = Date.now();
let last = "";
while (Date.now() - t0 < 160000) {
  const s = await page.evaluate(() => {
    const r = window.__walk;
    if (!r?.w) return null;
    const w = r.w;
    return { order: Boolean(r.order), code: r.order?.picking?.code ?? null, sitting: w.me.sitting, ate: w.me.ate, done: w.done, auto: w.me.auto ? w.me.auto.target?.kind : null, prompt: w.prompt ? `${w.prompt.kind}:${w.prompt.text}` : null, queue: w.me.queue, hold: Boolean(w.me.hold), list: w.list.map((i) => `${i.got ? "G" : "-"}${i.placed ? "P" : "-"}`).join(""), chope: w.me.chope ?? null, help: !document.getElementById("walkHelp").hidden, toast: document.getElementById("walkToast")?.textContent?.slice(0, 60) };
  });
  const line = JSON.stringify(s);
  if (line !== last) { console.log(((Date.now() - t0) / 1000).toFixed(1), line); last = line; }
  if (!s || s.done) { await page.waitForTimeout(300); if (s?.done) break; continue; }
  if (s.order) {
    if (s.code) await page.locator(".worder__kopi button.worder__item", { hasText: s.code }).first().click({ timeout: 1000 }).catch((e) => console.log("kopi click fail", String(e).slice(0, 80)));
    else {
      const item = page.locator(".worder__item.is-list:not([disabled])").first();
      if (await item.count()) await item.click({ timeout: 1000 }).catch(() => {});
      else await page.keyboard.press("Enter");
    }
    await page.waitForTimeout(700);
    continue;
  }
  const kind = s.prompt?.split(":")[0];
  if (s.sitting !== null && s.ate) { await page.keyboard.down("KeyS"); await page.waitForTimeout(400); await page.keyboard.up("KeyS"); }
  else if (!s.auto && ACT.includes(kind) && !(kind === "chope" && s.chope != null)) await page.keyboard.press("KeyE");
  else if (!s.auto) await page.keyboard.press("KeyG");
  await page.waitForTimeout(300);
}
await browser.close();
