/**
 * Root component.
 *
 * Owns the current `user` state and wires up the theme + toast
 * providers around the router. Wraps the whole tree in an
 * ErrorBoundary so a render-time crash shows a friendly message
 * instead of a blank page.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { api, clearToken, getToken } from "./api";
import Dashboard from "./components/Dashboard";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import SettingsPage from "./pages/Settings";
import StatsPage from "./pages/StatsPage";
import type { User } from "./types";

function AppShell(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const handleLogout = (): void => {
    clearToken();
    setUser(null);
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <Home user={user} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/login"
            element={
              <ErrorBoundary>
                <Login onAuthenticated={refreshUser} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/dashboard"
            element={
              user ? (
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/stats"
            element={
              user ? (
                <ErrorBoundary>
                  <StatsPage />
                </ErrorBoundary>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              user ? (
                <ErrorBoundary>
                  <SettingsPage user={user} />
                </ErrorBoundary>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
