// The radio's own noises: hiss between stations, crackle on shellac, the whistle you hear when you
// are nearly tuned in, and the wall that muffles songs sealed for the future.

function noiseBuffer(ctx, seconds) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // Pink-ish noise (Paul Kellet's cheap filter) sounds warmer than plain white noise.
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
  }
  return buf;
}

function crackleBuffer(ctx, seconds) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    if (Math.random() < 0.0009) {
      const amp = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
      const len = 20 + Math.floor(Math.random() * 60);
      for (let j = 0; j < len && i + j < d.length; j++) d[i + j] += amp * Math.exp(-j / 8);
    }
    d[i] += (Math.random() * 2 - 1) * 0.01;
  }
  return buf;
}

export class RadioSound {
  ctx = null;

  async start() {
    if (this.ctx) return this.ctx.resume();
    const ctx = (this.ctx = new AudioContext());
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);

    this.hissGain = this.#loop(noiseBuffer(ctx, 3), (src) => {
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 2200;
      band.Q.value = 0.5;
      return src.connect(band);
    });
    this.crackleGain = this.#loop(crackleBuffer(ctx, 7));

    this.whistle = ctx.createOscillator();
    this.whistle.frequency.value = 900;
    this.whistleGain = ctx.createGain();
    this.whistleGain.gain.value = 0;
    this.whistle.connect(this.whistleGain).connect(this.master);
    this.whistle.start();

    this.wall = ctx.createBiquadFilter();
    this.wall.type = "lowpass";
    this.wall.frequency.value = 450;
    this.futureGain = ctx.createGain();
    this.futureGain.gain.value = 0;
    this.wall.connect(this.futureGain).connect(this.master);
  }

  #loop(buffer, shape = (src) => src) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    shape(src).connect(gain).connect(this.master);
    src.start();
    return gain;
  }

  #to(param, value, smooth = 0.04) {
    param.setTargetAtTime(value, this.ctx.currentTime, smooth);
  }

  // signal: 0 (lost) to 1 (locked). near: 0 to 1, how close we are to any station.
  mix({ hiss, crackle, whistle, whistleHz, future }) {
    if (!this.ctx) return;
    this.#to(this.hissGain.gain, hiss);
    this.#to(this.crackleGain.gain, crackle);
    this.#to(this.whistleGain.gain, whistle);
    this.#to(this.whistle.frequency, whistleHz, 0.02);
    this.#to(this.futureGain.gain, future);
  }

  // Songs from the future play through the wall. Each element can only be wired up once.
  throughWall(el) {
    if (!el._wired) {
      this.ctx.createMediaElementSource(el).connect(this.wall);
      el._wired = true;
    }
  }

  openWall(open) {
    if (this.ctx) this.#to(this.wall.frequency, open ? 18000 : 450, open ? 0.5 : 0.08);
  }

  // A chunky mechanical clunk for the band keys.
  clunk() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Turn the radio down while someone is previewing songs in the sealer.
  duck(on) {
    if (this.ctx) this.#to(this.master.gain, on ? 0.12 : 1, 0.15);
  }

  suspend() {
    return this.ctx?.suspend();
  }
}
