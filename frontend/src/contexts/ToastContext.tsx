/**
 * Tiny toast notification system used by the dashboard polling loop
 * and any other ad-hoc "this thing happened" messages.
 *
 * Renders a fixed container in the bottom-right corner. Each toast
 * auto-dismisses after `duration` ms (default 6 seconds) or when the
 * user clicks the close button.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface Toast {
  id: number;
  title: string;
  message?: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  push: (toast: Omit<Toast, "id" | "duration"> & { duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

const VARIANT_STYLES: Record<ToastVariant, string> = {
  info: "border-brand-500/40 bg-brand-500/15 text-brand-50",
  success: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
  warning: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  error: "border-rose-500/40 bg-rose-500/15 text-rose-100",
};

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<ToastContextValue["push"]>(
    ({ title, message, variant = "info", duration = 6000 }) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, title, message, variant, duration }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3 sm:bottom-6 sm:right-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-slide-in-right rounded-xl border px-4 py-3 shadow-2xl backdrop-blur ${VARIANT_STYLES[toast.variant]}`}
            role="status"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.message && (
                  <p className="mt-0.5 text-xs opacity-90">{toast.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="ml-2 -mr-1 -mt-1 rounded p-1 text-xs opacity-70 transition hover:opacity-100"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside a <ToastProvider>.");
  }
  return ctx;
}
