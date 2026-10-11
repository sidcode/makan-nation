// Centre Manager: run a whole hawker centre for a fortnight. Pure data and a seeded random number
// generator, no DOM, so the same choices always give the same days, and the tests can replay them.
//
// The model is kept small on purpose, and every number comes with a "why": a list of the factors that
// made it. Where a figure is real it carries a source; the rest are game simplifications, said so.

import { lookOf } from "./chefs.js";
import { communitiesOf, DISHES, DRINK_COST, INGREDIENTS } from "./dishes.js";
import { COST_SOURCES, HAWKERNOMICS, HELPER_HOURLY } from "./economy.js";
import { eraById, money } from "./eras.js";
import { planFor } from "./guide.js";
import { LEVELS, levelById } from "./levels.js";

export const VERSION = 1;
export const SAVE_KEY = "makan-centre";
export const DAYS = 14;
export const TICKET_CUSTOMERS = 6;
// Some people eat elsewhere: a coffeeshop down the road, home, a food court. Its pull, per stall.
const OUTSIDE = 2;
const NIGHT_WASH = 8; // cleanliness every stall gets back by washing up at night // in a cooked round, every ticket stands for this many customers

export const SESSIONS = [
  { id: "b", name: "Breakfast", crowd: 0.7 },
  { id: "l", name: "Lunch", crowd: 1 },
  { id: "d", name: "Dinner", crowd: 0.85 },
];

const NEA_HSS = "https://www.nea.gov.sg/media/news/news/index/nea-to-introduce-a-new-scheme-to-facilitate-the-continued-practice-of-hawker-trade-and-transmission-of-culinary-skills-from-retiring-veteran-hawkers-to-aspiring-successors";

export const SOURCES = {
  rent: [
    ["NEA: rental policy for hawker stalls (subsidised rent $160 to $320 a month, and who qualifies)", "https://wiego.org/wp-content/uploads/2019/09/Singapore-Rental-Policy-for-Stalls-in-Hawker-Centres-and-Wet-Markets.pdf"],
    ["MSE, Feb 2025: median rent of non-subsidised cooked food stalls about $1,250 a month", "https://www.mse.gov.sg/latest-news/written-reply-to-parliamentary-question-on-median-rent-for-hawker-stalls-feb2025/"],
    ["NEA, 2020: about 40% of cooked food stallholders on subsidised rent", "https://www.nea.gov.sg/media/readers-letters/index/nea-has-put-in-place-various-measures-to-moderate-hawker-stall-rents"],
    ["NEA: Incubation Stall Programme (50% of market rent at first)", "https://www.nea.gov.sg/our-services/hawker-management/programmes-and-grants/isp"],
  ],
  cleaning: [COST_SOURCES[0]],
  wages: [COST_SOURCES[1]],
  grade: [["Rajah & Tann: SFA's SAFE framework replaces the A to D grades from 19 January 2026", "https://www.rajahtannasia.com/viewpoints/sfa-implements-new-safety-assurance-for-food-establishments-safe-framework-to-enhance-food-safety-phase-1-commences-on-19-january-2026/"]],
  tray: [
    ["NEA, May 2021: tray return required from 1 June 2021, enforced from 1 September 2021", "https://www.nea.gov.sg/media/news/news/index/mandatory-for-diners-to-return-dirty-trays-crockery-and-clean-table-litter-at-hawker-centres-coffeeshops-and-food-courts"],
    ["NEA, 2023: tray return rate at hawker centres 91%, up from 65% in August 2021", "https://www.nea.gov.sg/media/news/advisories/index/stepped-up-enforcement-against-table-littering-from-1-june-2023"],
  ],
  succession: [
    ["NEA: Hawkers' Succession Scheme, a 3-month apprenticeship", "https://www.nea.gov.sg/hawkers-succession-scheme"],
    ["NEA, 2020: the median age of hawkers is 59", NEA_HSS],
  ],
  rain: [["Meteorological Service Singapore: wettest months November to January", "https://www.weather.gov.sg/climate-climate-of-singapore/"]],
  critic: [["NBC News, July 2016: two Singapore hawker stalls get the first Michelin stars for street food", "https://www.nbcnews.com/business/business-news/singapore-street-stalls-make-dining-history-michelin-star-n615141"]],
  hawkernomics: [HAWKERNOMICS],
};

// Simplifications, said out loud on the manager screen.
export const SIMPLIFICATIONS = [
  "You run the centre as one co-op purse: every stall's takings come in, and rent, wages, stock and cleaning go out.",
  "Each day has three sessions of about four hours. Customers, prices and cleanliness follow simple rules shown in each \"why\".",
  "Which meal a dish sells best at is our guess, except where its recipe card has a source.",
  "An apprenticeship takes 3 days here; NEA's Hawkers' Succession Scheme takes 3 months.",
  "The hygiene grade is a game grade from A to D, like SFA's old letter grades. Since 19 January 2026, SFA's SAFE framework grades A, B or C on a stall's food safety record.",
  `When you cook a session yourself, every ticket you serve stands for ${TICKET_CUSTOMERS} customers.`,
];

// ---------- People: hawkers and apprentices (all fictional) ----------

