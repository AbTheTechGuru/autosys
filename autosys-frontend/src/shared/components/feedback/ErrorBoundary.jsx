import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Replace with real error logging (Sentry, etc.)
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error: this.state.error, reset: this.handleReset });
    }

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
      >
        <div
          className="w-16 h-16 rounded-[14px] mb-6 flex items-center justify-center text-3xl"
          style={{ background: 'rgba(220,38,38,.12)' }}
        >
          ⚠️
        </div>
        <h2
          className="font-display text-[22px] font-bold mb-3"
          style={{ color: '#F0EDE2' }}
        >
          Something went wrong
        </h2>
        <p className="text-[14px] mb-6 max-w-[360px] leading-relaxed" style={{ color: '#8A8680' }}>
          {this.state.error?.message ?? 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={this.handleReset}
          className="btn-gold px-6 py-3 rounded-[9px] font-extrabold text-[13px] font-sans"
          style={{ color: '#07070B' }}
        >
          Try again
        </button>
      </div>
    );
  }
}

/** HOC wrapper */
export function withErrorBoundary(Component, fallback) {
  const Wrapped = (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${Component.displayName ?? Component.name})`;
  return Wrapped;
}
