# Makan Nation

Singapore is a nation proud of its food, and Makan Nation is a celebration of its hawker culture: a co-op cooking game for Singapore hawker dishes, in the spirit of Overcooked. One to four chefs (plus up to three hired helpers) share a stall across four eras, cook against the clock, and fill a recipe book with the story of every dish they serve.

The Hawker Passport turns it into an apprentice trail: start at a 1950s street stall, learn one dish from a mentor in each era, answer a question for each stamp, and in 2065 choose which recipes to pass on to your own apprentice.

## Play

From the repo root:

```sh
bun install
bun run dev            # then open http://127.0.0.1:3000/hawker/
```

- **Hawker Passport:** the apprentice trail, nine stops from 1950 to 2065 on a map of Singapore's hawker centres.
- **Free play:** pick an era, a stall and helpers. One keyboard (1 or 2 chefs), up to 4 gamepads, or a phone or tablet (1 player, or 2 sharing a tablet).
- **Host:** shows a four-letter kitchen code, a link and a QR code. Friends join from their phones.
- **Join:** type the code, or open the link.
- **Makan at a hawker centre:** be the customer. Walk any of NEA's 129 centres in any era with a makan list: chope a table, queue, order, carry your trays, eat and clear up. See [the customer mode](#customer-mode-makan-at-a-hawker-centre).

The first time you pick the chicken rice stall, a short tutorial walks you through one plate with prompts in the kitchen.

### Controls

| | Keyboard chef 1 | Keyboard chef 2 | Gamepad | Touch |
|---|---|---|---|---|
| Move | W A S D | Arrow keys | Left stick | Floating stick (put your thumb anywhere on the left) |
| Grab, drop, plate, serve | E | / | A | Grab |
| Chop, wash, put out fires (hold) | Q or Space | . | X | Chop |
| Dash | Left Shift | Right Shift | RB or RT | Dash |
| Throw a raw ingredient | F | , (comma) | B | Throw |

With one chef on a keyboard, both key sets work. Esc pauses a local game. Phones vibrate on serves and fires where the browser allows it.

## What is in the kitchen

**Four eras.** Pick when you cook. Each era changes the look, the music, prices and a rule or two, and comes with a short card of sourced facts.

| Era | Look | Music (from the radio prototype) | Kitchen rule | Chaos |
|---|---|---|---|---|
| Five-foot way, 1950s to 60s | Shophouses, kerosene lamps, pushcart, low wooden tables | Shellac 78s | Washing up in a pail is slower | A trishaw cuts through the stall; monsoon puddles |
| First hawker centres, 1970s to 80s | HDB blocks, ceiling fans, a Rediffusion box | Rediffusion dramas and National Day songs | Running water | Power cuts stop the rice cookers; monsoon puddles |
| Today | Tray return, queue board, SGQR stickers | Live Singapore FM | Dirty plates come back to tray return | Lunch rush waves; monsoon puddles |
| SG100, 2065 | Solar canopy, a dishwashing robot, cultivated chicken | Songs sealed in the radio's time capsules | The robot washes plates by itself, slowly | Smart counters rearrange themselves |

**Fourteen stalls, 48 dishes and drinks (61 counting variants).** Stalls open as you earn stars (or tap "Open every stall" for a demo).

| Stall | Dishes |
|---|---|
| Chicken rice and kopi | Chicken rice (steamed or roasted), kaya toast set, kopitiam drinks |
| Fried noodles | Char kway teow, carrot cake (white or black), Hokkien mee, oyster omelette |
| Noodles and kueh | Wanton mee, laksa, chwee kueh, braised duck rice |
| Nasi lemak and satay | Nasi lemak, satay (ayam or kambing), mee rebus |
| Prata and teh tarik | Roti prata (kosong or telur), murtabak, kopitiam drinks |
| Desserts and kopi | Ice kachang, chendol, kaya toast set, kopitiam drinks |

Tickets list every component and how it is cooked ("Chicken, roasted + sliced"), and crates carry labels. A line at the bottom of the screen says what you are holding and what you are facing.

**Kitchen rules.**

- Crates give raw ingredients. They cost money, and so does anything you bin.
- Pots, woks, rice cookers and the grill cook what you put in. Some recipes take several things at once (kway teow and egg in the wok). When a bigger recipe is possible, the station waits a moment for the last ingredient: radish cake and egg make white carrot cake, add black sauce in time and it turns black. If an open order wants the bigger dish and none wants the smaller one, it waits longer (7 seconds instead of 2.2), so bee hoon in the pot waits for the prawns when someone has ordered laksa.
- Delivery riders (today and 2065): some orders come by app. A GrabFood rider in green or a foodpanda rider in pink waits behind the hatch, the ticket says so, the food goes out in a takeaway box, and the app's commission (30%, the rate Grab gave in 2020) shows in the profit and loss. There are no riders in the 1950s or 1980s: we found no delivery from hawker centres then.
- Hold Chop at the chopping board, the ice shaver or the sugarcane press.
- Plate everything at once and hand it in at SERVE. Drinks can be handed in on their own.
- Food left on the heat burns, then catches fire, then the fire spreads. Hold Chop on it with the extinguisher (a wet towel in the 1950s).
- Dash to get around faster. Throw raw ingredients to a teammate, onto a counter or straight into a pot.
- Serving quickly and in ticket order builds a streak and a speed bonus. "Last orders!" at 30 seconds.

**Kopi in kopi code.** Drink orders arrive the way they are shouted at a kopitiam ("Kopi-O Kosong Peng", "Teh-C Siew Dai"), generated and checked with the Kopi Compiler's own module (`apps/kopi/compiler.js`). At the urn, set the drink, milk, sugar, strength, ice and extras, then pull it. Each drink ticket links to the Kopi Compiler to decode the order.

**Hired help and the money side.** Before a round you can hire up to three helpers, each with one job: dishwasher, slicer, ice shaver, sugarcane presser, wok, pot, rice or grill cook, or kopi uncle. They are AI chefs with simple rules, run by the host's game, so they work in solo, local and online games. At the end you get a profit and loss for the hour: takings, the speed bonus, ingredients and waste, rent and charges, helper wages and utilities. It is inspired by [Hawkernomics](https://www.hack.gov.sg/2025/hawkernomics/) (Hack for Public Good 2025).

