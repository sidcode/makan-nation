// Listens to a 30 second preview and measures a few things a person would notice:
// how fast it goes, how bright it sounds, how loud it gets over time, and which notes it leans on.
// Everything runs in small chunks so the page keeps breathing while it works.

const SR = 22050;
const N = 2048;
const HOP = 512;
const FPS = SR / HOP;

export const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

// Krumhansl and Kessler key profiles.
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const breathe = () => new Promise((r) => setTimeout(r, 0));

export async function decodePreview(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Preview ${res.status}`);
  const bytes = await res.arrayBuffer();
  // Decoding through a 22.05 kHz offline context resamples for us.
  const off = new OfflineAudioContext(1, SR, SR);
  const audio = await off.decodeAudioData(bytes);
  const len = Math.min(audio.length, SR * 30);
  const mono = new Float32Array(len);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const d = audio.getChannelData(c);
    for (let i = 0; i < len; i++) mono[i] += d[i] / audio.numberOfChannels;
  }
  return mono;
}

function makeFFT(n) {
  const bits = Math.log2(n);
  const cos = new Float64Array(n / 2);
  const sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n);
    sin[i] = Math.sin((2 * Math.PI * i) / n);
  }
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  return (re, im) => {
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let size = 2; size <= n; size *= 2) {
      const half = size / 2;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const l = i + j + half;
          const tre = re[l] * cos[k] + im[l] * sin[k];
          const tim = im[l] * cos[k] - re[l] * sin[k];
          re[l] = re[i + j] - tre;
          im[l] = im[i + j] - tim;
          re[i + j] += tre;
          im[i + j] += tim;
        }
      }
    }
  };
}

const fft = makeFFT(N);
const hann = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));

export async function analyse(mono, onProgress) {
  const frames = Math.max(0, Math.floor((mono.length - N) / HOP) + 1);
  if (frames < FPS * 4) throw new Error("Too short to read");
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const mag = new Float64Array(N / 2);
  const prevLog = new Float64Array(N / 2);
  const flux = new Float64Array(frames);
  const centroid = new Float64Array(frames);
  const rms = new Float64Array(frames);
  const chroma = new Float64Array(12);
  const binHz = SR / N;
  const kLo = Math.ceil(80 / binHz);
  const kHi = Math.floor(5000 / binHz);

  for (let f = 0; f < frames; f++) {
    const off = f * HOP;
    let energy = 0;
    for (let i = 0; i < N; i++) {
      const s = mono[off + i];
      energy += s * s;
      re[i] = s * hann[i];
      im[i] = 0;
    }
    rms[f] = Math.sqrt(energy / N);
    fft(re, im);

    let num = 0, den = 0, fl = 0, peak = 0;
    for (let k = 1; k < N / 2; k++) {
      const m = Math.hypot(re[k], im[k]);
      mag[k] = m;
      if (m > peak) peak = m;
      num += k * binHz * m;
      den += m;
      const lg = Math.log1p(100 * m);
      const rise = lg - prevLog[k];
      if (rise > 0) fl += rise;
      prevLog[k] = lg;
    }
    flux[f] = fl;
    centroid[f] = den > 1e-9 ? num / den : 0;

    // Chroma from spectral peaks, with each peak's frequency refined between bins.
    if (peak > 1e-4) {
      const floor = peak * 0.05;
      for (let k = kLo; k <= kHi; k++) {
        const m = mag[k];
        if (m <= floor || m <= mag[k - 1] || m < mag[k + 1]) continue;
        const a = Math.log(mag[k - 1] + 1e-12);
        const b = Math.log(m + 1e-12);
        const c = Math.log(mag[k + 1] + 1e-12);
        const curve = a - 2 * b + c;
        const shift = curve !== 0 ? (0.5 * (a - c)) / curve : 0;
        const hz = (k + shift) * binHz;
        const midi = 69 + 12 * Math.log2(hz / 440);
        chroma[((Math.round(midi) % 12) + 12) % 12] += m;
      }
    }

    if (f % 40 === 39) {
      onProgress?.(f / frames);
      await breathe();
    }
  }
  onProgress?.(1);

  const loudest = Math.max(...rms);
  const audible = (i) => rms[i] > loudest * 0.05;

  let cSum = 0, cW = 0;
  for (let i = 0; i < frames; i++) {
    if (!audible(i)) continue;
    cSum += centroid[i] * rms[i];
    cW += rms[i];
  }

  const top = Math.max(...chroma) || 1;
  const notes = Array.from(chroma, (v) => v / top);

  return {
    bpm: tempo(flux),
    brightness: cW ? cSum / cW : 0,
    loudness: loudnessShape(rms, loudest),
    chroma: notes,
    key: guessKey(notes),
    seconds: mono.length / SR,
  };
}

function tempo(flux) {
  const n = flux.length;
  // Remove the slow trend so only the hits are left.
  const w = Math.round(FPS * 0.4);
  const onset = new Float64Array(n);
  let run = 0;
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + flux[i];
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - w);
    const hi = Math.min(n, i + w + 1);
    run = (pre[hi] - pre[lo]) / (hi - lo);
    onset[i] = Math.max(0, flux[i] - run);
  }
  // Soften each hit a little so beats that fall between frames still line up.
  const soft = new Float64Array(n);
  const kernel = [1, 4, 6, 4, 1];
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = -2; k <= 2; k++) s += (onset[i + k] || 0) * kernel[k + 2];
    soft[i] = s / 16;
  }

  const lagFor = (bpm) => (60 * FPS) / bpm;
  const minLag = Math.floor(lagFor(200));
  const maxLag = Math.ceil(lagFor(55));
  const ac = new Float64Array(maxLag * 2 + 2);
  for (let lag = minLag; lag < ac.length && lag < n; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += soft[i] * soft[i + lag];
    ac[lag] = s / (n - lag);
  }

  let best = minLag, bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = 60 * FPS / lag;
    // A gentle preference for walking-pace tempos, plus support from the double-length lag.
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 115) / 0.9) ** 2);
    const score = (ac[lag] + 0.5 * (ac[lag * 2] || 0)) * prior;
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  const a = ac[best - 1] || 0, b = ac[best], c = ac[best + 1] || 0;
  const curve = a - 2 * b + c;
  const lag = best + (curve !== 0 ? (0.5 * (a - c)) / curve : 0);
  return Math.round((60 * FPS) / lag);
}

function loudnessShape(rms, loudest, points = 60) {
  const out = new Array(points).fill(0);
  const per = rms.length / points;
  for (let p = 0; p < points; p++) {
    let s = 0, c = 0;
    for (let i = Math.floor(p * per); i < Math.floor((p + 1) * per); i++) {
      s += rms[i];
      c++;
    }
    const db = 20 * Math.log10((c ? s / c : 0) / (loudest || 1) + 1e-6);
    out[p] = Math.max(0, 1 + db / 36);
  }
  return out;
}

function correlate(x, y) {
  const mx = x.reduce((a, b) => a + b) / x.length;
  const my = y.reduce((a, b) => a + b) / y.length;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy || 1);
}

function guessKey(chroma) {
  let best = { tonic: 0, mode: "major", r: -2 };
  for (let t = 0; t < 12; t++) {
    const rot = chroma.map((_, i) => chroma[(i + t) % 12]);
    for (const [mode, profile] of [["major", MAJOR], ["minor", MINOR]]) {
      const r = correlate(rot, profile);
      if (r > best.r) best = { tonic: t, mode, r };
    }
  }
  return best;
}

function cosine(a, b) {
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < 12; i++) {
    num += a[i] * b[i];
    da += a[i] * a[i];
    db += b[i] * b[i];
  }
  return num / Math.sqrt(da * db || 1);
}

// Compares two fingerprints. `shift` is how many semitones B would move to best match A.
export function compare(a, b) {
  const overlap = cosine(a.chroma, b.chroma);
  let shape = overlap, shift = 0;
  for (let r = 1; r < 12; r++) {
    const moved = b.chroma.map((_, i) => b.chroma[(i - r + 12) % 12]);
    const s = cosine(a.chroma, moved);
    if (s > shape + 1e-9) {
      shape = s;
      shift = r > 6 ? r - 12 : r;
    }
  }
  const pace = Math.max(a.bpm, b.bpm) / Math.min(a.bpm, b.bpm);
  return { overlap, shape, shift, pace, brighter: a.brightness >= b.brightness ? "a" : "b" };
}

export function verdict(cmp) {
  const { overlap, shape, shift } = cmp;
  if (overlap >= 0.93) return "Practically twins. Were they separated at birth?";
  if (overlap >= 0.82) return "Close cousins. They lean on mostly the same notes.";
  if (shape >= 0.9 && shift !== 0) {
    const n = Math.abs(shift);
    return `Same scale shape, sitting ${n} semitone${n === 1 ? "" : "s"} apart. Same recipe, different pot.`;
  }
  if (overlap >= 0.62) return "Distant relatives. Some shared notes, plenty of their own.";
  return "Strangers at the same bus stop. Very few notes in common.";
}

export function paceWords(bpm) {
  if (bpm < 80) return "strolling";
  if (bpm < 105) return "walking";
  if (bpm < 130) return "jogging";
  return "running";
}

export function brightWords(hz) {
  if (hz < 1300) return "mellow";
  if (hz < 2100) return "warm";
  if (hz < 3000) return "bright";
  return "fizzy";
}
