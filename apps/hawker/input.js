// Keyboard, gamepads and touch, all turned into the same small input objects the kitchen understands:
// { mx, mz, p, u, d, t, b }  move x, move z (up the screen is -z), grab presses, chop held, dash presses,
// throw presses, and a kopi order to pull (set by the kopi builder).

const KEYS = [
  { up: ["KeyW"], down: ["KeyS"], left: ["KeyA"], right: ["KeyD"], pick: ["KeyE"], use: ["KeyQ", "Space"], dash: ["ShiftLeft"], toss: ["KeyF"] },
  { up: ["ArrowUp"], down: ["ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"], pick: ["Slash"], use: ["Period"], dash: ["ShiftRight"], toss: ["Comma"] },
];

// With one player on a keyboard, both sets of keys drive the same chef.
const SOLO = Object.fromEntries(Object.keys(KEYS[0]).map((k) => [k, [...KEYS[0][k], ...KEYS[1][k], ...(k === "pick" ? ["Enter"] : [])]]));

const blank = () => ({ mx: 0, mz: 0, p: 0, u: false, d: 0, t: 0 });

export const haptic = (ms = 12) => {
  try {
    navigator.vibrate?.(ms);
  } catch {}
};

export class Controls {
  constructor() {
    this.down = new Set();
    this.players = [blank()];
    this.count = 1;
    this.enabled = false;
    this.touch = [{ mx: 0, mz: 0, u: false }, { mx: 0, mz: 0, u: false }];
    this.pads = [];
    this.lastSource = "keys";
    addEventListener("keydown", (e) => this.key(e, true));
    addEventListener("keyup", (e) => this.key(e, false));
    addEventListener("blur", () => this.down.clear());
  }

  setPlayers(n) {
    this.count = Math.max(1, Math.min(4, n));
    this.players = Array.from({ length: this.count }, (_, i) => this.players[i] ?? blank());
  }

  maps() {
    return this.count === 1 ? [SOLO] : KEYS;
  }

  key(e, isDown) {
    if (!this.enabled) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const maps = this.maps();
    const used = maps.some((m) => Object.values(m).some((codes) => codes.includes(e.code)));
    if (!used) return;
    e.preventDefault();
    this.lastSource = "keys";
    if (isDown && !e.repeat) {
      maps.forEach((m, i) => {
        const pl = this.players[i];
        if (!pl) return;
        if (m.pick.includes(e.code)) pl.p += 1;
        if (m.dash.includes(e.code)) pl.d += 1;
        if (m.toss.includes(e.code)) pl.t += 1;
      });
    }
    if (isDown) this.down.add(e.code);
    else this.down.delete(e.code);
  }

  // Touch buttons call these.
  tap(i, kind) {
    const pl = this.players[i];
    if (!pl) return;
    this.lastSource = "touch";
    if (kind === "grab") pl.p += 1;
    if (kind === "dash") pl.d += 1;
    if (kind === "toss") pl.t += 1;
    haptic(kind === "grab" ? 10 : 18);
  }

  release() {
    this.down.clear();
    for (const t of this.touch) Object.assign(t, { mx: 0, mz: 0, u: false });
  }

  // Reads everything once a frame and returns the input for each local player.
  poll() {
    const maps = this.maps();
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    this.players.forEach((pl, i) => {
      const m = maps[i];
      const on = (codes) => this.enabled && m && codes.some((c) => this.down.has(c));
      let mx = m ? (on(m.right) ? 1 : 0) - (on(m.left) ? 1 : 0) : 0;
      let mz = m ? (on(m.down) ? 1 : 0) - (on(m.up) ? 1 : 0) : 0;
      let u = m ? on(m.use) : false;
      const t = this.touch[i];
      if (t && this.enabled && (t.mx || t.mz)) {
        mx = t.mx;
        mz = t.mz;
      }
      if (t?.u && this.enabled) u = true;
      const pad = pads[i];
      if (pad && this.enabled) {
        const ax = pad.axes[0] ?? 0;
        const az = pad.axes[1] ?? 0;
        if (Math.hypot(ax, az) > 0.25) {
          mx = ax;
          mz = az;
          this.lastSource = "pad";
        }
        const was = (this.pads[i] ??= {});
        const press = (idx, key, field) => {
          const now = Boolean(pad.buttons[idx]?.pressed);
          if (now && !was[key]) {
            pl[field] += 1;
            this.lastSource = "pad";
          }
          was[key] = now;
        };
        press(0, "a", "p");
        press(1, "b", "t");
        press(5, "rb", "d");
        press(7, "rt", "d");
        if (pad.buttons[2]?.pressed || pad.buttons[3]?.pressed) u = true;
      }
      const len = Math.hypot(mx, mz);
      pl.mx = len > 1 ? mx / len : mx;
      pl.mz = len > 1 ? mz / len : mz;
      pl.u = u;
    });
    return this.players.map((p) => ({ ...p }));
  }
}