export const HAWKERS = [
  { id: "tan", name: "Uncle Tan Hock Seng", age: 72, community: "Teochew", type: "uncle" },
  { id: "lee", name: "Auntie Lee Mei Fong", age: 66, community: "Cantonese", type: "auntie" },
  { id: "rahmat", name: "Encik Rahmat Salleh", age: 61, community: "Malay", type: "pakcik" },
  { id: "zainab", name: "Puan Zainab Ismail", age: 68, community: "Minangkabau", type: "makcik" },
  { id: "muthu", name: "Mr Muthu Krishnan", age: 63, community: "Tamil", type: "appa" },
  { id: "kader", name: "Mr Abdul Kader", age: 70, community: "Indian Muslim", type: "appa" },
  { id: "goh", name: "Auntie Goh Siew Lan", age: 74, community: "Hokkien", type: "auntie" },
  { id: "wong", name: "Uncle Wong Kam Fai", age: 69, community: "Cantonese", type: "uncle" },
  { id: "chua", name: "Madam Chua Lay Hoon", age: 58, community: "Hainanese", type: "auntie" },
  { id: "liew", name: "Uncle Liew Fook Choy", age: 71, community: "Hakka", type: "uncle" },
  { id: "ng", name: "Auntie Ng Bee Choo", age: 67, community: "Peranakan", type: "auntie" },
  { id: "siti", name: "Kak Siti Aminah", age: 52, community: "Javanese", type: "makcik" },
  { id: "harjit", name: "Mr Harjit Singh", age: 55, community: "Punjabi", type: "sikh" },
  { id: "souza", name: "Mr Peter de Souza", age: 60, community: "Eurasian", type: "eurasianDad" },
  { id: "lakshmi", name: "Mrs Lakshmi Raman", age: 57, community: "Tamil", type: "amma" },
  { id: "lim", name: "Uncle Lim Ah Huat", age: 76, community: "Hokkien", type: "uncle" },
  { id: "hamid", name: "Pak Hamid Yusof", age: 73, community: "Malay", type: "pakcik" },
  { id: "rachel", name: "Ms Rachel Lim", age: 34, community: "Teochew", type: "officeWorker" },
];

export const APPRENTICES = [
  { id: "weijie", name: "Wei Jie", age: 26, community: "Hokkien", type: "student" },
  { id: "nurul", name: "Nurul Huda", age: 24, community: "Malay", type: "officeWorker" },
  { id: "arjun", name: "Arjun", age: 29, community: "Tamil", type: "student" },
  { id: "meixuan", name: "Mei Xuan", age: 31, community: "Cantonese", type: "officeWorker" },
  { id: "hafiz", name: "Hafiz", age: 27, community: "Malay", type: "student" },
  { id: "kavitha", name: "Kavitha", age: 33, community: "Tamil", type: "officeWorker" },
  { id: "bryan", name: "Bryan", age: 28, community: "Eurasian", type: "student" },
  { id: "aisyah", name: "Aisyah", age: 25, community: "Javanese", type: "officeWorker" },
  { id: "marcus", name: "Marcus", age: 30, community: "Teochew", type: "student" },
  { id: "farhan", name: "Farhan", age: 23, community: "Indian Muslim", type: "student" },
  { id: "shuting", name: "Shu Ting", age: 29, community: "Hakka", type: "officeWorker" },
  { id: "ravi", name: "Ravi", age: 35, community: "Punjabi", type: "student" },
];

// ---------- Random numbers, seeded and saved with the game ----------

function next(state) {
  state.r = (state.r * 16807) % 2147483647;
  return (state.r - 1) / 2147483646;
}

const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const pct = (x) => `${x >= 1 ? "+" : ""}${Math.round((x - 1) * 100)}%`;

// ---------- Prices, costs and rules ----------

export function normPrice(dishId, era) {
  return round2((DISHES[dishId]?.price ?? 3) * era.price);
}

// What one portion costs to make, from the raw ingredients its plan uses, plus a container.
export function unitCost(dishId, era) {
  const d = DISHES[dishId];
  if (!d) return 0;
  if (dishId === "drink") return round2(DRINK_COST * era.price);
  const variants = Object.values(d.variants);
  const avg =
    variants.reduce((sum, v) => sum + v.parts.reduce((n, sig) => n + planFor(sig).inputs.reduce((m, k) => m + (INGREDIENTS[k]?.cost ?? 0.3), 0), 0), 0) / variants.length;
  return round2((avg + 0.1) * era.price);
}

// Customers are price sensitive: 10% dearer than usual loses about a fifth of them, half price brings
// about two and a half times as many, within limits. Our model, not a measured figure.
export function priceEffect(ratio) {
  return clamp(Math.pow(ratio, -2.5), 0.05, 2.2);
}

export function grade(clean) {
  return clean >= 85 ? "A" : clean >= 70 ? "B" : clean >= 50 ? "C" : "D";
}
const GRADE_MULT = { A: 1.05, B: 1, C: 0.85, D: 0.65 };

export const CLEANING = [
  { name: "None", perStall: 0, drift: -6, note: "Nobody wipes the tables." },
  { name: "Table cleaning", perStall: 520 / 26, drift: -1, note: "The table cleaning charge, about $520 a month per stall (MSE, 2025), spread over 26 days." },
  { name: "Deep clean", perStall: 1040 / 26, drift: 3, note: "Twice the table cleaning charge, our guess for a deep clean." },
];

