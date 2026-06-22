/**
 * src/app/ErrorBoundary.tsx
 * Outermost node in the provider stack (§5) — catches R3F/GSAP runtime
 * failures before they blank the page. Class component because
 * componentDidCatch has no hook equivalent.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // R3F (Canvas tree) and GSAP (ScrollTrigger callbacks) throw outside
    // React's normal render cycle in some cases — this is the backstop.
    console.error('[ErrorBoundary] Runtime failure caught:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback" role="alert">
          <div className="error-boundary-fallback__content">
            <h1>Something didn&apos;t load right.</h1>
            <p>The scene hit a snag. Reloading usually fixes it.</p>
            <button type="button" onClick={this.handleReload}>
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
