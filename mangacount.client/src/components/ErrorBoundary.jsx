import { Component } from 'react';
import { logError, isElectron } from '../api/localAdapter.js';

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
          <h2>Algo salió mal</h2>
          <p>{String(this.state.error?.message ?? this.state.error)}</p>
          <p className="app-error-hint">El error quedó registrado en el log de la app.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
