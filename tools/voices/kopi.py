"""Voices every Kopi Compiler order (data/kopi-voice-lines.json, from `bun scripts/kopi-voice-lines.ts`).

Each voice is one steady speaker: a reference take, saved in refs-synthetic/kopi-<voice>.wav, that every
order is cloned from, so "Two" and "Kopi-O Siew Dai Da Bao" sound like the same person. The clips use the
same keys as Makan Nation's drinks callouts (call.<letters>.ms), so the game's drinks uncle gets them too.

  malay-uncle, malay-auntie   OmniVoice in Malay, a voice designed from "male, elderly" or "female, elderly",
                              the way the game's drinks callouts were made.
  sg-auntie                   OmniVoice cloning the synthetic Singapore auntie (refs-synthetic/auntie.wav, made
                              by singlish.py with A*STAR's Hokkien model; 0.99 local on the accent check), reading
                              in English with a few words spelt the way they are said.

No real person's voice is copied. OmniVoice's weights are CC BY-NC 4.0: fine for the makeathon.

Run:  uv run python kopi.py --samples DIR          a few orders in every voice, with an index.html to listen
      uv run python kopi.py --voice malay-uncle --voice sg-auntie    every order in those voices,
                                                                     into data/hawker-voices

On 11 October 2026 the user listened to the samples and picked malay-uncle and sg-auntie as the most local.
"""

import argparse
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path

import soundfile as sf
import torch
from omnivoice import OmniVoice

ROOT = Path(__file__).resolve().parents[2]
LINES = ROOT / "data" / "kopi-voice-lines.json"
OUT = ROOT / "data" / "hawker-voices"
REFS = Path(__file__).parent / "refs-synthetic"
SR = 24000
SEED = 2026
MODEL = ("k2-fsa/OmniVoice", "Voice: OmniVoice by k2-fsa (CC BY-NC 4.0)")
PASSAGE = "Kopi-O Siew Dai, Teh-C Kosong Peng, Milo Dinosaur, Da Bao."

VOICES = {
    "malay-uncle": {"persona": "uncle", "language": "ms", "design": "male, elderly"},
    "malay-auntie": {"persona": "auntie", "language": "ms", "design": "female, elderly"},
    "sg-auntie": {"persona": "auntie", "ref": "auntie", "credit": ", in a synthetic Singapore voice made with MERaLiON-OmniVoice-Hokkien-TTS"},
}
# Read in English, these come out wrong unless spelt the way the counter says them.
SPOKEN_EN = {"Siew Dai": "Siu Dai", "Gao": "Gau", "Da Bao": "Dabao"}
SAMPLES = ["Kopi-O Kosong Peng", "Teh-C Siew Dai", "Kopi Gao Siew Dai Da Bao", "Milo Dinosaur", "Teh Halia Ga Dai Peng", "Yuan Yang Peng Da Bao"]


def to_numpy(audio):
    w = audio[0] if isinstance(audio, (list, tuple)) else audio
    return w.squeeze().float().cpu().numpy() if hasattr(w, "cpu") else w


def spoken(voice, text):
    if VOICES[voice].get("language"):
        return text
    for a, b in SPOKEN_EN.items():
        text = re.sub(rf"\b{a}\b", b, text)
    return text.replace("-", " ")


# Short speech clips sound the same at 32 kbps, and there are thousands of them on a static site.
def save_mp3(wav, path, rate="32k"):
    tmp = path.with_suffix(".wav")
    sf.write(tmp, wav, SR)
    if shutil.which("ffmpeg"):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-ac", "1", "-b:a", rate, str(path.with_suffix(".mp3"))], check=True)
        tmp.unlink()
        return path.with_suffix(".mp3")
    return tmp


