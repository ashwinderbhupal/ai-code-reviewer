/**
 * Empty-state card shown on the dashboard before any PR has been
 * reviewed yet. Includes a small inline SVG illustration plus a
 * collapsible "Setup Guide" panel walking the user through the
 * webhook configuration.
 */

import React, { useState } from "react";

import { GitHubIcon, SparkleIcon } from "./Icons";

function Illustration(): JSX.Element {
  return (
    <svg
      viewBox="0 0 220 140"
      className="mx-auto h-32 w-full max-w-xs"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="empty-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <rect
        x="20"
        y="20"
        width="180"
        height="100"
        rx="14"
        fill="url(#empty-grad)"
        stroke="#6366f1"
        strokeOpacity="0.5"
        strokeWidth="1.5"
      />
      <rect x="34" y="42" width="86" height="6" rx="3" fill="#e2e8f0" opacity="0.55" />
      <rect x="34" y="56" width="124" height="6" rx="3" fill="#e2e8f0" opacity="0.4" />
      <rect x="34" y="70" width="100" height="6" rx="3" fill="#e2e8f0" opacity="0.3" />
      <rect x="34" y="84" width="64" height="6" rx="3" fill="#e2e8f0" opacity="0.25" />
      <circle cx="178" cy="46" r="14" fill="#1f2a4b" stroke="#fbbf24" strokeWidth="1.5" />
      <text
        x="178"
        y="51"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#fbbf24"
      >
        AI
      </text>
    </svg>
  );
}

interface EmptyStateProps {
  apiBase: string;
}

export default function EmptyState({ apiBase }: EmptyStateProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const webhookUrl = `${apiBase}/webhook`;

  return (
    <div className="rounded-2xl border border-dashed border-ink-700/60 bg-ink-800/40 p-8 text-center">
      <Illustration />
      <h2 className="mt-6 text-lg font-semibold text-white">No reviews yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
        Open a Pull Request to get started -- as soon as GitHub fires the
        webhook, the AI review will appear here.
      </p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-6 inline-flex items-center gap-2 rounded-md border border-brand-500/60 px-4 py-2 text-sm font-semibold text-brand-50 transition hover:bg-brand-500/20"
        aria-expanded={open}
      >
        <SparkleIcon size={16} />
        {open ? "Hide Setup Guide" : "View Setup Guide"}
      </button>

      {open && (
        <div className="mx-auto mt-6 max-w-xl animate-fade-in rounded-xl border border-ink-700/60 bg-ink-900/60 p-5 text-left text-sm text-slate-200">
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              In your GitHub repo, go to
              <code className="mx-1 rounded bg-ink-800 px-1.5 py-0.5">
                Settings → Webhooks → Add webhook
              </code>
              .
            </li>
            <li>
              <span className="block">Set the <strong>Payload URL</strong> to:</span>
              <code className="mt-1 block break-all rounded bg-ink-800 px-2 py-1 text-xs text-amber-200">
                {webhookUrl}
              </code>
              <span className="mt-1 block text-xs text-slate-400">
                (Use your ngrok URL instead of <code>localhost</code> if
                running locally.)
              </span>
            </li>
            <li>
              Set <strong>Content type</strong> to{" "}
              <code className="rounded bg-ink-800 px-1.5 py-0.5">application/json</code>.
            </li>
            <li>
              Paste the same secret you set in{" "}
              <code className="rounded bg-ink-800 px-1.5 py-0.5">
                GITHUB_WEBHOOK_SECRET
              </code>{" "}
              into <strong>Secret</strong>.
            </li>
            <li>
              Pick <strong>Let me select individual events</strong> →{" "}
              <strong>Pull requests</strong>, then save.
            </li>
            <li>
              Open a PR -- the dashboard auto-refreshes every 30s and a
              toast will pop up when the review lands.
            </li>
          </ol>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400">
            <GitHubIcon size={12} />
            Need a new OAuth/Webhook app? See the README for step-by-step.
          </p>
        </div>
      )}
    </div>
  );
}
