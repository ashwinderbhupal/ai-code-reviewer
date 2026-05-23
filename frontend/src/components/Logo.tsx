/**
 * Reusable brand mark.
 *
 * Same visual identity as `public/favicon.svg`: a rounded gradient
 * square containing the classic code chevrons `< >` with a diagonal
 * "spark" stroke running through them. Used in the navbar, the login
 * page, and anywhere else the app needs to identify itself.
 */

import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
}

export default function Logo({
  size = 32,
  className = "",
  withWordmark = false,
}: LogoProps): JSX.Element {
  const gradientId = React.useId();
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label="AI Code Reviewer"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="14"
          fill={`url(#${gradientId})`}
        />
        <path
          d="M22 38 L16 32 L22 26 M42 26 L48 32 L42 38 M36 22 L28 42"
          fill="none"
          stroke="#ffffff"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withWordmark && (
        <span className="text-lg font-bold tracking-tight text-white">
          AI Code Reviewer
        </span>
      )}
    </span>
  );
}
