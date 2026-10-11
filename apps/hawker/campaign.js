// The Hawker Passport: an apprentice trail from the markets and streets of the 1950s to a hawker centre
// in 2065. Mentors are fictional. The places, years and quiz answers are real, with sources on every stop.
// Every stop that can be is at a profiled centre (data/hawker-centre-profiles.json) that existed in its
// era; the Satay Club stop is a documented street spot, and Tampines North is still being built.

import { SKIN } from "./chefs.js";

export const STAGES = [
  { era: "1950s", name: "On the street", line: "You start as an apprentice at a street stall." },
  { era: "1980s", name: "Into the centres", line: "Street hawkers move into the first hawker centres." },
  { era: "today", name: "Today", line: "Trays, queue numbers, and new hawkers learning the old dishes." },
  { era: "2065", name: "SG100", line: "The ladle is yours. Who do you pass it to?" },
];

const SRC = {
  satayClub: ["Wikipedia: Satay Club", "https://en.wikipedia.org/wiki/Satay_Club"],
  glutton: ["Roots.gov.sg: Former Orchard Road Market and Glutton's Square", "https://www.roots.gov.sg/places/places-landing/places/landmarks/orchard-heritage-trail/former-orchard-road-market"],
  tekka: ["Wikipedia: Tekka Centre", "https://en.wikipedia.org/wiki/Tekka_Centre"],
  sfa: ["Food Safety News: Singapore approves lab grown chicken", "https://www.foodsafetynews.com/2020/12/eat-just-inc-gets-approval-in-singapore-for-lab-grown-chicken/"],
  nea: ["NEA Hawker Centres dataset, data.gov.sg", "https://data.gov.sg/datasets/d_4a086da0a5553be1d89383cd90d07ecd/view"],
  maxwell: ["Roots.gov.sg: Maxwell Road Food Centre", "https://www.roots.gov.sg/stories-landing/stories/hawker-centres/maxwell-road-food-centre"],
  chickenRice: ["Roots.gov.sg: Chicken Rice", "https://www.roots.gov.sg/ich-landing/ich/chicken-rice"],
  tiongBahru: ["Roots.gov.sg: Tiong Bahru Market and Food Centre", "https://www.roots.gov.sg/stories-landing/stories/hawker-centres/tiong-bahru-market-food-centre"],
  newtonRoots: ["Roots.gov.sg: Newton Circus Food Centre", "https://www.roots.gov.sg/stories-landing/stories/Hawker-Centres/Newton-Circus-Food-Centre"],
  newtonSite: ["Roots.gov.sg: Newton Food Centre (surveyed site)", "https://www.roots.gov.sg/places/places-landing/places/surveyed-sites/newton-food-centre"],
  chinatown: ["Roots.gov.sg: Chinatown Complex Market and Food Centre", "https://www.roots.gov.sg/stories-landing/stories/hawker-centres/chinatown-complex-market-food-centre"],
  popiah: ["Her World: best stalls at Chinatown Complex", "https://www.herworld.com/life/foodanddrink/best-hawker-stalls-chinatown-complex-food-centre"],
  tekkaRoots: ["Roots.gov.sg: Tekka Market", "https://www.roots.gov.sg/stories-landing/stories/hawker-centres/tekka-market"],
  oldAirport: ["Roots.gov.sg: Blk 51 Old Airport Road", "https://www.roots.gov.sg/stories-landing/stories/hawker-centres/blk-51-old-airport-road"],
  lormee: ["Singapore Women's Weekly: Old Airport Road Food Centre", "https://www.womensweekly.com.sg/food/old-airport-road-food-centre-10-best-hawker-stalls"],
  seraiRoots: ["Roots.gov.sg: Geylang Serai Market and Food Centre", "https://www.roots.gov.sg/stories-landing/stories/hawker-centres/geylang-serai-market-food-centre"],
  seraiBuilt: ["Roots.gov.sg: Our Hawker Culture, Built for Great Taste", "https://www.roots.gov.sg/stories-landing/stories/our-hawker-culture-built-for-great-taste"],
  seraiFood: ["Time Out: Geylang Serai Market and Food Centre", "https://www.timeout.com/singapore/restaurants/geylang-serai-market-food-centre"],
};