The numbers are a game simplification. One round stands for one hour of trading. Rent and charges use the 2025 medians for a non-subsidised cooked food stall (rent $1,450, S&CC $200, table cleaning $520 a month, [MSE](https://www.mse.gov.sg/latest-news/written-reply-to-parliamentary-question-on-heat-preparedness-by-ms-grace-fu--minister-for-sustainability-and-the-environment-/)), spread over 26 days of 12 hours. Helpers cost the part-time food stall assistant rate under the Food Services PWM from 1 July 2026, $11.64 an hour ([MOM](https://www.mom.gov.sg/newsroom/press-releases/2026/0316-government-accepts-tcf-recommendations-on-food-services-pwm-2026-to-2028)). Everything scales by era using SingStat's annual food inflation; 2065 is a projection. Ingredient prices, dish prices and utilities are our guesses.

## Culture in the kitchen

**Who cooks.** Pick a named chef: Mei Ling (Teochew), Siti (Malay), Arun (Tamil), Harpreet (Punjabi Sikh), Uncle Lim (Hokkien), Auntie Rosalind (Peranakan), Daniel (Eurasian) or Auntie Kamala (Tamil), each with a one-line story. Hired help and the regulars in the dining area are just as mixed, from aunties and uncles to students and office workers. Their clothes follow the era: samfu, sarong, singlets and baju kurung in the 1950s; school uniforms and office shirts in the 1980s; today's mix; and a 2065 that keeps its roots. Headwear such as the tudung, songkok and Sikh turban is part of who they are. Everyone is fictional and drawn simply, without exaggerated features.

**What customers say.** Orders come in the languages you hear at a hawker centre, with the phrase, a romanisation and its meaning on the ticket. Tap the phrase to hear it if your device has a voice for that language. Each phrase changes the order:

| Order | Singlish | Malay | Mandarin | Cantonese | Hokkien | Tamil |
|---|---|---|---|---|---|---|
| Takeaway (use a box, a paper wrap or a tiffin, never a plate) | Dabao | Bungkus | 打包 dǎbāo | 打包 daa2 baau1 | | |
| No chilli | No chilli, hor | Jangan pedas | 不要辣 bùyào là | 走辣 zau2 laat6 | 毋愛薟 m̄-ài hiam | காரம் வேண்டாம் kāram vēṇṭām |
| Extra chilli (add a saucer of chilli) | More chilli lah | Tambah sambal | 加辣 jiā là | | | |
| Plain | One, please. | Satu. | | 唔該 m4 goi1 | | |

Every word was checked on Wiktionary (links in `phrases.js`). Blank cells are phrases we could not verify, so those customers do not say them.

**Accents and voices.** Customers also greet you, thank you, praise a fast plate and grumble at a slow one, each in their own language: "Wah, shiok!", "Terima kasih.", "谢谢。", "唔該。", "多謝。" (to-siā), "நன்றி." Singlish lines use the particles the way Wiktionary describes them: leh for a mild complaint, lor for resignation, meh for doubt, hor for "remember, ah", and sia only from younger customers, who use it most. The recipe book has a glossary of every word, with sources.

A browser can only speak with the voices its device has: Edge has Singapore English voices online, Android's Google voices cover Malay, Mandarin, Cantonese and Tamil (India), and nothing speaks Hokkien. So each line plays the best thing available, in this order:

1. a recording someone lent for that line and language (see below),
2. a clip generated for the game, listed in `hawker-voices/manifest.json` beside the page (the server serves `data/hawker-voices/`, and the Pages workflow copies it), in the persona's own voice or another of the same sex, played a little lower and slower for an older speaker (credits show in Settings and in the recipe book),
3. the device's own voice: en-SG or en-MY only for Singlish; ms-SG or ms-MY; zh-SG then zh-CN; zh-HK for Cantonese; ta-SG, ta-MY, then ta-IN,
4. the words in a speech bubble.

Singlish is never read in a US or British voice: its generated clips are synthetic Singapore voices picked by an accent check (`tools/voices/singlish.py`), and only the aunties' and young women's passed it, so men's Singlish lines show as words until consenting voices are recorded. Most lines have three takes per voice; the game never plays the take a line used last time, and plays each a touch higher or lower, quicker or slower.

Every customer and chef has one of five voice personas (auntie, uncle, young woman, young man, student) and keeps it, with pitch and rate set by age. Nobody gets an accent because of their community. Settings lists what this device has, and there is a voice volume and a mute, separate from the music. `bun scripts/hawker-voice-lines.ts` writes every line, with stable keys like `order.nochilli.nan` or `react.thanks.ta`, to `data/hawker-voice-lines.json` for the offline voice generator.

**Lend your voice.** In Settings, record one line (up to five seconds) in Singlish, Malay, Mandarin, Cantonese, Hokkien, Teochew, Hakka, Hainanese or Tamil. Customers then use it. Saved: the recording, the line and language, and the date; no name or location. On the Bun server clips go to `data/hawker-voice-bank/` (webm, ogg or mp4 checked by their first bytes, 160 KB each, 25 MB in all, one clip every 8 seconds and 30 an hour per address); only the recorder's browser holds the token that deletes a clip. On GitHub Pages clips stay in the browser (IndexedDB). Recording needs a secure page (https or localhost), so the button is replaced by a note on plain http. Dialect clips (Teochew, Hakka, Hainanese) are heard now and then in place of a regular's thanks or greeting.

**The living archive.** After a round, leave a memory about a dish (up to 140 characters, name optional). Memories show on the dish's recipe book card and pop up as speech bubbles from the regulars in later rounds. On the Bun server they are shared in `data/hawker-memories.json` (rate limited, git-ignored). On GitHub Pages they stay in your browser.

**The rojak meter.** The results screen shows whose recipes you cooked that round: Hainanese, Teochew, Hokkien, Cantonese, Peranakan, Malay, Javanese, Indian Muslim and dishes shared by all, taken from each dish's sourced recipe card.

**Find your nearest hawker centre.** In the passport, type a postal code; the server asks OneMap where it is, and the map shows the three nearest NEA centres. Cook a round at one in its own era.

## The menu

Fourteen stalls and 48 dishes and drinks, each with a sourced recipe book card (then, now, later). Added in the menu expansion (the dishes famous at particular centres are listed under "Centres that look like themselves"):

| Stall | Dishes |
|---|---|
| Rice and roast meat | Roast meat rice (char siew or roast duck), Hainanese curry rice, economy rice (veg and egg, or with char siew), claypot rice on a second, charcoal grill |
| Soups and porridge | Bak kut teh, kway chap, Teochew porridge (with braised duck or steamed fish), yong tau foo (with bee hoon or yellow mee) |
| Noodles and mamak | Prawn noodles, ban mian, mee goreng mamak, curry puffs |
| Nasi padang and kueh | Nasi padang with beef rendang, sambal stingray, kueh (ondeh-ondeh or kueh lapis) |
| Desserts and kopi | Soya bean milk joins ice kachang, chendol and kaya toast |
| BBQ seafood and wings | Chilli crab (with or without mantou), black pepper crab, BBQ chicken wings, sambal stingray, sugarcane juice from a press |
| Noodles in soup and gravy | Lor mee, bak chor mee, fish soup (with bee hoon or rice) |
| Biryani and thosai | Mutton or chicken biryani, thosai, teh tarik in kopi code |
| Rojak, popiah and snacks | Rojak, popiah, goreng pisang, Fuzhou oyster cake, cheng tng |

Bandung, Milo dinosaur and Michael Jackson (soya milk with grass jelly) were already drinks in kopi code. Every stall hangs a menu board with prices in the era's money, and the stall picker lists the same menu. Dishes are not limited by era: where a card has a date (Loo's curry rice since 1946, ondeh-ondeh in Java by 1814) it says so, and otherwise the game stays neutral.

## Advanced: Centre Manager

From the start screen. Pick one of NEA's 129 hawker centres and an era, then run it for 14 days of breakfast, lunch and dinner. Before each session you manage; then you either cook one stall yourself (a normal round, solo, on one device, or with friends who join as usual) or let the session run. A summary follows each session and each day.

- **Stalls and hawkers.** About the square root of the real stall count, 6 to 12 stalls, each with a named hawker (fictional, mixed ages and communities) running one of the ten stall menus.
- **Menus and prices.** Take dishes off, change prices. Customers react to price against the era's usual price, to cooking quality, to hygiene, to how many different dishes the centre has, and to the time of day (kaya toast in the morning, sambal stingray at dinner).
- **Stock.** Portions are prepared before each session; half of the leftovers spoil by the next session and the rest at night.
- **Helpers and rent.** Wages at the Food Services PWM rate. Rent is subsidised ($240 a month, the middle of NEA's $160 to $320) or market ($1,250, the median for non-subsidised cooked food stalls, MSE 2025), with the share of subsidised stalls set by era. A stall let again later pays incubation rent, half the market rate as in NEA's Incubation Stall Programme.
- **Hygiene.** Cleanliness drifts down unless you pay for table cleaning (the $520 a month MSE figure) or a deep clean; busy stalls get dirtier, and every stall washes up at night. It shows as a game grade A to D, labelled as such: SFA's own grades were A to D until 19 January 2026, and its SAFE framework now grades A, B or C on a stall's food safety record.
- **Trays and seats.** Today and in 2065, tray return (91% at hawker centres in 2023, per NEA) frees tables faster; reminders cost a little and add 5 points. When every seat is taken, customers walk off.
- **Events,** at most one a day: rain (sourced to the Meteorological Service's wettest months), a festive season and ingredient price spikes (game events, labelled so), a food critic (game event, with the 2016 Michelin stars for two hawker stalls as context), a hygiene inspection, and hawkers announcing retirement.
- **Succession.** Hawkers in their late sixties and seventies start to plan retirement. Pair an apprentice for 3 days (NEA's Hawkers' Succession Scheme takes 3 months) and the stall carries on under them, its dishes intact, with rent moving to market. If nobody takes over, the stall closes and its dishes leave the centre; the summary says which.
- **Scores.** Cash and the day's profit and loss, customers served, satisfaction, and heritage (communities and dishes still on the menu, as in the rojak meter). Goals: last 14 days, keep dishes from at least five communities, and let no stall close without a successor. Small charts for cash and customers, with a table view.

Every number has a "?" with its reasons. The rules are deliberately simple; the screen lists the simplifications, and the model is in `centre.js` with deterministic tests (`centre.test.js`, fixed seeds). The game saves in this browser (versioned, with a reset). In co-op the host makes the decisions.

## Customer mode: makan at a hawker centre

From the start screen, **Makan at a hawker centre**. Pick any of NEA's 129 centres and an era, and walk the whole centre as a customer with a makan list: two or three dishes from different stalls (a famous one first where the centre has one) and a drink described in plain words that you have to order in kopi code.

- **The building.** The outline is the real one from OpenStreetMap (`data/hawker-footprints.json`, from `bun scripts/fetch-hawker-footprints.ts`), turned so its long side runs across the screen, with the real neighbouring buildings around it. The number of cooked food stalls is NEA's. Where the stalls and tables go inside is our arrangement (`floorplan.js`): rows of stalls facing aisles, islands back to back, stalls down the side walls, cross aisles every six stalls, doorways in the middle of each side, and tables packed into the rest, at about two tables (eight seats) a stall. Real centres seat 11 to 14 a stall (Roots and JTC), so the game is a little emptier. Centres OpenStreetMap does not have get a rectangle sized for their stalls. Centres on one floor of a bigger building (a mall or a hub) get a hall sized for their stalls round NEA's point, with the whole building drawn round it; outlines with too little floor for NEA's count (stalls on two floors, or only part of a hall mapped) are drawn bigger; the spare floor of market buildings is the wet market, since NEA counts only cooked food stalls; seating stops at about 13 seats a stall. The picker and a note at the start say which applies.
- **A map, and the street.** The picker shows the centres as a list or on a map of Singapore (`centremap.js`, Leaflet on OneMap's base map from the Singapore Land Authority, with URA's planning areas drawn from our own data so the island still shows offline): every centre a dot, gold for the famous ones, slate for HDB blocks, brick for the rest; a click picks it. Under the picked centre's photo, "From the street" shows the nearest open street-level photo on KartaView (`data/hawker-streetview.json` from `bun scripts/fetch-hawker-streetview.ts`; CC BY-SA 4.0, shown from KartaView's servers with the photographer and date), as a 360-degree view you drag to look round, starting faced towards the centre (`streetview.js`). A button loads Google Street View there, from Google's own embed, only when pressed, and a link opens it in Google Maps.
- **HDB estates.** Most of NEA's centres are HDB blocks themselves, with a block number like the flats round them (82 of the 129, matched by block and street to HDB's property data: `data/hawker-hdb.json`, from `bun scripts/fetch-hawker-hdb.ts`). The picker tags them ("HDB Blk 51", "flats above"), can show only them, and says for the picked one which block it is, how many storeys HDB gives it and when HDB says it was completed (for many markets that is the year of a rebuild), who lives upstairs, and what the HDB blocks within about 150 m add up to (how many, how many homes, the oldest and the tallest), with a link to the block's page in Block Birthday when the server is running. In the game the 1,034 blocks round the centres that OpenStreetMap gives an address to stand at their real number of storeys, with the block number painted near the top of each end wall, a corridor and window facade with washing on bamboo poles, and blocks of flats standing on their void decks. Flats built on the centre's own building rise above its roof from OpenStreetMap's outlines and building parts: Blk 335A and 335B over Chinatown Complex, Blk 271 over Albert Centre from its third storey, Blk 538 at Hong Lim, Kampung Admiralty's 676A and 676B, and others (14 centres; 8 with flats). From above they are a faint ghost so the hall stays in view. A tower OSM does not call flats (CapitaSpring over Market Street) is drawn as a plain tower. In the 1980s, blocks HDB lists as completed after 1989 are left out. Each centre's own door has a "BLK" plate. Block Birthday links back: a block that is a centre, or stands within about 150 m of one, opens the customer mode there (`/hawker?makan=<NEA id>`).
- **Layouts from the sources.** Lau Pa Sat gets eight radial passages to eight entrances and its clock tower in the middle (Roots); Newton and Adam Road are horseshoes of stalls round open seating (Roots). Upper-floor centres number their stalls #02-.
- **Eras.** Each era changes what people do, from the sources linked in the game:

| Era | Choping | Tables | Clearing up | Delivery |
|---|---|---|---|---|
| 1950s to 60s | Nobody chopes | Low tables and stools on the road; pushcarts at the kerb, in front of shophouses (if the centre was built later) | The hawker | None: a tok tok mee hawker pushes his cart down the street to you |
| 1970s to 80s | Nobody chopes yet (tissue choping is in print from 2001) | Free seating was the rule from 1982, but some tables belong to the stall beside them, with that stall's stools; its hawker shoos you if your food came from elsewhere (People's Park switched last, in 1992) | Contract cleaners | None at the centres |
| Today | A packet of tissue (others use umbrellas, name cards and plastic bags); Tiong Bahru Market and Our Tampines Hub ask you not to | Free seating, strangers share | You return your tray (compulsory from 1 September 2021; 93% of diners did by April 2024) | GrabFood and foodpanda riders queue at the counters |
| 2065 | Tissue, a guess | As today | Tray return; robot cleaners, a guess after NEA's 2023 offer to co-fund them | Riders, a guess |

