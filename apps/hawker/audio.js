// Every sound is made in code: no files to load, nothing to license. None plays the same way twice.

export class Sfx {
  ctx = null;
  muted = false;

  start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.5;
      this.out.connect(this.ctx.destination);
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  // Every sound is a little different each time: a few cents of pitch, a touch of length and loudness,
  // a different slice of noise through a slightly different filter, and a place in the stereo field.
  // Melodic cues pick a note or an interval that is not the one they played last.
  last = {};

  pick(kind, options) {
    const i0 = this.last[kind];
    let i = Math.floor(Math.random() * options.length);
    if (options.length > 1 && i === i0) i = (i + 1 + Math.floor(Math.random() * (options.length - 1))) % options.length;
    this.last[kind] = i;
    return options[i];
  }

  // Where a sound sits left to right (-1 to 1), for the next few sounds played by play().
  pan = 0;
  gain = 1;

  route(t, dur) {
    const node = this.ctx.createStereoPanner?.();
    if (!node) return this.out;
    const p = Math.max(-0.8, Math.min(0.8, this.pan + (Math.random() - 0.5) * 0.2));
    node.pan.setValueAtTime(p, t);
    node.connect(this.out);
    setTimeout(() => node.disconnect(), (dur + 0.3) * 1000 + (t - this.ctx.currentTime) * 1000);
    return node;
  }

