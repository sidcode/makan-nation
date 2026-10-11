// The pieces laid over the footage, drawn in the site's own style: cards with an ink border and an offset
// shadow, Fraunces headlines, DM Mono kickers, and the Time Capsule Radio's readout and dial.
import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const C = {
  ink: "#2b1b12",
  inkSoft: "#5c4636",
  paper: "#fbf3e2",
  past: "#b5651d",
  now: "#d2492a",
  later: "#2d4f9c",
  green: "#2f6b4f",
  teal: "#2a8f8a",
  red: "#a3361f",
  lcd: "#ffb347",
};
export const F = {
  display: '"Fraunces Variable", Georgia, serif',
  ui: '"Bricolage Grotesque Variable", system-ui, sans-serif',
  mono: '"DM Mono", ui-monospace, monospace',
  lcd: '"VT323", monospace',
};
const WONK = '"SOFT" 100, "WONK" 1';

// 0 to 1 over the first `inF` frames, 1 to 0 over the last `outF` frames of a `len` frame span.
export function inOut(frame: number, len: number, inF = 18, outF = 14) {
  return Math.min(interpolate(frame, [0, inF], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), interpolate(frame, [len - outF, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
}

export type CaptionSpec = { kicker?: string; text: string; sub?: string; color?: string; where?: "left" | "right" | "center" };

// A caption card, bottom left by default, that rises in and fades out.
export const Caption: React.FC<{ spec: CaptionSpec; len: number }> = ({ spec, len }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const o = inOut(frame, len, 10, 12);
  const where = spec.where ?? "left";
  const pos: React.CSSProperties = where === "center" ? { left: "50%", transform: `translate(-50%, ${(1 - rise) * 40}px)` } : where === "right" ? { right: 64, transform: `translateY(${(1 - rise) * 40}px)` } : { left: 64, transform: `translateY(${(1 - rise) * 40}px)` };
  return (
    <div style={{ position: "absolute", bottom: 64, ...pos, opacity: o, maxWidth: 1100 }}>
      <div style={{ background: C.paper, border: `4px solid ${C.ink}`, borderRadius: 22, boxShadow: `10px 10px 0 ${C.ink}`, padding: "22px 30px 24px" }}>
        {spec.kicker ? <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 22, letterSpacing: "0.14em", textTransform: "uppercase", color: spec.color ?? C.now, marginBottom: 8 }}>{spec.kicker}</div> : null}
        <div style={{ fontFamily: F.display, fontVariationSettings: WONK, fontWeight: 650, fontSize: 58, lineHeight: 1.05, color: C.ink }}>{spec.text}</div>
        {spec.sub ? <div style={{ fontFamily: F.ui, fontSize: 28, lineHeight: 1.35, color: C.inkSoft, marginTop: 10 }}>{spec.sub}</div> : null}
      </div>
    </div>
  );
};

// The radio's readout: a glowing year, top right, for the eras.
export const Stamp: React.FC<{ text: string; label?: string; len: number }> = ({ text, label, len }) => {
  const frame = useCurrentFrame();
  const o = inOut(frame, len, 8, 12);
  const flick = frame < 10 ? (random(`flick${frame}`) > 0.4 ? 1 : 0.35) : 1;
  return (
    <div style={{ position: "absolute", top: 56, right: 64, opacity: o * flick, background: "#1d140e", border: `4px solid ${C.ink}`, borderRadius: 18, padding: "6px 26px 10px", boxShadow: `8px 8px 0 ${C.ink}`, textAlign: "right" }}>
      <div style={{ fontFamily: F.lcd, fontSize: 120, lineHeight: 1, color: C.lcd, textShadow: "0 0 18px rgba(255,179,71,.55)" }}>{text}</div>
      {label ? <div style={{ fontFamily: F.mono, fontSize: 20, letterSpacing: "0.12em", textTransform: "uppercase", color: "#e8d6b8" }}>{label}</div> : null}
    </div>
  );
};

// A radio dial sweeping past the years, with static over the picture: the cut between sections.
export const Tuning: React.FC<{ len: number; from?: number; to?: number }> = ({ len, from = 1905, to = 2065 }) => {
  const frame = useCurrentFrame();
  const t = frame / len;
  const peak = Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
  const years = [1905, 1930, 1950, 1965, 1980, 2000, 2026, 2045, 2065];
  const span = to - from;
  const needleYear = from + span * interpolate(t, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = (y: number) => 120 + ((y - 1905) / 160) * 1680;
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ opacity: 0.55 * peak, mixBlendMode: "screen" }}>
        <svg width="1920" height="1080">
          <filter id={`grain${seed}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="1920" height="1080" filter={`url(#grain${seed})`} />
        </svg>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 440, height: 200, opacity: Math.min(1, peak * 1.6), background: "#1d140ee6", borderTop: `4px solid ${C.ink}`, borderBottom: `4px solid ${C.ink}` }}>
        {years.map((y) => (
          <div key={y} style={{ position: "absolute", left: x(y) - 60, width: 120, top: 34, textAlign: "center", fontFamily: F.lcd, fontSize: 64, color: Math.abs(y - needleYear) < 12 ? C.lcd : "#8a7560" }}>
            {y}
          </div>
        ))}
        {Array.from({ length: 81 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: 120 + i * 21, top: i % 5 === 0 ? 118 : 132, width: 3, height: i % 5 === 0 ? 46 : 26, background: "#8a7560" }} />
        ))}
        <div style={{ position: "absolute", left: x(needleYear) - 3, top: 12, width: 6, height: 176, background: C.now, boxShadow: `0 0 16px ${C.now}` }} />
      </div>
    </AbsoluteFill>
  );
};

