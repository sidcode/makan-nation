"""Singlish voices for Makan Nation's English lines, with a local accent.

No open text to speech model has a Singapore English accent built in, and OmniVoice's accent settings stop
at British, American, Indian and the like. A*STAR's MERaLiON-OmniVoice-Hokkien-TTS was trained on Singapore
speakers, and reads English words the local way. This script uses it, and checks the result:

1. For each persona it makes a dozen takes of a Singlish passage with the Hokkien model and keeps the one an
   English accent classifier (CommonAccent ECAPA, 16 accents, Singapore and Malaysia among them) rates most
   Singaporean or Malaysian. That take is a synthetic voice: no real person's voice is copied. It is saved
   in refs-synthetic/ so the run can be repeated.
2. It voices all the English lines two ways: the Hokkien model directly, and OmniVoice cloning that
   synthetic voice. The classifier cannot judge a one-second line (short windows of a passage it calls
   Singaporean come out English or American), so each way is judged on all its lines strung together,
   three times over, and the more local way is used for that persona.
3. It makes several takes of each line that way, keeps the ones Whisper hears the plain English words in,
   and writes the best TAKES of them to data/hawker-voices with the manifest, so the game can pick a
   different take each time.
4. It writes singlish-check.json: the accent scores of the kept lines, next to OmniVoice's default voice
   (which the classifier hears as American, like a browser's US English voice).

Run: uv run --with speechbrain python singlish.py   (with UV_PROJECT_ENVIRONMENT and HF_HOME as in README)
     uv run --with speechbrain python singlish.py --fill   (only tops up lines short of takes)
     uv run --with speechbrain python singlish.py --redo uncle   (one persona again, with a wider search)
     uv run --with speechbrain python singlish.py --borrow uncle:youngman:-3   (the uncle in the young man's voice, lowered)
     add --wide to --redo for a much wider search (60 candidate voices, the best 8 tried on the lines)
"""

import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
import torchaudio
from omnivoice import OmniVoice
from speechbrain.inference.classifiers import EncoderClassifier
from transformers import pipeline

ROOT = Path(__file__).resolve().parents[2]
LINES = ROOT / "data" / "hawker-voice-lines.json"
OUT = ROOT / "data" / "hawker-voices"
REFS = Path(__file__).parent / "refs-synthetic"
SR = 24000
TAKES = 3
SEED = 2026

PERSONAS = {
    "auntie": "female, elderly",
    "uncle": "male, elderly",
    "youngwoman": "female, young adult",
    "youngman": "male, young adult",
}
PITCH = ["", ", low pitch", ", moderate pitch", ", high pitch"]
PASSAGE = "Uncle, one chicken rice, no chilli ah. Dabao, thank you ah. Wah, so shiok! Aiyo, so slow leh, never mind lor."
# Spelled for the voice, not the screen: the models read "chilli" oddly.
SPOKEN = {"chilli": "chili"}
PLAIN = {"burnt", "fire", "steady", "thank", "you", "one", "please", "so", "slow", "never", "mind", "next", "time", "this", "i", "order", "more", "chilli", "uncle", "auntie", "ready", "already", "no"}
# How Whisper writes a word said the Singapore way: "mo" for "more", "tank" for "thank".
HEARD_AS = {"more": {"more", "mo", "mor"}, "chilli": {"chilli", "chili", "chilly"}, "thank": {"thank", "tank", "thanks"}, "already": {"already", "oredi", "ready"}}
HOKKIEN = ("MERaLiON/MERaLiON-OmniVoice-Hokkien-TTS", "Singlish voice: MERaLiON-OmniVoice-Hokkien-TTS by A*STAR (MERaLiON Public Licence), picked by an accent check")
CLONE = ("k2-fsa/OmniVoice", "Singlish voice: OmniVoice by k2-fsa (CC BY-NC 4.0), in a synthetic Singapore voice made with MERaLiON-OmniVoice-Hokkien-TTS")


def spoken(text):
    for a, b in SPOKEN.items():
        text = re.sub(rf"\b{a}\b", b, text, flags=re.I)
    return text


def to_numpy(audio):
    w = audio[0] if isinstance(audio, (list, tuple)) else audio
    return w.squeeze().float().cpu().numpy() if hasattr(w, "cpu") else w


def say(model, **kw):
    """One take, or None when the model gives nothing back (it sometimes makes an empty clip and fails)."""
    try:
        w = to_numpy(model.generate(**kw))
    except (ValueError, RuntimeError) as e:
        print("  a take failed:", str(e)[:80], flush=True)
        return None
    return w if w is not None and len(w) > SR * 0.15 else None


