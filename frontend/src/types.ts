/**
 * Shared TypeScript types for all data the backend exchanges with the
 * dashboard. Keeping them in one file makes it easy to keep the FastAPI
 * routes and the React UI in lockstep when the schema changes.
 */

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** A single finding inside a review category. */
export interface Issue {
  description: string;
  severity: Severity;
  confidence: number; // 0-100
}

/**
 * The list shape used on Review fields. Older rows from before the
 * structured-issue migration may still be plain strings, so consumers
 * need to normalize via `normalizeIssue` from `lib/issues`.
 */
export type IssueOrString = Issue | string;

export interface User {
  id: number;
  github_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Review {
  id: number;
  repo_name: string;
  pr_number: number;
  pr_title: string;
  pr_url: string;
  diff_summary: string | null;
  bugs_found: IssueOrString[];
  security_issues: IssueOrString[];
  performance_issues: IssueOrString[];
  code_quality_issues: IssueOrString[];
  suggestions: IssueOrString[];
  overall_score: number;
  created_at: string | null;
}

export interface Stats {
  total_reviews: number;
  average_score: number;
  total_bugs: number;
  total_security_issues: number;
}

export interface MonthlyUsage {
  year: number;
  month: number;
  reviews_this_month: number;
}

export interface HealthStatus {
  status: "ok" | "degraded" | string;
  service: string;
  version: string;
  uptime_seconds: number;
  total_reviews: number;
  database: { status: string; latency_ms?: number; detail?: string };
  groq: { status: string; model?: string; detail?: string };
}

/** Dashboard search/filter/sort controls. */
export type ScoreBucket = "all" | "low" | "mid" | "high";
export type DateBucket = "all" | "today" | "week" | "month";
export type SortMode = "newest" | "oldest" | "highest" | "lowest";

export interface ReviewFilter {
  query: string;
  scoreBucket: ScoreBucket;
  dateBucket: DateBucket;
  sort: SortMode;
}