const RENT = { subsidised: 240, market: 1250, incubation: 625 };
const RENT_NOTE = {
  subsidised: "Subsidised rent, $240 a month: the middle of NEA's $160 to $320 range",
  market: "Market rent, $1,250 a month: the median for non-subsidised cooked food stalls (MSE, 2025)",
  incubation: "Incubation rent, half of market rent, as in NEA's Incubation Stall Programme",
};

export function rentPerDay(stall, era) {
  return round2((RENT[stall.rent] ?? RENT.market) / 26 * era.price);
}

// Which stalls start on subsidised rent. Subsidised stallholders were relocated from the streets in the
// early 1970s; about 40% still paid it in 2020. 1950s street hawkers pay the same low licence here, and by
// 2065 we guess the last subsidised stallholders have retired.
const SUBSIDISED_SHARE = { "1950s": 1, "1980s": 1, today: 0.4, 2065: 0 };

const TRAY = { base: 0.91, reminders: 0.05, reminderCost: 30 };
export const trayApplies = (era) => era.id === "today" || era.id === "2065";

const HOURS = 4;
export const wagePerSession = (era) => round2(HELPER_HOURLY * HOURS * era.price);
export const apprenticeWagePerDay = (era) => round2(HELPER_HOURLY * 8 * era.price);

// ---------- Setting up ----------

export function slotsFor(centre) {
  const n = Number(centre?.stalls) || 64;
  return clamp(Math.round(Math.sqrt(n)), 6, 12);
}

const titleOf = (type) => levelById(type).name;

function hawkerFrom(p, eraId, extra = {}) {
  return { id: p.id, name: p.name, age: p.age, community: p.community, look: lookOf(p.type, eraId, p.age), skill: 1, retireDay: null, ...extra };
}

// famous: dishes this centre is known for, [{ id, note, src: [title, url] }], from its profile.
export function newCentre({ centre, era: eraId = "today", seed = 1965, famous = [], profileKey = null }) {
  const era = eraById(eraId);
  const state = {
    v: VERSION,
    seed,
    r: (Math.abs(Math.floor(seed)) % 2147483646) + 1,
    centre: { id: String(centre?.id ?? "x"), name: String(centre?.name ?? "Hawker centre").slice(0, 80), stalls: Number(centre?.stalls) || null, yearLabel: centre?.yearLabel ?? "", year: Number(centre?.year) || null, profile: profileKey },
    famous: (Array.isArray(famous) ? famous : []).filter((f) => DISHES[f?.id]).slice(0, 8).map((f) => ({ id: f.id, note: String(f.note ?? "").slice(0, 200), src: Array.isArray(f.src) ? f.src.slice(0, 2).map(String) : null })),
    era: era.id,
    day: 1,
    session: 0,
    cash: round2(2500 * era.price),
    minCash: 0,
    satisfaction: 60,
    cleaning: 1,
    trayReminders: false,
    stalls: [],
    events: [],
    history: [],
    today: emptyDay(),
    closures: [],
    successions: [],
    log: [],
    last: null,
    used: [],
    over: false,
  };
  state.minCash = state.cash;
  const slots = slotsFor(centre);
  // Stall types in a seeded order, repeating once all are used. Stalls with the dishes the centre is
  // famous for come first.
  const famousIds = state.famous.map((f) => f.id);
  const types = LEVELS.map((l) => [next(state) - l.dishes.filter((d) => famousIds.includes(d)).length, l.id])
    .sort((a, b) => a[0] - b[0])
    .map(([, id]) => id);
  const pool = HAWKERS.map((h) => [next(state), h]).sort((a, b) => a[0] - b[0]).map(([, h]) => h);
  for (let i = 0; i < slots; i++) {
    const type = types[i % types.length];
    const level = levelById(type);
    const comms = new Set(level.dishes.flatMap((d) => communitiesOf(d)));
    // Prefer a hawker from the community behind the stall's dishes, then anyone left.
    const hawker = pool.find((p) => !state.used.includes(p.id) && comms.has(p.community)) ?? pool.find((p) => !state.used.includes(p.id)) ?? pool[i % pool.length];
    state.used.push(hawker.id);
    const subsidised = next(state) < (SUBSIDISED_SHARE[era.id] ?? 0.4);
    state.stalls.push({
      no: `#01-${String(i + 1).padStart(2, "0")}`,
      type,
      open: true,
      closed: false,
      hawker: hawkerFrom(hawker, era.id, { skill: round2(0.95 + next(state) * 0.2) }),
      apprentice: null,
      menu: Object.fromEntries(level.dishes.map((d) => [d, { on: true, price: normPrice(d, era) }])),
      prep: 0,
      stock: 0,
      helpers: 1,
      rent: subsidised ? "subsidised" : "market",
      clean: 80,
      boost: null,
      opensDay: null,
      last: null,
    });
  }
  for (let i = 0; i < state.stalls.length; i++) state.stalls[i].prep = suggestedPrep(state, i);
  state.log.push(`Day 1. ${state.centre.name} opens with ${slots} stalls.`);
  return state;
}

function emptyDay() {
  return { footfall: 0, revenue: 0, stock: 0, wages: 0, rent: 0, cleaning: 0, other: 0, spoiled: 0, sessions: [] };
}

// ---------- Demand ----------

const activeEvents = (state, kind) => state.events.filter((e) => e.kind === kind && e.day <= state.day && e.until >= state.day);

