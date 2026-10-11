// The Centre Manager screens: pick a centre, manage it between sessions, read what happened.
// Everything goes into the page with textContent; numbers come with a "why" you can open.

import { browseCentres, browseControls, keepScroll } from "./centrelist.js";
import {
  apprenticeWagePerDay,
  avgUnitCost,
  capacity,
  CLEANING,
  crowd,
  DAYS,
  forecast,
  goals,
  grade,
  heritage,
  inviteHawker,
  isServing,
  newCentre,
  normPrice,
  pairApprentice,
  rentPerDay,
  rentWhy,
  runSession,
  SESSIONS,
  setHelpers,
  setPrep,
  setPrice,
  SIMPLIFICATIONS,
  slotsFor,
  SOURCES,
  stallAppeal,
  stallTitle,
  trayApplies,
  wagePerSession,
} from "./centre.js";
import { DISHES } from "./dishes.js";
import { ERAS, eraById, money } from "./eras.js";
import { HAWKERNOMICS } from "./economy.js";
import { avatar, centrePhoto, CENTRES, CENTRES_SOURCE, profilePhoto } from "./passport.js";
import { famousIn, PROFILES, profileFor } from "./profiles.js";

// NEA's centres, plus profiled places that are not on NEA's list (Lau Pa Sat).
const PLACES = [
  ...CENTRES,
  ...PROFILES.filter((p) => !p.neaName).map((p) => ({ id: `p-${p.key}`, name: p.displayName.replace(/\s*\(.*\)\s*$/, ""), stalls: null, year: Number(String(p.opened ?? "").match(/\d{4}/)?.[0]) || null, yearLabel: String(p.opened ?? "").match(/\d{4}/)?.[0] ?? "" })),
];
const famousLine = (profile) => {
  const names = [...new Set((profile?.knownFor ?? []).map((k) => k.dish).filter(Boolean))].slice(0, 3);
  return names.length ? `Famous for ${names.join(", ")}` : "";
};

// NEA names often read "Old Airport Road Blk 51 (51 Old Airport Road Food Centre ...)".
// The part in brackets is what people call it, so lead with that and keep the rest as a subtitle.
function displayName(name) {
  const m = /^(.*?)\s*\((.+)\)\s*$/.exec(name ?? "");
  return m ? { main: m[2], sub: m[1] } : { main: name ?? "", sub: "" };
}

// The name people know a centre by: its profile's name for the famous ones, else the everyday part of NEA's.
const everyday = (c) => profileFor(c)?.displayName?.replace(/\s*\(.*\)$/, "") ?? displayName(c.name).main;

const SVG = "http://www.w3.org/2000/svg";