class Speaker:
    """One voice: its reference take, and a way to say any order in it."""

    def __init__(self, model, voice):
        self.model, self.voice, self.cfg = model, voice, VOICES[voice]
        if self.cfg.get("ref"):
            self.ref = REFS / f"{self.cfg['ref']}.wav"
            self.ref_text = (REFS / f"{self.cfg['ref']}.txt").read_text().strip()
        else:
            # A designed voice changes every take, so make one reference take and clone it from then on.
            self.ref = REFS / f"kopi-{voice}.wav"
            self.ref_text = PASSAGE
            if not self.ref.exists():
                torch.manual_seed(SEED)
                wav = to_numpy(model.generate(text=PASSAGE, instruct=self.cfg["design"], language=self.cfg["language"]))
                sf.write(self.ref, wav, SR)
                self.ref.with_suffix(".txt").write_text(PASSAGE + "\n")

    def say(self, text):
        kw = {"text": spoken(self.voice, text), "ref_audio": str(self.ref), "ref_text": self.ref_text}
        if self.cfg.get("language"):
            kw["language"] = self.cfg["language"]
        for _ in range(4):
            try:
                wav = to_numpy(self.model.generate(**kw))
            except (ValueError, RuntimeError) as e:
                print("  a take failed:", str(e)[:80], flush=True)
                continue
            dur = len(wav) / SR if wav is not None else 0
            # Empty takes, and takes that ramble on far past the words, are tried again.
            if 0.3 < dur < 1.0 + 0.5 * len(text.split()):
                return wav
        return None


def samples(model, out):
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for voice in VOICES:
        sp = Speaker(model, voice)
        cells = []
        for i, text in enumerate(SAMPLES):
            wav = sp.say(text)
            name = f"{voice}-{i}"
            cells.append(save_mp3(wav, out / name).name if wav is not None else None)
            print(f"  {voice}: {text}", flush=True)
        rows.append((voice, cells))
    head = "".join(f"<th>{t}</th>" for t in SAMPLES)
    body = "".join(f"<tr><th>{v}</th>" + "".join(f"<td>{f'<audio controls preload=none src={c}></audio>' if c else 'failed'}</td>" for c in cells) + "</tr>" for v, cells in rows)
    (out / "index.html").write_text(f"""<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Kopi voices</title>
<style>body{{font:15px/1.4 system-ui;margin:24px;background:#fffaf0;color:#2b1b12}}table{{border-collapse:collapse}}th,td{{border:1px solid #d8c9a8;padding:8px;text-align:left;vertical-align:top}}audio{{width:190px}}</style>
<h1>Who should read the kopi orders?</h1><p>Each row is one voice, each column one order. All three are synthetic voices; nobody's real voice is copied.</p>
<table><tr><th></th>{head}</tr>{body}</table>""")
    print(f"Samples in {out}/index.html")


def everything(model, voice):
    cfg = VOICES[voice]
    sp = Speaker(model, voice)
    lines = json.loads(LINES.read_text())
    path = OUT / "manifest.json"
    manifest = json.loads(path.read_text())
    credit = MODEL[1] + cfg.get("credit", "")
    made = 0
    for line in lines:
        stem = hashlib.sha1(f"kopi|{voice}|{line['text']}".encode()).hexdigest()[:16]
        clips = manifest["clips"].setdefault(line["key"], [])
        if any(c.get("id") == stem for c in clips) and (OUT / f"{stem}.mp3").exists():
            continue
        wav = sp.say(line["text"])
        if wav is None:
            print(f"  skipped {line['text']}", flush=True)
            continue
        name = save_mp3(wav, OUT / stem).name
        clips[:] = [c for c in clips if c.get("id") != stem]
        clips.append({"id": stem, "src": f"/hawker-voices/{name}", "persona": cfg["persona"], "lg": "ms", "voice": f"kopi-{voice}", "credit": credit})
        made += 1
        if made % 100 == 0:
            path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
            print(f"  {made} made", flush=True)
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print(f"Made {made} clips in the {voice} voice.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", type=Path)
    ap.add_argument("--voice", choices=list(VOICES), action="append", default=[])
    a = ap.parse_args()
    m = OmniVoice.from_pretrained(MODEL[0], device_map="cuda:0", dtype=torch.float16)
    if a.samples:
        samples(m, a.samples)
    for v in a.voice:
        everything(m, v)
