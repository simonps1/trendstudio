import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { progress } from "../../core/anim";
import { FONT_BODY, FONT_DISPLAY } from "../../core/fonts";
import { counter, T } from "./timeline";

const PHASES: [number, string][] = [
  [T.nebula, "STELLAR NURSERY"], [T.ignition, "MAIN SEQUENCE"], [T.giant, "RED SUPERGIANT"],
  [T.collapse, "CORE COLLAPSE"], [T.supernova, "SUPERNOVA"], [T.blackHole, "BLACK HOLE"],
];

/** Year counter + current life phase. */
export const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const u = Math.min(width, height) / 1080;
  const vis = progress(t, 0.2, 0.8) * (1 - progress(t, T.dust - 0.3, T.dust + 0.3));
  if (vis <= 0) return null;
  const { label, value } = counter(t);
  const phase = [...PHASES].reverse().find(([s]) => t >= s)?.[1];
  const phaseStart = [...PHASES].reverse().find(([s]) => t >= s)?.[0] ?? 0;
  const pIn = progress(t, phaseStart, phaseStart + 0.4);
  const urgent = label === "SECONDS";
  const counterA = 1 - progress(t, T.supernova + 2.2, T.supernova + 2.8);
  const portrait = height > width;
  return (
    <AbsoluteFill style={{ opacity: vis, pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: (portrait ? 92 : 48) * u, left: 0, right: 0, textAlign: "center",
        fontFamily: FONT_BODY, color: "rgba(255,255,255,0.92)",
      }}>
        <div style={{ opacity: counterA }}>
        <div style={{ fontWeight: 800, fontSize: 22 * u, letterSpacing: 6 * u, opacity: 0.7 }}>{label}</div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 76 * u, lineHeight: 1.05, fontVariantNumeric: "tabular-nums",
          color: urgent ? "#ff6b6b" : "#fff", textShadow: `0 0 ${24 * u}px rgba(120,170,255,0.55)`,
        }}>
          {urgent ? value : Number(value).toLocaleString("en-US")}
        </div>
        </div>
        {phase && (
          <div style={{
            display: "inline-block", marginTop: 10 * u, padding: `${6 * u}px ${16 * u}px`, borderRadius: 999,
            border: `${1.5 * u}px solid rgba(255,255,255,0.35)`, background: "rgba(0,0,0,0.25)",
            fontWeight: 800, fontSize: 20 * u, letterSpacing: 4 * u,
            opacity: pIn, transform: `translateY(${(1 - pIn) * 10 * u}px)`,
          }}>{phase}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};