// The title: Makan Nation, in the lobby's colours, over a framed clip.
export const Title: React.FC<{ len: number; children?: React.ReactNode }> = ({ len, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const pop2 = spring({ frame: frame - 8, fps, config: { damping: 12, stiffness: 120 } });
  const o = inOut(frame, len, 6, 16);
  return (
    <AbsoluteFill style={{ background: C.paper, opacity: o }}>
      <div style={{ position: "absolute", right: 90, top: 150, width: 860, height: 520, borderRadius: 26, overflow: "hidden", border: `5px solid ${C.ink}`, boxShadow: `14px 14px 0 ${C.ink}`, transform: `rotate(${(1 - pop2) * 4 + 1.5}deg) scale(${0.9 + pop2 * 0.1})` }}>{children}</div>
      <div style={{ position: "absolute", left: 110, top: 250, transform: `translateY(${(1 - pop) * 60}px)`, opacity: pop }}>
        <div style={{ fontFamily: F.mono, fontSize: 26, letterSpacing: "0.16em", color: C.green, textTransform: "uppercase" }}>Common Ground · Culture × Tech</div>
        <div style={{ fontFamily: F.display, fontVariationSettings: WONK, fontWeight: 700, fontSize: 190, lineHeight: 0.95, color: C.ink, marginTop: 14 }}>Makan</div>
        <div style={{ fontFamily: F.display, fontVariationSettings: WONK, fontStyle: "italic", fontWeight: 650, fontSize: 190, lineHeight: 0.95, color: C.red }}>Nation</div>
        <div style={{ fontFamily: F.ui, fontSize: 38, color: C.inkSoft, marginTop: 28, maxWidth: 760, lineHeight: 1.3 }}>Singapore's hawker culture, cooked across four eras</div>
        <div style={{ fontFamily: F.mono, fontSize: 28, color: C.ink, marginTop: 22 }}>by sidcode</div>
      </div>
    </AbsoluteFill>
  );
};

// One line of the opening, big and centred over the footage.
export const BigLine: React.FC<{ text: string; len: number }> = ({ text, len }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, stiffness: 160 } });
  const o = inOut(frame, len, 6, 10);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o }}>
      <div style={{ background: C.paper, border: `5px solid ${C.ink}`, borderRadius: 26, boxShadow: `12px 12px 0 ${C.ink}`, padding: "26px 44px", transform: `scale(${0.92 + s * 0.08}) rotate(${(1 - s) * -2}deg)` }}>
        <div style={{ fontFamily: F.display, fontVariationSettings: WONK, fontWeight: 650, fontSize: 84, color: C.ink, textAlign: "center", lineHeight: 1.05 }}>{text}</div>
      </div>
    </AbsoluteFill>
  );
};

export type EndLine = { name: string; color: string; line: string };

// The end card: the five machines, the maker, the credits.
export const EndCard: React.FC<{ len: number; apps: EndLine[]; credits: string[]; children?: React.ReactNode }> = ({ len, apps, credits, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = inOut(frame, len, 14, 1);
  return (
    <AbsoluteFill style={{ background: C.paper, opacity: o }}>
      <div style={{ position: "absolute", left: 110, top: 90 }}>
        <div style={{ fontFamily: F.mono, fontSize: 26, letterSpacing: "0.16em", color: C.green, textTransform: "uppercase" }}>Common Ground · Culture × Tech · Singapore</div>
        <div style={{ fontFamily: F.display, fontVariationSettings: WONK, fontWeight: 700, fontSize: 120, color: C.ink, marginTop: 10, lineHeight: 1 }}>
          Makan <span style={{ fontStyle: "italic", color: C.red }}>Nation</span>
        </div>
        <div style={{ marginTop: 34, display: "grid", gap: 16 }}>
          {apps.map((a, i) => {
            const s = spring({ frame: frame - 10 - i * 5, fps, config: { damping: 16, stiffness: 140 } });
            return (
              <div key={a.name} style={{ display: "flex", alignItems: "baseline", gap: 18, opacity: s, transform: `translateX(${(1 - s) * -30}px)` }}>
                <span style={{ width: 22, height: 22, borderRadius: 11, background: a.color, border: `3px solid ${C.ink}`, flex: "none", transform: "translateY(2px)" }} />
                <span style={{ fontFamily: F.display, fontVariationSettings: WONK, fontWeight: 650, fontSize: 44, color: C.ink }}>{a.name}</span>
                <span style={{ fontFamily: F.ui, fontSize: 28, color: C.inkSoft }}>{a.line}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: F.display, fontVariationSettings: WONK, fontWeight: 650, fontSize: 56, color: C.ink, marginTop: 46 }}>Made by sidcode</div>
      </div>
      <div style={{ position: "absolute", right: 90, top: 120, width: 640, height: 400, borderRadius: 22, overflow: "hidden", border: `5px solid ${C.ink}`, boxShadow: `12px 12px 0 ${C.ink}`, transform: "rotate(-1.5deg)" }}>{children}</div>
      <div style={{ position: "absolute", left: 110, right: 110, bottom: 46, fontFamily: F.ui, fontSize: 19, lineHeight: 1.45, color: C.inkSoft }}>
        {credits.map((c) => (
          <div key={c}>{c}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
