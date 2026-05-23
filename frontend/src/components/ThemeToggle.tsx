/**
 * Sun/moon icon button that flips between dark and light Tailwind
 * themes. The actual class-toggling lives in `ThemeProvider`.
 */

import React from "react";

import { useTheme } from "../contexts/ThemeContext";
import { MoonIcon, SunIcon } from "./Icons";

export default function ThemeToggle(): JSX.Element {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-700/60 text-slate-200 transition hover:border-brand-500 hover:text-white"
    >
      {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
    </button>
  );
}