// centre: the NEA centre's name as it appears in data/hawker-centres.json (lat/lng come from there).
// spot: for street-era stops, a documented place with an approximate position.
export const STOPS = [
  {
    id: "maxwell",
    era: "1950s",
    level: "chickenrice",
    focus: "chickenrice",
    centre: "Maxwell Food Centre (Kim Hua Market)",
    profile: "maxwell-food-centre",
    mentor: { name: "Uncle Hock", who: "Hainanese chicken rice cook", look: { skin: SKIN[1], hair: ["crop", "#8a8480"], top: ["singlet", "#fbf8f0"], bottom: ["shorts", "#5b6b78"], age: "elder" } },
    intro: ["Maxwell Market opened in 1929. Street hawkers took its trade, so it added cooked food stalls and tables.", "Poach the bird gently, slice it, plate it with the rice. You learn chicken rice first."],
    quiz: { q: "Why did Maxwell Market add cooked food stalls around 1929 to 1930?", options: ["Street hawkers were taking its shoppers", "A fire closed the fish stalls", "The army asked for a canteen"], answer: 0, src: SRC.maxwell },
    sources: [SRC.maxwell, SRC.chickenRice],
  },
  {
    id: "tiongbahru",
    era: "1950s",
    level: "noodlesoup",
    focus: "chweekueh",
    centre: "Tiong Bahru Market",
    profile: "tiong-bahru-market",
    mentor: { name: "Ah Mui", who: "Teochew chwee kueh maker", look: { skin: SKIN[0], hair: ["bun", "#1d1410"], top: ["samfu", "#9fc4d8"], bottom: ["trousers", "#9fc4d8"], age: "adult" } },
    intro: ["Seng Poh Road Market opened in 1951 for the new Tiong Bahru flats. The market made its name on breakfast.", "Chwee kueh: steam the rice cakes, fry the chai poh, plate them together."],
    quiz: { q: "What was Tiong Bahru Market called when it opened in 1951?", options: ["Seng Poh Road Market", "Kim Hua Market", "Zhujiao Market"], answer: 0, src: SRC.tiongBahru },
    sources: [SRC.tiongBahru],
  },
  {
    id: "hoihow",
    era: "1950s",
    level: "malay",
    focus: "satay",
    spot: { name: "Hoi How Road, off Beach Road", lat: 1.2958, lng: 103.8553, note: "The first Satay Club grew up along Hoi How Street near Beach Road, around 1940 to 1970." },
    mentor: { name: "Pak Hassan", who: "Satay man", look: { skin: SKIN[4], hair: ["crop", "#1d1410"], head: ["songkok", "#1d1410"], top: ["shirt", "#f4ead6"], bottom: ["sarong", "#5f7a9a"], age: "adult" } },
    intro: ["The satay men gather off Beach Road. People call it the Satay Club.", "Never let the charcoal sleep. Grill, slice the cucumber, plate it quick."],
    quiz: { q: "The first Satay Club grew up beside which road?", options: ["Beach Road", "Orchard Road", "Holland Road"], answer: 0, src: SRC.satayClub },
    handoff: "In the 1970s the street hawkers moved into new hawker centres. Newton opened in 1971. Go and learn there.",
    sources: [SRC.satayClub],
  },
  {
    id: "newton",
    era: "1980s",
    level: "friednoodles",
    focus: "orhluak",
    centre: "Newton Food Centre",
    profile: "newton-food-centre",
    mentor: { name: "Uncle Chua", who: "Teochew oyster omelette man", look: { skin: SKIN[0], hair: ["short", "#2b2b2b"], top: ["singlet", "#f4efe2"], bottom: ["trousers", "#3a3a3a"], age: "adult" } },
    intro: ["Newton opened in 1971 as hawker stalls in a garden. Hawkers from Koek Road and Glutton's Square moved in.", "Oyster omelette: oysters and egg into the wok together. Crisp at the edge, soft in the middle."],
    quiz: { q: "Newton was Singapore's first hawker centre built without what?", options: ["A wet market", "A roof", "Electric lights"], answer: 0, src: SRC.newtonRoots },
    sources: [SRC.newtonRoots, SRC.newtonSite, SRC.glutton],
  },
  {
    id: "chinatown",
    era: "1980s",
    level: "snacks",
    focus: "popiah",
    centre: "Smith Street Blk 335 (Chinatown Complex Market)",
    profile: "chinatown-complex-market-and-food-centre",
    mentor: { name: "Auntie Wong", who: "Popiah maker", look: { skin: SKIN[0], hair: ["curly", "#2b2b2b"], top: ["blouse", "#e8a08a"], bottom: ["trousers", "#5b5f63"], age: "elder" } },
    intro: ["Chinatown Complex was built in 1981. In October 1983, about 300 street hawkers from these streets moved in.", "Popiah: cut the rolls clean. Ann Chin Popiah, here since the 1940s, still makes its skins by hand."],
    quiz: { q: "About how many street hawkers moved into Chinatown Complex in October 1983?", options: ["About 300", "About 30", "About 3,000"], answer: 0, src: SRC.chinatown },
    sources: [SRC.chinatown, SRC.popiah],
  },
  {
    id: "tekka",
    era: "1980s",
    level: "biryani",
    focus: "biryani",
    centre: "Buffalo Road Blk 665 (Tekka Centre/Zhu Jiao Market)",
    profile: "tekka-centre",
    mentor: { name: "Uncle Basheer", who: "Biryani cook", look: { skin: SKIN[5], hair: ["short", "#c9c4bc"], beard: "#c9c4bc", top: ["kurta", "#fbf8f0"], bottom: ["trousers", "#fbf8f0"], age: "elder" } },
    intro: ["Tekka's first market, Kandang Kerbau Market, opened in 1915. Stallholders moved into this building in 1981.", "Biryani: rice and mutton into the pot together, sealed and slow. A bowl of curry on the side."],
    quiz: { q: "The name Tekka comes from the Hokkien for what?", options: ["Foot of the small bamboos", "Buffalo pen", "Iron market"], answer: 0, src: SRC.tekkaRoots },
    handoff: "You know the centres now. Go and see how we cook today. Bring the ladle back clean, ah.",
    sources: [SRC.tekkaRoots, SRC.tekka, SRC.nea],
  },
  {
    id: "oldairport",
    era: "today",
    level: "noodlesoups",
    focus: "lormee",
    centre: "Old Airport Road Blk 51 (51 Old Airport Road Food Centre and Shopping Mall)",
    profile: "old-airport-road-food-centre",
    mentor: { name: "Auntie Grace", who: "Lor mee hawker", look: { skin: SKIN[1], hair: ["bun", "#3a2a22"], top: ["kebaya", "#d7eef0", "#2a8f8a"], bottom: ["sarong", "#8a3a6a"], age: "adult" } },
    intro: ["This centre gave street hawkers a permanent home, in an estate laid out on the old Kallang Airport runway.", "Lor mee: noodles, egg and a thick gravy. The good stalls here sell out early."],
    quiz: { q: "The estate around Old Airport Road Food Centre was laid out on what?", options: ["The old Kallang Airport", "A filled-in reservoir", "An old rubber estate"], answer: 0, src: SRC.oldAirport },
    sources: [SRC.oldAirport, SRC.lormee, SRC.nea],
  },
  {
    id: "geylangserai",
    era: "today",
    level: "padang",
    focus: "nasipadang",
    centre: "Geylang Serai Market",
    profile: "geylang-serai-market-and-food-centre",
    mentor: { name: "Cik Aminah", who: "Nasi padang stall", look: { skin: SKIN[3], hair: ["short", "#1d1410"], head: ["tudung", "#d9708a"], top: ["kurung", "#f2b6c8", "#d9708a"], bottom: ["skirt", "#f2b6c8"], age: "adult" } },
    intro: ["The first Geylang Serai Market opened in 1964. This one was rebuilt from 2006 to 2009 like a Malay kampung house.", "Nasi padang: rice, rendang, greens. Two well-known nasi padang stalls trade under this roof."],
    quiz: { q: "Geylang Serai Market was rebuilt from 2006 to 2009 in the shape of what?", options: ["A Malay kampung house", "A sampan", "A durian"], answer: 0, src: SRC.seraiBuilt },
    handoff: "Singapore turns 100 in 2065. Go and see what our hawker centres become. The ladle is yours now.",
    sources: [SRC.seraiRoots, SRC.seraiBuilt, SRC.seraiFood],
  },
  {
    id: "tampinesnorth",
    era: "2065",
    level: "chickenrice",
    focus: "chickenrice",
    centre: "Tampines North Hawker Centre",
    mentor: { name: "Nisha", who: "Your apprentice", look: { skin: SKIN[5], hair: ["ponytail", "#1d1410"], top: ["tunic", "#d7eef0"], bottom: ["trousers", "#7cc4e6"], age: "teen" } },
    intro: ["Sifu, NEA was still building this centre back in 2026. Now it is our stall.", "Teach me chicken rice? Cultivated chicken is on the menu, but the rice is everything."],
    quiz: { q: "Which country first approved cultivated chicken for sale, in 2020?", options: ["Singapore", "Japan", "France"], answer: 0, src: SRC.sfa },
    finale: true,
    sources: [SRC.sfa, SRC.nea],
  },
];

