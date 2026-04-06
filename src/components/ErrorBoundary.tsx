import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('OncoCorr render error:', error, info);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 max-w-lg w-full text-center space-y-4">
            <p className="text-4xl">⚠️</p>
            <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
            <p className="text-sm text-gray-500">
              The app encountered an unexpected error. Try refreshing the page.
            </p>
            <pre className="text-left text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-48 text-red-700">
              {error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
