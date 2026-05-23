/**
 * Top navigation bar.
 *
 * Renders the app's name on the left and either a CTA to log in or
 * the user's avatar + dashboard / stats / settings links on the right.
 * Includes a dark/light mode toggle.
 */

import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import type { User } from "../types";
import { ChartIcon, SettingsIcon, SparkleIcon } from "./Icons";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

const NAV_LINK_CLASS =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-300 transition hover:text-white";

const NAV_LINK_ACTIVE = "text-white";

export default function Navbar({ user, onLogout }: NavbarProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/60 bg-ink-900/80 backdrop-blur transition-colors dark:bg-ink-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={32} />
          <span className="text-lg font-bold tracking-tight text-white">
            AI Code Reviewer
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `${NAV_LINK_CLASS} ${isActive ? NAV_LINK_ACTIVE : ""}`
                }
              >
                <SparkleIcon size={14} />
                Dashboard
              </NavLink>
              <NavLink
                to="/stats"
                className={({ isActive }) =>
                  `${NAV_LINK_CLASS} ${isActive ? NAV_LINK_ACTIVE : ""}`
                }
              >
                <ChartIcon size={14} />
                Charts
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `${NAV_LINK_CLASS} ${isActive ? NAV_LINK_ACTIVE : ""}`
                }
              >
                <SettingsIcon size={14} />
                Settings
              </NavLink>
              <ThemeToggle />
              <div className="flex items-center gap-2">
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="h-8 w-8 rounded-full ring-2 ring-brand-500/60"
                  />
                )}
                <span className="text-sm font-medium text-slate-200">
                  {user.username}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-md border border-ink-600 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-brand-500 hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link
                to="/login"
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-brand-500"
              >
                Sign in
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-700/60 text-slate-200"
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            <span className="block h-0.5 w-5 bg-current shadow-[0_-6px_0_currentColor,0_6px_0_currentColor]" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-ink-700/60 px-4 py-3 md:hidden">
          {user ? (
            <ul className="flex flex-col gap-2">
              {user.avatar_url && (
                <li className="flex items-center gap-2 pb-2 text-sm text-slate-200">
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="h-7 w-7 rounded-full ring-2 ring-brand-500/60"
                  />
                  {user.username}
                </li>
              )}
              <li>
                <NavLink
                  to="/dashboard"
                  className={NAV_LINK_CLASS}
                  onClick={() => setMenuOpen(false)}
                >
                  <SparkleIcon size={14} />
                  Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/stats"
                  className={NAV_LINK_CLASS}
                  onClick={() => setMenuOpen(false)}
                >
                  <ChartIcon size={14} />
                  Charts
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/settings"
                  className={NAV_LINK_CLASS}
                  onClick={() => setMenuOpen(false)}
                >
                  <SettingsIcon size={14} />
                  Settings
                </NavLink>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="mt-1 w-full rounded-md border border-ink-600 px-3 py-1.5 text-left text-sm text-slate-200"
                >
                  Log out
                </button>
              </li>
            </ul>
          ) : (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="block rounded-md bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white"
            >
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