// ---------- Touch: a floating stick and four big buttons per player ----------

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function pad(controls, i, side, labels) {
  const zone = el("div", `pad pad--${side}`);
  zone.dataset.player = String(i);
  const stickArea = el("div", "pad__stickarea");
  const base = el("div", "stick");
  const nub = el("span", "stick__nub");
  base.append(nub);
  stickArea.append(base);
  const buttons = el("div", "pad__buttons");
  const mk = (kind, text, small) => {
    const b = el("button", `tbtn tbtn--${kind}`, text);
    b.type = "button";
    if (small) b.append(el("small", "", small));
    buttons.append(b);
    return b;
  };
  const grab = mk("grab", labels.grab);
  const use = mk("use", labels.use, labels.useHint ?? "hold");
  const dash = mk("dash", labels.dash);
  const toss = mk("toss", labels.toss);
  zone.append(stickArea, buttons);

  // The stick appears wherever the thumb lands in its area.
  const R = 48;
  let id = null;
  let cx = 0;
  let cy = 0;
  const t = controls.touch[i];
  const move = (x, y) => {
    let dx = x - cx;
    let dy = y - cy;
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    nub.style.transform = `translate(${dx}px, ${dy}px)`;
    const dead = Math.hypot(dx, dy) < 7;
    t.mx = dead ? 0 : dx / R;
    t.mz = dead ? 0 : dy / R;
  };
  stickArea.addEventListener("pointerdown", (e) => {
    if (id !== null) return;
    e.preventDefault();
    id = e.pointerId;
    stickArea.setPointerCapture(id);
    const r = stickArea.getBoundingClientRect();
    cx = e.clientX;
    cy = e.clientY;
    base.style.left = `${e.clientX - r.left}px`;
    base.style.top = `${e.clientY - r.top}px`;
    base.classList.add("is-on");
    move(e.clientX, e.clientY);
  });
  stickArea.addEventListener("pointermove", (e) => e.pointerId === id && move(e.clientX, e.clientY));
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    nub.style.transform = "";
    base.classList.remove("is-on");
    base.style.left = base.style.top = "";
    t.mx = t.mz = 0;
  };
  stickArea.addEventListener("pointerup", end);
  stickArea.addEventListener("pointercancel", end);

  for (const [b, kind] of [[grab, "grab"], [dash, "dash"], [toss, "toss"]]) {
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      controls.tap(i, kind);
      b.classList.add("is-down");
    });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) b.addEventListener(ev, () => b.classList.remove("is-down"));
  }
  use.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    use.setPointerCapture(e.pointerId);
    t.u = true;
    use.classList.add("is-down");
    haptic(8);
  });
  const release = () => {
    t.u = false;
    use.classList.remove("is-down");
  };
  use.addEventListener("pointerup", release);
  use.addEventListener("pointercancel", release);
  return zone;
}

// mode "one": one player, stick on the left, buttons on the right.
// mode "two": two players sharing a tablet, each with a stick and buttons on their own side.
export function mountTouch(root, controls, mode = "one", names = null) {
  root.replaceChildren();
  root.dataset.mode = mode;
  const labels = { grab: "Grab", use: "Chop", dash: "Dash", toss: "Throw", ...(names ?? {}) };
  if (mode === "two") {
    root.append(pad(controls, 0, "left", labels), pad(controls, 1, "right", labels));
  } else {
    root.append(pad(controls, 0, "full", labels));
  }
  // Keep the page still while thumbs are busy: no scrolling, no pinch zoom.
  root.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
}
