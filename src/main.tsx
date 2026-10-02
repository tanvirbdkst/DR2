import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { setupApiInterceptor } from './config/api.ts';
import { initializeCapacitor } from './services/capacitorService.ts';
import './index.css';

// Initialize API interceptor before any component renders
try {
  setupApiInterceptor();
} catch (e) {
  console.warn('[Daktar Serial] API interceptor warning:', e);
}

// Initialize native Capacitor settings (StatusBar, Splash, DeepLink)
try {
  initializeCapacitor();
} catch (e) {
  console.warn('[Daktar Serial] Capacitor native init skipped on web:', e);
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} else {
  console.error('[Daktar Serial] Root element #root was not found in DOM.');
}