// Old stop ids from before the trail moved to profiled centres, so earlier stamps still count.
export const RENAMED_STOPS = { telokayer: "maxwell", glutton: "tiongbahru", tampineshub: "chinatown" };

export const stopById = (id) => STOPS.find((s) => s.id === id) ?? null;

// Shuffles the quiz options, remembering where the right answer went.
export function shuffledQuiz(stop, rand = Math.random) {
  const order = stop.quiz.options.map((_, i) => i).sort(() => rand() - 0.5);
  return { q: stop.quiz.q, options: order.map((i) => stop.quiz.options[i]), answer: order.indexOf(stop.quiz.answer), src: stop.quiz.src };
}

// A stop is open once every earlier stop has a stamp.
export function isOpen(stopId, stamps) {
  const i = STOPS.findIndex((s) => s.id === stopId);
  return i >= 0 && STOPS.slice(0, i).every((s) => stamps[s.id]);
}

export function nextStop(stamps) {
  return STOPS.find((s) => !stamps[s.id]) ?? null;
}

// Which era a real centre belongs to on the map, from its original completion year.
export function eraOfYear(year, status = "") {
  if (/under construction/i.test(status) || (year && year > 2026)) return "2065";
  if (year && year >= 1990) return "today";
  return "1980s";
}

export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
