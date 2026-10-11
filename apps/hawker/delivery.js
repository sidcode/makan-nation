// Delivery riders who collect from your stall. GrabFood (green) and foodpanda (pink) are the two apps still
// delivering in Singapore in October 2026: Deliveroo left on 4 March 2026, and Uber Eats, honestbee and
// AirAsia Food went before it. Riders wait by the counter for the order, packed to go.
// Commission: platforms took 25 to 32% of an order in 2020, Grab said up to 30%. No reliable figure for
// 2025 or 2026 was found, so the game uses 30%. Riders only come in today's era and in 2065 (a guess):
// we found no delivery from hawker centres in the 1950s or the 1980s.

export const APPS = [
  { id: "grab", name: "GrabFood", colour: "#2e9e55" },
  { id: "panda", name: "foodpanda", colour: "#d6337a" },
];

// Grab had about 63% of the market and foodpanda about 28% in 2024 (Momentum Works, via the NST).
export const GRAB_SHARE = 0.69;
export const COMMISSION = 0.3;
// The share of orders that come by app, per era. A game figure.
export const RIDER_SHARE = { today: 0.18, 2065: 0.22 };

export const appOf = (rd) => (Number.isInteger(rd) && rd >= 0 ? APPS[rd] ?? null : null);

export const SOURCES = [
  ["Eatbook: Deliveroo leaves Singapore, March 2026", "https://eatbook.sg/deliveroo-closure/"],
  ["MTI, May 2020: support for delivery commission", "https://www.meti.gov.sg/newsroom/oral-reply-to-pq-on-partnership-with-3rd-party-food-delivery-companies/"],
  ["Marketing-Interactive, April 2020: Grab on its commission", "https://www.marketing-interactive.com/did-grab-sgs-social-ad-on-commission-rates-help-or-hamper-its-brand-image"],
  ["NST, April 2024: market shares", "https://www.nst.com.my/amp/business/corporate/2024/04/1033064/singapore-competition-watchdog-looked-potential-grab-delivery"],
];
