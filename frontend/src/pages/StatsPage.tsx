/**
 * Detailed analytics view rendered at /stats.
 *
 * Pulls every review for the current user once on mount and derives
 * three charts:
 *   - LineChart: reviews per day for the last 30 days.
 *   - BarChart:  average score per repository.
 *   - PieChart:  total count of issues by category.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "../api";
import { ChartSkeleton } from "../components/Skeleton";
import { normalizeIssues } from "../lib/issues";
import type { Review } from "../types";

const PIE_COLORS = ["#fbbf24", "#fb7185", "#38bdf8", "#a855f7", "#34d399"];
const PIE_LABELS = [
  "Bugs",
  "Security",
  "Performance",
  "Code Quality",
  "Suggestions",
];

const CHART_AXIS_STYLE = { fill: "#94a3b8", fontSize: 12 };
const CHART_GRID_COLOR = "rgba(148, 163, 184, 0.15)";

interface DailyPoint {
  date: string;
  count: number;
}

interface RepoAverage {
  repo: string;
  avg: number;
  reviews: number;
}

interface IssuePoint {
  name: string;
  value: number;
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function buildDaily(reviews: Review[]): DailyPoint[] {
  const days = lastNDays(30);
  const counts = new Map<string, number>(days.map((d) => [d, 0]));
  for (const review of reviews) {
    if (!review.created_at) continue;
    const key = new Date(review.created_at).toISOString().slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return days.map((d) => ({
    date: d.slice(5),
    count: counts.get(d) || 0,
  }));
}

function buildRepoAverages(reviews: Review[]): RepoAverage[] {
  const buckets = new Map<string, { total: number; sum: number }>();
  for (const review of reviews) {
    const stats = buckets.get(review.repo_name) || { total: 0, sum: 0 };
    stats.total += 1;
    stats.sum += review.overall_score || 0;
    buckets.set(review.repo_name, stats);
  }
  return Array.from(buckets.entries())
    .map(([repo, stats]) => ({
      repo,
      avg: stats.total ? Math.round((stats.sum / stats.total) * 10) / 10 : 0,
      reviews: stats.total,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);
}

function buildIssueDistribution(reviews: Review[]): IssuePoint[] {
  const totals = [0, 0, 0, 0, 0];
  for (const review of reviews) {
    totals[0] += normalizeIssues(review.bugs_found).length;
    totals[1] += normalizeIssues(review.security_issues).length;
    totals[2] += normalizeIssues(review.performance_issues).length;
    totals[3] += normalizeIssues(review.code_quality_issues).length;
    totals[4] += normalizeIssues(review.suggestions).length;
  }
  return PIE_LABELS.map((name, i) => ({ name, value: totals[i] }));
}

export default function StatsPage(): JSX.Element {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.reviews();
        if (!cancelled) setReviews(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load stats.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const daily = useMemo(() => buildDaily(reviews), [reviews]);
  const perRepo = useMemo(() => buildRepoAverages(reviews), [reviews]);
  const distribution = useMemo(() => buildIssueDistribution(reviews), [reviews]);
  const totalIssues = distribution.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-slate-400">
          Trends across your reviews from the last 30 days and beyond.
        </p>
      </div>

      {loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton label="Loading reviews over time" />
          <ChartSkeleton label="Loading per-repo averages" />
          <ChartSkeleton label="Loading issue distribution" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-700/60 bg-ink-800/40 p-10 text-center text-sm text-slate-400">
              No reviews yet -- analytics will appear here as soon as your
              first PR is reviewed.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="Reviews over time" subtitle="Last 30 days">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={daily}>
                    <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={CHART_AXIS_STYLE} stroke={CHART_GRID_COLOR} />
                    <YAxis allowDecimals={false} tick={CHART_AXIS_STYLE} stroke={CHART_GRID_COLOR} />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1020",
                        border: "1px solid #1a2240",
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 2, fill: "#6366f1" }}
                      activeDot={{ r: 4 }}
                      name="Reviews"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Average score per repo"
                subtitle="Top 8 repositories"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={perRepo} layout="vertical">
                    <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={[0, 10]}
                      tick={CHART_AXIS_STYLE}
                      stroke={CHART_GRID_COLOR}
                    />
                    <YAxis
                      type="category"
                      dataKey="repo"
                      width={120}
                      tick={CHART_AXIS_STYLE}
                      stroke={CHART_GRID_COLOR}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1020",
                        border: "1px solid #1a2240",
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                      formatter={(value: number, _name: string, item) => [
                        `${value} / 10 (${item.payload.reviews} reviews)`,
                        "Average score",
                      ]}
                    />
                    <Bar dataKey="avg" fill="#34d399" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Issue distribution"
                subtitle={`${totalIssues} total findings across all reviews`}
                full
              >
                {totalIssues === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-400">
                    No findings yet -- looks clean!
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={distribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={3}
                      >
                        {distribution.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend
                        wrapperStyle={{ color: "#cbd5f5", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#0b1020",
                          border: "1px solid #1a2240",
                          borderRadius: 8,
                        }}
                        labelStyle={{ color: "#e2e8f0" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  full?: boolean;
}

function ChartCard({
  title,
  subtitle,
  children,
  full = false,
}: ChartCardProps): JSX.Element {
  return (
    <section
      className={`rounded-2xl border border-ink-700/60 bg-ink-800/60 p-5 shadow-lg shadow-black/10 ${
        full ? "lg:col-span-2" : ""
      }`}
    >
      <header className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  );
}