export function quality(stall) {
  const h = stall.hawker;
  return round2(h.skill);
}

export const FAMOUS_PULL = 1.25;
const isFamous = (state, d) => (state.famous ?? []).some((f) => f.id === d);

function dishAppeal(state, stall, d, session, era) {
  const m = stall.menu[d];
  const norm = normPrice(d, era);
  const ratio = m.price / norm;
  const priceMult = priceEffect(ratio);
  const fit = (DISHES[d].meals ?? "bld").includes(session.id) ? 1 : 0.4;
  const famous = isFamous(state, d) ? FAMOUS_PULL : 1;
  return { appeal: fit * priceMult * famous, fit, priceMult, ratio, famous };
}

export function isServing(stall, state) {
  return stall.open && !stall.closed && (stall.opensDay == null || stall.opensDay <= state.day);
}

// How attractive a stall is this session, and why.
export function stallAppeal(state, i, sessionIndex = state.session) {
  const era = eraById(state.era);
  const stall = state.stalls[i];
  const session = SESSIONS[sessionIndex];
  if (!isServing(stall, state)) return { appeal: 0, why: ["Closed"] };
  const dishes = Object.keys(stall.menu).filter((d) => stall.menu[d].on);
  if (!dishes.length) return { appeal: 0, why: ["Nothing on the menu"] };
  let sum = 0;
  let fits = 0;
  let priceSum = 0;
  const famousHere = [];
  for (const d of dishes) {
    const a = dishAppeal(state, stall, d, session, era);
    sum += a.appeal;
    fits += a.fit === 1 ? 1 : 0;
    priceSum += a.ratio;
    if (a.famous > 1) famousHere.push(DISHES[d].name);
  }
  const q = quality(stall);
  const g = grade(stall.clean);
  const boost = stall.boost && stall.boost.until >= state.day ? stall.boost.mult : 1;
  const appeal = sum * q * GRADE_MULT[g] * boost;
  const avgRatio = priceSum / dishes.length;
  return {
    appeal,
    why: [
      `${dishes.length} dish${dishes.length > 1 ? "es" : ""} on the menu, ${fits} suited to ${session.name.toLowerCase()} (others sell at 40%)`,
      `Prices ${Math.round(avgRatio * 100)}% of the usual: ${pct(priceEffect(avgRatio))} customers`,
      `Cooking quality ${pct(q)}${stall.apprentice ? " (an apprentice is learning)" : ""}`,
      `Hygiene grade ${g}: ${pct(GRADE_MULT[g])}`,
      ...(famousHere.length ? [`${state.centre.name} is known for ${famousHere.join(", ")}: ${pct(FAMOUS_PULL)} for ${famousHere.length > 1 ? "those dishes" : "that dish"}`] : []),
      ...(boost !== 1 ? [`Critic's review: ${pct(boost)}`] : []),
    ],
  };
}

// Everyone who comes to the centre this session, and why.
export function crowd(state, sessionIndex = state.session) {
  const session = SESSIONS[sessionIndex];
  const open = state.stalls.filter((s) => isServing(s, state));
  const base = state.stalls.length * 60;
  const sat = 0.6 + state.satisfaction / 125;
  const distinct = new Set(open.flatMap((s) => Object.keys(s.menu).filter((d) => s.menu[d].on))).size;
  const variety = 0.85 + 0.03 * Math.min(10, distinct);
  let ev = 1;
  const why = [`${state.stalls.length} stalls bring about ${base} people a session`, `${session.name}: ${pct(session.crowd)}`, `Satisfaction ${Math.round(state.satisfaction)}: ${pct(sat)}`, `${distinct} different dishes: ${pct(variety)}`];
  for (const e of activeEvents(state, "rain")) {
    ev *= 0.75;
    why.push(`${e.title}: -25%`);
  }
  for (const e of activeEvents(state, "festive")) {
    ev *= 1.3;
    why.push(`${e.title}: +30%`);
  }
  return { people: Math.round(base * session.crowd * sat * variety * ev), why };
}

// What the next session would look like for one stall, with no randomness. Used for the prep suggestion.
export function forecast(state, i) {
  const c = crowd(state);
  const all = state.stalls.map((_, j) => stallAppeal(state, j).appeal);
  const outside = state.stalls.length * OUTSIDE;
  const total = all.reduce((a, b) => a + b, 0) + outside;
  return Math.round((c.people * all[i]) / total);
}

export function capacity(stall) {
  return Math.round(40 * (1 + 0.5 * stall.helpers));
}

export function suggestedPrep(state, i) {
  const s = state.stalls[i];
  return Math.min(capacity(s), Math.max(0, Math.round(forecast(state, i) * 1.05) - s.stock));
}

export function avgUnitCost(state, stall) {
  const era = eraById(state.era);
  const on = Object.keys(stall.menu).filter((d) => stall.menu[d].on);
  if (!on.length) return 0;
  const spike = activeEvents(state, "spike")[0];
  return round2(on.reduce((n, d) => n + unitCost(d, era) * (spike && dishGroups(d).includes(spike.group) ? spike.mult : 1), 0) / on.length);
}

// ---------- Running a session ----------

