import { Component } from 'react';
import { logError, isElectron } from '../api/localAdapter.js';
import I18nContext from '../contexts/I18nContext';

// Reporta el error del render al log del main (solo dentro de Electron; fuera no
// hay IPC y no queremos recursión por fetch fallido).
function report(payload) {
  try {
    if (isElectron()) logError(payload);
  } catch {
    /* el reporte nunca debe romper la UI */
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