class Judge:
    def __init__(self):
        self.acc = EncoderClassifier.from_hparams(source="Jzuluaga/accent-id-commonaccent_ecapa", savedir=str(Path.home() / ".cache/sb-accent"), run_opts={"device": "cuda:0"})
        self.labels = self.acc.hparams.label_encoder.ind2lab
        self.asr = pipeline("automatic-speech-recognition", model="openai/whisper-small.en", device=0)

    def accent(self, wav):
        """Probabilities of the 16 accents for a clip (at least a few seconds long to mean anything)."""
        t = torchaudio.functional.resample(torch.tensor(wav, dtype=torch.float32), SR, 16000)
        cos = self.acc.classify_batch(t.unsqueeze(0))[0].squeeze().cpu().numpy()
        e = np.exp(30 * (cos - cos.max()))  # the classifier's cosine scores, at its training scale
        p = e / e.sum()
        return {self.labels[i]: float(p[i]) for i in range(len(p))}

    def local(self, wav):
        p = self.accent(wav)
        return p.get("singapore", 0) + p.get("malaysia", 0), max(p, key=p.get)

    def words(self, wav, text):
        """Share of the line's plain English words Whisper hears (it cannot spell lah, aiyo or shiok)."""
        want = [x for x in re.sub(r"[^a-z ]", "", text.lower()).split() if x in PLAIN]
        if not want:
            return 1.0
        heard = self.asr({"raw": wav, "sampling_rate": SR})["text"].lower().replace("chili", "chilli")
        # Whisper runs local speech together ("nochili ho"), so a word counts if any spelling of it is in there.
        flat = re.sub(r"[^a-z]", "", heard)
        return sum(1 for x in want if any(a in flat for a in HEARD_AS.get(x, {x}))) / len(want)


def strung(clips):
    gap = np.zeros(int(SR * 0.25), dtype=np.float32)
    return np.concatenate([x for c in clips if c is not None for x in (c.astype(np.float32), gap)])


def save_mp3(wav, stem):
    tmp = OUT / f"{stem}.wav"
    sf.write(tmp, wav, SR)
    if shutil.which("ffmpeg"):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-ac", "1", "-b:a", "48k", str(OUT / f"{stem}.mp3")], check=True)
        tmp.unlink()
        return f"{stem}.mp3"
    return tmp.name


def takes_for(make, text, judge, n):
    takes = []
    for _ in range(4 * n):
        w = make(text)
        if w is None:
            continue
        dur = len(w) / SR
        if 0.25 < dur < 0.9 + 0.55 * len(text.split()) and judge.words(w, text) >= 0.99:
            takes.append(w)
        if len(takes) >= n:
            break
    return takes


def write_takes(key, persona, way, text, takes, first=0):
    _, credit = HOKKIEN if way == "hokkien" else CLONE
    clips = manifest["clips"].setdefault(key, [])
    for n, w in enumerate(takes, start=first):
        stem = hashlib.sha1(f"singlish|{way}|{persona}|{text}|{n}".encode()).hexdigest()[:16]
        name = save_mp3(w, stem)
        clips[:] = [c for c in clips if c.get("id") != stem]
        clips.append({"id": stem, "src": f"/hawker-voices/{name}", "persona": persona, "lg": "en", "credit": credit})


def fill():
    """Tops up lines with fewer than TAKES Singlish takes, in each persona's chosen voice and way."""
    report = json.loads((OUT / "singlish-check.json").read_text())
    lines = [l for l in json.loads(LINES.read_text()) if l["lg"] == "en"]
    hok = OmniVoice.from_pretrained(HOKKIEN[0], device_map="cuda:0", dtype=torch.float16)
    base = OmniVoice.from_pretrained(CLONE[0], device_map="cuda:0", dtype=torch.float16)
    judge = Judge()
    for persona, r in report["personas"].items():
        if not r.get("written"):
            continue
        ref = REFS / f"{persona}.wav"
        said = (REFS / f"{persona}.txt").read_text()
        way = r["used"]
        make = (lambda text, ins=r["voice"]["instruct"]: say(hok, text=spoken(text), instruct=ins)) if way == "hokkien" else (lambda text, ref=ref, said=said: say(base, text=spoken(text), ref_audio=str(ref), ref_text=said))
        for l in lines:
            if l["key"].endswith("tastyyoung.en") and persona in ("auntie", "uncle"):
                continue
            have = [c for c in manifest["clips"].get(l["key"], []) if c.get("persona") == persona and c.get("credit", "").startswith("Singlish voice:")]
            if len(have) >= TAKES:
                continue
            takes = takes_for(make, l["text"], judge, TAKES - len(have))
            write_takes(l["key"], persona, way, l["text"], takes, first=len(have) + 10)
            print(f"  {l['key']} [{persona}] +{len(takes)} takes", flush=True)


