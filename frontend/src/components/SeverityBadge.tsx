/**
 * Small colored chip for displaying an issue's severity.
 *
 * CRITICAL -> red    HIGH -> orange    MEDIUM -> yellow    LOW -> blue
 *
 * The pill also doubles as a layout hook: every issue in ReviewCard
 * gets the badge plus a confidence percentage rendered to its right.
 */

import React from "react";

import type { Severity } from "../types";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

const STYLES: Record<Severity, string> = {
  CRITICAL: "border-rose-500/40 bg-rose-500/15 text-rose-200",
  HIGH: "border-orange-500/40 bg-orange-500/15 text-orange-200",
  MEDIUM: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  LOW: "border-sky-500/40 bg-sky-500/15 text-sky-200",
};

export default function SeverityBadge({
  severity,
  className = "",
}: SeverityBadgeProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STYLES[severity]} ${className}`}
    >
      {severity}
    </span>
  );
}
