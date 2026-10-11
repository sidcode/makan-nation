# Dish loops: what to film at the stalls

Makan Nation shows a short silent loop of the work behind each dish (the recipe book, the customer mode's order sheet, the Passport). 33 dishes have one, cut from openly licensed footage. The other 15 have none because no free footage of them exists: in October 2026 Wikimedia Commons, Pexels, Pixabay and Flickr (every licence that allows cropping) were searched for each one, including Malay and Indonesian spellings. And 17 of the 33 were filmed outside Singapore, or the source does not say where. The only way to fill the gaps is to film them at stalls, with the hawkers' agreement.

## Before you film

- **Ask first, every time.** Something like: "I'm making a game about hawker food for a makeathon. Can I film your hands making this for ten seconds? It will be in the game and online, with your stall's name." Ask in their language if you can. If they say no, or hesitate, thank them and move on.
- **Film hands, tools and food,** not faces. Keep customers out of the frame.
- Write down the stall, the centre, the date and that the hawker agreed. It goes in `loops.json` (see below).
- Buy something. It is their lunch rush you are standing in.

## How to film

- Landscape, phone held still (rest your elbows on the counter), no zoom while recording.
- 10 to 20 seconds of one gesture repeated, in one take. The loop uses about 3 seconds of it, so a steady repeat (tossing, ladling, rolling) is better than one big moment.
- Keep the action in the middle three quarters of the frame. The loop is cropped to 4:3 and shown at 480 by 360.
- Sound does not matter; the loops are silent.

## The 15 with no loop yet

| Dish | What to film | Where it happens |
|---|---|---|
| Braised duck rice | The cleaver going through a braised duck on the block, or braising sauce ladled over the rice | Teochew braised duck stalls |
| Carrot cake | Radish cake cubes on the flat pan, egg poured over and chopped in with the spatula (white), or the sweet black sauce going in (black) | Fried carrot cake stalls |
| Nasi lemak | Rice scooped onto a banana leaf, sambal spooned on, the packet folded | Malay nasi lemak stalls, mornings |
| Mee rebus | Noodles and bean sprouts lifted out in the wire basket, then the thick gravy ladled over | Malay noodle stalls |
| Bak kut teh | Peppery soup ladled from the big pot over pork ribs in a bowl | Bak kut teh shops and stalls |
| Yong tau foo | The chosen pieces cut with scissors and blanched in a basket in the soup | Yong tau foo stalls |
| Prawn noodles | Noodles blanched in the basket, then the dark prawn broth ladled over the halved prawns | Prawn mee stalls |
| Mee goreng | Yellow noodles tossed in the wok with the red sauce, the ladle scraping the wok | Mamak and Indian Muslim stalls |
| Kueh | Ondeh-ondeh rolled in grated coconut, or kueh lapis cut into pieces | Kueh stalls, mornings |
| Soya bean milk | Hot soya milk ladled from the big pot into a cup or bag | Soya bean and beancurd stalls |
| Lor mee | The thick dark gravy ladled over the noodles, then black vinegar and garlic | Lor mee stalls |
| Rojak | Fruit, vegetables and youtiao tossed by hand in the bowl with the black prawn paste sauce, peanuts on top | Rojak stalls |
| Popiah | A skin laid out, filled with stewed turnip and rolled; or skins made by dabbing a ball of dough on a hot plate | Popiah stalls; a skin maker in Joo Chiat |
| Cheng tng | The bits spooned into a bowl and the syrup ladled over | Dessert stalls |
| Claypot rice | Claypots over the charcoal, lids lifted, dark soy sauce drizzled in | Claypot rice stalls (slow: they cook to order) |

## Filmed elsewhere, worth replacing with Singapore footage

Satay (Indonesia), prata (Thailand), murtabak (Indonesia), nasi padang (Indonesia), wanton mee (Indonesia), oyster omelette (Taiwan), pisang goreng (the Philippines), sugarcane juice (Cambodia), and ice kachang, laksa, char kway teow, chilli crab, black pepper crab, biryani, sambal stingray, chicken wings and curry puffs (place not stated). Teh tarik, the drink everyone pictures, has no loop at all; the drinks loop is kopi poured over ice.

## Adding a clip

1. Copy the original into `data/loops-raw/` (git ignores this folder, as phone clips are big; keep the originals backed up).
2. Add an entry to `apps/hawker/media/loops.json`, with the seconds you want in `segment` (about 3 seconds) and an optional `crop` (`w:h:x:y` in source pixels; the default is the centre at 4:3):

```json
"popiah": {
  "file": "popiah.mp4",
  "poster": "popiah.jpg",
  "shows": "A popiah skin filled with stewed turnip and rolled up.",
  "segment": [4.0, 7.0],
  "source": {
    "site": "own",
    "file": "data/loops-raw/popiah.mp4",
    "author": "Your name",
    "licence": "CC BY 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by/4.0/",
    "filmedAt": "the stall's name, the centre's name, Singapore",
    "consent": "The hawker agreed on 12 October 2026"
  }
}
```

3. Run `bun scripts/make-dish-loops.ts popiah`. It writes `popiah.webm`, `popiah.mp4` and `popiah.jpg` into `apps/hawker/media/loops/`, crossfading the end into the start so it loops without a jump.
4. Open the recipe book card for the dish and check the loop and its caption ("Video: your name, CC BY 4.0. Filmed in ...").
