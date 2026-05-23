/**
 * Tiny fetch wrapper around the FastAPI backend.
 *
 * All authenticated requests include the JWT we stored after the GitHub
 * OAuth flow. The base URL can be overridden with REACT_APP_API_URL when
 * deploying the frontend separately from the backend.
 */

import type {
  HealthStatus,
  MonthlyUsage,
  Review,
  Stats,
  User,
} from "./types";

const API_BASE =
  process.env.REACT_APP_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

const TOKEN_KEY = "ai_code_reviewer_token";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void =>
  localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

export const getApiBase = (): string => API_BASE;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    throw new Error("Not authenticated.");
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

/** Download a /reviews/{id}/export response as a markdown text blob. */
async function downloadMarkdown(reviewId: number): Promise<string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/reviews/${reviewId}/export`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }
  return response.text();
}

export const api = {
  loginUrl: () => `${API_BASE}/auth/github`,
  me: () => request<User>("/auth/me"),
  reviews: () => request<Review[]>("/reviews"),
  review: (id: number) => request<Review>(`/reviews/${id}`),
  exportReview: (id: number) => downloadMarkdown(id),
  stats: () => request<Stats>("/stats"),
  monthlyUsage: () => request<MonthlyUsage>("/usage/monthly"),
  health: () => request<HealthStatus>("/health"),
};

// Re-export the most-used types for callers that previously imported
// them from "./api" (keeps existing imports compiling).
export type { HealthStatus, MonthlyUsage, Review, Stats, User } from "./types";
