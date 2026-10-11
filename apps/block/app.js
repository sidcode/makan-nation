import { normBlk, normStreet, streetMatches, tokens, TOWNS, blockKey } from "./street.js";
import { drawScene, hash, rng } from "./scene.js";

const $ = (id) => document.getElementById(id);
const q = $("q");
const suggest = $("suggest");
const hint = $("hint");
const player = $("player");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

// Tiny DOM helper. Strings become text nodes, never HTML.
function h(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

// replaceChildren that skips null and false.
function fill(node, ...kids) {
  node.replaceChildren(...kids.flat().filter((k) => k != null && k !== false));
}

const NOW = new Date();
const THIS_YEAR = NOW.getFullYear();

let blocks = [];
let years = {};
const byKey = new Map();
const resByYear = new Map();
const townYears = new Map();
let current = null;
let hawkers = null; // { nearby, at, names } from /api/block/hawkers

// NEA's names read "Old Airport Road Blk 51 (51 Old Airport Road Food Centre)": the part people use.
const centreName = (id) => {
  const name = hawkers?.names?.[id] ?? "";
  return /\(([^)]+)\)\s*$/.exec(name)?.[1].split("/")[0].trim() ?? name;
};

const pretty = (street) =>
  street
    .toLowerCase()
    .replace(/(^|[\s(/])([a-z])/g, (m, a, c) => a + c.toUpperCase())
    .replace(/\bC'wealth\b/i, "C'wealth");

const ord = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

// Data files sit beside the apps (site.ts): ../data/ here, on the Bun server and on GitHub Pages alike.
const data = (name) => fetch(new URL(`../data/${name}`, document.baseURI)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${name}: ${r.status}`))));
// The server's extras (the shared notice board) are under ../api/; data/site.json says whether there is a
// server, so a static site never asks.
const api = (path, init) => fetch(new URL(`../api/${path}`, document.baseURI), init);
const onServer = data("site.json")
  .then((x) => Boolean(x.server))
  .catch(() => false);
// Saved song previews (data/song-previews.json), by the curated search term.
let previews = null;
const previewsReady = data("song-previews.json")
  .then((x) => (previews = x.previews ?? {}))
  .catch(() => (previews = {}));

async function load() {
  const [b, y] = await Promise.all([data("hdb-blocks.json"), data("block-years.json")]);
  // Hawker centres at and beside each block; the page works without them.
  data("block-hawkers.json")
    .then((x) => {
      hawkers = x;
      if (current) renderNow(current, Math.max(0, THIS_YEAR - current.year));
    })
    .catch(() => {});
  years = y.years;
  blocks = b.blocks.map(([blk, street, floors, year, town, units, flags]) => ({
    blk,
    street,
    floors,
    year,
    town,
    units,
    res: flags[0] === "Y",
    com: flags[1] === "Y",
    market: flags[2] === "Y",
    carpark: flags[3] === "Y",
    pavilion: flags[4] === "Y",
  }));
  for (const blk of blocks) {
    byKey.set(blockKey(blk.blk, blk.street), blk);
    if (!blk.res) continue;
    resByYear.set(blk.year, (resByYear.get(blk.year) ?? 0) + 1);
    const list = townYears.get(blk.town) ?? [];
    list.push(blk.year);
    townYears.set(blk.town, list);
  }
  for (const list of townYears.values()) list.sort((a, c) => a - c);
  $("credits").textContent =
    `Block data: HDB Property Information, data.gov.sg (snapshot ${b.fetched}). Postal lookup: OneMap. ` +
    "Song previews: Apple Music. Every moment links to its source.";
  hint.textContent = `${blocks.length.toLocaleString()} blocks ready. Start typing.`;
}

// ---------- search ----------

let options = [];
let active = -1;

function search(raw) {
  const s = raw.trim().toUpperCase().replace(/^(BLK|BLOCK)\s*/, "");
  if (!s) return [];
  if (/^\d{6}$/.test(s)) return [{ postal: s }];
  if (/^\d{4,5}$/.test(s)) return [{ note: "Postal code? Keep typing, it has six digits." }];
  const m = s.match(/^(\d+[A-Z]?)(?:\s+(.*))?$/);
  const blk = m ? m[1] : null;
  const rest = m ? m[2] ?? "" : s;
  const qt = tokens(rest);
  const out = [];
  for (const b of blocks) {
    if (blk) {
      if (rest ? b.blk !== blk : !b.blk.startsWith(blk)) continue;
    }
    if (!streetMatches(b.street, qt)) continue;
    out.push(b);
    if (out.length > 400) break;
  }
  out.sort(
    (a, c) =>
      c.res - a.res ||
      (blk ? (c.blk === blk) - (a.blk === blk) : 0) ||
      a.street.localeCompare(c.street) ||
      parseInt(a.blk) - parseInt(c.blk) ||
      a.blk.localeCompare(c.blk),
  );
  return out.slice(0, 8);
}

function renderSuggest() {
  suggest.replaceChildren();
  options = search(q.value);
  active = options.length && !options[0].note ? 0 : -1;
  if (!options.length) {
    if (q.value.trim() && blocks.length) {
      suggest.append(h("li", { class: "empty", role: "presentation" }, "No block like that. Try the street name, like 'Toa Payoh Lor 1'."));
      openList(true);
    } else openList(false);
    return;
  }
  options.forEach((o, i) => {
    let li;
    if (o.note) li = h("li", { class: "empty", role: "presentation" }, o.note);
    else if (o.postal)
      li = h("li", { role: "option", id: `opt${i}` }, h("b", {}, `Postal ${o.postal}`), h("span", {}, "Ask OneMap which block this is"));
    else
      li = h(
        "li",
        { role: "option", id: `opt${i}` },
        h("b", {}, `Blk ${o.blk} ${pretty(o.street)}`),
        h("span", {}, `${o.year} · ${TOWNS[o.town] ?? o.town}${o.res ? "" : " · not flats"}`),
      );
    if (!o.note) {
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        choose(o);
      });
    }
    suggest.append(li);
  });
  highlight();
  openList(true);
}

function openList(open) {
  suggest.hidden = !open;
  q.setAttribute("aria-expanded", String(open));
}

function highlight() {
  [...suggest.children].forEach((li, i) => li.setAttribute("aria-selected", String(i === active)));
  if (active >= 0) q.setAttribute("aria-activedescendant", `opt${active}`);
  else q.removeAttribute("aria-activedescendant");
}

async function choose(o) {
  openList(false);
  if (!o) return;
  if (o.postal) return lookupPostal(o.postal);
  q.value = `Blk ${o.blk} ${pretty(o.street)}`;
  show(o, true);
}

// The block for an address OneMap gives: the same street in any spelling, else the block number's street
// that shares the most words with it.
function findBlock(blkRaw, streetRaw) {
  const blk = normBlk(blkRaw);
  const exact = byKey.get(blockKey(blk, normStreet(streetRaw)));
  if (exact) return exact;
  const want = new Set(tokens(streetRaw));
  let best = null;
  let bestScore = 0;
  for (const b of blocks) {
    if (b.blk !== blk) continue;
    const have = b.street.split(" ");
    const score = have.filter((t) => want.has(t)).length / Math.max(have.length, want.size);
    if (score > bestScore) [best, bestScore] = [b, score];
  }
  return bestScore >= 0.5 ? best : null;
}

// Postal codes go straight to OneMap from the browser (it allows that), so this works on a static site too.
async function lookupPostal(code) {
  hint.textContent = `Asking OneMap about ${code}`;
  try {
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?${new URLSearchParams({ searchVal: code, returnGeom: "N", getAddrDetails: "Y", pageNum: "1" })}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) }).catch(() => null);
    if (!res?.ok) throw new Error("OneMap is not answering. Try block number and street instead.");
    const body = await res.json();
    const hits = (body.results ?? []).filter((r) => r.POSTAL === code);
    if (!hits.length) throw new Error("That postal code is not an HDB block we know.");
    const b = hits.map((r) => findBlock(r.BLK_NO, r.ROAD_NAME)).find(Boolean);
    if (!b) throw new Error("Found an address, but not in the HDB list.");
    hint.textContent = `${code} is Blk ${b.blk} ${pretty(b.street)}.`;
    q.value = `Blk ${b.blk} ${pretty(b.street)}`;
    show(b, true);
  } catch (err) {
    hint.textContent = err.message || "Could not find that one.";
  }
}

q.addEventListener("input", renderSuggest);
q.addEventListener("focus", () => q.value && renderSuggest());
q.addEventListener("blur", () => setTimeout(() => openList(false), 120));
q.addEventListener("keydown", (e) => {
  const n = options.length;
  if (e.key === "ArrowDown" && n) {
    e.preventDefault();
    active = (active + 1) % n;
    highlight();
  } else if (e.key === "ArrowUp" && n) {
    e.preventDefault();
    active = (active - 1 + n) % n;
    highlight();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (!options.length) renderSuggest();
    const o = options[active >= 0 ? active : 0];
    if (o && !o.note) choose(o);
  } else if (e.key === "Escape") openList(false);
});
$("go").addEventListener("click", () => {
  renderSuggest();
  const o = options.find((x) => !x.note);
  if (o) choose(o);
  else q.focus();
});
document.querySelectorAll("[data-try]").forEach((btn) =>
  btn.addEventListener("click", () => {
    q.value = btn.dataset.try;
    renderSuggest();
    const o = options.find((x) => !x.note);
    if (o) choose(o);
  }),
);
$("surprise").addEventListener("click", () => {
  const res = blocks.filter((b) => b.res);
  const b = res[Math.floor(Math.random() * res.length)];
  if (b) choose(b);
});

// ---------- the party ----------

function show(b, push) {
  current = b;
  stopSong();
  document.body.classList.add("partying");
  $("party").hidden = false;
  const age = Math.max(0, THIS_YEAR - b.year);
  const key = blockKey(b.blk, b.street);

  drawScene($("scene"), b, age);
  $("sceneTitle").textContent = `Blk ${b.blk} ${pretty(b.street)} drawn as a birthday cake with ${age} on the candles`;
  $("sceneWrap").classList.remove("blown");
  $("blow").textContent = "Blow the candles";
  $("caption").textContent = "";

  renderThen(b);
  renderNow(b, age);
  renderLater(b, key);

  if (push) {
    const url = new URL(location.href);
    url.search = new URLSearchParams({ b: b.blk, s: b.street }).toString();
    history.pushState({ key }, "", url);
  }
  document.title = `Blk ${b.blk} turns ${age} · Block Birthday`;
  hint.textContent = "Try another block, or a postal code.";
  if (push) window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
}

function tense(label) {
  return h("span", { class: "tense" }, label);
}

function renderThen(b) {
  const y = years[String(b.year)] ?? { songs: [] };
  const card = $("then");
  const moments = y.moments ?? [];
  fill(
    card,
    h("header", {}, tense("Then"), h("h2", {}, `Born ${b.year}`)),
    b.year < 1960
      ? h(
          "p",
          { class: "sit" },
          "Built by the Singapore Improvement Trust, before HDB existed. HDB took over its flats in 1960. ",
          h("a", { href: "https://en.wikipedia.org/wiki/Singapore_Improvement_Trust", target: "_blank", rel: "noopener" }, "More"),
        )
      : null,
    moments.length
      ? h(
          "ul",
          { class: "moments" },
          moments.map((m) =>
            h("li", {}, m.text, " ", h("a", { href: m.url, target: "_blank", rel: "noopener", class: "src" }, "source")),
          ),
        )
      : h("p", { class: "quiet" }, "A quiet year in the history books. Your block was the news."),
    y.songs.length ? h("h3", {}, "On the radio that year") : null,
    h(
      "ul",
      { class: "songs" },
      y.songs.map((s, i) => songRow(b.year, i, s)),
    ),
  );
}

function songRow(year, i, s) {
  const btn = h("button", { type: "button", class: "play", "aria-label": `Play ${s.title}`, disabled: true }, h("span", { class: "icon", "aria-hidden": "true" }));
  const via = h("small", { class: "via" }, s.term ? "Finding a preview" : "");
  const row = h(
    "li",
    { class: `song ${s.kind}` },
    btn,
    h(
      "div",
      { class: "meta" },
      h("span", { class: "kind" }, s.kind === "local" ? "Local" : "World"),
      h("b", {}, s.title),
      h("span", { class: "artist" }, s.artist),
      h("span", { class: "note" }, s.note, " ", h("a", { href: s.src, target: "_blank", rel: "noopener", class: "src" }, "source")),
      via,
    ),
    h("span", { class: "eq", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
  );
  const fallback = () => {
    via.replaceChildren(
      "No preview on the shelf. ",
      h(
        "a",
        {
          href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${s.title} ${s.artist}`)}`,
          target: "_blank",
          rel: "noopener",
        },
        "Look it up",
      ),
    );
  };
  if (!s.term) {
    fallback();
    return row;
  }
  previewsReady
    .then(() => previews[s.term] ?? null)
    .then((preview) => {
      if (!row.isConnected) return;
      if (!preview) return fallback();
      btn.disabled = false;
      via.replaceChildren(
        `Preview: ${preview.trackName} by ${preview.artistName}, via `,
        h("a", { href: preview.trackViewUrl, target: "_blank", rel: "noopener" }, "Apple Music"),
      );
      btn.addEventListener("click", () => toggleSong(row, preview.previewUrl));
    })
    .catch(fallback);
  return row;
}

let playingRow = null;
function toggleSong(row, url) {
  if (playingRow === row && !player.paused) return stopSong();
  stopSong();
  player.src = url;
  player.volume = 0.8;
  player.play().catch(() => {});
  playingRow = row;
  row.classList.add("playing");
  row.querySelector(".play").setAttribute("aria-label", "Pause");
}
function stopSong() {
  player.pause();
  if (playingRow) {
    playingRow.classList.remove("playing");
    playingRow.querySelector(".play")?.setAttribute("aria-label", "Play");
  }
  playingRow = null;
}
player.addEventListener("ended", stopSong);

function ageLine(age, b) {
  if (!b.res) return `${age} and holding up the neighbourhood`;
  if (age === 0) return "Brand new. Still smells of paint.";
  if (age < 10) return `${age}, still a kid`;
  if (age < 30) return `${age} and in its prime`;
  if (age < 50) return `${age}, comfortably middle-aged`;
  if (age < 70) return `${age}, a proper uncle of the estate`;
  return `${age}, an elder of the estate`;
}

// The hawker centre this block is, or the one it stands beside, as a way into Makan Nation's customer mode.
function makanLink(b) {
  const key = blockKey(b.blk, b.street);
  const at = hawkers?.at?.[key] ?? null;
  const near = (hawkers?.nearby?.[key] ?? []).filter((id) => id !== at);
  if (at) {
    return h(
      "a",
      { class: "makan-link", href: `../hawker/?makan=${at}` },
      h("strong", {}, `This block is a hawker centre: ${centreName(at)}.`),
      h("span", {}, "Walk round it at lunch in Makan Nation"),
    );
  }
  if (near.length) {
    return h(
      "a",
      { class: "makan-link", href: `../hawker/?makan=${near[0]}` },
      h("strong", {}, `${centreName(near[0])} is a short walk from this block.`),
      h("span", {}, `Makan there in Makan Nation${near.length > 1 ? `, or at ${near.slice(1, 3).map(centreName).join(" or ")}` : ""}`),
    );
  }
  if (b.market) {
    return h(
      "a",
      { class: "makan-link", href: "../hawker/" },
      h("strong", {}, "There is a market or hawker centre at this block."),
      h("span", {}, "Cook the classics in Makan Nation"),
    );
  }
  return null;
}

function renderNow(b, age) {
  const town = TOWNS[b.town] ?? b.town;
  const sameYear = (resByYear.get(b.year) ?? 0) - (b.res ? 1 : 0);
  const list = townYears.get(b.town) ?? [];
  const younger = list.filter((y) => y > b.year).length;
  const pct = list.length ? Math.round((younger / list.length) * 100) : 0;

  const perks = [
    b.market && "Market or hawker centre",
    b.com && "Shops downstairs",
    b.carpark && "Multi-storey carpark",
    b.pavilion && "Precinct pavilion",
    !b.res && "No flats here",
  ].filter(Boolean);

  const rand = rng(hash(`${b.blk}${b.street}twins`));
  const twins = blocks.filter((x) => x.res && x.year === b.year && x.town !== b.town);
  const picks = [];
  for (let i = 0; i < 40 && picks.length < 3 && twins.length; i++) {
    const t = twins[Math.floor(rand() * twins.length)];
    if (!picks.some((p) => p.town === t.town)) picks.push(t);
  }

  fill(
    $("now"),
    h("header", {}, tense("Now"), h("h2", {}, ageLine(age, b))),
    h(
      "dl",
      { class: "stats" },
      stat("Age", age),
      stat("Floors", b.floors),
      stat("Flats", b.units || "None"),
      stat("Town", town),
    ),
    perks.length ? h("ul", { class: "perks" }, perks.map((p) => h("li", {}, p))) : null,
    makanLink(b),
    b.res
      ? h(
          "p",
          { class: "facts" },
          sameYear > 0 ? `Shares a birth year with ${sameYear.toLocaleString()} other blocks. ` : "The only block born that year. ",
          list.length > 1 ? `Older than ${pct}% of the blocks in ${town}.` : "",
        )
      : null,
    picks.length
      ? h(
          "div",
          { class: "twins" },
          h("h3", {}, "Birthday twins"),
          h(
            "ul",
            {},
            picks.map((t) =>
              h(
                "li",
                {},
                h(
                  "button",
                  { type: "button", onclick: () => choose(t) },
                  `Blk ${t.blk} ${pretty(t.street)}`,
                  h("small", {}, TOWNS[t.town] ?? t.town),
                ),
              ),
            ),
          ),
        )
      : null,
  );
}

function stat(label, value) {
  return h("div", {}, h("dt", {}, label), h("dd", {}, String(value)));
}

function renderLater(b, key) {
  const end = b.year + 99;
  const left = end - THIS_YEAR;
  const board = h("ul", { class: "board", "aria-live": "polite" });
  const msg = h("p", { class: "form-msg", role: "status" });
  const note = h("textarea", {
    id: "wishNote",
    maxlength: "140",
    rows: "3",
    required: true,
    placeholder: "Play Home by Kit Chan at the party. Also, fix the lift.",
  });
  const count = h("span", { class: "count" }, "0/140");
  note.addEventListener("input", () => (count.textContent = `${note.value.length}/140`));
  const name = h("input", { id: "wishName", maxlength: "24", placeholder: "A neighbour", value: store.get("bb-name") ?? "" });

  const form = h(
    "form",
    { class: "wish" },
    h("label", { for: "wishNote" }, `A note for its 99th birthday`),
    note,
    h("div", { class: "row" }, h("label", { class: "sr-only", for: "wishName" }, "Your name"), name, count),
    h("button", { type: "submit" }, "Pin it to the notice board"),
    msg,
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Pinning";
    store.set("bb-name", name.value.trim());
    try {
      const body = await pinWish(key, name.value, note.value);
      note.value = "";
      count.textContent = "0/140";
      msg.textContent = "Pinned. See you in " + end + ".";
      paintBoard(board, body.wishes, body.count, body.local);
    } catch (err) {
      msg.textContent = err.message || "The board fell over. Try again.";
    }
  });

  fill(
    $("later"),
    h("header", {}, tense("Later"), h("h2", {}, left > 0 ? `Lease party around ${end}` : `Lease maths says ${end}`)),
    h(
      "div",
      { class: "lift", role: "img", "aria-label": `Lease ends around ${end}, about ${Math.max(0, left)} years from now` },
      h("span", { class: "arrows", "aria-hidden": "true" }, h("i", { class: "up" }), h("i", { class: "down" })),
      h("span", { class: "led big" }, String(end)),
      h("span", { class: "led" }, left > 0 ? `${left} YRS TO GO` : "OVERTIME"),
    ),
    h(
      "p",
      { class: "fine" },
      "Rough maths: completion year plus 99. Real leases start on the lease commencement date, and some blocks get redeveloped early.",
      b.year < 1960 ? " SIT flats followed their own rules, so take this one with extra salt." : "",
    ),
    form,
    board,
  );

  board.append(h("li", { class: "loading" }, "Checking the notice board"));
  readWishes(key)
    .then((body) => paintBoard(board, body.wishes ?? [], body.count ?? 0, body.local))
    .catch(() => board.replaceChildren());
}

// The notice board: shared through the Bun server when there is one, otherwise kept in this browser (a static
// site such as GitHub Pages has nowhere to keep other people's notes).
const wishKey = (key) => `bb-wishes:${key}`;
async function readWishes(key) {
  if (await onServer) {
    const res = await api(`block/wishes?key=${encodeURIComponent(key)}`).catch(() => null);
    if (res?.ok) return res.json();
  }
  let list = [];
  try {
    list = JSON.parse(store.get(wishKey(key)) ?? "[]");
  } catch {}
  return { count: list.length, wishes: list.slice(-6).reverse(), local: true };
}
async function pinWish(key, name, note) {
  if (await onServer) {
    const res = await api("block/wishes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, name, note }) });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    return body;
  }
  const text = note.replace(/\s+/g, " ").trim().slice(0, 140);
  if (text.length < 2) throw new Error("Write a little something first.");
  const now = await readWishes(key);
  let list = [];
  try {
    list = JSON.parse(store.get(wishKey(key)) ?? "[]");
  } catch {}
  list.push({ name: name.replace(/\s+/g, " ").trim().slice(0, 24) || "A neighbour", note: text, at: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }) });
  store.set(wishKey(key), JSON.stringify(list.slice(-30)));
  return { count: Math.min(30, now.count + 1), wishes: list.slice(-6).reverse(), local: true };
}

function paintBoard(board, wishes, count, local = false) {
  board.replaceChildren(
    ...(wishes.length
      ? wishes.map((w) => h("li", {}, h("p", {}, w.note), h("small", {}, `${w.name}, ${w.at}`)))
      : [h("li", { class: "empty" }, local ? "Nothing pinned from this browser yet." : "Nobody has pinned anything yet. Be the first.")]),
  );
  if (count > wishes.length) board.append(h("li", { class: "more" }, `+${count - wishes.length} older notes`));
  if (local) board.append(h("li", { class: "more" }, "This copy of the site has no shared board, so notes stay in this browser."));
}

// ---------- blowing candles ----------

$("blow").addEventListener("click", () => {
  if (!current) return;
  const wrap = $("sceneWrap");
  if (wrap.classList.contains("blown")) {
    wrap.classList.remove("blown");
    $("blow").textContent = "Blow the candles";
    $("caption").textContent = "";
    return;
  }
  wrap.classList.add("blown");
  $("blow").textContent = "Light them again";
  const age = Math.max(0, THIS_YEAR - current.year);
  $("caption").textContent = age
    ? `Happy ${ord(age)}, Blk ${current.blk}!`
    : `Happy first year, Blk ${current.blk}!`;
  tune();
  confetti();
});

$("share").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    $("caption").textContent = "Link copied. Send it to the block chat.";
  } catch {
    $("caption").textContent = location.href;
  }
});

let audioCtx;
function tune() {
  try {
    audioCtx ??= new AudioContext();
    const notes = [
      [392, 0.3],
      [392, 0.1],
      [440, 0.4],
      [392, 0.4],
      [523.25, 0.4],
      [493.88, 0.8],
    ];
    let t = audioCtx.currentTime + 0.05;
    for (const [f, d] of notes) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + d * 0.95);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + d);
      t += d;
    }
  } catch {}
}

function confetti() {
  if (reduceMotion.matches) return;
  const box = $("confetti");
  const colors = ["#E0603F", "#F2A33A", "#3F7BA3", "#7DB497", "#CFC1E8", "#F5DC8E"];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 70; i++) {
    const p = h("i");
    p.style.setProperty("--x", `${Math.random() * 100}%`);
    p.style.setProperty("--dx", `${(Math.random() - 0.5) * 120}px`);
    p.style.setProperty("--r", `${Math.random() * 720 - 360}deg`);
    p.style.setProperty("--d", `${1.4 + Math.random() * 1.2}s`);
    p.style.setProperty("--delay", `${Math.random() * 0.25}s`);
    p.style.background = colors[i % colors.length];
    frag.append(p);
  }
  box.replaceChildren(frag);
  setTimeout(() => box.replaceChildren(), 3000);
}

// A row of real blocks on the landing page, one per era.
function skyline() {
  const box = $("skyline");
  const eras = [
    [1930, 1964],
    [1965, 1979],
    [1980, 1989],
    [1990, 2004],
    [2005, THIS_YEAR],
  ];
  const kids = [];
  for (const [from, to] of eras) {
    const pool = blocks.filter((b) => b.res && b.year >= from && b.year <= to);
    const b = pool[Math.floor(Math.random() * pool.length)];
    if (!b) continue;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("preserveAspectRatio", "xMidYMax meet");
    drawScene(svg, b, Math.max(0, THIS_YEAR - b.year));
    kids.push(
      h(
        "button",
        { type: "button", class: "mini", onclick: () => choose(b) },
        svg,
        h("b", {}, `Blk ${b.blk}`),
        h("small", {}, `${pretty(b.street)}, ${b.year}`),
      ),
    );
  }
  box.replaceChildren(...kids);
}

// ---------- boot ----------

function fromUrl() {
  const p = new URLSearchParams(location.search);
  if (p.get("b") && p.get("s")) {
    const b = byKey.get(blockKey(normBlk(p.get("b")), p.get("s").toUpperCase()));
    if (b) {
      q.value = `Blk ${b.blk} ${pretty(b.street)}`;
      show(b, false);
      return;
    }
  }
  if (/^\d{6}$/.test(p.get("postal") ?? "")) lookupPostal(p.get("postal"));
}

window.addEventListener("popstate", () => {
  if (location.search) fromUrl();
  else {
    document.body.classList.remove("partying");
    $("party").hidden = true;
    stopSong();
  }
});

load()
  .then(() => {
    skyline();
    fromUrl();
  })
  .catch(() => {
    hint.textContent = "Could not load the block list. Is the server running?";
  });
