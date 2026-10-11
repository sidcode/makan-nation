# Ideas for Common Ground (Culture × Tech)

Each idea looks at one slice of Singapore culture through three tenses: what the archives hold (past), what people do with it today (present), and what we leave for later (future). Five are built in this repo. The rest are ready to pick up.

## Built

### 1. Time Capsule Radio (`/radio`)
One radio dial that runs from 1905 to 2065.

- **Past:** 17 shellac 78s from the Internet Archive (Peking opera from 1905, Balinese gamelan from 1928, a 1929 kroncong medley with Rasa Sayang, Tin Pan Alley foxtrots named after Singapore) and 8 Rediffusion dialect dramas in Hokkien, Teochew, Cantonese and Mandarin.
- **Present:** live Singapore stations in English, Mandarin, Malay and Tamil.
- **Future:** anyone can seal a song in a butter cookie tin with a note, to open in 2030, 2040, 2050 or 2065 (SG100). Sealed songs play muffled, as if through a lid. A "Pretend it's 2065" switch opens every tin.
- **Demo moment:** ask a judge for a song that should outlive us, seal it live, and the dial glides to it.
- **Sources:** Internet Archive (Great 78 Project, community Rediffusion upload), radio-browser.info, iTunes Search API.

### 2. Kopi Compiler (`/kopi`)
Kopitiam orders are a tiny programming language. Type `kopi-o kosong peng` and watch it get parsed, explained and poured.

- **Past:** a menu board of where each word comes from (Malay, Hokkien, Cantonese, Hainanese, English), with sources. Disputed origins, like the C in kopi-C, are marked as disputed.
- **Present:** compile an order and see it poured into a cup, a glass or a da bao bag. Build a drink with the controls and it writes the order for you. Uncle's Rush is a 60 second game where uncle calls out the orders.
- **Future:** teach uncle a new word (kopi-oat, anyone?) and the compiler accepts it from then on.
- **Demo moment:** open with the event brief's Jacquard loom line. "Before code was code, it was holes in punch cards." Then show that every order ticket prints its own punch card.
- **Works offline.** Tests: `bun test apps/kopi`.

### 3. Block Birthday (`/block`)
Every HDB block has a birthday. Type a postal code, or a block and street, and the block is drawn as a cake with its age on the candles.

- **Past:** the year it was finished, checked moments from that year, the National Day song (1984 onwards) and Billboard's top song of the year, with previews.
- **Present:** its age, floors, flats and town, how many blocks share its birth year, and three birthday twins in other towns.
- **Future:** a lift-style countdown to the end of its 99-year lease (rough maths, labelled as such) and a notice board for notes to its 99th birthday.
- **Demo moment:** ask a judge for their postal code. Everyone has a block.
- **Sources:** data.gov.sg HDB Property Information (13,357 blocks, 1937 to 2026), OneMap search, iTunes Search API, NLB Infopedia and Wikipedia.

### 4. Musication (`/musication`)
A field guide to how music rhymes across cultures and decades. The user's own idea.

- **One tune, many homes:** Mo Li Hua (China), Arirang (Korea) and Auld Lang Syne (Scotland) all use the same five notes. Play any of them in nine systems: major, Chinese gong mode, Carnatic Mohanam, Hindustani Bhupali, Japanese yo and in, Javanese slendro and pelog, and maqam Rast. A pitch wheel shows which notes two systems share.
- **Record DNA:** pick two songs (or a preset pair like "Bengawan Solo, twice") and compare tempo, brightness, loudness and the notes each one leans on.
- **Demo moment:** play Mo Li Hua in gong mode against Mohanam: 5 of 5 notes match. Switch to pelog: 1 of 5.
- **Caveat:** the gamelan and maqam tunings are textbook approximations, and the page says so.

### 5. Makan Nation (`/hawker`), the highlight
A co-op, Overcooked-style hawker kitchen in 3D (Three.js), played across four eras. The name says the point: Singapore is a nation proud of its food, and hawker centres are where that pride is shared every day. Three of the other prototypes feed it: the radio plays on the stall radio, the Kopi Compiler writes the drink orders, and Block Birthday sends blocks with a hawker centre straight to the stall.

