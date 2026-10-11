// Builds data/radio.json for Time Capsule Radio.
// Run with: bun scripts/fetch-radio.ts
// The dev server already saves the 78s into data/cache/radio in the background. Add --offline to do it
// here and wait for it, or --offline-all to include the Rediffusion episodes (about 140 MB more).
// Downloads resume: files already saved are skipped, so you can stop and rerun it.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { cacheName, fillCache } from "../apps/radio/cache.ts";

const DATA = join(import.meta.dir, "../data");
const OUT = join(DATA, "radio.json");
const LABELS = join(DATA, "radio-labels");
const OFFLINE_ALL = process.argv.includes("--offline-all");
const OFFLINE = OFFLINE_ALL || process.argv.includes("--offline");

type Pick = {
  id: string;
  file?: string; // match for the mp3 when an item holds more than one side
  year: number;
  circa?: boolean;
  title: string;
  artist: string;
  place: string;
  note: string;
};

// Hand picked from the Great 78 Project and other 78rpm uploads on the Internet Archive.
const PAST: Pick[] = [
  {
    id: "SunJuxianzhongchenbupasis1905VictorRecordC54719B10inch",
    year: 1905,
    title: "忠臣不怕死 (A Loyal Minister Fears No Death)",
    artist: "Sun Juxian 孫菊仙 (attributed)",
    place: "Peking opera",
    note: "A 1905 Victor record sold under the name of Peking opera star Sun Juxian. Early labels sometimes borrowed famous names, so whether it is really him is still argued over.",
  },
  {
    id: "78_nina-boboh-malay-and-javanese-slumber-song_eva-gauthier-carlo-edwards-paul-seelig_gbia0182051a",
    year: 1915,
    title: "Nina Boboh (Malay and Javanese Slumber Song)",
    artist: "Eva Gauthier",
    place: "New York, sung in Malay",
    note: "A Canadian singer who had lived in Java sings the lullaby nina bobo, in Malay, to a New York studio in 1915.",
  },
  {
    id: "78_singapore_jaudas-society-orchestra-gilbert-friedland_gbia0023208b",
    year: 1919,
    title: "Singapore",
    artist: "Jaudas' Society Orchestra",
    place: "New York",
    note: "A New York foxtrot named after a port most of its dancers would never see. Tin Pan Alley loved a faraway name.",
  },
  {
    id: "Peony_Su_White_Hibiscus_At_Night",
    file: "Part_1.mp3",
    year: 1920,
    circa: true,
    title: "White Hibiscus at Night",
    artist: "Peony Su",
    place: "Cantonese opera",
    note: "Peony Su was a Cantonese opera star of the 1920s and 30s, when Cantonese opera was a big night out in Chinatown.",
  },
  {
    id: "1920333851",
    file: "33385-1",
    year: 1920,
    title: "奇冤报 (The Strange Case of Injustice)",
    artist: "Meng Xiaodong 孟小冬",
    place: "Peking opera, Pathé",
    note: "Meng Xiaodong, aged about 13. She grew up to be famous for singing the old men's roles in Peking opera.",
  },
  {
    id: "78_singapore-sorrows_ciros-club-dance-band_gbia3012506a",
    year: 1928,
    circa: true,
    title: "Singapore Sorrows",
    artist: "Ciro's Club Dance Band",
    place: "London",
    note: "A slow foxtrot from a London nightclub band. Dance bands on both sides of the Atlantic cut this tune in 1928.",
  },
  {
    id: "78_lagoe-longgor-i_gong-pangkoeng-bali_gbia3038669a",
    year: 1928,
    title: "Lagoe Longgor I",
    artist: "Gong Pangkoeng",
    place: "Bali",
    note: "Balinese gamelan from the 1928 recording sessions on the island, some of the earliest records of its music.",
  },
  {
    id: "2-krontjong-orchest-eurasia-edison-bell-radio-f-118-88369-1929",
    file: "88369",
    year: 1929,
    title: "Rasa Sayang medley",
    artist: "Krontjong Orchest Eurasia",
    place: "Dutch East Indies",
    note: "Kroncong on an 8 inch disc, with a medley that includes Rasa Sayang. Singapore schoolkids still sing that one.",
  },
  {
    id: "78_music-of-the-orient-9-java_kraton-jogjakarta_gbia3040503a",
    year: 1931,
    circa: true,
    title: "Sekar Gadung (slendro)",
    artist: "Kraton Jogjakarta gamelan",
    place: "Java",
    note: "Court gamelan in slendro tuning, from Music of the Orient, a record set Erich von Hornbostel compiled in 1931.",
  },
  {
    id: "Teb7641931A233734a",
    year: 1931,
    title: "珍珠塔 (The Pearl Pagoda)",
    artist: "Shen Jian'an & Xue Xiaoqing 沈俭安、薛筱卿",
    place: "Suzhou pingtan",
    note: "Suzhou storytelling with voice, sanxian and pipa. A sung soap opera that kept listeners coming back for the next episode.",
  },
  {
    id: "78_on-a-little-street-in-singapore-en-una-callejuela-de-singapore_buddy-clark-hill-d_gbia0153742a",
    year: 1939,
    title: "On a Little Street in Singapore",
    artist: "Buddy Clark",
    place: "New York",
    note: "A 1939 hit that several American bands recorded that year. Moonlight, a little street, a lot of imagination.",
  },
  {
    id: "78_chee-lai-songs-of-new-china_paul-robeson_gbia8006339",
    file: "01 - CHEE LAI",
    year: 1941,
    title: "Chee Lai (Arise)",
    artist: "Paul Robeson with a Chinese chorus",
    place: "New York",
    note: "Paul Robeson sings the song that later became China's national anthem, from his 1941 album with Liu Liangmo.",
  },
  {
    id: "78_giridhara-gopala_sm-m-s-subbulakshmi-chandraprabha-cinetone_gbia0133996a",
    year: 1945,
    title: "Giridhara Gopala",
    artist: "M. S. Subbulakshmi",
    place: "From the film Meera",
    note: "The great Carnatic singer M. S. Subbulakshmi, from her film Meera. She made it in Tamil first and then in Hindi.",
  },
  {
    id: "78_flug-med-till-siam-del-ii-singapore-bangkok_povel-ramel-och-hans-orientoctette-po_gbia7024854b",
    year: 1950,
    title: "Flug med till Siam! Part II: Singapore to Bangkok",
    artist: "Povel Ramel",
    place: "Stockholm",
    note: "A Swedish comedian takes you on a pretend flight from Singapore to Bangkok. Fasten your seatbelts.",
  },
  {
    id: "DoeaMelatiKotaAmbonHMVJF144OFA2072",
    year: 1954,
    title: "Kota Ambon",
    artist: "Doea Melati",
    place: "Indonesia, HMV",
    note: "A song for the town of Ambon in the Maluku spice islands, pressed by HMV in 1954.",
  },
  {
    id: "78_masila-nivale-part-1_p-bhanumati-t-m-sunderarajan-ku-ma-balasubramaniam-g-r_gbia0123117a",
    year: 1957,
    title: "Maasila Nilave",
    artist: "P. Bhanumathi & T. M. Soundararajan",
    place: "From the Tamil film Ambikapathy",
    note: "A duet from Ambikapathy (1957), music by G. Ramanathan. The film is about a poet who falls for a princess.",
  },
  {
    id: "78_oi-kampuang_reno-orkes-gumarang-n-n-asbon_gbia3042320b",
    year: 1955,
    circa: true,
    title: "Oi Kampuang",
    artist: "Orkes Gumarang",
    place: "Sumatra",
    note: "Minangkabau pop from West Sumatra. Kampuang means home village, the same word as kampung.",
  },
];

