/**
 * Settings page at /settings.
 *
 * Shows the connected GitHub account, aggregate stats, monthly API
 * usage, and a "Regenerate webhook secret" helper. The helper
 * generates a fresh random string client-side -- because the secret
 * actually lives in the backend `.env`, we can't rotate it remotely;
 * we make it easy for the user to copy a new value and update both
 * GitHub's webhook UI and their server config.
 */

import React, { useEffect, useMemo, useState } from "react";

import { api } from "../api";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import type { HealthStatus, MonthlyUsage, Stats, User } from "../types";
import { CopyIcon, GitHubIcon, RefreshIcon } from "../components/Icons";

interface SettingsProps {
  user: User;
}

function generateSecret(): string {
  const buf = new Uint8Array(24);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SettingsPage({ user }: SettingsProps): JSX.Element {
  const { theme, setTheme } = useTheme();
  const { push: pushToast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [usage, setUsage] = useState<MonthlyUsage | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [s, u, h] = await Promise.all([
          api.stats(),
          api.monthlyUsage(),
          api.health().catch(() => null),
        ]);
        if (!cancelled) {
          setStats(s);
          setUsage(u);
          setHealth(h);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load settings.");
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

  const accountSince = useMemo(
    () => (user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"),
    [user.created_at]
  );

  const handleRegenerate = (): void => {
    setSecret(generateSecret());
  };

  const handleCopySecret = async (): Promise<void> => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      pushToast({
        title: "Secret copied",
        message: "Paste it into GitHub's webhook UI and your backend .env.",
        variant: "success",
      });
    } catch {
      pushToast({
        title: "Clipboard unavailable",
        message: "Select the value manually and copy with Ctrl+C.",
        variant: "error",
      });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Connected account, usage, and webhook utilities.
        </p>
      </div>

      {loading && (
        <div className="rounded-xl border border-ink-700/60 bg-ink-800/60 p-6 text-sm text-slate-300">
          Loading account data…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Connected GitHub account">
            <div className="flex items-center gap-4">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="h-14 w-14 rounded-full ring-2 ring-brand-500/60"
                />
              )}
              <div>
                <p className="text-lg font-semibold text-white">
                  {user.username}
                </p>
                <p className="text-xs text-slate-400">
                  GitHub ID: {user.github_id}
                </p>
                <p className="text-xs text-slate-400">
                  Connected since {accountSince}
                </p>
              </div>
            </div>
            <a
              href={`https://github.com/${user.username}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-brand-300 hover:text-brand-200"
            >
              <GitHubIcon size={14} /> View on GitHub
            </a>
          </Card>

          <Card title="Appearance">
            <p className="text-sm text-slate-300">
              The current theme is <strong>{theme}</strong>. The choice is
              persisted to localStorage so it survives reloads.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition ${
                  theme === "dark"
                    ? "border-brand-500 bg-brand-500/15 text-white"
                    : "border-ink-600 text-slate-200 hover:border-brand-500"
                }`}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition ${
                  theme === "light"
                    ? "border-brand-500 bg-brand-500/15 text-white"
                    : "border-ink-600 text-slate-200 hover:border-brand-500"
                }`}
              >
                Light
              </button>
            </div>
          </Card>

          <Card title="Total stats">
            <Stat label="Total reviews" value={stats?.total_reviews ?? 0} />
            <Stat
              label="Average score"
              value={`${stats?.average_score ?? 0} / 10`}
            />
            <Stat label="Bugs found" value={stats?.total_bugs ?? 0} />
            <Stat
              label="Security issues"
              value={stats?.total_security_issues ?? 0}
            />
          </Card>

          <Card title="This month's usage">
            <Stat
              label="Reviews this month"
              value={usage?.reviews_this_month ?? 0}
            />
            <Stat
              label="Billing period"
              value={
                usage
                  ? `${usage.year}-${String(usage.month).padStart(2, "0")}`
                  : "—"
              }
            />
            <Stat
              label="Server uptime"
              value={health ? formatUptime(health.uptime_seconds) : "—"}
            />
            <Stat
              label="Backend status"
              value={health?.status ?? "—"}
              accent={
                health?.status === "ok" ? "text-emerald-300" : "text-amber-300"
              }
            />
          </Card>

          <Card
            title="Regenerate webhook secret"
            className="lg:col-span-2"
            footer={
              <p className="text-xs text-slate-500">
                The secret lives in your backend{" "}
                <code className="rounded bg-ink-900 px-1.5 py-0.5">
                  GITHUB_WEBHOOK_SECRET
                </code>{" "}
                env var. After updating it here, also paste it into both
                GitHub's webhook UI and your backend <code>.env</code>, then
                restart the server.
              </p>
            }
          >
            <button
              type="button"
              onClick={handleRegenerate}
              className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
            >
              <RefreshIcon size={14} />
              Generate new secret
            </button>
            {secret && (
              <div className="mt-4 rounded-lg border border-ink-700/60 bg-ink-900/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  New secret (copy now -- not stored anywhere)
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-ink-800 px-3 py-2 text-xs text-amber-200">
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-brand-500 hover:text-white"
                  >
                    <CopyIcon size={12} />
                    Copy
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

interface CardProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

function Card({ title, children, footer, className = "" }: CardProps): JSX.Element {
  return (
    <section
      className={`rounded-2xl border border-ink-700/60 bg-ink-800/60 p-6 shadow-lg shadow-black/10 ${className}`}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
        {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
      {footer && <div className="mt-5">{footer}</div>}
    </section>
  );
}

interface StatProps {
  label: string;
  value: number | string;
  accent?: string;
}

function Stat({ label, value, accent = "text-white" }: StatProps): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-700/40 pb-2 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-base font-semibold ${accent}`}>{value}</span>
    </div>
  );
}
