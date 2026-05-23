/**
 * SVG circular progress ring for the overall 1-10 score.
 *
 * Uses stroke-dashoffset trickery so the ring "draws" in on first
 * paint thanks to a CSS transition. Color follows the same mapping
 * the legacy ReviewCard used: emerald for 8-10, amber for 5-7, rose
 * for 1-4.
 */

import React from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  stroke?: number;
}

function colorFor(score: number): {
  ring: string;
  text: string;
  trackOpacity: string;
} {
  if (score >= 8) {
    return {
      ring: "#34d399",
      text: "text-emerald-300",
      trackOpacity: "rgba(52, 211, 153, 0.18)",
    };
  }
  if (score >= 5) {
    return {
      ring: "#fbbf24",
      text: "text-amber-300",
      trackOpacity: "rgba(251, 191, 36, 0.18)",
    };
  }
  return {
    ring: "#fb7185",
    text: "text-rose-300",
    trackOpacity: "rgba(251, 113, 133, 0.18)",
  };
}

export default function ScoreRing({
  score,
  size = 64,
  stroke = 6,
}: ScoreRingProps): JSX.Element {
  const safeScore = Math.max(0, Math.min(10, score || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeScore / 10);
  const { ring, text, trackOpacity } = colorFor(safeScore);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      title={`Overall score: ${score}/10`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackOpacity}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 700ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold leading-none ${text}`}>{score}</span>
        <span className="text-[9px] uppercase tracking-widest text-slate-400">
          / 10
        </span>
      </div>
    </div>
  );
}