PASSAGES = [PASSAGE, "Auntie, two kopi peng, one teh, dabao ah. Steady lah, thank you. Alamak, so crowded already."]
OLDER = {"uncle": ["male, elderly", "male, middle-aged"], "auntie": ["female, elderly", "female, middle-aged"], "youngman": ["male, young adult", "male, middle-aged"]}
GOOD = 0.5  # lines strung together must score at least this local, or the persona gets no Singlish clips


def borrow(target, source, steps):
    """A persona the Hokkien model cannot voice locally (the uncle) borrows another persona's synthetic
    Singapore voice, lowered or raised by a few semitones, and clones it; the same accent gate applies."""
    lines = [l for l in json.loads(LINES.read_text()) if l["lg"] == "en"]
    who = [l for l in lines if not (l["key"].endswith("tastyyoung.en") and target in ("auntie", "uncle"))]
    base = OmniVoice.from_pretrained(CLONE[0], device_map="cuda:0", dtype=torch.float16)
    judge = Judge()
    src, said = REFS / f"{source}.wav", (REFS / f"{source}.txt").read_text()
    w, sr = sf.read(src, dtype="float32")
    shifted = torchaudio.functional.pitch_shift(torch.tensor(w).unsqueeze(0), sr, n_steps=steps).squeeze(0).numpy()
    ref = REFS / f"{target}.wav"
    sf.write(ref, shifted, sr)
    (REFS / f"{target}.txt").write_text(said)
    make = lambda t: say(base, text=spoken(t), ref_audio=str(ref), ref_text=said)
    tried = float(np.mean([judge.local(strung([make(l["text"]) for l in who]))[0] for _ in range(2)]))
    kept = {}
    for l in who:
        takes = takes_for(make, l["text"], judge, TAKES)
        if takes:
            kept[l["key"]] = takes
    final = judge.local(strung([t[0] for t in kept.values()])) if kept else (0.0, "none")
    entry = {"voice": {"borrowed from": source, "semitones": steps}, "used": "clone", "lines tried with the chosen voice": round(tried, 3), "kept lines": {"local": round(final[0], 3), "top": final[1]}}
    if final[0] >= GOOD:
        for key, takes in kept.items():
            write_takes(key, target, "clone", next(l["text"] for l in who if l["key"] == key), takes)
        entry["written"] = sum(len(t) for t in kept.values())
    else:
        entry["written"] = 0
        entry["note"] = f"below {GOOD}: no Singlish clips for this persona"
    print(target, json.dumps(entry), flush=True)
    return entry


