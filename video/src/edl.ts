// The edit: every shot of the Makan Nation demo, in order. Sections on a record are measured in beats of that
// record (beats.json); the rest in seconds. `from` is where the shot starts in its clip (public/clips).
// Everything the viewer reads is in here; keep it plain (no dashes as clause breaks, no hype words).
import beats from "./beats.json";
import type { CaptionSpec, EndLine } from "./parts";
import { C } from "./parts";

export type Trans = "cut" | "fade" | "slide" | "whip" | "wipe" | "zoom" | "tune";
export type Shot = {
  clip?: string;
  from?: number;
  beats?: number;
  dur?: number;
  in?: Trans;
  inLen?: number;
  caption?: CaptionSpec;
  capAt?: number;
  capLen?: number;
  stamp?: { text: string; label?: string };
  big?: string;
  zoom?: [number, number];
  focus?: [number, number];
  vol?: number;
  speed?: number;
  duck?: boolean;
  kind?: "title" | "end";
  tuneFrom?: number;
  tuneTo?: number;
};
export type Section = { name: string; track?: "singapore-1919" | "rasa-sayang-1929"; beat?: number; musicVol?: number; shots: Shot[] };

// The beat of a record nearest a moment in it.
const near = (track: keyof typeof beats, s: number) => beats[track].beats.reduce((best, t, i, all) => (Math.abs(t - s) < Math.abs(all[best] - s) ? i : best), 0);

const FOX = "singapore-1919" as const;
const KRONCONG = "rasa-sayang-1929" as const;
const cap = (kicker: string, text: string, sub?: string, color: string = C.now): CaptionSpec => ({ kicker, text, sub, color });

const COOK = C.now;
const PAST = C.past;
const LATER = C.later;

// Beats in each section; the foxtrot runs on from section to section.
const S2 = near(FOX, 6.1) + 20;

