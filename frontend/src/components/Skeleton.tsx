/**
 * Loading skeletons used while the dashboard waits for /reviews and
 * /stats to come back. Built with Tailwind's `animate-pulse` utility
 * so we don't need any animation library.
 */

import React from "react";

export function SkeletonBlock({
  className = "",
}: {
  className?: string;
}): JSX.Element {
  return (
    <div
      className={`animate-pulse rounded-md bg-ink-700/70 dark:bg-ink-700/70 ${className}`}
    />
  );
}

export function StatsSkeleton(): JSX.Element {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-ink-700/60 bg-ink-800/60 p-5"
        >
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-3 h-8 w-16" />
          <SkeletonBlock className="mt-2 h-3 w-32" />
        </div>
      ))}
    </section>
  );
}

export function ReviewCardSkeleton(): JSX.Element {
  return (
    <article className="animate-pulse rounded-2xl border border-ink-700/60 bg-ink-800/70 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-3 w-1/2" />
          <SkeletonBlock className="h-3 w-1/3" />
        </div>
        <div className="h-16 w-16 rounded-full bg-ink-700/70" />
      </header>
      <SkeletonBlock className="mt-5 h-3 w-full" />
      <SkeletonBlock className="mt-2 h-3 w-5/6" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </article>
  );
}

export function ReviewListSkeleton({ count = 3 }: { count?: number }): JSX.Element {
  return (
    <div className="space-y-5">
      {Array.from({ length: count }).map((_, i) => (
        <ReviewCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartSkeleton({
  label,
}: {
  label: string;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-800/60 p-5">
      <SkeletonBlock className="h-3 w-32" />
      <SkeletonBlock className="mt-5 h-48 w-full" />
      <SkeletonBlock className="mt-3 h-2 w-2/3" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
