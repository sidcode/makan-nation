// Records a scripted playthrough of a Common Ground page as a video clip with its own sound.
// Picture: Chrome's screencast frames (JPEG), timed by Chrome and laid out at a steady 60 fps by ffmpeg.
// Sound: every Web Audio context and <audio> element on the page is tapped into one MediaRecorder inside the
// page, so the clip carries the game's real sounds, voices and recordings, in sync. Chrome itself is muted,
// so nothing plays out loud while recording.
// Chrome renders on the NVIDIA card through ANGLE (EGL), which keeps big hawker centres smooth at 1080p.

import { chromium } from "playwright-core";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

export const W = 1920;
export const H = 1080;
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`;
const NVIDIA_EGL = "/usr/share/glvnd/egl_vendor.d/10_nvidia.json";

// Runs inside the page before its own scripts.
function tapAudio() {
  const R = new AudioContext();
  const mix = R.createMediaStreamDestination();
  const connect = AudioNode.prototype.connect;
  const taps = new WeakMap();
  AudioNode.prototype.connect = function (dest, ...rest) {
    const out = connect.call(this, dest, ...rest);
    if (dest instanceof AudioDestinationNode && this.context !== R) {
      let tap = taps.get(this.context);
      if (!tap) {
        tap = this.context.createMediaStreamDestination();
        taps.set(this.context, tap);
        connect.call(R.createMediaStreamSource(tap.stream), mix);
      }
      connect.call(this, tap);
    }
    return out;
  };
  const routed = new WeakSet();
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!routed.has(this) && !(this instanceof HTMLVideoElement && this.muted)) {
      routed.add(this);
      try {
        const src = R.createMediaElementSource(this);
        connect.call(src, R.destination);
        connect.call(src, mix);
      } catch {}
    }
    return play.call(this);
  };
  let rec = null;
  let chunks = [];
  window.__rec = {
    start() {
      R.resume();
      chunks = [];
      rec = new MediaRecorder(mix.stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 256000 });
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.start(1000);
      return Date.now();
    },
    async stop() {
      await new Promise((done) => {
        rec.onstop = done;
        rec.stop();
      });
      const buf = new Uint8Array(await new Blob(chunks, { type: "audio/webm" }).arrayBuffer());
      let s = "";
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return btoa(s);
    },
  };
}

export async function launch({ width = W, height = H } = {}) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl-egl", "--autoplay-policy=no-user-gesture-required", "--mute-audio", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
    env: { ...process.env, __EGL_VENDOR_LIBRARY_FILENAMES: NVIDIA_EGL },
  });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await context.addInitScript(tapAudio);
  return { browser, context };
}

const run = (cmd, args) =>
  new Promise((ok, fail) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code ? fail(new Error(err.slice(-800))) : ok()));
  });

// Records `script(page)` on an open page into `out` (an .mp4 with sound). Returns the clip's length.
export async function record(page, out, script, { fps = 60, quality = 90 } = {}) {
  const dir = `${out}.frames`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  const writes = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const file = join(dir, `${String(frames.length).padStart(6, "0")}.jpg`);
    frames.push({ file, t: metadata.timestamp });
    writes.push(writeFile(file, Buffer.from(data, "base64")));
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  const audioStart = (await page.evaluate(() => window.__rec.start())) / 1000;
  await cdp.send("Page.startScreencast", { format: "jpeg", quality, everyNthFrame: 1 });
  await script(page);
  await cdp.send("Page.stopScreencast");
  const end = Date.now() / 1000;
  const audio = Buffer.from(await page.evaluate(() => window.__rec.stop()), "base64");
  await Promise.all(writes);
  await cdp.detach();
  if (!frames.length) throw new Error("No frames came back");
  // Each frame shows until the next one; the last until the script ended.
  const list = frames.map((f, i) => `file '${f.file}'\nduration ${((frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`).join("\n");
  await writeFile(join(dir, "list.txt"), `${list}\nfile '${frames.at(-1).file}'\n`);
  await writeFile(`${out}.audio.webm`, audio);
  const offset = Math.max(0, frames[0].t - audioStart);
  // A page that made no sound leaves an empty recording; the clip then gets a silent track.
  const sound = audio.length > 1000 ? ["-ss", offset.toFixed(3), "-i", `${out}.audio.webm`] : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"];
  await run("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"),
    ...sound,
    "-map", "0:v", "-map", "1:a?", "-r", String(fps), "-fps_mode", "cfr",
    "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p",
    // The game's own sound, evened out so the edit can sit it under the music at a known level.
    "-af", "loudnorm=I=-20:TP=-2:LRA=11", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", out,
  ]);
  await rm(dir, { recursive: true, force: true });
  await rm(`${out}.audio.webm`, { force: true });
  const seconds = end - frames[0].t;
  return { frames: frames.length, seconds, fps: frames.length / seconds };
}
