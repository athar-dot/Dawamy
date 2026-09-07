import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';

// Intercept and prevent benign cross-origin iframe security and concurrency errors from breaking execution
if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      const msg = event?.message || (event.error && event.error.message) || String(event.error || '');
      if (
        msg.includes("Failed to read a named property '$$typeof' from 'Window'") ||
        msg.includes('Blocked a frame with origin') ||
        msg.includes('cross-origin frame') ||
        msg.includes('Should not already be working')
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return true;
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event?.reason;
      const msg = typeof reason === 'string' ? reason : reason?.message || String(reason || '');
      if (
        msg.includes("Failed to read a named property '$$typeof' from 'Window'") ||
        msg.includes('Blocked a frame with origin') ||
        msg.includes('cross-origin frame') ||
        msg.includes('Should not already be working')
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return true;
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