- **Past:** the five-foot ways of the 1950s (Telok Ayer Basin, Hoi How Road, Glutton's Square) and the first hawker centres of the 1980s, each with sourced history cards. The stall radio plays 78s, Rediffusion dramas and National Day songs. Hawker Culture in Singapore was inscribed on UNESCO's Representative List of the Intangible Cultural Heritage of Humanity on 16 December 2020.
- **Present:** 48 dishes with variants, eight chefs from across Singapore's communities, customers who order in six languages, and hired help that eats into your takings, as in Hawkernomics.
- **Future:** SG100 in 2065, where you choose which recipes to pass on to your own apprentice. Player memories become part of the game for the next cook.
- **Centre Manager (Advanced):** run a real NEA hawker centre for two weeks. Menus, prices, stock, rent, hygiene and tray return are the economics, credited to Hawkernomics. Succession is the point: when a hawker retires without an apprentice, the stall closes and its dishes leave the centre, and the heritage score shows it.

**What makes it Culture × Tech:**
1. **Archives as level design.** 19 famous centres are built from archive research (NHB, NLB, the UNESCO nomination, NEA), so Lau Pa Sat is a cast-iron octagon at night, Tiong Bahru is art deco, and Newton serves its BBQ stingray and carrot cake. Every round opens with a dated fact from the archives.
1. **Open data as the map.** The Hawker Passport runs on NEA's dataset of 129 hawker centres and URA's planning area outlines. Most centres were completed in the 1970s and 1980s, when street hawkers were resettled into them, and the map shows it.
2. **Language as a mechanic.** A takeaway request in Malay (*bungkus*) or Mandarin (*dǎbāo*) changes what you have to build. Every phrase is checked against Wiktionary.
3. **A living archive.** Players write short hawker memories that become customer lines in later rounds, so playing collects oral history.
4. **Succession as the story.** Mentors hand you the ladle era by era, and you pass it on in 2065, the real question hawker culture faces today.
5. **Code before code.** Kopi orders are parsed by the Kopi Compiler, a nod to the event brief's point that code started as punched cards for looms.

- **Demo moment:** put the QR code on screen, let the judges pick a chef on their phones, and cook a 1980s lunch rush together while *Stand Up for Singapore* plays on the stall radio.
- **Different from Hawkernomics** (OGP, hack.gov.sg 2025), which is a game about hawker economics. Makan Nation borrows its cost lens for the hired help, but the game is about cooking the dishes together and keeping them going.

## Ready to pick up

### 5. Ah Ma's Voice Booth
A recording booth for dialect phrases families still use.

- **Past:** Rediffusion dialect dramas (already wired into the radio data script).
- **Present:** visitors record a phrase in Hokkien, Teochew, Cantonese, Hakka or Hainanese, with its meaning and who taught them.
- **Future:** a phrasebook that grows all day. By demo time it holds the room's own voices.
- **Build:** browser MediaRecorder, a Bun route that saves files, a grid of playable tiles. Effort: small.

### 6. Rojak Dictionary
Singlish words drawn as a bowl of rojak, each piece coloured by its source language.

- **Past:** etymologies from Wiktionary's Singapore English category (the API works without a key).
- **Present:** usage examples and a quiz.
- **Future:** mash two words from different languages into a new one and let people vote.
- **Effort:** medium (etymology parsing needs care).

### 7. Last Will and Playlist
Write a will for your music taste: which song goes to which person, and why.

- **Past:** the songs your parents left you.
- **Present:** your rotation now.
- **Future:** a printable will with a QR code per song.
- **Effort:** small. Could also be a mode inside Time Capsule Radio.

### 8. Hawker Heirloom
Dishes as heirlooms, with succession as the story.

- **Past:** archival photos of street hawkers before the hawker centres.
- **Present:** the hawker centre map from data.gov.sg.
- **Future:** adopt a dish and record who taught it to whom.
- **Effort:** medium. Dish level data has to be collected by hand.

### 9. SG Internet Museum
Early Singapore web culture (forums, blogshops, school sites) from the Wayback Machine, shown on an old CRT.

- **Past:** Wayback CDX API snapshots from 1998 to 2008.
- **Present:** the same addresses today.
- **Future:** what today's sites will look like to someone in 2045.
- **Effort:** medium.

### 10. Void Deck Soundmap
A map of everyday sounds that are fading: the karung guni call, the ice cream man's bell, old MRT chimes.

- **Past and present:** field recordings placed on a map.
- **Future:** a "sounds to save" list that people vote on.
- **Effort:** medium, mostly recording time.

## How to pick

| | Story | Demo risk | Wow on stage |
|---|---|---|---|
| Time Capsule Radio | Strong, covers all three tenses in one object | Needs internet for live radio. Cache the 78s with `--offline` the night before | High |
| Kopi Compiler | Ties straight to the brief's punch card opening | None, works offline | High, very quotable |
| Block Birthday | Personal, every judge has a block | Low, data is cached | Medium to high |
| Musication | Clear learning value, plus the Ed Sheeran hook | Low | Medium to high |
| Makan Nation | Everyone knows these dishes, and it ties the other four together | Low on one machine, medium with phones | Highest, judges play it |