- **Three views.** Above (the whole hall from overhead), Behind (over your shoulder) and Eyes (first person). V cycles them, and the picker and the pause menu have them too. In the close views WASD walks and steps sideways, the mouse looks round once you click the scene (Esc lets go), the left and right arrows turn, a finger dragged across the scene looks round on a phone, and a gamepad's right stick looks. In Eyes you use what you look at (E or a click), there is a small aiming ring, and anyone who brushes past the camera steps out of the picture. Inside a hall the ceiling closes over you, with fluorescent tubes and turning fans.
- **The guide.** The list card starts with the next step ("Chope a table with tissue first", "Queue for chicken rice at #01-10", "Take your tray to the tray return", "Walk out of the centre"), a dotted path on the floor and on the map, and a ring where it ends. **Go** (G, Space, or the Go button on a phone) walks you there along the path; any stick or key movement takes over again. At a stall Go joins the end of the queue for you. Each list item has its own Go, and on the big map (M) a tap on a stall, a table or a tray return walks you there. The path can be switched off in the pause menu.
- **Playing.** E (or Use) on what you face: chope a table, join a queue (from its end), put your tray down, sit and eat, stack your tray, return it. Shift to hurry, + and − (or the wheel) to zoom. At the counter an order sheet lists the stall's dishes in the era's prices with a photo of each, marks what is still on your list and what is already on your tray, greys out what you cannot afford, and takes number keys and Enter. Where we have a sourced menu for the real stall (`media/menus.json`), today's sheet says what the real stall charges, with the date and source, and a famous stall's sign wears the real stall's name. A "watch a real hawker make it" button plays a YouTube video of the dish being cooked, where there is one. Bring everything to your table, eat, clear up, and walk out for a card with what you spent, how long you queued, a photo of the real centre, a walk-through video, and a fact from the archives.
- **The lunch rush.** Centres are full, the way they are at lunch: people come in parties of one to four, one of them chopes a table with a packet of tissue (or an umbrella, a name card, a plastic bag) while the others queue, they sit together, eat at their own pace, wait for each other, and get up together. Most tables are taken or choped at any moment (93% busy today, 92% in the 1980s rush, 90% in 2065, 60% on the 1950s street), and the famous stall has the long queue. When every table is taken the guide says so and walks you to one where the party is nearly done (a tag counts it down: Almost done, Getting up, Free! Chope it). Other diners hover with their trays too, and take a table a moment after it frees, so you have to be standing close and quick. Their plates empty as they eat. People on their own share a spare seat at someone else's table, as people do. In the 1980s you wait for seats with your tray instead.
- **Hawkers at work.** Each hawker does the work of the dish they are making, for you or for whoever is at the front of their queue: tossing the wok with the ladle going and flames round it (char kway teow, carrot cake, Hokkien mee, oyster omelette, mee goreng, crab), blanching noodles in a strainer over a steaming pot (wanton mee, laksa, prawn noodles, lor mee, bak chor mee, fish soup), chopping chicken or roast meat with a cleaver on the board, pulling kopi from a pot held high into a cup held low with the tea in mid-air, flipping prata on the griddle, fanning satay or wings over a charcoal grill, cranking the ice shaver, tossing rojak, or scooping rice and dishes from trays. They walk to the right place in the stall for it (the wok and the pot on the back bench, the board, griddle, grill and shaver on the front counter), face it, and turn to hand the dish over the counter. Between orders they wipe down. Malay stalls are run by a makcik or a pakcik, prata and briyani stalls by Indian Muslim hawkers, most others by Chinese aunties and uncles (`hawkerwork.js`).
- **Callouts.** When you order, the hawker calls it back in the stall's language, with a speech bubble that gives the words, how to say them and what they mean: Hokkien at most Chinese stalls (一盤白雞飯, chi̍t pôaⁿ pe̍h-koe-pn̄g), Cantonese for wanton mee, roast meat and claypot rice, Mandarin for a few newer dishes, Malay at Malay and Indian Muslim stalls (Roti prata kosong satu) and for kopi codes (Kopi-O Kosong Peng), Tamil for thosai. Each line was checked word by word against Wiktionary and Malay, Hokkien and Cantonese dictionaries (`callouts.js`, with the links). The clips are generated on the GPU by `tools/voices` (Singapore Hokkien by A*STAR's MERaLiON model, the rest by OmniVoice), in the hawker's voice: an auntie, an uncle, a young woman or man. The wok and the kopi being poured play from field recordings.
- **People.** With People on Lifelike (the default in Soft and Real), everyone in the customer mode has human proportions (`humans.js`): about 1.66 metres with an eighth of that for the head, hips, knees and elbows that bend, hands, shoes, a face with eyes and brows, glasses and beards where the look has them, hair (short, long, bun, ponytail, curly) or headwear (tudung, songkok, turban, cap, sun hat), and clothes from the regulars' looks: short or long sleeves, shorts, trousers, skirts and sarongs, long tops. They walk with knees bending through the stride and arms swinging, carry trays with both forearms out, sit on the stools with their knees under the table and lift food to their mouths, and hawkers work at their counters. Riders wear their app's colour and cap. The crowd is drawn as shared instanced parts, and only the people the camera can see are drawn (about 0.3 ms a frame for 300 people). On Classic (the default in Cartoon) the same crowd uses the kitchen's chunky people instead, with the same walking, carrying, sitting and working.
- **Food.** Dishes come on lathe-turned plates and in bowls with a rolled rim and a blue line, as they are served: rice with its grains showing, noodles as strands in their sauce or their soup, sliced chicken and char siew with skin or glaze on top, glossy soup with oil on it, fried eggs, leafy greens, cucumber, prawns in segments, satay with peanut sauce. Noodles and soups come with chopsticks and a porcelain spoon, rice with a spoon and fork, and hot bowls steam. Kopi comes in a cup on its saucer, iced drinks in a glass with ice. All of it is in `foodkit.js`, shared by the kitchen and the customer mode, and the Soft and Real looks give rice, sauce, skin and soup their own shine.
- **The hall up close.** Lightbox signs per menu with the Chinese name under the English one where stalls usually show it (海南鸡饭, 炒粿条, 饮料), a number plate under each sign, a menu board on the back wall with the era's prices (with dish photos in the Real look), a pay-by-QR stand on today's counters, glass cases for roast meat, woks, soup pots and kopi urns, and the hawker working to one side. People walk with swinging arms and legs, carry trays out in front, and eat at the tables.
- **Sound.** A loop of food court chatter, plates and woks from field recordings (Freesound, credited in `media/audio.json` and the pause menu), at the music volume.
- **The crowd.** Diners queue (famous stalls draw long queues), chope tables, share them, eat and leave; riders collect orders; cleaners clear tables. Everyone follows paths on a half-metre grid. Neighbouring buildings fade when they stand between you and the camera.
- **Code.** `floorplan.js` (the layout and path finding, no Three.js), `walk.js` (the customer mode's rules, the guide's next step and Go, no DOM), `walkview.js` (drawing it with the kitchen's renderer and tiers: merged stalls, a sign and a menu board texture per menu, instanced tables and people, three cameras), `walkui.js` (the screens, the camera controls, the guide). Tests: `walk.test.js`, where one bot plays the whole thing at five centres across all four eras, and another follows nothing but the guide and Go at seven centres (including Newton's horseshoe and Our Tampines Hub inside a mall).

