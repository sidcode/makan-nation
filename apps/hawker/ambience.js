// The sound of a hall that never loops: field recordings of food courts (media/audio.json) on two decks
// that crossfade every 12 to 25 seconds. Each stretch is a recording not heard last, from a random point
// in it, a touch faster or slower (so a little higher or lower), at a slightly different level. Between
// them, now and then, a plate or a cup somewhere in the room (`extra`, from the caller).

const FADE_MS = 3000;

export class HallSound {
  // files: urls of the recordings, with their lengths in seconds: [{ url, seconds }].
  // volume: 0 to 1. extra: called every few seconds for a one-off sound, or null.
  constructor(files, { volume = 0.4, extra = null } = {}) {
    this.files = files.filter((f) => f.url);
    this.volume = volume;
    this.extra = extra;
    this.decks = [new Audio(), new Audio()];
    for (const d of this.decks) {
      d.preload = "auto";
      d.preservesPitch = false;
      d.mozPreservesPitch = false;
      d.webkitPreservesPitch = false;
    }
    this.on = 0;
    this.bag = [];
    this.last = null;
    this.timers = [];
    this.running = false;
  }

  start() {
    if (this.running || !this.files.length) return;
    this.running = true;
    this.next();
    this.sprinkle();
  }

  stop() {
    this.running = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    for (const d of this.decks) this.fade(d, 0, 900);
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    const d = this.decks[this.on];
    if (!d.paused) this.fade(d, this.volume * (d._level ?? 1), 400);
  }

  // A shuffled bag of recordings, refilled when empty, never handing out the one just played.
  draw() {
    if (!this.bag.length) {
      this.bag = [...this.files].sort(() => Math.random() - 0.5);
      if (this.bag.length > 1 && this.bag[0] === this.last) this.bag.push(this.bag.shift());
    }
    this.last = this.bag.shift();
    return this.last;
  }

  next() {
    if (!this.running) return;
    const file = this.draw();
    const span = 12 + Math.random() * 13;
    const incoming = this.decks[1 - this.on];
    const outgoing = this.decks[this.on];
    this.on = 1 - this.on;
    const rate = 0.94 + Math.random() * 0.12;
    incoming._level = 0.85 + Math.random() * 0.3;
    incoming.src = file.url;
    incoming.loop = true;
    incoming.playbackRate = rate;
    incoming.volume = 0;
    const startAt = () => {
      const len = Number.isFinite(incoming.duration) ? incoming.duration : file.seconds ?? 20;
      try {
        incoming.currentTime = Math.random() * Math.max(0, len - 2);
      } catch {}
      incoming.play().then(() => this.fade(incoming, Math.min(1, this.volume * incoming._level))).catch(() => {});
    };
    if (incoming.readyState >= 1) startAt();
    else incoming.addEventListener("loadedmetadata", startAt, { once: true });
    if (!outgoing.paused) this.fade(outgoing, 0);
    this.timers.push(setTimeout(() => this.next(), span * 1000));
  }

  // One-off sounds at uneven gaps, so the room is never on a beat.
  sprinkle() {
    if (!this.running || !this.extra) return;
    this.timers.push(
      setTimeout(() => {
        if (!this.running) return;
        try {
          this.extra();
        } catch {}
        this.sprinkle();
      }, 1800 + Math.random() * 5200),
    );
  }

  fade(el, to, ms = FADE_MS) {
    clearInterval(el._fade);
    const from = el.volume;
    const t0 = performance.now();
    el._fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) {
        clearInterval(el._fade);
        if (to === 0) el.pause();
      }
    }, 50);
  }
}
