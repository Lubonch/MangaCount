import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { installApiFetchShim, logError, isElectron } from './api/localAdapter.js'

installApiFetchShim()

const reportError = (payload) => {
  try {
    if (isElectron()) logError(payload)
  } catch {
    /* no-op */
  }
}

window.addEventListener('error', (event) =>
  reportError({ scope: 'window', message: event.message, stack: event.error?.stack })
)
window.addEventListener('unhandledrejection', (event) =>
  reportError({
    scope: 'promise',
    message: String(event.reason?.message ?? event.reason),
    stack: event.reason?.stack,
  })
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
