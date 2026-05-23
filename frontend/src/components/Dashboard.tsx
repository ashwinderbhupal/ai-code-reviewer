/**
 * Protected dashboard page.
 *
 * Responsibilities:
 *   - Fetch /stats and /reviews on mount.
 *   - Poll /reviews every 30 seconds and pop a toast when a new review
 *     has been added since the last poll.
 *   - Render skeletons while loading, a friendly empty state when
 *     there are no reviews yet, or the full SearchFilterBar + cards
 *     stack when reviews exist.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { api, getApiBase } from "../api";
import { useToast } from "../contexts/ToastContext";
import type { Review, ReviewFilter, Stats as StatsType } from "../types";
import { ChartIcon } from "./Icons";
import EmptyState from "./EmptyState";
import ReviewCard from "./ReviewCard";
import SearchFilterBar from "./SearchFilterBar";
import {
  ReviewListSkeleton,
  StatsSkeleton,
} from "./Skeleton";
import Stats from "./Stats";

const POLL_INTERVAL_MS = 30_000;

const DEFAULT_FILTER: ReviewFilter = {
  query: "",
  scoreBucket: "all",
  dateBucket: "all",
  sort: "newest",
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function withinDateBucket(reviewIso: string | null, bucket: ReviewFilter["dateBucket"]): boolean {
  if (bucket === "all" || !reviewIso) return true;
  const reviewDate = new Date(reviewIso);
  const now = new Date();
  if (bucket === "today") {
    return reviewDate >= startOfDay(now);
  }
  if (bucket === "week") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return reviewDate >= start;
  }
  if (bucket === "month") {
    return (
      reviewDate.getFullYear() === now.getFullYear() &&
      reviewDate.getMonth() === now.getMonth()
    );
  }
  return true;
}

function withinScoreBucket(score: number, bucket: ReviewFilter["scoreBucket"]): boolean {
  if (bucket === "all") return true;
  if (bucket === "low") return score >= 0 && score <= 4;
  if (bucket === "mid") return score >= 5 && score <= 7;
  if (bucket === "high") return score >= 8 && score <= 10;
  return true;
}

function applyFilter(reviews: Review[], filter: ReviewFilter): Review[] {
  const query = filter.query.trim().toLowerCase();
  const filtered = reviews.filter((r) => {
    if (query) {
      const haystack = `${r.repo_name} ${r.pr_title}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (!withinScoreBucket(r.overall_score || 0, filter.scoreBucket)) return false;
    if (!withinDateBucket(r.created_at, filter.dateBucket)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (filter.sort) {
      case "oldest":
        return tsValue(a.created_at) - tsValue(b.created_at);
      case "highest":
        return (b.overall_score || 0) - (a.overall_score || 0);
      case "lowest":
        return (a.overall_score || 0) - (b.overall_score || 0);
      case "newest":
      default:
        return tsValue(b.created_at) - tsValue(a.created_at);
    }
  });
  return sorted;
}

function tsValue(iso: string | null): number {
  return iso ? new Date(iso).getTime() : 0;
}

export default function Dashboard(): JSX.Element {
  const [stats, setStats] = useState<StatsType | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>(DEFAULT_FILTER);
  const { push: pushToast } = useToast();

  const knownReviewIds = useRef<Set<number>>(new Set());
  const lastPollFailed = useRef(false);

  const loadAll = useCallback(
    async (mode: "initial" | "poll"): Promise<void> => {
      if (mode === "initial") {
        setLoading(true);
        setError(null);
      }
      try {
        const [nextStats, nextReviews] = await Promise.all([
          api.stats(),
          api.reviews(),
        ]);
        setStats(nextStats);
        setReviews(nextReviews);

        if (mode === "initial") {
          knownReviewIds.current = new Set(nextReviews.map((r) => r.id));
        } else {
          const fresh = nextReviews.filter(
            (r) => !knownReviewIds.current.has(r.id)
          );
          for (const review of fresh) {
            pushToast({
              title: "New review received!",
              message: `${review.repo_name}#${review.pr_number} -- score ${review.overall_score}/10`,
              variant: "success",
            });
            knownReviewIds.current.add(review.id);
          }
        }
        lastPollFailed.current = false;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load data.";
        if (mode === "initial") {
          setError(message);
        } else if (!lastPollFailed.current) {
          lastPollFailed.current = true;
          pushToast({
            title: "Background refresh failed",
            message,
            variant: "warning",
          });
        }
      } finally {
        if (mode === "initial") setLoading(false);
      }
    },
    [pushToast]
  );

  useEffect(() => {
    void loadAll("initial");
  }, [loadAll]);

  useEffect(() => {
    const handle = window.setInterval(() => {
      void loadAll("poll");
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [loadAll]);

  const filteredReviews = useMemo(
    () => applyFilter(reviews, filter),
    [reviews, filter]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Reviews</h1>
          <p className="mt-1 text-sm text-slate-400">
            Every pull request our AI has analyzed for you.
          </p>
        </div>
        <Link
          to="/stats"
          className="inline-flex items-center gap-2 self-start rounded-md border border-ink-600 px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-brand-500 hover:text-white"
        >
          <ChartIcon size={14} />
          View charts
        </Link>
      </div>

      {loading && (
        <div className="space-y-8">
          <StatsSkeleton />
          <ReviewListSkeleton count={3} />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && stats && (
        <>
          <Stats stats={stats} />

          {reviews.length === 0 ? (
            <div className="mt-10">
              <EmptyState apiBase={getApiBase()} />
            </div>
          ) : (
            <>
              <div className="mt-8">
                <SearchFilterBar
                  value={filter}
                  onChange={setFilter}
                  total={reviews.length}
                  visible={filteredReviews.length}
                />
              </div>

              <div className="mt-6 space-y-5">
                {filteredReviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-ink-700/60 bg-ink-800/40 p-8 text-center text-sm text-slate-400">
                    No reviews match the current filters. Try clearing the
                    search or widening the score range.
                  </div>
                ) : (
                  filteredReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
