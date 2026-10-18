import { Component } from 'react';
import { logError, isElectron } from '../api/localAdapter.js';
import I18nContext from '../contexts/I18nContext';

// Reports render errors to the main log (only inside Electron; outside there is
// no IPC and we do not want recursion from a failed fetch).
function report(payload) {
  try {
    if (isElectron()) logError(payload);
  } catch {
    /* reporting must never break the UI */
  }
}

class ErrorBoundary extends Component {
  static contextType = I18nContext;

  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    report({
      scope: 'render',
      message: error?.message ?? String(error),
      stack: info?.componentStack ?? error?.stack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error">
          <h2>{this.context.t('error.title')}</h2>
          <p>{String(this.state.error?.message ?? this.state.error)}</p>
          <p className="app-error-hint">{this.context.t('error.hint')}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