def main(personas=None, tries=12, topk=3):
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    lines = [l for l in json.loads(LINES.read_text()) if l["lg"] == "en"]
    hok = OmniVoice.from_pretrained(HOKKIEN[0], device_map="cuda:0", dtype=torch.float16)
    base = OmniVoice.from_pretrained(CLONE[0], device_map="cuda:0", dtype=torch.float16)
    judge = Judge()
    REFS.mkdir(exist_ok=True)
    report = {"classifier": "Jzuluaga/accent-id-commonaccent_ecapa", "local": "P(singapore) + P(malaysia), on lines strung together", "personas": {}}

    for persona, voice in PERSONAS.items():
        if personas and persona not in personas:
            continue
        who = [l for l in lines if not (l["key"].endswith("tastyyoung.en") and persona in ("auntie", "uncle"))]
        # 1. Candidate synthetic Singapore voices for this persona: takes of a Singlish passage, ranked by how
        # local they sound.
        cands = []
        for k in range(tries):
            ins = OLDER.get(persona, [voice])[k % len(OLDER.get(persona, [voice]))] + PITCH[(k // 2) % len(PITCH)]
            text = PASSAGES[k % len(PASSAGES)]
            w = say(hok, text=spoken(text), instruct=ins)
            if w is None:
                continue
            s, top = judge.local(w)
            if judge.words(w, text) >= 0.7:
                cands.append((s, top, ins, text, w))
        cands.sort(key=lambda c: -c[0])
        # 2. The best few, tried on the real lines both ways (the Hokkien model, and OmniVoice cloning the
        # voice); whichever sounds most local on all the lines strung together is used.
        best = None
        for s, best_top, ins, text, w in cands[:topk]:
            ref = REFS / f"{persona}.try.wav"
            sf.write(ref, w, SR)
            ways = {
                "hokkien": lambda t, ins=ins: say(hok, text=spoken(t), instruct=ins),
                "clone": lambda t, ref=ref, text=text: say(base, text=spoken(t), ref_audio=str(ref), ref_text=spoken(text)),
            }
            for name, make in ways.items():
                score = float(np.mean([judge.local(strung([make(l["text"]) for l in who]))[0] for _ in range(2)]))
                if best is None or score > best["score"]:
                    best = {"score": score, "way": name, "voice": (s, best_top, ins, text, w)}
        s, top, ins, text, w = best["voice"]
        ref = REFS / f"{persona}.wav"
        sf.write(ref, w, SR)
        (REFS / f"{persona}.txt").write_text(spoken(text))
        (REFS / f"{persona}.try.wav").unlink(missing_ok=True)
        way = best["way"]
        make = (lambda t: say(hok, text=spoken(t), instruct=ins)) if way == "hokkien" else (lambda t: say(base, text=spoken(t), ref_audio=str(ref), ref_text=spoken(text)))
        default = judge.local(strung([say(base, text=spoken(l["text"]), instruct=voice) for l in who]))
        # 3. Takes of each line that way, kept when the words are right.
        kept = {}
        for l in who:
            takes = takes_for(make, l["text"], judge, TAKES)
            if takes:
                kept[l["key"]] = takes
            else:
                print("  no clean take for", l["key"], persona, flush=True)
        final = judge.local(strung([t[0] for t in kept.values()])) if kept else (0.0, "none")
        entry = {
            "voice": {"instruct": ins, "local": round(s, 3), "top": top},
            "used": way,
            "lines tried with the chosen voice": round(best["score"], 3),
            "kept lines": {"local": round(final[0], 3), "top": final[1]},
            "OmniVoice default, same lines": {"local": round(default[0], 3), "top": default[1]},
        }
        # 4. Only a persona whose lines sound local gets them.
        if final[0] >= GOOD:
            for key, takes in kept.items():
                text_of = next(l["text"] for l in who if l["key"] == key)
                write_takes(key, persona, way, text_of, takes)
            entry["written"] = sum(len(t) for t in kept.values())
        else:
            entry["written"] = 0
            entry["note"] = f"below {GOOD}: no Singlish clips for this persona"
        report["personas"][persona] = entry
        print(persona, json.dumps(entry), flush=True)
    return report


if __name__ == "__main__":
    import sys

    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    if "--borrow" in sys.argv:
        target, source, steps = sys.argv[sys.argv.index("--borrow") + 1].split(":")
        for key in list(manifest["clips"]):
            manifest["clips"][key] = [c for c in manifest["clips"][key] if not (c.get("persona") == target and c.get("credit", "").startswith("Singlish voice:"))]
        entry = borrow(target, source, int(steps))
        check = OUT / "singlish-check.json"
        report = json.loads(check.read_text())
        report["personas"][target] = entry
        check.write_text(json.dumps(report, indent=1) + "\n")
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
        print("done")
        sys.exit()
    if "--fill" in sys.argv:
        fill()
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
        print("done")
        sys.exit()
    # Clear earlier Singlish takes (of the personas being redone), so a rerun replaces them.
    only = sys.argv[sys.argv.index("--redo") + 1].split(",") if "--redo" in sys.argv else None
    gone = lambda c: c.get("credit", "").startswith("Singlish voice:") and (not only or c.get("persona") in only)
    for key in list(manifest["clips"]):
        if key.endswith(".en"):
            for c in manifest["clips"][key]:
                if gone(c):
                    (OUT / Path(c["src"]).name).unlink(missing_ok=True)
            manifest["clips"][key] = [c for c in manifest["clips"][key] if not gone(c)]
            if not manifest["clips"][key]:
                del manifest["clips"][key]
    # --redo uncle,youngman: only those personas, with a wider search; the others' clips and scores stay.
    redo = sys.argv[sys.argv.index("--redo") + 1].split(",") if "--redo" in sys.argv else None
    check = OUT / "singlish-check.json"
    wide = "--wide" in sys.argv  # many more candidate voices, and more of them tried on the lines
    report = main(redo, tries=60 if wide else 36 if redo else 12, topk=8 if wide else 3)
    if redo and check.exists():
        old = json.loads(check.read_text())
        old["personas"].update(report["personas"])
        report = old
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    check.write_text(json.dumps(report, indent=1) + "\n")
    print("done")
