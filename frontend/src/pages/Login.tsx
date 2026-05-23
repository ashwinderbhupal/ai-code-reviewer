import React, { useState } from "react";

import { api, setToken } from "../api";
import Logo from "../components/Logo";

interface LoginProps {
  onAuthenticated: () => Promise<void> | void;
}

/**
 * Login page.
 *
 * Two responsibilities:
 *   1. If the URL contains ?token=... (GitHub OAuth callback landed here),
 *      stash the JWT in localStorage and hard-redirect to /dashboard
 *      BEFORE we render anything. The hard redirect is intentional --
 *      a react-router navigate would race the protected-route guard,
 *      which still sees user=null and bounces us back to /login.
 *      Reloading the page forces App to remount, re-runs refreshUser()
 *      against a populated localStorage, and the guard sees a real user.
 *   2. Otherwise, render the "Continue with GitHub" button that kicks
 *      off the backend's /auth/github redirect flow.
 */
export default function Login(_props: LoginProps): JSX.Element | null {
  // Hooks must always run in the same order, so call useState first.
  const [working, setWorking] = useState(false);

  if (typeof window !== "undefined") {
    const tokenInUrl = new URLSearchParams(window.location.search).get("token");
    if (tokenInUrl) {
      setToken(tokenInUrl);
      window.location.href = "/dashboard";
      return null;
    }
  }

  const handleLogin = (): void => {
    setWorking(true);
    window.location.href = api.loginUrl();
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <Logo size={56} />
      <h1 className="mt-6 text-3xl font-bold text-white">
        Sign in to AI Code Reviewer
      </h1>
      <p className="mt-3 text-sm text-slate-300">
        We&rsquo;ll use your GitHub account to associate reviews with your
        pull requests and post comments back on your behalf.
      </p>

      <button
        type="button"
        onClick={handleLogin}
        disabled={working}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow transition hover:bg-slate-200 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 .5C5.73.5.67 5.56.67 11.83c0 5.02 3.25 9.27 7.76 10.78.57.1.78-.24.78-.55v-2.1c-3.16.69-3.83-1.36-3.83-1.36-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.52-.29-5.18-1.26-5.18-5.6 0-1.24.45-2.25 1.18-3.04-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.16a10.9 10.9 0 0 1 5.74 0c2.18-1.47 3.14-1.16 3.14-1.16.63 1.57.23 2.73.11 3.02.73.79 1.18 1.8 1.18 3.04 0 4.35-2.67 5.31-5.21 5.59.41.35.77 1.04.77 2.11v3.13c0 .31.2.66.78.55a11.34 11.34 0 0 0 7.76-10.78C23.33 5.56 18.27.5 12 .5z"
          />
        </svg>
        {working ? "Signing in…" : "Continue with GitHub"}
      </button>

      <p className="mt-4 text-xs text-slate-500">
        We only request the scopes needed to read your profile and post
        review comments on your repositories.
      </p>
    </div>
  );
}
