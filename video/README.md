# The Makan Nation demo video

A short film of Makan Nation and the other Common Ground prototypes, made from the real site: every shot is a scripted playthrough filmed in Chrome, with the game's own sound, cut together in [Remotion](https://www.remotion.dev) over two records from the Time Capsule Radio. Made by sidcode.

## How it is made

1. **Filming** (`capture/`). `shoot.mjs` opens each scene in headless Chrome at 1920 by 1080 and plays it: the kitchen on autoplay (`?autoplay`, the chefs follow the game's guide), a lunch in the customer mode played the way the guide tests play it (Go, use, order, the right kopi code), the Passport and its quiz, the Kopi Compiler, Block Birthday, the radio. `rec.mjs` records Chrome's screencast at 60 fps and taps every Web Audio context and audio element in the page into one recorder, so each clip carries the game's own sound in sync; Chrome itself is muted. Chrome renders on the NVIDIA card through ANGLE.
2. **Music** (`public/music/`). Two 78s from the radio's local copies: "Singapore", a 1919 foxtrot by Jaudas' Society Orchestra, and a Rasa Sayang medley by Krontjong Orchest Eurasia (1929). Both are long out of copyright in Singapore; the clean-up is a gentle filter and level, so the shellac stays. `src/beats.json` holds their beats (found with librosa) so cuts land on the band's beat.
3. **The edit** (`src/`). `edl.ts` is the whole film as a list of shots: clip, in point, length in beats or seconds, transition, caption. `layout.ts` places it on the timeline, `Demo.tsx` draws it, `parts.tsx` holds the captions, the radio readout, the tuning sweep, the title and the end card, in the site's own type and colours.

The stall radio is only heard in the 1950s scenes, where it plays the 78s; live FM, Rediffusion and song previews are muted, since the film cannot use them.

## Run

```sh
bun install
bun run dev                          # in the repo root: the site the scenes are filmed from (port 3000)
bun run build && bun run preview     # in the repo root: the static site (port 4000), for the scenes that save things
node capture/shoot.mjs all           # in video/: films every scene into public/clips/ (or name scenes)
bun run studio                       # preview the edit
bun run render                       # out/makan-nation-demo.mp4
```

`capture/sheet.sh` makes a contact sheet of a clip with times, for choosing in points. Filming needs an NVIDIA card (or drop the EGL setting in `rec.mjs` for the integrated one).
