# Common Ground prototypes

Five Culture × Tech prototypes for the Common Ground makeathon in Singapore, led by **Makan Nation**, a co-op hawker kitchen across four eras that celebrates Singapore as a nation proud of its food and hawker culture. The radio, the Kopi Compiler and Block Birthday all feed into it. Each one reads a slice of Singapore culture in three tenses: what the archives kept, what we do with it now, and what we leave for later. See [HANDOFF.md](HANDOFF.md) for the full handoff (how everything works, data, decisions, known issues and next steps) and [IDEAS.md](IDEAS.md) for the thinking behind them and six more ideas that are ready to pick up.

| Route | Prototype | What it does |
|---|---|---|
| `/radio` | Time Capsule Radio | One dial from 1905 to 2065: old 78s, Rediffusion dialect dramas, live Singapore radio, and songs sealed for the future |
| `/kopi` | Kopi Compiler | Kopitiam orders as a programming language |
| `/block` | Block Birthday | Every HDB block has a birthday, and blocks by a hawker centre walk you into it |
| `/musication` | Musication | How music rhymes across cultures and decades, including Ed Sheeran's twelve notes argument |
| `/hawker` | **Makan Nation** (the highlight) | A co-op hawker kitchen in 3D. Cook the classics together before the queue loses patience |

## Run it

