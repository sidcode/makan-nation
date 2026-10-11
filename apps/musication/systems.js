// Tunes are transcribed from the scores on their Wikipedia pages.
// Each note is [semitones above the tune's home note, length in beats]; null is a rest.
// Every tune here only uses the five notes do re mi sol la, so it can move into any five-note home.
// `phrase` is how many beats the first line lasts, for the "first line in A, then B" button.

export const TUNES = [
  {
    id: "molihua",
    name: "Mo Li Hua",
    native: "茉莉花",
    from: "China",
    blurb: "Jasmine Flower, a Jiangnan folk song first written down in Western notation in 1793.",
    source: "https://en.wikipedia.org/wiki/Mo_Li_Hua",
    homeHz: 261.63, // C4
    bpm: 106,
    phrase: 8,
    notes: [[4,1],[4,0.5],[7,0.5],[9,0.5],[12,0.5],[12,0.5],[9,0.5],[7,1],[7,0.5],[9,0.5],[7,1],[null,1],[4,1],[4,0.5],[7,0.5],[9,0.5],[12,0.5],[12,0.5],[9,0.5],[7,1],[7,0.5],[9,0.5],[7,1],[null,1],[7,1],[7,1],[7,1],[4,0.5],[7,0.5],[9,1],[9,1],[7,2],[4,1],[2,0.5],[4,0.5],[7,1],[4,0.5],[2,0.5],[0,1],[0,0.5],[2,0.5],[0,2],[4,0.5],[2,0.5],[0,0.5],[4,0.5],[2,1.5],[4,0.5],[7,1],[9,0.5],[12,0.5],[7,2],[2,1],[4,0.5],[7,0.5],[2,0.5],[4,0.5],[0,0.5],[-3,0.5],[-5,2],[-3,1],[0,1],[2,1.5],[4,0.5],[0,0.5],[2,0.5],[0,0.5],[-3,0.5],[-5,2],[null,2]],
  },
  {
    id: "arirang",
    name: "Arirang",
    native: "아리랑",
    from: "Korea",
    blurb: "A Korean folk song with thousands of variations. This is Bonjo Arirang, the standard version from Seoul, in a swaying nine-eight.",
    source: "https://en.wikipedia.org/wiki/Arirang",
    homeHz: 349.23, // F4
    bpm: 140,
    phrase: 9,
    notes: [[-5,2.5],[-3,0.5],[-5,1],[-3,0.5],[0,2.5],[2,0.5],[0,1],[2,0.5],[4,1.5],[2,0.5],[4,0.5],[2,0.5],[0,1],[-3,0.5],[-5,2.5],[-3,0.5],[-5,0.5],[-3,0.5],[null,0.5],[0,2.5],[2,0.5],[0,1],[2,0.5],[4,1],[2,0.5],[0,1],[-3,0.5],[-5,1],[-3,0.5],[0,2.5],[2,0.5],[0,1.5],[0,3],[null,1.5],[7,3],[7,1.5],[7,1.5],[4,1.5],[2,1.5],[4,1.5],[2,1],[4,0.5],[0,1],[-3,0.5],[-5,2.5],[-3,0.5],[-5,0.5],[-3,0.5],[null,0.5],[0,2.5],[2,0.5],[0,1],[2,0.5],[4,1],[2,0.5],[0,1],[-3,0.5],[-5,1],[-3,0.5],[0,2.5],[2,0.5],[0,1.5],[0,3],[null,1.5]],
  },
  {
    id: "auld",
    name: "Auld Lang Syne",
    native: "Auld Lang Syne",
    from: "Scotland",
    blurb: "A poem Robert Burns wrote in 1788, set in 1799 to a traditional pentatonic tune. Sung at a lot of midnights.",
    source: "https://en.wikipedia.org/wiki/Auld_Lang_Syne",
    homeHz: 349.23, // F4
    bpm: 84,
    phrase: 9,
    notes: [[-5,1],[0,1.5],[0,0.5],[0,1],[4,1],[2,1.5],[0,0.5],[2,1],[4,1],[0,1.5],[0,0.5],[4,1],[7,1],[9,3],[9,1],[7,1.5],[4,0.5],[4,1],[0,1],[2,1.5],[0,0.5],[2,1],[4,1],[0,1.5],[-3,0.5],[-3,1],[-5,1],[0,3],[9,1],[7,1.5],[4,0.5],[4,1],[0,1],[2,1.5],[0,0.5],[2,1],[9,1],[7,1.5],[4,0.5],[4,1],[7,1],[9,3],[9,1],[7,1.5],[4,0.5],[4,1],[0,1],[2,1.5],[0,0.5],[2,1],[4,1],[0,1.5],[-3,0.5],[-3,1],[-5,1],[0,3]],
  },
  {
    id: "grace",
    name: "Amazing Grace",
    native: "Amazing Grace",
    from: "USA",
    blurb: "John Newton's hymn from 1779, sung since 1835 to an American folk tune called New Britain. That tune never leaves the five notes either.",
    source: "https://en.wikipedia.org/wiki/Amazing_Grace",
    homeHz: 392.0, // G4
    bpm: 66,
    phrase: 12,
    notes: [[-5,1],[0,2],[4,0.5],[0,0.5],[4,2],[2,1],[0,2],[-3,1],[-5,2],[-5,1],[0,2],[4,0.5],[0,0.5],[4,2],[2,1],[7,2],[4,1],[7,1.5],[4,0.5],[7,0.5],[4,0.5],[0,2],[-5,1],[-3,1.5],[0,0.5],[0,0.5],[-3,0.5],[-5,2],[-5,1],[0,2],[4,0.5],[0,0.5],[4,2],[2,1],[0,3]],
  },
  {
    id: "akatombo",
    name: "Akatombo",
    native: "赤とんぼ",
    from: "Japan",
    blurb: "Red Dragonfly, a famous Japanese children's song composed by Kōsaku Yamada in 1927 to a 1921 poem by Rofū Miki. Same five notes as Auld Lang Syne.",
    source: "https://en.wikipedia.org/wiki/Akatombo",
    homeHz: 311.13, // E♭4
    bpm: 60,
    phrase: 11,
    notes: [[-5,0.5],[0,0.5],[0,1.5],[2,0.5],[4,0.5],[7,0.5],[12,0.5],[9,0.5],[7,1],[9,0.5],[0,0.5],[0,1],[2,1],[4,2],[null,1],[4,0.5],[9,0.5],[7,1.5],[9,0.5],[12,0.5],[9,0.5],[7,0.5],[9,0.5],[7,0.5],[4,0.5],[7,0.5],[4,0.5],[0,0.5],[4,0.5],[2,0.5],[0,0.5],[0,2],[null,1]],
  },
];

