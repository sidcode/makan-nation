// Four times to cook in. An era changes the look, the music, the prices and a few rules of the kitchen.
// The kitchens and recipes stay the same across eras; which dish was sold first and where is left neutral.
//
// Prices and costs scale with SingStat's annual food inflation (all items "Food", compounded from 1962 to
// 2024 using the data.gov.sg CPI series): 2024 food prices were about 5.5 times 1961's and about 2.05 times
// 1985's. 2065 is a projection at the 1985 to 2024 average of roughly 1.9% a year. A game simplification.

export const PRICE_SOURCE = ["SingStat CPI, annual change for Food (data.gov.sg)", "https://data.gov.sg/datasets/d_8b007d0a630351e2375d5d574e108058/view"];

export const ERAS = [
  {
    id: "1950s",
    name: "Five-foot way",
    years: "1950s to 60s",
    setting: "Street hawkers under the shophouses, cooking by kerosene lamp.",
    price: 0.18,
    priceNote: "About 1961 prices",
    rentLabel: "Licence and pitch",
    returnLabel: "PLATES",
    boxLabel: "PAPER WRAP",
    washTime: 2.0, // washing up in a pail takes longer
    robotSink: false,
    chickenLabel: "CHICKEN",
    look: {
      sky: "#3a2a3e",
      ground: "#5b524a",
      hall: "#6e655a",
      floor: "#b9a382",
      hemiSky: "#ffd9a0",
      hemiGround: "#4a3a30",
      hemi: 1.2,
      sun: "#ffb46a",
      sunPower: 1.5,
      counterSide: "#9a6a3a",
      counterTop: "#d9c3a0",
      shirts: ["#f4efe2", "#d8c9a8", "#8a9a6b", "#b3864f", "#f2e6c8", "#7a8fa0"],
      tables: "wood",
    },
    card: [
      "Before hawker centres, hawkers cooked on the street and along the five-foot ways, the covered walkways in front of shophouses. Customers sat on simple stools at low tables.",
      "Many used kerosene pressure lamps in the 1960s. A lit lamp also told customers the stall was open at night.",
      "In 1950 a Hawkers Inquiry Commission argued that hawkers should not be viewed as a public nuisance.",
    ],
    twist: "Washing up happens in a pail, so it takes longer.",
    sources: [
      ["Roots.gov.sg: Hawker culture, our material heritage", "https://www.roots.gov.sg/en/stories-landing/stories/Hawker-Culture"],
      ["BiblioAsia: from public nuisance to national icons", "https://biblioasia.nlb.gov.sg/vol-9/issue-3/oct-dec-2013/singapore-hawkers-national-icons"],
    ],
  },
  {
    id: "1980s",
    name: "First hawker centres",
    years: "1970s to 80s",
    setting: "A new hawker centre at the foot of the HDB blocks, fans turning overhead.",
    price: 0.49,
    priceNote: "About 1985 prices",
    rentLabel: "Rent and charges",
    returnLabel: "PLATES",
    boxLabel: "TAKEAWAY",
    washTime: 1.3,
    robotSink: false,
    chickenLabel: "CHICKEN",
    look: {
      sky: "#cfe3d8",
      ground: "#cdbf9f",
      hall: "#c8c2b2",
      floor: "#d8c29c",
      hemiSky: "#fff4e0",
      hemiGround: "#b89a72",
      hemi: 1.5,
      sun: "#fff1d6",
      sunPower: 2.1,
      counterSide: "#6fa58a",
      counterTop: "#f6f2ea",
      shirts: ["#e0533a", "#4a7fb5", "#f2b632", "#8a6fb5", "#5b8c85", "#f4efe2"],
      tables: "marble",
    },
    card: [
      "From 1971 the government built hawker centres with clean water, electricity and piped gas, and moved street hawkers in.",
      "By the end of 1986 there were 113 hawker centres. The last 80 street hawkers, at China Square and Haw Par Villa, moved in that year.",
      "Rediffusion cable radio sets were a common sight in coffee shops and homes in the 1960s and 70s.",
    ],
    twist: "Running water at last. Washing up is quicker.",
    sources: [
      ["Curiocity (NLB): hawkers after independence", "https://curiocity.nlb.gov.sg/digital-stories/our-hawkers-through-time/hawkers-after-independence/"],
      ["BiblioAsia: from public nuisance to national icons", "https://biblioasia.nlb.gov.sg/vol-9/issue-3/oct-dec-2013/singapore-hawkers-national-icons"],
      ["Wikipedia: Rediffusion Singapore", "https://en.wikipedia.org/wiki/Rediffusion_Singapore"],
    ],
  },
  {
    id: "today",
    name: "Today",
    years: "2020s",
    setting: "Tray return, queue numbers and an SGQR sticker on every stall.",
    price: 1,
    priceNote: "Prices of the 2020s",
    rentLabel: "Rent and charges",
    returnLabel: "TRAY RETURN",
    boxLabel: "TAKEAWAY BOX",
    washTime: 1.3,
    robotSink: false,
    chickenLabel: "CHICKEN",
    look: {
      sky: "#f3e3c3",
      ground: "#e6d2ac",
      hall: "#cfc7b8",
      floor: "#d8c29c",
      hemiSky: "#fff4e0",
      hemiGround: "#b89a72",
      hemi: 1.5,
      sun: "#fff1d6",
      sunPower: 2.2,
      counterSide: "#f4ead6",
      counterTop: "#ffffff",
      shirts: ["#4a7fb5", "#d9708a", "#8a9a6b", "#f2b632", "#7a5c99", "#5b8c85"],
      tables: "marble",
    },
    card: [
      "Diners have to return their trays and crockery. NEA started enforcing this at hawker centres on 1 September 2021.",
      "Since June 2020 the Hawkers Go Digital programme has helped stallholders take payment with a single SGQR code.",
      "In 2020 Hawker Culture in Singapore was inscribed on UNESCO's Representative List of the Intangible Cultural Heritage of Humanity.",
    ],
    twist: "Customers bring their own trays back, so dirty plates arrive at tray return.",
    sources: [
      ["NEA: tray and crockery return", "https://www.nea.gov.sg/media/news/news/index/mandatory-for-diners-to-return-dirty-trays-crockery-and-clean-table-litter-at-hawker-centres-coffeeshops-and-food-courts"],
      ["IMDA: Hawkers Go Digital", "https://www.imda.gov.sg/Content-and-News/Press-Releases-and-Speeches/Press-Releases/2020/Good-Progress-for-Hawkers-Go-Digital-Programme"],
      ["UNESCO: the inscribed element", "https://ich.unesco.org/en/RL/hawker-culture-in-singapore-community-dining-and-culinary-practices-in-a-multicultural-urban-context-01568"],
    ],
  },
  {
    id: "2065",
    name: "SG100",
    years: "2065",
    setting: "Our guess at the hawker centre for Singapore's hundredth birthday.",
    price: 2.1,
    priceNote: "A projection, our guess",
    rentLabel: "Rent and charges",
    returnLabel: "RETURN BOT",
    boxLabel: "TIFFIN",
    washTime: 1.3,
    robotSink: true,
    chickenLabel: "CULTIVATED CHICKEN",
    look: {
      sky: "#d7eef0",
      ground: "#cfe4dd",
      hall: "#e3ece6",
      floor: "#e6dccb",
      hemiSky: "#f0fbff",
      hemiGround: "#9ab8b0",
      hemi: 1.6,
      sun: "#fffaf0",
      sunPower: 2.0,
      counterSide: "#e8f1ee",
      counterTop: "#fbfdfc",
      shirts: ["#7cc4e6", "#f2a6c8", "#b8e0a8", "#ffd27a", "#c4b5f0", "#ffffff"],
      tables: "marble",
    },
    card: [
      "Singapore turns 100 in 2065.",
      "On 2 December 2020 the Singapore Food Agency approved cultivated chicken, grown from animal cells, for sale. It was the first approval of its kind in the world.",
      "The rest is our guess: a solar canopy, a dishwashing robot, and the same chicken rice.",
    ],
    twist: "A robot at the sink washes plates by itself, slowly. You still carry them over.",
    sources: [["Food Safety News: Singapore approves lab grown chicken", "https://www.foodsafetynews.com/2020/12/eat-just-inc-gets-approval-in-singapore-for-lab-grown-chicken/"]],
  },
];

export function eraById(id) {
  return ERAS.find((e) => e.id === id) ?? ERAS[2];
}

// Prices on screen: 2 decimals, the way hawkers price in cents.
export function money(n) {
  const v = Math.round(n * 100) / 100;
  return `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}`;
}
