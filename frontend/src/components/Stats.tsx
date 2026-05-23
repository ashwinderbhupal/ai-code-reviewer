import React from "react";

import { Stats as StatsType } from "../api";

interface StatsProps {
  stats: StatsType;
}

interface CardProps {
  label: string;
  value: number | string;
  hint?: string;
  accent: string;
}

function StatCard({ label, value, hint, accent }: CardProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-800/70 p-5 shadow-lg shadow-black/20">
      <div className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

/** Four headline metrics rendered above the review list. */
export default function Stats({ stats }: StatsProps): JSX.Element {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total PRs Reviewed"
        value={stats.total_reviews}
        accent="text-brand-500"
      />
      <StatCard
        label="Average Score"
        value={`${stats.average_score} / 10`}
        accent="text-emerald-400"
      />
      <StatCard
        label="Bugs Found"
        value={stats.total_bugs}
        accent="text-amber-400"
      />
      <StatCard
        label="Security Issues"
        value={stats.total_security_issues}
        accent="text-rose-400"
      />
    </section>
  );
}
