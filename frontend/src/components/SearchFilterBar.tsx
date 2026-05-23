/**
 * Toolbar above the review list that lets the user search by
 * repo/title, filter by score bucket + date range, and pick a sort
 * order. Controlled component -- the parent owns the `ReviewFilter`
 * state.
 */

import React from "react";

import { SearchIcon } from "./Icons";
import type {
  DateBucket,
  ReviewFilter,
  ScoreBucket,
  SortMode,
} from "../types";

interface SearchFilterBarProps {
  value: ReviewFilter;
  onChange: (next: ReviewFilter) => void;
  total: number;
  visible: number;
}

const SCORE_OPTIONS: { value: ScoreBucket; label: string }[] = [
  { value: "all", label: "All scores" },
  { value: "low", label: "0 to 4" },
  { value: "mid", label: "5 to 7" },
  { value: "high", label: "8 to 10" },
];

const DATE_OPTIONS: { value: DateBucket; label: string }[] = [
  { value: "all", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest score" },
  { value: "lowest", label: "Lowest score" },
];

const SELECT_CLASS =
  "rounded-md border border-ink-700/60 bg-ink-900/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 dark:bg-ink-900/60 light:bg-white light:text-slate-700 light:border-slate-300";

export default function SearchFilterBar({
  value,
  onChange,
  total,
  visible,
}: SearchFilterBarProps): JSX.Element {
  const update = <K extends keyof ReviewFilter>(
    key: K,
    next: ReviewFilter[K]
  ): void => {
    onChange({ ...value, [key]: next });
  };

  return (
    <section className="rounded-2xl border border-ink-700/60 bg-ink-800/60 p-4 shadow-lg shadow-black/10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <label className="flex flex-1 items-center gap-2 rounded-md border border-ink-700/60 bg-ink-900/60 px-3 py-2 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/40">
          <SearchIcon size={16} className="text-slate-400" />
          <input
            type="search"
            value={value.query}
            onChange={(e) => update("query", e.target.value)}
            placeholder="Search by repo or PR title…"
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            aria-label="Search reviews"
          />
        </label>

        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
          <select
            value={value.scoreBucket}
            onChange={(e) => update("scoreBucket", e.target.value as ScoreBucket)}
            className={SELECT_CLASS}
            aria-label="Filter by score"
          >
            {SCORE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={value.dateBucket}
            onChange={(e) => update("dateBucket", e.target.value as DateBucket)}
            className={SELECT_CLASS}
            aria-label="Filter by date"
          >
            {DATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={value.sort}
            onChange={(e) => update("sort", e.target.value as SortMode)}
            className={`${SELECT_CLASS} col-span-2 md:col-span-1`}
            aria-label="Sort reviews"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Showing <span className="font-semibold text-slate-200">{visible}</span> of{" "}
        <span className="font-semibold text-slate-200">{total}</span> reviews
      </p>
    </section>
  );
}
