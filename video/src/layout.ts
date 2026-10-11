// Turns the edit list (edl.ts) into times on the timeline. Music sections are measured in beats of their record
// (the beats librosa found in it, saved in beats.json), so cuts land on the band's real beat even where an old
// 78 drifts; other sections are measured in seconds.
import beats from "./beats.json";
import type { Section, Shot } from "./edl";

export const FPS = 60;
export type Track = keyof typeof beats;
export type Placed = Shot & { start: number; end: number; inLen: number; index: number };
export type MusicRun = { track: Track; start: number; end: number; offset: number; vol: number; ducks: [number, number][] };
export type Cue = { at: number; sfx: string; vol: number };

export const sec = (f: number) => f / FPS;
export const frames = (s: number) => Math.round(s * FPS);

const beatTime = (track: Track, b: number) => {
  const list = beats[track].beats;
  if (b < list.length) return list[Math.max(0, b)];
  const gap = 60 / beats[track].tempo;
  return list[list.length - 1] + (b - list.length + 1) * gap;
};

export function layout(sections: Section[]) {
  const shots: Placed[] = [];
  const music: MusicRun[] = [];
  const cues: Cue[] = [];
  let t = 0;
  let index = 0;
  for (const sec of sections) {
    const start = t;
    let beat = sec.beat ?? 0;
    const ducks: [number, number][] = [];
    for (const shot of sec.shots) {
      const dur = sec.track && shot.beats ? beatTime(sec.track, beat + shot.beats) - beatTime(sec.track, beat) : (shot.dur ?? 2);
      if (shot.beats) beat += shot.beats;
      const inLen = shot.in && shot.in !== "cut" ? (shot.inLen ?? (shot.in === "tune" ? 0.7 : shot.in === "wipe" ? 0.6 : 0.35)) : 0;
      shots.push({ ...shot, start: t, end: t + dur, inLen, index: index++ });
      if (shot.in === "tune") cues.push({ at: t - inLen, sfx: "static", vol: 0.55 });
      if (shot.duck) ducks.push([t, t + dur]);
      t += dur;
    }
    if (sec.track) {
      const offset = beatTime(sec.track, sec.beat ?? 0) - start;
      const last = music[music.length - 1];
      // A section that carries on the same record joins the run before it.
      if (last && last.track === sec.track && Math.abs(last.end - start) < 0.01 && Math.abs(last.offset - offset) < 0.05) {
        last.end = t;
        last.ducks.push(...ducks);
      } else music.push({ track: sec.track, start, end: t, offset, vol: sec.musicVol ?? 0.8, ducks });
    }
  }
  return { shots, music, cues, total: t };
}
