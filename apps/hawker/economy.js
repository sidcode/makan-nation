// The money side, inspired by Hawkernomics (Hack for Public Good 2025): it is easy to think hawkers
// earn a lot per plate. Rent, wages, ingredients and utilities come out first.
//
// One round stands for one hour of trading. Monthly costs are spread over 26 trading days of 12 hours
// (Hawkernomics describes 12 to 14 hour days). Everything is in today's dollars, then scaled by the era's
// price index. These are game simplifications, labelled as such on the results screen.

export const HAWKERNOMICS = ["Hawkernomics, Hack for Public Good 2025", "https://www.hack.gov.sg/2025/hawkernomics/"];

const HOURS_A_MONTH = 26 * 12;

// Median monthly costs for a non-subsidised cooked food stall at a comparable NEA hawker centre, 2025.
const MONTHLY = { rent: 1450, conservancy: 200, tableCleaning: 520 };

// Part-time food or drink stall assistant, Food Services Progressive Wage Model, from 1 July 2026.
export const HELPER_HOURLY = 11.64;

// Our guesses, not sourced: gas, water and electricity for an hour, and what ingredients cost.
const UTILITIES_HOURLY = 2.0;

export const COST_SOURCES = [
  ["MSE: monthly costs of cooked food stalls (rent, S&CC, table cleaning)", "https://www.mse.gov.sg/latest-news/written-reply-to-parliamentary-question-on-heat-preparedness-by-ms-grace-fu--minister-for-sustainability-and-the-environment-/"],
  ["MOM: Food Services PWM wages from 1 July 2026", "https://www.mom.gov.sg/newsroom/press-releases/2026/0316-government-accepts-tcf-recommendations-on-food-services-pwm-2026-to-2028"],
  HAWKERNOMICS,
];

export const RENT_HOURLY = (MONTHLY.rent + MONTHLY.conservancy + MONTHLY.tableCleaning) / HOURS_A_MONTH;

export function wageFor(era) {
  return HELPER_HOURLY * era.price;
}

// Profit and loss for one round. `spent` is what the ingredients cost (already in era dollars).
export function profitAndLoss({ takings, tips = 0, spent, helpers, era, commission = 0 }) {
  const rent = RENT_HOURLY * era.price;
  const wages = helpers * wageFor(era);
  const utilities = UTILITIES_HOURLY * era.price;
  const lines = [
    { key: "takings", label: "Takings", value: takings },
    { key: "tips", label: "Speed bonus (game points: nobody tips at a hawker centre)", value: tips },
    { key: "ingredients", label: "Ingredients (including waste)", value: -spent },
    ...(commission > 0 ? [{ key: "delivery", label: "Delivery app commission (about 30% of each rider order)", value: -commission }] : []),
    { key: "rent", label: era.rentLabel, value: -rent },
    { key: "helpers", label: helpers ? `Hired help (${helpers} for the hour)` : "Hired help", value: -wages },
    { key: "utilities", label: "Gas, water, electricity", value: -utilities },
  ];
  const profit = lines.reduce((n, l) => n + l.value, 0);
  return { lines, profit };
}
