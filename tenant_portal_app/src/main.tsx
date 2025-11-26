import React from 'react';
import {createRoot}  from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';


const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App className={"app"} />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);


// If you want to start measuring performance in your app, pass a function
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
