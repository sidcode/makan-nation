// A tiny Web Audio band. Plucked voices use Karplus-Strong buffers re-pitched with playbackRate,
// which keeps every note exactly in tune (handy when the tuning is the whole point).

const PLUCKS = {
  pluck: { bright: 0.55, decay: 0.996, tone: 5200, bend: 0 },
  zither: { bright: 0.62, decay: 0.9975, tone: 6000, bend: -35 },
  veena: { bright: 0.5, decay: 0.998, tone: 4200, bend: -45 },
  koto: { bright: 0.72, decay: 0.9935, tone: 6500, bend: 0 },
  oud: { bright: 0.32, decay: 0.995, tone: 2600, bend: -20 },
  guitar: { bright: 0.42, decay: 0.997, tone: 3600, bend: -15 },
  krar: { bright: 0.7, decay: 0.9945, tone: 6200, bend: 0 },
  sanshin: { bright: 0.82, decay: 0.993, tone: 7200, bend: -25 },
};

const PERIOD = 200; // samples per cycle in the source buffer

export class Synth {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.drone = null;
    this.live = new Set();
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = 0.75;
    this.master.connect(comp);

    this.verb = ctx.createConvolver();
    this.verb.buffer = makeRoom(ctx, 2.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    this.verb.connect(wet).connect(comp);

    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    this.bus.connect(this.verb);

    this.noise = makeNoise(ctx, 2);
    this.fluteWave = ctx.createPeriodicWave(new Float32Array([0, 1, 0.28, 0.09, 0.04, 0.015]), new Float32Array(6));
    return ctx;
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  pluckBuffers(kind) {
    if (!this.buffers[kind]) {
      const p = PLUCKS[kind];
      this.buffers[kind] = [1, 2, 3].map((seed) => makePluck(this.ctx, p.bright, p.decay, seed));
    }
    return this.buffers[kind];
  }

  // `bend` is an optional list of [seconds after the start, cents away from freq] points,
  // used for the slides and shakes (gamakas) that ragas are known by.
  note(voice, freq, when, dur, vel = 0.8, bend = null) {
    this.ensure();
    if (voice in PLUCKS) return this.pluck(voice, freq, when, dur, vel, bend);
    if (voice === "bell") return this.bell(freq, when, dur, vel);
    return this.flute(freq, when, dur, vel, voice === "shaku", bend);
  }

  // Percussion for the rhythm cycles: hand claps and waves, ticks, and gamelan gongs.
  hit(kind, when, vel = 0.8) {
    const ctx = this.ensure();
    const gongs = { gong: [92, 4.5], kenong: [523, 1.6], kempul: [294, 1.8] };
    if (kind in gongs) {
      const [freq, dur] = gongs[kind];
      return this.bell(freq, when, dur, vel * (kind === "gong" ? 1.4 : 0.8));
    }
    const out = ctx.createGain();
    out.connect(this.bus);
    // A tick is a click; the ketuk is a small gong played damped, so it goes "tuk".
    if (kind === "tick" || kind === "ketuk") {
      const ketuk = kind === "ketuk";
      const o = ctx.createOscillator();
      o.frequency.value = ketuk ? 740 : 1900;
      const decay = ketuk ? 0.14 : 0.04;
      out.gain.setValueAtTime(vel * (ketuk ? 0.5 : 0.35), when);
      out.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      o.connect(out);
      o.start(when);
      o.stop(when + decay + 0.01);
      this.track([o], out);
      return;
    }
    // Claps are a bright burst of noise; a wave is the same thing, much softer and darker.
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = kind === "wave" ? 700 : 1500;
    bp.Q.value = 0.9;
    const level = kind === "wave" ? vel * 0.18 : vel * 0.9;
    out.gain.setValueAtTime(level, when);
    out.gain.exponentialRampToValueAtTime(0.0001, when + (kind === "wave" ? 0.12 : 0.09));
    n.connect(bp).connect(out);
    n.start(when);
    n.stop(when + 0.15);
    this.track([n], out);
  }

  // Remembers a sounding note so it can be silenced early.
  track(srcs, gain) {
    const item = { srcs, gain };
    this.live.add(item);
    srcs[0].onended = () => this.live.delete(item);
  }

  pluck(kind, freq, when, dur, vel, bend) {
    const ctx = this.ctx;
    const p = PLUCKS[kind];
    const bufs = this.pluckBuffers(kind);
    const buf = bufs[Math.floor(Math.random() * bufs.length)];
    const baseHz = ctx.sampleRate / (PERIOD + 0.5);
    const rate = freq / baseHz;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (bend) {
      src.playbackRate.setValueAtTime(rate * 2 ** ((bend[0]?.[1] ?? 0) / 1200), when);
      for (const [t, cents] of bend) src.playbackRate.linearRampToValueAtTime(rate * 2 ** (cents / 1200), when + t);
    } else if (p.bend) {
      src.playbackRate.setValueAtTime(rate * 2 ** (p.bend / 1200), when);
      src.playbackRate.exponentialRampToValueAtTime(rate, when + 0.09);
    } else {
      src.playbackRate.value = rate;
    }
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = p.tone;
    const g = ctx.createGain();
    const ring = Math.min(dur + 0.9, buf.duration / rate);
    g.gain.setValueAtTime(vel * 0.9, when);
    g.gain.setValueAtTime(vel * 0.9, when + ring - 0.08);
    g.gain.linearRampToValueAtTime(0, when + ring);
    src.connect(tone).connect(g).connect(this.bus);
    src.start(when);
    src.stop(when + ring + 0.02);
    this.track([src], g);
  }

  bell(freq, when, dur, vel) {
    const ctx = this.ctx;
    // Free bar partials sit near 1 : 2.76 : 5.40, which gives the metallic shimmer.
    const partials = [
      [1, 0.75, 2.4],
      [2.76, 0.22, 0.9],
      [5.4, 0.08, 0.35],
    ];
    const out = ctx.createGain();
    out.gain.value = vel;
    out.connect(this.bus);
    const ring = Math.max(dur + 1.2, 2.4);
    let first = null;
    for (const [ratio, amp, decay] of partials) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(amp, when + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      o.connect(g).connect(out);
      o.start(when);
      o.stop(when + ring);
      first ??= o;
    }
    // Mallet tick.
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = Math.min(freq * 6, 9000);
    bp.Q.value = 3;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.25, when);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
    n.connect(bp).connect(ng).connect(out);
    n.start(when);
    n.stop(when + 0.05);
    this.track([first], out);
  }

