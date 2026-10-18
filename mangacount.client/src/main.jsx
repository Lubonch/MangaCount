import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { I18nProvider } from './contexts/I18nContext.jsx'
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
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
)
