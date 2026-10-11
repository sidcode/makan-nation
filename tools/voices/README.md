# Makan Nation voices

Pre-renders customer lines as voice clips on a local NVIDIA GPU, so customers sound local even on devices without the right text to speech voice.

- **Hokkien:** [MERaLiON-OmniVoice-Hokkien-TTS](https://huggingface.co/MERaLiON/MERaLiON-OmniVoice-Hokkien-TTS) from A*STAR, trained on Singapore Hokkien. MERaLiON Public Licence, keep the credit.
- **Malay, Tamil, Mandarin, Cantonese:** [OmniVoice](https://github.com/k2-fsa/OmniVoice) with a voice designed for each persona (auntie, uncle, young woman, young man).
- **Singlish:** no open model has a Singapore English accent built in, and OmniVoice's accent settings stop at British, American, Indian and the like. `singlish.py` makes the English lines (customers' orders and reactions, and the chefs' "Aiyo, burnt!") with A*STAR's Hokkien model, which was trained on Singapore speakers, and checks the accent with an English accent classifier ([CommonAccent ECAPA](https://huggingface.co/Jzuluaga/accent-id-commonaccent_ecapa), 16 accents with Singapore and Malaysia among them):
  1. For each persona it picks, from a dozen takes of a Singlish passage, the one the classifier rates most Singaporean or Malaysian. That is a synthetic voice, not anyone's real one; it is kept in `refs-synthetic/` so a rerun sounds the same.
  2. It voices the lines two ways, with the Hokkien model and with OmniVoice cloning that synthetic voice, and uses the way that sounds more local on all the lines strung together (the classifier cannot judge a one-second clip: short windows of a passage it calls Singaporean come out English or American).
  3. It keeps three takes of each line that Whisper hears the plain words in ("mo" counts for "more"), so the game can say a line a different way each time.
  4. A persona whose lines, strung together, score under 0.5 gets no Singlish clips at all, and `data/hawker-voices/singlish-check.json` keeps the scores.

  On 9 October 2026 the auntie's lines scored 0.99 and the young woman's 0.63 (Singapore or Malaysian English), and both were kept: 91 takes. No man's voice passed, whatever was tried (60 candidate voices, the particles written in Chinese characters for the Hokkien model, OmniVoice cloning): the best scored 0.16 and was heard as English or American. OmniVoice's default voice scored 0.00 for everyone, heard as American, which is what a browser's US English voice sounds like. So the game's men show their Singlish lines as words (`LANGS.en` in `phrases.js` only takes a device's Singapore or Malaysian English voice) until someone records them.

  It is still a synthetic accent, checked by a classifier, not by ear. Real consenting Singaporean voices are better, and the only way to give the men a local voice: put `refs/<persona>.wav` (5 to 10 seconds, one speaker) next to `refs/<persona>.txt` (exactly what they say) and `generate.py` clones them, or record lines in the game's voice bank. Never use someone's voice without their permission.

OmniVoice's weights are CC BY-NC 4.0, so these clips are fine for the makeathon but not for a commercial product. For that, use a licensed voice service such as Azure's Singapore English voices.

## Run

The models and the CUDA build of PyTorch are large (about 10 GB), so keep them off a full system drive:

```sh
cd tools/voices
export UV_PROJECT_ENVIRONMENT=/path/with/space/makan-voices/venv
export HF_HOME=/path/with/space/makan-voices/hf
uv sync
bun ../../scripts/hawker-voice-lines.ts   # writes data/hawker-voice-lines.json from the game's phrases
uv run python generate.py                 # writes data/hawker-voices/*.mp3 and manifest.json
uv run --with speechbrain python singlish.py          # the Singlish lines, accent-checked (see above)
uv run --with speechbrain python singlish.py --fill   # only tops up lines short of three takes
bun ../../scripts/kopi-voice-lines.ts     # every Kopi Compiler order, to data/kopi-voice-lines.json
uv run python kopi.py --samples /tmp/kopi # a listening page of a few orders in each voice
uv run python kopi.py --voice malay-uncle --voice sg-auntie   # every order in those voices
```

`kopi.py` gives each voice one steady speaker: a reference take (`refs-synthetic/kopi-<voice>.wav`) that every order is cloned from, so the Kopi Compiler's "Two" and "Teh-O" sound like one person. `malay-uncle` and `malay-auntie` are OmniVoice in Malay with a designed voice, like the game's drinks callouts; `sg-auntie` clones the synthetic Singapore auntie and reads in English, with "Siew Dai" and "Gao" respelt so they come out right. On 11 October 2026 the user listened and picked malay-uncle and sg-auntie: 3,768 clips in about two hours.

It skips clips it has already made, so rerun it after adding lines or reference voices. Customers' orders and reactions get three takes per voice, and the game picks a different take from last time and plays it a touch higher or lower, so a busy stall does not hear the same "Terima kasih" over and over.

The lines include the hawkers' callouts in the customer mode (`apps/hawker/callouts.js`): every dish in four voices, and the kopi codes that cover 97 out of 100 drinks orders in one voice each (an uncle or an auntie, in turn; a line's `personas` field limits which voices are made). On 8 October 2026 that was 723 clips in about four minutes on an RTX 5090.
