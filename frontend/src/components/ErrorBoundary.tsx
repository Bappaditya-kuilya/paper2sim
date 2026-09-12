import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <h3 className="text-red-400 font-semibold">Something went wrong</h3>
          <p className="text-sm text-gray-400 mt-1">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm">Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