  flute(freq, when, dur, vel, breathy, bend) {
    const ctx = this.ctx;
    const end = when + Math.max(dur, 0.12);
    const o = ctx.createOscillator();
    o.setPeriodicWave(this.fluteWave);
    if (bend) {
      o.frequency.setValueAtTime(freq * 2 ** ((bend[0]?.[1] ?? 0) / 1200), when);
      for (const [t, cents] of bend) o.frequency.linearRampToValueAtTime(freq * 2 ** (cents / 1200), when + t);
    } else if (breathy) {
      o.frequency.setValueAtTime(freq * 2 ** (-40 / 1200), when);
      o.frequency.exponentialRampToValueAtTime(freq, when + 0.12);
    } else {
      o.frequency.value = freq;
    }

    // Vibrato eases in after the note settles.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = breathy ? 4.6 : 5.4;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, when);
    depth.gain.linearRampToValueAtTime(0, when + 0.22);
    depth.gain.linearRampToValueAtTime(freq * 0.006, when + 0.5);
    lfo.connect(depth).connect(o.frequency);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vel * 0.42, when + 0.06);
    g.gain.setValueAtTime(vel * 0.42, end);
    g.gain.linearRampToValueAtTime(0, end + 0.14);
    o.connect(g).connect(this.bus);

    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    n.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq * 2;
    bp.Q.value = 1.2;
    const ng = ctx.createGain();
    const air = breathy ? 0.16 : 0.06;
    ng.gain.setValueAtTime(0, when);
    ng.gain.linearRampToValueAtTime(vel * air * 2, when + 0.03);
    ng.gain.linearRampToValueAtTime(vel * air, when + 0.12);
    ng.gain.setValueAtTime(vel * air, end);
    ng.gain.linearRampToValueAtTime(0, end + 0.12);
    n.connect(bp).connect(ng).connect(this.bus);

    for (const s of [o, lfo, n]) {
      s.start(when);
      s.stop(end + 0.2);
    }
    this.track([o, lfo, n], g);
    this.track([n], ng);
  }

  startDrone(homeHz, hasFifth) {
    const ctx = this.ensure();
    this.stopDrone();
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1.2);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    lp.Q.value = 4;
    const sweep = ctx.createOscillator();
    sweep.frequency.value = 0.17;
    const sweepDepth = ctx.createGain();
    sweepDepth.gain.value = 420;
    sweep.connect(sweepDepth).connect(lp.frequency);
    lp.connect(out).connect(this.bus);

    const low = homeHz / 2;
    const notes = hasFifth ? [low, low * 1.5, homeHz] : [low, homeHz];
    const oscs = notes.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = i % 2 ? 2 : -2;
      o.connect(lp);
      return o;
    });
    for (const o of [...oscs, sweep]) o.start();
    this.drone = { out, oscs: [...oscs, sweep] };
  }

  stopDrone() {
    if (!this.drone) return;
    const { out, oscs } = this.drone;
    const t = this.ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0, t + 0.5);
    for (const o of oscs) o.stop(t + 0.6);
    this.drone = null;
  }

  hush() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const { srcs, gain } of this.live) {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.06);
      for (const src of srcs) {
        try {
          src.stop(t + 0.08);
        } catch {}
      }
    }
    this.live.clear();
  }
}

function makePluck(ctx, bright, decay, seed) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 2.6);
  const buf = ctx.createBuffer(1, len, sr);
  const y = buf.getChannelData(0);
  let s = seed * 9301 + 49297;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280) * 2 - 1;
  // Filtered noise burst sets the brightness of the pluck.
  let lp = 0;
  for (let i = 0; i < PERIOD; i++) {
    lp += bright * (rand() - lp);
    y[i] = lp;
  }
  for (let i = PERIOD; i < len; i++) {
    const older = i - PERIOD - 1 >= 0 ? y[i - PERIOD - 1] : 0;
    y[i] = decay * 0.5 * (y[i - PERIOD] + older);
  }
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(y[i]));
  for (let i = 0; i < len; i++) y[i] /= peak || 1;
  return buf;
}

function makeNoise(ctx, seconds) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function makeRoom(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
  }
  return buf;
}

// One band for the whole page. Plates announce when they start playing so the others can stop.
export const band = new Synth();

export function claimStage(owner) {
  dispatchEvent(new CustomEvent("musication:stage", { detail: owner }));
}

export function onStageClaimed(owner, stop) {
  addEventListener("musication:stage", (e) => {
    if (e.detail !== owner) stop();
  });
}
