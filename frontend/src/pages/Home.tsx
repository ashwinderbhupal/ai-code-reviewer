/**
 * Public landing page.
 *
 * Sections:
 *   1. Animated hero with gradient blob and primary CTA.
 *   2. Demo placeholder (where a real GIF/video can be dropped in).
 *   3. "How it works" -- three numbered steps with icons.
 *   4. Features grid -- six cards with icons.
 *   5. Footer with GitHub link.
 */

import React from "react";
import { Link } from "react-router-dom";

import type { User } from "../types";
import DashboardPreview from "../components/DashboardPreview";
import {
  BugIcon,
  ChartIcon,
  GitHubIcon,
  ShieldIcon,
  SparkleIcon,
  WrenchIcon,
  ZapIcon,
} from "../components/Icons";

interface HomeProps {
  user: User | null;
}

interface FeatureProps {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number }>;
  title: string;
  description: string;
  accent: string;
}

function Feature({ Icon, title, description, accent }: FeatureProps): JSX.Element {
  return (
    <div className="group rounded-2xl border border-ink-700/60 bg-ink-800/50 p-6 transition hover:-translate-y-0.5 hover:border-brand-500/50 hover:bg-ink-800/80">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}
      >
        <Icon size={18} className="text-white" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        {description}
      </p>
    </div>
  );
}

interface StepProps {
  number: number;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number }>;
  title: string;
  description: string;
}

function Step({ number, Icon, title, description }: StepProps): JSX.Element {
  return (
    <div className="relative rounded-2xl border border-ink-700/60 bg-ink-800/40 p-6">
      <span className="absolute -top-3 left-6 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white shadow">
        {number}
      </span>
      <Icon size={28} className="text-brand-300" />
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        {description}
      </p>
    </div>
  );
}

export default function Home({ user }: HomeProps): JSX.Element {
  return (
    <div>
      {/* ----- Hero ----- */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(900px 400px at 20% 20%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(600px 360px at 80% 30%, rgba(168,85,247,0.32), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <span className="inline-flex animate-fade-in items-center rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-200">
            Powered by Llama 3.3 70B on Groq
          </span>
          <h1 className="mt-5 animate-fade-in text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
            AI Code Reviews for{" "}
            <span className="bg-gradient-to-r from-brand-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
              Every Pull Request
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl animate-fade-in text-base text-slate-300 sm:text-lg">
            Connect your GitHub repo once and we&rsquo;ll automatically
            analyze every new PR for bugs, security holes, performance
            regressions, code-quality smells, and style problems &mdash;
            then post the findings as a comment and a dashboard card.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-500"
              >
                Open dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-500"
              >
                Sign in with GitHub
              </Link>
            )}
            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-ink-600 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-500 hover:text-white"
            >
              Get a free Groq key
            </a>
          </div>
        </div>
      </section>

      {/* ----- Dashboard preview ----- */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900/60 shadow-2xl shadow-black/40 ring-1 ring-white/5">
          <div className="aspect-video w-full">
            <DashboardPreview />
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">
          A live mock of the AI Code Reviewer dashboard.
        </p>
      </section>

      {/* ----- How it works ----- */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-white">How it works</h2>
          <p className="mt-2 text-sm text-slate-300">
            Three small steps from "I want this" to "PR comments are
            appearing automatically".
          </p>
        </header>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Step
            number={1}
            Icon={GitHubIcon}
            title="Connect your repo"
            description="Sign in with GitHub and add a webhook pointing at /webhook. Takes 60 seconds."
          />
          <Step
            number={2}
            Icon={SparkleIcon}
            title="Open a Pull Request"
            description="Each push triggers a fresh LLM review. The diff is sent to Groq and parsed into structured findings."
          />
          <Step
            number={3}
            Icon={ChartIcon}
            title="Get insights instantly"
            description="See bugs, security issues, and trends on the dashboard. The same review is posted as a PR comment."
          />
        </div>
      </section>

      {/* ----- Features grid ----- */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-white">What gets reviewed</h2>
          <p className="mt-2 text-sm text-slate-300">
            Six layers of analysis per diff. Each finding is tagged with
            a severity (CRITICAL/HIGH/MEDIUM/LOW) and a confidence %.
          </p>
        </header>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            Icon={BugIcon}
            title="Logic bugs"
            description="Off-by-one errors, missing null checks, unhandled edge cases, race conditions."
            accent="bg-amber-500/80"
          />
          <Feature
            Icon={ShieldIcon}
            title="Security holes"
            description="Injection vectors, secrets in code, missing input validation, OWASP-style risks."
            accent="bg-rose-500/80"
          />
          <Feature
            Icon={ZapIcon}
            title="Performance"
            description="N+1 queries, hot-loop allocations, blocking I/O, quadratic algorithms."
            accent="bg-sky-500/80"
          />
          <Feature
            Icon={WrenchIcon}
            title="Code quality"
            description="Complexity, duplication, naming, error handling, missing docstrings, memory leaks."
            accent="bg-fuchsia-500/80"
          />
          <Feature
            Icon={SparkleIcon}
            title="Suggestions"
            description="Nice-to-have refactors and stylistic polish to keep your codebase consistent."
            accent="bg-emerald-500/80"
          />
          <Feature
            Icon={ChartIcon}
            title="Dashboard analytics"
            description="Line, bar, and pie charts showing trends across repos and the last 30 days."
            accent="bg-brand-500/80"
          />
        </div>
      </section>

      {/* ----- Final CTA ----- */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <div className="rounded-2xl border border-ink-700/60 bg-gradient-to-br from-brand-600/20 to-fuchsia-600/15 p-8 text-center shadow-xl shadow-black/20">
          <h2 className="text-2xl font-bold text-white">Ready to try it?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-200">
            Sign in with GitHub, add a webhook to your repository pointing
            at <code className="rounded bg-ink-900/80 px-1.5 py-0.5">/webhook</code>,
            and open a pull request. Your first AI review will appear here in seconds.
          </p>
          <div className="mt-6">
            <Link
              to={user ? "/dashboard" : "/login"}
              className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow transition hover:bg-slate-100"
            >
              {user ? "Go to dashboard" : "Sign in with GitHub"}
            </Link>
          </div>
        </div>
      </section>

      {/* ----- Footer ----- */}
      <footer className="border-t border-ink-700/60 bg-ink-900/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} AI Code Reviewer. Open source. MIT
            licensed.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-white"
          >
            <GitHubIcon size={14} />
            View source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
