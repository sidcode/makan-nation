"""Pre-renders Makan Nation's customer lines as voice clips on a local GPU.

Reads data/hawker-voice-lines.json ([{key, lg, text}], written by `bun scripts/hawker-voice-lines.ts`)
and writes MP3 clips plus data/hawker-voices/manifest.json, which the game prefers over the device's
own text to speech.

  Hokkien (nan)      A*STAR's MERaLiON-OmniVoice-Hokkien-TTS, trained on Singapore Hokkien.
  Malay, Tamil,      k2-fsa OmniVoice, with a voice designed per persona.
  Mandarin, Cantonese
  English/Singlish   only cloned from consenting local speakers in refs/<persona>.wav + .txt,
                     because no open model has a Singaporean English accent built in.

OmniVoice's weights are CC BY-NC 4.0: fine for a makeathon demo, not for a commercial product.
Run with:  uv run python generate.py   (see README.md for where the model files go)
"""

import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

import soundfile as sf
import torch
from omnivoice import OmniVoice

ROOT = Path(__file__).resolve().parents[2]
LINES = ROOT / "data" / "hawker-voice-lines.json"
OUT = ROOT / "data" / "hawker-voices"
REFS = Path(__file__).parent / "refs"
SR = 24000

PERSONAS = {
    "auntie": "female, elderly",
    "uncle": "male, elderly",
    "youngwoman": "female, young adult",
    "youngman": "male, young adult",
}
HOKKIEN = ("MERaLiON/MERaLiON-OmniVoice-Hokkien-TTS", "Hokkien voice: MERaLiON-OmniVoice-Hokkien-TTS by A*STAR (MERaLiON Public Licence)")
BASE = ("k2-fsa/OmniVoice", "Voice: OmniVoice by k2-fsa (CC BY-NC 4.0)")
DESIGNED = {"ms", "ta", "zh", "yue"}
# Customers' orders and reactions come in a few takes per voice, so the game can say a line a different way
# each time. Hawkers' callouts (hundreds of kopi codes) stay at one take each.
TAKES = 3
SPOKEN_AGAIN = ("order.", "react.", "chef.")


def load(name):
    return OmniVoice.from_pretrained(name, device_map="cuda:0", dtype=torch.float16)


def to_numpy(audio):
    wav = audio[0] if isinstance(audio, (list, tuple)) else audio
    return wav.squeeze().float().cpu().numpy() if hasattr(wav, "cpu") else wav


def save(wav, stem):
    """Writes a small mono MP3 if ffmpeg is around, else a WAV."""
    tmp = OUT / f"{stem}.wav"
    sf.write(tmp, wav, SR)
    if shutil.which("ffmpeg"):
        mp3 = OUT / f"{stem}.mp3"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-ac", "1", "-b:a", "48k", str(mp3)], check=True)
        tmp.unlink()
        return mp3.name
    return tmp.name


def main():
    if not LINES.exists():
        sys.exit(f"{LINES} is missing. Run `bun scripts/hawker-voice-lines.ts` first.")
    lines = json.loads(LINES.read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"clips": {}}
    refs = {p.stem: (p, p.with_suffix(".txt").read_text().strip()) for p in REFS.glob("*.wav") if p.with_suffix(".txt").exists()}

    jobs = []
    for line in lines:
        lg, text, key = line["lg"], line["text"].strip(), line["key"]
        if not text:
            continue
        # A line can ask for only some voices (each kopi code is made once, by an uncle or an auntie).
        voices = [p for p in (line.get("personas") or PERSONAS) if p in PERSONAS]
        takes = range(TAKES if key.startswith(SPOKEN_AGAIN) else 1)
        if lg == "nan":
            jobs += [(HOKKIEN, key, lg, text, p, PERSONAS[p], None, n) for p in voices for n in takes]
        elif lg in DESIGNED:
            jobs += [(BASE, key, lg, text, p, PERSONAS[p], None, n) for p in voices for n in takes]
        elif lg == "en":
            jobs += [(BASE, key, lg, text, p, None, refs[p], 0) for p in PERSONAS if p in refs]

    models = {}
    made = 0
    for (model_name, credit), key, lg, text, persona, instruct, ref, take in jobs:
        # The first take keeps the name it always had, so earlier clips are reused.
        stem = hashlib.sha1(f"{model_name}|{lg}|{persona}|{text}{f'|{take}' if take else ''}".encode()).hexdigest()[:16]
        clips = manifest["clips"].setdefault(key, [])
        if any(c.get("id") == stem for c in clips) and any((OUT / f"{stem}{ext}").exists() for ext in (".mp3", ".wav")):
            continue
        model = models.get(model_name) or models.setdefault(model_name, load(model_name))
        kwargs = {"text": text}
        if ref:
            kwargs.update(ref_audio=str(ref[0]), ref_text=ref[1])
        else:
            kwargs["instruct"] = instruct
        if lg != "en":
            kwargs["language"] = lg
        try:
            try:
                audio = model.generate(**kwargs)
            except TypeError:
                kwargs.pop("language", None)
                audio = model.generate(**kwargs)
        except (ValueError, RuntimeError) as e:
            # The model now and then makes an empty clip and fails on it; skip that take, a rerun tries again.
            print(f"  skipped {key} [{persona}]: {str(e)[:60]}")
            continue
        wav = to_numpy(audio)
        if wav is None or len(wav) < SR * 0.15:
            print(f"  skipped {key} [{persona}]: empty")
            continue
        name = save(wav, stem)
        clips[:] = [c for c in clips if c.get("id") != stem]
        clips.append({"id": stem, "src": f"/hawker-voices/{name}", "persona": persona, "lg": lg, "credit": credit + (", cloned from a consenting speaker" if ref else "")})
        made += 1
        print(f"  {key} [{persona}] {text}")

    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print(f"Made {made} clips. {sum(len(v) for v in manifest['clips'].values())} in the manifest.")


if __name__ == "__main__":
    main()
