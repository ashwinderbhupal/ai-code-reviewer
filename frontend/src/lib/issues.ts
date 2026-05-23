/**
 * Helpers for normalizing the various shapes the backend can return
 * for an "issue" list.
 *
 * Older Review rows persisted issues as plain strings; newer ones
 * persist objects with description/severity/confidence. The UI sticks
 * to the structured shape so the rest of the code can stay simple.
 */

import type { Issue, IssueOrString, Severity } from "../types";

const ALLOWED_SEVERITIES: ReadonlySet<Severity> = new Set([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

/** Coerce one of-string-or-object issues into a structured Issue. */
export function normalizeIssue(raw: IssueOrString): Issue {
  if (typeof raw === "string") {
    return { description: raw, severity: "MEDIUM", confidence: 60 };
  }
  const severity: Severity = ALLOWED_SEVERITIES.has(raw.severity as Severity)
    ? (raw.severity as Severity)
    : "MEDIUM";
  const confidence = clampConfidence(raw.confidence);
  return {
    description: raw.description ?? "",
    severity,
    confidence,
  };
}

/** Normalize an array of issues. */
export function normalizeIssues(raw: IssueOrString[] | undefined | null): Issue[] {
  if (!raw) return [];
  return raw
    .map(normalizeIssue)
    .filter((issue) => issue.description.trim().length > 0);
}

/** Clamp arbitrary numeric confidence into the documented 0-100 range. */
export function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 60;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Order severities most-severe first when sorting / displaying. */
export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};