// cooked: { stall, served, missed, takings, spent, stars } when a player cooked one stall this session.
export function runSession(state, cooked = null) {
  if (state.over) return null;
  const era = eraById(state.era);
  const session = SESSIONS[state.session];
  const c = crowd(state);
  const noise = () => 0.9 + next(state) * 0.2;
  const appeals = state.stalls.map((_, i) => stallAppeal(state, i));
  const outside = state.stalls.length * OUTSIDE;
  const total = appeals.reduce((a, b) => a + b.appeal, 0) + outside;
  const rows = [];
  let footfall = 0;
  // Stock is bought before the session.
  for (const s of state.stalls) {
    if (!isServing(s, state)) continue;
    const cost = round2(s.prep * avgUnitCost(state, s));
    state.cash -= cost;
    state.today.stock += cost;
    s.stock += s.prep;
  }
  for (let i = 0; i < state.stalls.length; i++) {
    const s = state.stalls[i];
    if (!isServing(s, state)) {
      rows.push({ stall: i, demand: 0, sold: 0, lostQueue: 0, lostStock: 0, revenue: 0, wages: 0, closed: true });
      continue;
    }
    const demand = Math.round(((c.people * appeals[i].appeal) / total) * noise());
    const cap = capacity(s);
    const sold = Math.min(demand, cap, s.stock);
    rows.push({ stall: i, demand, sold, lostQueue: demand - Math.min(demand, cap), lostStock: Math.max(0, Math.min(demand, cap) - sold), revenue: 0, wages: 0, why: appeals[i].why });
  }
  // Seats: everyone needs somewhere to sit. Tables clear faster when trays come back.
  const tray = trayApplies(era) ? TRAY.base + (state.trayReminders ? TRAY.reminders : 0) : null;
  const seats = Math.round(state.stalls.length * 30 * 2 * (tray == null ? 1 : 0.6 + 0.4 * tray));
  const wanting = rows.reduce((n, r) => n + r.sold, 0);
  const seatShare = wanting > seats ? seats / wanting : 1;
  for (const r of rows) {
    if (r.closed) continue;
    const s = state.stalls[r.stall];
    const seated = Math.floor(r.sold * seatShare);
    r.lostSeats = r.sold - seated;
    r.sold = seated;
    s.stock -= r.sold;
    r.revenue = revenueFor(state, s, r.sold, SESSIONS[state.session], era);
    r.wages = round2(s.helpers * wagePerSession(era));
  }
  // A stall the player cooked replaces its simulated numbers with the round's.
  if (cooked && rows[cooked.stall] && !rows[cooked.stall].closed) {
    const r = rows[cooked.stall];
    const s = state.stalls[cooked.stall];
    s.stock += r.sold; // the round bought its own ingredients, so the prepared stock is untouched
    r.sold = Math.max(0, Math.round(cooked.served)) * TICKET_CUSTOMERS;
    r.demand = r.sold + Math.max(0, Math.round(cooked.missed)) * TICKET_CUSTOMERS;
    r.lostQueue = r.demand - r.sold;
    r.lostStock = 0;
    r.lostSeats = 0;
    r.revenue = round2(Math.max(0, cooked.takings) * TICKET_CUSTOMERS);
    const spent = round2(Math.max(0, cooked.spent) * TICKET_CUSTOMERS);
    state.cash -= spent;
    state.today.stock += spent;
    r.cooked = { stars: cooked.stars, served: cooked.served };
    r.why = [`You cooked this session: ${cooked.served} tickets served, each standing for ${TICKET_CUSTOMERS} customers`, `Ingredients bought as you cooked: ${money(spent)}`];
  }
  let revenue = 0;
  let wages = 0;
  let dirt = 0;
  for (const r of rows) {
    if (r.closed) continue;
    const s = state.stalls[r.stall];
    revenue += r.revenue;
    wages += r.wages;
    footfall += r.sold;
    // Cleanliness drifts with the contract, how busy the stall was, and trays left behind.
    const drift = CLEANING[state.cleaning].drift - r.sold / 40 - (tray == null ? 0 : 4 * (1 - tray));
    s.clean = round2(clamp(s.clean + drift, 0, 100));
    dirt += s.clean;
    s.last = r;
  }
  state.cash = round2(state.cash + revenue - wages);
  state.today.revenue = round2(state.today.revenue + revenue);
  state.today.wages = round2(state.today.wages + wages);
  state.today.footfall += footfall;
  // Leftovers: half of what was prepared and not sold spoils by the next session.
  let spoiled = 0;
  for (const s of state.stalls) {
    const lost = Math.ceil(s.stock / 2);
    spoiled += round2(lost * avgUnitCost(state, s));
    s.stock -= lost;
  }
  state.today.spoiled = round2(state.today.spoiled + spoiled);
  // Satisfaction moves a third of the way towards this session's experience.
  const served = rows.reduce((n, r) => n + r.sold, 0);
  const wanted = rows.reduce((n, r) => n + (r.demand ?? 0), 0) || 1;
  const open = rows.filter((r) => !r.closed);
  const avgQ = open.length ? open.reduce((n, r) => n + (r.cooked ? 0.8 + 0.15 * r.cooked.stars : quality(state.stalls[r.stall])), 0) / open.length : 1;
  const avgClean = open.length ? dirt / open.length : 50;
  const value = open.length ? open.reduce((n, r) => n + valueScore(state.stalls[r.stall], era), 0) / open.length : 1;
  const parts = [0.5 * (served / wanted), (0.2 * avgQ) / 1.15, (0.15 * avgClean) / 100, 0.15 * value];
  const target = clamp(100 * parts.reduce((a, b) => a + b, 0), 0, 100);
  const before = state.satisfaction;
  state.satisfaction = round2(clamp(before + 0.35 * (target - before), 0, 100));
  const summary = {
    day: state.day,
    session: session.name,
    crowd: c,
    footfall,
    revenue: round2(revenue),
    wages: round2(wages),
    spoiled: round2(spoiled),
    seats,
    tray,
    rows,
    satisfaction: { before, after: state.satisfaction, why: [`Got served: ${Math.round((100 * served) / wanted)}% of those who queued (counts half)`, `Cooking quality ${pct(avgQ)} (a fifth)`, `Average cleanliness ${Math.round(avgClean)} of 100`, `Value for money ${Math.round(value * 100)}%`, `Moves a third of the way from ${Math.round(before)} towards ${Math.round(target)}`] },
    endOfDay: null,
  };
  state.today.sessions.push({ session: session.id, footfall, revenue: summary.revenue });
  state.session += 1;
  if (state.session >= SESSIONS.length) summary.endOfDay = endDay(state);
  for (let i = 0; i < state.stalls.length; i++) state.stalls[i].prep = suggestedPrep(state, i);
  state.last = summary;
  return summary;
}

