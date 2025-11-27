/**
 * Application Entry Point
 * Initialize MSW in development mode before rendering the app
 */

import React from 'react';
import { AuthProvider } from './AuthContext';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize MSW in development
async function enableMocking() {
  if (import.meta.env.MODE !== 'development') {
    return;
  }

  if (import.meta.env.VITE_USE_MSW === 'false') {
    return;
  }

  const { worker } = await import('./mocks/browser');
  
  // Start MSW worker
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AuthProvider >
      <App className="app" />
      </AuthProvider>
    </React.StrictMode>
  );
});