  tone(freq, dur = 0.1, { type = "sine", vol = 0.3, slide = 0, delay = 0, exact = false } = {}) {
    if (!this.ctx || this.muted) return;
    const j = (k) => (exact ? 1 : 1 + (Math.random() - 0.5) * k);
    dur *= j(0.2);
    vol *= j(0.3) * this.gain;
    const t = this.ctx.currentTime + delay + (exact ? 0 : Math.random() * 0.012);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (!exact) o.detune.setValueAtTime((Math.random() - 0.5) * 50, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide * j(0.3)), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.008 + (exact ? 0 : Math.random() * 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.route(t, dur));
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  hiss(dur = 0.2, { vol = 0.2, freq = 3000, q = 0.8, delay = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    dur *= 1 + (Math.random() - 0.5) * 0.3;
    vol *= (1 + (Math.random() - 0.5) * 0.35) * this.gain;
    const t = this.ctx.currentTime + delay + Math.random() * 0.015;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.85 + Math.random() * 0.3;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq * 2 ** ((Math.random() - 0.5) * 0.5);
    f.Q.value = q * (0.75 + Math.random() * 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, vol), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.route(t, dur));
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }

  // opts.pan: -1 (left) to 1 (right), from where it happened; opts.gain: quieter or louder than usual.
  play(type, { pan = 0, gain = 1 } = {}) {
    this.pan = pan;
    this.gain = gain;
    try {
      return this.sound(type);
    } finally {
      this.pan = 0;
      this.gain = 1;
    }
  }

  sound(type) {
    const r = (a, b) => a + Math.random() * (b - a);
    switch (type) {
      case "pick":
        return this.tone(this.pick("pick", [600, 660, 720, 780]), 0.07, { type: "triangle", vol: 0.18, slide: 220 });
      case "drop":
        return this.tone(this.pick("drop", [300, 330, 360]), 0.08, { type: "triangle", vol: 0.2, slide: -120 });
      case "plate": {
        // Two clinks of china, never quite the same pair.
        const f = r(780, 980);
        this.tone(f, 0.06, { type: "triangle", vol: 0.15 });
        return this.tone(f * this.pick("plate", [1.33, 1.5, 1.6, 1.78]), 0.08, { type: "triangle", vol: 0.12, delay: r(0.035, 0.07) });
      }
      case "chop":
        this.tone(220 + Math.random() * 60, 0.03, { type: "square", vol: 0.06 });
        return this.hiss(0.05, { vol: 0.35, freq: 1800, q: 2 });
      case "shave":
        return this.hiss(0.08, { vol: 0.2, freq: 7000, q: 1 });
      case "press":
        this.tone(90 + Math.random() * 30, 0.06, { type: "square", vol: 0.05, slide: -20 });
        return this.hiss(0.1, { vol: 0.18, freq: 1100, q: 1.2 });
      case "spread":
        // A knife scraping kaya across warm toast.
        return this.hiss(0.09, { vol: 0.16, freq: 2600, q: 0.8 });
      case "scrub":
        return this.hiss(0.12, { vol: 0.15, freq: 5000, q: 0.5 });
      case "pour":
        return this.hiss(0.25, { vol: 0.12, freq: 900, q: 1.5 });
      case "cookin":
        return this.hiss(0.4, { vol: 0.25, freq: 4200, q: 0.4 });
      case "done":
        return this.tone(this.pick("done", [988, 1046, 1175, 1319]), 0.12, { vol: 0.15 });
      case "serve": {
        // A rising pair from the pentatonic scale, a different one from last time.
        const [a, b] = this.pick("serve", [[1319, 1760], [1175, 1568], [1047, 1568], [1568, 2093], [1319, 1976]]);
        this.tone(a, 0.09, { type: "square", vol: 0.08 });
        return this.tone(b, 0.18, { type: "square", vol: 0.08, delay: r(0.07, 0.1) });
      }
      case "wrong":
      case "nope":
        return this.tone(this.pick("nope", [140, 150, 165]), 0.18, { type: "sawtooth", vol: 0.12, slide: -40 });
      case "burn":
        this.tone(440, 0.15, { type: "square", vol: 0.12 });
        return this.tone(330, 0.25, { type: "square", vol: 0.12, delay: 0.16 });
      case "order":
        return this.tone(this.pick("order", [1319, 1568, 1760, 2093, 2349]), 0.25, { vol: 0.12 });
      case "expire": {
        const k = this.pick("expire", [1, 0.89, 1.12]);
        this.tone(392 * k, 0.2, { type: "triangle", vol: 0.15 });
        return this.tone(330 * k, 0.35, { type: "triangle", vol: 0.15, delay: 0.2 });
      }
      case "bin":
        return this.hiss(0.15, { vol: 0.2, freq: 400, q: 1 });
      case "dash":
        return this.hiss(0.18, { vol: 0.18, freq: 900, q: 0.6 });
      case "throw":
        this.hiss(0.2, { vol: 0.14, freq: 1600, q: 0.8 });
        return this.tone(r(450, 560), 0.15, { type: "triangle", vol: 0.08, slide: 400 });
      case "catch":
        return this.tone(this.pick("catch", [700, 784, 880]), 0.08, { type: "triangle", vol: 0.16, slide: 200 });
      case "splat":
        this.hiss(0.12, { vol: 0.3, freq: 300, q: 0.7 });
        return this.tone(120, 0.12, { type: "sine", vol: 0.2, slide: -60 });
      case "fire":
        this.hiss(0.6, { vol: 0.3, freq: 700, q: 0.4 });
        return this.tone(220, 0.3, { type: "sawtooth", vol: 0.08, slide: 60 });
      case "spray":
        return this.hiss(0.2, { vol: 0.2, freq: 5200, q: 0.3 });
      case "fizz":
        this.hiss(0.5, { vol: 0.25, freq: 3000, q: 0.3 });
        return this.tone(660, 0.2, { type: "triangle", vol: 0.1, delay: 0.3 });
      case "cheer": {
        const n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) this.hiss(0.3, { vol: 0.08, freq: r(1000, 3000), q: 3, delay: i * r(0.02, 0.05) });
        return this.tone(this.pick("cheer", [1047, 1175, 1319, 1568]), 0.2, { type: "triangle", vol: 0.1, delay: 0.05 });
      }
      case "sizzle":
        return this.hiss(0.35, { vol: 0.07, freq: 6000, q: 0.5 });
      case "chaos":
        this.tone(330, 0.12, { type: "square", vol: 0.08 });
        return this.tone(440, 0.2, { type: "square", vol: 0.08, delay: 0.13 });
      case "lastorders": {
        const k = this.pick("lastorders", [1, 1.122, 0.891]);
        [880, 660, 880].forEach((f, i) => this.tone(f * k, 0.12, { type: "square", vol: 0.07, delay: i * 0.15 }));
        return;
      }
      case "power":
        return this.tone(220, 0.3, { type: "sine", vol: 0.12, slide: 440 });
      case "tick":
        return this.tone(2000, 0.03, { type: "square", vol: 0.05 });
      case "end": {
        // The end of a round: one of a few arpeggios, in one of a few keys.
        const run = this.pick("end", [[523, 659, 784, 1046], [523, 587, 784, 1046], [392, 523, 659, 784, 1046], [587, 740, 880, 1175]]);
        const k = this.pick("endkey", [1, 1.06, 0.94]);
        run.forEach((f, i) => this.tone(f * k, 0.2, { type: "triangle", vol: 0.15, delay: i * 0.12 }));
        return;
      }
    }
  }
}