// Pentatonic step for each semitone of do re mi sol la.
const STEP_OF = { 0: 0, 2: 1, 4: 2, 7: 3, 9: 4 };

// Turns semitones-above-home into a five-note index (do=0, re=1, mi=2, sol=3, la=4, next do=5).
export function stepIndex(semis) {
  const octave = Math.floor(semis / 12);
  const step = STEP_OF[((semis % 12) + 12) % 12];
  if (step === undefined) throw new Error(`Not a pentatonic note: ${semis}`);
  return octave * 5 + step;
}

// Where a five-note index lands, in cents above home, for a given system.
export function centsFor(system, index) {
  const octave = Math.floor(index / 5);
  const slot = ((index % 5) + 5) % 5;
  return system.slots[slot] + 1200 * octave;
}

// Cents are hundredths of a piano semitone. `scale` is the full set of notes; `slots` are the
// five the tune lands on (do re mi sol la mapped into that system).
export const SYSTEMS = [
  {
    id: "major",
    name: "Major scale",
    native: "do re mi",
    from: "Europe",
    scale: [0, 200, 400, 500, 700, 900, 1100],
    slots: [0, 200, 400, 700, 900],
    voice: "pluck",
    voiceName: "Plucked strings",
    about: "The do re mi most of us met in school. Seven notes, and our tunes only need five of them.",
    links: [["Major scale", "https://en.wikipedia.org/wiki/Major_scale"]],
  },
  {
    id: "gong",
    name: "Gong mode",
    native: "宮調",
    from: "China",
    scale: [0, 200, 400, 700, 900],
    slots: [0, 200, 400, 700, 900],
    voice: "zither",
    voiceName: "Zither, guzheng-ish",
    about: "The first of the five Chinese pentatonic modes, gōng, on C: C D E G A. Do re mi sol la and nothing in between. Start the same five notes from re, mi, sol or la and you get the other four modes.",
    links: [["Pentatonic scale", "https://en.wikipedia.org/wiki/Pentatonic_scale"]],
  },
  {
    id: "mohanam",
    name: "Mohanam",
    native: "மோகனம்",
    from: "South India",
    scale: [0, 200, 400, 700, 900],
    slots: [0, 200, 400, 700, 900],
    voice: "veena",
    voiceName: "Veena-ish, with a drone",
    drone: true,
    about: "A Carnatic raga built from S R2 G3 P D2. Same five pitches as the major pentatonic, here over a tanpura-style drone.",
    links: [["Mohanam", "https://en.wikipedia.org/wiki/Mohanam"], ["Tanpura", "https://en.wikipedia.org/wiki/Tanpura"]],
  },
  {
    id: "bhupali",
    name: "Bhupali",
    native: "भूपाली",
    from: "North India",
    scale: [0, 200, 400, 700, 900],
    slots: [0, 200, 400, 700, 900],
    voice: "flute",
    voiceName: "Bamboo flute, with a drone",
    drone: true,
    about: "The Hindustani raga that matches Mohanam note for note: Sa Re Ga Pa Dha.",
    links: [["Mohanam", "https://en.wikipedia.org/wiki/Mohanam"], ["Bhupali", "https://en.wikipedia.org/wiki/Bhoopali"]],
  },
  {
    id: "tizita",
    name: "Tizita",
    native: "ትዝታ",
    from: "Ethiopia",
    scale: [0, 200, 400, 700, 900],
    slots: [0, 200, 400, 700, 900],
    voice: "krar",
    voiceName: "Krar-ish lyre",
    approx: true,
    about: "One of the four main Ethiopian qenet. Tizita means memory or longing, and its major form sits on C D E G A, the same five as gong and Mohanam. On traditional instruments the pitches drift from piano tuning.",
    links: [["Tizita", "https://en.wikipedia.org/wiki/Tezeta"], ["Qenet", "https://en.wikipedia.org/wiki/Qenet"], ["Ethiopian scales", "https://chromatone.center/theory/scales/ethiopian/"], ["Music of Ethiopia", "https://en.wikipedia.org/wiki/Music_of_Ethiopia"]],
  },
  {
    id: "minorpent",
    name: "Minor pentatonic",
    native: "la do re mi sol",
    from: "Blues and pop",
    scale: [0, 300, 500, 700, 1000],
    slots: [0, 300, 500, 700, 1000],
    voice: "guitar",
    voiceName: "Electric-ish guitar",
    about: "The major pentatonic started from la. Blues guitar lives here, and so do a lot of Andean and Hungarian folk tunes. China's yǔ mode and South India's Shuddha Dhanyasi share the shape.",
    links: [["Pentatonic scale", "https://en.wikipedia.org/wiki/Pentatonic_scale"], ["Shuddha Dhanyasi", "https://en.wikipedia.org/wiki/Shuddha_Dhanyasi"]],
  },
  {
    id: "madhyamavati",
    name: "Madhyamavati",
    native: "मध्यमावती",
    from: "South India",
    scale: [0, 200, 500, 700, 1000],
    slots: [0, 200, 500, 700, 1000],
    voice: "veena",
    voiceName: "Veena-ish, with a drone",
    drone: true,
    about: "S R2 M1 P N2, or C D F G B♭. Move Mohanam's home note and you land here; Carnatic musicians call that trick graha bhedam. China's shāng mode has the same shape.",
    links: [["Madhyamavati", "https://en.wikipedia.org/wiki/Madhyamavati"], ["Chinese modes", "https://en.wikipedia.org/wiki/Pentatonic_scale"]],
  },
  {
    id: "malkauns",
    name: "Malkauns",
    native: "मालकौंस",
    from: "North India",
    scale: [0, 300, 500, 800, 1000],
    slots: [0, 300, 500, 800, 1000],
    voice: "flute",
    voiceName: "Bamboo flute, with a drone",
    drone: true,
    about: "Sa ga ma dha ni, with flat ga, dha and ni: C E♭ F A♭ B♭. South India knows the same notes as Hindolam, and China's jué mode has the same shape.",
    links: [["Hindolam and Malkauns", "https://en.wikipedia.org/wiki/Hindolam"], ["Chinese modes", "https://en.wikipedia.org/wiki/Pentatonic_scale"]],
  },
  {
    id: "yo",
    name: "Yo scale",
    native: "陽音階",
    from: "Japan",
    scale: [0, 200, 500, 700, 900],
    slots: [0, 200, 500, 700, 900],
    voice: "shaku",
    voiceName: "Breathy flute",
    about: "A Japanese pentatonic used in folk songs and early popular songs, with steps of 2, 3, 2, 2 and 3 semitones. Swap mi for fa and you are there. China's zhǐ mode and the raga Shuddha Saveri (Durga in the north) share the shape.",
    links: [["Yo scale", "https://en.wikipedia.org/wiki/Yo_scale"], ["Shuddha Saveri", "https://en.wikipedia.org/wiki/Shuddha_Saveri"]],
  },
  {
    id: "in",
    name: "In scale",
    native: "陰音階",
    from: "Japan",
    scale: [0, 100, 500, 700, 800],
    slots: [0, 100, 500, 700, 800],
    voice: "koto",
    voiceName: "Koto-ish",
    about: "The scale of Sakura Sakura: E F A B C. Two half steps give it that wistful koto sound.",
    links: [["In scale", "https://en.wikipedia.org/wiki/In_scale"], ["Sakura Sakura", "https://en.wikipedia.org/wiki/Sakura_Sakura"]],
  },
  {
    id: "ambassel",
    name: "Ambassel",
    native: "አምባሰል",
    from: "Ethiopia",
    scale: [0, 100, 500, 700, 800],
    slots: [0, 100, 500, 700, 800],
    voice: "krar",
    voiceName: "Krar-ish lyre",
    approx: true,
    about: "From the Gonder and Wollo regions, often for songs about history. Its notes, C D♭ F G A♭, are the same set as Japan's in scale, about 10,000 km away.",
    links: [["Ambassel scale", "https://en.wikipedia.org/wiki/Ambassel_scale"], ["In scale", "https://en.wikipedia.org/wiki/In_scale"]],
  },
  {
    id: "ryukyu",
    name: "Ryūkyū scale",
    native: "琉球音階",
    from: "Okinawa",
    scale: [0, 400, 500, 700, 1100],
    slots: [0, 400, 500, 700, 1100],
    voice: "sanshin",
    voiceName: "Sanshin-ish lute",
    about: "Okinawan folk songs lean on do mi fa sol ti: no re, no la, and a half step from ti up to do. Our tune's re becomes mi and its la becomes ti, which is why it suddenly sounds like an island.",
    links: [["Music of Okinawa", "https://en.wikipedia.org/wiki/Music_of_Okinawa"]],
  },
  {
    id: "slendro",
    name: "Slendro",
    native: "sléndro",
    from: "Java",
    scale: [0, 240, 480, 720, 960],
    slots: [0, 240, 480, 720, 960],
    voice: "bell",
    voiceName: "Metallophone",
    approx: true,
    about: "Five gamelan tones spaced roughly evenly, about 240 cents apart. No two gamelan sets are tuned quite alike, so this is an idealised version.",
    links: [["Slendro", "https://en.wikipedia.org/wiki/Slendro"]],
  },
  {
    id: "pelog",
    name: "Pelog",
    native: "pélog",
    from: "Java",
    scale: [0, 133, 267, 533, 667, 800, 933],
    slots: [0, 133, 267, 667, 800],
    voice: "bell",
    voiceName: "Metallophone",
    approx: true,
    about: "Seven tones with small and large steps. Pieces in pathet nem and lima use tones 1 2 3 5 6, which is where our tune lands. Tuned here to a rough 9-step approximation; real sets vary.",
    links: [["Pelog", "https://en.wikipedia.org/wiki/Pelog"], ["Braun on pelog", "http://www.neuroscience-of-music.de/pelog_main.htm"]],
  },
  {
    id: "rast",
    name: "Maqam Rast",
    native: "مقام راست",
    from: "Arab world",
    scale: [0, 200, 350, 500, 700, 900, 1050],
    slots: [0, 200, 350, 700, 900],
    voice: "oud",
    voiceName: "Oud-ish",
    approx: true,
    about: "Its third and seventh sit half a semitone lower than the piano's, about 350 cents up for the third. Exact tuning shifts with region and era.",
    links: [["Rast", "https://en.wikipedia.org/wiki/Rast_(maqam)"], ["Neutral third", "https://en.wikipedia.org/wiki/Neutral_third"], ["Arabic maqam", "https://en.wikipedia.org/wiki/Arabic_maqam"]],
  },
];

// Two notes "rhyme" when they sit within a quarter of a semitone of each other.
export const RHYME_CENTS = 25;

export function sharedNotes(a, b) {
  return a.filter((x) => b.some((y) => Math.abs(x - y) <= RHYME_CENTS));
}

export const DEGREE_LABELS = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
export const SOLFA = ["do", "re", "mi", "sol", "la"];