export const SECTIONS: Section[] = [
  {
    name: "Radio on",
    shots: [{ clip: "r-dial", from: 1.0, dur: 3.2, vol: 0.9, zoom: [1.08, 1.0] }],
  },
  {
    name: "Opening",
    track: FOX,
    beat: near(FOX, 6.1),
    shots: [
      { clip: "w-maxwell", from: 4, beats: 4, in: "tune", big: "Singapore queues for its food.", vol: 0.5, zoom: [1.0, 1.08] },
      { clip: "k-coop", from: 6, beats: 4, in: "whip", big: "Argues over the best chicken rice.", vol: 0.5 },
      { clip: "w-maxwell", from: 14, beats: 4, in: "whip", big: "Saves a table with a packet of tissue.", vol: 0.5 },
      { clip: "k-laupasat", from: 2, beats: 8, in: "zoom", kind: "title" },
    ],
  },
  {
    name: "Cook",
    track: FOX,
    beat: S2,
    shots: [
      { clip: "k-coop", from: 3, beats: 8, in: "slide", caption: cap("Cook", "Two chefs, one keyboard", "Or up to four friends on their phones", COOK) },
      { clip: "k-coop", from: 14, beats: 6, in: "zoom", vol: 0.8, duck: true, zoom: [1.15, 1.25], focus: [10, 10], caption: cap("Orders", "Customers order in six languages", "Malay, Mandarin, Tamil, Hokkien, Cantonese and Singlish", COOK) },
      { clip: "k-helpers", from: 5, beats: 6, in: "whip", caption: cap("Hired help", "Hire helpers, pay the rent", "Each helper does one job; wages come out of the takings", COOK) },
      { clip: "k-results", from: 43, beats: 6, in: "slide", caption: cap("The books", "Every round ends with a profit and loss", "The cost lens is inspired by Hawkernomics", COOK) },
    ],
  },
  {
    name: "Famous centres",
    track: FOX,
    beat: S2 + 26,
    shots: [
      { clip: "k-laupasat", from: 4, beats: 3, in: "whip", caption: cap("19 famous centres", "Lau Pa Sat", undefined, COOK), zoom: [1.02, 1.1] },
      { clip: "k-newton", from: 4, beats: 3, in: "whip", caption: cap("19 famous centres", "Newton", undefined, COOK), zoom: [1.02, 1.1] },
      { clip: "k-tiongbahru", from: 4, beats: 3, in: "whip", caption: cap("19 famous centres", "Tiong Bahru", undefined, COOK), zoom: [1.02, 1.1] },
      { clip: "k-tekka", from: 4, beats: 3, in: "whip", caption: cap("19 famous centres", "Tekka", undefined, COOK), zoom: [1.02, 1.1] },
    ],
  },
  {
    name: "Then, now, later",
    track: FOX,
    beat: S2 + 38,
    shots: [
      // Its stall radio was playing a 1950 record whose song is still in copyright, so the kitchen stays quiet.
      { clip: "k-1950s", from: 1.5, beats: 7, in: "tune", vol: 0.06, stamp: { text: "1950s", label: "Street stalls" }, caption: cap("From the archives", "Every round opens with a sourced fact", "From NLB, NHB, NEA and the newspapers of the day", PAST), capAt: 1.2 },
      { clip: "k-helpers", from: 12, beats: 5, in: "tune", stamp: { text: "1980s", label: "The first hawker centres" } },
      { clip: "k-coop", from: 20, beats: 5, in: "tune", stamp: { text: "TODAY", label: "Delivery riders at the hatch" } },
      { clip: "k-2065", from: 4, beats: 6, in: "tune", stamp: { text: "2065", label: "Labelled guesses" } },
    ],
  },
  {
    name: "Hawker Passport",
    track: FOX,
    beat: S2 + 61,
    shots: [
      { clip: "p-map", from: 1, beats: 10, in: "slide", caption: cap("Hawker Passport", "Nine stops from the 1950s to 2065", "On a map of NEA's 129 hawker centres", C.teal) },
      { clip: "p-stop", from: 1, beats: 10, in: "whip", caption: cap("Hawker Passport", "A mentor in every era", "And a question with a source before every stamp", C.teal) },
      { clip: "c-manager", from: 4, beats: 8, in: "whip", caption: cap("Advanced", "Run a real hawker centre for 14 days", "Menus, prices, rent, hygiene and finding successors", C.teal) },
      { clip: "book", from: 3, beats: 6, in: "whip", caption: cap("Recipe book", "Then, now and later for 48 dishes", "Photos, prices and where each fact comes from", C.teal) },
    ],
  },
  {
    name: "Looks",
    track: FOX,
    beat: S2 + 95,
    shots: [
      { clip: "k-look-toon", from: 3, beats: 4, in: "whip", caption: cap("Look", "Cartoon", undefined, COOK), capLen: 2.2 },
      { clip: "k-look-soft", from: 3, beats: 4, in: "wipe", caption: cap("Look", "Soft", undefined, COOK), capLen: 2.2 },
      { clip: "k-look-real", from: 3, beats: 4, in: "wipe", caption: cap("Look", "Real", undefined, COOK), capLen: 2.2 },
      { clip: "k-gfx-low", from: 3, beats: 4, in: "wipe", caption: cap("Graphics", "Low, for older phones", undefined, COOK), capLen: 2.2 },
    ],
  },
  {
    name: "Makan",
    track: KRONCONG,
    beat: near(KRONCONG, 1.0),
    shots: [
      { clip: "w-picker", from: 1, beats: 8, in: "tune", vol: 0.2, caption: cap("Makan at a hawker centre", "Walk any of NEA's 129 centres", "Real building outlines from OpenStreetMap", C.green) },
      { clip: "w-picker", from: 12, beats: 6, in: "whip", vol: 0.2, caption: cap("Makan at a hawker centre", "See the real place first", "Street level photos from KartaView", C.green) },
      { clip: "w-maxwell", from: 10, beats: 8, in: "zoom", caption: cap("Lunch at Maxwell", "Chope a table with tissue", undefined, C.green) },
      { clip: "w-maxwell", from: 30, beats: 6, in: "whip", caption: cap("Lunch at Maxwell", "Queue at the famous stall", undefined, C.green) },
      { clip: "w-maxwell", from: 45, beats: 8, in: "whip", duck: true, vol: 0.7, caption: cap("Lunch at Maxwell", "Order the drink in kopi code", "Real dishes with dated stall prices", C.green) },
      { clip: "w-maxwell", from: 70, beats: 6, in: "whip", caption: cap("Lunch at Maxwell", "Makan", undefined, C.green) },
      { clip: "w-maxwell", from: 82, beats: 6, in: "whip", caption: cap("Lunch at Maxwell", "Return your tray", undefined, C.green) },
      { clip: "w-street-1950s", from: 4, beats: 6, in: "tune", stamp: { text: "1950s", label: "Pushcarts on the street" } },
      { clip: "w-chomp-1980s", from: 4, beats: 6, in: "tune", stamp: { text: "1980s", label: "Nobody chopes yet" } },
      { clip: "w-newton-eyes", from: 4, beats: 6, in: "tune", stamp: { text: "TODAY", label: "Tissue, umbrellas, name cards" } },
      { clip: "w-oar-2065", from: 4, beats: 6, in: "tune", stamp: { text: "2065", label: "Labelled guesses" } },
      { clip: "w-albert-hdb", from: 3, beats: 6, in: "whip", caption: cap("HDB estates", "82 of the centres are HDB blocks", "Real storeys, block numbers and completion years", C.green) },
      { clip: "w-tekka-classic", from: 3, beats: 5, in: "whip", caption: cap("People", "Classic or lifelike", undefined, C.green) },
    ],
  },
  {
    name: "Kopi Compiler",
    track: KRONCONG,
    beat: near(KRONCONG, 1.0) + 83,
    shots: [
      { clip: "kopi-type", from: 0.5, beats: 12, in: "slide", vol: 1, duck: true, caption: cap("Kopi Compiler", "Kopitiam orders as a programming language", "Every word with its meaning and the language it came from", C.past) },
      { clip: "kopi-build", from: 1, beats: 8, in: "whip", vol: 1, duck: true, caption: cap("Kopi Compiler", "Or build the drink and read the code", undefined, C.past) },
      { clip: "kopi-rush", from: 2, beats: 8, in: "whip", vol: 1, duck: true, caption: cap("Uncle's Rush", "Sixty seconds of orders", undefined, C.past) },
      { clip: "kopi-auntie", from: 2, beats: 6, in: "whip", vol: 1, duck: true, caption: cap("Uncle's Rush", "Read out by the uncle or the auntie", undefined, C.past) },
      { clip: "kopi-teach", from: 1, beats: 8, in: "whip", caption: cap("Kopi Compiler", "Teach uncle a new word", undefined, C.past) },
    ],
  },
  {
    name: "Block Birthday",
    track: KRONCONG,
    beat: near(KRONCONG, 1.0) + 125,
    shots: [
      { clip: "block", from: 0.5, beats: 10, in: "slide", vol: 0.3, caption: cap("Block Birthday", "Every HDB block has a birthday", "Type a postal code; OneMap finds the block", C.later) },
      { clip: "block", from: 9, beats: 8, in: "whip", vol: 0.6, caption: cap("Block Birthday", "Blow out its candles", "With the songs and moments of the year it was built", C.later) },
      { clip: "block", from: 20, beats: 8, in: "whip", vol: 0.3, caption: cap("Block Birthday", "Leave a note for its 99th", "And walk to the hawker centre downstairs", C.later) },
    ],
  },
  {
    name: "Time Capsule Radio",
    shots: [
      { clip: "r-dial", from: 6, dur: 7, in: "tune", vol: 1, caption: cap("Time Capsule Radio", "One dial from 1905 to 2065", "78s, Rediffusion dramas, live FM and songs sealed for later", C.past) },
      { clip: "r-seal", from: 1, dur: 5, in: "whip", vol: 0, caption: cap("Time Capsule Radio", "Seal a song for 2065", "The music in this film comes from the radio's 78s", C.past) },
    ],
  },
  {
    name: "End",
    track: FOX,
    beat: near(FOX, 212.5),
    musicVol: 0.9,
    shots: [{ clip: "lobby", from: 2, beats: 20, in: "fade", inLen: 0.6, kind: "end" }],
  },
];

export const APPS: EndLine[] = [
  { name: "Makan Nation", color: C.now, line: "a hawker game across four eras" },
  { name: "Time Capsule Radio", color: C.past, line: "one dial from 1905 to 2065" },
  { name: "Kopi Compiler", color: "#7a5a3a", line: "kopitiam orders as code" },
  { name: "Block Birthday", color: C.later, line: "every HDB block has a birthday" },
  { name: "Musication", color: C.teal, line: "how music rhymes across cultures" },
];

export const CREDITS = [
  "Music: Singapore, Jaudas' Society Orchestra (1919), and a Rasa Sayang medley, Krontjong Orchest Eurasia (1929), from the Internet Archive's 78 collections.",
  "Data: NEA, URA, HDB and OneMap (Singapore Open Data Licence), OpenStreetMap (ODbL), KartaView (CC BY-SA). Voices are synthetic, made with OmniVoice and A*STAR's MERaLiON.",
  "Filmed from the game itself, played by its own guide. Common Ground Makeathon, Singapore, 2026.",
];