## Centres that look like themselves

Nineteen famous centres have a profile in `data/hawker-centre-profiles.json` (from archive research: what each looks like, what it is known for, and its history, all with sources). Cooking at one of them (a Passport stop, the Centre Manager, the nearest-centre finder, or a link like `?at=lau-pa-sat`) builds that centre around your stall from a small kit:

| Archetype | Centres |
|---|---|
| Open-sided pavilion, long pitched roof | Maxwell, Newton, Chomp Chomp, Adam Road, Geylang Serai (tiered kampung roof), Zion Riverside, Changi Village, Whampoa |
| Floor of a multi-storey complex | Chinatown Complex, Old Airport Road, Tekka (wet market behind), Amoy Street, Hong Lim, Golden Mile, Albert Centre |
| Market and food centre | ABC Brickworks |
| Art deco | Tiong Bahru Market, among its 1930s flats |
| Open-air by the sea | East Coast Lagoon Food Village |
| Victorian cast-iron octagon with a clock tower | Lau Pa Sat, with satay grills smoking on the side |

Each centre gets its own roof, column and sign colours, its name on the fascia (lit after dark), table colours where the profile gives them (Chomp Chomp's yellow, Hong Lim's turquoise, ABC Brickworks' orange), its time of day (Newton, Chomp Chomp, Golden Mile and Lau Pa Sat at night, Amoy Street and Maxwell at CBD lunch, Tiong Bahru and Tekka in the morning), and what lies beyond (CBD towers, HDB blocks, shophouses, the sea, the river). In the Centre Manager the time follows the session. The choices are our reading of each profile's description, in `centrelook.js`; centres without a profile get a building from the year NEA gives, and every centre built after 1960 is shown as street stalls in the 1950s. `?look=octagon&time=night` previews any archetype.

**Famous dishes.** At a profiled centre, its famous dishes come up more often in the orders, the Centre Manager starts it with the stalls that sell them (and customers favour them, with the reason in the "why"), and the finder picks the matching stall. Dishes added for this, each with a sourced card: chilli crab (with mantou), fish soup, biryani, lor mee, rojak, bak chor mee, BBQ chicken wings, popiah, goreng pisang, cheng tng and thosai, plus soya sauce chicken as a roast meat rice variant. A second batch covers what Maxwell, Chinatown Complex, Golden Mile, Newton and Chomp Chomp are known for: Fuzhou oyster cake, claypot rice (on a charcoal grill, slowest dish in the game), black pepper crab, and sugarcane juice from a new sugarcane press station (hold Chop, like the ice shaver). Recipe book cards say where a dish is famous, with the source.

**From the archives.** `bun scripts/hawker-archive-facts.ts` turns the dated facts in `docs/research/hawker-archives.md` into `data/hawker-archive-facts.json`. Together with each profile's history, they appear as a tip when a round starts, in the pause menu, on Passport stops and as notes in the recipe book, picked for the era, the dishes and the centre, each with a source link.

**Photos.** NEA's own photo of a centre (the PHOTOURL field in its dataset, kept by `scripts/fetch-hawker-centres.ts`) shows on the Centre Manager card and the Passport stop as "Photo: NEA, via data.gov.sg", linked from NEA's site rather than copied. Lau Pa Sat is not in NEA's list, so it shows a Wikimedia Commons photo from its profile, credited with its licence; photos the profiles mark "check before reuse" are skipped.

## Finding things: hints

The lightbulb button (or H, or the pause menu) cycles Hints: Off, Labels and Guide. New players and the first two passport stops start on Guide; everyone else on Labels; your choice is remembered.

- **Labels** float a name and icon over every crate and station. Neighbouring stations of one kind share a label, labels stay on screen, and they fade whenever a chef walks behind one.
- **Guide** adds, for each of your chefs, an arrow over the next useful step and a dotted path to it, worked out from the oldest tickets and what that chef is holding (raw chicken goes to the pot for steamed and the grill for roasted, a finished plate goes to SERVE). The stations the oldest ticket needs pulse, and two chefs are not sent for the same thing. The status line spells the step out: "Next: Fry it in the wok".
- **Tap a part on a ticket** (or hover with a mouse) to ping its crate and stations; the camera slides over if one is hidden under the tickets.
- **Icons** are the same on tickets, crate fronts, labels and the "Holding" line, with small marks for how a part is cooked. Crate lids are coloured by food group in the Okabe-Ito palette, which stays distinct for common colour blindness, and always come with an icon and a name.

A test follows the guide and nothing else, and serves orders at every stall, solo and in pairs.

**Autoplay.** Add `?autoplay` to the address (`/hawker/?autoplay`, or with `&at=lau-pa-sat`) and the chefs on this device cook by themselves, following the guide the way that test does. It is an attract mode for a screen at the booth, and how the demo video's kitchens were filmed (`video/`).

## Graphics

Settings has Auto, Low, Medium and High. Auto starts phones on Medium, very slow devices on Low and computers on High, and steps down if the frame rate drags; a chosen tier stays. Each tier also has a pixel budget (about 1, 2.4 and 4.6 million pixels), so a large high-density screen draws fewer pixels rather than slowing down. The customer mode follows the same tiers: shadows and their size, and on High the crowd casts shadows too.

**Look** (Settings, the pause menus, and the customer mode's picker) is separate from the tier and applies to every 3D mode, the kitchen and the customer mode alike, and can be changed mid-round:

- **Cartoon:** the game's own look, toon shading and ink outlines.
- **Soft:** physically based materials in the same plain colours, lit like a photograph (a neutral room light for reflections, neutral tone mapping), no outlines.
- **Real:** photographed materials on everything that is tagged with what it is made of: terrazzo and ceramic floors, glazed wall tiles in the stalls, brushed steel, worn wood, marble table tops, concrete columns, plaster ceilings, asphalt roads, canvas awnings. They are CC0 textures from ambientCG and Poly Haven (`media/textures/`), box-projected in world space so a three metre counter and a stool get tiles of the same size. Outdoors the light comes from a real sky (a CC0 HDRI for day, dusk or night, `media/hdri/`), which also shows softly behind the customer mode; indoors a neutral room light keeps steel and tiles bright. Menu boards in the customer mode get dish photos.

**People** (Settings, the pause menus, and the customer mode's picker) picks how everyone is built, in the kitchen and the customer mode:

- **Match the look** (the default): Cartoon gets the classic people, Soft and Real the lifelike ones.
- **Classic:** the game's first people, chunky and round headed, the way the kitchen began. In the customer mode the crowd, the hawkers and you are classic too, a little bigger than life so they read from above, sitting and walking with the same poses.
- **Lifelike:** human proportions with knees and elbows that bend (`humans.js`). In the kitchen they are a little under life size, so the stall still reads from above.

Any people setting goes with any look, so classic people in the Real hall or lifelike cooks in the Cartoon kitchen both work. Changing it mid-round sets the stall or the hall up again. The choice is stored as `makan-people`.

The look is in `realism.js`: builders tag materials with `mat(colour, { surface: "steel" })` and the file turns the toon materials into physically based ones after a scene is built, so every builder keeps working and a converted material can be turned back.

- **All tiers:** finished plates turn into the real dish (chicken rice with its cucumber, laksa in a bowl, ice kachang with its syrups), woks throw flames and the grill spits while cooking, kerosene lamps flicker, fans turn, regulars eat from steaming bowls and look about, and the far side of the hawker centre has its own stalls (shophouses and palms in the 1950s).
- **Medium and High:** soft shadows, contact shadows under counters, tables and people, a rim light, and haze over the far side of the hall.
- **High:** a gentle bloom on lamps, flames and signs, and colour grading per era: sepia for the 1950s, warm for the 1980s, clean today, cool for 2065. This part loads only when High is first used, as its own small file.

## The Hawker Passport

| Era | Stop | Mentor (fictional) | Dish | Why this place (sources on the stop) |
|---|---|---|---|---|
| 1950s | Maxwell Market (Maxwell Food Centre) | Uncle Hock | Chicken rice | Opened 1929; added cooked food stalls around 1929 to 1930 (Roots) |
| 1950s | Seng Poh Road Market (Tiong Bahru Market) | Ah Mui | Chwee kueh | Opened 1951 for the new Tiong Bahru flats (Roots) |
| 1950s | Hoi How Road, off Beach Road | Pak Hassan | Satay | The first Satay Club (Wikipedia) |
| 1970s to 80s | Newton Food Centre | Uncle Chua | Oyster omelette | Opened 1971; took in Glutton's Square hawkers (Roots) |
| 1970s to 80s | Chinatown Complex | Auntie Wong | Popiah | Built 1981; about 300 street hawkers moved in, October 1983 (Roots) |
| 1970s to 80s | Tekka Centre | Uncle Basheer | Biryani | Stallholders moved into this building in 1981 (Roots) |
| Today | Old Airport Road Food Centre | Auntie Grace | Lor mee | On the old Kallang Airport estate (Roots) |
| Today | Geylang Serai Market | Cik Aminah | Nasi padang | Rebuilt 2006 to 2009 like a kampung house (Roots) |
| 2065 | Tampines North Hawker Centre (still being built) | Nisha, your apprentice | Chicken rice | NEA, SFA |

Every stop that can be is at a profiled centre that existed in its era; each stop card shows NEA's photo of the centre, what it is known for today, and a fact from the archives. Stamps from the earlier version of the trail carry over. The Satay Club stop is a documented street spot with an approximate position. All 129 dots on the map come from NEA's Hawker Centres dataset, coloured by when each centre was first built, with an ink ring round the 86 that are HDB blocks or have HDB flats on their building (`data/hawker-hdb.json`); the map is URA's Master Plan 2019 planning area boundaries. Checked on 11 October 2026 against NEA's list of 17 August 2026: every centre on it is on the map, and every position is within 29 m of OneMap's point for its postal code. Tap a centre to see NEA's year and stalls and its HDB block, with "Makan here" (the customer mode at that centre) and, when the server runs, a link to the block's Block Birthday page. Stamps, the apprentice's name and the recipes you pass on are saved in your browser.

## Playing together

**Same wifi, or Tailscale, or any address friends can reach.** Start the server so other devices can reach it:

```sh
HOST=0.0.0.0 bun run dev
```

Host and pick "Same wifi". When the page is opened on localhost, the QR code points at the computer's wifi address. When it is opened any other way (a LAN IP, a Tailscale name, a tunnel), the QR code points at that same address. The server only relays messages; the host's browser runs the kitchen, the helpers included.

**Online.** Pick "Online" when hosting. Browsers connect directly with WebRTC through [Trystero](https://github.com/dmotz/trystero), so it also works from the static GitHub Pages build. It needs a secure page (https or localhost), so it is switched off on plain http addresses like `http://aibox:3000`. Some strict office or school networks block peer to peer connections; same wifi is the safe choice for a live demo.

## Phones and tablets

- Landscape and portrait both fit the whole kitchen. Portrait works; the game suggests turning sideways for a bigger kitchen.
- Two players can share one tablet: each gets a stick and buttons on their own side.
- Tickets scroll sideways, the page never scrolls or zooms while you play, and a full screen button appears where the browser supports it.
- The screen stays awake during a round where Screen Wake Lock is available (it needs https, so not over plain http).
- Phones start on Medium graphics (pixel ratio up to 1.5, smaller shadows, fewer particles) and drop to Low on their own if the frame rate drags.
- Labels and tickets are sized for phones; on short screens, tap a ticket to open it, then tap a part to see where it comes from.

## GitHub Pages

Data snapshots, refreshed with `bun scripts/fetch-hawker-centres.ts` and `bun scripts/fetch-hawker-map.ts` (data.gov.sg rate-limits; the scripts wait and retry):

- `data/hawker-centres.json`: NEA Hawker Centres (data.gov.sg dataset d_4a086da0a5553be1d89383cd90d07ecd), 129 centres with name, address, position, original completion year and cooked food stalls.
- `data/hawker-singapore.json`: URA Master Plan 2019 Planning Area Boundary (No Sea), simplified to about 1,200 points.

The game is published with the rest of Common Ground: `bun run build` writes the whole site to `site/` (the game in `site/hawker/`, its media and voices beside it in `hawker-media/` and `hawker-voices/`, the stall radio's playlists in `data/soundtrack.json`), and `.github/workflows/pages.yml` deploys it on every push to `main`. Turn it on once in the repo: Settings, Pages, Source: GitHub Actions. All paths are relative, so it works from a subfolder like `https://you.github.io/repo/`; `bun run preview` serves `site/` that way to try it. On Pages the game hides same-wifi mode (no server) and plays online; the stall radio plays the archive recordings straight from the Internet Archive, and its 2065 songs include those sealed in the radio on the same browser. Memories and lent voices stay in the browser.

## Photos, menus, videos and the rest (`media/`)

Gathered on 8 October 2026 and kept with the game, so it works offline. Each folder has a manifest with the source, author and licence of every file. The Bun server serves the folder at `/hawker-media/`, and the Pages workflow copies it to the same path.

| Manifest | What | Where it shows |
|---|---|---|
| `photos.json` | 56 Wikimedia Commons photos (CC BY, CC BY-SA, CC0, public domain): every profiled centre, close-ups of stalls, menus, tray returns, choping and queues, and old street hawkers (about 1880 to 1974) | the customer mode's picker and end card, Passport stops and Centre Manager cards (a local copy before the Commons link) |
| `dishes.json` | 47 dish photos cropped square (no free photo of cheng tng) | order sheets, menu boards in the Real look, the recipe book |
| `menus.json` | 76 real stalls at the 19 profiled centres with dated, sourced prices; 64 prices from the 1800s to 2025; 25 menu board conventions | real prices on order sheets, the famous stall's real name, "What it cost" in the recipe book |
| `videos.json` | 45 YouTube videos, each checked with YouTube's oEmbed: a walk-through of every profiled centre, hawkers cooking, history and today | play in a dialog from youtube-nocookie.com; nothing loads from YouTube until someone presses play. Videos are embedded, never downloaded |
| `textures.json`, `hdri.json` | 11 CC0 texture sets (ambientCG, Poly Haven) and three CC0 skies | the Real look |
| `audio.json` | four food court recordings and two kitchen sounds from Freesound (CC0 and CC BY 4.0, with the required credit lines) | the customer mode's sound |
| `loops.json` | short silent loops of the work behind 33 dishes (charcoal under kaya toast, the cleaver through poached chicken, gula melaka over shaved ice, the fan over satay, the wok over the flame), cut by `bun scripts/make-dish-loops.ts`, each with its source, author, licence, the seconds used and where it was filmed when the source says. 16 are Singapore stalls filmed by SETHLUI.com and shared on Wikimedia Commons (CC BY 3.0, cropped clear of their subtitles and watermark, and credited as cropped and looped); 16 are Pexels footage filmed elsewhere in Southeast and South Asia (satay in Indonesia, roti in Thailand), said in the caption; one is CC0 from Commons (a sugarcane press in Cambodia). Commons has no free footage of teh tarik, satay or char kway teow in Singapore. No loop yet for duck rice, carrot cake, mee rebus, bak kut teh, yong tau foo, kueh, lor mee, rojak, cheng tng, claypot rice, nasi lemak, prawn noodles, mee goreng, soya bean milk or popiah: no free footage of them exists on Commons, Pexels, Pixabay or Flickr (searched twice, October 2026), so they need filming at stalls with the hawkers' agreement (`docs/dish-loops-shot-list.md`; a loop's source can be a local `file` in `data/loops-raw/`). Stored as VP9 WebM and H.264 MP4 at 480 by 360 rather than GIFs: the same three seconds of satay is 4.9 MB as a GIF and 217 KB as an MP4 | recipe book cards (under Then, Now, Later), over the customer mode's order sheet for the stall's dish, and on the next Passport stop. They play only while on screen, not at all for someone who asks for less motion until they tap, and a tap pauses one |

Some photos are approximations, said in their captions: the Fuzhou oyster cake was photographed in New York, the soya bean milk and sugarcane juice are generic glasses, and no recording is labelled as a hawker centre (the nearest are food courts in Singapore and Kuala Lumpur). NewspaperSG pages could not be read without accepting its terms, so the old prices come from Roots, SingStat and news retrospectives.

## Files

```
eras.js       the four eras: looks, prices, rules, sourced intro cards
chefs.js      playable chefs, hired help and era regulars, plus small SVG portraits
people.js     Three.js people built from those looks
campaign.js   the Hawker Passport: stops, mentors, quizzes, the story
passport.js   the passport screen and map
phrases.js    verified customer and chef lines, voice personas, the glossary, speakableLines()
voices.js     plays a line: lent recording, generated clip, device voice, or words on screen
voicebank.js  lend your voice: recording, and storage on the server or in IndexedDB
guide.js      the next step for each chef, worked out from a snapshot (no DOM, tested)
centre.js     the Centre Manager's model: customers, money, hygiene, events, succession (no DOM, tested)
profiles.js   the centre profiles: famous dishes, history, photos, matched to NEA's list
centrelook.js how a centre looks: archetype, colours, time of day, backdrop (no Three.js, tested)
centrekit.js  the building kit that draws it
archive.js    food-culture facts from the archives, for tips, stops and the recipe book
centreui.js   the Centre Manager's screens
hints.js      the Hints setting and the floating labels
icons.js      one icon set for tickets, crates and labels, plus the food groups
dishes3d.js   finished dishes as they look on the plate
post.js       bloom and colour grading, loaded only on High
memories.js   the living archive (server or browser)
dishes.js     ingredients, dishes, variants and recipe book cards, with sources
levels.js     the fourteen stalls, drawn as text
sim.js        the kitchen rules: cooking, drinks, fire, throwing, chaos, money, riders (no DOM, tested)
delivery.js   delivery apps, their colours, commission and sources
floorplan.js  the customer mode's centre layout and path finding (no Three.js, tested)
walk.js       the customer mode's rules: queues, choping, eating, the crowd (no DOM, tested)
walkview.js   draws the customer mode (three cameras); walkui.js runs its screens, controls and guide
centrelist.js the centre pickers' list: URA regions, orders, search, keeping the scroll
realism.js    Cartoon, Soft or Real for every 3D mode: materials, textures, sky light, tone mapping
humans.js     people, lifelike or classic, with poses, as an instanced crowd or one person with joints; the People setting
hawkerwork.js what each hawker is doing for the dish they make: where they stand, their tools, flames and steam
callouts.js   what the hawker calls out when you order, in the stall's language, with sources
foodkit.js    bowls, plates, cups, glasses, rice, noodles, sliced meat, soup, eggs, greens, cutlery, steam
media.js      the photos, menus, videos, textures and sounds in media/, and their credits
loops.js      the dish loops (media/loops.json): played while on screen, paused on a tap or for less motion
hdb.js        which centres are HDB blocks, the flats on them and the blocks round them (data/hawker-hdb.json)
videomodal.js plays a YouTube video in a dialog
helpers.js    hired help: one job each, simple rules, path finding on the tile grid
economy.js    profit and loss for the hour, with sourced costs
render.js     Three.js view of a snapshot; models.js and textures.js build everything from code
net.js        LAN (WebSocket) and online (Trystero) transports behind one interface
api.ts        the WebSocket relay, memories, postal codes and the voice bank on the Bun server
soundtrack.js the stall radio, one playlist per era (with soundtrack-api.ts)
input.js      keyboard, up to 4 gamepads, touch sticks and buttons
audio.js      sound effects made with Web Audio
main.js       menus, sessions, HUD, kopi builder, tutorial, results, recipe book
ENGINES.md    why Three.js, and when to pick Babylon.js or Godot instead
```

Tests: `bun test apps/hawker` (every dish and variant in every stall is cooked and served end to end, plus helpers, kopi matching, fire, chaos, riders and the money; a player who only follows the guide; the spoken lines, particles, personas and glossary; a customer who chopes, queues, eats and clears up at five centres in four eras).

## Related work

[Hawkernomics](https://www.hack.gov.sg/2025/hawkernomics/), from Hack for Public Good 2025, is a game about the money side of running a stall. Makan Nation borrows that lens for its profit and loss, and is mostly about the cooking, and about keeping the dishes and their stories going.