export function mountCentre(root, { h, getState, setState, onCook, onBack, canHost }) {
  const ui = { query: "", pick: null, era: "today", summary: null, resetArmed: false };

  const put = (...kids) => root.replaceChildren(...kids.filter(Boolean));
  const link = ([t, href]) => h("a", { href, target: "_blank", rel: "noopener", text: t });

  // A small "?" that opens the reasons behind a number.
  function why(lines, sources = []) {
    const box = h("div", { class: "why", hidden: true }, h("ul", {}, ...lines.map((l) => h("li", { text: l }))), sources.length ? h("p", { class: "why__src" }, ...sources.map(link)) : null);
    const btn = h("button", { class: "why__btn", type: "button", "aria-expanded": "false", "aria-label": "Why?", text: "?" });
    btn.addEventListener("click", () => {
      box.hidden = !box.hidden;
      btn.setAttribute("aria-expanded", String(!box.hidden));
    });
    return [btn, box];
  }

  function stepper(label, value, onDown, onUp, { small } = {}) {
    return h(
      "span",
      { class: `stepper${small ? " stepper--small" : ""}` },
      h("button", { type: "button", "aria-label": `Less ${label}`, text: "−", onclick: onDown }),
      h("output", { text: value }),
      h("button", { type: "button", "aria-label": `More ${label}`, text: "+", onclick: onUp }),
    );
  }

  const commit = (state) => {
    setState(state);
    render();
  };

  // ---------- Picking a centre ----------

  function renderStart() {
    // Every centre, in a scrolling list: famous ones first (they look like themselves and lean on their
    // famous dishes), by region, or in another order.
    ui.region ??= "All";
    ui.sort ??= "famous";
    const list = browseCentres(PLACES, { query: ui.query, region: ui.region, sort: ui.sort, nameOf: everyday });
    if (!ui.pick) ui.pick = PLACES.find((c) => /Old Airport Road/.test(c.name)) ?? PLACES[0];
    const pickProfile = profileFor(ui.pick);
    const search = h("input", { type: "search", id: "centreSearch", placeholder: `Search ${PLACES.length} hawker centres by name, street or area`, value: ui.query, "aria-label": "Search hawker centres", autocomplete: "off" });
    search.addEventListener("input", () => {
      ui.query = search.value.slice(0, 60);
      render();
      const again = root.querySelector("#centreSearch");
      again?.focus();
      again?.setSelectionRange(again.value.length, again.value.length);
    });
    put(
      h("p", { class: "kicker", text: "Advanced" }),
      h("h2", { class: "panel__title", text: "Centre Manager" }),
      h("p", { class: "lede lede--small", text: "Run a real hawker centre for two weeks: menus and prices, help and hygiene, and finding successors for hawkers who retire. Cook any session yourself with friends, or let it run." }),
      h("h3", { class: "step" }, h("span", { text: "1" }), " Which centre?"),
      search,
      ...browseControls(
        h,
        { prefix: "centre", region: ui.region, sort: ui.sort, shown: list.length, centres: PLACES, query: ui.query },
        (id) => ((ui.region = id), render()),
        (id) => ((ui.sort = id), render()),
      ),
      h(
        "div",
        { class: "cpick cpick--scroll", id: "centreCentres", role: "radiogroup", "aria-label": "Hawker centre" },
        ...list.map(([c, profile, a]) =>
          h(
            "button",
            {
              type: "button",
              class: `cpick__item${ui.pick?.id === c.id ? " is-on" : ""}`,
              role: "radio",
              "aria-checked": String(ui.pick?.id === c.id),
              onclick: () => {
                ui.pick = c;
                render();
              },
            },
            h("strong", { text: everyday(c) }),
            [displayName(c.name).main, displayName(c.name).sub].find((n) => n && n !== everyday(c)) ? h("small", { class: "cname__sub", text: [displayName(c.name).main, displayName(c.name).sub].find((n) => n && n !== everyday(c)) }) : null,
            h("span", { text: `${a.area ? `${a.area} · ` : ""}${c.stalls ?? "?"} stalls · built ${c.yearLabel || "year unknown"} · ${slotsFor(c)} stalls in the game` }),
            profile ? h("span", { class: "cpick__famous", text: famousLine(profile) }) : null,
          ),
        ),
      ),
      h("p", { class: "cnote" }, "From NEA's list of hawker centres on data.gov.sg. The game uses about the square root of the real stall count, between 6 and 12. ", link(CENTRES_SOURCE)),
      ui.pick
        ? h(
            "div",
            { class: "cdetail" },
            centrePhoto(ui.pick, { small: true }) ?? profilePhoto(pickProfile, { small: true }),
            h(
              "div",
              {},
              h("strong", { text: displayName(ui.pick.name).main }),
              pickProfile?.look?.summary ? h("p", { text: pickProfile.look.summary }) : h("p", { text: "No profile yet: the game builds it from the year NEA gives for its original building." }),
              pickProfile ? h("p", { class: "cpick__famous", text: famousLine(pickProfile) }) : null,
              pickProfile?.opened ? h("p", { class: "cnote", text: `Opened: ${pickProfile.opened}` }) : null,
              ...(pickProfile?.history ?? []).slice(0, 2).map((x) => h("p", { class: "cnote" }, `${x.fact} `, link(x.sources[0]))),
              ...(pickProfile?.knownFor ?? []).filter((k) => k.sources.length).slice(0, 3).map((k) => h("p", { class: "cnote" }, `${k.dish}${k.note ? `: ${k.note}` : ""} `, link(k.sources[0]))),
            ),
          )
        : null,
      h("h3", { class: "step" }, h("span", { text: "2" }), " When?"),
      h(
        "div",
        { class: "seg", role: "radiogroup", "aria-label": "Era" },
        ...ERAS.map((e) =>
          h(
            "label",
            {},
            h("input", { type: "radio", name: "centreEra", value: e.id, checked: ui.era === e.id, onchange: () => (ui.era = e.id) }),
            h("span", { text: e.years }),
          ),
        ),
      ),
      h("details", { class: "csimple" }, h("summary", { text: "How the simulation works" }), h("ul", {}, ...SIMPLIFICATIONS.map((t) => h("li", { text: t }))), h("p", {}, "The money side is inspired by ", link(HAWKERNOMICS), ".")),
      h(
        "div",
        { class: "actions" },
        h("button", { class: "ghost", type: "button", text: "Back", onclick: onBack }),
        h("button", {
          class: "go",
          type: "button",
          id: "centreOpen",
          text: "Open the centre",
          onclick: () => {
            const seed = (Number(String(ui.pick.id).replace(/\D/g, "").slice(-6)) || 1) + Math.floor(Math.random() * 1000);
            ui.summary = null;
            const profile = profileFor(ui.pick);
            commit(newCentre({ centre: ui.pick, era: ui.era, seed, famous: famousIn(profile), profileKey: profile?.key ?? null }));
          },
        }),
      ),
    );
    keepScroll(root.querySelector("#centreCentres"), (ui.scroll ??= {}), `${ui.query}|${ui.region}|${ui.sort}`, !ui.scrolled);
    ui.scrolled = true;
  }

  // ---------- The dashboard ----------

  function tile(label, value, lines, sources) {
    return h("div", { class: "ctile" }, h("p", { class: "ctile__label" }, label, ...why(lines, sources)), h("p", { class: "ctile__value", text: value }));
  }

  function chart(title, points, format, color) {
    const W = 300;
    const H = 110;
    const pad = { l: 8, r: 46, t: 14, b: 20 };
    const box = h("figure", { class: "cchart" }, h("figcaption", { text: title }));
    if (points.length < 2) {
      box.append(h("p", { class: "cchart__empty", text: "Shows up after the second day." }));
      return box;
    }
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const lo = Math.min(0, ...ys);
    const hi = Math.max(...ys) || 1;
    const x = (v) => pad.l + ((v - xs[0]) / (xs[xs.length - 1] - xs[0])) * (W - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${title}: ${points.map(([d, v]) => `day ${d} ${format(v)}`).join(", ")}`);
    const el = (tag, attrs) => {
      const n = document.createElementNS(SVG, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      svg.append(n);
      return n;
    };
    for (const v of [lo, hi]) el("line", { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), stroke: "#2b1b1222", "stroke-width": 1 });
    const d = points.map(([a, b], i) => `${i ? "L" : "M"}${x(a).toFixed(1)} ${y(b).toFixed(1)}`).join(" ");
    el("path", { d: `${d} L${x(xs[xs.length - 1])} ${y(lo)} L${x(xs[0])} ${y(lo)}Z`, fill: color, "fill-opacity": 0.1 });
    el("path", { d, fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" });
    const last = points[points.length - 1];
    el("circle", { cx: x(last[0]), cy: y(last[1]), r: 4, fill: color, stroke: "#fffaf0", "stroke-width": 2 });
    const end = el("text", { x: x(last[0]) + 7, y: y(last[1]) + 4, "font-size": 11, fill: "#2b1b12", "font-family": "DM Mono, monospace" });
    end.textContent = format(last[1]);
    for (const [i, v] of [[0, xs[0]], [1, xs[xs.length - 1]]]) {
      const t = el("text", { x: x(v), y: H - 5, "font-size": 10, fill: "#5c4636", "text-anchor": i ? "end" : "start", "font-family": "DM Mono, monospace" });
      t.textContent = `day ${v}`;
    }
    // Hover or touch: a hairline snaps to the nearest day, with its value.
    const hair = el("line", { y1: pad.t, y2: H - pad.b, stroke: "#2b1b1266", "stroke-width": 1, visibility: "hidden" });
    const tip = h("p", { class: "cchart__tip", hidden: true });
    const move = (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      let best = points[0];
      for (const p of points) if (Math.abs(x(p[0]) - px) < Math.abs(x(best[0]) - px)) best = p;
      hair.setAttribute("x1", x(best[0]));
      hair.setAttribute("x2", x(best[0]));
      hair.setAttribute("visibility", "visible");
      tip.hidden = false;
      tip.replaceChildren(h("strong", { text: format(best[1]) }), ` day ${best[0]}`);
    };
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerdown", move);
    svg.addEventListener("pointerleave", () => {
      hair.setAttribute("visibility", "hidden");
      tip.hidden = true;
    });
    box.append(svg, tip);
    return box;
  }

  function renderDashboard(state) {
    const era = eraById(state.era);
    const session = SESSIONS[state.session];
    const last = state.history[state.history.length - 1];
    const h2 = heritage(state);
    const c = crowd(state);
    const g = goals(state);
    const notes = state.log.slice(-4);
    put(
      h("p", { class: "kicker", text: `Centre Manager · ${era.name}, ${era.years}` }),
      h("h2", { class: "panel__title", text: displayName(state.centre.name).main }),
      displayName(state.centre.name).sub ? h("p", { class: "cname__sub", text: displayName(state.centre.name).sub }) : null,
      h("p", { class: "cday", text: state.over ? `Closed after day ${state.day - 1}` : `Day ${state.day} of ${DAYS} · ${session.name} is next` }),
      ui.summary ? renderSummary(state, ui.summary) : null,
      h(
        "div",
        { class: "ctiles" },
        tile("Cash", money(state.cash), ["The co-op purse: every stall's takings in, rent, wages, stock, cleaning and fines out.", `Started at ${money(state.history.length ? state.history[0].cash - state.history[0].profit : state.cash)}.`], SOURCES.hawkernomics),
        tile(
          "Yesterday",
          last ? money(last.profit) : "None yet",
          last ? dayLines(state.last?.endOfDay) : ["Shows the day's profit or loss once a day is done."],
          [...SOURCES.rent.slice(0, 2), ...SOURCES.wages],
        ),
        tile("Expected now", `${c.people} people`, c.why, SOURCES.rain),
        tile("Satisfaction", `${Math.round(state.satisfaction)} / 100`, state.last?.satisfaction.why ?? ["Starts at 60. Moves after every session with service, quality, cleanliness and value."]),
        tile("Heritage", `${h2.communities.length} communities · ${h2.dishes.length} dishes`, [`On the menu now: ${h2.communities.join(", ")}.`, "Counted from the dishes still served, using each dish's recipe card, like the rojak meter."], SOURCES.succession),
      ),
      h("ul", { class: "cgoals" }, ...g.map((x) => h("li", { class: x.ok ? "is-ok" : "" }, h("span", { class: "cgoals__mark", text: x.ok ? "✓" : "·", "aria-hidden": "true" }), h("div", {}, h("strong", { text: `${x.label}${x.ok ? " (met)" : ""}` }), h("span", { text: x.progress }))))),
      h(
        "div",
        { class: "ccharts" },
        chart("Cash at the end of each day", state.history.map((x) => [x.day, x.cash]), money, "#2f6b4f"),
        chart("Customers served each day", state.history.map((x) => [x.day, x.footfall]), (v) => `${Math.round(v)}`, "#2d4f9c"),
      ),
      state.history.length ? historyTable(state) : null,
      notes.length ? h("div", { class: "cnews" }, h("p", { class: "cnews__title", text: "News from the centre" }), ...notes.map((t) => h("p", { text: t })), eventSources(state)) : null,
      state.over ? finalReport(state) : centreControls(state, era),
      state.over ? null : h("div", { class: "cstalls" }, ...state.stalls.map((s, i) => stallCard(state, era, s, i))),
      h("p", { class: "creset" }, resetButton()),
      h(
        "div",
        { class: "actions actions--sticky" },
        h("button", { class: "ghost", type: "button", text: "Leave", onclick: onBack }),
        state.over
          ? null
          : h("button", {
              class: "go",
              type: "button",
              id: "centreRun",
              text: `Let ${session.name.toLowerCase()} run`,
              onclick: () => {
                ui.summary = runSession(state);
                commit(state);
                root.scrollIntoView?.({ block: "start" });
              },
            }),
      ),
    );
  }

  function dayLines(r) {
    if (!r) return ["No day finished yet."];
    return [
      `Takings ${money(r.revenue)}`,
      `Stock bought ${money(-r.stock)}${r.spoiled ? `, of which ${money(r.spoiled)} spoiled` : ""}`,
      `Helpers' wages ${money(-r.wages)}`,
      `Rent ${money(-r.rent)}`,
      `Cleaning ${money(-r.cleaning)}`,
      ...(r.other ? [`Apprentices, reminders and fines ${money(-r.other)}`] : []),
      `Profit ${money(r.profit)}`,
    ];
  }

  function historyTable(state) {
    return h(
      "details",
      { class: "ctable" },
      h("summary", { text: "Day by day, as a table" }),
      h(
        "table",
        {},
        h("tr", {}, ...["Day", "Cash", "Profit", "Served", "Satisfaction", "Communities"].map((t) => h("th", { text: t }))),
        ...state.history.map((x) => h("tr", {}, ...[String(x.day), money(x.cash), money(x.profit), String(x.footfall), String(Math.round(x.satisfaction)), String(x.communities)].map((t) => h("td", { text: t })))),
      ),
    );
  }

  function eventSources(state) {
    const recent = state.events.filter((e) => e.day >= state.day - 1);
    if (!recent.length) return null;
    return h("p", { class: "cnews__src" }, ...recent.flatMap((e) => (e.src ? [`${e.title}: `, link(e.src), e.note ? ` ${e.note} ` : " "] : [`${e.title} is a game event. `])));
  }

  function centreControls(state, era) {
    const lets = state.stalls.filter((s) => !s.closed).length;
    const tray = trayApplies(era);
    return h(
      "section",
      { class: "cctl" },
      h("h3", { class: "step step--plain", text: "The whole centre" }),
      h(
        "div",
        { class: "cctl__row" },
        h("p", { class: "cctl__label" }, "Cleaning", ...why([...CLEANING.map((x) => `${x.name}: ${x.note}`), "Busy stalls get dirty faster; every stall washes up at night. The grade sets how many customers trust a stall: A +5%, C -15%, D -35%.", SIMPLIFICATIONS[4]], [...SOURCES.cleaning, ...SOURCES.grade])),
        h(
          "div",
          { class: "seg", role: "radiogroup", "aria-label": "Cleaning" },
          ...CLEANING.map((x, k) =>
            h(
              "label",
              {},
              h("input", {
                type: "radio",
                name: "cleaning",
                value: String(k),
                checked: state.cleaning === k,
                onchange: () => {
                  state.cleaning = k;
                  commit(state);
                },
              }),
              h("span", { text: `${x.name}${x.perStall ? ` ${money(x.perStall * lets * era.price)}/day` : ""}` }),
            ),
          ),
        ),
      ),
      tray
        ? h(
            "label",
            { class: "check cctl__row" },
            h("input", {
              type: "checkbox",
              checked: state.trayReminders,
              onchange: (e) => {
                state.trayReminders = e.target.checked;
                commit(state);
              },
            }),
            h("span", { text: `Tray return reminders, ${money(30 * era.price)} a day: returns go from 91% to 96% and tables free up sooner` }),
            ...why(["Diners must return trays at hawker centres since 2021. NEA measured 91% returning them in 2023.", "Reminders adding 5 points, and their cost, are our guess."], SOURCES.tray),
          )
        : h("p", { class: "cnote", text: "Tray return was not a rule in this era: cleaners cleared the tables." }),
      h("p", { class: "cnote", text: `Seats: about ${state.stalls.length * 30}, each used twice a session${tray ? ", a bit less when trays are left behind" : ""}. When every seat is taken, some customers walk off.` }),
    );
  }

  function stallCard(state, era, s, i) {
    const level = stallTitle(s);
    const serving = isServing(s, state);
    const gr = grade(s.clean);
    const step = Math.max(0.05, Math.round(0.1 * era.price * 20) / 20);
    const appeal = stallAppeal(state, i);
    const expected = serving ? forecast(state, i) : 0;
    const head = h(
      "header",
      { class: "cstall__head" },
      h("span", { class: "cstall__no", text: s.no }),
      h("strong", { text: level }),
      h("span", { class: `cgrade cgrade--${gr}`, title: "Hygiene grade (a game grade)", text: gr }),
    );
    const who = h(
      "div",
      { class: "cstall__who" },
      avatar(s.hawker.look, 44),
      h("div", {}, h("strong", { text: s.hawker.name }), h("span", { text: `${s.hawker.age} · ${s.hawker.community}${s.hawker.learnedFrom ? ` · learned from ${s.hawker.learnedFrom}` : ""}` }), h("span", { text: `Cooking ${Math.round(s.hawker.skill * 100)}%` })),
    );
    if (s.closed) {
      return h(
        "article",
        { class: "cstall is-closed" },
        head,
        who,
        h("p", { class: "cstall__alert", text: `Closed. ${s.hawker.name} retired with nobody to take over, and the stall's dishes went with them.` }),
        h("button", {
          class: "ghost",
          type: "button",
          text: "Let it to a new hawker (incubation stall)",
          onclick: () => {
            inviteHawker(state, i);
            commit(state);
          },
        }),
        h("p", { class: "cnote" }, "Incubation stalls pay half the market rent at first. ", link(SOURCES.rent[3])),
      );
    }
    const retiring = s.hawker.retireDay != null;
    const menu = h(
      "ul",
      { class: "cmenu" },
      ...Object.entries(s.menu).map(([d, m]) =>
        h(
          "li",
          { class: m.on ? "" : "is-off" },
          h("label", { class: "check" }, h("input", { type: "checkbox", checked: m.on, onchange: (e) => ((m.on = e.target.checked), commit(state)) }), h("span", { text: DISHES[d].name })),
          stepper(
            `${DISHES[d].name} price`,
            money(m.price),
            () => (setPrice(state, i, d, m.price - step), commit(state)),
            () => (setPrice(state, i, d, m.price + step), commit(state)),
            { small: true },
          ),
          h("span", { class: "cmenu__norm", text: `usual ${money(normPrice(d, era))}` }),
        ),
      ),
    );
    return h(
      "article",
      { class: `cstall${retiring ? " is-retiring" : ""}${serving ? "" : " is-idle"}` },
      head,
      who,
      retiring
        ? h(
            "div",
            { class: "cstall__alert" },
            h("p", { text: `Retires after day ${s.hawker.retireDay}. ${s.apprentice ? `${s.apprentice.name} (${s.apprentice.age}) is learning: day ${s.apprentice.days} of 3.` : "Without an apprentice, the stall closes and its dishes leave the centre."}` }),
            s.apprentice
              ? null
              : h("button", {
                  class: "go go--small",
                  type: "button",
                  text: `Pair an apprentice (${money(apprenticeWagePerDay(era))} a day)`,
                  onclick: () => {
                    pairApprentice(state, i);
                    commit(state);
                  },
                }),
            h("p", { class: "cnote" }, "NEA's Hawkers' Succession Scheme pairs retiring hawkers with successors for a 3-month apprenticeship; here it takes 3 days. ", link(SOURCES.succession[0])),
          )
        : null,
      s.opensDay > state.day ? h("p", { class: "cstall__alert", text: `Opens on day ${s.opensDay}.` }) : null,
      menu,
      h(
        "div",
        { class: "cstall__row" },
        h("span", {}, "Prep", ...why([`Portions made before the session, ${money(avgUnitCost(state, s))} each in ingredients.`, `About ${expected} customers expected (attractiveness below), the suggestion adds 5%.`, "Half of what is left over spoils by the next session, and the rest is thrown away at night.", ...appeal.why])),
        stepper("prep", `${s.prep}`, () => (setPrep(state, i, s.prep - 5), commit(state)), () => (setPrep(state, i, s.prep + 5), commit(state))),
        h("span", { class: "cnote", text: `expect ~${expected}` }),
      ),
      h(
        "div",
        { class: "cstall__row" },
        h("span", {}, "Helpers", ...why([`Each helper costs ${money(wagePerSession(era))} a session (4 hours at the Food Services PWM rate, scaled to the era).`, `The stall can cook ${capacity(s)} portions a session with ${s.helpers}; more customers than that wait too long and leave.`], SOURCES.wages)),
        stepper("helpers", `${s.helpers}`, () => (setHelpers(state, i, s.helpers - 1), commit(state)), () => (setHelpers(state, i, s.helpers + 1), commit(state))),
        h("span", { class: "cnote", text: `cooks ${capacity(s)}` }),
      ),
      h("p", { class: "cstall__rent" }, `${s.rent === "subsidised" ? "Subsidised" : s.rent === "incubation" ? "Incubation" : "Market"} rent ${money(rentPerDay(s, era))}/day`, ...why(rentWhy(s, era), SOURCES.rent)),
      s.last && !s.last.closed
        ? h("p", { class: "cstall__last" }, `Last session: sold ${s.last.sold}${s.last.lostQueue ? `, ${s.last.lostQueue} gave up queueing` : ""}${s.last.lostStock ? `, ${s.last.lostStock} found it sold out` : ""}${s.last.lostSeats ? `, ${s.last.lostSeats} found no seat` : ""}.`, ...why(s.last.why ?? []))
        : null,
      serving && !state.over
        ? h(
            "div",
            { class: "cstall__cook" },
            h("button", { class: "go go--small", type: "button", text: `Cook ${SESSIONS[state.session].name.toLowerCase()} here`, onclick: () => onCook(i, false) }),
            canHost() ? h("button", { class: "ghost go--small", type: "button", text: "With friends", onclick: () => onCook(i, true) }) : null,
          )
        : null,
    );
  }

  function renderSummary(state, sum) {
    const rows = sum.rows.filter((r) => !r.closed);
    const eod = sum.endOfDay;
    return h(
      "section",
      { class: "csum", id: "centreSummary" },
      h("h3", { class: "csum__title", text: `${sum.session}, day ${sum.day}` }),
      h("p", { text: `${sum.footfall} customers served. Takings ${money(sum.revenue)}, helpers ${money(sum.wages)}${sum.spoiled ? `, spoiled stock ${money(sum.spoiled)}` : ""}. Satisfaction ${Math.round(sum.satisfaction.before)} to ${Math.round(sum.satisfaction.after)}.` }, ...why(sum.satisfaction.why)),
      h(
        "table",
        { class: "csum__table" },
        h("tr", {}, ...["Stall", "Sold", "Lost", "Takings"].map((t) => h("th", { text: t }))),
        ...rows.map((r) => {
          const s = state.stalls[r.stall];
          const lost = (r.lostQueue ?? 0) + (r.lostStock ?? 0) + (r.lostSeats ?? 0);
          return h("tr", { class: r.cooked ? "is-cooked" : "" }, h("td", { text: `${s.no} ${stallTitle(s)}${r.cooked ? " (you cooked)" : ""}` }), h("td", { text: String(r.sold) }), h("td", { text: String(lost) }), h("td", { text: money(r.revenue) }));
        }),
      ),
      eod
        ? h(
            "div",
            { class: "csum__day" },
            h("p", {}, h("strong", { text: `End of day ${eod.day}: ${eod.profit >= 0 ? "profit" : "loss"} ${money(eod.profit)}` }), ...why(dayLines(eod), [...SOURCES.rent.slice(0, 2), ...SOURCES.wages, ...SOURCES.cleaning])),
            ...eod.notes.map((t) => h("p", { class: /nobody takes over|closes/.test(t) ? "csum__closed" : /takes over/.test(t) ? "csum__passed" : "", text: t })),
          )
        : null,
      h("button", { class: "ghost go--small", type: "button", text: "OK", onclick: () => ((ui.summary = null), render()) }),
    );
  }

  function finalReport(state) {
    const g = goals(state);
    const h2 = heritage(state);
    return h(
      "section",
      { class: "csum csum--final" },
      h("h3", { class: "csum__title", text: g.every((x) => x.ok) ? "Every goal met. The centre is in good hands." : "The fortnight is over." }),
      h("p", { text: `${state.successions.length} hawker${state.successions.length === 1 ? "" : "s"} passed their stall on. ${state.closures.length ? `${state.closures.length} stall${state.closures.length === 1 ? "" : "s"} closed without a successor: ${state.closures.map((c) => `${c.hawker}'s ${c.dishes}`).join("; ")}.` : "No stall closed without a successor."}` }),
      h("p", { text: `Still on the menu: ${h2.dishes.map((d) => DISHES[d].name).join(", ")}.` }),
    );
  }

  function resetButton() {
    return h("button", {
      class: "link link--inline",
      type: "button",
      id: "centreReset",
      text: ui.resetArmed ? "Tap again to reset" : "Reset centre",
      onclick: () => {
        if (!ui.resetArmed) {
          ui.resetArmed = true;
          render();
          return;
        }
        ui.resetArmed = false;
        ui.summary = null;
        commit(null);
      },
    });
  }

  function render() {
    const state = getState();
    if (!state) renderStart();
    else renderDashboard(state);
  }

  return {
    render,
    showSummary(sum) {
      ui.summary = sum;
      render();
    },
  };
}
