/**
 * Application Entry Point
 * Initialize MSW in development mode before rendering the app
 */

// TEST: Verify console is working
console.log('🚀 [MAIN] Application entry point loaded');
console.log('🚀 [MAIN] Environment:', {
  MODE: import.meta.env.MODE,
  VITE_USE_MSW: import.meta.env.VITE_USE_MSW,
  VITE_API_URL: import.meta.env.VITE_API_URL,
});

// Also show an alert if in development to verify the file is loading
if (import.meta.env.MODE === 'development' && import.meta.env.VITE_USE_MSW !== 'false') {
  // Only show once per session
  if (!sessionStorage.getItem('msw-debug-shown')) {
    console.warn('🔍 [MSW DEBUG] If you see this, the app is loading. Check console for MSW messages.');
    sessionStorage.setItem('msw-debug-shown', 'true');
  }
}

import React from 'react';
import { AuthProvider } from './AuthContext';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize MSW in development
async function enableMocking() {
  if (import.meta.env.MODE !== 'development') {
    console.log('[MSW] Skipping MSW - not in development mode');
    return;
  }

  if (import.meta.env.VITE_USE_MSW === 'false') {
    console.log('[MSW] Skipping MSW - VITE_USE_MSW is false');
    return;
  }

  try {
    console.log('[MSW] Initializing MSW...');
    console.log('[MSW] Environment check:', {
      MODE: import.meta.env.MODE,
      VITE_USE_MSW: import.meta.env.VITE_USE_MSW,
      VITE_API_URL: import.meta.env.VITE_API_URL,
    });
    
    const { worker } = await import('./mocks/browser');
    console.log('[MSW] Worker imported, starting...');
    
    // Start MSW worker
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
      quiet: false, // Show MSW logs
    });
    
    console.log('[MSW] ✅ MSW worker started successfully!');
    console.log('[MSW] Test endpoint: /api/test-msw');
    console.log('[MSW] You can test MSW by visiting: http://localhost:5173/api/test-msw');
  } catch (error) {
    console.error('[MSW] ❌ Failed to start MSW worker:', error);
    console.error('[MSW] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw - let the app continue without MSW
    console.warn('[MSW] Continuing without MSW - requests will go to real backend');
  }
}

enableMocking()
  .then(() => {
    console.log('[MSW] MSW initialization complete, rendering app...');
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <AuthProvider >
        <App className="app" />
        </AuthProvider>
      </React.StrictMode>
    );
  })
  .catch((error) => {
    console.error('[MSW] ❌ MSW initialization failed, but continuing to render app:', error);
    // Still render the app even if MSW fails
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <AuthProvider >
        <App className="app" />
        </AuthProvider>
      </React.StrictMode>
    );
  });