function revenueFor(state, stall, sold, session, era) {
  const on = Object.keys(stall.menu).filter((d) => stall.menu[d].on);
  if (!on.length || !sold) return 0;
  // Sales split by appeal between the dishes on the menu.
  const weights = on.map((d) => {
    const ratio = stall.menu[d].price / normPrice(d, era);
    return ((DISHES[d].meals ?? "bld").includes(session.id) ? 1 : 0.4) * priceEffect(ratio) * (isFamous(state, d) ? FAMOUS_PULL : 1);
  });
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return round2(on.reduce((n, d, k) => n + ((sold * weights[k]) / total) * stall.menu[d].price, 0));
}

function valueScore(stall, era) {
  const on = Object.keys(stall.menu).filter((d) => stall.menu[d].on);
  if (!on.length) return 1;
  const r = on.reduce((n, d) => n + normPrice(d, era) / stall.menu[d].price, 0) / on.length;
  return clamp(r, 0, 1.2) / 1.2;
}

// ---------- End of a day ----------

function endDay(state) {
  const era = eraById(state.era);
  const day = state.today;
  const notes = [];
  // Whatever is left tonight goes in the bin, and every stall washes up before going home.
  let spoiled = 0;
  for (const s of state.stalls) {
    spoiled += round2(s.stock * avgUnitCost(state, s));
    s.stock = 0;
    if (!s.closed) s.clean = round2(clamp(s.clean + NIGHT_WASH, 0, 100));
  }
  day.spoiled = round2(day.spoiled + spoiled);
  // Rent for every stall that is still let, cleaning, tray reminders, apprentices.
  for (const s of state.stalls) {
    if (s.closed) continue;
    const rent = rentPerDay(s, era);
    day.rent = round2(day.rent + rent);
    state.cash -= rent;
    if (s.apprentice) {
      const w = apprenticeWagePerDay(era);
      day.other = round2(day.other + w);
      state.cash -= w;
      s.apprentice.days += 1;
    }
  }
  const lets = state.stalls.filter((s) => !s.closed).length;
  const cleaning = round2(CLEANING[state.cleaning].perStall * lets * era.price);
  day.cleaning = cleaning;
  state.cash -= cleaning;
  if (trayApplies(era) && state.trayReminders) {
    const t = round2(TRAY.reminderCost * era.price);
    day.other = round2(day.other + t);
    state.cash -= t;
  }
  state.cash = round2(state.cash);
  const costs = round2(day.stock + day.wages + day.rent + day.cleaning + day.other);
  const profit = round2(day.revenue - costs);
  const h = heritage(state);
  state.history.push({ day: state.day, cash: state.cash, footfall: day.footfall, profit, satisfaction: state.satisfaction, communities: h.communities.length, dishes: h.dishes.length });
  state.minCash = Math.min(state.minCash, state.cash);
  const report = { day: state.day, revenue: day.revenue, stock: day.stock, wages: day.wages, rent: day.rent, cleaning: day.cleaning, other: day.other, spoiled: day.spoiled, profit, footfall: day.footfall, notes };
  // Successions and closures happen overnight.
  for (let i = 0; i < state.stalls.length; i++) {
    const s = state.stalls[i];
    if (s.closed || s.hawker.retireDay == null || s.hawker.retireDay > state.day) continue;
    if (s.apprentice && s.apprentice.days >= 3) {
      const old = s.hawker;
      const a = s.apprentice;
      s.hawker = { id: a.id, name: a.name, age: a.age, community: a.community, look: a.look, skill: 0.92, retireDay: null, learnedFrom: old.name };
      s.apprentice = null;
      if (s.rent === "subsidised") s.rent = "market";
      state.successions.push({ day: state.day, stall: s.no, from: old.name, to: s.hawker.name, dishes: menuNames(s) });
      notes.push(`${old.name} retires. ${s.hawker.name} takes over ${s.no}, and ${menuNames(s)} stay on the menu. Rent moves to the market rate, as it does when a subsidised stall changes hands.`);
    } else {
      const old = s.hawker;
      const leaving = menuNames(s);
      s.closed = true;
      s.open = false;
      s.apprentice = null;
      const gone = Object.keys(s.menu).filter((d) => !state.stalls.some((o) => o !== s && isServingTomorrow(o, state) && o.menu[d]?.on));
      state.closures.push({ day: state.day, stall: s.no, hawker: old.name, dishes: leaving, gone: gone.map((d) => DISHES[d].name) });
      notes.push(`${old.name} retires and nobody takes over. ${s.no} closes${gone.length ? `, and ${gone.map((d) => DISHES[d].name).join(", ")} leave${gone.length === 1 ? "s" : ""} ${state.centre.name}` : ""}.`);
    }
  }
  // Skills grow, a new day starts, maybe something happens.
  for (const s of state.stalls) if (s.hawker.learnedFrom && s.hawker.skill < 1.1) s.hawker.skill = round2(s.hawker.skill + 0.02);
  state.day += 1;
  state.session = 0;
  state.today = emptyDay();
  if (state.day > DAYS || state.cash < 0) {
    state.over = true;
    notes.push(state.cash < 0 ? "The co-op purse ran dry. The centre closes for now." : `Day ${DAYS} is done. Here is how the centre did.`);
  } else {
    notes.push(...startDay(state));
  }
  state.log.push(...notes);
  if (state.log.length > 80) state.log.splice(0, state.log.length - 80);
  return report;
}