// Rediffusion Singapore was the island's cable radio from 1949 to 2012. Its dialect dramas and stories
// filled coffee shops and homes. A volunteer uploaded part of the archive to the Internet Archive.
const REDIFFUSION_PER_DIALECT = 2;
const DIALECTS = ["Hokkien", "Teochew", "Cantonese", "Mandarin"];

// Live Singapore stations. Stream addresses come from radio-browser.info, a community directory.
const NOW = [
  { name: "Class 95", freq: "95.0", lang: "English", note: "English pop and the morning show crowd.", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CLASS95_PREM.aac" },
  { name: "YES 933", freq: "93.3", lang: "Mandarin", note: "Mandopop for taxi rides home.", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/YES933_PREM.aac" },
  { name: "Warna 942", freq: "94.2", lang: "Malay", note: "Malay talk, news and music.", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/WARNA942FM_PREM.aac" },
  { name: "Oli 968", freq: "96.8", lang: "Tamil", note: "Tamil news, talk and film songs.", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/OLI968FM_PREM.aac" },
  { name: "Gold 905", freq: "90.5", lang: "English", note: "Golden oldies. The 78s would approve.", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/GOLD905_PREM.aac" },
  { name: "Capital 958", freq: "95.8", lang: "Mandarin", note: "Mandarin news and talk.", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CAPITAL958FM_PREM.aac" },
  { name: "Ria 897", freq: "89.7", lang: "Malay", note: "Malay pop for the young ones.", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RIA897FM_PREM.aac" },
  { name: "Symphony 924", freq: "92.4", lang: "English", note: "Classical music, all day.", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/SYMPHONY924_PREM.aac" },
  { name: "CNA 938", freq: "93.8", lang: "English", note: "News and talk.", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/938NOW_PREM.aac" },
];

const dl = (id: string, file: string) =>
  `https://archive.org/download/${id}/${file.split("/").map(encodeURIComponent).join("/")}`;

async function metadata(id: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`https://archive.org/metadata/${id}`, { signal: AbortSignal.timeout(30000) });
      if (res.ok) return await res.json();
    } catch {}
    await Bun.sleep(1000 * attempt);
  }
  throw new Error(`Could not read ${id}`);
}

async function download(url: string, path: string) {
  if (await Bun.file(path).exists()) return true;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return false;
    await Bun.write(path, await res.arrayBuffer());
    return true;
  } catch {
    return false;
  }
}

async function pastRecord(p: Pick) {
  const meta = await metadata(p.id);
  const files: { name: string; format?: string }[] = meta.files ?? [];
  const mp3s = files.filter((f) => f.name.toLowerCase().endsWith(".mp3") && !/_64kb|_vbr/.test(f.name));
  const mp3 = p.file ? mp3s.find((f) => f.name.includes(p.file!)) : mp3s[0];
  if (!mp3) throw new Error(`No mp3 for ${p.id}`);
  // The archive's own item thumbnail is the record label, and small enough to keep in the repo.
  const labelFile = `${p.id.replace(/[^\w-]/g, "").slice(0, 60)}.jpg`;
  const hasLabel = await download(`https://archive.org/services/img/${p.id}`, join(LABELS, labelFile));
  const audio = dl(p.id, mp3.name);
  return {
    kind: "past",
    year: p.year,
    circa: Boolean(p.circa),
    title: p.title,
    artist: p.artist,
    place: p.place,
    note: p.note,
    audio,
    cache: cacheName(audio),
    label: hasLabel ? `/media/radio/labels/${labelFile}` : `https://archive.org/services/img/${p.id}`,
    source: `https://archive.org/details/${p.id}`,
  };
}

async function rediffusion() {
  const params = new URLSearchParams({ q: "identifier:rediffusion.sg-le-*", rows: "100", output: "json" });
  params.append("fl[]", "identifier");
  const res = await fetch(`https://archive.org/advancedsearch.php?${params}`);
  const ids: string[] = (await res.json()).response.docs.map((d: any) => d.identifier).sort();
  const out: any[] = [];
  for (const dialect of DIALECTS) {
    let taken = 0;
    for (const id of ids) {
      if (taken >= REDIFFUSION_PER_DIALECT) break;
      const meta = await metadata(id);
      const title: string = meta.metadata?.title ?? "";
      if (!title.includes(`(${dialect})`)) continue;
      const zip = (meta.files ?? []).find((f: any) => f.name.endsWith(".zip"));
      const ep1 = String(meta.metadata?.description ?? "").match(/[^<>\s]+_Ep0*1\.mp3/)?.[0];
      if (!zip || !ep1) continue;
      // "Rediffusion Singapore [十五贯] (Fifteen Strings of Cash) : 閩南語 (Hokkien)"
      const m = title.match(/\[(.+?)\]\s*\((.+?)\)/);
      out.push({
        kind: "rediffusion",
        dialect,
        title: m ? `${m[1]} (${m[2]})` : title,
        artist: `Rediffusion Singapore, ${dialect}`,
        place: "Episode 1",
        note: "",
        audio: dl(id, `${zip.name}/${ep1}`),
        cache: cacheName(dl(id, `${zip.name}/${ep1}`)),
        source: `https://archive.org/details/${id}`,
      });
      taken++;
    }
  }
  return out;
}

async function streamAlive(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const ok = res.ok && /audio|aac|mpeg|octet/.test(res.headers.get("content-type") ?? "");
    await res.body?.cancel();
    return ok;
  } catch {
    return false;
  }
}

await mkdir(LABELS, { recursive: true });
const past = [];
for (const p of PAST) {
  try {
    past.push(await pastRecord(p));
    console.log(`  78   ${p.year} ${p.title}`);
  } catch (e) {
    console.warn(`  skip ${p.id}: ${(e as Error).message}`);
  }
}

const rediff = await rediffusion();
rediff.forEach((r) => console.log(`  RDF  ${r.dialect} ${r.title}`));

const now = [];
for (const s of NOW) {
  const alive = await streamAlive(s.url);
  console.log(`  LIVE ${alive ? "ok  " : "DOWN"} ${s.name}`);
  if (alive) now.push({ kind: "now", ...s, source: "https://www.radio-browser.info/" });
}

if (OFFLINE) await fillCache({ clips: [...past, ...rediff], full: OFFLINE_ALL ? [...past, ...rediff] : past });

await Bun.write(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), past, rediffusion: rediff, now }, null, 2));
console.log(`Wrote ${past.length} records, ${rediff.length} Rediffusion stories, ${now.length} live stations to data/radio.json`);
