/**
 * React error boundary that catches rendering errors and shows a
 * friendly fallback with a "Try again" button instead of a blank page.
 *
 * We don't pull in `react-error-boundary` to avoid the extra dep --
 * a simple class component does the job.
 */

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("Caught render error in ErrorBoundary:", error, info);
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="mx-auto mt-16 max-w-md rounded-2xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
          <h1 className="text-xl font-semibold text-rose-200">
            Something went wrong.
          </h1>
          <p className="mt-2 text-sm text-rose-100/80">
            {this.state.error.message ||
              "An unexpected error happened while rendering this view."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-6 rounded-md bg-rose-500/30 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-500/50"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