function isServingTomorrow(stall, state) {
  return !stall.closed && (stall.opensDay == null || stall.opensDay <= state.day + 1);
}

const menuNames = (s) => Object.keys(s.menu).filter((d) => d !== "drink").map((d) => DISHES[d].name).join(", ");

const dishGroups = (d) => {
  const groups = new Set();
  for (const v of Object.values(DISHES[d]?.variants ?? {})) for (const sig of v.parts) for (const k of planFor(sig).inputs) groups.add(groupKey(k));
  return [...groups];
};
const GROUP_OF = { meat: ["chicken", "duck", "charsiew", "satayc", "sataym", "mutton", "egg", "ribs", "porkchop", "beef", "tofu"], sea: ["prawn", "oyster", "ikanbilis", "fish", "stingray"], veg: ["cucumber", "chaipoh", "cabbage"] };
const groupKey = (k) => Object.keys(GROUP_OF).find((g) => GROUP_OF[g].includes(k)) ?? "other";
const GROUP_NAMES = { meat: "meat, eggs and tofu", sea: "seafood", veg: "vegetables" };

// Things that happen at the start of a day. At most one random event, plus retirement plans.
function startDay(state) {
  const notes = [];
  const serving = state.stalls.map((s, i) => [s, i]).filter(([s]) => !s.closed);
  const roll = next(state);
  const add = (e) => {
    state.events.push(e);
    notes.push(e.text);
  };
  if (roll < 0.14) add({ kind: "rain", day: state.day, until: state.day, title: "Rain all day", text: "Rain all day. Fewer people come out.", src: SOURCES.rain[0] });
  else if (roll < 0.2) add({ kind: "festive", day: state.day, until: state.day + 1, title: "Festive season", text: "Festive season: families eat out together for two days.", fictional: true });
  else if (roll < 0.28) {
    const group = ["meat", "sea", "veg"][Math.floor(next(state) * 3)];
    add({ kind: "spike", day: state.day, until: state.day + 2, group, mult: 1.6, title: `Price spike: ${GROUP_NAMES[group]}`, text: `Supplier prices for ${GROUP_NAMES[group]} jump 60% for three days.`, fictional: true });
  } else if (roll < 0.34 && serving.length) {
    const [s] = serving[Math.floor(next(state) * serving.length)];
    const good = grade(s.clean) <= "B" && quality(s) >= 1;
    if (good) s.boost = { mult: 1.35, until: state.day + 4 };
    else state.satisfaction = round2(Math.max(0, state.satisfaction - 5));
    add({ kind: "critic", day: state.day, until: state.day, stall: s.no, title: "A food critic visits", text: good ? `A food critic loved ${s.no}. Expect queues there for five days.` : `A food critic was unimpressed by ${s.no}. Satisfaction drops 5.`, src: SOURCES.critic[0], note: "The visit is a game event." });
  } else if (roll < 0.41) {
    const era = eraById(state.era);
    const failed = serving.filter(([s]) => grade(s.clean) === "D");
    for (const [s] of failed) {
      const fine = round2(200 * era.price);
      state.cash = round2(state.cash - fine);
      state.today.other = round2(state.today.other + fine);
      s.clean = Math.max(s.clean, 50);
    }
    if (failed.length) state.satisfaction = round2(Math.max(0, state.satisfaction - 3));
    add({ kind: "inspection", day: state.day, until: state.day, title: "Hygiene inspection", text: failed.length ? `Hygiene inspection: ${failed.map(([s]) => s.no).join(", ")} fined and made to clean up.` : "Hygiene inspection: every stall passes.", src: SOURCES.grade[0], note: "Fines here are a game rule." });
  }
  // Older hawkers start to plan their retirement.
  for (const [s] of serving) {
    const h = s.hawker;
    if (h.retireDay != null || s.opensDay > state.day) continue;
    const p = h.age >= 75 ? 0.3 : h.age >= 68 ? 0.1 : h.age >= 62 ? 0.02 : 0;
    if (next(state) < p) {
      h.retireDay = state.day + 5;
      add({ kind: "retire", day: state.day, until: h.retireDay, stall: s.no, title: `${h.name} plans to retire`, text: `${h.name}, ${h.age}, plans to retire after day ${h.retireDay}. Pair an apprentice for 3 days so ${menuNames(s)} stay${menuNames(s).includes(",") ? "" : "s"}.`, src: SOURCES.succession[1] });
    }
  }
  return notes;
}

