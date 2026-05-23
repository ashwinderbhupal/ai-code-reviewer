/**
 * One PR's worth of AI review, rendered as an expandable card.
 *
 * Features:
 *   - Animated circular score ring on the right.
 *   - Color-coded severity badge + confidence % beside every finding.
 *   - Section icons (bug, shield, zap, wrench, sparkle).
 *   - Expand / collapse animation for the review body.
 *   - "Copy Report" button -- copies the rendered markdown to clipboard.
 *   - "View PR" button -- opens the GitHub PR in a new tab.
 *   - "Export .md" button -- downloads the report via /reviews/:id/export.
 */

import React, { useMemo, useState } from "react";

import { api } from "../api";
import { useToast } from "../contexts/ToastContext";
import { normalizeIssues, SEVERITY_ORDER } from "../lib/issues";
import type { Issue, Review } from "../types";
import {
  BugIcon,
  ChevronIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ShieldIcon,
  SparkleIcon,
  WrenchIcon,
  ZapIcon,
} from "./Icons";
import ScoreRing from "./ScoreRing";
import SeverityBadge from "./SeverityBadge";

interface ReviewCardProps {
  review: Review;
}

interface SectionDescriptor {
  title: string;
  items: Issue[];
  empty: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number }>;
  accent: string;
}

function buildSections(review: Review): SectionDescriptor[] {
  return [
    {
      title: "Bugs",
      items: sortBySeverity(normalizeIssues(review.bugs_found)),
      empty: "No bugs detected.",
      Icon: BugIcon,
      accent: "text-amber-300",
    },
    {
      title: "Security",
      items: sortBySeverity(normalizeIssues(review.security_issues)),
      empty: "No security issues detected.",
      Icon: ShieldIcon,
      accent: "text-rose-300",
    },
    {
      title: "Performance",
      items: sortBySeverity(normalizeIssues(review.performance_issues)),
      empty: "No performance issues detected.",
      Icon: ZapIcon,
      accent: "text-sky-300",
    },
    {
      title: "Code Quality",
      items: sortBySeverity(normalizeIssues(review.code_quality_issues)),
      empty: "No code-quality concerns.",
      Icon: WrenchIcon,
      accent: "text-fuchsia-300",
    },
    {
      title: "Suggestions",
      items: sortBySeverity(normalizeIssues(review.suggestions)),
      empty: "No suggestions.",
      Icon: SparkleIcon,
      accent: "text-emerald-300",
    },
  ];
}

function sortBySeverity(items: Issue[]): Issue[] {
  return [...items].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
}

function renderMarkdown(review: Review, sections: SectionDescriptor[]): string {
  const lines: string[] = [];
  lines.push(`# AI Code Review for ${review.repo_name} #${review.pr_number}`);
  lines.push("");
  lines.push(`- **PR title:** ${review.pr_title}`);
  lines.push(`- **PR URL:** ${review.pr_url}`);
  lines.push(`- **Overall score:** ${review.overall_score}/10`);
  if (review.created_at) {
    lines.push(`- **Reviewed:** ${new Date(review.created_at).toLocaleString()}`);
  }
  if (review.diff_summary) {
    lines.push("");
    lines.push(`> ${review.diff_summary}`);
  }
  for (const section of sections) {
    lines.push("");
    lines.push(`## ${section.title}`);
    if (section.items.length === 0) {
      lines.push("_None_");
      continue;
    }
    for (const issue of section.items) {
      lines.push(
        `- **[${issue.severity} | ${issue.confidence}%]** ${issue.description}`
      );
    }
  }
  return lines.join("\n");
}

export default function ReviewCard({ review }: ReviewCardProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [copying, setCopying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { push: pushToast } = useToast();

  const sections = useMemo(() => buildSections(review), [review]);
  const created = review.created_at
    ? new Date(review.created_at).toLocaleString()
    : "—";

  const totalFindings = sections.reduce((sum, s) => sum + s.items.length, 0);

  const handleCopy = async (): Promise<void> => {
    setCopying(true);
    try {
      const markdown = renderMarkdown(review, sections);
      await navigator.clipboard.writeText(markdown);
      pushToast({
        title: "Report copied",
        message: `${review.repo_name}#${review.pr_number} -- markdown is on your clipboard.`,
        variant: "success",
      });
    } catch (err) {
      pushToast({
        title: "Copy failed",
        message: err instanceof Error ? err.message : "Clipboard unavailable.",
        variant: "error",
      });
    } finally {
      setCopying(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const markdown = await api.exportReview(review.id);
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `review-${review.repo_name.replace("/", "_")}-pr${review.pr_number}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      pushToast({
        title: "Report downloaded",
        message: link.download,
        variant: "success",
      });
    } catch (err) {
      pushToast({
        title: "Export failed",
        message: err instanceof Error ? err.message : "Could not download.",
        variant: "error",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-800/70 shadow-lg shadow-black/20 transition hover:border-brand-500/40">
      <header className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <a
            href={review.pr_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 break-all text-base font-semibold text-white hover:text-brand-500"
          >
            <span className="truncate">{review.repo_name}</span>
            <span className="text-slate-400">#{review.pr_number}</span>
            <ExternalLinkIcon size={14} className="shrink-0" />
          </a>
          <p className="mt-1 break-words text-sm text-slate-300">
            {review.pr_title}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Reviewed {created} -- {totalFindings} findings
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={review.pr_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-brand-500 hover:text-white"
            >
              <ExternalLinkIcon size={12} />
              View PR
            </a>
            <button
              type="button"
              onClick={handleCopy}
              disabled={copying}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-brand-500 hover:text-white disabled:opacity-50"
            >
              <CopyIcon size={12} />
              {copying ? "Copying…" : "Copy Report"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-brand-500 hover:text-white disabled:opacity-50"
            >
              <DownloadIcon size={12} />
              {exporting ? "Exporting…" : "Export .md"}
            </button>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-brand-500 hover:text-white"
              aria-expanded={expanded}
            >
              <ChevronIcon
                size={12}
                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
              />
              {expanded ? "Collapse" : "Expand details"}
            </button>
          </div>
        </div>

        <ScoreRing score={review.overall_score} />
      </header>

      {review.diff_summary && (
        <p className="mx-6 mb-2 rounded-lg bg-ink-900/60 p-3 text-sm italic text-slate-300">
          {review.diff_summary}
        </p>
      )}

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid gap-5 px-6 pb-6 pt-2 sm:grid-cols-2">
            {sections.map((section) => (
              <Section key={section.title} {...section} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function Section({
  title,
  items,
  empty,
  Icon,
  accent,
}: SectionDescriptor): JSX.Element {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon size={14} className={accent} />
        <h4
          className={`text-xs font-semibold uppercase tracking-wider ${accent}`}
        >
          {title}
        </h4>
        <span className="rounded-full bg-ink-700/60 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          {items.map((issue, idx) => (
            <li
              key={idx}
              className="rounded-md border border-ink-700/40 bg-ink-900/40 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={issue.severity} />
                <span className="text-[11px] font-semibold text-slate-400">
                  {issue.confidence}% confidence
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-snug text-slate-100">
                {issue.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