You need [Bun](https://bun.sh) 1.3 or newer. Nothing else.

```sh
bun install
bun run dev
```

Then open http://127.0.0.1:3000. The dev server reloads when you save a file.

To show it on phones over the same wifi, run `HOST=0.0.0.0 bun run dev` and open your laptop's IP address on the phone. Change the port with `PORT=4000`.

### On GitHub Pages

The whole site is static first, so it can live on GitHub Pages:

```sh
bun run build      # writes site/: the lobby, each prototype in its own folder, data, voices and media
bun run preview    # serves site/ under /common-ground/, the way Pages serves a project site
```

`.github/workflows/pages.yml` runs the tests, builds and publishes `site/` on every push to `main` (repo Settings, Pages, Source: GitHub Actions). Every link is relative, so it works at `https://<user>.github.io/<repo>/`. The Bun server only adds extras a static host cannot do: LAN rooms for Makan Nation, a shared wishes board, sealed songs and memories everyone sees, lent voices, and quick local copies of slow archive recordings. On Pages, online play goes peer to peer and the things people add stay in their own browser.

### Phones over Tailscale

Keep the server on `127.0.0.1` and let Tailscale serve it to your tailnet over HTTPS:

```sh
sudo tailscale serve --bg 3000   # once; it stays on across restarts
tailscale serve status           # shows the https://<machine>.<tailnet>.ts.net address
sudo tailscale serve reset       # turn it off
```

HTTPS matters on phones: the Kopi Compiler's copy button, the game's online mode, keeping the screen awake and recording voices for Makan Nation's voice bank only work in a secure context. Only devices on your tailnet can reach it.

If you would rather keep `bun run dev:lan` and skip `tailscale serve`, give the server a certificate and it also listens on https:

```sh
sudo tailscale set --operator=$USER   # once, so tailscale commands work without sudo
tailscale cert --cert-file .certs/server.crt --key-file .certs/server.key <machine>.<tailnet>.ts.net
bun run dev:lan                       # now also on https://<machine>.<tailnet>.ts.net:3443
```

`TLS_CERT`, `TLS_KEY` and `HTTPS_PORT` override the defaults. `.certs/` is git-ignored.

## Data

Archive data is saved in `data/` so the demo starts instantly and keeps working on bad venue wifi. Refresh it with:

```sh
bun scripts/fetch-radio.ts                # 78s, Rediffusion, live station list, record label thumbnails
bun scripts/fetch-radio.ts --offline      # also save the 78s now and wait for it (not committed)
bun scripts/fetch-radio.ts --offline-all  # and the Rediffusion episodes too (about 140 MB more)
bun scripts/seed-capsules.ts              # the example songs sealed in the radio's future band
bun scripts/fetch-block.ts                # HDB block list from data.gov.sg
bun scripts/fetch-hawker-centres.ts       # NEA's 129 hawker centres for the Hawker Passport
bun scripts/fetch-hawker-map.ts           # URA planning area outlines for the Passport map
bun scripts/hawker-archive-facts.ts       # archive facts for Makan Nation, from docs/research/hawker-archives.md
bun scripts/fetch-hawker-footprints.ts    # building outlines of the 129 centres and their neighbours, from OpenStreetMap
```

The footprint fetch asks the public Overpass API politely (pauses, backs off on errors) and can take hours when it is busy; `--cache <dir>` keeps the raw answers so a rerun takes seconds. Outlines are © OpenStreetMap contributors, under the ODbL.

**The 78s and the Internet Archive.** The archive can be very slow (we measured 5 to 17 KB/s per connection, less than a record needs to play), so streaming a 78 live can take half a minute to start. The dev server fixes this on its own: in the background it saves a 30 second clip of every 78 and Rediffusion episode into `data/cache/radio`, then the full 78s. The radio plays the best copy it has: full record, then the clip on a loop, then the archive. Downloads resume after a restart. Leave the server running for a while the day before the demo. `RADIO_CACHE=off` turns this off and `RADIO_CACHE=all` also saves the full Rediffusion episodes.

What needs the internet on the day:

- **Radio:** live stations and song previews. The 78s too, until the background cache has them.
- **Block Birthday:** postal code lookup and song previews. Block and street search works offline.
- **Musication:** song search for Record DNA. The scale player works offline.
- **Kopi Compiler:** nothing.

Things people add on the day (sealed songs, block wishes, hawker memories) are written to `data/capsules.json`, `data/block-wishes.json` and `data/hawker-memories.json`. All are git-ignored, so delete them to reset the demo.

## Playing Makan Nation

- **Hawker Passport.** The campaign. You start as an apprentice at a 1950s street stall and work through nine stops to 2065, on a map of NEA's real hawker centres. A mentor introduces each stop's dish, a one-question quiz after the round earns a stamp, and at the end you choose which recipes to pass on. A postal code finds your nearest centres.
- **Makan at a hawker centre (customer mode).** Walk any of NEA's 129 centres, in any era, as a customer: chope a table with a packet of tissue, queue with the GrabFood and foodpanda riders, order a kopi in kopi code, carry your trays back, eat, and clear up the way that era did. Real building outlines from OpenStreetMap and NEA's stall counts; the inside is arranged by the game. Older eras have their own rules from the archives: a street of pushcarts in the 1950s, and hawkers who kept tables for their own customers in the 1980s. Most centres are HDB blocks, and the estate round them is real: the HDB blocks nearby stand at their real height with their block numbers painted on, on their void decks, and the flats built over Chinatown Complex, Albert Centre, Hong Lim and others rise above the roof.
- **Centre Manager (Advanced).** Run one of NEA's 129 real hawker centres for 14 days, breakfast, lunch and dinner. Cook any session yourself (solo or co-op) or let it run, and between sessions set menus and prices, order stock that spoils, hire help, pay rent and cleaning, and pair retiring hawkers with apprentices before their dishes leave the centre. Every number has a "?" that explains it, and the screen lists which rules are game simplifications. Rents, tray return rates and the succession scheme come from NEA and other sources linked in the game.
- **Menus.** 48 dishes and drinks across 14 stalls, each with a menu board priced in its era's money and a sourced recipe book card. Many cards loop a few seconds of the work behind the dish (the pull, the fan over the charcoal, the wok over the flame), from credited free footage.
- **Famous centres look like themselves.** 19 well known centres, from Maxwell and Newton to Tekka and Lau Pa Sat, have their own building, sign, colours, time of day and surroundings, and their famous dishes come up more often. Try `/hawker?at=lau-pa-sat` or `/hawker?at=newton-food-centre`, then Free play. History tips come from Singapore's archives (see [docs/research/hawker-archives.md](docs/research/hawker-archives.md)).
- **Pick your chef.** Eight cooks from across Singapore's communities, each with a one-line bio. Customers and helpers dress for their era.
- **Orders in six languages.** Customers speak Singlish, Malay, Mandarin, Cantonese, Hokkien or Tamil. Each ticket shows the phrase, how to say it, what it means, and a button to hear it where the device has a voice. Takeaway and chilli requests change what you build.
- **Leave a memory.** After a round you can write a short memory about a dish. It goes into the recipe book and comes back as something a customer says in later rounds. On the server these live in `data/hawker-memories.json`.
- **Rojak meter.** The results screen shows whose recipes you cooked: Hainanese, Hokkien, Teochew, Malay, Indian Muslim, Peranakan and more.
- **Hints.** The lightbulb button (or H) switches between Off, Labels (a name tag over every crate and station) and Guide (an arrow, a path on the floor and a "Next:" line for each chef, plus pulsing stations for the oldest ticket). Tap a part on a ticket to find where it comes from.
- **Voices.** Customers greet, order, thank and complain in six languages, with a glossary in the recipe book. Each line plays the best voice available: a recording someone lent in the voice bank, then a pre-generated local clip (see [tools/voices](tools/voices/README.md)), then the device's own voice. Microsoft Edge has Singapore English voices; Android does not.
- **Graphics.** Low, Medium and High, picked automatically and changeable in the menu. High adds bloom and per-era colour grading.
- **Pick an era and a stall.** Five-foot way (1950s), first hawker centres (1980s), today, or SG100 (2065). Each era changes the look, prices, a kitchen rule and the music on the stall radio. Stalls open up as you earn stars. You can hire help for one job each (washer, slicer, wok or rice cook, kopi uncle and more); their wages and the rent come out of your takings, and every round ends with a profit and loss, inspired by [Hawkernomics](https://www.hack.gov.sg/2025/hawkernomics/).
- **Keyboard.** Chef 1: WASD to move, E to grab or drop, hold Space (or Q) to chop, wash or cook, Left Shift to dash, F to throw. Chef 2 on the same keyboard: arrows, / to grab, . to chop, Right Shift to dash, comma to throw. Up to four gamepads work too.
- **Phones and tablets.** Play here gives you a stick and Grab, Chop, Dash and Throw buttons. Tablets have a two-players-on-one-screen mode.
- **Kopi.** Drink orders arrive in kopitiam code, like `kopi-o kosong peng`. Build the drink at the urn; each ticket links to the Kopi Compiler to explain the order.
- **Friends on the same network.** Host, then friends scan the QR code or type the four-letter code. Start the server with `bun run dev:lan` so other devices can reach it (this also covers your tailnet, e.g. `http://<machine>:3000/hawker`).
- **Online, no server.** Host and pick Online. Players connect peer to peer through Trystero; this needs https (GitHub Pages, or `tailscale serve`). `.github/workflows/pages.yml` publishes the whole site to GitHub Pages when you push, since GitHub Actions cannot run a live game server. Strict office or school networks may block peer to peer connections.
- Engine choice and trade-offs: [apps/hawker/ENGINES.md](apps/hawker/ENGINES.md).

## Tests

```sh
bun test
```

## Layout

```
site.ts            the static site's shared files: data files, voices, media (built and served the same way)
server.ts          the dev server: the same layout as the static site, plus the server extras under /api/
lobby/             the landing page (/ on the site)
apps/<name>/       each prototype (/<name>/ on the site): index.html, style.css, JS, data.ts for its data files,
                   and api.ts for server extras
shared/fonts.css   self-hosted fonts (Fraunces, Bricolage Grotesque, VT323, DM Mono)
scripts/           data fetchers, build-site.ts and preview-site.ts
data/              saved archive data
```

Pages link to each other and to shared files relatively (`../kopi/`, `../data/radio.json`), never from the root, so the site works under any subpath.

Each prototype only touches its own folder, so you can lift one out for the day.

## Sources and credits

- Internet Archive: the [Great 78 Project](https://great78.archive.org/) and other 78rpm uploads, plus a community upload of Rediffusion Singapore recordings
- [radio-browser.info](https://www.radio-browser.info/) for Singapore stream addresses
- iTunes Search API for 30 second song previews
- [data.gov.sg](https://data.gov.sg/) HDB Property Information and [OneMap](https://www.onemap.gov.sg/) search
- Wikipedia, NLB Infopedia and other sources linked inside each prototype

The archive recordings stream from the Internet Archive or play from your local cache. They are not redistributed in this repo.
