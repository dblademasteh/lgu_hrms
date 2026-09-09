import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
          <div className="card p-8 max-w-md text-center">
            <p className="mono-label">Unexpected error</p>
            <h1 className="font-display text-xl font-bold text-ink mt-2">Something went wrong</h1>
            <p className="text-sm text-muted mt-2 break-words">
              {String(this.state.error?.message || this.state.error)}
            </p>
            <button type="button" className="btn btn-primary mt-6" onClick={() => window.location.assign('/')}>
              Reload application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}