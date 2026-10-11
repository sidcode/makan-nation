// Street name helpers shared by the browser and the API.
// HDB data uses short forms ("ANG MO KIO AVE 6"), OneMap and people use long ones.

const LONG_TO_SHORT = [
  ["AVENUE", "AVE"],
  ["STREET", "ST"],
  ["ROAD", "RD"],
  ["DRIVE", "DR"],
  ["CRESCENT", "CRES"],
  ["CENTRAL", "CTRL"],
  ["NORTH", "NTH"],
  ["SOUTH", "STH"],
  ["UPPER", "UPP"],
  ["BUKIT", "BT"],
  ["JALAN", "JLN"],
  ["LORONG", "LOR"],
  ["TANJONG", "TG"],
  ["KAMPONG", "KG"],
  ["CLOSE", "CL"],
  ["PLACE", "PL"],
  ["PARK", "PK"],
  ["COMMONWEALTH", "C'WEALTH"],
  ["MARKET", "MKT"],
  ["TERRACE", "TER"],
  ["HEIGHTS", "HTS"],
  ["GARDENS", "GDNS"],
  ["GARDEN", "GDN"],
  ["COURT", "CT"],
  ["SAINT", "ST."],
];

const RULES = LONG_TO_SHORT.map(([long, short]) => [new RegExp(`\\b${long}\\b`, "g"), short]);

export function normStreet(s) {
  let out = String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9' .]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [re, short] of RULES) out = out.replace(re, short);
  return out;
}

export function normBlk(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/^(BLK|BLOCK)\s*/, "")
    .replace(/\s+/g, "");
}

export function tokens(s) {
  return normStreet(s).split(" ").filter(Boolean);
}

// Every query token must be the start of some street token.
export function streetMatches(street, queryTokens) {
  if (!queryTokens.length) return true;
  const st = street.split(" ");
  return queryTokens.every((q) => st.some((t) => t.startsWith(q)));
}

export const TOWNS = {
  AMK: "Ang Mo Kio",
  BB: "Bukit Batok",
  BD: "Bedok",
  BH: "Bishan",
  BM: "Bukit Merah",
  BP: "Bukit Panjang",
  BT: "Bukit Timah",
  CCK: "Choa Chu Kang",
  CL: "Clementi",
  CT: "Central Area",
  GL: "Geylang",
  HG: "Hougang",
  JE: "Jurong East",
  JW: "Jurong West",
  KWN: "Kallang / Whampoa",
  MP: "Marine Parade",
  PG: "Punggol",
  PRC: "Pasir Ris",
  QT: "Queenstown",
  SB: "Sembawang",
  SGN: "Serangoon",
  SK: "Sengkang",
  TAP: "Tampines",
  TG: "Tengah",
  TP: "Toa Payoh",
  WL: "Woodlands",
  YS: "Yishun",
};

export const blockKey = (blk, street) => `${blk}|${street}`;
