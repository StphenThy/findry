import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface State {
  error: Error | null;
}

/**
 * Last line of defence: a render error in any page shows a recoverable card
 * instead of a blank white screen.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ui] render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center px-margin-sm bg-surface">
        <div className="card p-space-xl max-w-md w-full text-center flex flex-col gap-space-md" role="alert">
          <h1 className="font-headline-sm text-headline-sm text-on-surface">Something went wrong</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">This page hit an unexpected error. Reloading usually fixes it; if it keeps happening, sign out and back in.</p>
          <div className="flex gap-space-sm justify-center">
            <button type="button" className="btn-primary h-10 px-space-lg" onClick={() => window.location.reload()}>
              Reload
            </button>
            <a href="/" className="btn-ghost h-10 px-space-lg">
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
