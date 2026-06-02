import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 max-w-lg w-full mx-4">
            <h2 className="text-lg font-bold text-red-600 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-600 mb-4">
              The page encountered an error. Please refresh and try again.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-3 overflow-auto text-slate-500 max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
