// The demo video: every shot from the edit list, its transition, captions and sound, over the records from the
// Time Capsule Radio.
import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import "./fonts.css";
import { APPS, CREDITS, SECTIONS } from "./edl";
import { frames, layout, type Placed } from "./layout";
import { BigLine, C, Caption, EndCard, Stamp, Title, Tuning } from "./parts";

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TRACK_FILES = { "singapore-1919": "music/singapore-1919.mp3", "rasa-sayang-1929": "music/rasa-sayang-1929.mp3" };

export const plan = () => layout(SECTIONS);

const Clip: React.FC<{ shot: Placed; volume?: number; seconds: number }> = ({ shot, volume = 0, seconds }) => {
  const frame = useCurrentFrame();
  const len = frames(seconds);
  const z = shot.zoom ?? [1.0, 1.06];
  const scale = interpolate(frame, [0, len], z, clamp);
  const [fx, fy] = shot.focus ?? [50, 50];
  // The clip's sound fades in and out with the picture, so cuts never click.
  const fade = (f: number) => Math.min(interpolate(f, [0, 12], [0, 1], clamp), interpolate(f, [len - 12, len], [1, 0], clamp));
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: C.ink }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${fx}% ${fy}%` }}>
        <OffthreadVideo
          src={staticFile(`clips/${shot.clip}.mp4`)}
          trimBefore={Math.max(0, frames((shot.from ?? 0) - shot.inLen))}
          playbackRate={shot.speed ?? 1}
          volume={(f) => volume * fade(f)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// How a shot comes in over the one before it.
function entrance(shot: Placed, frame: number): React.CSSProperties {
  const n = frames(shot.inLen);
  if (!n) return {};
  const p = ease(interpolate(frame, [0, n], [0, 1], clamp));
  switch (shot.in) {
    case "fade":
      return { opacity: p };
    case "slide":
      return { transform: `translateX(${(1 - p) * 100}%)`, boxShadow: `-14px 0 0 ${C.ink}` };
    case "whip":
      return { transform: `translateX(${(1 - p) * 100}%)`, filter: `blur(${(1 - p) * 26}px)` };
    case "wipe":
      return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
    case "zoom":
      return { opacity: p, transform: `scale(${1.25 - 0.25 * p})` };
    case "tune":
      return { opacity: frame >= n / 2 ? 1 : 0 };
    default:
      return {};
  }
}

const ShotView: React.FC<{ shot: Placed }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const n = frames(shot.inLen);
  const total = shot.end - shot.start + shot.inLen;
  const body = shot.kind === "title" ? (
    <Title len={frames(total)}>{shot.clip ? <Clip shot={shot} seconds={total} /> : null}</Title>
  ) : shot.kind === "end" ? (
    <EndCard len={frames(total)} apps={APPS} credits={CREDITS}>
      {shot.clip ? <Clip shot={shot} seconds={total} /> : null}
    </EndCard>
  ) : (
    <Clip shot={shot} volume={shot.vol ?? 0.35} seconds={total} />
  );
  const capAt = frames(shot.inLen + (shot.capAt ?? 0.25));
  const capLen = frames(shot.capLen ?? Math.max(0.8, shot.end - shot.start - (shot.capAt ?? 0.25) - 0.15));
  const wipeEdge = shot.in === "wipe" && frame < n ? (
    <div style={{ position: "absolute", top: 0, bottom: 0, left: `${ease(interpolate(frame, [0, n], [0, 1], clamp)) * 100}%`, width: 10, marginLeft: -5, background: C.ink }} />
  ) : null;
  return (
    <AbsoluteFill style={entrance(shot, frame)}>
      {body}
      {wipeEdge}
      {shot.caption ? (
        <Sequence from={capAt} durationInFrames={capLen} layout="none">
          <Caption spec={shot.caption} len={capLen} />
        </Sequence>
      ) : null}
      {shot.stamp ? (
        <Sequence from={frames(shot.inLen)} durationInFrames={frames(shot.end - shot.start)} layout="none">
          <Stamp text={shot.stamp.text} label={shot.stamp.label} len={frames(shot.end - shot.start)} />
        </Sequence>
      ) : null}
      {shot.big ? (
        <Sequence from={frames(shot.inLen + 0.1)} durationInFrames={frames(shot.end - shot.start - 0.15)} layout="none">
          <BigLine text={shot.big} len={frames(shot.end - shot.start - 0.15)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

export const Demo: React.FC = () => {
  const { shots, music, cues } = useMemo(plan, []);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {shots.map((s) => (
        <Sequence key={s.index} from={frames(s.start - s.inLen)} durationInFrames={Math.max(1, frames(s.end - s.start + s.inLen))} name={`${s.index} ${s.clip ?? s.kind}`}>
          <ShotView shot={s} />
        </Sequence>
      ))}
      {shots
        .filter((s) => s.in === "tune")
        .map((s) => (
          <Sequence key={`tune${s.index}`} from={frames(s.start - s.inLen)} durationInFrames={frames(s.inLen * 1.3)} name="tuning">
            <Tuning len={frames(s.inLen * 1.3)} from={s.tuneFrom} to={s.tuneTo} />
          </Sequence>
        ))}
      {music.map((m, i) => {
        const len = frames(m.end - m.start);
        // The record ducks under the moments the game speaks for itself, and fades at the ends of its run.
        const vol = (f: number) => {
          const t = m.start + f / 60;
          const duck = m.ducks.some(([a, b]) => t > a - 0.3 && t < b + 0.3) ? 0.35 : 1;
          return m.vol * duck * Math.min(interpolate(f, [0, 30], [0, 1], clamp), interpolate(f, [len - 45, len], [1, 0], clamp));
        };
        return (
          <Sequence key={`m${i}`} from={frames(m.start)} durationInFrames={len} name={`music ${m.track}`}>
            <Audio src={staticFile(TRACK_FILES[m.track])} trimBefore={Math.max(0, frames(m.offset + m.start))} volume={vol} />
          </Sequence>
        );
      })}
      {cues.map((c, i) => (
        <Sequence key={`c${i}`} from={Math.max(0, frames(c.at))} durationInFrames={frames(1.4)} name={`sfx ${c.sfx}`}>
          <Audio src={staticFile(`sfx/${c.sfx}.mp3`)} volume={c.vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
