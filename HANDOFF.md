# Handoff: Common Ground prototypes

Everything built for the Common Ground makeathon (Singapore, Culture × Tech track), how to run it, how it fits together, what is real and what is simplified, and what is left to do. Read this first; [README.md](README.md) is the short version and [IDEAS.md](IDEAS.md) holds the pitch thinking.

## The short version

- **Five prototypes behind one Bun server**, with **Makan Nation** as the highlight: a co-op, Overcooked-style hawker kitchen in 3D across four eras of Singapore, plus a customer mode where you walk any of NEA's 129 hawker centres at lunch. The other four prototypes feed it (the radio plays on its stall radio, the Kopi Compiler writes its drink orders, Block Birthday links blocks with hawker centres to it).
- **One toolchain:** Bun for everything web. uv only for the optional voice generator, which needs an NVIDIA GPU.
- **Offline friendly:** archive data is saved in `data/`, photos, menus, textures and recordings in `apps/hawker/media/`, and the old radio recordings are cached locally in the background, because the Internet Archive is very slow from here. Only the YouTube videos need the internet.
- **Not a git repo yet.** Nothing has been committed, and GitHub Pages needs a repo. See [Open decisions](#open-decisions-for-you).
- **State on 11 October 2026 (evening):** `bun test` 106 pass; the whole site builds as a static site for GitHub Pages (`bun run build`), and the Kopi Compiler speaks every order in a local voice (see the newest log entry); every mode played through in headless Chromium, and the customer mode and kitchen checked by hand in a visible Chrome (mouse look, pointer lock, views, about 135 fps); not yet tried on a real phone, and the new voices and sounds not yet listened to. The [current state](#current-state-9-october-2026) section below is the snapshot to start from, and the newest [session log](#session-log-newest-first) entry says what changed last.

## Quick start

```sh
bun install
bun run dev        # http://127.0.0.1:3000, reloads on save (the game is at /hawker/, and so on)
bun run dev:lan    # the same on every network interface, for phones on wifi or your tailnet
bun test           # all tests (Kopi Compiler and Makan Nation), about 30 seconds
bun run build      # the whole site, static, in site/ (for GitHub Pages)
bun run preview    # serves site/ at http://127.0.0.1:4000/common-ground/, the way Pages would
```

On this machine (`aibox`), with `bun run dev:lan`, phones on the tailnet open **http://aibox:3000** (or `http://aibox.tail0780a9.ts.net:3000`, or `http://100.117.211.70:3000`). Note that `0.0.0.0` also exposes it on the home wifi address. Bun's hot reload sometimes misses edits (new files especially); stop the server and start it again if a change does not show.

Some browser features only work over https on a phone (microphone for the voice bank, peer to peer online play, keeping the screen awake, the copy button). Two ways to get https on the tailnet:

1. `sudo tailscale serve --bg 3000`, then https://aibox.tail0780a9.ts.net (tailnet only; `sudo tailscale serve reset` turns it off).
2. Run `sudo tailscale set --operator=$USER` once, then `tailscale cert --cert-file .certs/server.crt --key-file .certs/server.key aibox.tail0780a9.ts.net`. `server.ts` notices the files and also serves https on port 3443. `TLS_CERT`, `TLS_KEY` and `HTTPS_PORT` override the defaults.

Neither has been done yet; both need sudo once.

## Current state (9 October 2026)

### Makan Nation's modes

| Mode | What you do | Main files |
|---|---|---|
| **Free play** | Pick an era and one of 14 stalls and cook 3 minute rounds. One or two chefs on a keyboard, up to four gamepads, or touch. | `sim.js`, `levels.js`, `render.js`, `main.js` |
| **Host / Join** | Up to four players: LAN rooms through the server with a QR code, or Online peer to peer (needs https). | `net.js`, `api.ts` |
| **Hawker Passport** | Nine stops from a 1950s street stall to 2065 on a map of NEA's centres, with mentors, sourced quizzes and stamps. | `campaign.js`, `passport.js` |
| **Centre Manager** (Advanced) | Run a real centre for 14 days: menus, prices, stock, helpers, rent, cleaning, events, succession. Any of NEA's 129 or Lau Pa Sat. | `centre.js`, `centreui.js`, `centrelist.js` |
| **Makan at a hawker centre** (customer mode) | Walk any of NEA's 129 centres in any era as a customer: chope, queue, order, eat, clear up. | `floorplan.js`, `walk.js`, `walkview.js`, `walkui.js` |
| **Recipe book** | A sourced card per dish (past, present, future) with a photo, what it cost then and now, and cooking videos; a glossary; player memories. | `dishes.js`, `main.js`, `media.js` |

### The customer mode, as it stands

- **Picking a centre:** all 129 in a scrolling list with URA region chips, four orders (famous first, A to Z, most stalls, oldest), the planning area on each card, and search by name, street or area. Then View, Look and People, an era, and a photo and walk-through video of the real centre. Building outlines are real (OpenStreetMap); the inside is arranged by the game in hawker centre patterns, and the game says which is which.
- **Four eras:** a 1950s street of pushcarts (nobody chopes, the hawker clears up), the 1980s (no choping, some tables belong to a stall and its hawker shoos you), today (tissue choping, tray return, GrabFood and foodpanda riders), 2065 (labelled guesses).
- **Three views:** Above, Behind and Eyes (first person). V cycles them. Mouse look with pointer lock, drag to look on phones, a gamepad's right stick.
- **The guide and Go:** the card says the next step, a dotted path and ring show where, and Go (G, Space, the touch button) walks you there and joins the queue. The big map (M) walks you to a tapped stall, table or tray return.
- **The lunch rush:** parties of one to four, about 93% of tables busy today, long queues at the famous stall, diners hovering with trays. When nothing is free the guide takes you to a table that is nearly done and counts it down (Almost done, Getting up, Free! Chope it).
- **Hawkers and callouts:** each hawker does the work of the dish being made (wok with flames, blanching, cleaver, pulling kopi, prata, satay fan, ice shaver, rojak, rice) at the right station, and calls your order back in the stall's language with a speech bubble and a generated clip.
- **Order sheet and end card:** dish photos, number keys, era prices, the real stall's dated price where we have it, cooking videos; the end card has what you spent and queued, a photo, a video and an archive fact.

### Settings that apply to every 3D mode

All are in Settings and the pause menus; Look and People are also steps in the customer mode's picker. Each is remembered in localStorage.

| Setting | Choices | Stored as | Notes |
|---|---|---|---|
| Graphics | Auto, Low, Medium, High | `makan-gfx` | Auto starts phones on Medium and steps down if the frame rate drags. Each tier has a pixel budget. The customer mode's crowd is thinner on Medium and Low. |
| Look | Cartoon, Soft, Real | `makan-look` | `realism.js`. Cartoon is toon shading with outlines; Soft is physically based and lit like a photo; Real adds CC0 textures box-projected in world space, light from a real sky outdoors (also shown behind the customer mode at dusk and night), and dish photos on menu boards. Changes mid-round without a rebuild. |
| **People** (new on 9 October) | Match the look, Classic, Lifelike | `makan-people` | `humans.js`. Classic is the game's first chunky cooks and customers; Lifelike has human proportions with bending knees and elbows. Match the look (the default) gives Cartoon the classic people and Soft and Real the lifelike ones, which is how it behaved before the setting existed. Any combination works. Changing it rebuilds the crowd or the stall. |
| Hints | Off, Labels, Guide | `makan-hints` | The kitchen's guide. H cycles. |
| Guide path | on, off | `makan-walk-guide` | The customer mode's dotted path (pause menu). |

The customer mode also remembers its view (`makan-walk-cam`), era, centre and list order.

### Media and voices

- `apps/hawker/media/` (22 MB, credited file by file in its manifests, served at `/hawker-media/`): 56 Commons photos, 47 dish photos, 76 real stalls with sourced prices plus 64 historical prices, 45 YouTube videos (embedded from youtube-nocookie.com, never downloaded), 11 CC0 texture sets, three CC0 skies, six recordings. Gaps (no cheng tng photo, no recording labelled as a hawker centre, no NewspaperSG prices) are in `apps/hawker/README.md`.
- `data/hawker-voices/` (9.9 MB): 855 generated clips for 570 lines, 537 of them hawker callouts (dishes and the 475 most common kopi codes). Hokkien by MERaLiON, the rest by OmniVoice. Singlish still needs consenting human voices.

### Performance

Measured in headless Chromium on this machine's integrated Radeon: 60 fps (vsync) in every view and look at Maxwell, and at Chinatown Complex (226 stalls, about 1,300 people) with far people in a lighter mesh and only people in view drawn. A path search takes about 0.3 ms at Maxwell and 1.2 ms at Chinatown Complex. The customer mode steps 60 times a second and draws between steps, so movement is even at any refresh rate.

### Checked and not checked

- **Checked:** `bun test` (92 pass). Scripted playthroughs through the real UI in headless Chromium: Maxwell today in Eyes and Real, Smith Street as a 1950s street, Chomp Chomp in the 1980s in Behind and Soft, Old Airport Road in 2065, Newton on a 390 px touch phone; Free play, Passport, Centre Manager, Recipe book, Settings and Host in each look; the static build with Real textures; both People builds in the customer mode and switching between them from the pause menu.
- **Not checked:** a real phone or tablet over https, sound by ear (callouts, ambience, synths), mouse pointer lock in a visible window (the user's Chrome tab reports itself hidden, which pauses the game loop), and Classic people in the kitchen in Soft and Real by eye at phone size.

## Session log, newest first

### 11 October (evening): local kopi voices, and the whole site ready for GitHub Pages

The user asked for the Kopi Compiler's speech to sound more local, listened to samples and picked the Malay uncle and the Singapore auntie, then asked for the project to be structured for hosting on GitHub Pages.

**Kopi Compiler voices**
- It used to read orders with the browser's voice: en-SG if there was one, otherwise any English, which on the user's Chrome meant US English. It now plays generated clips (`apps/kopi/voice.js`), the same keys as Makan Nation's drinks callouts.
- `tools/voices/kopi.py` (new) voices every order the Kopi Compiler can make with built-in words (`data/kopi-voice-lines.json` from `scripts/kopi-voice-lines.ts`: 1,880 orders, "Da Bao" ones included, plus "Two" to "Five"). Each voice is one steady speaker, cloned from a reference take in `refs-synthetic/kopi-<voice>.wav`. Samples of four ways were played to the user (Malay uncle, Malay auntie, Singapore auntie, the game's existing per-order clips); they picked **malay-uncle** and **sg-auntie** as the most local. 3,768 clips were made (none skipped, 0.8 to 2.6 seconds, 32 kbps, 28.6 MB) in about two hours on the RTX 5090. The data drive had to be mounted first.
- The Rush screen now asks "Who reads the orders out loud": Uncle, Auntie or Nobody (remembered); Shout it always speaks. With no clip (words taught on the device), it falls back to a Singapore or Malaysian English, Malay or Indonesian device voice, never US or UK English, and otherwise says "No local voice here".
- Makan Nation's drinks stall picks clips by persona, so its uncles and aunties now also use these.
- **Checked:** headless Chromium on both the dev server and the static build: "kopi-o kosong peng", "kopi siew dai da bao", "two teh-o" ("Two", then "Teh-O", same voice) and "milo dinosaur" play the right clip in the chosen voice. **Not checked:** by ear beyond the user's samples; the full set has not been listened to.

**GitHub Pages** (details in [GitHub Pages and the site layout](#github-pages-and-the-site-layout))
- `bun run build` builds the whole site, the lobby and all five prototypes, into `site/` (78 MB); `pages.yml` replaces `hawker-pages.yml` and publishes it all. `bun run preview` serves it under `/common-ground/` like a project site.
- Each app lives at `/<app>/` on the dev server too (old addresses redirect, keeping their query), and every link and fetch is relative (`../kopi/`, `../data/radio.json`, `../hawker-voices/`), including the lobby's and the apps' links to each other.
- Server data routes became static data files (`site.ts`, with each app's `data.ts`): HDB blocks, years, block to hawker centre links, song previews (now saved: `data/song-previews.json`, 96 of 98), radio stations (labels moved to `radio-labels/`), capsules and the stall radio's playlists (before, the game's old Pages build had no stall radio at all).
- OneMap and iTunes are called from the browser (both allow it); Block Birthday matches OneMap's address to its block list itself.
- Server extras stay under `/api/` (LAN rooms, shared wishes, capsules, memories, lent voices, local archive copies) and `data/site.json` tells pages whether they exist, so Pages never asks for them. Without them, wishes and sealed songs stay in the browser and say so; the 2065 stall radio adds songs sealed on the same browser. The game's "Common Ground" back link now shows on static sites too, since the lobby is there.
- Removed: the `/api/block/{blocks,years,hawkers,postal,song}`, `/api/radio/stations`, `/api/songs`, `/api/hawker/postal` and `/api/hawker/soundtrack` routes, and the old `/media/radio/labels/` path.
- **Checked:** `bun test` 106 pass. A headless walk of every page on both the static preview (under a subpath) and the dev server: the lobby's links and hero, the Passport with its rings and Block Birthday link, the customer mode opened from a block link, a Kopi Compiler clip, Block Birthday by postal code (live OneMap) with a song preview and a wish, the radio's stations and labels, Musication's search (live iTunes). No failed requests and no console errors on either. **Not checked:** an actual GitHub Pages deploy (no repo yet), Safari, and sealing a song on the static site by hand.

### 11 October (late afternoon): the Passport map checked against NEA, HDB centres marked on it

The user asked whether the hawker centres on the Passport map are accurate, then whether the HDB ones could get their own marker, linked to Block Birthday.

- **The map is accurate.** `data/hawker-centres.json` matches NEA's live dataset on data.gov.sg exactly (re-downloaded today; NEA last updated most records in March 2026). Against NEA's own list of 17 August 2026 (`nea.gov.sg/docs/default-source/hawker-centres-documents/list-of-hcs_-17-august-2026.pdf`, 107 markets and hawker centres plus 16 new ones), every listed centre is on the map; the map's six extras are the five still being built (Yew Tee, Chong Pang, Telok Blangah, Tanglin Halt, Tampines North) and the Bukit Timah interim centre, which is open but not on NEA's list. Every position is within 29 m of OneMap's point for the centre's postal code (most exactly on it). The news agrees with the statuses: Yew Tee now opens in the second half of 2027 (Lianhe Zaobao, August 2026, citing an NEA tender), Chong Pang in 2027, and the old Chong Pang, Telok Blangah and Tanglin Halt centres are still on NEA's list as open.
- **Two quirks of NEA's data, left as they are:** Tiong Bahru Market has no completion year (the map colours it built before 1990 by default, which is right; its card now says "NEA gives no year"), and an HDB block's completion year is often the year of a rebuild (Old Airport Road: built 1973, HDB says 2007).
- **HDB centres:** NEA's list says which centres' common areas Town Councils keep (80, all in HDB estates). All 80 are among the 82 centres the game already matches to HDB blocks (the other two are Marsiling Mall and Kampung Admiralty), so no HDB hawker centres were missing. Not on the map: 17 HDB blocks HDB marks as markets that NEA does not run (`otherMarketBlocks` in `data/hawker-hdb.json`, mostly in newer towns), and HDB coffeeshops, which are not hawker centres.
- **The Passport map now marks them** (`passport.js`): an ink ring round the 86 centres that are HDB blocks or have HDB flats on their building (the same set as the customer mode's HDB filter), with a legend entry, while the fill still shows the era. The HDB data loads on demand when the Passport opens and the map redraws once.
- **Tap a centre:** a tap picks the nearest centre within about 14 px (so the small dots work on phones), rings it in blue and fills a line under the map with its name, NEA's year and stalls, and its HDB block (with HDB's year, marked as a rebuild where NEA's is older). "Makan here" opens the customer mode with that centre picked; "Blk 51's birthday" opens its Block Birthday page (server only, as in the customer mode's picker). Tapping a numbered stop also fills the line, as well as scrolling to the stop's card. The legend is now in era order (it listed "Still being built" first).
- **Checked:** `bun test` 106 pass. Headless Chromium at 1366 and 390 px: 86 rings and the legend, taps on Chinatown Complex, Newton, Tampines North, Tiong Bahru, Holland Village and Old Airport Road give the right lines and links, Makan here opens the customer mode with Old Airport Road picked, no sideways scroll, no console errors. On a phone neighbouring centres are a few pixels apart, so a tap can pick a neighbour (the blue ring shows which). **Not checked:** by hand on a phone.

### 11 October (afternoon): dish loops, searched again; our own footage can go in

The user asked to start on the dish loops for the 15 dishes without one (next step 5).

- **No free footage of the 15 exists.** Searched again, more widely than on 9 October: Wikimedia Commons (every SETHLUI.com file, 31, read chapter by chapter; food and Singapore categories; full text for each dish and for Malaysian and Singapore food terms), Pexels and Pixabay (30 and 25 queries, run from inside the user's Chrome, since both block scripts), and Flickr (every licence that allows adaptation). What turned up was the wrong dish or the wrong place: Vietnamese fried spring rolls and lettuce rolls (not popiah), fried bee hoon (not mee goreng), soy milk poured in Moscow, a home cook's prawn noodles, a teacher showing model kuih. None were used, keeping the earlier rule that a dish has no loop rather than a misleading one. Nothing was added to `loops.json`.
- **One Singapore find, not used yet:** "The Lion City (Singapore)" on Commons (Jessica Drolet, 2013, CC BY-SA 3.0, from Vimeo) has about 15 seconds at Lau Pa Sat: the Street 4 sign and the cast-iron hall, har gow, kai lan, and satay sticks being eaten (34 to 42 s). It could replace the satay loop (grilling in Indonesia) with satay in Singapore, though it shows eating rather than the work. Cached as `data/cache/loops/The_Lion_City_28Singapore_29.webm`. The user has not decided.
- **Our own footage can go in now:** a loop's `source` can have `file` (a path from the repo root, normally `data/loops-raw/<dish>.mp4`, git-ignored because phone clips are big) instead of `fileUrl`, plus `site: "own"` and a `consent` note; `make-dish-loops.ts` reads it like a download, and the caption drops the source link and "cropped and looped" for own footage. Tested with a stand-in clip through a scratch copy of the script.
- **`docs/dish-loops-shot-list.md`** (new): how to ask a hawker, how to film (landscape, still, 10 to 20 seconds of one repeated gesture, hands not faces), what to film for each of the 15 dishes, the 17 loops worth replacing with Singapore footage, and the `loops.json` entry to add.
- **Checked:** `bun test` 106 pass; the caption for a Commons loop and for an own-footage entry, rendered with a minimal element helper. **Not checked:** an own-footage loop in the browser (there is none yet).

### 11 October (later): portrait phones, the way judges hold them

Resumed from this file. The rename's one unchecked item is done: the lobby and the game's home screen at 390 and 360 px in the user's Chrome (in a same-size iframe, since the window would not resize), with no sideways scroll. Then the demo's join flow on a phone, which showed the kitchen's HUD fighting the thumbs in portrait.

- **Status lines on portrait phones** (`style.css`, `layout()` in `main.js`): they used to hang under the kitchen and ran under the stick and buttons (at 360×640 the Holding line sat under the stick ring). They now sit just above the thumbs (198 px up), and `layout()` keeps a band for them between the kitchen and the buttons (bottom inset 256 px, at most 40% of the height). Only the Holding line and the 5 second "turn the screen sideways" tip show there; the era and the radio line are hidden on portrait phones, as they already were on landscape phones.
- **The pause menu now repeats the era and the radio track** under its note, so phones that hide those lines still show them.
- **Compact tickets on short portrait phones** (740 px tall or less, so iPhone SE and 360×640 Androids, not a 390×844 iPhone): the tap-to-open tickets landscape phones already had. At 360×640 the ticket went from 262 px tall to 129 and the kitchen gained about 60 px. `compactTickets()` now uses the same media query as the CSS; before, any screen under 640 px wide took a first tap on a ticket part as "open the ticket", which did nothing visible on tall phones.
- **Centred overlays wrapped at half the screen width on phones:** the archive tip card, the round banner, the tutorial line, and the customer mode's prompt and toasts were placed with `left: 50%` and a translate, so they could only shrink-wrap into the right half and their `max-width: 92vw` never applied (the archive card was 178 px wide and very tall at 360 px). Each now has `width: max-content`. The archive card is centred with the `translate` property, so its rise animation no longer slides it sideways, and on portrait phones it sits left, clear of the Hints and Pause buttons, at 13 px.
- **Go in a crowd, measured:** a bot that presses Go like a player gave up 2 times in 2,406 presses over 32 full-crowd meals at eight busy centres (all finished), so the path finder was left alone.
- **Crate name tags no longer overlap:** the nudge pass in `hints.js` staggers the three crates in the rice and roast meat stall; that known issue is removed. On a portrait phone a staggered tag can sit a row away from its crate.
- **The user's Chrome tab still reports itself hidden** (`document.visibilityState` is "hidden", no animation frames), so the game loop pauses there; playthroughs ran in headless Chromium again.
- **Checked:** `bun test` 106 pass. Headless Chromium: the rice and roast meat kitchen at 360×640 and 390×844 (touch), 844×390 (touch, landscape) and 1366×800, measuring that the status lines end above the top of the buttons, that the archive card stops short of the Pause button, and that no tags overlap; the pause note; a desktop host and a 390×844 phone guest joining over LAN by code, picking a chef and cooking, with no console errors on either. **Not checked:** a real phone, and a portrait tablet with two players.

### 11 October: Makan Mania is now Makan Nation

The user renamed the highlight from Makan Mania to **Makan Nation**, to say that Singapore is a nation proud of its food and hawker culture, and that the game celebrates it.

- **Every mention renamed** (28 files): page titles and headings (`Makan <em>Nation</em>` in `lobby/index.html` and `apps/hawker/index.html`), the lobby's "feeds" lines, Block Birthday's links into the game, code comments, all docs (including the older entries in this log, so the old name no longer appears anywhere), the Pages workflow name, `tools/voices`, and the data scripts' User-Agent strings (`makan-nation-makeathon/0.1`). `grep -ri "makan.\{0,6\}mania"` finds nothing.
- **Hero screenshot** renamed to `lobby/makan-nation.jpg`. It shows only the kitchen, with no title in it, so it did not need retaking.
- **New copy for the theme:** the lobby's lede opens "Singapore is a nation that queues for its food, argues over the best chicken rice and saves a table with a packet of tissue. Makan Nation celebrates that hawker culture…"; the game's home lede opens "A nation proud of its food, one stall at a time."; both meta descriptions, and the intros of `README.md`, `apps/hawker/README.md` and `IDEAS.md`, say the same in a line. Follow this angle in any new copy.
- **Online play ID changed:** Trystero's `APP_ID` in `apps/hawker/net.js` is now `common-ground-makan-nation-v1`, so a tab loaded before the rename cannot join a host on the new build until it reloads. Saved settings (the `makan-…` storage keys) never had the old name in them and are unchanged.
- **Checked:** `bun test` 106 pass; `bun run dev` serves `/` and `/hawker` with the new name and the hero image loads. **Not checked:** the longer lobby lede at phone width in a browser.

### 9 October (late night): the centres on a map, and street-level views

The user asked to overlay the hawker centres on a map of Singapore and show street view imagery where possible.

- **Map** (`centremap.js`, loaded only when opened): the customer mode's picker has a List or Map switch (remembered as `makan-walk-view`). The map is Leaflet 1.9.4 (new dependency, BSD-2) on OneMap's base map tiles from the Singapore Land Authority (free with the credit shown), with URA's planning areas drawn from `data/hawker-singapore.json` on top; when the tiles fail (offline), the planning areas fill in as land so the island still shows. Every centre in the current search, region and HDB filter is a dot (gold famous, slate HDB block, brick the rest) with its name on hover; a click picks it and the details below update. Leaflet's stylesheet is linked from `index.html`.
- **From the street** (`streetview.js`): under the picked centre's photo, the nearest street-level photo on KartaView, from `data/hawker-streetview.json` (`bun scripts/fetch-hawker-streetview.ts`: up to three per centre, 360-degree panoramas first, then the nearest and newest, one per sequence; all 129 centres have one, 126 of them a 360-degree panorama first (a panorama within 100 m beats a closer flat photo), a median of 34 m from NEA's point (the furthest 110 m), shot 2018 to 2023). A panorama shows in a small three.js view: drag to look round, wheel to zoom, turning slowly until touched (not at all under reduced motion), and it starts facing the centre, worked out from the photo's compass heading and its bearing to NEA's point. The caption gives the distance, date, photographer and a KartaView link; images load from KartaView's servers (CC BY-SA 4.0, CORS open), so they need the internet. "Show Google Street View here" loads Google's own keyless embed (the one its Share, Embed a map makes) only when pressed, and "Open in Google Maps" links to the Maps URLs pano view. The panorama's WebGL context is released when the walk starts.
- Google Street View images are never copied or stored; Google's terms allow the embed and the link, not taking the pictures.
- **Checked:** `bun test` 106 pass (new `streetview.test.js`). In the user's Chrome: the map on OneMap's tiles with all 129 dots, a click on a dot picking Tanjong Pagar Plaza, its panorama turning and dragging (KartaView blurs faces), Google Street View loading in place, no console errors. In headless Chromium: the map and street view at 390 px (no sideways scroll), and the static Pages build. **Not checked:** the map with no internet by hand (the offline fill only kicks in when no tile loads at all), and Safari.

### 9 October (night): checked by hand, sounds that keep changing, local Singlish voices

The user brought the Makan Nation tab to the front in their Chrome ("done, check"), asked that sounds always change and never repeat, and that the accents in the chef mode sound local.

**Checked by hand in the user's Chrome** (the tab visible at last): pointer lock on a click in Eyes, mouse look both ways (down looks down), Esc letting go and opening the pause menu, the views from the pause menu, about 133 to 141 fps on High at Chinatown Complex in Real, the HDB panel and the BLK plate, a kitchen round with the new sounds, and no console errors. The browser's own voices there: US and UK English, Indonesian, Mandarin, Cantonese, no Singapore English, no Malay, no Tamil.

**Sounds that keep changing:**
- `audio.js`: every effect varies each time it plays (a few cents of pitch, length, loudness, a different slice of noise through a slightly different filter, a small random start), sits left or right where it happened in the kitchen (`panAt` in `main.js`), and melodic cues (order, done, serve, catch, the end-of-round arpeggio) pick a note, interval or key different from the last one.
- `ambience.js` (new): the hall's chatter on two decks that crossfade every 12 to 25 seconds, each time a recording not just heard, from a random point, a touch faster or slower. In the customer mode it scatters plate clinks, a distant cleaver and pours between; under the kitchen's stall radio it plays quietly (it was silent there before), and ducks with the music.
- The wok and kopi recordings in the customer mode start from a random point at a random speed for three to six seconds and fade out, instead of restarting from the top.
- The stall radio reshuffles on every pass and never starts a pass with the track that just played (it used to repeat its first shuffle forever).
- Voices: a line never plays the take it played last time, each play is a touch higher or lower and quicker or slower, and device voices vary their pitch and rate per line.

**Local accents in the chef mode:** the user's Chrome has no Singapore English, Malay or Tamil voice, so every Singlish line (customers' orders and reactions, and the chefs' "Aiyo, burnt!") was read in Google's US English voice: no Singlish clips existed.
- `tools/voices/singlish.py` (new) makes them with A*STAR's Singapore-trained Hokkien model and an English accent classifier (CommonAccent ECAPA: 16 accents, Singapore and Malaysia among them). It picks a synthetic Singapore voice per persona from takes of a Singlish passage, voices the lines with it (cloned in OmniVoice), judges the lines strung together (the classifier cannot judge one-second clips: short windows of a passage it calls Singaporean came out English or American), keeps three takes per line that Whisper hears the words in ("Mochilila" counts for "More chilli lah"), and gates: under 0.5 local, nothing is written. Scores in `data/hawker-voices/singlish-check.json`.
- Result: the auntie's lines scored 0.99 local and the young woman's 0.63 (91 takes). No man's voice passed, whatever was tried (60 candidate voices, particles written in Chinese characters for the Hokkien model, a lowered borrowed voice option is in the script but there was no male voice to borrow): best 0.16, heard as English or American. OmniVoice's default voice scored 0.00, heard as American, for every persona.
- So Singlish only ever plays in a local voice: `LANGS.en` now takes only a device's en-SG or en-MY voice, and men's Singlish lines show as words in the bubble (their speak button is disabled). A generated take never crosses sex: an uncle borrows a young man's take, played lower and slower, never an auntie's.
- `generate.py` now makes three takes per voice of the customers' orders and reactions in Malay, Mandarin, Cantonese, Tamil and Hokkien (1,205 clips, 14 MB, up from 855), and skips the odd empty take OmniVoice makes instead of crashing.
- The clips now load beside the page on the static Pages build too (`voiceUrl` in `voices.js`; the workflow copies `data/hawker-voices`); before, a static site only had device voices.
- The Voices screen says what is local: "Singlish: 91 generated clips in synthetic Singapore voices, no Singapore or Malaysian voice on this device, so a line without a local clip shows as words".

**Checked:** `bun test` 105 pass (new `audio.test.js`: no note or recording twice in a row; a routing test in `voices.test.js` against the real manifest). In the user's Chrome: the hall in the customer mode moving between recordings with plates in between, the kitchen's quiet hall bed, the Voices screen, a kitchen round with no console errors; the static build loading the voice manifest. **Not checked:** any of it by ear (nobody has listened to the new Singlish takes or the varied effects); Safari.

### 9 October (evening): HDB estates and dish loops

The user asked for tasteful GIFs showcasing the essence behind each dish, and for an homage to the many hawker centres in HDB blocks, with layouts from OSM or photos where possible.

**HDB estates** (`hdb.js`, `scripts/fetch-hawker-hdb.ts`, `data/hawker-hdb.json`; details in `apps/hawker/README.md`):
- 82 of NEA's 129 centres are HDB blocks, matched by NEA's block number and street to HDB's property data ("Blk 91/92" and "Blk 22A/B" included). Two have flats in the same block (People's Park, Kukoh 21).
- OSM address tags, fetched for the 2,534 buildings round the centres, match 1,034 of them to HDB blocks: their real storeys, completion year and homes. In the customer mode they stand at real height with the block number painted near the top of each end wall, an HDB facade with washing on poles, and void decks on pillars for blocks of flats. In the 1980s, blocks completed after 1989 are left out.
- A second Overpass pass finds flats and towers OSM maps on 14 centres' own buildings, as buildings or building parts (where both exist, the building stops where its parts begin): Chinatown Complex's 335A and 335B, Albert Centre's 271 from its third storey, Hong Lim's 538, Kampung Admiralty, Buangkok, Telok Blangah, and CapitaSpring over Market Street (drawn as a plain tower; OSM does not call it flats). From above they are a ghost; off the hall they stand on a podium.
- The picker tags HDB centres, filters to the 86 that are HDB blocks or under HDB flats, and shows an "In an HDB estate" panel for the picked one, with a link to its Block Birthday page when the server runs. Each centre's doors get a "BLK" plate.
- Block Birthday's `/api/block/hawkers` lists the centre each block is or stands within about 150 m of (1,025 blocks), and the block page links straight into the customer mode at that centre (`/hawker?makan=<NEA id>`, handled in `main.js`).
- Google Maps photos were not used: their terms do not allow reuse. The layouts come from OpenStreetMap (ODbL) and HDB's and NEA's open data.

**Dish loops** (`loops.js`, `scripts/make-dish-loops.ts`, `media/loops.json`):
- Two research passes looked for free footage: Wikimedia Commons and Pexels and Pixabay. Every clip used was checked frame by frame. 16 loops are Singapore stalls from SETHLUI.com episodes on Commons (CC BY 3.0), cropped clear of their subtitles and watermark and cut inside a single shot. 16 are Pexels clips filmed elsewhere (Indonesia, Thailand, Taiwan, the Philippines, or not stated), with the place in the caption. One is a CC0 sugarcane press in Cambodia. 15 dishes have none yet.
- They are short silent videos that behave like GIFs, not GIF files: the satay loop is 4.9 MB as a GIF and 217 KB as an MP4. Each comes as VP9 WebM, H.264 MP4 (for Safari) and a poster. They play only while on screen, wait for a tap under prefers-reduced-motion, and pause on a tap.
- Shown in the recipe book (under Then, Now, Later, with a note on where the footage comes from), over the customer mode's order sheet for the stall's dish, and on the next Passport stop.
- The server's `/hawker-media/` route now serves `mp4` and `webm` with byte ranges (Safari needs them).

**Also:** a colour bug for nested tower parts (they came out white) fixed; a GIF of any loop can be made from its MP4 with `gifski` if one is wanted for slides.

**Checked:** `bun test` 100 pass (new `hdb.test.js`: the data's ids and blocks, the well-known matches, the 1980s cut-off, block shapes, towers laid out with their outline). In headless Chromium: Chinatown Complex, Albert Centre and Old Airport Road from outside and from the ground, in Cartoon, Soft and Real; the picker at 1366 and 390 px; Block Birthday's links into the customer mode; the recipe book, order sheet and Passport loops playing; the static Pages build. **Not checked:** loops in Safari, and any of it by hand in your Chrome (the tab stayed in the background all session, which pauses the game loop).

### 9 October (later): dead NLB Infopedia links replaced

- All eight old Infopedia links (`eresources.nlb.gov.sg/infopedia/articles/SIP_...`) led to NLB's "Page Not Found" in Chrome; curl only gets a bot check (HTTP 202), so check NLB pages in a browser. Each now points to its new address (`www.nlb.gov.sg/main/article-detail?cmsuuid=...`), found by search and opened in Chrome to confirm the title: Satay Club, Glutton's Square, Hainanese chicken rice, chilli crab, fried Hokkien prawn noodles, Maxwell Food Centre, former Telok Ayer Market, The Quests. Changed in `docs/research/hawker-archives.md`, `data/hawker-centre-profiles.json` and `data/block-years.json`; `data/hawker-archive-facts.json` regenerated (only the links changed). `profiles.js` labels the new host "NLB Infopedia".
- Block Birthday said Shanty topped the charts "for 12 weeks"; its cited Infopedia article says over 10 weeks, so it now says "more than 10 weeks".
- `bun test`: 92 pass.

### 9 October: all 129 centres, a People setting, this snapshot

- **All 129 centres in the pickers:** the customer mode and the Centre Manager listed only ten centres until you searched. Both now show every centre in a scrolling list with region chips, orders, planning areas and search, and the list keeps its place when you pick (`centrelist.js`).
- **People setting:** the user liked the earlier, chunky characters as well as the lifelike ones, so both are kept and you choose (see the settings table above). `humans.js` gained `BUILDS` (lifelike and classic proportions), `PEOPLE`, `setPeople` and `peopleBuild`, and draws the classic body (big round head, short limbs) through the same instanced crowd and poses, so in the customer mode classic people walk, queue, carry trays, sit, eat and work the stalls the same way, drawn at 1.3 times their kitchen size (you at 1.45) so they read in a hall built to real scale. In the kitchen Classic is the original chef model. `people.js`'s `humanStyle()` now follows the setting instead of the look, and `walkview.js` and `render.js` rebuild when the build changes.
- **Daytime sky:** in Real the daytime HDRI showed behind open halls as a murky green. The sky now lights the scene by day but only shows as the background at dusk and night.

### 8 October: first person, Look levels, real resources, hawkers at work, the rush

The user asked to improve the customer mode's performance and usability, add a first-person view, add levels of realism to every mode, gather hawker centre photos, menus and videos, then play every mode and fix what was found; later, to remove jitter, make people and food more real, have hawkers act out the dish and call it back in the right accent, and make centres as crowded as they are at lunch.

- **Views and the guide:** Above, Behind and Eyes; `nextStep(w)` and `goToward(w, target)` in `walk.js`; a bot that only follows the guide finishes a meal at seven centres in all four eras.
- **Order sheet:** photos, number keys, "on your tray" (you could buy twice before), real dated prices, cooking videos.
- **Performance:** the customer mode uses the kitchen's tiers and pixel budgets, at most four path searches a tick, no per-frame DOM queries or allocations in the HUD and camera.
- **Jitter:** the customer mode used to step 30 times a second and draw 60 frames with no blending (measured 10.7 cm, 0, 10.7 cm, 0 a frame). It now steps at 60 and interpolates (5.3 cm every frame), the shoulder camera is fixed to you, people turn over a moment, standing still no longer gets you shoved, and the sun's shadow box moves in whole metres.
- **Fixes found by playing:** the joystick layer covered the order sheet on phones; quick taps on Go fell between frames; the tissue seller offered tissue you did not need; you could chope after eating; walking out at Newton stopped at the map's edge; the 1980s guide sent you to another stall's table; the picker printed "null"; Maxwell showed as "Kim Hua Market"; the camera faced sideways while ordering.
- **People and food:** `humans.js` (human proportions and joints, clothes and headwear from the regulars' looks) and `foodkit.js` (lathe-turned ware, rice grains, noodle strands, sliced meat, glossy soup, eggs, greens, prawns, satay, cutlery, steam).
- **Look levels** (`realism.js`): Cartoon, Soft and Real for every 3D mode. Builders pass `surface` to `mat()`.
- **Resources:** `apps/hawker/media/`, listed above.
- **Hawkers, callouts and the rush:** `hawkerwork.js`, `callouts.js` (checked word by word by a research pass against Wiktionary and dictionaries: ten corrections, all 79 links resolve; its note that Teochew, Hainanese or Fuzhou would suit some stalls better is not acted on, as there is no voice model for them), parties and table hovering in `walk.js`, and a faster path finder in `floorplan.js` (typed arrays, straight lines when clear, an octile estimate, greedy for the crowd). Tests check a rush leaves under 12% of tables free (16% in eras without choping) and that the guide bot still finishes at full crowd.
- In headless Chromium on the integrated GPU the WebGL context was lost once while a YouTube video played. The 3D view now pauses while a video is open and redraws its sky light if the context comes back.

### 7 October (afternoon): a customer mode and delivery riders

The user asked for a mode where you are the customer: explore a hawker centre, go to different stalls to buy different dishes, and chope a table with a tissue, for every hawker centre with accurate layouts across the ages and era-appropriate environments; and for GrabFood and foodpanda riders collecting food from the stalls.

**Makan at a hawker centre** (home screen button; `floorplan.js`, `walk.js`, `walkview.js`, `walkui.js`; details in `apps/hawker/README.md`):
- Any of NEA's 129 centres, any of the four eras. A makan list of two or three dishes from different stalls and a drink you have to say in kopi code. Chope, queue (from the end of the line), order at a sheet in the era's prices, carry trays to your table, sit and eat, clear up, walk out for a summary card with sources and an archive fact.
- **Layouts:** the building outline is the real one from OpenStreetMap (`data/hawker-footprints.json`, made by `scripts/fetch-hawker-footprints.ts`: 128 of 129 centres, 109 matched by name or address tags, 17 by containing NEA's point, 2 by nearest building; 119 high confidence, 7 medium, 2 low; Bukit Timah Market, still being built, has nothing mapped yet), neighbouring buildings too, and NEA's stall count. The inside is our arrangement in hawker centre patterns (rows facing aisles, back-to-back islands, side rows, cross aisles, doors on each side, extra doors cut into sealed pockets, outdoor seating for open-sided centres), aiming for about two tables a stall (real centres seat 11 to 14 a stall). Lau Pa Sat is radial with eight passages and its clock tower; Newton and Adam Road are horseshoes. The game says plainly which parts are real and which are arranged.
- **Eras, from new research** (added to `docs/research/hawker-archives.md`, now 56 dated facts, 59 in the tips file):
  - **1950s:** a street of pushcarts in front of shophouses when the centre was built later. Nobody chopes, the hawker clears up, and a tok tok mee hawker roves with his cart.
  - **1980s:** no choping yet; tissue choping is first in print in 2001. Free seating was the rule from 1982, but some tables belong to the stall beside them, with stools in its colour, and its hawker shoos you if your food came from elsewhere. People's Park switched last, in 1992. Contract cleaners clear the tables.
  - **Today:** choping with tissue, while others chope with umbrellas, name cards and plastic bags. Tiong Bahru Market and Our Tampines Hub have "Don't chope seats" house rules. 93% of diners return their tray, and GrabFood and foodpanda riders queue at the counters.
  - **2065:** labelled guesses, such as robot cleaners and solar roofs.
- **Odd outlines, handled and said out loud in the game:** centres on one floor of a mall or hub (Our Tampines Hub, Buangkok, One Punggol, Tampines North and others) get a hall sized for their stalls (60 m² a stall) round NEA's point, with the whole building drawn as a slab round it. Centres with less than 30 m² a stall in their outline (stalls on two floors, like Amoy Street, or a mapped part, like Bukit Batok West's 274 m²) are drawn bigger. Spare floor in "market" buildings is the wet market (NEA counts only cooked food stalls). Seating is capped at about 13 seats a stall.
- **Lau Pa Sat is not in NEA's list** (it is privately run), so it cannot be picked here; its radial layout is written (`LAYOUT_HINTS`) for when it is added with a sourced stall count.
- **Tests:** `walk.test.js` has a bot that plays the whole loop at Maxwell, Chomp Chomp (1980s), Old Airport Road (2065), Chinatown Complex as a 1950s street, and Newton. It also checks the crowd keeps moving and nobody walks through stalls, and that all 129 centres lay out in their real outline with NEA's counts, capped seating and every stall reachable.

**Delivery riders in the kitchen** (`delivery.js`): in today's era (about 18% of orders) and 2065 (22%, a guess), a GrabFood (green) or foodpanda (pink) rider comes for an app order. The ticket shows a coloured strip instead of a spoken phrase, the rider waits behind the hatch in a cap with an insulated bag, and the food must go in a takeaway box. A delivery commission line (30%, the rate Grab gave in 2020) appears in the profit and loss. There are no riders in the 1950s or 1980s. Deliveroo left Singapore on 4 March 2026, so it is not in the game.

**A kitchen fix found on the way:** a pot or wok now waits 7 seconds (not 2.2) for the rest of a dish when an open order wants the bigger dish and none wants the smaller one. Before, bee hoon for laksa turned into plain boiled bee hoon before the prawns arrived, and the guide bot could loop on it.

**Checked:**
- `bun test`: 90 pass.
- Screenshots in headless Chromium: Maxwell today (stalls, the order sheet, the whole hall from above), Chomp Chomp in the 1980s at night, Chinatown Complex as a 1950s street, Newton on a 390 px phone, the kitchen with two rider tickets and riders at the hatch, and real outlines at Maxwell, Tekka (irregular, with its wet market) and Our Tampines Hub (a hall inside the hub). No console errors in any of them.

**Not checked:**
- Frame rate on a real phone with a big centre. Chinatown Complex has 226 stalls and about 500 tables. Everything is merged or instanced, but it is untested on hardware.
- Sound by ear.

The dev server was restarted twice to pick up new files (hot reload missed them). It runs as `bun run dev:lan` again.

### 7 October: four missing dishes

Step 4 of the old next steps is done: the four dishes that had not mapped cleanly are in Makan Nation, each with a sourced recipe card (cards researched from Michelin, Lianhe Zaobao, NHB, Long Beach Seafood and others; every claim checked against its page).

| Dish | Stall | How it cooks |
|---|---|---|
| Black pepper crab | BBQ seafood and wings | Crab and black pepper sauce in the wok |
| Sugarcane juice | BBQ seafood and wings | A new **sugarcane press** station (`^` in kitchen maps): hold Chop, like the ice shaver. A "Sugarcane presser" helper can be hired for it |
| Claypot rice | Rice and roast meat (one sink became a second grill) | Claypot of rice, chicken and lap cheong on the grill, 12 seconds, the slowest dish in the game |
| Fuzhou oyster cake | Rojak, popiah and snacks (now with a chilli crate) | Oyster cake batter and oysters in the wok; comes with chilli orders |

Also: six new dated facts in `docs/research/hawker-archives.md` (Balestier's cane estate in 1838, Jalan Ampas in 1901, Long Beach Seafood in 1946 and its 1982 black pepper crab claim, Pang Siew Ting's oyster cakes in the 1960s, New Lucky Claypot Rice in 1971 and 1979), regenerated into `data/hawker-archive-facts.json`. Maxwell's oyster cake note in the profiles credited "1962" to Michelin, which only says "the 1960s"; it now says the 1960s and cites Seth Lui too. Recipe book facts with two sources no longer run the link names together. Adding these dishes does not change which stall any famous centre opens on. Voice lines are keyed by order modifiers, not dishes, so the new dishes needed no new clips.

Checked: `bun test` (83 pass, including the bot that cooks every dish and the guide serving every stall), the static Pages build, and screenshots of the three changed kitchens and two recipe cards in headless Chromium with no console errors. Not checked: how the new models read up close at phone size.

Older sessions (the kitchen, Passport, Centre Manager, the other four prototypes) are summarised in the reference sections below.

---

## What is here

| Route | Prototype | One line |
|---|---|---|
| `/` | Lobby | Makan Nation as the hero, the other four below with what each one feeds into the game |
| `/hawker/` | **Makan Nation** | Co-op hawker kitchen across four eras, a Hawker Passport campaign on real NEA data, and a Centre Manager mode |
| `/radio/` | Time Capsule Radio | One dial from 1905 to 2065: 78s, Rediffusion dialect dramas, live Singapore FM, songs sealed in a tin |
| `/kopi/` | Kopi Compiler | Kopitiam orders as a programming language |
| `/block/` | Block Birthday | Every HDB block has a birthday; lease countdown and wishes for its 99th |
| `/musication/` | Musication | How music rhymes across cultures, plus Ed Sheeran's "twelve notes" argument |

```
site.ts              the static site's shared files: data files, voices, media, labels (see below)
server.ts            dev server: the static site's layout plus the server extras under /api/, optional https
lobby/               landing page (index.html, style.css, makan-nation.jpg hero screenshot)
apps/<name>/         each prototype in its own folder; data.ts for its data files, api.ts for server extras
shared/              fonts.css (self-hosted, see the note below), favicon.svg
docs/                research/hawker-archives.md (sourced food history), dish-loops-shot-list.md
scripts/             data fetchers (`bun scripts/<name>.ts`), build-site.ts, preview-site.ts
tools/voices/        optional GPU voice generator (uv, Python)
data/                saved archive data, generated clips, and runtime files (some git-ignored)
.github/workflows/   pages.yml: tests, builds and publishes the whole site on GitHub Pages
```

Each prototype only touches its own folder, so any one can be lifted out (the Kopi Compiler borrows Makan Nation's voice clips from the shared `hawker-voices/` folder).

### GitHub Pages and the site layout

The site is static first, so it can be hosted on GitHub Pages; the Bun server only adds extras. `bun run build` (`scripts/build-site.ts`) writes `site/`, and `.github/workflows/pages.yml` runs the tests, builds and deploys it on every push to `main` (turn it on once: repo Settings, Pages, Source: GitHub Actions; the repo is not on GitHub yet).

```
site/index.html      the lobby
site/<app>/          each prototype, built by Bun with relative asset paths
site/data/           hdb-blocks, block-years, block-hawkers, song-previews, radio, capsules, soundtrack (.json)
site/hawker-media/   apps/hawker/media (photos, loops, textures, skies, recordings)
site/hawker-voices/  data/hawker-voices (MP3 clips and manifest.json)
site/radio-labels/   data/radio-labels
```

- **Relative links only.** A project site lives under `https://<user>.github.io/<repo>/`, so nothing links from the root: apps reach each other, the lobby and the shared folders with `../` (`../kopi/`, `../data/radio.json`, `../hawker-voices/`), the lobby with `hawker/` and so on. `bun run preview` (`scripts/preview-site.ts`) serves `site/` under `/common-ground/` to catch a root link.
- **One list of shared files.** `site.ts` lists the shared folders and the data files (made by each app's `data.ts` and `soundtrack-api.ts` from `data/`). The build writes them; `server.ts` serves them at the same paths, with apps at `/<app>/` (the old addresses without the slash redirect, keeping their query), so development looks like Pages.
- **Third parties straight from the browser.** OneMap (postal codes in Block Birthday and the Passport), iTunes search (sealing a song in the radio, Musication), radio-browser and the Internet Archive all allow it (checked: `Access-Control-Allow-Origin: *`).
- **Saved instead of searched.** The curated songs Block Birthday and the 1980s stall radio play have their previews saved in `data/song-previews.json` (`bun scripts/fetch-song-previews.ts`; 96 of 98 found, the other two fall back to Block Birthday's "Look it up" link).
- **Server extras, with a fallback.** Under `/api/` on the Bun server only: Makan Nation's LAN rooms (Pages plays online, peer to peer), memories and lent voices; Block Birthday's shared wishes board; sealing capsules for everyone; and the radio's local copies of slow archive recordings. Pages try `../api/...` and carry on without it: wishes, capsules, memories and lent voices stay in that browser (the page says so), and the 2065 stall radio adds songs sealed in the radio on the same browser. Probing a missing `/api/` route shows a 404 in the console on Pages; nothing breaks.
- **Size:** about 78 MB, mostly the voices (41 MB) and the game's media (30 MB); Pages allows 1 GB.

### A note on fonts

`shared/fonts.css` declares Fraunces and Bricolage Grotesque by hand with no `format()` hint and no `unicode-range`. Bun's bundler writes `format(woff2-variations)` without quotes and mangles `unicode-range`, which makes browsers drop the faces. Keep it that way unless Bun fixes this.

---

## Makan Nation (`/hawker`)

### What a player can do
- **Free play:** pick an era and a stall, cook 3 minute rounds. One or two chefs on one keyboard, up to four gamepads, or touch controls.
- **Host / Join:** up to four players. LAN rooms through the server (`/ws/hawker`, four letter codes, QR code), or **Online** peer to peer through Trystero (needs https).
- **Hawker Passport:** nine stops from a 1950s street stall to 2065 on a map of NEA's real hawker centres. A mentor introduces each stop, a sourced quiz earns a stamp, and at the end you choose which recipes to pass on.
- **Centre Manager (Advanced):** run a real NEA hawker centre for 14 days (breakfast, lunch, dinner): menus and prices, stock that spoils, helpers, rent, cleaning, tray return, events, and succession. If a retiring hawker has no apprentice, the stall closes and its dishes leave the centre.
- **Makan at a hawker centre:** be the customer at any of NEA's 129 centres in any era (see [the customer mode](#the-customer-mode-as-it-stands) above; full details in `apps/hawker/README.md`).
- **Recipe book:** a sourced card per dish (past, present, future) with a photo, prices then and now, and cooking videos, a glossary of the phrases customers use, and player memories.

### Controls
- Keyboard chef 1: WASD or arrows to move, E grab or drop, hold Space (or Q) to chop, wash or cook, Left Shift dash, F throw. Chef 2: arrows, `/`, `.`, Right Shift, `,`.
- Touch: floating stick plus Grab, Chop, Dash, Throw. Two players on one tablet is a mode.
- H cycles hints (Off, Labels, Guide).
- Customer mode: WASD to walk, E (or a click in Eyes) to use what you face, G or Space for Go, V for the view, M for the big map, Shift to hurry, + and − or the wheel to zoom, mouse look after a click (Esc lets go), number keys and Enter on the order sheet. Touch: a stick, drag to look, and Use, Go, Hurry and Map buttons.

### Systems and where they live

| Area | Files | Notes |
|---|---|---|
| Simulation | `sim.js`, `levels.js` | Pure data, no DOM, no Three.js. The host runs it; guests send inputs and draw snapshots. Kitchens are text layouts. |
| Dishes and menus | `dishes.js`, `dishes3d.js` | 48 dishes and drinks across 14 stalls, with variants (e.g. chicken rice steamed, roasted or soya sauce). Sourced recipe cards that also say which centres a dish is famous at. |
| Eras | `eras.js` | 1950s five-foot way, 1980s first hawker centres, today, 2065. Each changes look, prices, a kitchen rule and the music. Sourced intro cards. |
| People | `chefs.js`, `people.js`, `humans.js` | Eight playable chefs across communities (Teochew, Malay, Tamil, Sikh, Hokkien, Peranakan, Eurasian), helpers, and twelve kinds of regulars dressed for each era. No caricature. `humans.js` builds them as classic or lifelike bodies (the People setting), as an instanced crowd or one jointed person, with poses for walking, carrying, sitting, eating and eleven kinds of stall work. |
| Hired help | `helpers.js`, `economy.js` | AI helpers with one job each. Wages and rent come out of takings; the results screen shows a profit and loss, inspired by and credited to Hawkernomics. |
| Hints | `guide.js`, `hints.js`, `icons.js` | Off, Labels, Guide. The guide works out each chef's next step, draws an arrow and a path, and pulses what the oldest ticket needs. During the tutorial the tutorial leads (see `updateHints` in `main.js`). |
| Voices | `phrases.js`, `voices.js`, `voicebank.js` | Lines in six languages, each word checked on Wiktionary. Playback order: a human recording from the voice bank, then a pre-generated clip, then the device's voice, then a speech bubble. |
| Music | `soundtrack.js`, `soundtrack-api.ts` | Era playlists borrowed from the other prototypes (78s, Rediffusion and National Day songs, live FM, sealed capsules). |
| Passport | `campaign.js`, `passport.js` | Uses `data/hawker-centres.json` (NEA) and `data/hawker-singapore.json` (URA planning areas) for the map. Seven of the nine stops are real profiled centres from the right era (Maxwell, Tiong Bahru, Newton, Chinatown Complex, Tekka, Old Airport Road, Geylang Serai). |
| Famous centres | `profiles.js`, `centrelook.js`, `centrekit.js` | 19 profiled centres look like themselves: open pavilions, floors of multi-storey complexes, a market block, Tiong Bahru's art deco, East Coast Lagoon by the sea, and Lau Pa Sat's cast-iron octagon with a clock tower. Each has its own sign, colours, time of day and surroundings, and its famous dishes come up more often in orders. Other centres get a look based on NEA's opening year. `?at=<key>` (e.g. `?at=lau-pa-sat`, `?at=newton-food-centre`) preselects a centre and its famous stall for Free play; `?look=octagon&time=night` previews a building type. |
| Archive facts | `archive.js` | 59 dated food-culture facts (from `docs/research/hawker-archives.md`) plus each centre's history, shown as round tips, in the pause menu, on Passport stops and in the recipe book, never ahead of the round's era. NEA's own photo of a centre (hotlinked) or a credited Wikimedia Commons photo shows on Passport stops and Centre Manager cards. |
| Centre Manager | `centre.js`, `centreui.js` | Seeded, deterministic simulation; every number has a "?" that explains it. |
| Living archive | `memories.js`, `api.ts` | Players leave short memories about dishes; they come back as customer lines. Stored in `data/hawker-memories.json` (git-ignored), or localStorage in the static build. |
| Networking | `net.js`, `api.ts` | One interface, two transports: LAN WebSocket relay, and Trystero peer to peer. Everything from the network is validated. |
| Rendering | `render.js`, `models.js`, `textures.js`, `post.js` | Three.js, low-poly. Low, Medium, High tiers picked automatically; High lazy-loads bloom and colour grading. |
| Look | `realism.js` | Cartoon, Soft, Real for every 3D mode. Builders tag materials with `mat(colour, { surface })`; `realise()` converts a built scene and can turn it back. |
| Food | `foodkit.js`, `dishes3d.js` | Shared ware and food parts, used by the kitchen's plates and the customer mode's trays and tables. |
| Customer mode | `floorplan.js`, `walk.js`, `walkview.js`, `walkui.js`, `centrelist.js` | Layout and path finding (no Three.js), the rules, the crowd and the guide (no DOM), drawing with three cameras, and the screens. Fixed 60 Hz steps with interpolation. |
| Hawkers and callouts | `hawkerwork.js`, `callouts.js` | What each hawker does for each dish (station, tools, flames, steam), and what they call out, in which language, with sources. |
| Media | `media.js`, `videomodal.js`, `media/` | Photos, menus and prices, videos, textures, skies and recordings with their credits; YouTube in a dialog. |
| Input and sound | `input.js`, `audio.js` | Keyboard, gamepads, touch. All sound effects are generated in code. |

Server extras in `apps/hawker/api.ts`: `/api/hawker/lan`, `/ws/hawker`, `/api/hawker/memories`, `/api/hawker/voices` (voice bank); the postal code finder asks OneMap from the browser. `soundtrack-api.ts` makes the stall radio's playlists (`data/soundtrack.json`) and serves `/hawker-voices/` and `/hawker-media/` with byte ranges in development.

### Engine choice
Three.js, measured against Babylon.js and PlayCanvas (130 KB vs 406 KB vs 619 KB gzipped for a minimal lit scene). A grid kitchen needs no physics engine, and Three.js bundles cleanly with Bun. The full comparison, including when Babylon would be the better pick, is in [apps/hawker/ENGINES.md](apps/hawker/ENGINES.md). Built with `--splitting`, the game's own code is about 790 KB minified (265 KB gzipped), Three.js about 600 KB (150 KB), and the building outlines load as their own 470 KB file.

### On GitHub Pages
The game is built with the rest of the site (see [GitHub Pages and the site layout](#github-pages-and-the-site-layout)). GitHub Actions cannot host a live game server, so on Pages the game hides LAN mode and uses Trystero for online play. Strict networks can block peer to peer without a TURN server.

### Simplifications that are labelled in the game
Hawkernomics-style costs (some prices are game guesses, labelled), one shared purse in the Centre Manager, apprenticeships of 3 days instead of NEA's 3 months, a game hygiene grade (NEA moved to a new framework in January 2026), each served ticket counts as 6 customers in the Centre Manager, festive seasons and critic visits are game events, rent jumps straight to market on transfer.

### Where the history comes from
`docs/research/hawker-archives.md` explains what each Singapore archive holds and how it can be reused (National Archives of Singapore, NLB Infopedia and NewspaperSG, NHB's Roots.gov.sg, NEA, the UNESCO nomination, the Singapore Memory Project), lists 46 dated, sourced food-culture facts, and describes how hawker centres looked in each era. `data/hawker-centre-profiles.json` holds the 19 centre profiles (look, opening year, famous dishes, history, photos, confidence). Where sources disagree on an opening year (Maxwell, Tekka, Tiong Bahru, Whampoa, Old Airport Road), both years are kept. Thinner profiles (ABC Brickworks, Albert Centre, Zion Riverside, Hong Lim, Amoy Street, Golden Mile) are marked medium or low confidence, and their designs stick to what the sources say. Each centre is a stylised version built from shared parts, not a model of the real building.

---

## Time Capsule Radio (`/radio`)

- One dial: 17 shellac 78s (1905 to 1957), 8 Rediffusion dialect dramas, 9 live Singapore stations, then sealed capsules up to 2065. Drag, scroll, arrow keys, knob, seek buttons, band keys.
- **Seal a song:** search iTunes (Singapore store), write a note, pick 2030, 2040, 2050 or 2065. Sealed songs play muffled through a low-pass "lid"; "Pretend it's 2065" opens them all. Capsules are in `data/capsules.json` (git-ignored); examples in `data/capsules.seed.json` (`bun scripts/seed-capsules.ts`).
- **Static switch** for hiss, crackle and the tuning whistle (remembered per browser).
- **Why the local cache exists:** the Internet Archive sent 5 to 17 KB/s per connection to this machine, below what a record needs, so a 78 took about 28 seconds to start. `apps/radio/cache.ts` fills `data/cache/radio` in the background whenever the server runs: first a 30 second clip of every 78 and Rediffusion episode, then the full 78s. The radio plays the best copy it has (full, clip, archive). All 17 full 78s and all 25 clips are cached on this machine (about 89 MB). `RADIO_CACHE=off` disables it, `RADIO_CACHE=all` also fetches full Rediffusion episodes.
- Robustness: a watchdog redials streams that never send data; long glides only load the destination station.
- Data: `bun scripts/fetch-radio.ts` (writes `data/radio.json` and label thumbnails in `data/radio-labels/`; `--offline` waits for the cache).
- One sourced correction made: records sold under Sun Juxian's name have disputed authenticity, so his 1905 record is labelled "attributed".

## Kopi Compiler (`/kopi`)

- Type an order (`kopi-o kosong peng`), see each token with its meaning and language of origin, and watch the drink pour. Build mode writes the order from controls. Uncle's Rush is a 60 second game. "Teach uncle a new word" extends the grammar (localStorage).
- `compiler.js` is pure and imported by Makan Nation for drink orders. Tests: `bun test apps/kopi`.
- Order links work: `/kopi/#teh c siew dai`.
- **Voices:** "Shout it" and Uncle's Rush say every built-in order in a local voice (`voice.js`): a Malay uncle or a synthetic Singapore auntie, picked by ear by the user on 11 October from samples, chosen under "Who reads the orders out loud" (Uncle, Auntie or Nobody; Shout it always speaks). Clips are `call.<order>.ms` in `hawker-voices/`, shared with Makan Nation's drinks callouts; "Two" to "Five" are their own clips, played before the order. Words taught on the device have no clip, so they fall back to a Singapore or Malaysian English, Malay or Indonesian device voice, never US or UK English; with none, the button says "No local voice here".

## Block Birthday (`/block`)

- Postal code (OneMap) or block and street (offline autocomplete over 13,357 HDB blocks). Shows the year, sourced moments, songs from that year with previews, age and birthday twins, and a lease countdown with a notice board of wishes (`data/block-wishes.json`, git-ignored).
- Blocks that HDB marks as having a market or hawker centre (107 of them) link to Makan Nation.
- Data: `bun scripts/fetch-block.ts` (data.gov.sg HDB Property Information). Years with nothing verified were left without moments.

## Musication (`/musication`)

- **I. One tune, many homes:** pentatonic folk tunes (Mo Li Hua, Arirang, Auld Lang Syne, Amazing Grace, Akatombo) played in 15 five-note systems, with a pitch wheel showing shared notes.
- **II. Same mode, many names:** 16 seven-note modes with their Western, Carnatic, Hindustani, Arabic and other names, and where traditions part ways (microtones, gamakas, tuning, rhythm cycles).
- **III. Twelve notes:** Ed Sheeran's argument, sourced (UK ruling April 2022, his statement, New York trial May 2023, Second Circuit November 2024, Supreme Court declined June 2025), playable scales and four-chord loops including J-pop's royal road and Mandopop's numbered progressions, a song birthday paradox calculator, and a song lab.
- **IV. Record DNA:** compare two 30 second previews (tempo, brightness, loudness, pitch fingerprint). AAC decoding works in Chrome, not in headless Chromium.

---

## Data and generated files

| File | What | How it is made | Committed |
|---|---|---|---|
| `data/radio.json`, `data/radio-labels/` | 78s, Rediffusion, live stations, label thumbnails | `scripts/fetch-radio.ts` | yes |
| `data/cache/radio/` | local copies of old recordings | the server, in the background | no |
| `data/capsules.seed.json` | example sealed songs | `scripts/seed-capsules.ts` | yes |
| `data/hdb-blocks.json`, `data/block-years.json` | HDB blocks; sourced moments and songs per year | `scripts/fetch-block.ts`; years curated by hand | yes |
| `data/hawker-centres.json` | NEA's 129 hawker centres | `scripts/fetch-hawker-centres.ts` (retries on rate limits) | yes |
| `data/hawker-singapore.json` | URA planning area outlines for the Passport map | `scripts/fetch-hawker-map.ts` | yes |
| `data/hawker-voice-lines.json` | every line customers can say | `scripts/hawker-voice-lines.ts` | yes |
| `data/kopi-voice-lines.json` | every order the Kopi Compiler can make with built-in words (1,880) and "Two" to "Five" | `scripts/kopi-voice-lines.ts` | yes |
| `data/song-previews.json` | the iTunes preview of each curated song in `block-years.json` (96 of 98), for Block Birthday and the 1980s stall radio | `scripts/fetch-song-previews.ts` (about five minutes; iTunes allows about 20 searches a minute) | yes |
| `data/hawker-voices/` | pre-generated voice clips and `manifest.json` (4,965 clips: customer orders and reactions in three takes per voice, hawker callouts, 91 accent-checked Singlish takes, and every Kopi Compiler order in the Malay uncle's and Singapore auntie's voices), `singlish-check.json` (the accent scores) | `tools/voices/generate.py`, `singlish.py`, then `kopi.py` | yes (41 MB; the manifest is 1.3 MB, 89 KB gzipped) |
| `tools/voices/refs-synthetic/` | the synthetic Singapore voices the Singlish takes are cloned from (made by the Hokkien model; no real person) | `tools/voices/singlish.py` | yes |
| `data/hawker-centre-profiles.json` | 19 famous centres: look, history, dishes, photos | archive research (see `docs/research/hawker-archives.md`) | yes |
| `data/hawker-archive-facts.json` | 59 dated food-culture facts with sources | `scripts/hawker-archive-facts.ts` from the research note | yes |
| `data/hawker-footprints.json` | real building outlines of the 129 NEA centres and the buildings around them, from OpenStreetMap (ODbL) | `scripts/fetch-hawker-footprints.ts` (Overpass; slow, polite, cached) | yes |
| `data/hawker-streetview.json` | the nearest KartaView street-level photos (360-degree first) for each NEA centre: position, heading, date, photographer, image links | `scripts/fetch-hawker-streetview.ts` (KartaView's public API, one request per centre) | yes |
| `data/hawker-hdb.json` | which NEA centres are HDB blocks (82), the flats and towers OSM maps on 14 centres' buildings, the HDB block number, storeys, year and homes of 1,034 buildings round the centres, and the centres each HDB block stands at or beside (for Block Birthday) | `scripts/fetch-hawker-hdb.ts --cache <dir>` (HDB and NEA data already saved, plus OSM tags and outlines from Overpass) | yes (230 KB) |
| `apps/hawker/media/` | photos, dish photos, real menus and prices, YouTube video list, CC0 textures and skies, recordings, each with a manifest of credits | gathered on 8 October 2026 (see `apps/hawker/README.md`) | yes (22 MB) |
| `apps/hawker/media/loops/`, `loops.json` | 33 dish loops (WebM, MP4 and a poster each) and their credits | `bun scripts/make-dish-loops.ts` from the sources listed in `loops.json`; it downloads each source once into `data/cache/loops/` (about 1.5 GB, mostly Commons episodes; Commons rate-limits after about 2 GB), or reads our own clips from `data/loops-raw/` (not committed; see `docs/dish-loops-shot-list.md`) | yes (9.5 MB) |
| `data/capsules.json`, `data/block-wishes.json`, `data/hawker-memories.json`, `data/hawker-voice-bank/` | things people add on the day | the running app | no; delete to reset a demo |

data.gov.sg rate-limits downloads; the scripts wait and retry.

## The voice generator (`tools/voices`)

- **Why:** browsers can only speak with voices the device has. Microsoft Edge has Singapore English voices; Android's Google voices have Malay, Tamil (India), Cantonese and Mandarin but no Singapore English; nothing has Hokkien.
- **What it uses:** A*STAR's [MERaLiON-OmniVoice-Hokkien-TTS](https://huggingface.co/MERaLiON/MERaLiON-OmniVoice-Hokkien-TTS) for Singapore Hokkien, and [OmniVoice](https://github.com/k2-fsa/OmniVoice) for Malay, Tamil, Mandarin and Cantonese, each in four personas (auntie, uncle, young woman, young man). 855 clips, 9.9 MB: customer orders and reactions in every persona, and hawker callouts for every dish and the 475 most common kopi codes (one persona each for the kopi codes, alternating uncle and auntie, to keep the size down).
- **Singlish:** no open model has a Singapore English accent built in. `singlish.py` makes synthetic Singapore voices with the Hokkien model and keeps only takes an accent classifier hears as Singaporean or Malaysian: the auntie's and young woman's passed, the men's did not (see the 9 October night log). For the men, and for anything better than synthetic, put 5 to 10 second recordings of consenting speakers in `tools/voices/refs/<persona>.wav` with an exact transcript in `<persona>.txt` and run `generate.py`. Never clone someone without their permission, and do not scrape voices from video sites.
- **Kopi orders:** `kopi.py` voices every order in `data/kopi-voice-lines.json` in one steady voice per speaker: it makes (or reuses) a reference take in `refs-synthetic/kopi-<voice>.wav` and clones it for every order, so "Two" and the order sound like one person. Voices: `malay-uncle` and `malay-auntie` (OmniVoice in Malay, designed voices) and `sg-auntie` (cloning the synthetic Singapore auntie, reading in English with a few respellings such as "Siu Dai" and "Gau"). `--samples DIR` writes a listening page; the user picked malay-uncle and sg-auntie. Clips are 32 kbps, about 8 KB each (28.6 MB for the 3,768).
- **Licences:** OmniVoice weights are CC BY-NC 4.0 (fine for the makeathon, not for a commercial product; Azure's Singapore voices are the commercial route). MERaLiON's licence is permissive with attribution.
- **On this machine:** the Python environment and model files live on the data drive (mount it first; it was unmounted on 11 October): `UV_PROJECT_ENVIRONMENT=/media/sid/DataDrive/makan-voices/venv` and `HF_HOME=/media/sid/DataDrive/makan-voices/hf` (about 12 GB). Steps are in [tools/voices/README.md](tools/voices/README.md). Each clip takes about a quarter of a second on the RTX 5090.

## Testing

- `bun test` runs the Kopi Compiler and Makan Nation suites (92 tests, including a bot that follows the guide and cooks every dish, a customer who plays the whole loop at five centres, a customer who follows only the guide and Go at seven centres, the lunch rush at full crowd, the Centre Manager with fixed seeds, voices, and networking pieces).
- Headless Chromium on this machine: launch it with `--enable-gpu --ignore-gpu-blocklist --use-angle=gl-egl` (the integrated Radeon). With `--use-angle=vulkan` the canvas textures made at start-up come out black, which looks like a game bug but is not.
- Visual checks and playthroughs were done with headless Chromium through Playwright (`playwright-core`, scripts kept in the session's scratch folder, not in the repo) at 360, 390, 1366 and 1854 pixels wide, with touch emulation for phones and tablets. The scripts drive the real UI (picker, Go, E, the order sheet, the end card), read `window.__view` for the camera and frame times, and save screenshots. The user's Chrome tab on this machine reports itself hidden, which pauses the game loop, so it is only good for reloads and spot checks.
- Not checked by ear: any audio quality (synths, accents, generated clips). Not checked on a real phone: frame rate, bloom, microphone recording.

## Licences and credits

- Internet Archive (Great 78 Project and a community upload of Rediffusion Singapore); recordings are streamed or cached locally, not redistributed in the repo.
- radio-browser.info (stream addresses), iTunes Search API (30 second previews).
- data.gov.sg: HDB Property Information, NEA Hawker Centres, URA Master Plan 2019 planning areas (Singapore Open Data Licence). OneMap for postal codes.
- Wikipedia, Wiktionary, NLB, Roots.gov.sg, NEA, UNESCO and news sources are linked inside each prototype next to the facts they support.
- Hawkernomics (Hack for Public Good 2025) is credited for the cost lens in Makan Nation.
- Code libraries: Three.js and Trystero (MIT), uqr (QR codes), Fontsource fonts (SIL Open Font Licence).
- Building outlines © OpenStreetMap contributors (ODbL), credited in the customer mode's picker.
- GrabFood and foodpanda are named because the riders in the game stand for them; their colours are approximations and no logos are used.

## Decisions made, and why

- **Bun only** for the web, no frameworks, so setup is `bun install` and nothing else.
- **Three.js over Babylon.js** for size and simplicity (see above).
- **Save archive data locally** so the demo survives venue wifi; the radio cache exists because the archive is slow.
- **Honest voices:** pick the most local voice a device has; generate Hokkien with a Singapore model; get Singlish from real, consenting people.
- **Sources over flavour:** every fact in the UI links to a source; anything unverifiable was left out (for example some Hokkien and Tamil takeaway phrases).
- **Copy style:** no em or en dashes, no hype words, no "not just X, it's Y" lines. `grep` for these before shipping copy.

## Known issues

- Disk space: on 8 October the main drive had 398 GB free (it was full on 7 October). The uv cache and Hugging Face cache are still the big ones. Nothing of yours was deleted.
- Plain http on the tailnet disables the voice bank's microphone, online play, wake lock and copy buttons on phones.
- Makan Nation: helpers do not fight fires; hiring every helper runs at a loss (deliberate, but harsh); a guest cannot join mid round; the kitchen pauses for everyone if the host's tab is hidden.
- Some phrases and dish details could not be verified and were left out; the gaps are listed in `apps/hawker/README.md`.
- Bun's hot reload sometimes misses edits made by scripts; restart `bun run dev` if a change does not show.
- People are still built from simple shapes (no skinned models or faces with mouths); up close in Eyes, lifelike people read as tidy mannequins rather than photographs. Classic people are a stylised choice and are drawn bigger than life in the customer mode.
- Callouts are Hokkien, Cantonese, Mandarin, Malay or Tamil; there is no voice model for Teochew, Hainanese or Fuzhou, which would suit some stalls better.
- Lau Pa Sat is in the Centre Manager's list but not the customer mode's (it is not in NEA's list, and it has no sourced stall count yet).
- Customer mode: Go can give up in a dense crowd ("Too crowded that way"), about once in a thousand presses at full crowd; walking a few steps and pressing Go again works.
- Customer mode: queues can run across the front of the next stall; joining from the end of a line works, but which line you are at depends on where you stand and face (the prompt names the stall). People in queues walk straight to their spot and can brush through a table corner.
- Customer mode: the inside of each centre is arranged by the game, not surveyed; a few odd OpenStreetMap shapes make odd halls.
- HDB estates: HDB's "year completed" for a market block is often the year of its rebuild (the picker says so when NEA's year is older). Only buildings OpenStreetMap gives an address match an HDB block (1,034 of 1,919 numbered ones round the centres); the rest keep the old generic look. The painted number goes on the walls at each end of a block's long axis, so an L-shaped or square block can get it on an odd wall. In the 1980s, blocks completed after 1989 are left out, not replaced with what stood there. A tower whose middle is off the hall gets a plain podium; one whose middle is over the hall but which reaches past it floats slightly at its edge.
- On portrait phones the kitchen is small (the game suggests turning sideways), and where three crates sit side by side their name tags stagger, so one can sit a row away from its crate. The guide still names the right crate.

## Open decisions for you

1. **Git and Pages:** initialise a repository, commit and push it to GitHub, then turn on Pages (the site and workflow are ready). Nothing is committed yet.
2. **Makeathon rules:** check whether code written before the day is allowed. If not, treat this as a rehearsal and keep the data scripts and the plan.
3. **HTTPS on the tailnet:** run one of the sudo commands above.
4. **Singlish voices:** record reference clips from people who agree to it.
5. **Disk space:** decide what to prune on the system drive.

## A five minute demo

1. Open the lobby and say the line: Common Ground is about reading culture in three tenses.
2. Put Makan Nation's Host QR code on screen; judges pick a chef on their phones and cook a 1980s lunch rush while *Stand Up for Singapore* plays on the stall radio. Point at a customer ordering in Malay and the takeaway box it forces.
3. Show the results screen: profit and loss, the rojak meter, a memory being written.
4. Switch to **Makan at a hawker centre** at the same centre in **Eyes** and **Real**: chope a table with tissue, press Go to walk to the stall, queue behind a GrabFood rider, order a kopi in kopi code (point at the real stall's price on the sheet and play its cooking video), eat, return the tray. Then flip to the 1980s and get shooed off a stall's table.
5. Open a centre a judge knows (for example `/hawker?at=newton-food-centre` at night, or Lau Pa Sat's octagon), then the Centre Manager there, and show a hawker retiring without an apprentice.
6. Close on the radio: seal a song a judge picks for 2065, then flip "Pretend it's 2065" in Makan Nation's future kitchen and hear it.

## Next steps, in order

0a. Listen: the Singlish takes (Settings, Voices, or a kitchen round with women ordering in English), the hall in the customer mode and under the kitchen radio, and a few kitchen effects. Delete any take that sounds wrong from `data/hawker-voices/manifest.json` and run `singlish.py --fill`.
0b. Two or three consenting Singaporean men record ten seconds each (`tools/voices/refs/uncle.wav` and `youngman.wav` with their transcripts, then `generate.py`), or lend lines in the game's voice bank: the only way the men get a local Singlish voice.
0. Try the three views, three looks and both People builds on a real phone and laptop, by hand: mouse look, drag look, whether Real holds 60 fps on a phone at Medium, and whether the callouts sound right to a Hokkien, Cantonese and Malay speaker.
1. Record consenting Singlish voices and regenerate clips.
2. Test on a real phone and tablet over https; tune quality tiers.
3. Initialise git, push to GitHub, turn on Pages (Settings, Pages, Source: GitHub Actions), and let `pages.yml` publish the whole site. Then try it on a phone over https, which also turns on online play, the microphone and the copy buttons.
4. Ask IMDA for the National Speech Corpus if voices go further, and plan a licensed voice service before any commercial use.
5. Dish loops for the 15 dishes without one, and Singapore footage for the 17 filmed elsewhere: no free footage of the 15 exists (searched twice, see the 11 October afternoon log), so they need filming at stalls with the hawkers' agreement. `docs/dish-loops-shot-list.md` has what to film and how to add each clip. Decide whether Lau Pa Sat satay from "The Lion City" should replace the Indonesian satay loop.