// ---------- Choices between sessions ----------

export function pairApprentice(state, i) {
  const s = state.stalls[i];
  if (!s || s.closed || s.apprentice) return false;
  const p = APPRENTICES.find((a) => !state.used.includes(a.id));
  if (!p) return false;
  state.used.push(p.id);
  s.apprentice = { id: p.id, name: p.name, age: p.age, community: p.community, look: lookOf(p.type, state.era, p.age), days: 0 };
  state.log.push(`${p.name} starts as ${s.hawker.name}'s apprentice at ${s.no}.`);
  return true;
}

// A closed stall can be let again to a new hawker through the incubation programme. They bring their own
// menu, a stall type the centre does not have yet if possible, and open two days later.
export function inviteHawker(state, i) {
  const s = state.stalls[i];
  if (!s?.closed) return false;
  const era = eraById(state.era);
  const have = new Set(state.stalls.filter((o) => !o.closed).map((o) => o.type));
  const types = LEVELS.map((l) => l.id).filter((t) => !have.has(t));
  const type = types.length ? types[Math.floor(next(state) * types.length)] : LEVELS[Math.floor(next(state) * LEVELS.length)].id;
  const p = APPRENTICES.find((a) => !state.used.includes(a.id)) ?? HAWKERS.find((h) => !state.used.includes(h.id));
  if (!p) return false;
  state.used.push(p.id);
  const level = levelById(type);
  Object.assign(s, {
    type,
    open: true,
    closed: false,
    hawker: hawkerFrom(p, era.id, { skill: 0.9, learnedFrom: "the incubation programme" }),
    apprentice: null,
    menu: Object.fromEntries(level.dishes.map((d) => [d, { on: true, price: normPrice(d, era) }])),
    helpers: 1,
    rent: "incubation",
    clean: 85,
    boost: null,
    opensDay: state.day + 2,
    stock: 0,
    prep: 0,
    last: null,
  });
  state.log.push(`${p.name} takes ${s.no} on an incubation stall: ${level.name}, opening on day ${s.opensDay}.`);
  return true;
}

export function setPrice(state, i, d, price) {
  const m = state.stalls[i]?.menu[d];
  if (!m || !Number.isFinite(price)) return;
  const era = eraById(state.era);
  m.price = round2(clamp(price, normPrice(d, era) * 0.4, normPrice(d, era) * 3));
}

export function setPrep(state, i, n) {
  const s = state.stalls[i];
  if (s && Number.isFinite(n)) s.prep = clamp(Math.round(n), 0, 400);
}

export function setHelpers(state, i, n) {
  const s = state.stalls[i];
  if (s && Number.isFinite(n)) s.helpers = clamp(Math.round(n), 0, 3);
}

// ---------- Scores ----------

export function heritage(state) {
  const dishes = new Set();
  for (const s of state.stalls) {
    if (s.closed) continue;
    for (const [d, m] of Object.entries(s.menu)) if (m.on && d !== "drink") dishes.add(d);
  }
  const communities = new Set();
  for (const d of dishes) for (const c of communitiesOf(d)) if (c !== "Shared by all") communities.add(c);
  return { dishes: [...dishes], communities: [...communities].sort() };
}

export function goals(state) {
  const h = heritage(state);
  return [
    { id: "days", label: `Keep the centre going for ${DAYS} days`, ok: state.day > DAYS && state.minCash >= 0, progress: `Day ${Math.min(state.day, DAYS)} of ${DAYS}${state.minCash < 0 ? ", but the purse ran dry" : ""}` },
    { id: "communities", label: "Dishes from at least 5 communities on the menu", ok: h.communities.length >= 5, progress: `${h.communities.length} now: ${h.communities.join(", ")}` },
    { id: "succession", label: "No stall closes without a successor", ok: state.closures.length === 0, progress: state.closures.length ? `${state.closures.length} closed: ${state.closures.map((c) => c.stall).join(", ")}` : "None so far" },
  ];
}

export function rentWhy(stall, era) {
  return [`${RENT_NOTE[stall.rent] ?? RENT_NOTE.market}, over 26 trading days`, `Scaled to the era's prices: ${money(rentPerDay(stall, era))} a day`];
}

export function stallTitle(stall) {
  return titleOf(stall.type);
}

// ---------- Saving ----------

export function save(state) {
  return JSON.stringify(state);
}

export function load(text) {
  try {
    const s = typeof text === "string" ? JSON.parse(text) : text;
    if (!s || s.v !== VERSION || !Array.isArray(s.stalls) || !eraById(s.era) || !Number.isFinite(s.cash)) return null;
    if (!s.stalls.every((st) => levelById(st.type).id === st.type && st.menu && typeof st.menu === "object")) return null;
    return s;
  } catch {
    return null;
  }
}
